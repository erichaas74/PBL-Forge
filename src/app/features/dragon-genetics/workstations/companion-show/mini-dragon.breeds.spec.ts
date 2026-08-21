import { miniPhenotypeFormId } from './mini-dragon.genetics';
import { MINI_DRAGON_BREEDS, MiniBreedId, miniBreed, miniBreedTargetPlan, } from './mini-dragon.breeds';

describe('mini dragon breed library', () => {
    it('publishes the five Society reference breeds', () => {
        expect(MINI_DRAGON_BREEDS.map((breed) => [breed.id, breed.name])).toEqual([
            ['puggle', 'Puggle Dragon'],
            ['fairy', 'Fairy Dragon'],
            ['triceratops', 'Triceratops Dragon'],
            ['imperial-serpent', 'Imperial Serpent Dragon'],
            ['amphiptere', 'Amphiptere'],
        ]);
    });

    it('defines every breed entirely from valid visible forms', () => {
        for (const breed of MINI_DRAGON_BREEDS) {
            expect(breed.targets.length).toBeGreaterThan(0);
            expect(new Set(breed.targets.map((target) => target.geneId)).size).toBe(breed.targets.length);
            for (const target of breed.targets) {
                expect(miniPhenotypeFormId(target.geneId, breed.exampleGenome), `${breed.name}: ${target.geneId}`).toBe(target.formId);
            }
        }
    });

    it('preserves the requested defining forms for each breed', () => {
        expect(targetIds('puggle')).toEqual([
            'frame:round',
            'muzzle:pug',
            'legs:waddler',
            'ears:button',
            'size:teacup',
        ]);
        expect(targetIds('fairy')).toEqual([
            'frame:balanced',
            'crest:frill',
            'ears:petal',
            'wings:broad',
            'tail:pom',
            'plumage:full',
        ]);
        expect(targetIds('triceratops')).toEqual([
            'crest:crown',
            'muzzle:long',
            'coat:fluffy',
            'legs:medium',
            'tail:star',
        ]);
        expect(targetIds('imperial-serpent')).toEqual([
            'frame:long',
            'wings:vestigial',
            'muzzle:long',
            'legs:waddler',
            'horns:straight',
            'crest:crown-frill',
            'tail:pom',
            'pattern:gold',
        ]);
        expect(targetIds('amphiptere')).toEqual([
            'frame:long',
            'wings:broad',
            'legs:waddler',
            'muzzle:long',
            'coat:sleek',
            'ears:sail',
            'tail:fork',
        ]);
    });

    it('flags forms that split or can hide alternatives in a pairing', () => {
        expect(planKinds('puggle')).toEqual(['fixed', 'fixed', 'fixed', 'fixed', 'fixed']);
        expect(planKinds('fairy')).toEqual([
            'splitting',
            'fixed',
            'splitting',
            'fixed',
            'fixed',
            'fixed',
        ]);
        expect(planKinds('triceratops')).toEqual(['fixed', 'fixed', 'fixed', 'splitting', 'masked']);
        expect(planKinds('imperial-serpent')).toEqual([
            'fixed',
            'fixed',
            'fixed',
            'fixed',
            'fixed',
            'splitting',
            'fixed',
            'fixed',
        ]);
        expect(planKinds('amphiptere')).toEqual([
            'fixed',
            'fixed',
            'fixed',
            'fixed',
            'masked',
            'fixed',
            'masked',
        ]);
    });
});

function targetIds(id: MiniBreedId): readonly string[] {
    return miniBreed(id).targets.map((target) => target.formId);
}

function planKinds(id: MiniBreedId): readonly string[] {
    return miniBreed(id).targets.map((target) => miniBreedTargetPlan(target).kind);
}
