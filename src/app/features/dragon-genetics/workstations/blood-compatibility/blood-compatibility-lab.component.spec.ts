import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ACCOUNT_GENETICS_RECORD_DRAG_TYPE } from '../shared/account-genetics-library.models';
import { BloodCompatibilityLabComponent } from './blood-compatibility-lab.component';

describe('BloodCompatibilityLabComponent', () => {
  let fixture: ComponentFixture<BloodCompatibilityLabComponent>;
  let component: BloodCompatibilityLabComponent;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [BloodCompatibilityLabComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(BloodCompatibilityLabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the same emergency patient through click and native drag payload paths', () => {
    const tide = accountDragon('tide');
    component.selectAccountRecord(tide);
    component.loadStagedPatient();
    expect(component.patientDragonId()).toBe('tide');

    const moss = accountDragon('moss');
    component.dropPatient(
      dragEvent(ACCOUNT_GENETICS_RECORD_DRAG_TYPE, JSON.stringify({ kind: 'dragon', id: moss.id })),
    );

    expect(component.patientDragonId()).toBe('moss');
    expect(component.patientBloodType()).toBeNull();
  });

  it('supports click and drag reagent application in either order', () => {
    component.loadPatientRecord(accountDragon('ember'));
    component.loadPatientSample();

    component.selectReagent('flame');
    component.applyPendingReagent();
    component.dropReagent(dragEvent('application/x-pbl-blood-reagent', 'tide'));

    const test = component.patientTest();
    expect(test?.antiFlame).toBeTrue();
    expect(test?.antiTide).toBeTrue();
    expect(component.patientBloodType()?.id).toBe('dual');
    expect(component.patientBloodType()?.possibleGenotypes).toEqual(['FT']);
  });

  it('gives donor selection a click path equivalent to dropping a donor card', () => {
    component.selectDonor('clinic-cinder');
    component.loadStagedDonor();
    expect(component.chamberDonorId()).toBe('clinic-cinder');

    component.dropDonor(dragEvent('application/x-pbl-blood-donor', 'clinic-pyra'));

    expect(component.chamberDonorId()).toBe('clinic-pyra');
  });

  it('reveals a dangerous reaction from incompatible tested donor cells', () => {
    component.loadPatientRecord(accountDragon('quartz'));
    fullyTest('patient:quartz');
    fullyTest('clinic-maris');
    component.stageDonor('clinic-maris');

    expect(component.chamberReady()).toBeTrue();
    component.authorizeTransfusion();

    expect(component.latestChamberTrial()?.compatible).toBeFalse();
    expect(component.latestChamberTrial()?.unfamiliarMarkers).toEqual(['flame']);
    expect(component.patientCondition()).toBe('reaction');
  });

  it('consumes a finite challenge unit and can save a supported emergency record', () => {
    component.loadPatientRecord(accountDragon('ember'));
    component.setMode('challenge');
    fullyTest('patient:ember');
    fullyTest('clinic-cinder');
    component.stageDonor('clinic-cinder');

    expect(component.remainingUnits()['clinic-cinder']).toBe(1);
    component.authorizeTransfusion();
    expect(component.remainingUnits()['clinic-cinder']).toBe(0);
    expect(component.patientCondition()).toBe('stable');

    component.updateExplanation(
      'Cinder has no Flame or Tide markers, so the patient recognizes every donor-cell marker.',
    );
    expect(component.canSaveRecord()).toBeTrue();
    component.saveEmergencyRecord();

    expect(component.records().length).toBe(1);
    expect(component.records()[0].patientPhenotype).toBe('dual');
    expect(component.records()[0].donorPhenotype).toBe('clear');
    expect(component.records()[0].mode).toBe('challenge');
  });

  function accountDragon(id: string) {
    return component.accountSnapshot().dragons.find((dragon) => dragon.id === id)!;
  }

  function fullyTest(specimenId: string): void {
    if (specimenId.startsWith('patient:')) {
      component.loadPatientSample();
    } else {
      component.loadDonorSample(specimenId);
    }
    component.applyReagent('flame');
    component.applyReagent('tide');
  }
});

function dragEvent(type: string, value: string): DragEvent {
  return {
    preventDefault: jasmine.createSpy('preventDefault'),
    dataTransfer: {
      types: [type],
      getData: (requestedType: string) => (requestedType === type ? value : ''),
    },
  } as unknown as DragEvent;
}
