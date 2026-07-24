/**
 * The gritty scrape of the stylus and the rattle of a shake. Both are filtered
 * noise; the scrape is rate-limited because move events arrive far faster than
 * a listenable grain.
 */
import { getAudio, getMaster } from '../../../shared/audio/context.js';
import { noise } from '../../../shared/audio/synth.js';

const MIN_GAP_MS = 55;
let lastAt = 0;

/** `intensity` is pixels travelled since the last call. */
export const scrape = (intensity) => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return;

  const now = ctx.currentTime * 1000;
  if (now - lastAt < MIN_GAP_MS) return;
  lastAt = now;

  const strength = Math.min(1, Math.abs(intensity) / 8);
  if (strength < 0.08) return;

  noise(ctx, out, ctx.currentTime + 0.005, {
    filter: 'bandpass',
    cutoff: [[0, 2200 + strength * 1400]],
    q: 1.4,
    playbackRate: 1.2,
    envelope: { peak: 0.05 + strength * 0.07, attack: 0.004, hold: 0.03, release: 0.05 },
  });
};

/** A longer wash for the shake. */
export const shakeNoise = async () => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return;

  noise(ctx, out, ctx.currentTime + 0.01, {
    filter: 'bandpass',
    cutoff: [[0, 1400], [0.5, 2600], [0.9, 1100]],
    q: 0.9,
    playbackRate: 0.8,
    envelope: { peak: 0.22, attack: 0.02, hold: 0.6, release: 0.25 },
  });
  await new Promise((resolve) => setTimeout(resolve, 900));
};
