/**
 * The noises the *deck* makes, as opposed to the noises on the tape: piano-key
 * thunks, the capstan motor, and the tape hiss that rides under everything
 * while the heads are down. All synthesized — nothing here loads a file.
 */
import { getAudio, getMaster } from '../../../shared/audio/context.js';
import { noise, tone } from '../../../shared/audio/synth.js';

let loopBuffer = null;

/** Two seconds of white noise, generated once and looped by the motor/hiss. */
const getLoopBuffer = (ctx) => {
  if (loopBuffer) return loopBuffer;
  const frames = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  loopBuffer = buffer;
  return buffer;
};

/** The solid thunk of a transport key latching down. */
export const clunk = ({ soft = false } = {}) => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return;

  const t0 = ctx.currentTime + 0.005;
  const peak = soft ? 0.1 : 0.22;

  // Body of the thunk: a fast low thud.
  tone(ctx, out, t0, {
    type: 'triangle',
    pitch: [
      [0, soft ? 150 : 120],
      [0.06, 52],
    ],
    filter: 'lowpass',
    cutoff: [[0, 900]],
    envelope: { peak, attack: 0.002, hold: 0.01, release: 0.07 },
  });

  // Plastic-on-plastic click riding on top.
  noise(ctx, out, t0, {
    filter: 'bandpass',
    cutoff: [[0, 2400]],
    q: 3,
    playbackRate: 1.6,
    envelope: { peak: peak * 0.7, attack: 0.001, hold: 0.004, release: 0.045 },
  });
};

/** The clatter of a key popping back up when the transport disengages. */
export const release = () => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return;

  const t0 = ctx.currentTime + 0.005;
  noise(ctx, out, t0, {
    filter: 'bandpass',
    cutoff: [
      [0, 3200],
      [0.05, 1400],
    ],
    q: 4,
    playbackRate: 1.9,
    envelope: { peak: 0.16, attack: 0.001, hold: 0.006, release: 0.06 },
  });
};

/**
 * A continuously running noise source with its own gain and filter. The motor
 * and the hiss are the same shape, so they share one factory.
 */
const startLoop = (ctx, out, { type, frequency, q, gain }) => {
  const source = ctx.createBufferSource();
  source.buffer = getLoopBuffer(ctx);
  source.loop = true;

  const band = ctx.createBiquadFilter();
  band.type = type;
  band.frequency.value = frequency;
  band.Q.value = q;

  const amp = ctx.createGain();
  amp.gain.value = 0;

  source.connect(band).connect(amp).connect(out);
  source.start();
  amp.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.08);

  return { source, band, amp };
};

const fadeOutAndStop = (ctx, nodes, seconds = 0.12) => {
  const stopAt = ctx.currentTime + seconds;
  nodes.amp.gain.cancelScheduledValues(ctx.currentTime);
  nodes.amp.gain.setValueAtTime(nodes.amp.gain.value, ctx.currentTime);
  nodes.amp.gain.linearRampToValueAtTime(0.0001, stopAt);
  nodes.source.stop(stopAt + 0.02);
};

/**
 * The spool motor during fast-forward and rewind: a whir whose pitch tracks
 * how fast the tape is moving. Returns a handle so the caller can stop it.
 */
export const startMotor = ({ rate = 1 } = {}) => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return { setRate: () => {}, stop: () => {} };

  const nodes = startLoop(ctx, out, {
    type: 'bandpass',
    frequency: 900 * rate,
    q: 1.6,
    gain: 0.075,
  });

  // A faint tonal whine on top so it reads as a motor and not just wind.
  const whine = ctx.createOscillator();
  whine.type = 'sawtooth';
  whine.frequency.value = 210 * rate;
  const whineFilter = ctx.createBiquadFilter();
  whineFilter.type = 'lowpass';
  whineFilter.frequency.value = 1600;
  const whineGain = ctx.createGain();
  whineGain.gain.value = 0;
  whine.connect(whineFilter).connect(whineGain).connect(out);
  whine.start();
  whineGain.gain.linearRampToValueAtTime(0.022, ctx.currentTime + 0.08);

  return {
    setRate: (next) => {
      const at = ctx.currentTime + 0.05;
      nodes.band.frequency.linearRampToValueAtTime(900 * next, at);
      whine.frequency.linearRampToValueAtTime(210 * next, at);
    },
    stop: () => {
      fadeOutAndStop(ctx, nodes);
      const stopAt = ctx.currentTime + 0.12;
      whineGain.gain.cancelScheduledValues(ctx.currentTime);
      whineGain.gain.setValueAtTime(whineGain.gain.value, ctx.currentTime);
      whineGain.gain.linearRampToValueAtTime(0.0001, stopAt);
      whine.stop(stopAt + 0.02);
    },
  };
};

/**
 * Tape hiss. Real cassettes hiss more the faster you play them, so the caller
 * passes the transport speed through.
 */
export const startHiss = ({ speed = 1 } = {}) => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return { setSpeed: () => {}, stop: () => {} };

  const nodes = startLoop(ctx, out, {
    type: 'highpass',
    frequency: 2600 * speed,
    q: 0.7,
    gain: 0.02,
  });

  return {
    setSpeed: (next) => {
      nodes.band.frequency.linearRampToValueAtTime(2600 * next, ctx.currentTime + 0.05);
    },
    stop: () => fadeOutAndStop(ctx, nodes, 0.2),
  };
};
