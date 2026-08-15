import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAGON_PARENTS } from '../../simulation/domain/dragon-inheritance';
import { chromosomeVisual, DRAGON_LOCUS_COLORS } from '../shared/dragon-chromosome.catalog';
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

    expect(component.phase().name).toBe('Four gametes');
    expect(fixture.nativeElement.querySelectorAll('.gamete-card').length).toBe(4);
    expect(fixture.nativeElement.querySelector('.cell-stage').hidden).toBeFalse();
    expect(fixture.nativeElement.querySelector('canvas').hidden).toBeTrue();
    expect(fixture.nativeElement.querySelector('.gamete-stage-grid')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.gamete-workbench')).toBeNull();
  });

  it('loads chromosome evidence into each of the four canvas quadrants', () => {
    component.finishMeiosis();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.gamete-card') as NodeListOf<HTMLElement>;
    expect(cards.length).toBe(4);
    cards.forEach((card) => {
      expect(card.querySelectorAll('.chromosome-in-cell').length).toBe(5);
      expect(card.querySelectorAll('app-chromosome-svg').length).toBe(5);
      expect(card.querySelector('.choose')?.textContent).toContain('chamber');
    });
    expect(fixture.nativeElement.querySelectorAll('.gene-locus--visible').length).toBeGreaterThan(
      0,
    );
  });

  it('builds gamete chromosomes from the shared workbench band and locus catalog', () => {
    const chromosome = component.run()!.gametes[0].chromosomes[0];
    const visual = chromosomeVisual(chromosome.chromosome);
    const model = meiosisGameteChromosomeSvgModel(chromosome);

    expect(model.length).toBe(visual.length);
    expect(model.centromere).toBe(visual.centromere);
    expect(model.bands.slice(0, visual.bands.length)).toEqual(visual.bands);
    expect(model.loci.map((locus) => locus.color)).toEqual(
      model.loci.map((_, index) => DRAGON_LOCUS_COLORS[index % DRAGON_LOCUS_COLORS.length]),
    );
    expect(model.loci.map((locus) => locus.symbol)).toEqual(
      chromosome.loci.map((locus) => locus.allele),
    );
    expect(model.bands.slice(visual.bands.length).every((band) => !!band.pattern)).toBeTrue();
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
