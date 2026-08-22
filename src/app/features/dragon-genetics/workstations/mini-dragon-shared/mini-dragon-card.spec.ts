import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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

  it('reads a dragon as visible forms and never as allele symbols', () => {
    const view = buildMiniDragonCardView(dragon);

    expect(view.traits).toHaveLength(13);
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

  it('turns over to the breeder record rather than to a chromosome view', async () => {
    await TestBed.configureTestingModule({ imports: [MiniDragonCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MiniDragonCardComponent);
    fixture.componentRef.setInput('card', buildMiniDragonCardView(dragon));
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css(`[data-testid="mini-card-flip-${dragon.id}"]`))
      .nativeElement.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.flipped()).toBe(true);
    const traits = fixture.nativeElement.querySelectorAll('.mini-card__traits li');
    expect(traits).toHaveLength(13);
    fixture.destroy();
  });
});
