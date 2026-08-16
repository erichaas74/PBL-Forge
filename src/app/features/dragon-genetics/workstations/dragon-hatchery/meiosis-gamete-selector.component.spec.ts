import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAGON_PARENTS } from '../../simulation/domain/dragon-inheritance';
import { chromosomeVisual } from '../shared/dragon-chromosome.catalog';
import { geneDnaRecord } from '../shared/dragon-gene-dna.catalog';
import { meiosisGameteChromosomeSvgModel } from './meiosis-gamete.viewport';
import { SelectedMeiosisGamete } from './meiosis-gamete.models';
import { MeiosisGameteSelectorComponent } from './meiosis-gamete-selector.component';

describe('MeiosisGameteSelectorComponent', () => {
  let fixture: ComponentFixture<MeiosisGameteSelectorComponent>;
  let component: MeiosisGameteSelectorComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MeiosisGameteSelectorComponent] });
    fixture = TestBed.createComponent(MeiosisGameteSelectorComponent);
    fixture.componentRef.setInput('parent', DRAGON_PARENTS[0]);
    fixture.componentRef.setInput('sex', 'female');
    fixture.componentRef.setInput('targetTraitId', 'scales');
    fixture.componentRef.setInput('baseSeed', 'selector-test');
    fixture.componentRef.setInput('roleLabel', 'Egg parent');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('starts with the parent cell and keeps gametes unavailable until meiosis is complete', () => {
    expect(component.phaseIndex()).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.phase-track li').length).toBe(10);
    expect(fixture.nativeElement.querySelectorAll('.gamete-card').length).toBe(0);

    component.finishMeiosis();
    fixture.detectChanges();

    expect(component.phase().name).toBe('Telophase II & Cytokinesis');
    expect(fixture.nativeElement.querySelectorAll('.gamete-card').length).toBe(4);
    expect(fixture.nativeElement.querySelector('.cell-stage').hidden).toBeFalse();
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
    expect(fixture.nativeElement.querySelector('.shared-meiosis-stage')).toBeNull();
    expect(fixture.nativeElement.querySelector('.gamete-stage-grid')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.gamete-workbench')).toBeNull();
  });

  it('uses the shared chromosome model for single and replicated parent chromosomes', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.parent-cell app-chromosome-svg').length).toBe(10);
    expect(element.querySelectorAll('.parent-cell .chromosome-svg--replicated').length).toBe(0);

    component.next();
    fixture.detectChanges();

    expect(element.querySelectorAll('.parent-cell .chromosome-svg--replicated').length).toBe(10);
    expect(element.querySelectorAll('.parent-cell .chromatid--sister').length).toBe(10);
    expect(element.querySelectorAll('.parent-cell [data-band-start]').length).toBeGreaterThan(0);
  });

  it('keeps sisters joined in division I and separates them only during anaphase II', () => {
    const element = fixture.nativeElement as HTMLElement;

    component.next();
    component.next();
    fixture.detectChanges();
    expect(component.phase().name).toBe('Prophase I');
    expect(element.querySelectorAll('.chromosome-pair.crossing').length).toBeGreaterThan(0);

    component.next();
    fixture.detectChanges();
    expect(component.phase().name).toBe('Metaphase I');
    expect(element.querySelector('.metaphase-one .equator-line')).not.toBeNull();
    expect(element.querySelectorAll('.metaphase-one .centriole').length).toBe(2);
    expect(element.querySelectorAll('.metaphase-one .spindle-fibers > i').length).toBe(10);

    component.next();
    fixture.detectChanges();
    expect(component.phase().name).toBe('Anaphase I');
    expect(element.querySelectorAll('.pole-set').length).toBe(2);
    expect(element.querySelectorAll('.anaphase-one-cell .chromatid--sister').length).toBe(10);
    expect(element.querySelectorAll('.anaphase-one-cell .centriole').length).toBe(2);
    expect(element.querySelectorAll('.anaphase-one-cell .spindle-fibers.pulling > i').length).toBe(
      10,
    );

    component.next();
    fixture.detectChanges();
    expect(component.phase().name).toBe('Telophase I & Cytokinesis');
    expect(element.querySelectorAll('.daughter-cell').length).toBe(2);
    expect(element.querySelector('.cytokinesis-furrow')).not.toBeNull();

    component.next();
    component.next();
    fixture.detectChanges();
    expect(component.phase().name).toBe('Metaphase II');
    expect(element.querySelectorAll('.metaphase-two .equator-line').length).toBe(2);
    expect(element.querySelectorAll('.metaphase-two .centriole').length).toBe(4);
    expect(element.querySelectorAll('.metaphase-two .centriole-top').length).toBe(2);
    expect(element.querySelectorAll('.metaphase-two .centriole-bottom').length).toBe(2);
    expect(element.querySelectorAll('.metaphase-two .spindle-fibers > i').length).toBe(20);

    component.next();
    fixture.detectChanges();
    expect(component.phase().name).toBe('Anaphase II');
    const formingIds = [...element.querySelectorAll<HTMLElement>('.forming-gamete-shell')].map(
      (cell) => cell.dataset['gameteId'],
    );
    expect(formingIds.length).toBe(4);
    expect(element.querySelectorAll('.top-daughter').length).toBe(2);
    expect(element.querySelectorAll('.bottom-daughter').length).toBe(2);
    expect(element.querySelectorAll('.anaphase-two-centriole').length).toBe(4);
    expect(element.querySelectorAll('.vertical-fibers > i').length).toBe(20);
    expect(element.querySelector('.anaphase-two-grid .chromosome-svg--replicated')).toBeNull();

    component.next();
    fixture.detectChanges();
    const choiceIds = [...element.querySelectorAll<HTMLElement>('.gamete-card')].map(
      (cell) => cell.dataset['gameteId'],
    );
    expect(choiceIds).toEqual(formingIds);
  });

  it('loads single-chromosome cell models into each of the four gamete outcomes', () => {
    component.finishMeiosis();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.gamete-card') as NodeListOf<HTMLElement>;
    expect(cards.length).toBe(4);
    cards.forEach((card) => {
      expect(card.querySelectorAll('.chromosome-in-cell').length).toBe(5);
      expect(card.querySelectorAll('app-chromosome-svg').length).toBe(6);
      expect(card.querySelector('.chromosome-svg--replicated')).toBeNull();
      expect(card.querySelector('.inspection-panel')).not.toBeNull();
      expect(card.querySelector('.gamete-gene-analysis')).not.toBeNull();
      expect(card.querySelector<HTMLButtonElement>('.chromosome-in-cell')?.disabled).toBeFalse();
      expect(card.querySelector('.choose')?.textContent).toContain('chamber');
    });
    expect(fixture.nativeElement.querySelectorAll('.gene-locus--visible').length).toBeGreaterThan(
      0,
    );
  });

  it('inspects chromosomes and gene loci independently inside a final gamete card', () => {
    component.finishMeiosis();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.gamete-card') as NodeListOf<HTMLElement>;
    const firstCard = cards[0];
    const secondCardSelection = cards[1].querySelector('.selection-readout')?.textContent;
    const secondChromosome = firstCard.querySelectorAll<HTMLButtonElement>('.chromosome-in-cell')[1];
    secondChromosome.click();
    fixture.detectChanges();

    expect(firstCard.querySelector('.selection-readout')?.textContent).toContain('Chr 2');
    const locus = firstCard.querySelector<HTMLElement>('.inspection-panel .gene-locus--interactive');
    locus?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(firstCard.querySelector('.gamete-gene-analysis')?.textContent).toContain('Inherited allele');
    expect(cards[1].querySelector('.selection-readout')?.textContent).toBe(secondCardSelection);
  });

  it('builds gamete chromosomes from the shared workbench band and locus catalog', () => {
    const chromosome = component.run()!.gametes[0].chromosomes[0];
    const visual = chromosomeVisual(chromosome.chromosome);
    const model = meiosisGameteChromosomeSvgModel(chromosome);

    expect(model.length).toBe(visual.length);
    expect(model.centromere).toBe(visual.centromere);
    expect(model.bands).toEqual(visual.bands);
    expect(model.loci.map((locus) => locus.color)).toEqual(
      chromosome.loci.map((locus) => geneDnaRecord(locus.traitId).locusColor),
    );
    expect(model.loci.map((locus) => locus.symbol)).toEqual(
      chromosome.loci.map((locus) => locus.allele),
    );
    expect(model.loci.map((locus) => locus.marking?.mutationType)).toEqual(
      chromosome.loci.map((locus) =>
        locus.dominance === 'dominant'
          ? 'reference'
          : geneDnaRecord(locus.traitId).mutation.type,
      ),
    );
  });

  it('uses the shorter shared Y-chromosome visual for male gametes', () => {
    fixture.componentRef.setInput('sex', 'male');
    fixture.detectChanges();
    const yChromosome = component
      .run()!
      .gametes.flatMap((gamete) => gamete.chromosomes)
      .find((chromosome) => chromosome.sexChromosome === 'Y');

    expect(yChromosome).toBeDefined();
    const model = meiosisGameteChromosomeSvgModel(yChromosome!);
    expect(model.length).toBe(chromosomeVisual('Chr Y').length);
    expect(model.centromere).toBe(chromosomeVisual('Chr Y').centromere);
    expect(model.leftLabel).toBe('Yp');
  });

  it('loads a gamete into its chamber directly from its quadrant', () => {
    let selected: SelectedMeiosisGamete | null = null;
    component.gameteSelected.subscribe((value) => (selected = value));
    component.finishMeiosis();
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelectorAll('.gamete-card .choose')[1] as HTMLButtonElement
    ).click();

    expect(selected).not.toBeNull();
    expect(selected!.gamete.index).toBe(1);
    expect(component.chosenGameteIndex()).toBe(1);
  });

  it('emits exactly the inspected run and chosen gamete', () => {
    let selected: SelectedMeiosisGamete | null = null;
    component.gameteSelected.subscribe((value) => (selected = value));
    component.finishMeiosis();
    component.choose(2);
    component.reason.set('Carries the recessive target allele.');
    component.sendChosenGamete();

    expect(selected).not.toBeNull();
    expect(selected!.gamete.index).toBe(2);
    expect(selected!.run.seed).toBe(component.run()!.seed);
    expect(selected!.reason).toContain('recessive');
  });

  it('creates a different deterministic run when the student requests new random meiosis', () => {
    const firstSeed = component.run()!.seed;
    component.rerunMeiosis();
    fixture.detectChanges();

    expect(component.run()!.seed).not.toBe(firstSeed);
    expect(component.phaseIndex()).toBe(0);
  });
});
