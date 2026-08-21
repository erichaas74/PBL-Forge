import { PEDIGREE_NODE_SPACING, layoutPedigree, visiblePedigreeIds, } from './pedigree-layout';
import { PEDIGREE_ARCHIVE } from './pedigree-population';

function layout(focusId: string, ancestorDepth = 2, descendantDepth = 3) {
    return layoutPedigree({
        population: PEDIGREE_ARCHIVE,
        focusId,
        ancestorDepth,
        descendantDepth,
    });
}

describe('pedigree layout', () => {
    it('puts each generation on its own row, oldest at the top', () => {
        const result = layout('vyrak');
        const rowY = new Map(result.rows.map((row) => [row.generation, row.y]));

        for (const node of result.nodes) {
            expect(node.y).toBe(rowY.get(node.generation) as number);
        }
        const ys = result.rows.map((row) => row.y);
        expect([...ys].sort((left, right) => left - right)).toEqual(ys);
    });

    it('centres a sibship under the couple it descends from', () => {
        const result = layout('vyrak');

        for (const union of result.unions) {
            const midpoint = (union.motherX + union.fatherX) / 2;
            const centre = union.childXs.reduce((sum, value) => sum + value, 0) / union.childXs.length;
            // Half a slot of tolerance: a block can give way when a row is crowded,
            // but the descent line must still land on its own children.
            expect(Math.abs(centre - midpoint), `${union.id} sibship centre`).toBeLessThanOrEqual(PEDIGREE_NODE_SPACING / 2);
        }
    });

    it('never leaves a descent line hanging beside its sibship', () => {
        for (const focusId of ['vyrak', 'sable', 'ilira', 'korrak', 'arkon']) {
            const result = layout(focusId, 3, 3);
            for (const union of result.unions) {
                const midpoint = (union.motherX + union.fatherX) / 2;
                const start = Math.min(midpoint, ...union.childXs);
                const end = Math.max(midpoint, ...union.childXs);
                expect(midpoint, `${focusId}/${union.id}`).toBeGreaterThanOrEqual(start);
                expect(midpoint, `${focusId}/${union.id}`).toBeLessThanOrEqual(end);
            }
        }
    });

    it('keeps every dragon in a row at least one slot apart', () => {
        const result = layout('vyrak', 3, 4);
        const byRow = new Map<number, number[]>();
        for (const node of result.nodes) {
            byRow.set(node.generation, [...(byRow.get(node.generation) ?? []), node.x]);
        }
        for (const [generation, xs] of byRow) {
            const sorted = [...xs].sort((left, right) => left - right);
            for (let index = 1; index < sorted.length; index += 1) {
                expect(sorted[index] - sorted[index - 1], `generation ${generation}`).toBeGreaterThanOrEqual(PEDIGREE_NODE_SPACING - 0.001);
            }
        }
    });

    it('draws every visible dragon inside the canvas it reports', () => {
        const result = layout('vyrak', 3, 4);

        for (const node of result.nodes) {
            expect(node.x).toBeGreaterThan(0);
            expect(node.x).toBeLessThan(result.width);
            expect(node.y).toBeLessThan(result.height);
        }
    });

    it('opens only the generations the student asked for', () => {
        const shallow = visiblePedigreeIds({
            population: PEDIGREE_ARCHIVE,
            focusId: 'vyrak',
            ancestorDepth: 0,
            descendantDepth: 1,
        });

        expect(shallow.has('vyrak')).toBe(true);
        expect(shallow.has('kaenor')).toBe(true);
        // A grandchild is two steps down and stays closed at this depth.
        expect(shallow.has('ivrid')).toBe(false);
    });
});
