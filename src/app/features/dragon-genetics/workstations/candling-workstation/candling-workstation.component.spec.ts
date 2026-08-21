import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAGON_TRAITS } from '../../simulation/domain/dragon-inheritance';
import { CandlingWorkstationComponent, createCandlingEggAssignment, } from './candling-workstation.component';

describe('CandlingWorkstationComponent', () => {
    let fixture: ComponentFixture<CandlingWorkstationComponent>;
    let component: CandlingWorkstationComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [CandlingWorkstationComponent] });
        fixture = TestBed.createComponent(CandlingWorkstationComponent);
        fixture.componentRef.setInput('studentId', 'student-candling-spec');
        fixture.componentRef.setInput('seed', 'assigned-egg');
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => fixture.destroy());

    it('assigns one stable sealed egg and loads the shared candling bench', () => {
        const root = fixture.nativeElement as HTMLElement;
        expect(component.clutch().length).toBe(1);
        expect(component.assignmentCode()).toMatch(/^EGG-/);
        expect(root.querySelector('app-dragon-hatchery-station')).not.toBeNull();
        expect(root.querySelector('.candling-window')).not.toBeNull();
        expect(root.querySelector('.scan')).not.toBeNull();
    });

    it('creates deterministic assignments but can issue another random egg', () => {
        const first = createCandlingEggAssignment('student-1', 'seed-1', 0);
        const repeat = createCandlingEggAssignment('student-1', 'seed-1', 0);
        const next = createCandlingEggAssignment('student-1', 'seed-1', 1);

        expect(repeat.assignmentCode).toBe(first.assignmentCode);
        expect(repeat.egg.genome).toEqual(first.egg.genome);
        expect(next.assignmentCode).not.toBe(first.assignmentCode);
        expect(DRAGON_TRAITS.some((trait) => trait.id === first.focusTraitId)).toBe(true);
    });
});
