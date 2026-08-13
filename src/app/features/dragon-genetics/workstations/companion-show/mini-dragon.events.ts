import { MiniGenome, miniPhenotypeFormId } from './mini-dragon.genetics';

/**
 * The show ring's judged trials — what this species has instead of combat.
 *
 * Each trial is a second, independent read-out of the genome: not a score the
 * app invents, but an observable consequence of traits the student can already
 * see on the animal. That is the point. A breeder who has only looked at coats
 * can enter a trial and discover that the coat they bred for costs them the
 * agility run, and nothing on the surface told them so in advance.
 *
 * Two rules keep these honest:
 *
 * 1. **No trial names a gene or a genotype.** A result is a thing that happened
 *    in the ring — "Soars", "Withdraws" — and the student infers the link by
 *    entering animals and comparing.
 * 2. **The trials disagree with each other.** Cold endurance rewards the fluffy
 *    coat and the agility run punishes it, so no single companion can place in
 *    everything and a breed standard has to commit to something.
 */

export type MiniTrialId = 'flight' | 'agility' | 'endurance' | 'ember';

export interface MiniTrialOutcome {
  id: string;
  label: string;
  /** Whether this outcome takes the ribbon in its trial. */
  places: boolean;
  detail: string;
}

export interface MiniTrialDefinition {
  id: MiniTrialId;
  name: string;
  /** What the judges are watching, in a breeder's words rather than a geneticist's. */
  brief: string;
  outcomes: readonly MiniTrialOutcome[];
}

function outcome(id: string, label: string, places: boolean, detail: string): MiniTrialOutcome {
  return { id, label, places, detail };
}

export const MINI_TRIALS: readonly MiniTrialDefinition[] = [
  {
    id: 'flight',
    name: 'Flight trial',
    brief: 'The companion is released across the ring and judged on how it crosses.',
    outcomes: [
      outcome('flight:soars', 'Soars', true, 'Crosses the ring without touching down.'),
      outcome('flight:hovers', 'Hovers', false, 'Lifts clear but cannot hold height.'),
      outcome('flight:grounded', 'Grounded', false, 'Runs the ring on foot.'),
    ],
  },
  {
    id: 'agility',
    name: 'Agility run',
    brief: 'A weaving course against the clock.',
    outcomes: [
      outcome('agility:nimble', 'Nimble', true, 'Clears the course without a fault.'),
      outcome('agility:brisk', 'Brisk', false, 'Finishes cleanly but unhurried.'),
      outcome('agility:heavy', 'Heavy', false, 'Labours through the turns.'),
    ],
  },
  {
    id: 'endurance',
    name: 'Cold endurance',
    brief: 'An hour on the exposed north bench.',
    outcomes: [
      outcome('endurance:endures', 'Endures', true, 'Settles and stays out the full hour.'),
      outcome('endurance:withdraws', 'Withdraws', false, 'Asks to come in early.'),
    ],
  },
  {
    id: 'ember',
    name: 'Ember display',
    brief: 'The evening display, judged on the colour and carry of the flame.',
    outcomes: [
      outcome('ember:rose-flare', 'Rose flare', true, 'A bright flare that carries the ring.'),
      outcome('ember:blue-flare', 'Blue flare', false, 'A clean flame, short in reach.'),
      outcome('ember:faint', 'Faint glow', false, 'Little more than a warm throat.'),
    ],
  },
];

export interface MiniTrialResult {
  trial: MiniTrialDefinition;
  outcome: MiniTrialOutcome;
}

export function miniTrial(trialId: MiniTrialId): MiniTrialDefinition {
  const trial = MINI_TRIALS.find((candidate) => candidate.id === trialId);
  if (!trial) throw new Error(`Unknown mini dragon trial: ${trialId}`);
  return trial;
}

/**
 * Runs one trial for one animal.
 *
 * Flight, endurance, and the ember display each read a single locus, so a
 * student can pair them off with a visible trait fairly quickly. The agility run
 * deliberately reads *two* — size and coat — so at least one trial cannot be
 * predicted from any single characteristic, and the ring keeps something to
 * discover after the easy pairings are made.
 */
export function runMiniTrial(trialId: MiniTrialId, genome: MiniGenome): MiniTrialResult {
  const trial = miniTrial(trialId);
  const outcomeId = resolveOutcomeId(trialId, genome);
  const resolved =
    trial.outcomes.find((candidate) => candidate.id === outcomeId) ?? trial.outcomes.at(-1);
  if (!resolved) throw new Error(`Trial ${trialId} declares no outcomes.`);
  return { trial, outcome: resolved };
}

function resolveOutcomeId(trialId: MiniTrialId, genome: MiniGenome): string {
  switch (trialId) {
    case 'flight': {
      const wings = miniPhenotypeFormId('wings', genome);
      if (wings === 'wings:broad') return 'flight:soars';
      return wings === 'wings:small' ? 'flight:hovers' : 'flight:grounded';
    }

    case 'agility': {
      const light = miniPhenotypeFormId('size', genome) === 'size:teacup';
      const fluffy = miniPhenotypeFormId('coat', genome) === 'coat:fluffy';
      if (light && !fluffy) return 'agility:nimble';
      if (light || !fluffy) return 'agility:brisk';
      return 'agility:heavy';
    }

    case 'endurance':
      return miniPhenotypeFormId('coat', genome) === 'coat:fluffy'
        ? 'endurance:endures'
        : 'endurance:withdraws';

    case 'ember': {
      const ember = miniPhenotypeFormId('ember', genome);
      if (ember === 'ember:rose') return 'ember:rose-flare';
      return ember === 'ember:blue' ? 'ember:blue-flare' : 'ember:faint';
    }
  }
}

export function runMiniShowCard(genome: MiniGenome): readonly MiniTrialResult[] {
  return MINI_TRIALS.map((trial) => runMiniTrial(trial.id, genome));
}

/** How many ribbons one companion takes across the whole card. */
export function miniRibbonCount(genome: MiniGenome): number {
  return runMiniShowCard(genome).filter((result) => result.outcome.places).length;
}
