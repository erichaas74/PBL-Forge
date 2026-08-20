import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  DRAGON_ENZYME_REACTIONS,
  DragonEnzymeMolecule,
  DragonEnzymeReaction,
} from './dragon-enzyme-reactions.models';

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
  /** Restricts the bench to a subset of enzymes; defaults to every enzyme gene. */
  readonly availableReactions = input<readonly DragonEnzymeReaction[]>(DRAGON_ENZYME_REACTIONS);
  readonly reactionCompleted = output<EnzymeReactionResult>();

  readonly reactions = computed(() =>
    this.availableReactions().length ? this.availableReactions() : DRAGON_ENZYME_REACTIONS,
  );
  readonly selectedReactionId = signal(DRAGON_ENZYME_REACTIONS[0].id);
  readonly targetReactionId = signal(DRAGON_ENZYME_REACTIONS[0].id);
  readonly catalystActive = signal(false);
  readonly phase = signal<EnzymeReactionPhase>('ready');
  readonly productCounts = signal<Readonly<Record<string, number>>>({});
  readonly trialOutcomes = signal<Readonly<Record<string, EnzymeTrialOutcome>>>({});

  readonly activeReaction = computed<DragonEnzymeReaction>(
    () =>
      this.reactions().find((reaction) => reaction.id === this.selectedReactionId()) ??
      this.reactions()[0],
  );
  readonly targetReaction = computed<DragonEnzymeReaction>(
    () =>
      this.reactions().find((reaction) => reaction.id === this.targetReactionId()) ??
      this.reactions()[0],
  );

  /** Molecules drifting in the cell fluid, waiting for a matching active site. */
  readonly inputMolecules = computed<readonly DragonEnzymeMolecule[]>(
    () => this.targetReaction().reactants,
  );
  /** Molecules the reaction releases. */
  readonly outputMolecules = computed<readonly DragonEnzymeMolecule[]>(
    () => this.targetReaction().products,
  );
  /** The candidate enzyme's cavity, cut from its own body. */
  readonly activeSiteShapes = computed(() => this.activeReaction().activeSite);
  readonly breakingDown = computed(() => this.targetReaction().action === 'break-down');

  readonly selectedEnzymeMatchesTarget = computed(
    () => this.activeReaction().id === this.targetReaction().id,
  );
  readonly targetProductName = computed(() => this.targetReaction().traitProduct.name);
  readonly currentProductCount = computed(
    () => this.productCounts()[this.targetReaction().traitProduct.id] ?? 0,
  );
  readonly trialStatus = computed(() => {
    const target = this.targetReaction();
    if (this.phase() === 'ready' && !this.catalystActive()) {
      return `Test candidate enzymes to find the active site that ${target.actionLabel.toLowerCase()} ${target.traitProduct.name}.`;
    }
    switch (this.phase()) {
      case 'docking':
        return `${this.activeReaction().enzymeCode} is approaching the target molecules.`;
      case 'catalyzing':
        return 'The active site fits. Bonds are rearranging.';
      case 'released':
        return `${this.activeReaction().enzymeCode} released ${target.traitProduct.name}; the enzyme is unchanged.`;
      case 'rejected':
        return `${this.activeReaction().enzymeCode} does not fit these molecules. No reaction.`;
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
  readonly reactantGradientId = `${this.instanceId}-reactant-gradient`;
  readonly productGradientId = `${this.instanceId}-product-gradient`;
  readonly enzymeMaskId = `${this.instanceId}-enzyme-mask`;
  readonly shadowId = `${this.instanceId}-shadow`;
  readonly glowId = `${this.instanceId}-glow`;

  private timers: ReturnType<typeof setTimeout>[] = [];

  selectReaction(reactionId: string): void {
    if (!this.reactions().some((reaction) => reaction.id === reactionId)) return;
    this.clearTimers();
    this.selectedReactionId.set(reactionId);
    this.phase.set('ready');
    this.restartAutomaticAttempt();
  }

  selectTarget(reactionId: string): void {
    if (!this.reactions().some((reaction) => reaction.id === reactionId)) return;
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
    return this.productCounts()[reaction.traitProduct.id] ?? 0;
  }

  trialOutcome(reaction: DragonEnzymeReaction): EnzymeTrialOutcome {
    return this.trialOutcomes()[this.trialKey(this.targetReaction(), reaction)] ?? 'untested';
  }

  trialLabel(reaction: DragonEnzymeReaction): string {
    switch (this.trialOutcome(reaction)) {
      case 'match':
        return 'Ran the reaction';
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
      [reaction.traitProduct.id]: totalBuilt,
    }));
    this.phase.set('released');
    this.reactionCompleted.emit({
      enzymeId: enzyme.id,
      productId: reaction.traitProduct.id,
      productName: reaction.traitProduct.name,
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
