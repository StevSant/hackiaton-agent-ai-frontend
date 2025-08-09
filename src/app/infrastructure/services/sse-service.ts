import { Injectable, inject } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { environment } from '@environments/environment';
import { TokenStorageService } from './token-storage.service';


// Legacy-ish shape used by UI. We'll map backend SSE events into this.
export interface SSEMessage {
  content: string;
  content_type: string;
  event: string;
  run_id: string;
  agent_id: string;
  session_id: string;
  created_at: number;
  model?: string;
  messages?: any[];
  metrics?: any;
  failed_generation?: any;
  extra_data?: any;
  images?: any[];
  videos?: any[];
  audio?: any[];
  response_audio?: any;
}

export interface StreamResponse {
  fullContent: string
  currentChunk: string
  event: string
  isComplete: boolean
  isError: boolean
  rawMessage: SSEMessage
}

@Injectable({
  providedIn: "root",
})
export class SseService {
  private readonly baseUrl = environment.baseUrl;
  private abortController: AbortController | null = null
  private readonly cancel$ = new Subject<void>()
  private readonly tokenStorage = inject(TokenStorageService);

  cancel() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.cancel$.next()
  }

  streamFromAgent(
    _agentId: string,
    payload: { message?: string; session_id?: string; user_id?: string; audioFile?: File; files?: File[]; file_ids?: string[] }
  ): Observable<StreamResponse> {
    // New backend endpoint: JSON body -> POST /agent/message/stream
    const url = `${this.baseUrl}/agent/message/stream`;

    return new Observable<StreamResponse>((observer) => {
      const controller = new AbortController();
      this.abortController = controller;
      let fullContent = "";

      const headers: Record<string, string> = {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
      };
      const token = this.tokenStorage.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body = JSON.stringify({
        content: payload?.message ?? "",
        session_id: payload?.session_id ?? undefined,
        file_ids: payload?.file_ids ?? [],
      });

      fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok || !response.body) {
            const errorText = await response.text();
            throw new Error(`Error SSE: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let buffer = "";
          let currentEvent: string | null = null;
          let dataBuffer = "";

          const emit = (event: string, data: any) => {
            // Map backend events to UI model events
            if (event === 'start') {
              const msg: SSEMessage = {
                content: '',
                content_type: 'text',
                event: 'RunStarted',
                run_id: '',
                agent_id: '',
                session_id: data?.session_id || '',
                created_at: Date.now(),
              } as SSEMessage;
              observer.next({
                fullContent,
                currentChunk: '',
                event: 'RunStarted',
                isComplete: false,
                isError: false,
                rawMessage: msg,
              });
              return;
            }

            if (event === 'user_message') {
              // Inform session id early if provided
              const msg: SSEMessage = {
                content: data?.message?.content || '',
                content_type: 'text',
                event: 'UserMessage',
                run_id: '',
                agent_id: '',
                session_id: data?.session_id || '',
                created_at: Date.now(),
              } as SSEMessage;
              observer.next({
                fullContent,
                currentChunk: '',
                event: 'UserMessage',
                isComplete: false,
                isError: false,
                rawMessage: msg,
              });
              return;
            }

            if (event === 'responding') {
              const delta: string = data?.delta ?? '';
              if (delta) fullContent += delta;
              const msg: SSEMessage = {
                content: delta,
                content_type: 'text',
                event: 'RunResponse',
                run_id: '',
                agent_id: '',
                session_id: data?.session_id || '',
                created_at: Date.now(),
              } as SSEMessage;
              observer.next({
                fullContent,
                currentChunk: delta,
                event: 'RunResponse',
                isComplete: false,
                isError: false,
                rawMessage: msg,
              });
              return;
            }

            if (event === 'end') {
              const content: string = data?.agent_message?.content ?? fullContent;
              if (!fullContent) fullContent = content;
              const msg: SSEMessage = {
                content,
                content_type: 'text',
                event: 'RunCompleted',
                run_id: '',
                agent_id: '',
                session_id: data?.session_id || '',
                created_at: Date.now(),
              } as SSEMessage;
              observer.next({
                fullContent,
                currentChunk: '',
                event: 'RunCompleted',
                isComplete: true,
                isError: false,
                rawMessage: msg,
              });
              observer.complete();
              return;
            }

            if (event === 'error') {
              const msg: SSEMessage = {
                content: data?.error || 'Error',
                content_type: 'text',
                event: 'RunError',
                run_id: '',
                agent_id: '',
                session_id: data?.session_id || '',
                created_at: Date.now(),
              } as SSEMessage;
              observer.next({
                fullContent,
                currentChunk: msg.content,
                event: 'RunError',
                isComplete: true,
                isError: true,
                rawMessage: msg,
              });
              observer.complete();
              return;
            }
          };

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let lineEndIdx: number;
            while ((lineEndIdx = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, lineEndIdx).trimEnd();
              buffer = buffer.slice(lineEndIdx + 1);

              if (!line) {
                // dispatch event with accumulated data
                if (currentEvent && dataBuffer) {
                  try {
                    const parsed = JSON.parse(dataBuffer);
                    emit(currentEvent, parsed);
                  } catch (e) {
                    // fallback raw text
                    emit(currentEvent, { delta: dataBuffer });
                  }
                }
                currentEvent = null;
                dataBuffer = "";
                continue;
              }

              if (line.startsWith('event:')) {
                currentEvent = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                const chunk = line.slice(5).trimStart();
                dataBuffer += chunk;
              }
            }
          }

          observer.complete();
        })
        .catch((err) => {
          console.error('SSE Error:', err);
          observer.error(err);
        });

      return () => {
        controller.abort();
      };
    });
  }

  // Legacy processors removed; now using standard SSE parsing above
}
