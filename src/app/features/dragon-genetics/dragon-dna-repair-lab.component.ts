import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DNA_PROCESS_QUESTION_BANK } from '../../shared/dna-process-visuals/dna-process-question-bank';
import { DnaProcessQuestionComponent } from '../../shared/dna-process-visuals/dna-process-question.component';

@Component({
  selector: 'app-dragon-dna-repair-lab',
  imports: [DnaProcessQuestionComponent],
  templateUrl: './dragon-dna-repair-lab.component.html',
  styleUrl: './dragon-dna-repair-lab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonDnaRepairLabComponent {
  readonly questions = DNA_PROCESS_QUESTION_BANK;
  readonly activeQuestionId = signal(this.questions[0].id);
  readonly activeQuestion = computed(
    () =>
      this.questions.find((question) => question.id === this.activeQuestionId()) ??
      this.questions[0],
  );

  selectQuestion(questionId: string): void {
    if (this.questions.some((question) => question.id === questionId)) {
      this.activeQuestionId.set(questionId);
    }
  }
}
