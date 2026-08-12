import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChromosomeSvgComponent, ChromosomeSvgModel } from './chromosome-svg.component';

describe('ChromosomeSvgComponent', () => {
  let fixture: ComponentFixture<ChromosomeSvgComponent>;

  const chromosome: ChromosomeSvgModel = {
    length: 0.8,
    leftLabel: '1p',
    rightLabel: '1q',
    centromere: 0.4,
    bands: [
      { start: 0, end: 0.25, color: '#b9dbc7' },
      { start: 0.25, end: 0.4, color: '#efaab2', pattern: 'hatch' },
      { start: 0.4, end: 1, color: '#aeb9d8' },
    ],
    loci: [{ position: 0.58, label: 'WNG-17', symbol: 'CH1-G1a', color: '#49a8ff' }],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChromosomeSvgComponent] }).compileComponents();
    fixture = TestBed.createComponent(ChromosomeSvgComponent);
    fixture.componentRef.setInput('chromosome', chromosome);
    fixture.componentRef.setInput('selectedLocus', 'WNG-17');
    fixture.detectChanges();
  });

  it('renders bands, hatching, and the selected allele entirely from input data', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('[data-band-start]').length).toBe(3);
    expect(element.querySelectorAll('pattern').length).toBe(3);
    expect(element.querySelector('[data-pattern="hatch"]')).not.toBeNull();
    expect(element.querySelector('.gene-locus--active')).not.toBeNull();
    expect(element.querySelector('.allele-symbol')?.textContent?.trim()).toBe('CH1-G1a');
    expect(element.textContent).toContain('1p');
    expect(element.textContent).toContain('1q');
  });

  it('maps normalized length, bands, centromere, and loci to SVG coordinates', () => {
    const element = fixture.nativeElement as HTMLElement;
    const bands = element.querySelectorAll<SVGRectElement>('[data-band-start]');
    const marker = element.querySelector<SVGLineElement>('.gene-marker');
    const centromere = element.querySelector<SVGLineElement>('.centromere-line');

    expect(Number(bands[0].getAttribute('x'))).toBeCloseTo(8);
    expect(Number(bands[0].getAttribute('width'))).toBeCloseTo(16.8);
    expect(Number(marker?.getAttribute('x1'))).toBeCloseTo(46.976);
    expect(Number(centromere?.getAttribute('x1'))).toBeCloseTo(34.88);
  });

  it('redraws when the chromosome model changes', () => {
    fixture.componentRef.setInput('chromosome', {
      length: 1,
      leftLabel: '2p',
      rightLabel: '2q',
      centromere: 0.65,
      bands: [{ start: 0, end: 1, color: '#f8e78c' }],
      loci: [{ position: 0.2, label: 'ALT-2', symbol: 'a', color: '#67d790' }],
    } satisfies ChromosomeSvgModel);
    fixture.componentRef.setInput('selectedLocus', 'ALT-2');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('[data-band-start]').length).toBe(1);
    expect(element.querySelector('.locus-label')?.textContent).toBe('ALT-2');
    expect(element.querySelector('.allele-symbol')?.textContent).toBe('a');
  });

  it('renders a neutral chromosome without loci until a sample is loaded', () => {
    fixture.componentRef.setInput('placeholder', true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.chromosome-svg--placeholder')).not.toBeNull();
    expect(element.querySelectorAll('.chromosome-band--placeholder').length).toBe(3);
    expect(element.querySelector('.gene-locus')).toBeNull();
    expect(element.querySelector('.allele-symbol')).toBeNull();
    expect(element.querySelector('[fill="#b9dbc7"]')).toBeNull();
  });

  it('emits a locus selection from the interactive chromosome', () => {
    let selected = '';
    fixture.componentRef.setInput('interactive', true);
    fixture.componentInstance.locusSelected.subscribe((locus) => (selected = locus));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<SVGGElement>('[data-locus="WNG-17"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(selected).toBe('WNG-17');
  });
});
