/**
 * A single lazily-created AudioContext. Browsers refuse to start audio before a
 * user gesture, so nothing here runs until the first click / keypress.
 */
let context = null;
let master = null;

const createContext = () => {
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  gain.connect(ctx.destination);
  context = ctx;
  master = gain;
  return ctx;
};

/** Returns the shared context, resuming it if the browser suspended it. */
export const getAudio = () => {
  const ctx = context ?? createContext();
  if (!ctx) return null;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

export const getMaster = () => {
  getAudio();
  return master;
};

export const isAudioSupported = () => Boolean(window.AudioContext ?? window.webkitAudioContext);

/** Called on the first user gesture so later playback is never blocked. */
export const unlockAudio = () => {
  const ctx = getAudio();
  if (!ctx) return;
  const ping = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  ping.connect(gain).connect(ctx.destination);
  ping.start();
  ping.stop(ctx.currentTime + 0.01);
};
