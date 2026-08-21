import { ComponentFixture, TestBed } from '@angular/core/testing';
import { stubSpecimenThumbnailRendering } from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { AccountGeneticsLibraryService } from './account-genetics-library.service';
import { DragonChromosomeSelection, DragonChromosomeSelectorComponent, DragonGeneSelection, } from './dragon-chromosome-selector.component';

describe('DragonChromosomeSelectorComponent', () => {
    let fixture: ComponentFixture<DragonChromosomeSelectorComponent>;
    let selector: DragonChromosomeSelectorComponent;

    beforeEach(() => {
        stubSpecimenThumbnailRendering();
        TestBed.configureTestingModule({ imports: [DragonChromosomeSelectorComponent] });
        fixture = TestBed.createComponent(DragonChromosomeSelectorComponent);
        const dragons = TestBed.inject(AccountGeneticsLibraryService).recordsFor('selector-spec').dragons;
        fixture.componentRef.setInput('dragons', dragons);
        selector = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('shows one selected dragon with five selectable homologous chromosome pairs', () => {
        const element = fixture.nativeElement as HTMLElement;

        expect(selector.selectedDragon()).toBe(selector.dragons()[0]);
        expect(selector.cellChromosomes().length).toBe(5);
        expect(selector.cellChromosomes().every((item) => item.pairedModel)).toBe(true);
        expect(element.querySelectorAll('.fanned-deck__slot').length).toBe(selector.dragons().length);
        expect(element.querySelectorAll('.is-active .chromosome-in-cell').length).toBe(5);
        expect(element.querySelectorAll('.is-active .chromatid').length).toBe(10);
        expect(element.querySelector('.is-next .fanned-deck__peek')?.textContent).toContain(selector.dragons()[1].name);
    });

    it('updates the rendered sex chromosomes when another dragon is selected', () => {
        const xyDragon = selector.dragons().find((dragon) => dragon.sex === 'male')!;
        const emittedIds: string[] = [];
        selector.dragonSelected.subscribe((dragon) => emittedIds.push(dragon.id));

        selector.selectDragon(xyDragon);
        fixture.detectChanges();

        expect(emittedIds).toEqual([xyDragon.id]);
        expect(selector.selectedDragon()).toBe(xyDragon);
        expect(selector.cellChromosomes().at(-1)?.shortLabel).toBe('XY');
        const sexPair = selector.chromosomePairs().at(-1)!;
        expect(sexPair.paternal.leftLabel).toBe('Yp');
    });

    it('emits the dragon and chromosome together when a pair is selected', () => {
        const selections: DragonChromosomeSelection[] = [];
        selector.chromosomeSelected.subscribe((value) => selections.push(value));

        selector.selectChromosome('Chr 3');
        fixture.detectChanges();

        expect(selections[0].dragon.id).toBe(selector.selectedDragon()?.id);
        expect(selections[0].chromosome).toBe('Chr 3');
        expect(selector.selectedChromosome()?.id).toBe('Chr 3');
        expect(selector.selectedGeneCount()).toBe(3);
        expect((fixture.nativeElement as HTMLElement).querySelector('.is-active [data-chromosome="Chr 3"]')
            ?.classList).toContain('chromosome-in-cell--selected');
    });

    it('emits a selectable gene from the active chromosome side of the card', () => {
        const selections: DragonGeneSelection[] = [];
        selector.geneSelected.subscribe((value) => selections.push(value));
        selector.selectChromosome('Chr 3');

        selector.selectGene('body-color');
        fixture.detectChanges();

        expect(selections).toEqual([
            {
                dragon: selector.selectedDragon()!,
                chromosome: 'Chr 3',
                geneId: 'body-color',
            },
        ]);
        expect((fixture.nativeElement as HTMLElement).querySelectorAll('.dragon-card__gene').length).toBeGreaterThan(0);
    });

    it('keeps flip state on the active card while exposing the chromosome cell', () => {
        const dragon = selector.selectedDragon()!;

        selector.toggleCard(dragon.id);
        fixture.detectChanges();

        expect(selector.isCardFlipped(dragon.id)).toBe(true);
        expect((fixture.nativeElement as HTMLElement).querySelector('.is-active app-dragon-flip-card')
            ?.classList).not.toBeNull();
        expect((fixture.nativeElement as HTMLElement).querySelector('.is-active .dragon-card-shell.is-flipped')).not.toBeNull();
    });
});
