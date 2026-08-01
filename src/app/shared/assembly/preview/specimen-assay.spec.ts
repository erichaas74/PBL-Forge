import { AssemblyBlueprint, AssemblyPart, AssemblyPartRole } from '../domain/assembly.models';
import { AssemblyCombatProfile, createDefaultCombatProfile } from '../combat/assembly-combat.models';
import { ASSEMBLY_CONTACT_ABILITIES } from '../combat/assembly-abilities';
import {
  DEFAULT_FITNESS_CALIBRATION,
  assaySpecimen,
  compareSpecimenFitness,
} from './specimen-assay';

function part(id: string, roles: AssemblyPartRole[], mass = 1): AssemblyPart {
  return {
    id,
    roles,
    shape: 'box',
    mass,
    dimensions: { x: 1, y: 1, z: 1 },
    position: { x: 0, y: 1, z: 0 },
    color: '#556677',
  };
}

function blueprint(parts: AssemblyPart[]): AssemblyBlueprint {
  return { parts, joints: [] };
}

const FULL = blueprint([
  part('body', ['core'], 4),
  part('jaw', ['jaw']),
  part('wing-l', ['wing']),
  part('wing-r', ['wing']),
  part('tail', ['tail']),
]);

const WINGLESS = blueprint([
  part('body', ['core'], 4),
  part('jaw', ['jaw']),
  part('tail', ['tail']),
]);

function profileFor(source: AssemblyBlueprint): AssemblyCombatProfile {
  return createDefaultCombatProfile(source);
}

describe('assaySpecimen — offense', () => {
  it('reports a move for every part role that can attack', () => {
    const assay = assaySpecimen(FULL, profileFor(FULL));
    const available = assay.offense.availableAbilities.map(ability => ability.ability);

    expect(available).toContain('bite');
    expect(available).toContain('wing-buffet');
    expect(available).toContain('tail-sweep');
  });

  it('still lists moves the creation cannot do, so absence is visible', () => {
    const assay = assaySpecimen(WINGLESS, profileFor(WINGLESS));
    const buffet = assay.offense.abilities.find(a => a.ability === 'wing-buffet');

    expect(buffet).toBeTruthy();
    expect(buffet?.available).toBe(false);
    expect(buffet?.requiredRole).toBe('wing');
    expect(buffet?.damagePerSecond).toBe(0);
  });

  it('gates fire breath on the genotype rather than on any part', () => {
    const without = assaySpecimen(FULL, profileFor(FULL), { fireBreathing: false });
    const with_ = assaySpecimen(FULL, profileFor(FULL), { fireBreathing: true });

    expect(without.offense.abilities.find(a => a.ability === 'fire-breath')?.available).toBe(false);
    expect(with_.offense.abilities.find(a => a.ability === 'fire-breath')?.available).toBe(true);
    expect(with_.offense.moveCount).toBe(without.offense.moveCount + 1);
  });

  it('quotes the arena tuning rather than a private copy of it', () => {
    const assay = assaySpecimen(FULL, null);
    const bite = assay.offense.abilities.find(a => a.ability === 'bite');
    const arenaBite = ASSEMBLY_CONTACT_ABILITIES.find(a => a.ability === 'bite');

    expect(bite?.damagePerHit).toBe(arenaBite!.baseDamage);
    expect(bite?.cooldownSeconds).toBe(arenaBite!.cooldownSeconds);
  });

  it('applies the part damage multiplier where the ability uses one', () => {
    const profile = profileFor(FULL);
    profile.parts['jaw'].damageMultiplier = 2;

    const assay = assaySpecimen(FULL, profile);
    const bite = assay.offense.abilities.find(a => a.ability === 'bite');
    const buffet = assay.offense.abilities.find(a => a.ability === 'wing-buffet');

    expect(bite?.damagePerHit).toBe(18);
    // Wing buffet does not scale with the multiplier, so it must be unmoved.
    expect(buffet?.damagePerHit).toBe(6);
  });

  it('converts damage and cooldown into a comparable per-second figure', () => {
    const assay = assaySpecimen(FULL, null);
    const tail = assay.offense.abilities.find(a => a.ability === 'tail-sweep');

    expect(tail?.damagePerSecond).toBeCloseTo(7 / 1.1, 2);
  });
});

describe('assaySpecimen — defense', () => {
  it('adds up the health of every part', () => {
    const profile = profileFor(FULL);
    const expected = Object.values(profile.parts).reduce((sum, p) => sum + p.maxHealth, 0);

    expect(assaySpecimen(FULL, profile).defense.totalHealth).toBe(expected);
  });

  it('identifies the core, whose loss ends the fight', () => {
    const assay = assaySpecimen(FULL, profileFor(FULL));

    expect(assay.defense.corePartId).toBe('body');
    expect(assay.defense.corePartHealth).toBeGreaterThan(0);
  });

  it('groups defence by role, heaviest first', () => {
    const assay = assaySpecimen(FULL, profileFor(FULL));
    const roles = assay.defense.byRole.map(group => group.role);

    expect(roles).toContain('wing');
    const wings = assay.defense.byRole.find(group => group.role === 'wing');
    expect(wings?.partCount).toBe(2);

    const health = assay.defense.byRole.map(group => group.totalHealth);
    expect([...health].sort((a, b) => b - a)).toEqual(health);
  });

  it('reports armoured parts and how much health sits behind armour', () => {
    const armored = blueprint([part('body', ['core'], 4), part('plate', ['armor'])]);
    const assay = assaySpecimen(armored, profileFor(armored));

    expect(assay.defense.armoredPartIds).toEqual(['plate']);
    expect(assay.defense.armoredHealthFraction).toBeGreaterThan(0);
    expect(assay.defense.armoredHealthFraction).toBeLessThan(1);
  });

  it('handles a creation with no combat profile at all', () => {
    const assay = assaySpecimen(FULL, null);

    expect(assay.defense.totalHealth).toBe(0);
    expect(assay.fitness.overall).toBeGreaterThanOrEqual(0);
  });
});

describe('assaySpecimen — fitness', () => {
  it('shows every component with its weight, so the score can be checked', () => {
    const assay = assaySpecimen(FULL, profileFor(FULL));
    const ids = assay.fitness.components.map(component => component.id);

    expect(ids).toEqual(['offense', 'durability', 'protection', 'versatility']);
    for (const component of assay.fitness.components) {
      expect(component.weight).toBeGreaterThan(0);
      expect(component.measured).toBeTruthy();
    }
  });

  it('is the weighted mean of its own components', () => {
    const assay = assaySpecimen(FULL, profileFor(FULL));
    const totalWeight = assay.fitness.components.reduce((sum, c) => sum + c.weight, 0);
    const expected = assay.fitness.components
      .reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;

    expect(assay.fitness.overall).toBe(Math.round(expected * 100));
  });

  it('never saturates, so a stronger build always scores higher', () => {
    const assay = assaySpecimen(FULL, profileFor(FULL));

    for (const component of assay.fitness.components) {
      expect(component.score).toBeLessThan(1);
      expect(component.score).toBeGreaterThanOrEqual(0);
    }
    expect(assay.fitness.overall).toBeLessThan(100);
  });

  it('scores a build with fewer moves lower on versatility', () => {
    const full = assaySpecimen(FULL, profileFor(FULL)).fitness;
    const wingless = assaySpecimen(WINGLESS, profileFor(WINGLESS)).fitness;

    const versatility = (report: typeof full) =>
      report.components.find(c => c.id === 'versatility')!.score;

    expect(versatility(wingless)).toBeLessThan(versatility(full));
    expect(wingless.overall).toBeLessThan(full.overall);
  });

  it('scores protection from core armour, not the all-part mean', () => {
    const profile = profileFor(FULL);
    profile.parts['body'].armor = 0.28;

    const armored = assaySpecimen(FULL, profile).fitness;
    const plain = assaySpecimen(FULL, profileFor(FULL)).fitness;
    const protection = (report: typeof plain) =>
      report.components.find(c => c.id === 'protection')!.score;

    // Averaged across five parts this armour would read as ~0.056 and barely
    // move the score; taken on the core it is the 0.28 that actually matters.
    expect(protection(armored)).toBeGreaterThan(0.6);
    expect(protection(plain)).toBe(0);
  });

  it('is calibrated so a mid-range build lands near the middle of the scale', () => {
    const calibration = DEFAULT_FITNESS_CALIBRATION;

    // Pins the half-saturation points against the measured classic dragon
    // range: damage 8.6-11.5/s, health 715-1365, core armour 0-0.28.
    expect(calibration.halfDamagePerSecond).toBeGreaterThan(8.6);
    expect(calibration.halfDamagePerSecond).toBeLessThan(11.5);
    expect(calibration.halfTotalHealth).toBeGreaterThan(715);
    expect(calibration.halfTotalHealth).toBeLessThan(1365);
    expect(calibration.halfArmor).toBeGreaterThan(0);
    expect(calibration.halfArmor).toBeLessThan(0.28);
  });
});

describe('compareSpecimenFitness', () => {
  it('reports the per-component difference against a baseline', () => {
    const subject = assaySpecimen(FULL, profileFor(FULL)).fitness;
    const baseline = assaySpecimen(WINGLESS, profileFor(WINGLESS)).fitness;

    const deltas = compareSpecimenFitness(subject, baseline);
    const versatility = deltas.find(delta => delta.componentId === 'versatility');

    expect(deltas.length).toBe(subject.components.length);
    expect(versatility?.difference).toBeGreaterThan(0);
  });

  it('reports zero difference against itself', () => {
    const report = assaySpecimen(FULL, profileFor(FULL)).fitness;

    for (const delta of compareSpecimenFitness(report, report)) {
      expect(delta.difference).toBe(0);
    }
  });
});
