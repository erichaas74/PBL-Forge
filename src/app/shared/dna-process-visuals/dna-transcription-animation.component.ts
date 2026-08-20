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
  readonly transcriptionCompleted = output<void>();
  readonly coding = computed(() => dnaSequence(this.sequence()));
  readonly template = computed(() => complementaryDna(this.coding()));
  readonly mrna = computed(() => transcribedRna(this.coding()));
  readonly unzipProgress = signal(0);
  readonly progress = signal(0);
  readonly unzipComplete = computed(() => this.unzipProgress() >= this.coding().length);
  readonly complete = computed(() => this.progress() >= this.coding().length);
  readonly timelineProgress = computed(() => this.unzipProgress() + this.progress());
  readonly phase = computed(() => {
    if (!this.unzipProgress()) return 'zipped';
    if (!this.unzipComplete()) return 'unzipping';
    if (!this.complete()) return 'transcription';
    return 'complete';
  });
  readonly phaseLabel = computed(() => {
    if (!this.unzipComplete()) {
      return `${this.unzipProgress()}/${this.coding().length} DNA base pairs separated`;
    }
    return `${this.progress()}/${this.coding().length} RNA bases added`;
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
        this.unzipProgress.update((value) => Math.min(this.coding().length, value + 1));
        return;
      }
      const next = this.progress() + 1;
      this.progress.set(next);
      if (next >= this.coding().length) {
        this.stop();
        this.transcriptionCompleted.emit();
      }
    }, 300);
  }

  setProgress(value: string | number): void {
    this.stop();
    this.unzipProgress.set(this.coding().length);
    const previous = this.progress();
    const next = Math.max(0, Math.min(this.coding().length, Number(value)));
    this.progress.set(next);
    if (previous < this.coding().length && next >= this.coding().length) {
      this.transcriptionCompleted.emit();
    }
  }

  setTimelineProgress(value: string | number): void {
    this.stop();
    const length = this.coding().length;
    const wasComplete = this.complete();
    const next = Math.max(0, Math.min(length * 2, Number(value)));
    this.unzipProgress.set(Math.min(length, next));
    this.progress.set(Math.max(0, next - length));
    if (!wasComplete && this.complete()) this.transcriptionCompleted.emit();
  }

  unzipperPosition(): number {
    return this.coding().length
      ? Math.min(94, 4 + (this.unzipProgress() * 90) / this.coding().length)
      : 4;
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
