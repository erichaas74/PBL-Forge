import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DnaRnaBaseExplorerComponent } from './dna-rna-base-explorer.component';

describe('DnaRnaBaseExplorerComponent', () => {
  let fixture: ComponentFixture<DnaRnaBaseExplorerComponent>;
  let component: DnaRnaBaseExplorerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DnaRnaBaseExplorerComponent] });
    fixture = TestBed.createComponent(DnaRnaBaseExplorerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dnaSequence', 'ATGCCGTA');
    fixture.componentRef.setInput('rnaSequence', 'AUGCCGUA');
    fixture.detectChanges();
  });

  it('compares the four DNA bases with the four RNA bases using the shared molecule model', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(
      element.querySelectorAll('.dna-panel .catalog-grid app-nucleobase-molecule').length,
    ).toBe(4);
    expect(
      element.querySelectorAll('.rna-panel .catalog-grid app-nucleobase-molecule').length,
    ).toBe(4);
    expect(element.querySelectorAll('.molecule-inspector app-nucleobase-molecule').length).toBe(1);
  });

  it('shows the selected base formula, ring shape, and pairing evidence', () => {
    component.selectBase('G', 'RNA');
    fixture.detectChanges();

    expect(component.selectedDefinition().formula).toBe('C₅H₅N₅O');
    expect(component.selectedDefinition().ringCount).toBe(2);
    expect(component.selectedPair()).toBe('C');
    expect(component.observation()).toContain('3 hydrogen bonds');
  });

  it('keeps thymine in DNA and switches to uracil in the RNA-only view', () => {
    component.selectBase('T', 'DNA');
    component.setView('rna');

    expect(component.selectedBase()).toBe('U');
    expect(component.selectedContext()).toBe('RNA');
  });
});
