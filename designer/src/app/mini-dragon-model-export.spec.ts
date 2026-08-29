import { CLASSIC_DRAGON_TEST_PRESET } from './assembly-garage/data/presets/classic-dragon-test';
import { createDragonModelPack } from './dragon-model-pack-export';
import { DesignerDragonDraftStore } from './designer-dragon-draft.store';
import {
  addMiniDragonModel,
  createMiniDragonAuthoringPreset,
  createMiniDragonBreedAuthoringPresets,
} from './mini-dragon-model-export';
import { MINI_DRAGON_REFERENCE_FORMS } from '@pbl/assembly/rendering/mini-dragon-breed-morphology';
import {
  miniDragonHexColor,
  resolveMiniDragonCoatPaint,
} from '@pbl/assembly/rendering/mini-dragon-coat';

describe('Mini Dragon model-pack publication', () => {
  it('versions a complete connected Mini Dragon beside the lab dragon', () => {
    const base = createDragonModelPack(CLASSIC_DRAGON_TEST_PRESET.state, {
      modelId: 'classic-dragon', label: 'Classic Dragon', description: 'Test', packVersion: 'test',
    });
    const pack = addMiniDragonModel(base, new DesignerDragonDraftStore());
    const mini = pack.models.find(model => model.id === 'mini-dragon');
    expect(pack.models).toHaveLength(2);
    expect(mini?.blueprint.parts).toHaveLength(34);
    expect(mini?.blueprint.joints.length).toBe((mini?.blueprint.parts.length ?? 0) - 1);
    expect(mini?.blueprint.parts.map(part => part.visualProfile?.profileId)).toEqual(
      expect.arrayContaining([
        'mini-dragon-brow-plates',
        'mini-dragon-whiskers',
        'mini-dragon-chin-tuft',
        'mini-dragon-dewlap',
        'mini-dragon-neck-ruff',
        'mini-dragon-shoulder-plates',
        'mini-dragon-belly-scutes',
        'mini-dragon-flank-fins',
        'mini-dragon-hip-fins',
        'mini-dragon-tail-sail',
        'mini-dragon-horn',
        'mini-dragon-ear',
      ]),
    );

    const earJoints = mini?.blueprint.joints.filter(joint => joint.childPartId.startsWith('mini-ear-')) ?? [];
    expect(earJoints).toHaveLength(2);
    expect(earJoints.every(joint => joint.type === 'hinge')).toBe(true);
    expect(earJoints.every(joint => joint.axis.x === 1)).toBe(true);

    const tail = mini?.blueprint;
    expect(tail?.joints.find(joint => joint.childPartId === 'mini-tail-left-1')?.parentPartId)
      .toBe('mini-tail');
    expect(tail?.joints.find(joint => joint.childPartId === 'mini-tail-right-1')?.parentPartId)
      .toBe('mini-tail');
    expect(tail?.parts.filter(part => part.id.startsWith('mini-tail-tip-'))).toHaveLength(2);
  });

  it('keeps every neutral-model joint seated at its authored child position', () => {
    const preset = createMiniDragonAuthoringPreset(new DesignerDragonDraftStore());
    const parts = new Map(preset.state.parts.map(part => [part.id, part]));

    for (const joint of preset.state.joints) {
      const parent = parts.get(joint.parentPartId)!;
      const child = parts.get(joint.childPartId)!;
      expect(parent.position.x + joint.pivotOnParent.x).toBeCloseTo(
        child.position.x + joint.pivotOnChild.x,
      );
      expect(parent.position.y + joint.pivotOnParent.y).toBeCloseTo(
        child.position.y + joint.pivotOnChild.y,
      );
      expect(parent.position.z + joint.pivotOnParent.z).toBeCloseTo(
        child.position.z + joint.pivotOnChild.z,
      );
    }
  });

  it('offers five connected editable breed assemblies with their specialized anatomy', () => {
    const presets = createMiniDragonBreedAuthoringPresets(new DesignerDragonDraftStore());
    const byId = new Map(presets.map(preset => [preset.id, preset]));
    const profiles = (id: string) =>
      byId.get(id)!.state.parts.map(part => part.visualProfile?.profileId);

    expect([...byId.keys()]).toEqual([
      'mini-dragon-puggle',
      'mini-dragon-fairy',
      'mini-dragon-triceratops',
      'mini-dragon-imperial-serpent',
      'mini-dragon-amphiptere',
    ]);
    for (const preset of presets) {
      expect(preset.state.joints, preset.id).toHaveLength(preset.state.parts.length - 1);
      const parts = new Map(preset.state.parts.map(part => [part.id, part]));
      for (const joint of preset.state.joints) {
        expect(parts.has(joint.parentPartId), `${preset.id}/${joint.id}/parent`).toBe(true);
        expect(parts.has(joint.childPartId), `${preset.id}/${joint.id}/child`).toBe(true);
      }
      for (const side of ['left', 'right'] as const) {
        const thigh = parts.get(`mini-${side}-thigh`)!;
        const lower = parts.get(`mini-${side}-leg`)!;
        expect(lower.position.y, `${preset.id}/${side}-knee`).toBeCloseTo(
          thigh.position.y - thigh.dimensions.y * 0.5 - lower.dimensions.y * 0.42,
        );
      }
    }

    const puggle = byId.get('mini-dragon-puggle')!;
    const pugglePaint = resolveMiniDragonCoatPaint(
      MINI_DRAGON_REFERENCE_FORMS.puggle,
      'breed-reference-puggle',
    );
    expect(new Set(puggle.state.parts.map(part => part.color))).toEqual(
      new Set([miniDragonHexColor(pugglePaint.color)]),
    );
    expect(puggle.state.parts.every(part =>
      part.visualProfile?.parameters?.['miniPatchColor'] === miniDragonHexColor(pugglePaint.patchColor)
      && part.visualProfile.parameters?.['miniAccentColor'] === pugglePaint.accentColor
      && part.visualProfile.parameters?.['miniPatternStyle'] === pugglePaint.patternStyle
    )).toBe(true);
    expect(puggle.state.parts.find(part => part.id === 'mini-head')
      ?.visualProfile?.parameters?.['miniEyeSize']).toBeGreaterThan(0.9);
    expect(puggle.state.parts.find(part => part.id === 'mini-horn-left')
      ?.visualProfile?.parameters?.['miniHornScale']).toBeLessThan(0.4);

    expect(profiles('mini-dragon-fairy').filter(profile => profile === 'mini-dragon-fairy-wing'))
      .toHaveLength(2);
    expect(profiles('mini-dragon-triceratops')).toEqual(expect.arrayContaining([
      'mini-dragon-face-shield',
      'mini-dragon-nose-horn',
    ]));
    expect(profiles('mini-dragon-imperial-serpent')
      .filter(profile => profile === 'mini-dragon-serpent-body-segment')).toHaveLength(2);
    expect(profiles('mini-dragon-amphiptere')
      .filter(profile => profile === 'mini-dragon-aero-wing')).toHaveLength(2);
    expect(profiles('mini-dragon-amphiptere')
      .filter(profile => profile === 'mini-dragon-fork-tail-branch')).toHaveLength(2);
    expect(profiles('mini-dragon-amphiptere')).not.toContain('mini-dragon-tail-plume');

    for (const id of ['mini-dragon-imperial-serpent', 'mini-dragon-amphiptere']) {
      const parts = new Map(byId.get(id)!.state.parts.map(part => [part.id, part]));
      const neck = parts.get('mini-neck')!;
      const head = parts.get('mini-head')!;
      expect(head.position.x - head.dimensions.x * 0.4, `${id}/neck-head`).toBeCloseTo(
        neck.position.x + neck.dimensions.x * 0.46,
      );
      for (const childId of ['mini-tail', 'mini-left-thigh', 'mini-right-thigh']) {
        expect(byId.get(id)!.state.joints.find(joint => joint.childPartId === childId)
          ?.parentPartId).toBe('mini-serpent-rear-body');
      }
    }
  });
});
