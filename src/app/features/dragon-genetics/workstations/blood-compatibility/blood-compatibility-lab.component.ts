import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import { AccountGeneticsRecord } from '../shared/account-genetics-library.models';
import { AccountGeneticsLibraryService } from '../shared/account-genetics-library.service';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import { DragonCardBloodType } from '../shared/dragon-flip-card.component';
import {
  BLOOD_TYPE_DEFINITIONS,
  BloodEmergencyRecord,
  BloodLabMode,
  BloodMarker,
  BloodPhenotypeId,
  BloodSpecimen,
  BloodTestEvidence,
  DonorCandidate,
  TransfusionTrial,
  antiserumReaction,
  bloodSpecimenForPatient,
  bloodTypeForReactions,
  clinicDonors,
  phenotypeForGenotype,
  transfusionCompatibility,
} from './blood-compatibility.models';
import { BloodCompatibilityRepository } from './blood-compatibility.repository';
import { BloodTypeExplorerComponent } from './blood-type-explorer.component';

const BLOOD_REAGENT_DRAG_TYPE = 'application/x-pbl-blood-reagent';
const BLOOD_DONOR_DRAG_TYPE = 'application/x-pbl-blood-donor';

type PatientCondition = 'critical' | 'stable' | 'reaction';

@Component({
  selector: 'app-blood-compatibility-lab',
  imports: [DatePipe, NgTemplateOutlet, AccountGeneticsFileComponent, BloodTypeExplorerComponent],
  templateUrl: './blood-compatibility-lab.component.html',
  styleUrl: './blood-compatibility-lab.component.scss',
})
export class BloodCompatibilityLabComponent {
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);
  private readonly repository = inject(BloodCompatibilityRepository);

  readonly studentId = input.required<string>();
  readonly bloodTypes = BLOOD_TYPE_DEFINITIONS;
  readonly reagents: readonly { marker: BloodMarker; name: string; code: string }[] = [
    { marker: 'a', name: 'Anti-A serum', code: 'AA' },
    { marker: 'b', name: 'Anti-B serum', code: 'AB' },
  ];

  readonly mode = signal<BloodLabMode>('standard');
  readonly guideOpen = signal(false);
  readonly recordDrawerOpen = signal(false);
  readonly stagedAccountRecord = signal<AccountGeneticsRecord | null>(null);
  readonly patientDragonId = signal<string | null>(null);
  readonly activeSpecimenId = signal<string | null>(null);
  readonly pendingReagent = signal<BloodMarker | null>(null);
  readonly tests = signal<Readonly<Record<string, BloodTestEvidence>>>({});
  readonly patientTypeClaimId = signal<BloodPhenotypeId | null>(null);
  readonly stagedDonorId = signal<string | null>(null);
  readonly chamberDonorId = signal<string | null>(null);
  readonly remainingUnits = signal<Readonly<Record<string, number>>>({});
  readonly transfusionTrials = signal<readonly TransfusionTrial[]>([]);
  readonly patientCondition = signal<PatientCondition>('critical');
  readonly explanation = signal('');
  readonly records = signal<readonly BloodEmergencyRecord[]>([]);
  readonly statusMessage = signal(
    'Choose a dragon card to load its blood sample directly onto the testing plate.',
  );

  readonly accountSnapshot = computed(() => this.accountLibrary.recordsFor(this.studentId()));
  readonly patientSpecimen = computed(() => {
    const patientId = this.patientDragonId();
    const dragon = this.accountSnapshot().dragons.find((candidate) => candidate.id === patientId);
    return dragon ? bloodSpecimenForPatient(dragon) : null;
  });
  readonly donors = computed(() => clinicDonors(this.mode()));
  readonly donorVials = computed(() =>
    [...this.donors()].sort(
      (left, right) =>
        this.bloodTypes.indexOf(this.donorBloodType(left)) -
        this.bloodTypes.indexOf(this.donorBloodType(right)),
    ),
  );
  readonly activeSpecimen = computed(() => this.specimenById(this.activeSpecimenId()));
  readonly activeTest = computed(() => {
    const specimen = this.activeSpecimen();
    return specimen ? (this.tests()[specimen.id] ?? null) : null;
  });
  readonly patientTest = computed(() => {
    const specimen = this.patientSpecimen();
    return specimen ? (this.tests()[specimen.id] ?? null) : null;
  });
  readonly patientBloodType = computed(() => this.bloodTypeForTest(this.patientTest()));
  readonly patientTypeClaim = computed(() => {
    const claimId = this.patientTypeClaimId();
    return claimId ? (this.bloodTypes.find((type) => type.id === claimId) ?? null) : null;
  });
  readonly patientTypeClaimSymbol = computed(
    () => this.patientTypeClaim()?.name.replace('+', '') ?? null,
  );
  readonly determinedBloodTypeByDragonId = computed<Readonly<Record<string, DragonCardBloodType>>>(
    () => {
      const determined: Record<string, DragonCardBloodType> = {};
      for (const record of this.records()) {
        determined[record.patientId] = cardBloodType(record.patientPhenotype);
      }
      const patient = this.patientSpecimen();
      const currentType = this.patientTypeClaim();
      if (patient && currentType) {
        determined[patient.dragonId] = cardBloodType(currentType.id);
      }
      return determined;
    },
  );
  readonly chamberDonor = computed(
    () => this.donors().find((donor) => donor.id === this.chamberDonorId()) ?? null,
  );
  readonly chamberDonorTest = computed(() => {
    const donor = this.chamberDonor();
    return donor ? (this.tests()[donor.id] ?? null) : null;
  });
  readonly chamberDonorBloodType = computed(() => this.bloodTypeForTest(this.chamberDonorTest()));
  readonly latestChamberTrial = computed(() => {
    const donorId = this.chamberDonorId();
    return donorId
      ? (this.transfusionTrials().find((trial) => trial.donorId === donorId) ?? null)
      : null;
  });
  readonly chamberReady = computed(() => {
    const patient = this.patientSpecimen();
    const donor = this.chamberDonor();
    return Boolean(
      patient &&
      donor &&
      this.isFullyTested(patient.id) &&
      this.isFullyTested(donor.id) &&
      this.donorUsable(donor),
    );
  });
  readonly canSaveRecord = computed(() =>
    Boolean(
      this.latestChamberTrial()?.compatible &&
      this.patientBloodType() &&
      this.patientTypeClaimId() === this.patientBloodType()?.id &&
      this.chamberDonorBloodType() &&
      this.explanation().trim().length >= 16,
    ),
  );
  readonly recordsForPatient = computed(() =>
    this.records().filter((record) => record.patientId === this.patientDragonId()),
  );
  readonly saveReadiness = computed(() => {
    if (!this.latestChamberTrial()?.compatible) {
      return 'A stable transfusion result is needed before the emergency record can be saved.';
    }
    if (this.patientTypeClaimId() !== this.patientBloodType()?.id) {
      return 'Review the recorded patient type against both serum reactions.';
    }
    if (this.explanation().trim().length < 16) {
      return 'Connect the patient markers, donor markers, and compatibility rule in your note.';
    }
    return 'The emergency record has enough evidence to save.';
  });

  private loadedStudentId: string | null = null;

  constructor() {
    effect(() => {
      const studentId = normalizeWorkstationStudentId(this.studentId());
      if (studentId === this.loadedStudentId) return;
      this.loadedStudentId = studentId;
      this.records.set(this.repository.load(studentId));
    });
    this.resetSupplies();
  }

  setMode(mode: BloodLabMode): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.resetSupplies();
    this.stagedDonorId.set(null);
    this.chamberDonorId.set(null);
    this.transfusionTrials.set([]);
    this.patientCondition.set('critical');
    this.statusMessage.set(
      mode === 'challenge'
        ? 'Challenge constraints applied. Tests remain available; donor units and recovery restrictions now matter.'
        : 'Standard supply restored. Donor units are reusable for open investigation.',
    );
  }

  selectAccountRecord(record: AccountGeneticsRecord): void {
    this.loadPatientRecord(record);
  }

  loadPatientRecord(record: AccountGeneticsRecord): void {
    const dragonId = record.kind === 'dragon' ? record.id : record.dragonId;
    const dragon = this.accountSnapshot().dragons.find((candidate) => candidate.id === dragonId);
    if (!dragon) return;
    this.patientDragonId.set(dragon.id);
    this.stagedAccountRecord.set(record);
    this.activeSpecimenId.set(`patient:${dragon.id}`);
    this.pendingReagent.set(null);
    this.tests.set({});
    this.patientTypeClaimId.set(null);
    this.stagedDonorId.set(null);
    this.chamberDonorId.set(null);
    this.transfusionTrials.set([]);
    this.patientCondition.set('critical');
    this.explanation.set('');
    this.resetSupplies();
    this.statusMessage.set(
      `${dragon.name}'s sample is on the testing plate. Apply both antisera to determine the blood type.`,
    );
  }

  loadDonorSample(donorId: string): void {
    const donor = this.donors().find((candidate) => candidate.id === donorId);
    if (donor) this.loadSpecimen(donor);
  }

  selectReagent(marker: BloodMarker): void {
    this.pendingReagent.set(marker);
    this.statusMessage.set(
      `${this.reagentName(marker)} selected. Apply it to the loaded sample or drag the vial onto the reaction plate.`,
    );
  }

  startReagentDrag(event: DragEvent, marker: BloodMarker): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(BLOOD_REAGENT_DRAG_TYPE, marker);
    event.dataTransfer.setData('text/plain', this.reagentName(marker));
  }

  allowReagentDrop(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(BLOOD_REAGENT_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  dropReagent(event: DragEvent): void {
    event.preventDefault();
    const marker = event.dataTransfer?.getData(BLOOD_REAGENT_DRAG_TYPE);
    if (marker === 'a' || marker === 'b') this.applyReagent(marker);
  }

  applyPendingReagent(): void {
    const marker = this.pendingReagent();
    if (marker) this.applyReagent(marker);
  }

  applyReagent(marker: BloodMarker): void {
    const specimen = this.activeSpecimen();
    if (!specimen) return;
    const existing = this.tests()[specimen.id] ?? this.emptyTest(specimen);
    const reaction = antiserumReaction(specimen, marker);
    const next: BloodTestEvidence = {
      ...existing,
      [marker === 'a' ? 'antiA' : 'antiB']: reaction,
      testedAtIso: new Date().toISOString(),
    };
    this.tests.update((tests) => ({ ...tests, [specimen.id]: next }));
    this.pendingReagent.set(null);
    const testComplete = next.antiA !== null && next.antiB !== null;
    this.statusMessage.set(
      testComplete
        ? `${specimen.sampleCode} now has both reactions recorded. Use the visible evidence to record a blood type.`
        : `${this.reagentName(marker)} produced ${reaction ? 'agglutination' : 'a smooth suspension'} in ${specimen.sampleCode}.`,
    );
  }

  recordPatientBloodType(id: BloodPhenotypeId): void {
    const patient = this.patientSpecimen();
    if (!patient || !this.isFullyTested(patient.id)) return;
    this.patientTypeClaimId.set(id);
    this.statusMessage.set(
      `Type ${this.phenotypeName(id)} recorded from the reaction evidence. You can revise this classification after observing transfusion results.`,
    );
  }

  selectDonor(donorId: string): void {
    const donor = this.donors().find((candidate) => candidate.id === donorId);
    if (!donor || !this.donorUsable(donor)) return;
    this.recordTypedDonorEvidence(donor);
    this.stagedDonorId.set(donor.id);
    this.statusMessage.set(
      `${this.donorBloodType(donor).name} donor vial selected. Load or drag it into the transfusion station.`,
    );
  }

  loadStagedDonor(): void {
    const donorId = this.stagedDonorId();
    if (donorId) this.stageDonor(donorId);
  }

  startDonorDrag(event: DragEvent, donor: DonorCandidate): void {
    if (!event.dataTransfer || !this.donorUsable(donor)) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(BLOOD_DONOR_DRAG_TYPE, donor.id);
    event.dataTransfer.setData('text/plain', donor.dragonName);
  }

  allowDonorDrop(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(BLOOD_DONOR_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  dropDonor(event: DragEvent): void {
    event.preventDefault();
    this.stageDonor(event.dataTransfer?.getData(BLOOD_DONOR_DRAG_TYPE) ?? '');
  }

  stageDonor(donorId: string): void {
    const donor = this.donors().find((candidate) => candidate.id === donorId);
    if (!donor || !this.donorUsable(donor)) return;
    this.recordTypedDonorEvidence(donor);
    this.stagedDonorId.set(donor.id);
    this.chamberDonorId.set(donor.id);
    this.patientCondition.set('critical');
    this.statusMessage.set(
      `${donor.dragonName} staged in the transfusion station. Authorization requires complete patient and donor marker evidence.`,
    );
  }

  authorizeTransfusion(): void {
    const patient = this.patientSpecimen();
    const donor = this.chamberDonor();
    if (!patient || !donor || !this.chamberReady()) return;
    const testedAtIso = new Date().toISOString();
    const result = transfusionCompatibility(donor, patient);
    const unitConsumed = this.mode() === 'challenge';
    if (unitConsumed) {
      this.remainingUnits.update((units) => ({
        ...units,
        [donor.id]: Math.max(0, (units[donor.id] ?? 0) - 1),
      }));
    }
    const trial: TransfusionTrial = {
      id: `${patient.dragonId}:${donor.id}:${Date.now()}`,
      donorId: donor.id,
      donorName: donor.dragonName,
      compatible: result.compatible,
      unfamiliarMarkers: result.unfamiliarMarkers,
      mode: this.mode(),
      unitConsumed,
      testedAtIso,
    };
    this.transfusionTrials.update((trials) => [trial, ...trials].slice(0, 16));
    this.patientCondition.set(result.compatible ? 'stable' : 'reaction');
    this.statusMessage.set(
      result.compatible
        ? `${donor.dragonName}'s cells remained dispersed. ${patient.dragonName} is stabilizing.`
        : `Reaction detected: unfamiliar ${result.unfamiliarMarkers
            .map((marker) => this.markerName(marker))
            .join(' and ')} markers caused cell clumping. Investigate another donor.`,
    );
  }

  releaseDonor(): void {
    this.chamberDonorId.set(null);
    this.stagedDonorId.set(null);
    if (this.patientCondition() === 'reaction') this.patientCondition.set('critical');
    this.statusMessage.set(
      'Transfusion station cleared. Prior transfusion evidence remains in the trial log.',
    );
  }

  updateExplanation(value: string): void {
    this.explanation.set(value);
  }

  saveEmergencyRecord(): void {
    const patient = this.patientSpecimen();
    const donor = this.chamberDonor();
    const patientTest = this.patientTest();
    const donorTest = this.chamberDonorTest();
    const patientType = this.patientBloodType();
    const donorType = this.chamberDonorBloodType();
    const latestTrial = this.latestChamberTrial();
    if (
      !this.canSaveRecord() ||
      !patient ||
      !donor ||
      !patientTest ||
      !donorTest ||
      !patientType ||
      !donorType ||
      !latestTrial?.compatible
    ) {
      return;
    }
    const savedAtIso = new Date().toISOString();
    const record: BloodEmergencyRecord = {
      id: `${patient.dragonId}:${Date.now()}`,
      patientId: patient.dragonId,
      patientName: patient.dragonName,
      patientSampleCode: patient.sampleCode,
      patientPhenotype: patientType.id,
      patientPossibleGenotypes: patientType.possibleGenotypes,
      donorId: donor.id,
      donorName: donor.dragonName,
      donorSampleCode: donor.sampleCode,
      donorPhenotype: donorType.id,
      donorPossibleGenotypes: donorType.possibleGenotypes,
      patientTest,
      donorTest,
      transfusionTrials: this.transfusionTrials(),
      mode: this.mode(),
      supplyNote: donor.stewardshipNote,
      codominantAlleles: ['A', 'B'],
      explanation: this.explanation().trim(),
      savedAtIso,
    };
    this.records.set(this.repository.save(this.studentId(), record));
    this.recordDrawerOpen.set(true);
    this.statusMessage.set(
      `${patient.dragonName}'s emergency record was saved to the blood-service notebook.`,
    );
  }

  testFor(specimenId: string): BloodTestEvidence | null {
    return this.tests()[specimenId] ?? null;
  }

  bloodTypeForSpecimen(specimenId: string): ReturnType<typeof bloodTypeForReactions> {
    return this.bloodTypeForTest(this.testFor(specimenId));
  }

  isFullyTested(specimenId: string): boolean {
    const test = this.tests()[specimenId];
    return Boolean(test && test.antiA !== null && test.antiB !== null);
  }

  reactionFor(marker: BloodMarker): boolean | null {
    const test = this.activeTest();
    return marker === 'a' ? (test?.antiA ?? null) : (test?.antiB ?? null);
  }

  donorUnits(donor: DonorCandidate): string {
    if (this.mode() === 'standard') return 'Reusable supply';
    const units = this.remainingUnits()[donor.id] ?? 0;
    return `${units} unit${units === 1 ? '' : 's'} remaining`;
  }

  donorBloodType(donor: DonorCandidate) {
    return phenotypeForGenotype(donor.genotype);
  }

  donorTypeSymbol(donor: DonorCandidate): string {
    return this.donorBloodType(donor).name.replace('+', '');
  }

  donorUsable(donor: DonorCandidate): boolean {
    return (
      donor.available && (this.mode() === 'standard' || (this.remainingUnits()[donor.id] ?? 0) > 0)
    );
  }

  reagentName(marker: BloodMarker): string {
    return marker === 'a' ? 'Anti-A serum' : 'Anti-B serum';
  }

  markerName(marker: BloodMarker): string {
    return marker === 'a' ? 'A' : 'B';
  }

  phenotypeName(id: BloodPhenotypeId): string {
    return this.bloodTypes.find((type) => type.id === id)?.name ?? id;
  }

  private loadSpecimen(specimen: BloodSpecimen): void {
    this.activeSpecimenId.set(specimen.id);
    this.pendingReagent.set(null);
    this.statusMessage.set(`${specimen.sampleCode} loaded on the blood-testing plate.`);
  }

  private specimenById(id: string | null): BloodSpecimen | null {
    if (!id) return null;
    const patient = this.patientSpecimen();
    if (patient?.id === id) return patient;
    return this.donors().find((donor) => donor.id === id) ?? null;
  }

  private emptyTest(specimen: BloodSpecimen): BloodTestEvidence {
    return {
      specimenId: specimen.id,
      sampleCode: specimen.sampleCode,
      antiA: null,
      antiB: null,
      testedAtIso: new Date().toISOString(),
    };
  }

  private recordTypedDonorEvidence(donor: DonorCandidate): void {
    if (this.isFullyTested(donor.id)) return;
    this.tests.update((tests) => ({
      ...tests,
      [donor.id]: {
        specimenId: donor.id,
        sampleCode: donor.sampleCode,
        antiA: antiserumReaction(donor, 'a'),
        antiB: antiserumReaction(donor, 'b'),
        testedAtIso: new Date().toISOString(),
      },
    }));
  }

  private bloodTypeForTest(test: BloodTestEvidence | null) {
    return test ? bloodTypeForReactions(test.antiA, test.antiB) : null;
  }

  private resetSupplies(): void {
    this.remainingUnits.set(
      Object.fromEntries(clinicDonors('challenge').map((donor) => [donor.id, donor.units ?? 0])),
    );
  }
}

function cardBloodType(phenotype: BloodPhenotypeId): DragonCardBloodType {
  switch (phenotype) {
    case 'a-positive':
      return 'A';
    case 'b-positive':
      return 'B';
    case 'ab-positive':
      return 'AB';
    case 'o-positive':
      return 'O';
  }
}
