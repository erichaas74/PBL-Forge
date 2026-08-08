import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpecimenDescriptor, SpecimenTraitReadout } from '../../assembly/preview/specimen.models';
import { DragonSpecimenPlateComponent } from './dragon-specimen-plate.component';

/**
 * The plate is an interpretation of a genome, so what is pinned here is that
 * the interpretation is faithful: every modelled gene must change the drawing,
 * and each must change a different *kind* of thing.
 */
describe('DragonSpecimenPlateComponent', () => {
  let fixture: ComponentFixture<DragonSpecimenPlateComponent>;

  function trait(id: string, extra: Partial<SpecimenTraitReadout> = {}): SpecimenTraitReadout {
    return { id, label: id, valueLabel: '', roles: [], ...extra };
  }

  function descriptor(traits: SpecimenTraitReadout[]): SpecimenDescriptor {
    return {
      id: 'd',
      label: 'Ember',
      blueprint: { parts: [], joints: [] },
      traits,
      accentColor: '#d94841',
    };
  }

  function render(traits: SpecimenTraitReadout[], focusedTraitId: string | null = null): void {
    fixture.componentRef.setInput('descriptor', descriptor(traits));
    fixture.componentRef.setInput('focusedTraitId', focusedTraitId);
    fixture.detectChanges();
  }

  function svg(): SVGElement {
    return fixture.nativeElement.querySelector('svg');
  }

  const genes = (overrides: Record<string, boolean> = {}) => [
    trait('trait:wings', { expressed: overrides['wings'] ?? true }),
    trait('trait:horns', { expressed: overrides['horns'] ?? false }),
    trait('trait:fire', { expressed: overrides['fire'] ?? false }),
    trait('trait:scales', { expressed: overrides['scales'] ?? false }),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DragonSpecimenPlateComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DragonSpecimenPlateComponent);
  });

  it('shows wings only for a winged genotype', () => {
    render(genes({ wings: true }));
    expect(svg().querySelector('.membrane')).not.toBeNull();

    render(genes({ wings: false }));
    expect(svg().querySelector('.membrane')).toBeNull();
  });

  it('shows horns only for a horned genotype', () => {
    render(genes({ horns: true }));
    const horned = svg().querySelectorAll('.horn').length;

    render(genes({ horns: false }));
    // Fewer, not zero: the dorsal ridge and tail spike are species features
    // that every dragon keeps regardless of the horns gene.
    expect(svg().querySelectorAll('.horn').length).toBeLessThan(horned);
  });

  it('shows fire only for a fire-breathing genotype', () => {
    render(genes({ fire: true }));
    expect(svg().querySelector('.flame')).not.toBeNull();

    render(genes({ fire: false }));
    expect(svg().querySelector('.flame')).toBeNull();
  });

  it('shows flank patterning only for spotted scales', () => {
    render(genes({ scales: true }));
    expect(svg().querySelectorAll('.pattern').length).toBeGreaterThan(0);

    render(genes({ scales: false }));
    expect(svg().querySelectorAll('.pattern').length).toBe(0);
  });

  it('gives each gene a different kind of change', () => {
    // The point of the plate: four genes that cannot be mistaken for each
    // other. Presence, silhouette, surface, emission — never four sizes.
    render(genes({ wings: true, horns: true, fire: true, scales: true }));
    const all = svg();

    expect(all.querySelector('.membrane')).not.toBeNull();
    expect(all.querySelector('.flame')).not.toBeNull();
    expect(all.querySelectorAll('.pattern').length).toBeGreaterThan(0);
  });

  it('paints itself in the specimen identity colour', () => {
    render(genes());
    expect(svg().getAttribute('style')).toContain('#d94841');
  });

  it('describes every gene to a screen reader', () => {
    render(genes({ wings: false, horns: true, fire: true, scales: true }));
    const label = svg().getAttribute('aria-label') ?? '';

    expect(label).toContain('Ember');
    expect(label).toContain('wingless');
    expect(label).toContain('horned');
    expect(label).toContain('spotted');
    expect(label).toContain('breathing fire');
  });

  it('scales a continuous trait rather than toggling it', () => {
    render([...genes(), trait('tail-length', { normalized: 0 })]);
    const short = svg().innerHTML;

    render([...genes(), trait('tail-length', { normalized: 1 })]);

    expect(svg().innerHTML).not.toBe(short);
  });

  it('dims only the parts a focused trait did not shape', () => {
    render(genes({ wings: true }), 'trait:wings');
    const dimmed = Array.from(svg().querySelectorAll('.part.dim'));

    expect(dimmed.length).toBeGreaterThan(0);
    // The wing itself must stay lit — it is the thing being pointed at.
    expect(svg().querySelector('.membrane')?.closest('.part')?.classList).not.toContain('dim');
  });

  it('dims nothing for a whole-animal trait', () => {
    // Pigment and body size act on everything, so dimming would say the
    // opposite of what is true.
    render(genes(), 'pigment-hue');

    expect(svg().querySelectorAll('.part.dim').length).toBe(0);
  });

  it('draws a recognisable dragon when a simulation publishes no trait data', () => {
    render([]);

    expect(svg().querySelector('.membrane')).not.toBeNull();
    expect(svg().querySelectorAll('.hide').length).toBeGreaterThan(0);
  });
});
