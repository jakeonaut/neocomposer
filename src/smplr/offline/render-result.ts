import { audioBufferToWav, audioBufferToWav16 } from "./wav-encoder";

/**
 * The result of an offline render. Provides the raw AudioBuffer and
 * lazy WAV encoding / download convenience methods.
 */
export class RenderResult {
  readonly audioBuffer: AudioBuffer;
  readonly duration: number;
  readonly sampleRate: number;

  _wavCache: Blob | undefined;
  _wav16Cache: Blob | undefined;

  constructor(audioBuffer: AudioBuffer) {
    this.audioBuffer = audioBuffer;
    this.duration = audioBuffer.duration;
    this.sampleRate = audioBuffer.sampleRate;
  }

  /** Encode as 32-bit float WAV. Cached after first call. */
  toWav(): Blob {
    if (!this._wavCache) {
      this._wavCache = audioBufferToWav(this.audioBuffer);
    }
    return this._wavCache;
  }

  /** Encode as 16-bit integer WAV. Cached after first call. */
  toWav16(): Blob {
    if (!this._wav16Cache) {
      this._wav16Cache = audioBufferToWav16(this.audioBuffer);
    }
    return this._wav16Cache;
  }

  /** Download as 32-bit float WAV file. */
  downloadWav(filename = "render.wav"): void {
    downloadBlob(this.toWav(), filename);
  }

  /** Download as 16-bit integer WAV file. */
  downloadWav16(filename = "render.wav"): void {
    downloadBlob(this.toWav16(), filename);
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
