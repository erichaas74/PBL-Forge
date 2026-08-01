import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AssemblyAbilityId } from '../combat/assembly-abilities';
import { AssemblyCombatProfile } from '../combat/assembly-combat.models';
import { SpecimenDescriptor, SpecimenSource } from './specimen.models';
import { SPECIMEN_PROFILES, SpecimenProfileRegistry } from './specimen-profile.registry';
import {
  SpecimenRendererService,
  isSpecimenRenderingAvailable,
} from './specimen-renderer.service';
import { SpecimenAssay, assaySpecimen } from './specimen-assay';
import { SpecimenBenchCopy, resolveAbilityCopy } from './specimen-bench.content';

interface AbilityRow {
  ability: AssemblyAbilityId;
  name: string;
  detail: string;
  available: boolean;
  damagePerHit: number;
  cooldownSeconds: number;
  damagePerSecond: number;
  knockback: boolean;
}

interface DefenseRow {
  id: string;
  name: string;
  detail: string;
  present: boolean;
  partCount: number;
  health: number;
}

/**
 * A proving ground for a creation the student just built.
 *
 * Answers three questions without running a battle: *what can it do*, *what
 * protects it*, and *how does that add up*. Pressing a move plays it on the
 * model, so a student can see they have the attack and what it looks like —
 * including how far the fire cone actually reaches, which a real fight never
 * shows clearly.
 *
 * Nothing here simulates combat. The damage and cooldown figures are the
 * arena's own tuning, read from `shared/assembly/combat`.
 */
@Component({
  selector: 'app-specimen-test-bench',
  templateUrl: './specimen-test-bench.component.html',
  styleUrl: './specimen-test-bench.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SpecimenRendererService],
})
export class SpecimenTestBenchComponent implements AfterViewInit, OnDestroy {
  readonly source = input.required<SpecimenSource>();
  /** Genome-tuned health and damage. Without it the defence panel reads zero. */
  readonly combatProfile = input<AssemblyCombatProfile | null>(null);
  /** Fire breath is a genotype call, not a part, so the host supplies it. */
  readonly fireBreathing = input(false);
  readonly copy = input<SpecimenBenchCopy | null>(null);
  readonly heading = input('Test bench');

  readonly abilityPlayed = output<AssemblyAbilityId>();
  readonly assayed = output<SpecimenAssay>();

  @ViewChild('stage', { static: true })
  private readonly stageRef!: ElementRef<HTMLElement>;

  private readonly renderer = inject(SpecimenRendererService);
  private readonly registry = inject(SpecimenProfileRegistry);
  private readonly mounted = signal(false);
  private readonly playing = signal<AssemblyAbilityId | null>(null);

  readonly renderingAvailable = isSpecimenRenderingAvailable();
  readonly activeAbility = this.playing.asReadonly();

  private readonly resolution = computed(() => this.registry.resolve(this.source()));

  readonly descriptor = computed<SpecimenDescriptor | null>(() => {
    const resolution = this.resolution();
    return resolution.status === 'ready' ? resolution.descriptor : null;
  });

  readonly errorMessage = computed(() => {
    const resolution = this.resolution();
    return resolution.status === 'error' ? resolution.message : null;
  });

  readonly assay = computed<SpecimenAssay | null>(() => {
    const descriptor = this.descriptor();
    if (!descriptor) return null;
    return assaySpecimen(descriptor.blueprint, this.combatProfile(), {
      fireBreathing: this.fireBreathing(),
    });
  });

  readonly abilityRows = computed<AbilityRow[]>(() => {
    const assay = this.assay();
    if (!assay) return [];
    const copy = this.copy();

    return assay.offense.abilities.map(readout => {
      const words = resolveAbilityCopy(copy, readout.ability);
      return {
        ability: readout.ability,
        name: words.name,
        detail: readout.available ? words.detail : words.missingDetail,
        available: readout.available,
        damagePerHit: readout.damagePerHit,
        cooldownSeconds: readout.cooldownSeconds,
        damagePerSecond: readout.damagePerSecond,
        knockback: readout.knockback,
      } satisfies AbilityRow;
    });
  });

  readonly defenseRows = computed<DefenseRow[]>(() => {
    const assay = this.assay();
    const features = this.copy()?.defensiveFeatures ?? [];
    if (!assay) return [];

    return features.map(feature => {
      const groups = assay.defense.byRole.filter(group => feature.roles.includes(group.role));
      const partCount = groups.reduce((sum, group) => sum + group.partCount, 0);
      return {
        id: feature.id,
        name: feature.name,
        detail: partCount ? feature.detail : feature.missingDetail,
        present: partCount > 0,
        partCount,
        health: round(groups.reduce((sum, group) => sum + group.totalHealth, 0)),
      } satisfies DefenseRow;
    });
  });

  readonly fitnessCaveat = computed(() =>
    this.copy()?.fitnessCaveat
    ?? 'Measured in this arena model only. Change the environment and the ranking changes.');

  constructor() {
    for (const profile of inject(SPECIMEN_PROFILES, { optional: true }) ?? []) {
      this.registry.register(profile);
    }

    effect(() => {
      const descriptor = this.descriptor();
      if (!this.mounted() || !descriptor) return;
      this.renderer.show(descriptor);
      this.playing.set(null);
    });

    effect(() => {
      const assay = this.assay();
      if (assay) this.assayed.emit(assay);
    });
  }

  ngAfterViewInit(): void {
    if (!this.renderingAvailable) return;

    this.renderer.mount(this.stageRef.nativeElement, {
      quality: 'low',
      interactive: true,
      showGroundShadow: true,
      pose: { droopRadians: TAIL_DROOP_RADIANS },
    });
    this.mounted.set(true);
  }

  ngOnDestroy(): void {
    this.renderer.dispose();
  }

  async play(row: AbilityRow): Promise<void> {
    if (!row.available || !this.mounted()) return;

    this.playing.set(row.ability);
    this.abilityPlayed.emit(row.ability);
    await this.renderer.playAbility(row.ability);
    // A newer press may have taken over while this one finished.
    if (this.playing() === row.ability) this.playing.set(null);
  }

  percent(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  weightLabel(weight: number): string {
    return `${Math.round(weight * 100)}% of score`;
  }

  trackAbility(_index: number, row: AbilityRow): string {
    return row.ability;
  }
}

const TAIL_DROOP_RADIANS = 0.13;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
