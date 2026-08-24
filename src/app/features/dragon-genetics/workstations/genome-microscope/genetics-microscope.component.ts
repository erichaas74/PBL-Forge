import { Component, computed, effect, input, linkedSignal, untracked } from '@angular/core';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { CellModelComponent } from '../shared/cell-model.component';
import { GeneticsCardDeckComponent } from '../shared/genetics-card-deck.component';
import { GeneticsCardBundle, GeneticsProgram, GeneticsSpecimen } from '../shared/genetics-program.models';

@Component({
  selector: 'app-genetics-microscope',
  imports: [SpecimenViewportComponent, CellModelComponent, GeneticsCardDeckComponent],
  templateUrl: './genetics-microscope.component.html',
  styleUrl: './genetics-microscope.component.scss',
})
export class GeneticsMicroscopeComponent {
  readonly program = input.required<GeneticsProgram>();
  readonly studentId = input.required<string>();
  readonly revealedGeneIds = input<readonly string[]>([]);
  readonly goal = input('Trace inherited information from a dragon into its chromosomes and genes.');

  readonly specimens = computed(() => this.program().specimens(this.studentId()));
  readonly bundles = computed(() => this.specimens().map((specimen) => this.program().cardBundle(specimen)));
  readonly selectableGeneIds = computed(() => this.program().genes.map((gene) => gene.id));
  readonly selectedSpecimenId = linkedSignal(() => this.specimens()[0]?.id ?? '');
  readonly selectedBundle = computed<GeneticsCardBundle | null>(() =>
    this.bundles().find((bundle) => bundle.id === this.selectedSpecimenId()) ?? this.bundles()[0] ?? null,
  );
  readonly selectedChromosomeId = linkedSignal(() => this.selectedBundle()?.genome.chromosomes[0]?.id ?? '');
  readonly selectedGeneId = linkedSignal(() =>
    this.selectedBundle()?.genome.genesByChromosome.get(this.selectedChromosomeId())?.[0]?.id ?? '',
  );
  readonly selectedGenes = computed(() =>
    this.selectedBundle()?.genome.genesByChromosome.get(this.selectedChromosomeId()) ?? [],
  );
  readonly selectedGene = computed(() =>
    this.selectedGenes().find((gene) => gene.id === this.selectedGeneId()) ?? this.selectedGenes()[0] ?? null,
  );

  constructor() {
    effect(() => {
      const program = this.program();
      const studentId = this.studentId();
      untracked(() => program.prepare?.(studentId));
    });
  }

  selectSpecimen(specimen: GeneticsSpecimen): void {
    this.selectedSpecimenId.set(specimen.id);
  }

  selectChromosome(chromosomeId: string): void {
    this.selectedChromosomeId.set(chromosomeId);
    const firstGene = this.selectedBundle()?.genome.genesByChromosome.get(chromosomeId)?.[0];
    this.selectedGeneId.set(firstGene?.id ?? '');
  }
}
