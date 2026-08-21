import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { stubSpecimenThumbnailRendering, stubSpecimenViewportRendering, } from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import { generateMeiosisRun } from './meiosis-gamete.domain';
import { DragonHatcheryBreedingLabComponent } from './dragon-hatchery-breeding-lab.component';

describe('DragonHatcheryBreedingLabComponent', () => {
    const studentId = 'hatchery-parent-selector-spec';
    let fixture: ComponentFixture<DragonHatcheryBreedingLabComponent>;
    let component: DragonHatcheryBreedingLabComponent;

    beforeEach(() => {
        localStorage.removeItem(`pbl-forge.dragon-genetics.account-library.v1.${studentId}`);
        localStorage.removeItem(`pbl-forge.dragon-genetics.hatchery-breeding.v1.${studentId}`);
        stubSpecimenThumbnailRendering();
        stubSpecimenViewportRendering();
        TestBed.configureTestingModule({ imports: [DragonHatcheryBreedingLabComponent] });
        fixture = TestBed.createComponent(DragonHatcheryBreedingLabComponent);
        fixture.componentRef.setInput('studentId', studentId);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        vi.useRealTimers();
        fixture.destroy();
        localStorage.removeItem(`pbl-forge.dragon-genetics.account-library.v1.${studentId}`);
        localStorage.removeItem(`pbl-forge.dragon-genetics.hatchery-breeding.v1.${studentId}`);
    });

    it('keeps whole-dragon selectors inside the parent setup and splits them by sex', () => {
        const root = fixture.nativeElement as HTMLElement;
        const inventories = fixture.debugElement.queryAll(By.directive(AccountGeneticsFileComponent));

        expect(inventories.length).toBe(2);
        expect(inventories[0].componentInstance.sexFilter()).toBe('female');
        expect(inventories[1].componentInstance.sexFilter()).toBe('male');
        expect(inventories.every((inventory) => inventory.componentInstance.open())).toBe(true);
        expect(root.querySelectorAll('app-dragon-card-deck-selector').length).toBe(2);
        expect(root.textContent).not.toContain('Chromosomes');
        expect(root.querySelector('.allele-objective')).toBeNull();
    });

    it('loads each dragon only into its matching parent role', () => {
        const female = component.account().dragons.find((dragon) => dragon.sex === 'female')!;
        const male = component.account().dragons.find((dragon) => dragon.sex === 'male')!;

        component.selectParent('female', female);
        component.selectParent('male', male);

        expect(component.eggParent()?.id).toBe(female.id);
        expect(component.spermParent()?.id).toBe(male.id);

        component.selectParent('female', male);
        expect(component.eggParent()?.id).toBe(female.id);
        expect(component.statusMessage()).toContain('female dragon');
    });

    it('keeps both parent meiosis microscopes available without a numbered step rail', () => {
        const female = component.account().dragons.find((dragon) => dragon.sex === 'female')!;
        const male = component.account().dragons.find((dragon) => dragon.sex === 'male')!;
        component.selectParent('female', female);
        component.selectParent('male', male);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        expect(root.querySelector('.step-number')).toBeNull();
        expect(root.querySelectorAll('.meiosis-parent-switch button').length).toBe(2);

        component.inspectParentMeiosis('male');
        expect(component.activeRole()).toBe('male');

        const spermRun = generateMeiosisRun(male, 'male', 'sperm-first', 'scales');
        component.selectGamete('male', {
            run: spermRun,
            gamete: spermRun.gametes[0],
            reason: '',
            selectedAtIso: new Date().toISOString(),
        });

        expect(component.spermSelection()).not.toBeNull();
        expect(component.eggSelection()).toBeNull();
        expect(component.activeRole()).toBe('female');
    });

    it('fuses two loaded chromosome cells into an interactive diploid egg', () => {
        vi.useFakeTimers();
        const female = component.account().dragons.find((dragon) => dragon.sex === 'female')!;
        const male = component.account().dragons.find((dragon) => dragon.sex === 'male')!;
        component.selectParent('female', female);
        component.selectParent('male', male);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        // Nothing to fuse yet, so the fusion visual is not on the bench at all.
        expect(component.fusionVisible()).toBe(false);
        expect(root.querySelector('.fertilization-visual')).toBeNull();
        expect(root.querySelector('.gamete-chambers.handing-over')).toBeNull();
        expect(root.querySelectorAll('.loaded-gamete-cell').length).toBe(2);

        const eggRun = generateMeiosisRun(female, 'female', 'inventory-egg', 'scales');
        const spermRun = generateMeiosisRun(male, 'male', 'inventory-sperm', 'scales');
        const spermGamete = spermRun.gametes.find((gamete) => gamete.chromosomes.some((chromosome) => chromosome.sexChromosome === 'Y')) ?? spermRun.gametes[0];
        component.selectGamete('female', {
            run: eggRun,
            gamete: eggRun.gametes[0],
            reason: '',
            selectedAtIso: new Date().toISOString(),
        });
        component.selectGamete('male', {
            run: spermRun,
            gamete: spermGamete,
            reason: '',
            selectedAtIso: new Date().toISOString(),
        });
        fixture.detectChanges();

        // Both gametes are in, so the fusion takes over the space they occupied and
        // the two selected gametes are handed off rather than left on screen.
        expect(component.fusionVisible()).toBe(true);
        expect(root.querySelector('.fertilization-visual')).not.toBeNull();
        expect(root.querySelectorAll('.egg-cell .chromosome-in-cell').length).toBe(5);
        expect(root.querySelectorAll('.sperm-cell .chromosome-in-cell').length).toBe(5);
        expect(root.querySelector('.egg-cell .chromosome-svg--placeholder')).toBeNull();
        expect(root.querySelector('.sperm-cell .chromosome-svg--placeholder')).toBeNull();

        const chambers = root.querySelector('.gamete-chambers');
        expect(chambers?.classList).toContain('handing-over');
        expect(chambers?.getAttribute('aria-hidden')).toBe('true');
        // Kept in place, so the fusion above lands where the gametes were.
        expect(root.querySelectorAll('.loaded-gamete-cell').length).toBe(2);

        expect(component.fertilizationState()).toBe('fusing');
        expect(root.querySelector('app-meiosis-gamete-selector')).toBeNull();
        expect(root.querySelectorAll('.fusion-result .chromosome-svg--replicated').length).toBe(5);
        expect(root.querySelectorAll('.fusion-result .chromatid--sister').length).toBe(5);
        expect(root.querySelectorAll('.fusion-result .centromere-joint').length).toBe(5);
        expect(root.querySelector('.egg-examination-bench')).toBeNull();
        expect(root.querySelector('.hatchery-output')).toBeNull();

        const saved = component.account().dragons.find((dragon) => dragon.source === 'student')!;
        expect(saved.id).toBe(component.clutch()[0].id);
        expect(saved.sex).toBe('male');
        expect(saved.parentIds).toEqual([female.id, male.id]);
        expect(saved.generation).toBe(1);

        vi.advanceTimersByTime(1900);
        fixture.detectChanges();
        expect(component.fertilizationState()).toBe('egg');
        expect(root.querySelector('.fusion-result.formed-egg')).not.toBeNull();
        expect(root.querySelector('.fusion-result [data-chromosome="Chr 3"]')).not.toBeNull();
        expect(root.querySelector('.fusion-result .inspection-panel')).not.toBeNull();
        expect(root.querySelector('.fertilized-gene-analysis')?.textContent).toContain('Egg allele');
        expect(root.querySelector('.fertilized-gene-analysis')?.textContent).toContain('Sperm allele');
        const showBaby = root.querySelector<HTMLButtonElement>('.show-baby-dragon');
        expect(showBaby).not.toBeNull();
        expect(root.querySelector('.new-dragon')).toBeNull();
        showBaby?.click();
        fixture.detectChanges();
        expect(root.querySelector('.new-dragon app-specimen-viewport')).not.toBeNull();
        expect(root.querySelector('.new-dragon')?.textContent).toContain('Hatchling 1');
        expect(root.querySelector('app-dragon-hatchery-station')).toBeNull();
        expect(root.textContent).not.toContain('Candling');

        component.newFamily();
        component.selectParent('female', female);
        component.selectParent('male', male);
        fixture.detectChanges();
        expect(root.querySelector('app-meiosis-gamete-selector')).not.toBeNull();
        expect(root.querySelector('.new-dragon')).toBeNull();
    });
});
