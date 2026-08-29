/**
 * Runtime status: ACTIVE-HYBRID — state adapter for the retained /explore project hub.
 * Inputs/signals: session, assignment, local activity repositories, capstone records, and selection.
 * Data access: local workstation/progress stores plus Firestore capstone selection publishing.
 * Connects to: /explore, retained DragonJourneyFacade, testing shortcuts, and trait-evidence progress.
 */
import { computed, effect, inject, Service, signal } from '@angular/core';
import { SessionService } from '../../../core/firebase/session.service';
import { ProjectHubAssignment } from '../../project/domain/project-hub.models';
import { buildProjectHubViewModel } from '../../project/domain/project-hub.selectors';
import { DragonAdaptiveStore } from '../adaptive/dragon-adaptive.store';
import { isDragonSimulationId } from '../adaptive/dragon-simulation.registry';
import { DragonArenaMissionRepository } from '../capstones/arena/dragon-arena-mission.repository';
import { BloodCompatibilityRepository } from '../workstations/blood-compatibility/blood-compatibility.repository';
import { CompanionShowRepository } from '../workstations/companion-show/companion-show.repository';
import { DragonHatcheryBreedingRepository } from '../workstations/dragon-hatchery/dragon-hatchery-breeding.repository';
import { IslandDiversityRepository } from '../workstations/island-diversity/island-diversity.repository';
import { PedigreeLabRepository } from '../workstations/pedigree-lab/pedigree-lab.repository';
import { ProteinRescueRepository } from '../workstations/protein-rescue/protein-rescue.repository';
import { DragonCapstonePathId, DRAGON_CAPSTONE_PATHS } from './dragon-capstone-paths';
import { DragonCapstoneProgressRepository } from './dragon-capstone-progress.repository';
import { buildDragonStudentProjectState } from './dragon-project-hub.adapter';
import { DRAGON_PROJECT_HUB_DEFINITION } from './dragon-project-hub.definition';
import { DragonProjectSelectionRepository } from './dragon-project-selection.repository';
import { TraitEvidenceRepository } from '../workstations/trait-evidence/trait-evidence.repository';
import { DragonTestingProgressRepository } from './dragon-testing-progress.repository';
import { LOCAL_WORKSTATION_STUDENT_ID } from '../workstations/shared/dragon-workstation-context.models';

@Service()
export class DragonProjectHubFacade {
  private readonly session = inject(SessionService);
  private readonly adaptiveStore = inject(DragonAdaptiveStore);
  private readonly traitEvidenceRepository = inject(TraitEvidenceRepository);
  private readonly hatcheryRepository = inject(DragonHatcheryBreedingRepository);
  private readonly arenaRepository = inject(DragonArenaMissionRepository);
  private readonly companionRepository = inject(CompanionShowRepository);
  private readonly islandRepository = inject(IslandDiversityRepository);
  private readonly pedigreeRepository = inject(PedigreeLabRepository);
  private readonly proteinRepository = inject(ProteinRescueRepository);
  private readonly bloodRepository = inject(BloodCompatibilityRepository);
  private readonly selectionRepository = inject(DragonProjectSelectionRepository);
  private readonly capstoneProgressRepository = inject(DragonCapstoneProgressRepository);
  private readonly testingProgressRepository = inject(DragonTestingProgressRepository);
  private readonly studentSelectedPathIdSignal = signal<DragonCapstonePathId | null>(null);
  private readonly selectionHydrated = signal(false);
  private readonly refreshVersion = signal(0);
  private selectionContext = '';
  private selectionSyncSignature = '';

  readonly definition = DRAGON_PROJECT_HUB_DEFINITION;
  // Emulator auth signs in asynchronously. Keep local progress on one identity so that a path
  // chosen before anonymous sign-in finishes is not replaced by an empty second account.
  readonly studentId = computed(() =>
    this.session.isLocal
      ? LOCAL_WORKSTATION_STUDENT_ID
      : (this.session.user()?.uid ?? LOCAL_WORKSTATION_STUDENT_ID),
  );
  readonly pathSelectionLocked = computed(
    () => this.adaptiveStore.assignment().journeyPlan.selectionMode === 'teacher-assigned',
  );
  readonly offeredPathIds = computed(
    () => this.adaptiveStore.assignment().journeyPlan.offeredPathIds,
  );
  readonly selectedPathId = computed<DragonCapstonePathId | null>(() => {
    const plan = this.adaptiveStore.assignment().journeyPlan;
    if (plan.selectionMode === 'teacher-assigned') return plan.defaultPathId;
    const selected = this.studentSelectedPathIdSignal();
    return selected && plan.offeredPathIds.some((pathId) => pathId === selected) ? selected : null;
  });
  readonly assignment = computed<ProjectHubAssignment>(() => {
    const assignment = this.adaptiveStore.assignment();
    return {
      id: assignment.id,
      projectId: this.definition.id,
      classId: assignment.classId,
      activitySettings: Object.fromEntries(
        this.definition.activities.map((activity) => {
          if (!isDragonSimulationId(activity.id)) return [activity.id, { released: true }];
          return [
            activity.id,
            { released: assignment.simulationSettings[activity.id]?.enabled ?? true },
          ];
        }),
      ),
    };
  });
  readonly studentState = computed(() => {
    this.refreshVersion();
    const studentId = this.studentId();
    const assignmentId = this.assignment().id;
    return buildDragonStudentProjectState({
      studentId,
      assignmentId,
      selectedPathId: this.selectedPathId(),
      traitEvidence: this.traitEvidenceRepository.load(studentId),
      runs: Object.values(this.adaptiveStore.runs()).filter((run) => run !== undefined),
      notebook: this.adaptiveStore.geneticsNotebook(),
      hatchery: this.hatcheryRepository.load(studentId),
      arena: this.arenaRepository.load(studentId),
      companionShow: this.companionRepository.load(studentId),
      islandDiversity: this.islandRepository.load(studentId),
      pedigree: this.pedigreeRepository.load(studentId),
      proteinCases: this.proteinRepository.load(studentId),
      bloodCases: this.bloodRepository.load(studentId),
      testingProgress: this.testingProgressRepository.load(studentId, assignmentId),
    });
  });
  readonly viewModel = computed(() =>
    buildProjectHubViewModel(this.definition, this.assignment(), this.studentState()),
  );

  constructor() {
    effect(() => {
      const studentId = this.studentId();
      const assignmentId = this.assignment().id;
      const context = `${studentId}:${assignmentId}`;
      if (context === this.selectionContext) return;
      this.selectionContext = context;
      const selection = this.selectionRepository.load(studentId, assignmentId);
      this.studentSelectedPathIdSignal.set(selection.selectedPathId);
      this.selectionHydrated.set(true);
      this.refresh();
    });
    effect(() => {
      if (!this.adaptiveStore.ready() || !this.selectionHydrated()) return;
      const studentId = this.studentId();
      const assignment = this.adaptiveStore.assignment();
      const selectedPathId = this.selectedPathId();
      const signature = `${studentId}:${assignment.id}:${assignment.assignmentVersion}:${selectedPathId ?? 'none'}`;
      if (studentId === LOCAL_WORKSTATION_STUDENT_ID || signature === this.selectionSyncSignature)
        return;
      this.selectionSyncSignature = signature;
      void this.capstoneProgressRepository
        .saveSelection(studentId, assignment, selectedPathId)
        .catch((error: unknown) =>
          console.error('Dragon Genetics path selection could not sync.', error),
        );
    });
  }

  refresh(): void {
    this.refreshVersion.update((version) => version + 1);
  }

  selectPath(pathId: string | null): void {
    if (this.pathSelectionLocked()) return;
    const selectedPathId =
      DRAGON_CAPSTONE_PATHS.some((path) => path.id === pathId) &&
      this.offeredPathIds().some((offeredPathId) => offeredPathId === pathId)
        ? (pathId as DragonCapstonePathId)
        : null;
    this.studentSelectedPathIdSignal.set(selectedPathId);
    this.selectionRepository.save({
      schemaVersion: 1,
      studentId: this.studentId(),
      assignmentId: this.assignment().id,
      selectedPathId,
    });
  }
}
