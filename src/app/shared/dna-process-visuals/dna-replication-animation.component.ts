import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { complementaryDna, dnaSequence } from './dna-process.models';

@Component({
  selector: 'app-dna-replication-animation',
  templateUrl: './dna-replication-animation.component.html',
  styleUrl: './dna-replication-animation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DnaReplicationAnimationComponent implements OnDestroy {
  readonly sequence = input('AGTCAT');
  readonly autoplay = input(false);
  readonly bases = computed(() => dnaSequence(this.sequence()));
  readonly complement = computed(() => complementaryDna(this.bases()));
  readonly unzipProgress = signal(0);
  readonly progress = signal(0);
  readonly unzipComplete = computed(() => this.unzipProgress() >= this.bases().length);
  readonly complete = computed(() => this.progress() >= this.bases().length);
  readonly timelineProgress = computed(() => this.unzipProgress() + this.progress());
  readonly phase = computed(() => {
    if (!this.unzipProgress()) return 'zipped';
    if (!this.unzipComplete()) return 'unzipping';
    if (!this.complete()) return 'synthesis';
    return 'complete';
  });
  readonly phaseLabel = computed(() => {
    if (!this.unzipComplete()) {
      return `${this.unzipProgress()}/${this.bases().length} DNA base pairs separated`;
    }
    return `${this.progress()}/${this.bases().length} complementary bases added`;
  });
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      this.sequence();
      this.stop();
      this.unzipProgress.set(0);
      this.progress.set(0);
      if (this.autoplay()) this.play();
    });
  }

  play(): void {
    this.stop();
    this.unzipProgress.set(0);
    this.progress.set(0);
    this.timer = setInterval(() => {
      if (!this.unzipComplete()) {
        this.unzipProgress.update((value) => Math.min(this.bases().length, value + 1));
        return;
      }
      const next = this.progress() + 1;
      this.progress.set(next);
      if (next >= this.bases().length) this.stop();
    }, 240);
  }

  setProgress(value: string | number): void {
    this.stop();
    this.unzipProgress.set(this.bases().length);
    this.progress.set(Math.max(0, Math.min(this.bases().length, Number(value))));
  }

  setTimelineProgress(value: string | number): void {
    this.stop();
    const length = this.bases().length;
    const next = Math.max(0, Math.min(length * 2, Number(value)));
    this.unzipProgress.set(Math.min(length, next));
    this.progress.set(Math.max(0, next - length));
  }

  unzipperPosition(): number {
    return this.bases().length
      ? Math.min(94, 4 + (this.unzipProgress() * 90) / this.bases().length)
      : 4;
  }

  polymerasePosition(): number {
    return this.bases().length ? Math.min(92, 6 + (this.progress() * 86) / this.bases().length) : 6;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
