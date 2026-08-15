import { MINI_DRAGON_GENES, MiniGenome, miniGenomeFromForms } from './mini-dragon.genetics';
import { miniDragonSpecimenSource, miniDragonTraitReadouts } from './mini-dragon.specimen';

const GENOME: MiniGenome = miniGenomeFromForms({
  coat: 'coat:fluffy',
  horns: 'horns:curled',
  wings: 'wings:small',
  pattern: 'pattern:ash-gold',
  ember: 'ember:blue',
  size: 'size:standard',
});

describe('mini dragon specimen source', () => {
  it('describes the animal the anatomy builder produced', () => {
    const source = miniDragonSpecimenSource(GENOME, 'bench-mini-1', { label: 'Bench mini' });
    expect(source.kind).toBe('descriptor');
    if (source.kind !== 'descriptor') return;

    expect(source.descriptor.label).toBe('Bench mini');
    expect(source.descriptor.blueprint.parts.length).toBeGreaterThan(0);
    expect(source.descriptor.accentColor).toMatch(/^hsl\(/);
  });

  it('reads out every gene as its visible form', () => {
    const readouts = miniDragonTraitReadouts(GENOME, 'bench-mini-1');

    for (const gene of MINI_DRAGON_GENES) {
      const readout = readouts.find((entry) => entry.id === `mini:${gene.id}`);
      expect(readout).withContext(gene.id).toBeTruthy();
    }
    expect(readouts.find((entry) => entry.id === 'mini:wings')?.valueLabel).toBe('Small wings');
    expect(readouts.find((entry) => entry.id === 'mini:pattern')?.valueLabel)
      .toBe('Ash-and-gold coat');
  });

  it('names the inheritance pattern beside each gene, since that is what differs between them', () => {
    const readouts = miniDragonTraitReadouts(GENOME, 'bench-mini-1');
    expect(readouts.find((entry) => entry.id === 'mini:wings')?.detail)
      .toContain('Incomplete dominance');
    expect(readouts.find((entry) => entry.id === 'mini:pattern')?.detail).toContain('Codominance');
    expect(readouts.find((entry) => entry.id === 'mini:ember')?.detail)
      .toContain('Multiple alleles');
  });

  it('keeps the non-inherited features in the list and marks them as such', () => {
    const readouts = miniDragonTraitReadouts(GENOME, 'bench-mini-1');
    const features = readouts.filter((entry) => entry.id.startsWith('mini:feature-'));

    expect(features.length).toBe(5);
    for (const feature of features) {
      expect(feature.detail).withContext(feature.label).toContain('Not inherited');
    }
  });

  it('draws a different individual for a different id on the same genome', () => {
    const first = miniDragonTraitReadouts(GENOME, 'bench-mini-1');
    const second = miniDragonTraitReadouts(GENOME, 'bench-mini-7');
    const values = (readouts: typeof first) =>
      readouts.filter((entry) => entry.id.startsWith('mini:feature-')).map((e) => e.valueLabel);
    const genes = (readouts: typeof first) =>
      readouts.filter((entry) => !entry.id.startsWith('mini:feature-')).map((e) => e.valueLabel);

    expect(genes(second)).toEqual(genes(first));
    expect(values(second)).not.toEqual(values(first));
  });
});
