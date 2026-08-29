/**
 * Runtime status: ACTIVE — guarded teacher-only visual/genetic specimen test bench.
 * Inputs/signals: species, expressive profile, mini-dragon forms, and specimen selection signals.
 * Data access: committed model-pack, genetics catalogs, and procedural render adapters in memory.
 * Connects to: shared specimen preview/rendering components used to validate student visuals.
 */
import { Component, computed, signal } from '@angular/core';
import { SpecimenTestBenchComponent } from '../../shared/assembly/preview/specimen-test-bench.component';
import { DRAGON_BENCH_COPY, DRAGON_BENCH_MOTIONS } from './simulation/data/dragon-bench-content';
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
  toCoreLabGenome,
} from './simulation/domain/dragon-expressive-genome';
import {
  DragonLabGenome,
  DragonTraitDefinition,
  DragonTraitGenotype,
} from './simulation/domain/dragon-lab.models';
import {
  DRAGON_BODY_GENES,
  DRAGON_BODY_TYPES,
  DragonBodyGeneId,
  DragonBodyTypeId,
  bodyGenomeForType,
  isDragonBodyType,
} from './simulation/domain/dragon-body-type.genetics';
import {
  genotypeLabel as arenaGenotypeLabel,
  showsArenaDominant,
} from './simulation/domain/dragon-inheritance';
import { createExpressiveDragonBenchBuild } from './simulation/domain/dragon-specimen.profile';
import {
  MINI_DRAGON_GENES,
  MINI_DEFAULT_FORM_IDS,
  MiniGeneDefinition,
  MiniGeneId,
  MiniPhenotypeForm,
  miniGenomeFromForms,
  miniIndividualFeatureList,
} from './workstations/companion-show/mini-dragon.genetics';
import {
  MINI_PATTERN_LABELS,
  miniDragonSpecimenSource,
} from './workstations/companion-show/mini-dragon.specimen';
import {
  MINI_DRAGON_BREEDS,
  MiniBreedId,
} from './workstations/companion-show/mini-dragon.breeds';
import {
  MINI_DRAGON_REFERENCE_FORMS,
} from '../../shared/assembly/rendering/mini-dragon-breed-morphology';

interface GenotypeChoice {
  genotype: DragonTraitGenotype;
  label: string;
}

/** Which animal the bench is holding. */
export type BenchSpecies = 'lab' | 'mini';

/**
 * The forms a mini dragon starts on.
 *
 * Deliberately not every gene's first form: the codominant pattern locus starts
 * on the *heterozygous* coat, which is the one form on the bench that cannot be
 * mistaken for a blend, so the difference between codominance and incomplete
 * dominance is visible on the animal the moment the page loads.
 */
const DEFAULT_MINI_FORMS: Readonly<Record<MiniGeneId, string>> = {
  ...MINI_DEFAULT_FORM_IDS,
  plumage: 'plumage:fringe',
  wings: 'wings:broad',
  ember: 'ember:rose',
  crest: 'crest:crown-frill',
};

/**
 * Builds and tests the procedural creatures the lab and arena use.
 *
 * Two species share the bench, and the toggle between them is the point rather
 * than a convenience: the lab dragon models one relationship — a dominant
 * allele is enough — plus the four-locus switchboard that selects six inherited body plans —
 * while the mini dragon runs four different inheritance patterns across twenty-four genes. Seeing them on the same
 * instrument, framed and lit the same way, is what makes the second species
 * read as a different *genetics* rather than a different art style.
 */
@Component({
  selector: 'app-dragon-test-bench-page',
  imports: [SpecimenTestBenchComponent],
  templateUrl: './dragon-test-bench.page.html',
  styleUrl: './dragon-test-bench.page.scss',
})
export class DragonTestBenchPage {
  readonly traits = EXPRESSIVE_DRAGON_TRAITS;
  readonly bodyGenes = DRAGON_BODY_GENES;
  readonly bodyTypes = DRAGON_BODY_TYPES;
  readonly copy = DRAGON_BENCH_COPY;
  readonly motions = DRAGON_BENCH_MOTIONS;
  readonly miniGenes = MINI_DRAGON_GENES;
  readonly miniBreeds = MINI_DRAGON_BREEDS;

  readonly species = signal<BenchSpecies>('lab');
  readonly profile = signal<ExpressiveDragonProfile>(cloneProfile(DEFAULT_EXPRESSIVE_DRAGON));
  private readonly arenaGenome = signal<DragonLabGenome>(
    bodyGenomeForType(toCoreLabGenome(DEFAULT_EXPRESSIVE_DRAGON), 'regal-dragon'),
  );
  readonly miniForms = signal<Readonly<Record<MiniGeneId, string>>>({ ...DEFAULT_MINI_FORMS });
  /**
   * Which individual of that genotype. Bumping it redraws the same genome as a
   * different animal, because ear tufts, cheek tufts, plume shape and toe count
   * are hashed off the id and inherited from nobody.
   */
  private readonly miniIndividual = signal(1);

  readonly expressedArenaGenome = computed<DragonLabGenome>(() => ({
    ...this.arenaGenome(),
    ...toCoreLabGenome(this.profile()),
  }));

  readonly build = computed(() =>
    createExpressiveDragonBenchBuild('bench-dragon', this.profile(), {
      label: `${this.profile().sex === 'female' ? 'Female' : 'Male'} test dragon`,
      arenaGenome: this.expressedArenaGenome(),
    }),
  );

  readonly genotypeSummary = computed(() =>
    [
      ...this.traits.map((trait) => `${trait.name} ${this.genotypeLabel(trait.id)}`),
      ...this.bodyGenes.map((trait) => `${trait.name} ${this.bodyGenotypeLabel(trait.id)}`),
    ].join(' · '),
  );

  private readonly miniIndividualId = computed(() => `bench-mini-${this.miniIndividual()}`);

  readonly miniSource = computed(() =>
    miniDragonSpecimenSource(miniGenomeFromForms(this.miniForms()), this.miniIndividualId(), {
      label: `Mini dragon ${this.miniIndividual()}`,
    }),
  );

  readonly miniFeatures = computed(() => miniIndividualFeatureList(this.miniIndividualId()));

  readonly miniSummary = computed(() =>
    this.miniGenes.map((gene) => this.miniFormLabel(gene)).join(' · '),
  );

  selectSpecies(species: BenchSpecies): void {
    this.species.set(species);
  }

  // -- Lab dragon -----------------------------------------------------------

  choicesFor(trait: ExpressiveDragonTraitDefinition): GenotypeChoice[] {
    return genotypeChoices(trait, this.profile().sex).map((genotype) => ({
      genotype,
      label:
        trait.inheritance === 'x-linked'
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
    const trait = this.traits.find((entry) => entry.id === traitId);
    return trait ? expressivePhenotype(this.profile(), trait) : '';
  }

  select(traitId: ExpressiveDragonTraitId, choice: GenotypeChoice): void {
    this.profile.update((current) => ({
      ...current,
      genome: { ...current.genome, [traitId]: choice.genotype },
    }));
  }

  selectSex(sex: DragonSex): void {
    this.profile.update((current) => normalizeGenomeForSex(current, sex));
  }

  sexChromosomes(): 'XX' | 'XY' {
    return sexChromosomes(this.profile().sex);
  }

  genotypeLabel(traitId: ExpressiveDragonTraitId): string {
    const pair = this.profile().genome[traitId];
    return traitId === 'eye-color'
      ? pair[1] === 'Y'
        ? `X${pair[0]}Y`
        : `X${pair[0]}X${pair[1]}`
      : pair.join('');
  }

  /** Loads a genetic body plan as an editable starting point. */
  selectBodyType(typeId: DragonBodyTypeId): void {
    const genome = bodyGenomeForType(this.expressedArenaGenome(), typeId);
    this.arenaGenome.set(genome);
    this.profile.update((current) => ({
      ...current,
      genome: {
        ...current.genome,
        wings: [...genome.wings],
        horns: [...genome.horns],
        tail: [...(genome.tail ?? current.genome.tail)] as DragonTraitGenotype,
      },
    }));
  }

  isBodyTypeSelected(typeId: DragonBodyTypeId): boolean {
    return isDragonBodyType(this.expressedArenaGenome(), typeId);
  }

  bodyChoicesFor(trait: DragonTraitDefinition<DragonBodyGeneId>): GenotypeChoice[] {
    return [
      [trait.dominantAllele, trait.dominantAllele],
      [trait.dominantAllele, trait.recessiveAllele],
      [trait.recessiveAllele, trait.recessiveAllele],
    ].map((genotype) => ({
      genotype: genotype as DragonTraitGenotype,
      label: genotype.join(''),
    }));
  }

  isBodyGeneSelected(traitId: DragonBodyGeneId, choice: GenotypeChoice): boolean {
    return this.expressedArenaGenome()[traitId]?.join('|') === choice.genotype.join('|');
  }

  selectBodyGene(traitId: DragonBodyGeneId, choice: GenotypeChoice): void {
    this.arenaGenome.update((current) => ({
      ...current,
      [traitId]: [...choice.genotype],
    }));
  }

  bodyPhenotypeOf(trait: DragonTraitDefinition<DragonBodyGeneId>): string {
    return showsArenaDominant(this.expressedArenaGenome(), trait.id)
      ? trait.dominantPhenotype
      : trait.recessivePhenotype;
  }

  bodyGenotypeLabel(traitId: DragonBodyGeneId): string {
    const pair = this.expressedArenaGenome()[traitId];
    return pair ? arenaGenotypeLabel(pair) : '—';
  }

  // -- Mini dragon ----------------------------------------------------------

  /**
   * Mini dragons are chosen by visible form, not by genotype.
   *
   * Allele letters are never shown for this species — the show workstation
   * treats them as internal, because "which genotype produced this animal" is
   * exactly the question a breeder has to answer from evidence. Every distinct
   * model is still reachable: each form has a genotype that produces it.
   */
  selectMiniForm(geneId: MiniGeneId, form: MiniPhenotypeForm): void {
    this.miniForms.update((current) => ({ ...current, [geneId]: form.id }));
  }

  /** Loads a published breed as an editable starting point, never as a locked model. */
  selectMiniBreed(breedId: MiniBreedId): void {
    this.miniForms.set({ ...MINI_DRAGON_REFERENCE_FORMS[breedId] });
    this.nextMiniIndividual();
  }

  isMiniBreedSelected(breedId: MiniBreedId): boolean {
    const current = this.miniForms();
    const reference = MINI_DRAGON_REFERENCE_FORMS[breedId];
    return this.miniGenes.every((gene) => current[gene.id] === reference[gene.id]);
  }

  isMiniFormSelected(geneId: MiniGeneId, form: MiniPhenotypeForm): boolean {
    return this.miniForms()[geneId] === form.id;
  }

  miniPatternLabel(gene: MiniGeneDefinition): string {
    return MINI_PATTERN_LABELS[gene.pattern];
  }

  miniFormLabel(gene: MiniGeneDefinition): string {
    const formId = this.miniForms()[gene.id];
    return gene.forms.find((form) => form.id === formId)?.label ?? '';
  }

  nextMiniIndividual(): void {
    this.miniIndividual.update((current) => current + 1);
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
