import { DEFAULT_DRAGON_LESSON_PLAN } from '../lesson-plan/dragon-lesson-plan.models';
import { resolveDragonWorkstationLaunchContext } from './dragon-workstation-launch-context';

describe('resolveDragonWorkstationLaunchContext', () => {
  const request = {
    pathId: 'arena',
    lessonId: 'alleles-and-phenotypes',
    workstationId: 'allele-workbench',
    workstationRoute: '/dragon-genetics/allele-workbench',
  } as const;

  it('resolves a published lesson that explicitly links the workstation', () => {
    expect(resolveDragonWorkstationLaunchContext(DEFAULT_DRAGON_LESSON_PLAN, request)).toEqual({
      pathId: 'arena',
      lessonId: 'alleles-and-phenotypes',
      workstationId: 'allele-workbench',
      lessonTitle: 'Allele Experiments',
      pathTitle: 'Dragon Arena',
      missionText:
        'Use complete allele-pair evidence to determine which phenotype is expressed by dominant and recessive alleles.',
      returnUrl: '/dragon-genetics/path/arena/lesson/alleles-and-phenotypes',
    });
  });

  it('keeps direct launches free of lesson context', () => {
    expect(
      resolveDragonWorkstationLaunchContext(DEFAULT_DRAGON_LESSON_PLAN, {
        ...request,
        pathId: null,
        lessonId: null,
      }),
    ).toBeNull();
  });

  it('rejects a forged lesson-to-workstation association', () => {
    expect(
      resolveDragonWorkstationLaunchContext(DEFAULT_DRAGON_LESSON_PLAN, {
        ...request,
        lessonId: 'meet-the-dragons',
      }),
    ).toBeNull();
  });

  it('resolves the Breeding Incubator from its own lesson only', () => {
    expect(
      resolveDragonWorkstationLaunchContext(DEFAULT_DRAGON_LESSON_PLAN, {
        pathId: 'mini-show',
        lessonId: 'breeding-and-offspring',
        workstationId: 'breeding-incubator',
        workstationRoute: '/dragon-genetics/breeding-incubator',
      })?.returnUrl,
    ).toBe('/dragon-genetics/path/mini-show/lesson/breeding-and-offspring');
  });
});
