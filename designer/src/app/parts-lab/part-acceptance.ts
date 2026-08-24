import { AssemblyPartDefinition } from '../assembly-garage/data/assembly-part-definitions';
import { dragonParametersForProfile } from '@pbl/assembly/model-pack/dragon-visual-parameter-registry';

export interface PartAcceptanceCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface PartAcceptanceReport {
  schemaVersion: 1;
  definitionId: string;
  profileId: string;
  generatedAtIso: string;
  checks: PartAcceptanceCheck[];
  passed: boolean;
}

export function buildPartAcceptanceReport(definition: AssemblyPartDefinition): PartAcceptanceReport {
  const profileId = definition.visualProfile?.profileId ?? '';
  const parameters = definition.visualProfile?.parameters ?? {};
  const registry = dragonParametersForProfile(profileId);
  const half = {
    x: definition.dimensions.x / 2,
    y: definition.dimensions.y / 2,
    z: definition.dimensions.z / 2,
  };
  const checks: PartAcceptanceCheck[] = [
    check('dimensions', 'Positive collider dimensions',
      Object.values(definition.dimensions).every(value => Number.isFinite(value) && value > 0),
      `${definition.dimensions.x} × ${definition.dimensions.y} × ${definition.dimensions.z}`),
    check('mass', 'Positive finite mass', Number.isFinite(definition.mass) && definition.mass > 0,
      `${definition.mass} kg`),
    check('profile', 'Registered procedural profile',
      definition.visualProfile?.meshType !== 'procedural' || registry.length > 0,
      profileId || definition.shape),
    check('sockets', 'Sockets stay near collider', (definition.snapPoints ?? []).every(socket =>
      Math.abs(socket.localPosition.x) <= half.x * 1.75
      && Math.abs(socket.localPosition.y) <= half.y * 1.75
      && Math.abs(socket.localPosition.z) <= half.z * 1.75),
      `${definition.snapPoints?.length ?? 0} socket(s)`),
    check('socket-ids', 'Socket IDs are unique',
      new Set((definition.snapPoints ?? []).map(socket => socket.id)).size === (definition.snapPoints?.length ?? 0),
      'Duplicate IDs make mating ambiguous.'),
    check('parameters', 'Parameters are registered and within authoring ranges',
      Object.entries(parameters).every(([key, value]) => {
        const metadata = registry.find(item => item.key === key);
        if (!metadata || typeof value !== metadata.type) return false;
        return typeof value !== 'number'
          || ((metadata.min === undefined || value >= metadata.min)
            && (metadata.max === undefined || value <= metadata.max));
      }), `${Object.keys(parameters).length} persisted parameter(s)`),
  ];
  return {
    schemaVersion: 1,
    definitionId: definition.id,
    profileId,
    generatedAtIso: new Date().toISOString(),
    checks,
    passed: checks.every(item => item.passed),
  };
}

function check(id: string, label: string, passed: boolean, detail: string): PartAcceptanceCheck {
  return { id, label, passed, detail };
}

export function partGroup(definition: AssemblyPartDefinition): string {
  const profile = definition.visualProfile?.profileId ?? definition.shape;
  if (profile.includes('body') || profile.includes('neck')) return 'Body';
  if (profile.includes('head') || profile.includes('jaw')) return 'Head & jaw';
  if (profile.includes('wing')) return 'Wings';
  if (profile.includes('leg') || profile.includes('foot') || profile.includes('grasp') || profile.includes('claw')) return 'Limbs';
  if (profile.includes('tail')) return 'Tail';
  return 'Other';
}
