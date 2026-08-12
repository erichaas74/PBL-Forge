import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SessionService } from '../../../core/firebase/session.service';
import { DragonArenaComponent } from '../dragon-arena.component';
import { DragonDnaRepairLabComponent } from '../dragon-dna-repair-lab.component';
import { findParent, runDragonBatch } from '../dragon-genetics.domain';
import { DragonBattleResult, StudentDragonRecord } from '../dragon-genetics.models';
import { DRAGON_TRAITS, genotypeLabel } from '../simulation/domain/dragon-inheritance';
import { AlleleVaultWorkbenchComponent } from './allele-workbench/allele-vault-workbench.component';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleClaimFeedback,
  AlleleWorkbenchInteraction,
} from './allele-workbench/allele-vault.models';
import { GeneticsNotebookComponent } from './allele-workbench/genetics-notebook.component';
import { DragonAdaptiveStore } from './dragon-adaptive.store';
import {
  GeneratedSimulationQuestion,
  InstructionLevel,
  INSTRUCTION_LEVELS,
  INSTRUCTION_LEVEL_LABELS,
} from './dragon-simulation.models';
import {
  DRAGON_SIMULATION_BY_ID,
  DRAGON_SIMULATIONS,
  isDragonSimulationId,
  LEVEL_PROFILES,
} from './dragon-simulation.registry';
import { DragonSimulationVisualComponent } from './dragon-simulation-visual.component';

@Component({
  selector: 'app-dragon-simulation-experience-page',
  imports: [
    RouterLink,
    DragonSimulationVisualComponent,
    AlleleVaultWorkbenchComponent,
    GeneticsNotebookComponent,
    DragonDnaRepairLabComponent,
    DragonArenaComponent,
  ],
  templateUrl: './dragon-simulation-experience.page.html',
  styleUrl: './dragon-simulation-experience.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonSimulationExperiencePage {
  readonly store = inject(DragonAdaptiveStore);
  readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly simulationId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('simulationId'))),
    { initialValue: this.route.snapshot.paramMap.get('simulationId') },
  );

  readonly definition = computed(() => {
    const id = this.simulationId();
    return isDragonSimulationId(id) ? DRAGON_SIMULATION_BY_ID[id] : null;
  });
  readonly run = computed(() => {
    const definition = this.definition();
    return definition ? (this.store.runs()[definition.id] ?? null) : null;
  });
  readonly questions = computed(() => {
    const definition = this.definition();
    const run = this.run();
    return definition && run ? this.store.questionsFor(definition, run) : [];
  });
  readonly question = computed(() => {
    const run = this.run();
    return run ? (this.questions()[run.currentQuestionIndex] ?? null) : null;
  });
  readonly response = computed(() => {
    const run = this.run();
    const question = this.question();
    return run && question
      ? (run.responses.find((item) => item.questionId === question.id) ?? null)
      : null;
  });
  readonly activeSection = computed(() => {
    const definition = this.definition();
    const question = this.question();
    return (
      definition?.sections.find((section) => section.id === question?.sectionId) ??
      definition?.sections[0] ??
      null
    );
  });
  readonly availableAlleleGenes = computed(() => {
    const available = new Set(this.store.availableAlleleGeneIds());
    return ALLELE_VAULT_GENES.filter((gene) => available.has(gene.id));
  });
  readonly availableAlleles = computed(() => {
    const available = new Set(this.availableAlleleGenes().map((gene) => gene.id));
    return ALLELE_VAULT_ALLELES.filter((allele) => available.has(allele.geneId));
  });
  readonly dnaLabFocusQuestionId = computed(() => {
    const definition = this.definition();
    const currentQuestion = this.question();
    if (definition?.id !== 'dna-process-lab' || !currentQuestion) return null;
    const focusNodeId = currentQuestion.options.find(
      (option) => option.id === currentQuestion.correctOptionId,
    )?.nodeId;
    const questionByNode: Record<string, string> = {
      replication: 'replication-template',
      transcription: 'transcription-uracil',
      mutation: 'mutation-substitution',
      repair: 'copying-error-repair',
    };
    return questionByNode[focusNodeId ?? ''] ?? questionByNode['replication'];
  });
  /**
   * Breeding seed for the arena champion, isolated from the rest of the run.
   *
   * `run()` changes on every answered question, so deriving the champion
   * straight from it would rebuild the dragon — and reset the battle in
   * progress — each time a student answers. The seed itself only changes on a
   * restart, and a computed returning the same number stops there.
   */
  private readonly arenaSeed = computed<number | null>(() => {
    const definition = this.definition();
    if (definition?.id !== 'dragon-arena') return null;
    const seed = this.run()?.seed;
    return seed ? seedToRunNumber(seed) : null;
  });
  /**
   * The dragon a student takes into the arena.
   *
   * Bred from the run seed rather than from a fixed number, so the champion is
   * the same animal every time this student reloads the module but not the same
   * animal as the student beside them — which is the whole point of a module
   * about whether one trial proves anything about a genotype.
   */
  readonly arenaChampion = computed<StudentDragonRecord | null>(() => {
    const seed = this.arenaSeed();
    if (seed === null) return null;
    return runDragonBatch(findParent('ember'), findParent('tide'), seed, 1).sample[0] ?? null;
  });
  /** The most recent completed trial, or null before the first battle ends. */
  readonly arenaTrial = signal<DragonBattleResult | null>(null);
  /**
   * What each evidence target on the arena rail reports right now.
   *
   * The genetics target reads the champion's actual genotype and the outcome
   * targets stay empty until a battle has finished, so a student answering
   * "what can this trial prove" is looking at their own trial rather than at a
   * caption written in advance.
   */
  readonly arenaNodeReadouts = computed<Record<string, string>>(() => {
    const champion = this.arenaChampion();
    const trial = this.arenaTrial();
    const readouts: Record<string, string> = {
      genetics: champion
        ? DRAGON_TRAITS.map(
            (trait) => `${trait.name} ${genotypeLabel(champion.genome[trait.id])}`,
          ).join(' · ')
        : 'Breeding your champion…',
      strategy: 'Both dragons use the same attack program and arena.',
      combat: trial
        ? `${trial.winnerName} won in ${trial.elapsedSeconds.toFixed(1)}s`
        : 'No trial run yet — start a battle.',
      evidence: trial
        ? `${trial.remainingHealthPercent}% champion health left. One trial, one outcome.`
        : 'Run a trial, then judge what it can and cannot show.',
    };
    return readouts;
  });
  readonly nextDefinition = computed(() => {
    const definition = this.definition();
    if (!definition) return null;
    return DRAGON_SIMULATIONS[DRAGON_SIMULATIONS.indexOf(definition) + 1] ?? null;
  });
  readonly selectedNodeId = signal<string | null>(null);
  readonly hintOpen = signal(false);
  readonly guideOpen = signal(false);
  readonly alleleClaimFeedback = signal<AlleleClaimFeedback | null>(null);
  readonly levels = INSTRUCTION_LEVELS;
  readonly levelLabels = INSTRUCTION_LEVEL_LABELS;
  readonly levelProfiles = LEVEL_PROFILES;

  constructor() {
    effect(() => {
      const definition = this.definition();
      if (!definition) {
        void this.router.navigate(['/dragon-genetics']);
        return;
      }
      this.selectedNodeId.set(null);
      this.hintOpen.set(false);
      this.guideOpen.set(false);
      this.arenaTrial.set(null);
      this.alleleClaimFeedback.set(null);
      void this.store.prepareRun(definition);
    });
  }

  /**
   * Records a finished battle without answering anything.
   *
   * Winning is not evidence of understanding — separating the two is the
   * misconception this module targets — so the trial only fills the evidence
   * rail. The student still has to say what it shows.
   */
  handleArenaTrial(result: DragonBattleResult): void {
    this.arenaTrial.set(result);
  }

  selectNode(nodeId: string): void {
    this.selectedNodeId.set(nodeId);
    const question = this.question();
    if (!question || this.response()) return;
    const matchingOption = question.options.find(
      (option) => option.nodeId === nodeId || option.id === nodeId,
    );
    if (matchingOption) this.answer(question, matchingOption.id);
  }

  handleAlleleWorkbenchInteraction(event: AlleleWorkbenchInteraction): void {
    if (event.type === 'expression-run' && event.pairIds && event.phenotype) {
      this.store.recordAlleleExperiment(event.geneId, event.pairIds, event.phenotype);
      return;
    }
    if (
      event.type === 'discovery-claim'
      && event.traitId
      && event.dominantAlleleId
      && event.recessiveAlleleId
    ) {
      const status = this.store.submitAlleleDiscovery(
        event.geneId,
        event.traitId,
        event.dominantAlleleId,
        event.recessiveAlleleId,
      );
      this.alleleClaimFeedback.set({
        geneId: event.geneId,
        status,
        revision: (this.alleleClaimFeedback()?.revision ?? 0) + 1,
      });
    }
  }

  answer(question: GeneratedSimulationQuestion, optionId: string): void {
    const definition = this.definition();
    if (!definition) return;
    const option = question.options.find((candidate) => candidate.id === optionId);
    if (option?.nodeId) this.selectedNodeId.set(option.nodeId);
    this.store.answer(definition, question, optionId);
  }

  continue(): void {
    const definition = this.definition();
    if (!definition) return;
    this.selectedNodeId.set(null);
    this.hintOpen.set(false);
    this.store.advance(definition.id);
  }

  async restart(): Promise<void> {
    const definition = this.definition();
    if (!definition) return;
    await this.store.restart(definition);
    this.selectedNodeId.set(null);
    this.hintOpen.set(false);
  }

  previewLevel(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!INSTRUCTION_LEVELS.includes(value as InstructionLevel)) return;
    this.store.setTeacherPreviewLevel(value as InstructionLevel);
    void this.restart();
  }
}

/**
 * Folds a run seed string into the numeric run index the breeding helpers take.
 *
 * An FNV-1a hash kept inside 32 bits: the breeder only needs a stable, well
 * spread number, and the seed already carries the student, assignment, and
 * attempt, so a restart legitimately produces a different dragon.
 */
function seedToRunNumber(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash | 0);
}
