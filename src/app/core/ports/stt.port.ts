export interface SttPort {
  transcribeBlob(blob: Blob, language?: string): Promise<string>;
  setEngine?(engine: string): void;
}
