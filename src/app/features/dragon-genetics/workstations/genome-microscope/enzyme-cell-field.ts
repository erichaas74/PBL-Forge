/**
 * The cell fluid the enzyme bench runs in.
 *
 * Molecules drift, bounce off the cell wall, and knock into each other. That
 * random motion is the point: an enzyme does not go looking for its substrate,
 * it waits for one to collide with the active site by chance. Keeping the
 * physics here — away from the component and away from the DOM — means the
 * behaviour can be tested without a browser.
 */

export type FieldSlot = 'reactant-a' | 'reactant-b' | 'product-a' | 'product-b';

export type FieldState = 'free' | 'captured' | 'released' | 'hidden';

export interface FieldEntity {
  readonly id: string;
  /** Which molecule of the reaction this body is carrying. */
  slot: FieldSlot;
  state: FieldState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  /** Frames left before a released molecule settles back into free drift. */
  timer: number;
}

export interface FieldBounds {
  width: number;
  height: number;
  /** Keeps a molecule's body clear of the cell wall. */
  pad: number;
}

/** Radius used for molecule-to-molecule collisions, in scene units. */
export const FIELD_COLLISION_RADIUS = 52;

const MAX_SPEED = 3.4;
const JITTER = 0.09;

/**
 * Advances every free or released body by one frame.
 *
 * `step` is a frame multiplier, so a slow frame moves bodies further rather
 * than stalling them. Captured and hidden bodies are left alone — the component
 * owns those while a reaction is running.
 */
export function stepField(
  entities: readonly FieldEntity[],
  bounds: FieldBounds,
  step = 1,
  random: () => number = Math.random,
): void {
  for (const entity of entities) {
    if (entity.state !== 'free' && entity.state !== 'released') continue;

    if (entity.state === 'free') {
      entity.vx += (random() - 0.5) * JITTER;
      entity.vy += (random() - 0.5) * JITTER;
      const speed = Math.hypot(entity.vx, entity.vy);
      if (speed > MAX_SPEED) {
        entity.vx = (entity.vx / speed) * MAX_SPEED;
        entity.vy = (entity.vy / speed) * MAX_SPEED;
      }
    } else {
      entity.timer -= step;
      if (entity.timer <= 0) entity.state = 'free';
    }

    entity.x += entity.vx * step;
    entity.y += entity.vy * step;
    entity.rot += entity.vrot * step;
    bounceOffWall(entity, bounds);
  }

  resolveCollisions(entities);
}

/** Reflects a body back into the cell when it reaches the wall. */
export function bounceOffWall(entity: FieldEntity, bounds: FieldBounds): void {
  if (entity.x < bounds.pad) {
    entity.x = bounds.pad;
    entity.vx = Math.abs(entity.vx);
  }
  if (entity.x > bounds.width - bounds.pad) {
    entity.x = bounds.width - bounds.pad;
    entity.vx = -Math.abs(entity.vx);
  }
  if (entity.y < bounds.pad) {
    entity.y = bounds.pad;
    entity.vy = Math.abs(entity.vy);
  }
  if (entity.y > bounds.height - bounds.pad) {
    entity.y = bounds.height - bounds.pad;
    entity.vy = -Math.abs(entity.vy);
  }
}

/** Equal-mass elastic separation for every overlapping pair of free bodies. */
function resolveCollisions(entities: readonly FieldEntity[]): void {
  const minimum = FIELD_COLLISION_RADIUS * 2;

  for (let i = 0; i < entities.length; i += 1) {
    const first = entities[i];
    if (first.state !== 'free') continue;

    for (let j = i + 1; j < entities.length; j += 1) {
      const second = entities[j];
      if (second.state !== 'free') continue;

      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared >= minimum * minimum) continue;

      const distance = Math.sqrt(distanceSquared) || 0.1;
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = (minimum - distance) / 2;

      first.x -= nx * overlap;
      first.y -= ny * overlap;
      second.x += nx * overlap;
      second.y += ny * overlap;

      const impulse = nx * (first.vx - second.vx) + ny * (first.vy - second.vy);
      if (impulse <= 0) continue;
      first.vx -= impulse * nx;
      first.vy -= impulse * ny;
      second.vx += impulse * nx;
      second.vy += impulse * ny;
    }
  }
}

/**
 * Moves a captured body toward the active site.
 *
 * Returns true once it has arrived, which is the bench's cue that the
 * substrates are seated and the reaction can proceed.
 */
export function pullToSite(
  entity: FieldEntity,
  siteX: number,
  siteY: number,
  grip = 0.3,
): boolean {
  entity.x += (siteX - entity.x) * grip;
  entity.y += (siteY - entity.y) * grip;

  let turn = entity.rot % 360;
  if (turn > 180) turn -= 360;
  if (turn < -180) turn += 360;
  entity.rot -= turn * grip;

  return Math.hypot(siteX - entity.x, siteY - entity.y) < 1.5;
}

/** Seats a body exactly in the active site, with no residual drift or spin. */
export function seatInSite(entity: FieldEntity, siteX: number, siteY: number): void {
  entity.x = siteX;
  entity.y = siteY;
  entity.rot = 0;
  entity.vx = 0;
  entity.vy = 0;
  entity.vrot = 0;
}

/**
 * Throws a finished molecule clear of the active site.
 *
 * `direction` is -1 to send it left and 1 to send it right, so a break-down
 * reaction visibly scatters its two fragments in opposite directions.
 */
export function ejectFromSite(
  entity: FieldEntity,
  siteX: number,
  siteY: number,
  direction: number,
  random: () => number = Math.random,
): void {
  entity.state = 'released';
  entity.x = siteX;
  entity.y = siteY;
  entity.rot = 0;
  entity.vx = direction * (2.2 + random() * 1.4);
  entity.vy = -(2.4 + random() * 1.6);
  entity.vrot = (random() - 0.5) * 4;
  entity.timer = 90;
}

/** Sends a spent molecule back to the cell wall as a fresh free body. */
export function respawn(
  entity: FieldEntity,
  bounds: FieldBounds,
  random: () => number = Math.random,
): void {
  const fromLeft = random() > 0.5;
  entity.state = 'free';
  entity.x = fromLeft ? bounds.pad : bounds.width - bounds.pad;
  entity.y = bounds.pad + random() * (bounds.height - bounds.pad * 2);
  entity.vx = (fromLeft ? 1 : -1) * (0.8 + random() * 1.4);
  entity.vy = (random() - 0.5) * 2.4;
  entity.rot = random() * 360;
  entity.vrot = (random() - 0.5) * 2.4;
  entity.timer = 0;
}
