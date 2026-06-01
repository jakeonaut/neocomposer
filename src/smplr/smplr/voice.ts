import { dbToGain, midiVelToGain } from "./volume";
import { VoiceParams } from "./types";

export class Voice {
  readonly stopId: string | number;
  readonly group: number | undefined;

  _context: BaseAudioContext;
  _source: AudioBufferSourceNode;
  _envelope: GainNode;
  _startAt: number;
  _ampRelease: number;
  _state: "playing" | "stopping" | "stopped" = "playing";
  _endedCallbacks: (() => void)[] = [];

  constructor(
    context: BaseAudioContext,
    buffer: AudioBuffer,
    params: VoiceParams,
    destination: AudioNode,
    stopId: string | number,
    group?: number,
    startTime?: number,
  ) {
    this._context = context;
    this.stopId = stopId;
    this.group = group;
    this._ampRelease = params.ampRelease;

    // --- Build audio graph ---

    const source = context.createBufferSource();
    source.buffer = buffer;

    // Detune — Safari workaround: source.detune may not exist
    const cents = params.detune;
    if (source.detune) {
      source.detune.value = cents;
    } else {
      source.playbackRate.value = Math.pow(2, cents / 1200);
    }

    // Looping
    if (params.loopAuto) {
      source.loop = true;
      source.loopStart = buffer.duration * params.loopAuto.startRatio;
      source.loopEnd = buffer.duration * params.loopAuto.endRatio;
    } else if (params.loop) {
      source.loop = true;
      source.loopStart = params.loopStart;
      source.loopEnd = params.loopEnd || buffer.duration;
    }

    // LPF — only inserted when cutoff is meaningfully below Nyquist
    let lpf: BiquadFilterNode | undefined;
    if (params.lpfCutoffHz < 20000) {
      lpf = context.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = params.lpfCutoffHz;
    }

    // Velocity gain × dB volume
    const gain = context.createGain();
    gain.gain.value = midiVelToGain(params.velocity) * dbToGain(params.volume);

    // Release envelope
    const envelope = context.createGain();
    envelope.gain.value = 1.0;

    // Wire: source → [lpf] → gain → envelope → destination
    if (lpf) {
      source.connect(lpf);
      lpf.connect(gain);
    } else {
      source.connect(gain);
    }
    gain.connect(envelope);
    envelope.connect(destination);

    // Start
    const startAt = startTime ?? context.currentTime;
    this._startAt = startAt;

    // Offset: VoiceParams.offset is in sample frames; source.start() takes seconds.
    // When playing in reverse (buffer is already reversed), mirror the offset so
    // offset=N from the start of the original buffer maps to (length-N) in the reversed one.
    let offsetSec = 0;
    if (params.offset > 0) {
      offsetSec = params.reverse
        ? (buffer.length - params.offset) / buffer.sampleRate
        : params.offset / buffer.sampleRate;
    }
    source.start(startAt, offsetSec);

    this._source = source;
    this._envelope = envelope;

    // Cleanup when the source naturally ends or is stopped
    source.onended = () => {
      this._state = "stopped";
      envelope.disconnect();
      gain.disconnect();
      lpf?.disconnect();
      source.disconnect();
      for (const cb of this._endedCallbacks) cb();
      this._endedCallbacks = [];
    };
  }

  /**
   * Stop the voice, applying a release envelope if time is after the start time.
   * Idempotent — subsequent calls after the first are ignored.
   */
  stop(time?: number): void {
    if (this._state !== "playing") return;
    this._state = "stopping";

    const t = time ?? this._context.currentTime;

    if (t <= this._startAt) {
      // Stop at or before start: cancel the note entirely
      this._source.stop(t);
    } else {
      // Apply release envelope then stop the source
      const stopAt = t + this._ampRelease;
      this._envelope.gain.cancelScheduledValues(t);
      this._envelope.gain.setValueAtTime(1.0, t);
      this._envelope.gain.linearRampToValueAtTime(0, stopAt);
      this._source.stop(stopAt);
    }
  }

  /**
   * Register a callback to be called when the source node fires its onended event.
   * If the voice has already stopped, the callback is invoked immediately.
   */
  onEnded(cb: () => void): void {
    if (this._state === "stopped") {
      cb();
    } else {
      this._endedCallbacks.push(cb);
    }
  }

  get isActive(): boolean {
    return this._state !== "stopped";
  }
}
