import * as THREE from 'three';
import { Vector3Data } from '../../assembly/domain/assembly.models';
import { RenderQuality } from '../../assembly/rendering/render-quality';

/**
 * The layer that makes a hit feel like a hit.
 *
 * Before this, the arena's entire response to a landed blow was a 240ms
 * emissive flash: a 12-damage core strike and a 2-damage graze looked
 * identical, and the physics — which does real impact-velocity damage, joint
 * severing, and knockdowns — was almost entirely illegible. Everything here
 * exists to put the *magnitude* of a hit on screen.
 *
 * Four effects, ordered by how much they buy per unit of cost:
 *
 * 1. **Camera shake.** Free, and by far the largest felt difference. Nothing
 *    else communicates "that one hurt" so cheaply.
 * 2. **Hit-stop.** A few frames of slowed time on a heavy blow. This is the
 *    oldest trick in fighting games and it works because it gives the eye time
 *    to register the contact before the bodies separate.
 * 3. **Sparks.** One pooled particle system, additive, in the arena's ember
 *    hue — the only saturated colour the Berk palette allows, so impacts read
 *    as fire-adjacent rather than as a foreign effect.
 * 4. **Dust.** Ground puffs on a knockdown, which is what sells a body's weight.
 *
 * Everything is pooled and allocation-free per frame: a duel runs at 60fps on a
 * school Chromebook and a `new` inside the update loop is a stutter.
 *
 * Motion here is deliberate and physical, not decorative — but it is still
 * motion, and `reducedMotion` scales the whole layer down to near-nothing for
 * anyone who has asked for that.
 */

export interface ArenaImpact {
  position: Vector3Data;
  /** 0..1, from damage taken relative to the part's maximum health. */
  severity: number;
}

/** How many sparks a full-severity hit throws. */
const SPARKS_PER_HIT = 22;
const SPARK_BUDGET = 320;
const DUST_BUDGET = 8;

const SHAKE_DECAY_PER_SECOND = 7.5;
/** World units of camera displacement at full amplitude. */
const SHAKE_REACH = 0.42;
/** Three frequencies that do not share a period, so the shake never loops. */
const SHAKE_RATES = [37, 23.5, 61] as const;

/** Names the wind-up ring in the scene graph, so tests can find it among the pools. */
export const TELEGRAPH_MESH_NAME = 'arena-telegraph';

/** Below this severity a hit is a graze: no stop, no dust, few sparks. */
const HEAVY_HIT_SEVERITY = 0.28;
const MAX_HIT_STOP_SECONDS = 0.11;

interface Spark {
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

interface Dust {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  spread: number;
}

export class ArenaImpactEffects {
  /** Per-frame camera displacement. Read after {@link update}. */
  readonly shakeOffset = new THREE.Vector3();

  private readonly sparks: Spark[] = [];
  private sparkPoints: THREE.Points | null = null;
  private sparkPositions: Float32Array | null = null;
  /**
   * Per-particle colour, which is also how a spark fades.
   *
   * `PointsMaterial` has no per-vertex alpha, and adding a custom shader for
   * one particle system is not worth the maintenance. Under additive blending
   * scaling a colour toward black *is* fading it — black contributes nothing —
   * so one attribute carries both hue and life.
   */
  private sparkColors: Float32Array | null = null;
  private nextSpark = 0;

  private readonly dust: Dust[] = [];
  private dustTexture: THREE.CanvasTexture | null = null;

  private readonly telegraphs = new Map<string, THREE.Mesh>();
  private telegraphTexture: THREE.CanvasTexture | null = null;

  private shakeAmplitude = 0;
  private pendingHitStop = 0;
  private elapsed = 0;

  private readonly particlesEnabled: boolean;

  constructor(
    private readonly scene: THREE.Scene,
    quality: RenderQuality,
    private readonly reducedMotion = false,
  ) {
    // Shake and hit-stop run everywhere — they cost nothing and they are the
    // whole point. Particles are the part that needs fill rate.
    this.particlesEnabled = quality !== 'low';
    if (this.particlesEnabled) {
      this.buildSparks();
      this.buildDust();
    }
  }

  /**
   * Registers a landed blow.
   *
   * Severity drives every channel at once, which is what keeps them reading as
   * one event rather than as three effects that happened to fire together.
   */
  report(impact: ArenaImpact): void {
    const severity = clamp01(impact.severity);
    if (severity <= 0) return;

    // Square-root, not linear: damage is mostly small, and a linear response
    // leaves the common case with no visible shake at all while the rare big
    // hit throws the camera off the stage.
    const weight = Math.sqrt(severity);

    this.shakeAmplitude = Math.min(1, this.shakeAmplitude + weight * 0.85);

    if (severity >= HEAVY_HIT_SEVERITY) {
      this.pendingHitStop = Math.min(
        MAX_HIT_STOP_SECONDS,
        Math.max(this.pendingHitStop, 0.045 + weight * 0.07),
      );
    }

    if (!this.particlesEnabled) return;

    const count = Math.max(4, Math.round(SPARKS_PER_HIT * weight));
    for (let index = 0; index < count; index += 1) {
      this.emitSpark(impact.position, weight, index);
    }

    if (severity >= HEAVY_HIT_SEVERITY) {
      this.emitDust(impact.position, weight);
    }
  }

  /**
   * The wind-up telegraph: a ring on the sand under a dragon that is about to
   * strike.
   *
   * The attack poses already wind up correctly — jaws gather, the tail coils —
   * but at arena distance, mid-scramble, a student cannot reliably read a limb
   * gathering as "a blow is coming", and a duel where the hit is the first
   * thing you notice is a duel you cannot learn to play.
   *
   * A ground ring rather than a glow on the dragon: the emissive channel is
   * already carrying hit flash and scorch, and three effects competing for one
   * material property is how you get a part that flickers between meanings. The
   * ring also says *where*, which a body glow does not.
   *
   * Pass `intensity` 0..1 rising through the wind-up; pass 0 to clear.
   */
  setTelegraph(combatantId: string, position: Vector3Data, intensity: number): void {
    if (!this.particlesEnabled) return;

    const strength = clamp01(intensity);
    let ring = this.telegraphs.get(combatantId);

    if (strength <= 0) {
      if (ring) ring.visible = false;
      return;
    }

    if (!ring) {
      this.telegraphTexture ??= createRingTexture();
      if (!this.telegraphTexture) return;
      ring = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: this.telegraphTexture,
          color: 0xff8c3a,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 1;
      ring.name = TELEGRAPH_MESH_NAME;
      this.telegraphs.set(combatantId, ring);
      this.scene.add(ring);
    }

    ring.visible = true;
    // Contracts as it charges. A ring closing in reads as a countdown; one
    // expanding reads as something that has already happened.
    const radius = 4.6 - strength * 1.9;
    ring.scale.set(radius, radius, 1);
    ring.position.set(position.x, 0.04, position.z);
    // Eased so the last moments before the strike brighten fastest.
    (ring.material as THREE.MeshBasicMaterial).opacity =
      strength * strength * (this.reducedMotion ? 0.75 : 0.6);
  }

  /**
   * Seconds of slowed time the physics step should apply, consumed on read.
   *
   * The caller owns the integrator, so it decides how to spend this — scaling
   * the step rather than skipping it, so contacts are not tunnelled through.
   */
  takeHitStopSeconds(): number {
    const seconds = this.pendingHitStop;
    this.pendingHitStop = 0;
    return this.reducedMotion ? 0 : seconds;
  }

  update(deltaSeconds: number): void {
    const delta = Math.min(Math.max(deltaSeconds, 0), 0.05);
    this.elapsed += delta;

    this.updateShake(delta);
    if (this.particlesEnabled) {
      this.updateSparks(delta);
      this.updateDust(delta);
    }
  }

  dispose(): void {
    if (this.sparkPoints) {
      this.scene.remove(this.sparkPoints);
      this.sparkPoints.geometry.dispose();
      const material = this.sparkPoints.material as THREE.PointsMaterial;
      material.map?.dispose();
      material.dispose();
      this.sparkPoints = null;
    }

    for (const dust of this.dust) {
      this.scene.remove(dust.mesh);
      dust.mesh.geometry.dispose();
      (dust.mesh.material as THREE.Material).dispose();
    }
    this.dust.length = 0;
    this.sparks.length = 0;

    for (const ring of this.telegraphs.values()) {
      this.scene.remove(ring);
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    }
    this.telegraphs.clear();

    this.dustTexture?.dispose();
    this.dustTexture = null;
    this.telegraphTexture?.dispose();
    this.telegraphTexture = null;
  }

  // -------------------------------------------------------------------------
  // Camera shake
  // -------------------------------------------------------------------------

  /**
   * Deterministic sine sum rather than random jitter.
   *
   * Random per-frame offsets read as a dropped frame or a loose cable; layered
   * sines at incommensurate rates read as a physical jolt travelling through
   * the camera rig, and they stay smooth at any frame rate.
   */
  private updateShake(delta: number): void {
    if (this.shakeAmplitude <= 1e-4) {
      this.shakeOffset.set(0, 0, 0);
      this.shakeAmplitude = 0;
      return;
    }

    // Exponential decay, frame-rate independent.
    this.shakeAmplitude *= Math.exp(-SHAKE_DECAY_PER_SECOND * delta);

    const reach = SHAKE_REACH * this.shakeAmplitude * (this.reducedMotion ? 0.15 : 1);
    const time = this.elapsed;
    this.shakeOffset.set(
      Math.sin(time * SHAKE_RATES[0]) * reach,
      // Vertical throw is smaller: a camera on a tripod pitches less than it yaws.
      Math.sin(time * SHAKE_RATES[1] + 1.7) * reach * 0.6,
      Math.sin(time * SHAKE_RATES[2] + 3.1) * reach * 0.8,
    );
  }

  // -------------------------------------------------------------------------
  // Sparks
  // -------------------------------------------------------------------------

  private buildSparks(): void {
    const positions = new Float32Array(SPARK_BUDGET * 3);
    const colors = new Float32Array(SPARK_BUDGET * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // The whole budget is always drawn; dead sparks go black and drop below the
    // floor, which is cheaper than re-uploading a draw range every frame.
    geometry.setDrawRange(0, SPARK_BUDGET);

    const material = new THREE.PointsMaterial({
      size: 0.13,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      map: createSparkTexture(),
    });

    for (let index = 0; index < SPARK_BUDGET; index += 1) {
      this.sparks.push({ life: 0, maxLife: 1, velocity: new THREE.Vector3() });
      positions[index * 3 + 1] = -1000;
    }

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 3;

    this.sparkPositions = positions;
    this.sparkColors = colors;
    this.sparkPoints = points;
    this.scene.add(points);
  }

  private emitSpark(origin: Vector3Data, weight: number, index: number): void {
    const positions = this.sparkPositions;
    if (!positions) return;

    const slot = this.nextSpark;
    this.nextSpark = (this.nextSpark + 1) % SPARK_BUDGET;
    const spark = this.sparks[slot];

    positions[slot * 3] = origin.x;
    positions[slot * 3 + 1] = origin.y;
    positions[slot * 3 + 2] = origin.z;

    // A cone of directions biased upward, spread deterministically around the
    // ring so a burst looks like a burst instead of a clump.
    const angle = (index * 2.39996) + this.elapsed;
    const rise = 0.35 + ((index * 0.37) % 1) * 0.8;
    const speed = (2.6 + ((index * 0.61) % 1) * 3.4) * (0.6 + weight * 0.8);

    spark.velocity.set(
      Math.cos(angle) * speed * 0.55,
      rise * speed,
      Math.sin(angle) * speed * 0.55,
    );
    spark.maxLife = 0.32 + ((index * 0.23) % 1) * 0.3;
    spark.life = spark.maxLife;
  }

  private updateSparks(delta: number): void {
    const positions = this.sparkPositions;
    const colors = this.sparkColors;
    if (!positions || !colors || !this.sparkPoints) return;

    let anyAlive = false;

    for (let index = 0; index < SPARK_BUDGET; index += 1) {
      const spark = this.sparks[index];
      if (spark.life <= 0) continue;

      spark.life -= delta;
      if (spark.life <= 0) {
        colors[index * 3] = 0;
        colors[index * 3 + 1] = 0;
        colors[index * 3 + 2] = 0;
        positions[index * 3 + 1] = -1000;
        continue;
      }

      anyAlive = true;
      // Gravity plus a little drag, so sparks arc and settle rather than
      // flying off in straight lines.
      spark.velocity.y -= 11 * delta;
      spark.velocity.multiplyScalar(1 - Math.min(0.9, 2.2 * delta));

      positions[index * 3] += spark.velocity.x * delta;
      positions[index * 3 + 1] += spark.velocity.y * delta;
      positions[index * 3 + 2] += spark.velocity.z * delta;

      // Square the fade: a linear fade on an additive sprite stays visible far
      // too long and leaves a haze over the sand. The hue cools as it dies —
      // full ember to deep red — which is what an actual spark does.
      const remaining = spark.life / spark.maxLife;
      const fade = remaining * remaining;
      colors[index * 3] = fade;
      colors[index * 3 + 1] = fade * (0.42 + remaining * 0.4);
      colors[index * 3 + 2] = fade * remaining * 0.28;
    }

    this.sparkPoints.visible = anyAlive;
    if (!anyAlive) return;

    (this.sparkPoints.geometry.getAttribute('position') as THREE.BufferAttribute)
      .needsUpdate = true;
    (this.sparkPoints.geometry.getAttribute('color') as THREE.BufferAttribute)
      .needsUpdate = true;
  }

  // -------------------------------------------------------------------------
  // Ground dust
  // -------------------------------------------------------------------------

  private buildDust(): void {
    this.dustTexture = createRadialTexture('rgba(198,178,142,');
    if (!this.dustTexture) return;

    for (let index = 0; index < DUST_BUDGET; index += 1) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: this.dustTexture,
          transparent: true,
          depthWrite: false,
          opacity: 0,
        }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 2;
      this.dust.push({ mesh, life: 0, maxLife: 1, spread: 1 });
      this.scene.add(mesh);
    }
  }

  private emitDust(origin: Vector3Data, weight: number): void {
    // Oldest slot wins: a fresh heavy landing matters more than the tail of a
    // puff that is already fading.
    let chosen = this.dust[0];
    for (const candidate of this.dust) {
      if (candidate.life < chosen.life) chosen = candidate;
    }
    if (!chosen) return;

    chosen.maxLife = 0.55 + weight * 0.35;
    chosen.life = chosen.maxLife;
    chosen.spread = 1.6 + weight * 2.4;
    // Just above the sand, so it never z-fights the floor or the blob shadows.
    chosen.mesh.position.set(origin.x, 0.05, origin.z);
    chosen.mesh.visible = true;
  }

  private updateDust(delta: number): void {
    for (const dust of this.dust) {
      if (dust.life <= 0) continue;

      dust.life -= delta;
      if (dust.life <= 0) {
        dust.mesh.visible = false;
        continue;
      }

      const remaining = dust.life / dust.maxLife;
      const grown = dust.spread * (1 + (1 - remaining) * 1.5);
      dust.mesh.scale.set(grown, grown, 1);
      (dust.mesh.material as THREE.MeshBasicMaterial).opacity = remaining * 0.45;
    }
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Soft round sprite for the sparks. Null outside a DOM. */
function createSparkTexture(): THREE.CanvasTexture | null {
  return createRadialTexture('rgba(255,210,150,');
}

/**
 * An annulus, for the wind-up telegraph.
 *
 * A ring rather than a filled disc: the dragon stands in the middle of it, and
 * a disc would wash out the contact shadow that tells the student where its
 * feet actually are.
 */
function createRingTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  // Transparent core, a bright band at 78% of the radius, fading to the edge.
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.62, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.78, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.9, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Radial falloff sprite.
 *
 * Squared falloff for the same reason the contact shadows use one: a linear
 * gradient reaches zero at a visible edge, which reads as a disc rather than as
 * a glow.
 */
function createRadialTexture(rgbPrefix: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  for (let stop = 0; stop <= 8; stop += 1) {
    const t = stop / 8;
    gradient.addColorStop(t, `${rgbPrefix}${((1 - t) * (1 - t)).toFixed(3)})`);
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
