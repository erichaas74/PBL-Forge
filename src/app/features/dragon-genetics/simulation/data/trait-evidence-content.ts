import { DragonEvidenceSourceId, StationCopy } from '../../../../shared/dragon-visuals';
import { DragonParentProfile } from '../domain/dragon-lab.models';
import {
  TraitEvidenceCategory,
  TraitEvidenceMisconception,
  TraitEvidenceObservation,
  TraitEvidenceSetId,
} from '../domain/trait-evidence.models';

/**
 * Curriculum content for the Trait Evidence Analyzer (Module 1, GEN-1).
 *
 * Everything a student reads lives here, not in the graphics package. Each observation
 * carries the source instrument that recorded it, three competing clues, and the rule the
 * reveal should name. Exactly one clue explains where the characteristic came from; the
 * other two model the two errors this station exists to correct — reasoning from how useful
 * a characteristic seems, and reasoning from whether it looks like a body feature.
 */
/** Generic specimen record. The console analyses records; body artwork stays elsewhere. */
export const TRAIT_EVIDENCE_SPECIMEN: DragonParentProfile = {
  id: 'specimen-h7',
  name: 'Specimen H-7',
  title: 'Unexpected hatchling',
  color: '#3f6f8f',
  accentColor: '#9fd8e6',
  genome: {
    wings: ['W', 'w'],
    fire: ['F', 'f'],
    scales: ['S', 's'],
    horns: ['H', 'h'],
  },
};

interface ObservationInput {
  id: string;
  label: string;
  detail: string;
  category: TraitEvidenceCategory;
  sourceId: DragonEvidenceSourceId;
  rule: string;
  evidence: string;
  distractors: readonly [TraitEvidenceDistractor, TraitEvidenceDistractor];
  sets: readonly TraitEvidenceSetId[];
  sortCardId?: string;
}

interface TraitEvidenceDistractor {
  text: string;
  sourceId: DragonEvidenceSourceId;
  misconception: TraitEvidenceMisconception;
}

function observation(input: ObservationInput): TraitEvidenceObservation {
  const correctClueId = `${input.id}.evidence`;
  return {
    id: input.id,
    label: input.label,
    detail: input.detail,
    category: input.category,
    sourceId: input.sourceId,
    rule: input.rule,
    correctClueId,
    sets: input.sets,
    sortCardId: input.sortCardId,
    clues: [
      { id: correctClueId, text: input.evidence, sourceId: input.sourceId },
      ...input.distractors.map((distractor, index) => ({
        id: `${input.id}.alt-${index + 1}`,
        text: distractor.text,
        sourceId: distractor.sourceId,
        misconception: distractor.misconception,
      })),
    ],
  };
}

export const TRAIT_EVIDENCE_OBSERVATIONS: readonly TraitEvidenceObservation[] = [
  observation({
    id: 'worked-ash-stain',
    label: 'Grey ash stain across the shoulder plates',
    detail: 'Intake photography shows a grey band that was not present in the hatch record two months earlier.',
    category: 'environmental',
    sourceId: 'environment-log',
    rule: 'A characteristic that appears after hatching and traces to surroundings is an environmental effect, not inherited information.',
    evidence: 'Field log 22: the pen was downwind of the forge vents for six weeks before this intake.',
    distractors: [
      {
        text: 'Handlers say the grey band makes H-7 harder to see at dusk, which helps in trials.',
        sourceId: 'training-log',
        misconception: 'usefulness-reasoning',
      },
      {
        text: 'The band sits on the body, and body features come from genes.',
        sourceId: 'gene-record',
        misconception: 'body-feature-bias',
      },
    ],
    sets: ['learn'],
  }),
  observation({
    id: 'scale-pattern',
    label: 'Spotted scale pattern',
    detail: 'The same spotted pattern appears in the hatch record and in this week’s intake scan.',
    category: 'inherited',
    sourceId: 'gene-record',
    rule: 'Information carried in alleles and present from hatching is inherited.',
    evidence: 'Gene record S: the allele scan lists S and s for the scale-pattern gene, and both parents carry S.',
    distractors: [
      {
        text: 'Spotted dragons are easier for tower watchers to track, so the pattern is worth keeping.',
        sourceId: 'training-log',
        misconception: 'usefulness-reasoning',
      },
      {
        text: 'The nest bedding was changed the same week the pattern was recorded.',
        sourceId: 'environment-log',
        misconception: 'learned-environment-swap',
      },
    ],
    sets: ['learn', 'practice'],
    sortCardId: 'scale-pattern',
  }),
  observation({
    id: 'fire-breathing',
    label: 'Fire-breathing ability',
    detail: 'H-7 produced its first flame at eighteen months, after the trainers had already begun breath drills.',
    category: 'inherited',
    sourceId: 'gene-record',
    rule: 'An inherited characteristic can appear late in life. When it appears does not change where the information came from.',
    evidence: 'Gene record F: H-7’s scan reads Ff, and the fire gene is present in both parent scans.',
    distractors: [
      {
        text: 'Drill log 8: the trainer ran breath exercises for six weeks before the first flame appeared.',
        sourceId: 'training-log',
        misconception: 'inherited-marked-acquired',
      },
      {
        text: 'A fire-breathing dragon scores higher in arena trials than one that cannot breathe fire.',
        sourceId: 'training-log',
        misconception: 'usefulness-reasoning',
      },
    ],
    sets: ['learn', 'practice'],
    sortCardId: 'fire-breathing',
  }),
  observation({
    id: 'horn-shape',
    label: 'Horn shape',
    detail: 'Two curved horns matched the hatch measurement chart at every intake.',
    category: 'inherited',
    sourceId: 'gene-record',
    rule: 'A structure listed in the allele scan and unchanged since hatching is inherited.',
    evidence: 'Gene record H: the scan reads Hh, and the horn gene sits on model chromosome 4.',
    distractors: [
      {
        text: 'Field log 9: H-7 rubbed its horns on the pen wall through the whole winter.',
        sourceId: 'environment-log',
        misconception: 'learned-environment-swap',
      },
      {
        text: 'Horns are the most useful feature in a duel, so they must be passed down.',
        sourceId: 'training-log',
        misconception: 'usefulness-reasoning',
      },
    ],
    sets: ['learn', 'practice'],
    sortCardId: 'horn-shape',
  }),
  observation({
    id: 'wing-shape',
    label: 'Wing shape',
    detail: 'Wing outline and span ratio match the hatch record and both parent records.',
    category: 'inherited',
    sourceId: 'gene-record',
    rule: 'A characteristic traced to an allele pair in the scan is inherited.',
    evidence: 'Gene record W: H-7 reads Ww, so one wing allele came from each parent.',
    distractors: [
      {
        text: 'Drill log 3: H-7 practised glide turns every morning for a season.',
        sourceId: 'training-log',
        misconception: 'inherited-marked-acquired',
      },
      {
        text: 'Wings are on the body, and everything on the body is inherited.',
        sourceId: 'gene-record',
        misconception: 'body-feature-bias',
      },
    ],
    sets: ['learn', 'practice'],
    sortCardId: 'wing-shape',
  }),
  observation({
    id: 'flight-route',
    label: 'Favourite flight route over the north ridge',
    detail: 'H-7 flies the same ridge line each evening. No other hatchling from the clutch uses it.',
    category: 'learned',
    sourceId: 'training-log',
    rule: 'A behaviour built from repeated experience is learned, not carried in alleles.',
    evidence: 'Drill log 15: the route was rewarded with feeding for thirty consecutive evenings.',
    distractors: [
      {
        text: 'Gene record: no allele in the scan is linked to a flight path.',
        sourceId: 'gene-record',
        misconception: 'body-feature-bias',
      },
      {
        text: 'The ridge has the strongest updraft in the valley, so the route is the most useful one.',
        sourceId: 'environment-log',
        misconception: 'usefulness-reasoning',
      },
    ],
    sets: ['learn', 'practice'],
    sortCardId: 'flight-route',
  }),
  observation({
    id: 'training-command',
    label: 'Response to the recall whistle',
    detail: 'H-7 returns to the perch within four seconds of the whistle. Clutch-mates that skipped drills do not.',
    category: 'learned',
    sourceId: 'training-log',
    rule: 'A response shaped by practice during life is a learned behaviour.',
    evidence: 'Drill log 21: response time fell from twenty seconds to four across eleven training sessions.',
    distractors: [
      {
        text: 'Obedient dragons are safer around handlers, so the response must be bred for.',
        sourceId: 'training-log',
        misconception: 'usefulness-reasoning',
      },
      {
        text: 'Field log 6: the whistle carries further on cold mornings.',
        sourceId: 'environment-log',
        misconception: 'learned-environment-swap',
      },
    ],
    sets: ['learn', 'practice'],
    sortCardId: 'training-command',
  }),
  observation({
    id: 'scar',
    label: 'Scar across the left wing membrane',
    detail: 'The hatch record shows an unmarked membrane. The scar first appears in the year-two intake.',
    category: 'environmental',
    sourceId: 'environment-log',
    rule: 'Damage that happens during life changes the individual, not the alleles it passes on.',
    evidence: 'Field log 14: H-7 caught the membrane on a thornbrush during the year-two survey.',
    distractors: [
      {
        text: 'The scar is part of the wing, and wing characteristics come from the wing gene.',
        sourceId: 'gene-record',
        misconception: 'body-feature-bias',
      },
      {
        text: 'Drill log 19: H-7 avoided low passes for a month afterwards.',
        sourceId: 'training-log',
        misconception: 'learned-environment-swap',
      },
    ],
    sets: ['learn', 'practice'],
    sortCardId: 'scar',
  }),
  observation({
    id: 'nest-dust',
    label: 'Grey dust on the scales',
    detail: 'Dust covers the scales at intake and is gone after the wash record on the same page.',
    category: 'environmental',
    sourceId: 'environment-log',
    rule: 'A temporary surface effect from surroundings is environmental and is not passed to offspring.',
    evidence: 'Field log 27: the pen floor was re-lined with ash sand two days before intake.',
    distractors: [
      {
        text: 'The dust dulls the scale colour, which is useful camouflage on the ash flats.',
        sourceId: 'environment-log',
        misconception: 'usefulness-reasoning',
      },
      {
        text: 'The dust sits on the scales, and scale characteristics are inherited.',
        sourceId: 'gene-record',
        misconception: 'body-feature-bias',
      },
    ],
    sets: ['learn', 'practice'],
    sortCardId: 'nest-dust',
  }),
  observation({
    id: 'wing-membrane-tone',
    label: 'Pale membrane tone',
    detail: 'Membrane tone matches the hatch record and one parent record exactly.',
    category: 'inherited',
    sourceId: 'gene-record',
    rule: 'A characteristic traced to an allele pair in the scan is inherited.',
    evidence: 'Gene record: the membrane-tone allele pair in this scan matches the dam’s recorded pair.',
    distractors: [
      {
        text: 'Field log 4: the pen skylight was replaced the season the tone was recorded.',
        sourceId: 'environment-log',
        misconception: 'learned-environment-swap',
      },
      {
        text: 'A pale membrane is easier to inspect for damage, so it is the preferred tone.',
        sourceId: 'training-log',
        misconception: 'usefulness-reasoning',
      },
    ],
    sets: ['official', 'reteach'],
  }),
  observation({
    id: 'tail-spike-count',
    label: 'Four tail spikes',
    detail: 'The spike count is identical in the hatch record, the year-one record, and this intake.',
    category: 'inherited',
    sourceId: 'gene-record',
    rule: 'A structure present from hatching and listed in the scan is inherited.',
    evidence: 'Gene record: the spike-count gene reads as a matched allele pair in this specimen scan.',
    distractors: [
      {
        text: 'Drill log 12: spike strikes were practised on the training post all spring.',
        sourceId: 'training-log',
        misconception: 'inherited-marked-acquired',
      },
      {
        text: 'More spikes score better in the arena, so the count must be inherited.',
        sourceId: 'training-log',
        misconception: 'usefulness-reasoning',
      },
    ],
    sets: ['official', 'reteach'],
  }),
  observation({
    id: 'late-bloom-crest',
    label: 'Neck crest that appeared in year two',
    detail: 'No crest at hatching. A full crest is recorded at the year-two intake, with no change in handling.',
    category: 'inherited',
    sourceId: 'gene-record',
    rule: 'Inherited characteristics can develop later. Late appearance is not evidence of learning.',
    evidence: 'Gene record: the crest gene is present in this scan and in both parent scans.',
    distractors: [
      {
        text: 'It was not there at hatching, so it must have been picked up during life.',
        sourceId: 'training-log',
        misconception: 'inherited-marked-acquired',
      },
      {
        text: 'Field log 31: the pen was moved to a sunnier yard during year two.',
        sourceId: 'environment-log',
        misconception: 'learned-environment-swap',
      },
    ],
    sets: ['official', 'reteach'],
  }),
  observation({
    id: 'perch-preference',
    label: 'Always roosts on the east perch',
    detail: 'H-7 chooses the same perch every night. Clutch-mates rotate perches.',
    category: 'learned',
    sourceId: 'training-log',
    rule: 'A preference built from repeated experience is learned.',
    evidence: 'Drill log 26: the east perch was the feeding station for the first six months.',
    distractors: [
      {
        text: 'The east perch is warmest at dawn, which makes it the best perch to choose.',
        sourceId: 'environment-log',
        misconception: 'usefulness-reasoning',
      },
      {
        text: 'Roosting is a body behaviour, and body traits are inherited.',
        sourceId: 'gene-record',
        misconception: 'body-feature-bias',
      },
    ],
    sets: ['official', 'reteach'],
  }),
  observation({
    id: 'signal-response',
    label: 'Responds to the red flag signal',
    detail: 'H-7 lands when the red flag is raised. Two clutch-mates ignore it.',
    category: 'learned',
    sourceId: 'training-log',
    rule: 'A trained response is acquired during life and is not carried in alleles.',
    evidence: 'Drill log 33: the flag was paired with landing practice for nine sessions.',
    distractors: [
      {
        text: 'Gene record: no allele in this scan is linked to flag recognition.',
        sourceId: 'gene-record',
        misconception: 'body-feature-bias',
      },
      {
        text: 'Landing on command keeps handlers safe, so it must be bred into the line.',
        sourceId: 'training-log',
        misconception: 'usefulness-reasoning',
      },
    ],
    sets: ['official', 'reteach'],
  }),
  observation({
    id: 'sun-bleached-scales',
    label: 'Bleached scale tips along the spine',
    detail: 'Tips are pale only where the spine is exposed to sun in the open yard.',
    category: 'environmental',
    sourceId: 'environment-log',
    rule: 'A change produced by surroundings during life is environmental.',
    evidence: 'Field log 18: H-7 spent the dry season in the open yard while the roof was rebuilt.',
    distractors: [
      {
        text: 'Scale colour is in the scan, so any scale change must be inherited.',
        sourceId: 'gene-record',
        misconception: 'body-feature-bias',
      },
      {
        text: 'Pale tips reflect heat, which is useful in the dry season.',
        sourceId: 'environment-log',
        misconception: 'usefulness-reasoning',
      },
    ],
    sets: ['official', 'reteach'],
  }),
  observation({
    id: 'growth-from-diet',
    label: 'Larger body mass than clutch-mates',
    detail: 'H-7 weighs a third more than its clutch-mates, which were fed from a different store.',
    category: 'environmental',
    sourceId: 'environment-log',
    rule: 'A difference produced by conditions such as nutrition is environmental in this model.',
    evidence: 'Field log 29: H-7 received the enriched feed ration for two full seasons.',
    distractors: [
      {
        text: 'Body size is physical, so it has to be inherited.',
        sourceId: 'gene-record',
        misconception: 'body-feature-bias',
      },
      {
        text: 'Larger dragons win more arena matches, so mass is a bred advantage.',
        sourceId: 'training-log',
        misconception: 'usefulness-reasoning',
      },
    ],
    sets: ['official', 'reteach'],
  }),
];

const OBSERVATION_BY_ID = new Map(
  TRAIT_EVIDENCE_OBSERVATIONS.map(item => [item.id, item] as const),
);

export function traitEvidenceObservation(id: string): TraitEvidenceObservation {
  const found = OBSERVATION_BY_ID.get(id);
  if (!found) throw new Error(`Unknown trait evidence observation: ${id}`);
  return found;
}

/** Reteach bundles isolate one diagnosed misconception with examples the student has not seen. */
export const TRAIT_EVIDENCE_RETEACH: Readonly<Record<TraitEvidenceMisconception, readonly string[]>> = {
  'acquired-marked-inherited': ['sun-bleached-scales', 'perch-preference', 'growth-from-diet'],
  'inherited-marked-acquired': ['late-bloom-crest', 'tail-spike-count', 'wing-membrane-tone'],
  'learned-environment-swap': ['perch-preference', 'sun-bleached-scales', 'signal-response'],
  'usefulness-reasoning': ['signal-response', 'wing-membrane-tone', 'growth-from-diet'],
  'body-feature-bias': ['sun-bleached-scales', 'growth-from-diet', 'late-bloom-crest'],
};

export const TRAIT_EVIDENCE_MISCONCEPTION_NOTES: Readonly<Record<TraitEvidenceMisconception, string>> = {
  'acquired-marked-inherited': 'This characteristic changed during the specimen’s life. Changes acquired during life are not written back into the alleles an organism passes on.',
  'inherited-marked-acquired': 'Practice happened alongside this characteristic, but the record traces it to an allele pair. Inherited characteristics can still appear late.',
  'learned-environment-swap': 'Both records describe changes during life. Ask whether the change came from repeated practice by the animal or from its surroundings.',
  'usefulness-reasoning': 'How useful a characteristic seems does not decide the category. Classify from the record that shows where it came from.',
  'body-feature-bias': 'Being part of the body does not make a characteristic inherited. A scar, a stain, and extra growth are all physical and all acquired.',
};

/** Learn walks the worked example first; practice varies the order from the scene seed. */
export function traitEvidenceSet(
  setId: TraitEvidenceSetId,
  seed: string,
): readonly TraitEvidenceObservation[] {
  const items = TRAIT_EVIDENCE_OBSERVATIONS.filter(item => item.sets.includes(setId));
  if (setId === 'learn') return items;
  return deterministicOrder(items, seed);
}

export function traitEvidenceReteachSet(
  misconception: TraitEvidenceMisconception | null,
  exclude: readonly string[] = [],
): readonly TraitEvidenceObservation[] {
  const ids = misconception
    ? TRAIT_EVIDENCE_RETEACH[misconception]
    : TRAIT_EVIDENCE_RETEACH['acquired-marked-inherited'];
  const fresh = ids.filter(id => !exclude.includes(id)).map(traitEvidenceObservation);
  return fresh.length ? fresh : ids.map(traitEvidenceObservation);
}

export function deterministicOrder<T extends { id: string }>(
  items: readonly T[],
  seed: string,
): readonly T[] {
  return [...items].sort((left, right) =>
    stableHash(`${seed}:${left.id}`) - stableHash(`${seed}:${right.id}`)
    || left.id.localeCompare(right.id));
}

/**
 * The station renders label IDs; this map supplies the wording. Structural chrome uses the
 * same map so a translation or rewrite never requires a code change in the display.
 */
export const TRAIT_EVIDENCE_COPY: StationCopy = {
  [`sample.${TRAIT_EVIDENCE_SPECIMEN.id}.label`]: 'Specimen H-7 · intake 04-19',
  [`sample.${TRAIT_EVIDENCE_SPECIMEN.id}.caption`]: 'Second-generation hatchling from the royal clutch. This console analyses records only — no body artwork is used as evidence.',

  'source.gene-record.title': 'Gene record',
  'source.gene-record.caption': 'Allele scans for the specimen and both parents.',
  'source.training-log.title': 'Training log',
  'source.training-log.caption': 'Drills, repetitions, and recorded responses.',
  'source.environment-log.title': 'Field and environment log',
  'source.environment-log.caption': 'Pen conditions, feed, weather, and injuries.',

  'tray.inherited.title': 'Inherited',
  'tray.inherited.caption': 'Information passed through alleles from parents.',
  'tray.learned.title': 'Learned',
  'tray.learned.caption': 'Behaviour built by practice during life.',
  'tray.environmental.title': 'Environmental',
  'tray.environmental.caption': 'Change produced by surroundings during life.',

  'prediction.inherited.caption': 'Came from the parents’ alleles.',
  'prediction.learned.caption': 'Built by repeated experience.',
  'prediction.environmental.caption': 'Caused by surroundings or conditions.',

  'evidence-path.inspect': 'Read the observation record before you decide anything.',
  'evidence-path.predict': 'Lock a classification first. The evidence path stays closed until you commit.',
  'evidence-path.trace': 'The console traces the record back to the instrument that first captured it.',
  'evidence-path.place': 'Your tray choice is carried into the classification bay.',
  'evidence-path.reveal': 'Now pin the clue that shows where this characteristic came from.',

  ...Object.fromEntries(TRAIT_EVIDENCE_OBSERVATIONS.flatMap(item => [
    [`observation.${item.id}.label`, item.label],
    [`observation.${item.id}.detail`, item.detail],
    ...item.clues.map(clue => [`clue.${clue.id}`, clue.text] as const),
  ])),
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
