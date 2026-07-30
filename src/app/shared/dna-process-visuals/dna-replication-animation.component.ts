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
  readonly progress = signal(0);
  readonly complete = computed(() => this.progress() >= this.bases().length);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      this.sequence();
      this.stop();
      this.progress.set(0);
      if (this.autoplay()) this.play();
    });
  }

  play(): void {
    this.stop();
    this.progress.set(0);
    this.timer = setInterval(() => {
      const next = this.progress() + 1;
      this.progress.set(next);
      if (next >= this.bases().length) this.stop();
    }, 480);
  }

  setProgress(value: string | number): void {
    this.stop();
    this.progress.set(Math.max(0, Math.min(this.bases().length, Number(value))));
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
