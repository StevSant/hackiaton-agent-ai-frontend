import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type SttEngine = 'browser' | 'server' | 'azure';

@Injectable({ providedIn: 'root' })
export class SttService {
  private engine: SttEngine = 'browser';
  private readonly results$ = new Subject<{ text: string; isFinal: boolean }>();

  setEngine(engine: SttEngine) {
    this.engine = engine;
  }

  getEngine(): SttEngine { return this.engine; }

  onResult() { return this.results$.asObservable(); }

  // Placeholder: hook to plug an Azure SDK streaming STT if desired later
  async startStreaming(): Promise<void> {
    // No-op here; browser STT is handled in the component for now
  }

  async stopStreaming(): Promise<void> {
    // No-op here
  }

  // Server-based STT: upload an audio Blob to the backend and receive transcript
  async transcribeBlob(blob: Blob): Promise<string> {
    const form = new FormData();
    form.append('audio', blob, 'recording.webm');
    const res = await fetch('/api/stt', { method: 'POST', body: form });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(msg || `Transcripción fallida (${res.status})`);
    }
    const data = await res.json().catch(() => ({}));
    return (data && (data.transcript || data.text)) || '';
  }
}
