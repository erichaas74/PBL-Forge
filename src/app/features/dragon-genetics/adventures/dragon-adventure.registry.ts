/**
 * Runtime status: ACTIVE — authored story and checkpoint registry for optional adventures.
 * Inputs/signals: static curriculum content; path styling is applied by the shared shell.
 * Data access: none; this file contains narrative metadata, not scientific answers.
 * Connects to: DragonAdventurePage, optional lesson routes, and commission routes.
 */
import { DragonAdventureDefinition, DragonAdventureId } from './dragon-adventure.models';

export const DRAGON_ADVENTURES: readonly DragonAdventureDefinition[] = [
  {
    id: 'pedigree-reading',
    kind: 'extra-lesson',
    lessonId: 'pedigree-reading',
    title: 'The Frost King’s Hidden Heirs',
    subtitle: 'Reading a Pedigree',
    clientName: 'Archivist Solveig',
    clientRole: 'Keeper of the Northern Register',
    storyQuestion: 'Did Vyrak’s pale-scale allele disappear, or is it hidden in living descendants?',
    rewardId: 'frost-archive-seal',
    rewardLabel: 'Frost Archive Seal',
    theme: 'frost',
    illustration: {
      src: '/assets/dragon-genetics/adventures/frost-hidden-heirs.webp',
      alt: 'Young dragons examine a glowing family pedigree beneath a portrait of the pale Frost King.',
      storyCaption: 'The archive is full of visible clues—and alleles that cannot be seen.',
      choiceCaption: 'Which living descendant would give the most useful evidence?',
    },
    workstation: {
      route: '/dragon-genetics/pedigree-lab',
      title: 'Frost King Pedigree Lab',
      investigationId: 'frost-scale',
    },
    checkpoints: [
      { id: 'model-selected', label: 'Inheritance model recorded' },
      { id: 'carrier-supported', label: 'Supported carrier call saved' },
      { id: 'sequence-recorded', label: 'Sequencing evidence recorded' },
      { id: 'verdict-written', label: 'Archive verdict written' },
    ],
    chapters: [
      {
        id: 'offer', kind: 'offer', kicker: 'A sealed archive', title: 'The pale scale vanished from sight.',
        summary: 'Solveig has found an old scale fragment and a living bloodline that may still carry its allele.',
      },
      {
        id: 'briefing', kind: 'briefing', kicker: 'Archive briefing', title: 'Follow the frost through the generations.',
        summary: 'A visible trait can disappear even while an allele passes silently through a family.',
        panels: [
          { title: 'The Frost King', text: 'Vyrak’s unbanded pale scales were once unmistakable.', speaker: 'Solveig' },
          { title: 'The last sighting', text: 'Ivrid the Pale died generations ago. No living dragon shows the same appearance.' },
          { title: 'The living register', text: 'Use relationships, a model, and limited sequencing to decide whether the allele survived.' },
        ],
      },
      {
        id: 'investigate', kind: 'investigation', kicker: 'Open investigation', title: 'Build the hidden lineage record.',
        summary: 'Test a model, mark a carrier with a reason, and sequence where the pedigree alone leaves uncertainty.',
      },
      {
        id: 'decision', kind: 'decision', kicker: 'Archivist’s verdict', title: 'Does the Frost King’s allele survive?',
        summary: 'Submit the model, carrier record, sequencing result, and hypothesis saved in the archive.',
      },
      {
        id: 'outcome', kind: 'outcome', kicker: 'Hall of Records', title: 'The archive answers.',
        summary: 'A supported record receives Solveig’s seal; contradictions return with the evidence preserved.',
      },
    ],
  },
  {
    id: 'pedigree-models',
    kind: 'extra-lesson',
    lessonId: 'pedigree-models',
    title: 'The Three Tails of Stonewake',
    subtitle: 'Choosing Between Inheritance Models',
    clientName: 'The Stonewake Council',
    clientRole: 'Guardians of the tail-form register',
    storyQuestion: 'Which inheritance model can explain all three Stonewake tail forms without contradiction?',
    rewardId: 'stonewake-modelers-mark',
    rewardLabel: 'Stonewake Modeler’s Mark',
    theme: 'stone',
    illustration: {
      src: '/assets/dragon-genetics/adventures/stonewake-three-tails.webp',
      alt: 'Dragon scholars compare three carved tail forms, pedigree scrolls, and sequencing crystals.',
      storyCaption: 'Three forms enter the record. Only a consistent model can explain them all.',
      choiceCaption: 'Choose the model and sequence that make every carving make sense.',
    },
    workstation: {
      route: '/dragon-genetics/pedigree-lab',
      title: 'Stonewake Pedigree Lab',
      investigationId: 'stonewake-tail',
    },
    checkpoints: [
      { id: 'models-compared', label: 'Multiple models tested' },
      { id: 'contradictions-resolved', label: 'Contradictions resolved' },
      { id: 'sequence-recorded', label: 'Discriminating sequence recorded' },
      { id: 'verdict-written', label: 'Model defense written' },
    ],
    chapters: [
      {
        id: 'offer', kind: 'offer', kicker: 'A disputed monument', title: 'Three tails are carved in Stonewake stone.',
        summary: 'The council’s old two-form explanation cannot account for every recorded descendant.',
      },
      {
        id: 'briefing', kind: 'briefing', kicker: 'Council briefing', title: 'Competing models enter the archive.',
        summary: 'A useful model must explain the whole pedigree, not only one convenient dragon.',
        panels: [
          { title: 'The quiet tail', text: 'Korrak’s original tail form has not appeared since his death.' },
          { title: 'The third carving', text: 'Later records show a middle appearance that two-phenotype models struggle to explain.' },
          { title: 'Four crystals', text: 'Test competing models first, then spend sequencing where it separates those still standing.' },
        ],
      },
      {
        id: 'investigate', kind: 'investigation', kicker: 'Open investigation', title: 'Make the models face the same evidence.',
        summary: 'Compare model histories, contradiction seals, and a strategic sequence in the Stonewake archive.',
      },
      {
        id: 'decision', kind: 'decision', kicker: 'Council finding', title: 'Defend the model that survived.',
        summary: 'The council needs a model, the contradiction evidence that eliminated its rivals, and a written defense.',
      },
      {
        id: 'outcome', kind: 'outcome', kicker: 'Official register', title: 'Stonewake records the decision.',
        summary: 'A consistent model enters the register; an unresolved conflict returns to the archive for revision.',
      },
    ],
  },
  {
    id: 'dragon-in-the-ash',
    kind: 'commission',
    lessonId: 'alleles-and-phenotypes',
    title: 'The Dragon in the Ash',
    subtitle: 'Rockfall emergency commission',
    clientName: 'Healer Bryn',
    clientRole: 'Emergency healer',
    storyQuestion: 'Which donor is supported by direct patient and donor blood-test evidence?',
    rewardId: 'healers-seal',
    rewardLabel: 'Healer’s Seal',
    theme: 'ash',
    illustration: {
      src: '/assets/dragon-genetics/adventures/dragon-in-ash.webp',
      alt: 'A healer comforts a rescued young dragon while two possible donors hold glowing blood-test tiles.',
      storyCaption: 'The donors are ready, but the test evidence must decide who can safely help.',
      choiceCaption: 'Bryn will act on the patient and donor records you choose.',
      objectPosition: 'center 48%',
    },
    workstation: { route: '/dragon-genetics/blood-type-lab', title: 'Emergency Healing Station' },
    checkpoints: [
      { id: 'patient-record', label: 'Patient blood record attached' },
      { id: 'donor-record', label: 'Donor blood record attached' },
      { id: 'recommendation-submitted', label: 'Evidence-backed recommendation submitted' },
    ],
    chapters: [
      {
        id: 'offer', kind: 'offer', kicker: 'Rockfall alert', title: 'A foundling needs evidence, not a guess.',
        summary: 'Bryn has time to test before treatment, but the universal-donor reserve is nearly gone.',
      },
      {
        id: 'briefing', kind: 'briefing', kicker: 'Emergency briefing', title: 'Appearance is a clue. Compatibility is evidence.',
        summary: 'A donor who resembles the patient may still carry unsafe blood-cell markers.',
        panels: [
          { title: 'The academy gate', text: 'A rescue cart arrives through an Ashfall storm.', speaker: 'Scout Runa' },
          { title: 'The healing station', text: 'The foundling’s flame is weak, but Bryn refuses to guess.' },
          { title: 'The donor stalls', text: 'Test the patient and donors, then attach the records you trust.' },
        ],
      },
      {
        id: 'investigate', kind: 'investigation', kicker: 'Open investigation', title: 'Build a compatibility record.',
        summary: 'Attach at least one patient result and one donor result from the Emergency Healing Station.',
      },
      {
        id: 'decision', kind: 'decision', kicker: 'Treatment decision', title: 'Commit before Bryn begins treatment.',
        summary: 'Select the records you trust and explain which A or B markers make the donor safe or unsafe.',
      },
      {
        id: 'outcome', kind: 'outcome', kicker: 'Patient consequence', title: 'The evidence reaches the treatment table.',
        summary: 'Supported evidence stabilizes the patient; a conflict pauses treatment without deleting the investigation.',
      },
    ],
  },
  {
    id: 'food-that-steals-fire',
    kind: 'commission',
    lessonId: 'alleles-and-phenotypes',
    title: 'The Food That Steals Fire',
    subtitle: 'Wasting Clutch clinical commission',
    clientName: 'Healer Fen',
    clientRole: 'Clinical genetics specialist',
    storyQuestion: 'What molecular pathway explains the symptoms, and which diet is supported by patient trials?',
    rewardId: 'molecular-rescue-record',
    rewardLabel: 'Molecular Rescue Record',
    theme: 'fire',
    illustration: {
      src: '/assets/dragon-genetics/adventures/food-steals-fire.webp',
      alt: 'A healer and two young dragons trace glowing chromosome samples through a protein model to three food bowls.',
      storyCaption: 'The trail runs from two gene copies to protein function, food, and flame.',
      choiceCaption: 'Choose the explanation and food plan supported by the whole molecular trail.',
    },
    workstation: { route: '/dragon-genetics/protein-rescue', title: 'Dracose Response Unit' },
    checkpoints: [
      { id: 'rescue-record', label: 'Molecular Rescue Record attached' },
      { id: 'molecular-explanation', label: 'DNA-to-symptom explanation written' },
      { id: 'diet-and-claim', label: 'Diet and repair claim evaluated' },
    ],
    chapters: [
      {
        id: 'offer', kind: 'offer', kicker: 'Recovery alert', title: 'The foundling’s fire fades after feeding.',
        summary: 'The pattern follows Dracose-rich food, but the explanation may begin inside chromosome 4.',
      },
      {
        id: 'briefing', kind: 'briefing', kicker: 'Clinical briefing', title: 'Follow both gene copies to the patient.',
        summary: 'A complete explanation must connect DNA, mRNA, protein, function, digestion, and symptoms.',
        panels: [
          { title: 'The fading flame', text: 'The patient weakens after a bowl that passed every kitchen inspection.' },
          { title: 'Two cartridges', text: 'Fen loads two chromosome-copy samples without revealing what either will produce.' },
          { title: 'The molecular trail', text: 'Trace both copies and test the foods before recommending a rescue plan.' },
        ],
      },
      {
        id: 'investigate', kind: 'investigation', kicker: 'Open investigation', title: 'Complete the molecular trail.',
        summary: 'Save a record containing both chromosome samples, protein-function evidence, food trials, and a diet.',
      },
      {
        id: 'decision', kind: 'decision', kicker: 'Rescue decision', title: 'Explain what the diet changes—and what it cannot.',
        summary: 'Attach the clinical record, state the molecular diagnosis, recommend a diet, and review the repair claim.',
      },
      {
        id: 'outcome', kind: 'outcome', kicker: 'Patient consequence', title: 'The rescue plan reaches the feeding stall.',
        summary: 'A complete evidence chain restores steady energy; missing links return for revision.',
      },
    ],
  },
];

export const DRAGON_ADVENTURE_BY_ID = Object.fromEntries(
  DRAGON_ADVENTURES.map((definition) => [definition.id, definition]),
) as Readonly<Record<DragonAdventureId, DragonAdventureDefinition>>;

export function isDragonAdventureId(value: string | null): value is DragonAdventureId {
  return DRAGON_ADVENTURES.some((definition) => definition.id === value);
}
