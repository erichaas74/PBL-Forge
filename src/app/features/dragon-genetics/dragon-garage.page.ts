import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AssemblyGarageComponent } from '../../shared/assembly-garage/assembly-garage.component';
import { AssemblyPreset } from '../../shared/assembly-garage/models/assembly.models';
import { CLASSIC_DRAGON_TEST_PRESET } from '../../shared/assembly-garage/data/presets/classic-dragon-test';
import { findParent, materializeDragon, runDragonBatch } from './dragon-genetics.domain';
import { DRAGON_TRAITS, genotypeLabel } from './simulation/domain/dragon-inheritance';
import { DragonLabGenome } from './simulation/domain/dragon-lab.models';
import { StudentDragonRecord } from './dragon-genetics.models';

/** Deterministic seed so the test dragons are identical on every visit. */
const LAB_TEST_RUN = 7;

/**
 * Dragon-only garage for testing. The presets are real genetics-lab dragons —
 * bred, expressed, and assembled by the exact same domain pipeline the lab and
 * arena use — plus the base catalog dragon. The parts catalog is pinned to the
 * dragon family, so no other build type is reachable from here.
 */
@Component({
  selector: 'app-dragon-garage-page',
  imports: [AssemblyGarageComponent],
  template: `
    <app-assembly-garage
      title="Dragon Assembly Garage"
      partFamily="dragon"
      arenaLink="/dragon-duel"
      [presets]="presets"
      [initialPresetId]="presets[0].id" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonGaragePage {
  readonly presets: readonly AssemblyPreset[] = [
    ...runDragonBatch(findParent('ember'), findParent('tide'), LAB_TEST_RUN, 2)
      .sample.map(record => toLabPreset(record, 'Ember × Tide')),
    CLASSIC_DRAGON_TEST_PRESET,
  ];
}

function toLabPreset(record: StudentDragonRecord, parentage: string): AssemblyPreset {
  return {
    id: `lab-${record.id}`,
    name: `${record.name} (${parentage})`,
    description: `Genetics lab dragon, generation ${record.generation} — ${describeGenome(record.genome)}`,
    state: materializeDragon(record).assembly,
  };
}

function describeGenome(genome: DragonLabGenome): string {
  return DRAGON_TRAITS
    .map(trait => `${trait.name} ${genotypeLabel(genome[trait.id])}`)
    .join(' · ');
}
