import {
  EXPEDITION_ISLANDS,
  EXPEDITION_ISLAND_BY_ID,
  EXPEDITION_ISLAND_IDS,
  EXPEDITION_LOCI,
  EXPEDITION_LOCUS_BY_ID,
  FOUNDER_DOMINANT_FREQUENCY,
} from './island-expedition.models';
import {
  advanceOneGeneration,
  formFitness,
  genotypeFrequencies,
  islandFrequencies,
  rankIslandsForForm,
  rankIslandsForGenotype,
  selectedFrequency,
  selectionPressure,
} from './island-expedition.selection';

describe('island expedition selection model', () => {
  it('leaves allele frequency unchanged when both forms are equally fit', () => {
    const neutral = { dominantForm: 1, recessiveForm: 1 };
    expect(advanceOneGeneration(0.5, neutral)).toBeCloseTo(0.5, 10);
    expect(advanceOneGeneration(0.3, neutral)).toBeCloseTo(0.3, 10);
  });

  it('moves allele frequency toward the fitter form', () => {
    const favoursDominant = { dominantForm: 1, recessiveForm: 0.8 };
    expect(advanceOneGeneration(0.5, favoursDominant)).toBeGreaterThan(0.5);
    const favoursRecessive = { dominantForm: 0.8, recessiveForm: 1 };
    expect(advanceOneGeneration(0.5, favoursRecessive)).toBeLessThan(0.5);
  });

  it('removes a recessive allele more slowly as it becomes rare', () => {
    // Selection acts on the phenotype, so heterozygotes shield the recessive allele from it. Once
    // the recessive allele is rare it sits almost entirely inside carriers, and progress stalls —
    // which is why a deleterious recessive never quite disappears and carriers stay findable.
    const against = { dominantForm: 1, recessiveForm: 0.6 };
    const dropFromCommon = 0.5 - (1 - advanceOneGeneration(0.5, against));
    const dropFromRare = 0.1 - (1 - advanceOneGeneration(0.9, against));
    expect(dropFromCommon).toBeGreaterThan(0);
    expect(dropFromRare).toBeGreaterThan(0);
    expect(dropFromRare).toBeLessThan(dropFromCommon);
  });

  it('keeps Hardy-Weinberg genotype frequencies summing to one', () => {
    for (const p of [0, 0.1, 0.37, 0.5, 0.83, 1]) {
      const genotypes = genotypeFrequencies(p);
      const total =
        genotypes.homozygousDominant + genotypes.heterozygous + genotypes.homozygousRecessive;
      expect(total).toBeCloseTo(1, 10);
    }
  });

  it('peaks heterozygote frequency at an allele frequency of one half', () => {
    // The fact behind the "Hidden Line" quest: carriers are commonest at intermediate frequency,
    // not where the recessive form is commonest.
    const half = genotypeFrequencies(0.5).heterozygous;
    for (const p of [0.05, 0.2, 0.35, 0.65, 0.8, 0.95]) {
      expect(genotypeFrequencies(p).heterozygous).toBeLessThan(half);
    }
    expect(half).toBeCloseTo(0.5, 10);
  });

  it('starts every island from the same founder frequency', () => {
    // Divergence must be attributable to selection, not to different starting points.
    for (const locus of EXPEDITION_LOCI) {
      expect(selectedFrequency(locus, EXPEDITION_ISLANDS[0].ecology, 0)).toBe(
        FOUNDER_DOMINANT_FREQUENCY,
      );
    }
  });

  it('diverges further the longer selection has been running', () => {
    const locus = EXPEDITION_LOCUS_BY_ID['scales'];
    const stormcrag = EXPEDITION_ISLAND_BY_ID['stormcrag'].ecology;
    const short = selectedFrequency(locus, stormcrag, 5);
    const long = selectedFrequency(locus, stormcrag, 40);
    expect(long).toBeGreaterThan(short);
    expect(short).toBeGreaterThan(FOUNDER_DOMINANT_FREQUENCY);
  });

  it('gives every locus a genuine trade-off rather than a universally good form', () => {
    // A trait that won everywhere would make the islands identical and leave nothing to reason about.
    for (const locus of EXPEDITION_LOCI) {
      const directions = EXPEDITION_ISLANDS.map(
        (island) => selectionPressure(locus, island.ecology).direction,
      );
      expect(directions, locus.id).toContain('toward-dominant');
      expect(directions, locus.id).toContain('toward-recessive');
    }
  });

  it('normalizes the fitter form to one', () => {
    for (const locus of EXPEDITION_LOCI) {
      for (const island of EXPEDITION_ISLANDS) {
        const fitness = formFitness(locus, island.ecology);
        expect(Math.max(fitness.dominantForm, fitness.recessiveForm)).toBeCloseTo(1, 10);
      }
    }
  });

  it('agrees with the ecology a student can read off the map', () => {
    // Each of these is a claim a student should be able to make before spending any budget.
    const frequencies = (id: Parameters<typeof islandFrequencies>[0]) => islandFrequencies(id);

    // Heavy predators and no heat: plating pays.
    expect(frequencies('stormcrag').scales.dominantForm).toBeGreaterThan(0.8);
    // Blazing heat and light predator pressure: plating costs more than it returns.
    expect(frequencies('palewind').scales.dominantForm).toBeLessThan(0.2);
    // Armoured prey: strong flame pays.
    expect(frequencies('ironmoor').fire.dominantForm).toBeGreaterThan(0.8);
    // Scarce food and soft prey: strong flame is an expense.
    expect(frequencies('sunspire').fire.dominantForm).toBeLessThan(0.2);
    // Gale-swept open cliffs: broad wings.
    expect(frequencies('stormcrag').wings.dominantForm).toBeGreaterThan(0.8);
    // Closed canopy: broad wings snag.
    expect(frequencies('gloomroot').wings.dominantForm).toBeLessThan(0.2);
    // Black rock with sighted scavengers: dark hide hides.
    expect(frequencies('ashfall').color.dominantForm).toBeGreaterThan(0.8);
    // Chalk flats with hawks overhead: pale hide hides.
    expect(frequencies('palewind').color.dominantForm).toBeLessThan(0.2);
    // Predator-rich cold cliffs reward the defensive three-row phenotype.
    expect(frequencies('stormcrag').spikes.dominantForm)
      .toBeGreaterThan(frequencies('sunspire').spikes.dominantForm);
  });

  it('keeps the recently colonized island close to founder frequencies', () => {
    // Kelpreach is the carrier island, and the reason is weak selection over few generations.
    const kelpreach = islandFrequencies('kelpreach');
    for (const locus of EXPEDITION_LOCI) {
      expect(kelpreach[locus.id].dominantAllele, locus.id).toBeGreaterThan(0.25);
      expect(kelpreach[locus.id].dominantAllele, locus.id).toBeLessThan(0.75);
    }
  });

  it('makes the mildest island the best place to find carriers', () => {
    const carrierWins = EXPEDITION_LOCI.filter(
      (locus) =>
        rankIslandsForGenotype(locus.id, 'heterozygous', EXPEDITION_ISLAND_IDS)[0].islandId ===
        'kelpreach',
    );
    expect(carrierWins.length).toBeGreaterThanOrEqual(3);
  });

  it('never lets the island richest in a recessive form also be richest in its carriers', () => {
    // The misconception the Hidden Line quest exists to break.
    for (const locus of EXPEDITION_LOCI) {
      const mostRecessive = rankIslandsForForm(
        locus.id,
        'recessive',
        EXPEDITION_ISLAND_IDS,
      )[0].islandId;
      const mostCarriers = rankIslandsForGenotype(
        locus.id,
        'heterozygous',
        EXPEDITION_ISLAND_IDS,
      )[0].islandId;
      expect(mostCarriers, locus.id).not.toBe(mostRecessive);
    }
  });

  it('holds every frequency inside a findable range', () => {
    for (const islandId of EXPEDITION_ISLAND_IDS) {
      const frequencies = islandFrequencies(islandId);
      for (const locus of EXPEDITION_LOCI) {
        const record = frequencies[locus.id];
        expect(record.dominantAllele + record.recessiveAllele).toBeCloseTo(1, 10);
        expect(record.dominantForm + record.recessiveForm).toBeCloseTo(1, 10);
        expect(record.dominantAllele, `${islandId}/${locus.id}`).toBeGreaterThan(0);
        expect(record.dominantAllele, `${islandId}/${locus.id}`).toBeLessThan(1);
      }
    }
  });
});
