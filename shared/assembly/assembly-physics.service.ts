import { Injectable } from '@angular/core';
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
}

@Injectable()
export class AssemblyPhysicsService {
  private world = this.createWorld();
  private readonly bodies = new Map<string, CANNON.Body>();
  private readonly springs: CANNON.Spring[] = [];
  private readonly trackedHinges: TrackedGarageHinge[] = [];
  private readonly fixedTimeStep = 1 / 60;
  private readonly maxSubSteps = 3;

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
    this.updateJointBehaviors();

    for (const spring of this.springs) {
      spring.applyForce();
    }

    this.world.step(this.fixedTimeStep, deltaSeconds, this.maxSubSteps);
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
      case 'fixed':
        this.world.addConstraint(new CANNON.LockConstraint(parent, child, { maxForce }));
        return;
      case 'hinge':
        this.addTrackedHinge(
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
        this.springs.push(
          new CANNON.Spring(parent, child, {
            restLength: 0.2,
            stiffness: 60,
            damping: 4,
            localAnchorA: pivotA,
            localAnchorB: pivotB,
          }),
        );
        return;
      case 'slider':
        this.world.addConstraint(new CANNON.PointToPointConstraint(parent, pivotA, child, pivotB, maxForce));
        return;
    }
  }

  private addTrackedHinge(
    hinge: CANNON.HingeConstraint,
    behavior: AssemblyJointBehavior | undefined,
  ): void {
    this.configureHingeBehavior(hinge, behavior);
    this.world.addConstraint(hinge);
    this.trackedHinges.push({ hinge, behavior });
  }

  private updateJointBehaviors(): void {
    for (const trackedHinge of this.trackedHinges) {
      this.configureHingeBehavior(trackedHinge.hinge, trackedHinge.behavior);
    }
  }

  private configureHingeBehavior(
    hinge: CANNON.HingeConstraint,
    behavior: AssemblyJointBehavior | undefined,
  ): void {
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
      const elapsedSeconds = performance.now() / 1000;
      const speed = Math.sin(elapsedSeconds * (behavior.oscillationSpeed ?? 4)) *
        (behavior.oscillationAmplitude ?? 4);
      hinge.setMotorSpeed(speed);
      return;
    }

    if (behavior.profile === 'springHinge') {
      hinge.setMotorSpeed(0);
    }
  }
}

function toCannonVec3(vector: Vector3Data): CANNON.Vec3 {
  return new CANNON.Vec3(vector.x, vector.y, vector.z);
}
