import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DRAGON_ENZYME_GENES } from '../shared/dragon-gene-dna.catalog';
import { DRAGON_ENZYME_REACTIONS } from './dragon-enzyme-reactions.models';
import { EnzymeReactionExplorerComponent } from './enzyme-reaction-explorer.component';

const FIRST_ENZYME = DRAGON_ENZYME_REACTIONS[0];
const BREAK_DOWN_ENZYME = DRAGON_ENZYME_REACTIONS.find(
  (reaction) => reaction.action === 'break-down',
);

describe('EnzymeReactionExplorerComponent', () => {
  let fixture: ComponentFixture<EnzymeReactionExplorerComponent>;
  let explorer: EnzymeReactionExplorerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EnzymeReactionExplorerComponent] });
    fixture = TestBed.createComponent(EnzymeReactionExplorerComponent);
    explorer = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('offers one candidate per enzyme gene, each drawn from its own residue chain', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(explorer.reactions().length).toBe(DRAGON_ENZYME_GENES.length);
    expect(element.querySelectorAll('[data-enzyme]').length).toBe(DRAGON_ENZYME_GENES.length);
    expect(element.querySelectorAll('[data-product]').length).toBe(DRAGON_ENZYME_GENES.length);
    expect(element.querySelector('canvas')).toBeNull();

    const bodies = element.querySelectorAll<SVGPathElement>('.candidate-body');
    expect(new Set([...bodies].map((body) => body.getAttribute('d'))).size).toBe(
      DRAGON_ENZYME_GENES.length,
    );
    DRAGON_ENZYME_REACTIONS.forEach((reaction, index) => {
      expect(bodies[index].getAttribute('d')).toBe(reaction.bodyPath);
    });
  });

  it('covers both reaction directions and keeps every enzyme tied to its gene', () => {
    const actions = new Set(DRAGON_ENZYME_REACTIONS.map((reaction) => reaction.action));
    expect(actions).toEqual(new Set(['build', 'break-down']));

    for (const reaction of DRAGON_ENZYME_REACTIONS) {
      const record = DRAGON_ENZYME_GENES.find((gene) => gene.geneId === reaction.geneId);
      expect(record?.protein.proteinId).toBe(reaction.id);
      expect(reaction.residues.length).toBeGreaterThan(0);
      expect(reaction.rnaSequence).not.toContain('T');
      if (reaction.action === 'build') {
        expect(reaction.reactants.length).toBe(2);
        expect(reaction.products.length).toBe(1);
      } else {
        expect(reaction.reactants.length).toBe(1);
        expect(reaction.products.length).toBe(2);
      }
    }
  });

  it('cuts the active site from the candidate while the target molecules stay put', () => {
    const target = explorer.targetReaction();
    const mismatch = DRAGON_ENZYME_REACTIONS.find((reaction) => reaction.id !== target.id);
    explorer.selectReaction(mismatch!.id);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const enzyme = explorer.activeReaction();
    const maskPaths = element.querySelectorAll('mask path');
    const reactantPaths = element.querySelectorAll<SVGPathElement>('.substrate .molecule-shape');

    expect(maskPaths[0].getAttribute('d')).toBe(enzyme.activeSite[0].path);
    expect(maskPaths[1].getAttribute('d')).toBe(enzyme.activeSite[1].path);
    expect(reactantPaths.length).toBe(target.reactants.length);
    target.reactants.forEach((molecule, index) => {
      expect(reactantPaths[index].getAttribute('d')).toBe(molecule.path);
    });
    expect(enzyme.id).not.toBe(target.id);
  });

  it('draws a break-down reaction as one molecule entering and two leaving', () => {
    explorer.selectTarget(BREAK_DOWN_ENZYME!.id);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.enzyme-explorer')?.getAttribute('data-action')).toBe(
      'break-down',
    );
    expect(element.querySelectorAll('.substrate').length).toBe(1);
    expect(element.querySelectorAll('.reaction-product').length).toBe(2);
    expect(element.querySelectorAll('[data-molecule]').length).toBe(4);
    expect(element.querySelectorAll('.ambient-molecule').length).toBe(3);
  });

  it('lets students choose a target without revealing its matching enzyme', () => {
    const target = DRAGON_ENZYME_REACTIONS[2];
    explorer.selectTarget(target.id);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(explorer.targetProductName()).toBe(target.traitProduct.name);
    expect(explorer.activeReaction().id).toBe(FIRST_ENZYME.id);
    expect(
      element
        .querySelector(`[data-product="${target.traitProduct.id}"]`)
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(element.querySelector(`[data-enzyme="${target.id}"]`)?.textContent).not.toContain(
      target.traitProduct.name,
    );
  });

  it('shows the residue chain that folded the selected candidate', () => {
    const element = fixture.nativeElement as HTMLElement;
    const residues = element.querySelectorAll('.residue-strip li');

    expect(residues.length).toBe(FIRST_ENZYME.residues.length);
    expect(residues[0].textContent).toContain(FIRST_ENZYME.residues[0].rnaCodon);
    expect(residues[0].textContent).toContain(FIRST_ENZYME.residues[0].shortName);
    expect(element.querySelector('.protein-provenance')?.textContent).toContain(
      FIRST_ENZYME.rnaSequence,
    );
  });

  it('docks reactants, releases a product, and keeps a reusable enzyme', fakeAsync(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    const results: unknown[] = [];
    explorer.reactionCompleted.subscribe((result) => results.push(result));

    explorer.runReaction();
    expect(explorer.phase()).toBe('docking');
    tick(360);
    expect(explorer.phase()).toBe('catalyzing');
    tick(320);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(explorer.phase()).toBe('released');
    expect(explorer.currentProductCount()).toBe(1);
    expect(results).toContain(
      jasmine.objectContaining({
        enzymeId: FIRST_ENZYME.id,
        productId: FIRST_ENZYME.traitProduct.id,
        totalBuilt: 1,
      }),
    );
    expect(element.querySelector('[data-molecule="enzyme"]')).not.toBeNull();
    expect(element.querySelector('.enzyme-explorer')?.getAttribute('data-phase')).toBe('released');
  }));

  it('rejects a mismatched enzyme without running the target reaction', fakeAsync(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    const results: unknown[] = [];
    explorer.reactionCompleted.subscribe((result) => results.push(result));
    explorer.selectReaction(DRAGON_ENZYME_REACTIONS[1].id);

    explorer.runReaction();
    expect(explorer.phase()).toBe('docking');
    tick(360);

    expect(explorer.phase()).toBe('rejected');
    expect(explorer.currentProductCount()).toBe(0);
    expect(explorer.trialOutcome(explorer.activeReaction())).toBe('no-match');
    expect(results).toEqual([]);
  }));

  it('automatically captures and releases repeated molecules while active', fakeAsync(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);

    explorer.toggleCatalyst();
    expect(explorer.catalystActive()).toBeTrue();
    tick(160);
    expect(explorer.phase()).toBe('docking');
    tick(360);
    expect(explorer.phase()).toBe('catalyzing');
    tick(320);
    expect(explorer.phase()).toBe('released');
    expect(explorer.currentProductCount()).toBe(1);
    tick(500);
    expect(explorer.phase()).toBe('ready');
    tick(240);
    expect(explorer.phase()).toBe('docking');

    explorer.toggleCatalyst();
    expect(explorer.catalystActive()).toBeFalse();
    expect(explorer.phase()).toBe('ready');
  }));

  it('stops automatic capture and releases docked molecules when switched off', fakeAsync(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);

    explorer.toggleCatalyst();
    tick(160);
    expect(explorer.phase()).toBe('docking');
    explorer.toggleCatalyst();
    tick(2_000);

    expect(explorer.catalystActive()).toBeFalse();
    expect(explorer.phase()).toBe('ready');
    expect(explorer.currentProductCount()).toBe(0);
  }));

  it('shows the final scientific result immediately when reduced motion is requested', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);

    explorer.runReaction();

    expect(explorer.phase()).toBe('released');
    expect(explorer.currentProductCount()).toBe(1);
  });

  it('shows a mismatched-enzyme result immediately with reduced motion', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    explorer.selectReaction(DRAGON_ENZYME_REACTIONS[3].id);

    explorer.runReaction();

    expect(explorer.phase()).toBe('rejected');
    expect(explorer.currentProductCount()).toBe(0);
    expect(explorer.trialLabel(explorer.activeReaction())).toBe('No match');
  });
});
