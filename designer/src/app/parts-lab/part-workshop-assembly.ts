import { AssemblyBlueprint, AssemblyPart, Vector3Data } from '@pbl/assembly/domain/assembly.models';
import { cloneAssemblyBlueprint } from '@pbl/assembly/domain/assembly-clone';
import {
  identityQuaternion,
  multiplyQuaternions,
  quaternionFromEuler,
} from '@pbl/assembly/domain/vector-data';
import {
  DesignerPartPlacementMap,
} from '../designer-dragon-draft.store';
import { AssemblyPartDefinition } from '../assembly-garage/data/assembly-part-definitions';
import { PartAnatomyLayer } from './part-anatomy-layers';
import { PartWorkshopDragonSpecies } from './part-workshop-context';

export type WorkshopPreviewMode = 'isolated' | 'assembly';
export type WorkshopGenePreviewMode = 'authored' | 'dominant' | 'recessive';
export type WorkshopHeadSexPreview = 'authored' | 'female' | 'male';

export const BACK_SPIKE_PLACEMENT_SUFFIX = '::back-spike-rows';

/** Finds every live assembly instance stamped from the selected catalog definition. */
export function matchingAssemblyPartIds(
  blueprint: AssemblyBlueprint,
  definition: AssemblyPartDefinition,
): string[] {
  const exact = blueprint.parts
    .filter(part => part.definitionId === definition.id)
    .map(part => part.id);
  if (exact.length) return exact;

  const profileId = definition.visualProfile?.profileId;
  if (!profileId) return [];
  return blueprint.parts
    .filter(part => part.visualProfile?.profileId === profileId)
    .map(part => part.id);
}

/** Applies non-destructive, context-specific placements to a fresh assembly clone. */
export function applyWorkshopPlacements(
  source: AssemblyBlueprint,
  placements: DesignerPartPlacementMap,
): AssemblyBlueprint {
  const blueprint = cloneAssemblyBlueprint(source);
  for (const [targetId, placement] of Object.entries(placements)) {
    if (targetId.endsWith(BACK_SPIKE_PLACEMENT_SUFFIX)) {
      const partId = targetId.slice(0, -BACK_SPIKE_PLACEMENT_SUFFIX.length);
      const part = blueprint.parts.find(candidate => candidate.id === partId);
      if (!part) continue;
      setVisualParameters(part, {
        backSpikeOffsetX: placement.offset.x / Math.max(part.dimensions.x, 0.001),
        backSpikeOffsetY: placement.offset.y / Math.max(part.dimensions.y, 0.001),
        backSpikeOffsetZ: placement.offset.z / Math.max(part.dimensions.z, 0.001),
        backSpikePitch: degreesToRadians(placement.rotationDegrees.x),
        backSpikeYaw: degreesToRadians(placement.rotationDegrees.y),
        backSpikeRoll: degreesToRadians(placement.rotationDegrees.z),
        backSpikePlacementScale: placement.scale,
      });
      continue;
    }

    const part = blueprint.parts.find(candidate => candidate.id === targetId);
    if (!part) continue;
    part.position = addVectors(part.position, placement.offset);
    part.rotation = multiplyQuaternions(
      part.rotation ?? identityQuaternion(),
      quaternionFromEuler({
        x: degreesToRadians(placement.rotationDegrees.x),
        y: degreesToRadians(placement.rotationDegrees.y),
        z: degreesToRadians(placement.rotationDegrees.z),
      }),
    );
    part.dimensions = scaleVector(part.dimensions, placement.scale);
  }
  return blueprint;
}

/**
 * Compares a selected layer's representative expressed forms without writing
 * back to the authoring draft. The values mirror the student phenotype builders.
 */
export function applyLayerGenePreview(
  source: AssemblyBlueprint,
  partIds: readonly string[],
  layer: PartAnatomyLayer | null,
  species: PartWorkshopDragonSpecies,
  mode: WorkshopGenePreviewMode,
): AssemblyBlueprint {
  const blueprint = cloneAssemblyBlueprint(source);
  if (mode === 'authored' || !layer?.geneIds.length) return blueprint;
  const dominant = mode === 'dominant';
  const selected = new Set(partIds);
  for (const part of blueprint.parts) {
    if (!selected.has(part.id)) continue;
    const values = expressionParameters(layer.geneIds, species, dominant);
    const permitted = new Set(layer.parameterKeys);
    setVisualParameters(part, Object.fromEntries(
      Object.entries(values).filter(([key]) => permitted.has(key)),
    ));

    // Whole-part genes are expressed by silhouette as well as profile values.
    if (layer.geneIds.includes('secondary-wings')) {
      part.dimensions = scaleVector(part.dimensions, dominant ? 1 : 0.18);
    }
  }
  return blueprint;
}

/**
 * Overrides only the rendered head form for comparison. The source blueprint
 * and genetics-owned authored value remain untouched.
 */
export function applyHeadSexPreview(
  source: AssemblyBlueprint,
  partIds: readonly string[],
  mode: WorkshopHeadSexPreview,
): AssemblyBlueprint {
  const blueprint = cloneAssemblyBlueprint(source);
  if (mode === 'authored') return blueprint;
  const selected = new Set(partIds);
  for (const part of blueprint.parts) {
    if (selected.has(part.id) && part.visualProfile?.profileId === 'dragon-head-horned') {
      setVisualParameters(part, { sex: mode });
    }
  }
  return blueprint;
}

function expressionParameters(
  geneIds: readonly string[],
  species: PartWorkshopDragonSpecies,
  dominant: boolean,
): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};
  const assign = (next: Record<string, string | number | boolean>): void => {
    Object.assign(values, next);
  };

  if (species === 'lab') {
    if (geneIds.includes('body-type')) assign({
      bodyArchetype: dominant ? 'courser' : 'prowler',
      bodyNeckWidth: dominant ? 0.82 : 1.18,
      bodyChestWidth: dominant ? 0.8 : 1.2,
      bodyChestHeight: dominant ? 1.25 : 0.78,
      bodyWaistWidth: dominant ? 0.76 : 1.16,
      bodyBellyDepth: dominant ? 0.78 : 1.22,
      bodyHipWidth: dominant ? 0.84 : 1.18,
      bodySpineArch: dominant ? 0.2 : -0.06,
      bodyTailRootWidth: dominant ? 0.78 : 1.2,
    });
    if (geneIds.includes('spikes')) assign({
      backSpikeCount: 8,
      backSpikeRows: dominant ? 3 : 1,
      backSpikeScale: 1.15,
    });
    if (geneIds.includes('armor')) assign({
      spikeHeight: 0.25 * (dominant ? 1.55 : 0.55),
      spikeRadius: 0.07 * (dominant ? 1.55 : 0.55),
      scalePattern: dominant ? 1 : 0,
    });
    if (geneIds.includes('fangs')) assign({ fangScale: dominant ? 1.48 : 0.48 });
    if (geneIds.includes('claws')) assign({ clawScale: dominant ? 1.45 : 0.55 });
    if (geneIds.includes('crest')) assign({ crestScale: dominant ? 1.35 : 0.55 });
    if (geneIds.includes('horns')) assign({
      hornLength: dominant ? 2.45 : 0.72,
      hornRadius: dominant ? 0.17 : 0.08,
    });
    if (geneIds.includes('wings')) assign({
      camber: dominant ? 0.24 : 0.025,
      fingerSag: dominant ? 0.25 : 0.06,
      dihedral: dominant ? 0.18 : 0.02,
      scallop: dominant ? 0.34 : 0.04,
    });
    if (geneIds.includes('tail')) assign({
      spikeCount: dominant ? 8 : 3,
      spikeLength: dominant ? 1.15 : 0.42,
      spikeRadius: dominant ? 0.24 : 0.1,
      tailClubSpikeCount: dominant ? 8 : 3,
      tailClubSpikeScale: dominant ? 1.25 : 0.58,
    });
    if (geneIds.includes('sex')) assign({ sex: dominant ? 'male' : 'female' });
    return values;
  }

  if (geneIds.includes('plumage')) assign({
    miniFeatherCoverage: dominant ? 1 : 0,
    miniFeatherLength: dominant ? 1.12 : 0.84,
    miniFeatherVolume: dominant ? 1.28 : 0.78,
  });
  if (geneIds.includes('coat')) assign({
    miniDorsalBumps: dominant ? 1 : 0,
    miniScaleSize: dominant ? 1.22 : 0.82,
  });
  if (geneIds.includes('frame')) assign(dominant
    ? {
        miniChestScale: 0.84, miniBellyScale: 0.72, miniHipScale: 0.8,
        miniWaistScale: 0.82, miniSpineArch: 0.2,
        miniNeckCurve: 0.48, miniNeckThickness: 0.78,
        miniSerpentSegmentScale: 1,
      }
    : {
        miniChestScale: 1.18, miniBellyScale: 1.42, miniHipScale: 1.22,
        miniWaistScale: 1.12, miniSpineArch: -0.04,
        miniNeckCurve: 0.04, miniNeckThickness: 1.3,
        miniSerpentSegmentScale: 0,
      });
  if (geneIds.includes('muzzle')) assign(dominant
    ? { miniSnoutLength: 1.08, miniMuzzleWidth: 0.82, miniMuzzleDepth: 0.82, miniToothCount: 4 }
    : { miniSnoutLength: 0.06, miniMuzzleWidth: 1.38, miniMuzzleDepth: 1.18, miniToothCount: 0 });
  if (geneIds.includes('wings')) assign({
    miniWingSpread: dominant ? 1 : 0.12,
    miniWingChord: dominant ? 1.4 : 0.62,
    miniWingSweep: dominant ? 0.32 : 0.04,
    miniWingScallop: dominant ? 0.24 : 0,
    miniWingCamber: dominant ? 0.18 : 0,
  });
  if (geneIds.includes('horns')) assign({
    miniHornCurl: dominant ? 1 : 0.05,
    miniHornLength: dominant ? 0.72 : 0.34,
    miniHornSpread: dominant ? 0.82 : 1.38,
    miniHornScale: dominant ? 1.18 : 0.62,
    miniNoseHornScale: dominant ? 1 : 0,
  });
  if (geneIds.includes('ears')) assign({
    miniEarScale: dominant ? 1.3 : 0.46,
    miniEarFold: dominant ? 0.02 : 0.96,
    miniEarRoundness: dominant ? 0.42 : 0.9,
  });
  if (geneIds.includes('eyes')) assign({
    miniEyeSize: dominant ? 0.82 : 0.38,
    miniEyeSpacing: dominant ? 1.12 : 0.86,
  });
  if (geneIds.includes('crest')) assign({
    miniCrestCrown: dominant ? 1 : 0,
    miniCrestFrill: dominant ? 1 : 0.35,
    miniCrestScale: dominant ? 1.28 : 0.62,
  });
  if (geneIds.includes('legs')) assign({
    miniLegThickness: dominant ? 1.18 : 0.7,
    miniPawScale: dominant ? 1.12 : 0.76,
    miniToeCount: dominant ? 5 : 3,
    miniToeSplay: dominant ? 1.28 : 0.72,
  });
  if (geneIds.includes('tail')) assign({
    miniTailTaper: dominant ? 1.28 : 0.8,
    miniTailCurve: dominant ? 0.22 : -0.08,
    miniTailStyle: dominant ? 3 : 0,
    miniTailTipScale: dominant ? 1.28 : 0.72,
    miniPlumeFan: dominant ? 1.2 : 0.35,
    miniForkTailScale: dominant ? 1 : 0,
  });
  if (geneIds.includes('pattern')) assign({ miniPatchScale: dominant ? 1.35 : 0.58 });
  for (const [geneId, key] of Object.entries(MINI_OPTIONAL_GENE_KEYS)) {
    if (geneIds.includes(geneId)) values[key] = dominant ? 1 : 0;
  }
  return values;
}

const MINI_OPTIONAL_GENE_KEYS: Readonly<Record<string, string>> = {
  brow: 'miniBrowScale',
  whiskers: 'miniWhiskerScale',
  chin: 'miniChinScale',
  dewlap: 'miniDewlapScale',
  ruff: 'miniRuffScale',
  shoulders: 'miniShoulderScale',
  belly: 'miniBellyScuteScale',
  'flank-fins': 'miniFlankFinScale',
  'hip-fins': 'miniHipFinScale',
  'tail-sail': 'miniTailSailScale',
};

function setVisualParameters(
  part: AssemblyPart,
  values: Record<string, string | number | boolean>,
): void {
  if (!part.visualProfile || !Object.keys(values).length) return;
  part.visualProfile = {
    ...part.visualProfile,
    parameters: { ...part.visualProfile.parameters, ...values },
  };
}

function addVectors(a: Vector3Data, b: Vector3Data): Vector3Data {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scaleVector(vector: Vector3Data, scale: number): Vector3Data {
  return { x: vector.x * scale, y: vector.y * scale, z: vector.z * scale };
}

function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}
