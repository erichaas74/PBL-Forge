import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DragonVisualBridge,
  DragonVisualEventType,
  GenotypeScannerInstrument,
  validateDragonVisualScene,
} from '../../../shared/dragon-visuals';
import {
  GenotypeScanRecord,
  GenotypeScannerSetResult,
} from '../simulation/domain/genotype-scanner.models';
import { GenotypeScannerStationComponent } from './genotype-scanner-station.component';

describe('GenotypeScannerStationComponent', () => {
  let fixture: ComponentFixture<GenotypeScannerStationComponent>;
  let station: GenotypeScannerStationComponent;
  let records: GenotypeScanRecord[];
  let results: GenotypeScannerSetResult[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [GenotypeScannerStationComponent] });
    fixture = TestBed.createComponent(GenotypeScannerStationComponent);
    station = fixture.componentInstance;
    records = [];
    results = [];
    station.evidenceSaved.subscribe(record => records.push(record));
    station.setCompleted.subscribe(result => results.push(result));
  });

  function emit(type: DragonVisualEventType, targetId: string, value?: string): void {
    station.onStageEvent({
      sceneId: station.scene().sceneId,
      type,
      targetId,
      value,
      occurredAtIso: new Date().toISOString(),
    });
  }

  function instrument(): GenotypeScannerInstrument {
    const active = station.scene().instrument;
    if (active.kind !== 'genotype-scanner') throw new Error('Wrong instrument kind.');
    return active;
  }

  /** Runs one task end to end: read, select, lock, scan, explain, save. */
  function completeActiveTask(options: { select?: readonly string[]; pinCorrect?: boolean } = {}): void {
    const task = station.activeTask();
    if (!task) throw new Error('No active task.');
    const selection = options.select ?? task.supportedOptionIds;

    if (station.primaryAction().kind === 'begin') station.runPrimaryAction();
    for (const optionId of selection) emit('allele-selected', optionId);
    station.runPrimaryAction();
    if (station.primaryAction().kind === 'scan') station.runPrimaryAction();
    if (station.primaryAction().kind === 'explain') station.runPrimaryAction();
    emit(
      'evidence-pinned',
      options.pinCorrect === false ? task.evidence[1].id : task.correctEvidenceId,
    );
    station.runPrimaryAction();
  }

  it('seals the allele scan until the student locks a multi-select prediction', () => {
    fixture.detectChanges();

    expect(station.activeTask()?.id).toBe('winged-genotypes');
    expect(instrument().genotypeRevealed).toBeFalse();
    expect(instrument().concealed).toBe('genotype');
    expect(station.primaryAction().kind).toBe('begin');

    station.runPrimaryAction();
    expect(station.scene().phase).toBe('predict');
    expect(station.primaryAction().disabled).toBeTrue();

    emit('allele-selected', 'WW');
    emit('allele-selected', 'Ww');
    expect(instrument().selectedOptionIds).toEqual(['WW', 'Ww']);
    expect(station.primaryAction().disabled).toBeFalse();

    station.runPrimaryAction();
    expect(instrument().selectionLocked).toBeTrue();
    expect(instrument().genotypeRevealed).toBeFalse();

    station.runPrimaryAction();
    expect(instrument().genotypeRevealed).toBeTrue();
    expect(instrument().optionStatuses?.filter(status => status.status === 'correct').length).toBe(2);
  });

  it('saves a scan record with the selection, the revealed pair, and the pinned evidence', () => {
    fixture.detectChanges();
    completeActiveTask();

    expect(records.length).toBe(1);
    expect(records[0]).toEqual(jasmine.objectContaining({
      taskId: 'winged-genotypes',
      geneId: 'W',
      direction: 'phenotype-first',
      revealedGenotype: 'Ww',
      selectionCorrect: true,
      evidenceCorrect: true,
      misconception: null,
    }));
    expect(records[0].selectedOptionIds).toEqual(['WW', 'Ww']);
    expect(records[0].sceneId).toBe('module-3-genotype-scanner-learn');
  });

  it('names the misconception when only the homozygous record is selected', () => {
    fixture.detectChanges();
    completeActiveTask({ select: ['WW'], pinCorrect: false });

    const record = records.at(-1);
    expect(record?.selectionCorrect).toBeFalse();
    expect(record?.misconception).toBe('dominant-requires-two');
    expect(station.openMisconceptions().some(entry => entry.flag === 'dominant-requires-two'))
      .toBeTrue();
  });

  it('flags the hidden-allele error when a recessive readout is given a dominant record', () => {
    fixture.detectChanges();
    completeActiveTask();
    expect(station.activeTask()?.id).toBe('wingless-genotype');

    completeActiveTask({ select: ['Ww'] });
    expect(records.at(-1)?.misconception).toBe('recessive-hides-dominant');
  });

  it('seals the readout instead of the scan for a genotype-first task', () => {
    fixture.detectChanges();
    completeActiveTask();
    completeActiveTask();

    const task = station.activeTask();
    expect(task?.id).toBe('fire-phenotype');
    expect(task?.direction).toBe('genotype-first');
    expect(instrument().concealed).toBe('phenotype');
    expect(instrument().optionKind).toBe('phenotype');
    expect(instrument().options?.map(option => option.id))
      .toEqual(['dominant-readout', 'recessive-readout']);
  });

  it('loads the comparison sample so two equal readouts can be compared', () => {
    fixture.detectChanges();
    while (station.activeTask()?.id !== 'horned-genotypes') completeActiveTask();

    expect(instrument().comparisonSampleId).toBe('scan-s12');
    expect(station.scene().samples.map(item => item.id)).toEqual(['scan-s11', 'scan-s12']);
  });

  it('withholds official verdicts until the whole set is submitted', () => {
    fixture.componentRef.setInput('mode', 'official');
    fixture.detectChanges();

    const first = station.activeTask();
    station.runPrimaryAction();
    emit('allele-selected', first!.supportedOptionIds[0]);
    station.runPrimaryAction();
    station.runPrimaryAction();

    expect(instrument().genotypeRevealed).toBeTrue();
    expect(instrument().optionStatuses).toEqual([]);

    station.runPrimaryAction();
    emit('evidence-pinned', first!.correctEvidenceId);
    station.runPrimaryAction();
    while (station.primaryAction().kind !== 'submit') completeActiveTask();

    expect(records.length).toBe(station.tasks().length);
    expect(results.length).toBe(0);

    station.runPrimaryAction();
    expect(station.finished()).toBeTrue();
    expect(results.at(-1)?.mode).toBe('official');
    expect(instrument().optionStatuses?.length).toBeGreaterThan(0);
  });

  it('loads a reteach bundle targeted at the diagnosed misconception', () => {
    fixture.componentRef.setInput('mode', 'reteach');
    fixture.componentRef.setInput('reteachFlag', 'phenotype-equals-genotype');
    fixture.detectChanges();

    expect(station.tasks().map(task => task.id))
      .toEqual(['reteach-hidden-allele', 'horn-scan-open']);
    expect(instrument().showHints).toBeTrue();
  });

  it('publishes a valid scene to the bridge at every step of the loop', () => {
    const bridge = TestBed.inject(DragonVisualBridge);
    fixture.detectChanges();

    completeActiveTask();
    fixture.detectChanges();

    expect(validateDragonVisualScene(station.scene())).toEqual([]);
    expect(bridge.scene()?.kind).toBe('genotype-scanner');
    expect(bridge.scene()?.sceneId).toBe('module-3-genotype-scanner-learn');
  });

  it('reports a set result once every learn task is saved', () => {
    fixture.detectChanges();
    while (!station.finished()) completeActiveTask();

    expect(records.length).toBe(4);
    expect(results.at(-1)).toEqual(jasmine.objectContaining({ mode: 'learn', correct: 4, total: 4 }));
  });
});
