import {
  FIELD_COLLISION_RADIUS,
  FieldBounds,
  FieldEntity,
  FieldSlot,
  bounceOffWall,
  ejectFromSite,
  pullToSite,
  respawn,
  seatInSite,
  stepField,
} from './enzyme-cell-field';

const BOUNDS: FieldBounds = { width: 900, height: 440, pad: 60 };

function entity(overrides: Partial<FieldEntity> = {}): FieldEntity {
  return {
    id: 'test',
    slot: 'reactant-a' as FieldSlot,
    state: 'free',
    x: 450,
    y: 220,
    vx: 1,
    vy: 1,
    rot: 0,
    vrot: 0,
    timer: 0,
    ...overrides,
  };
}

/** Removes the randomness so motion can be asserted exactly. */
const steady = () => 0.5;

describe('enzyme cell field', () => {
  it('drifts free molecules and leaves captured ones to the bench', () => {
    const drifting = entity({ vx: 2, vy: -1, vrot: 3 });
    const docked = entity({ id: 'docked', state: 'captured', vx: 9, vy: 9 });

    stepField([drifting, docked], BOUNDS, 1, steady);

    expect(drifting.x).toBe(452);
    expect(drifting.y).toBe(219);
    expect(drifting.rot).toBe(3);
    expect(docked.x).toBe(450);
    expect(docked.y).toBe(220);
  });

  it('bounces a molecule back off every cell wall', () => {
    const left = entity({ x: 10, vx: -3 });
    const right = entity({ x: 890, vx: 3 });
    const top = entity({ y: 5, vy: -3 });
    const bottom = entity({ y: 435, vy: 3 });

    for (const body of [left, right, top, bottom]) bounceOffWall(body, BOUNDS);

    expect(left.x).toBe(BOUNDS.pad);
    expect(left.vx).toBeGreaterThan(0);
    expect(right.x).toBe(BOUNDS.width - BOUNDS.pad);
    expect(right.vx).toBeLessThan(0);
    expect(top.y).toBe(BOUNDS.pad);
    expect(top.vy).toBeGreaterThan(0);
    expect(bottom.y).toBe(BOUNDS.height - BOUNDS.pad);
    expect(bottom.vy).toBeLessThan(0);
  });

  it('pushes overlapping molecules apart and swaps their momentum', () => {
    const first = entity({ id: 'a', x: 440, vx: 2, vy: 0 });
    const second = entity({ id: 'b', x: 460, vx: -2, vy: 0 });

    stepField([first, second], BOUNDS, 1, steady);

    expect(second.x - first.x).toBeGreaterThanOrEqual(FIELD_COLLISION_RADIUS * 2 - 0.001);
    expect(first.vx).toBeLessThan(0);
    expect(second.vx).toBeGreaterThan(0);
  });

  it('pulls a captured molecule into the active site and reports arrival', () => {
    const body = entity({ state: 'captured', x: 200, y: 100, rot: 90 });

    expect(pullToSite(body, 450, 250)).toBeFalse();
    for (let frame = 0; frame < 40; frame += 1) pullToSite(body, 450, 250);

    expect(pullToSite(body, 450, 250)).toBeTrue();
    expect(Math.abs(body.rot)).toBeLessThan(1);
  });

  it('seats a molecule with no residual drift so the fit reads as exact', () => {
    const body = entity({ state: 'captured', x: 449, y: 251, rot: 4, vx: 2, vy: 2, vrot: 3 });

    seatInSite(body, 450, 250);

    expect(body).toEqual(jasmine.objectContaining({ x: 450, y: 250, rot: 0, vx: 0, vy: 0, vrot: 0 }));
  });

  it('throws the two fragments of a split in opposite directions', () => {
    const leftward = entity({ id: 'left', slot: 'product-a' });
    const rightward = entity({ id: 'right', slot: 'product-b' });

    ejectFromSite(leftward, 450, 250, -1, steady);
    ejectFromSite(rightward, 450, 250, 1, steady);

    expect(leftward.state).toBe('released');
    expect(leftward.vx).toBeLessThan(0);
    expect(rightward.vx).toBeGreaterThan(0);
    // Both rise out of the site before settling.
    expect(leftward.vy).toBeLessThan(0);
    expect(rightward.vy).toBeLessThan(0);
  });

  it('settles a released molecule back into free drift once its timer runs out', () => {
    const body = entity({ state: 'released', timer: 2, vx: 1, vy: 0 });

    stepField([body], BOUNDS, 1, steady);
    expect(body.state).toBe('released');
    stepField([body], BOUNDS, 1, steady);
    expect(body.state).toBe('free');
  });

  it('returns a spent molecule to the cell wall as a fresh body', () => {
    const body = entity({ state: 'hidden', x: 450, y: 250 });

    respawn(body, BOUNDS, steady);

    expect(body.state).toBe('free');
    expect(body.x).toBe(BOUNDS.width - BOUNDS.pad);
    expect(body.vx).toBeLessThan(0);
  });
});
