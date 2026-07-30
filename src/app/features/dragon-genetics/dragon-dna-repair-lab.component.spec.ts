import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragonDnaRepairLabComponent } from './dragon-dna-repair-lab.component';

describe('DragonDnaRepairLabComponent', () => {
  let fixture: ComponentFixture<DragonDnaRepairLabComponent>;
  let lab: DragonDnaRepairLabComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DragonDnaRepairLabComponent] });
    fixture = TestBed.createComponent(DragonDnaRepairLabComponent);
    lab = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens with replication and contains no uncoiling activity', () => {
    expect(lab.activeQuestion().mode).toBe('replication');
    expect(
      lab.questions.some((question) => question.tabLabel.toLowerCase().includes('uncoil')),
    ).toBeFalse();
  });

  it('selects reusable mutation, transcription, and repair questions by id', () => {
    lab.selectQuestion('transcription-uracil');
    expect(lab.activeQuestion().mode).toBe('transcription');

    lab.selectQuestion('mutation-substitution');
    expect(lab.activeQuestion().mode).toBe('substitution');

    lab.selectQuestion('copying-error-repair');
    expect(lab.activeQuestion().mode).toBe('repair');
  });
});
