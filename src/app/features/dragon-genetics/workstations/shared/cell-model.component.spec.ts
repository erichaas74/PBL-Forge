import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CellModelChromosome, CellModelComponent } from './cell-model.component';
import { CELL_NUCLEUS, cellViewBox } from './cell-model.geometry';
import { chromosomeVisual } from './dragon-chromosome.catalog';

describe('CellModelComponent', () => {
    let fixture: ComponentFixture<CellModelComponent>;
    let component: CellModelComponent;
    let element: HTMLElement;

    const chromosomes: readonly CellModelChromosome[] = [
        modelChromosome('Chr 1'),
        modelChromosome('Chr 2', true),
        modelChromosome('Chr 3'),
        modelChromosome('Chr 4'),
        modelChromosome('Chr X'),
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [CellModelComponent] });
        fixture = TestBed.createComponent(CellModelComponent);
        component = fixture.componentInstance;
        element = fixture.nativeElement as HTMLElement;
        fixture.componentRef.setInput('chromosomes', chromosomes);
        fixture.detectChanges();
    });

    it('draws one chromosome per record, positioned inside the nucleus', () => {
        const drawn = element.querySelectorAll<HTMLButtonElement>('.chromosome-in-cell');

        expect(drawn.length).toBe(5);
        expect(element.querySelectorAll('app-chromosome-svg').length).toBe(5);

        const view = cellViewBox();
        component.slots().forEach((slot) => {
            expect(Math.abs(slot.x - CELL_NUCLEUS.cx)).toBeLessThanOrEqual(CELL_NUCLEUS.rx);
            expect(Math.abs(slot.y - CELL_NUCLEUS.cy)).toBeLessThanOrEqual(CELL_NUCLEUS.ry);
        });
        drawn.forEach((button) => {
            expect(Number.parseFloat(button.style.left)).toBeGreaterThan(0);
            expect(Number.parseFloat(button.style.left)).toBeLessThan(100);
            expect(Number.parseFloat(button.style.width)).toBeGreaterThan(0);
        });
        expect(view.width).toBeGreaterThan(0);
    });

    it('draws the organelles a cell diagram is expected to show', () => {
        const kinds = [...element.querySelectorAll('[data-organelle]')].map((node) => node.getAttribute('data-organelle'));

        expect(new Set(kinds)).toEqual(new Set(['mitochondrion', 'golgi', 'lysosome', 'vacuole', 'smooth-er', 'centrosome']));
        expect(element.querySelectorAll('.cell-model__er-ribbon').length).toBe(2);
        expect(element.querySelectorAll('.cell-model__ribosome').length).toBeGreaterThan(20);
        expect(element.querySelector('.cell-model__nucleolus')).not.toBeNull();
        expect(element.querySelectorAll('.cell-model__pore').length).toBe(18);
    });

    it('drops the cytoplasm detail but keeps the cell and nucleus in simple mode', () => {
        fixture.componentRef.setInput('detail', 'simple');
        fixture.detectChanges();

        expect(element.querySelector('[data-organelle]')).toBeNull();
        expect(element.querySelector('.cell-model__membrane')).not.toBeNull();
        expect(element.querySelector('.cell-model__nucleus')).not.toBeNull();
        expect(element.querySelectorAll('.chromosome-in-cell').length).toBe(5);
    });

    it('emits the chromosome a student selects and marks it in the cell', () => {
        const selected: string[] = [];
        component.chromosomeSelected.subscribe((id) => selected.push(id));
        fixture.componentRef.setInput('selectedChromosome', 'Chr 2');
        fixture.detectChanges();

        element.querySelector<HTMLButtonElement>('[data-chromosome="Chr 3"]')?.click();

        expect(selected).toEqual(['Chr 3']);
        expect(element.querySelector('[data-chromosome="Chr 2"]')?.classList).toContain('chromosome-in-cell--selected');
        expect(element.querySelector('[data-chromosome="Chr 2"]')?.classList).toContain('chromosome-in-cell--recombinant');
    });

    it('does not emit a selection from a read-only cell', () => {
        const selected: string[] = [];
        component.chromosomeSelected.subscribe((id) => selected.push(id));
        fixture.componentRef.setInput('selectable', false);
        fixture.detectChanges();

        element.querySelector<HTMLButtonElement>('[data-chromosome="Chr 1"]')?.click();

        expect(selected).toEqual([]);
        expect(element.querySelector<HTMLButtonElement>('[data-chromosome="Chr 1"]')?.disabled).toBe(true);
    });

    it('names each chromosome and the cell for assistive technology', () => {
        expect(element.querySelector('[data-chromosome="Chr 1"]')?.getAttribute('aria-label')).toContain('single chromosome');

        fixture.componentRef.setInput('replicated', true);
        fixture.detectChanges();

        expect(element.querySelector('[data-chromosome="Chr 1"]')?.getAttribute('aria-label')).toContain('two sister chromatids joined at the centromere');
        expect(element.querySelectorAll('.chromosome-svg--replicated').length).toBe(5);
        expect(component.summary()).toContain('5 chromosomes inside the nucleus');
    });

    it('gives replicated chromosomes taller slots so they still fit the nucleus', () => {
        const single = component.slots().map((slot) => slot.height);
        fixture.componentRef.setInput('replicated', true);
        fixture.detectChanges();

        const joined = component.slots();
        expect(joined.every((slot, index) => slot.height > single[index])).toBe(true);
        expect(component.slotRatio()).toBeCloseTo(0.32, 5);
    });

    it('zooms the same model to the nucleus without changing the chromosome set', () => {
        expect(component.camera().scale).toBe(1);

        fixture.componentRef.setInput('focus', 'nucleus');
        fixture.detectChanges();

        expect(component.camera().scale).toBeGreaterThan(1);
        expect(component.view()).toEqual(cellViewBox());
        expect(element.querySelector('.cell-model')?.getAttribute('data-focus')).toBe('nucleus');
        expect(element.querySelector('.cell-model__camera')?.getAttribute('style')).toContain('scale(');
        expect(element.querySelectorAll('.chromosome-in-cell').length).toBe(5);
    });

    it('widens the zoomed frame as the chromosomes travel to the poles', () => {
        fixture.componentRef.setInput('focus', 'nucleus');
        fixture.detectChanges();
        const held = component.camera().scale;

        fixture.componentRef.setInput('stage', 'anaphase');
        fixture.detectChanges();

        expect(component.camera().scale).toBeLessThan(held);
        expect(component.camera().scale).toBeGreaterThanOrEqual(1);
    });

    it('moves the chromosomes and the envelope through the division stages', () => {
        expect(element.querySelectorAll('.cell-model__nucleus').length).toBe(1);
        expect(element.querySelector('.cell-model__spindle')).toBeNull();

        fixture.componentRef.setInput('stage', 'metaphase');
        fixture.detectChanges();
        const plate = component.slots();

        expect(element.querySelectorAll('.cell-model__nucleus').length).toBe(0);
        expect(element.querySelectorAll('.cell-model__fibre').length).toBe(10);
        expect(element.querySelector('.cell-model__equator')).not.toBeNull();
        expect(new Set(plate.map((slot) => slot.x)).size).toBe(1);

        fixture.componentRef.setInput('stage', 'metaphase-i');
        fixture.detectChanges();

        expect(new Set(component.slots().map((slot) => slot.x)).size).toBe(2);
        expect(element.querySelector('.cell-model__equator')).not.toBeNull();

        fixture.componentRef.setInput('stage', 'anaphase');
        fixture.detectChanges();
        const poles = component.slots();

        expect(poles.filter((slot) => slot.x < 120).length).toBe(3);
        expect(poles.filter((slot) => slot.x > 120).length).toBe(2);
        expect(element.querySelectorAll('.cell-model__fibre').length).toBe(5);
        expect(element.querySelector('.cell-model__equator')).toBeNull();

        fixture.componentRef.setInput('stage', 'telophase');
        fixture.detectChanges();

        expect(element.querySelectorAll('.cell-model__nucleus').length).toBe(2);
        expect(component.cleavage()).toBeGreaterThan(0.5);
        expect(component.membranePath()).not.toBe(component.membraneInnerPath());
    });

    it('turns the plate, the poles, and the furrow when the cell divides end to end', () => {
        fixture.componentRef.setInput('axis', 'vertical');
        fixture.componentRef.setInput('stage', 'metaphase');
        fixture.detectChanges();

        expect(element.querySelector('.cell-model')?.getAttribute('data-axis')).toBe('vertical');
        // One row across the middle rather than a column down it.
        expect(new Set(component.slots().map((slot) => slot.y)).size).toBe(1);
        expect(new Set(component.slots().map((slot) => slot.x)).size).toBe(5);
        expect(Number(component.spindlePoles().a.x)).toBe(Number(component.spindlePoles().b.x));

        const plate = component.equator();
        expect(plate?.y1).toBe(plate?.y2);
        expect(plate?.x1).not.toBe(plate?.x2);

        fixture.componentRef.setInput('stage', 'anaphase');
        fixture.detectChanges();

        expect(component.slots().filter((slot) => slot.y < 80).length).toBe(3);
        expect(component.slots().filter((slot) => slot.y > 80).length).toBe(2);

        fixture.componentRef.setInput('stage', 'telophase');
        fixture.detectChanges();

        const nuclei = component.nuclei();
        expect(nuclei.length).toBe(2);
        expect(nuclei[0].cx).toBe(nuclei[1].cx);
        expect(nuclei[0].cy).toBeLessThan(nuclei[1].cy);
    });

    it('labels the drawn structures only when the diagram asks for it', () => {
        expect(element.querySelectorAll('.cell-model__annotation').length).toBe(0);

        fixture.componentRef.setInput('annotated', true);
        fixture.detectChanges();

        const labels = [...element.querySelectorAll('.cell-model__annotation-text')].map((node) => node.textContent?.trim());
        expect(labels).toContain('Cell membrane');
        expect(labels).toContain('Nuclear envelope');
        expect(labels).toContain('Mitochondrion');
        expect(labels).toContain('Golgi apparatus');
    });

    it('offers a nucleus target that zooms without stealing chromosome clicks', () => {
        let focused = 0;
        component.nucleusSelected.subscribe(() => (focused += 1));
        fixture.componentRef.setInput('nucleusAction', 'Focus nucleus');
        fixture.detectChanges();

        const action = element.querySelector<HTMLButtonElement>('.cell-model__nucleus-action');
        expect(action?.textContent?.trim()).toBe('Focus nucleus');
        action?.click();
        expect(focused).toBe(1);

        fixture.componentRef.setInput('stage', 'metaphase');
        fixture.detectChanges();
        expect(element.querySelector('.cell-model__nucleus-action')).toBeNull();
    });

    it('shows an empty cell rather than a broken one when nothing is loaded', () => {
        fixture.componentRef.setInput('chromosomes', []);
        fixture.detectChanges();

        expect(element.querySelectorAll('.chromosome-in-cell').length).toBe(0);
        expect(element.querySelector('.cell-model__empty')?.textContent).toContain('No chromosomes available');
        expect(element.querySelector('.cell-model__membrane')).not.toBeNull();
    });
});

function modelChromosome(label: string, recombinant = false): CellModelChromosome {
    const visual = chromosomeVisual(label);
    return {
        id: label,
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
