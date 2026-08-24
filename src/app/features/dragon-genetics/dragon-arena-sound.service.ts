import { Service, signal } from '@angular/core';

/**
 * Synthesized battle sounds — Web Audio oscillators and filtered noise, no audio
 * files to load. The context is created lazily on the first user action so the
 * browser autoplay policy is satisfied.
 */
@Service({ autoProvided: false })
export class DragonArenaSoundService {
  readonly enabled = signal(readStoredSoundEnabled());

  private context: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  toggle(): void {
    this.enabled.update(value => !value);
    try {
      globalThis.localStorage?.setItem(SOUND_STORAGE_KEY, String(this.enabled()));
    } catch {
      // Storage unavailable: the toggle still works for this session.
    }
  }

  playBite(): void {
    const context = this.ensureContext();
    if (!context) return;
    // Snap: short click plus a low thump.
    this.playNoise(context, { duration: 0.07, filterType: 'bandpass', frequency: 2400, gain: 0.4 });
    this.playTone(context, { from: 190, to: 70, duration: 0.12, type: 'square', gain: 0.18 });
  }

  playWing(): void {
    const context = this.ensureContext();
    if (!context) return;
    this.playNoise(context, { duration: 0.28, filterType: 'lowpass', frequency: 900, sweepTo: 2200, gain: 0.3 });
  }

  playTail(): void {
    const context = this.ensureContext();
    if (!context) return;
    this.playNoise(context, { duration: 0.3, filterType: 'lowpass', frequency: 420, sweepTo: 180, gain: 0.34 });
  }

  playFire(): void {
    const context = this.ensureContext();
    if (!context) return;
    this.playNoise(context, { duration: 0.55, filterType: 'bandpass', frequency: 500, sweepTo: 1400, gain: 0.32 });
  }

  playImpact(): void {
    const context = this.ensureContext();
    if (!context) return;
    this.playTone(context, { from: 95, to: 42, duration: 0.16, type: 'sine', gain: 0.32 });
    this.playNoise(context, { duration: 0.1, filterType: 'lowpass', frequency: 700, gain: 0.2 });
  }

  playVictory(): void {
    const context = this.ensureContext();
    if (!context) return;
    this.playTone(context, { from: 392, to: 392, duration: 0.16, type: 'triangle', gain: 0.2 });
    this.playTone(context, { from: 523, to: 523, duration: 0.3, type: 'triangle', gain: 0.2, delaySeconds: 0.16 });
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled()) return null;
    if (!this.context) {
      const Constructor = globalThis.AudioContext;
      if (!Constructor) return null;
      this.context = new Constructor();
    }
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
    return this.context;
  }

  private playTone(
    context: AudioContext,
    options: {
      from: number;
      to: number;
      duration: number;
      type: OscillatorType;
      gain: number;
      delaySeconds?: number;
    },
  ): void {
    const start = context.currentTime + (options.delaySeconds ?? 0);
    const oscillator = context.createOscillator();
    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(options.to, 1), start + options.duration);

    const gain = context.createGain();
    gain.gain.setValueAtTime(options.gain, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + options.duration);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + options.duration + 0.02);
  }

  private playNoise(
    context: AudioContext,
    options: {
      duration: number;
      filterType: BiquadFilterType;
      frequency: number;
      sweepTo?: number;
      gain: number;
    },
  ): void {
    const start = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = this.getNoiseBuffer(context);

    const filter = context.createBiquadFilter();
    filter.type = options.filterType;
    filter.frequency.setValueAtTime(options.frequency, start);
    if (options.sweepTo) {
      filter.frequency.exponentialRampToValueAtTime(options.sweepTo, start + options.duration);
    }

    const gain = context.createGain();
    gain.gain.setValueAtTime(options.gain, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + options.duration);

    source.connect(filter).connect(gain).connect(context.destination);
    source.start(start);
    source.stop(start + options.duration + 0.02);
  }

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const length = context.sampleRate;
      this.noiseBuffer = context.createBuffer(1, length, context.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) {
        data[index] = Math.random() * 2 - 1;
      }
    }
    return this.noiseBuffer;
  }
}

const SOUND_STORAGE_KEY = 'pbl-forge.arena-sound';

function readStoredSoundEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(SOUND_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}
