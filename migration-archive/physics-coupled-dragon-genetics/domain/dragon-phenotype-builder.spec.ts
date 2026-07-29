import { CLASSIC_DRAGON_TEST_PRESET } from '../../../assembly-garage/data/presets/classic-dragon-test';
import {
  breedDragonGenomes,
  createFounderDragonGenome,
  generateDragonAssembly,
} from './dragon-phenotype-builder';

describe('dragon phenotype builder', () => {
  it('breeds deterministically from the same parents and seed', () => {
    const mother = createFounderDragonGenome('mother', { 'wing-span': 0.9 });
    const father = createFounderDragonGenome('father', { 'jaw-strength': 0.8 });
    const first = breedDragonGenomes(mother, father, 'offspring', 'classroom-seed');
    const second = breedDragonGenomes(mother, father, 'offspring', 'classroom-seed');
    expect(first).toEqual(second);
    expect(first.parentGenomeIds).toEqual(['mother', 'father']);
  });

  it('generates a battle-ready blueprint with semantic roles and a core', () => {
    const genome = createFounderDragonGenome('dragon');
    const generated = generateDragonAssembly(CLASSIC_DRAGON_TEST_PRESET.state, genome);
    expect(generated.blueprint.parts.length).toBeGreaterThan(4);
    expect(generated.blueprint.parts.some(part => part.roles?.includes('wing'))).toBeTrue();
    expect(generated.combatProfile.corePartId).toBeTruthy();
    expect(generated.combatProfile.abilityIds).toContain('bite');
  });
});
