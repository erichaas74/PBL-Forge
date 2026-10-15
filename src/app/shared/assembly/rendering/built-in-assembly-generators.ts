import { registerAssemblyMeshGenerator } from './assembly-generator-registry';
import { createDragonProceduralObject } from './dragon-procedural-mesh.factory';
import { createRobotProceduralObject, createVehicleProceduralObject } from './machine-procedural-mesh.factory';
import { createMiniDragonProceduralObject } from './mini-dragon-procedural-mesh.factory';

let registered = false;

/** Installs the built-in packages once; other packages use the public registry directly. */
export function ensureBuiltInAssemblyGenerators(): void {
  if (registered) return;
  registered = true;
  registerAssemblyMeshGenerator({ id: 'dragon', priority: 40, create: createDragonProceduralObject });
  registerAssemblyMeshGenerator({ id: 'mini-dragon', priority: 50, create: createMiniDragonProceduralObject });
  registerAssemblyMeshGenerator({ id: 'vehicle', priority: 30, create: createVehicleProceduralObject });
  registerAssemblyMeshGenerator({ id: 'robot', priority: 30, create: createRobotProceduralObject });
}
