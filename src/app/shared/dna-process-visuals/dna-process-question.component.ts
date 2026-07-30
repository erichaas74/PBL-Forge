import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { DnaMutationAnimationComponent } from './dna-mutation-animation.component';
import { DnaProcessQuestion } from './dna-process.models';
import { DnaReplicationAnimationComponent } from './dna-replication-animation.component';
import { DnaTranscriptionAnimationComponent } from './dna-transcription-animation.component';

export interface DnaProcessAnswer {
  questionId: string;
  optionId: string;
  correct: boolean;
}

@Component({
  selector: 'app-dna-process-question',
  imports: [
    DnaReplicationAnimationComponent,
    DnaTranscriptionAnimationComponent,
    DnaMutationAnimationComponent,
  ],
  templateUrl: './dna-process-question.component.html',
  styleUrl: './dna-process-question.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DnaProcessQuestionComponent {
  readonly question = input.required<DnaProcessQuestion>();
  readonly autoplay = input(true);
  readonly answerChanged = output<DnaProcessAnswer>();
  readonly selectedOptionId = signal<string | null>(null);
  readonly answered = computed(() => this.selectedOptionId() !== null);
  readonly correct = computed(() => this.selectedOptionId() === this.question().correctOptionId);

  constructor() {
    effect(() => {
      this.question();
      this.selectedOptionId.set(null);
    });
  }

  answer(optionId: string): void {
    this.selectedOptionId.set(optionId);
    this.answerChanged.emit({
      questionId: this.question().id,
      optionId,
      correct: optionId === this.question().correctOptionId,
    });
  }
}
