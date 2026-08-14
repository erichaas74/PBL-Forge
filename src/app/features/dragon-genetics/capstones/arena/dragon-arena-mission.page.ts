import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/firebase/session.service';
import { DragonArenaComponent } from '../../dragon-arena.component';
import { DragonBattleResult, StudentDragonRecord } from '../../dragon-genetics.models';
import { DragonAdaptiveStore } from '../../adaptive/dragon-adaptive.store';
import { DragonCapstoneProgressRepository } from '../../project/dragon-capstone-progress.repository';
import { DragonHatcheryBreedingRepository } from '../../workstations/dragon-hatchery/dragon-hatchery-breeding.repository';
import { AccountGeneticsLibraryService } from '../../workstations/shared/account-genetics-library.service';
import { buildArenaChampionRoster } from './dragon-arena-champions';
import {
  buildDragonArenaTraitEvidence,
  scoreDragonArenaTrial,
} from './dragon-arena-evidence';
import {
  DragonArenaMissionSnapshot,
  DragonArenaTrialRecord,
} from './dragon-arena-mission.models';
import { DragonArenaMissionRepository } from './dragon-arena-mission.repository';

@Component({
  selector: 'app-dragon-arena-mission-page',
  imports: [RouterLink, DragonArenaComponent],
  templateUrl: './dragon-arena-mission.page.html',
  styleUrl: './dragon-arena-mission.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonArenaMissionPage {
  private readonly session = inject(SessionService);
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);
  private readonly hatcheryRepository = inject(DragonHatcheryBreedingRepository);
  private readonly missionRepository = inject(DragonArenaMissionRepository);
  private readonly adaptiveStore = inject(DragonAdaptiveStore);
  private readonly capstoneProgressRepository = inject(DragonCapstoneProgressRepository);
  private syncSignature = '';

  readonly studentId = computed(() => this.session.user()?.uid ?? 'local-student');
  readonly champions = signal<readonly StudentDragonRecord[]>([]);
  readonly mission = signal<DragonArenaMissionSnapshot>({
    schemaVersion: 2,
    studentId: 'local-student',
    selectedChampionId: null,
    trials: [],
  });
  readonly selectedChampion = computed(() => {
    const champions = this.champions();
    return (
      champions.find((champion) => champion.id === this.mission().selectedChampionId) ??
      champions.at(-1) ??
      null
    );
  });
  readonly selectedTrials = computed(() => {
    const championId = this.selectedChampion()?.id;
    return championId
      ? [...this.mission().trials]
          .filter((trial) => trial.championId === championId)
          .reverse()
      : [];
  });
  readonly wins = computed(() => this.selectedTrials().filter((trial) => trial.won).length);
  readonly bestScore = computed(() =>
    this.selectedTrials().reduce((best, trial) => Math.max(best, trial.score), 0),
  );
  readonly traitEvidence = computed(() => {
    const champion = this.selectedChampion();
    return champion ? buildDragonArenaTraitEvidence(champion) : [];
  });

  constructor() {
    effect(() => this.loadStudent(this.studentId()));
    effect(() => {
      if (!this.adaptiveStore.ready()) return;
      const mission = this.mission();
      const assignment = this.adaptiveStore.assignment();
      const signature = `${mission.studentId}:${assignment.id}:${mission.selectedChampionId ?? 'none'}:${mission.trials.at(-1)?.id ?? 'none'}`;
      if (mission.studentId === 'local-student' || signature === this.syncSignature) return;
      this.syncSignature = signature;
      void this.capstoneProgressRepository
        .saveArena(mission, assignment)
        .catch((error: unknown) => console.error('Dragon Arena progress could not sync.', error));
    });
  }

  selectChampion(event: Event): void {
    const selectedChampionId = (event.target as HTMLSelectElement).value;
    if (!this.champions().some((champion) => champion.id === selectedChampionId)) return;
    this.saveMission({ ...this.mission(), selectedChampionId });
  }

  recordTrial(result: DragonBattleResult): void {
    const champion = this.selectedChampion();
    if (!champion) return;
    const completedAtIso = new Date().toISOString();
    const scoreBreakdown = scoreDragonArenaTrial(result);
    const trial: DragonArenaTrialRecord = {
      ...result,
      id: `${champion.id}:${completedAtIso}`,
      championId: champion.id,
      score: scoreBreakdown.total,
      scoreBreakdown,
      traitEvidence: buildDragonArenaTraitEvidence(champion),
      completedAtIso,
    };
    this.saveMission({
      ...this.mission(),
      selectedChampionId: champion.id,
      trials: [...this.mission().trials, trial],
    });
  }

  private loadStudent(studentId: string): void {
    const hatchery = this.hatcheryRepository.load(studentId);
    const account = this.accountLibrary.recordsFor(studentId);
    const champions = buildArenaChampionRoster(hatchery, account);
    const mission = this.missionRepository.load(studentId);
    const selectedChampionId = champions.some(
      (champion) => champion.id === mission.selectedChampionId,
    )
      ? mission.selectedChampionId
      : (champions.at(-1)?.id ?? null);
    this.champions.set(champions);
    this.mission.set({ ...mission, selectedChampionId });
  }

  private saveMission(snapshot: DragonArenaMissionSnapshot): void {
    this.mission.set(snapshot);
    this.missionRepository.save(snapshot);
  }
}
