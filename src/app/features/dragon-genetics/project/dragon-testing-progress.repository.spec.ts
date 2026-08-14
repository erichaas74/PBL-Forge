import { TestBed } from '@angular/core/testing';
import { DragonTestingProgressRepository } from './dragon-testing-progress.repository';

describe('DragonTestingProgressRepository', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.clear();
  });

  it('persists section completion without adding evidence or scores', () => {
    const repository = TestBed.inject(DragonTestingProgressRepository);

    repository.complete('tester', 'assignment-1', 'genome-microscope', '2026-08-14T00:00:00.000Z');

    expect(repository.load('tester', 'assignment-1').completedAtByActivityId).toEqual({
      'genome-microscope': '2026-08-14T00:00:00.000Z',
    });
    expect(repository.load('another-tester', 'assignment-1').completedAtByActivityId).toEqual({});
  });
});
