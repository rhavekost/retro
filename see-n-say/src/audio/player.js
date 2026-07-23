/**
 * Bridges the synthesis recipes to the UI: schedules a voice on the shared
 * audio context and resolves once it has finished sounding.
 */
import { getAudio, getMaster } from '../../../shared/audio/context.js';
import { VOICES, hasVoice } from './voices.js';
import { ratchet } from '../../../shared/audio/synth.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Plays one animal. Resolves when the sound has decayed. */
export const playAnimalSound = async (animalId) => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out || !hasVoice(animalId)) {
    // No Web Audio: keep the UI timing sane rather than failing outright.
    await wait(700);
    return;
  }

  const startAt = ctx.currentTime + 0.05;
  const endsAt = VOICES[animalId](ctx, out, startAt);
  await wait(Math.max(0, (endsAt - ctx.currentTime) * 1000) + 60);
};

/** The clatter of the cord winding back into the toy. */
export const playRatchet = async () => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return;

  const startAt = ctx.currentTime + 0.02;
  const endsAt = ratchet(ctx, out, startAt);
  await wait(Math.max(0, (endsAt - ctx.currentTime) * 1000));
};
