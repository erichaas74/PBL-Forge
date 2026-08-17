import { StageTheme } from '../../../shared/assembly/rendering/scene-environment';
import { dragonParentSource } from '../simulation/domain/dragon-specimen.profile';
import { DragonParentProfile } from '../simulation/domain/dragon-lab.models';

/** The single visual identity used by both Wise Dragon surfaces. */
export const WISE_DRAGON_PROFILE: DragonParentProfile = {
  id: 'wise-dragon-sage',
  name: 'Wise Dragon Sage',
  title: 'Keeper of the Gene Records',
  color: '#655d50',
  accentColor: '#b28a4b',
  genome: {
    wings: ['W', 'W'],
    fire: ['F', 'f'],
    scales: ['S', 'S'],
    horns: ['H', 'H'],
  },
};

export const WISE_DRAGON_SOURCE = dragonParentSource(WISE_DRAGON_PROFILE);

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
