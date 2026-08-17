import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAGON_PARENTS } from '../../simulation/domain/dragon-inheritance';
import { AccountDragonRecord } from '../shared/account-genetics-library.models';
import { chromosomeVisual } from '../shared/dragon-chromosome.catalog';
import { GenomeMicroscopeComponent } from './genome-microscope.component';

const TEST_DRAGONS: readonly AccountDragonRecord[] = DRAGON_PARENTS.slice(0, 2).map(
  (dragon, index) => ({
    ...dragon,
    kind: 'dragon' as const,
    sex: index === 0 ? ('female' as const) : ('male' as const),
    source: 'foundation' as const,
    storedAtIso: '2026-01-01T00:00:00.000Z',
    generation: 0,
  }),
);

describe('GenomeMicroscopeComponent', () => {
  let fixture: ComponentFixture<GenomeMicroscopeComponent>;
  let microscope: GenomeMicroscopeComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [GenomeMicroscopeComponent] });
    fixture = TestBed.createComponent(GenomeMicroscopeComponent);
    fixture.componentRef.setInput('dragons', TEST_DRAGONS);
    microscope = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads a dragon before connecting it to the chromosome model', () => {
    expect(microscope.level()).toBe('dragon');
    expect(microscope.loadedDragon()?.id).toBe(TEST_DRAGONS[0].id);
    expect(microscope.chromosomePairs().length).toBe(5);
    expect(microscope.chromosomePairs().filter((pair) => pair.kind === 'autosome').length).toBe(4);
    expect(microscope.chromosomePairs().find((pair) => pair.kind === 'sex')?.label).toContain('XX');

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-specimen-viewport')).not.toBeNull();
    expect(element.querySelector('.genome-microscope')?.getAttribute('data-level')).toBe('dragon');
  });

  it('zooms through the connected scientific hierarchy one level at a time', () => {
    microscope.zoomIn();
    expect(microscope.level()).toBe('cell');
    microscope.zoomIn();
    expect(microscope.level()).toBe('nucleus');
    microscope.zoomIn();
    expect(microscope.level()).toBe('chromosome-set');
    microscope.zoomOut();
    expect(microscope.level()).toBe('nucleus');
  });

  it('reuses the shared cell model and chromosome presentation components', () => {
    const element = fixture.nativeElement as HTMLElement;

    microscope.selectLevel('cell');
    fixture.detectChanges();
    expect(element.querySelector('app-cell-model')).not.toBeNull();
    expect(element.querySelectorAll('app-cell-model [data-organelle]').length).toBeGreaterThan(0);
    expect(element.querySelectorAll('app-cell-model .chromosome-in-cell').length).toBe(
      microscope.cellChromosomeCopies().length,
    );

    microscope.selectLevel('nucleus');
    fixture.detectChanges();
    expect(element.querySelector('app-cell-model .cell-model')?.getAttribute('data-focus')).toBe(
      'nucleus',
    );

    microscope.selectChromosome('Chr 1');
    fixture.detectChanges();
    expect(element.querySelector('app-cell-chromosome-viewport')).not.toBeNull();
  });

  it('uses the shared chromosome band source without duplicating colors', () => {
    const pair = microscope.chromosomePairs()[0];
    expect(pair.maternal.bands).toBe(chromosomeVisual('Chr 1').bands);
    expect(pair.paternal.bands).toBe(chromosomeVisual('Chr 1').bands);
  });

  it('derives XX or XY from the loaded dragon record', () => {
    microscope.loadDragon(TEST_DRAGONS[1].id);
    fixture.detectChanges();

    const sexPair = microscope.chromosomePairs().find((pair) => pair.kind === 'sex');
    expect(sexPair?.label).toContain('XY');
    expect(sexPair?.maternal.length).toBe(chromosomeVisual('Chr X').length);
    expect(sexPair?.paternal.length).toBe(chromosomeVisual('Chr Y').length);
  });

  it('opens a selected chromosome, gene, DNA, allele, and protein from shared records', () => {
    microscope.selectChromosome('Chr 2');
    expect(microscope.level()).toBe('chromosome');
    expect(microscope.genesForSelectedChromosome().length).toBe(3);

    const gene = microscope.genesForSelectedChromosome()[1];
    microscope.selectGene(gene.id);
    expect(microscope.level()).toBe('gene');
    expect(microscope.activeGene()?.sampleCode).toBe(gene.sampleCode);
    expect(microscope.activeAlleles().length).toBe(2);

    microscope.selectLevel('dna');
    expect(microscope.activeDnaSequence().length).toBeGreaterThan(0);
    microscope.selectAlleleCopy(1);
    expect(microscope.level()).toBe('allele');
    microscope.selectLevel('protein');
    expect(microscope.proteinCodons().length).toBeGreaterThan(0);
  });

  it('emits a reusable evidence selection for an external explanation or question host', () => {
    const evidence: unknown[] = [];
    fixture.componentRef.instance.evidenceChanged.subscribe((event) => evidence.push(event));

    microscope.selectGene('wings');
    expect(evidence).toContain(
      jasmine.objectContaining({
        level: 'gene',
        dragonId: TEST_DRAGONS[0].id,
        chromosome: 'Chr 1',
        geneId: 'wings',
      }),
    );
  });
});
