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
      .toBe(
        fixture.componentInstance.traits.length + fixture.componentInstance.bodyGenes.length,
      );
    expect(text()).toContain('Modeled sex chromosomes');
  });

  it('uses the standard genotype button treatment for the sex selector', () => {
    const choices = element().querySelectorAll('.sex-model__choices .gene__choice');

    expect(choices.length).toBe(2);
    expect(choices[0].classList.contains('gene__choice--active')).toBe(true);

    fixture.componentInstance.selectSex('male');
    fixture.detectChanges();

    expect(choices[0].classList.contains('gene__choice--active')).toBe(false);
    expect(choices[1].classList.contains('gene__choice--active')).toBe(true);
  });

  it('puts each gene summary on one header row with its buttons directly below', () => {
    for (const gene of element().querySelectorAll('.gene')) {
      const header = gene.querySelector('.gene__header');
      const choices = gene.querySelector('.gene__choices');

      expect(header).toBeTruthy();
      expect(header?.nextElementSibling).toBe(choices);
      expect(gene.querySelector('p.gene__phenotype')).toBeNull();
    }
  });

  it('shows genes or bench results beside the same canvas, never both at once', () => {
    const canvasColumn = element().querySelector('.bench__stage-column');
    const genes = element().querySelector('.bench__panel-view--alternate') as HTMLElement;
    const results = element().querySelector('.bench__panel-view--results') as HTMLElement;
    const resultsButton = [...element().querySelectorAll<HTMLButtonElement>(
      '.bench__panel-switch-button',
    )].find((button) => button.textContent?.includes('Bench results'))!;

    expect(canvasColumn).toBeTruthy();
    expect(genes.hidden).toBe(false);
    expect(results.hidden).toBe(true);

    resultsButton.click();
    fixture.detectChanges();

    expect(genes.hidden).toBe(true);
    expect(results.hidden).toBe(false);
    expect(element().querySelector('.bench__stage-column')).toBe(canvasColumn);
  });

  it('loads six editable classic dragon body types as expressed genotypes', () => {
    expect(element().querySelectorAll('.body-types__choice').length).toBe(6);
    expect(text()).toContain('Regal Dragon');
    expect(text()).toContain('Bulwark Dragon');
    expect(text()).toContain('Sky Courser Dragon');
    expect(text()).toContain('Marsh Prowler Dragon');
    expect(text()).toContain('Double-Wing Dragon');
    expect(text()).toContain('Long Serpent Dragon');

    fixture.componentInstance.selectBodyType('double-wing-dragon');
    fixture.detectChanges();

    expect(fixture.componentInstance.isBodyTypeSelected('double-wing-dragon')).toBe(true);
    expect(fixture.componentInstance.expressedArenaGenome()['secondary-wings']).toEqual(['Q', 'q']);
    const descriptor = fixture.componentInstance.build().source;
    if (descriptor.kind !== 'descriptor') {
      expect.fail('expected an expressed dragon descriptor');
      return;
    }
    expect(
      descriptor.descriptor.blueprint.parts.filter(
        (part) => part.visualProfile?.profileId === 'dragon-secondary-wing',
      ),
    ).toHaveLength(2);
  });

  it('removes bioluminescence and expresses P_ as three tall rows versus one tall pp row', () => {
    expect(fixture.componentInstance.traits.some((trait) => trait.name === 'Bioluminescence'))
      .toBe(false);
    const spikes = fixture.componentInstance.traits.find((trait) => trait.id === 'spikes')!;
    const bodyParameters = (): Record<string, unknown> | undefined => {
      const source = fixture.componentInstance.build().source;
      if (source.kind !== 'descriptor') return undefined;
      return source.descriptor.blueprint.parts.find(
        (part) => part.visualProfile?.profileId === 'dragon-body',
      )?.visualProfile?.parameters;
    };

    fixture.componentInstance.select('spikes', fixture.componentInstance.choicesFor(spikes)[1]);
    expect(bodyParameters()?.['backSpikeRows']).toBe(3);
    expect(bodyParameters()?.['backSpikeCount']).toBe(8);
    expect(bodyParameters()?.['backSpikeScale']).toBe(1.15);

    fixture.componentInstance.select('spikes', fixture.componentInstance.choicesFor(spikes)[2]);
    expect(bodyParameters()?.['backSpikeRows']).toBe(1);
    expect(bodyParameters()?.['backSpikeCount']).toBe(8);
    expect(bodyParameters()?.['backSpikeScale']).toBe(1.15);
  });

  it('expresses the correct rendered chassis for every classic type', () => {
    const expectedChassis = {
      'regal-dragon': 'regal',
      'bulwark-dragon': 'bulwark',
      'sky-courser-dragon': 'courser',
      'marsh-prowler-dragon': 'prowler',
      'double-wing-dragon': 'four-wing',
      'long-serpent-dragon': 'serpent',
    } as const;

    for (const [typeId, chassis] of Object.entries(expectedChassis)) {
      fixture.componentInstance.selectBodyType(typeId as keyof typeof expectedChassis);
      const source = fixture.componentInstance.build().source;
      if (source.kind !== 'descriptor') {
        expect.fail(`expected an expressed descriptor for ${typeId}`);
        return;
      }
      const body = source.descriptor.blueprint.parts.find(
        (part) => part.visualProfile?.profileId === 'dragon-body',
      );
      expect(body?.visualProfile?.parameters?.['bodyArchetype'], typeId).toBe(chassis);
    }
  });

  it('expresses the long serpent as a wingless, long-tailed serpent chassis', () => {
    fixture.componentInstance.selectBodyType('long-serpent-dragon');
    fixture.detectChanges();

    const source = fixture.componentInstance.build().source;
    if (source.kind !== 'descriptor') {
      expect.fail('expected an expressed dragon descriptor');
      return;
    }
    const body = source.descriptor.blueprint.parts.find(
      (part) => part.visualProfile?.profileId === 'dragon-body',
    );
    expect(body?.visualProfile?.parameters?.['bodyArchetype']).toBe('serpent');
    expect(source.descriptor.blueprint.parts.some((part) => part.roles?.includes('wing')))
      .toBe(false);
    expect(fixture.componentInstance.expressedArenaGenome()['tail-length']).toEqual(['T', 't']);
    expect(
      source.descriptor.blueprint.parts.filter((part) => part.id.includes('-middle-')),
    ).toHaveLength(6);
    expect(
      source.descriptor.blueprint.parts.filter(
        (part) => part.visualProfile?.profileId === 'dragon-tail-stinger',
      ),
    ).toHaveLength(1);
    const head = source.descriptor.blueprint.parts.find(
      (part) => part.visualProfile?.profileId === 'dragon-head-horned',
    );
    expect(head?.visualProfile?.parameters?.['browLength']).toBe(0);
  });

  it('clears the loaded body type when a body-plan allele changes', () => {
    fixture.componentInstance.selectBodyType('bulwark-dragon');
    expect(fixture.componentInstance.isBodyTypeSelected('bulwark-dragon')).toBe(true);

    const bodyPlan = fixture.componentInstance.bodyGenes.find(
      (trait) => trait.id === 'body-type',
    )!;
    const dominant = fixture.componentInstance.bodyChoicesFor(bodyPlan)[0];
    fixture.componentInstance.selectBodyGene('body-type', dominant);

    expect(fixture.componentInstance.isBodyTypeSelected('bulwark-dragon')).toBe(false);
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
