import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { DNA_PROCESS_QUESTION_BANK } from '../../shared/dna-process-visuals/dna-process-question-bank';
import {
  DnaProcessAnswer,
  DnaProcessQuestionComponent,
} from '../../shared/dna-process-visuals/dna-process-question.component';
import {
  DnaAnalysisResult,
  DnaSequenceAnalysisComponent,
  TEST_DNA_ANALYSIS_CASE,
} from './dna-sequence-analysis.component';

@Component({
  selector: 'app-dragon-dna-repair-lab',
  imports: [DnaProcessQuestionComponent, DnaSequenceAnalysisComponent],
  templateUrl: './dragon-dna-repair-lab.component.html',
  styleUrl: './dragon-dna-repair-lab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonDnaRepairLabComponent {
  readonly focusQuestionId = input<string | null>(null);
  readonly modelSelected = output<'replication' | 'transcription' | 'mutation' | 'repair'>();
  readonly questions = DNA_PROCESS_QUESTION_BANK;
  readonly testAnalysisCase = TEST_DNA_ANALYSIS_CASE;
  readonly activeQuestionId = signal(this.questions[0].id);
  readonly labPhase = signal<'learn' | 'analyze'>('learn');
  readonly activeQuestion = computed(
    () =>
      this.questions.find((question) => question.id === this.activeQuestionId()) ??
      this.questions[0],
  );

  constructor() {
    effect(() => {
      const questionId = this.focusQuestionId();
      if (questionId && this.questions.some((question) => question.id === questionId)) {
        this.activeQuestionId.set(questionId);
      }
    });
  }

  selectQuestion(questionId: string): void {
    if (this.questions.some((question) => question.id === questionId)) {
      this.activeQuestionId.set(questionId);
      this.modelSelected.emit(this.nodeForQuestion(questionId));
    }
  }

  selectPhase(phase: 'learn' | 'analyze'): void {
    this.labPhase.set(phase);
  }

  handleAnalysis(result: DnaAnalysisResult): void {
    if (result.correct) this.modelSelected.emit('mutation');
  }

  handleAnswer(answer: DnaProcessAnswer): void {
    if (answer.correct) this.modelSelected.emit(this.nodeForQuestion(answer.questionId));
  }

  private nodeForQuestion(
    questionId: string,
  ): 'replication' | 'transcription' | 'mutation' | 'repair' {
    const mode = this.questions.find((question) => question.id === questionId)?.mode;
    if (mode === 'replication' || mode === 'transcription' || mode === 'repair') return mode;
    return 'mutation';
  }
}
