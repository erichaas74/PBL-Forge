import { Service, inject } from '@angular/core';
import { DragonPathContextId } from '../../lesson-plan/dragon-lesson-plan.models';
import { ArenaGeneticsProgramAdapter } from './arena-genetics-program.adapter';
import { GeneticsProgram } from './genetics-program.models';
import { MiniGeneticsProgramAdapter } from './mini-genetics-program.adapter';

@Service()
export class GeneticsProgramResolver {
  private readonly arena = inject(ArenaGeneticsProgramAdapter);
  private readonly mini = inject(MiniGeneticsProgramAdapter);

  resolve(pathId: DragonPathContextId): GeneticsProgram {
    return pathId === 'mini-show' ? this.mini : this.arena;
  }
}
