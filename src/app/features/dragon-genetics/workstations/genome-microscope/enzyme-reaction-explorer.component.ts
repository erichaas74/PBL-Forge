import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import {
  DRAGON_ENZYME_REACTIONS,
  DragonEnzymeMolecule,
  DragonEnzymeReaction,
} from './dragon-enzyme-reactions.models';
import {
  FieldBounds,
  FieldEntity,
  FieldSlot,
  ejectFromSite,
  pullToSite,
  respawn,
  seatInSite,
  stepField,
} from './enzyme-cell-field';

export type EnzymeReactionPhase = 'ready' | 'docking' | 'catalyzing' | 'released' | 'rejected';

export type EnzymeTrialOutcome = 'untested' | 'match' | 'no-match';

export interface EnzymeReactionResult {
  readonly enzymeId: string;
  readonly productId: string;
  readonly productName: string;
  readonly totalBuilt: number;
}

/** Scene the reaction is drawn in, matching the SVG viewBox. */
const SCENE: FieldBounds = { width: 660, height: 340, pad: 44 };

/**
 * Every molecule and every enzyme is drawn at the same scale.
 *
 * That equality is what makes the fit legible: a product is not "about the
 * size of" the active site, it is the same box, so it drops in exactly.
 */
const BODY_SCALE = 0.85;

/** Where the catalyst waits. Molecules that dock here land on its active site. */
const SITE = { x: 330, y: 168 };

/**
 * How far a drifting molecule is lifted so its visible mass sits on its centre.
 *
 * A molecule fills only the top of its box and the enzyme fills the bottom, and
 * the two share the box centre once docked. Drawing a free molecule a little
 * higher keeps its drift, its wall bounces, and its collisions centred on what
 * a student can actually see; it settles back down as it seats.
 */
const DRIFT_LIFT = 28;

/** Bodies in the cell fluid: three of each reactant, two of each product. */
const FIELD_POPULATION: readonly FieldSlot[] = [
  'reactant-a',
  'reactant-a',
  'reactant-a',
  'reactant-b',
  'reactant-b',
  'reactant-b',
  'product-a',
  'product-a',
  'product-b',
  'product-b',
];

let nextEnzymeExplorerId = 0;

@Component({
  selector: 'app-enzyme-reaction-explorer',
  templateUrl: './enzyme-reaction-explorer.component.html',
  styleUrl: './enzyme-reaction-explorer.component.scss',
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
        return `${this.activeReaction().enzymeCode} is drawing the target molecules into its active site.`;
      case 'catalyzing':
        return 'The active site fits. Bonds are rearranging.';
      case 'released':
        return `${this.activeReaction().enzymeCode} released ${target.traitProduct.name}; the enzyme is unchanged.`;
      case 'rejected':
        return `${this.activeReaction().enzymeCode} does not fit these molecules. They bounce away unchanged.`;
      default:
        return 'The selected enzyme is ready to test.';
    }
  });
  readonly reactionRunning = computed(
    () => this.phase() === 'docking' || this.phase() === 'catalyzing',
  );

  /** Bodies drifting in the cell fluid. Positions are written straight to the DOM. */
  readonly fieldBodies: readonly FieldEntity[] = FIELD_POPULATION.map((slot, index) =>
    this.createBody(slot, index),
  );
  /** Extra catalyst copies, so the cell does not look like it holds one enzyme. */
  readonly ambientEnzymes: readonly FieldEntity[] = [0, 1].map((index) =>
    this.createBody('reactant-a', 100 + index, true),
  );
  readonly bodyScale = BODY_SCALE;
  readonly siteTransform = `translate(${SITE.x} ${SITE.y}) scale(${BODY_SCALE}) translate(-80 -60)`;

  readonly instanceId = `enzyme-reaction-${nextEnzymeExplorerId++}`;
  readonly enzymeGradientId = `${this.instanceId}-enzyme-gradient`;
  readonly reactantGradientId = `${this.instanceId}-reactant-gradient`;
  readonly productGradientId = `${this.instanceId}-product-gradient`;
  readonly shadowId = `${this.instanceId}-shadow`;
  readonly glowId = `${this.instanceId}-glow`;

  private readonly bodyRefs = viewChildren<ElementRef<SVGGElement>>('fieldBody');
  private readonly ambientRefs = viewChildren<ElementRef<SVGGElement>>('ambientEnzyme');
  private timers: ReturnType<typeof setTimeout>[] = [];
  private frame: number | null = null;
  private lastPhase: EnzymeReactionPhase = 'ready';
  private lastFrameTime = 0;

  constructor() {
    // A new target changes which molecule each body is carrying, so send them
    // back to the cell wall rather than letting a shape pop in mid-flight.
    effect(() => {
      this.targetReaction();
      this.releaseAllBodies();
    });
    this.startLoop();
  }

  ngOnDestroy(): void {
    this.clearTimers();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
  }

  /** Molecule a body is carrying, or null when this reaction has no such slot. */
  moleculeFor(slot: FieldSlot): DragonEnzymeMolecule | null {
    const index = slot.endsWith('-b') ? 1 : 0;
    const molecules = slot.startsWith('reactant') ? this.inputMolecules() : this.outputMolecules();
    return molecules[index] ?? null;
  }

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

  private createBody(slot: FieldSlot, index: number, enzyme = false): FieldEntity {
    const spread = enzyme ? 0.7 : 1;
    return {
      id: `${slot}-${index}`,
      slot,
      state: slot.startsWith('product') ? 'hidden' : 'free',
      x: SCENE.pad + ((index * 197) % (SCENE.width - SCENE.pad * 2)),
      y: SCENE.pad + ((index * 131) % (SCENE.height - SCENE.pad * 2)),
      vx: (((index % 5) - 2) / 2) * spread || 0.8,
      vy: (((index % 3) - 1) / 1.4) * spread || -0.6,
      rot: (index * 47) % 360,
      vrot: enzyme ? 0 : (((index % 4) - 1.5) / 3) * 2,
      timer: 0,
      seat: 0,
    };
  }

  /**
   * The animation loop.
   *
   * It runs outside Angular and writes transforms straight to the SVG, so sixty
   * frames a second of molecular drift never triggers change detection. The
   * reaction's own state stays in signals, and the loop only reacts to it.
   */
  private startLoop(): void {
    if (typeof requestAnimationFrame === 'undefined') return;

    const tick = (time: number) => {
      const step = this.lastFrameTime ? Math.min(3, (time - this.lastFrameTime) / 16.7) : 1;
      this.lastFrameTime = time;
      if (!this.prefersReducedMotion()) this.advance(step);
      this.render();
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private advance(step: number): void {
    const phase = this.phase();
    if (phase !== this.lastPhase) {
      this.onPhaseChanged(phase);
      this.lastPhase = phase;
    }

    if (phase === 'docking' || phase === 'catalyzing') {
      const seat = phase === 'catalyzing';
      for (const body of this.capturedBodies()) {
        if (seat) seatInSite(body, SITE.x, SITE.y);
        else pullToSite(body, SITE.x, SITE.y);
      }
    }

    stepField(this.fieldBodies, SCENE, step);
    stepField(this.ambientEnzymes, SCENE, step);
  }

  private onPhaseChanged(phase: EnzymeReactionPhase): void {
    if (phase === 'docking') {
      this.captureReactants();
      return;
    }
    if (phase === 'released') {
      this.releaseProducts();
      return;
    }
    if (phase === 'rejected') {
      // A mismatched site cannot hold them: they scatter, chemically unchanged.
      for (const body of this.capturedBodies()) {
        body.state = 'free';
        body.vx = (body.x < SITE.x ? -1 : 1) * 2.6;
        body.vy = -1.6;
        body.vrot = 1.4;
      }
    }
  }

  /** Draws the nearest free molecule of each required slot into the active site. */
  private captureReactants(): void {
    const needed: FieldSlot[] =
      this.inputMolecules().length > 1 ? ['reactant-a', 'reactant-b'] : ['reactant-a'];

    for (const slot of needed) {
      const candidates = this.fieldBodies.filter(
        (body) => body.slot === slot && body.state === 'free',
      );
      if (!candidates.length) continue;
      const nearest = candidates.reduce((closest, body) =>
        Math.hypot(body.x - SITE.x, body.y - SITE.y) <
        Math.hypot(closest.x - SITE.x, closest.y - SITE.y)
          ? body
          : closest,
      );
      nearest.state = 'captured';
    }
  }

  /** Hides the spent reactants, throws the products clear, and restocks the cell. */
  private releaseProducts(): void {
    for (const body of this.capturedBodies()) {
      body.state = 'hidden';
      respawn(body, SCENE);
    }

    const outputs = this.outputMolecules();
    outputs.forEach((_, index) => {
      const slot: FieldSlot = index === 0 ? 'product-a' : 'product-b';
      const body = this.fieldBodies.find(
        (candidate) => candidate.slot === slot && candidate.state === 'hidden',
      );
      if (!body) return;
      // One product leaves to the right; a split scatters its two halves apart.
      const direction = outputs.length > 1 ? (index === 0 ? -1 : 1) : 1;
      ejectFromSite(body, SITE.x, SITE.y, direction);
    });
  }

  private releaseAllBodies(): void {
    for (const body of this.fieldBodies) {
      const hidden = body.slot.startsWith('product');
      body.state = hidden ? 'hidden' : 'free';
      if (!hidden) respawn(body, SCENE);
    }
  }

  private capturedBodies(): readonly FieldEntity[] {
    return this.fieldBodies.filter((body) => body.state === 'captured');
  }

  private render(): void {
    const bodies = this.bodyRefs();
    this.fieldBodies.forEach((body, index) => {
      const element = bodies[index]?.nativeElement;
      if (!element) return;
      element.setAttribute('transform', bodyTransform(body));
      element.style.opacity = body.state === 'hidden' ? '0' : '1';
    });

    const ambient = this.ambientRefs();
    this.ambientEnzymes.forEach((body, index) => {
      ambient[index]?.nativeElement.setAttribute('transform', bodyTransform(body, 0.62, 0));
    });
  }
}

/**
 * Places a body by the centre of its molecule box.
 *
 * The trailing shift is what makes docking exact: a molecule sharing the
 * enzyme's centre, rotation, and scale lands perfectly on its active site.
 */
function bodyTransform(body: FieldEntity, scale = BODY_SCALE, lift = DRIFT_LIFT): string {
  const x = Math.round(body.x * 10) / 10;
  const y = Math.round(body.y * 10) / 10;
  const rot = Math.round(body.rot * 10) / 10;
  const offset = Math.round((-60 + lift * (1 - body.seat)) * 10) / 10;
  return `translate(${x} ${y}) rotate(${rot}) scale(${scale}) translate(-80 ${offset})`;
}
