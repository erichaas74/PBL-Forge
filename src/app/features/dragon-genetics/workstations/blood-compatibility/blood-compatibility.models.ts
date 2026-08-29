import { AccountDragonRecord } from '../shared/account-genetics-library.models';

export type BloodAllele = 'A' | 'B' | 'O';
export type BloodGenotype = 'AA' | 'AO' | 'BB' | 'BO' | 'AB' | 'OO';
export type BloodMarker = 'a' | 'b' | 'd';
export type BloodPhenotypeId =
  | 'a-positive'
  | 'a-negative'
  | 'b-positive'
  | 'b-negative'
  | 'ab-positive'
  | 'ab-negative'
  | 'o-positive'
  | 'o-negative';
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
  rhPositive: boolean;
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
  antiD: boolean | null;
  testedAtIso: string;
}

export interface BloodTestObservation {
  specimen: BloodSpecimen;
  specimenRole: 'patient' | 'donor';
  evidence: BloodTestEvidence;
  phenotype: BloodTypeDefinition;
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
    markers: ['a', 'd'],
    possibleGenotypes: ['AA', 'AO'],
  },
  {
    id: 'a-negative',
    name: 'A-',
    markerLabel: 'A antigen Â· no D antigen',
    markers: ['a'],
    possibleGenotypes: ['AA', 'AO'],
  },
  {
    id: 'b-positive',
    name: 'B+',
    markerLabel: 'B antigen · Rh positive',
    markers: ['b', 'd'],
    possibleGenotypes: ['BB', 'BO'],
  },
  {
    id: 'b-negative',
    name: 'B-',
    markerLabel: 'B antigen Â· no D antigen',
    markers: ['b'],
    possibleGenotypes: ['BB', 'BO'],
  },
  {
    id: 'ab-positive',
    name: 'AB+',
    markerLabel: 'A and B antigens · Rh positive',
    markers: ['a', 'b', 'd'],
    possibleGenotypes: ['AB'],
  },
  {
    id: 'ab-negative',
    name: 'AB-',
    markerLabel: 'A and B antigens Â· no D antigen',
    markers: ['a', 'b'],
    possibleGenotypes: ['AB'],
  },
  {
    id: 'o-positive',
    name: 'O+',
    markerLabel: 'No A or B antigens · Rh positive',
    markers: ['d'],
    possibleGenotypes: ['OO'],
  },
  {
    id: 'o-negative',
    name: 'O-',
    markerLabel: 'No A, B, or D antigens',
    markers: [],
    possibleGenotypes: ['OO'],
  },
];

const FOUNDATION_PATIENT_PROFILES: Readonly<
  Record<string, { genotype: BloodGenotype; rhPositive: boolean }>
> = {
  ember: { genotype: 'AB', rhPositive: true },
  tide: { genotype: 'AO', rhPositive: false },
  moss: { genotype: 'BO', rhPositive: true },
  quartz: { genotype: 'OO', rhPositive: false },
};

interface ClinicDonorDefinition {
  id: string;
  name: string;
  title: string;
  color: string;
  accentColor: string;
  genotype: BloodGenotype;
  rhPositive: boolean;
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
    rhPositive: false,
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
    rhPositive: true,
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
    rhPositive: false,
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
    rhPositive: true,
    standardCondition: 'Cleared for routine donation',
    challengeCondition: 'One unit available after field duty',
    challengeStewardship:
      'Field duty limits this unit; reserve it when another safe donor is practical.',
    challengeAvailable: true,
    challengeUnits: 1,
  },
];

export function bloodSpecimenForPatient(dragon: AccountDragonRecord): BloodSpecimen {
  const profile = FOUNDATION_PATIENT_PROFILES[dragon.id] ?? generatedProfile(dragon.id);
  return {
    id: `patient:${dragon.id}`,
    sampleCode: 'PT-01',
    dragonId: dragon.id,
    dragonName: dragon.name,
    dragonTitle: dragon.title,
    color: dragon.color,
    accentColor: dragon.accentColor,
    genotype: profile.genotype,
    rhPositive: profile.rhPositive,
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
    rhPositive: donor.rhPositive,
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

export function markersForSpecimen(specimen: BloodSpecimen): readonly BloodMarker[] {
  return [...markersForGenotype(specimen.genotype), ...(specimen.rhPositive ? (['d'] as const) : [])];
}

export function phenotypeForGenotype(
  genotype: BloodGenotype,
  rhPositive = true,
): BloodTypeDefinition {
  const markers = [...markersForGenotype(genotype), ...(rhPositive ? (['d'] as const) : [])];
  return bloodTypeForMarkers(markers);
}

export function bloodTypeForReactions(
  antiA: boolean | null,
  antiB: boolean | null,
  antiD: boolean | null,
): BloodTypeDefinition | null {
  if (antiA === null || antiB === null || antiD === null) return null;
  return bloodTypeForMarkers([
    ...(antiA ? (['a'] as const) : []),
    ...(antiB ? (['b'] as const) : []),
    ...(antiD ? (['d'] as const) : []),
  ]);
}

export function antiserumReaction(specimen: BloodSpecimen, reagent: BloodMarker): boolean {
  return markersForSpecimen(specimen).includes(reagent);
}

export function transfusionCompatibility(
  donor: BloodSpecimen,
  recipient: BloodSpecimen,
): { compatible: boolean; unfamiliarMarkers: readonly BloodMarker[] } {
  const recipientMarkers = new Set(markersForSpecimen(recipient));
  const unfamiliarMarkers = markersForSpecimen(donor).filter(
    (marker) => !recipientMarkers.has(marker),
  );
  return { compatible: unfamiliarMarkers.length === 0, unfamiliarMarkers };
}

export function possibleGenotypesForReactions(
  antiA: boolean | null,
  antiB: boolean | null,
  antiD: boolean | null,
): readonly BloodGenotype[] {
  return bloodTypeForReactions(antiA, antiB, antiD)?.possibleGenotypes ?? [];
}

function bloodTypeForMarkers(markers: readonly BloodMarker[]): BloodTypeDefinition {
  const hasA = markers.includes('a');
  const hasB = markers.includes('b');
  const rh = markers.includes('d') ? 'positive' : 'negative';
  const abo = hasA && hasB ? 'ab' : hasA ? 'a' : hasB ? 'b' : 'o';
  const id = `${abo}-${rh}` as BloodPhenotypeId;
  return BLOOD_TYPE_DEFINITIONS.find((definition) => definition.id === id)!;
}

function generatedProfile(dragonId: string): { genotype: BloodGenotype; rhPositive: boolean } {
  const genotypes: readonly BloodGenotype[] = ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'];
  return {
    genotype: genotypes[stableHash(`${dragonId}:blood-locus`) % genotypes.length],
    rhPositive: stableHash(`${dragonId}:rh-d`) % 2 === 0,
  };
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
