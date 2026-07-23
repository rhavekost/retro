/**
 * Small building blocks shared by every animal voice: tones with pitch
 * envelopes, filtered noise, vibrato and tremolo. Each helper schedules itself
 * on the audio clock and returns the time it finishes.
 */

/** Applies an attack / hold / release curve to a gain node. */
const shapeGain = (param, t0, { peak = 0.5, attack = 0.02, hold = 0.1, release = 0.15 }) => {
  param.setValueAtTime(0.0001, t0);
  param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
  param.setValueAtTime(Math.max(peak, 0.0002), t0 + attack + hold);
  param.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  return t0 + attack + hold + release;
};

/** Walks an oscillator through a list of [time offset, frequency] points. */
const glide = (param, t0, points) => {
  points.forEach(([offset, value], index) => {
    if (index === 0) param.setValueAtTime(value, t0 + offset);
    else param.exponentialRampToValueAtTime(Math.max(value, 1), t0 + offset);
  });
};

/**
 * A filtered oscillator with a pitch path and an amplitude envelope.
 * `pitch` is a list of [seconds from start, hz] points.
 */
export const tone = (ctx, out, t0, options) => {
  const {
    type = 'sawtooth',
    pitch = [[0, 220]],
    filter = 'lowpass',
    cutoff = [[0, 2000]],
    q = 1,
    envelope = {},
    vibrato = null,
    tremolo = null,
  } = options;

  const osc = ctx.createOscillator();
  osc.type = type;
  glide(osc.frequency, t0, pitch);

  const band = ctx.createBiquadFilter();
  band.type = filter;
  band.Q.value = q;
  glide(band.frequency, t0, cutoff);

  const amp = ctx.createGain();
  const endsAt = shapeGain(amp.gain, t0, envelope);

  osc.connect(band).connect(amp).connect(out);

  if (vibrato) attachModulation(ctx, osc.frequency, t0, endsAt, vibrato);
  if (tremolo) attachModulation(ctx, amp.gain, t0, endsAt, tremolo);

  osc.start(t0);
  osc.stop(endsAt + 0.05);
  return endsAt;
};

/** An LFO driving any AudioParam — used for vibrato (pitch) and tremolo (gain). */
const attachModulation = (ctx, param, t0, endsAt, { rate = 6, depth = 10 }) => {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rate;
  const depthGain = ctx.createGain();
  depthGain.gain.value = depth;
  lfo.connect(depthGain).connect(param);
  lfo.start(t0);
  lfo.stop(endsAt + 0.05);
};

let noiseBuffer = null;

/** Two seconds of white noise, generated once and reused. */
const getNoiseBuffer = (ctx) => {
  if (noiseBuffer) return noiseBuffer;
  const frames = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
};

/** A burst of filtered noise — breath, growl, consonants. */
export const noise = (ctx, out, t0, options) => {
  const {
    filter = 'bandpass',
    cutoff = [[0, 1000]],
    q = 1,
    envelope = {},
    playbackRate = 1,
  } = options;

  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx);
  source.loop = true;
  source.playbackRate.value = playbackRate;

  const band = ctx.createBiquadFilter();
  band.type = filter;
  band.Q.value = q;
  glide(band.frequency, t0, cutoff);

  const amp = ctx.createGain();
  const endsAt = shapeGain(amp.gain, t0, envelope);

  source.connect(band).connect(amp).connect(out);
  source.start(t0);
  source.stop(endsAt + 0.05);
  return endsAt;
};

/** The mechanical clicks of the pull-cord ratchet winding back in. */
export const ratchet = (ctx, out, t0, { clicks = 9, spread = 0.055 } = {}) => {
  let last = t0;
  for (let i = 0; i < clicks; i += 1) {
    const at = t0 + i * spread * (1 + i * 0.06);
    last = noise(ctx, out, at, {
      filter: 'bandpass',
      cutoff: [[0, 2600 - i * 60]],
      q: 6,
      playbackRate: 1.4,
      envelope: { peak: 0.16, attack: 0.001, hold: 0.005, release: 0.03 },
    });
  }
  return last;
};
