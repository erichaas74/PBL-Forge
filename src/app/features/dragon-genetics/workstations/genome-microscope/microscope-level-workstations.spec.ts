import { routes } from '../../../../app.routes';
import { MICROSCOPE_LEVEL_WORKSTATIONS } from './microscope-level-workstations';
import { GENOME_MICROSCOPE_LEVELS } from './genome-microscope.models';

describe('focused microscope workstation catalog', () => {
  it('declares exactly one independently routable workstation for every microscope level', () => {
    expect(MICROSCOPE_LEVEL_WORKSTATIONS.map(({ level }) => level)).toEqual(
      GENOME_MICROSCOPE_LEVELS,
    );
    expect(new Set(MICROSCOPE_LEVEL_WORKSTATIONS.map(({ id }) => id)).size).toBe(
      GENOME_MICROSCOPE_LEVELS.length,
    );

    const routePaths = new Set(routes.map((route) => `/${route.path}`));
    for (const workstation of MICROSCOPE_LEVEL_WORKSTATIONS) {
      expect(routePaths.has(workstation.route), workstation.route).toBe(true);
      expect(workstation.goal.length).toBeGreaterThan(20);
      expect(workstation.probes.length).toBeGreaterThan(0);
    }
  });
});
