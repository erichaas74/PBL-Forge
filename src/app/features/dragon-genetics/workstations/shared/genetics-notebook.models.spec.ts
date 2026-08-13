import { ALLELE_VAULT_ALLELES, ALLELE_VAULT_GENES } from '../allele-workbench/allele-vault.models';
import {
  completedExperimentCount,
  createEmptyGeneticsNotebook,
  evaluateDiscoveryClaim,
  recordAlleleExperiment,
} from './genetics-notebook.models';

describe('student genetics notebook', () => {
  const wings = ALLELE_VAULT_GENES.find((gene) => gene.id === 'wings')!;

  it('records the three unique genotype combinations regardless of test order', () => {
    let notebook = createEmptyGeneticsNotebook('student-1');
    notebook = recordAlleleExperiment(
      notebook,
      wings,
      ALLELE_VAULT_ALLELES,
      ['wings-w', 'wings-W'],
      'Winged',
    );
    notebook = recordAlleleExperiment(
      notebook,
      wings,
      ALLELE_VAULT_ALLELES,
      ['wings-w', 'wings-w'],
      'Wingless',
    );
    notebook = recordAlleleExperiment(
      notebook,
      wings,
      ALLELE_VAULT_ALLELES,
      ['wings-W', 'wings-W'],
      'Winged',
    );
    notebook = recordAlleleExperiment(
      notebook,
      wings,
      ALLELE_VAULT_ALLELES,
      ['wings-W', 'wings-w'],
      'Winged',
    );

    expect(completedExperimentCount(notebook, wings)).toBe(3);
    expect(notebook.experiments.length).toBe(3);
  });

  it('does not verify a claim until every genotype combination has evidence', () => {
    const notebook = recordAlleleExperiment(
      createEmptyGeneticsNotebook('student-1'),
      wings,
      ALLELE_VAULT_ALLELES,
      ['wings-W', 'wings-w'],
      'Winged',
    );
    const result = evaluateDiscoveryClaim(
      notebook,
      wings,
      ALLELE_VAULT_ALLELES,
      'wings',
      'wings-W',
      'wings-w',
    );

    expect(result.status).toBe('incomplete-evidence');
    expect(result.notebook.discoveries['wings']).toBeUndefined();
  });

  it('verifies the trait and dominance claim supported by all combinations', () => {
    let notebook = createEmptyGeneticsNotebook('student-1');
    for (const [pair, phenotype] of [
      [['wings-W', 'wings-W'], 'Winged'],
      [['wings-W', 'wings-w'], 'Winged'],
      [['wings-w', 'wings-w'], 'Wingless'],
    ] as const) {
      notebook = recordAlleleExperiment(notebook, wings, ALLELE_VAULT_ALLELES, pair, phenotype);
    }

    const incorrect = evaluateDiscoveryClaim(
      notebook,
      wings,
      ALLELE_VAULT_ALLELES,
      'fire',
      'wings-W',
      'wings-w',
    );
    const solved = evaluateDiscoveryClaim(
      notebook,
      wings,
      ALLELE_VAULT_ALLELES,
      'wings',
      'wings-W',
      'wings-w',
    );

    expect(incorrect.status).toBe('incorrect');
    expect(solved.status).toBe('solved');
    expect(solved.notebook.discoveries['wings'].dominantAlleleId).toBe('wings-W');
  });
});
