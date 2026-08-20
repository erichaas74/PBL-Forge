import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AccountGeneticsLibraryService } from '../shared/account-genetics-library.service';
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

  it('starts with the universal dragon and chromosome selector', () => {
    const selector = fixture.debugElement.query(By.directive(DragonChromosomeSelectorComponent))
      .componentInstance as DragonChromosomeSelectorComponent;
    const fireDragon = library.recordsFor(studentId).dragons[0];

    expect(selector.dragons()).toBe(composer.selectorDragons());
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-account-genetics-file'),
    ).toBeNull();
    expect(selector.cellChromosomes().length).toBe(5);

    selector.selectDragon(fireDragon);
    selector.selectChromosome('Chr 2');

    expect(composer.stagedChromosome()).toBe('Chr 2');
    expect(composer.activeTrait().id).toBe('fire');
    expect(composer.parent1()?.id).toBe(fireDragon.id);
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
    const selector = fixture.debugElement.query(By.directive(DragonChromosomeSelectorComponent))
      .componentInstance as DragonChromosomeSelectorComponent;

    selector.selectChromosome('Chr 3');
    fixture.detectChanges();

    expect(composer.chromosomeGenes().map((gene) => gene.id)).toEqual([
      'scales',
      'body-color',
      'crest',
    ]);
    expect(composer.activeTrait().id).toBe('scales');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('FOCUS LOCUS');
    expect(fixture.nativeElement.querySelectorAll('.gene-selector button').length).toBe(3);
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
    composer.selectCell(2);
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
    expect(composer.cells().map((cell) => cell.genotype)).toEqual(['Ww', 'ww', 'Ww', 'ww']);
    expect(composer.genotypeCounts()).toEqual({ Ww: 2, ww: 2 });
    expect(fixture.nativeElement.querySelectorAll('.offspring-cell.complete').length).toBe(4);
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
