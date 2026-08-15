import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlleleVaultWorkbenchComponent } from './allele-vault-workbench.component';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleWorkbenchInteraction,
} from './allele-vault.models';

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
    expect(element.querySelectorAll('.vault-cell-viewport .chromosome-in-cell').length).toBe(4);
    expect(element.querySelectorAll('.allele-token').length).toBe(2);
    expect(element.querySelectorAll('.genome-pane').length).toBe(2);
    expect(element.querySelectorAll('app-chromosome-svg').length).toBe(9);
    expect(element.querySelectorAll('.chromosome-svg').length).toBe(9);
    expect(element.querySelectorAll('.chromosome-svg--placeholder').length).toBe(2);
    expect(
      element.querySelectorAll('.vault-cell-viewport [data-band-start]').length,
    ).toBeGreaterThan(0);
    expect(element.querySelectorAll('.inspection-panel .gene-locus').length).toBe(3);
    expect(element.querySelectorAll('.allele-token-chromosome').length).toBe(2);
    expect(element.querySelectorAll('.allele-token-chromosome [data-pattern]').length).toBe(2);
    expect(
      [...element.querySelectorAll('.allele-token-chromosome [data-pattern]')].map((band) =>
        band.getAttribute('data-pattern'),
      ),
    ).toEqual(['stripe-a', 'stripe-b']);
    expect(
      [...element.querySelectorAll('.allele-token-chromosome [data-pattern-placement]')].map(
        (band) => band.getAttribute('data-pattern-placement'),
      ),
    ).toEqual(['center', 'center']);
    expect(
      [...element.querySelectorAll('.allele-token-chromosome [data-pattern]')].map((band) => [
        band.getAttribute('y'),
        band.getAttribute('height'),
      ]),
    ).toEqual([
      ['12', '8'],
      ['12', '8'],
    ]);
    const tokenChromosomes = element.querySelectorAll('.allele-token-chromosome');
    expect(tokenChromosomes[0].querySelectorAll('pattern[id$="-stripe-a"] rect').length).toBe(5);
    expect(tokenChromosomes[1].querySelectorAll('pattern[id$="-stripe-b"] rect').length).toBe(5);
    expect(element.querySelectorAll('.phenotype-preview').length).toBe(0);
    expect(element.querySelectorAll('app-specimen-viewport').length).toBe(1);
    expect(element.querySelector('.phenotype-stage.empty')).not.toBeNull();
    expect(element.querySelector('.pair-builder')).toBeNull();
    expect(element.querySelector('.gene-chart-builder')).not.toBeNull();
    expect(element.querySelectorAll('.claim-allele-zone').length).toBe(2);
    expect(component.pairIds()).toEqual([null, null]);
    expect(element.querySelectorAll('.variant-pane-shell .sequence-strip .changed').length).toBe(0);
    expect(element.querySelectorAll('.genome-pane.sample-loaded').length).toBe(0);
    expect(element.querySelectorAll('.allele-token.dominant').length).toBe(0);
    expect(element.querySelector('.interaction-hint')).toBeNull();
    expect(element.textContent).not.toContain('Wingless allele');
  });

  it('lets students switch the cell between single and replicated chromosomes', () => {
    const element = fixture.nativeElement as HTMLElement;
    const formButtons = element.querySelectorAll<HTMLButtonElement>(
      '.vault-cell-viewport .chromosome-form-controls button',
    );

    expect(formButtons.length).toBe(2);
    expect(element.querySelectorAll('.vault-cell-viewport .chromosome-svg--replicated').length).toBe(
      0,
    );

    formButtons[1].click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.vault-cell-viewport .chromosome-svg--replicated').length).toBe(
      5,
    );
    expect(element.querySelectorAll('.vault-cell-viewport .centromere-joint').length).toBe(5);
  });

  it('keeps each allele stripe identity when it is dropped into either comparison sample', () => {
    const [sampleA, sampleB] = component.allelesForGene(component.activeGeneId());
    component.loadComparison('left', sampleB.id);
    component.loadComparison('right', sampleA.id);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(
      element.querySelector('.reference-pane [data-pattern]')?.getAttribute('data-pattern'),
    ).toBe('stripe-b');
    expect(
      element.querySelector('.variant-pane [data-pattern]')?.getAttribute('data-pattern'),
    ).toBe('stripe-a');
  });

  it('populates the gene and allele controls from the selected chromosome', () => {
    component.selectChromosome('Chr 2');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(component.activeChromosome()).toBe('Chr 2');
    expect(component.activeGeneId()).toBe('fire');
    expect(element.querySelectorAll('.gene-button').length).toBe(3);
    expect(
      [...element.querySelectorAll<HTMLButtonElement>('.gene-button')].map((button) =>
        button.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(['CH2-G1', 'CH2-G2', 'CH2-G3']);
    expect(
      element.querySelector('.vault-cell-viewport [data-chromosome="Chr 2"]')?.classList,
    ).toContain('chromosome-in-cell--selected');
    expect(element.querySelector('.inspection-panel')?.textContent).toContain('Chr 2');
    expect(element.querySelector('.locus-readout')).toBeNull();
    expect(
      [...element.querySelectorAll<HTMLButtonElement>('.allele-token')].map((button) =>
        button.getAttribute('aria-label'),
      ),
    ).toEqual(['Allele sample CH2-G1a', 'Allele sample CH2-G1b']);
  });

  it('shows only chromosomes released by the teacher list', () => {
    const releasedGeneIds = new Set(['wings', 'fire']);
    fixture.componentRef.setInput(
      'genes',
      ALLELE_VAULT_GENES.filter((gene) => releasedGeneIds.has(gene.id)),
    );
    fixture.componentRef.setInput(
      'alleles',
      ALLELE_VAULT_ALLELES.filter((allele) => releasedGeneIds.has(allele.geneId)),
    );
    fixture.detectChanges();

    const selectors = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.vault-cell-viewport .chromosome-in-cell',
      ),
    ];
    expect(selectors.length).toBe(2);
    expect(selectors.map((button) => button.getAttribute('data-display-chromosome'))).toEqual([
      'Chr 1',
      'Chr 2',
    ]);
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
    expect(component.activeChromosome()).toBe('Chr 2');
    expect(component.pairIds()).toEqual(['fire-F', 'fire-f']);
    expect(component.requestedPairComplete()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).querySelector('.focus-pair')).not.toBeNull();
  });

  it('renders and records automatically after the second allele is installed', () => {
    const events: AlleleWorkbenchInteraction[] = [];
    component.interaction.subscribe((event) => events.push(event));

    component.selectAllele('wings-w');
    component.installSelected(0);
    expect(component.pairIds()).toEqual(['wings-w', null]);
    expect(component.phenotypeSource()).toBeNull();

    component.installSelected(1);
    expect(component.pairIds()).toEqual(['wings-w', 'wings-w']);
    expect(component.expressionState()).toBe('revealed');
    expect(component.expressedPhenotype()).toBe('Wingless');
    expect(component.phenotypeSource()?.kind).toBe('descriptor');
    expect(events.some((event) => event.type === 'allele-installed')).toBeTrue();
    expect(events.some((event) => event.type === 'expression-run')).toBeTrue();
  });

  it('uses reference samples A and B as the genotype loading targets', () => {
    component.loadComparison('left', 'wings-W');
    expect(component.pairIds()).toEqual(['wings-W', null]);
    expect(component.phenotypeSource()).toBeNull();

    component.loadComparison('right', 'wings-w');
    fixture.detectChanges();

    expect(component.pairIds()).toEqual(['wings-W', 'wings-w']);
    expect(component.phenotypeSource()?.kind).toBe('descriptor');
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.genome-pane.sample-loaded').length,
    ).toBe(2);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.chromosome-svg--placeholder'),
    ).toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.genome-pane .gene-locus').length,
    ).toBe(6);
    expect((fixture.nativeElement as HTMLElement).querySelector('.test-allele-sockets')).toBeNull();
  });

  it('emits the persistent gene and allele combination for DNA analysis', () => {
    const events: AlleleWorkbenchInteraction[] = [];
    component.interaction.subscribe((event) => events.push(event));
    component.loadComparison('left', 'wings-W');
    component.loadComparison('right', 'wings-w');
    fixture.detectChanges();

    const launch = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.dna-analysis-link',
    );
    launch?.click();

    expect(events).toContain(
      jasmine.objectContaining({
        type: 'dna-analysis-requested',
        geneId: 'wings',
        pairIds: ['wings-W', 'wings-w'],
      }),
    );
  });

  it('places a clicked allele into comparison and chart targets without dragging', () => {
    const element = fixture.nativeElement as HTMLElement;
    const alleleTokens = element.querySelectorAll<HTMLButtonElement>('.allele-token');
    const comparisonTargets = element.querySelectorAll<HTMLButtonElement>('.genome-pane');
    const claimTargets = element.querySelectorAll<HTMLButtonElement>('.claim-allele-zone');

    alleleTokens[0].click();
    comparisonTargets[0].click();
    claimTargets[0].click();
    expect(component.pairIds()[0]).toBe('wings-W');
    expect(component.claimDominantAlleleId()).toBe('wings-W');

    alleleTokens[1].click();
    comparisonTargets[1].click();
    claimTargets[1].click();
    expect(component.pairIds()).toEqual(['wings-W', 'wings-w']);
    expect(component.claimRecessiveAlleleId()).toBe('wings-w');
  });

  it('selects a gene by clicking its locus on the selector chromosome', () => {
    const locus = (fixture.nativeElement as HTMLElement).querySelector<SVGGElement>(
      '.vault-cell-viewport .inspection-panel [data-locus="CH1-G2"]',
    );

    locus?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(component.activeGeneId()).toBe('tail');
    expect(component.activeGene().sampleCode).toBe('CH1-G2');
  });

  it('clears both genotype slots when the student changes genes', () => {
    component.selectAllele('wings-W');
    component.installSelected(0);
    component.installSelected(1);
    expect(component.phenotypeSource()).not.toBeNull();

    component.selectGene('tail');
    expect(component.pairIds()).toEqual([null, null]);
    expect(component.phenotypeSource()).toBeNull();
  });

  it('renders all three tail-club forms and preserves the selected specimen sex', () => {
    component.selectGene('tail');
    component.selectSpecimenSex('male');
    component.selectAllele('tail-K');
    component.installSelected(0);
    component.installSelected(1);
    expect(component.expressedPhenotype()).toBe('Large crown-spiked club');
    expect(component.phenotypeProfile()?.sex).toBe('male');

    component.selectAllele('tail-k');
    component.installSelected(1);
    expect(component.expressedPhenotype()).toBe('Intermediate five-spike club');

    component.installSelected(0);
    expect(component.expressedPhenotype()).toBe('Small smooth club');
  });

  it('builds a gene claim from the selected trait and allele placements', () => {
    const events: AlleleWorkbenchInteraction[] = [];
    component.interaction.subscribe((event) => events.push(event));

    component.selectClaimTrait({ target: { value: 'wings' } } as unknown as Event);
    component.selectAllele('wings-W');
    component.assignSelectedToClaim('dominant');
    component.selectAllele('wings-w');
    component.assignSelectedToClaim('recessive');
    component.submitDiscoveryClaim();

    expect(component.claimComplete()).toBeTrue();
    expect(events[events.length - 1]).toEqual(
      jasmine.objectContaining({
        type: 'discovery-claim',
        geneId: 'wings',
        traitId: 'wings',
        dominantAlleleId: 'wings-W',
        recessiveAlleleId: 'wings-w',
      }),
    );
  });
});
