import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { SpecimenTestBenchComponent } from '../../shared/assembly/preview/specimen-test-bench.component';
import { DRAGON_BENCH_COPY } from './simulation/data/dragon-bench-content';
import { createDragonBenchBuild } from './simulation/domain/dragon-specimen.profile';
import { DRAGON_TRAITS, genotypeLabel } from './simulation/domain/dragon-inheritance';
import { DragonLabGenome, DragonTraitGenotype, DragonTraitId } from './simulation/domain/dragon-lab.models';

interface GenotypeChoice {
  genotype: DragonTraitGenotype;
  label: string;
}

/**
 * Build a dragon, then test it — without an opponent.
 *
 * The arena answers "did it win". This page answers the questions that come
 * before that: which attacks does this genotype actually give me, what protects
 * the dragon, and how do those add up. Because it runs no physics, a student can
 * flip one allele and see the consequence immediately, which is the loop that
 * teaches genotype-to-phenotype.
 */
@Component({
  selector: 'app-dragon-test-bench-page',
  imports: [SpecimenTestBenchComponent],
  templateUrl: './dragon-test-bench.page.html',
  styleUrl: './dragon-test-bench.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonTestBenchPage {
  readonly traits = DRAGON_TRAITS;
  readonly copy = DRAGON_BENCH_COPY;

  readonly genome = signal<DragonLabGenome>({
    wings: ['W', 'w'],
    fire: ['F', 'f'],
    scales: ['S', 's'],
    horns: ['H', 'h'],
  });

  readonly build = computed(() =>
    createDragonBenchBuild('bench-dragon', this.genome(), { label: 'Your dragon' }));

  readonly genotypeSummary = computed(() => this.traits
    .map(trait => `${trait.name} ${genotypeLabel(this.genome()[trait.id])}`)
    .join(' · '));

  /** Homozygous dominant, heterozygous, homozygous recessive — the three cases. */
  choicesFor(traitId: DragonTraitId): GenotypeChoice[] {
    const trait = this.traits.find(entry => entry.id === traitId);
    if (!trait) return [];

    const dominant = trait.dominantAllele;
    const recessive = trait.recessiveAllele;
    return [
      { genotype: [dominant, dominant], label: `${dominant}${dominant}` },
      { genotype: [dominant, recessive], label: `${dominant}${recessive}` },
      { genotype: [recessive, recessive], label: `${recessive}${recessive}` },
    ];
  }

  isSelected(traitId: DragonTraitId, choice: GenotypeChoice): boolean {
    return genotypeLabel(this.genome()[traitId]) === choice.label;
  }

  phenotypeOf(traitId: DragonTraitId): string {
    const trait = this.traits.find(entry => entry.id === traitId);
    if (!trait) return '';
    const genotype = this.genome()[traitId];
    return genotype.includes(trait.dominantAllele)
      ? trait.dominantPhenotype
      : trait.recessivePhenotype;
  }

  select(traitId: DragonTraitId, choice: GenotypeChoice): void {
    this.genome.update(current => ({ ...current, [traitId]: choice.genotype }));
  }
}
