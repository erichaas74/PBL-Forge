import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleVaultAllele,
  AlleleVaultGene,
  AlleleWorkbenchInteraction,
  AlleleWorkbenchQuestionInput,
} from './allele-vault.models';

type ComparisonSide = 'left' | 'right';
type ExpressionState = 'idle' | 'running' | 'revealed';

@Component({
  selector: 'app-allele-vault-workbench',
  templateUrl: './allele-vault-workbench.component.html',
  styleUrl: './allele-vault-workbench.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlleleVaultWorkbenchComponent implements OnDestroy {
  readonly genes = input<readonly AlleleVaultGene[]>(ALLELE_VAULT_GENES);
  readonly alleles = input<readonly AlleleVaultAllele[]>(ALLELE_VAULT_ALLELES);
  readonly question = input<AlleleWorkbenchQuestionInput | null>(null);
  readonly disabled = input(false);
  readonly interaction = output<AlleleWorkbenchInteraction>();

  readonly activeGeneId = signal('wings');
  readonly selectedAlleleId = signal<string | null>('wings-w');
  readonly comparisonIds = signal<readonly [string, string]>(['wings-W', 'wings-w']);
  readonly pairIds = signal<readonly [string | null, string | null]>(['wings-W', 'wings-w']);
  readonly expressionState = signal<ExpressionState>('idle');
  readonly chargedSlot = signal<number | null>(null);

  readonly activeGene = computed(
    () => this.genes().find((gene) => gene.id === this.activeGeneId()) ?? this.genes()[0],
  );
  readonly selectedAllele = computed(() => this.alleleById(this.selectedAlleleId()));
  readonly leftAllele = computed(() => this.alleleById(this.comparisonIds()[0]));
  readonly rightAllele = computed(() => this.alleleById(this.comparisonIds()[1]));
  readonly pair = computed(
    () =>
      this.pairIds().map((id) => this.alleleById(id)) as [
        AlleleVaultAllele | null,
        AlleleVaultAllele | null,
      ],
  );
  readonly genotype = computed(() =>
    this.pair()
      .map((allele) => allele?.symbol ?? '·')
      .join(''),
  );
  readonly genotypeClass = computed(() => {
    const [first, second] = this.pair();
    if (!first || !second) return 'Incomplete pair';
    if (first.dominance !== second.dominance) return 'Heterozygous';
    return first.dominance === 'dominant' ? 'Homozygous dominant' : 'Homozygous recessive';
  });
  readonly expressedPhenotype = computed(() => {
    const [first, second] = this.pair();
    if (!first || !second) return 'Load two alleles';
    return first.dominance === 'dominant' || second.dominance === 'dominant'
      ? this.activeGene().dominantPhenotype
      : this.activeGene().recessivePhenotype;
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

  private expressionTimer: ReturnType<typeof setTimeout> | null = null;
  private chargeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const question = this.question();
      const genes = this.genes();
      const alleles = this.alleles();
      untracked(() => this.applyInput(question, genes, alleles));
    });
  }

  ngOnDestroy(): void {
    if (this.expressionTimer) clearTimeout(this.expressionTimer);
    if (this.chargeTimer) clearTimeout(this.chargeTimer);
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

  sequenceDiffers(index: number): boolean {
    return this.leftAllele()?.modelSequence[index] !== this.rightAllele()?.modelSequence[index];
  }

  chromosomeSymbol(geneId: string, side: ComparisonSide): string {
    const activeAllele = side === 'left' ? this.leftAllele() : this.rightAllele();
    if (geneId === this.activeGeneId() && activeAllele?.geneId === geneId) {
      return activeAllele.symbol;
    }
    const geneAlleles = this.allelesForGene(geneId);
    const preferredDominance = side === 'left' ? 'dominant' : 'recessive';
    return geneAlleles.find((allele) => allele.dominance === preferredDominance)?.symbol ?? '·';
  }

  selectGene(geneId: string): void {
    if (this.disabled() || geneId === this.activeGeneId()) return;
    const geneAlleles = this.allelesForGene(geneId);
    if (geneAlleles.length < 2) return;
    this.activeGeneId.set(geneId);
    this.selectedAlleleId.set(geneAlleles[1].id);
    this.comparisonIds.set([geneAlleles[0].id, geneAlleles[1].id]);
    this.pairIds.set([geneAlleles[0].id, geneAlleles[1].id]);
    this.expressionState.set('idle');
    this.interaction.emit({ type: 'gene-selected', geneId });
  }

  selectAllele(alleleId: string): void {
    if (this.disabled() || !this.isAllowed(alleleId)) return;
    const allele = this.alleleById(alleleId);
    if (!allele) return;
    if (allele.geneId !== this.activeGeneId()) this.selectGene(allele.geneId);
    this.selectedAlleleId.set(alleleId);
    this.comparisonIds.update(([left]) => [left, alleleId]);
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
    this.comparisonIds.update(([left, right]) => [right, left]);
    this.interaction.emit({ type: 'comparison-swapped', geneId: this.activeGeneId() });
  }

  loadComparison(side: ComparisonSide, alleleId: string): void {
    if (this.disabled() || !this.isAllowed(alleleId)) return;
    const allele = this.alleleById(alleleId);
    if (!allele) return;
    if (allele.geneId !== this.activeGeneId()) this.selectGene(allele.geneId);
    this.selectedAlleleId.set(alleleId);
    this.comparisonIds.update(([left, right]) =>
      side === 'left' ? [alleleId, right] : [left, alleleId],
    );
    this.expressionState.set('idle');
  }

  installSelected(slot: 0 | 1): void {
    const selectedId = this.selectedAlleleId() ?? this.comparisonIds()[1];
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
    this.pulseSlot(slot);
    const pairIds = this.pairIds();
    if (pairIds[0] && pairIds[1]) {
      this.interaction.emit({
        type: 'allele-installed',
        geneId: allele.geneId,
        alleleId,
        pairIds: [pairIds[0], pairIds[1]],
        semanticTargetId: slot === 0 ? 'slot-a' : 'slot-b',
      });
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

  allowDrop(event: DragEvent): void {
    if (!this.disabled()) event.preventDefault();
  }

  runExpression(): void {
    const [first, second] = this.pairIds();
    if (this.disabled() || !first || !second) return;
    if (this.expressionTimer) clearTimeout(this.expressionTimer);
    this.expressionState.set('running');
    this.expressionTimer = setTimeout(() => {
      this.expressionState.set('revealed');
      this.interaction.emit({
        type: 'expression-run',
        geneId: this.activeGeneId(),
        pairIds: [first, second],
        semanticTargetId: 'expression',
      });
    }, 900);
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
    const comparison = question?.comparisonAlleleIds?.every((id) =>
      geneAlleles.some((allele) => allele.id === id),
    )
      ? question.comparisonAlleleIds
      : ([geneAlleles[0].id, geneAlleles[1].id] as const);
    const startingPair = question?.startingPairIds?.every((id) =>
      geneAlleles.some((allele) => allele.id === id),
    )
      ? question.startingPairIds
      : comparison;
    this.activeGeneId.set(gene.id);
    this.comparisonIds.set(comparison);
    this.pairIds.set(startingPair);
    this.selectedAlleleId.set(comparison[1]);
    this.expressionState.set('idle');
  }

  private pulseSlot(slot: number): void {
    if (this.chargeTimer) clearTimeout(this.chargeTimer);
    this.chargedSlot.set(null);
    this.chargeTimer = setTimeout(() => this.chargedSlot.set(slot), 0);
  }
}
