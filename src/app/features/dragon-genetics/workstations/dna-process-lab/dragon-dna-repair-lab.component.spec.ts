import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragonDnaRepairLabComponent } from './dragon-dna-repair-lab.component';

describe('DragonDnaRepairLabComponent', () => {
  let fixture: ComponentFixture<DragonDnaRepairLabComponent>;
  let lab: DragonDnaRepairLabComponent;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [DragonDnaRepairLabComponent] });
    fixture = TestBed.createComponent(DragonDnaRepairLabComponent);
    fixture.componentRef.setInput('studentId', 'local-student');
    lab = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens as a two-specimen comparison laboratory with no question dock', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.specimen-card select').length).toBe(2);
    expect(element.querySelectorAll('.scope-switch button').length).toBe(2);
    expect(element.querySelector('app-dna-sequence-analysis')).not.toBeNull();
    expect(element.querySelector('.question-dock')).toBeNull();
    expect(lab.geneSpecimens().length).toBe(24);
  });

  it('builds two modeled homolog records for every released chromosome', () => {
    lab.selectScope('chromosome');
    fixture.detectChanges();

    expect(lab.chromosomeSpecimens().length).toBe(8);
    expect(lab.availableSpecimens()[0].detail).toContain('3 released genes');
    expect(lab.comparisonCase()?.reference.length).toBe(36);
    expect(lab.comparisonCase()?.sample.length).toBe(36);
  });

  it('persists comparison evidence and an edited working sequence for the student', () => {
    const activeCase = lab.comparisonCase();
    expect(activeCase).not.toBeNull();
    if (!activeCase) return;

    lab.recordEvidence({
      caseId: activeCase.id,
      tool: 'repair',
      observation: 'Base replacement: 1 → 0 differences',
      differenceCount: 0,
    });
    lab.recordWorkingSequence({ caseId: activeCase.id, sequence: activeCase.reference });

    const saved = JSON.parse(
      localStorage.getItem('pbl-forge.dragon-genetics.dna-comparison-lab.v2:local-student') ?? '{}',
    );
    expect(saved.evidence.length).toBe(1);
    expect(saved.workingSequences[activeCase.id]).toBe(activeCase.reference);
  });
});
