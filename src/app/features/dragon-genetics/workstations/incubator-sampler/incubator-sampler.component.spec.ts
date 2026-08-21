import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { stubSpecimenThumbnailRendering, stubSpecimenViewportRendering, } from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import { DragonCardDeckSelectorComponent } from '../shared/dragon-card-deck-selector.component';
import { IncubatorSamplerComponent } from './incubator-sampler.component';

describe('IncubatorSamplerComponent', () => {
    const studentId = 'incubator-component-spec';
    const storageKey = `pbl-forge.dragon-genetics.incubator-sampler.v2.${studentId}`;

    beforeEach(async () => {
        localStorage.removeItem(storageKey);
        stubSpecimenThumbnailRendering();
        stubSpecimenViewportRendering();
        await TestBed.configureTestingModule({
            imports: [IncubatorSamplerComponent],
        }).compileComponents();
    });

    afterEach(() => {
        vi.useRealTimers();
        localStorage.removeItem(storageKey);
    });

    it('reuses separate female and male account selectors for the original parents', () => {
        const fixture = TestBed.createComponent(IncubatorSamplerComponent);
        fixture.componentRef.setInput('studentId', studentId);
        fixture.detectChanges();
        const inventories = fixture.debugElement.queryAll(By.directive(AccountGeneticsFileComponent));

        expect(inventories.length).toBe(2);
        expect(inventories[0].componentInstance.sexFilter()).toBe('female');
        expect(inventories[1].componentInstance.sexFilter()).toBe('male');
        expect(inventories.every(({ componentInstance }) => componentInstance.dragonsOnly())).toBe(true);
        expect(inventories.every(({ componentInstance }) => componentInstance.open())).toBe(true);
        expect(fixture.debugElement.queryAll(By.directive(DragonCardDeckSelectorComponent)).length).toBe(2);
        expect(fixture.nativeElement.textContent).toContain('FEMALE DRAGONS · EGG PARENT');
        expect(fixture.nativeElement.textContent).toContain('MALE DRAGONS · SPERM PARENT');
        fixture.destroy();
    });

    it('replaces a station inventory with the loaded dragon until the student asks to change it', () => {
        const fixture = TestBed.createComponent(IncubatorSamplerComponent);
        fixture.componentRef.setInput('studentId', studentId);
        fixture.detectChanges();
        const component = fixture.componentInstance;
        const female = component.account().dragons.find((dragon) => dragon.sex === 'female')!;

        component.selectAccountRecord('female', female);
        fixture.detectChanges();

        const remaining = fixture.debugElement.queryAll(By.directive(AccountGeneticsFileComponent));
        expect(remaining.length).toBe(1);
        expect(remaining[0].componentInstance.sexFilter()).toBe('male');
        expect(fixture.nativeElement.querySelector('.parent-a .parent-model')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.parent-a .visible-traits')).not.toBeNull();

        const change = fixture.nativeElement.querySelector('[data-testid="change-female-parent"]') as HTMLButtonElement;
        change.click();
        fixture.detectChanges();

        expect(fixture.debugElement.queryAll(By.directive(AccountGeneticsFileComponent)).length).toBe(2);
        expect(fixture.nativeElement.querySelector('.parent-a .parent-model')).toBeNull();
        fixture.destroy();
    });

    it('mounts the incubator controls inside the forge scene', () => {
        const fixture = TestBed.createComponent(IncubatorSamplerComponent);
        fixture.componentRef.setInput('studentId', studentId);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.forge-scene .forge-controls')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.workbench > .forge-controls')).toBeNull();
        fixture.destroy();
    });

    it('loads dragons only into the matching sex-specific parent role', () => {
        const fixture = TestBed.createComponent(IncubatorSamplerComponent);
        fixture.componentRef.setInput('studentId', studentId);
        fixture.detectChanges();
        const component = fixture.componentInstance;
        const female = component.account().dragons.find((dragon) => dragon.sex === 'female')!;
        const male = component.account().dragons.find((dragon) => dragon.sex === 'male')!;

        component.selectAccountRecord('female', female);
        component.selectAccountRecord('male', male);
        expect(component.originalParentIds()).toEqual([female.id, male.id]);

        component.selectAccountRecord('female', male);
        expect(component.originalParentIds()).toEqual([female.id, male.id]);
        expect(component.statusMessage()).toContain('female dragon');
        fixture.destroy();
    });

    it('breeds every hatchling in a populated phenotype bucket as one pool', () => {
        vi.useFakeTimers();
        const fixture = TestBed.createComponent(IncubatorSamplerComponent);
        fixture.componentRef.setInput('studentId', studentId);
        fixture.detectChanges();
        const component = fixture.componentInstance;
        const ember = component.account().dragons.find((dragon) => dragon.sex === 'female')!;
        const tide = component.account().dragons.find((dragon) => dragon.sex === 'male')!;

        component.selectAccountRecord('female', ember);
        component.selectAccountRecord('male', tide);
        component.startBatch();
        vi.advanceTimersByTime(3500);
        fixture.detectChanges();

        expect(component.batches().length).toBe(1);
        expect(component.buckets().reduce((sum, bucket) => sum + bucket.count, 0)).toBe(8);
        const populated = component.buckets().find((bucket) => bucket.count >= 2);
        expect(populated).toBeDefined();

        component.breedFromBucket(populated!);
        vi.advanceTimersByTime(1100);
        fixture.detectChanges();

        expect(component.nextGeneration()).toBe(2);
        expect(component.activeBreedingPoolIds()).toEqual(populated!.offspringIds);
        expect(component.activeParentIds()).toEqual(populated!.offspringIds.slice(0, 2));
        expect(component.breedingPool().length).toBe(populated!.count);
        expect(component.running()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain('BALANCED BREEDING POOL');
        expect(fixture.nativeElement.textContent.toLowerCase()).not.toContain('genotype');
        expect(fixture.nativeElement.textContent.toLowerCase()).not.toContain('punnett');
        expect(fixture.nativeElement.querySelector('.question-dock')).toBeNull();

        vi.advanceTimersByTime(3500);
        expect(component.batches().length).toBe(2);
        expect(component.latestRecord()?.breedingPoolIds).toEqual(populated!.offspringIds);
        expect(component.latestRecord()?.results.map((result) => result.count)).toEqual([6, 2]);
        expect((fixture.nativeElement.querySelector('.parent-row td') as HTMLElement).textContent).toContain('Ember + Tide');
        fixture.destroy();
    });
});
