import { EXPRESSIVE_DRAGON_TRAITS } from '../../simulation/domain/dragon-expressive-genome';
import {
  DRAGON_DNA_BASE_COLORS,
  DRAGON_ENZYME_GENES,
  DRAGON_GENE_DNA_CATALOG,
  DragonDnaBase,
  geneAlleleMarking,
  geneDnaRecord,
  geneMutationTypeForComparison,
  geneProteinForm,
} from './dragon-gene-dna.catalog';

describe('dragon gene DNA catalog', () => {
  it('defines molecular and visual truth for every identified gene', () => {
    expect(DRAGON_GENE_DNA_CATALOG.map((record) => record.geneId).sort()).toEqual(
      EXPRESSIVE_DRAGON_TRAITS.map((trait) => trait.id).sort(),
    );
    expect(new Set(DRAGON_GENE_DNA_CATALOG.map((record) => record.alleleASequence)).size).toBe(
      DRAGON_GENE_DNA_CATALOG.length,
    );
  });

  it('keeps sequence, mutation, barcode bases, and base colors aligned', () => {
    const complements: Readonly<Record<DragonDnaBase, DragonDnaBase>> = {
      A: 'T',
      T: 'A',
      C: 'G',
      G: 'C',
    };

    for (const record of DRAGON_GENE_DNA_CATALOG) {
      expect(record.alleles[0].sequence).toBe(record.alleleASequence);
      expect(record.alleles[1].sequence).toBe(record.alleleBSequence);
      expect(record.alleles[0].mutationType).toBe('reference');
      expect(record.alleles[1].mutationType).toBe(record.mutation.type);
      expect(record.alleles[0].barcode.length).toBe(6);
      expect(record.alleles[1].barcode.length).toBe(
        record.mutation.type === 'deletion' ? 5 : record.mutation.type === 'insertion' ? 7 : 6,
      );

      for (const pair of [...record.alleles[0].barcode, ...record.alleles[1].barcode]) {
        expect(pair.bottomBase).toBe(complements[pair.topBase]);
        expect(pair.topColor).toBe(DRAGON_DNA_BASE_COLORS[pair.topBase]);
        expect(pair.bottomColor).toBe(DRAGON_DNA_BASE_COLORS[pair.bottomBase]);
      }
    }
  });

  it('gives every reference gene eight complete amino-acid codons', () => {
    const stopCodons = new Set(['TAA', 'TAG', 'TGA']);

    for (const record of DRAGON_GENE_DNA_CATALOG) {
      expect(record.alleleASequence.length).toBe(24);
      const codons = record.alleleASequence.match(/.{3}/g) ?? [];
      expect(codons.length).toBe(8);
      expect(codons.some((codon) => stopCodons.has(codon))).toBeFalse();
    }
  });

  it('contains substitution, deletion, and insertion genes', () => {
    expect(new Set(DRAGON_GENE_DNA_CATALOG.map((record) => record.mutation.type))).toEqual(
      new Set(['substitution', 'deletion', 'insertion']),
    );
  });

  it('codes every gene for a protein with RNA, residues, a shape, and a cell job', () => {
    for (const record of DRAGON_GENE_DNA_CATALOG) {
      const { protein } = record;

      expect(protein.form.rnaSequence).toBe(record.alleleASequence.replace(/T/g, 'U'));
      expect(protein.variantForm.rnaSequence).toBe(record.alleleBSequence.replace(/T/g, 'U'));
      expect(protein.form.residues.length).toBe(8);
      expect(protein.form.chainLabel.split('-').length).toBe(8);
      expect(protein.form.shapePath).toMatch(/^M.*Z$/);
      expect(protein.cellRole.length).toBeGreaterThan(0);
      expect(protein.traitContribution.length).toBeGreaterThan(0);
      expect(protein.traitSignal.path.length).toBeGreaterThan(0);

      for (const residue of protein.form.residues) {
        expect(residue.rnaCodon).toBe(residue.dnaCodon.replace(/T/g, 'U'));
        expect(residue.color).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('keeps every allele copy tied to the protein it translates into', () => {
    for (const record of DRAGON_GENE_DNA_CATALOG) {
      expect(record.alleles[0].protein).toBe(record.protein.form);
      expect(record.alleles[1].protein).toBe(record.protein.variantForm);
      expect(geneProteinForm(record.geneId, 1)).toBe(record.protein.variantForm);
    }
  });

  it('changes the folded protein shape when the allele carries the mutation', () => {
    for (const record of DRAGON_GENE_DNA_CATALOG) {
      expect(record.protein.variantForm.shapePath).not.toBe(record.protein.form.shapePath);
    }
  });

  it('splits genes into enzymes and proteins that reach a trait directly', () => {
    const enzymes = DRAGON_GENE_DNA_CATALOG.filter((record) => record.protein.role === 'enzyme');
    const direct = DRAGON_GENE_DNA_CATALOG.filter((record) => record.protein.role !== 'enzyme');

    expect(enzymes.length).toBeGreaterThan(0);
    expect(direct.length).toBeGreaterThan(0);
    expect(DRAGON_ENZYME_GENES.map((record) => record.geneId)).toEqual(
      enzymes.map((record) => record.geneId),
    );

    for (const record of direct) {
      expect(record.protein.activity).toBeNull();
      expect(record.protein.bodyPath).toBeNull();
      // A structural or signal protein is itself the molecule the trait reads.
      expect(record.protein.traitSignal.path).toBe(record.protein.form.shapePath);
    }
  });

  it('runs enzymes in both directions and hands each trait one product', () => {
    const actions = new Set(
      DRAGON_ENZYME_GENES.map((record) => record.protein.activity?.action),
    );
    expect(actions).toEqual(new Set(['build', 'break-down']));

    for (const record of DRAGON_ENZYME_GENES) {
      const activity = record.protein.activity!;
      const building = activity.action === 'build';

      expect(activity.reactants.length).toBe(building ? 2 : 1);
      expect(activity.products.length).toBe(building ? 1 : 2);
      expect(activity.products).toContain(activity.traitProduct);
      expect(record.protein.traitSignal).toBe(activity.traitProduct);
      expect(activity.equation).toContain(activity.traitProduct.name);
      // Both fragments and the joined molecule are cut from one seam.
      expect(activity.fragmentA.path).not.toBe(activity.fragmentB.path);
      expect(activity.joined.path).not.toBe(activity.fragmentA.path);
    }
  });

  it('provides allele markings and reverses length-changing comparisons', () => {
    expect(geneAlleleMarking('wings', 1)).toBe(geneDnaRecord('wings').alleles[1]);
    expect(geneMutationTypeForComparison('legs', 0, 1)).toBe('insertion');
    expect(geneMutationTypeForComparison('legs', 1, 0)).toBe('deletion');
    expect(geneMutationTypeForComparison('tail', 1, 0)).toBe('insertion');
  });
});
