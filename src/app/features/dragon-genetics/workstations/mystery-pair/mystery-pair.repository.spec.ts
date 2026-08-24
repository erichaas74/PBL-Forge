import { MysteryPairRepository, emptySnapshot } from './mystery-pair.repository';

describe('MysteryPairRepository', () => {
  beforeEach(() => localStorage.clear());

  it('keeps Arena and Mini Show notebooks separate on the device', () => {
    const repository = new MysteryPairRepository();
    repository.save({ ...emptySnapshot('student', 'arena'), openedSpecimenIds: ['aster'] });
    expect(repository.load('student', 'arena').openedSpecimenIds).toEqual(['aster']);
    expect(repository.load('student', 'mini-show').openedSpecimenIds).toEqual([]);
  });
});
