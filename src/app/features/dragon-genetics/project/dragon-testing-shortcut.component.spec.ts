import { resolveDragonActivityRoute } from './dragon-testing-shortcut.component';
import { DRAGON_PROJECT_HUB_DEFINITION } from './dragon-project-hub.definition';

describe('Dragon testing shortcut', () => {
  it('resolves adaptive and dedicated activity routes', () => {
    expect(resolveDragonActivityRoute('/dragon-genetics/genome-microscope')?.id).toBe(
      'genome-microscope',
    );
    expect(resolveDragonActivityRoute('/dragon-genetics/dragon-arena?preview=1')?.id).toBe(
      'dragon-arena',
    );
  });

  it('covers every activity registered on the project map', () => {
    for (const activity of DRAGON_PROJECT_HUB_DEFINITION.activities) {
      expect(resolveDragonActivityRoute(activity.route)?.id)
        .withContext(activity.id)
        .toBe(activity.id);
    }
  });

  it('does not appear on the project map or unrelated pages', () => {
    expect(resolveDragonActivityRoute('/dragon-genetics')).toBeNull();
    expect(resolveDragonActivityRoute('/catalog')).toBeNull();
  });
});
