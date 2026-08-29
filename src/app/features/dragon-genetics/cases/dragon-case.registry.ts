/**
 * Runtime status: ACTIVE — registry of optional field cases attached to shared lessons.
 * Inputs/signals: static case definitions; enablement is supplied separately by case settings.
 * Data access: code-owned mission metadata and workstation route references.
 * Connects to: lesson branch cards, DragonCasePage, and blood/protein workstations.
 */
import { DragonCaseDefinition, DragonCaseId } from './dragon-case.models';

export const DRAGON_CASES: readonly DragonCaseDefinition[] = [
  {
    id: 'dragon-in-the-ash',
    anchorLessonId: 'alleles-and-phenotypes',
    pathIds: ['arena', 'mini-show'],
    title: 'The Dragon in the Ash',
    subtitle: 'Rockfall emergency commission',
    clientName: 'Healer Bryn',
    clientRole: 'Emergency healer',
    problem:
      'A foundling pulled from an Ashfall rockslide has lost too much blood. Bryn needs a donor recommendation supported by direct blood-test evidence.',
    constraint:
      'The healing station is operating with challenge supplies. The universal donor has only one reserve unit, so preserve it when another safe donor is supported.',
    acceptance:
      'Attach a patient result and a donor result, then recommend a donor and explain which markers make the transfusion safe or unsafe.',
    missionText: 'Gather enough blood-test evidence to recommend a donor Bryn can defend.',
    workstation: {
      id: 'blood-type-lab',
      title: 'Emergency Healing Station',
      route: '/dragon-genetics/blood-type-lab',
    },
  },
  {
    id: 'food-that-steals-fire',
    anchorLessonId: 'alleles-and-phenotypes',
    pathIds: ['arena', 'mini-show'],
    title: 'The Food That Steals Fire',
    subtitle: 'Wasting Clutch clinical commission',
    clientName: 'Healer Fen',
    clientRole: 'Clinical genetics specialist',
    problem:
      'Tide survived the rockfall, but recovery stalls after Dracose-rich feed. Other hatchlings from the clutch show the same pattern while two nestmates appear healthy.',
    constraint:
      'The diagnosis must account for both chromosome 4 copies, protein function, and the patient response. A diet can manage exposure, but it cannot rewrite DNA.',
    acceptance:
      'Attach a saved Molecular Rescue Record that traces both samples from DNA through protein function and includes at least one food trial and a diet recommendation.',
    missionText:
      'Trace both Dracase copies, test their products, and recommend a diet supported by the patient response.',
    workstation: {
      id: 'protein-rescue',
      title: 'Dracose Response Unit',
      route: '/dragon-genetics/protein-rescue',
    },
  },
];

export const DRAGON_CASE_BY_ID: Readonly<Record<DragonCaseId, DragonCaseDefinition>> =
  Object.fromEntries(DRAGON_CASES.map((definition) => [definition.id, definition])) as Readonly<
    Record<DragonCaseId, DragonCaseDefinition>
  >;

export function isDragonCaseId(value: string | null): value is DragonCaseId {
  return value === 'dragon-in-the-ash' || value === 'food-that-steals-fire';
}
