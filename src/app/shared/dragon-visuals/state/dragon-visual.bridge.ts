import { Injectable, signal } from '@angular/core';
import { DragonTeachingSequence, DragonVisualSurface } from '../domain/teaching-sequence.models';
import {
  DragonVisualScene,
  DragonVisualStageEvent,
} from '../domain/dragon-visual.models';
import {
  validateDragonTeachingSequence,
  validateDragonVisualScene,
} from '../domain/visual-contract.validation';

@Injectable({ providedIn: 'root' })
export class DragonVisualBridge {
  private readonly sceneState = signal<DragonVisualScene | null>(null);
  private readonly sequenceState = signal<DragonTeachingSequence | null>(null);
  private readonly surfaceState = signal<DragonVisualSurface>('station');
  private readonly lastEventState = signal<DragonVisualStageEvent | null>(null);

  readonly scene = this.sceneState.asReadonly();
  readonly sequence = this.sequenceState.asReadonly();
  readonly surface = this.surfaceState.asReadonly();
  readonly lastEvent = this.lastEventState.asReadonly();

  showScene(scene: DragonVisualScene): void {
    assertValid('visual scene', validateDragonVisualScene(scene));
    this.sceneState.set(scene);
  }

  playSequence(sequence: DragonTeachingSequence, surface: DragonVisualSurface): void {
    assertValid('teaching sequence', validateDragonTeachingSequence(sequence));
    if (!sequence.supportedSurfaces.includes(surface)) {
      throw new Error(`Teaching sequence ${sequence.sequenceId} does not support ${surface}.`);
    }
    this.surfaceState.set(surface);
    this.sequenceState.set(sequence);
  }

  receiveStageEvent(event: DragonVisualStageEvent): void {
    if (this.sceneState()?.sceneId !== event.sceneId) {
      throw new Error(`Visual event scene ${event.sceneId} is not the active scene.`);
    }
    this.lastEventState.set(event);
  }

  stopSequence(): void {
    this.sequenceState.set(null);
  }

  clear(): void {
    this.sceneState.set(null);
    this.sequenceState.set(null);
    this.lastEventState.set(null);
  }
}

function assertValid(label: string, errors: readonly string[]): void {
  if (errors.length) throw new Error(`Invalid ${label}: ${errors.join(' ')}`);
}

