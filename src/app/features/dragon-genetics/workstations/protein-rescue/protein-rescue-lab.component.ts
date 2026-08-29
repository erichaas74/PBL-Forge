import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DnaTranscriptionAnimationComponent } from '../../../../shared/dna-process-visuals/dna-transcription-animation.component';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import {
  ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
  AccountGeneticsRecord,
  parseAccountGeneticsDragPayload,
} from '../shared/account-genetics-library.models';
import { AccountGeneticsLibraryService } from '../shared/account-genetics-library.service';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  DRAGON_FOODS,
  DigestionTrial,
  DragonFoodId,
  DracaseGenotype,
  ProteinRescueCaseRecord,
  ProteinRescueGeneSample,
  ProteinTranslationResult,
  proteinRescuePatientFor,
  runDigestionTrial,
  translateMessengerRna,
} from './protein-rescue.models';
import { ProteinRescueRepository } from './protein-rescue.repository';

const PROTEIN_SAMPLE_DRAG_TYPE = 'application/x-pbl-protein-rescue-sample';

@Component({
  selector: 'app-protein-rescue-lab',
  imports: [DatePipe, RouterLink, AccountGeneticsFileComponent, DnaTranscriptionAnimationComponent],
  templateUrl: './protein-rescue-lab.component.html',
  styleUrl: './protein-rescue-lab.component.scss',
})
export class ProteinRescueLabComponent implements OnDestroy {
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);
  private readonly repository = inject(ProteinRescueRepository);

  readonly studentId = input.required<string>();
  readonly casePatientId = input<string | null>(null);
  readonly recordSaved = output<ProteinRescueCaseRecord>();
  readonly foods = DRAGON_FOODS;
  readonly genotypeClaims: readonly DracaseGenotype[] = ['DD', 'Dd', 'dd'];

  readonly stagedAccountRecord = signal<AccountGeneticsRecord | null>(null);
  readonly patientId = signal<string | null>(null);
  readonly stagedSampleId = signal<string | null>(null);
  readonly loadedSampleId = signal<string | null>(null);
  readonly transcribedSampleIds = signal<readonly string[]>([]);
  readonly translatedSamples = signal<Readonly<Record<string, ProteinTranslationResult>>>({});
  readonly enzymeTests = signal<Readonly<Record<string, boolean>>>({});
  readonly translationProgress = signal(0);
  readonly selectedFoodId = signal<DragonFoodId>('moonmilk');
  readonly digestionTrials = signal<readonly DigestionTrial[]>([]);
  readonly claimedGenotype = signal<DracaseGenotype | null>(null);
  readonly recommendedFoodIds = signal<readonly DragonFoodId[]>([]);
  readonly explanation = signal('');
  readonly records = signal<readonly ProteinRescueCaseRecord[]>([]);
  readonly caseFileOpen = signal(false);
  readonly statusMessage = signal(
    'Select a dragon record, then load or drag it into the patient bay.',
  );

  readonly accountSnapshot = computed(() => this.accountLibrary.recordsFor(this.studentId()));
  readonly patient = computed(() => {
    const patientId = this.patientId();
    const dragon = this.accountSnapshot().dragons.find((candidate) => candidate.id === patientId);
    return dragon ? proteinRescuePatientFor(dragon) : null;
  });
  readonly loadedSample = computed(() => {
    const sampleId = this.loadedSampleId();
    return this.patient()?.samples.find((sample) => sample.id === sampleId) ?? null;
  });
  readonly currentTranslation = computed(() => {
    const sample = this.loadedSample();
    return sample ? translateMessengerRna(sample.mrna) : null;
  });
  readonly selectedFood = computed(
    () => this.foods.find((food) => food.id === this.selectedFoodId()) ?? this.foods[0],
  );
  readonly latestDigestionTrial = computed(() => this.digestionTrials()[0] ?? null);
  readonly digestionState = computed(() => this.latestDigestionTrial()?.result ?? 'waiting');
  readonly recordsForPatient = computed(() =>
    this.records().filter((record) => record.patientId === this.patientId()),
  );
  readonly testedSampleCount = computed(() => {
    const patient = this.patient();
    return patient?.samples.filter((sample) => this.enzymeTested(sample.id)).length ?? 0;
  });
  readonly canSaveCase = computed(() =>
    Boolean(
      this.patient() &&
      this.testedSampleCount() === 2 &&
      this.digestionTrials().length > 0 &&
      this.claimedGenotype() &&
      this.recommendedFoodIds().length > 0 &&
      this.explanation().trim().length >= 12,
    ),
  );
  readonly recordReadiness = computed(() => {
    const missing: string[] = [];
    if (this.testedSampleCount() < 2) missing.push('test both gene products');
    if (!this.digestionTrials().length) missing.push('run a food trial');
    if (!this.claimedGenotype()) missing.push('record a genotype claim');
    if (!this.recommendedFoodIds().length) missing.push('choose a diet recommendation');
    if (this.explanation().trim().length < 12) missing.push('connect the evidence in your note');
    return missing.length
      ? `To save: ${missing.join(', ')}.`
      : 'The clinical record has enough evidence to save.';
  });

  private loadedStudentId: string | null = null;
  private loadedCasePatientId: string | null = null;
  private translationTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const studentId = normalizeWorkstationStudentId(this.studentId());
      if (studentId === this.loadedStudentId) return;
      this.loadedStudentId = studentId;
      this.records.set(this.repository.load(studentId));
    });
    effect(() => {
      const casePatientId = this.casePatientId();
      if (!casePatientId || casePatientId === this.loadedCasePatientId) return;
      const casePatient = casePatientId
        ? this.accountSnapshot().dragons.find((candidate) => candidate.id === casePatientId)
        : null;
      if (casePatient) {
        this.loadedCasePatientId = casePatientId;
        this.loadPatientRecord(casePatient);
      }
    });
  }

  selectAccountRecord(record: AccountGeneticsRecord): void {
    this.stagedAccountRecord.set(record);
    const name = record.kind === 'dragon' ? record.name : record.dragonName;
    this.statusMessage.set(
      `${name} selected. Choose “Load patient” or drag the record into the bay.`,
    );
  }

  loadStagedPatient(): void {
    const record = this.stagedAccountRecord();
    if (record) this.loadPatientRecord(record);
  }

  loadPatientRecord(record: AccountGeneticsRecord): void {
    const dragonId = record.kind === 'dragon' ? record.id : record.dragonId;
    const dragon = this.accountSnapshot().dragons.find((candidate) => candidate.id === dragonId);
    if (!dragon) return;
    this.stopTranslation();
    this.patientId.set(dragon.id);
    this.stagedAccountRecord.set(record);
    this.stagedSampleId.set(null);
    this.loadedSampleId.set(null);
    this.transcribedSampleIds.set([]);
    this.translatedSamples.set({});
    this.enzymeTests.set({});
    this.translationProgress.set(0);
    this.digestionTrials.set([]);
    this.claimedGenotype.set(null);
    this.recommendedFoodIds.set([]);
    this.explanation.set('');
    this.statusMessage.set(
      `${dragon.name} is in the clinic. The two chromosome samples remain neutrally labeled.`,
    );
  }

  allowAccountDrop(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(ACCOUNT_GENETICS_RECORD_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  dropPatient(event: DragEvent): void {
    event.preventDefault();
    const payload = parseAccountGeneticsDragPayload(
      event.dataTransfer?.getData(ACCOUNT_GENETICS_RECORD_DRAG_TYPE) ?? '',
    );
    if (!payload) return;
    const record = this.accountLibrary.recordById(this.studentId(), payload.id);
    if (record?.kind === payload.kind) this.loadPatientRecord(record);
  }

  selectSample(sample: ProteinRescueGeneSample): void {
    this.stagedSampleId.set(sample.id);
    this.statusMessage.set(
      `${sample.sampleCode} selected. Load it into the gene reader or drag it there.`,
    );
  }

  startSampleDrag(event: DragEvent, sample: ProteinRescueGeneSample): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(PROTEIN_SAMPLE_DRAG_TYPE, sample.id);
    event.dataTransfer.setData('text/plain', sample.sampleCode);
  }

  allowSampleDrop(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(PROTEIN_SAMPLE_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  dropSample(event: DragEvent): void {
    event.preventDefault();
    const sampleId = event.dataTransfer?.getData(PROTEIN_SAMPLE_DRAG_TYPE) ?? '';
    this.loadSample(sampleId);
  }

  loadStagedSample(): void {
    const sampleId = this.stagedSampleId();
    if (sampleId) this.loadSample(sampleId);
  }

  loadSample(sampleId: string): void {
    const sample = this.patient()?.samples.find((candidate) => candidate.id === sampleId);
    if (!sample) return;
    this.stopTranslation();
    this.stagedSampleId.set(sample.id);
    this.loadedSampleId.set(sample.id);
    const translation = this.translatedSamples()[sample.id];
    this.translationProgress.set(translation?.steps.length ?? 0);
    this.statusMessage.set(
      `${sample.sampleCode} loaded. Run the transcript across the DNA reader.`,
    );
  }

  recordTranscript(): void {
    const sample = this.loadedSample();
    if (!sample) return;
    if (!this.transcribedSampleIds().includes(sample.id)) {
      this.transcribedSampleIds.update((ids) => [...ids, sample.id]);
    }
    this.statusMessage.set(`${sample.sampleCode} mRNA captured. It is available to the ribosome.`);
  }

  isTranscribed(sampleId: string): boolean {
    return this.transcribedSampleIds().includes(sampleId);
  }

  playTranslation(): void {
    const sample = this.loadedSample();
    const translation = this.currentTranslation();
    if (!sample || !translation || !this.isTranscribed(sample.id)) return;
    this.stopTranslation();
    this.translationProgress.set(0);
    this.translationTimer = setInterval(() => {
      const next = Math.min(translation.steps.length, this.translationProgress() + 1);
      this.translationProgress.set(next);
      if (next >= translation.steps.length) {
        this.stopTranslation();
        this.captureTranslation(sample, translation);
      }
    }, 650);
  }

  setTranslationProgress(value: string | number): void {
    const sample = this.loadedSample();
    const translation = this.currentTranslation();
    if (!sample || !translation || !this.isTranscribed(sample.id)) return;
    this.stopTranslation();
    const next = Math.max(0, Math.min(translation.steps.length, Number(value)));
    this.translationProgress.set(next);
    if (next >= translation.steps.length) this.captureTranslation(sample, translation);
  }

  visibleTranslationSteps(): readonly ProteinTranslationResult['steps'][number][] {
    return this.currentTranslation()?.steps.slice(0, this.translationProgress()) ?? [];
  }

  translationFor(sampleId: string): ProteinTranslationResult | null {
    return this.translatedSamples()[sampleId] ?? null;
  }

  enzymeTested(sampleId: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.enzymeTests(), sampleId);
  }

  enzymeWorks(sampleId: string): boolean {
    return this.enzymeTests()[sampleId] ?? false;
  }

  testProteinFunction(): void {
    const sample = this.loadedSample();
    const translation = sample ? this.translationFor(sample.id) : null;
    if (!sample || !translation) return;
    this.enzymeTests.update((tests) => ({ ...tests, [sample.id]: translation.enzymeWorks }));
    this.statusMessage.set(
      translation.enzymeWorks
        ? `${sample.sampleCode} protein split the Dracose test molecule.`
        : `${sample.sampleCode} protein did not split the Dracose test molecule.`,
    );
  }

  selectFood(foodId: DragonFoodId): void {
    this.selectedFoodId.set(foodId);
  }

  runFoodTrial(): void {
    const patient = this.patient();
    if (!patient) return;
    const result = runDigestionTrial(patient, this.selectedFood());
    this.digestionTrials.update((trials) => [result, ...trials].slice(0, 12));
    this.statusMessage.set(`${result.foodName} trial recorded in the clinical evidence tray.`);
  }

  setClaim(genotype: DracaseGenotype): void {
    this.claimedGenotype.set(genotype);
  }

  toggleRecommendation(foodId: DragonFoodId): void {
    this.recommendedFoodIds.update((ids) =>
      ids.includes(foodId) ? ids.filter((id) => id !== foodId) : [...ids, foodId],
    );
  }

  recommendationSelected(foodId: DragonFoodId): boolean {
    return this.recommendedFoodIds().includes(foodId);
  }

  updateExplanation(value: string): void {
    this.explanation.set(value);
  }

  saveCase(): void {
    const patient = this.patient();
    const claim = this.claimedGenotype();
    if (!patient || !claim || !this.canSaveCase()) return;
    const savedAtIso = new Date().toISOString();
    const sampleEvidence = patient.samples.map((sample) => {
      const translation = this.translationFor(sample.id);
      if (!translation) throw new Error(`Missing translation evidence for ${sample.sampleCode}`);
      return {
        sampleCode: sample.sampleCode,
        codingDna: sample.codingDna,
        templateDna: sample.templateDna,
        mrna: sample.mrna,
        aminoAcids: translation.aminoAcids,
        stoppedEarly: translation.stoppedEarly,
        enzymeWorks: this.enzymeWorks(sample.id),
      };
    });
    const record: ProteinRescueCaseRecord = {
      id: `${patient.dragon.id}:${Date.now()}`,
      patientId: patient.dragon.id,
      patientName: patient.dragon.name,
      chartSummary: patient.chartSummary,
      observations: patient.observations,
      sampleEvidence,
      digestionTrials: this.digestionTrials(),
      claimedGenotype: claim,
      recommendedFoodIds: this.recommendedFoodIds(),
      explanation: this.explanation().trim(),
      savedAtIso,
    };
    this.records.set(this.repository.save(this.studentId(), record));
    this.recordSaved.emit(record);
    this.caseFileOpen.set(true);
    this.statusMessage.set(`${patient.dragon.name} rescue record saved to the clinical case file.`);
  }

  formatSequence(sequence: string): string {
    return sequence.match(/.{1,3}/g)?.join(' · ') ?? sequence;
  }

  foodName(foodId: DragonFoodId): string {
    return this.foods.find((food) => food.id === foodId)?.name ?? foodId;
  }

  sampleResultSummary(sample: ProteinRescueGeneSample): string {
    const translation = this.translationFor(sample.id);
    if (!translation) return this.isTranscribed(sample.id) ? 'mRNA captured' : 'Not yet tested';
    if (!this.enzymeTested(sample.id))
      return `${translation.aminoAcids.length} amino acids · function not tested`;
    return this.enzymeWorks(sample.id)
      ? 'Full enzyme · splits Dracose'
      : 'Truncated protein · Dracose intact';
  }

  ngOnDestroy(): void {
    this.stopTranslation();
  }

  private captureTranslation(
    sample: ProteinRescueGeneSample,
    translation: ProteinTranslationResult,
  ): void {
    this.translatedSamples.update((samples) => ({ ...samples, [sample.id]: translation }));
    this.statusMessage.set(
      translation.stoppedEarly
        ? `${sample.sampleCode} translation reached a stop codon before the full chain formed.`
        : `${sample.sampleCode} translation produced the full teaching-model chain.`,
    );
  }

  private stopTranslation(): void {
    if (this.translationTimer) clearInterval(this.translationTimer);
    this.translationTimer = null;
  }
}
