import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AssemblyPart } from '../domain/assembly.models';
import { createRobotProceduralObject, createVehicleProceduralObject } from './machine-procedural-mesh.factory';

function machine(profileId: string, parameters: Record<string, string | number | boolean>): AssemblyPart {
  return {
    id: profileId,
    shape: 'box',
    mass: 1,
    dimensions: { x: 0.4, y: 1.2, z: 0.35 },
    position: { x: 0, y: 0, z: 0 },
    color: '#2563eb',
    visualProfile: { profileId, meshType: 'procedural', parameters },
  };
}

describe('machine procedural generators', () => {
  it('builds a tunable vehicle wheel with named tire, rim, spokes, and treads', () => {
    const object = createVehicleProceduralObject(machine('car-wheel', {
      wheelRadiusScale: 1.2, spokeCount: 5, treadCount: 12, tireType: 'offroad',
    })) as THREE.Group;
    expect(object.getObjectByName('vehicle-wheel-tire')).toBeTruthy();
    expect(object.getObjectByName('vehicle-wheel-spoke-4')).toBeTruthy();
    expect(object.getObjectByName('vehicle-wheel-tread-11')).toBeTruthy();
  });

  it('builds a robot arm whose select control changes the generated tool', () => {
    const object = createRobotProceduralObject(machine('robot-limb', {
      armLengthScale: 1.25, toolMode: 'welder', accentColor: '#22d3ee',
    })) as THREE.Group;
    expect(object.getObjectByName('robot-arm-elbow-joint')).toBeTruthy();
    expect(object.getObjectByName('robot-arm-tool-welder')).toBeTruthy();
  });
});
