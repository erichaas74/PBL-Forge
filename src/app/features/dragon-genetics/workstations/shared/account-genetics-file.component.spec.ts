import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountGeneticsFileComponent } from './account-genetics-file.component';

describe('AccountGeneticsFileComponent', () => {
  let fixture: ComponentFixture<AccountGeneticsFileComponent>;
  let component: AccountGeneticsFileComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AccountGeneticsFileComponent] });
    fixture = TestBed.createComponent(AccountGeneticsFileComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('studentId', 'account-inventory-component-spec');
    fixture.componentRef.setInput('dragonsOnly', true);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('stays collapsed until opened, then inspects a dragon before activating it', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.file-body')).toBeNull();

    root.querySelector<HTMLButtonElement>('.file-handle')!.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.account-record').length).toBe(4);

    root.querySelector<HTMLButtonElement>('.account-record')!.click();
    fixture.detectChanges();
    expect(root.querySelector('app-specimen-viewport')).not.toBeNull();

    const selected = component.inspectedRecord()!;
    spyOn(component.recordSelected, 'emit');
    root.querySelector<HTMLButtonElement>('.inspection header button')!.click();
    expect(component.recordSelected.emit).toHaveBeenCalledWith(selected);
  });

  it('filters a shared account inventory by dragon sex', () => {
    fixture.componentRef.setInput('sexFilter', 'female');
    component.open.set(true);
    fixture.detectChanges();

    expect(component.visibleRecords().length).toBe(2);
    expect(
      component.visibleRecords().every((record) => record.kind === 'dragon' && record.sex === 'female'),
    ).toBeTrue();
  });
});
