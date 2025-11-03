import { SortedQueue } from "./sorted-queue";
import { InternalPlayer, SampleStart, SampleStop } from "./types";

type SampleStartWithTime = SampleStart & { time: number };

function compose<T>(a?: (x: T) => void, b?: (x: T) => void) {
  return a && b
    ? (x: T) => {
        a(x);
        b(x);
      }
    : a ?? b;
}

export type QueuedPlayerConfig = {
  disableScheduler: boolean;
  scheduleLookaheadMs: number;
  scheduleIntervalMs: number;
  onStart?: (sample: SampleStart) => void;
  onEnded?: (sample: SampleStart) => void;
};

function getConfig(options: Partial<QueuedPlayerConfig>) {
  const config: QueuedPlayerConfig = {
    disableScheduler: options.disableScheduler ?? false,
    scheduleLookaheadMs: options.scheduleLookaheadMs ?? 200,
    scheduleIntervalMs: options.scheduleIntervalMs ?? 50,
    onStart: options.onStart,
    onEnded: options.onEnded,
  };

  if (config.scheduleLookaheadMs < 1) {
    throw Error("scheduleLookaheadMs must be greater than 0");
  }
  if (config.scheduleIntervalMs < 1) {
    throw Error("scheduleIntervalMs must be greater than 0");
  }
  if (config.scheduleLookaheadMs < config.scheduleIntervalMs) {
    throw Error("scheduleLookaheadMs must be greater than scheduleIntervalMs");
  }

  return config;
}

/**
 * A SamplePlayer that queues up samples to be played in the future.
 *
 * @private
 */
export class QueuedPlayer implements InternalPlayer {
  private readonly player: InternalPlayer;
  _config: QueuedPlayerConfig;
  _queue: SortedQueue<SampleStartWithTime>;
  _intervalId: NodeJS.Timeout | undefined;

  public constructor(
    player: InternalPlayer,
    options: Partial<QueuedPlayerConfig> = {}
  ) {
    this._config = getConfig(options);

    this._queue = new SortedQueue<SampleStartWithTime>(
      (a, b) => a.time - b.time
    );
    this.player = player;
  }

  get context() {
    return this.player.context;
  }

  get buffers() {
    return this.player.buffers;
  }

  get isRunning() {
    return this._intervalId !== undefined;
  }

  start(sample: SampleStart) {
    if (this._config.disableScheduler) {
      return this.player.start(sample);
    }
    const context = this.player.context;
    const now = context.currentTime;
    const startAt = sample.time ?? now;
    const lookAhead = this._config.scheduleLookaheadMs / 1000;
    sample.onStart = compose(sample.onStart, this._config.onStart);
    sample.onEnded = compose(sample.onEnded, this._config.onEnded);

    if (startAt < now + lookAhead) {
      return this.player.start(sample);
    }
    this._queue.push({ ...sample, time: startAt });

    if (!this._intervalId) {
      this._intervalId = setInterval(() => {
        const nextTick = context.currentTime + lookAhead;
        while (this._queue.size() && this._queue.peek()!.time <= nextTick) {
          const sample = this._queue.pop();
          if (sample) {
            this.player.start(sample);
          }
        }
        if (!this._queue.size()) {
          clearInterval(this._intervalId!);
          this._intervalId = undefined;
        }
      }, this._config.scheduleIntervalMs);
    }

    return (time?: number) => {
      if (!time || time < startAt) {
        if (!this._queue.removeAll((item) => item === sample)) {
          this.player.stop({ ...sample, time });
        }
      } else {
        this.player.stop({ ...sample, time });
      }
    };
  }

  stop(sample?: SampleStop) {
    if (this._config.disableScheduler) {
      return this.player.stop(sample);
    }

    this.player.stop(sample);

    if (!sample) {
      this._queue.clear();
      return;
    }

    const time = sample?.time ?? 0;
    const stopId = sample?.stopId;
    if (stopId) {
      this._queue.removeAll((item) =>
        item.time >= time && item.stopId
          ? item.stopId === stopId
          : item.note === stopId
      );
    } else {
      this._queue.removeAll((item) => item.time >= time);
    }
  }

  disconnect() {
    this.player.disconnect();
  }
}
