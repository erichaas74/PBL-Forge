import { Injectable } from '@angular/core';
import * as CANNON from 'cannon-es';
import {
  AssemblyJoint,
  AssemblyJointBehavior,
  AssemblyPart,
  AssemblyPartRole,
  Vector3Data,
} from '../../shared/assembly/domain/assembly.models';
import {
  normalizeVector3,
  quaternionFromEuler,
} from '../../shared/assembly/domain/vector-data';
import { createAssemblyBody } from '../../shared/assembly/physics/cannon-assembly.factory';
import {
  ArenaControlFrame,
  ArenaSetupConfig,
  ArenaSetupStyleId,
  BattleArenaState,
  BattleBodySnapshot,
  BattleCombatant,
  BattleDamageEvent,
  BattlePhysicsFrame,
  ControlFrameByCombatant,
} from '../models/arena.models';
import { getBodyKey } from '../utils/battle-assembly';

interface BodyMeta {
  bodyKey: string;
  combatantId: string;
  sourcePartId: string;
  isCore: boolean;
  roles: AssemblyPartRole[];
}

interface TrackedArenaJoint {
  constraint: CANNON.Constraint;
  behavior: AssemblyJointBehavior | undefined;
  childBodyKey: string;
  hinge?: CANNON.HingeConstraint;
  broken: boolean;
}

const EMPTY_CONTROL_FRAME: ArenaControlFrame = {
  throttle: 0,
  steer: 0,
  strafe: 0,
  boost: false,
  biteAttack: false,
  wingAttack: false,
  tailAttack: false,
};

@Injectable()
export class AssemblyArenaPhysicsService {
  private world = this.createWorld();
  private readonly bodies = new Map<string, CANNON.Body>();
  private readonly bodyMetaById = new Map<number, BodyMeta>();
  private readonly springs: CANNON.Spring[] = [];
  private readonly trackedJoints: TrackedArenaJoint[] = [];
  private readonly fixedTimeStep = 1 / 60;
  private readonly maxSubSteps = 6;
  private currentSetupStyleId: ArenaSetupStyleId = 'duel-arena';
  private currentSetup: ArenaSetupConfig = DEFAULT_ARENA_SETUP;

  rebuild(state: BattleArenaState): void {
    this.clear();
    this.world = this.createWorld(state);

    for (const combatant of state.combatants) {
      this.addCombatant(combatant);
    }
  }

  step(state: BattleArenaState, deltaSeconds: number, controlFrames: ControlFrameByCombatant): BattlePhysicsFrame {
    this.applyControllers(state, controlFrames);
    this.updateJointBehaviors(state.elapsedSeconds);

    for (const spring of this.springs) {
      spring.applyForce();
    }

    this.world.step(this.fixedTimeStep, deltaSeconds, this.maxSubSteps);
    const brokenJointDamageEvents = this.getBrokenJointDamageEvents(state.elapsedSeconds);

    const damageEnabled = state.setup.physics?.damageEnabled !== false;
    return {
      snapshots: this.getSnapshots(),
      damageEvents: damageEnabled ? [
        ...brokenJointDamageEvents,
        ...this.getCollisionDamageEvents(),
        ...this.getOutOfBoundsDamageEvents(),
      ] : [],
    };
  }

  clear(): void {
    for (const body of Array.from(this.world.bodies)) {
      this.world.removeBody(body);
    }

    for (const constraint of Array.from(this.world.constraints)) {
      this.world.removeConstraint(constraint);
    }

    this.bodies.clear();
    this.bodyMetaById.clear();
    this.springs.length = 0;
    this.trackedJoints.length = 0;
  }

  private addCombatant(combatant: BattleCombatant): void {
    for (const part of combatant.assembly.parts) {
      const bodyKey = getBodyKey(combatant.id, part.id);
      const body = this.createBody(part, combatant.spawnPosition, combatant.initialRotation);

      this.bodies.set(bodyKey, body);
      this.bodyMetaById.set(body.id, {
        bodyKey,
        combatantId: combatant.id,
        sourcePartId: part.id,
        isCore: part.id === combatant.corePartId,
        roles: [...(part.roles ?? [])],
      });
      this.world.addBody(body);
    }

    for (const joint of combatant.assembly.joints) {
      this.addJoint(combatant.id, joint);
    }
  }

  private createBody(part: AssemblyPart, spawnPosition: Vector3Data, initialRotation: Vector3Data): CANNON.Body {
    return createAssemblyBody(part, {
      positionOffset: spawnPosition,
      initialRotation,
      minimumMass: 0.1,
      linearDamping: 0.16,
      angularDamping: 0.22,
    });
  }

  private addJoint(combatantId: string, joint: AssemblyJoint): void {
    const parent = this.bodies.get(getBodyKey(combatantId, joint.parentPartId));
    const child = this.bodies.get(getBodyKey(combatantId, joint.childPartId));

    if (!parent || !child) {
      return;
    }

    const pivotA = toCannonVec3(joint.pivotOnParent);
    const pivotB = toCannonVec3(joint.pivotOnChild);
    const axis = toCannonVec3(normalizeVector3(joint.axis));
    const behavior = joint.behavior;
    const maxForce = behavior?.breakForce
      ? Math.max(behavior.breakForce * 3, behavior.motorForce ?? 0, 1)
      : 1e6;
    const childBodyKey = getBodyKey(combatantId, joint.childPartId);

    switch (joint.type) {
      case 'fixed':
        this.addTrackedConstraint(
          withoutConnectedCollision(new CANNON.LockConstraint(parent, child, { maxForce })),
          behavior,
          childBodyKey,
        );
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
          behavior,
          childBodyKey,
        );
        this.addSuspensionSpring(parent, child, pivotA, pivotB, behavior, 0);
        return;
      case 'spring':
        this.springs.push(
          new CANNON.Spring(parent, child, {
            restLength: 0.25,
            stiffness: behavior?.springStiffness ?? 70,
            damping: behavior?.springDamping ?? 5,
            localAnchorA: pivotA,
            localAnchorB: pivotB,
          }),
        );
        this.addTrackedConstraint(
          withoutConnectedCollision(new CANNON.PointToPointConstraint(parent, pivotA, child, pivotB, maxForce)),
          behavior,
          childBodyKey,
        );
        return;
      case 'slider':
        this.addTrackedConstraint(
          withoutConnectedCollision(new CANNON.PointToPointConstraint(parent, pivotA, child, pivotB, maxForce)),
          behavior,
          childBodyKey,
        );
        return;
    }
  }

  private addTrackedHinge(
    hinge: CANNON.HingeConstraint,
    behavior: AssemblyJointBehavior | undefined,
    childBodyKey: string,
  ): void {
    this.configureHingeBehavior(hinge, behavior, 0);
    this.world.addConstraint(hinge);
    this.trackedJoints.push({
      constraint: hinge,
      hinge,
      behavior,
      childBodyKey,
      broken: false,
    });
  }

  private addTrackedConstraint(
    constraint: CANNON.Constraint,
    behavior: AssemblyJointBehavior | undefined,
    childBodyKey: string,
  ): void {
    this.world.addConstraint(constraint);
    this.trackedJoints.push({
      constraint,
      behavior,
      childBodyKey,
      broken: false,
    });
  }

  private configureHingeBehavior(
    hinge: CANNON.HingeConstraint,
    behavior: AssemblyJointBehavior | undefined,
    elapsedSeconds: number,
  ): void {
    if (!behavior || behavior.profile === 'passive') {
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
      const speed = Math.sin(elapsedSeconds * (behavior.oscillationSpeed ?? 4)) *
        (behavior.oscillationAmplitude ?? 4);
      hinge.setMotorSpeed(speed);
      return;
    }

    if (behavior.profile === 'springHinge') {
      hinge.disableMotor();
    }
  }

  private addSuspensionSpring(
    parent: CANNON.Body,
    child: CANNON.Body,
    pivotA: CANNON.Vec3,
    pivotB: CANNON.Vec3,
    behavior: AssemblyJointBehavior | undefined,
    restLength: number,
  ): void {
    if (behavior?.profile !== 'springHinge') {
      return;
    }

    this.springs.push(
      new CANNON.Spring(parent, child, {
        restLength,
        stiffness: behavior.springStiffness ?? 90,
        damping: behavior.springDamping ?? 8,
        localAnchorA: pivotA,
        localAnchorB: pivotB,
      }),
    );
  }

  private updateJointBehaviors(elapsedSeconds: number): void {
    for (const trackedJoint of this.trackedJoints) {
      if (trackedJoint.broken || !trackedJoint.hinge) {
        continue;
      }

      this.configureHingeBehavior(trackedJoint.hinge, trackedJoint.behavior, elapsedSeconds);
    }
  }

  getSnapshots(): BattleBodySnapshot[] {
    return Array.from(this.bodies.values()).map(body => {
      const meta = this.bodyMetaById.get(body.id);

      if (!meta) {
        throw new Error(`Missing battle body metadata for body ${body.id}.`);
      }

      return {
        bodyKey: meta.bodyKey,
        combatantId: meta.combatantId,
        sourcePartId: meta.sourcePartId,
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
      };
    });
  }

  private applyControllers(state: BattleArenaState, controlFrames: ControlFrameByCombatant): void {
    for (const combatant of state.combatants) {
      const core = this.getCoreBody(combatant.id);

      if (!core || combatant.controller === 'static' || combatant.controlMode === 'static-target') {
        continue;
      }

      this.applyPlayerControl(
        combatant,
        core,
        controlFrames[combatant.id] ?? EMPTY_CONTROL_FRAME,
        combatant.controlMode,
        state.elapsedSeconds,
      );
    }
  }

  private applyPlayerControl(
    combatant: BattleCombatant,
    core: CANNON.Body,
    controls: ArenaControlFrame,
    mode: BattleCombatant['controlMode'],
    elapsedSeconds: number,
  ): void {
    core.wakeUp();

    if (mode === 'vehicle-drive') {
      const forceScale = controls.boost ? 155 : 98;
      core.applyForce(new CANNON.Vec3(controls.throttle * forceScale, 0, controls.strafe * forceScale * 0.35));
      core.applyTorque(new CANNON.Vec3(0, -controls.steer * 38, 0));
      return;
    }

    if (mode === 'righting-assist') {
      const forceScale = controls.boost ? 92 : 58;
      core.applyForce(new CANNON.Vec3(controls.throttle * forceScale, 0, controls.strafe * forceScale));
      core.applyTorque(new CANNON.Vec3(controls.strafe * 80, -controls.steer * 34, -controls.steer * 60));

      if (controls.boost) {
        core.applyImpulse(new CANNON.Vec3(0, 3.6, 0));
        core.applyTorque(new CANNON.Vec3(90, 0, 45));
      }

      return;
    }

    if (mode === 'ai-hunter') {
      const forceScale = controls.boost ? 112 : 72;
      core.applyForce(new CANNON.Vec3(
        controls.throttle * forceScale,
        0,
        controls.strafe * forceScale,
      ));
      core.applyTorque(new CANNON.Vec3(0, -controls.steer * 24, 0));
      return;
    }

    if (mode === 'dragon-attack') {
      const forceScale = controls.boost ? 132 : 82;
      core.applyForce(new CANNON.Vec3(
        controls.throttle * forceScale,
        0,
        (controls.steer + controls.strafe) * forceScale * 0.48,
      ));
      core.applyTorque(new CANNON.Vec3(controls.strafe * 24, -controls.steer * 34, -controls.steer * 12));
      this.applyDragonAttackMoves(combatant.id, core, controls, elapsedSeconds);
      return;
    }

    if (mode === 'shove-drive') {
      const forceScale = controls.boost ? 125 : 78;
      core.applyForce(new CANNON.Vec3(
        controls.throttle * forceScale,
        0,
        (controls.steer + controls.strafe) * forceScale * 0.65,
      ));
      core.applyTorque(new CANNON.Vec3(0, -controls.steer * 28, 0));
    }
  }

  private applyDragonAttackMoves(
    combatantId: string,
    core: CANNON.Body,
    controls: ArenaControlFrame,
    elapsedSeconds: number,
  ): void {
    const attackDirection = getAttackDirection(core, controls);

    if (controls.biteAttack) {
      const head = this.getPartBodyByRole(combatantId, 'head') ?? core;
      head.wakeUp();
      head.applyForce(new CANNON.Vec3(
        attackDirection.x * 36,
        8,
        attackDirection.z * 36,
      ));
      core.applyForce(new CANNON.Vec3(
        attackDirection.x * 96,
        0,
        attackDirection.z * 96,
      ));
    }

    if (controls.wingAttack) {
      const wingBodies = this.getPartBodiesByRole(combatantId, 'wing');

      for (const body of wingBodies) {
        const meta = this.bodyMetaById.get(body.id);
        const side = meta?.sourcePartId.includes('left') ? -1 : 1;
        body.wakeUp();
        body.applyForce(new CANNON.Vec3(
          attackDirection.x * 8,
          12,
          side * 18,
        ));
      }

      if (wingBodies.length) {
        core.applyForce(new CANNON.Vec3(attackDirection.x * 36, 18, attackDirection.z * 36));
        core.applyTorque(new CANNON.Vec3(0, -controls.steer * 12, 24));
      }
    }

    if (controls.tailAttack) {
      const sweepSide = Math.sin(elapsedSeconds * 14) >= 0 ? 1 : -1;

      for (const body of this.getPartBodiesByRole(combatantId, 'tail')) {
        body.wakeUp();
        body.applyForce(new CANNON.Vec3(
          -attackDirection.x * 8,
          4,
          sweepSide * 24,
        ));
      }

      core.applyTorque(new CANNON.Vec3(0, sweepSide * 34, -sweepSide * 12));
    }
  }

  private getCoreBody(combatantId: string): CANNON.Body | null {
    for (const [bodyKey, body] of this.bodies.entries()) {
      const meta = this.bodyMetaById.get(body.id);

      if (meta?.combatantId === combatantId && meta.isCore && bodyKey === meta.bodyKey) {
        return body;
      }
    }

    return null;
  }

  private getPartBodyByRole(combatantId: string, role: AssemblyPartRole): CANNON.Body | null {
    return this.getPartBodiesByRole(combatantId, role)[0] ?? null;
  }

  private getPartBodiesByRole(combatantId: string, role: AssemblyPartRole): CANNON.Body[] {
    const bodies: CANNON.Body[] = [];

    for (const body of this.bodies.values()) {
      const meta = this.bodyMetaById.get(body.id);

      if (
        meta?.combatantId === combatantId &&
        meta.roles.includes(role)
      ) {
        bodies.push(body);
      }
    }

    return bodies;
  }

  private getCollisionDamageEvents(): BattleDamageEvent[] {
    const damageByBody = new Map<string, BattleDamageEvent>();
    const isDragonPractice = this.currentSetupStyleId === 'dragon-wing-test';
    const isRacePractice = this.currentSetupStyleId === 'pinewood-derby-test';
    const environmentImpactThreshold = isDragonPractice ? 8.5 : isRacePractice ? 6 : 2.4;

    for (const contact of this.world.contacts) {
      const a = this.bodyMetaById.get(contact.bi.id);
      const b = this.bodyMetaById.get(contact.bj.id);
      const impact = Math.abs(contact.getImpactVelocityAlongNormal());
      const isEnvironmentContact = Boolean(a) !== Boolean(b);

      if (!a && !b) {
        continue;
      }

      if (isEnvironmentContact && impact < environmentImpactThreshold) {
        continue;
      }

      if (!isEnvironmentContact && impact < 2.4) {
        continue;
      }

      if (a && b && a.combatantId === b.combatantId) {
        continue;
      }

      const threshold = isEnvironmentContact ? environmentImpactThreshold : 2.4;
      const multiplier = isEnvironmentContact && (isDragonPractice || isRacePractice) ? 0.8 : 3.2;
      const damage = Math.min(24, Math.max(0, (impact - threshold) * multiplier));

      if (a) {
        keepMaxDamage(damageByBody, a.bodyKey, damage, 'impact');
      }

      if (b) {
        keepMaxDamage(damageByBody, b.bodyKey, damage, 'impact');
      }
    }

    return Array.from(damageByBody.values());
  }

  private getBrokenJointDamageEvents(elapsedSeconds: number): BattleDamageEvent[] {
    const events: BattleDamageEvent[] = [];
    const isDragonPractice = this.currentSetupStyleId === 'dragon-wing-test';
    const isRacePractice = this.currentSetupStyleId === 'pinewood-derby-test';

    if (this.currentSetup.physics?.jointBreakageEnabled === false || isDragonPractice || isRacePractice) {
      return events;
    }

    for (const trackedJoint of this.trackedJoints) {
      const breakForce = trackedJoint.behavior?.breakForce;

      if (trackedJoint.broken || !breakForce) {
        continue;
      }

      if (isDragonPractice && elapsedSeconds < 1.5) {
        continue;
      }

      const stress = getConstraintStress(trackedJoint.constraint);
      const effectiveBreakForce = isDragonPractice ? breakForce * 4 : breakForce;

      if (stress < effectiveBreakForce) {
        continue;
      }

      trackedJoint.broken = true;
      this.world.removeConstraint(trackedJoint.constraint);
      events.push({
        bodyKey: trackedJoint.childBodyKey,
        amount: trackedJoint.behavior?.breakDamage ?? Math.min(24, breakForce / 6),
        reason: 'joint break',
      });
    }

    return events;
  }

  private getOutOfBoundsDamageEvents(): BattleDamageEvent[] {
    const events: BattleDamageEvent[] = [];
    const isDragonPractice = this.currentSetupStyleId === 'dragon-wing-test';

    for (const body of this.bodies.values()) {
      const meta = this.bodyMetaById.get(body.id);

      if (!meta) {
        continue;
      }

      const setup = this.currentSetup;
      const outOfBounds =
        Math.abs(body.position.x) > setup.floorSize.x / 2 - 0.3 ||
        Math.abs(body.position.z) > setup.floorSize.z / 2 - 0.3 ||
        body.position.y < (isDragonPractice ? -4 : -1.5);

      if (outOfBounds) {
        events.push({
          bodyKey: meta.bodyKey,
          amount: isDragonPractice ? (meta.isCore ? 2 : 1) : (meta.isCore ? 8 : 4),
          reason: 'out of bounds',
        });
      }
    }

    return events;
  }

  private createWorld(state?: BattleArenaState): CANNON.World {
    const setup = state?.setup ?? DEFAULT_ARENA_SETUP;
    const world = new CANNON.World();
    this.currentSetupStyleId = setup.id;
    this.currentSetup = setup;
    const gravity = setup.physics?.gravity ?? { x: 0, y: -9.82, z: 0 };
    world.gravity.set(gravity.x, gravity.y, gravity.z);
    world.allowSleep = true;
    if (world.solver instanceof CANNON.GSSolver) {
      world.solver.iterations = setup.id === 'dragon-wing-test' ? 18 : 12;
      world.solver.tolerance = 0.001;
    }
    world.defaultContactMaterial.friction = setup.physics?.floorFriction ?? 0.55;
    world.defaultContactMaterial.restitution = setup.physics?.floorRestitution ?? 0.02;
    const floorHalfExtents = new CANNON.Vec3(
      setup.floorSize.x / 2,
      setup.floorSize.y / 2,
      setup.floorSize.z / 2,
    );

    const ground = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(floorHalfExtents),
      position: new CANNON.Vec3(0, -setup.floorSize.y / 2, 0),
    });
    world.addBody(ground);

    const wallY = setup.wallHeight / 2;
    const wallThickness = 0.24;
    this.addWall(world, { x: 0, y: wallY, z: -setup.floorSize.z / 2 - wallThickness / 2 }, { x: setup.floorSize.x / 2, y: wallY, z: wallThickness / 2 });
    this.addWall(world, { x: 0, y: wallY, z: setup.floorSize.z / 2 + wallThickness / 2 }, { x: setup.floorSize.x / 2, y: wallY, z: wallThickness / 2 });
    this.addWall(world, { x: -setup.floorSize.x / 2 - wallThickness / 2, y: wallY, z: 0 }, { x: wallThickness / 2, y: wallY, z: setup.floorSize.z / 2 });
    this.addWall(world, { x: setup.floorSize.x / 2 + wallThickness / 2, y: wallY, z: 0 }, { x: wallThickness / 2, y: wallY, z: setup.floorSize.z / 2 });

    for (const obstacle of setup.obstacles) {
      this.addStaticBox(world, obstacle.position, {
        x: obstacle.size.x / 2,
        y: obstacle.size.y / 2,
        z: obstacle.size.z / 2,
      }, obstacle.rotation);
    }

    return world;
  }

  private addWall(world: CANNON.World, position: Vector3Data, halfExtents: Vector3Data): void {
    this.addStaticBox(world, position, halfExtents);
  }

  private addStaticBox(world: CANNON.World, position: Vector3Data, halfExtents: Vector3Data, rotation?: Vector3Data): void {
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(toCannonVec3(halfExtents)),
      position: toCannonVec3(position),
    });

    if (rotation) {
      const quaternion = quaternionFromEuler(rotation);
      body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    }

    world.addBody(body);
  }
}

const DEFAULT_ARENA_SETUP: ArenaSetupConfig = {
  id: 'duel-arena',
  name: 'Duel Arena',
  description: 'Default physics arena.',
  floorSize: { x: 12, y: 0.3, z: 8 },
  wallHeight: 1.5,
  defaultRedPresetId: '',
  defaultBluePresetId: '',
  redSpawn: { x: -2, y: 0.5, z: 0 },
  blueSpawn: { x: 2, y: 0.5, z: 0 },
  redInitialRotation: { x: 0, y: 0, z: 0 },
  blueInitialRotation: { x: 0, y: Math.PI, z: 0 },
  redControlMode: 'shove-drive',
  blueControlMode: 'static-target',
  winCondition: { type: 'core-survival' },
  obstacles: [],
};

function toCannonVec3(vector: Vector3Data): CANNON.Vec3 {
  return new CANNON.Vec3(vector.x, vector.y, vector.z);
}


function withoutConnectedCollision<T extends CANNON.Constraint>(constraint: T): T {
  constraint.collideConnected = false;
  return constraint;
}

function getAttackDirection(core: CANNON.Body, controls: ArenaControlFrame): CANNON.Vec3 {
  const inputDirection = new CANNON.Vec3(controls.throttle, 0, controls.strafe + controls.steer * 0.35);

  if (inputDirection.lengthSquared() > 0.001) {
    inputDirection.normalize();
    return inputDirection;
  }

  const forward = core.quaternion.vmult(new CANNON.Vec3(1, 0, 0));
  forward.y = 0;

  if (forward.lengthSquared() <= 0.001) {
    return new CANNON.Vec3(1, 0, 0);
  }

  forward.normalize();
  return forward;
}

function getConstraintStress(constraint: CANNON.Constraint): number {
  return constraint.equations.reduce(
    (max, equation) => Math.max(max, Math.abs(equation.multiplier)),
    0,
  );
}

function keepMaxDamage(
  damageByBody: Map<string, BattleDamageEvent>,
  bodyKey: string,
  amount: number,
  reason: string,
): void {
  const current = damageByBody.get(bodyKey);

  if (!current || amount > current.amount) {
    damageByBody.set(bodyKey, { bodyKey, amount, reason });
  }
}
