import { AssemblyBlueprint, Vector3Data } from '../../../shared/assembly/domain/assembly.models';
import { AssemblyCombatProfile } from '../../../shared/assembly/combat/assembly-combat.models';

export type DragonGeneLocus =
  | 'body-size'
  | 'wing-span'
  | 'jaw-strength'
  | 'tail-length'
  | 'armor-density'
  | 'pigment-hue'
  | 'temperament';

export interface DragonAllele {
  id: string;
  /** Normalized expression value from 0 to 1. */
  value: number;
  /** Normalized dominance from 0 to 1. */
  dominance: number;
}

export interface DragonGenePair {
  maternal: DragonAllele;
  paternal: DragonAllele;
}

export interface DragonGenome {
  id: string;
  schemaVersion: 1;
  loci: Record<DragonGeneLocus, DragonGenePair>;
  parentGenomeIds?: [string, string];
  generation: number;
}

export interface DragonPhenotype {
  bodyScale: number;
  wingSpanScale: number;
  jawScale: number;
  tailScale: number;
  armorDensity: number;
  pigmentHue: number;
  aggression: number;
  scaleColor: string;
}

export interface GeneratedDragonAssembly {
  genome: DragonGenome;
  phenotype: DragonPhenotype;
  blueprint: AssemblyBlueprint;
  combatProfile: AssemblyCombatProfile;
}

export interface DragonPartScale {
  dimensions: Vector3Data;
  mass: number;
}
