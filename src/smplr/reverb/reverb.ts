import { PROCESSOR } from "./processor.min";

const PARAMS = [
  "preDelay",
  "bandwidth",
  "inputDiffusion1",
  "inputDiffusion2",
  "decay",
  "decayDiffusion1",
  "decayDiffusion2",
  "damping",
  "excursionRate",
  "excursionDepth",
  "wet",
  "dry",
] as const;

const init = new WeakMap<AudioContext, Promise<void>>();

async function createDattorroReverbEffect(context: AudioContext) {
  let ready = init.get(context);
  if (!ready) {
    const blob = new Blob([PROCESSOR], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    ready = context.audioWorklet.addModule(url);
    init.set(context, ready);
  }
  await ready;

  const reverb = new AudioWorkletNode(context, "DattorroReverb", {
    outputChannelCount: [2],
  });
  return reverb;
}

export class Reverb {
  _effect: AudioWorkletNode | undefined;
  _ready: Promise<this>;
  public readonly input: AudioNode;
  _output: AudioNode;

  constructor(context: AudioContext) {
    this.input = context.createGain();
    this._output = context.destination;
    this._ready = createDattorroReverbEffect(context).then((reverb) => {
      this.input.connect(reverb);
      reverb.connect(this._output);
      this._effect = reverb;
      return this;
    });
  }

  get paramNames() {
    return PARAMS;
  }

  getParam(name: (typeof PARAMS)[number]): AudioParam | undefined {
    return this._effect?.parameters.get("preDelay");
  }

  get isReady(): boolean {
    return this._effect !== undefined;
  }

  ready(): Promise<this> {
    return this._ready;
  }

  connect(output: AudioNode) {
    if (this._effect) {
      this._effect.disconnect(this._output);
      this._effect.connect(output);
    }
    this._output = output;
  }
}
