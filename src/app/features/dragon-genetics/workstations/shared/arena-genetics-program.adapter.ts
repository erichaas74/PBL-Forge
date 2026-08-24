import { Service, inject } from '@angular/core';
import { DragonLabGenome, DragonTraitId } from '../../simulation/domain/dragon-lab.models';
import { dragonParentCanvasSource } from '../../simulation/domain/dragon-specimen.profile';
import { DRAGON_TRAITS } from '../../simulation/domain/dragon-inheritance';
import { buildIncubatorBatch } from '../incubator-sampler/incubator-sampler.domain';
import { AccountDragonRecord } from './account-genetics-library.models';
import { AccountGeneticsLibraryService } from './account-genetics-library.service';
import { buildAccountDragonCardView } from './dragon-account-card';
import { buildDragonCardGenomeView } from './dragon-card-genome';
import {
  GeneticsBreedingBatch,
  GeneticsCardBundle,
  GeneticsGeneDefinition,
  GeneticsGamete,
  GeneticsProgram,
  GeneticsSpecimen,
} from './genetics-program.models';
import { visiblePhenotypeFormLabel, visiblePhenotypeForms } from './visible-phenotype';
import { ALLELE_VAULT_GENES } from '../allele-workbench/allele-vault.models';

export interface ArenaGeneticsSpecimen extends GeneticsSpecimen<DragonLabGenome> {
  native: AccountDragonRecord;
}

@Service()
export class ArenaGeneticsProgramAdapter implements GeneticsProgram<ArenaGeneticsSpecimen> {
  private readonly library = inject(AccountGeneticsLibraryService);
  readonly id = 'arena' as const;
  readonly displayName = 'Dragon Arena';
  readonly genes: readonly GeneticsGeneDefinition[] = DRAGON_TRAITS.map((trait) => {
    const locus = ALLELE_VAULT_GENES.find((gene) => gene.id === trait.id);
    if (!locus) throw new Error(`Arena gene ${trait.id} has no chromosome catalog entry.`);
    return {
      id: trait.id,
      name: locus.name,
      chromosomeId: locus.chromosome,
      sampleCode: locus.sampleCode,
      inheritanceLabel: inheritanceLabel(locus.inheritance),
      phenotypeForms: visiblePhenotypeForms(trait.id),
    };
  });

  specimens(studentId: string): readonly ArenaGeneticsSpecimen[] {
    return this.library.recordsFor(studentId).dragons.map((dragon) => this.wrap(dragon));
  }

  cardBundle(specimen: ArenaGeneticsSpecimen): GeneticsCardBundle<ArenaGeneticsSpecimen> {
    return {
      id: specimen.id,
      specimen,
      card: buildAccountDragonCardView(specimen.native),
      genome: buildDragonCardGenomeView(specimen.native, specimen.native.sex),
      footerLeft: specimen.native.source === 'foundation' ? 'Foundation dragon' : 'Student dragon',
    };
  }

  breed(
    first: ArenaGeneticsSpecimen,
    second: ArenaGeneticsSpecimen,
    geneId: string,
    size: number,
    seed: string,
  ): GeneticsBreedingBatch<ArenaGeneticsSpecimen> {
    const traitId = geneId as DragonTraitId;
    if (!DRAGON_TRAITS.some((trait) => trait.id === traitId)) {
      throw new Error(`Arena genetics does not define gene ${geneId}.`);
    }
    const run = Math.max(1, hash(seed));
    const materialized = buildIncubatorBatch(first.native, second.native, traitId, 1, run, size);
    const offspring = materialized.offspring.map((dragon) => this.wrap({
      ...dragon,
      kind: 'dragon',
      sex: hash(`${dragon.id}:sex`) % 2 === 0 ? 'female' : 'male',
      source: 'student',
      storedAtIso: new Date(0).toISOString(),
    }));
    const phenotypeById = new Map(
      offspring.map((child) => [child.id, visiblePhenotypeFormLabel(child.genome, traitId)]),
    );
    return {
      id: materialized.record.id,
      parentIds: [first.id, second.id],
      geneId,
      size,
      offspring,
      buckets: visiblePhenotypeForms(traitId).map((form) => {
        const offspringIds = offspring
          .filter((child) => phenotypeById.get(child.id) === form.label)
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

  meiosis(specimen: ArenaGeneticsSpecimen, seed: string): readonly GeneticsGamete[] {
    return Array.from({ length: 4 }, (_, index) => ({
      id: `${seed}:gamete:${index + 1}`,
      parentId: specimen.id,
      label: `Cell ${index + 1}`,
      alleleByGene: Object.fromEntries(
        DRAGON_TRAITS.map((trait) => [
          trait.id,
          specimen.genome[trait.id][hash(`${seed}:${index}:${trait.id}`) % 2],
        ]),
      ),
    }));
  }

  fertilize(
    first: ArenaGeneticsSpecimen,
    second: ArenaGeneticsSpecimen,
    firstGamete: GeneticsGamete,
    secondGamete: GeneticsGamete,
    seed: string,
  ): ArenaGeneticsSpecimen {
    const genome = Object.fromEntries(
      DRAGON_TRAITS.map((trait) => [
        trait.id,
        [firstGamete.alleleByGene[trait.id], secondGamete.alleleByGene[trait.id]],
      ]),
    ) as DragonLabGenome;
    const child: AccountDragonRecord = {
      kind: 'dragon',
      id: `${seed}:offspring`,
      name: 'New hatchling',
      title: `Generation ${Math.max(first.generation, second.generation) + 1} dragon`,
      color: first.native.color,
      accentColor: second.native.accentColor,
      genome,
      sex: hash(`${seed}:sex`) % 2 === 0 ? 'female' : 'male',
      source: 'student',
      generation: Math.max(first.generation, second.generation) + 1,
      parentIds: [first.id, second.id],
      storedAtIso: new Date(0).toISOString(),
    };
    return this.wrap(child);
  }

  private wrap(dragon: AccountDragonRecord): ArenaGeneticsSpecimen {
    return {
      id: dragon.id,
      name: dragon.name,
      title: dragon.title,
      sex: dragon.sex,
      generation: dragon.generation ?? 0,
      genome: dragon.genome,
      renderSource: dragonParentCanvasSource(dragon, dragon.sex),
      native: dragon,
    };
  }
}

function hash(value: string): number {
  let result = 0;
  for (const character of value) result = (Math.imul(result, 31) + character.charCodeAt(0)) >>> 0;
  return result;
}

function inheritanceLabel(inheritance: (typeof ALLELE_VAULT_GENES)[number]['inheritance']): string {
  switch (inheritance) {
    case 'x-linked': return 'X-linked';
    case 'incomplete-dominance': return 'Incomplete dominance';
    default: return 'Autosomal';
  }
}
