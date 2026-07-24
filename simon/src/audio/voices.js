/**
 * The four panel tones and the failure buzz.
 *
 * The frequencies are the ones the original unit used. They are mutually
 * consonant, which is why an arbitrary sequence still sounds like music
 * instead of noise — worth preserving exactly.
 */
import { getAudio, getMaster } from '../../../shared/audio/context.js';
import { tone } from '../../../shared/audio/synth.js';

export const TONE_HZ = Object.freeze({
  green: 415.3,
  red: 310.1,
  yellow: 252.0,
  blue: 209.7,
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sounds one panel. Resolves when the note has decayed. */
export const playColor = async (color, { duration = 0.32 } = {}) => {
  const ctx = getAudio();
  const out = getMaster();
  const hz = TONE_HZ[color];
  if (!ctx || !out || !hz) {
    await wait(duration * 1000);
    return;
  }

  tone(ctx, out, ctx.currentTime + 0.01, {
    type: 'square',
    pitch: [[0, hz]],
    filter: 'lowpass',
    cutoff: [[0, 2400]],
    envelope: { peak: 0.26, attack: 0.012, hold: duration, release: 0.06 },
  });
  await wait(duration * 1000 + 70);
};

/** The flat raspberry when you miss. */
export const playFailure = async () => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) {
    await wait(800);
    return;
  }

  tone(ctx, out, ctx.currentTime + 0.01, {
    type: 'sawtooth',
    pitch: [[0, 130], [0.7, 96]],
    filter: 'lowpass',
    cutoff: [[0, 900]],
    envelope: { peak: 0.3, attack: 0.02, hold: 0.55, release: 0.2 },
  });
  await wait(900);
};
