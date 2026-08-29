/**
 * Runtime status: ACTIVE — routed full-size Dragon Arena capstone mission.
 * Inputs/signals: authenticated student, saved champion roster, champion selection, and trial results.
 * Data access: account library, hatchery, arena mission, adaptive assignment, and capstone repositories.
 * Connects to: DragonArenaComponent, teacher capstone summaries, and saved champion evidence.
 */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/firebase/session.service';
import { DragonArenaComponent } from '../../dragon-arena.component';
import { DragonBattleResult, StudentDragonRecord } from '../../dragon-genetics.models';
import { DragonAdaptiveStore } from '../../adaptive/dragon-adaptive.store';
import { DragonCapstoneProgressRepository } from '../../project/dragon-capstone-progress.repository';
import { DragonHatcheryBreedingRepository } from '../../workstations/dragon-hatchery/dragon-hatchery-breeding.repository';
import { AccountGeneticsFileComponent } from '../../workstations/shared/account-genetics-file.component';
import {
  AccountDragonRecord,
  AccountGeneticsRecord,
} from '../../workstations/shared/account-genetics-library.models';
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
  imports: [RouterLink, DragonArenaComponent, AccountGeneticsFileComponent],
  templateUrl: './dragon-arena-mission.page.html',
  styleUrl: './dragon-arena-mission.page.scss',})
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
  readonly eligibleChampionIds = computed(() => this.champions().map((champion) => champion.id));
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

  selectChampion(record: AccountGeneticsRecord): void {
    if (record.kind !== 'dragon') return;
    if (!this.champions().some((champion) => champion.id === record.id)) return;
    this.saveMission({ ...this.mission(), selectedChampionId: record.id });
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
    const storedIds = new Set(account.dragons.map((dragon) => dragon.id));
    const missingRecords = champions.flatMap((champion) => {
      if (storedIds.has(champion.id)) return [];
      const fertilization = hatchery.fertilizations.find(
        (record) => record.offspringId === champion.id,
      );
      if (!fertilization) return [];
      const sexChromosome = fertilization.spermSelection.gamete.chromosomes.find(
        (chromosome) => chromosome.chromosome === 'Chr X',
      )?.sexChromosome;
      return [
        {
          kind: 'dragon',
          ...champion,
          sex: sexChromosome === 'Y' ? 'male' : 'female',
          source: 'student',
          storedAtIso: fertilization.createdAtIso,
          originRecordId: fertilization.id,
        } satisfies AccountDragonRecord,
      ];
    });
    if (missingRecords.length) this.accountLibrary.saveDragons(studentId, missingRecords);
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
