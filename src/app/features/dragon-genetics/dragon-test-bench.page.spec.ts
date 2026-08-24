import { ComponentFixture, TestBed } from '@angular/core/testing';
import { stubSpecimenViewportRendering } from '../../shared/assembly/preview/specimen-viewport.testing';
import { DragonTestBenchPage } from './dragon-test-bench.page';

describe('DragonTestBenchPage', () => {
  let fixture: ComponentFixture<DragonTestBenchPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(): string {
    return element().textContent ?? '';
  }

  beforeEach(async () => {
    stubSpecimenViewportRendering();
    await TestBed.configureTestingModule({ imports: [DragonTestBenchPage] }).compileComponents();
    fixture = TestBed.createComponent(DragonTestBenchPage);
    fixture.detectChanges();
  });

  it('starts on the lab dragon with every expressive gene on the panel', () => {
    expect(element().querySelectorAll('.gene').length)
      .toBe(fixture.componentInstance.traits.length);
    expect(text()).toContain('Modeled sex chromosomes');
  });

  it('gates the horn charge on the horns genotype, which no part announces', () => {
    expect(fixture.componentInstance.build().horned).toBe(true);

    fixture.componentInstance.select('horns', { genotype: ['h', 'h'], label: 'hh' });
    fixture.detectChanges();

    expect(fixture.componentInstance.build().horned).toBe(false);
  });

  it('swaps to the mini dragon, which has its own genes and no combat model', () => {
    fixture.componentInstance.selectSpecies('mini');
    fixture.detectChanges();

    expect(element().querySelectorAll('.gene').length)
      .toBe(fixture.componentInstance.miniGenes.length);
    expect(text()).toContain('Codominance');
    expect(text()).toContain('Not inherited');
    // The combat readouts belong to a species that fights; this one shows.
    expect(text()).not.toContain('Attack moves');
    expect(text()).not.toContain('Fitness in this model');
  });

  it('loads all five Society breeds as editable Mini Dragon presets', () => {
    fixture.componentInstance.selectSpecies('mini');
    fixture.detectChanges();

    expect(element().querySelectorAll('.mini-presets__choice').length).toBe(5);
    expect(text()).toContain('Puggle Dragon');
    expect(text()).toContain('Fairy Dragon');
    expect(text()).toContain('Triceratops Dragon');
    expect(text()).toContain('Imperial Serpent Dragon');
    expect(text()).toContain('Amphiptere');

    fixture.componentInstance.selectMiniBreed('amphiptere');
    fixture.detectChanges();
    expect(fixture.componentInstance.isMiniBreedSelected('amphiptere')).toBe(true);
    expect(fixture.componentInstance.miniForms()['tail']).toBe('tail:fork');
    expect(fixture.componentInstance.miniForms()['wings']).toBe('wings:broad');
  });

  it('keeps a loaded breed editable and clears its selected state after a trait change', () => {
    fixture.componentInstance.selectMiniBreed('puggle');
    expect(fixture.componentInstance.isMiniBreedSelected('puggle')).toBe(true);

    const sailEars = fixture.componentInstance.miniGenes
      .find((gene) => gene.id === 'ears')!.forms
      .find((form) => form.id === 'ears:sail')!;
    fixture.componentInstance.selectMiniForm('ears', sailEars);

    expect(fixture.componentInstance.isMiniBreedSelected('puggle')).toBe(false);
    expect(fixture.componentInstance.miniForms()['ears']).toBe('ears:sail');
  });

  it('redraws the same mini genome as a different individual on request', () => {
    fixture.componentInstance.selectSpecies('mini');
    fixture.detectChanges();

    const before = fixture.componentInstance.miniFeatures();
    const forms = fixture.componentInstance.miniSummary();
    fixture.componentInstance.nextMiniIndividual();
    fixture.detectChanges();

    expect(fixture.componentInstance.miniSummary()).toBe(forms);
    expect(fixture.componentInstance.miniFeatures()).not.toEqual(before);
  });

  it('offers the trained behaviours on both species, since neither inherits them', () => {
    expect(text()).toContain('Trained behaviours');

    fixture.componentInstance.selectSpecies('mini');
    fixture.detectChanges();

    expect(text()).toContain('Trained behaviours');
  });
});
