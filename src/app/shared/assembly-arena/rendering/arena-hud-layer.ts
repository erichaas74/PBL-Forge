import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Vector3Data } from '../../assembly/domain/assembly.models';
import { BattleTeam } from '../models/arena.models';

/**
 * Combat state, drawn over the dragon it belongs to.
 *
 * Every number about the fight used to live in a DOM panel *below* the canvas,
 * so answering "did my bite land?" meant looking away from the fight to find
 * out — and by the time you looked back it was over. For a turn duel, where the
 * whole loop is plan, watch, understand, that is backwards.
 *
 * ## Why CSS2D and not sprites
 *
 * Real DOM elements: they inherit the app's tokens and type scale, they are
 * readable by a screen reader, and text stays crisp at any zoom. Sprites would
 * be occluded correctly by geometry, which these are not — a nameplate shows
 * through a palisade post. That is the right trade here: a label that hides
 * behind scenery is worse than one that floats, and it saves an atlas, a shader,
 * and the whole business of keeping bitmap text legible at 4K.
 *
 * The layer is pointer-transparent, so it never steals a drag from OrbitControls.
 */

/** How far above the torso the plate rides, in world units. */
const PLATE_LIFT = 2.4;
/** Damage numbers rise this far over their lifetime. */
const DAMAGE_RISE = 1.5;
const DAMAGE_LIFE_SECONDS = 1.1;
const DAMAGE_BUDGET = 12;

export interface HudCombatant {
  id: string;
  name: string;
  team: BattleTeam;
  healthRatio: number;
  position: Vector3Data;
  /** Torso height, so the plate sits above the animal rather than inside it. */
  standingHeight: number;
}

interface Plate {
  object: CSS2DObject;
  fill: HTMLElement;
  name: HTMLElement;
}

interface DamageNumber {
  object: CSS2DObject;
  life: number;
  origin: THREE.Vector3;
}

export class ArenaHudLayer {
  private readonly renderer: CSS2DRenderer | null;
  private readonly plates = new Map<string, Plate>();
  private readonly damage: DamageNumber[] = [];
  private nextDamage = 0;

  constructor(
    private readonly scene: THREE.Scene,
    host: HTMLElement,
  ) {
    if (typeof document === 'undefined') {
      this.renderer = null;
      return;
    }

    this.renderer = new CSS2DRenderer();
    const element = this.renderer.domElement;
    element.style.position = 'absolute';
    element.style.inset = '0';
    // Never intercept a drag: the canvas underneath owns the pointer.
    element.style.pointerEvents = 'none';
    host.appendChild(element);
  }

  setSize(width: number, height: number): void {
    this.renderer?.setSize(width, height);
  }

  /**
   * Reconciles the plates against the combatants currently in the match.
   *
   * Called every frame, so it updates in place rather than rebuilding: swapping
   * DOM nodes sixty times a second would thrash layout and make the health bar
   * transition restart on every tick.
   */
  sync(combatants: readonly HudCombatant[]): void {
    if (!this.renderer) return;

    const seen = new Set<string>();

    for (const combatant of combatants) {
      seen.add(combatant.id);
      let plate = this.plates.get(combatant.id);
      if (!plate) {
        plate = this.createPlate(combatant);
        this.plates.set(combatant.id, plate);
        this.scene.add(plate.object);
      }

      plate.object.position.set(
        combatant.position.x,
        combatant.position.y + PLATE_LIFT,
        combatant.position.z,
      );
      const percent = Math.round(Math.max(0, Math.min(1, combatant.healthRatio)) * 100);
      plate.fill.style.width = `${percent}%`;
      plate.name.textContent = combatant.name;
      // Announced to assistive tech only when it changes, which is what
      // aria-live on the wrapper gives us for free.
      plate.object.element.setAttribute(
        'aria-label',
        `${combatant.name}: ${percent}% health`,
      );
    }

    for (const [id, plate] of Array.from(this.plates.entries())) {
      if (seen.has(id)) continue;
      this.scene.remove(plate.object);
      plate.object.element.remove();
      this.plates.delete(id);
    }
  }

  /** A number that floats up off the point of impact and fades. */
  reportDamage(position: Vector3Data, amount: number): void {
    if (!this.renderer || amount < 0.5) return;

    let entry = this.damage[this.nextDamage];
    if (!entry) {
      const element = document.createElement('div');
      element.className = 'arena-damage';
      entry = {
        object: new CSS2DObject(element),
        life: 0,
        origin: new THREE.Vector3(),
      };
      this.damage[this.nextDamage] = entry;
      this.scene.add(entry.object);
    }
    this.nextDamage = (this.nextDamage + 1) % DAMAGE_BUDGET;

    entry.origin.set(position.x, position.y, position.z);
    entry.object.position.copy(entry.origin);
    entry.object.element.textContent = `-${Math.round(amount)}`;
    // Heavier hits are bigger, so magnitude is readable without reading.
    entry.object.element.style.fontSize = amount >= 8 ? '1.15rem' : '0.9rem';
    entry.object.element.style.opacity = '1';
    entry.life = DAMAGE_LIFE_SECONDS;
  }

  update(deltaSeconds: number): void {
    for (const entry of this.damage) {
      if (!entry || entry.life <= 0) continue;

      entry.life -= deltaSeconds;
      if (entry.life <= 0) {
        entry.object.element.style.opacity = '0';
        continue;
      }

      const spent = 1 - entry.life / DAMAGE_LIFE_SECONDS;
      entry.object.position.set(
        entry.origin.x,
        entry.origin.y + spent * DAMAGE_RISE,
        entry.origin.z,
      );
      // Hold full opacity for the first third, then fade: a number that starts
      // fading immediately is unreadable at the moment it matters most.
      entry.object.element.style.opacity = `${Math.min(1, (1 - spent) * 1.5)}`;
    }
  }

  render(camera: THREE.Camera): void {
    this.renderer?.render(this.scene, camera);
  }

  dispose(): void {
    for (const plate of this.plates.values()) {
      this.scene.remove(plate.object);
      plate.object.element.remove();
    }
    this.plates.clear();

    for (const entry of this.damage) {
      if (!entry) continue;
      this.scene.remove(entry.object);
      entry.object.element.remove();
    }
    this.damage.length = 0;

    this.renderer?.domElement.remove();
  }

  private createPlate(combatant: HudCombatant): Plate {
    const root = document.createElement('div');
    root.className = `arena-plate arena-plate--${combatant.team}`;

    const name = document.createElement('span');
    name.className = 'arena-plate__name';
    root.appendChild(name);

    const track = document.createElement('span');
    track.className = 'arena-plate__track';
    const fill = document.createElement('i');
    fill.className = 'arena-plate__fill';
    track.appendChild(fill);
    root.appendChild(track);

    return { object: new CSS2DObject(root), fill, name };
  }
}
