import * as CANNON from 'cannon-es';
import { AssemblyPhysicsService } from './assembly-physics.service';
import { AssemblyBlueprint, AssemblyJointBehavior, AssemblyPart, JointType } from './domain/assembly.models';

interface PhysicsInternals {
  world: CANNON.World;
  bodies: Map<string, CANNON.Body>;
  springs: { spring: CANNON.Spring }[];
  trackedHinges: { hinge: CANNON.HingeConstraint }[];
}

describe('AssemblyPhysicsService joint semantics', () => {
  it('uses authored pivots for fixed joints', () => {
    const service = new AssemblyPhysicsService();
    service.rebuild(blueprint('fixed'));
    const constraint = internals(service).world.constraints[0] as CANNON.PointToPointConstraint;

    expect(constraint.pivotA.x).toBeCloseTo(0.4);
    expect(constraint.pivotB.x).toBeCloseTo(-0.3);
    expect(constraint.equations.length).toBe(6);
  });

  it('creates a five-equation prismatic joint instead of a ball joint', () => {
    const service = new AssemblyPhysicsService();
    service.rebuild(blueprint('slider'));

    expect(internals(service).world.constraints[0].equations.length).toBe(5);
  });

  it('derives a spring rest length from the authored pose and honors its tuning', () => {
    const service = new AssemblyPhysicsService();
    service.rebuild(blueprint('spring', {
      profile: 'passive',
      springStiffness: 92,
      springDamping: 7,
    }));
    const spring = internals(service).springs[0].spring;

    expect(spring.restLength).toBeCloseTo(1.3);
    expect(spring.stiffness).toBe(92);
    expect(spring.damping).toBe(7);
  });

  it('drives oscillation from simulation time rather than wall-clock time', () => {
    const service = new AssemblyPhysicsService();
    service.rebuild(blueprint('hinge', {
      profile: 'oscillatingMotor',
      oscillationSpeed: 2,
      oscillationAmplitude: 3,
    }));
    service.step(0.25);
    const hinge = internals(service).trackedHinges[0].hinge;

    expect(hinge.motorEquation.targetVelocity).toBeCloseTo(Math.sin(0.5) * 3, 5);
  });

  it('applies a restoring velocity to a displaced spring hinge', () => {
    const service = new AssemblyPhysicsService();
    service.rebuild(blueprint('hinge', {
      profile: 'springHinge',
      springStiffness: 8,
      springDamping: 0,
    }));
    const state = internals(service);
    state.bodies.get('child')!.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), 0.2);
    service.step(0);

    expect(Math.abs(state.trackedHinges[0].hinge.motorEquation.targetVelocity)).toBeGreaterThan(1);
  });
});

function internals(service: AssemblyPhysicsService): PhysicsInternals {
  return service as unknown as PhysicsInternals;
}

function blueprint(type: JointType, behavior?: AssemblyJointBehavior): AssemblyBlueprint {
  return {
    parts: [part('parent', 0), part('child', 2)],
    joints: [{
      id: 'joint',
      type,
      parentPartId: 'parent',
      childPartId: 'child',
      pivotOnParent: { x: 0.4, y: 0, z: 0 },
      pivotOnChild: { x: -0.3, y: 0, z: 0 },
      axis: { x: 0, y: 0, z: 1 },
      behavior,
    }],
  };
}

function part(id: string, x: number): AssemblyPart {
  return {
    id,
    shape: 'box',
    mass: 1,
    dimensions: { x: 0.5, y: 0.5, z: 0.5 },
    position: { x, y: 3, z: 0 },
    color: '#336633',
  };
}
