import { DragonProjectSelectionRepository } from './dragon-project-selection.repository';

describe('DragonProjectSelectionRepository', () => {
  const studentId = 'path-selection-spec';
  const assignmentId = 'assignment-1';
  const storageKey = `pbl-forge.dragon-genetics.project-selection.v1.${studentId}.${assignmentId}`;
  const repository = new DragonProjectSelectionRepository();

  beforeEach(() => localStorage.removeItem(storageKey));
  afterEach(() => localStorage.removeItem(storageKey));

  it('persists one of the registered learning paths', () => {
    repository.save({
      schemaVersion: 1,
      studentId,
      assignmentId,
      selectedPathId: 'dragon-arena',
    });

    expect(repository.load(studentId, assignmentId).selectedPathId).toBe('dragon-arena');
  });

  it('drops an unrecognized stored path', () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        schemaVersion: 1,
        studentId,
        assignmentId,
        selectedPathId: 'unknown-path',
      }),
    );

    expect(repository.load(studentId, assignmentId).selectedPathId).toBeNull();
  });
});
