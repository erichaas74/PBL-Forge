import { DRAGON_CONCEPTS, assertValidConceptRegistry, dragonConcept } from './concept.registry';
import { DRAGON_INQUIRY_BANK, assertValidInquiryBank, uncoveredConcepts } from './inquiry-bank';
import {
  INSTRUMENT_MANIFESTS,
  assertValidInstrumentRegistry,
  instrumentManifest,
  instrumentsWithProbe,
  supportsGuidedMode,
} from './instrument.registry';
import { CONCEPT_IDS } from './inquiry.models';
import { INSTRUCTION_LEVELS, InstructionLevel } from '../adaptive/dragon-simulation.models';

describe('inquiry registries', () => {
  it('validates the concept graph, instrument manifests, and bank', () => {
    expect(() => assertValidConceptRegistry()).not.toThrow();
    expect(() => assertValidInstrumentRegistry()).not.toThrow();
    expect(() => assertValidInquiryBank()).not.toThrow();
  });

  it('gives every concept id a record', () => {
    for (const id of CONCEPT_IDS) {
      expect(dragonConcept(id), id).not.toBeNull();
    }
  });

  it('covers all eight mastery skills', () => {
    const skills = new Set(DRAGON_CONCEPTS.map((concept) => concept.skillId));
    expect([...skills].sort()).toEqual([
      'GEN-1',
      'GEN-2',
      'GEN-3',
      'GEN-4',
      'GEN-5',
      'GEN-6',
      'GEN-7',
      'GEN-8',
    ]);
  });

  it('has at least one authored item for every concept at every band it declares', () => {
    for (const level of INSTRUCTION_LEVELS) {
      expect(uncoveredConcepts(level), level).toEqual([]);
    }
  });

  it('gives every instrument eligible items at every level', () => {
    // The old registry held exactly one authored question per (simulation, level) and padded the
    // rest with generated filler. Every instrument must now stand on authored content alone.
    for (const manifest of INSTRUMENT_MANIFESTS) {
      const probes = new Set<string>(manifest.probes.map((probe) => probe.id));
      for (const level of INSTRUCTION_LEVELS as readonly InstructionLevel[]) {
        const eligible = DRAGON_INQUIRY_BANK.filter(
          (item) => probes.has(item.requiresProbe) && item.gradeBands.includes(level),
        );
        expect(eligible.length, `${manifest.id} at ${level}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('addresses the six workstations the simulation registry could not reach', () => {
    // Pedigree, blood, protein rescue, candling, companion show, and island diversity had no
    // `DragonSimulationId`, so no question could target them at all.
    for (const id of [
      'pedigree-lab',
      'blood-type-lab',
      'protein-rescue',
      'candling-workstation',
      'companion-show',
      'island-diversity',
    ]) {
      const manifest = instrumentManifest(id);
      expect(manifest, id).not.toBeNull();
      const probes = new Set<string>(manifest!.probes.map((probe) => probe.id));
      expect(DRAGON_INQUIRY_BANK.some((item) => probes.has(item.requiresProbe)), id).toBe(true);
    }
  });

  it('resolves the diversity-manager alias to the island diversity instrument', () => {
    expect(instrumentManifest('diversity-manager')?.id).toBe('island-diversity');
  });

  it('keeps every bank probe declared by at least one instrument', () => {
    for (const item of DRAGON_INQUIRY_BANK) {
      expect(instrumentsWithProbe(item.requiresProbe).length, `${item.id} → ${item.requiresProbe}`).toBeGreaterThan(0);
    }
  });

  it('lets a portable concept run in more than one instrument', () => {
    // The point of binding to a probe rather than a workstation id.
    const hosts = instrumentsWithProbe('gene.to.trait');
    expect(hosts.length).toBeGreaterThan(1);
  });

  it('allows guided mode only where a workstation opts in', () => {
    expect(supportsGuidedMode('dragon-hatchery')).toBe(true);
    for (const manifest of INSTRUMENT_MANIFESTS) {
      if (manifest.id === 'dragon-hatchery') continue;
      expect(supportsGuidedMode(manifest.id), manifest.id).toBe(false);
    }
  });

  it('keeps item bands inside their concept bands', () => {
    for (const item of DRAGON_INQUIRY_BANK) {
      const concept = dragonConcept(item.conceptId)!;
      for (const band of item.gradeBands) {
        expect(concept.gradeBands, `${item.id} at ${band}`).toContain(band);
      }
    }
  });

  it('never lists a concept as its own prerequisite', () => {
    for (const concept of DRAGON_CONCEPTS) {
      expect(concept.prerequisites).not.toContain(concept.id);
    }
  });

  it('has no prerequisite cycles', () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const walk = (id: string): void => {
      if (done.has(id)) return;
      expect(visiting.has(id), `cycle at ${id}`).toBe(false);
      visiting.add(id);
      for (const prerequisite of dragonConcept(id)?.prerequisites ?? []) walk(prerequisite);
      visiting.delete(id);
      done.add(id);
    };
    for (const concept of DRAGON_CONCEPTS) walk(concept.id);
  });
});
