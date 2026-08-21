import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import {
  MiniGeneId,
  expressMiniGene,
  miniGene,
} from '../companion-show/mini-dragon.genetics';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  BreedingProgram,
  KennelDragon,
  LITTER_SIZE,
  WORKING_ROLES,
  WORKING_ROLE_BY_ID,
  WorkingRole,
  WorkingRoleId,
} from './viking-breeding.models';
import {
  breedLitter,
  crossPlan,
  formProvesGenotype,
  litterMatchRate,
  matchesRole,
  pairingBreakdown,
  programMetrics,
  requirementsMet,
  requiresHeterozygote,
  roleBreedsTrue,
  selectionResponse,
} from './viking-breeding.domain';
import { VikingBreedingRepository, createProgram } from './viking-breeding.repository';

/**
 * Viking settlement breeding — run a selection programme for a working role.
 *
 * The instrument is open: pair any two animals in the kennel, in any order, and keep or release
 * whichever pups you like. The constraints are the settlement's — kennel size, litters per season,
 * seasons before delivery — which are model constraints rather than a prescribed sequence.
 *
 * Nothing tells the student in advance whether their commission can be fixed. That is the finding
 * the workstation exists to produce, so `roleBreedsTrue` is only ever surfaced through what their
 * own matched pairs actually throw.
 */
@Component({
  selector: 'app-viking-breeding',
  imports: [DecimalPipe],
  templateUrl: './viking-breeding.component.html',
  styleUrl: './viking-breeding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VikingBreedingComponent {
  private readonly repository = inject(VikingBreedingRepository);

  readonly studentId = input.required<string>();
  readonly initialRoleId = input<string | null>(null);
  readonly goal = input(
    'Breed a line that can do the settlement’s work, and find out which of its traits will hold and which will not.',
  );
  readonly programChanged = output<BreedingProgram>();

  readonly roles = WORKING_ROLES;
  readonly litterSize = LITTER_SIZE;

  private readonly programsSignal = signal<Readonly<Record<string, BreedingProgram>>>({});
  private readonly hydratedFor = signal<string | null>(null);

  readonly activeRoleId = signal<WorkingRoleId>(WORKING_ROLES[0].id);
  readonly damId = signal<string | null>(null);
  readonly sireId = signal<string | null>(null);
  readonly inspectedId = signal<string | null>(null);
  readonly guideOpen = signal(false);
  readonly message = signal<string | null>(null);

  readonly role = computed<WorkingRole>(() => WORKING_ROLE_BY_ID[this.activeRoleId()]);

  readonly program = computed<BreedingProgram>(() => {
    this.hydrate();
    return (
      this.programsSignal()[this.activeRoleId()] ??
      createProgram(this.activeRoleId(), this.studentId())
    );
  });

  readonly kennel = computed(() => this.program().kennel);
  readonly dams = computed(() => this.kennel().filter((animal) => animal.sex === 'female'));
  readonly sires = computed(() => this.kennel().filter((animal) => animal.sex === 'male'));

  readonly dam = computed(() => this.kennel().find((a) => a.id === this.damId()) ?? null);
  readonly sire = computed(() => this.kennel().find((a) => a.id === this.sireId()) ?? null);

  readonly metrics = computed(() => programMetrics(this.kennel(), this.role()));

  readonly littersThisSeason = computed(
    () => this.program().litters.filter((litter) => litter.season === this.program().season).length,
  );
  readonly littersLeftThisSeason = computed(() =>
    Math.max(0, this.role().littersPerSeason - this.littersThisSeason()),
  );
  readonly seasonsLeft = computed(() =>
    Math.max(0, this.role().seasons - this.program().season + 1),
  );
  readonly kennelSpace = computed(() =>
    Math.max(0, this.role().kennelCap - this.kennel().length),
  );

  /** Expected share of the next litter meeting the commission, shown before breeding it. */
  readonly pairingRate = computed(() => {
    const dam = this.dam();
    const sire = this.sire();
    return dam && sire ? litterMatchRate(dam.genome, sire.genome, this.role()) : null;
  });

  readonly pairingOdds = computed(() => {
    const dam = this.dam();
    const sire = this.sire();
    return dam && sire ? pairingBreakdown(dam.genome, sire.genome, this.role()) : [];
  });

  readonly response = computed(() =>
    selectionResponse(
      this.program().litters.map((litter) => ({
        season: litter.season,
        pups: this.kennel().filter((animal) => litter.pupIds.includes(animal.id)),
      })),
      this.role(),
    ),
  );

  readonly inspected = computed(
    () => this.kennel().find((animal) => animal.id === this.inspectedId()) ?? null,
  );

  readonly deliverable = computed(() =>
    this.kennel().filter((animal) => matchesRole(animal.genome, this.role())),
  );

  readonly delivered = computed(
    () => this.kennel().find((a) => a.id === this.program().deliveredDragonId) ?? null,
  );

  /**
   * Only offered once the settlement has its animal, so the finding is earned rather than read.
   * Before that, a student has to work out from their own litters whether the line will hold.
   */
  readonly verdict = computed(() => {
    if (!this.program().deliveredDragonId) return null;
    const role = this.role();
    return {
      breedsTrue: roleBreedsTrue(role),
      crossLines: crossPlan(role),
      seasonsUsed: this.program().season,
    };
  });

  // --- Reading ---------------------------------------------------------------

  formLabel(animal: KennelDragon, geneId: MiniGeneId): string {
    return expressMiniGene(geneId, animal.genome).label;
  }

  geneName(geneId: MiniGeneId): string {
    return miniGene(geneId).name;
  }

  requiredFormLabel(geneId: MiniGeneId, formId: string): string {
    return miniGene(geneId).forms.find((form) => form.id === formId)?.label ?? formId;
  }

  meetsRequirement(animal: KennelDragon, geneId: MiniGeneId, formId: string): boolean {
    return expressMiniGene(geneId, animal.genome).id === formId;
  }

  matches(animal: KennelDragon): boolean {
    return matchesRole(animal.genome, this.role());
  }

  scoreFor(animal: KennelDragon): number {
    return requirementsMet(animal.genome, this.role());
  }

  /**
   * Whether looking at this animal settles its genotype at a locus. A smooth-backed dragon may be
   * carrying the bumpy allele, and no amount of looking will say.
   */
  formIsCertain(geneId: MiniGeneId, formId: string): boolean {
    return formProvesGenotype(geneId, formId);
  }

  requirementNeedsHeterozygote(geneId: MiniGeneId, formId: string): boolean {
    return requiresHeterozygote(geneId, formId);
  }

  isDam(animal: KennelDragon): boolean {
    return this.damId() === animal.id;
  }

  isSire(animal: KennelDragon): boolean {
    return this.sireId() === animal.id;
  }

  // --- Acting ----------------------------------------------------------------

  selectRole(roleId: string): void {
    if (!WORKING_ROLE_BY_ID[roleId]) return;
    this.activeRoleId.set(roleId as WorkingRoleId);
    this.damId.set(null);
    this.sireId.set(null);
    this.inspectedId.set(null);
    this.message.set(null);
  }

  /** Select-and-place: a click assigns the animal to the breeding pen by its sex. */
  stage(animal: KennelDragon): void {
    if (animal.sex === 'female') {
      this.damId.update((current) => (current === animal.id ? null : animal.id));
    } else {
      this.sireId.update((current) => (current === animal.id ? null : animal.id));
    }
    this.message.set(null);
  }

  inspect(animal: KennelDragon): void {
    this.inspectedId.update((current) => (current === animal.id ? null : animal.id));
  }

  breed(): void {
    const dam = this.dam();
    const sire = this.sire();
    if (!dam || !sire) {
      this.message.set('Stage one female and one male before breeding.');
      return;
    }
    if (this.littersLeftThisSeason() <= 0) {
      this.message.set('No litters left this season. Move to the next season when you are ready.');
      return;
    }
    if (this.kennelSpace() < LITTER_SIZE) {
      this.message.set(
        `The kennel holds ${this.role().kennelCap}. Release animals before breeding again.`,
      );
      return;
    }

    const program = this.program();
    const seed = `${program.studentId}:${program.roleId}:${program.season}:${program.litters.length}`;
    const litter = breedLitter(dam, sire, this.role(), program.season, seed);

    this.updateProgram((current) => ({
      ...current,
      kennel: [...current.kennel, ...litter.pups],
      litters: [
        ...current.litters,
        {
          id: seed,
          season: current.season,
          damId: dam.id,
          sireId: sire.id,
          pupIds: litter.pups.map((pup) => pup.id),
          predictedMatchRate: litter.predictedMatchRate,
          bredAtIso: new Date().toISOString(),
        },
      ],
    }));

    const matched = litter.pups.filter((pup) => matchesRole(pup.genome, this.role())).length;
    this.message.set(
      `${LITTER_SIZE} pups. ${matched} meet the commission — you expected about ${Math.round(
        litter.predictedMatchRate * LITTER_SIZE,
      )}.`,
    );
  }

  release(animal: KennelDragon): void {
    if (this.kennel().length <= 2) {
      this.message.set('Keep at least two animals or the line ends here.');
      return;
    }
    this.updateProgram((current) => ({
      ...current,
      kennel: current.kennel.filter((candidate) => candidate.id !== animal.id),
      releasedIds: [...current.releasedIds, animal.id],
    }));
    if (this.damId() === animal.id) this.damId.set(null);
    if (this.sireId() === animal.id) this.sireId.set(null);
    this.message.set(`${animal.name} released back to the settlement.`);
  }

  nextSeason(): void {
    if (this.program().season >= this.role().seasons) {
      this.message.set('The settlement expects its animal this season.');
      return;
    }
    this.updateProgram((current) => ({ ...current, season: current.season + 1 }));
    this.message.set(`Season ${this.program().season}.`);
  }

  deliver(animal: KennelDragon): void {
    if (!this.matches(animal)) {
      this.message.set(`${animal.name} does not meet the commission.`);
      return;
    }
    this.updateProgram((current) => ({ ...current, deliveredDragonId: animal.id }));
    this.message.set(`${animal.name} delivered to ${this.role().settlement}.`);
  }

  commitPlan(event: Event): void {
    const plan = (event.target as HTMLTextAreaElement).value;
    this.updateProgram((current) => ({ ...current, plan }));
  }

  toggleGuide(): void {
    this.guideOpen.update((open) => !open);
  }

  restart(): void {
    this.updateProgram(() => createProgram(this.activeRoleId(), this.studentId()));
    this.damId.set(null);
    this.sireId.set(null);
    this.inspectedId.set(null);
    this.message.set('New stock from the settlement.');
  }

  private hydrate(): void {
    const studentId = normalizeWorkstationStudentId(this.studentId());
    if (this.hydratedFor() === studentId) return;
    this.hydratedFor.set(studentId);
    this.programsSignal.set(this.repository.load(studentId).programs);
    const requested = this.initialRoleId();
    if (requested && WORKING_ROLE_BY_ID[requested]) {
      this.activeRoleId.set(requested as WorkingRoleId);
    }
  }

  private updateProgram(change: (program: BreedingProgram) => BreedingProgram): void {
    const roleId = this.activeRoleId();
    const studentId = normalizeWorkstationStudentId(this.studentId());
    const current = this.programsSignal()[roleId] ?? createProgram(roleId, studentId);
    const next = { ...change(current), updatedAtIso: new Date().toISOString() };
    const programs = { ...this.programsSignal(), [roleId]: next };
    this.programsSignal.set(programs);
    this.repository.save({ schemaVersion: 1, studentId, programs });
    this.programChanged.emit(next);
  }
}
