import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { HatcheryEggGlyphComponent } from '../../shared/dragon-visuals/displays/dragon-hatchery/hatchery-egg-glyph.component';
import { SpecimenThumbComponent } from '../../shared/assembly/preview';
import {
  dragonParentSource,
  provideDragonSpecimenProfile,
} from './simulation/domain/dragon-specimen.profile';
import {
  DragonParentProfile,
  DragonTraitDefinition,
  DragonTraitId,
} from './simulation/domain/dragon-lab.models';
import { genotypeLabel, phenotypeLabel } from './simulation/domain/dragon-inheritance';

type MeiosisPhase = 'ready' | 'separating' | 'combining' | 'complete';

interface GameteAllele {
  traitId: DragonTraitId;
  geneSymbol: string;
  allele: string;
}

interface GameteModel {
  id: string;
  alleles: readonly GameteAllele[];
}

interface FertilizedEggModel {
  id: string;
  genotypes: readonly string[];
}

export interface MeiosisParentChange {
  slot: 'a' | 'b';
  parentId: string;
}

const ALLELE_PATTERNS = [
  [0, 0, 1, 1],
  [0, 1, 0, 1],
  [0, 1, 1, 0],
] as const;

const EGG_PAIRINGS = [
  [0, 0],
  [0, 2],
  [2, 0],
  [2, 2],
] as const;

@Component({
  selector: 'app-dragon-meiosis-quiz',
  imports: [SpecimenThumbComponent, HatcheryEggGlyphComponent],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './dragon-meiosis-quiz.component.html',
  styleUrl: './dragon-meiosis-quiz.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonMeiosisQuizComponent implements OnDestroy {
  /** Memoised upstream, so calling this from a binding is safe. */
  readonly specimenSource = dragonParentSource;
  readonly parents = input.required<readonly DragonParentProfile[]>();
  readonly selectedParents = input.required<readonly [DragonParentProfile, DragonParentProfile]>();
  readonly traits = input.required<readonly DragonTraitDefinition[]>();
  readonly focusTraitId = input.required<DragonTraitId>();
  readonly eggOptions = input.required<readonly string[]>();
  readonly possibleEggs = input.required<ReadonlySet<string>>();
  readonly predictions = input.required<readonly string[]>();
  readonly locked = input(false);
  readonly predictionCorrect = input(false);

  readonly parentChanged = output<MeiosisParentChange>();
  readonly focusTraitChanged = output<DragonTraitId>();
  readonly predictionToggled = output<string>();
  readonly predictionLocked = output<void>();
  readonly predictionReset = output<void>();

  readonly phase = signal<MeiosisPhase>('ready');
  readonly optionalTraitIds = signal<readonly DragonTraitId[]>(['wings', 'fire', 'scales']);
  readonly selectedTraits = computed(() => {
    const focus = this.focusTraitId();
    const ids = [focus, ...this.optionalTraitIds().filter((id) => id !== focus)].slice(0, 3);
    return ids.map((id) => this.traits().find((trait) => trait.id === id)).filter(isTrait);
  });
  readonly focusTrait = computed(
    () => this.traits().find((trait) => trait.id === this.focusTraitId()) ?? this.traits()[0],
  );
  readonly parentAGametes = computed(() => this.buildGametes(this.selectedParents()[0], 'a'));
  readonly parentBGametes = computed(() => this.buildGametes(this.selectedParents()[1], 'b'));
  readonly fertilizedEggs = computed(() =>
    EGG_PAIRINGS.map(
      ([aIndex, bIndex], index) =>
        ({
          id: `fertilized-${index + 1}`,
          genotypes: this.selectedTraits().map((trait, traitIndex) => {
            const aAllele = this.parentAGametes()[aIndex].alleles[traitIndex].allele;
            const bAllele = this.parentBGametes()[bIndex].alleles[traitIndex].allele;
            return genotypeLabel([aAllele, bAllele]);
          }),
        }) satisfies FertilizedEggModel,
    ),
  );
  private timers: ReturnType<typeof setTimeout>[] = [];
  private animationRunning = false;

  constructor() {
    effect(() => {
      const configuration = `${this.selectedParents()
        .map((parent) => parent.id)
        .join(':')}:${this.focusTraitId()}`;
      if (!configuration) return;
      this.stopTimers();
      this.animationRunning = false;
      this.phase.set('ready');
    });
    effect(() => {
      const locked = this.locked();
      if (!this.animationRunning) this.phase.set(locked ? 'complete' : 'ready');
    });
  }

  setParent(slot: 'a' | 'b', event: Event): void {
    this.parentChanged.emit({ slot, parentId: (event.target as HTMLSelectElement).value });
  }

  setFocusTrait(event: Event): void {
    this.focusTraitChanged.emit((event.target as HTMLSelectElement).value as DragonTraitId);
  }

  toggleAdditionalTrait(traitId: DragonTraitId, event: Event): void {
    if (traitId === this.focusTraitId()) return;
    const checked = (event.target as HTMLInputElement).checked;
    this.optionalTraitIds.update((current) =>
      checked
        ? [...new Set([...current, traitId])].slice(0, 3)
        : current.filter((id) => id !== traitId),
    );
  }

  geneSelectionDisabled(traitId: DragonTraitId): boolean {
    return (
      traitId !== this.focusTraitId() &&
      !this.optionalTraitIds().includes(traitId) &&
      this.selectedTraits().length >= 3
    );
  }

  parentGenotype(parent: DragonParentProfile, trait: DragonTraitDefinition): string {
    return genotypeLabel(parent.genome[trait.id]);
  }

  parentPhenotype(parent: DragonParentProfile): string {
    return phenotypeLabel(parent, this.focusTraitId());
  }

  optionAlleles(genotype: string): readonly string[] {
    return [
      genotype,
      ...this.selectedTraits()
        .slice(1)
        .map(() => '?'),
    ];
  }

  runMeiosis(): void {
    if (!this.predictions().length) return;
    this.predictionLocked.emit();
    this.stopTimers();
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.phase.set('complete');
      return;
    }
    this.animationRunning = true;
    this.phase.set('separating');
    this.timers.push(setTimeout(() => this.phase.set('combining'), 1300));
    this.timers.push(
      setTimeout(() => {
        this.animationRunning = false;
        this.phase.set('complete');
      }, 2700),
    );
  }

  reset(): void {
    this.stopTimers();
    this.animationRunning = false;
    this.phase.set('ready');
    this.predictionReset.emit();
  }

  ngOnDestroy(): void {
    this.stopTimers();
  }

  private buildGametes(parent: DragonParentProfile, side: 'a' | 'b'): readonly GameteModel[] {
    return Array.from({ length: 4 }, (_, gameteIndex) => ({
      id: `${side}-gamete-${gameteIndex + 1}`,
      alleles: this.selectedTraits().map((trait, traitIndex) => ({
        traitId: trait.id,
        geneSymbol: trait.geneSymbol,
        allele: parent.genome[trait.id][ALLELE_PATTERNS[traitIndex][gameteIndex]],
      })),
    }));
  }

  private stopTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }
}

function isTrait(value: DragonTraitDefinition | undefined): value is DragonTraitDefinition {
  return Boolean(value);
}
