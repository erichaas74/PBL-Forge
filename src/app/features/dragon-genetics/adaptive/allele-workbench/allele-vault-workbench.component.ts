import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { createExpressiveDragonBenchBuild } from '../../simulation/domain/dragon-specimen.profile';
import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import { allelePairToExpressiveProfile } from './allele-phenotype-profile';
import { ChromosomeSvgComponent, ChromosomeSvgModel } from './chromosome-svg.component';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleClaimFeedback,
  AlleleVaultAllele,
  AlleleVaultGene,
  AlleleWorkbenchInteraction,
  AlleleWorkbenchQuestionInput,
  expressedAllelePairPhenotype,
} from './allele-vault.models';
import {
  GeneticsNotebookSnapshot,
  completedExperimentCount,
  createEmptyGeneticsNotebook,
  requiredExperimentKeys,
} from './genetics-notebook.models';

type ComparisonSide = 'left' | 'right';
type ExpressionState = 'idle' | 'running' | 'revealed';

@Component({
  selector: 'app-allele-vault-workbench',
  imports: [SpecimenViewportComponent, ChromosomeSvgComponent],
  templateUrl: './allele-vault-workbench.component.html',
  styleUrl: './allele-vault-workbench.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlleleVaultWorkbenchComponent {
  readonly genes = input<readonly AlleleVaultGene[]>(ALLELE_VAULT_GENES);
  readonly alleles = input<readonly AlleleVaultAllele[]>(ALLELE_VAULT_ALLELES);
  readonly question = input<AlleleWorkbenchQuestionInput | null>(null);
  readonly notebook = input<GeneticsNotebookSnapshot>(createEmptyGeneticsNotebook());
  readonly claimFeedback = input<AlleleClaimFeedback | null>(null);
  readonly disabled = input(false);
  readonly interaction = output<AlleleWorkbenchInteraction>();

  readonly activeChromosome = signal('Chr 1');
  readonly activeGeneId = signal('wings');
  readonly selectedAlleleId = signal<string | null>('wings-w');
  readonly pairIds = signal<readonly [string | null, string | null]>([null, null]);
  readonly expressionState = signal<ExpressionState>('idle');
  readonly specimenSex = signal<DragonSex>('female');
  readonly claimTraitId = signal('');
  readonly claimDominantAlleleId = signal<string | null>(null);
  readonly claimRecessiveAlleleId = signal<string | null>(null);

  readonly availableChromosomes = computed(() =>
    [...new Set(this.genes().map((gene) => gene.chromosome))].sort(compareChromosomes),
  );
  readonly genesForActiveChromosome = computed(() =>
    this.genes().filter((gene) => gene.chromosome === this.activeChromosome()),
  );

  readonly activeGene = computed(
    () => this.genes().find((gene) => gene.id === this.activeGeneId()) ?? this.genes()[0],
  );
  readonly selectedAllele = computed(() => this.alleleById(this.selectedAlleleId()));
  readonly leftAllele = computed(() => this.alleleById(this.pairIds()[0]));
  readonly rightAllele = computed(() => this.alleleById(this.pairIds()[1]));
  readonly leftChromosomeModel = computed(() => this.buildChromosomeModel('left'));
  readonly rightChromosomeModel = computed(() => this.buildChromosomeModel('right'));
  readonly selectorChromosomeModel = computed(() => this.buildChromosomeModel(null));
  readonly pair = computed(
    () =>
      this.pairIds().map((id) => this.alleleById(id)) as [
        AlleleVaultAllele | null,
        AlleleVaultAllele | null,
      ],
  );
  readonly genotype = computed(() =>
    this.pair()
      .map((allele) => allele?.sampleCode ?? '·')
      .join(' × '),
  );
  readonly genotypeClass = computed(() => {
    const [first, second] = this.pair();
    if (!first || !second) return 'Incomplete pair';
    if (first.dominance !== second.dominance) return 'Heterozygous';
    return 'Homozygous';
  });
  readonly expressedPhenotype = computed(() => {
    const [first, second] = this.pair();
    if (!first || !second) return '';
    return expressedAllelePairPhenotype(this.activeGene(), [first, second]);
  });
  readonly phenotypeProfile = computed(() =>
    allelePairToExpressiveProfile(this.activeGene(), this.pair(), this.specimenSex()),
  );
  readonly phenotypeSource = computed<SpecimenSource | null>(() => {
    const profile = this.phenotypeProfile();
    if (!profile) return null;
    return createExpressiveDragonBenchBuild('allele-workbench-observation', profile, {
      label: 'Allele workstation observation',
    }).source;
  });
  readonly phenotypeAriaLabel = computed(() => {
    const phenotype = this.expressedPhenotype();
    if (!phenotype) return 'Phenotype chamber with no genotype loaded';
    return `${this.specimenSex()} dragon produced by genotype ${this.genotype()}: ${phenotype}`;
  });
  readonly differenceCount = computed(() => {
    const left = this.leftAllele()?.modelSequence ?? [];
    const right = this.rightAllele()?.modelSequence ?? [];
    return right.reduce((count, base, index) => count + (base === left[index] ? 0 : 1), 0);
  });
  readonly requestedPairComplete = computed(() => {
    const requested = this.question()?.requestedPairIds;
    if (!requested) return null;
    const target = [...requested].sort();
    const installed = this.pairIds()
      .filter((id): id is string => !!id)
      .sort();
    return (
      target.length === installed.length && target.every((id, index) => id === installed[index])
    );
  });
  readonly activeDiscovery = computed(
    () => this.notebook().discoveries[this.activeGeneId()] ?? null,
  );
  readonly displayedClaimTraitId = computed(
    () => this.activeDiscovery()?.traitId ?? this.claimTraitId(),
  );
  readonly displayedDominantAlleleId = computed(
    () => this.activeDiscovery()?.dominantAlleleId ?? this.claimDominantAlleleId(),
  );
  readonly displayedRecessiveAlleleId = computed(
    () => this.activeDiscovery()?.recessiveAlleleId ?? this.claimRecessiveAlleleId(),
  );
  readonly activeTestCount = computed(() =>
    completedExperimentCount(this.notebook(), this.activeGene()),
  );
  readonly requiredTestCount = computed(() => requiredExperimentKeys(this.activeGene()).length);
  readonly claimComplete = computed(
    () =>
      !!this.claimTraitId() && !!this.claimDominantAlleleId() && !!this.claimRecessiveAlleleId(),
  );
  readonly claimStatusMessage = computed(() => {
    if (this.activeDiscovery()) return 'Saved to the full Genetics Chart.';
    const feedback = this.claimFeedback();
    if (!feedback || feedback.geneId !== this.activeGeneId()) return '';
    if (feedback.status === 'incomplete-evidence') {
      return 'Test more allele combinations before saving this gene record.';
    }
    return feedback.status === 'incorrect'
      ? 'The recorded evidence does not support this placement yet.'
      : 'Saved to the full Genetics Chart.';
  });

  constructor() {
    effect(() => {
      const question = this.question();
      const genes = this.genes();
      const alleles = this.alleles();
      untracked(() => this.applyInput(question, genes, alleles));
    });
  }

  allelesForGene(geneId: string): readonly AlleleVaultAllele[] {
    return this.alleles().filter((allele) => allele.geneId === geneId);
  }

  alleleById(id: string | null): AlleleVaultAllele | null {
    return this.alleles().find((allele) => allele.id === id) ?? null;
  }

  isAllowed(alleleId: string): boolean {
    const allowed = this.question()?.allowedAlleleIds;
    return !allowed || allowed.includes(alleleId);
  }

  alleleTokenChromosomeModel(allele: AlleleVaultAllele): ChromosomeSvgModel {
    const gene = this.genes().find((candidate) => candidate.id === allele.geneId);
    const chromosome = gene?.chromosome ?? this.activeChromosome();
    const visual = CHROMOSOME_VISUAL_DATA[chromosome] ?? CHROMOSOME_VISUAL_DATA['Chr 1'];
    const chromosomeGenes = this.genes().filter((candidate) => candidate.chromosome === chromosome);
    const geneIndex = Math.max(
      0,
      chromosomeGenes.findIndex((candidate) => candidate.id === allele.geneId),
    );
    const position = visual.locusPositions[geneIndex] ?? 0.5;
    const start = Math.max(0, position - 0.055);
    const end = Math.min(1, position + 0.055);
    const alleleIndex = gene?.alleleIds.indexOf(allele.id) ?? 0;

    return {
      length: visual.length,
      leftLabel: '',
      rightLabel: '',
      centromere: visual.centromere,
      bands: [
        ...visual.bands.map((band, index) => ({
          ...band,
          color: index % 2 === 0 ? '#454545' : '#707070',
          pattern: undefined,
        })),
        {
          start,
          end,
          color: LOCUS_COLORS[geneIndex % LOCUS_COLORS.length],
          pattern: alleleIndex === 0 ? 'stripe-a' : 'stripe-b',
          patternPlacement: 'center',
        },
      ],
      loci: [],
    };
  }

  sequenceDiffers(index: number): boolean {
    return this.leftAllele()?.modelSequence[index] !== this.rightAllele()?.modelSequence[index];
  }

  chromosomeSymbol(geneId: string, side: ComparisonSide): string {
    const activeAllele = side === 'left' ? this.leftAllele() : this.rightAllele();
    if (geneId === this.activeGeneId())
      return activeAllele?.geneId === geneId ? activeAllele.symbol : '·';
    const geneAlleles = this.allelesForGene(geneId);
    const preferredDominance = side === 'left' ? 'dominant' : 'recessive';
    return geneAlleles.find((allele) => allele.dominance === preferredDominance)?.symbol ?? '·';
  }

  chromosomeNumber(chromosome: string): string {
    return chromosome.replace(/^Chr\s*/i, '');
  }

  selectChromosome(chromosome: string): void {
    if (this.disabled() || chromosome === this.activeChromosome()) return;
    const firstGene = this.genes().find((gene) => gene.chromosome === chromosome);
    if (!firstGene) return;
    this.activeChromosome.set(chromosome);
    this.activateGene(firstGene.id, true);
  }

  selectGene(geneId: string): void {
    if (this.disabled() || geneId === this.activeGeneId()) return;
    this.activateGene(geneId, true);
  }

  selectGeneByLocus(locus: string): void {
    const gene = this.genesForActiveChromosome().find(
      (candidate) => candidate.sampleCode === locus,
    );
    if (gene) this.selectGene(gene.id);
  }

  private activateGene(geneId: string, emitInteraction: boolean): void {
    const gene = this.genes().find((candidate) => candidate.id === geneId);
    const geneAlleles = this.allelesForGene(geneId);
    if (!gene || geneAlleles.length < 2) return;
    this.activeChromosome.set(gene.chromosome);
    this.activeGeneId.set(geneId);
    this.selectedAlleleId.set(geneAlleles[1].id);
    this.pairIds.set([null, null]);
    this.resetClaimBuilder();
    this.expressionState.set('idle');
    if (emitInteraction) this.interaction.emit({ type: 'gene-selected', geneId });
  }

  selectAllele(alleleId: string): void {
    if (this.disabled() || !this.isAllowed(alleleId)) return;
    const allele = this.alleleById(alleleId);
    if (!allele) return;
    if (allele.geneId !== this.activeGeneId()) this.selectGene(allele.geneId);
    this.selectedAlleleId.set(alleleId);
    this.expressionState.set('idle');
    this.interaction.emit({
      type: 'allele-selected',
      geneId: allele.geneId,
      alleleId,
      semanticTargetId: allele.dominance === 'recessive' ? 'carrier' : undefined,
    });
  }

  swapComparison(): void {
    if (this.disabled()) return;
    this.pairIds.update(([left, right]) => [right, left]);
    this.interaction.emit({ type: 'comparison-swapped', geneId: this.activeGeneId() });
  }

  loadComparison(side: ComparisonSide, alleleId: string): void {
    if (this.disabled() || !this.isAllowed(alleleId)) return;
    const allele = this.alleleById(alleleId);
    if (!allele) return;
    if (allele.geneId !== this.activeGeneId()) this.selectGene(allele.geneId);
    this.installAllele(side === 'left' ? 0 : 1, alleleId);
  }

  installSelected(slot: 0 | 1): void {
    const selectedId = this.selectedAlleleId();
    if (!selectedId) return;
    this.installAllele(slot, selectedId);
  }

  installAllele(slot: 0 | 1, alleleId: string): void {
    if (this.disabled() || !this.isAllowed(alleleId)) return;
    const allele = this.alleleById(alleleId);
    if (!allele) return;
    if (allele.geneId !== this.activeGeneId()) this.selectGene(allele.geneId);
    this.pairIds.update(([first, second]) => (slot === 0 ? [alleleId, second] : [first, alleleId]));
    this.selectedAlleleId.set(alleleId);
    this.expressionState.set('idle');
    const pairIds = this.pairIds();
    if (pairIds[0] && pairIds[1]) {
      this.interaction.emit({
        type: 'allele-installed',
        geneId: allele.geneId,
        alleleId,
        pairIds: [pairIds[0], pairIds[1]],
        semanticTargetId: slot === 0 ? 'slot-a' : 'slot-b',
      });
      this.runExpression();
    }
  }

  startDrag(event: DragEvent, alleleId: string): void {
    if (!event.dataTransfer || this.disabled() || !this.isAllowed(alleleId)) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', alleleId);
    this.selectedAlleleId.set(alleleId);
  }

  dropInSlot(event: DragEvent, slot: 0 | 1): void {
    event.preventDefault();
    const alleleId = event.dataTransfer?.getData('text/plain');
    if (alleleId) this.installAllele(slot, alleleId);
  }

  dropInComparison(event: DragEvent, side: ComparisonSide): void {
    event.preventDefault();
    const alleleId = event.dataTransfer?.getData('text/plain');
    if (alleleId) this.loadComparison(side, alleleId);
  }

  dropInClaim(event: DragEvent, role: 'dominant' | 'recessive'): void {
    event.preventDefault();
    const alleleId = event.dataTransfer?.getData('text/plain');
    if (alleleId) this.assignClaimAllele(role, alleleId);
  }

  assignSelectedToClaim(role: 'dominant' | 'recessive'): void {
    const alleleId = this.selectedAlleleId();
    if (alleleId) this.assignClaimAllele(role, alleleId);
  }

  selectClaimTrait(event: Event): void {
    this.claimTraitId.set((event.target as HTMLSelectElement).value);
  }

  submitDiscoveryClaim(): void {
    const traitId = this.claimTraitId();
    const dominantAlleleId = this.claimDominantAlleleId();
    const recessiveAlleleId = this.claimRecessiveAlleleId();
    if (
      this.disabled() ||
      !traitId ||
      !dominantAlleleId ||
      !recessiveAlleleId ||
      dominantAlleleId === recessiveAlleleId
    )
      return;
    this.interaction.emit({
      type: 'discovery-claim',
      geneId: this.activeGeneId(),
      traitId,
      dominantAlleleId,
      recessiveAlleleId,
    });
  }

  allowDrop(event: DragEvent): void {
    if (!this.disabled()) event.preventDefault();
  }

  runExpression(): void {
    const [first, second] = this.pairIds();
    if (this.disabled() || !first || !second) return;
    this.expressionState.set('revealed');
    this.interaction.emit({
      type: 'expression-run',
      geneId: this.activeGeneId(),
      pairIds: [first, second],
      genotype: this.genotype(),
      phenotype: this.expressedPhenotype(),
      semanticTargetId: 'expression',
    });
  }

  selectSpecimenSex(sex: DragonSex): void {
    if (this.disabled()) return;
    this.specimenSex.set(sex);
  }

  private applyInput(
    question: AlleleWorkbenchQuestionInput | null,
    genes: readonly AlleleVaultGene[],
    alleles: readonly AlleleVaultAllele[],
  ): void {
    const requestedGene = genes.find((gene) => gene.id === question?.focusGeneId);
    const gene = requestedGene ?? genes.find((item) => item.id === this.activeGeneId()) ?? genes[0];
    if (!gene) return;
    const geneAlleles = alleles.filter((allele) => allele.geneId === gene.id);
    if (geneAlleles.length < 2) return;
    const startingPair = question?.startingPairIds?.every((id) =>
      geneAlleles.some((allele) => allele.id === id),
    )
      ? question.startingPairIds
      : ([null, null] as const);
    this.activeGeneId.set(gene.id);
    this.activeChromosome.set(gene.chromosome);
    this.pairIds.set(startingPair);
    this.selectedAlleleId.set(geneAlleles[1].id);
    this.expressionState.set('idle');
  }

  private assignClaimAllele(role: 'dominant' | 'recessive', alleleId: string): void {
    if (this.disabled() || !this.isAllowed(alleleId)) return;
    const allele = this.alleleById(alleleId);
    if (!allele || allele.geneId !== this.activeGeneId()) return;
    if (role === 'dominant') this.claimDominantAlleleId.set(alleleId);
    else this.claimRecessiveAlleleId.set(alleleId);
  }

  private resetClaimBuilder(): void {
    this.claimTraitId.set('');
    this.claimDominantAlleleId.set(null);
    this.claimRecessiveAlleleId.set(null);
  }

  private buildChromosomeModel(side: ComparisonSide | null): ChromosomeSvgModel {
    const chromosome = this.activeChromosome();
    const visual = CHROMOSOME_VISUAL_DATA[chromosome] ?? CHROMOSOME_VISUAL_DATA['Chr 1'];
    const loadedAllele =
      side === 'left' ? this.leftAllele() : side === 'right' ? this.rightAllele() : null;
    return {
      length: visual.length,
      leftLabel: `${this.chromosomeNumber(chromosome)}p`,
      rightLabel: `${this.chromosomeNumber(chromosome)}q`,
      centromere: visual.centromere,
      bands: visual.bands,
      loci: this.genesForActiveChromosome().map((gene, index) => ({
        position: visual.locusPositions[index] ?? 0.5,
        label: gene.sampleCode,
        symbol: gene.id === this.activeGeneId() ? loadedAllele?.sampleCode : undefined,
        color: LOCUS_COLORS[index % LOCUS_COLORS.length],
      })),
    };
  }
}

function compareChromosomes(first: string, second: string): number {
  const firstNumber = Number(first.match(/\d+/)?.[0]);
  const secondNumber = Number(second.match(/\d+/)?.[0]);
  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
    return firstNumber - secondNumber;
  }
  return first.localeCompare(second);
}

interface ChromosomeVisualData {
  length: number;
  centromere: number;
  locusPositions: readonly number[];
  bands: ChromosomeSvgModel['bands'];
}

const CHROMOSOME_VISUAL_DATA: Record<string, ChromosomeVisualData> = {
  'Chr 1': {
    length: 1,
    centromere: 0.4,
    locusPositions: [0.18, 0.58, 0.83],
    bands: [
      { start: 0, end: 0.1, color: '#b9dbc7' },
      { start: 0.1, end: 0.25, color: '#efaab2' },
      { start: 0.25, end: 0.4, color: '#aeb9d8' },
      { start: 0.4, end: 0.45, color: '#ecc6a4', pattern: 'hatch' },
      { start: 0.45, end: 0.7, color: '#f8e78c' },
      { start: 0.7, end: 1, color: '#aeb9d8' },
    ],
  },
  'Chr 2': {
    length: 0.94,
    centromere: 0.47,
    locusPositions: [0.14, 0.61, 0.88],
    bands: [
      { start: 0, end: 0.14, color: '#a9d2be' },
      { start: 0.14, end: 0.31, color: '#f2c1c7' },
      { start: 0.31, end: 0.47, color: '#bcc6e2' },
      { start: 0.47, end: 0.52, color: '#e8b98e', pattern: 'hatch' },
      { start: 0.52, end: 0.76, color: '#f5e18a' },
      { start: 0.76, end: 1, color: '#9fafd3' },
    ],
  },
  'Chr 3': {
    length: 0.87,
    centromere: 0.35,
    locusPositions: [0.24, 0.55, 0.79],
    bands: [
      { start: 0, end: 0.17, color: '#b5dac8' },
      { start: 0.17, end: 0.35, color: '#f0abb5' },
      { start: 0.35, end: 0.41, color: '#e9c39e', pattern: 'hatch' },
      { start: 0.41, end: 0.63, color: '#aeb9d8' },
      { start: 0.63, end: 0.82, color: '#f7e58e' },
      { start: 0.82, end: 1, color: '#b5c0df', pattern: 'hatch' },
    ],
  },
  'Chr 4': {
    length: 0.8,
    centromere: 0.56,
    locusPositions: [0.12, 0.48, 0.74],
    bands: [
      { start: 0, end: 0.13, color: '#add4c0' },
      { start: 0.13, end: 0.29, color: '#b2bddb' },
      { start: 0.29, end: 0.43, color: '#f4e48d' },
      { start: 0.43, end: 0.56, color: '#ecaab2' },
      { start: 0.56, end: 0.62, color: '#edc49f', pattern: 'hatch' },
      { start: 0.62, end: 1, color: '#aab7d8' },
    ],
  },
};

const LOCUS_COLORS = ['#ff6d68', '#49a8ff', '#67d790'] as const;
