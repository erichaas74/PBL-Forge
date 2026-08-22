import { DRAGON_SIMULATIONS } from '../adaptive/dragon-simulation.registry';
import { DRAGON_PROJECT_HUB_DEFINITION } from '../project/dragon-project-hub.definition';
import { dragonJourneyLesson, dragonJourneyPath } from '../journey/config/dragon-journey.registry';
import { answerGeneticsConcept } from './wise-dragon-answers';

export interface WiseDragonGuideContext {
  id: string;
  title: string;
  goal: string;
  welcome: string;
  operations: string;
  evidence: string;
  explanation: string;
  saved: string;
}

export interface WiseDragonQuickQuestion {
  id: 'start' | 'choices' | 'notice' | 'saved';
  label: string;
  question: string;
}

export const WISE_DRAGON_QUICK_QUESTIONS: readonly WiseDragonQuickQuestion[] = [
  { id: 'start', label: 'Where can I start?', question: 'Where can I start on this page?' },
  { id: 'choices', label: 'Show my choices', question: 'What can I change or try?' },
  {
    id: 'notice',
    label: 'What should I notice?',
    question: 'What evidence should I notice?',
  },
  {
    id: 'saved',
    label: 'What gets saved?',
    question: 'What evidence gets saved?',
  },
];

interface GuideDetails {
  operations: string;
  evidence: string;
  explanation: string;
  saved?: string;
}

const PROJECT_GUIDE: GuideDetails = {
  operations:
    'Open any investigation or saga path, regardless of what you have completed. The glowing current quest is a suggestion, not a required tour.',
  evidence:
    'Every investigation is open. The map shows which work is ready, in progress, or complete, while saved records collect in the Evidence Vault for later comparison.',
  explanation:
    'Name the investigation, the evidence record it produced, and the genetics idea that record supports. A strong explanation says what the evidence shows and what it cannot show yet.',
};

const DEFAULT_GUIDE: GuideDetails = {
  operations:
    'Begin with any available specimen or control. Change one meaningful thing, observe the result, and repeat or compare when you need stronger evidence.',
  evidence:
    'Look for a visible result or instrument readout that changed because of your action. Untested and incomplete states are useful evidence too.',
  explanation:
    'Build a claim from a specific action and observation: “When I changed __, I observed __. This supports __ because __.”',
};

const GUIDE_DETAILS: Readonly<Record<string, GuideDetails>> = {
  'trait-evidence': {
    operations:
      'Choose an observation, inspect its appearance, gene record, training log, and environment record, and run any available behavior test. Place a claim only when the records support it.',
    evidence:
      'Separate evidence present at inheritance from changes recorded during the dragon’s life. A visible feature by itself is not proof that it was inherited.',
    explanation:
      'Name the record that connects the characteristic to inheritance or to a life experience. Explain why that record is stronger than appearance alone.',
  },
  'genome-microscope': {
    operations:
      'Use the scale map or zoom controls to move among the dragon, cell, nucleus, chromosomes, a gene region, DNA, and protein. You may enter at any available level and move in either direction.',
    evidence:
      'Watch what remains part of the larger structure as you change scale. At chromosome and gene levels, compare matching loci and inherited copies.',
    explanation:
      'Describe where your chosen structure is located, what it contains, and how the next smaller or larger level is related to it.',
  },
  'allele-workbench': {
    operations:
      'Choose a released chromosome and gene, then load neutral allele samples into the two reference positions by dragging or by selecting a sample and destination. Try combinations in any order and repeat them when useful.',
    evidence:
      'Compare the sample patterns, chromosome locus, and phenotype produced after two samples are loaded. Keep different allele combinations distinct in your chart.',
    explanation:
      'Connect the tested allele pair to the phenotype you actually observed. Use repeated combinations to support a pattern without labeling an untested sample.',
  },
  'punnett-composer': {
    operations:
      'Choose a trait and parent records, then place each available gamete along its side of the square. Select any completed cell to inspect the offspring combination, and clear or rebuild the square whenever you want.',
    evidence:
      'Check that every cell combines one gamete from each parent. Count all possible cells before turning the outcomes into a predicted proportion.',
    explanation:
      'State which parent gametes were possible, how the cells combine them, and why the completed square predicts probability rather than guaranteeing one offspring.',
  },
  'incubator-sampler': {
    operations:
      'Run a clutch, sort hatchlings into phenotype buckets, and compare generation records. Repeat the sampling or change the breeding pool when you need more evidence.',
    evidence:
      'Compare counts and proportions across more than one clutch or generation. Small samples may vary even when they come from the same inheritance model.',
    explanation:
      'Use the recorded counts to describe a pattern, then distinguish the expected probability from the result of one sample.',
  },
  'dna-process-lab': {
    operations:
      'Load two DNA records, choose the comparison scope, align or swap them, and inspect positions that differ. Save a comparison only after the visible sequence evidence supports it.',
    evidence:
      'Name the exact base or region that differs. Then follow the model far enough to see whether the change affects a codon, protein, or recorded function.',
    explanation:
      'Trace one evidence chain from DNA position to molecular consequence. Do not claim a phenotype change unless the model actually shows that link.',
  },
  'diversity-manager': populationGuide(),
  'island-diversity': populationGuide(),
  'dragon-hatchery': {
    operations:
      'Choose a female and male parent, run meiosis for either parent, and load one available gamete into each chamber. Once both chambers contain scientifically valid gametes, combine them to create an offspring record.',
    evidence:
      'Track which chromosome and allele copy entered each gamete and which two copies appear in the offspring. Repeated offspring may differ because gamete selection differs.',
    explanation:
      'Trace one offspring allele back to each parent’s gamete, then connect the paired genotype to the observed offspring record.',
  },
  'dragon-arena': {
    operations:
      'Choose an eligible champion, run fair trials, and compare the trial records. Reuse the same champion or compare champions while keeping your battle choices in view.',
    evidence:
      'Use the champion’s genotype and phenotype record together with a specific arena event, time, health, or score. A win alone does not prove that one inherited trait caused the outcome.',
    explanation:
      'Connect genotype to phenotype, phenotype to an available arena action or effect, and that effect to a recorded observation. Also name how player choices or chance limit the claim.',
  },
  'pedigree-lab': {
    operations:
      'Choose a bloodline archive, inspect relatives in any order, and test an inheritance model against the visible records. Use limited sequencing samples where they can distinguish competing models, then revise freely.',
    evidence:
      'Look for appearances across parents, offspring, and generations, plus any genotype samples you chose to reveal. One individual rarely settles the model.',
    explanation:
      'Show how the proposed model fits several related dragons and identify the record that rules out an alternative model.',
  },
  'protein-rescue': {
    operations:
      'Load a patient, compare its gene copies, run transcription and translation, test protein function, and try foods in the digestion chamber. You can revisit any instrument before saving a rescue record.',
    evidence:
      'Follow the same copy from DNA through RNA codons and amino acids to protein function, then compare that result with the patient’s food-trial record.',
    explanation:
      'Trace the chain in order of cause: sequence difference, protein consequence, and observed food response. Cite the instrument readout at each link.',
  },
  'blood-type-lab': {
    operations:
      'Load and test the patient sample, then test available donors with the same reagents. Compare marker evidence before staging a donor in the Healing Chamber, and revise the choice if needed.',
    evidence:
      'Record which reagents react for the patient and each donor. Compatibility comes from the marker comparison, not from a dragon’s appearance or name.',
    explanation:
      'State the patient markers, donor markers, and the modeled compatibility rule that connects those observations to the trial result.',
  },
  'candling-workstation': {
    operations:
      'Examine the assigned egg with the available candling views and compare that phenotype evidence with its sealed DNA sample. Request another egg whenever you need a contrasting case.',
    evidence:
      'Keep candling observations separate from DNA evidence. Ask which conclusions each source can support and which remain uncertain before hatching.',
    explanation:
      'Name the evidence source for every claim. Contrast what the visible egg suggests with what the genotype record establishes.',
  },
  'companion-show': {
    operations:
      'Choose a show standard, pair available dragons, inspect a litter, and decide which young to keep. Train selected dragons at any station and compare inherited aptitude with learned performance.',
    evidence:
      'Use pedigree and phenotype records for inherited traits, and training logs for learned skills. A strong show record keeps those evidence types separate.',
    explanation:
      'Identify which champion features came from inheritance and which performance changed through training, then cite the matching record for each.',
  },
  'mini-dragon-pedigree': {
    operations:
      'Choose a rare form, compare dragons across generations, and flag any candidate whose family record supports your reasoning. You can revise flags at any time.',
    evidence:
      'Compare parents, siblings, and offspring. A dragon that does not show a recessive form may still be a useful carrier candidate.',
    explanation:
      'Name the family relationship and outcome that makes your flagged candidate stronger than a choice based only on appearance.',
    saved: 'Flagged candidates are saved to the shared mini-dragon breeding record.',
  },
  'mini-dragon-training': {
    operations:
      'Choose a mini dragon and any available training activity. Repeat or compare sessions to see what practice changes.',
    evidence:
      'Use training logs for learned performance and pedigree or phenotype records for inherited features. Keep those evidence types separate.',
    explanation:
      'Describe what changed after practice without claiming that a learned score was inherited.',
    saved: 'Completed training sessions are saved to that dragon’s shared kennel record.',
  },
  'mini-dragon-arena': {
    operations:
      'Choose an eligible mini dragon, run the show card, inspect the judges’ evidence, and register a breed only when the record supports it.',
    evidence:
      'Compare phenotype, pedigree consistency, and training performance. No single score proves the whole breed claim.',
    explanation:
      'Cite one inherited record and one performance record, then explain the limit of each.',
    saved: 'Show runs and completed registry entries are saved to the shared breeding program.',
  },
  'viking-breeding': {
    operations:
      'Inspect the kennel, choose a pairing, make a prediction, and compare the resulting line with the breeding goal.',
    evidence: 'Track parent traits, predicted outcomes, and actual offspring across generations.',
    explanation:
      'Use before-and-after line evidence to justify the next pairing rather than choosing by appearance alone.',
  },
  'island-expedition': {
    operations:
      'Scan an island population, inspect its dossier and dragons, then make and record a prediction.',
    evidence:
      'Compare trait frequencies, allele evidence, and environmental conditions across islands.',
    explanation:
      'Connect the population pattern to evidence while keeping correlation separate from proof of cause.',
  },
};

export function resolveWiseDragonGuideContext(url: string): WiseDragonGuideContext {
  const path = normalizePath(url);
  if (path === '/dragon-genetics') {
    return createContext(
      'dragon-genetics',
      DRAGON_PROJECT_HUB_DEFINITION.title,
      DRAGON_PROJECT_HUB_DEFINITION.mission,
      PROJECT_GUIDE,
    );
  }

  const canonicalPath =
    path === '/dragon-genetics/allele-workbench-reference'
      ? '/dragon-genetics/allele-workbench'
      : path;
  const journeyMatch = canonicalPath.match(
    /^\/dragon-genetics\/journey\/([^/]+)(?:\/lesson\/([^/]+))?$/,
  );
  if (journeyMatch) {
    const journeyPath = dragonJourneyPath(decodeURIComponent(journeyMatch[1]));
    const lesson = dragonJourneyLesson(
      journeyMatch[2] ? decodeURIComponent(journeyMatch[2]) : null,
    );
    if (journeyPath && lesson?.pathId === journeyPath.id) {
      const choices = lesson.workstationVisits
        .map((visit) => `${visit.title}: ${visit.launchHint}`)
        .join(' ');
      const requirements = lesson.requirements.map((requirement) => requirement.label).join('; ');
      return createContext(`journey-${lesson.id}`, lesson.title, lesson.learningGoal, {
        operations: choices,
        evidence: `This lesson is ready when your work shows: ${requirements}.`,
        explanation: lesson.learningGoal,
        saved:
          'Return to this lesson after working. Its evidence check reads your saved workstation records automatically.',
      });
    }
    if (journeyPath) {
      return createContext(
        `journey-${journeyPath.id}`,
        journeyPath.title,
        journeyPath.description,
        {
          operations:
            'Open any available lesson. The highlighted lesson is your suggested next place, and completed lessons remain available for review.',
          evidence:
            'Each lesson names the evidence it needs. A lesson changes to complete only after that evidence has been saved.',
          explanation:
            'Use the lesson goal to connect a workstation observation to the larger breeding story.',
          saved: 'Lesson and path progress are calculated from your shared evidence records.',
        },
      );
    }
  }
  const activity = DRAGON_PROJECT_HUB_DEFINITION.activities.find(
    (candidate) => candidate.route === canonicalPath,
  );
  const routeId = canonicalPath.split('/').filter(Boolean).at(-1) ?? 'dragon-genetics';
  const simulation = DRAGON_SIMULATIONS.find((candidate) => candidate.id === routeId);
  const id = activity?.id ?? simulation?.id ?? routeId;
  const title = activity?.title ?? simulation?.title ?? titleFromId(id);
  const goal = activity?.objective ?? simulation?.goal ?? DRAGON_PROJECT_HUB_DEFINITION.mission;

  return createContext(id, title, goal, GUIDE_DETAILS[id] ?? DEFAULT_GUIDE);
}

export function answerWiseDragonGuideQuestion(
  context: WiseDragonGuideContext,
  question: string,
): string {
  const normalized = question.trim().toLowerCase();

  if (
    /\b(correct answer|give me the answer|tell me the answer|which answer|solve it)\b/.test(
      normalized,
    )
  ) {
    return `I will help you investigate ${context.title}, but I will not reveal an untested result. Tell me what you changed and what the page showed; then we can decide which evidence supports your answer.`;
  }
  if (
    /\b(what (can|should) i (do|try)|how do i start|where do i start|how (can|do) i (use|run|load|test))\b/.test(
      normalized,
    ) ||
    /\b(button|control|drag|drop|click|start)\b/.test(normalized)
  ) {
    return context.operations;
  }
  if (/\b(save|saved|record|progress|finish|complete)\b/.test(normalized)) {
    return context.saved;
  }
  if (/\b(notice|observe|look for|evidence|compare|result)\b/.test(normalized)) {
    return context.evidence;
  }
  if (/\b(explain|reasoning|claim|conclusion|write|defend)\b/.test(normalized)) {
    return context.explanation;
  }

  const conceptAnswer = answerGeneticsConcept(question);
  if (conceptAnswer) return conceptAnswer;

  return `Keep the goal for ${context.title} in view: ${context.goal} Tell me which specimen or control you used and what changed on the page, and I can help you interpret that evidence without giving away an untested result.`;
}

function populationGuide(): GuideDetails {
  return {
    operations:
      'Choose a population, inspect its dragons and locus metrics, and try a management action with the available breeding or movement tools. Compare the generation timeline and revise the plan as often as needed.',
    evidence:
      'Track population size, relatedness, allele counts, and changes across generations. Check whether preserving one record also changes diversity elsewhere.',
    explanation:
      'Use before-and-after population evidence to justify the management choice, including both a benefit and a tradeoff or remaining risk.',
  };
}

function createContext(
  id: string,
  title: string,
  goal: string,
  details: GuideDetails,
): WiseDragonGuideContext {
  return {
    id,
    title,
    goal,
    welcome: `I am here with you in ${title}. Ask about the controls, the genetics, or how to turn an observation into evidence.`,
    saved:
      details.saved ??
      'The workstation saves its own evidence records. Journey progress updates from those records.',
    ...details,
  };
}

function normalizePath(url: string): string {
  const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '');
  return path || '/dragon-genetics';
}

function titleFromId(id: string): string {
  return id
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}
