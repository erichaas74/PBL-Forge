import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NUCLEOBASE_CHEMISTRY } from './nucleobase-chemistry.models';
import { NucleobaseMoleculeComponent } from './nucleobase-molecule.component';

describe('NucleobaseMoleculeComponent', () => {
  let fixture: ComponentFixture<NucleobaseMoleculeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NucleobaseMoleculeComponent] });
    fixture = TestBed.createComponent(NucleobaseMoleculeComponent);
    fixture.componentRef.setInput('base', 'A');
    fixture.detectChanges();
  });

  it('renders atoms and single/double covalent bonds from the shared catalog', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.atom').length).toBe(NUCLEOBASE_CHEMISTRY.A.atoms.length);
    expect(element.querySelectorAll('.bond-layer line').length).toBeGreaterThan(
      NUCLEOBASE_CHEMISTRY.A.bonds.length,
    );
    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain('Adenine');
  });

  it('shows the methyl-group difference between thymine and uracil', () => {
    fixture.componentRef.setInput('base', 'T');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('CH₃');

    fixture.componentRef.setInput('base', 'U');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('CH₃');
  });
});
