import { DragonLabSnapshot } from '../../features/dragon-lab/domain/dragon-lab.models';
import { LocalDragonLabRepository } from './local-dragon-lab.repository';

describe('LocalDragonLabRepository', () => {
  const sessionId = 'repository-spec-student';
  let repository: LocalDragonLabRepository;

  beforeEach(() => {
    repository = new LocalDragonLabRepository();
    localStorage.removeItem(`dragon-genetics-lab:v1:${sessionId}`);
  });

  afterEach(() => localStorage.removeItem(`dragon-genetics-lab:v1:${sessionId}`));

  it('round-trips a JSON-only lab snapshot', async () => {
    const snapshot = exampleSnapshot();
    await repository.save(sessionId, snapshot);
    expect(await repository.load(sessionId)).toEqual(snapshot);
  });

  it('clears only the requested student session', async () => {
    await repository.save(sessionId, exampleSnapshot());
    await repository.clear(sessionId);
    expect(await repository.load(sessionId)).toBeNull();
  });

  it('ignores records with an unsupported schema version', async () => {
    localStorage.setItem(`dragon-genetics-lab:v1:${sessionId}`, JSON.stringify({
      savedAt: new Date().toISOString(),
      snapshot: { schemaVersion: 99 },
    }));
    expect(await repository.load(sessionId)).toBeNull();
  });
});

function exampleSnapshot(): DragonLabSnapshot {
  return {
    schemaVersion: 1,
    stage: 'mission',
    completedLessonIds: [],
    sortAnswers: {},
    sortChecked: false,
    parentAId: 'ember',
    parentBId: 'tide',
    predictions: {},
    predictionChecked: false,
    hatchRun: 0,
    clutch: [],
    selectedOffspringId: null,
    comparisonTraitId: 'wings',
    reproductionAnswer: null,
    claim: '',
    evidence: '',
    reasoning: '',
    recommendedPairId: null,
    recommendation: '',
    recommendationSubmitted: false,
  };
}
