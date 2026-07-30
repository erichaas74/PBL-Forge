import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DragonPortraitComponent } from './dragon-portrait.component';
import {
  ARENA_CONNECTIONS,
  DRAGON_GALLERY_TRAITS,
  FIRST_IMPRESSION_PROMPTS,
  TRAIT_OR_TRICK_CHALLENGES,
  TraitOrTrickChallenge,
} from './simulation/data/dragon-discovery-gallery.content';
import { TRAIT_EVIDENCE_SPECIMEN } from './simulation/data/trait-evidence-content';
import {
  DRAGON_PARENTS,
  phenotypeLabel,
} from './simulation/domain/dragon-inheritance';
import { DragonParentProfile, DragonTraitId } from './simulation/domain/dragon-lab.models';

@Component({
  selector: 'app-dragon-discovery-gallery',
  imports: [DragonPortraitComponent],
  templateUrl: './dragon-discovery-gallery.component.html',
  styleUrl: './dragon-discovery-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonDiscoveryGalleryComponent {
  readonly dragons = DRAGON_PARENTS;
  readonly hatchling = TRAIT_EVIDENCE_SPECIMEN;
  readonly traits = DRAGON_GALLERY_TRAITS;
  readonly impressionPrompts = FIRST_IMPRESSION_PROMPTS;
  readonly trickChallenges = TRAIT_OR_TRICK_CHALLENGES;
  readonly arenaConnections = ARENA_CONNECTIONS;

  readonly selectedDragonId = signal(DRAGON_PARENTS[0].id);
  readonly selectedTraitId = signal(DRAGON_GALLERY_TRAITS[0].id);
  readonly collectedTraitIds = signal<ReadonlySet<string>>(new Set([DRAGON_GALLERY_TRAITS[0].id]));
  readonly rotation = signal(0);
  readonly zoom = signal(1);
  readonly firstImpressions = signal<Readonly<Record<string, string>>>({});
  readonly impressionReveal = signal(false);
  readonly trickAnswers = signal<Readonly<Record<string, 'left' | 'right'>>>({});
  readonly familyTraitId = signal<DragonTraitId>('wings');

  readonly selectedDragon = computed(() =>
    this.dragons.find(dragon => dragon.id === this.selectedDragonId()) ?? this.dragons[0]);
  readonly selectedTrait = computed(() =>
    this.traits.find(trait => trait.id === this.selectedTraitId()) ?? this.traits[0]);
  readonly selectedVariation = computed(() => {
    const trait = this.selectedTrait();
    return trait.traitId
      ? `${this.selectedDragon().name} currently displays: ${phenotypeLabel(this.selectedDragon(), trait.traitId)}.`
      : trait.variation;
  });
  readonly collectedCount = computed(() => this.collectedTraitIds().size);
  readonly impressionComplete = computed(() =>
    this.impressionPrompts.every(prompt => !!this.firstImpressions()[prompt.id]));
  readonly familyMembers = [DRAGON_PARENTS[0], DRAGON_PARENTS[1], TRAIT_EVIDENCE_SPECIMEN] as const;

  selectDragon(dragonId: string): void {
    if (!this.dragons.some(dragon => dragon.id === dragonId)) return;
    this.selectedDragonId.set(dragonId);
    this.rotation.set(0);
    this.zoom.set(1);
  }

  inspectTrait(traitId: string): void {
    if (!this.traits.some(trait => trait.id === traitId)) return;
    this.selectedTraitId.set(traitId);
    this.collectedTraitIds.update(ids => new Set([...ids, traitId]));
  }

  rotate(delta: number): void {
    this.rotation.update(value => value + delta);
  }

  changeZoom(delta: number): void {
    this.zoom.update(value => Math.max(.85, Math.min(1.25, value + delta)));
  }

  resetView(): void {
    this.rotation.set(0);
    this.zoom.set(1);
  }

  modelTransform(): string {
    return `perspective(900px) rotateY(${this.rotation()}deg) scale(${this.zoom()})`;
  }

  recordImpression(promptId: string, dragonId: string): void {
    if (!this.dragons.some(dragon => dragon.id === dragonId)) return;
    this.firstImpressions.update(answers => ({ ...answers, [promptId]: dragonId }));
    this.impressionReveal.set(false);
  }

  revealImpressions(): void {
    if (this.impressionComplete()) this.impressionReveal.set(true);
  }

  answerTraitOrTrick(challengeId: string, side: 'left' | 'right'): void {
    this.trickAnswers.update(answers => ({ ...answers, [challengeId]: side }));
  }

  trickCorrect(challenge: TraitOrTrickChallenge): boolean {
    return this.trickAnswers()[challenge.id] === challenge.inheritedSide;
  }

  dragonName(dragonId: string): string {
    return this.dragons.find(dragon => dragon.id === dragonId)?.name ?? dragonId;
  }

  familyPhenotype(member: DragonParentProfile): string {
    return phenotypeLabel(member, this.familyTraitId());
  }
}
