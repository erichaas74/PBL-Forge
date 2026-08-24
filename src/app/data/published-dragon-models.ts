import dragonModelPackJson from '../../../model-packs/dragon-model-pack.v1.json';
import { cloneAssemblyBlueprint } from '../shared/assembly/domain/assembly-clone';
import { AssemblyPreset } from '../shared/assembly/domain/assembly.models';
import { parseDragonModelPack } from '../shared/assembly/model-pack/dragon-model-pack.validation';

/** Build-time, committed output of Dragon Designer. No runtime fetch or database is involved. */
export const PUBLISHED_DRAGON_MODEL_PACK = parseDragonModelPack(dragonModelPackJson);
let activeDragonModelPack = PUBLISHED_DRAGON_MODEL_PACK;

const defaultModel = PUBLISHED_DRAGON_MODEL_PACK.models.find(
  model => model.id === PUBLISHED_DRAGON_MODEL_PACK.defaultModelId,
);

if (!defaultModel) {
  throw new Error('The published DragonModelPack has no default model.');
}

export const PUBLISHED_CLASSIC_DRAGON_PRESET: AssemblyPreset = {
  id: defaultModel.id,
  name: defaultModel.label,
  description: defaultModel.description,
  state: cloneAssemblyBlueprint(defaultModel.blueprint),
};

export function publishedDragonBlueprint(modelId = activeDragonModelPack.defaultModelId) {
  const model = activeDragonModelPack.models.find(candidate => candidate.id === modelId);
  if (!model) throw new Error(`Published dragon model "${modelId}" does not exist.`);
  return cloneAssemblyBlueprint(model.blueprint);
}

/** Replaces the runtime default after a validated Firebase publication is loaded. */
export function installPublishedDragonModelPack(input: unknown): void {
  const pack = parseDragonModelPack(input);
  const model = pack.models.find(candidate => candidate.id === pack.defaultModelId);
  if (!model) throw new Error('The Firebase DragonModelPack has no default model.');
  PUBLISHED_CLASSIC_DRAGON_PRESET.id = model.id;
  PUBLISHED_CLASSIC_DRAGON_PRESET.name = model.label;
  PUBLISHED_CLASSIC_DRAGON_PRESET.description = model.description;
  PUBLISHED_CLASSIC_DRAGON_PRESET.state = cloneAssemblyBlueprint(model.blueprint);
  activeDragonModelPack = pack;
}
