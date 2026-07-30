import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AssemblyArenaStore } from '../../state/assembly-arena.store';
import {
  STRATEGY_BLOCK_OPTIONS,
  STRATEGY_CHILD_BLOCK_OPTIONS,
  STRATEGY_PRESETS,
} from '../../strategy/strategy-presets';
import {
  StrategyBlock,
  StrategyBlockParamValue,
  StrategyBlockType,
  StrategyProgramId,
} from '../../strategy/strategy.models';

@Component({
  selector: 'app-strategy-block-panel',
  templateUrl: './strategy-block-panel.component.html',
  styleUrl: './strategy-block-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategyBlockPanelComponent {
  readonly store = inject(AssemblyArenaStore);
  readonly presets = STRATEGY_PRESETS;
  readonly blockOptions = STRATEGY_BLOCK_OPTIONS;
  readonly childBlockOptions = STRATEGY_CHILD_BLOCK_OPTIONS;
  readonly selectedCombatantId = signal('red-1');
  readonly selectedBlockType = signal<StrategyBlockType>('chase');
  readonly jsonText = signal('');
  readonly message = signal<string | null>(null);

  readonly combatants = computed(() => this.store.state().combatants);
  readonly selectedCombatant = computed(() => {
    const combatants = this.combatants();
    return combatants.find(combatant => combatant.id === this.selectedCombatantId())
      ?? combatants[0]
      ?? null;
  });
  readonly currentProgram = computed(() => {
    const combatant = this.selectedCombatant();
    return combatant ? this.store.strategyPrograms()[combatant.id] ?? null : null;
  });
  readonly currentBlocks = computed(() => this.currentProgram()?.blocks ?? []);

  selectCombatant(event: Event): void {
    this.selectedCombatantId.set((event.target as HTMLSelectElement).value);
    this.message.set(null);
  }

  applyPreset(event: Event): void {
    const combatantId = this.getSelectedCombatantId();
    const programId = (event.target as HTMLSelectElement).value as StrategyProgramId;

    if (!combatantId) {
      return;
    }

    this.store.setStrategyProgram(combatantId, programId);
    this.message.set('Strategy preset loaded.');
  }

  selectBlockType(event: Event): void {
    this.selectedBlockType.set((event.target as HTMLSelectElement).value as StrategyBlockType);
  }

  addSelectedBlock(): void {
    this.addBlock(this.selectedBlockType());
  }

  addMovementBlock(): void {
    this.addBlock('chase');
  }

  addSensorBlock(): void {
    this.addBlock('if-distance-less');
  }

  addRecoverBlock(): void {
    this.addBlock('if-upside-down-for');
  }

  addStuckBlock(): void {
    this.addBlock('if-stuck');
  }

  addRepeatBlock(): void {
    this.addBlock('repeat-sequence');
  }

  removeBlock(blockId: string): void {
    const combatantId = this.getSelectedCombatantId();

    if (!combatantId) {
      return;
    }

    this.store.removeStrategyBlock(combatantId, blockId);
    this.message.set('Block removed.');
  }

  moveBlock(blockId: string, direction: -1 | 1): void {
    const combatantId = this.getSelectedCombatantId();

    if (!combatantId) {
      return;
    }

    this.store.moveStrategyBlock(combatantId, blockId, direction);
    this.message.set('Block order updated.');
  }

  setJsonText(event: Event): void {
    this.jsonText.set((event.target as HTMLTextAreaElement).value);
  }

  exportJson(): void {
    const combatantId = this.getSelectedCombatantId();

    if (!combatantId) {
      return;
    }

    this.jsonText.set(this.store.exportStrategyProgramJson(combatantId));
    this.message.set('Program exported to the text box.');
  }

  importJson(): void {
    const combatantId = this.getSelectedCombatantId();

    if (!combatantId) {
      return;
    }

    try {
      this.store.loadStrategyProgramJson(combatantId, this.jsonText());
      this.message.set('Program imported.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to import strategy JSON.';
      this.message.set(message);
    }
  }

  blockLabel(type: StrategyBlockType): string {
    return this.blockOptions.find(option => option.type === type)?.name
      ?? type.replace(/-/g, ' ');
  }

  hasParam(block: StrategyBlock, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(block.params, key);
  }

  paramNumber(block: StrategyBlock, key: string): number {
    const value = block.params[key];
    return typeof value === 'number' ? value : 0;
  }

  paramString(block: StrategyBlock, key: string): string {
    const value = block.params[key];
    return typeof value === 'string' ? value : '';
  }

  paramBoolean(block: StrategyBlock, key: string): boolean {
    const value = block.params[key];
    return typeof value === 'boolean' ? value : false;
  }

  childBlocks(block: StrategyBlock): StrategyBlock[] {
    return block.children ?? [];
  }

  childType(block: StrategyBlock): StrategyBlockType {
    return block.children?.[0]?.type ?? 'boost';
  }

  isSensorBlock(block: StrategyBlock): boolean {
    return block.type === 'if-distance-less' ||
      block.type === 'if-tipped' ||
      block.type === 'if-stuck' ||
      block.type === 'if-upside-down-for';
  }

  updateNumberParam(block: StrategyBlock, key: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.updateParam(block, key, Number.isFinite(value) ? value : 0);
  }

  updateStringParam(block: StrategyBlock, key: string, event: Event): void {
    this.updateParam(block, key, (event.target as HTMLSelectElement).value);
  }

  updateBooleanParam(block: StrategyBlock, key: string, event: Event): void {
    this.updateParam(block, key, (event.target as HTMLInputElement).checked);
  }

  updateChildType(block: StrategyBlock, event: Event): void {
    const combatantId = this.getSelectedCombatantId();

    if (!combatantId) {
      return;
    }

    this.store.setStrategyBlockChild(
      combatantId,
      block.id,
      (event.target as HTMLSelectElement).value as StrategyBlockType,
    );
    this.message.set('Nested action updated.');
  }

  private addBlock(type: StrategyBlockType): void {
    const combatantId = this.getSelectedCombatantId();

    if (!combatantId) {
      return;
    }

    this.store.addStrategyBlock(combatantId, type);
    this.message.set('Block added.');
  }

  private updateParam(block: StrategyBlock, key: string, value: StrategyBlockParamValue): void {
    const combatantId = this.getSelectedCombatantId();

    if (!combatantId) {
      return;
    }

    this.store.updateStrategyBlockParam(combatantId, block.id, key, value);
    this.message.set('Block settings updated.');
  }

  private getSelectedCombatantId(): string {
    return this.selectedCombatant()?.id ?? '';
  }
}
