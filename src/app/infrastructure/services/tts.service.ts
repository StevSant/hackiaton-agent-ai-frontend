import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TtsService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voicesReady = false;
  private lastText: string | null = null;
  private lastMessageId: string | null = null;
  private restartingForVolume = false;

  readonly isSpeaking = signal(false);
  readonly isPaused = signal(false);
  readonly currentMessageId = signal<string | null>(null);
  readonly volume = signal(0.9);
  readonly rate = signal(0.9);
  readonly pitch = signal(1);
  readonly lang = signal('es-ES');

  async play(text: string, messageId?: string | null) {
    console.log('🔊 TTS play called with:', { text: text.substring(0, 100) + '...', messageId, textLength: text.length });
    
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.error('🔊 Speech synthesis not available');
        return;
      }
      
      if (!text || text.trim().length === 0) {
        console.error('🔊 Empty text provided to TTS');
        return;
      }
      
      const synth = window.speechSynthesis;
      console.log('🔊 Speech synthesis state:', { speaking: synth.speaking, pending: (synth as any).pending, paused: synth.paused });

      // Always reset synth to avoid stuck paused states
      try {
        synth.cancel();
      } catch {}
      await this.waitForIdle(synth, 150);

      // Ensure voices are ready (Chrome may return [] on first call)
      await this.ensureVoices(synth, 1500);
      console.log('🔊 Available voices:', synth.getVoices().length);

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = this.lang();
      utter.rate = this.rate();
      utter.pitch = this.pitch();
      utter.volume = this.volume();
      
      console.log('🔊 Utterance settings:', { 
        lang: utter.lang, 
        rate: utter.rate, 
        pitch: utter.pitch, 
        volume: utter.volume 
      });

      // Select a voice matching lang, fallback to same language prefix
      try {
        const voices = synth.getVoices?.() || [];
        const langLower = this.lang().toLowerCase();
        let preferred =
          voices.find((v) => v.lang?.toLowerCase() === langLower) ||
          voices.find((v) =>
            v.lang?.toLowerCase().startsWith(langLower.split('-')[0] || ''),
          ) ||
          voices[0];
        if (preferred) {
          utter.voice = preferred;
          console.log('🔊 Selected voice:', preferred.name, preferred.lang);
        } else {
          console.log('🔊 No voice found, using default');
        }
      } catch (e) {
        console.error('🔊 Error selecting voice:', e);
      }

  this.currentUtterance = utter;
  // store last text so volume changes can reapply during active speech
  this.lastText = text;
  this.lastMessageId = messageId ?? null;
      this.currentMessageId.set(messageId ?? null);
      this.isSpeaking.set(true);
      this.isPaused.set(false);

      const cleanup = () => {
        console.log('🔊 TTS cleanup called');
        this.currentUtterance = null;
        this.isSpeaking.set(false);
        this.isPaused.set(false);
        this.currentMessageId.set(null);
  this.lastText = null;
  this.lastMessageId = null;
      };
      utter.onend = () => {
        console.log('🔊 TTS ended');
        cleanup();
      };
      utter.onerror = (event) => {
        console.error('🔊 TTS error:', event);
        cleanup();
      };
      utter.onpause = () => {
        console.log('🔊 TTS paused');
        this.isPaused.set(true);
      };
      utter.onresume = () => {
        console.log('🔊 TTS resumed');
        this.isPaused.set(false);
      };

      let started = false;
      utter.onstart = () => {
        console.log('🔊 TTS started');
        started = true;
        this.isPaused.set(false);
      };

      // Speak on next macrotask to allow cancel() flush and voices attach
      await this.nextTick();
      console.log('🔊 About to call synth.speak()');
      synth.speak(utter);

      // Kick the synth in case it comes up paused (Chrome quirk)
      setTimeout(() => {
        try {
          if (synth.paused) {
            console.log('🔊 Synth was paused, resuming');
            synth.resume();
          }
        } catch {}
      }, 80);

      // Watchdog: if not started, retry once
      setTimeout(async () => {
        if (!started && this.currentUtterance === utter) {
          console.log('🔊 TTS watchdog: not started, retrying');
          try {
            synth.cancel();
          } catch {}
          await this.nextTick();
          synth.speak(utter);
          setTimeout(() => {
            try {
              if (synth.paused) synth.resume();
            } catch {}
          }, 60);
        }
      }, 300);
    } catch (error) {
      console.error('🔊 TTS play error:', error);
    }
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

  async setVolume(val: number) {
    const v = Math.max(0, Math.min(1, val));
    this.volume.set(v);
    if (this.currentUtterance) {
      try {
        this.currentUtterance.volume = v;
      } catch {}
    }

    // If currently speaking (not paused), restart playback to ensure new volume is applied
    try {
      if (typeof window !== 'undefined') {
        const synth = window.speechSynthesis;
        if (
          this.currentUtterance &&
          synth.speaking &&
          !this.isPaused() &&
          this.lastText &&
          !this.restartingForVolume
        ) {
          this.restartingForVolume = true;
          // stop current utterance then replay with new volume
          try {
            synth.cancel();
          } catch {}
          // small delay to allow engine to reset
          await this.nextTick();
          const text = this.lastText;
          const mid = this.lastMessageId;
          // replay
          try {
            await this.play(text, mid);
          } catch (e) {
            console.error('🔊 Error replaying after volume change', e);
          }
          this.restartingForVolume = false;
        }
      }
    } catch (e) {
      console.error('🔊 setVolume error:', e);
      this.restartingForVolume = false;
    }
  }

  private async ensureVoices(
    synth: SpeechSynthesis,
    timeoutMs = 1200,
  ): Promise<void> {
    if (this.voicesReady && (synth.getVoices?.() || []).length > 0) return;
    const existing = synth.getVoices?.() || [];
    if (existing.length > 0) {
      this.voicesReady = true;
      return;
    }
    let resolve!: () => void;
    const p = new Promise<void>((r) => (resolve = r));
    const onChange = () => {
      this.voicesReady = true;
      synth.removeEventListener?.('voiceschanged', onChange as any);
      resolve();
    };
    try {
      synth.addEventListener?.('voiceschanged', onChange as any);
    } catch {}
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
    while (
      (synth.speaking || (synth as any).pending) &&
      Date.now() - start < timeoutMs
    ) {
      await this.nextTick();
    }
  }

  private nextTick(): Promise<void> {
    return new Promise((res) => setTimeout(res, 0));
  }
}
