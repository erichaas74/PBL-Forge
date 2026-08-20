import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { provideDragonSpecimenProfile } from '../../simulation/domain/dragon-specimen.profile';
import { AccountDragonRecord } from './account-genetics-library.models';
import { buildAccountDragonCardView } from './dragon-account-card';
import { buildDragonCardGenomeView, DragonCardChromosomeId } from './dragon-card-genome';
import { DragonFlipCardComponent } from './dragon-flip-card.component';
import { FannedCardDeckComponent } from './fanned-card-deck.component';

@Component({
  selector: 'app-dragon-card-deck-selector',
  imports: [DragonFlipCardComponent, FannedCardDeckComponent],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './dragon-card-deck-selector.component.html',
  styleUrl: './dragon-card-deck-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonCardDeckSelectorComponent {
  readonly dragons = input.required<readonly AccountDragonRecord[]>();
  readonly selectedDragonId = input<string | null>(null);
  readonly disabled = input(false);
  readonly compact = input(false);
  readonly ariaLabel = input('Dragon card deck selector');

  readonly dragonSelected = output<AccountDragonRecord>();

  readonly flippedDragonId = signal<string | null>(null);
  readonly selectedCardChromosomes = signal<Readonly<Record<string, DragonCardChromosomeId>>>({});
  readonly activeId = computed(() => {
    const dragons = this.dragons();
    const requested = this.selectedDragonId();
    return dragons.some((dragon) => dragon.id === requested) ? requested! : (dragons[0]?.id ?? '');
  });
  readonly cardViews = computed(
    () =>
      new Map(
        this.dragons().map((dragon) => [dragon.id, buildAccountDragonCardView(dragon)] as const),
      ),
  );
  readonly genomeViews = computed(
    () =>
      new Map(
        this.dragons().map(
          (dragon) => [dragon.id, buildDragonCardGenomeView(dragon, dragon.sex)] as const,
        ),
      ),
  );

  readonly labelFor = (dragon: AccountDragonRecord): string => dragon.name;
  readonly subtitleFor = (dragon: AccountDragonRecord): string => dragon.title;

  selectDragon(dragon: AccountDragonRecord): void {
    if (this.disabled()) return;
    this.flippedDragonId.set(null);
    this.dragonSelected.emit(dragon);
  }

  toggleCard(dragonId: string): void {
    if (this.disabled() || dragonId !== this.activeId()) return;
    this.flippedDragonId.update((current) => (current === dragonId ? null : dragonId));
  }

  selectedChromosome(dragonId: string): DragonCardChromosomeId {
    return this.selectedCardChromosomes()[dragonId] ?? 'Chr 1';
  }

  selectChromosome(dragonId: string, chromosomeId: string): void {
    this.selectedCardChromosomes.update((current) => ({
      ...current,
      [dragonId]: chromosomeId as DragonCardChromosomeId,
    }));
  }
}
