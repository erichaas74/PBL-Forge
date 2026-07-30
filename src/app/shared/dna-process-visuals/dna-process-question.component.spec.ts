import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DNA_PROCESS_QUESTION_BANK } from './dna-process-question-bank';
import { DnaProcessQuestionComponent } from './dna-process-question.component';

describe('DnaProcessQuestionComponent', () => {
  let fixture: ComponentFixture<DnaProcessQuestionComponent>;
  let component: DnaProcessQuestionComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DnaProcessQuestionComponent] });
    fixture = TestBed.createComponent(DnaProcessQuestionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('question', DNA_PROCESS_QUESTION_BANK[1]);
    fixture.componentRef.setInput('autoplay', false);
    fixture.detectChanges();
  });

  it('grades a reusable DNA or RNA explanation question', () => {
    const emitted = jasmine.createSpy('answerChanged');
    component.answerChanged.subscribe(emitted);
    component.answer('rna-u');
    expect(component.correct()).toBeTrue();
    expect(emitted).toHaveBeenCalledWith({
      questionId: 'transcription-uracil',
      optionId: 'rna-u',
      correct: true,
    });
  });
});
