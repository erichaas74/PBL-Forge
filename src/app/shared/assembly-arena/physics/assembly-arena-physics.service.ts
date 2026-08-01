import { Injectable } from '@angular/core';
import * as CANNON from 'cannon-es';
import {
  AssemblyJoint,
  AssemblyJointBehavior,
  AssemblyPart,
  AssemblyPartRole,
  Vector3Data,
} from '../../assembly/domain/assembly.models';
import {
  normalizeVector3,
  quaternionFromEuler,
} from '../../assembly/domain/vector-data';
import { createAssemblyBody } from '../../assembly/physics/cannon-assembly.factory';
import {
  ASSEMBLY_CONTACT_ABILITIES,
  AssemblyContactAbility,
  FIRE_BREATH_TUNING,
} from '../../assembly/combat/assembly-abilities';
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
  FireConeSnapshot,
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
  fireAttack: false,
};

/** Fire breath: cone AoE gated by genotype at the control layer. */
const FIRE_BREATH_RANGE = FIRE_BREATH_TUNING.range;
const FIRE_BREATH_CONE_DOT = FIRE_BREATH_TUNING.coneDot;
const FIRE_BREATH_TICK_SECONDS = FIRE_BREATH_TUNING.tickSeconds;
const FIRE_BREATH_TICK_DAMAGE = FIRE_BREATH_TUNING.tickDamage;
const FIRE_BREATH_MAX_TARGETS = FIRE_BREATH_TUNING.maxTargets;

/** No damage or joint breakage while the freshly spawned assemblies settle. */
const SPAWN_GRACE_SECONDS = 1.5;
/**
 * Minimum time between damage ticks on the same body. Without this, a sustained
 * contact deals damage every physics step (60 Hz) and battles end in seconds.
 */
const DAMAGE_COOLDOWN_SECONDS = 0.45;

/**
 * Contact-window abilities, defined in `shared/assembly/combat` so the test
 * bench can quote the same damage and cooldowns without spinning up physics.
 */
type AbilityDefinition = AssemblyContactAbility;
const ABILITY_DEFINITIONS = ASSEMBLY_CONTACT_ABILITIES;

@Injectable()
export class AssemblyArenaPhysicsService {
  private world = this.createWorld();
  private readonly bodies = new Map<string, CANNON.Body>();
  private readonly bodyMetaById = new Map<number, BodyMeta>();
  private readonly springs: CANNON.Spring[] = [];
  private readonly trackedJoints: TrackedArenaJoint[] = [];
  private readonly lastDamageAt = new Map<string, number>();
  private readonly lastAbilityHitAt = new Map<string, number>();
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

    const damageEnabled = state.setup.physics?.damageEnabled !== false;
    const inSpawnGrace = state.elapsedSeconds < SPAWN_GRACE_SECONDS;
    if (!damageEnabled || inSpawnGrace) {
      return {
        snapshots: this.getSnapshots(),
        damageEvents: [],
        fireCones: this.getFireCones(state, controlFrames),
      };
    }

    // Joint breaks are one-shot events; contact and boundary damage is
    // rate-limited per body so persistent contact doesn't melt health at 60 Hz.
    const rateLimited = [
      ...this.getCollisionDamageEvents(),
      ...this.getOutOfBoundsDamageEvents(),
    ].filter(event => {
      const last = this.lastDamageAt.get(event.bodyKey);
      if (last !== undefined && state.elapsedSeconds - last < DAMAGE_COOLDOWN_SECONDS) {
        return false;
      }
      this.lastDamageAt.set(event.bodyKey, state.elapsedSeconds);
      return true;
    });

    return {
      snapshots: this.getSnapshots(),
      damageEvents: [
        ...this.getBrokenJointDamageEvents(state.elapsedSeconds),
        ...this.getAbilityDamageEvents(state, controlFrames),
        ...this.getFireBreathDamageEvents(state, controlFrames),
        ...rateLimited,
      ],
      fireCones: this.getFireCones(state, controlFrames),
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
    this.lastDamageAt.clear();
    this.lastAbilityHitAt.clear();
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
      // Body-relative drive: forward means where the dragon faces, steer yaws it.
      const forceScale = controls.boost ? 132 : 82;
      const forward = getHorizontalAxis(core, new CANNON.Vec3(1, 0, 0));
      const right = getHorizontalAxis(core, new CANNON.Vec3(0, 0, 1));
      core.applyForce(new CANNON.Vec3(
        (forward.x * controls.throttle + right.x * controls.strafe * 0.6) * forceScale,
        0,
        (forward.z * controls.throttle + right.z * controls.strafe * 0.6) * forceScale,
      ));
      core.applyTorque(new CANNON.Vec3(0, -controls.steer * 34, 0));
      this.applyWingLift(combatant.id, core, controls);
      this.applyDragonStance(combatant.id, core, controls);
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

  /**
   * Winged genotypes get lift while boosting: WW/Ww dragons leap and glide,
   * ww dragons stay planted — inherited wings visibly change how they move.
   */
  private applyWingLift(combatantId: string, core: CANNON.Body, controls: ArenaControlFrame): void {
    if (!controls.boost || core.velocity.y > 2.2) {
      return;
    }

    const wingCount = this.getPartBodiesByRole(combatantId, 'wing').length;
    if (!wingCount) {
      return;
    }

    core.applyForce(new CANNON.Vec3(0, Math.min(wingCount, 4) * core.mass * 2.6, 0));
  }

  /**
   * Actuated stance: dragons fight standing up and facing their opponent, like a
   * real animal, instead of slumping into a passive ragdoll between inputs.
   */
  private applyDragonStance(
    combatantId: string,
    core: CANNON.Body,
    controls: ArenaControlFrame,
  ): void {
    // Upright assist: torque that rotates body-up toward world-up, damped so the
    // dragon settles instead of wobbling.
    const up = core.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
    const uprightStrength = 18 * core.mass;
    const spinDamping = 4 * core.mass;
    core.applyTorque(new CANNON.Vec3(
      -up.z * uprightStrength - core.angularVelocity.x * spinDamping,
      0,
      up.x * uprightStrength - core.angularVelocity.z * spinDamping,
    ));

    // Soft auto-face: when the player is not steering, gently yaw toward the
    // opponent so bites aim somewhere sensible. Steering always overrides it.
    if (Math.abs(controls.steer) >= 0.05) {
      return;
    }

    const opponentCore = this.getOpponentCoreBody(combatantId);
    if (!opponentCore) {
      return;
    }

    const forward = getHorizontalAxis(core, new CANNON.Vec3(1, 0, 0));
    const right = getHorizontalAxis(core, new CANNON.Vec3(0, 0, 1));
    const dx = opponentCore.position.x - core.position.x;
    const dz = opponentCore.position.z - core.position.z;
    const bearing = Math.atan2(
      dx * right.x + dz * right.z,
      dx * forward.x + dz * forward.z,
    );
    const faceStrength = 4 * core.mass;
    core.applyTorque(new CANNON.Vec3(0, -Math.max(-1, Math.min(1, bearing)) * faceStrength, 0));
  }

  private getOpponentCoreBody(combatantId: string): CANNON.Body | null {
    for (const body of this.bodies.values()) {
      const meta = this.bodyMetaById.get(body.id);
      if (meta?.isCore && meta.combatantId !== combatantId) {
        return body;
      }
    }
    return null;
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

  private getAbilityDamageEvents(
    state: BattleArenaState,
    controlFrames: ControlFrameByCombatant,
  ): BattleDamageEvent[] {
    const events: BattleDamageEvent[] = [];

    for (const combatant of state.combatants) {
      const controls = controlFrames[combatant.id];
      if (!controls) continue;

      for (const definition of ABILITY_DEFINITIONS) {
        const active = definition.ability === 'bite'
          ? controls.biteAttack
          : definition.ability === 'wing-buffet'
            ? controls.wingAttack
            : controls.tailAttack;
        if (!active) continue;
        this.collectAbilityHit(events, combatant, definition, state.elapsedSeconds);
      }
    }

    return events;
  }

  private collectAbilityHit(
    events: BattleDamageEvent[],
    combatant: BattleCombatant,
    definition: AbilityDefinition,
    elapsedSeconds: number,
  ): void {
    const cooldownKey = `${combatant.id}:${definition.ability}`;
    const lastHit = this.lastAbilityHitAt.get(cooldownKey);
    if (lastHit !== undefined && elapsedSeconds - lastHit < definition.cooldownSeconds) {
      return;
    }

    for (const contact of this.world.contacts) {
      const a = this.bodyMetaById.get(contact.bi.id);
      const b = this.bodyMetaById.get(contact.bj.id);
      if (!a || !b || a.combatantId === b.combatantId) continue;

      const attacker = a.combatantId === combatant.id ? a : b.combatantId === combatant.id ? b : null;
      if (!attacker || !attacker.roles.includes(definition.role)) continue;
      const target = attacker === a ? b : a;

      const attackerMultiplier = definition.usesAttackerMultiplier
        ? combatant.combatProfile.parts[attacker.sourcePartId]?.damageMultiplier ?? 1
        : 1;
      events.push({
        bodyKey: target.bodyKey,
        amount: definition.baseDamage * attackerMultiplier,
        reason: definition.ability,
      });
      this.lastAbilityHitAt.set(cooldownKey, elapsedSeconds);

      if (definition.knockback) {
        this.applyAbilityKnockback(combatant.id, target.combatantId);
      }
      return;
    }
  }

  /** Cone AoE damage ticks while fire breath is held. */
  private getFireBreathDamageEvents(
    state: BattleArenaState,
    controlFrames: ControlFrameByCombatant,
  ): BattleDamageEvent[] {
    const events: BattleDamageEvent[] = [];

    for (const combatant of state.combatants) {
      const controls = controlFrames[combatant.id];
      if (!controls?.fireAttack) continue;

      const cooldownKey = `${combatant.id}:fire-breath`;
      const lastTick = this.lastAbilityHitAt.get(cooldownKey);
      if (lastTick !== undefined && state.elapsedSeconds - lastTick < FIRE_BREATH_TICK_SECONDS) {
        continue;
      }

      const cone = this.getFireCone(combatant.id, controls);
      if (!cone) continue;

      const scorched: { bodyKey: string; distance: number }[] = [];
      for (const body of this.bodies.values()) {
        const meta = this.bodyMetaById.get(body.id);
        if (!meta || meta.combatantId === combatant.id) continue;

        const dx = body.position.x - cone.origin.x;
        const dy = body.position.y - cone.origin.y;
        const dz = body.position.z - cone.origin.z;
        const distance = Math.hypot(dx, dy, dz);
        if (distance > FIRE_BREATH_RANGE || distance < 0.001) continue;

        const alignment = (dx * cone.direction.x + dz * cone.direction.z) / distance;
        if (alignment < FIRE_BREATH_CONE_DOT) continue;
        scorched.push({ bodyKey: meta.bodyKey, distance });
      }

      if (!scorched.length) continue;
      scorched.sort((a, b) => a.distance - b.distance);
      for (const target of scorched.slice(0, FIRE_BREATH_MAX_TARGETS)) {
        events.push({ bodyKey: target.bodyKey, amount: FIRE_BREATH_TICK_DAMAGE, reason: 'fire breath' });
      }
      this.lastAbilityHitAt.set(cooldownKey, state.elapsedSeconds);
    }

    return events;
  }

  private getFireCones(
    state: BattleArenaState,
    controlFrames: ControlFrameByCombatant,
  ): FireConeSnapshot[] {
    const cones: FireConeSnapshot[] = [];
    for (const combatant of state.combatants) {
      const controls = controlFrames[combatant.id];
      if (!controls?.fireAttack) continue;
      const cone = this.getFireCone(combatant.id, controls);
      if (cone) cones.push(cone);
    }
    return cones;
  }

  private getFireCone(combatantId: string, controls: ArenaControlFrame): FireConeSnapshot | null {
    const mouth = this.getPartBodyByRole(combatantId, 'head')
      ?? this.getPartBodyByRole(combatantId, 'jaw')
      ?? this.getCoreBody(combatantId);
    if (!mouth) return null;

    const direction = getAttackDirection(mouth, controls);
    return {
      combatantId,
      origin: { x: mouth.position.x, y: mouth.position.y, z: mouth.position.z },
      direction: { x: direction.x, y: direction.y, z: direction.z },
    };
  }

  private applyAbilityKnockback(attackerId: string, targetId: string): void {
    const attackerCore = this.getCoreBody(attackerId);
    const targetCore = this.getCoreBody(targetId);
    if (!attackerCore || !targetCore) return;

    const direction = targetCore.position.vsub(attackerCore.position);
    direction.y = 0;
    if (direction.lengthSquared() < 0.001) return;
    direction.normalize();

    targetCore.wakeUp();
    targetCore.applyImpulse(new CANNON.Vec3(
      direction.x * (6 + targetCore.mass * 1.5),
      2.5 + targetCore.mass * 0.4,
      direction.z * (6 + targetCore.mass * 1.5),
    ));
  }

  private getCollisionDamageEvents(): BattleDamageEvent[] {
    const damageByBody = new Map<string, BattleDamageEvent>();
    const isDragonPractice = this.currentSetupStyleId === 'dragon-wing-test';
    const isRacePractice = this.currentSetupStyleId === 'pinewood-derby-test';
    const environmentImpactThreshold = isDragonPractice ? 8.5 : isRacePractice ? 6 : 3.5;
    const combatantImpactThreshold = 3;

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

      if (!isEnvironmentContact && impact < combatantImpactThreshold) {
        continue;
      }

      if (a && b && a.combatantId === b.combatantId) {
        continue;
      }

      // Combatant hits are tuned (with the damage cooldown) so a duel between
      // catalog-sized assemblies averages roughly 40 seconds. Environment slams
      // stay heavier for the crash-test scenarios.
      const threshold = isEnvironmentContact ? environmentImpactThreshold : combatantImpactThreshold;
      const multiplier = isEnvironmentContact
        ? (isDragonPractice || isRacePractice ? 0.8 : 3.2)
        : 1.6;
      const cap = isEnvironmentContact ? 24 : 12;
      const damage = Math.min(cap, Math.max(0, (impact - threshold) * multiplier));

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

    if (elapsedSeconds < SPAWN_GRACE_SECONDS) {
      return events;
    }

    // Duels should be decided by health, with limb loss as a dramatic accent —
    // not by assemblies shedding every joint in the opening seconds. Crash-test
    // setups keep the authored break forces for the demolition spectacle.
    const isDuel = this.currentSetupStyleId === 'duel-arena';

    for (const trackedJoint of this.trackedJoints) {
      const breakForce = trackedJoint.behavior?.breakForce;

      if (trackedJoint.broken || !breakForce) {
        continue;
      }

      const stress = getConstraintStress(trackedJoint.constraint);
      const effectiveBreakForce = isDuel ? breakForce * 2 : breakForce;

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
        // Rate-limited by the shared damage cooldown: being pinned at a wall
        // wears a dragon down over many seconds instead of killing in one.
        events.push({
          bodyKey: meta.bodyKey,
          amount: isDragonPractice ? (meta.isCore ? 2 : 1) : (meta.isCore ? 5 : 2),
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

/** Attacks strike where the dragon faces, tilted slightly by any strafe input. */
function getAttackDirection(core: CANNON.Body, controls: ArenaControlFrame): CANNON.Vec3 {
  const forward = getHorizontalAxis(core, new CANNON.Vec3(1, 0, 0));

  if (Math.abs(controls.strafe) > 0.01) {
    const right = getHorizontalAxis(core, new CANNON.Vec3(0, 0, 1));
    const blended = new CANNON.Vec3(
      forward.x + right.x * controls.strafe * 0.35,
      0,
      forward.z + right.z * controls.strafe * 0.35,
    );
    if (blended.lengthSquared() > 0.001) {
      blended.normalize();
      return blended;
    }
  }

  return forward;
}

/** A body-local axis projected onto the ground plane and normalized. */
function getHorizontalAxis(core: CANNON.Body, localAxis: CANNON.Vec3): CANNON.Vec3 {
  const axis = core.quaternion.vmult(localAxis);
  axis.y = 0;

  if (axis.lengthSquared() <= 0.001) {
    return new CANNON.Vec3(1, 0, 0);
  }

  axis.normalize();
  return axis;
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
