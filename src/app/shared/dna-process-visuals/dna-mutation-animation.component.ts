import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import {
  DNA_BASES,
  DnaBase,
  DnaMutationMode,
  complementaryDna,
  dnaSequence,
  mutatedSequence,
  mutationIndex,
} from './dna-process.models';

@Component({
  selector: 'app-dna-mutation-animation',
  templateUrl: './dna-mutation-animation.component.html',
  styleUrl: './dna-mutation-animation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DnaMutationAnimationComponent implements OnDestroy {
  readonly mode = input.required<DnaMutationMode>();
  readonly sequence = input('AGTCAT');
  readonly mutationBase = input<DnaBase>('C');
  readonly autoplay = input(false);

  readonly bases = computed(() => dnaSequence(this.sequence()));
  readonly complement = computed(() => complementaryDna(this.bases()));
  readonly targetIndex = computed(() => mutationIndex(this.bases()));
  readonly result = computed(() => {
    const mode = this.mode();
    return mode === 'repair'
      ? this.bases()
      : mutatedSequence(this.bases(), mode, this.mutationBase());
  });
  readonly resultComplement = computed(() => complementaryDna(this.result()));
  readonly phase = signal<0 | 1 | 2>(0);
  readonly repairChoice = signal<DnaBase | null>(null);
  readonly basesToChoose = DNA_BASES;
  readonly correctRepairBase = computed(() => this.complement()[this.targetIndex()]);
  readonly mismatchBase = computed<DnaBase>(() => {
    const preferred = this.mutationBase();
    return preferred === this.correctRepairBase() ? (preferred === 'A' ? 'C' : 'A') : preferred;
  });
  readonly repairCorrect = computed(() => this.repairChoice() === this.correctRepairBase());
  readonly repairIncorrect = computed(() => Boolean(this.repairChoice()) && !this.repairCorrect());
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    effect(() => {
      this.mode();
      this.sequence();
      this.mutationBase();
      this.reset();
      if (this.autoplay() && this.mode() !== 'repair') this.play();
    });
  }

  play(): void {
    if (this.mode() === 'repair') {
      this.reset();
      return;
    }
    this.clearTimers();
    this.phase.set(0);
    this.timers.push(setTimeout(() => this.phase.set(1), 650));
    this.timers.push(setTimeout(() => this.phase.set(2), 1450));
  }

  chooseRepair(base: DnaBase): void {
    this.clearTimers();
    this.repairChoice.set(base);
    this.phase.set(0);
    if (base !== this.correctRepairBase()) return;
    this.phase.set(1);
    this.timers.push(setTimeout(() => this.phase.set(2), 720));
  }

  displayedRepairBase(index: number): DnaBase {
    if (index !== this.targetIndex()) return this.complement()[index];
    return this.phase() === 2 && this.repairCorrect()
      ? this.correctRepairBase()
      : this.mismatchBase();
  }

  reset(): void {
    this.clearTimers();
    this.phase.set(0);
    this.repairChoice.set(null);
  }

  modeLabel(): string {
    const labels: Record<DnaMutationMode, string> = {
      insertion: 'Insertion: add one nucleotide pair',
      deletion: 'Deletion: remove one nucleotide pair',
      substitution: 'Substitution: exchange one nucleotide pair',
      repair: 'Mismatch repair: replace the incorrectly paired base',
    };
    return labels[this.mode()];
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }
}
