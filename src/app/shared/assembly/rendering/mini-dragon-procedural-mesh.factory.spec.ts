import { createDragonProceduralObject } from './dragon-procedural-mesh.factory';
import { named, part } from './mini-dragon-mesh.spec-helpers';
import {
  MINI_DRAGON_PROFILE_IDS,
  createMiniDragonProceduralObject,
  isMiniDragonProfileId,
} from './mini-dragon-procedural-mesh.factory';

describe('mini dragon procedural mesh factory', () => {
  it('builds an object for every profile it claims', () => {
    for (const profileId of MINI_DRAGON_PROFILE_IDS) {
      expect(createMiniDragonProceduralObject(part(profileId)), profileId).toBeTruthy();
    }
  });

  it('answers only for its own profile ids', () => {
    expect(createMiniDragonProceduralObject(part('dragon-body'))).toBeNull();
    expect(createMiniDragonProceduralObject(part('primitive-box'))).toBeNull();
    expect(isMiniDragonProfileId('dragon-head-horned')).toBe(false);
  });

  it('leaves the classic dragon factory to answer for classic dragon parts', () => {
    // The two species share a renderer and must not shadow one another.
    for (const profileId of MINI_DRAGON_PROFILE_IDS) {
      expect(createDragonProceduralObject(part(profileId)), profileId).toBeNull();
    }
    expect(createDragonProceduralObject(part('dragon-body'))).toBeTruthy();
  });
  it('caps every exposed appendage root with a rounded joint ball', () => {
    for (const profileId of [
      'mini-dragon-neck',
      'mini-dragon-jaw',
      'mini-dragon-thigh',
      'mini-dragon-leg',
      'mini-dragon-wing',
      'mini-dragon-tail',
      'mini-dragon-tail-plume',
    ]) {
      const object = createMiniDragonProceduralObject(part(profileId, {}, { miniJointBall: 1 }))!;
      expect(named(object, 'mini-dragon-joint-ball').length, profileId).toBeGreaterThan(0);
    }
  });
});
