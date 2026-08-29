import { partAnatomyLayers } from './part-anatomy-layers';

describe('part anatomy layers', () => {
  it('separates the Arena body into protected form, armor, and spike layers', () => {
    const layers = partAnatomyLayers('dragon-body', 'lab', []);

    expect(layers.map(layer => layer.id)).toEqual([
      'core-silhouette',
      'belly-form',
      'archetype-details',
      'back-spike-rows',
      'inherited-surface',
    ]);
    expect(layers.find(layer => layer.id === 'core-silhouette')?.structural).toBe(true);
    expect(layers.find(layer => layer.id === 'back-spike-rows')).toEqual(expect.objectContaining({
      visibilityKey: 'spikeCount',
      geneIds: ['spikes'],
      placement: 'back-spikes',
      meshNamePrefixes: ['dragon-back-spike-row-'],
    }));
  });

  it('gives the Mini body an independently hideable feather mantle', () => {
    const layer = partAnatomyLayers('mini-dragon-body', 'mini', [])
      .find(candidate => candidate.id === 'mini-feather-mantle');

    expect(layer).toEqual(expect.objectContaining({
      visibilityKey: 'miniFeatherCoverage',
      geneIds: ['plumage'],
    }));
    expect(layer?.parameterKeys).toContain('miniFeatherLength');
  });

  it('exposes inherited Mini appendages as editable layers', () => {
    const [shoulders] = partAnatomyLayers('mini-dragon-shoulder-plates', 'mini', []);

    expect(shoulders).toEqual(expect.objectContaining({
      label: 'Shoulder plates',
      visibilityKey: 'miniShoulderScale',
      geneIds: ['shoulders'],
      placement: 'part',
    }));
  });

  it('breaks the Arena head into independently positionable feature layers', () => {
    const layers = partAnatomyLayers('dragon-head-horned', 'lab', []);

    expect(layers.map(layer => layer.id)).toEqual([
      'skull-form',
      'eyes',
      'horn-rack',
      'brow-spikes',
      'crest',
      'sex-display',
      'wise-regalia',
    ]);
    expect(layers.find(layer => layer.id === 'eyes')?.parameterKeys)
      .toEqual(expect.arrayContaining(['eyeOffsetX', 'eyeOffsetY', 'eyeOffsetZ', 'eyeScale']));
    expect(layers.find(layer => layer.id === 'horn-rack')).toEqual(expect.objectContaining({
      meshNamePrefixes: ['dragon-horn-'],
      parameterKeys: expect.arrayContaining(['hornOffsetX', 'hornSplay', 'hornRake']),
    }));
  });

  it('gives each jaw only the generated anatomy that it actually owns', () => {
    const upper = partAnatomyLayers('dragon-upper-jaw', 'lab', []);
    const lower = partAnatomyLayers('dragon-lower-jaw', 'lab', []);

    expect(upper.map(layer => layer.id)).toEqual(['teeth', 'nostrils', 'nose-horn', 'fangs']);
    expect(lower.map(layer => layer.id)).toEqual(['teeth']);
    expect(lower[0]).toEqual(expect.objectContaining({
      meshNamePrefixes: ['dragon-tooth-'],
      parameterKeys: expect.arrayContaining([
        'toothRowSpan', 'toothOffsetX', 'toothOffsetY', 'toothOffsetZ',
      ]),
    }));
  });

  it('keeps a newly introduced featureless profile protected', () => {
    const [fallback] = partAnatomyLayers('new-profile', 'lab', []);

    expect(fallback.label).toBe('Structural mesh');
    expect(fallback.structural).toBe(true);
  });
});
