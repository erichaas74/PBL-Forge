/**
 * Runtime status: ACTIVE — reusable presentation shell for optional story adventures.
 * Inputs/signals: adventure definition, active chapter, path label, progress, and checkpoints.
 * Data access: none; navigation intent is emitted to the route-owning page.
 * Connects to: DragonAdventurePage and all four optional adventure definitions.
 */
import { Component, input, output } from '@angular/core';
import {
  DragonAdventureChapterDefinition,
  DragonAdventureDefinition,
  DragonAdventureProgress,
} from './dragon-adventure.models';

@Component({
  selector: 'app-dragon-adventure-shell',
  templateUrl: './dragon-adventure-shell.component.html',
  styleUrl: './dragon-adventure-shell.component.scss',
})
export class DragonAdventureShellComponent {
  readonly definition = input.required<DragonAdventureDefinition>();
  readonly chapter = input.required<DragonAdventureChapterDefinition>();
  readonly progress = input.required<DragonAdventureProgress>();
  readonly pathLabel = input.required<string>();
  readonly completedCheckpointIds = input.required<readonly string[]>();
  readonly chapterSelected = output<string>();

  chapterIsAvailable(index: number): boolean {
    const currentIndex = this.definition().chapters.findIndex(
      (candidate) => candidate.id === this.chapter().id,
    );
    return index <= currentIndex || this.progress().runtimeState === 'resolved';
  }

  checkpointComplete(id: string): boolean {
    return this.completedCheckpointIds().includes(id);
  }
}
