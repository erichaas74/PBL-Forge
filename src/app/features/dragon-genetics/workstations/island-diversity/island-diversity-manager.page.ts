import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonCapstoneProgressRepository } from '../../project/dragon-capstone-progress.repository';
import { LOCAL_WORKSTATION_STUDENT_ID } from '../shared/dragon-workstation-context.models';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { IslandDiversityManagerComponent } from './island-diversity-manager.component';
import { StoredIslandDiversityWorld } from './island-diversity.models';

/** Full-screen app host for the portable Island Diversity Manager workstation. */
@Component({
  selector: 'app-island-diversity-manager-page',
  imports: [RouterLink, IslandDiversityManagerComponent],
  templateUrl: './island-diversity-manager.page.html',
  styleUrl: './island-diversity-manager.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IslandDiversityManagerPage {
  private readonly context = inject(DragonWorkstationContextService);
  private readonly capstoneProgressRepository = inject(DragonCapstoneProgressRepository);
  private readonly latestWorld = signal<StoredIslandDiversityWorld | null>(null);
  private syncSignature = '';
  readonly studentId = this.context.studentId;

  constructor() {
    effect(() => {
      if (!this.context.ready()) return;
      const stored = this.latestWorld();
      if (!stored || stored.studentId === LOCAL_WORKSTATION_STUDENT_ID) return;
      const world = stored.world;
      const assignment = this.context.assignment();
      const totalGenerations = Object.values(world.islands).reduce(
        (total, population) => total + population.generation,
        0,
      );
      const signature = `${stored.studentId}:${assignment.id}:${world.updatedAtIso}:${totalGenerations}:${world.relocations.length}`;
      if (signature === this.syncSignature) return;
      this.syncSignature = signature;
      void this.capstoneProgressRepository
        .saveIslandDiversity(stored.studentId, world, assignment)
        .catch((error: unknown) =>
          console.error('Island Diversity progress could not sync.', error),
        );
    });
  }

  recordWorld(stored: StoredIslandDiversityWorld): void {
    this.latestWorld.set(stored);
  }
}
