/**
 * The blips. Key clicks, the rising "correct" arpeggio, the buzzy "wrong",
 * and the power-on chirp — all square waves, as the hardware would have it.
 */
import { getAudio, getMaster } from '../../../shared/audio/context.js';
import { tone } from '../../../shared/audio/synth.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let muted = false;
export const setBeepsMuted = (value) => {
  muted = value;
};

const play = (schedule) => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out || muted) return null;
  return schedule(ctx, out, ctx.currentTime + 0.01);
};

/** Short click under every keypress. */
export const keyBeep = () => {
  play((ctx, out, t0) =>
    tone(ctx, out, t0, {
      type: 'square',
      pitch: [[0, 1400]],
      filter: 'lowpass',
      cutoff: [[0, 4000]],
      envelope: { peak: 0.14, attack: 0.002, hold: 0.02, release: 0.03 },
    }),
  );
};

const sequence = (notes, { type = 'square', peak = 0.2, step = 0.09, hold = 0.06 } = {}) =>
  play((ctx, out, t0) => {
    notes.forEach((hz, index) => {
      tone(ctx, out, t0 + index * step, {
        type,
        pitch: [[0, hz]],
        filter: 'lowpass',
        cutoff: [[0, 5000]],
        envelope: { peak, attack: 0.004, hold, release: 0.05 },
      });
    });
    return t0 + notes.length * step;
  });

export const correctBeep = async () => {
  sequence([784, 988, 1319], { step: 0.1, hold: 0.07 });
  await wait(400);
};

export const wrongBeep = async () => {
  sequence([220, 175], { type: 'sawtooth', step: 0.16, hold: 0.13, peak: 0.22 });
  await wait(420);
};

export const powerOnBeep = async () => {
  sequence([523, 659, 784, 1047], { step: 0.07, hold: 0.05 });
  await wait(330);
};

export const powerOffBeep = async () => {
  sequence([784, 523, 392], { step: 0.08, hold: 0.06 });
  await wait(300);
};

/** Little flourish at the end of a round. */
export const fanfare = async () => {
  sequence([523, 659, 784, 1047, 1319], { step: 0.11, hold: 0.09 });
  await wait(700);
};
