import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TtsService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  readonly isSpeaking = signal(false);
  readonly isPaused = signal(false);
  readonly currentMessageId = signal<string | null>(null);
  readonly volume = signal(0.9);
  readonly rate = signal(0.9);
  readonly pitch = signal(1);
  readonly lang = signal('es-ES');

  play(text: string, messageId?: string | null) {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      // Stop any current playback only if another message or paused state
      if (this.isSpeaking() || this.isPaused()) {
        window.speechSynthesis.cancel();
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = this.lang();
      utter.rate = this.rate();
      utter.pitch = this.pitch();
      utter.volume = this.volume();

      // Try to select a voice that matches current lang
      try {
        const voices = window.speechSynthesis.getVoices?.() || [];
        const preferred = voices.find(v => v.lang?.toLowerCase().startsWith(this.lang().toLowerCase()));
        if (preferred) utter.voice = preferred;
      } catch {}

      this.currentUtterance = utter;
      this.currentMessageId.set(messageId ?? null);
      this.isSpeaking.set(true);
      this.isPaused.set(false);

      const onFinish = () => {
        this.currentUtterance = null;
        this.isSpeaking.set(false);
        this.isPaused.set(false);
        this.currentMessageId.set(null);
      };
      utter.onend = onFinish;
      utter.onerror = onFinish;
      utter.onpause = () => this.isPaused.set(true);
      utter.onresume = () => this.isPaused.set(false);

  // Defer speak to ensure voices are loaded
  queueMicrotask(() => window.speechSynthesis.speak(utter));
    } catch {}
  }

  pause() {
    try {
      if (typeof window === 'undefined') return;
      if (this.isSpeaking() && !this.isPaused()) {
        window.speechSynthesis.pause();
        this.isPaused.set(true);
      }
    } catch {}
  }

  resume() {
    try {
      if (typeof window === 'undefined') return;
      if (this.isPaused()) {
  window.speechSynthesis.resume();
  this.isPaused.set(false);
      }
    } catch {}
  }

  stop() {
    try {
      if (typeof window === 'undefined') return;
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
      this.isSpeaking.set(false);
      this.isPaused.set(false);
      this.currentMessageId.set(null);
    } catch {}
  }

  setVolume(val: number) {
    const v = Math.max(0, Math.min(1, val));
    this.volume.set(v);
    if (this.currentUtterance) {
      this.currentUtterance.volume = v;
    }
  }
}
