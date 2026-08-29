/**
 * Runtime status: RETIRED — visual notebook component imported only by the retired adaptive page.
 * Former inputs/signals: allele/gene/experiment records and local filter/selection signals.
 * Former data access: caller-supplied shared notebook values; no persistence of its own.
 * Former connections: DragonSimulationExperiencePage; active lessons render evidence directly.
 */
import { Component, computed, input, signal } from '@angular/core';
import {
  AlleleVaultAllele,
  AlleleVaultGene,
} from '../allele-workbench/allele-vault.models';
import {
  AlleleGeneDiscovery,
  completedExperimentCount,
  experimentsForGene,
  GeneticsNotebookSnapshot,
  requiredExperimentKeys,
} from './genetics-notebook.models';

@Component({
  selector: 'app-genetics-notebook',
  templateUrl: './genetics-notebook.component.html',
  styleUrl: './genetics-notebook.component.scss',
})
export class GeneticsNotebookComponent {
  readonly genes = input.required<readonly AlleleVaultGene[]>();
  readonly alleles = input.required<readonly AlleleVaultAllele[]>();
  readonly notebook = input.required<GeneticsNotebookSnapshot>();
  readonly open = signal(false);

  readonly solvedCount = computed(() => {
    const discoveries = this.notebook().discoveries;
    return this.genes().filter((gene) => !!discoveries[gene.id]).length;
  });
  readonly complete = computed(
    () => this.genes().length > 0 && this.solvedCount() === this.genes().length,
  );

  testCount(gene: AlleleVaultGene): number {
    return completedExperimentCount(this.notebook(), gene);
  }

  requiredTestCount(gene: AlleleVaultGene): number {
    return requiredExperimentKeys(gene).length;
  }

  experiments(geneId: string) {
    return experimentsForGene(this.notebook(), geneId).sort((first, second) =>
      this.allelePairLabel(first.alleleIds).localeCompare(this.allelePairLabel(second.alleleIds)),
    );
  }

  discovery(geneId: string): AlleleGeneDiscovery | null {
    return this.notebook().discoveries[geneId] ?? null;
  }

  traitName(traitId: string): string {
    return this.genes().find((gene) => gene.id === traitId)?.name ?? traitId;
  }

  alleleSampleCode(alleleId: string): string {
    return this.alleles().find((allele) => allele.id === alleleId)?.sampleCode ?? alleleId;
  }

  allelePairLabel(alleleIds: readonly string[]): string {
    return alleleIds.map((alleleId) => this.alleleSampleCode(alleleId)).join(' × ');
  }
}
