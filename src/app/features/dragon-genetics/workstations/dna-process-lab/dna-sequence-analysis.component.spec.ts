import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  alignDnaSequences,
  DnaSequenceAnalysisComponent,
} from './dna-sequence-analysis.component';
import { TEST_DNA_ANALYSIS_CASE } from './dna-process.models';

describe('DnaSequenceAnalysisComponent', () => {
  let fixture: ComponentFixture<DnaSequenceAnalysisComponent>;
  let analyzer: DnaSequenceAnalysisComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DnaSequenceAnalysisComponent] });
    fixture = TestBed.createComponent(DnaSequenceAnalysisComponent);
    analyzer = fixture.componentInstance;
    fixture.componentRef.setInput('analysisCase', TEST_DNA_ANALYSIS_CASE);
    fixture.detectChanges();
  });

  it('aligns substitutions, insertions, and deletions without losing their positions', () => {
    expect(alignDnaSequences('ATGC', 'ATTC').map((column) => column.kind)).toEqual([
      'match',
      'match',
      'substitution',
      'match',
    ]);
    expect(
      alignDnaSequences('ATGC', 'ATGGC').filter((column) => column.kind === 'insertion').length,
    ).toBe(1);
    expect(
      alignDnaSequences('ATGC', 'AGC').filter((column) => column.kind === 'deletion').length,
    ).toBe(1);
  });

  it('shows the actual changed base and recomputes metrics after a mutation', () => {
    const evidence: string[] = [];
    analyzer.evidenceCompleted.subscribe((result) => evidence.push(result.tool));

    expect(analyzer.changedPositions()).toEqual([4]);
    expect(analyzer.differenceCounts().substitutions).toBe(1);

    analyzer.chooseMutationAction('insertion');
    analyzer.chooseBase('G');
    analyzer.applyMutation();

    expect(analyzer.workingSample().length).toBe(TEST_DNA_ANALYSIS_CASE.sample.length + 1);
    expect(evidence).toEqual(['mutation']);
    expect(analyzer.animationSnapshot()?.kind).toBe('insertion');
  });

  it('lets a selected repair restore sequence agreement and records the result', () => {
    const results: number[] = [];
    analyzer.evidenceCompleted.subscribe((result) => results.push(result.differenceCount));

    analyzer.selectMode('repair');
    analyzer.chooseRepairAction('replace');
    analyzer.chooseBase('C');
    analyzer.applyRepair();

    expect(analyzer.workingSample()).toBe(TEST_DNA_ANALYSIS_CASE.reference);
    expect(analyzer.differenceCount()).toBe(0);
    expect(results).toEqual([0]);
    expect(analyzer.animationSnapshot()?.kind).toBe('repair');
  });
});
