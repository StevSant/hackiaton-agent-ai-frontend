export interface SttPort {
  transcribeBlob(blob: Blob): Promise<string>;
  setEngine?(engine: string): void;
}
