import { AccountDragonRecord } from '../shared/account-genetics-library.models';

export type BloodAllele = 'A' | 'B' | 'O';
export type BloodGenotype = 'AA' | 'AO' | 'BB' | 'BO' | 'AB' | 'OO';
export type BloodMarker = 'a' | 'b';
export type BloodPhenotypeId = 'a-positive' | 'b-positive' | 'ab-positive' | 'o-positive';
export type BloodLabMode = 'standard' | 'challenge';

export interface BloodTypeDefinition {
  id: BloodPhenotypeId;
  name: string;
  markerLabel: string;
  markers: readonly BloodMarker[];
  possibleGenotypes: readonly BloodGenotype[];
}

export interface BloodSpecimen {
  id: string;
  sampleCode: string;
  dragonId: string;
  dragonName: string;
  dragonTitle: string;
  color: string;
  accentColor: string;
  genotype: BloodGenotype;
}

export interface DonorCandidate extends BloodSpecimen {
  condition: string;
  stewardshipNote: string;
  available: boolean;
  units: number | null;
}

export interface BloodTestEvidence {
  specimenId: string;
  sampleCode: string;
  antiA: boolean | null;
  antiB: boolean | null;
  testedAtIso: string;
}

export interface TransfusionTrial {
  id: string;
  donorId: string;
  donorName: string;
  compatible: boolean;
  unfamiliarMarkers: readonly BloodMarker[];
  mode: BloodLabMode;
  unitConsumed: boolean;
  testedAtIso: string;
}

export interface BloodEmergencyRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientSampleCode: string;
  patientPhenotype: BloodPhenotypeId;
  patientPossibleGenotypes: readonly BloodGenotype[];
  donorId: string;
  donorName: string;
  donorSampleCode: string;
  donorPhenotype: BloodPhenotypeId;
  donorPossibleGenotypes: readonly BloodGenotype[];
  patientTest: BloodTestEvidence;
  donorTest: BloodTestEvidence;
  transfusionTrials: readonly TransfusionTrial[];
  mode: BloodLabMode;
  supplyNote: string;
  codominantAlleles: readonly ['A', 'B'];
  explanation: string;
  savedAtIso: string;
}

export interface StoredBloodEmergencyRecords {
  schemaVersion: 1;
  studentId: string;
  records: readonly BloodEmergencyRecord[];
}

export const BLOOD_TYPE_DEFINITIONS: readonly BloodTypeDefinition[] = [
  {
    id: 'a-positive',
    name: 'A+',
    markerLabel: 'A antigen · Rh positive',
    markers: ['a'],
    possibleGenotypes: ['AA', 'AO'],
  },
  {
    id: 'b-positive',
    name: 'B+',
    markerLabel: 'B antigen · Rh positive',
    markers: ['b'],
    possibleGenotypes: ['BB', 'BO'],
  },
  {
    id: 'ab-positive',
    name: 'AB+',
    markerLabel: 'A and B antigens · Rh positive',
    markers: ['a', 'b'],
    possibleGenotypes: ['AB'],
  },
  {
    id: 'o-positive',
    name: 'O+',
    markerLabel: 'No A or B antigens · Rh positive',
    markers: [],
    possibleGenotypes: ['OO'],
  },
];

const FOUNDATION_PATIENT_GENOTYPES: Readonly<Record<string, BloodGenotype>> = {
  ember: 'AB',
  tide: 'AO',
  moss: 'BO',
  quartz: 'OO',
};

interface ClinicDonorDefinition {
  id: string;
  name: string;
  title: string;
  color: string;
  accentColor: string;
  genotype: BloodGenotype;
  standardCondition: string;
  challengeCondition: string;
  challengeStewardship: string;
  challengeAvailable: boolean;
  challengeUnits: number;
}

const CLINIC_DONORS: readonly ClinicDonorDefinition[] = [
  {
    id: 'clinic-cinder',
    name: 'Cinder',
    title: 'Berk reserve donor',
    color: '#47515a',
    accentColor: '#d9e2e7',
    genotype: 'OO',
    standardCondition: 'Cleared for routine donation',
    challengeCondition: 'One reserve unit remains',
    challengeStewardship:
      'Emergency reserve unit; preserve it when another safe donor is practical.',
    challengeAvailable: true,
    challengeUnits: 1,
  },
  {
    id: 'clinic-pyra',
    name: 'Pyra',
    title: 'Flight patrol breeder',
    color: '#ae3f31',
    accentColor: '#f2a24f',
    genotype: 'BB',
    standardCondition: 'Cleared for routine donation',
    challengeCondition: 'Two units available',
    challengeStewardship: 'Carries a rare flight-endurance line used by the breeding program.',
    challengeAvailable: true,
    challengeUnits: 2,
  },
  {
    id: 'clinic-maris',
    name: 'Maris',
    title: 'Coastal rescue dragon',
    color: '#2d719d',
    accentColor: '#73d5e8',
    genotype: 'AO',
    standardCondition: 'Cleared for routine donation',
    challengeCondition: 'Recovering from smoke exposure',
    challengeStewardship: 'Temporarily unavailable; donation would slow recovery.',
    challengeAvailable: false,
    challengeUnits: 0,
  },
  {
    id: 'clinic-halo',
    name: 'Halo',
    title: 'Sky watch captain',
    color: '#7561a5',
    accentColor: '#d9baf0',
    genotype: 'AB',
    standardCondition: 'Cleared for routine donation',
    challengeCondition: 'One unit available after field duty',
    challengeStewardship:
      'Field duty limits this unit; reserve it when another safe donor is practical.',
    challengeAvailable: true,
    challengeUnits: 1,
  },
];

export function bloodSpecimenForPatient(dragon: AccountDragonRecord): BloodSpecimen {
  return {
    id: `patient:${dragon.id}`,
    sampleCode: 'PT-01',
    dragonId: dragon.id,
    dragonName: dragon.name,
    dragonTitle: dragon.title,
    color: dragon.color,
    accentColor: dragon.accentColor,
    genotype: FOUNDATION_PATIENT_GENOTYPES[dragon.id] ?? generatedGenotype(dragon.id),
  };
}

export function clinicDonors(mode: BloodLabMode): readonly DonorCandidate[] {
  return CLINIC_DONORS.map((donor, index) => ({
    id: donor.id,
    sampleCode: `DN-${String(index + 1).padStart(2, '0')}`,
    dragonId: donor.id,
    dragonName: donor.name,
    dragonTitle: donor.title,
    color: donor.color,
    accentColor: donor.accentColor,
    genotype: donor.genotype,
    condition: mode === 'standard' ? donor.standardCondition : donor.challengeCondition,
    stewardshipNote:
      mode === 'standard'
        ? 'Standard mode keeps this teaching-model supply reusable.'
        : donor.challengeStewardship,
    available: mode === 'standard' || donor.challengeAvailable,
    units: mode === 'standard' ? null : donor.challengeUnits,
  }));
}

export function markersForGenotype(genotype: BloodGenotype): readonly BloodMarker[] {
  const markers: BloodMarker[] = [];
  if (genotype.includes('A')) markers.push('a');
  if (genotype.includes('B')) markers.push('b');
  return markers;
}

export function phenotypeForGenotype(genotype: BloodGenotype): BloodTypeDefinition {
  const markers = markersForGenotype(genotype);
  return bloodTypeForMarkers(markers);
}

export function bloodTypeForReactions(
  antiA: boolean | null,
  antiB: boolean | null,
): BloodTypeDefinition | null {
  if (antiA === null || antiB === null) return null;
  return bloodTypeForMarkers([
    ...(antiA ? (['a'] as const) : []),
    ...(antiB ? (['b'] as const) : []),
  ]);
}

export function antiserumReaction(specimen: BloodSpecimen, reagent: BloodMarker): boolean {
  return markersForGenotype(specimen.genotype).includes(reagent);
}

export function transfusionCompatibility(
  donor: BloodSpecimen,
  recipient: BloodSpecimen,
): { compatible: boolean; unfamiliarMarkers: readonly BloodMarker[] } {
  const recipientMarkers = new Set(markersForGenotype(recipient.genotype));
  const unfamiliarMarkers = markersForGenotype(donor.genotype).filter(
    (marker) => !recipientMarkers.has(marker),
  );
  return { compatible: unfamiliarMarkers.length === 0, unfamiliarMarkers };
}

export function possibleGenotypesForReactions(
  antiA: boolean | null,
  antiB: boolean | null,
): readonly BloodGenotype[] {
  return bloodTypeForReactions(antiA, antiB)?.possibleGenotypes ?? [];
}

function bloodTypeForMarkers(markers: readonly BloodMarker[]): BloodTypeDefinition {
  const hasA = markers.includes('a');
  const hasB = markers.includes('b');
  const id: BloodPhenotypeId =
    hasA && hasB ? 'ab-positive' : hasA ? 'a-positive' : hasB ? 'b-positive' : 'o-positive';
  return BLOOD_TYPE_DEFINITIONS.find((definition) => definition.id === id)!;
}

function generatedGenotype(dragonId: string): BloodGenotype {
  const genotypes: readonly BloodGenotype[] = ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'];
  return genotypes[stableHash(`${dragonId}:blood-locus`) % genotypes.length];
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
