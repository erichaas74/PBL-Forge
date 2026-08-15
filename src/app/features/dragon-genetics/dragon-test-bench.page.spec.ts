import { ComponentFixture, TestBed } from '@angular/core/testing';
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
