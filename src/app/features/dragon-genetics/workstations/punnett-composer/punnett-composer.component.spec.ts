import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { stubSpecimenThumbnailRendering } from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { AccountGeneticsLibraryService } from '../shared/account-genetics-library.service';
import { CellChromosomeViewportComponent } from '../shared/cell-chromosome-viewport.component';
import { DragonChromosomeSelectorComponent } from '../shared/dragon-chromosome-selector.component';
import { PunnettComposerComponent } from './punnett-composer.component';
import { PunnettComposerRepository } from './punnett-composer.repository';

describe('PunnettComposerComponent', () => {
  const studentId = 'punnett-composer-spec-student';
  let fixture: ComponentFixture<PunnettComposerComponent>;
  let composer: PunnettComposerComponent;
  let library: AccountGeneticsLibraryService;

  beforeEach(() => {
    localStorage.removeItem(`pbl-forge.dragon-genetics.punnett-composer.v1.${studentId}`);
    stubSpecimenThumbnailRendering();
    TestBed.configureTestingModule({ imports: [PunnettComposerComponent] });
    fixture = TestBed.createComponent(PunnettComposerComponent);
    fixture.componentRef.setInput('studentId', studentId);
    composer = fixture.componentInstance;
    library = TestBed.inject(AccountGeneticsLibraryService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(`pbl-forge.dragon-genetics.punnett-composer.v1.${studentId}`);
  });

  it('loads account dragons into either parent bay with select then place', () => {
    const [ember, tide] = library.recordsFor(studentId).dragons;
    composer.selectAccountRecord(ember);
    composer.loadStagedRecord('parent1');
    composer.selectAccountRecord(tide);
    composer.loadStagedRecord('parent2');

    expect(composer.parent1()?.id).toBe(ember.id);
    expect(composer.parent2()?.id).toBe(tide.id);
    expect(composer.parent1Alleles()).toEqual(['W', 'w']);
    expect(composer.parent2Alleles()).toEqual(['w', 'w']);
  });

  it('starts with separate female and male dragon chromosome selectors', () => {
    const selectors = fixture.debugElement
      .queryAll(By.directive(DragonChromosomeSelectorComponent))
      .map((item) => item.componentInstance as DragonChromosomeSelectorComponent);
    const fireDragon = library
      .recordsFor(studentId)
      .dragons.find((dragon) => dragon.sex === 'female')!;
    const maleDragon = library
      .recordsFor(studentId)
      .dragons.find((dragon) => dragon.sex === 'male')!;

    expect(selectors.length).toBe(2);
    expect(selectors[0].dragons().every((dragon) => dragon.sex === 'female')).toBeTrue();
    expect(selectors[1].dragons().every((dragon) => dragon.sex === 'male')).toBeTrue();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-account-genetics-file'),
    ).toBeNull();
    expect(selectors.every((selector) => selector.cellChromosomes().length === 5)).toBeTrue();

    selectors[0].selectDragon(fireDragon);
    selectors[1].selectDragon(maleDragon);
    selectors[0].selectChromosome('Chr 2');

    expect(composer.stagedChromosome()).toBe('Chr 2');
    expect(composer.activeTrait().id).toBe('fire');
    expect(composer.parent1()?.id).toBe(fireDragon.id);
    expect(composer.parent2()?.id).toBe(maleDragon.id);
  });

  it('loads a chromosome record only into its sex-matched parent bay', () => {
    const fireChromosome = library
      .recordsFor(studentId)
      .chromosomes.find((record) => record.id === 'quartz:chr-2')!;
    composer.selectAccountRecord(fireChromosome);
    composer.loadStagedRecord('parent2');

    expect(composer.parent2()?.id).toBe('quartz');
    expect(composer.activeTrait().id).toBe('fire');
    expect(composer.parent2Alleles()).toEqual(fireChromosome.alleles);
  });

  it('replaces the fixed locus choices with genes from the selected chromosome', () => {
    const selector = fixture.debugElement.queryAll(
      By.directive(DragonChromosomeSelectorComponent),
    )[0].componentInstance as DragonChromosomeSelectorComponent;

    selector.selectChromosome('Chr 3');
    fixture.detectChanges();

    expect(composer.chromosomeGenes().map((gene) => gene.id)).toEqual([
      'scales',
      'body-color',
      'crest',
    ]);
    expect(composer.activeTrait().id).toBe('scales');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('FOCUS LOCUS');
    expect(fixture.nativeElement.querySelector('.gene-selector')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.is-active .dragon-card__gene').length).toBe(6);
  });

  it('loads each parents two chromosome copies when its card gene is selected', () => {
    const selectors = fixture.debugElement
      .queryAll(By.directive(DragonChromosomeSelectorComponent))
      .map((item) => item.componentInstance as DragonChromosomeSelectorComponent);

    selectors[0].selectGene('wings');
    selectors[1].selectGene('wings');
    fixture.detectChanges();

    expect(composer.parent1()?.id).toBe('ember');
    expect(composer.parent2()?.id).toBe('tide');
    expect(composer.snapshot().parent1Gametes).toEqual(['W', 'w']);
    expect(composer.snapshot().parent2Gametes).toEqual(['w', 'w']);
    expect(composer.squareComplete()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.parent-bank')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.axis-slot').length).toBe(4);
  });

  it('uses standardized heterozygous XX and XY cells in test mode', () => {
    composer.selectMode('test');
    composer.selectTrait('eye-color');

    expect(composer.parent1()?.sex).toBe('female');
    expect(composer.parent2()?.sex).toBe('male');
    expect(composer.parent1Alleles()).toEqual(['E', 'e']);
    expect(composer.parent2Alleles()).toEqual(['E', 'Y']);
    expect(composer.selectorDragons().map((dragon) => dragon.name)).toEqual([
      'Heterozygous XX cell',
      'Heterozygous XY cell',
    ]);
    expect(composer.femaleSelectorDragons().map((dragon) => dragon.name)).toEqual([
      'Heterozygous XX cell',
    ]);
    expect(composer.maleSelectorDragons().map((dragon) => dragon.name)).toEqual([
      'Heterozygous XY cell',
    ]);

    fixture.detectChanges();
    expect(
      fixture.debugElement.queryAll(By.directive(CellChromosomeViewportComponent)).length,
    ).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.test-model .gamete-token').length).toBe(4);
    expect(
      fixture.nativeElement.querySelector('.test-model app-dragon-chromosome-selector'),
    ).toBeNull();
    expect(fixture.nativeElement.querySelector('.test-model app-dragon-flip-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.parent-bank')).toBeNull();
  });

  it('selects chromosomes and genes directly from the test cell model', () => {
    composer.selectMode('test');
    composer.selectTestChromosome('Chr 3');
    fixture.detectChanges();

    expect(composer.selectedChromosome()).toBe('Chr 3');
    expect(composer.activeTrait().id).toBe('scales');
    expect(composer.parent1CellChromosomes().length).toBe(5);
    expect(composer.parent2CellChromosomes().length).toBe(5);
    expect(fixture.nativeElement.querySelectorAll('.test-gene-view button').length).toBe(6);
  });

  it('shows both homologous chromosomes for a completed selected cell', () => {
    composer.selectMode('test');
    composer.selectTrait('eye-color');
    for (const side of ['parent1', 'parent2'] as const) {
      for (const slot of [0, 1]) {
        composer.selectGamete(side, slot);
        composer.placePendingGamete(side, slot);
      }
    }
    composer.selectCell(1);
    fixture.detectChanges();

    expect(composer.selectedCell()?.genotype).toBe('EY');
    expect(composer.selectedCellChromosomePair()?.label).toBe('XY sex chromosomes');
    expect(composer.selectedCellChromosomePair()?.maternal).toBeTruthy();
    expect(composer.selectedCellChromosomePair()?.paternal).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.offspring-chromosomes')).toBeTruthy();
  });

  it('places four gametes through the click alternative and computes all offspring cells', () => {
    loadWingCross(composer, library, studentId);

    composer.selectGamete('parent1', 0);
    composer.placePendingGamete('parent1', 0);
    composer.selectGamete('parent1', 1);
    composer.placePendingGamete('parent1', 1);
    composer.selectGamete('parent2', 0);
    composer.placePendingGamete('parent2', 0);
    composer.selectGamete('parent2', 1);
    composer.placePendingGamete('parent2', 1);
    fixture.detectChanges();

    expect(composer.squareComplete()).toBeTrue();
    expect(composer.cells().map((cell) => cell.genotype)).toEqual(['Ww', 'Ww', 'ww', 'ww']);
    expect(composer.genotypeCounts()).toEqual({ Ww: 2, ww: 2 });
    expect(fixture.nativeElement.querySelectorAll('.offspring-cell.complete').length).toBe(4);
  });

  it('drags a test-model gene copy into its matching Punnett axis box', () => {
    composer.selectMode('test');
    const data = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'none',
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? '',
    } as unknown as DataTransfer;

    composer.startGameteDrag({ dataTransfer } as DragEvent, 'parent1', 0);
    composer.dropGamete(
      { dataTransfer, preventDefault: () => undefined } as unknown as DragEvent,
      'parent1',
      0,
    );

    expect(composer.snapshot().parent1Gametes).toEqual(['W', null]);
  });

  it('connects the left model to the left axis and the right model to the top axis', () => {
    composer.selectMode('test');
    fixture.detectChanges();

    const leftAxis = fixture.nativeElement.querySelectorAll('.parent-one-axis');
    const topAxis = fixture.nativeElement.querySelectorAll('.parent-two-axis');

    expect(leftAxis.length).toBe(2);
    expect(topAxis.length).toBe(2);
    expect(leftAxis[0].textContent).toContain('P1');
    expect(topAxis[0].textContent).toContain('P2');

    composer.selectGamete('parent1', 0);
    leftAxis[0].click();
    composer.selectGamete('parent2', 0);
    topAxis[0].click();

    expect(composer.snapshot().parent1Gametes).toEqual(['W', null]);
    expect(composer.snapshot().parent2Gametes).toEqual(['W', null]);
  });

  it('allows every cell to be selected and explains incomplete cells', () => {
    for (let index = 0; index < 4; index += 1) {
      composer.selectCell(index);
      expect(composer.selectedCell()?.index).toBe(index);
      expect(composer.selectedCell()?.genotype).toBeNull();
    }
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Waiting for gametes');
  });

  it('moves a single gamete copy instead of duplicating it across an axis', () => {
    loadWingCross(composer, library, studentId);
    composer.selectGamete('parent1', 0);
    composer.placePendingGamete('parent1', 0);
    composer.selectGamete('parent1', 0);
    composer.placePendingGamete('parent1', 1);

    expect(composer.snapshot().parent1Gametes).toEqual([null, 'W']);
  });

  it('saves and restores a completed cross for the student', () => {
    loadWingCross(composer, library, studentId);
    for (const side of ['parent1', 'parent2'] as const) {
      for (const slot of [0, 1]) {
        composer.selectGamete(side, slot);
        composer.placePendingGamete(side, slot);
      }
    }

    composer.saveCross();
    const restored = TestBed.inject(PunnettComposerRepository).load(studentId);

    expect(restored.savedCrosses.length).toBe(1);
    expect(restored.savedCrosses[0].genotypeCounts).toEqual({ Ww: 2, ww: 2 });
    expect(restored.parent1Gametes).toEqual(['W', 'w']);
    expect(restored.parent2Gametes).toEqual(['w', 'w']);
  });

  it('clears placed gametes when the locus changes while retaining both parents', () => {
    loadWingCross(composer, library, studentId);
    composer.selectGamete('parent1', 0);
    composer.placePendingGamete('parent1', 0);

    composer.selectTrait('fire');

    expect(composer.parent1()?.id).toBe('ember');
    expect(composer.parent2()?.id).toBe('tide');
    expect(composer.snapshot().parent1Gametes).toEqual([null, null]);
    expect(composer.snapshot().parent2Gametes).toEqual([null, null]);
  });
});

function loadWingCross(
  composer: PunnettComposerComponent,
  library: AccountGeneticsLibraryService,
  studentId: string,
): void {
  const dragons = library.recordsFor(studentId).dragons;
  composer.loadAccountRecord(
    dragons.find((dragon) => dragon.id === 'ember')!,
    'parent1',
  );
  composer.loadAccountRecord(
    dragons.find((dragon) => dragon.id === 'tide')!,
    'parent2',
  );
  composer.selectTrait('wings');
}
