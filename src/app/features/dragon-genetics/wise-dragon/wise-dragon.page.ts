import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/firebase/session.service';
import { SpecimenSource } from '../../../shared/assembly/preview/specimen.models';
import { SpecimenViewportComponent } from '../../../shared/assembly/preview/specimen-viewport.component';
import { StudentDragonRecord } from '../dragon-genetics.models';
import { buildArenaChampionRoster } from '../capstones/arena/dragon-arena-champions';
import { buildDragonArenaTraitEvidence } from '../capstones/arena/dragon-arena-evidence';
import { DragonArenaTrialRecord } from '../capstones/arena/dragon-arena-mission.models';
import { DragonArenaMissionRepository } from '../capstones/arena/dragon-arena-mission.repository';
import {
  dragonLabGenomeSource,
  provideDragonSpecimenProfile,
} from '../simulation/domain/dragon-specimen.profile';
import { DragonTraitId } from '../simulation/domain/dragon-lab.models';
import { DragonHatcheryBreedingRepository } from '../workstations/dragon-hatchery/dragon-hatchery-breeding.repository';
import { AccountGeneticsLibraryService } from '../workstations/shared/account-genetics-library.service';
import { WISE_DRAGON_SOURCE, WISE_DRAGON_STAGE_THEME } from './wise-dragon.character';
import { WISE_DRAGON_CONVERSATION_GATEWAY } from './wise-dragon.gateway';
import { MockWiseDragonConversationGateway } from './wise-dragon.mock-gateway';
import { WiseDragonConversationContext, WiseDragonReply } from './wise-dragon.models';
import { WISE_DRAGON_MOTIONS } from './wise-dragon.motion';
import { WiseDragonSessionStore } from './wise-dragon-session.store';

const PREVIEW_CHAMPION: StudentDragonRecord = {
  id: 'wise-dragon-preview-champion',
  name: 'Hatchling Preview',
  title: 'Sample Arena Champion',
  color: '#9b6635',
  accentColor: '#e0b35e',
  genome: {
    wings: ['W', 'w'],
    fire: ['F', 'f'],
    scales: ['S', 's'],
    horns: ['H', 'h'],
  },
  parentIds: ['ember', 'tide'],
  generation: 1,
};

const PREVIEW_TRIAL: DragonArenaTrialRecord = {
  id: 'wise-dragon-preview-trial',
  championId: PREVIEW_CHAMPION.id,
  won: true,
  winnerName: PREVIEW_CHAMPION.name,
  elapsedSeconds: 42,
  remainingHealthPercent: 68,
  score: 84,
  scoreBreakdown: {
    outcomePoints: 50,
    conditionPoints: 24,
    pacePoints: 10,
    total: 84,
  },
  traitEvidence: buildDragonArenaTraitEvidence(PREVIEW_CHAMPION),
  completedAtIso: '2026-08-15T00:00:00.000Z',
};

@Component({
  selector: 'app-wise-dragon-page',
  imports: [RouterLink, SpecimenViewportComponent],
  templateUrl: './wise-dragon.page.html',
  styleUrl: './wise-dragon.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    WiseDragonSessionStore,
    MockWiseDragonConversationGateway,
    {
      provide: WISE_DRAGON_CONVERSATION_GATEWAY,
      useExisting: MockWiseDragonConversationGateway,
    },
    ...provideDragonSpecimenProfile(),
  ],
})
export class WiseDragonPage {
  @ViewChild('wiseViewport') private wiseViewport?: SpecimenViewportComponent;
  @ViewChild('studentViewport') private studentViewport?: SpecimenViewportComponent;

  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);
  private readonly hatcheryRepository = inject(DragonHatcheryBreedingRepository);
  private readonly missionRepository = inject(DragonArenaMissionRepository);

  readonly store = inject(WiseDragonSessionStore);
  readonly theme = WISE_DRAGON_STAGE_THEME;
  readonly wiseDragonSource = WISE_DRAGON_SOURCE;
  readonly claim = signal('');
  readonly reasoning = signal('');
  readonly studentResponse = signal('');
  readonly selectedEvidence = signal<readonly DragonTraitId[]>([]);
  readonly champion = signal<StudentDragonRecord | null>(null);
  readonly trial = signal<DragonArenaTrialRecord | null>(null);
  readonly previewMode = signal(false);

  readonly traitEvidence = computed(() => {
    const champion = this.champion();
    const trial = this.trial();
    if (!champion) return [];
    return trial?.traitEvidence.length
      ? trial.traitEvidence
      : buildDragonArenaTraitEvidence(champion);
  });
  readonly championSource = computed<SpecimenSource | null>(() => {
    const champion = this.champion();
    return champion
      ? dragonLabGenomeSource(champion.id, champion.genome, {
          label: champion.name,
          generation: champion.generation,
          identity: { color: champion.color, accentColor: champion.accentColor },
        })
      : null;
  });
  readonly canBegin = computed(
    () =>
      Boolean(this.champion() && this.trial()) &&
      this.claim().trim().length >= 20 &&
      this.reasoning().trim().length >= 20 &&
      this.selectedEvidence().length > 0,
  );
  readonly focusedTraitId = computed(() => {
    const action = this.store.pendingSpecimenAction();
    return action?.type === 'focus-trait' ? action.traitId : null;
  });

  constructor() {
    this.loadArenaContext();
  }

  updateClaim(event: Event): void {
    this.claim.set(valueFrom(event));
  }

  updateReasoning(event: Event): void {
    this.reasoning.set(valueFrom(event));
  }

  updateResponse(event: Event): void {
    this.studentResponse.set(valueFrom(event));
  }

  toggleEvidence(traitId: DragonTraitId, event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    this.selectedEvidence.update((ids) =>
      checked ? [...new Set([...ids, traitId])] : ids.filter((id) => id !== traitId),
    );
  }

  async beginDefense(): Promise<void> {
    const context = this.buildContext();
    if (!context || !this.canBegin()) return;
    void this.playMotion('thinking');
    const reply = await this.store.begin(context);
    void this.playReply(reply);
  }

  async submitResponse(): Promise<void> {
    const response = this.studentResponse().trim();
    if (!response) return;
    void this.playMotion('thinking');
    const reply = await this.store.respond(response);
    if (reply) this.studentResponse.set('');
    void this.playReply(reply);
  }

  async endDefense(): Promise<void> {
    const reply = await this.store.end();
    void this.playReply(reply);
  }

  openSpecimen(): void {
    this.store.openSpecimen();
  }

  returnToChamber(): void {
    this.store.returnToChamber();
  }

  resetSpecimenView(): void {
    this.studentViewport?.resetView();
  }

  restartDefense(): void {
    this.store.reset();
  }

  private loadArenaContext(): void {
    const studentId = this.session.user()?.uid ?? 'local-student';
    const hatchery = this.hatcheryRepository.load(studentId);
    const account = this.accountLibrary.recordsFor(studentId);
    const champions = buildArenaChampionRoster(hatchery, account);
    const mission = this.missionRepository.load(studentId);
    const requestedId = this.route.snapshot.queryParamMap.get('dragonId');
    const savedChampion =
      champions.find((item) => item.id === requestedId) ??
      champions.find((item) => item.id === mission.selectedChampionId) ??
      champions.at(-1) ??
      null;
    const savedTrial = savedChampion
      ? (mission.trials.filter((item) => item.championId === savedChampion.id).at(-1) ?? null)
      : null;
    const usePreview = !savedChampion || !savedTrial;
    const champion = usePreview ? PREVIEW_CHAMPION : savedChampion;
    const trial = usePreview ? PREVIEW_TRIAL : savedTrial;
    this.previewMode.set(usePreview);
    this.champion.set(champion);
    this.trial.set(trial);
    if (champion) {
      const evidence = trial?.traitEvidence.length
        ? trial.traitEvidence
        : buildDragonArenaTraitEvidence(champion);
      this.selectedEvidence.set(evidence.slice(0, 1).map((item) => item.traitId));
    }
  }

  private buildContext(): WiseDragonConversationContext | null {
    const champion = this.champion();
    const trial = this.trial();
    if (!champion || !trial) return null;
    return {
      schemaVersion: 1,
      projectId: 'dragon-genetics-lab',
      activityId: 'dragon-arena',
      mode: 'practice-defense',
      champion: {
        id: champion.id,
        name: champion.name,
        generation: champion.generation,
        traits: this.traitEvidence().map((record) => ({
          traitId: record.traitId,
          traitName: record.traitName,
          genotype: record.genotype,
          phenotype: record.phenotype,
          arenaEffect: record.arenaEffect,
        })),
      },
      trial: {
        trialId: trial.id,
        won: trial.won,
        elapsedSeconds: trial.elapsedSeconds,
        remainingHealthPercent: trial.remainingHealthPercent,
        score: trial.score,
      },
      brief: {
        schemaVersion: 1,
        claim: this.claim().trim(),
        evidenceTraitIds: this.selectedEvidence(),
        reasoning: this.reasoning().trim(),
      },
      masterySkillIds: ['GEN-1', 'GEN-3'],
    };
  }

  private async playReply(reply: WiseDragonReply | null): Promise<void> {
    if (!reply) return;
    await this.playMotion(reply.animation);
  }

  private playMotion(animation: WiseDragonReply['animation']): Promise<void> {
    const motion = WISE_DRAGON_MOTIONS[animation];
    return motion
      ? (this.wiseViewport?.playMotion(motion) ?? Promise.resolve())
      : Promise.resolve();
  }
}

function valueFrom(event: Event): string {
  return event.target instanceof HTMLTextAreaElement ? event.target.value : '';
}
