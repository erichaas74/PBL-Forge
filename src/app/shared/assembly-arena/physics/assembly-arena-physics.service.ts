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
  AssemblyAbilityId,
  AssemblyContactAbility,
  DEFENSE_TUNING,
  FIRE_BREATH_TUNING,
  SCRIPTED_ASSEMBLY_ATTACKS,
} from '../../assembly/combat/assembly-abilities';
import {
  ArenaControlFrame,
  ArenaSetupConfig,
  ArenaSetupStyleId,
  BattleAttackPoseSnapshot,
  BattleArenaState,
  BattleBodySnapshot,
  BattleCombatant,
  BattleDamageEvent,
  BattleDefenseSnapshot,
  BattlePhysicsFrame,
  CombatAwarenessByCombatant,
  ControlFrameByCombatant,
  FireConeSnapshot,
} from '../models/arena.models';
import {
  CoreHalfExtents,
  coreHalfExtents,
  getBodyKey,
  horizontalTorsoSupport,
} from '../utils/battle-assembly';

interface BodyMeta {
  bodyKey: string;
  combatantId: string;
  sourcePartId: string;
  isCore: boolean;
  roles: AssemblyPartRole[];
  /**
   * Core half-extents in the body's own frame, cached for stance separation.
   * Read from the blueprint rather than the CANNON shape so a box, sphere, and
   * cylinder torso all report the same three numbers.
   */
  half: CoreHalfExtents;
}

/** One torso riding on top of another, with the way off already chosen. */
interface MountState {
  carrierId: string;
  /** Horizontal slide velocity that takes the rider out of the carrier's footprint. */
  slide: { x: number; z: number };
}

interface TrackedArenaJoint {
  constraint: CANNON.Constraint;
  behavior: AssemblyJointBehavior | undefined;
  combatantId: string;
  childBodyKey: string;
  hinge?: CANNON.HingeConstraint;
  broken: boolean;
}

interface ActiveScriptedAttack {
  ability: AssemblyAbilityId;
  startedAtSeconds: number;
  hitResolved: boolean;
}

/** A brace being held, or the recovery after one collapsed. */
interface GuardState {
  /** Seconds of brace spent so far this hold. */
  heldSeconds: number;
  /** Set when the brace collapsed; no guarding until then. */
  recoveredAtSeconds: number | null;
}

/** An evasive roll in flight. */
interface ActiveDodge {
  startedAtSeconds: number;
  /** Ground-plane direction of the roll, already normalized. */
  direction: { x: number; z: number };
}

const EMPTY_CONTROL_FRAME: ArenaControlFrame = {
  throttle: 0,
  steer: 0,
  strafe: 0,
  boost: false,
  biteAttack: false,
  clawAttack: false,
  wingAttack: false,
  tailAttack: false,
  hornCharge: false,
  fireAttack: false,
  guard: false,
  dodge: false,
};

/**
 * Knockdown.
 *
 * A charge that connects puts its target on the floor: no control, no attacks,
 * and the upright assist deliberately left switched off for long enough that
 * the fall reads. This is the reward the heavy move is built around, and the
 * reason a defender wants an answer to it.
 */
const KNOCKDOWN_SECONDS = 1.05;

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

/**
 * Mount separation.
 *
 * A dragon-attack torso has its horizontal velocity assigned outright each
 * frame (see `applyPlayerControl`), which is what makes the controls feel
 * direct — but it also discards whatever separating velocity the solver just
 * computed for a torso-on-torso contact. Two dragons could therefore climb onto
 * one another and stay there: the carrier's ride-height spring held the rider
 * up, and neither had any way to slide apart. These drive an explicit slide-off
 * that is *added* to the requested velocity rather than replaced by it.
 */
const MOUNT_SEPARATION = {
  /**
   * Fraction of the summed half-heights above which one torso counts as riding
   * another.
   *
   * Deliberately low: catching a climb while it is still a scramble up the
   * flank, rather than once the rider is settled on the back, is what stops the
   * pair getting into the pin in the first place. Two dragons standing on the
   * same floor differ in height by nothing at all, so there is a wide margin
   * before this can fire by accident.
   */
  heightRatio: 0.32,
  /** How far a rider may sit outside the carrier's footprint and still count, as a fraction of its own half-extents. */
  footprintSlack: 0.35,
  /** Peak slide-off speed, in metres per second, at full overlap. */
  slideSpeed: 4.6,
  /** Sideways buck impulse when the carrier boosts, as a multiple of the rider's mass. */
  buckImpulse: 7.5,
  /** Upward component of the same buck. */
  buckLift: 4.2,
  /** Seconds between buck throws, so holding boost is not a continuous cannon. */
  buckCooldownSeconds: 0.8,
  /**
   * How much of its own requested move a rider keeps.
   *
   * Near zero on purpose. A rider's controller assigns horizontal velocity
   * outright, so at full authority it simply drove back onto the torso it had
   * just been slid off — the slide and the chase were fighting over the same
   * variable and the chase always won. A dragon standing on another one has
   * nothing to push against; it gets to fall off, not to steer.
   */
  riderDriveScale: 0.12,
  /**
   * The slide grows the longer a pin lasts, reaching this multiple after
   * `escalationSeconds`. No pin can be held, whatever either dragon does.
   */
  slideEscalation: 2.4,
  escalationSeconds: 1.1,
  /** A carrier starts shrugging on its own after this long, without any input. */
  autoShrugAfterSeconds: 0.35,
  /** Repeat interval and strength of that automatic shrug. */
  autoShrugIntervalSeconds: 0.4,
  autoShrugImpulse: 5,
  /** How long a rider must be clear before its pin clock resets. */
  dismountGraceSeconds: 0.3,
  /** Damage per tick dealt to a torso being stood on, so a pin is worth attempting. */
  crushDamage: 2.5,
  crushIntervalSeconds: 0.5,
} as const;

/**
 * Flight.
 *
 * Boost used to grant lift on every frame it was held, which is exactly how the
 * challenger ended up hovering on the player's back: it never stopped pressing
 * boost, so it never came down. Lift is now a discrete flap — one beat, then a
 * cooldown, and none at all while standing on somebody.
 */
const WING_FLAP = {
  cooldownSeconds: 0.85,
  /** Upward impulse per beat, as a multiple of body mass and wing count. */
  impulsePerWing: 1.2,
  maxWings: 4,
  /**
   * A leap needs footing: no beat unless the dragon is within this multiple of
   * its own standing height. A ceiling alone was not enough — a dragon could
   * still beat its wings again just below it and hang there indefinitely, which
   * is the hover this is here to prevent.
   */
  groundedRatio: 1.35,
} as const;

/**
 * Floor for how close two torsos may sit horizontally, as a fraction of their
 * summed half-widths.
 *
 * Deliberately well inside bite range: a bite reaches 2.7 units core to core
 * and two classic torsos are 1.5 wide summed, so this keeps dragons from
 * occupying the same point without ever holding them outside the range of the
 * move they are trying to land.
 */
const CORE_PERSONAL_SPACE_RATIO = 1;

@Injectable()
export class AssemblyArenaPhysicsService {
  private world = this.createWorld();
  private readonly bodies = new Map<string, CANNON.Body>();
  private readonly bodyMetaById = new Map<number, BodyMeta>();
  private readonly springs: CANNON.Spring[] = [];
  private readonly trackedJoints: TrackedArenaJoint[] = [];
  private readonly lastDamageAt = new Map<string, number>();
  private readonly lastAbilityHitAt = new Map<string, number>();
  private readonly activeAttacks = new Map<string, ActiveScriptedAttack>();
  private readonly attackReactions = new Map<string, CANNON.Vec3>();
  /** Combatants currently riding on top of another torso. Rebuilt every step. */
  private readonly mountedOn = new Map<string, MountState>();
  private readonly lastBuckAt = new Map<string, number>();
  /** When each ongoing pin began, so the slide can escalate out of it. */
  private readonly mountedSince = new Map<string, number>();
  /** Last frame each rider was actually on top, for the dismount grace. */
  private readonly lastMountedAt = new Map<string, number>();
  private readonly lastCrushAt = new Map<string, number>();
  private readonly lastFlapAt = new Map<string, number>();
  /** Last time each combatant *started* a given ability, for its cooldown. */
  private readonly lastAttackStartedAt = new Map<string, number>();
  private readonly guardStates = new Map<string, GuardState>();
  private readonly activeDodges = new Map<string, ActiveDodge>();
  private readonly lastDodgeAt = new Map<string, number>();
  /** Combatants flattened by a charge, with the time they may act again. */
  private readonly knockedDownUntil = new Map<string, number>();
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
    // Defence is resolved before the attacks that read it: a guard raised on
    // this frame has to be up before the frame's blows are scored, or blocking
    // would always be one frame late.
    this.updateDefenses(state, controlFrames, deltaSeconds);
    this.updateScriptedAttacks(state, controlFrames);
    this.updateMountState(state.elapsedSeconds);
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
        fireCones: this.getFireCones(state),
        attackPoses: this.getAttackPoses(state.elapsedSeconds),
        defenses: this.getDefenseSnapshots(state),
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
      // Every route to a health change passes through the defence filter, so a
      // brace protects against a wall slam and a falling opponent exactly as it
      // protects against a bite. A defence that only worked against the moves
      // we remembered to route through it would be the worst kind of rule.
      damageEvents: this.applyDefenseMitigation(state, [
        ...this.getBrokenJointDamageEvents(state),
        ...this.getAbilityDamageEvents(state),
        ...this.getFireBreathDamageEvents(state),
        ...this.getCrushDamageEvents(state),
        ...rateLimited,
      ]),
      fireCones: this.getFireCones(state),
      attackPoses: this.getAttackPoses(state.elapsedSeconds),
      defenses: this.getDefenseSnapshots(state),
    };
  }

  /**
   * What every combatant is doing right now.
   *
   * Read by the strategy layer so a controller can answer an incoming attack
   * instead of only chasing a position.
   */
  getCombatAwareness(state: BattleArenaState): CombatAwarenessByCombatant {
    const awareness: CombatAwarenessByCombatant = {};

    for (const combatant of state.combatants) {
      const attack = this.activeAttacks.get(combatant.id);
      const phase = attack ? getAttackPhase(attack, state.elapsedSeconds) : 0;
      const timing = attack ? SCRIPTED_ASSEMBLY_ATTACKS[attack.ability] : null;
      const core = this.getCoreBody(combatant.id);
      const cooldowns: Partial<Record<AssemblyAbilityId, number>> = {};

      for (const definition of ASSEMBLY_CONTACT_ABILITIES) {
        const last = this.lastAttackStartedAt.get(`${combatant.id}:${definition.ability}`);
        cooldowns[definition.ability] = last === undefined
          ? 0
          : Math.max(0, definition.cooldownSeconds - (state.elapsedSeconds - last));
      }

      awareness[combatant.id] = {
        combatantId: combatant.id,
        ability: attack?.ability ?? null,
        phase,
        striking: Boolean(timing) && phase >= (timing!.strikeAt - timing!.activeWindow),
        defense: this.getDefenseSnapshot(combatant.id, state.elapsedSeconds),
        mounted: this.mountedOn.has(combatant.id),
        airborne: Boolean(core) && !this.mountedOn.has(combatant.id) && core!.velocity.y > 1.2,
        cooldowns,
      };
    }

    return awareness;
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
    this.activeAttacks.clear();
    this.attackReactions.clear();
    this.mountedOn.clear();
    this.lastBuckAt.clear();
    this.mountedSince.clear();
    this.lastMountedAt.clear();
    this.lastCrushAt.clear();
    this.lastFlapAt.clear();
    this.lastAttackStartedAt.clear();
    this.guardStates.clear();
    this.activeDodges.clear();
    this.lastDodgeAt.clear();
    this.knockedDownUntil.clear();
  }

  private addCombatant(combatant: BattleCombatant): void {
    for (const part of combatant.assembly.parts) {
      // Dragon combat uses a single physical root. Every visible limb is posed
      // from the authored rig around this root, so leg placement cannot pin,
      // drag, steer, or topple the torso through the constraint solver.
      if (combatant.controlMode === 'dragon-attack' && part.id !== combatant.corePartId) {
        continue;
      }

      const bodyKey = getBodyKey(combatant.id, part.id);
      const body = this.createBody(part, combatant.spawnPosition, combatant.initialRotation);

      this.bodies.set(bodyKey, body);
      this.bodyMetaById.set(body.id, {
        bodyKey,
        combatantId: combatant.id,
        sourcePartId: part.id,
        isCore: part.id === combatant.corePartId,
        roles: [...(part.roles ?? [])],
        half: coreHalfExtents(part),
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
          combatantId,
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
          combatantId,
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
          combatantId,
          childBodyKey,
        );
        return;
      case 'slider':
        this.addTrackedConstraint(
          withoutConnectedCollision(new CANNON.PointToPointConstraint(parent, pivotA, child, pivotB, maxForce)),
          behavior,
          combatantId,
          childBodyKey,
        );
        return;
    }
  }

  private addTrackedHinge(
    hinge: CANNON.HingeConstraint,
    behavior: AssemblyJointBehavior | undefined,
    combatantId: string,
    childBodyKey: string,
  ): void {
    this.configureHingeBehavior(hinge, behavior, 0);
    this.world.addConstraint(hinge);
    this.trackedJoints.push({
      constraint: hinge,
      hinge,
      behavior,
      combatantId,
      childBodyKey,
      broken: false,
    });
  }

  private addTrackedConstraint(
    constraint: CANNON.Constraint,
    behavior: AssemblyJointBehavior | undefined,
    combatantId: string,
    childBodyKey: string,
  ): void {
    this.world.addConstraint(constraint);
    this.trackedJoints.push({
      constraint,
      behavior,
      combatantId,
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
      // Root-motion drive: the torso owns horizontal travel. Legs are visual
      // attack limbs, not traction points, so their contact or pose cannot
      // change the player's requested direction.
      const forward = getHorizontalAxis(core, new CANNON.Vec3(1, 0, 0));
      const right = getHorizontalAxis(core, new CANNON.Vec3(0, 0, 1));
      const drive = this.resolveDragonDrive(combatant, controls, elapsedSeconds);
      const desiredX = (forward.x * controls.throttle + right.x * controls.strafe * 0.65)
        * drive.speed + drive.overrideX;
      const desiredZ = (forward.z * controls.throttle + right.z * controls.strafe * 0.65)
        * drive.speed + drive.overrideZ;
      const reaction = this.attackReactions.get(combatant.id);
      // Separation is added, not blended: assigning velocity outright is what
      // keeps the controls direct, but it also discards the solver's contact
      // response, so torso-on-torso overlap has to be re-supplied here or the
      // two dragons simply occupy each other.
      const separation = this.resolveCoreSeparation(combatant.id, core);
      // Input directly owns horizontal root velocity. Physics still controls
      // height, impacts, knockback, rotation, and recovery, but floor/leg state
      // cannot swallow or redirect a requested move.
      core.velocity.x = desiredX + (reaction?.x ?? 0) + separation.x;
      core.velocity.z = desiredZ + (reaction?.z ?? 0) + separation.z;
      if (reaction) {
        reaction.scale(0.84, reaction);
        if (reaction.lengthSquared() < 0.01) this.attackReactions.delete(combatant.id);
      }
      // A braced dragon plants itself and a flattened one cannot turn at all.
      core.applyTorque(new CANNON.Vec3(0, -controls.steer * 34 * drive.turnScale, 0));
      if (controls.boost) {
        this.applyBuck(combatant.id, core, elapsedSeconds);
      }
      this.applyAutoShrug(combatant.id, elapsedSeconds);
      this.applyWingFlap(combatant, core, controls, elapsedSeconds);
      this.applyDragonStance(combatant, core, controls, elapsedSeconds);
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
   * How fast this dragon may travel this frame, and any motion it does not own.
   *
   * Everything that can take control of a torso is decided in one place, in
   * priority order, so two systems can never quietly both be driving: a
   * knockdown beats a roll, a roll beats a charge, a charge beats a brace, and
   * a dragon standing on another one keeps almost nothing.
   */
  private resolveDragonDrive(
    combatant: BattleCombatant,
    controls: ArenaControlFrame,
    elapsedSeconds: number,
  ): { speed: number; turnScale: number; overrideX: number; overrideZ: number } {
    const still = { speed: 0, turnScale: 0, overrideX: 0, overrideZ: 0 };

    if (this.isKnockedDown(combatant.id, elapsedSeconds)) {
      return still;
    }

    const dodge = this.activeDodges.get(combatant.id);
    if (dodge) {
      // The roll travels on its own line, ignoring the stick, so an evade is a
      // committed movement a student can read and time rather than a nudge.
      const phase = (elapsedSeconds - dodge.startedAtSeconds) / DEFENSE_TUNING.dodge.durationSeconds;
      const speed = DEFENSE_TUNING.dodge.speed * Math.max(0, 1 - phase) ** 0.6;
      return {
        speed: 0,
        turnScale: 0.2,
        overrideX: dodge.direction.x * speed,
        overrideZ: dodge.direction.z * speed,
      };
    }

    const charge = this.getChargeDrive(combatant.id, elapsedSeconds);
    if (charge) {
      return { speed: 0, turnScale: 0.25, overrideX: charge.x, overrideZ: charge.z };
    }

    if (this.isGuarding(combatant.id)) {
      return {
        speed: 3.4 * DEFENSE_TUNING.guard.moveScale,
        turnScale: DEFENSE_TUNING.guard.moveScale,
        overrideX: 0,
        overrideZ: 0,
      };
    }

    const base = controls.boost ? 5.2 : 3.4;
    const mounted = this.mountedOn.has(combatant.id);
    return {
      speed: mounted ? base * MOUNT_SEPARATION.riderDriveScale : base,
      turnScale: mounted ? MOUNT_SEPARATION.riderDriveScale : 1,
      overrideX: 0,
      overrideZ: 0,
    };
  }

  /**
   * The forward run a charge carries through its active window, or null.
   *
   * A heavy attack that did not travel could only ever be walked into, which
   * made it strictly worse than a bite. Driving the attacker forward is what
   * turns it into something a defender has to actually answer.
   */
  private getChargeDrive(combatantId: string, elapsedSeconds: number): { x: number; z: number } | null {
    const attack = this.activeAttacks.get(combatantId);
    if (!attack) return null;

    const definition = ABILITY_DEFINITIONS.find(item => item.ability === attack.ability);
    if (!definition?.driveSpeed) return null;

    const timing = SCRIPTED_ASSEMBLY_ATTACKS[attack.ability];
    const phase = getAttackPhase(attack, elapsedSeconds);
    const from = timing.strikeAt - timing.activeWindow * 1.5;
    const until = timing.strikeAt + timing.activeWindow;
    if (phase < from || phase > until) return null;

    const core = this.getCoreBody(combatantId);
    if (!core) return null;

    // Fastest at the moment of impact, tapering off through the follow-through.
    const ramp = phase <= timing.strikeAt
      ? (phase - from) / Math.max(timing.strikeAt - from, 1e-6)
      : 1 - (phase - timing.strikeAt) / Math.max(until - timing.strikeAt, 1e-6);
    const forward = getHorizontalAxis(core, new CANNON.Vec3(1, 0, 0));
    const speed = definition.driveSpeed * Math.max(0, ramp);
    return { x: forward.x * speed, z: forward.z * speed };
  }

  /**
   * Winged genotypes leap on boost: WW/Ww dragons get airborne, ww dragons stay
   * planted — inherited wings visibly change how they move.
   *
   * One beat per cooldown, never while standing on another dragon, and never
   * above a ceiling. Applying lift on every frame boost was held is what let
   * the challenger park itself on the player's back and stay there: it held
   * boost permanently, so it never came down.
   */
  private applyWingFlap(
    combatant: BattleCombatant,
    core: CANNON.Body,
    controls: ArenaControlFrame,
    elapsedSeconds: number,
  ): void {
    if (!controls.boost || this.mountedOn.has(combatant.id)) {
      return;
    }

    const wingCount = combatant.assembly.parts.filter(part => part.roles?.includes('wing')).length;
    if (!wingCount) {
      return;
    }

    const corePart = combatant.assembly.parts.find(part => part.id === combatant.corePartId);
    const grounded = (corePart?.position.y ?? 1) * WING_FLAP.groundedRatio;
    if (core.position.y > grounded) {
      return;
    }

    const last = this.lastFlapAt.get(combatant.id);
    if (last !== undefined && elapsedSeconds - last < WING_FLAP.cooldownSeconds) {
      return;
    }

    this.lastFlapAt.set(combatant.id, elapsedSeconds);
    core.applyImpulse(new CANNON.Vec3(
      0,
      Math.min(wingCount, WING_FLAP.maxWings) * core.mass * WING_FLAP.impulsePerWing,
      0,
    ));
  }

  /**
   * Actuated stance: dragons fight standing up and facing their opponent, like a
   * real animal, instead of slumping into a passive ragdoll between inputs.
   */
  private applyDragonStance(
    combatant: BattleCombatant,
    core: CANNON.Body,
    controls: ArenaControlFrame,
    elapsedSeconds: number,
  ): void {
    // Flattened by a charge: no ride height, no upright assist, no aim. The
    // dragon lies where it landed until the knockdown expires, which is the
    // only thing that makes the heavy attack feel heavy.
    if (this.isKnockedDown(combatant.id, elapsedSeconds)) {
      return;
    }

    this.applyDragonRideHeight(combatant, core);

    // Upright assist: torque that rotates body-up toward world-up, damped so the
    // dragon settles instead of wobbling. A cross product alone has no preferred
    // direction when the dragon is exactly upside down, so choose its forward
    // axis as the recovery axis in that singular case.
    const up = core.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
    let correctionX = -up.z;
    let correctionZ = up.x;
    let correctionLength = Math.hypot(correctionX, correctionZ);

    if (up.y < 0) {
      if (correctionLength < 0.1) {
        const forward = core.quaternion.vmult(new CANNON.Vec3(1, 0, 0));
        correctionX = forward.x;
        correctionZ = forward.z;
        correctionLength = Math.hypot(correctionX, correctionZ);
      }

      // Do not let the restoring torque fade while the body is in the inverted
      // hemisphere; it must keep turning until world-up is reachable again.
      if (correctionLength > 0.001) {
        correctionX /= correctionLength;
        correctionZ /= correctionLength;
      }
    }

    const uprightStrength = 45 * core.mass;
    const spinDamping = 8 * core.mass;
    core.applyTorque(new CANNON.Vec3(
      correctionX * uprightStrength - core.angularVelocity.x * spinDamping,
      0,
      correctionZ * uprightStrength - core.angularVelocity.z * spinDamping,
    ));

    // Unload the legs and wings while badly overturned so the restoring torque
    // can roll the body instead of grinding it against the floor indefinitely.
    // The force fades before the dragon is upright, so this is recovery rather
    // than hovering.
    if (up.y < 0.25 && core.velocity.y < 2.4) {
      core.applyForce(new CANNON.Vec3(
        0,
        core.mass * 26 * (0.25 - up.y),
        0,
      ));
    }

    // Soft auto-face: when the player is not steering, gently yaw toward the
    // opponent so bites aim somewhere sensible. Steering always overrides it.
    if (Math.abs(controls.steer) >= 0.05) {
      return;
    }

    const opponentCore = this.getOpponentCoreBody(combatant.id);
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

  /**
   * Root suspension holds the torso at the blueprint's authored standing
   * height. This replaces support from foot contacts without making the dragon
   * kinematic: gravity, jumps, falls, knockdowns, and recovery still operate on
   * the physical core.
   */
  private applyDragonRideHeight(combatant: BattleCombatant, core: CANNON.Body): void {
    const corePart = combatant.assembly.parts.find(part => part.id === combatant.corePartId);
    if (!corePart) return;

    const shapeHalfHeight = corePart.shape === 'sphere'
      ? corePart.dimensions.x
      : corePart.dimensions.y / 2;
    const targetHeight = Math.max(corePart.position.y, shapeHalfHeight + 0.3);
    const heightError = targetHeight - core.position.y;

    // Gravity compensation plus a damped spring. Never apply a downward drive:
    // a dragon launched above its stance height should fall naturally.
    let supportAcceleration = Math.max(0, Math.min(
      48,
      9.82 + heightError * 30 - core.velocity.y * 9,
    ));

    // A dragon standing on another one gets no support of its own — it should
    // fall off, not hover at its stance height on top of the pile. A carrier
    // holds only itself up, so the pin collapses under the rider's weight
    // instead of being propped up by the very spring meant to model legs.
    if (this.mountedOn.has(combatant.id)) {
      supportAcceleration = 0;
    } else if (this.isCarrying(combatant.id)) {
      supportAcceleration *= 0.45;
    }

    core.applyForce(new CANNON.Vec3(0, core.mass * supportAcceleration, 0));
  }

  /**
   * Recomputes which torsos are riding on which.
   *
   * Done once per step, before any controller runs, so every dragon reads the
   * same mount state regardless of the order combatants are processed in — a
   * carrier must not still be jacking up a rider that an earlier iteration
   * already decided had slid off.
   */
  private updateMountState(elapsedSeconds: number): void {
    this.mountedOn.clear();
    const cores = this.getCoreBodies();

    for (const rider of cores) {
      const riderMeta = this.bodyMetaById.get(rider.id);
      if (!riderMeta) continue;

      for (const carrier of cores) {
        const carrierMeta = this.bodyMetaById.get(carrier.id);
        if (!carrierMeta || carrierMeta.combatantId === riderMeta.combatantId) continue;

        const slide = resolveMountSlide(rider, riderMeta, carrier, carrierMeta);
        if (!slide) continue;

        // The longer a pin lasts the harder it pushes, so however hard a rider
        // drives back on, the exchange has a bounded length. This is the
        // guarantee the old separation was missing: it pushed at a constant
        // speed the rider's own drive could simply out-run.
        const since = this.mountedSince.get(riderMeta.combatantId) ?? elapsedSeconds;
        this.mountedSince.set(riderMeta.combatantId, since);
        const escalation = 1 + (MOUNT_SEPARATION.slideEscalation - 1)
          * Math.min(1, (elapsedSeconds - since) / MOUNT_SEPARATION.escalationSeconds);

        this.mountedOn.set(riderMeta.combatantId, {
          carrierId: carrierMeta.combatantId,
          slide: { x: slide.x * escalation, z: slide.z * escalation },
        });
        break;
      }
    }

    /*
     * A pin's clock survives a brief loss of contact.
     *
     * A rider bouncing on its carrier crosses the mount threshold several times
     * a second, and clearing the clock on every one of those restarted the
     * escalation from zero — so the separation never grew and the ride went on
     * far longer than the escalation was supposed to allow. Only a rider that
     * has genuinely been off for a moment gets a fresh start.
     */
    for (const [combatantId, since] of Array.from(this.mountedSince.entries())) {
      if (this.mountedOn.has(combatantId)) {
        this.lastMountedAt.set(combatantId, elapsedSeconds);
        continue;
      }

      const lastSeen = this.lastMountedAt.get(combatantId) ?? since;
      if (elapsedSeconds - lastSeen >= MOUNT_SEPARATION.dismountGraceSeconds) {
        this.mountedSince.delete(combatantId);
        this.lastMountedAt.delete(combatantId);
      }
    }
  }

  /**
   * A carrier throws off a rider on its own, without being asked.
   *
   * The manual buck is still there and still stronger, but it cannot be the
   * only way out: a student being stood on may not know the move exists, and
   * "press the button you were never told about" is not a mechanic. This makes
   * a pin something that costs the rider time rather than something that ends
   * the fight.
   */
  private applyAutoShrug(carrierId: string, elapsedSeconds: number): void {
    for (const [riderId, mount] of this.mountedOn) {
      if (mount.carrierId !== carrierId) continue;

      const since = this.mountedSince.get(riderId);
      if (since === undefined || elapsedSeconds - since < MOUNT_SEPARATION.autoShrugAfterSeconds) {
        continue;
      }

      const lastShrug = this.lastBuckAt.get(carrierId);
      if (
        lastShrug !== undefined
        && elapsedSeconds - lastShrug < MOUNT_SEPARATION.autoShrugIntervalSeconds
      ) {
        continue;
      }

      const riderCore = this.getCoreBody(riderId);
      if (!riderCore) continue;

      const length = Math.hypot(mount.slide.x, mount.slide.z) || 1;
      riderCore.wakeUp();
      riderCore.applyImpulse(new CANNON.Vec3(
        (mount.slide.x / length) * riderCore.mass * MOUNT_SEPARATION.autoShrugImpulse,
        riderCore.mass * MOUNT_SEPARATION.autoShrugImpulse * 0.35,
        (mount.slide.z / length) * riderCore.mass * MOUNT_SEPARATION.autoShrugImpulse,
      ));
      // Carried in the reaction channel as well as the impulse: the rider's own
      // controller assigns horizontal velocity outright each frame and would
      // otherwise erase the throw before it travelled anywhere.
      this.attackReactions.set(riderId, new CANNON.Vec3(
        (mount.slide.x / length) * MOUNT_SEPARATION.autoShrugImpulse * 0.6,
        0,
        (mount.slide.z / length) * MOUNT_SEPARATION.autoShrugImpulse * 0.6,
      ));
      this.lastBuckAt.set(carrierId, elapsedSeconds);
    }
  }

  /**
   * Being stood on hurts, slowly.
   *
   * Without a cost, a pin is only an annoyance and there is no reason for
   * either dragon to care how it ends. With one — and with the escalating
   * slide and the automatic shrug guaranteeing it ends — a mount becomes a
   * brief advantage worth taking rather than a stalemate.
   */
  private getCrushDamageEvents(state: BattleArenaState): BattleDamageEvent[] {
    const events: BattleDamageEvent[] = [];

    for (const [riderId, mount] of this.mountedOn) {
      const carrier = state.combatants.find(item => item.id === mount.carrierId);
      if (!carrier) continue;

      const lastCrush = this.lastCrushAt.get(riderId);
      if (
        lastCrush !== undefined
        && state.elapsedSeconds - lastCrush < MOUNT_SEPARATION.crushIntervalSeconds
      ) {
        continue;
      }

      this.lastCrushAt.set(riderId, state.elapsedSeconds);
      events.push({
        bodyKey: getBodyKey(carrier.id, carrier.corePartId),
        amount: MOUNT_SEPARATION.crushDamage,
        reason: 'pinned',
      });
    }

    return events;
  }

  /**
   * Horizontal separation velocity for a torso, added on top of the requested
   * move rather than replacing it.
   *
   * Two cases, both measured in the other torso's own frame so a dragon is
   * treated as the long box it is instead of as a fat cylinder that would hold
   * the pair further apart than a bite can reach:
   *
   * - *Riding*: this torso is sitting on the other one. It slides off along
   *   whichever footprint axis it is nearest to leaving.
   * - *Crowding*: the two are at the same height and inside their summed
   *   half-widths. A soft push keeps them from merging into one silhouette.
   */
  private resolveCoreSeparation(combatantId: string, core: CANNON.Body): { x: number; z: number } {
    const meta = this.bodyMetaById.get(core.id);
    if (!meta) return { x: 0, z: 0 };

    const mount = this.mountedOn.get(combatantId);
    let x = mount?.slide.x ?? 0;
    let z = mount?.slide.z ?? 0;

    for (const other of this.getCoreBodies()) {
      const otherMeta = this.bodyMetaById.get(other.id);
      if (!otherMeta || otherMeta.combatantId === combatantId) continue;
      // Already handled by the slide; a crowding push on the same pair would
      // fight it for control of the exit direction.
      if (mount?.carrierId === otherMeta.combatantId) continue;

      const dx = core.position.x - other.position.x;
      const dz = core.position.z - other.position.z;
      const personalSpace = (meta.half.width + otherMeta.half.width) * CORE_PERSONAL_SPACE_RATIO;
      const distance = Math.hypot(dx, dz);
      if (distance >= personalSpace) continue;

      // Exactly coincident centres have no separating direction of their own;
      // fall back to the other torso's flank so the pair still parts.
      const flank = getHorizontalAxis(other, new CANNON.Vec3(0, 0, 1));
      const nx = distance > 1e-4 ? dx / distance : flank.x;
      const nz = distance > 1e-4 ? dz / distance : flank.z;
      const overlap = (personalSpace - distance) / personalSpace;
      x += nx * overlap * MOUNT_SEPARATION.slideSpeed * 0.5;
      z += nz * overlap * MOUNT_SEPARATION.slideSpeed * 0.5;
    }

    return { x, z };
  }

  /**
   * Boost while something is standing on you throws it off.
   *
   * Without this a rider can only ever be waited out, which is what made a
   * pin unrecoverable: the carrier had no input that addressed the one thing
   * happening to it.
   */
  private applyBuck(carrierId: string, core: CANNON.Body, elapsedSeconds: number): void {
    const last = this.lastBuckAt.get(carrierId);
    if (last !== undefined && elapsedSeconds - last < MOUNT_SEPARATION.buckCooldownSeconds) {
      return;
    }

    for (const [riderId, mount] of this.mountedOn) {
      if (mount.carrierId !== carrierId) continue;

      const riderCore = this.getCoreBody(riderId);
      if (!riderCore) continue;

      const slide = mount.slide;
      const length = Math.hypot(slide.x, slide.z) || 1;
      riderCore.wakeUp();
      riderCore.applyImpulse(new CANNON.Vec3(
        (slide.x / length) * riderCore.mass * MOUNT_SEPARATION.buckImpulse,
        riderCore.mass * MOUNT_SEPARATION.buckLift,
        (slide.z / length) * riderCore.mass * MOUNT_SEPARATION.buckImpulse,
      ));
      // Routed through the attack reaction so the rider's own controller keeps
      // carrying the throw for a few frames instead of overwriting it next step.
      this.attackReactions.set(riderId, new CANNON.Vec3(
        (slide.x / length) * MOUNT_SEPARATION.slideSpeed,
        0,
        (slide.z / length) * MOUNT_SEPARATION.slideSpeed,
      ));
      this.lastBuckAt.set(carrierId, elapsedSeconds);
    }
  }

  private isCarrying(combatantId: string): boolean {
    for (const mount of this.mountedOn.values()) {
      if (mount.carrierId === combatantId) return true;
    }
    return false;
  }

  private getCoreBodies(): CANNON.Body[] {
    const cores: CANNON.Body[] = [];
    for (const [bodyKey, body] of this.bodies.entries()) {
      const meta = this.bodyMetaById.get(body.id);
      if (meta?.isCore && bodyKey === meta.bodyKey) cores.push(body);
    }
    return cores;
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

  private getCoreBody(combatantId: string): CANNON.Body | null {
    for (const [bodyKey, body] of this.bodies.entries()) {
      const meta = this.bodyMetaById.get(body.id);

      if (meta?.combatantId === combatantId && meta.isCore && bodyKey === meta.bodyKey) {
        return body;
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Defence.
  // ---------------------------------------------------------------------------

  /**
   * Advances guards, rolls, and knockdowns for the frame.
   *
   * Guard is a held state with a budget: it drains while braced, refills while
   * not, and collapses into a recovery window if held to the end. Dodge is a
   * one-shot with an invulnerable middle. Both are refused outright to a dragon
   * that is already on the floor, which is what gives the charge its teeth.
   */
  private updateDefenses(
    state: BattleArenaState,
    controlFrames: ControlFrameByCombatant,
    deltaSeconds: number,
  ): void {
    const now = state.elapsedSeconds;

    for (const [combatantId, dodge] of this.activeDodges) {
      if (now - dodge.startedAtSeconds >= DEFENSE_TUNING.dodge.durationSeconds) {
        this.activeDodges.delete(combatantId);
      }
    }

    for (const combatant of state.combatants) {
      if (combatant.controlMode !== 'dragon-attack') continue;

      const controls = controlFrames[combatant.id] ?? EMPTY_CONTROL_FRAME;
      const disabled = this.isKnockedDown(combatant.id, now) || this.mountedOn.has(combatant.id);
      const guard = this.guardStates.get(combatant.id)
        ?? { heldSeconds: 0, recoveredAtSeconds: null };

      // A collapsed brace stays down until its recovery elapses, however hard
      // the button is held — otherwise "hold guard forever" is still the answer
      // to every question the fight can ask.
      if (guard.recoveredAtSeconds !== null && now >= guard.recoveredAtSeconds) {
        guard.recoveredAtSeconds = null;
        guard.heldSeconds = 0;
      }

      // Dodge is resolved first so that a frame asking for both takes the roll.
      // A program can legitimately request either answer to the same threat,
      // and the roll is the one that has to win: it is the committed, timed
      // option, and it is over in half a second either way.
      if (controls.dodge && !disabled) {
        this.startDodge(combatant, controls, now);
      }

      const wantsGuard = Boolean(controls.guard) && !disabled && !this.activeDodges.has(combatant.id);
      if (wantsGuard && guard.recoveredAtSeconds === null) {
        guard.heldSeconds += deltaSeconds;
        if (guard.heldSeconds >= DEFENSE_TUNING.guard.maxHoldSeconds) {
          guard.recoveredAtSeconds = now + DEFENSE_TUNING.guard.recoverySeconds;
        }
      } else if (guard.recoveredAtSeconds === null) {
        // Recovers at half the rate it drains, so trading brace for stamina is
        // a real decision rather than a free default stance.
        guard.heldSeconds = Math.max(0, guard.heldSeconds - deltaSeconds * 0.5);
      }

      this.guardStates.set(combatant.id, guard);
    }
  }

  private startDodge(combatant: BattleCombatant, controls: ArenaControlFrame, now: number): void {
    if (this.activeDodges.has(combatant.id)) return;
    const last = this.lastDodgeAt.get(combatant.id);
    if (last !== undefined && now - last < DEFENSE_TUNING.dodge.cooldownSeconds) return;

    const core = this.getCoreBody(combatant.id);
    if (!core) return;

    const forward = getHorizontalAxis(core, new CANNON.Vec3(1, 0, 0));
    const right = getHorizontalAxis(core, new CANNON.Vec3(0, 0, 1));
    let x = forward.x * controls.throttle + right.x * controls.strafe;
    let z = forward.z * controls.throttle + right.z * controls.strafe;

    // No direction held: roll away from whoever is threatening, which is what a
    // player pressing dodge alone means by it.
    if (Math.hypot(x, z) < 0.05) {
      const opponent = this.getOpponentCoreBody(combatant.id);
      if (opponent) {
        x = core.position.x - opponent.position.x;
        z = core.position.z - opponent.position.z;
      } else {
        x = -forward.x;
        z = -forward.z;
      }
    }

    const length = Math.hypot(x, z) || 1;
    this.activeDodges.set(combatant.id, {
      startedAtSeconds: now,
      direction: { x: x / length, z: z / length },
    });
    this.lastDodgeAt.set(combatant.id, now);
    // Any move being wound up is abandoned: rolling out of a bite is a choice
    // to give up the bite.
    this.activeAttacks.delete(combatant.id);
  }

  private isGuarding(combatantId: string): boolean {
    const guard = this.guardStates.get(combatantId);
    return Boolean(guard) && guard!.recoveredAtSeconds === null && guard!.heldSeconds > 0;
  }

  private isInvulnerable(combatantId: string, now: number): boolean {
    const dodge = this.activeDodges.get(combatantId);
    if (!dodge) return false;
    const phase = (now - dodge.startedAtSeconds) / DEFENSE_TUNING.dodge.durationSeconds;
    return phase >= DEFENSE_TUNING.dodge.invulnerableFrom
      && phase <= DEFENSE_TUNING.dodge.invulnerableUntil;
  }

  private isKnockedDown(combatantId: string, now: number): boolean {
    const until = this.knockedDownUntil.get(combatantId);
    return until !== undefined && now < until;
  }

  private getDefenseSnapshot(combatantId: string, now: number): BattleDefenseSnapshot {
    const guard = this.guardStates.get(combatantId);
    const dodge = this.activeDodges.get(combatantId);

    return {
      combatantId,
      guarding: this.isGuarding(combatantId),
      guardFatigue: Math.min(1, (guard?.heldSeconds ?? 0) / DEFENSE_TUNING.guard.maxHoldSeconds),
      dodgePhase: dodge
        ? Math.min(1, (now - dodge.startedAtSeconds) / DEFENSE_TUNING.dodge.durationSeconds)
        : null,
      invulnerable: this.isInvulnerable(combatantId, now),
      knockedDown: this.isKnockedDown(combatantId, now),
    };
  }

  private getDefenseSnapshots(state: BattleArenaState): BattleDefenseSnapshot[] {
    return state.combatants.map(combatant =>
      this.getDefenseSnapshot(combatant.id, state.elapsedSeconds));
  }

  /**
   * Rewrites a frame's damage through whatever the target was doing about it:
   * a roll's invulnerable window drops the event entirely, a brace keeps a
   * fraction of it and marks the event so the log can say the hit was blocked.
   */
  private applyDefenseMitigation(
    state: BattleArenaState,
    events: BattleDamageEvent[],
  ): BattleDamageEvent[] {
    const mitigated: BattleDamageEvent[] = [];

    for (const event of events) {
      const combatantId = this.bodyOwner(event.bodyKey);
      if (!combatantId) {
        mitigated.push(event);
        continue;
      }

      if (this.isInvulnerable(combatantId, state.elapsedSeconds)) {
        continue;
      }

      if (this.isGuarding(combatantId)) {
        mitigated.push({
          ...event,
          amount: event.amount * DEFENSE_TUNING.guard.damageTaken,
          mitigatedBy: 'guard',
        });
        continue;
      }

      mitigated.push(event);
    }

    return mitigated;
  }

  private bodyOwner(bodyKey: string): string | null {
    for (const meta of this.bodyMetaById.values()) {
      if (meta.bodyKey === bodyKey) return meta.combatantId;
    }
    return null;
  }

  private updateScriptedAttacks(
    state: BattleArenaState,
    controlFrames: ControlFrameByCombatant,
  ): void {
    const combatantIds = new Set(state.combatants.map(combatant => combatant.id));
    for (const [combatantId, attack] of this.activeAttacks) {
      const timing = SCRIPTED_ASSEMBLY_ATTACKS[attack.ability];
      if (
        !combatantIds.has(combatantId)
        || state.elapsedSeconds - attack.startedAtSeconds >= timing.durationSeconds
      ) {
        this.activeAttacks.delete(combatantId);
      }
    }

    for (const combatant of state.combatants) {
      if (combatant.controlMode !== 'dragon-attack' || this.activeAttacks.has(combatant.id)) {
        continue;
      }

      // A dragon that is braced, rolling, flattened, or standing on somebody is
      // busy. Committing to defence means giving up offence for its duration —
      // that trade is the whole point of having a defence.
      if (
        this.isGuarding(combatant.id)
        || this.activeDodges.has(combatant.id)
        || this.isKnockedDown(combatant.id, state.elapsedSeconds)
        || this.mountedOn.has(combatant.id)
      ) {
        continue;
      }

      const ability = requestedAttack(controlFrames[combatant.id]);
      if (!ability || !this.isAbilityReady(combatant.id, ability, state.elapsedSeconds)) {
        continue;
      }

      this.activeAttacks.set(combatant.id, {
        ability,
        startedAtSeconds: state.elapsedSeconds,
        hitResolved: false,
      });
      this.lastAttackStartedAt.set(`${combatant.id}:${ability}`, state.elapsedSeconds);
    }
  }

  /**
   * Per-move cooldowns, enforced at the point a move is *started*.
   *
   * The catalog has always carried a `cooldownSeconds` for every ability and
   * nothing read it, so the only limit on a move was the length of its own
   * animation. That is why the fight had no rhythm: the heavy hitters cost
   * exactly as much to throw as the light ones.
   */
  private isAbilityReady(combatantId: string, ability: AssemblyAbilityId, now: number): boolean {
    const cooldown = ABILITY_DEFINITIONS.find(item => item.ability === ability)?.cooldownSeconds;
    if (cooldown === undefined) return true;
    const last = this.lastAttackStartedAt.get(`${combatantId}:${ability}`);
    return last === undefined || now - last >= cooldown;
  }

  private getAttackPoses(elapsedSeconds: number): BattleAttackPoseSnapshot[] {
    return Array.from(this.activeAttacks.entries()).map(([combatantId, attack]) => ({
      combatantId,
      ability: attack.ability,
      phase: getAttackPhase(attack, elapsedSeconds),
    }));
  }

  private getAbilityDamageEvents(state: BattleArenaState): BattleDamageEvent[] {
    const events: BattleDamageEvent[] = [];

    for (const combatant of state.combatants) {
      const attack = this.activeAttacks.get(combatant.id);
      if (!attack || attack.ability === 'fire-breath' || attack.hitResolved) continue;
      const definition = ABILITY_DEFINITIONS.find(item => item.ability === attack.ability);
      if (!definition) continue;
      this.collectAbilityHit(events, combatant, attack, definition, state.elapsedSeconds);
    }

    return events;
  }

  private collectAbilityHit(
    events: BattleDamageEvent[],
    combatant: BattleCombatant,
    attack: ActiveScriptedAttack,
    definition: AbilityDefinition,
    elapsedSeconds: number,
  ): void {
    const timing = SCRIPTED_ASSEMBLY_ATTACKS[attack.ability];
    const phase = getAttackPhase(attack, elapsedSeconds);
    const activeFrom = timing.strikeAt - timing.activeWindow / 2;
    const activeUntil = timing.strikeAt + timing.activeWindow / 2;
    if (phase < activeFrom) {
      return;
    }

    const target = this.findScriptedAttackTarget(combatant.id, timing.range, timing.coneDot);
    if (target) {
      const attackerMultiplier = definition.usesAttackerMultiplier
        ? getBestRoleDamageMultiplier(combatant, definition.role)
        : 1;
      events.push({
        bodyKey: target.bodyKey,
        amount: definition.baseDamage * attackerMultiplier,
        reason: definition.ability,
      });
      if (definition.knockback) {
        this.applyAbilityKnockback(combatant.id, target.combatantId, definition, elapsedSeconds);
      }
    }

    // One authored strike per move. Leave the window open for a few frames so a
    // moving opponent can enter it, then resolve the miss deterministically.
    if (target || phase >= activeUntil) attack.hitResolved = true;
  }

  private findScriptedAttackTarget(
    attackerId: string,
    range: number,
    coneDot: number | null,
  ): BodyMeta | null {
    const attacker = this.getCoreBody(attackerId);
    if (!attacker) return null;
    const forward = getHorizontalAxis(attacker, new CANNON.Vec3(1, 0, 0));
    let nearest: { meta: BodyMeta; distance: number } | null = null;

    for (const body of this.bodies.values()) {
      const meta = this.bodyMetaById.get(body.id);
      if (!meta?.isCore || meta.combatantId === attackerId) continue;
      const dx = body.position.x - attacker.position.x;
      const dz = body.position.z - attacker.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.001 || Math.abs(body.position.y - attacker.position.y) > 2) {
        continue;
      }
      /*
       * Range is measured to the target's *hide*, not to the point at its
       * centre.
       *
       * Every authored range already budgets for the attacker's own torso
       * (`TORSO_REACH`) and nothing budgeted for the defender's. A dragon torso
       * is 3.8 units long, so two dragons standing chest to chest have their
       * cores 3.8 apart — further than a bite's 2.7 reach. The result was that
       * melee could not connect at all between two dragons, and the only thing
       * that ever did anything was running into each other. Measuring to the
       * surface is what makes a move that visibly touches an opponent count as
       * having touched it.
       */
      const reach = distance - horizontalSupport(body, meta, dx / distance, dz / distance);
      if (reach > range) {
        continue;
      }
      if (coneDot !== null && (dx * forward.x + dz * forward.z) / distance < coneDot) {
        continue;
      }
      if (!nearest || distance < nearest.distance) nearest = { meta, distance };
    }

    return nearest?.meta ?? null;
  }

  /** Cone AoE damage ticks during the active portion of the scripted fire move. */
  private getFireBreathDamageEvents(state: BattleArenaState): BattleDamageEvent[] {
    const events: BattleDamageEvent[] = [];

    for (const combatant of state.combatants) {
      const attack = this.activeAttacks.get(combatant.id);
      if (!attack || attack.ability !== 'fire-breath' || !isFireAttackActive(attack, state.elapsedSeconds)) {
        continue;
      }

      const cooldownKey = `${combatant.id}:fire-breath`;
      const lastTick = this.lastAbilityHitAt.get(cooldownKey);
      if (lastTick !== undefined && state.elapsedSeconds - lastTick < FIRE_BREATH_TICK_SECONDS) {
        continue;
      }

      const cone = this.getFireCone(combatant.id);
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

  private getFireCones(state: BattleArenaState): FireConeSnapshot[] {
    const cones: FireConeSnapshot[] = [];
    for (const combatant of state.combatants) {
      const attack = this.activeAttacks.get(combatant.id);
      if (!attack || attack.ability !== 'fire-breath' || !isFireAttackActive(attack, state.elapsedSeconds)) {
        continue;
      }
      const cone = this.getFireCone(combatant.id);
      if (cone) cones.push(cone);
    }
    return cones;
  }

  private getFireCone(combatantId: string): FireConeSnapshot | null {
    const core = this.getCoreBody(combatantId);
    if (!core) return null;
    const direction = getHorizontalAxis(core, new CANNON.Vec3(1, 0, 0));
    return {
      combatantId,
      origin: {
        x: core.position.x + direction.x * 1.15,
        y: core.position.y + 0.35,
        z: core.position.z + direction.z * 1.15,
      },
      direction: { x: direction.x, y: direction.y, z: direction.z },
    };
  }

  private applyAbilityKnockback(
    attackerId: string,
    targetId: string,
    definition: AbilityDefinition,
    elapsedSeconds: number,
  ): void {
    const attackerCore = this.getCoreBody(attackerId);
    const targetCore = this.getCoreBody(targetId);
    if (!attackerCore || !targetCore) return;

    const direction = targetCore.position.vsub(attackerCore.position);
    direction.y = 0;
    if (direction.lengthSquared() < 0.001) return;
    direction.normalize();

    // A braced dragon is moved barely at all and never goes down. Standing your
    // ground against a charge is the horned genotype's whole reward.
    const guarding = this.isGuarding(targetId);
    const scale = guarding ? DEFENSE_TUNING.guard.knockbackScale : 1;

    targetCore.wakeUp();
    this.attackReactions.set(targetId, new CANNON.Vec3(
      direction.x * 2.4 * scale,
      0,
      direction.z * 2.4 * scale,
    ));
    targetCore.applyImpulse(new CANNON.Vec3(
      direction.x * (6 + targetCore.mass * 1.5) * scale,
      (2.5 + targetCore.mass * 0.4) * scale,
      direction.z * (6 + targetCore.mass * 1.5) * scale,
    ));

    if (definition.knockdown && !guarding) {
      this.knockedDownUntil.set(targetId, elapsedSeconds + KNOCKDOWN_SECONDS);
      // Spun as it falls, so the knockdown reads as being bowled over rather
      // than as the dragon suddenly refusing to respond.
      targetCore.applyTorque(new CANNON.Vec3(
        direction.z * targetCore.mass * 90,
        0,
        -direction.x * targetCore.mass * 90,
      ));
      this.activeAttacks.delete(targetId);
      this.guardStates.delete(targetId);
    }
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

  private getBrokenJointDamageEvents(state: BattleArenaState): BattleDamageEvent[] {
    const events: BattleDamageEvent[] = [];
    const isDragonPractice = this.currentSetupStyleId === 'dragon-wing-test';
    const isRacePractice = this.currentSetupStyleId === 'pinewood-derby-test';

    if (this.currentSetup.physics?.jointBreakageEnabled === false || isDragonPractice || isRacePractice) {
      return events;
    }

    if (state.elapsedSeconds < SPAWN_GRACE_SECONDS) {
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

      // Genotype scaling changes dragon mass and motor load without changing
      // the catalog break-force metadata. Treating solver load as impact stress
      // therefore tears healthy wings and feet off as soon as a duel starts.
      // Dragon battles are decided by part health; keep their joints intact.
      const combatant = state.combatants.find(item => item.id === trackedJoint.combatantId);
      if (combatant?.controlMode === 'dragon-attack') {
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

/**
 * Slide-off velocity for `rider` if it is standing on `carrier`, else null.
 *
 * The footprint test runs in the carrier's horizontal frame, and the exit is
 * taken along whichever of its two axes the rider is closest to clearing —
 * across the flank for a rider near the ribs, off the nose or tail for one
 * near either end. Picking the nearest edge rather than a fixed direction is
 * what stops a rider being pushed the long way down a torso it was already
 * halfway off.
 */
function resolveMountSlide(
  rider: CANNON.Body,
  riderMeta: BodyMeta,
  carrier: CANNON.Body,
  carrierMeta: BodyMeta,
): { x: number; z: number } | null {
  const rise = rider.position.y - carrier.position.y;
  const stackHeight = (riderMeta.half.height + carrierMeta.half.height) * MOUNT_SEPARATION.heightRatio;
  if (stackHeight <= 0 || rise <= stackHeight) return null;

  const forward = getHorizontalAxis(carrier, new CANNON.Vec3(1, 0, 0));
  const flank = getHorizontalAxis(carrier, new CANNON.Vec3(0, 0, 1));
  const dx = rider.position.x - carrier.position.x;
  const dz = rider.position.z - carrier.position.z;
  const along = dx * forward.x + dz * forward.z;
  const across = dx * flank.x + dz * flank.z;

  const slack = MOUNT_SEPARATION.footprintSlack;
  const limitAlong = carrierMeta.half.length + riderMeta.half.length * slack;
  const limitAcross = carrierMeta.half.width + riderMeta.half.width * slack;
  if (Math.abs(along) >= limitAlong || Math.abs(across) >= limitAcross) return null;

  // Full speed once the rider is clear of the carrier's back, tapering to zero
  // as it descends past the stack threshold, so the push fades out instead of
  // flinging a dragon that has already landed beside its opponent.
  const engagement = Math.min(1, rise / stackHeight - 1);
  const speed = MOUNT_SEPARATION.slideSpeed * engagement;
  const exitAcross = limitAcross - Math.abs(across) <= limitAlong - Math.abs(along);
  const axis = exitAcross ? flank : forward;
  const offset = exitAcross ? across : along;
  // Dead centre has no side of its own; a torso is narrower across than along,
  // so leaving by the flank is the shorter trip either way.
  const sign = Math.abs(offset) > 1e-4 ? Math.sign(offset) : 1;

  return { x: axis.x * sign * speed, z: axis.z * sign * speed };
}

function toCannonVec3(vector: Vector3Data): CANNON.Vec3 {
  return new CANNON.Vec3(vector.x, vector.y, vector.z);
}


function withoutConnectedCollision<T extends CANNON.Constraint>(constraint: T): T {
  constraint.collideConnected = false;
  return constraint;
}

/**
 * Which move a control frame is asking for.
 *
 * Ordered by commitment, heaviest first: if a student is somehow holding two
 * buttons, the one they had to mean is the one that costs the most to throw.
 */
function requestedAttack(controls: ArenaControlFrame | undefined): AssemblyAbilityId | null {
  if (controls?.hornCharge) return 'horn-charge';
  if (controls?.fireAttack) return 'fire-breath';
  if (controls?.biteAttack) return 'bite';
  if (controls?.wingAttack) return 'wing-buffet';
  if (controls?.tailAttack) return 'tail-sweep';
  if (controls?.clawAttack) return 'claw-rake';
  return null;
}

function getAttackPhase(attack: ActiveScriptedAttack, elapsedSeconds: number): number {
  const duration = SCRIPTED_ASSEMBLY_ATTACKS[attack.ability].durationSeconds;
  return Math.max(0, Math.min(1, (elapsedSeconds - attack.startedAtSeconds) / duration));
}

function isFireAttackActive(attack: ActiveScriptedAttack, elapsedSeconds: number): boolean {
  const phase = getAttackPhase(attack, elapsedSeconds);
  return phase >= 0.32 && phase <= 0.92;
}

function getBestRoleDamageMultiplier(
  combatant: BattleCombatant,
  role: AssemblyPartRole,
): number {
  let best = 1;
  for (const part of combatant.assembly.parts) {
    if (!part.roles?.includes(role)) continue;
    best = Math.max(best, combatant.combatProfile.parts[part.id]?.damageMultiplier ?? 1);
  }
  return best;
}

/** The shared torso support function, fed from a live physics body. */
function horizontalSupport(
  body: CANNON.Body,
  meta: BodyMeta,
  dirX: number,
  dirZ: number,
): number {
  const forward = getHorizontalAxis(body, new CANNON.Vec3(1, 0, 0));
  return horizontalTorsoSupport(meta.half, forward.x, forward.z, dirX, dirZ);
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
