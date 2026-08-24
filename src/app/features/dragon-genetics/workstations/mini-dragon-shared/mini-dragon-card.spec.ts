import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import {
  stubSpecimenThumbnailRendering,
  stubSpecimenViewportRendering,
} from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { standardMatches } from '../companion-show/companion-show.domain';
import { CompanionDragon } from '../companion-show/companion-show.models';
import { MINI_FOUNDERS, miniPhenotypeFormId } from '../companion-show/mini-dragon.genetics';
import { MiniDragonCardComponent } from './mini-dragon-card.component';
import { buildMiniDragonCardView } from './mini-dragon-card';

describe('mini dragon card', () => {
  const founder = MINI_FOUNDERS[0];
  const dragon: CompanionDragon = {
    id: founder.id,
    name: founder.name,
    title: founder.title,
    genome: founder.genome,
    origin: 'founder',
    generation: 0,
    parentIds: null,
    litterId: null,
  };

  beforeEach(() => {
    stubSpecimenThumbnailRendering();
    stubSpecimenViewportRendering();
  });

  it('reads a dragon as visible forms and never as allele symbols', () => {
    const view = buildMiniDragonCardView(dragon);

    expect(view.traits).toHaveLength(24);
    for (const trait of view.traits) {
      // A card that leaked a genotype would answer the question the breeding
      // programme exists to ask.
      expect(trait.formLabel).not.toMatch(/^[A-Za-z]{1,2}[A-Za-z]?$/);
      expect(trait.matched).toBeNull();
    }
  });

  it('marks each trait against the standard in force', () => {
    const matchingForm = miniPhenotypeFormId('coat', dragon.genome);
    const targets = [{ geneId: 'coat' as const, formId: matchingForm }];
    const view = buildMiniDragonCardView(dragon, {
      matches: standardMatches(dragon.genome, targets),
    });

    expect(view.targetCount).toBe(1);
    expect(view.matchedCount).toBe(1);
    expect(view.meetsStandard).toBe(true);
    expect(view.traits.find((trait) => trait.geneId === 'coat')?.matched).toBe(true);
    expect(view.traits.find((trait) => trait.geneId === 'horns')?.matched).toBeNull();
  });

  it('emits the dragon id when its card is chosen', async () => {
    await TestBed.configureTestingModule({ imports: [MiniDragonCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MiniDragonCardComponent);
    fixture.componentRef.setInput('card', buildMiniDragonCardView(dragon));
    fixture.detectChanges();

    let chosen: string | null = null;
    fixture.componentInstance.cardSelected.subscribe((id) => (chosen = id));
    fixture.debugElement
      .query(By.css(`[data-testid="mini-card-select-${dragon.id}"]`))
      .nativeElement.click();

    expect(chosen).toBe(dragon.id);
    fixture.destroy();
  });

  it('uses the shared chromosome back used by Arena cards', async () => {
    await TestBed.configureTestingModule({ imports: [MiniDragonCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MiniDragonCardComponent);
    fixture.componentRef.setInput('card', buildMiniDragonCardView(dragon));
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css(`[data-testid="mini-card-flip-${dragon.id}"]`))
      .nativeElement.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.flipped()).toBe(true);
    const genes = fixture.nativeElement.querySelectorAll('.dragon-card__gene');
    expect(genes.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('app-cell-model')).not.toBeNull();
    fixture.destroy();
  });

  it('animates only the selected card without enabling portrait rotation', async () => {
    await TestBed.configureTestingModule({ imports: [MiniDragonCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MiniDragonCardComponent);
    fixture.componentRef.setInput('card', buildMiniDragonCardView(dragon));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(SpecimenViewportComponent))).toBeNull();
    expect(fixture.nativeElement.querySelector('app-specimen-thumb')).not.toBeNull();

    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();
    const viewport = fixture.debugElement.query(By.directive(SpecimenViewportComponent))
      .componentInstance as SpecimenViewportComponent;
    expect(viewport.interactive()).toBe(false);
    expect(viewport.animated()).toBe(true);

    fixture.componentInstance.toggleFlip();
    fixture.detectChanges();
    expect(viewport.animated()).toBe(false);
    fixture.destroy();
  });
});
