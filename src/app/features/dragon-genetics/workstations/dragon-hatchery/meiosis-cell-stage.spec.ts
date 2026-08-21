import { DRAGON_PARENTS } from '../../simulation/domain/dragon-inheritance';
import { generateMeiosisRun } from './meiosis-gamete.domain';
import { MEIOSIS_PHASE_COUNT, meiosisGameteCellChromosomes, meiosisStageView, } from './meiosis-cell-stage';
import { MeiosisRun } from './meiosis-gamete.models';

describe('meiosis cell stage', () => {
    let run: MeiosisRun;

    beforeEach(() => {
        run = generateMeiosisRun(DRAGON_PARENTS[0], 'female', 'stage-spec', 'scales');
    });

    it('opens and closes on the whole cell, and zooms to the nucleus for every division', () => {
        const focusByPhase = Array.from({ length: MEIOSIS_PHASE_COUNT }, (_, phase) => meiosisStageView(run, phase).focus);

        expect(focusByPhase).toEqual([
            'cell',
            'cell',
            'nucleus',
            'nucleus',
            'nucleus',
            'nucleus',
            'nucleus',
            'nucleus',
            'nucleus',
            'cell',
        ]);
    });

    it('divides meiosis II across meiosis I rather than the same way again', () => {
        const axisByPhase = Array.from({ length: MEIOSIS_PHASE_COUNT }, (_, phase) => meiosisStageView(run, phase).cells.map((cell) => cell.axis));

        expect(axisByPhase).toEqual([
            ['horizontal'],
            ['horizontal'],
            ['horizontal'],
            ['horizontal'],
            ['horizontal'],
            ['horizontal'],
            ['vertical', 'vertical'],
            ['vertical', 'vertical'],
            ['vertical', 'vertical'],
            ['horizontal', 'horizontal', 'horizontal', 'horizontal'],
        ]);
    });

    it('starts as one diploid cell of ten unreplicated chromosomes', () => {
        const view = meiosisStageView(run, 0);

        expect(view.cells.length).toBe(1);
        expect(view.cells[0].stage).toBe('interphase');
        expect(view.cells[0].chromosomes.length).toBe(10);
        expect(view.cells[0].chromosomes.every((item) => !item.pairedModel)).toBe(true);
    });

    it('replicates every chromosome into two identical sister chromatids at S phase', () => {
        const view = meiosisStageView(run, 1);

        expect(view.cells[0].chromosomes.length).toBe(10);
        view.cells[0].chromosomes.forEach((item) => {
            expect(item.pairedModel).toBeDefined();
            expect(item.pairRelationship).toBe('sister-chromatids');
            // Crossing over is prophase I, so nothing has been exchanged yet.
            expect(item.pairedModel).toEqual(item.model);
            expect(item.recombinant).toBe(false);
        });
    });

    it('shows no recombination before the pairs cross over in prophase I', () => {
        [0, 1].forEach((phase) => {
            expect(meiosisStageView(run, phase).cells[0].chromosomes.some((item) => item.recombinant)).toBe(false);
        });

        expect(meiosisStageView(run, 2).cells[0].chromosomes.some((item) => item.recombinant)).toBe(true);
    });

    it('holds five homologous pairs together through prophase I', () => {
        const view = meiosisStageView(run, 2);

        expect(view.cells[0].stage).toBe('prophase');
        expect(view.cells[0].chromosomes.length).toBe(5);
        view.cells[0].chromosomes.forEach((item) => {
            expect(item.pairRelationship).toBe('homologous-pair');
        });
        expect(view.cells[0].chromosomes.some((item) => item.recombinant)).toBe(true);
    });

    it('lines the pairs up two abreast on the meiosis I plate', () => {
        const view = meiosisStageView(run, 3);

        expect(view.cells[0].stage).toBe('metaphase-i');
        expect(view.cells[0].chromosomes.length).toBe(10);
    });

    it('sends each daughter cell exactly the chromosomes its two gametes keep', () => {
        const separating = meiosisStageView(run, 4).cells[0].chromosomes;
        const daughters = meiosisStageView(run, 6).cells;

        expect(meiosisStageView(run, 4).cells[0].stage).toBe('anaphase');
        expect(separating.length).toBe(10);
        expect(daughters.length).toBe(2);
        daughters.forEach((cell) => expect(cell.chromosomes.length).toBe(5));

        // The first half travels to the first pole, which is the first daughter cell.
        expect(separating.slice(0, 5).map((item) => item.id)).toEqual(daughters[0].chromosomes.map((item) => item.id));
        expect(separating.slice(5).map((item) => item.id)).toEqual(daughters[1].chromosomes.map((item) => item.id));
    });

    it('reforms two nuclei at telophase I without moving the chromosomes again', () => {
        const anaphase = meiosisStageView(run, 4).cells[0];
        const telophase = meiosisStageView(run, 5).cells[0];

        expect(telophase.stage).toBe('telophase');
        expect(telophase.chromosomes.map((item) => item.id)).toEqual(anaphase.chromosomes.map((item) => item.id));
    });

    it('separates the sisters in both cells at anaphase II', () => {
        const view = meiosisStageView(run, 8);

        expect(view.cells.length).toBe(2);
        view.cells.forEach((cell) => {
            expect(cell.stage).toBe('anaphase');
            expect(cell.chromosomes.length).toBe(10);
            expect(cell.chromosomes.every((item) => !item.pairedModel)).toBe(true);
            expect(new Set(cell.chromosomes.map((item) => item.id)).size).toBe(10);
        });
    });

    it('closes on four whole gamete cells before the cards take over', () => {
        const view = meiosisStageView(run, 9);

        expect(view.focus).toBe('cell');
        expect(view.cells.length).toBe(4);
        expect(view.cells.map((cell) => cell.label)).toEqual([
            'Gamete 1',
            'Gamete 2',
            'Gamete 3',
            'Gamete 4',
        ]);
        view.cells.forEach((cell, index) => {
            expect(cell.stage).toBe('interphase');
            expect(cell.chromosomes.length).toBe(5);
            expect(cell.chromosomes.every((item) => !item.pairedModel)).toBe(true);
            // The same five chromosomes the matching gamete card then shows.
            expect(cell.chromosomes.map((item) => item.model.loci)).toEqual(meiosisGameteCellChromosomes(run, index).map((item) => item.model.loci));
        });
    });

    it('separates in anaphase II exactly what each gamete ends up carrying', () => {
        const firstCell = meiosisStageView(run, 8).cells[0].chromosomes;
        const gameteOne = meiosisGameteCellChromosomes(run, 0);

        expect(firstCell.slice(0, 5).map((item) => item.model.loci)).toEqual(gameteOne.map((item) => item.model.loci));
    });

    it('draws nothing before a run exists', () => {
        expect(meiosisStageView(null, 0)).toEqual({ cells: [], focus: 'cell' });
    });
});
