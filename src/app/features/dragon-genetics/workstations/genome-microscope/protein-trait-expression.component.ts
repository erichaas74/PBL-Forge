import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import {
  DEFAULT_EXPRESSIVE_DRAGON,
  ExpressiveDragonGenome,
  ExpressiveDragonTraitId,
  normalizeGenomeForSex,
} from '../../simulation/domain/dragon-expressive-genome';
import { DragonTraitGenotype } from '../../simulation/domain/dragon-lab.models';
import { createExpressiveDragonBenchBuild } from '../../simulation/domain/dragon-specimen.profile';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleVaultAllele,
  AlleleVaultGene,
  expressedAllelePairPhenotype,
} from '../allele-workbench/allele-vault.models';
import { AccountDragonRecord } from '../shared/account-genetics-library.models';
import { DRAGON_ENZYME_REACTIONS } from './dragon-enzyme-reactions.models';

const PROTEIN_DRAG_TYPE = 'application/x-pbl-protein-expression';

interface ExpressionPathway {
  id: ExpressiveDragonTraitId;
  code: string;
  gene: AlleleVaultGene;
  activeAllele: AlleleVaultAllele;
  neutralAllele: AlleleVaultAllele;
  activePair: readonly [AlleleVaultAllele, AlleleVaultAllele];
  productId: string;
  proteinName: string;
  shape: string;
  phenotype: string;
}

@Component({
  selector: 'app-protein-trait-expression',
  imports: [SpecimenViewportComponent],
  templateUrl: './protein-trait-expression.component.html',
  styleUrl: './protein-trait-expression.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProteinTraitExpressionComponent implements OnDestroy {
  readonly dragon = input<AccountDragonRecord | null>(null);
  readonly genes = input<readonly AlleleVaultGene[]>(ALLELE_VAULT_GENES);
  readonly alleles = input<readonly AlleleVaultAllele[]>(ALLELE_VAULT_ALLELES);

  readonly pathways = computed<readonly ExpressionPathway[]>(() => this.buildPathways());
  readonly selectedProteinId = signal<ExpressiveDragonTraitId | null>(null);
  readonly pulseTargetId = signal<ExpressiveDragonTraitId | null>(null);
  readonly mismatchTargetId = signal<ExpressiveDragonTraitId | null>(null);
  readonly activatedIds = linkedSignal<readonly ExpressiveDragonTraitId[]>(() =>
    this.readStoredActivations(),
  );
  readonly activatedCount = computed(() => this.activatedIds().length);
  readonly allActivated = computed(
    () => this.pathways().length > 0 && this.activatedCount() === this.pathways().length,
  );
  readonly statusMessage = linkedSignal(() => {
    const count = this.activatedCount();
    if (count === this.pathways().length && count > 0) {
      return 'All saved product matches are active. The fully expressed dragon is restored.';
    }
    if (count > 0) {
      return `${count} saved product ${count === 1 ? 'match is' : 'matches are'} active. Continue testing any remaining molecule.`;
    }
    return 'Select or drag any enzyme-built product, then test it against a receptor with the same shape.';
  });
  readonly expressionProfile = computed(() => {
    const sex = this.dragon()?.sex ?? 'female';
    const genome: ExpressiveDragonGenome = { ...DEFAULT_EXPRESSIVE_DRAGON.genome };
    const activated = new Set(this.activatedIds());

    for (const pathway of this.pathways()) {
      const symbol = activated.has(pathway.id)
        ? pathway.activeAllele.symbol
        : pathway.neutralAllele.symbol;
      genome[pathway.gene.renderTraitId] = [symbol, symbol] as DragonTraitGenotype;
    }

    return normalizeGenomeForSex({ sex, genome }, sex);
  });
  readonly dragonSource = computed<SpecimenSource>(() => {
    const dragon = this.dragon();
    const stateId = this.activatedIds().slice().sort().join('-') || 'neutral';
    return createExpressiveDragonBenchBuild(
      `protein-expression-${dragon?.id ?? 'model'}-${stateId}`,
      this.expressionProfile(),
      {
        label: `${dragon?.name ?? 'Dragon'} expression model`,
        identity: dragon
          ? { color: dragon.color, accentColor: dragon.accentColor }
          : { color: '#98552f', accentColor: '#c47b42' },
      },
    ).source;
  });

  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  ngOnDestroy(): void {
    for (const timer of this.timers) clearTimeout(timer);
  }

  selectProtein(pathwayId: ExpressiveDragonTraitId): void {
    if (this.isActivated(pathwayId)) return;
    const next = this.selectedProteinId() === pathwayId ? null : pathwayId;
    this.selectedProteinId.set(next);
    const pathway = this.findPathway(pathwayId);
    this.statusMessage.set(
      next && pathway
        ? `${pathway.proteinName} selected. Choose any receptor to test the fit.`
        : 'Product selection cleared.',
    );
  }

  startDrag(event: DragEvent, pathwayId: ExpressiveDragonTraitId): void {
    if (this.isActivated(pathwayId)) {
      event.preventDefault();
      return;
    }
    this.selectedProteinId.set(pathwayId);
    event.dataTransfer?.setData(PROTEIN_DRAG_TYPE, pathwayId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  dropProtein(event: DragEvent, targetId: ExpressiveDragonTraitId): void {
    event.preventDefault();
    const draggedId = event.dataTransfer?.getData(PROTEIN_DRAG_TYPE) as
      ExpressiveDragonTraitId | '';
    const sourceId = draggedId || this.selectedProteinId();
    if (sourceId) this.testFit(sourceId, targetId);
  }

  testSelectedProtein(targetId: ExpressiveDragonTraitId): void {
    const selectedId = this.selectedProteinId();
    if (!selectedId) {
      const target = this.findPathway(targetId);
      this.statusMessage.set(
        `No product selected. Choose a molecule before testing receptor ${target?.code ?? ''}.`,
      );
      return;
    }
    this.testFit(selectedId, targetId);
  }

  reset(): void {
    this.activatedIds.set([]);
    this.selectedProteinId.set(null);
    this.pulseTargetId.set(null);
    this.mismatchTargetId.set(null);
    this.statusMessage.set('The cell and dragon have returned to the neutral comparison state.');
    this.removeStoredActivations();
  }

  isActivated(pathwayId: ExpressiveDragonTraitId): boolean {
    return this.activatedIds().includes(pathwayId);
  }

  private testFit(sourceId: ExpressiveDragonTraitId, targetId: ExpressiveDragonTraitId): void {
    const source = this.findPathway(sourceId);
    const target = this.findPathway(targetId);
    if (!source || !target || this.isActivated(sourceId)) return;

    if (sourceId !== targetId) {
      this.mismatchTargetId.set(targetId);
      this.statusMessage.set(
        `${source.proteinName} does not match receptor ${target.code}. Its edges do not align.`,
      );
      this.clearSignalAfter(this.mismatchTargetId, 650);
      return;
    }

    const next = [...this.activatedIds(), sourceId];
    this.activatedIds.set(next);
    this.writeStoredActivations(next);
    this.selectedProteinId.set(null);
    this.pulseTargetId.set(targetId);
    this.statusMessage.set(
      `${source.proteinName} docked. The cell responded and Trait ${source.code} emerged: ${source.phenotype}.`,
    );
    this.clearSignalAfter(this.pulseTargetId, 900);
  }

  private clearSignalAfter(
    target: { set(value: ExpressiveDragonTraitId | null): void },
    delay: number,
  ): void {
    const timer = setTimeout(() => {
      target.set(null);
      this.timers.delete(timer);
    }, delay);
    this.timers.add(timer);
  }

  private findPathway(pathwayId: ExpressiveDragonTraitId): ExpressionPathway | undefined {
    return this.pathways().find((pathway) => pathway.id === pathwayId);
  }

  private buildPathways(): readonly ExpressionPathway[] {
    const releasedGenes = this.genes();
    return DRAGON_ENZYME_REACTIONS.flatMap((reaction, index): ExpressionPathway[] => {
      const gene = releasedGenes.find((candidate) => candidate.id === reaction.expressionTraitId);
      if (!gene) return [];
      const geneAlleles = this.alleles().filter((allele) => allele.geneId === gene.id);
      const activeAllele = geneAlleles.find((allele) => allele.dominance === 'dominant');
      const neutralAllele = geneAlleles.find((allele) => allele.dominance === 'recessive');
      if (!activeAllele || !neutralAllele) return [];
      const activePair = [activeAllele, activeAllele] as const;
      return [
        {
          id: gene.id,
          code: String.fromCharCode(65 + index),
          gene,
          activeAllele,
          neutralAllele,
          activePair,
          productId: reaction.product.id,
          proteinName: reaction.product.name,
          shape: reaction.product.path,
          phenotype: expressedAllelePairPhenotype(gene, activePair),
        },
      ];
    });
  }

  private storageKey(): string {
    return `pbl-forge:genome-microscope:expression:${this.dragon()?.id ?? 'model'}`;
  }

  private readStoredActivations(): readonly ExpressiveDragonTraitId[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey()) ?? '[]') as unknown;
      if (!Array.isArray(stored)) return [];
      const available = new Set(this.pathways().map((pathway) => pathway.id));
      return stored.filter(
        (id): id is ExpressiveDragonTraitId =>
          typeof id === 'string' && available.has(id as ExpressiveDragonTraitId),
      );
    } catch {
      return [];
    }
  }

  private writeStoredActivations(ids: readonly ExpressiveDragonTraitId[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey(), JSON.stringify(ids));
  }

  private removeStoredActivations(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.storageKey());
  }
}
