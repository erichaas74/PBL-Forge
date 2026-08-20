import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleVaultAllele,
  AlleleVaultGene,
  expressedAllelePairPhenotype,
  normalizeAlleleVaultGeneIds,
} from './allele-vault.models';
import { allelePairToExpressiveProfile } from './allele-phenotype-profile';

describe('allelePairToExpressiveProfile', () => {
  it('maps every released gene to the matching renderer trait', () => {
    expect(ALLELE_VAULT_GENES.length).toBe(13);
    expect(ALLELE_VAULT_GENES.map((gene) => gene.renderTraitId)).toEqual(
      ALLELE_VAULT_GENES.map((gene) => gene.id),
    );
    expect(
      ['Chr 1', 'Chr 2', 'Chr 3', 'Chr 4', 'Chr X'].map(
        (chromosome) => ALLELE_VAULT_GENES.filter((gene) => gene.chromosome === chromosome).length,
      ),
    ).toEqual([3, 3, 3, 3, 1]);
    expect(ALLELE_VAULT_GENES.every((gene) => /^#[0-9a-f]{6}$/i.test(gene.locusColor))).toBeTrue();
  });

  it('models the released X-linked eye locus on XX and XY specimens', () => {
    const gene = findGene('eye-color');
    const female = allelePairToExpressiveProfile(
      gene,
      [findAllele('eye-color-E'), findAllele('eye-color-e')],
      'female',
    );
    const male = allelePairToExpressiveProfile(
      gene,
      [findAllele('eye-color-e'), findAllele('eye-color-e')],
      'male',
    );

    expect(gene.chromosome).toBe('Chr X');
    expect(gene.inheritance).toBe('x-linked');
    expect(female?.genome['eye-color']).toEqual(['E', 'e']);
    expect(male?.genome['eye-color']).toEqual(['e', 'Y']);
  });

  it('adds the X-linked locus when restoring the former complete default catalog', () => {
    const formerDefault = ALLELE_VAULT_GENES.filter((gene) => gene.chromosome !== 'Chr X').map(
      (gene) => gene.id,
    );

    expect(normalizeAlleleVaultGeneIds(formerDefault)).toEqual(
      ALLELE_VAULT_GENES.map((gene) => gene.id),
    );
    expect(normalizeAlleleVaultGeneIds(['wings', 'fire'])).toEqual(['wings', 'fire']);
  });

  it('changes only the active locus on the controlled reference dragon', () => {
    const gene = findGene('wings');
    const profile = allelePairToExpressiveProfile(
      gene,
      [findAllele('wings-w'), findAllele('wings-w')],
      'female',
    );

    expect(profile?.genome.wings).toEqual(['w', 'w']);
    expect(profile?.genome.horns).toEqual(['H', 'h']);
    expect(profile?.sex).toBe('female');
  });

  it('supports male anatomy while normalizing the X-linked background', () => {
    const profile = allelePairToExpressiveProfile(
      findGene('horns'),
      [findAllele('horns-H'), findAllele('horns-h')],
      'male',
    );

    expect(profile?.sex).toBe('male');
    expect(profile?.genome['eye-color']).toEqual(['E', 'Y']);
  });

  it('returns no specimen until both alleles belong to the active gene', () => {
    const gene = findGene('fire');
    expect(allelePairToExpressiveProfile(gene, [findAllele('fire-F'), null], 'female')).toBeNull();
    expect(
      allelePairToExpressiveProfile(gene, [findAllele('fire-F'), findAllele('horns-h')], 'female'),
    ).toBeNull();
  });

  it('reports all three incomplete-dominance tail-club phenotypes', () => {
    const gene = findGene('tail');
    expect(phenotype(gene, 'tail-K', 'tail-K')).toBe('Large crown-spiked club');
    expect(phenotype(gene, 'tail-K', 'tail-k')).toBe('Intermediate five-spike club');
    expect(phenotype(gene, 'tail-k', 'tail-k')).toBe('Small smooth club');
  });
});

function findGene(id: AlleleVaultGene['id']): AlleleVaultGene {
  return ALLELE_VAULT_GENES.find((gene) => gene.id === id)!;
}

function findAllele(id: string): AlleleVaultAllele {
  return ALLELE_VAULT_ALLELES.find((allele) => allele.id === id)!;
}

function phenotype(gene: AlleleVaultGene, firstId: string, secondId: string): string {
  return expressedAllelePairPhenotype(gene, [findAllele(firstId), findAllele(secondId)]);
}
