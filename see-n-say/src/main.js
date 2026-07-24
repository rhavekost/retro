/**
 * Wires the dial, the cord and the audio together.
 *
 * Interaction model, matching the original toy:
 *   1. Click a wedge to aim the arrow.
 *   2. Pull the cord — the toy announces and plays whatever it points at.
 *   Bonus: "Surprise me" spins the arrow a few turns before landing.
 */
import { ANIMALS } from './data/animals.js';
import { createWheel } from './ui/wheel.js';
import { createCord } from './ui/cord.js';
import { playAnimalSound, playRatchet } from './audio/player.js';
import { speak, cancelSpeech, isSpeechSupported } from './audio/speech.js';
import { unlockAudio, isAudioSupported } from '../../shared/audio/context.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const caption = document.querySelector('#caption');
const surpriseButton = document.querySelector('#surprise');
const notice = document.querySelector('#notice');

const state = { index: 0, busy: false, unlocked: false };

const wheel = createWheel(document.querySelector('#wheel-mount'), (index) => {
  ensureUnlocked();
  if (state.busy) return;
  state.index = index;
  wheel.pointAt(index);
  setCaption(`Pointing at the ${ANIMALS[index].label}. Pull the cord!`);
});

const cord = createCord(document.querySelector('#cord'), () => {
  ensureUnlocked();
  playTurn(state.index);
});

const setCaption = (text) => {
  caption.textContent = text;
};

/** The first gesture is our only chance to start the audio context. */
function ensureUnlocked() {
  if (state.unlocked) return;
  state.unlocked = true;
  unlockAudio();
}

/** Announce, then sound. This is the whole toy. */
async function playTurn(index) {
  if (state.busy) return;
  state.busy = true;
  cord.setLocked(true);
  surpriseButton.disabled = true;

  const animal = ANIMALS[index];
  try {
    wheel.nudge();
    await playRatchet();
    setCaption(`The ${animal.label} says…`);
    await speak(`The ${animal.label} says`);
    await wait(140);
    setCaption(`${animal.say}!`);
    await playAnimalSound(animal.id);
    await wait(250);
    setCaption(`Pointing at the ${animal.label}. Pull the cord!`);
  } finally {
    state.busy = false;
    cord.setLocked(false);
    surpriseButton.disabled = false;
  }
}

/** Spin two-and-a-bit turns to a random wedge, then play it. */
async function surprise() {
  ensureUnlocked();
  if (state.busy) return;
  state.busy = true;
  surpriseButton.disabled = true;
  cord.setLocked(true);

  const index = Math.floor(Math.random() * ANIMALS.length);
  state.index = index;
  wheel.setSpinning(true);
  wheel.pointAt(index, { extraTurns: 2 });
  setCaption('Round and round…');
  cord.autoPull();

  await wait(1500);
  wheel.setSpinning(false);
  state.busy = false;
  surpriseButton.disabled = false;
  cord.setLocked(false);
  await playTurn(index);
}

surpriseButton.addEventListener('click', surprise);

// Arrow keys walk the dial, matching radiogroup conventions.
document.querySelector('#wheel-mount').addEventListener('keydown', (event) => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!step || state.busy) return;
  event.preventDefault();
  const next = (state.index + step + ANIMALS.length) % ANIMALS.length;
  state.index = next;
  wheel.pointAt(next);
  wheel.focusWedge(next);
  setCaption(`Pointing at the ${ANIMALS[next].label}. Pull the cord!`);
});

window.addEventListener('beforeunload', cancelSpeech);

// Initial state.
wheel.pointAt(0);
setCaption('Pick an animal, then pull the cord.');

if (!isAudioSupported()) {
  notice.hidden = false;
  notice.textContent = 'This browser has no Web Audio support, so the animal sounds are silent.';
} else if (!isSpeechSupported()) {
  notice.hidden = false;
  notice.textContent = 'No speech synthesis here — you get the animal sounds without the narrator.';
}
