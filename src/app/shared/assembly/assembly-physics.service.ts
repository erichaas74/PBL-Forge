import { Service } from '@angular/core';
import * as CANNON from 'cannon-es';
import {
  AssemblyJoint,
  AssemblyJointBehavior,
  AssemblyPart,
  AssemblyPhysicsSnapshot,
  AssemblyBlueprint,
  Vector3Data,
} from './domain/assembly.models';
import { normalizeVector3 } from './domain/vector-data';
import { createAssemblyBody } from './physics/cannon-assembly.factory';

interface TrackedGarageHinge {
  hinge: CANNON.HingeConstraint;
  behavior: AssemblyJointBehavior | undefined;
  axisA: CANNON.Vec3;
  referenceA: CANNON.Vec3;
  referenceB: CANNON.Vec3;
}

interface BreakableConstraint {
  jointId: string;
  constraint: CANNON.Constraint;
  behavior: AssemblyJointBehavior | undefined;
  accumulatedLoad: number;
  broken: boolean;
}

interface TrackedSpring {
  jointId: string;
  spring: CANNON.Spring;
  behavior: AssemblyJointBehavior | undefined;
  accumulatedLoad: number;
  broken: boolean;
}

@Service({ autoProvided: false })
export class AssemblyPhysicsService {
  private world = this.createWorld();
  private readonly bodies = new Map<string, CANNON.Body>();
  private readonly springs: TrackedSpring[] = [];
  private readonly trackedHinges: TrackedGarageHinge[] = [];
  private readonly breakableConstraints: BreakableConstraint[] = [];
  private readonly fixedTimeStep = 1 / 60;
  private readonly maxSubSteps = 3;
  private simulationElapsedSeconds = 0;

  rebuild(state: AssemblyBlueprint): void {
    this.clear();
    this.world = this.createWorld();

    for (const part of state.parts) {
      const body = this.createBody(part);
      this.bodies.set(part.id, body);
      this.world.addBody(body);
    }

    for (const joint of state.joints) {
      this.addJoint(joint);
    }
  }

  step(deltaSeconds: number): AssemblyPhysicsSnapshot[] {
    this.simulationElapsedSeconds += Math.max(0, deltaSeconds);
    this.updateJointBehaviors();

    for (const tracked of this.springs) {
      if (!tracked.broken) tracked.spring.applyForce();
    }

    this.world.step(this.fixedTimeStep, deltaSeconds, this.maxSubSteps);
    this.updateBreakage(deltaSeconds);
    return this.getSnapshot();
  }

  getSnapshot(): AssemblyPhysicsSnapshot[] {
    return Array.from(this.bodies.entries()).map(([partId, body]) => ({
      partId,
      position: {
        x: body.position.x,
        y: body.position.y,
        z: body.position.z,
      },
      quaternion: {
        x: body.quaternion.x,
        y: body.quaternion.y,
        z: body.quaternion.z,
        w: body.quaternion.w,
      },
      velocity: {
        x: body.velocity.x,
        y: body.velocity.y,
        z: body.velocity.z,
      },
    }));
  }

  clear(): void {
    for (const body of Array.from(this.world.bodies)) {
      this.world.removeBody(body);
    }

    for (const constraint of Array.from(this.world.constraints)) {
      this.world.removeConstraint(constraint);
    }

    this.bodies.clear();
    this.springs.length = 0;
    this.trackedHinges.length = 0;
    this.breakableConstraints.length = 0;
    this.simulationElapsedSeconds = 0;
  }

  private createWorld(): CANNON.World {
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.allowSleep = true;

    const groundMaterial = new CANNON.Material('garage-ground');
    const ground = new CANNON.Body({
      mass: 0,
      material: groundMaterial,
      shape: new CANNON.Plane(),
    });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(ground);

    return world;
  }

  private createBody(part: AssemblyPart): CANNON.Body {
    return createAssemblyBody(part);
  }

  private addJoint(joint: AssemblyJoint): void {
    const parent = this.bodies.get(joint.parentPartId);
    const child = this.bodies.get(joint.childPartId);

    if (!parent || !child) {
      return;
    }

    const pivotA = toCannonVec3(joint.pivotOnParent);
    const pivotB = toCannonVec3(joint.pivotOnChild);
    const axis = toCannonVec3(normalizeVector3(joint.axis));
    const maxForce = 1e6;

    switch (joint.type) {
      case 'fixed': {
        const constraint = new PivotLockConstraint(parent, pivotA, child, pivotB, maxForce);
        this.addBreakableConstraint(joint, constraint);
        return;
      }
      case 'hinge':
        this.addTrackedHinge(
          joint,
          new CANNON.HingeConstraint(parent, child, {
            pivotA,
            pivotB,
            axisA: axis,
            axisB: axis,
            maxForce,
            collideConnected: false,
          }),
          joint.behavior,
        );
        return;
      case 'spring':
        this.springs.push({
          jointId: joint.id,
          spring: new CANNON.Spring(parent, child, {
            restLength: anchorDistance(parent, pivotA, child, pivotB),
            stiffness: joint.behavior?.springStiffness ?? 60,
            damping: joint.behavior?.springDamping ?? 4,
            localAnchorA: pivotA,
            localAnchorB: pivotB,
          }),
          behavior: joint.behavior,
          accumulatedLoad: 0,
          broken: false,
        });
        return;
      case 'slider': {
        const constraint = new PrismaticConstraint(parent, pivotA, child, pivotB, axis, maxForce);
        this.addBreakableConstraint(joint, constraint);
        return;
      }
    }
  }

  private addTrackedHinge(
    joint: AssemblyJoint,
    hinge: CANNON.HingeConstraint,
    behavior: AssemblyJointBehavior | undefined,
  ): void {
    const axisWorld = hinge.bodyA.vectorToWorldFrame(hinge.axisA);
    const referenceWorld = new CANNON.Vec3();
    axisWorld.tangents(referenceWorld, new CANNON.Vec3());
    const tracked: TrackedGarageHinge = {
      hinge,
      behavior,
      axisA: hinge.axisA.clone(),
      referenceA: hinge.bodyA.vectorToLocalFrame(referenceWorld),
      referenceB: hinge.bodyB.vectorToLocalFrame(referenceWorld),
    };
    this.configureHingeBehavior(tracked);
    this.trackedHinges.push(tracked);
    this.addBreakableConstraint(joint, hinge);
  }

  private updateJointBehaviors(): void {
    for (const trackedHinge of this.trackedHinges) {
      this.configureHingeBehavior(trackedHinge);
    }
  }

  private configureHingeBehavior(tracked: TrackedGarageHinge): void {
    const { hinge, behavior } = tracked;
    if (!behavior || behavior.profile === 'passive') {
      hinge.disableMotor();
      return;
    }

    const motorForce = behavior.motorForce ?? behavior.springStiffness ?? 40;
    hinge.enableMotor();
    hinge.setMotorMaxForce(motorForce);

    if (behavior.profile === 'motor') {
      hinge.setMotorSpeed(behavior.motorSpeed ?? 0);
      return;
    }

    if (behavior.profile === 'oscillatingMotor') {
      const speed = Math.sin(this.simulationElapsedSeconds * (behavior.oscillationSpeed ?? 4)) *
        (behavior.oscillationAmplitude ?? 4);
      hinge.setMotorSpeed(speed);
      return;
    }

    if (behavior.profile === 'springHinge') {
      const axisWorld = hinge.bodyA.vectorToWorldFrame(tracked.axisA).unit();
      const referenceAWorld = hinge.bodyA.vectorToWorldFrame(tracked.referenceA).unit();
      const referenceBWorld = hinge.bodyB.vectorToWorldFrame(tracked.referenceB).unit();
      const cross = referenceAWorld.cross(referenceBWorld);
      const angle = Math.atan2(axisWorld.dot(cross), referenceAWorld.dot(referenceBWorld));
      const relativeAngularVelocity = hinge.bodyB.angularVelocity
        .vsub(hinge.bodyA.angularVelocity)
        .dot(axisWorld);
      const stiffness = behavior.springStiffness ?? 18;
      const damping = behavior.springDamping ?? 3;
      hinge.setMotorSpeed(clamp(-angle * stiffness - relativeAngularVelocity * damping, -12, 12));
    }
  }

  private addBreakableConstraint(joint: AssemblyJoint, constraint: CANNON.Constraint): void {
    this.world.addConstraint(constraint);
    this.breakableConstraints.push({
      jointId: joint.id,
      constraint,
      behavior: joint.behavior,
      accumulatedLoad: 0,
      broken: false,
    });
  }

  private updateBreakage(deltaSeconds: number): void {
    for (const tracked of this.breakableConstraints) {
      if (tracked.broken) continue;
      const load = Math.max(0, ...tracked.constraint.equations.map(equation => Math.abs(equation.multiplier)));
      tracked.accumulatedLoad += load * Math.max(0, deltaSeconds);
      if ((tracked.behavior?.breakForce !== undefined && load >= tracked.behavior.breakForce)
        || (tracked.behavior?.breakDamage !== undefined
          && tracked.accumulatedLoad >= tracked.behavior.breakDamage)) {
        this.world.removeConstraint(tracked.constraint);
        tracked.broken = true;
      }
    }

    for (const tracked of this.springs) {
      if (tracked.broken) continue;
      const load = springLoad(tracked.spring);
      tracked.accumulatedLoad += load * Math.max(0, deltaSeconds);
      if ((tracked.behavior?.breakForce !== undefined && load >= tracked.behavior.breakForce)
        || (tracked.behavior?.breakDamage !== undefined
          && tracked.accumulatedLoad >= tracked.behavior.breakDamage)) {
        tracked.broken = true;
      }
    }
  }
}

function toCannonVec3(vector: Vector3Data): CANNON.Vec3 {
  return new CANNON.Vec3(vector.x, vector.y, vector.z);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function anchorDistance(
  bodyA: CANNON.Body,
  pivotA: CANNON.Vec3,
  bodyB: CANNON.Body,
  pivotB: CANNON.Vec3,
): number {
  return bodyA.pointToWorldFrame(pivotA).distanceTo(bodyB.pointToWorldFrame(pivotB));
}

function springLoad(spring: CANNON.Spring): number {
  const distance = spring.bodyA.pointToWorldFrame(spring.localAnchorA)
    .distanceTo(spring.bodyB.pointToWorldFrame(spring.localAnchorB));
  return Math.abs(distance - spring.restLength) * spring.stiffness;
}

/** Locks authored pivots together while preserving the bodies' initial relative rotation. */
class PivotLockConstraint extends CANNON.PointToPointConstraint {
  private readonly xA: CANNON.Vec3;
  private readonly xB: CANNON.Vec3;
  private readonly yA: CANNON.Vec3;
  private readonly yB: CANNON.Vec3;
  private readonly zA: CANNON.Vec3;
  private readonly zB: CANNON.Vec3;
  private readonly rotationX: CANNON.RotationalEquation;
  private readonly rotationY: CANNON.RotationalEquation;
  private readonly rotationZ: CANNON.RotationalEquation;

  constructor(
    bodyA: CANNON.Body,
    pivotA: CANNON.Vec3,
    bodyB: CANNON.Body,
    pivotB: CANNON.Vec3,
    maxForce: number,
  ) {
    super(bodyA, pivotA, bodyB, pivotB, maxForce);
    this.xA = bodyA.vectorToLocalFrame(CANNON.Vec3.UNIT_X);
    this.xB = bodyB.vectorToLocalFrame(CANNON.Vec3.UNIT_X);
    this.yA = bodyA.vectorToLocalFrame(CANNON.Vec3.UNIT_Y);
    this.yB = bodyB.vectorToLocalFrame(CANNON.Vec3.UNIT_Y);
    this.zA = bodyA.vectorToLocalFrame(CANNON.Vec3.UNIT_Z);
    this.zB = bodyB.vectorToLocalFrame(CANNON.Vec3.UNIT_Z);
    this.rotationX = new CANNON.RotationalEquation(bodyA, bodyB, { maxForce });
    this.rotationY = new CANNON.RotationalEquation(bodyA, bodyB, { maxForce });
    this.rotationZ = new CANNON.RotationalEquation(bodyA, bodyB, { maxForce });
    this.equations.push(this.rotationX, this.rotationY, this.rotationZ);
  }

  override update(): void {
    super.update();
    this.bodyA.vectorToWorldFrame(this.xA, this.rotationX.axisA);
    this.bodyB.vectorToWorldFrame(this.yB, this.rotationX.axisB);
    this.bodyA.vectorToWorldFrame(this.yA, this.rotationY.axisA);
    this.bodyB.vectorToWorldFrame(this.zB, this.rotationY.axisB);
    this.bodyA.vectorToWorldFrame(this.zA, this.rotationZ.axisA);
    this.bodyB.vectorToWorldFrame(this.xB, this.rotationZ.axisB);
  }
}

/** Five-degree-of-constraint joint: translation remains free only along `axisA`. */
class PrismaticConstraint extends CANNON.Constraint {
  private readonly pivotA: CANNON.Vec3;
  private readonly pivotB: CANNON.Vec3;
  private readonly axisA: CANNON.Vec3;
  private readonly tangentA = new CANNON.ContactEquation(this.bodyA, this.bodyB);
  private readonly tangentB = new CANNON.ContactEquation(this.bodyA, this.bodyB);
  private readonly rotation: PivotLockConstraint;

  constructor(
    bodyA: CANNON.Body,
    pivotA: CANNON.Vec3,
    bodyB: CANNON.Body,
    pivotB: CANNON.Vec3,
    axisA: CANNON.Vec3,
    maxForce: number,
  ) {
    super(bodyA, bodyB, { collideConnected: false });
    this.pivotA = pivotA.clone();
    this.pivotB = pivotB.clone();
    this.axisA = axisA.clone();
    this.tangentA.minForce = this.tangentB.minForce = -maxForce;
    this.tangentA.maxForce = this.tangentB.maxForce = maxForce;

    // Reuse the three proven rotational equations from the pivot lock, but not
    // its three translational equations: the two contacts below constrain only
    // the plane perpendicular to the slider axis.
    this.rotation = new PivotLockConstraint(bodyA, pivotA, bodyB, pivotB, maxForce);
    this.equations.push(this.tangentA, this.tangentB, ...this.rotation.equations.slice(3));
  }

  override update(): void {
    const pivotAWorld = this.bodyA.quaternion.vmult(this.pivotA);
    const pivotBWorld = this.bodyB.quaternion.vmult(this.pivotB);
    this.tangentA.ri.copy(pivotAWorld);
    this.tangentA.rj.copy(pivotBWorld);
    this.tangentB.ri.copy(pivotAWorld);
    this.tangentB.rj.copy(pivotBWorld);

    const worldAxis = this.bodyA.vectorToWorldFrame(this.axisA).unit();
    worldAxis.tangents(this.tangentA.ni, this.tangentB.ni);
    this.rotation.update();
  }
}
