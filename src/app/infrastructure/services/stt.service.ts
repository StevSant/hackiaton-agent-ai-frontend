import { Injectable, inject } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';

export type SttEngine = 'browser' | 'server' | 'azure';

@Injectable({ providedIn: 'root' })
export class SttService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;
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
  async transcribeBlob(blob: Blob, language?: string): Promise<string> {
    const form = new FormData();
    form.append('audio', blob, 'recording.webm');
    const url = `${this.base}/stt`;
    const params = language ? new HttpParams().set('language', language) : undefined;
    const data = await firstValueFrom(this.http.post<{ transcript?: string; text?: string }>(url, form, { params }));
    return (data && (data.transcript || data.text)) || '';
  }
}
