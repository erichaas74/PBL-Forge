import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject } from '@angular/core';
import { AssemblyGarageComponent } from './assembly-garage/assembly-garage.component';
import { AssemblyPreset } from '@pbl/assembly/domain/assembly.models';
import { createClassicDragonTestPreset } from './assembly-garage/data/presets/classic-dragon-test';
import { DesignerDragonDraftStore } from './designer-dragon-draft.store';
import { applyDesignerDraft } from './designer-part-overrides';
import { setDragonStyleOverride } from '@pbl/assembly/rendering/dragon-procedural-mesh.factory';

/** Dragon-only authoring surface. It has no dependency on genetics lessons or student records. */
@Component({
  selector: 'app-dragon-garage-page',
  imports: [AssemblyGarageComponent],
  template: `
    <app-assembly-garage
      title="Dragon Assembly Garage"
      [presets]="presets()"
      partFamily="dragon"
      initialPresetId="classic-dragon"
      [dragonPackExport]="true"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonGaragePage implements OnDestroy {
  private readonly draft = inject(DesignerDragonDraftStore);

  // `applyDesignerDraft` runs inside this computed, so a size or socket saved in
  // the Parts Lab or Snap Workshop rebuilds the preset behind it.
  readonly presets = computed<readonly AssemblyPreset[]>(() => [
    createClassicDragonTestPreset(definition => applyDesignerDraft(definition, this.draft)),
  ]);

  constructor() {
    effect(() => setDragonStyleOverride(this.draft.style()));
  }

  ngOnDestroy(): void {
    setDragonStyleOverride(null);
  }
}
