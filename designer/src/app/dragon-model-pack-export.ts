import { cloneAssemblyBlueprint } from '@pbl/assembly/domain/assembly-clone';
import { AssemblyBlueprint } from '@pbl/assembly/domain/assembly.models';
import { DragonModelPackV1 } from '@pbl/assembly/model-pack/dragon-model-pack.models';
import { parseDragonModelPack } from '@pbl/assembly/model-pack/dragon-model-pack.validation';
import { DragonStyle } from '@pbl/assembly/rendering/dragon-procedural-mesh.factory';

export interface DragonModelPackExportOptions {
  modelId: string;
  label: string;
  description: string;
  packVersion: string;
  style?: DragonStyle;
}

/** Converts an editor state/blueprint into the only artifact PBL Forge accepts. */
export function createDragonModelPack(
  blueprint: AssemblyBlueprint,
  options: DragonModelPackExportOptions,
): DragonModelPackV1 {
  const publishedBlueprint = options.style
    ? applyDragonStyleToBlueprint(blueprint, options.style)
    : cloneAssemblyBlueprint(blueprint);

  return parseDragonModelPack({
    schemaVersion: 1,
    packId: 'pbl-forge-dragons',
    packVersion: options.packVersion,
    rendererContractVersion: 1,
    defaultModelId: options.modelId,
    models: [{
      id: options.modelId,
      label: options.label,
      description: options.description,
      blueprint: publishedBlueprint,
    }],
  });
}

/** Materializes designer-wide style defaults into serializable part parameters. */
export function applyDragonStyleToBlueprint(
  blueprint: AssemblyBlueprint,
  style: DragonStyle,
): AssemblyBlueprint {
  const clone = cloneAssemblyBlueprint(blueprint);
  clone.parts = clone.parts.map(part => {
    const profileId = part.visualProfile?.profileId ?? '';
    if (!part.visualProfile) return part;

    let authored: Record<string, number> | null = null;
    if (profileId === 'dragon-body') authored = { ...style.body };
    else if (profileId.startsWith('dragon-head-')) authored = { ...style.head };
    else if (profileId === 'dragon-upper-jaw' || profileId === 'dragon-lower-jaw') {
      authored = { ...style.jaw };
    } else if (profileId === 'dragon-foot') authored = { ...style.foot };
    else if (profileId === 'dragon-wing' || profileId === 'dragon-secondary-wing') {
      authored = { ...style.wing };
    } else if (profileId === 'dragon-tail-club') authored = { ...style.tailClub };
    if (!authored) return part;

    return {
      ...part,
      visualProfile: {
        ...part.visualProfile,
        parameters: { ...authored, ...(part.visualProfile.parameters ?? {}) },
      },
    };
  });
  return clone;
}

export function downloadDragonModelPack(pack: DragonModelPackV1): void {
  const documentRef = globalThis.document;
  if (!documentRef) throw new Error('Model-pack download requires a browser document.');

  const blob = new Blob([`${JSON.stringify(pack, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = documentRef.createElement('a');
  link.href = url;
  link.download = 'dragon-model-pack.v1.json';
  link.click();
  URL.revokeObjectURL(url);
}
