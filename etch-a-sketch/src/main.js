/**
 * Knobs turn → the stylus moves → the segment it travelled gets stroked.
 */
import { createStylus } from './model/stylus.js';
import { createScreen } from './ui/screen.js';
import { createKnob } from './ui/knobs.js';
import { scrape, shakeNoise } from './audio/scratch.js';
import { unlockAudio } from '../../shared/audio/context.js';

const WIDTH = 640;
const HEIGHT = 460;

const screen = createScreen(document.querySelector('#screen'), {
  width: WIDTH,
  height: HEIGHT,
});
const stylus = createStylus({ width: WIDTH, height: HEIGHT });

let unlocked = false;
const ensureUnlocked = () => {
  if (unlocked) return;
  unlocked = true;
  unlockAudio();
};

const nudge = (dx, dy) => {
  ensureUnlocked();
  const segment = stylus.move(dx, dy);
  screen.drawSegment(segment);
  scrape(Math.abs(dx) + Math.abs(dy));
};

createKnob(document.querySelector('#knob-left'), {
  pixelsPerTurn: 520,
  onTurn: (steps) => nudge(steps, 0),
});

createKnob(document.querySelector('#knob-right'), {
  pixelsPerTurn: 520,
  onTurn: (steps) => nudge(0, steps),
});

const shakeButton = document.querySelector('#shake');
shakeButton.addEventListener('click', async () => {
  ensureUnlocked();
  shakeButton.disabled = true;
  document.querySelector('.frame').classList.add('frame--shaking');
  await Promise.all([screen.shake(), shakeNoise()]);
  document.querySelector('.frame').classList.remove('frame--shaking');
  stylus.reset();
  shakeButton.disabled = false;
});
