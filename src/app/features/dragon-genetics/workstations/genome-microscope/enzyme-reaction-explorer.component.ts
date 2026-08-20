import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  output,
  signal,
} from '@angular/core';
import { DRAGON_ENZYME_REACTIONS, DragonEnzymeReaction } from './dragon-enzyme-reactions.models';

export type EnzymeReactionPhase = 'ready' | 'docking' | 'catalyzing' | 'released' | 'rejected';

export type EnzymeTrialOutcome = 'untested' | 'match' | 'no-match';

export interface EnzymeReactionResult {
  readonly enzymeId: string;
  readonly productId: string;
  readonly productName: string;
  readonly totalBuilt: number;
}

let nextEnzymeExplorerId = 0;

@Component({
  selector: 'app-enzyme-reaction-explorer',
  templateUrl: './enzyme-reaction-explorer.component.html',
  styleUrl: './enzyme-reaction-explorer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnzymeReactionExplorerComponent implements OnDestroy {
  readonly reactionCompleted = output<EnzymeReactionResult>();

  readonly reactions = DRAGON_ENZYME_REACTIONS;
  readonly selectedReactionId = signal(this.reactions[0].id);
  readonly targetReactionId = signal(this.reactions[0].id);
  readonly catalystActive = signal(false);
  readonly phase = signal<EnzymeReactionPhase>('ready');
  readonly productCounts = signal<Readonly<Record<string, number>>>({});
  readonly trialOutcomes = signal<Readonly<Record<string, EnzymeTrialOutcome>>>({});

  readonly activeReaction = computed<DragonEnzymeReaction>(
    () =>
      this.reactions.find((reaction) => reaction.id === this.selectedReactionId()) ??
      this.reactions[0],
  );
  readonly targetReaction = computed<DragonEnzymeReaction>(
    () =>
      this.reactions.find((reaction) => reaction.id === this.targetReactionId()) ??
      this.reactions[0],
  );
  readonly selectedEnzymeMatchesTarget = computed(
    () => this.activeReaction().id === this.targetReaction().id,
  );
  readonly currentProductCount = computed(
    () => this.productCounts()[this.targetReaction().product.id] ?? 0,
  );
  readonly status = computed(() => {
    if (this.phase() === 'ready' && !this.catalystActive()) {
      return 'Catalyst inactive — substrates continue moving without reacting.';
    }
    switch (this.phase()) {
      case 'docking':
        return 'Matching substrates are docking in the active site.';
      case 'catalyzing':
        return 'The enzyme holds both substrates close enough for bonds to rearrange.';
      case 'released':
        return `${this.activeReaction().product.name} released; the enzyme is unchanged.`;
      default:
        return 'The active site is ready to bind its matching substrates.';
    }
  });
  readonly trialStatus = computed(() => {
    if (this.phase() === 'ready' && !this.catalystActive()) {
      return `Test candidate enzymes to find the active site that builds ${this.targetReaction().product.name}.`;
    }
    switch (this.phase()) {
      case 'docking':
        return `${this.activeReaction().enzymeCode} is approaching the target substrates.`;
      case 'catalyzing':
        return 'The active site fits. Bonds are rearranging.';
      case 'released':
        return `${this.activeReaction().enzymeCode} built ${this.targetReaction().product.name}; the enzyme is unchanged.`;
      case 'rejected':
        return `${this.activeReaction().enzymeCode} does not fit these substrates. No product formed.`;
      default:
        return 'The selected enzyme is ready to test.';
    }
  });
  readonly reactionRunning = computed(
    () => this.phase() === 'docking' || this.phase() === 'catalyzing',
  );
  readonly ambientCopies = [0, 1, 2] as const;

  readonly instanceId = `enzyme-reaction-${nextEnzymeExplorerId++}`;
  readonly enzymeGradientId = `${this.instanceId}-enzyme-gradient`;
  readonly substrateAGradientId = `${this.instanceId}-substrate-a-gradient`;
  readonly substrateBGradientId = `${this.instanceId}-substrate-b-gradient`;
  readonly productGradientId = `${this.instanceId}-product-gradient`;
  readonly enzymeMaskId = `${this.instanceId}-enzyme-mask`;
  readonly shadowId = `${this.instanceId}-shadow`;
  readonly glowId = `${this.instanceId}-glow`;

  private timers: ReturnType<typeof setTimeout>[] = [];

  selectReaction(reactionId: string): void {
    if (!this.reactions.some((reaction) => reaction.id === reactionId)) return;
    this.clearTimers();
    this.selectedReactionId.set(reactionId);
    this.phase.set('ready');
    this.restartAutomaticAttempt();
  }

  selectTarget(reactionId: string): void {
    if (!this.reactions.some((reaction) => reaction.id === reactionId)) return;
    this.clearTimers();
    this.targetReactionId.set(reactionId);
    this.phase.set('ready');
    this.restartAutomaticAttempt();
  }

  toggleCatalyst(): void {
    this.clearTimers();
    this.catalystActive.update((active) => !active);
    this.phase.set('ready');
    if (this.catalystActive()) {
      if (this.prefersReducedMotion()) {
        this.resolveAttempt();
      } else {
        this.schedule(() => this.beginReaction(), 160);
      }
    }
  }

  runReaction(): void {
    if (this.catalystActive() || this.reactionRunning()) return;
    this.clearTimers();

    if (this.prefersReducedMotion()) {
      this.resolveAttempt();
      return;
    }

    if (this.phase() === 'released' || this.phase() === 'rejected') {
      this.phase.set('ready');
      this.schedule(() => this.beginReaction(), 40);
    } else {
      this.beginReaction();
    }
  }

  productCount(reaction: DragonEnzymeReaction): number {
    return this.productCounts()[reaction.product.id] ?? 0;
  }

  trialOutcome(reaction: DragonEnzymeReaction): EnzymeTrialOutcome {
    return this.trialOutcomes()[this.trialKey(this.targetReaction(), reaction)] ?? 'untested';
  }

  trialLabel(reaction: DragonEnzymeReaction): string {
    switch (this.trialOutcome(reaction)) {
      case 'match':
        return 'Built the target';
      case 'no-match':
        return 'No match';
      default:
        return 'Not tested';
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private completeReaction(): void {
    const enzyme = this.activeReaction();
    const reaction = this.targetReaction();
    const totalBuilt = this.currentProductCount() + 1;
    this.recordTrial('match');
    this.productCounts.update((counts) => ({
      ...counts,
      [reaction.product.id]: totalBuilt,
    }));
    this.phase.set('released');
    this.reactionCompleted.emit({
      enzymeId: enzyme.id,
      productId: reaction.product.id,
      productName: reaction.product.name,
      totalBuilt,
    });
    if (this.catalystActive() && !this.prefersReducedMotion()) {
      this.schedule(() => {
        this.phase.set('ready');
        this.schedule(() => this.beginReaction(), 240);
      }, 500);
    }
  }

  private rejectReaction(): void {
    this.recordTrial('no-match');
    this.phase.set('rejected');
    if (this.catalystActive() && !this.prefersReducedMotion()) {
      this.schedule(() => {
        this.phase.set('ready');
        this.schedule(() => this.beginReaction(), 240);
      }, 420);
    }
  }

  private resolveAttempt(): void {
    if (this.selectedEnzymeMatchesTarget()) this.completeReaction();
    else this.rejectReaction();
  }

  private beginReaction(): void {
    if (this.reactionRunning()) return;
    this.phase.set('docking');
    this.schedule(() => {
      if (!this.selectedEnzymeMatchesTarget()) {
        this.rejectReaction();
        return;
      }
      this.phase.set('catalyzing');
      this.schedule(() => this.completeReaction(), 320);
    }, 360);
  }

  private restartAutomaticAttempt(): void {
    if (!this.catalystActive()) return;
    if (this.prefersReducedMotion()) this.resolveAttempt();
    else this.schedule(() => this.beginReaction(), 160);
  }

  private recordTrial(outcome: Exclude<EnzymeTrialOutcome, 'untested'>): void {
    const key = this.trialKey(this.targetReaction(), this.activeReaction());
    this.trialOutcomes.update((outcomes) => ({ ...outcomes, [key]: outcome }));
  }

  private trialKey(target: DragonEnzymeReaction, enzyme: DragonEnzymeReaction): string {
    return `${target.id}:${enzyme.id}`;
  }

  private schedule(action: () => void, delay: number): void {
    this.timers.push(setTimeout(action, delay));
  }

  private clearTimers(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
