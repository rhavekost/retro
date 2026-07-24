/**
 * The plastic snap of a peg going in, pitched slightly by colour so filling an
 * area has a bit of melody to it.
 */
import { getAudio, getMaster } from '../../../shared/audio/context.js';
import { tone, noise } from '../../../shared/audio/synth.js';

// -Infinity, not 0: ctx.currentTime starts near 0 too, so a literal 0 here
// would throttle away the very first peg click of a session.
let lastAt = -Infinity;

export const pegClick = (colorId) => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return;

  // Dragging fires far faster than a distinct click can be heard.
  const now = ctx.currentTime * 1000;
  if (now - lastAt < 35) return;
  lastAt = now;

  noise(ctx, out, ctx.currentTime + 0.004, {
    filter: 'bandpass',
    cutoff: [[0, 3200]],
    q: 5,
    envelope: { peak: 0.1, attack: 0.001, hold: 0.008, release: 0.02 },
  });

  tone(ctx, out, ctx.currentTime + 0.004, {
    type: 'square',
    pitch: [[0, 620 + colorId * 55]],
    filter: 'lowpass',
    cutoff: [[0, 3000]],
    envelope: { peak: 0.07, attack: 0.002, hold: 0.014, release: 0.03 },
  });
};

/** A descending wash when the board is cleared. */
export const sweepClear = () => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return;

  noise(ctx, out, ctx.currentTime + 0.01, {
    filter: 'bandpass',
    cutoff: [[0, 3000], [0.5, 700]],
    q: 1.2,
    envelope: { peak: 0.16, attack: 0.01, hold: 0.35, release: 0.2 },
  });
};
