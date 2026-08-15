import { ComponentFixture, TestBed } from '@angular/core/testing';
import { chromosomeVisual } from './dragon-chromosome.catalog';
import {
  CellChromosomeLocusSelection,
  CellChromosomeViewportComponent,
  CellChromosomeViewportItem,
} from './cell-chromosome-viewport.component';

describe('CellChromosomeViewportComponent', () => {
  let fixture: ComponentFixture<CellChromosomeViewportComponent>;
  let component: CellChromosomeViewportComponent;

  const chromosomeItems: readonly CellChromosomeViewportItem[] = [
    viewportItem('Chr 1'),
    viewportItem('Chr 2', true),
    viewportItem('Chr 3'),
    viewportItem('Chr 4'),
    viewportItem('Chr X', false, 'Chr Y'),
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CellChromosomeViewportComponent] });
    fixture = TestBed.createComponent(CellChromosomeViewportComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('chromosomes', chromosomeItems);
    fixture.componentRef.setInput('selectedChromosome', 'Chr 2');
    fixture.detectChanges();
  });

  it('renders workstation-neutral chromosome view data as one selectable cell', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.chromosome-in-cell').length).toBe(5);
    expect(element.querySelectorAll('app-chromosome-svg').length).toBe(5);
    expect(element.querySelector('[data-display-chromosome="Chr Y"]')).not.toBeNull();
    expect(element.querySelector('[data-chromosome="Chr 2"]')?.classList).toContain(
      'chromosome-in-cell--selected',
    );
    expect(element.querySelector('[data-chromosome="Chr 2"]')?.classList).toContain(
      'chromosome-in-cell--recombinant',
    );
  });

  it('emits chromosome selection from both the cell and accessible controls', () => {
    const selected: string[] = [];
    component.chromosomeSelected.subscribe((chromosome) => selected.push(chromosome));
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('[data-chromosome="Chr 3"]')?.click();
    element.querySelectorAll<HTMLButtonElement>('.chromosome-controls button')[3].click();

    expect(selected).toEqual(['Chr 3', 'Chr 4']);
  });

  it('shows a large selected chromosome and emits its locus in inspection mode', () => {
    const visual = viewportItem('Chr 1');
    const loci: CellChromosomeLocusSelection[] = [];
    component.locusSelected.subscribe((selection) => loci.push(selection));
    fixture.componentRef.setInput('chromosomes', [visual]);
    fixture.componentRef.setInput('selectedChromosome', 'Chr 1');
    fixture.componentRef.setInput('layout', 'inspect');
    fixture.componentRef.setInput('locusSelectable', true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('app-chromosome-svg').length).toBe(2);
    element
      .querySelector<SVGGElement>('.inspection-panel [data-locus="CH1-G1"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(loci).toEqual([{ chromosomeId: 'Chr 1', locus: 'CH1-G1' }]);
  });

  it('renders an unselected, control-free compact cell for inventory cards', () => {
    fixture.componentRef.setInput('layout', 'thumbnail');
    fixture.componentRef.setInput('selectedChromosome', null);
    fixture.componentRef.setInput('selectable', false);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.chromosome-in-cell').length).toBe(5);
    expect(element.querySelector('.chromosome-in-cell--selected')).toBeNull();
    expect(element.querySelector('.chromosome-controls')).toBeNull();
    expect(element.querySelector('.selection-readout')).toBeNull();
  });
});

function viewportItem(
  chromosome: 'Chr 1' | 'Chr 2' | 'Chr 3' | 'Chr 4' | 'Chr X',
  recombinant = false,
  label: string = chromosome,
): CellChromosomeViewportItem {
  const visual = chromosomeVisual(label);
  return {
    id: chromosome,
    label,
    recombinant,
    model: {
      length: visual.length,
      leftLabel: `${label.replace('Chr ', '')}p`,
      rightLabel: `${label.replace('Chr ', '')}q`,
      centromere: visual.centromere,
      bands: visual.bands,
      loci: [{ position: 0.18, label: 'CH1-G1', color: '#ff6d68' }],
    },
  };
}
