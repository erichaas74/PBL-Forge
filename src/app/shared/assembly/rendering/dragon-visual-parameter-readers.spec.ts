import { AssemblyPart } from '../domain/assembly.models';
import { visualFlag, visualNumber, visualString } from './dragon-visual-parameter-readers';

function part(parameters?: Record<string, string | number | boolean>): AssemblyPart {
  return {
    id: 'test-part',
    label: 'Test Part',
    roles: ['core'],
    shape: 'box',
    mass: 1,
    dimensions: { x: 1, y: 1, z: 1 },
    position: { x: 0, y: 0, z: 0 },
    color: '#ffffff',
    visualProfile: { profileId: 'dragon-body', meshType: 'procedural', parameters },
  };
}

describe('dragon visual parameter readers', () => {
  it('accepts finite numbers and rejects other values', () => {
    expect(visualNumber(part({ value: 2.5 }), 'value', 1)).toBe(2.5);
    expect(visualNumber(part({ value: '2.5' }), 'value', 1)).toBe(1);
    expect(visualNumber(part({ value: Number.NaN }), 'value', 1)).toBe(1);
    expect(visualNumber(part(), 'value', 1)).toBe(1);
  });

  it('accepts strings without coercion', () => {
    expect(visualString(part({ value: 'wyvern' }), 'value', 'classic')).toBe('wyvern');
    expect(visualString(part({ value: 2 }), 'value', 'classic')).toBe('classic');
  });

  it('enables flags only for literal true', () => {
    expect(visualFlag(part({ value: true }), 'value')).toBe(true);
    expect(visualFlag(part({ value: 'true' }), 'value')).toBe(false);
    expect(visualFlag(part({ value: false }), 'value')).toBe(false);
  });
});
