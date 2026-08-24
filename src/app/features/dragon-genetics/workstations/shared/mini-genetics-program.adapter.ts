import { Service, inject } from '@angular/core';
import { CompanionDragon } from '../companion-show/companion-show.models';
import { founderToCompanion } from '../companion-show/companion-show.domain';
import { MiniDragonKennelStore } from '../companion-show/mini-dragon-kennel.store';
import {
  MINI_DRAGON_GENES,
  MINI_FOUNDERS,
  MiniGenome,
  breedMiniGenomes,
  miniGenomeGenotype,
  miniPhenotypeForms,
  miniPhenotypeLabel,
} from '../companion-show/mini-dragon.genetics';
import { specimenSource } from '../companion-show/mini-dragon-kennel.store';
import { buildMiniDragonCardView } from '../mini-dragon-shared/mini-dragon-card';
import {
  MINI_CHROMOSOME_IDS,
  MINI_CHROMOSOME_GENE_IDS,
  buildMiniDragonCardGenomeView,
  miniChromosomeForGene,
} from '../mini-dragon-shared/mini-dragon-chromosome.catalog';
import {
  GeneticsBreedingBatch,
  GeneticsCardBundle,
  GeneticsGeneDefinition,
  GeneticsGamete,
  GeneticsProgram,
  GeneticsSpecimen,
} from './genetics-program.models';

export interface MiniGeneticsSpecimen extends GeneticsSpecimen<MiniGenome> {
  native: CompanionDragon;
}

@Service()
export class MiniGeneticsProgramAdapter implements GeneticsProgram<MiniGeneticsSpecimen> {
  private readonly kennel = inject(MiniDragonKennelStore);
  private preparedStudentId = '';
  readonly id = 'mini-show' as const;
  readonly displayName = 'Mini Dragon Show';
  readonly genes: readonly GeneticsGeneDefinition[] = MINI_DRAGON_GENES.map(gene => ({
    id: gene.id,
    name: gene.name,
    chromosomeId: miniChromosomeForGene(gene.id),
    sampleCode: `M${MINI_CHROMOSOME_IDS.indexOf(miniChromosomeForGene(gene.id)) + 1}-G${
      MINI_CHROMOSOME_GENE_IDS[miniChromosomeForGene(gene.id)].indexOf(gene.id) + 1
    }`,
    inheritanceLabel: inheritanceLabel(gene.pattern),
    phenotypeForms: gene.forms,
  }));

  prepare(studentId: string): void {
    this.kennel.ensureRestored(studentId);
    this.preparedStudentId = studentId;
  }

  specimens(studentId: string): readonly MiniGeneticsSpecimen[] {
    const kennel = this.preparedStudentId === studentId ? this.kennel.kennel() : [];
    const available = kennel.length
      ? kennel
      : MINI_FOUNDERS.map((founder) => founderToCompanion(founder.id)).filter(
          (dragon): dragon is CompanionDragon => Boolean(dragon),
        );
    return available.map((dragon, index) => this.wrap(dragon, index));
  }

  cardBundle(specimen: MiniGeneticsSpecimen): GeneticsCardBundle<MiniGeneticsSpecimen> {
    const view = buildMiniDragonCardView(specimen.native, {
      matches: this.kennel.matchesFor(specimen.native.genome),
      ribbons: this.kennel.ribbonsFor(specimen.native.genome),
    });
    return {
      id: specimen.id,
      specimen,
      card: {
        id: view.id,
        name: view.name,
        title: view.title,
        color: view.color,
        accentColor: view.patchColor,
        source: view.source,
        seriesLabel: 'Mini Dragon Society deck',
        catalogNumber: view.id.toUpperCase(),
        arenaRating: null,
        battleRole: `${view.originLabel} · ${view.generationLabel}`,
        stats: [
          { id: 'ribbons', label: 'Ribbons', value: view.ribbons },
          { id: 'standard', label: 'Standard', value: `${view.matchedCount}/${view.targetCount}` },
        ],
      },
      genome: buildMiniDragonCardGenomeView(specimen.genome, specimen.sex),
      footerLeft: 'Mini Dragon Society',
      footerRight: view.targetCount ? `${view.matchedCount}/${view.targetCount} to standard` : 'Open standard',
    };
  }

  breed(
    first: MiniGeneticsSpecimen,
    second: MiniGeneticsSpecimen,
    geneId: string,
    size: number,
    seed: string,
  ): GeneticsBreedingBatch<MiniGeneticsSpecimen> {
    const gene = MINI_DRAGON_GENES.find((candidate) => candidate.id === geneId);
    if (!gene) throw new Error(`Mini Dragon genetics does not define gene ${geneId}.`);
    const generation = Math.max(first.generation, second.generation) + 1;
    const offspring = Array.from({ length: size }, (_, index) => {
      const id = `${seed}:mini:${index + 1}`;
      const native: CompanionDragon = {
        id,
        name: `Hatchling ${index + 1}`,
        title: `Generation ${generation} Mini Dragon`,
        genome: breedMiniGenomes(first.genome, second.genome, `${seed}:${index}`),
        origin: 'bred',
        generation,
        parentIds: [first.id, second.id],
        litterId: seed,
      };
      return this.wrap(native, index);
    });
    return {
      id: seed,
      parentIds: [first.id, second.id],
      geneId,
      size,
      offspring,
      buckets: miniPhenotypeForms(gene.id).map((form) => {
        const offspringIds = offspring
          .filter((child) => miniPhenotypeLabel(gene.id, child.genome) === form.label)
          .map((child) => child.id);
        return {
          id: form.id,
          label: form.label,
          count: offspringIds.length,
          percentage: Math.round((offspringIds.length / size) * 100),
          offspringIds,
        };
      }),
    };
  }

  meiosis(specimen: MiniGeneticsSpecimen, seed: string): readonly GeneticsGamete[] {
    return Array.from({ length: 4 }, (_, index) => ({
      id: `${seed}:gamete:${index + 1}`,
      parentId: specimen.id,
      label: `Cell ${index + 1}`,
      alleleByGene: Object.fromEntries(
        MINI_DRAGON_GENES.map((gene) => [
          gene.id,
          miniGenomeGenotype(specimen.genome, gene.id)[hash(`${seed}:${index}:${gene.id}`) % 2],
        ]),
      ),
    }));
  }

  fertilize(
    first: MiniGeneticsSpecimen,
    second: MiniGeneticsSpecimen,
    firstGamete: GeneticsGamete,
    secondGamete: GeneticsGamete,
    seed: string,
  ): MiniGeneticsSpecimen {
    const genome = Object.fromEntries(
      MINI_DRAGON_GENES.map((gene) => [
        gene.id,
        [firstGamete.alleleByGene[gene.id], secondGamete.alleleByGene[gene.id]],
      ]),
    ) as unknown as MiniGenome;
    const native: CompanionDragon = {
      id: `${seed}:offspring`,
      name: 'New Mini hatchling',
      title: `Generation ${Math.max(first.generation, second.generation) + 1} Mini Dragon`,
      genome,
      origin: 'bred',
      generation: Math.max(first.generation, second.generation) + 1,
      parentIds: [first.id, second.id],
      litterId: seed,
    };
    return this.wrap(native, hash(`${seed}:sex`));
  }

  private wrap(dragon: CompanionDragon, index: number): MiniGeneticsSpecimen {
    return {
      id: dragon.id,
      name: dragon.name,
      title: dragon.title,
      sex: index % 2 === 0 ? 'female' : 'male',
      generation: dragon.generation,
      genome: dragon.genome,
      renderSource: specimenSource(dragon),
      native: dragon,
    };
  }
}

function inheritanceLabel(pattern: (typeof MINI_DRAGON_GENES)[number]['pattern']): string {
  switch (pattern) {
    case 'incomplete-dominance': return 'Incomplete dominance';
    case 'codominance': return 'Codominance';
    case 'multiple-alleles': return 'Multiple alleles';
    default: return 'Autosomal';
  }
}

function hash(value: string): number {
  let result = 0;
  for (const character of value) result = (Math.imul(result, 31) + character.charCodeAt(0)) >>> 0;
  return result;
}
