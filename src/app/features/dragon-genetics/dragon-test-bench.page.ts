import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { SpecimenTestBenchComponent } from '../../shared/assembly/preview/specimen-test-bench.component';
import { DRAGON_BENCH_COPY } from './simulation/data/dragon-bench-content';
import {
  DEFAULT_EXPRESSIVE_DRAGON,
  EXPRESSIVE_DRAGON_TRAITS,
  DragonSex,
  ExpressiveDragonProfile,
  ExpressiveDragonTraitDefinition,
  ExpressiveDragonTraitId,
  expressivePhenotype,
  genotypeChoices,
  normalizeGenomeForSex,
  sexChromosomes,
} from './simulation/domain/dragon-expressive-genome';
import { DragonTraitGenotype } from './simulation/domain/dragon-lab.models';
import { createExpressiveDragonBenchBuild } from './simulation/domain/dragon-specimen.profile';

interface GenotypeChoice {
  genotype: DragonTraitGenotype;
  label: string;
}

/** Builds and tests the same procedural dragon assembly used by the lab and arena. */
@Component({
  selector: 'app-dragon-test-bench-page',
  imports: [SpecimenTestBenchComponent],
  templateUrl: './dragon-test-bench.page.html',
  styleUrl: './dragon-test-bench.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonTestBenchPage {
  readonly traits = EXPRESSIVE_DRAGON_TRAITS;
  readonly copy = DRAGON_BENCH_COPY;
  readonly profile = signal<ExpressiveDragonProfile>(cloneProfile(DEFAULT_EXPRESSIVE_DRAGON));

  readonly build = computed(() =>
    createExpressiveDragonBenchBuild('bench-dragon', this.profile(), {
      label: `${this.profile().sex === 'female' ? 'Female' : 'Male'} test dragon`,
    }));

  readonly genotypeSummary = computed(() => this.traits
    .map(trait => `${trait.name} ${this.genotypeLabel(trait.id)}`)
    .join(' · '));

  choicesFor(trait: ExpressiveDragonTraitDefinition): GenotypeChoice[] {
    return genotypeChoices(trait, this.profile().sex).map(genotype => ({
      genotype,
      label: trait.inheritance === 'x-linked'
        ? genotype[1] === 'Y'
          ? `X${genotype[0]}Y`
          : `X${genotype[0]}X${genotype[1]}`
        : genotype.join(''),
    }));
  }

  isSelected(traitId: ExpressiveDragonTraitId, choice: GenotypeChoice): boolean {
    return this.profile().genome[traitId].join('|') === choice.genotype.join('|');
  }

  phenotypeOf(traitId: ExpressiveDragonTraitId): string {
    const trait = this.traits.find(entry => entry.id === traitId);
    return trait ? expressivePhenotype(this.profile(), trait) : '';
  }

  select(traitId: ExpressiveDragonTraitId, choice: GenotypeChoice): void {
    this.profile.update(current => ({
      ...current,
      genome: { ...current.genome, [traitId]: choice.genotype },
    }));
  }

  selectSex(sex: DragonSex): void {
    this.profile.update(current => normalizeGenomeForSex(current, sex));
  }

  sexChromosomes(): 'XX' | 'XY' {
    return sexChromosomes(this.profile().sex);
  }

  genotypeLabel(traitId: ExpressiveDragonTraitId): string {
    const pair = this.profile().genome[traitId];
    return traitId === 'eye-color'
      ? pair[1] === 'Y' ? `X${pair[0]}Y` : `X${pair[0]}X${pair[1]}`
      : pair.join('');
  }
}

function cloneProfile(profile: ExpressiveDragonProfile): ExpressiveDragonProfile {
  return {
    sex: profile.sex,
    genome: Object.fromEntries(
      Object.entries(profile.genome).map(([traitId, pair]) => [traitId, [...pair]]),
    ) as ExpressiveDragonProfile['genome'],
  };
}
