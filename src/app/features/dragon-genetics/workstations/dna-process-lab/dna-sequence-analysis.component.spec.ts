import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DnaSequenceAnalysisComponent,
  TEST_DNA_ANALYSIS_CASE,
} from './dna-sequence-analysis.component';

describe('DnaSequenceAnalysisComponent', () => {
  let fixture: ComponentFixture<DnaSequenceAnalysisComponent>;
  let analyzer: DnaSequenceAnalysisComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DnaSequenceAnalysisComponent] });
    fixture = TestBed.createComponent(DnaSequenceAnalysisComponent);
    analyzer = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('derives the changed position, complement, and mRNA from the supplied sample', () => {
    fixture.componentRef.setInput('analysisCase', TEST_DNA_ANALYSIS_CASE);
    fixture.detectChanges();

    expect(analyzer.changedPositions()).toEqual([4]);
    expect(analyzer.complement()).toBe('TACGACATTGCT');
    expect(analyzer.correctTranscript()).toBe('UACGACAUUGCU');
  });

  it('requires the student to combine three pieces of evidence', () => {
    fixture.componentRef.setInput('analysisCase', TEST_DNA_ANALYSIS_CASE);
    fixture.detectChanges();
    const results: boolean[] = [];
    analyzer.analysisCompleted.subscribe((result) => results.push(result.correct));

    analyzer.selectPosition(4);
    analyzer.selectMutation('substitution');
    analyzer.selectTranscript('UACGACAUUGCU');
    analyzer.submit();

    expect(analyzer.allCorrect()).toBeTrue();
    expect(results).toEqual([true]);
  });
});
