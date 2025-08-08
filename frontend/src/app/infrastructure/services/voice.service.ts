import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type VoiceEvent = { text: string; isFinal: boolean };

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private recognition: any | null = null;
  private listening = false;

  constructor(private readonly zone: NgZone) {}

  isSupported(): boolean {
    return typeof window !== 'undefined' && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
  }

  start(options?: { lang?: string; interim?: boolean; continuous?: boolean }): Observable<VoiceEvent> {
    if (!this.isSupported()) {
      throw new Error('Web Speech API no soportada');
    }
    const out$ = new Subject<VoiceEvent>();
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new Ctor();
    this.recognition.lang = options?.lang || (navigator?.language || 'es-ES');
    this.recognition.interimResults = options?.interim ?? true;
    this.recognition.continuous = options?.continuous ?? true;
    this.listening = true;

    let finalText = '';

    this.recognition.onresult = (evt: any) => {
      this.zone.run(() => {
        let interim = '';
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          const res = evt.results[i];
          const t = res[0]?.transcript || '';
          if (res.isFinal) finalText += t + ' ';
          else interim += t + ' ';
        }
        const combined = (finalText + ' ' + interim).trim();
        out$.next({ text: combined, isFinal: false });
      });
    };

    this.recognition.onerror = (e: any) => {
      this.zone.run(() => {
        this.listening = false;
        // If it's a benign 'no-speech' error, try to restart silently to keep UX smooth
        const code = (e && (e.error || e.name)) || 'unknown';
        if (code === 'no-speech') {
          try { this.recognition?.start?.(); this.listening = true; } catch {}
          return;
        }
        out$.error?.(e);
      });
    };

    this.recognition.onend = () => {
      this.zone.run(() => {
        const done = this.listening === false; // ended by stop()
        if (!done) {
          // auto-restart while client wants to keep listening
          try { this.recognition?.start?.(); } catch {}
        } else {
          out$.complete();
        }
      });
    };

    // Warm-up mic permission to reduce no-speech issues
    const warmUp = async () => {
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          try { stream.getTracks().forEach(t => t.stop()); } catch {}
        }
      } catch { /* ignore */ }
    };
    warmUp().finally(() => { try { this.recognition?.start?.(); } catch {} });
    return out$.asObservable();
  }

  stop(): void {
    this.listening = false;
    try { this.recognition?.stop?.(); } catch {}
    this.recognition = null;
  }
}
