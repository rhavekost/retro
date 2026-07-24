/**
 * The tape itself: one fixed-length mono buffer that recordings are written
 * into, in place, exactly like a real cassette. Recording over the middle of
 * something wipes only the part you recorded over.
 */

/** Thirty seconds a side, like the micro-cassette in the original. */
export const TAPE_SECONDS = 30;

/** Averages a multi-channel recording down to the single tape track. */
const toMono = (buffer) => {
  const frames = buffer.length;
  const mono = new Float32Array(frames);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < frames; i += 1) mono[i] += data[i];
  }
  if (buffer.numberOfChannels > 1) {
    for (let i = 0; i < frames; i += 1) mono[i] /= buffer.numberOfChannels;
  }
  return mono;
};

export const createTape = (ctx) => {
  const frames = Math.ceil(ctx.sampleRate * TAPE_SECONDS);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const track = buffer.getChannelData(0);

  /** How far along the tape anything has ever been recorded. */
  let recordedTo = 0;

  /**
   * Lays a recording down starting at `atSeconds`. Returns the position the
   * head ended up at, clamped to the end of the tape.
   */
  const write = (recording, atSeconds) => {
    const start = Math.max(0, Math.min(frames - 1, Math.round(atSeconds * ctx.sampleRate)));
    const mono = toMono(recording);
    const count = Math.min(mono.length, frames - start);

    for (let i = 0; i < count; i += 1) track[start + i] = mono[i];

    const endSeconds = (start + count) / ctx.sampleRate;
    recordedTo = Math.max(recordedTo, endSeconds);
    return endSeconds;
  };

  /** Wipes the whole tape — the "erase everything" button. */
  const erase = () => {
    track.fill(0);
    recordedTo = 0;
  };

  /**
   * Peak level of a short window, used to draw the little waveform strip on
   * the cassette label so you can see where your recordings live.
   */
  const peaks = (count) => {
    const perBucket = Math.floor(frames / count);
    const result = new Array(count).fill(0);
    for (let bucket = 0; bucket < count; bucket += 1) {
      let peak = 0;
      const start = bucket * perBucket;
      // Stepping by 32 is plenty for a 60px-wide strip and keeps this cheap.
      for (let i = start; i < start + perBucket; i += 32) {
        const value = Math.abs(track[i]);
        if (value > peak) peak = value;
      }
      result[bucket] = Math.min(1, peak);
    }
    return result;
  };

  return {
    buffer,
    duration: TAPE_SECONDS,
    write,
    erase,
    peaks,
    get recordedTo() {
      return recordedTo;
    },
    get isBlank() {
      return recordedTo === 0;
    },
  };
};
