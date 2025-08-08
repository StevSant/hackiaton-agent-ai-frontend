import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VoskSttService {
  private model: object | null = null;
  private recognizer: object | null = null;
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  // Deprecated but broadly supported; acceptable for a simple fallback pipeline
  // eslint-disable-next-line deprecation/deprecation
  private processor: ScriptProcessorNode | null = null;
  private running = false;
  private readonly sampleRateTarget = 16000;

  constructor(private readonly zone: NgZone) {}

  // Expect assets in /assets/vosk/{vosk.wasm, model/...}
  async init(opts?: { wasmPath?: string; modelPath?: string }): Promise<void> {
    if (this.model && this.recognizer) return;
    const wasmPath = opts?.wasmPath ?? '/assets/vosk/';
    const modelPath = opts?.modelPath ?? '/assets/vosk/es/';
    // Dynamic import; treat as any to avoid TS friction.
  const vosk: any = (await import('vosk-browser')) as any;
  const V = vosk.default || vosk;
    // Initialize runtime (best-effort; library API may vary)
    if (V && typeof V.init === 'function') {
      await V.init({ wasmPrefix: wasmPath });
    }
    // Create/load model and recognizer
  if (V && typeof V.createModel === 'function') {
  this.model = await V.createModel(modelPath);
  this.recognizer = new (this.model as any).KaldiRecognizer(this.sampleRateTarget);
  } else if (V?.Model) {
  this.model = new V.Model(modelPath);
  this.recognizer = new V.Recognizer({ model: this.model, sampleRate: this.sampleRateTarget });
    } else {
      throw new Error('Vosk: API incompatible. Verifica la versión de vosk-browser.');
    }
  }

  async start(): Promise<Observable<string>> {
    const out$ = new Subject<string>();
    await this.ensureAudio();
    this.running = true;
    // eslint-disable-next-line deprecation/deprecation
    const onProcess = (e: any) => {
      if (!this.running || !this.recognizer) return;
      // eslint-disable-next-line deprecation/deprecation
      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = this.toPCM16(this.downsampleToTarget(input, this.audioCtx!.sampleRate, this.sampleRateTarget));
      try {
        // Recognizer API variants: acceptWaveform / acceptWaveformFloat
        let isFinal = false;
  const rec: any = this.recognizer as any;
        if (typeof rec.acceptWaveform === 'function') {
          isFinal = rec.acceptWaveform(pcm16);
        } else if (typeof rec.acceptWaveformFloat === 'function') {
          isFinal = rec.acceptWaveformFloat(pcm16);
        }
        let res: any = null;
        if (isFinal && (rec.result)) {
          res = rec.result();
        } else if (rec.partialResult) {
          res = rec.partialResult();
        }
        const text = (res && (res.text || res.partial)) || '';
        if (text) this.zone.run(() => out$.next(text));
      } catch {
        // ignore chunk errors
      }
    };
    // eslint-disable-next-line deprecation/deprecation
    this.processor!.onaudioprocess = onProcess;
    return out$.asObservable();
  }

  stop() {
    this.running = false;
  // eslint-disable-next-line deprecation/deprecation
  try { if (this.processor) this.processor.onaudioprocess = null as any; } catch {}
    try { this.processor?.disconnect(); } catch {}
    try { this.mediaStream?.getTracks().forEach(t => t.stop()); } catch {}
    try { this.audioCtx?.close(); } catch {}
    this.processor = null; this.mediaStream = null; this.audioCtx = null;
  }

  dispose() {
    this.stop();
  try { (this.recognizer as any)?.free?.(); } catch {}
  try { (this.model as any)?.free?.(); } catch {}
    this.recognizer = null; this.model = null;
  }

  private async ensureAudio() {
  this.audioCtx = this.audioCtx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
  this.mediaStream = this.mediaStream ?? await navigator.mediaDevices.getUserMedia({ audio: true });
    const src = this.audioCtx.createMediaStreamSource(this.mediaStream);
  // ScriptProcessor is deprecated but widely supported; good enough for simple pipeline
  // eslint-disable-next-line deprecation/deprecation
  this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
    src.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);
  }

  private toPCM16(f32: Float32Array): Int16Array {
    const out = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  }

  private downsampleToTarget(input: Float32Array, inRate: number, outRate: number): Float32Array {
    if (inRate === outRate) return input;
    const ratio = inRate / outRate;
    const newLength = Math.round(input.length / ratio);
    const result = new Float32Array(newLength);
    let idx = 0;
    let i = 0;
    while (idx < newLength) {
      const next = Math.round((idx + 1) * ratio);
      let sum = 0;
      let count = 0;
      for (let j = i; j < next && j < input.length; j++) { sum += input[j]; count++; }
      result[idx] = sum / (count || 1);
      i = next; idx++;
    }
    return result;
  }
}
