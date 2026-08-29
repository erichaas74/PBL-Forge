import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { stubSpecimenThumbnailRendering } from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import { DragonCardDeckSelectorComponent } from '../shared/dragon-card-deck-selector.component';
import { BloodCompatibilityLabComponent } from './blood-compatibility-lab.component';

describe('BloodCompatibilityLabComponent', () => {
    let fixture: ComponentFixture<BloodCompatibilityLabComponent>;
    let component: BloodCompatibilityLabComponent;

    beforeEach(async () => {
        localStorage.clear();
        stubSpecimenThumbnailRendering();
        await TestBed.configureTestingModule({
            imports: [BloodCompatibilityLabComponent],
            providers: [provideRouter([])],
        }).compileComponents();
        fixture = TestBed.createComponent(BloodCompatibilityLabComponent);
        fixture.componentRef.setInput('studentId', 'blood-compatibility-component-spec');
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('opens a dragon-only flip-card deck for emergency patient selection', () => {
        const catalog = fixture.debugElement.query(By.directive(AccountGeneticsFileComponent));

        expect(catalog.componentInstance.dragonsOnly()).toBe(true);
        expect(catalog.componentInstance.open()).toBe(true);
        expect(catalog.componentInstance.inventoryLabel()).toBe('Emergency patient dragon cards');
        expect(fixture.debugElement.query(By.directive(DragonCardDeckSelectorComponent))).not.toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('Saved chromosomes');
    });

    it('loads the selected dragon directly onto the blood tester', () => {
        const tide = accountDragon('tide');
        component.selectAccountRecord(tide);
        expect(component.patientDragonId()).toBe('tide');
        expect(component.activeSpecimen()?.id).toBe('patient:tide');

        const moss = accountDragon('moss');
        component.selectAccountRecord(moss);

        expect(component.patientDragonId()).toBe('moss');
        expect(component.activeSpecimen()?.id).toBe('patient:moss');
        expect(component.patientBloodType()).toBeNull();

        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.patient-bay')).toBeNull();
        expect(fixture.nativeElement.querySelector('.intake-grid > .blood-tester')).not.toBeNull();
        expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Load patient');
        expect(fixture.nativeElement.querySelector('.sealed-sample')).toBeNull();
    });

    it('uses the former monitor position for four typed donor vials', () => {
        const element = fixture.nativeElement as HTMLElement;
        const vialTypes = [...element.querySelectorAll('.donor-vial .vial-visual b')].map((vial) => vial.textContent?.trim());

        expect(element.querySelector('.patient-monitor')).toBeNull();
        expect(element.querySelector('.intake-grid > .donor-rack')).not.toBeNull();
        expect(element.querySelectorAll('.donor-vial').length).toBe(4);
        expect(element.querySelector('.donor-card')).toBeNull();
        expect(vialTypes).toEqual(['A-', 'B+', 'AB+', 'O-']);
    });

    it('lets the interactive cell model animate matching and nonmatching serum reactions', () => {
        component.guideOpen.set(true);
        fixture.detectChanges();

        const explorer = fixture.nativeElement.querySelector('.blood-type-explorer') as HTMLElement;
        expect(explorer).not.toBeNull();
        expect(explorer.querySelectorAll('.antigen-a').length).toBeGreaterThan(0);
        expect(explorer.querySelector('.antibody-b')).not.toBeNull();

        (explorer.querySelector('[data-serum="a"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(explorer.querySelector('.serum-reaction.reactive')).not.toBeNull();
        expect(explorer.querySelectorAll('.serum-antibody').length).toBe(4);
        expect(explorer.querySelector('.serum-result')?.textContent).toContain('Agglutination');
        expect(explorer.querySelector('.serum-result')?.textContent).toContain('cross-link');

        (explorer.querySelector('[data-type="O-"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(explorer.querySelector('.antigen-a')).toBeNull();
        expect(explorer.querySelector('.antigen-b')).toBeNull();
        expect(explorer.querySelector('.antibody-a')).not.toBeNull();
        expect(explorer.querySelector('.antibody-b')).not.toBeNull();
        expect(explorer.querySelector('.serum-reaction.smooth')).not.toBeNull();
        expect(explorer.querySelector('.serum-result')?.textContent).toContain('Smooth suspension');
        expect(explorer.querySelectorAll('.compatible-donors b').length).toBe(1);
        expect(explorer.querySelector('.compatible-donors')?.textContent?.trim()).toContain('O');
    });

    it('supports click and drag reagent application in either order', () => {
        component.loadPatientRecord(accountDragon('ember'));

        fixture.detectChanges();
        const antiA = fixture.nativeElement.querySelector('.serum-vial[aria-label^="Apply Anti-A"]') as HTMLButtonElement;
        antiA.click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.is-active .dragon-card__blood-type')?.textContent).toContain('?');

        component.dropReagent(dragEvent('application/x-pbl-blood-reagent', 'b'));
        component.applyReagent('d');
        fixture.detectChanges();

        const test = component.patientTest();
        expect(test?.antiA).toBe(true);
        expect(test?.antiB).toBe(true);
        expect(test?.antiD).toBe(true);
        expect(component.patientBloodType()?.id).toBe('ab-positive');
        expect(component.patientBloodType()?.possibleGenotypes).toEqual(['AB']);
        expect(component.patientTypeClaim()).toBeNull();
        expect(component.determinedBloodTypeByDragonId()['ember']).toBeUndefined();
        expect(component.statusMessage()).not.toContain('AB+');
        expect(fixture.nativeElement.querySelector('.is-active .dragon-card__blood-type')?.textContent).toContain('?');

        component.recordPatientBloodType('ab-positive');
        fixture.detectChanges();
        expect(component.determinedBloodTypeByDragonId()['ember']).toBe('AB+');
        expect(fixture.nativeElement.querySelector('.is-active .dragon-card__blood-type')?.textContent).toContain('AB+');
    });

    it('uses the reaction-plate vials as controls without a duplicate reagent shelf', () => {
        component.loadPatientRecord(accountDragon('moss'));
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        const vialLabels = [...element.querySelectorAll('.serum-vial span')].map((vial) => vial.textContent?.trim());

        expect(element.querySelector('.reagent-shelf')).toBeNull();
        expect(element.querySelectorAll('.serum-vial').length).toBe(3);
        expect(vialLabels).toEqual(['Anti-A', 'Anti-B', 'Anti-D']);
        expect(element.querySelector('.reaction-pair')?.textContent).toContain('Anti-A');
        expect(element.querySelector('.reaction-pair')?.textContent).toContain('Anti-B');
        expect(element.querySelector('.reaction-pair')?.textContent).toContain('Anti-D');
    });

    it('emits completed patient evidence without changing open-lab testing order', () => {
        const observed = vi.fn();
        component.evidenceObserved.subscribe(observed);
        component.loadPatientRecord(accountDragon('moss'));

        component.applyReagent('b');
        expect(observed).not.toHaveBeenCalled();
        component.applyReagent('a');
        expect(observed).not.toHaveBeenCalled();
        component.applyReagent('d');

        expect(observed).toHaveBeenCalledTimes(1);
        expect(observed.mock.calls[0][0].specimenRole).toBe('patient');
        expect(observed.mock.calls[0][0].phenotype.id).toBe('b-positive');
    });

    it('applies and preserves challenge supply when launched from a case', () => {
        fixture.componentRef.setInput('caseMode', 'challenge');
        fixture.detectChanges();

        expect(component.mode()).toBe('challenge');
        component.setMode('standard');
        expect(component.mode()).toBe('challenge');
    });

    it('keeps the completed reaction plate visible until the student records a blood type', () => {
        component.loadPatientRecord(accountDragon('ember'));
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.blood-tester .reaction-plate')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.blood-tester .transfusion-station')).toBeNull();

        component.applyReagent('a');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.blood-tester .reaction-plate')).not.toBeNull();

        component.applyReagent('b');
        component.applyReagent('d');
        fixture.detectChanges();

        const reactionPlate = fixture.nativeElement.querySelector('.blood-tester .reaction-plate') as HTMLElement;
        expect(reactionPlate).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.type-classifier')).not.toBeNull();
        expect(component.patientTypeClaim()).toBeNull();
        expect(fixture.nativeElement.querySelector('.blood-tester .transfusion-station')).toBeNull();

        component.recordPatientBloodType('o-positive');
        fixture.detectChanges();

        const transfusionStation = fixture.nativeElement.querySelector('.blood-tester .transfusion-station') as HTMLElement;
        expect(reactionPlate).not.toBeNull();
        expect(transfusionStation).not.toBeNull();
        expect(reactionPlate.compareDocumentPosition(transfusionStation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(fixture.nativeElement.querySelectorAll('.healing-chamber').length).toBe(1);
        expect(component.patientTypeClaim()?.id).toBe('o-positive');
    });

    it('carries known blood evidence through click and drag vial selection', () => {
        component.selectDonor('clinic-cinder');
        expect(component.isFullyTested('clinic-cinder')).toBe(true);
        expect(component.bloodTypeForSpecimen('clinic-cinder')?.id).toBe('o-negative');
        component.loadStagedDonor();
        expect(component.chamberDonorId()).toBe('clinic-cinder');

        component.dropDonor(dragEvent('application/x-pbl-blood-donor', 'clinic-pyra'));

        expect(component.chamberDonorId()).toBe('clinic-pyra');
        expect(component.isFullyTested('clinic-pyra')).toBe(true);
        expect(component.bloodTypeForSpecimen('clinic-pyra')?.id).toBe('b-positive');
    });

    it('reveals a dangerous reaction from incompatible tested donor cells', () => {
        component.loadPatientRecord(accountDragon('quartz'));
        fullyTest('patient:quartz');
        fullyTest('clinic-maris');
        component.stageDonor('clinic-maris');

        expect(component.chamberReady()).toBe(true);
        component.authorizeTransfusion();

        expect(component.latestChamberTrial()?.compatible).toBe(false);
        expect(component.latestChamberTrial()?.unfamiliarMarkers).toEqual(['a']);
        expect(component.patientCondition()).toBe('reaction');
    });

    it('consumes a finite challenge unit and can save a supported emergency record', () => {
        component.loadPatientRecord(accountDragon('ember'));
        component.setMode('challenge');
        fullyTest('patient:ember');
        fullyTest('clinic-cinder');
        component.recordPatientBloodType('ab-positive');
        component.stageDonor('clinic-cinder');

        expect(component.remainingUnits()['clinic-cinder']).toBe(1);
        component.authorizeTransfusion();
        expect(component.remainingUnits()['clinic-cinder']).toBe(0);
        expect(component.patientCondition()).toBe('stable');

        component.updateExplanation('Cinder has no A or B antigens, so the patient recognizes every donor-cell antigen.');
        expect(component.canSaveRecord()).toBe(true);
        component.saveEmergencyRecord();

        expect(component.records().length).toBe(1);
        expect(component.records()[0].patientPhenotype).toBe('ab-positive');
        expect(component.records()[0].donorPhenotype).toBe('o-negative');
        expect(component.records()[0].mode).toBe('challenge');
    });

    function accountDragon(id: string) {
        return component.accountSnapshot().dragons.find((dragon) => dragon.id === id)!;
    }

    function fullyTest(specimenId: string): void {
        if (specimenId.startsWith('patient:')) {
            component.loadPatientRecord(accountDragon(specimenId.replace('patient:', '')));
        }
        else {
            component.loadDonorSample(specimenId);
        }
        component.applyReagent('a');
        component.applyReagent('b');
        component.applyReagent('d');
    }
});

function dragEvent(type: string, value: string): DragEvent {
    return {
        preventDefault: vi.fn().mockName('preventDefault'),
        dataTransfer: {
            types: [type],
            getData: (requestedType: string) => (requestedType === type ? value : ''),
        },
    } as unknown as DragEvent;
}
