import { createEmptyInvestigationRecord } from '../workstations/pedigree-lab/pedigree-lab.models';
import { archiveDragon } from '../workstations/pedigree-lab/pedigree-population';
import { resolvePedigreeAdventureCheckpoints } from './pedigree-adventure-checkpoint.adapter';

describe('pedigree adventure checkpoint adapter', () => {
  it('derives the Frost archive checkpoints from saved scientific records', () => {
    const arkon = archiveDragon('arkon')!;
    const state = resolvePedigreeAdventureCheckpoints('pedigree-reading', {
      ...createEmptyInvestigationRecord(),
      model: 'autosomal-recessive',
      modelHistory: ['autosomal-recessive'],
      carrierNotes: [{
        dragonId: 'hesper',
        status: 'carrier',
        note: 'Her affected father forces one hidden copy.',
        updatedAtIso: '2026-08-24T00:00:00.000Z',
      }],
      dnaTests: [{
        dragonId: arkon.id,
        geneId: 'scales',
        alleles: arkon.genome.scales,
        testedAtIso: '2026-08-24T00:00:00.000Z',
      }],
      hypothesis: 'The allele remains hidden in living descendants as a recessive copy.',
    });

    expect(state.cleanModel).toBe(true);
    expect(state.completedCheckpointIds).toEqual([
      'model-selected',
      'carrier-supported',
      'sequence-recorded',
      'verdict-written',
    ]);
  });

  it('requires a real model comparison and a contradiction-free Stonewake model', () => {
    const first = resolvePedigreeAdventureCheckpoints('pedigree-models', {
      ...createEmptyInvestigationRecord(),
      model: 'autosomal-recessive',
      modelHistory: ['autosomal-recessive'],
    });
    expect(first.cleanModel).toBe(false);
    expect(first.completedCheckpointIds).not.toContain('models-compared');
    expect(first.completedCheckpointIds).not.toContain('contradictions-resolved');

    const resolved = resolvePedigreeAdventureCheckpoints('pedigree-models', {
      ...createEmptyInvestigationRecord(),
      model: 'incomplete-dominance',
      modelHistory: ['autosomal-recessive', 'incomplete-dominance'],
    });
    expect(resolved.cleanModel).toBe(true);
    expect(resolved.completedCheckpointIds).toContain('models-compared');
    expect(resolved.completedCheckpointIds).toContain('contradictions-resolved');
  });
});
