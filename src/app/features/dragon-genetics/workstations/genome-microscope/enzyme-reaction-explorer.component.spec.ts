import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EnzymeReactionExplorerComponent } from './enzyme-reaction-explorer.component';

describe('EnzymeReactionExplorerComponent', () => {
  let fixture: ComponentFixture<EnzymeReactionExplorerComponent>;
  let explorer: EnzymeReactionExplorerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EnzymeReactionExplorerComponent] });
    fixture = TestBed.createComponent(EnzymeReactionExplorerComponent);
    explorer = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('offers four candidate enzymes and four freely selectable target molecules', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('[data-enzyme]').length).toBe(4);
    expect(element.querySelectorAll('[data-product]').length).toBe(4);
    expect(element.querySelectorAll('[data-molecule]').length).toBe(4);
    expect(element.querySelectorAll('.ambient-molecule').length).toBe(6);
    expect(element.querySelector('canvas')).toBeNull();

    const products = explorer.reactions.map((reaction) => reaction.product.name);
    expect(products).toEqual([
      'Ember-fuel vesicle',
      'Iridescent scale pigment',
      'Cross-linked horn matrix',
      'Elastic wing-membrane patch',
    ]);
  });

  it('keeps target substrates fixed while candidate enzymes expose different active sites', () => {
    explorer.selectReaction('wing-membrane-synthase');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const enzyme = explorer.activeReaction();
    const target = explorer.targetReaction();
    const maskPaths = element.querySelectorAll('mask path');
    const substratePaths = element.querySelectorAll<SVGPathElement>('.substrate .molecule-shape');

    expect(maskPaths[0].getAttribute('d')).toBe(enzyme.substrateA.path);
    expect(maskPaths[1].getAttribute('d')).toBe(enzyme.substrateB.path);
    expect(substratePaths[0].getAttribute('d')).toBe(target.substrateA.path);
    expect(substratePaths[1].getAttribute('d')).toBe(target.substrateB.path);
    expect(enzyme.id).not.toBe(target.id);
  });

  it('switches candidates without changing the target molecule', () => {
    explorer.selectReaction('wing-membrane-synthase');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(explorer.activeReaction().id).toBe('wing-membrane-synthase');
    expect(explorer.targetReaction().product.id).toBe('ember-fuel');
    expect(element.querySelector('.enzyme-explorer')?.getAttribute('data-reaction')).toBe(
      'wing-membrane-synthase',
    );
    expect(element.querySelector('title')?.textContent).toContain('Ember-fuel vesicle');
  });

  it('lets students choose a target without revealing its matching enzyme', () => {
    explorer.selectTarget('horn-matrix-ligase');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(explorer.targetReaction().product.id).toBe('horn-matrix-link');
    expect(explorer.activeReaction().id).toBe('ember-synthase');
    expect(
      element.querySelector('[data-product="horn-matrix-link"]')?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(element.querySelector('[data-enzyme="horn-matrix-ligase"]')?.textContent).not.toContain(
      'Cross-linked horn matrix',
    );
  });

  it('docks substrates, releases a product, and keeps a reusable enzyme', fakeAsync(() => {
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
        enzymeId: 'ember-synthase',
        productId: 'ember-fuel',
        totalBuilt: 1,
      }),
    );
    expect(element.querySelector('[data-molecule="enzyme"]')).not.toBeNull();
    expect(element.querySelector('.enzyme-explorer')?.getAttribute('data-phase')).toBe('released');
  }));

  it('rejects a mismatched enzyme without building the target product', fakeAsync(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    const results: unknown[] = [];
    explorer.reactionCompleted.subscribe((result) => results.push(result));
    explorer.selectReaction('wing-membrane-synthase');

    explorer.runReaction();
    expect(explorer.phase()).toBe('docking');
    tick(360);

    expect(explorer.phase()).toBe('rejected');
    expect(explorer.currentProductCount()).toBe(0);
    expect(explorer.trialOutcome(explorer.activeReaction())).toBe('no-match');
    expect(results).toEqual([]);
  }));

  it('automatically captures and releases repeated substrate pairs while active', fakeAsync(() => {
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

  it('stops automatic capture and releases docked substrates when switched off', fakeAsync(() => {
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
    explorer.selectReaction('scale-chromatase');

    explorer.runReaction();

    expect(explorer.phase()).toBe('rejected');
    expect(explorer.currentProductCount()).toBe(0);
    expect(explorer.trialLabel(explorer.activeReaction())).toBe('No match');
  });
});
