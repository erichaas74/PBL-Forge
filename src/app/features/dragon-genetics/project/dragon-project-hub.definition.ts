import {
  ProjectActivityDefinition,
  ProjectHubDefinition,
} from '../../project/domain/project-hub.models';
import { DRAGON_SIMULATIONS } from '../adaptive/dragon-simulation.registry';
import { DragonSimulationId } from '../adaptive/dragon-simulation.models';
import { DRAGON_CAPSTONE_PATHS } from './dragon-capstone-paths';

export const DRAGON_PROJECT_HUB_DEFINITION: ProjectHubDefinition = {
  schemaVersion: 1,
  id: 'dragon-genetics-lab',
  title: 'Dragon Genetics Lab',
  mission: 'Use genetics evidence to protect, breed, and defend dragon populations.',
  subject: 'Science 7',
  gradeBand: '7',
  theme: {
    id: 'dragon-genetics',
    template: 'laboratory-world',
    accentStyle: 'genetics-lab',
    mapLayout: 'academy',
  },
  stages: [
    { id: 'foundations', title: 'Foundations', order: 1 },
    { id: 'investigation', title: 'Genetic Investigation', order: 2 },
    { id: 'open-labs', title: 'Open Labs', order: 3 },
    { id: 'final-path', title: 'Final Path', order: 4 },
  ],
  paths: DRAGON_CAPSTONE_PATHS,
  activities: [
    adaptiveActivity('trait-evidence', 'foundations', 1, true),
    adaptiveActivity('genome-microscope', 'foundations', 2, true),
    adaptiveActivity('allele-workbench', 'foundations', 3, true, ['genome-microscope']),
    adaptiveActivity('punnett-composer', 'investigation', 4, true, ['allele-workbench']),
    adaptiveActivity('incubator-sampler', 'investigation', 5, true, ['punnett-composer']),
    adaptiveActivity('dna-process-lab', 'investigation', 6, true, ['genome-microscope']),
    {
      id: 'pedigree-lab',
      stageId: 'open-labs',
      title: 'Pedigree Lab',
      objective: 'Trace hidden traits through dragon bloodlines.',
      route: '/dragon-genetics/pedigree-lab',
      order: 7,
      kind: 'extension',
      required: false,
      masterySkillIds: ['GEN-5'],
    },
    {
      id: 'protein-rescue',
      stageId: 'open-labs',
      title: 'Protein Rescue',
      objective: 'Connect gene variants to proteins and diet.',
      route: '/dragon-genetics/protein-rescue',
      order: 8,
      kind: 'extension',
      required: false,
      masterySkillIds: ['GEN-6'],
    },
    {
      id: 'blood-type-lab',
      stageId: 'open-labs',
      title: 'Blood Compatibility',
      objective: 'Use blood-marker evidence to choose a safe donor.',
      route: '/dragon-genetics/blood-type-lab',
      order: 9,
      kind: 'extension',
      required: false,
      masterySkillIds: ['GEN-7'],
    },
    {
      id: 'candling-workstation',
      stageId: 'open-labs',
      title: 'Candling Workstation',
      objective:
        'Compare phenotype evidence from candling with genotype evidence from a sealed egg DNA sample.',
      route: '/dragon-genetics/candling-workstation',
      order: 10,
      kind: 'extension',
      required: false,
      masterySkillIds: ['GEN-3'],
    },
    adaptiveActivity('dragon-hatchery', 'final-path', 10, true, [
      'incubator-sampler',
      'dna-process-lab',
    ]),
    adaptiveActivity('dragon-arena', 'final-path', 11, true, ['dragon-hatchery']),
    {
      id: 'companion-show',
      stageId: 'final-path',
      title: 'Mini Dragon Show',
      objective:
        'Breed a judged trait combination, train four learned skills, and defend a champion.',
      route: '/dragon-genetics/companion-show',
      order: 12,
      kind: 'final-challenge',
      required: true,
      prerequisiteActivityIds: ['incubator-sampler', 'dna-process-lab'],
      masterySkillIds: ['GEN-4', 'GEN-8'],
    },
    {
      id: 'island-diversity',
      stageId: 'open-labs',
      title: 'Island Diversity',
      objective: 'Help island dragon populations survive across generations.',
      route: '/dragon-genetics/island-diversity',
      order: 13,
      kind: 'extension',
      required: false,
      masterySkillIds: ['GEN-8'],
    },
  ],
  masterySkills: [
    { id: 'GEN-1', title: 'Inherited traits', order: 1 },
    { id: 'GEN-2', title: 'Genome organization', order: 2 },
    { id: 'GEN-3', title: 'Alleles and phenotype', order: 3 },
    { id: 'GEN-4', title: 'Inheritance patterns', order: 4 },
    { id: 'GEN-5', title: 'Pedigree evidence', order: 5 },
    { id: 'GEN-6', title: 'DNA and proteins', order: 6 },
    { id: 'GEN-7', title: 'Multiple alleles', order: 7 },
    { id: 'GEN-8', title: 'Population diversity', order: 8 },
  ],
};

function adaptiveActivity(
  id: DragonSimulationId,
  stageId: string,
  order: number,
  required: boolean,
  prerequisiteActivityIds: readonly string[] = [],
): ProjectActivityDefinition {
  const simulation = DRAGON_SIMULATIONS.find((candidate) => candidate.id === id);
  if (!simulation) throw new Error(`Dragon simulation ${id} is not registered.`);
  return {
    id,
    stageId,
    title: simulation.title,
    objective: simulation.goal,
    route: `/dragon-genetics/${id}`,
    order,
    kind: id === 'dragon-arena' ? 'final-challenge' : 'workstation',
    required,
    prerequisiteActivityIds,
    masterySkillIds: [simulation.skill],
  };
}
