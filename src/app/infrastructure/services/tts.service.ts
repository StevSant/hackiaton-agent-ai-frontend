import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TtsService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voicesReady = false;

  readonly isSpeaking = signal(false);
  readonly isPaused = signal(false);
  readonly currentMessageId = signal<string | null>(null);
  readonly volume = signal(0.9);
  readonly rate = signal(0.9);
  readonly pitch = signal(1);
  readonly lang = signal('es-ES');

  async play(text: string, messageId?: string | null) {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const synth = window.speechSynthesis;

      // Always reset synth to avoid stuck paused states
      try { synth.cancel(); } catch {}
      await this.waitForIdle(synth, 150);

      // Ensure voices are ready (Chrome may return [] on first call)
      await this.ensureVoices(synth, 1500);

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = this.lang();
      utter.rate = this.rate();
      utter.pitch = this.pitch();
      utter.volume = this.volume();

      // Select a voice matching lang, fallback to same language prefix
      try {
        const voices = synth.getVoices?.() || [];
        const langLower = this.lang().toLowerCase();
        let preferred = voices.find(v => v.lang?.toLowerCase() === langLower)
          || voices.find(v => v.lang?.toLowerCase().startsWith(langLower.split('-')[0] || ''))
          || voices[0];
        if (preferred) utter.voice = preferred;
      } catch {}

      this.currentUtterance = utter;
      this.currentMessageId.set(messageId ?? null);
      this.isSpeaking.set(true);
      this.isPaused.set(false);

      const cleanup = () => {
        this.currentUtterance = null;
        this.isSpeaking.set(false);
        this.isPaused.set(false);
        this.currentMessageId.set(null);
      };
      utter.onend = cleanup;
      utter.onerror = cleanup;
      utter.onpause = () => this.isPaused.set(true);
      utter.onresume = () => this.isPaused.set(false);

      let started = false;
      utter.onstart = () => { started = true; this.isPaused.set(false); };

      // Speak on next macrotask to allow cancel() flush and voices attach
      await this.nextTick();
      synth.speak(utter);

      // Kick the synth in case it comes up paused (Chrome quirk)
      setTimeout(() => { try { if (synth.paused) synth.resume(); } catch {} }, 80);

      // Watchdog: if not started, retry once
      setTimeout(async () => {
        if (!started && this.currentUtterance === utter) {
          try { synth.cancel(); } catch {}
          await this.nextTick();
          synth.speak(utter);
          setTimeout(() => { try { if (synth.paused) synth.resume(); } catch {} }, 60);
        }
      }, 300);
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

  private async ensureVoices(synth: SpeechSynthesis, timeoutMs = 1200): Promise<void> {
    if (this.voicesReady && (synth.getVoices?.() || []).length > 0) return;
    const existing = synth.getVoices?.() || [];
    if (existing.length > 0) { this.voicesReady = true; return; }
    let resolve!: () => void;
    const p = new Promise<void>(r => (resolve = r));
    const onChange = () => { this.voicesReady = true; synth.removeEventListener?.('voiceschanged', onChange as any); resolve(); };
    try { synth.addEventListener?.('voiceschanged', onChange as any); } catch {}
    // Fallback polling
    const start = Date.now();
    const poll = () => {
      const list = synth.getVoices?.() || [];
      if (list.length > 0 || Date.now() - start > timeoutMs) {
        onChange();
      } else {
        setTimeout(poll, 100);
      }
    };
    poll();
    await p;
  }

  private async waitForIdle(synth: SpeechSynthesis, timeoutMs = 200) {
    const start = Date.now();
    while ((synth.speaking || (synth as any).pending) && Date.now() - start < timeoutMs) {
      await this.nextTick();
    }
  }

  private nextTick(): Promise<void> {
    return new Promise(res => setTimeout(res, 0));
  }
}
