import { Component, ViewChild, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { MiniDragonStationComponent } from '../mini-dragon-shared/mini-dragon-station.base';
import { MINI_CHAMPIONSHIP_MOTION } from '../companion-show/mini-dragon.training-motions';

/**
 * The show arena: a Society division judges a representative 50/50 on what it
 * inherited and what it learned, and a breed is only registered on the evidence
 * the student's own records can support.
 */
@Component({
  selector: 'app-mini-dragon-arena',
  imports: [RouterLink, SpecimenViewportComponent],
  templateUrl: './mini-dragon-arena.component.html',
  styleUrl: './mini-dragon-arena.component.scss',
})
export class MiniDragonArenaComponent extends MiniDragonStationComponent {
  @ViewChild('championViewport')
  private championViewport?: SpecimenViewportComponent;

  readonly goal = input(
    'Judge a representative against a published Society standard and register the breed on your own evidence.',
  );

  async performChampionshipRoutine(): Promise<void> {
    if (!this.champion() || !this.latestShowRun() || this.championshipInProgress()) return;
    this.championshipInProgress.set(true);
    this.statusMessage.set(
      `${this.champion()!.name} is performing the complete learned championship routine.`,
    );
    try {
      await this.championViewport?.playMotion(MINI_CHAMPIONSHIP_MOTION);
    } finally {
      this.championshipInProgress.set(false);
    }
  }
}
