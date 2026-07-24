/**
 * Playback loop and input routing.
 *
 * The unit is strictly turn-based: while it is showing a sequence the panels
 * are inert, and the player's turn ends the moment they complete or miss.
 */
import { createGame, intervalFor, WIN_LENGTHS } from './game/sequence.js';
import { createPanels } from './ui/panels.js';
import { playColor, playFailure } from './audio/voices.js';
import { unlockAudio } from '../../shared/audio/context.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readout = document.querySelector('#readout');
const startButton = document.querySelector('#start');
const levelPicker = document.querySelector('#levels');

const state = { level: 1, busy: false, playing: false, unlocked: false };
let game = createGame({ rng: Math.random, level: state.level });

const say = (text) => {
  readout.textContent = text;
};

const panels = createPanels(document.querySelector('#unit'), {
  onPress: (color) => handlePress(color),
});

const ensureUnlocked = () => {
  if (state.unlocked) return;
  state.unlocked = true;
  unlockAudio();
};

/** Shows the whole sequence back to the player. */
const replaySequence = async () => {
  state.busy = true;
  panels.setInteractive(false);
  const sequence = game.sequence();
  say(`Watch — ${sequence.length} ${sequence.length === 1 ? 'signal' : 'signals'}`);

  await wait(600);
  for (const color of sequence) {
    const gap = intervalFor(sequence.length);
    await panels.light(color, Math.max(180, gap - 140));
    await playColor(color, { duration: 0.01 });
    await wait(140);
  }

  state.busy = false;
  panels.setInteractive(true);
  say('Your turn');
};

const nextRound = async () => {
  game.extend();
  await replaySequence();
};

const endGame = async (message) => {
  state.playing = false;
  panels.setInteractive(false);
  say(message);
  startButton.disabled = false;
  levelPicker.querySelectorAll('button').forEach((b) => (b.disabled = false));
};

async function handlePress(color) {
  if (state.busy || !state.playing) return;
  ensureUnlocked();

  // Lock the panels the instant the verdict is known, not after the sound
  // finishes — otherwise a press landing during that ~200ms window could
  // call game.press() again against a cursor the machine already moved past.
  state.busy = true;
  panels.setInteractive(false);

  const { verdict, expected } = game.press(color);
  panels.light(color, 220);
  await playColor(color, { duration: 0.18 });

  if (verdict === 'correct') {
    state.busy = false;
    panels.setInteractive(true);
    return;
  }

  if (verdict === 'wrong') {
    await playFailure();
    await panels.flashAll(2);
    await endGame(`Wrong — that was ${expected}. You reached ${game.sequence().length - 1}.`);
    state.busy = false;
    return;
  }

  if (verdict === 'won') {
    await panels.flashAll(5);
    await endGame(`You won at level ${state.level} — all ${WIN_LENGTHS[state.level]} signals.`);
    state.busy = false;
    return;
  }

  // round-complete
  await wait(700);
  state.busy = false;
  await nextRound();
}

const startGame = async () => {
  ensureUnlocked();
  game = createGame({ rng: Math.random, level: state.level });
  state.playing = true;
  startButton.disabled = true;
  levelPicker.querySelectorAll('button').forEach((b) => (b.disabled = true));
  await nextRound();
};

startButton.addEventListener('click', startGame);

[1, 2, 3, 4].forEach((level) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'level';
  button.dataset.level = String(level);
  button.textContent = String(level);
  button.setAttribute('aria-pressed', String(level === 1));
  button.setAttribute('aria-label', `Skill level ${level}, ${WIN_LENGTHS[level]} signals to win`);
  button.addEventListener('click', () => {
    state.level = level;
    levelPicker.querySelectorAll('button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.level === String(level)));
    });
    say(`Level ${level} — ${WIN_LENGTHS[level]} signals to win.`);
  });
  levelPicker.append(button);
});

panels.setInteractive(false);
