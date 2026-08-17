import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  SimpleChanges,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ArenaViewportComponent } from '../../../shared/assembly-arena/components/arena-viewport/arena-viewport.component';
import {
  BattleBodySnapshot,
  ControlFrameByCombatant,
  MoveLicenseByCombatant,
} from '../../../shared/assembly-arena/models/arena.models';
import { AssemblyArenaPhysicsService } from '../../../shared/assembly-arena/physics/assembly-arena-physics.service';
import { AssemblyArenaRendererService } from '../../../shared/assembly-arena/rendering/assembly-arena-renderer.service';
import { AssemblyArenaStore } from '../../../shared/assembly-arena/state/assembly-arena.store';
import {
  NEUTRAL_CONTROL_FRAME,
  buildControlFrames,
} from '../../../shared/assembly-arena/strategy/strategy-runner';
import { CreationLibraryService } from '../../../shared/creation-library/services/creation-library.service';
import { buildArenaChampionRoster } from '../capstones/arena/dragon-arena-champions';
import { findParent, materializeDragon, runDragonBatch } from '../dragon-genetics.domain';
import { StudentDragonRecord } from '../dragon-genetics.models';
import { DragonHatcheryBreedingRepository } from '../workstations/dragon-hatchery/dragon-hatchery-breeding.repository';
import { AccountGeneticsLibraryService } from '../workstations/shared/account-genetics-library.service';

const EXHIBITION_CHAMPION = runDragonBatch(
  findParent('ember'),
  findParent('tide'),
  2026,
  1,
).sample[0];

const ARENA_WARDEN_SEED = runDragonBatch(
  findParent('moss'),
  findParent('quartz'),
  909,
  1,
).sample[0];

@Component({
  selector: 'app-dragon-arena-saga-preview',
  imports: [ArenaViewportComponent],
  providers: [
    AssemblyArenaStore,
    AssemblyArenaPhysicsService,
    AssemblyArenaRendererService,
  ],
  templateUrl: './dragon-arena-saga-preview.component.html',
  styleUrl: './dragon-arena-saga-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonArenaSagaPreviewComponent implements OnChanges {
  readonly studentId = input.required<string>();

  readonly arena = inject(AssemblyArenaStore);
  private readonly physics = inject(AssemblyArenaPhysicsService);
  private readonly library = inject(CreationLibraryService);
  private readonly hatchery = inject(DragonHatcheryBreedingRepository);
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);
  private readonly championRecord = signal<StudentDragonRecord | null>(null);
  private readonly wardenRecord = signal<StudentDragonRecord | null>(null);

  readonly championName = computed(() => this.championRecord()?.name ?? 'Academy champion');
  readonly isStudentChampion = signal(false);
  readonly scoreboard = this.arena.scoreboard;
  readonly red = computed(() => this.scoreboard().find((entry) => entry.team === 'red'));
  readonly blue = computed(() => this.scoreboard().find((entry) => entry.team === 'blue'));
  readonly winnerName = computed(() => {
    const state = this.arena.state();
    return state.combatants.find((combatant) => combatant.id === state.winnerId)?.name ?? null;
  });

  readonly controlFrameFactory = (
    snapshots: BattleBodySnapshot[],
  ): ControlFrameByCombatant => {
    const state = this.arena.state();
    return buildControlFrames(
      state,
      snapshots,
      this.arena.strategyPrograms(),
      NEUTRAL_CONTROL_FRAME,
      {},
      {
        awareness: this.physics.getCombatAwareness(state),
        licenses: this.moveLicenses(),
      },
    );
  };

  constructor() {
    effect((onCleanup) => {
      if (!this.arena.state().winnerId) return;
      const replayTimer = window.setTimeout(() => this.restartFight(), 2200);
      onCleanup(() => window.clearTimeout(replayTimer));
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['studentId']) this.loadFight();
  }

  healthPercent(current: number, maximum: number): number {
    if (maximum <= 0) return 0;
    return Math.max(0, Math.min(100, (100 * current) / maximum));
  }

  private loadFight(): void {
    const studentId = this.studentId();
    const roster = buildArenaChampionRoster(
      this.hatchery.load(studentId),
      this.accountLibrary.recordsFor(studentId),
    );
    const studentChampion = roster.at(-1) ?? null;
    const champion = studentChampion ?? EXHIBITION_CHAMPION;

    if (!champion) return;

    const wardenSeed = ARENA_WARDEN_SEED ?? champion;
    const warden: StudentDragonRecord = {
      ...wardenSeed,
      id: 'arena-warden',
      name: 'The Arena Warden',
      title: 'Balanced AI challenger',
      color: '#4a5058',
      accentColor: '#8c939b',
    };

    this.isStudentChampion.set(Boolean(studentChampion));
    this.championRecord.set(champion);
    this.wardenRecord.set(warden);

    const materializedChampion = materializeDragon(champion);
    const materializedWarden = materializeDragon(warden);
    const championAsset = this.library.saveAssemblyAsset({
      name: `Champion ${champion.id}`,
      description: 'A dragon generated from the official Dragon Genetics record.',
      tags: ['dragon', 'student', 'genetics', 'saga-preview'],
      compatibleGameIds: ['assembly-arena'],
      assembly: materializedChampion.assembly,
      combatProfile: materializedChampion.combatProfile,
    });
    const wardenAsset = this.library.saveAssemblyAsset({
      name: 'Arena Warden',
      description: 'The official Dragon Arena house challenger.',
      tags: ['dragon', 'opponent', 'genetics', 'saga-preview'],
      compatibleGameIds: ['assembly-arena'],
      assembly: materializedWarden.assembly,
      combatProfile: materializedWarden.combatProfile,
    });

    this.arena.loadMatch(
      // The same ring the full arena fights in, so the preview is a smaller
      // window onto the real thing rather than a differently-shaped pit.
      'dragon-duel-ring',
      championAsset.id,
      wardenAsset.id,
      'dragon-attack',
      'dragon-attack',
      'real-time',
    );
    this.armAutomaticStrategies();
    this.arena.start();
  }

  private restartFight(): void {
    this.arena.resetCurrentMatch();
    this.armAutomaticStrategies();
    this.arena.start();
  }

  private armAutomaticStrategies(): void {
    this.arena.setStrategyProgram('red-1', 'dragon-attack-combo');
    this.arena.setStrategyProgram('blue-1', 'dragon-attack-combo');
  }

  private moveLicenses(): MoveLicenseByCombatant {
    const licenses: MoveLicenseByCombatant = {};
    const records: readonly [string, StudentDragonRecord | null][] = [
      ['red-1', this.championRecord()],
      ['blue-1', this.wardenRecord()],
    ];

    for (const [combatantId, record] of records) {
      if (!record) continue;
      licenses[combatantId] = {
        wings: record.genome.wings.includes('W'),
        fire: record.genome.fire.includes('F'),
        horns: record.genome.horns.includes('H'),
      };
    }
    return licenses;
  }
}
