import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragonDnaRepairLabComponent } from './dragon-dna-repair-lab.component';

describe('DragonDnaRepairLabComponent', () => {
  let fixture: ComponentFixture<DragonDnaRepairLabComponent>;
  let lab: DragonDnaRepairLabComponent;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [DragonDnaRepairLabComponent] });
    fixture = TestBed.createComponent(DragonDnaRepairLabComponent);
    lab = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens as an unordered evidence workstation with no dragon', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.tool-rack button').length).toBe(6);
    expect(element.querySelector('app-dna-sequence-analysis')).not.toBeNull();
    expect(element.querySelector('app-specimen-viewport')).toBeNull();
    expect(element.querySelector('.phase-switch')).toBeNull();
  });

  it('records supported and unsupported tests for the loaded DNA case', () => {
    lab.recordEvidence({
      caseId: lab.activeAnalysisCase().id,
      tool: 'align',
      observation: 'Position 1',
      supported: false,
    });
    lab.recordEvidence({
      caseId: lab.activeAnalysisCase().id,
      tool: 'mutation',
      observation: 'substitution',
      supported: true,
    });
    expect(lab.caseEvidence().length).toBe(2);
    expect(
      JSON.parse(localStorage.getItem('pbl-forge.dragon-genetics.dna-evidence.v1') ?? '[]').length,
    ).toBe(2);
  });
});
