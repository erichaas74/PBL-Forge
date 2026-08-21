import { ComponentFixture, TestBed } from '@angular/core/testing';
import { stubSpecimenThumbnailRendering, stubSpecimenViewportRendering, } from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { DRAGON_PARENTS } from '../../simulation/domain/dragon-inheritance';
import { AccountDragonRecord } from '../shared/account-genetics-library.models';
import { chromosomeVisual } from '../shared/dragon-chromosome.catalog';
import { geneDnaRecord } from '../shared/dragon-gene-dna.catalog';
import { GenomeMicroscopeComponent } from './genome-microscope.component';

const TEST_DRAGONS: readonly AccountDragonRecord[] = DRAGON_PARENTS.slice(0, 2).map((dragon, index) => ({
    ...dragon,
    kind: 'dragon' as const,
    sex: index === 0 ? ('female' as const) : ('male' as const),
    source: 'foundation' as const,
    storedAtIso: '2026-01-01T00:00:00.000Z',
    generation: 0,
}));

describe('GenomeMicroscopeComponent', () => {
    let fixture: ComponentFixture<GenomeMicroscopeComponent>;
    let microscope: GenomeMicroscopeComponent;

    beforeEach(() => {
        stubSpecimenThumbnailRendering();
        stubSpecimenViewportRendering();
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
        expect(element.querySelector('app-dragon-card-deck-selector')).not.toBeNull();
        expect(element.querySelector('.specimen-loader select')).toBeNull();
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

    it('adds an interactive chromosome-unpacking level between chromosome and gene', () => {
        microscope.selectChromosome('Chr 1');
        expect(microscope.level()).toBe('chromosome');

        microscope.zoomIn();
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        expect(microscope.level()).toBe('chromatin');
        expect(element.querySelector('app-chromosome-unraveling')).not.toBeNull();
        expect(element.querySelectorAll('.unravel-frame').length).toBe(5);

        microscope.zoomIn();
        expect(microscope.level()).toBe('gene');
    });

    it('reuses the shared cell model and chromosome presentation components', () => {
        const element = fixture.nativeElement as HTMLElement;

        microscope.selectLevel('cell');
        fixture.detectChanges();
        expect(element.querySelector('app-cell-model')).not.toBeNull();
        expect(element.querySelectorAll('.cell-level app-cell-model [data-organelle]').length).toBeGreaterThan(0);
        expect(element.querySelectorAll('.cell-level app-cell-model .cell-model__annotation-text').length).toBe(0);
        expect(element.querySelectorAll('.cell-level app-cell-model .chromosome-in-cell').length).toBe(microscope.cellChromosomePairs().length);

        microscope.selectLevel('nucleus');
        fixture.detectChanges();
        expect(element
            .querySelector('.nucleus-level app-cell-model .cell-model')
            ?.getAttribute('data-focus')).toBe('cell');
        expect(element.querySelectorAll('.nucleus-level .chromosome-in-cell').length).toBe(5);
        expect(element.querySelectorAll('.nucleus-level .chromatid').length).toBe(10);

        microscope.selectChromosome('Chr 1');
        fixture.detectChanges();
        expect(element.querySelector('app-cell-chromosome-viewport')).not.toBeNull();
    });

    it('opens a chromosome from the nucleus directly into a linked cell and gene view', () => {
        microscope.selectLevel('nucleus');
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        const chromosome = element.querySelector<HTMLButtonElement>('.nucleus-level .chromosome-in-cell[data-chromosome="Chr 2"]');
        expect(chromosome).not.toBeNull();
        chromosome?.click();
        fixture.detectChanges();

        expect(microscope.level()).toBe('gene');
        expect(microscope.selectedChromosome()).toBe('Chr 2');
        expect(microscope.activeGene()?.chromosome).toBe('Chr 2');
        expect(element.querySelector('.gene-level .cell-panel app-cell-model')).not.toBeNull();
        expect(element.querySelector('.gene-level .inspection-panel app-chromosome-svg')).not.toBeNull();
    });

    it('updates the chromosome barcode emphasis when a gene button is selected', () => {
        microscope.selectLevel('gene');
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        const genes = microscope.genesForSelectedChromosome();
        const buttons = element.querySelectorAll<HTMLButtonElement>('.gene-level .gene-picker button');
        expect(buttons.length).toBe(genes.length);

        buttons[1].click();
        fixture.detectChanges();

        expect(microscope.activeGene()?.id).toBe(genes[1].id);
        const chromosome = element.querySelector<SVGSVGElement>('.gene-level .inspection-panel .chromosome-svg');
        expect(chromosome?.dataset['selectedLocus']).toBe(genes[1].sampleCode);
        expect(chromosome?.querySelector(`[data-locus="${genes[1].sampleCode}"]`)?.classList).toContain('gene-locus--active');
        expect(chromosome?.querySelectorAll('.gene-locus--muted').length).toBeGreaterThan(0);
        expect(chromosome?.querySelectorAll('.barcode-highlight').length).toBe(2);
    });

    it('uses the shared chromosome band source without duplicating colors', () => {
        const pair = microscope.chromosomePairs()[0];
        expect(pair.maternal.bands).toBe(chromosomeVisual('Chr 1').bands);
        expect(pair.paternal.bands).toBe(chromosomeVisual('Chr 1').bands);
    });

    it('gives every released gene locus a colored DNA barcode', () => {
        for (const pair of microscope.chromosomePairs()) {
            for (const chromosome of [pair.maternal, pair.paternal]) {
                for (const locus of chromosome.loci) {
                    expect(locus.marking, `${pair.id} ${locus.label} should have a barcode`).toBeDefined();
                    expect(locus.marking?.barcode.length).toBeGreaterThanOrEqual(5);
                    expect(locus.marking?.barcode.every((stripe) => Boolean(stripe.topColor))).toBe(true);
                }
            }
        }
    });

    it('derives XX or XY from the loaded dragon record', () => {
        microscope.loadDragon(TEST_DRAGONS[1].id);
        fixture.detectChanges();

        const sexPair = microscope.chromosomePairs().find((pair) => pair.kind === 'sex');
        expect(sexPair?.label).toContain('XY');
        expect(sexPair?.maternal.length).toBe(chromosomeVisual('Chr X').length);
        expect(sexPair?.paternal.length).toBe(chromosomeVisual('Chr Y').length);
        expect(sexPair?.id).toBe('Chr X');
        expect(microscope.cellChromosomePairs().at(-1)?.shortLabel).toBe('XY');
    });

    it('keeps the X chromosome selection linked to the sex-chromosome pair', () => {
        microscope.selectChromosome('Chr X');

        expect(microscope.activePair()?.kind).toBe('sex');
        expect(microscope.activePair()?.id).toBe('Chr X');
        expect(microscope.activeGene()?.id).toBe('eye-color');
    });

    it('opens a selected chromosome, gene, DNA, allele, RNA, base chemistry, protein, enzyme, and expression model from shared records', () => {
        microscope.selectChromosome('Chr 2');
        expect(microscope.level()).toBe('chromosome');
        expect(microscope.genesForSelectedChromosome().length).toBe(3);

        const gene = microscope.genesForSelectedChromosome()[1];
        microscope.selectGene(gene.id);
        expect(microscope.level()).toBe('gene');
        expect(microscope.activeGene()?.sampleCode).toBe(gene.sampleCode);
        expect(microscope.activeAlleles().length).toBe(2);
        expect(microscope.activeAlleles()[0].modelSequence.length).toBe(24);

        microscope.selectLevel('dna');
        expect(microscope.activeDnaSequence().length).toBeGreaterThan(0);
        microscope.selectAlleleCopy(1);
        expect(microscope.level()).toBe('allele');
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelector('.base-sequence .nucleotide-base')).not.toBeNull();
        microscope.selectAlleleCopy(0);
        microscope.selectLevel('rna');
        expect(microscope.activeRnaSequence()).toContain('U');
        microscope.selectLevel('base-chemistry');
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelector('app-dna-rna-base-explorer')).not.toBeNull();
        microscope.selectLevel('protein');
        expect(microscope.proteinCodons().length).toBe(8);
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelector('app-rna-translation-animation')).not.toBeNull();

        microscope.selectLevel('enzyme');
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelector('app-enzyme-reaction-explorer')).not.toBeNull();

        microscope.selectLevel('expression');
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelector('app-protein-trait-expression')).not.toBeNull();
    });

    it('shows the protein the selected allele copy codes for, and where it goes next', () => {
        microscope.selectGene('legs');
        microscope.selectLevel('protein');
        fixture.detectChanges();

        const record = geneDnaRecord('legs');
        const element = fixture.nativeElement as HTMLElement;
        const card = element.querySelector('.protein-identity');

        expect(microscope.activeProtein()?.proteinId).toBe(record.protein.proteinId);
        expect(card?.textContent).toContain(record.protein.name);
        expect(card?.textContent).toContain(record.protein.roleLabel);
        expect(card?.querySelector('.protein-body')?.getAttribute('d')).toBe(microscope.activeProteinForm()?.shapePath ?? '');

        // Each allele copy resolves to the protein its own strand translates into.
        for (const copy of [0, 1] as const) {
            microscope.selectedAlleleCopy.set(copy);
            const expected = record.alleles.find((allele) => allele.sequence.slice(0, 24) === microscope.activeDnaSequence());
            expect(microscope.activeProteinForm()).toBe(expected?.protein ?? record.alleles[0].protein);
        }
    });

    it('emits a reusable evidence selection for an external explanation or question host', () => {
        const evidence: unknown[] = [];
        const modelSelections: string[] = [];
        fixture.componentRef.instance.evidenceChanged.subscribe((event) => evidence.push(event));
        fixture.componentRef.instance.modelSelected.subscribe((nodeId) => modelSelections.push(nodeId));

        microscope.selectGene('wings');
        expect(evidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                level: 'gene',
                dragonId: TEST_DRAGONS[0].id,
                chromosome: 'Chr 1',
                geneId: 'wings',
            }),
        ]));

        microscope.recordEnzymeReaction({
            enzymeId: 'ember-synthase',
            productId: 'ember-fuel',
            productName: 'Ember-fuel vesicle',
            totalBuilt: 1,
        });
        expect(evidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                level: 'enzyme',
                enzymeId: 'ember-synthase',
                productId: 'ember-fuel',
            }),
        ]));
        expect(modelSelections).not.toContain('allele');
    });
});
