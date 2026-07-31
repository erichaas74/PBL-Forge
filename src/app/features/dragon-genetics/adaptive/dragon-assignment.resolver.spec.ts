import { resolveSimulationSettings } from './dragon-assignment.resolver';
import { DragonAssignment } from './dragon-simulation.models';
import { DEFAULT_DRAGON_ASSIGNMENT } from './dragon-simulation.registry';

describe('Dragon Genetics assignment resolution', () => {
  const assignment: DragonAssignment = {
    ...DEFAULT_DRAGON_ASSIGNMENT,
    defaultLevel: 'grade-7',
    simulationSettings: {
      'genome-microscope': { enabled: true, level: 'grade-8', questionCount: 20 },
    },
    studentOverrides: {
      'student-1': {
        defaultLevel: 'high-school',
        simulationLevels: { 'genome-microscope': 'ap-biology' },
      },
    },
  };

  it('uses student simulation override before all assignment defaults', () => {
    expect(resolveSimulationSettings(
      assignment,
      'genome-microscope',
      'student-1',
    ).level).toBe('ap-biology');
  });

  it('uses student default before the simulation and class defaults', () => {
    expect(resolveSimulationSettings(
      assignment,
      'trait-evidence',
      'student-1',
    ).level).toBe('high-school');
  });

  it('uses the simulation setting for students without overrides', () => {
    const resolved = resolveSimulationSettings(assignment, 'genome-microscope', 'student-2');
    expect(resolved.level).toBe('grade-8');
    expect(resolved.questionCount).toBe(6);
  });

  it('allows teacher preview to temporarily win without mutating the assignment', () => {
    expect(resolveSimulationSettings(
      assignment,
      'genome-microscope',
      'student-1',
      'grade-7',
    ).level).toBe('grade-7');
    expect(assignment.studentOverrides['student-1'].simulationLevels?.['genome-microscope'])
      .toBe('ap-biology');
  });
});
