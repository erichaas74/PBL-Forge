import { Service, signal } from '@angular/core';

export interface WorkstationGuideLiveState {
  contextId: string;
  message: string;
  kind: 'ready' | 'changed' | 'saved';
}

/** Small shared channel for instruments to tell the optional guide what just happened. */
@Service()
export class WorkstationGuideStateService {
  private readonly stateSignal = signal<WorkstationGuideLiveState | null>(null);
  readonly state = this.stateSignal.asReadonly();

  enter(contextId: string, message = 'Choose any available specimen or control to begin.'): void {
    if (this.stateSignal()?.contextId === contextId) return;
    this.stateSignal.set({ contextId, message, kind: 'ready' });
  }

  changed(contextId: string, message: string): void {
    this.stateSignal.set({ contextId, message, kind: 'changed' });
  }

  saved(contextId: string, message: string): void {
    this.stateSignal.set({ contextId, message, kind: 'saved' });
  }
}
