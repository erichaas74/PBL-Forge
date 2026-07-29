import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragonPortraitComponent } from './components/dragon-portrait.component';
import {
  DRAGON_MINI_LESSONS,
  DRAGON_VOCABULARY,
  TRAIT_SORT_CARDS,
} from './data/dragon-lab-content';
import {
  DRAGON_PARENTS,
  DRAGON_TRAITS,
  buildPunnettCells,
  countDominantPhenotypes,
  dominantPhenotypeProbability,
  genotypeLabel,
  phenotypeLabel,
  showsDominantPhenotype,
} from './domain/dragon-inheritance';
import {
  DragonLabStage,
  DragonOffspring,
  DragonParentProfile,
  DragonTraitGenotype,
  DragonTraitId,
  PairDiversityAnalysis,
  TraitSortCategory,
} from './domain/dragon-lab.models';
import { DragonGeneticsLabStore } from './state/dragon-genetics-lab.store';

interface LabStageLink {
  id: DragonLabStage;
  shortLabel: string;
  label: string;
  week: number;
}

@Component({
  selector: 'app-dragon-genetics-lab',
  imports: [CommonModule, FormsModule, DragonPortraitComponent],
  providers: [DragonGeneticsLabStore],
  templateUrl: './dragon-genetics-lab.component.html',
  styleUrl: './dragon-genetics-lab.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonGeneticsLabComponent {
  readonly store = inject(DragonGeneticsLabStore);
  readonly traits = DRAGON_TRAITS;
  readonly parents = DRAGON_PARENTS;
  readonly lessons = DRAGON_MINI_LESSONS;
  readonly vocabulary = DRAGON_VOCABULARY;
  readonly sortCards = TRAIT_SORT_CARDS;
  readonly probabilityChoices = [0, 25, 50, 75, 100] as const;
  readonly message = signal<string | null>(null);
  readonly glossaryOpen = signal(false);
  readonly stages: readonly LabStageLink[] = [
    { id: 'mission', shortLabel: 'Briefing', label: 'Mission Briefing', week: 1 },
    { id: 'traits', shortLabel: 'Trait Sort', label: 'Traits & Information', week: 1 },
    { id: 'inheritance', shortLabel: 'Predict', label: 'Inheritance Model', week: 2 },
    { id: 'hatchery', shortLabel: 'Hatch', label: 'Hatchery Results', week: 2 },
    { id: 'evidence', shortLabel: 'Explain', label: 'Evidence Board', week: 2 },
    { id: 'board', shortLabel: 'Recommend', label: 'Genetics Board', week: 3 },
  ];

  readonly activeStageIndex = computed(() =>
    Math.max(0, this.stages.findIndex(stage => stage.id === this.store.stage())),
  );
  readonly selectedTrait = computed(() =>
    this.traits.find(trait => trait.id === this.store.comparisonTraitId()) ?? this.traits[0],
  );
  readonly observedDominantCount = computed(() =>
    countDominantPhenotypes(this.store.clutch(), this.store.comparisonTraitId()),
  );
  readonly observedDominantPercent = computed(() => {
    const clutch = this.store.clutch();
    return clutch.length ? Math.round(100 * this.observedDominantCount() / clutch.length) : 0;
  });
  readonly expectedDominantPercent = computed(() => dominantPhenotypeProbability(
    this.store.parentA(),
    this.store.parentB(),
    this.store.comparisonTraitId(),
  ));

  goToStage(stage: DragonLabStage): void {
    this.store.setStage(stage);
    this.message.set(null);
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  goNext(): void {
    const next = this.stages[this.activeStageIndex() + 1];
    if (next) this.goToStage(next.id);
  }

  goBack(): void {
    const previous = this.stages[this.activeStageIndex() - 1];
    if (previous) this.goToStage(previous.id);
  }

  isLessonComplete(lessonId: string): boolean {
    return this.store.completedLessonIds().includes(lessonId);
  }

  sortAnswer(cardId: string): TraitSortCategory | undefined {
    return this.store.sortAnswers()[cardId];
  }

  sortAnswerIsCorrect(cardId: string): boolean {
    const card = this.sortCards.find(item => item.id === cardId);
    return !!card && this.sortAnswer(cardId) === card.category;
  }

  checkSort(): void {
    if (Object.keys(this.store.sortAnswers()).length < this.sortCards.length) {
      this.message.set('Sort every card before checking your evidence.');
      return;
    }
    this.store.checkSort();
    this.message.set(this.store.sortScore() === this.sortCards.length
      ? 'Excellent classification. You separated inherited traits from learned and environmental changes.'
      : `You have ${this.store.sortScore()} of ${this.sortCards.length} correct. Read the evidence on the cards and revise.`);
  }

  selectParent(slot: 'a' | 'b', parentId: string): void {
    this.store.selectParent(slot, parentId);
    this.message.set(null);
  }

  parentGenotype(parent: DragonParentProfile, traitId: DragonTraitId): string {
    return genotypeLabel(parent.genome[traitId]);
  }

  parentPhenotype(parent: DragonParentProfile, traitId: DragonTraitId): string {
    return phenotypeLabel(parent, traitId);
  }

  punnettCells(traitId: DragonTraitId) {
    return buildPunnettCells(this.store.parentA(), this.store.parentB(), traitId);
  }

  expectedProbability(traitId: DragonTraitId): number {
    return dominantPhenotypeProbability(this.store.parentA(), this.store.parentB(), traitId);
  }

  dominantPunnettCellCount(traitId: DragonTraitId): number {
    return buildPunnettCells(this.store.parentA(), this.store.parentB(), traitId)
      .filter(cell => cell.showsDominantPhenotype).length;
  }

  clutchDominantCount(traitId: DragonTraitId): number {
    return countDominantPhenotypes(this.store.clutch(), traitId);
  }

  clutchDominantPercent(traitId: DragonTraitId): number {
    const clutch = this.store.clutch();
    return clutch.length ? 100 * this.clutchDominantCount(traitId) / clutch.length : 0;
  }

  predictionFor(traitId: DragonTraitId): number | undefined {
    return this.store.predictions()[traitId];
  }

  checkPredictions(): void {
    if (!this.store.checkPredictions()) {
      this.message.set('Make a probability prediction for all four traits first.');
      return;
    }
    const score = this.store.predictionScore();
    this.message.set(score === this.traits.length
      ? 'All four predictions match the Punnett models. You are ready to hatch a sample.'
      : `${score} of ${this.traits.length} predictions match. Use the four Punnett cells as an equal-size sample space.`);
  }

  hatchClutch(): void {
    this.store.hatchClutch();
    this.message.set('Eight eggs hatched. Compare this small sample with your predicted probabilities.');
  }

  offspringGenotype(offspring: DragonOffspring, traitId: DragonTraitId): string {
    return genotypeLabel(offspring.genome[traitId]);
  }

  formatGenotype(genotype: DragonTraitGenotype): string {
    return genotypeLabel(genotype);
  }

  offspringShowsTrait(offspring: DragonOffspring, traitId: DragonTraitId): boolean {
    return showsDominantPhenotype(offspring.genome[traitId], traitId);
  }

  pairParents(pair: PairDiversityAnalysis): DragonParentProfile[] {
    return pair.parentIds.map(id => this.parents.find(parent => parent.id === id) ?? this.parents[0]);
  }

  pairLabel(pair: PairDiversityAnalysis): string {
    return this.pairParents(pair).map(parent => parent.name).join(' + ');
  }

  setTextField(field: 'claim' | 'evidence' | 'reasoning', event: Event): void {
    this.store.setExplanationField(field, (event.target as HTMLTextAreaElement).value);
  }

  checkRecommendation(): void {
    if (this.store.submitRecommendation()) {
      this.message.set('Lab report complete. Your recommendation is ready for the Dragon Hatchery Genetics Board.');
    } else {
      this.message.set('Complete the claim, evidence, reasoning, reproduction checkpoint, pair choice, and a 40-character recommendation.');
    }
  }

  printReport(): void {
    globalThis.print?.();
  }

  downloadReport(): void {
    const blob = new Blob([this.buildReportText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dragon-genetics-lab-report.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  resetLab(): void {
    if (!globalThis.confirm?.('Start the Dragon Genetics Lab over? This clears the saved lab report on this device.')) return;
    this.store.reset();
    this.message.set('The lab has been reset.');
  }

  private buildReportText(): string {
    const pair = this.store.selectedPairAnalysis();
    const selectedPair = pair ? this.pairLabel(pair) : 'Not selected';
    const parentLines = [this.store.parentA(), this.store.parentB()].map(parent =>
      `${parent.name}: ${this.traits.map(trait => `${trait.name} ${this.parentGenotype(parent, trait.id)}`).join(', ')}`,
    );
    const predictionLines = this.traits.map(trait =>
      `${trait.name}: predicted ${this.predictionFor(trait.id) ?? 'not entered'}% ${trait.dominantPhenotype}; model ${this.expectedProbability(trait.id)}%`,
    );
    return [
      'DRAGON GENETICS LAB REPORT',
      'Driving question: How are traits passed from parents to offspring, and why do offspring show variation?',
      '',
      'PARENT TRAIT PROFILES',
      ...parentLines,
      '',
      'INHERITANCE MODEL AND PREDICTIONS',
      ...predictionLines,
      '',
      'HATCHERY EVIDENCE',
      `${this.store.clutch().length} offspring observed. For ${this.selectedTrait().name}, ${this.observedDominantCount()} showed the dominant phenotype (${this.observedDominantPercent()}%) compared with ${this.expectedDominantPercent()}% predicted.`,
      '',
      `Claim: ${this.store.claim() || 'Not completed'}`,
      `Evidence: ${this.store.evidence() || 'Not completed'}`,
      `Reasoning: ${this.store.reasoning() || 'Not completed'}`,
      '',
      'BREEDING RECOMMENDATION',
      `Selected pair: ${selectedPair}`,
      `Modeled diversity score: ${pair?.score ?? 'Not calculated'}/100`,
      this.store.recommendation() || 'Not completed',
      '',
      'Model limitation: This classroom score uses four simplified genes. It is not a medical test and does not rank individual dragons.',
    ].join('\n');
  }
}
