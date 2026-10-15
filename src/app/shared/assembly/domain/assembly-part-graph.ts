import { AssemblyBlueprint, AssemblyJoint, AssemblyPart } from './assembly.models';

export type AssemblyConstraint =
  | { readonly kind: 'socket'; readonly parentSocketId: string; readonly childSocketId: string }
  | { readonly kind: 'hinge-limit'; readonly minimumDegrees: number; readonly maximumDegrees: number }
  | { readonly kind: 'slider-limit'; readonly minimum: number; readonly maximum: number }
  | { readonly kind: 'surface'; readonly normalOffset: number; readonly alignToNormal: boolean }
  | { readonly kind: 'mirror'; readonly axis: 'x' | 'y' | 'z'; readonly sourceNodeId: string }
  | { readonly kind: 'spacing'; readonly axis: 'x' | 'y' | 'z'; readonly gap: number; readonly count: number }
  | { readonly kind: 'collision-clearance'; readonly distance: number }
  | { readonly kind: 'follow-parent'; readonly position: boolean; readonly rotation: boolean; readonly scale: boolean };

export interface AssemblyPartNode {
  readonly id: string;
  readonly definitionId?: string;
  readonly part: AssemblyPart;
}

export interface AssemblyPartConnection {
  readonly id: string;
  readonly parentNodeId: string;
  readonly childNodeId: string;
  readonly joint: AssemblyJoint;
  readonly constraints: readonly AssemblyConstraint[];
}

/** Universal authoring graph. Runtime physics can still consume its Blueprint projection. */
export interface AssemblyPartGraph {
  readonly schemaVersion: 1;
  readonly projectTypeId: string;
  readonly nodes: readonly AssemblyPartNode[];
  readonly connections: readonly AssemblyPartConnection[];
}

export function assemblyPartGraphFromBlueprint(
  blueprint: AssemblyBlueprint,
  projectTypeId: string,
): AssemblyPartGraph {
  const nodes = blueprint.parts.map(part => ({
    id: part.id,
    definitionId: part.definitionId,
    part: clonePart(part),
  }));
  const connections = blueprint.joints.map(joint => ({
    id: joint.id,
    parentNodeId: joint.parentPartId,
    childNodeId: joint.childPartId,
    joint: cloneJoint(joint),
    constraints: inferredConstraints(blueprint, joint),
  }));
  return validateAssemblyPartGraph({ schemaVersion: 1, projectTypeId, nodes, connections });
}

export function assemblyBlueprintFromPartGraph(graph: AssemblyPartGraph): AssemblyBlueprint {
  validateAssemblyPartGraph(graph);
  return {
    parts: graph.nodes.map(node => clonePart(node.part)),
    joints: graph.connections.map(connection => cloneJoint(connection.joint)),
  };
}

export function validateAssemblyPartGraph(graph: AssemblyPartGraph): AssemblyPartGraph {
  if (graph.schemaVersion !== 1 || !graph.projectTypeId.trim()) {
    throw new Error('Assembly part graph identity is invalid.');
  }
  const nodeIds = graph.nodes.map(node => node.id);
  if (new Set(nodeIds).size !== nodeIds.length || nodeIds.some(id => !id.trim())) {
    throw new Error('Assembly part graph node ids must be unique.');
  }
  const nodeIdSet = new Set(nodeIds);
  const connectionIds = graph.connections.map(connection => connection.id);
  if (new Set(connectionIds).size !== connectionIds.length) {
    throw new Error('Assembly part graph connection ids must be unique.');
  }
  for (const node of graph.nodes) {
    if (node.part.id !== node.id) throw new Error(`Assembly node ${node.id} does not match its part id.`);
  }
  for (const connection of graph.connections) {
    if (!nodeIdSet.has(connection.parentNodeId) || !nodeIdSet.has(connection.childNodeId)) {
      throw new Error(`Assembly connection ${connection.id} references a missing node.`);
    }
    if (connection.joint.id !== connection.id
      || connection.joint.parentPartId !== connection.parentNodeId
      || connection.joint.childPartId !== connection.childNodeId) {
      throw new Error(`Assembly connection ${connection.id} does not match its joint.`);
    }
  }
  return graph;
}

function inferredConstraints(
  blueprint: AssemblyBlueprint,
  joint: AssemblyJoint,
): AssemblyConstraint[] {
  const parent = blueprint.parts.find(part => part.id === joint.parentPartId);
  const child = blueprint.parts.find(part => part.id === joint.childPartId);
  const parentSocket = parent?.snapPoints?.find(point => samePoint(point.localPosition, joint.pivotOnParent));
  const childSocket = child?.snapPoints?.find(point => samePoint(point.localPosition, joint.pivotOnChild));
  const constraints: AssemblyConstraint[] = [{
    kind: 'follow-parent',
    position: true,
    rotation: joint.type !== 'hinge' && joint.type !== 'slider',
    scale: false,
  }];
  if (parentSocket && childSocket) constraints.unshift({
    kind: 'socket',
    parentSocketId: parentSocket.id,
    childSocketId: childSocket.id,
  });
  return constraints;
}

function samePoint(left: AssemblyPart['position'], right: AssemblyPart['position']): boolean {
  return Math.abs(left.x - right.x) < 0.0001
    && Math.abs(left.y - right.y) < 0.0001
    && Math.abs(left.z - right.z) < 0.0001;
}

function clonePart(part: AssemblyPart): AssemblyPart {
  return {
    ...part,
    dimensions: { ...part.dimensions },
    position: { ...part.position },
    rotation: part.rotation ? { ...part.rotation } : undefined,
    roles: part.roles ? [...part.roles] : undefined,
    visualProfile: part.visualProfile ? {
      ...part.visualProfile,
      parameters: part.visualProfile.parameters ? { ...part.visualProfile.parameters } : undefined,
      scale: part.visualProfile.scale ? { ...part.visualProfile.scale } : undefined,
      offset: part.visualProfile.offset ? { ...part.visualProfile.offset } : undefined,
      rotation: part.visualProfile.rotation ? { ...part.visualProfile.rotation } : undefined,
    } : undefined,
    snapPoints: part.snapPoints?.map(point => ({
      ...point,
      localPosition: { ...point.localPosition },
      localRotation: point.localRotation ? { ...point.localRotation } : undefined,
      mateIds: point.mateIds ? [...point.mateIds] : undefined,
    })),
    attachment: part.attachment ? {
      ...part.attachment,
      axis: { ...part.attachment.axis },
      childRotation: part.attachment.childRotation ? { ...part.attachment.childRotation } : undefined,
      behavior: part.attachment.behavior ? { ...part.attachment.behavior } : undefined,
    } : undefined,
  };
}

function cloneJoint(joint: AssemblyJoint): AssemblyJoint {
  return {
    ...joint,
    pivotOnParent: { ...joint.pivotOnParent },
    pivotOnChild: { ...joint.pivotOnChild },
    axis: { ...joint.axis },
    behavior: joint.behavior ? { ...joint.behavior } : undefined,
  };
}
