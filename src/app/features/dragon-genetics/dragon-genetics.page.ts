import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DRAGON_PARENTS,
  DRAGON_TRAITS,
  buildPunnettCells,
  genotypeLabel,
  phenotypeLabel,
} from './simulation/domain/dragon-inheritance';
import { TRAIT_SORT_CARDS } from './simulation/data/dragon-lab-content';
import {
  DragonParentProfile,
  DragonTraitId,
} from './simulation/domain/dragon-lab.models';
import { SessionService } from '../../core/firebase/session.service';
import { DragonArenaComponent } from './dragon-arena.component';
import {
  DIAGNOSTIC_PROMPTS,
  DRAGON_MODULES,
  FINAL_REFLECTION_PROMPTS,
  GENOME_QUICK_QUESTIONS,
  LICENSE_QUESTIONS,
  PHENOTYPE_QUESTIONS,
  TEAM_ROLES,
  WEEK1_MASTERY_QUESTIONS,
  WEEK2_MASTERY_QUESTIONS,
} from './dragon-genetics.content';
import {
  GENOTYPE_DISTRIBUTION_CHOICES,
  materializeDragon,
} from './dragon-genetics.domain';
import {
  DragonBattleResult,
  DragonModuleNumber,
  LicenseQuestion,
  StudentDragonRecord,
} from './dragon-genetics.models';
import { DragonPortraitComponent } from './dragon-portrait.component';
import { DragonDiscoveryGalleryComponent } from './dragon-discovery-gallery.component';
import { DragonDnaRepairLabComponent } from './dragon-dna-repair-lab.component';
import { DragonGeneticsStore } from './dragon-genetics.store';
import { TraitEvidenceStationComponent } from './stations/trait-evidence-station.component';
import { TraitEvidenceSetResult } from './simulation/domain/trait-evidence.models';
import { GenomeMicroscopeStationComponent } from './stations/genome-microscope-station.component';
import { GenomeMicroscopeSetResult } from './simulation/domain/genome-microscope.models';
import { AlleleWorkbenchStationComponent } from './stations/allele-workbench-station.component';
import { AlleleWorkbenchSetResult } from './simulation/domain/allele-workbench.models';
import { GenotypeScannerStationComponent } from './stations/genotype-scanner-station.component';
import { GenotypeScannerSetResult } from './simulation/domain/genotype-scanner.models';
import { DRAGON_GALLERY_TRAITS } from './simulation/data/dragon-discovery-gallery.content';
import { TRAIT_EVIDENCE_SPECIMEN } from './simulation/data/trait-evidence-content';

@Component({
  selector: 'app-dragon-genetics-page',
  imports: [
    RouterLink,
    DragonPortraitComponent,
    DragonDiscoveryGalleryComponent,
    DragonDnaRepairLabComponent,
    DragonArenaComponent,
    TraitEvidenceStationComponent,
    GenomeMicroscopeStationComponent,
    GenotypeScannerStationComponent,
    AlleleWorkbenchStationComponent,
  ],
  providers: [DragonGeneticsStore],
  templateUrl: './dragon-genetics.page.html',
  styleUrl: './dragon-genetics.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonGeneticsPage {
  readonly store = inject(DragonGeneticsStore);
  readonly session = inject(SessionService);
  readonly modules = DRAGON_MODULES;
  readonly traits = DRAGON_TRAITS;
  readonly parents = DRAGON_PARENTS;
  readonly sortCards = TRAIT_SORT_CARDS;
  readonly diagnosticPrompts = DIAGNOSTIC_PROMPTS;
  readonly teamRoles = TEAM_ROLES;
  readonly genomeQuickQuestions = GENOME_QUICK_QUESTIONS;
  readonly phenotypeQuestions = PHENOTYPE_QUESTIONS;
  readonly week1Questions = WEEK1_MASTERY_QUESTIONS;
  readonly week2Questions = WEEK2_MASTERY_QUESTIONS;
  readonly reflectionPrompts = FINAL_REFLECTION_PROMPTS;
  readonly fieldGuideTraits = DRAGON_GALLERY_TRAITS;
  readonly impossibleHatchling = TRAIT_EVIDENCE_SPECIMEN;
  readonly probabilityChoices = [0, 25, 50, 75, 100] as const;
  readonly genotypeDistributionChoices = GENOTYPE_DISTRIBUTION_CHOICES;
  readonly message = signal<string | null>(null);
  readonly glossaryOpen = signal(false);
  readonly checked = signal<ReadonlySet<number>>(new Set());
  readonly activeDefinition = computed(() =>
    this.modules.find(module => module.number === this.store.activeModule()) ?? this.modules[0]);
  readonly selectedSiblings = computed(() => this.store.snapshot().smallBatch?.sample
    .filter(dragon => this.store.snapshot().siblingIds.includes(dragon.id)) ?? []);

  goToModule(module: DragonModuleNumber): void {
    this.store.goToModule(module);
    this.message.set(null);
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  nextModule(): void {
    const next = Math.min(10, this.store.activeModule() + 1) as DragonModuleNumber;
    if (!this.store.isModuleUnlocked(next)) {
      this.message.set('Complete the current evidence check to unlock the next module.');
      return;
    }
    this.goToModule(next);
  }

  previousModule(): void {
    this.goToModule(Math.max(1, this.store.activeModule() - 1) as DragonModuleNumber);
  }

  onTraitEvidenceComplete(result: TraitEvidenceSetResult): void {
    const misconceptions = result.misconceptions.length
      ? ` Watch list: ${result.misconceptions.join(', ')}.`
      : '';
    this.message.set(`Evidence analyzer run complete: ${result.correct} of ${result.total} classifications supported by evidence.${misconceptions} Save your misconception correction, then check all classifications.`);
  }

  checkTraitSort(): void {
    this.markChecked(1);
    const result = this.store.checkTraitSort();
    this.message.set(result.complete
      ? 'All eight classifications are supported by evidence. Module 2 is unlocked.'
      : `${result.correct} of ${result.total} classifications are correct. Also choose a team role, complete all three diagnostic responses, and save a 30-character misconception correction.`);
  }

  checkGenomePath(): void {
    this.markChecked(2);
    this.message.set(this.store.checkGenomePath()
      ? 'Pathway decoded: chromosomes package DNA, genes are DNA sections, and alleles are gene versions.'
      : 'Complete one fully supported microscope record and revise any missed quick check. Trace nucleus, chromosome, DNA, gene, then allele.');
  }

  onGenomeMicroscopeComplete(result: GenomeMicroscopeSetResult): void {
    const watch = result.misconceptions.length
      ? ` Review: ${result.misconceptions.join(', ')}.`
      : '';
    this.message.set(`Genome Microscope run complete: ${result.correct} of ${result.total} records fully supported.${watch} Finish the four quick checks, then verify Module 2.`);
  }

  onGenotypeScannerComplete(result: GenotypeScannerSetResult): void {
    const watch = result.misconceptions.length
      ? ` Review: ${result.misconceptions.join(', ')}.`
      : '';
    this.message.set(`Genotype Scanner run complete: ${result.correct} of ${result.total} scans fully supported.${watch} Reveal the evidence feedback to verify Module 3.`);
  }

  checkPhenotypes(): void {
    this.markChecked(3);
    const result = this.store.checkPhenotypeAnswers();
    this.message.set(result.complete
      ? 'All genotype and phenotype evidence is correct.'
      : `${result.correct} of ${result.total} are correct. A dominant phenotype can hide a recessive allele.`);
  }

  checkRules(): void {
    this.markChecked(4);
    const result = this.store.checkRuleAnswers();
    this.message.set(result.complete
      ? 'All four Allele Workbench records are supported. Dominant describes expression, not value or strength.'
      : `${result.correct} of ${result.total} predictions are correct. Complete all four workbench records with the assigned pair, correct prediction, and matching rule evidence.`);
  }

  onAlleleWorkbenchComplete(result: AlleleWorkbenchSetResult): void {
    const watch = result.misconceptions.length
      ? ` Review: ${result.misconceptions.join(', ')}.`
      : '';
    this.message.set(`Allele Workbench run complete: ${result.correct} of ${result.total} records fully supported.${watch} Verify Module 4 to unlock the breeding predictor.`);
  }

  checkPredictions(): void {
    this.markChecked(5);
    const result = this.store.checkBreedingPredictions();
    if (!result.ready) {
      this.message.set('Lock genotype and phenotype probability predictions for all four traits before revealing the model.');
    } else if (result.complete) {
      this.message.set(`${result.accuracy}% prediction accuracy. Your model is ready for sample testing.`);
    } else {
      this.message.set(`${result.accuracy}% prediction accuracy. Revise using the four equally likely Punnett cells.`);
    }
  }

  submitWeek1Mastery(): void {
    const result = this.store.submitWeek1Mastery();
    if (!result.ready) {
      this.message.set('Answer all 10 Week 1 mastery questions.');
    } else if (result.passed) {
      this.message.set(`Week 1 mastery met: ${result.correct}/10. Week 2 is unlocked.`);
    } else {
      this.message.set(`${result.correct}/10. Targeted reteach: ${result.reteachSkills.join(', ') || 'revise the breeding prediction model'}.`);
    }
  }

  runBatch(size: 8 | 100): void {
    this.message.set(this.store.runBatch(size)
      ? `${size} offspring generated. Compare observed counts with the predicted percentages.`
      : 'First complete the Breeding Predictor with at least 75% accuracy.');
  }

  checkReproduction(): void {
    this.markChecked(7);
    this.message.set(this.store.checkReproduction()
      ? 'Correct. Sexual reproduction combines modeled alleles from two parents.'
      : 'Reconsider which model has two parents contributing genetic information.');
  }

  submitSiblingEvidence(): void {
    this.message.set(this.store.submitSiblingEvidence()
      ? 'Sibling evidence accepted. You traced variation to inherited allele combinations.'
      : 'Select two siblings and write at least 40 characters explaining a specific allele difference.');
  }

  submitDiversity(): void {
    const result = this.store.submitDiversityRecommendation();
    this.message.set(result.complete
      ? `Recommendation accepted with a modeled diversity score of ${result.score}.`
      : 'Compare both strategies, select the balanced approach, choose a pair scoring at least 70, and defend it with 50 characters of evidence.');
  }

  submitWeek2Mastery(): void {
    const result = this.store.submitWeek2Mastery();
    if (!result.ready) {
      this.message.set('Answer all 12 Week 2 mastery questions.');
    } else if (result.passed) {
      this.message.set(`Week 2 mastery met: ${result.correct}/12. The final challenge is unlocked.`);
    } else {
      this.message.set(`${result.correct}/12. Complete the peer review and diversity evidence, then reteach: ${result.reteachSkills.join(', ') || 'missed items'}.`);
    }
  }

  submitLicense(): void {
    const result = this.store.submitLicense();
    if (!result.ready) {
      this.message.set('Answer all 12 license questions before submitting.');
    } else if (result.passed) {
      this.message.set(`License earned: ${result.correct}/12 with every required skill demonstrated.`);
    } else {
      this.message.set(`${result.correct}/12. Targeted reteach: ${result.reteachSkills.join(', ')}. Review feedback, then retake.`);
    }
  }

  runOfficialBreeding(): void {
    const result = this.store.runOfficialBreeding();
    this.message.set(result.ready
      ? `${result.offspringCount} official eggs hatched after predictions locked. Accuracy: ${result.accuracy}%.`
      : 'Enter genotype and phenotype probabilities for all four traits before using an official breeding opportunity.');
  }

  onBattleFinished(result: DragonBattleResult): void {
    this.store.recordBattle(result);
    this.message.set(result.won
      ? 'Arena win recorded. Now defend your result with genetics evidence.'
      : 'Battle result recorded. A loss does not lower genetics mastery—explain the roles of traits, tactics, and chance.');
  }

  submitFinal(): void {
    this.message.set(this.store.submitFinalChallenge()
      ? `Final challenge submitted: ${this.store.challengeScore().total}/100 motivational score. Academic mastery remains separate.`
      : 'Finish the license, official cross, champion, battle, evidence defense, and all five reflection responses.');
  }

  selectParent(slot: 'a' | 'b', event: Event): void {
    this.store.selectParent(slot, (event.target as HTMLSelectElement).value);
  }

  setPrediction(traitId: DragonTraitId, event: Event, official = false): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!Number.isFinite(value)) return;
    if (official) {
      this.store.setOfficialPrediction(traitId, value);
    } else {
      this.store.setPrediction(traitId, value);
    }
  }

  setGenotypePrediction(traitId: DragonTraitId, event: Event, official = false): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;
    if (official) {
      this.store.setOfficialGenotypePrediction(traitId, value);
    } else {
      this.store.setGenotypePrediction(traitId, value);
    }
  }

  genotypeDistributionLabel(traitId: DragonTraitId, value: string): string {
    const trait = this.traits.find(item => item.id === traitId) ?? this.traits[0];
    const [homozygousDominant, heterozygous, homozygousRecessive] = value.split('-');
    return `${trait.dominantAllele}${trait.dominantAllele} ${homozygousDominant}% · ${trait.dominantAllele}${trait.recessiveAllele} ${heterozygous}% · ${trait.recessiveAllele}${trait.recessiveAllele} ${homozygousRecessive}%`;
  }

  genotype(parent: DragonParentProfile | StudentDragonRecord, traitId: DragonTraitId): string {
    return genotypeLabel(parent.genome[traitId]);
  }

  phenotype(parent: DragonParentProfile | StudentDragonRecord, traitId: DragonTraitId): string {
    return phenotypeLabel(parent, traitId);
  }

  punnettCells(traitId: DragonTraitId) {
    return buildPunnettCells(this.store.parentA(), this.store.parentB(), traitId);
  }

  batchPercent(size: number, count: number): number {
    return size ? Math.round(100 * count / size) : 0;
  }

  diagnosticAnswer(promptId: string): string {
    return this.store.snapshot().diagnosticAnswers[promptId] || '';
  }

  pairParents(pairId: string): DragonParentProfile[] {
    const ids = pairId.split('--');
    return ids.map(id => this.parents.find(parent => parent.id === id) ?? this.parents[0]);
  }

  pairLabel(pairId: string): string {
    return this.pairParents(pairId).map(parent => parent.name).join(' + ');
  }

  licenseQuestion(questionId: string): LicenseQuestion {
    return LICENSE_QUESTIONS.find(question => question.id === questionId) ?? LICENSE_QUESTIONS[0];
  }

  licenseAnswerCorrect(question: LicenseQuestion): boolean {
    return this.store.snapshot().licenseAnswers[question.id] === question.correctOptionId;
  }

  assessmentAnswerCorrect(question: LicenseQuestion, answers: Record<string, string>): boolean {
    return answers[question.id] === question.correctOptionId;
  }

  hasChecked(module: number): boolean {
    return this.checked().has(module);
  }

  materializedChampion() {
    const champion = this.store.champion();
    return champion ? materializeDragon(champion) : null;
  }

  toggleTeacherPreview(): void {
    this.store.teacherPreview.update(value => !value);
    this.message.set(this.store.teacherPreview()
      ? 'Teacher preview navigation enabled. Student completion rules are still active.'
      : 'Teacher preview navigation disabled.');
  }

  downloadReport(): void {
    const snapshot = this.store.snapshot();
    const score = this.store.challengeScore();
    const role = this.teamRoles.find(item => item.id === snapshot.teamRole);
    const parentA = this.store.parentA();
    const parentB = this.store.parentB();
    const traitLines = this.traits.map(trait =>
      `${trait.name}: ${parentA.name} ${this.genotype(parentA, trait.id)} (${this.phenotype(parentA, trait.id)}) × ${parentB.name} ${this.genotype(parentB, trait.id)} (${this.phenotype(parentB, trait.id)})`);
    const predictionLines = this.traits.map(trait =>
      `${trait.name}: predicted genotypes ${this.genotypeDistributionLabel(trait.id, snapshot.genotypePredictions[trait.id] ?? '0-0-0')}; predicted ${trait.dominantPhenotype} ${snapshot.predictions[trait.id] ?? 'not answered'}%; model ${this.store.expectedPredictions()[trait.id]}%`);
    const diagnosticLines = this.diagnosticPrompts.map((prompt, index) =>
      `${index + 1}. ${prompt.prompt}\n${snapshot.diagnosticAnswers[prompt.id] || 'Not answered'}`);
    const officialAttemptLines = snapshot.officialAttempts.flatMap((attempt, index) => {
      const names = attempt.parentIds.map(id => this.parents.find(parent => parent.id === id)?.name ?? id);
      return [
        `Attempt ${index + 1}: ${names.join(' × ')} | prediction accuracy ${attempt.predictionAccuracy}% | diversity ${attempt.diversityScore}/100`,
        ...this.traits.map(trait =>
          `  ${trait.name}: genotypes ${this.genotypeDistributionLabel(trait.id, attempt.genotypePredictions[trait.id])}; dominant phenotype ${attempt.predictions[trait.id]}%`),
        ...attempt.offspring.map(offspring =>
          `  ${offspring.name}: ${this.traits.map(trait => `${trait.geneSymbol}=${this.genotype(offspring, trait.id)}`).join(', ')}`),
      ];
    });
    const reflectionLines = this.reflectionPrompts.map((prompt, index) =>
      `${index + 1}. ${prompt}\n${snapshot.reflectionAnswers[index] || 'Not answered'}`);
    const report = [
      'DRAGON GENETICS — FINAL LAB REPORT',
      `Generated: ${new Date().toLocaleString()}`,
      `Academic mastery: ${this.store.academicMasteryPercent()}%`,
      `Completed modules: ${snapshot.completedModules.length}/10`,
      `Week 1 mastery: ${snapshot.week1Score ?? 0}/10 (${snapshot.week1Passed ? 'met' : 'not yet met'})`,
      `Week 2 mastery: ${snapshot.week2Score ?? 0}/12 (${snapshot.week2Passed ? 'met' : 'not yet met'})`,
      `License: ${snapshot.licenseScore ?? 0}/12 (${snapshot.licensePassed ? 'earned' : 'not yet earned'})`,
      `Official breeding attempts: ${snapshot.officialAttempts.length}/3`,
      `Champion: ${this.store.champion()?.name ?? 'not selected'}`,
      `Battle: ${snapshot.battleResult ? (snapshot.battleResult.won ? 'win' : 'loss') : 'not completed'}`,
      `Challenge score: ${score.total}/100 (genetics ${score.genetics}/30, diversity ${score.diversity}/25, battle ${score.battle}/25, evidence ${score.evidence}/20)`,
      '',
      'MISSION LAUNCH AND TEAM ROLE',
      `Current rotating role: ${role?.name ?? 'Not selected'}`,
      ...diagnosticLines,
      `Misconception correction: ${snapshot.correctedMisconception || 'Not submitted'}`,
      '',
      'PARENT TRAIT PROFILES AND INHERITANCE MODELS',
      ...traitLines,
      '',
      'PRACTICE OFFSPRING PREDICTIONS',
      ...predictionLines,
      `Combined prediction accuracy: ${snapshot.predictionAccuracy}%`,
      '',
      'OBSERVED SAMPLE DATA',
      ...this.traits.map(trait => `${trait.name}: 8-egg sample ${snapshot.smallBatch ? this.batchPercent(snapshot.smallBatch.size, snapshot.smallBatch.dominantCounts[trait.id]) + '%' : 'not run'}; 100-egg sample ${snapshot.largeBatch ? this.batchPercent(snapshot.largeBatch.size, snapshot.largeBatch.dominantCounts[trait.id]) + '%' : 'not run'}; expected ${this.store.expectedPredictions()[trait.id]}%`),
      '',
      'SIBLING VARIATION EVIDENCE',
      snapshot.siblingExplanation || 'Not submitted',
      '',
      'DIVERSITY STRATEGY AND TEAM PEER REVIEW',
      `Strategy: ${snapshot.diversityStrategy === 'balanced' ? 'Balanced breeding pool' : snapshot.diversityStrategy === 'narrow' ? 'Narrow winner-focused pool' : 'Not selected'}`,
      `Recommended pair: ${snapshot.recommendedPairId ? this.pairLabel(snapshot.recommendedPairId) : 'Not selected'}`,
      snapshot.diversityRecommendation || 'Recommendation not submitted',
      `Peer review: ${snapshot.peerReview || 'Not submitted'}`,
      '',
      'OFFICIAL BREEDING RECORD',
      ...(officialAttemptLines.length ? officialAttemptLines : ['No official attempts recorded']),
      '',
      'FINAL EVIDENCE',
      snapshot.finalEvidence || 'Not submitted',
      '',
      'INDIVIDUAL DEFENSE',
      ...snapshot.defenseAnswers.map((answer, index) => `${index + 1}. ${answer || 'Not answered'}`),
      '',
      'INDIVIDUAL REFLECTION',
      ...reflectionLines,
      '',
      'RECOMMENDED ACADEMIC GRADE CATEGORIES',
      'Completion checks 20% | Weekly deliverables 25% | Individual mastery 25% | Final challenge evidence 15% | Final write-up/reflection 15%',
      'Leaderboard rank and arena result are not academic grade categories.',
      '',
      'Model boundary: Four imaginary single-gene traits use a simplified dominant/recessive model. Dominant does not mean stronger, better, healthier, or more common.',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dragon-genetics-final-record.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  resetLab(): void {
    if (!globalThis.confirm?.('Reset all Dragon Genetics progress on this device and in the connected student record?')) return;
    this.store.resetLab();
    this.message.set('Dragon Genetics progress reset.');
  }

  private markChecked(module: number): void {
    this.checked.update(current => new Set([...current, module]));
  }
}
