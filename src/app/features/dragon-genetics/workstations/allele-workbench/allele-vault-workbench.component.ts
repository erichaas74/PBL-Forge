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
import {
  DragonSex,
  GENERIC_HETEROZYGOUS_XY_DRAGON,
} from '../../simulation/domain/dragon-expressive-genome';
import { allelePairToExpressiveProfile } from './allele-phenotype-profile';
import { ChromosomeSvgComponent, ChromosomeSvgModel } from '../shared/chromosome-svg.component';
import {
  CellChromosomeLocusSelection,
  CellChromosomeViewportComponent,
  CellChromosomeViewportItem,
} from '../shared/cell-chromosome-viewport.component';
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
} from '../shared/genetics-notebook.models';
import { chromosomeVisual } from '../shared/dragon-chromosome.catalog';
import {
  buildDragonChromosomePairs,
  chromosomePairViewportItems,
} from '../shared/dragon-chromosome-pairs';
import { geneAlleleMarking, geneDnaRecord } from '../shared/dragon-gene-dna.catalog';

type ComparisonSide = 'left' | 'right';
type ExpressionState = 'idle' | 'running' | 'revealed';

@Component({
  selector: 'app-allele-vault-workbench',
  imports: [SpecimenViewportComponent, ChromosomeSvgComponent, CellChromosomeViewportComponent],
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

  readonly activeChromosome = signal<AlleleVaultGene['chromosome']>('Chr 1');
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
  readonly cellChromosomes = computed<readonly CellChromosomeViewportItem[]>(() =>
    chromosomePairViewportItems(
      buildDragonChromosomePairs({
        genes: this.genes(),
        alleles: this.alleles(),
        chromosomes: this.availableChromosomes(),
        sex: GENERIC_HETEROZYGOUS_XY_DRAGON.sex,
        genotypeForGene: (geneId) => GENERIC_HETEROZYGOUS_XY_DRAGON.genome[geneId],
      }),
    ),
  );

  readonly activeGene = computed(
    () => this.genes().find((gene) => gene.id === this.activeGeneId()) ?? this.genes()[0],
  );
  readonly selectedAllele = computed(() => this.alleleById(this.selectedAlleleId()));
  readonly leftAllele = computed(() => this.alleleById(this.pairIds()[0]));
  readonly rightAllele = computed(() => this.alleleById(this.pairIds()[1]));
  readonly leftChromosomeModel = computed(() => this.buildChromosomeModel('left'));
  readonly rightChromosomeModel = computed(() => this.buildChromosomeModel('right'));
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
    const visual = chromosomeVisual(chromosome);
    const chromosomeGenes = this.genes().filter((candidate) => candidate.chromosome === chromosome);
    const geneIndex = chromosomeGenes.findIndex((candidate) => candidate.id === allele.geneId);

    return {
      length: visual.length,
      leftLabel: '',
      rightLabel: '',
      centromere: visual.centromere,
      bands: visual.bands.map((band, index) => ({
        ...band,
        color: index % 2 === 0 ? '#454545' : '#707070',
        pattern: undefined,
      })),
      loci:
        gene && geneIndex >= 0
          ? [
              {
                position: visual.locusPositions[geneIndex] ?? 0.5,
                label: gene.sampleCode,
                symbol: allele.sampleCode,
                color: geneDnaRecord(gene.id).locusColor,
                marking: geneAlleleMarking(gene.id, allele.id === gene.alleleIds[0] ? 0 : 1),
              },
            ]
          : [],
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

  selectChromosome(chromosomeId: string): void {
    if (this.disabled() || chromosomeId === this.activeChromosome()) return;
    const firstGene = this.genes().find((gene) => gene.chromosome === chromosomeId);
    if (!firstGene) return;
    this.activateGene(firstGene.id, true);
  }

  selectGene(geneId: string): void {
    if (this.disabled() || geneId === this.activeGeneId()) return;
    this.activateGene(geneId, true);
  }

  selectViewportLocus(selection: CellChromosomeLocusSelection): void {
    if (this.disabled()) return;
    const gene = this.genes().find(
      (candidate) =>
        candidate.chromosome === selection.chromosomeId && candidate.sampleCode === selection.locus,
    );
    if (gene && gene.id !== this.activeGeneId()) this.activateGene(gene.id, true);
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

  requestDnaAnalysis(): void {
    const pairIds = this.pairIds();
    if (this.disabled() || !pairIds[0] || !pairIds[1] || this.differenceCount() === 0) return;
    this.interaction.emit({
      type: 'dna-analysis-requested',
      geneId: this.activeGeneId(),
      pairIds: [pairIds[0], pairIds[1]],
    });
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
    return this.buildChromosomeModelFor(chromosome, side);
  }

  private buildChromosomeModelFor(
    chromosome: AlleleVaultGene['chromosome'],
    side: ComparisonSide | null,
  ): ChromosomeSvgModel {
    const visual = chromosomeVisual(chromosome);
    const loadedAllele =
      chromosome !== this.activeChromosome()
        ? null
        : side === 'left'
          ? this.leftAllele()
          : side === 'right'
            ? this.rightAllele()
            : null;
    const activeGenes = this.genes().filter((gene) => gene.chromosome === chromosome);
    return {
      length: visual.length,
      leftLabel: `${this.chromosomeNumber(chromosome)}p`,
      rightLabel: `${this.chromosomeNumber(chromosome)}q`,
      centromere: visual.centromere,
      bands: visual.bands,
      loci: activeGenes.map((gene, index) => ({
        position: visual.locusPositions[index] ?? 0.5,
        label: gene.sampleCode,
        symbol: gene.id === this.activeGeneId() ? loadedAllele?.sampleCode : undefined,
        color: gene.locusColor,
        marking:
          gene.id === this.activeGeneId() && loadedAllele
            ? geneAlleleMarking(gene.id, loadedAllele.id === gene.alleleIds[0] ? 0 : 1)
            : undefined,
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
