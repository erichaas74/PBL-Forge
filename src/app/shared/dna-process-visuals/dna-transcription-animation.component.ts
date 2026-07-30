import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { complementaryDna, dnaSequence, transcribedRna } from './dna-process.models';

@Component({
  selector: 'app-dna-transcription-animation',
  templateUrl: './dna-transcription-animation.component.html',
  styleUrl: './dna-transcription-animation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DnaTranscriptionAnimationComponent implements OnDestroy {
  readonly sequence = input('AGTCAT');
  readonly autoplay = input(false);
  readonly coding = computed(() => dnaSequence(this.sequence()));
  readonly template = computed(() => complementaryDna(this.coding()));
  readonly mrna = computed(() => transcribedRna(this.coding()));
  readonly progress = signal(0);
  readonly complete = computed(() => this.progress() >= this.coding().length);
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
      if (next >= this.coding().length) this.stop();
    }, 650);
  }

  setProgress(value: string | number): void {
    this.stop();
    this.progress.set(Math.max(0, Math.min(this.coding().length, Number(value))));
  }

  polymerasePosition(): number {
    return this.coding().length
      ? Math.min(92, 6 + (this.progress() * 86) / this.coding().length)
      : 6;
  }

  ngOnDestroy(): void {
    this.stop();
  }
  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
