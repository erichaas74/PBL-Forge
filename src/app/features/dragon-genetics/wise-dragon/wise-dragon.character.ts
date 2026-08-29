import { StageTheme } from '../../../shared/assembly/rendering/scene-environment';
import { createDragonBenchBuild } from '../simulation/domain/dragon-specimen.profile';
import { DragonParentProfile } from '../simulation/domain/dragon-lab.models';

/** The single visual identity used by both Wise Dragon surfaces. */
export const WISE_DRAGON_PROFILE: DragonParentProfile = {
  id: 'wise-dragon-sage',
  name: 'Wise Dragon Sage',
  title: 'Keeper of the Gene Records',
  color: '#344c52',
  accentColor: '#c59b4b',
  genome: {
    wings: ['W', 'W'],
    fire: ['F', 'f'],
    scales: ['S', 'S'],
    horns: ['H', 'H'],
    legs: ['L', 'l'],
    claws: ['C', 'c'],
    crest: ['R', 'r'],
    spikes: ['P', 'p'],
    tail: ['K', 'k'],
    'body-color': ['B', 'b'],
    fangs: ['g', 'g'],
    'eye-color': ['e', 'e'],
    'body-type': ['D', 'D'],
    'secondary-wings': ['q', 'q'],
    'wing-shape': ['A', 'A'],
    'wing-camber': ['V', 'v'],
    'body-size': ['Z', 'Z'],
    'tail-length': ['T', 'T'],
    'head-size': ['J', 'J'],
    snout: ['u', 'u'],
    armor: ['M', 'M'],
    'ear-frill': ['I', 'I'],
    temperament: ['x', 'x'],
  },
};

export const WISE_DRAGON_SOURCE = buildWiseDragonSource();

function buildWiseDragonSource() {
  const source = createDragonBenchBuild(WISE_DRAGON_PROFILE.id, WISE_DRAGON_PROFILE.genome, {
    label: WISE_DRAGON_PROFILE.name,
    generation: 12,
    identity: { color: WISE_DRAGON_PROFILE.color, accentColor: WISE_DRAGON_PROFILE.accentColor },
  }).source;
  if (source.kind !== 'descriptor') return source;

  source.descriptor.blueprint.parts = source.descriptor.blueprint.parts.map((part) => {
    const profileId = part.visualProfile?.profileId ?? '';
    if (!part.visualProfile) return part;
    const parameters = { ...(part.visualProfile.parameters ?? {}) };
    if (profileId === 'dragon-head-horned') {
      Object.assign(parameters, {
        wiseAvatar: true,
        eyeColor: '#69e3d2',
        cranium: 1.32,
        browRidge: 0.34,
        cheek: 1.2,
        eyeAxial: 0.02,
        hornLength: 2.3,
        hornRadius: 0.14,
        browLength: 0.68,
        crestScale: 1.38,
        sex: 'male',
      });
    } else if (profileId === 'dragon-body') {
      Object.assign(parameters, {
        bodyArchetype: 'regal',
        backSpikeCount: 12,
        backSpikeRows: 3,
        backSpikeScale: 1.22,
      });
    } else if (profileId === 'dragon-wing') {
      Object.assign(parameters, { camber: 0.2, fingerSag: 0.18, scallop: 0.3 });
    } else if (profileId === 'dragon-upper-jaw' || profileId === 'dragon-lower-jaw') {
      Object.assign(parameters, { fangScale: 0.62, toothCount: 6, toothHeight: 0.92 });
    }
    return { ...part, visualProfile: { ...part.visualProfile, parameters } };
  });
  return source;
}

export const WISE_DRAGON_STAGE_THEME: StageTheme = {
  skyTop: '#151b1b',
  skyBottom: '#352b21',
  fogColor: '#241f1a',
  hemisphereSky: '#7d8790',
  hemisphereGround: '#3a291c',
  keyColor: '#ffd692',
  keyIntensity: 1.85,
  fillColor: '#7791a1',
  fillIntensity: 0.38,
  rimColor: '#d69b55',
  rimIntensity: 0.78,
  environmentIntensity: 0.18,
};
