/**
 * One synthesis recipe per animal. Each takes (ctx, out, t0) and returns the
 * audio-clock time at which it stops making noise, so the caller can await it.
 */
import { tone, noise } from '../../../shared/audio/synth.js';

const cow = (ctx, out, t0) =>
  tone(ctx, out, t0, {
    type: 'sawtooth',
    pitch: [[0, 150], [0.15, 128], [0.9, 104], [1.2, 92]],
    cutoff: [[0, 900], [1.2, 500]],
    q: 3,
    vibrato: { rate: 5.5, depth: 4 },
    envelope: { peak: 0.55, attack: 0.09, hold: 0.85, release: 0.35 },
  });

const sheep = (ctx, out, t0) =>
  tone(ctx, out, t0, {
    type: 'square',
    pitch: [[0, 330], [0.2, 300], [0.85, 255]],
    cutoff: [[0, 1500], [0.85, 900]],
    q: 4,
    vibrato: { rate: 13, depth: 22 },
    envelope: { peak: 0.32, attack: 0.05, hold: 0.6, release: 0.25 },
  });

const pig = (ctx, out, t0) => {
  const grunt = (at) =>
    tone(ctx, out, at, {
      type: 'sawtooth',
      pitch: [[0, 260], [0.09, 190], [0.18, 150]],
      cutoff: [[0, 800], [0.18, 480]],
      q: 5,
      envelope: { peak: 0.42, attack: 0.02, hold: 0.09, release: 0.09 },
    });
  grunt(t0);
  return grunt(t0 + 0.3);
};

const duck = (ctx, out, t0) => {
  const quack = (at) =>
    tone(ctx, out, at, {
      type: 'square',
      pitch: [[0, 440], [0.05, 380], [0.14, 300]],
      filter: 'bandpass',
      cutoff: [[0, 1400], [0.14, 900]],
      q: 5,
      envelope: { peak: 0.3, attack: 0.008, hold: 0.07, release: 0.06 },
    });
  quack(t0);
  return quack(t0 + 0.24);
};

const dog = (ctx, out, t0) => {
  const bark = (at) => {
    noise(ctx, out, at, {
      filter: 'bandpass',
      cutoff: [[0, 1200], [0.12, 600]],
      q: 2,
      envelope: { peak: 0.3, attack: 0.005, hold: 0.04, release: 0.09 },
    });
    return tone(ctx, out, at, {
      type: 'sawtooth',
      pitch: [[0, 240], [0.06, 165], [0.2, 120]],
      cutoff: [[0, 1600], [0.2, 700]],
      q: 3,
      envelope: { peak: 0.4, attack: 0.006, hold: 0.07, release: 0.12 },
    });
  };
  bark(t0);
  return bark(t0 + 0.33);
};

const cat = (ctx, out, t0) =>
  tone(ctx, out, t0, {
    type: 'sawtooth',
    pitch: [[0, 520], [0.14, 760], [0.4, 620], [0.75, 430]],
    cutoff: [[0, 1300], [0.14, 2100], [0.75, 900]],
    q: 6,
    vibrato: { rate: 7, depth: 12 },
    envelope: { peak: 0.34, attack: 0.06, hold: 0.5, release: 0.25 },
  });

const horse = (ctx, out, t0) => {
  noise(ctx, out, t0, {
    filter: 'bandpass',
    cutoff: [[0, 1800], [0.25, 700]],
    q: 1.5,
    envelope: { peak: 0.16, attack: 0.02, hold: 0.12, release: 0.14 },
  });
  return tone(ctx, out, t0 + 0.1, {
    type: 'sawtooth',
    pitch: [[0, 560], [0.25, 470], [0.8, 300]],
    cutoff: [[0, 2000], [0.8, 800]],
    q: 4,
    tremolo: { rate: 19, depth: 0.22 },
    envelope: { peak: 0.34, attack: 0.04, hold: 0.6, release: 0.22 },
  });
};

const rooster = (ctx, out, t0) => {
  const segments = [
    { at: 0, hz: [[0, 520], [0.16, 560]], hold: 0.14 },
    { at: 0.24, hz: [[0, 660], [0.14, 690]], hold: 0.12 },
    { at: 0.46, hz: [[0, 760], [0.3, 700]], hold: 0.28 },
    { at: 0.84, hz: [[0, 560], [0.35, 430]], hold: 0.3 },
  ];
  let last = t0;
  segments.forEach(({ at, hz, hold }) => {
    last = tone(ctx, out, t0 + at, {
      type: 'sawtooth',
      pitch: hz,
      filter: 'bandpass',
      cutoff: [[0, 1500]],
      q: 3,
      vibrato: { rate: 11, depth: 14 },
      envelope: { peak: 0.3, attack: 0.02, hold, release: 0.08 },
    });
  });
  return last;
};

const frog = (ctx, out, t0) => {
  const croak = (at, hold) =>
    tone(ctx, out, at, {
      type: 'square',
      pitch: [[0, 150], [hold, 125]],
      filter: 'bandpass',
      cutoff: [[0, 600]],
      q: 4,
      tremolo: { rate: 32, depth: 0.4 },
      envelope: { peak: 0.36, attack: 0.02, hold, release: 0.06 },
    });
  croak(t0, 0.13);
  return croak(t0 + 0.26, 0.22);
};

const owl = (ctx, out, t0) => {
  const hoot = (at) =>
    tone(ctx, out, at, {
      type: 'sine',
      pitch: [[0, 400], [0.1, 370], [0.4, 345]],
      cutoff: [[0, 1200]],
      vibrato: { rate: 6, depth: 5 },
      envelope: { peak: 0.4, attack: 0.09, hold: 0.22, release: 0.2 },
    });
  hoot(t0);
  return hoot(t0 + 0.62);
};

const lion = (ctx, out, t0) => {
  noise(ctx, out, t0, {
    filter: 'lowpass',
    cutoff: [[0, 300], [0.5, 520], [1.3, 220]],
    q: 2,
    playbackRate: 0.4,
    envelope: { peak: 0.5, attack: 0.18, hold: 0.7, release: 0.4 },
  });
  return tone(ctx, out, t0, {
    type: 'sawtooth',
    pitch: [[0, 95], [0.4, 78], [1.3, 62]],
    cutoff: [[0, 500], [1.3, 260]],
    q: 3,
    vibrato: { rate: 24, depth: 6 },
    envelope: { peak: 0.42, attack: 0.15, hold: 0.75, release: 0.4 },
  });
};

const bee = (ctx, out, t0) =>
  tone(ctx, out, t0, {
    type: 'sawtooth',
    pitch: [[0, 210], [0.5, 240], [1.1, 195]],
    filter: 'bandpass',
    cutoff: [[0, 900], [1.1, 700]],
    q: 3,
    tremolo: { rate: 42, depth: 0.3 },
    envelope: { peak: 0.26, attack: 0.12, hold: 0.75, release: 0.25 },
  });

export const VOICES = Object.freeze({
  cow, sheep, pig, duck, dog, cat, horse, rooster, frog, owl, lion, bee,
});

export const hasVoice = (id) => Object.hasOwn(VOICES, id);
