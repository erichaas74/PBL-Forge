import { Component, ViewChild, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { MiniDragonStationComponent } from '../mini-dragon-shared/mini-dragon-station.base';
import { MiniDragonCardComponent } from '../mini-dragon-shared/mini-dragon-card.component';
import { MiniTrainingSkillId } from '../companion-show/companion-show.models';
import { MINI_TRAINING_MOTIONS } from '../companion-show/mini-dragon.training-motions';

/**
 * The training ground: the half of a show score a breeder cannot breed for.
 *
 * Practice is recorded against a dragon and never against its genome, which is
 * the whole point of the room — a student who trains a champion here and then
 * breeds it in the kennel finds the skill did not travel to the young.
 */
@Component({
  selector: 'app-mini-dragon-training',
  imports: [RouterLink, SpecimenViewportComponent, MiniDragonCardComponent],
  templateUrl: './mini-dragon-training.component.html',
  styleUrl: './mini-dragon-training.component.scss',
})
export class MiniDragonTrainingComponent extends MiniDragonStationComponent {
  @ViewChild('trainingViewport')
  private trainingViewport?: SpecimenViewportComponent;

  readonly goal = input(
    'Work out which part of a champion is inherited and which part has to be learned.',
  );

  async practiceTraining(skillId: MiniTrainingSkillId): Promise<void> {
    if (!this.store.recordTrainingSession(skillId)) return;
    try {
      await this.trainingViewport?.playMotion(MINI_TRAINING_MOTIONS[skillId]);
    } finally {
      this.trainingInProgress.set(null);
    }
  }
}
