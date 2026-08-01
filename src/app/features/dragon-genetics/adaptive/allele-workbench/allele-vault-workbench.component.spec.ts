import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AlleleVaultWorkbenchComponent } from './allele-vault-workbench.component';
import { AlleleWorkbenchInteraction } from './allele-vault.models';

describe('AlleleVaultWorkbenchComponent', () => {
  let fixture: ComponentFixture<AlleleVaultWorkbenchComponent>;
  let component: AlleleVaultWorkbenchComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlleleVaultWorkbenchComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AlleleVaultWorkbenchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the complete vault and a split genome comparison', () => {
    const element = fixture.nativeElement as HTMLElement;
    const instrument = element.querySelector('.allele-instrument');
    const vault = instrument?.querySelector(':scope > .allele-vault');
    const body = instrument?.querySelector(':scope > .instrument-body');
    expect(vault?.nextElementSibling).toBe(body);
    expect(body?.firstElementChild?.classList.contains('gene-selector')).toBeTrue();
    expect(element.querySelectorAll('.allele-token').length).toBe(8);
    expect(element.querySelectorAll('.genome-pane').length).toBe(2);
    expect(element.querySelectorAll('.chromosome-map').length).toBe(2);
    expect(element.querySelectorAll('.chromosome-locus').length).toBe(8);
    expect(element.querySelectorAll('.vault-chromosome').length).toBe(8);
    expect(element.querySelectorAll('.phenotype-preview').length).toBe(2);
    expect(element.querySelector('.reference-phenotype [data-allele-id="wings-W"]')).not.toBeNull();
    expect(element.querySelector('.variant-phenotype [data-allele-id="wings-w"]')).not.toBeNull();
    expect(element.querySelectorAll('.variant-pane .sequence-strip .changed').length).toBe(2);
  });

  it('accepts question data to focus and configure a student task', () => {
    fixture.componentRef.setInput('question', {
      id: 'fire-task',
      focusGeneId: 'fire',
      startingPairIds: ['fire-F', 'fire-f'],
      requestedPairIds: ['fire-f', 'fire-f'],
      comparisonAlleleIds: ['fire-F', 'fire-f'],
      allowedAlleleIds: ['fire-F', 'fire-f'],
      highlight: 'pair',
    });
    fixture.detectChanges();

    expect(component.activeGeneId()).toBe('fire');
    expect(component.pairIds()).toEqual(['fire-F', 'fire-f']);
    expect(component.requestedPairComplete()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).querySelector('.focus-pair')).not.toBeNull();
  });

  it('installs a selected allele and animates expression', fakeAsync(() => {
    const events: AlleleWorkbenchInteraction[] = [];
    component.interaction.subscribe((event) => events.push(event));

    component.selectAllele('wings-w');
    component.installSelected(0);
    expect(component.pairIds()).toEqual(['wings-w', 'wings-w']);
    component.runExpression();
    expect(component.expressionState()).toBe('running');

    tick(900);
    expect(component.expressionState()).toBe('revealed');
    expect(component.expressedPhenotype()).toBe('Wingless');
    expect(events.some((event) => event.type === 'allele-installed')).toBeTrue();
    expect(events.some((event) => event.type === 'expression-run')).toBeTrue();
  }));
});
