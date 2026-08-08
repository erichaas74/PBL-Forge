import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DragonArenaComponent } from './dragon-arena.component';
import { findParent, runDragonBatch } from './dragon-genetics.domain';
import { DRAGON_TRAITS, genotypeLabel } from './simulation/domain/dragon-inheritance';
import { DragonBattleResult, StudentDragonRecord } from './dragon-genetics.models';

/** Deterministic seed so the duel loads the same champion on every visit. */
const DUEL_TEST_RUN = 7;

/**
 * One-click arena test: loads a preset two-dragon duel — a genetics-lab champion
 * versus the built-in Arena Warden — using the same materialization pipeline as
 * the lab's champion trial. No other build type is reachable from here.
 */
@Component({
  selector: 'app-dragon-duel-page',
  imports: [DragonArenaComponent],
  template: `
    <div class="duel-page">
      <header>
        <span class="eyebrow">Dragon duel test</span>
        <h1>{{ champion.name }} vs. The Arena Warden</h1>
        <p class="genome">Champion genotype ({{ parentage }}): {{ championGenotype }}</p>
        @if (result(); as battle) {
          <p class="result">
            {{ battle.won ? 'Champion won' : battle.winnerName + ' won' }}
            in {{ battle.elapsedSeconds.toFixed(1) }}s
            — {{ battle.remainingHealthPercent }}% champion health remaining.
          </p>
        }
      </header>
      <app-dragon-arena [champion]="champion" (battleFinished)="result.set($event)" />
    </div>
  `,
  styles: `
    .duel-page { max-width: 72rem; margin: 0 auto; padding: 1.6rem 1.2rem 2.4rem; }
    header { margin-bottom: 1rem; }
    .eyebrow { font-size: var(--text-base); font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; }
    h1 { margin: 0.2rem 0 0.35rem; }
    .genome { margin: 0; font-size: 0.92rem; opacity: 0.85; }
    .result { margin: 0.5rem 0 0; font-weight: 700; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonDuelPage {
  readonly parentage = 'Ember × Tide';
  readonly champion: StudentDragonRecord =
    runDragonBatch(findParent('ember'), findParent('tide'), DUEL_TEST_RUN, 1).sample[0];
  readonly championGenotype = DRAGON_TRAITS
    .map(trait => `${trait.name} ${genotypeLabel(this.champion.genome[trait.id])}`)
    .join(' · ');
  readonly result = signal<DragonBattleResult | null>(null);
}
