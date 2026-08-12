import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DragonAdaptiveStore } from '../dragon-adaptive.store';
import { ALLELE_VAULT_ALLELES, ALLELE_VAULT_GENES, AlleleVaultGene } from './allele-vault.models';
import {
  AlleleGeneDiscovery,
  completedExperimentCount,
  experimentsForGene,
  requiredExperimentKeys,
} from './genetics-notebook.models';

@Component({
  selector: 'app-genetics-notebook',
  templateUrl: './genetics-notebook.component.html',
  styleUrl: './genetics-notebook.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneticsNotebookComponent {
  readonly store = inject(DragonAdaptiveStore);
  readonly open = signal(false);

  readonly genes = computed(() => {
    const available = new Set(this.store.availableAlleleGeneIds());
    return ALLELE_VAULT_GENES.filter((gene) => available.has(gene.id));
  });
  readonly solvedCount = computed(() => {
    const discoveries = this.store.geneticsNotebook().discoveries;
    return this.genes().filter((gene) => !!discoveries[gene.id]).length;
  });
  readonly complete = computed(
    () => this.genes().length > 0 && this.solvedCount() === this.genes().length,
  );

  testCount(gene: AlleleVaultGene): number {
    return completedExperimentCount(this.store.geneticsNotebook(), gene);
  }

  requiredTestCount(gene: AlleleVaultGene): number {
    return requiredExperimentKeys(gene).length;
  }

  experiments(geneId: string) {
    return experimentsForGene(this.store.geneticsNotebook(), geneId).sort((first, second) =>
      this.allelePairLabel(first.alleleIds).localeCompare(this.allelePairLabel(second.alleleIds)),
    );
  }

  discovery(geneId: string): AlleleGeneDiscovery | null {
    return this.store.geneticsNotebook().discoveries[geneId] ?? null;
  }

  traitName(traitId: string): string {
    return ALLELE_VAULT_GENES.find((gene) => gene.id === traitId)?.name ?? traitId;
  }

  alleleSampleCode(alleleId: string): string {
    return ALLELE_VAULT_ALLELES.find((allele) => allele.id === alleleId)?.sampleCode ?? alleleId;
  }

  allelePairLabel(alleleIds: readonly string[]): string {
    return alleleIds.map((alleleId) => this.alleleSampleCode(alleleId)).join(' × ');
  }
}
