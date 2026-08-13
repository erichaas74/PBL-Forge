import { ComponentFixture, TestBed } from '@angular/core/testing';
import { chromosomeVisual } from '../shared/dragon-chromosome.catalog';
import { GenomeMicroscopeComponent } from './genome-microscope.component';

describe('GenomeMicroscopeComponent', () => {
  let fixture: ComponentFixture<GenomeMicroscopeComponent>;
  let microscope: GenomeMicroscopeComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [GenomeMicroscopeComponent] });
    fixture = TestBed.createComponent(GenomeMicroscopeComponent);
    microscope = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts with a dragon cell containing four autosome pairs and one sex pair', () => {
    expect(microscope.level()).toBe('cell');
    expect(microscope.chromosomePairs().length).toBe(5);
    expect(microscope.chromosomePairs().filter((pair) => pair.kind === 'autosome').length).toBe(4);
    expect(microscope.chromosomePairs().find((pair) => pair.kind === 'sex')?.label).toContain('XX');

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.nuclear-chromosome-pair').length).toBe(5);
    expect(element.querySelector('.genome-microscope')?.getAttribute('data-level')).toBe('cell');
  });

  it('zooms through the scientific hierarchy one level at a time', () => {
    microscope.zoomIn();
    expect(microscope.level()).toBe('nucleus');
    microscope.zoomIn();
    expect(microscope.level()).toBe('chromosome-set');
    microscope.zoomIn();
    expect(microscope.level()).toBe('chromosome');
    microscope.zoomOut();
    expect(microscope.level()).toBe('chromosome-set');
  });

  it('uses the Allele Workbench chromosome band source without duplicating colors', () => {
    const pair = microscope.chromosomePairs()[0];
    expect(pair.maternal.bands).toBe(chromosomeVisual('Chr 1').bands);
    expect(pair.paternal.bands).toBe(chromosomeVisual('Chr 1').bands);
  });

  it('switches the modeled sex chromosomes from XX to XY', () => {
    microscope.selectSex('male');
    fixture.detectChanges();

    const sexPair = microscope.chromosomePairs().find((pair) => pair.kind === 'sex');
    expect(sexPair?.label).toContain('XY');
    expect(sexPair?.maternal.length).toBe(chromosomeVisual('Chr X').length);
    expect(sexPair?.paternal.length).toBe(chromosomeVisual('Chr Y').length);
  });

  it('opens a selected chromosome and gene from the code-driven catalog', () => {
    microscope.selectChromosome('Chr 2');
    expect(microscope.level()).toBe('chromosome');
    expect(microscope.genesForSelectedChromosome().length).toBe(3);

    const gene = microscope.genesForSelectedChromosome()[1];
    microscope.selectGene(gene.id);
    expect(microscope.level()).toBe('gene');
    expect(microscope.activeGene()?.sampleCode).toBe(gene.sampleCode);
    expect(microscope.activeAlleles().length).toBe(2);
  });
});
