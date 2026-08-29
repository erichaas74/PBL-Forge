import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ACCOUNT_GENETICS_RECORD_DRAG_TYPE } from '../shared/account-genetics-library.models';
import { ProteinRescueLabComponent } from './protein-rescue-lab.component';

describe('ProteinRescueLabComponent', () => {
    let fixture: ComponentFixture<ProteinRescueLabComponent>;
    let component: ProteinRescueLabComponent;

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [ProteinRescueLabComponent],
            providers: [provideRouter([])],
        }).compileComponents();
        fixture = TestBed.createComponent(ProteinRescueLabComponent);
        fixture.componentRef.setInput('studentId', 'protein-rescue-component-spec');
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('keeps allele identity out of the initial patient sample labels', () => {
        const ember = component.accountSnapshot().dragons.find((dragon) => dragon.id === 'ember')!;
        component.loadPatientRecord(ember);
        fixture.detectChanges();
        const text = fixture.nativeElement.textContent as string;

        expect(text).toContain('CHR4-A');
        expect(text).toContain('CHR4-B');
        expect(text).not.toContain('full-length');
        expect(text).not.toContain('premature-stop');
    });

    it('loads the same patient through click and native drag payload paths', () => {
        const tide = component.accountSnapshot().dragons.find((dragon) => dragon.id === 'tide')!;
        component.selectAccountRecord(tide);
        component.loadStagedPatient();
        expect(component.patientId()).toBe('tide');

        const moss = component.accountSnapshot().dragons.find((dragon) => dragon.id === 'moss')!;
        const event = {
            preventDefault: vi.fn().mockName('preventDefault'),
            dataTransfer: {
                getData: (type: string) => type === ACCOUNT_GENETICS_RECORD_DRAG_TYPE
                    ? JSON.stringify({ kind: 'dragon', id: moss.id })
                    : '',
            },
        } as unknown as DragEvent;
        component.dropPatient(event);

        expect(component.patientId()).toBe('moss');
    });

    it('supports testing both samples and returning to repeat the first experiment', () => {
        const ember = component.accountSnapshot().dragons.find((dragon) => dragon.id === 'ember')!;
        component.loadPatientRecord(ember);
        const [first, second] = component.patient()!.samples;

        testSample(first.id);
        testSample(second.id);
        testSample(first.id);

        expect(component.testedSampleCount()).toBe(2);
        expect(component.translationFor(first.id)).not.toBeNull();
        expect(component.translationFor(second.id)).not.toBeNull();
    });

    it('loads the authored patient only when the optional case supplies one', () => {
        expect(component.patientId()).toBeNull();

        fixture.componentRef.setInput('casePatientId', 'tide');
        fixture.detectChanges();

        expect(component.patientId()).toBe('tide');
        expect(component.patient()?.genotype).toBe('dd');
    });

    it('emits the scientific record after the student completes and saves it', () => {
        const saved = vi.fn();
        component.recordSaved.subscribe(saved);
        const tide = component.accountSnapshot().dragons.find((dragon) => dragon.id === 'tide')!;
        component.loadPatientRecord(tide);
        component.patient()!.samples.forEach((sample) => testSample(sample.id));
        component.selectFood('emberroot-stew');
        component.runFoodTrial();
        component.setClaim('dd');
        component.toggleRecommendation('emberroot-stew');
        component.updateExplanation(
            'Both copies stop early, so avoiding Dracose prevents the digestive symptoms.',
        );

        component.saveCase();

        expect(saved).toHaveBeenCalledOnce();
        expect(saved.mock.calls[0][0].sampleEvidence).toHaveLength(2);
        expect(saved.mock.calls[0][0].digestionTrials[0].result).toBe('no-dracose');
    });

    function testSample(sampleId: string): void {
        component.loadSample(sampleId);
        component.recordTranscript();
        const stepCount = component.currentTranslation()!.steps.length;
        component.setTranslationProgress(stepCount);
        component.testProteinFunction();
    }
});
