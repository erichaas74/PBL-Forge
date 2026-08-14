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
import { DragonHatcheryBreedingLabComponent } from '../workstations/dragon-hatchery/dragon-hatchery-breeding-lab.component';
import { DragonDnaRepairLabComponent } from '../workstations/dna-process-lab/dragon-dna-repair-lab.component';
import { DnaAnalysisCase } from '../workstations/dna-process-lab/dna-sequence-analysis.component';
import { findParent, runDragonBatch } from '../dragon-genetics.domain';
import { DragonBattleResult, StudentDragonRecord } from '../dragon-genetics.models';
import { DRAGON_TRAITS, genotypeLabel } from '../simulation/domain/dragon-inheritance';
import { AlleleVaultWorkbenchComponent } from '../workstations/allele-workbench/allele-vault-workbench.component';
import {
  chromosomeVisual,
  DRAGON_LOCUS_COLORS,
} from '../workstations/shared/dragon-chromosome.catalog';
import { ChromosomeSvgModel } from '../workstations/shared/chromosome-svg.component';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleClaimFeedback,
  AlleleWorkbenchInteraction,
} from '../workstations/allele-workbench/allele-vault.models';
import { GeneticsNotebookComponent } from '../workstations/shared/genetics-notebook.component';
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
import { DragonSimulationVisualComponent } from '../workstations/simulation-visual/dragon-simulation-visual.component';
import { GenomeMicroscopeComponent } from '../workstations/genome-microscope/genome-microscope.component';
import { PunnettComposerComponent } from '../workstations/punnett-composer/punnett-composer.component';
import { IncubatorSamplerComponent } from '../workstations/incubator-sampler/incubator-sampler.component';

@Component({
  selector: 'app-dragon-simulation-experience-page',
  imports: [
    RouterLink,
    DragonSimulationVisualComponent,
    AlleleVaultWorkbenchComponent,
    GeneticsNotebookComponent,
    DragonDnaRepairLabComponent,
    DragonArenaComponent,
    DragonHatcheryBreedingLabComponent,
    GenomeMicroscopeComponent,
    PunnettComposerComponent,
    IncubatorSamplerComponent,
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
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

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
  readonly transferredDnaAnalysisCase = computed<DnaAnalysisCase | null>(() => {
    if (this.definition()?.id !== 'dna-process-lab') return null;
    const params = this.queryParams();
    const gene = ALLELE_VAULT_GENES.find((candidate) => candidate.id === params.get('gene'));
    const sampleA = ALLELE_VAULT_ALLELES.find(
      (candidate) => candidate.id === params.get('sampleA'),
    );
    const sampleB = ALLELE_VAULT_ALLELES.find(
      (candidate) => candidate.id === params.get('sampleB'),
    );
    if (!gene || sampleA?.geneId !== gene.id || sampleB?.geneId !== gene.id) return null;
    const reference = sampleA.modelSequence.join('');
    const sample = sampleB.modelSequence.join('');
    return {
      id: `${gene.id}:${sampleA.id}:${sampleB.id}`,
      sampleLabel: `${gene.chromosome} · ${gene.sampleCode}`,
      chromosomeLabel: gene.chromosome,
      geneLabel: gene.sampleCode,
      locusLabel: gene.locus,
      referenceSampleLabel: sampleA.sampleCode,
      comparisonSampleLabel: sampleB.sampleCode,
      reference,
      sample,
      mutationType:
        reference.length < sample.length
          ? 'insertion'
          : reference.length > sample.length
            ? 'deletion'
            : 'substitution',
    };
  });
  readonly transferredDnaChromosomeModel = computed<ChromosomeSvgModel | null>(() => {
    if (!this.transferredDnaAnalysisCase()) return null;
    const params = this.queryParams();
    const activeGene = ALLELE_VAULT_GENES.find((candidate) => candidate.id === params.get('gene'));
    if (!activeGene) return null;
    const chromosomeGenes = ALLELE_VAULT_GENES.filter(
      (candidate) => candidate.chromosome === activeGene.chromosome,
    );
    const visual = chromosomeVisual(activeGene.chromosome);
    const chromosomeNumber = activeGene.chromosome.replace(/^Chr\s*/i, '');
    return {
      length: visual.length,
      leftLabel: `${chromosomeNumber}p`,
      rightLabel: `${chromosomeNumber}q`,
      centromere: visual.centromere,
      bands: visual.bands,
      loci: chromosomeGenes.map((gene, index) => ({
        position: visual.locusPositions[index] ?? 0.5,
        label: gene.sampleCode,
        symbol: gene.id === activeGene.id ? gene.sampleCode : undefined,
        color: DRAGON_LOCUS_COLORS[index % DRAGON_LOCUS_COLORS.length],
      })),
    };
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
    if (event.type === 'dna-analysis-requested' && event.pairIds) {
      void this.router.navigate(['/dragon-genetics', 'dna-process-lab'], {
        queryParams: {
          gene: event.geneId,
          sampleA: event.pairIds[0],
          sampleB: event.pairIds[1],
        },
      });
      return;
    }
    if (event.type === 'expression-run' && event.pairIds && event.phenotype) {
      this.store.recordAlleleExperiment(event.geneId, event.pairIds, event.phenotype);
      return;
    }
    if (
      event.type === 'discovery-claim' &&
      event.traitId &&
      event.dominantAlleleId &&
      event.recessiveAlleleId
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
