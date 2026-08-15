import { PUBLISHED_CLASSIC_DRAGON_PRESET } from '../../../data/published-dragon-models';
import { AssemblyBlueprint } from '../domain/assembly.models';
import { DRAGON_IDLE_BREATH, DRAGON_RESTING_POSE } from './specimen-stance';
import { buildSpecimenPose } from './specimen-pose';

/**
 * The resting stance, measured rather than eyeballed.
 *
 * A stance is the one visual change that cannot be checked by "does it render"
 * — a dragon standing on the wrong end of itself renders perfectly. These
 * assert the handful of relationships that make it read as a standing animal,
 * so a future angle tweak that inverts one cannot land quietly.
 */

const blueprint = PUBLISHED_CLASSIC_DRAGON_PRESET.state as AssemblyBlueprint;

function posed() {
  const pose = buildSpecimenPose(blueprint, DRAGON_RESTING_POSE);
  return new Map(pose.parts.map(part => [part.partId, part.position]));
}

type Position = { x: number; y: number; z: number };

function positionOf(positions: Map<string, Position>, idPart: string): Position {
  for (const [id, position] of positions) {
    if (id.includes(idPart)) return position;
  }
  throw new Error(`no part id containing "${idPart}"`);
}

function yOf(positions: Map<string, Position>, idPart: string): number {
  return positionOf(positions, idPart).y;
}

describe('dragon resting stance', () => {
  it('keeps all four feet within a narrow band of one another', () => {
    const positions = posed();
    const feet = [...positions.entries()]
      .filter(([id]) => id.includes('foot'))
      .map(([, position]) => position.y);

    expect(feet.length).toBe(4);
    const spread = Math.max(...feet) - Math.min(...feet);
    // A quadruped standing on level ground. Any more than this and one foot is
    // visibly hovering or buried.
    expect(spread).toBeLessThan(0.12);
  });

  it('stands the feet below the body', () => {
    const positions = posed();
    const body = yOf(positions, 'body');
    for (const [id, position] of positions) {
      if (!id.includes('foot')) continue;
      expect(position.y).toBeLessThan(body);
    }
  });

  it('holds the spine level rather than pitching the animal onto its nose', () => {
    const positions = posed();
    const head = yOf(positions, 'horned-head');
    const tailRoot = yOf(positions, 'tail-chain-root');
    // The head rides a little above the tail root on a resting quadruped, and
    // must never dive below it — that reads as the dragon falling forwards.
    expect(head).toBeGreaterThan(tailRoot - 0.05);
  });

  it('holds the wings out from the body rather than folding them along it', () => {
    const positions = posed();
    const left = positionOf(positions, 'left-wing');
    const right = positionOf(positions, 'right-wing');

    // Out to the sides, and on opposite sides: the fold this replaced swung both
    // wings aft, which collapsed the lateral spread and hid the membrane.
    expect(Math.sign(left.z)).toBe(-Math.sign(right.z));
    expect(Math.abs(left.z)).toBeGreaterThan(0.2);
    expect(Math.abs(left.z)).toBeCloseTo(Math.abs(right.z), 2);
    // Swept aft, not forward past the shoulder — a wing raked ahead of its own
    // root reads as a bird braking.
    const body = positionOf(positions, 'body');
    expect(left.x).toBeLessThan(body.x + 0.4);
  });

  it('raises the wings into a V rather than leaving them flat or overhead', () => {
    const positions = posed();
    const body = yOf(positions, 'body');
    const wing = yOf(positions, 'left-wing');

    // The authored wing is a horizontal sheet, and the viewer's camera sits only
    // about 17° above that plane — left flat, the membrane is edge-on and the
    // wing reads as a bundle of struts. It has to be lifted to be seen at all.
    expect(wing).toBeGreaterThan(body + 0.3);
    // But not folded up over the spine like a closing umbrella.
    expect(wing).toBeLessThan(body + 1.4);
  });
});


describe('dragon idle breath', () => {
  const bendsAt = (phase: number) => DRAGON_IDLE_BREATH.bendsAt(phase);

  it('stays below the threshold where an ambient loop becomes a distraction', () => {
    for (let phase = 0; phase <= 1; phase += 0.05) {
      for (const bend of bendsAt(phase)) {
        // Two degrees. This plays permanently beside text a student is reading.
        expect(Math.abs(bend.radians)).toBeLessThan(0.035);
      }
    }
  });

  it('actually moves between phases', () => {
    const at = (phase: number) => bendsAt(phase).map(bend => bend.radians);
    expect(at(0)).not.toEqual(at(0.25));
    expect(at(0.25)).not.toEqual(at(0.5));
  });

  it('returns to where it started so the loop does not jump', () => {
    const start = bendsAt(0).map(bend => bend.radians);
    const end = bendsAt(1).map(bend => bend.radians);
    start.forEach((value, index) => expect(end[index]).toBeCloseTo(value, 6));
  });

  it('drives channels at different rates, so it does not read as one pulse', () => {
    // If every channel were the same wave, all their zero crossings would line
    // up and the animal would beat like a metronome instead of breathing.
    const ratios = bendsAt(0.3).map(bend => bend.radians);
    const later = bendsAt(0.8).map(bend => bend.radians);
    const signFlips = ratios.filter((value, index) => Math.sign(value) !== Math.sign(later[index]));
    expect(signFlips.length).toBeGreaterThan(0);
    expect(signFlips.length).toBeLessThan(ratios.length);
  });
});
