import {
  MINI_DRAGON_GENES,
  MINI_FOUNDERS,
  MiniGenome,
  breedMiniGenomes,
  expressMiniGene,
  isMiniGenome,
  miniCoatPaint,
  miniGenomeFromForms,
  miniGenotypeForForm,
  miniIndividualFeatures,
  miniPhenotypeFormId,
  normalizeMiniGenotype,
} from './mini-dragon.genetics';
import { MINI_TRIALS, miniRibbonCount, runMiniTrial } from './mini-dragon.events';

function genomeWith(overrides: Partial<MiniGenome>): MiniGenome {
  return {
    coat: ['F', 'F'],
    plumage: ['p', 'p'],
    horns: ['C', 'c'],
    wings: ['W', 'w'],
    pattern: ['A', 'A'],
    ember: ['Eb', 'ep'],
    size: ['T', 't'],
    ears: ['E', 'e'],
    muzzle: ['M', 'm'],
    legs: ['L', 'l'],
    tail: ['Tf', 'Tf'],
    crest: ['K', 'R'],
    frame: ['B', 'b'],
    ...overrides,
  };
}

describe('mini dragon inheritance patterns', () => {
  it('covers four different relationships across thirteen genes', () => {
    const patterns = new Set(MINI_DRAGON_GENES.map((gene) => gene.pattern));
    expect(MINI_DRAGON_GENES.length).toBe(13);
    expect(patterns).toEqual(
      new Set(['complete-dominance', 'incomplete-dominance', 'codominance', 'multiple-alleles']),
    );
  });

  it('hides a recessive coat behind one dominant allele', () => {
    expect(miniPhenotypeFormId('coat', genomeWith({ coat: ['F', 'f'] }))).toBe('coat:sleek');
    expect(miniPhenotypeFormId('coat', genomeWith({ coat: ['f', 'f'] }))).toBe('coat:fluffy');
  });

  it('blends feather coverage into a visible fringe', () => {
    expect(miniPhenotypeFormId('plumage', genomeWith({ plumage: ['P', 'P'] }))).toBe(
      'plumage:full',
    );
    expect(miniPhenotypeFormId('plumage', genomeWith({ plumage: ['P', 'p'] }))).toBe(
      'plumage:fringe',
    );
    expect(miniPhenotypeFormId('plumage', genomeWith({ plumage: ['p', 'p'] }))).toBe(
      'plumage:bare',
    );
  });

  it('gives incomplete dominance a visible heterozygote', () => {
    expect(miniPhenotypeFormId('wings', genomeWith({ wings: ['W', 'W'] }))).toBe('wings:broad');
    expect(miniPhenotypeFormId('wings', genomeWith({ wings: ['W', 'w'] }))).toBe('wings:small');
    expect(miniPhenotypeFormId('wings', genomeWith({ wings: ['w', 'w'] }))).toBe('wings:vestigial');
  });

  it('shows both alleles at once for the codominant coat pattern', () => {
    expect(miniPhenotypeFormId('pattern', genomeWith({ pattern: ['A', 'A'] }))).toBe('pattern:ash');
    expect(miniPhenotypeFormId('pattern', genomeWith({ pattern: ['A', 'G'] }))).toBe(
      'pattern:ash-gold',
    );
    expect(miniPhenotypeFormId('pattern', genomeWith({ pattern: ['G', 'A'] }))).toBe(
      'pattern:ash-gold',
    );
  });

  it('resolves the ember series by its dominance hierarchy', () => {
    expect(miniPhenotypeFormId('ember', genomeWith({ ember: ['Er', 'ep'] }))).toBe('ember:rose');
    expect(miniPhenotypeFormId('ember', genomeWith({ ember: ['Eb', 'Er'] }))).toBe('ember:rose');
    expect(miniPhenotypeFormId('ember', genomeWith({ ember: ['Eb', 'ep'] }))).toBe('ember:blue');
    expect(miniPhenotypeFormId('ember', genomeWith({ ember: ['ep', 'ep'] }))).toBe('ember:pale');
  });

  it('orders a genotype most-dominant first however it is written', () => {
    expect(normalizeMiniGenotype('ember', ['ep', 'Er'])).toEqual(['Er', 'ep']);
    expect(normalizeMiniGenotype('coat', ['f', 'F'])).toEqual(['F', 'f']);
  });

  it('never leaks an allele symbol into a phenotype label', () => {
    for (const gene of MINI_DRAGON_GENES) {
      for (const form of gene.forms) {
        for (const allele of gene.alleles) {
          expect(form.label.split(/\s+/)).withContext(form.id).not.toContain(allele);
        }
      }
    }
  });
});

describe('mini dragon breeding', () => {
  it('draws one allele from each parent at every locus', () => {
    const dam = genomeWith({ coat: ['F', 'F'] });
    const sire = genomeWith({ coat: ['f', 'f'] });

    for (let index = 0; index < 12; index += 1) {
      const pup = breedMiniGenomes(dam, sire, `seed:${index}`);
      expect(pup.coat.slice().sort()).toEqual(['F', 'f']);
      expect(isMiniGenome(pup)).toBe(true);
    }
  });

  it('is deterministic for the same parents and seed', () => {
    const dam = MINI_FOUNDERS[0].genome;
    const sire = MINI_FOUNDERS[2].genome;
    expect(breedMiniGenomes(dam, sire, 'litter-1:0')).toEqual(
      breedMiniGenomes(dam, sire, 'litter-1:0'),
    );
  });

  it('produces all three forms from a pair of heterozygotes at an incomplete locus', () => {
    const parent = genomeWith({ wings: ['W', 'w'] });
    const forms = new Set(
      Array.from({ length: 60 }, (_, index) =>
        miniPhenotypeFormId('wings', breedMiniGenomes(parent, parent, `w:${index}`)),
      ),
    );
    expect(forms).toEqual(new Set(['wings:broad', 'wings:small', 'wings:vestigial']));
  });
});

describe('the founding population', () => {
  it('carries every allele of every gene somewhere in the pool', () => {
    for (const gene of MINI_DRAGON_GENES) {
      const present = new Set(MINI_FOUNDERS.flatMap((founder) => founder.genome[gene.id]));
      expect(present).withContext(gene.id).toEqual(new Set(gene.alleles));
    }
  });

  it('shows every visible form of every gene in the founders', () => {
    for (const gene of MINI_DRAGON_GENES) {
      const visible = new Set(
        MINI_FOUNDERS.map((founder) => expressMiniGene(gene.id, founder.genome).id),
      );
      expect(visible.size).withContext(gene.id).toBe(gene.forms.length);
    }
  });

  it('hides the baby-bumpy scale rows and teacup size behind carriers', () => {
    const carriesHidden = (geneId: 'coat' | 'size', hidden: string): boolean =>
      MINI_FOUNDERS.some(
        (founder) =>
          founder.genome[geneId].includes(hidden) &&
          expressMiniGene(geneId, founder.genome).id !==
            `${geneId}:${geneId === 'coat' ? 'fluffy' : 'teacup'}`,
      );
    expect(carriesHidden('coat', 'f')).toBe(true);
    expect(carriesHidden('size', 't')).toBe(true);
  });
});

describe('coat paint and individual features', () => {
  it('keeps the coat colour inside the family its pattern genotype names', () => {
    const ash = miniCoatPaint(genomeWith({ pattern: ['A', 'A'] }), 'one');
    const gold = miniCoatPaint(genomeWith({ pattern: ['G', 'G'] }), 'one');
    const both = miniCoatPaint(genomeWith({ pattern: ['A', 'G'] }), 'one');

    expect(ash.color).toBe(ash.patchColor);
    expect(gold.color).toBe(gold.patchColor);
    // A codominant animal carries two colours; a homozygote carries one.
    expect(both.color).not.toBe(both.patchColor);
  });

  it('varies littermates without moving them between pattern families', () => {
    const genome = genomeWith({ pattern: ['G', 'G'] });
    const first = miniCoatPaint(genome, 'pup-1');
    const second = miniCoatPaint(genome, 'pup-2');

    expect(first.color).not.toBe(second.color);
    expect(hueOf(first.color)).toBe(hueOf(second.color));
  });

  it('gives the ember locus its own colour', () => {
    expect(miniCoatPaint(genomeWith({ ember: ['Er', 'ep'] }), 'x').emberColor).not.toBe(
      miniCoatPaint(genomeWith({ ember: ['ep', 'ep'] }), 'x').emberColor,
    );
  });

  it('keeps individual features stable per animal and unlinked to any parent', () => {
    expect(miniIndividualFeatures('pup-1')).toEqual(miniIndividualFeatures('pup-1'));
    expect(miniIndividualFeatures('pup-1')).not.toEqual(miniIndividualFeatures('pup-2'));
  });
});

describe('show ring trials', () => {
  it('reads the flight trial off the wing locus alone', () => {
    expect(runMiniTrial('flight', genomeWith({ wings: ['W', 'W'] })).outcome.id).toBe(
      'flight:soars',
    );
    expect(runMiniTrial('flight', genomeWith({ wings: ['W', 'w'] })).outcome.id).toBe(
      'flight:hovers',
    );
    expect(runMiniTrial('flight', genomeWith({ wings: ['w', 'w'] })).outcome.id).toBe(
      'flight:grounded',
    );
  });

  it('needs two loci to predict the agility run', () => {
    const nimble = genomeWith({ size: ['t', 't'], coat: ['F', 'F'] });
    const heavy = genomeWith({ size: ['T', 'T'], coat: ['f', 'f'] });
    const mixed = genomeWith({ size: ['t', 't'], coat: ['f', 'f'] });

    expect(runMiniTrial('agility', nimble).outcome.id).toBe('agility:nimble');
    expect(runMiniTrial('agility', heavy).outcome.id).toBe('agility:heavy');
    expect(runMiniTrial('agility', mixed).outcome.id).toBe('agility:brisk');
  });

  it('sets the coat trials against each other so no animal takes every ribbon', () => {
    const fluffy = genomeWith({ coat: ['f', 'f'], size: ['t', 't'] });
    const sleek = genomeWith({ coat: ['F', 'F'], size: ['t', 't'] });

    expect(runMiniTrial('endurance', fluffy).outcome.places).toBe(true);
    expect(runMiniTrial('agility', fluffy).outcome.places).toBe(false);
    expect(runMiniTrial('endurance', sleek).outcome.places).toBe(false);
    expect(runMiniTrial('agility', sleek).outcome.places).toBe(true);
  });

  it('caps any genome below a clean sweep of the card', () => {
    const best = genomeWith({
      coat: ['f', 'f'],
      wings: ['W', 'W'],
      size: ['t', 't'],
      ember: ['Er', 'Er'],
    });
    expect(miniRibbonCount(best)).toBeLessThan(MINI_TRIALS.length);
  });

  it('never names a gene or an allele in a trial result', () => {
    const genome = genomeWith({});
    const text = MINI_TRIALS.map((trial) => {
      const result = runMiniTrial(trial.id, genome);
      return `${trial.name} ${trial.brief} ${result.outcome.label} ${result.outcome.detail}`;
    }).join(' ');
    const tokens = new Set(text.split(/[^A-Za-z]+/).filter(Boolean));

    expect(text.toLowerCase()).not.toContain('allele');
    expect(text.toLowerCase()).not.toContain('genotype');
    for (const gene of MINI_DRAGON_GENES) {
      // Single-letter symbols cannot be told apart from English ("A weaving
      // course"), so the check is on what leakage actually looks like: a written
      // genotype pair, or a multi-letter symbol standing on its own.
      for (const left of gene.alleles) {
        for (const right of gene.alleles) {
          expect(text)
            .withContext(`${gene.id}/${left}${right}`)
            .not.toContain(left + right);
        }
        if (left.length > 1) {
          expect(tokens).withContext(`${gene.id}/${left}`).not.toContain(left);
        }
      }
    }
  });
});

describe('choosing a mini dragon by its visible form', () => {
  it('produces a genotype that expresses the requested form, for every form of every gene', () => {
    for (const gene of MINI_DRAGON_GENES) {
      for (const form of gene.forms) {
        const genome = genomeWith({ [gene.id]: miniGenotypeForForm(gene.id, form.id) });
        expect(expressMiniGene(gene.id, genome).id)
          .withContext(`${gene.id}/${form.id}`)
          .toBe(form.id);
      }
    }
  });

  it('answers the homozygous genotype where a form has more than one, so nothing is implied about carriers', () => {
    expect(miniGenotypeForForm('coat', 'coat:sleek')).toEqual(['F', 'F']);
    expect(miniGenotypeForForm('ember', 'ember:rose')).toEqual(['Er', 'Er']);
  });

  it('builds a whole genome from one form per locus', () => {
    const genome = miniGenomeFromForms({
      coat: 'coat:fluffy',
      plumage: 'plumage:full',
      horns: 'horns:straight',
      wings: 'wings:small',
      pattern: 'pattern:ash-gold',
      ember: 'ember:blue',
      size: 'size:teacup',
      ears: 'ears:sail',
      muzzle: 'muzzle:pug',
      legs: 'legs:stilt',
      tail: 'tail:fork',
      crest: 'crest:crown-frill',
      frame: 'frame:round',
    });

    expect(isMiniGenome(genome)).toBe(true);
    expect(expressMiniGene('wings', genome).id).toBe('wings:small');
    expect(expressMiniGene('pattern', genome).id).toBe('pattern:ash-gold');
    expect(expressMiniGene('size', genome).id).toBe('size:teacup');
    expect(expressMiniGene('tail', genome).id).toBe('tail:fork');
    expect(expressMiniGene('frame', genome).id).toBe('frame:round');
  });

  it('rejects a form that does not belong to the gene', () => {
    expect(() => miniGenotypeForForm('coat', 'size:teacup')).toThrow();
  });
});

function hueOf(color: string): string {
  return /^hsl\(\s*([\d.]+)/.exec(color)?.[1] ?? color;
}
