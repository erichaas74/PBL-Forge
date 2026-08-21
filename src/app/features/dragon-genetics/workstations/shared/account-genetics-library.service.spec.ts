import { AccountGeneticsLibraryService } from './account-genetics-library.service';

describe('AccountGeneticsLibraryService', () => {
    const studentId = 'account-library-spec-student';
    let library: AccountGeneticsLibraryService;

    beforeEach(() => {
        localStorage.removeItem(`pbl-forge.dragon-genetics.account-library.v1.${studentId}`);
        library = new AccountGeneticsLibraryService();
    });

    afterEach(() => {
        localStorage.removeItem(`pbl-forge.dragon-genetics.account-library.v1.${studentId}`);
    });

    it('starts an account with the shared founder dragons and derived chromosome records', () => {
        const snapshot = library.recordsFor(studentId);

        expect(snapshot.dragons.length).toBe(4);
        expect(snapshot.dragons.filter((dragon) => dragon.sex === 'female').length).toBe(2);
        expect(snapshot.dragons.filter((dragon) => dragon.sex === 'male').length).toBe(2);
        expect(snapshot.chromosomes.length).toBe(snapshot.dragons.length * 4);
        const ember = snapshot.dragons.find((dragon) => dragon.id === 'ember')!;
        const emberChr1 = snapshot.chromosomes.find((record) => record.id === 'ember:chr-1')!;
        expect(emberChr1.dragonId).toBe(ember.id);
        expect(emberChr1.traitId).toBe('wings');
        expect(emberChr1.alleles).toEqual(ember.genome.wings);
    });

    it('persists student dragons and derives their chromosomes from the saved genome', () => {
        const founder = library.recordsFor(studentId).dragons[0];
        library.saveDragon(studentId, {
            ...founder,
            id: 'student-hatchling',
            name: 'Ash',
            source: 'student',
            storedAtIso: '2026-08-13T12:00:00.000Z',
            genome: { ...founder.genome, wings: ['w', 'w'] },
        });

        const restored = new AccountGeneticsLibraryService().recordsFor(studentId);
        expect(restored.dragons.some((dragon) => dragon.id === 'student-hatchling')).toBe(true);
        expect(restored.chromosomes.find((record) => record.id === 'student-hatchling:chr-1')?.alleles).toEqual(['w', 'w']);
    });
});
