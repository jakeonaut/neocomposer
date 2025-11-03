import { AudioInsert, connectSerial } from "./connect";
import { createControl } from "./signals";
import { midiVelToGain } from "./volume";

export type ChannelConfig = {
  destination: AudioNode;
  volume: number;
  volumeToGain: (volume: number) => number;
};

export type OutputChannel = Omit<Channel, "input">;

type Send = {
  name: string;
  mix: GainNode;
  disconnect: () => void;
};

/**
 * An output channel with audio effects
 * @private
 */
export class Channel {
  public readonly setVolume: (vol: number) => void;
  public readonly input: AudioNode;

  _volume: GainNode;
  _sends?: Send[];
  _inserts?: (AudioNode | AudioInsert)[];
  _disconnect: () => void;
  _unsubscribe: () => void;
  _config: Readonly<ChannelConfig>;
  _disconnected = false;

  constructor(
    public readonly context: BaseAudioContext,
    options?: Partial<ChannelConfig>
  ) {
    this._config = {
      destination: options?.destination ?? context.destination,
      volume: options?.volume ?? 100,
      volumeToGain: options?.volumeToGain ?? midiVelToGain,
    };

    this.input = context.createGain();
    this._volume = context.createGain();

    this._disconnect = connectSerial([
      this.input,
      this._volume,
      this._config.destination,
    ]);

    const volume = createControl(this._config.volume);
    this.setVolume = volume.set;
    this._unsubscribe = volume.subscribe((volume) => {
      this._volume.gain.value = this._config.volumeToGain(volume);
    });
  }

  addInsert(effect: AudioNode | AudioInsert) {
    if (this._disconnected) {
      throw Error("Can't add insert to disconnected channel");
    }
    this._inserts ??= [];
    this._inserts.push(effect);
    this._disconnect();
    this._disconnect = connectSerial([
      this.input,
      ...this._inserts,
      this._volume,
      this._config.destination,
    ]);
  }

  addEffect(
    name: string,
    effect: AudioNode | { input: AudioNode },
    mixValue: number
  ) {
    if (this._disconnected) {
      throw Error("Can't add effect to disconnected channel");
    }
    const mix = this.context.createGain();
    mix.gain.value = mixValue;
    const input = "input" in effect ? effect.input : effect;
    const disconnect = connectSerial([this._volume, mix, input]);

    this._sends ??= [];
    this._sends.push({ name, mix, disconnect });
  }

  sendEffect(name: string, mix: number) {
    if (this._disconnected) {
      throw Error("Can't send effect to disconnected channel");
    }

    const send = this._sends?.find((send) => send.name === name);
    if (send) {
      send.mix.gain.value = mix;
    } else {
      console.warn("Send bus not found: " + name);
    }
  }

  disconnect() {
    if (this._disconnected) return;
    this._disconnected = true;
    this._disconnect();
    this._unsubscribe();
    this._sends?.forEach((send) => send.disconnect());
    this._sends = undefined;
  }
}
