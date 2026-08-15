import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  DRAGON_PARENTS,
  DRAGON_TRAITS,
  breedLabClutch,
} from '../../simulation/domain/dragon-inheritance';
import {
  DragonOffspring,
  DragonTraitId,
} from '../../simulation/domain/dragon-lab.models';
import { DragonHatcheryStationComponent } from '../dragon-hatchery/dragon-hatchery-station.component';
import { HatcheryRunRecord } from '../dragon-hatchery/dragon-hatchery.models';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';

export interface CandlingEggAssignment {
  egg: DragonOffspring;
  focusTraitId: DragonTraitId;
  assignmentCode: string;
}

@Component({
  selector: 'app-candling-workstation',
  imports: [DragonHatcheryStationComponent],
  templateUrl: './candling-workstation.component.html',
  styleUrl: './candling-workstation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandlingWorkstationComponent {
  readonly studentId = input.required<string>();
  readonly seed = input('candling-workstation');
  /** A teacher or another lab can supply a particular sealed egg. Otherwise one is assigned. */
  readonly assignedEgg = input<DragonOffspring | null>(null);
  readonly assignedFocusTraitId = input<DragonTraitId | null>(null);

  readonly recordSaved = output<HatcheryRunRecord>();
  readonly hatchedDragons = output<readonly DragonOffspring[]>();

  readonly assignmentNumber = signal(0);
  readonly generatedAssignment = computed(() =>
    createCandlingEggAssignment(
      normalizeWorkstationStudentId(this.studentId()),
      this.seed(),
      this.assignmentNumber(),
    ),
  );
  readonly egg = computed(() => this.assignedEgg() ?? this.generatedAssignment().egg);
  readonly focusTraitId = computed(
    () => this.assignedFocusTraitId() ?? this.generatedAssignment().focusTraitId,
  );
  readonly assignmentCode = computed(() =>
    this.assignedEgg()
      ? `ASSIGNED-${this.assignedEgg()!.id.toUpperCase()}`
      : this.generatedAssignment().assignmentCode,
  );
  readonly clutch = computed<readonly DragonOffspring[]>(() => [this.egg()]);

  assignAnotherEgg(): void {
    if (this.assignedEgg()) return;
    this.assignmentNumber.update((current) => current + 1);
  }
}

export function createCandlingEggAssignment(
  studentId: string,
  seed: string,
  assignmentNumber: number,
): CandlingEggAssignment {
  const hash = hashSeed(`${studentId}:${seed}:${assignmentNumber}`);
  const firstParentIndex = hash % DRAGON_PARENTS.length;
  const secondParentIndex = (firstParentIndex + 1 + ((hash >>> 5) % (DRAGON_PARENTS.length - 1))) % DRAGON_PARENTS.length;
  const run = 1 + ((hash >>> 9) % 100_000);
  const source = breedLabClutch(
    DRAGON_PARENTS[firstParentIndex],
    DRAGON_PARENTS[secondParentIndex],
    run,
    1,
  )[0];
  const focusTraitId = DRAGON_TRAITS[(hash >>> 17) % DRAGON_TRAITS.length].id;
  const suffix = hash.toString(36).toUpperCase().padStart(7, '0').slice(-7);
  return {
    egg: {
      ...source,
      id: `candling-${suffix}-${assignmentNumber + 1}`,
      name: `Unknown egg ${suffix}`,
      title: 'Sealed student specimen',
    },
    focusTraitId,
    assignmentCode: `EGG-${suffix}`,
  };
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
