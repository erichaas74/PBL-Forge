import { describe, expect, it } from 'vitest';
import { CAR_LOAD_PRESET } from '../assets/car-load';
import { assemblyBlueprintFromPartGraph, assemblyPartGraphFromBlueprint } from './assembly-part-graph';

describe('universal assembly part graph', () => {
  it('round-trips an existing vehicle blueprint without losing parts or joints', () => {
    const graph = assemblyPartGraphFromBlueprint(CAR_LOAD_PRESET.state, 'vehicle');
    expect(graph.nodes).toHaveLength(6);
    expect(graph.connections).toHaveLength(5);
    expect(graph.connections.every(connection => connection.constraints.some(
      constraint => constraint.kind === 'follow-parent',
    ))).toBe(true);
    expect(assemblyBlueprintFromPartGraph(graph)).toEqual(CAR_LOAD_PRESET.state);
  });

  it('rejects graph connections that point at missing nodes', () => {
    const graph = assemblyPartGraphFromBlueprint(CAR_LOAD_PRESET.state, 'vehicle');
    expect(() => assemblyBlueprintFromPartGraph({
      ...graph,
      connections: [{ ...graph.connections[0], childNodeId: 'missing' }],
    })).toThrow(/missing node/i);
  });
});
