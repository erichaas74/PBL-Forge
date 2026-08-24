import { Injectable, signal } from '@angular/core';

/** Browser-local voice for the Wise Dragon avatar; no recording or network request is involved. */
@Injectable({ providedIn: 'root' })
export class WiseDragonVoiceService {
  readonly enabled = signal(true);
  readonly speaking = signal(false);
  readonly speechPulse = signal(0);
  private pulseTimer: ReturnType<typeof setInterval> | null = null;

  get supported(): boolean {
    return typeof globalThis.speechSynthesis !== 'undefined'
      && typeof globalThis.SpeechSynthesisUtterance !== 'undefined';
  }

  toggle(): void {
    this.enabled.update((enabled) => !enabled);
    if (!this.enabled()) this.stop();
  }

  speak(message: string): void {
    if (!this.enabled() || !this.supported) return;
    this.stop();
    const utterance = new SpeechSynthesisUtterance(cleanForSpeech(message));
    utterance.rate = 0.9;
    utterance.pitch = 0.72;
    utterance.volume = 0.92;
    utterance.voice = preferredVoice(speechSynthesis.getVoices());
    utterance.onstart = () => this.startPulses();
    utterance.onend = () => this.finishSpeaking();
    utterance.onerror = () => this.finishSpeaking();
    speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (this.supported) speechSynthesis.cancel();
    this.finishSpeaking();
  }

  private startPulses(): void {
    this.finishSpeaking();
    this.speaking.set(true);
    this.speechPulse.update((pulse) => pulse + 1);
    this.pulseTimer = setInterval(() => {
      if (this.speaking()) this.speechPulse.update((pulse) => pulse + 1);
    }, 2600);
  }

  private finishSpeaking(): void {
    if (this.pulseTimer !== null) clearInterval(this.pulseTimer);
    this.pulseTimer = null;
    this.speaking.set(false);
  }
}

function preferredVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  return english.find((voice) => /daniel|david|george|guy|male/i.test(voice.name))
    ?? english.find((voice) => voice.localService)
    ?? english[0]
    ?? voices[0]
    ?? null;
}

function cleanForSpeech(message: string): string {
  return message
    .replace(/[`*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
