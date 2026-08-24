import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    stubSpecimenThumbnailRendering,
    stubSpecimenViewportRendering,
} from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { AccountGeneticsFileComponent } from './account-genetics-file.component';

describe('AccountGeneticsFileComponent', () => {
    let fixture: ComponentFixture<AccountGeneticsFileComponent>;
    let component: AccountGeneticsFileComponent;

    beforeEach(() => {
        stubSpecimenThumbnailRendering();
        stubSpecimenViewportRendering();
        TestBed.configureTestingModule({ imports: [AccountGeneticsFileComponent] });
        fixture = TestBed.createComponent(AccountGeneticsFileComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('studentId', 'account-inventory-component-spec');
        fixture.componentRef.setInput('dragonsOnly', true);
        fixture.detectChanges();
    });

    afterEach(() => fixture.destroy());

    it('shows the card deck without a repeated file handle and activates the front card', () => {
        const root = fixture.nativeElement as HTMLElement;
        expect(root.querySelector('.file-handle')).toBeNull();
        expect(root.querySelector('.file-body')).not.toBeNull();
        expect(root.querySelector('app-dragon-card-deck-selector')).not.toBeNull();
        expect(root.querySelectorAll('.fanned-deck__slot').length).toBe(4);

        vi.spyOn(component.recordSelected, 'emit').mockReturnValue(undefined);
        root.querySelector<HTMLElement>('.is-next .fanned-deck__peek')!.click();
        fixture.detectChanges();
        expect(root.querySelector('app-specimen-thumb')).not.toBeNull();
        expect(root.querySelector('.is-active app-specimen-viewport')).not.toBeNull();

        const selected = component.activeDeckDragon()!;
        expect(component.recordSelected.emit).toHaveBeenCalledWith(selected);
        expect(root.textContent).not.toContain('Use in this lab');
        expect(root.textContent).not.toContain('DRAGON CARD CATALOG');
    });

    it('filters a shared account inventory by dragon sex', () => {
        fixture.componentRef.setInput('sexFilter', 'female');
        component.open.set(true);
        fixture.detectChanges();

        expect(component.visibleRecords().length).toBe(2);
        expect(component
            .visibleRecords()
            .every((record) => record.kind === 'dragon' && record.sex === 'female')).toBe(true);
    });
});
