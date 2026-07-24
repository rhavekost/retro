/**
 * Speak & Math is Speak & Spell's chassis with arithmetic in it: same display,
 * same machine, same voice — different modes and a numeric keypad.
 */
import { createDisplay } from '../../shared/display/display.js';
import { createKeypad, codeForKeyboardEvent } from '../../shared/ui/keypad.js';
import { createConsole } from '../../shared/game/console.js';
import { createMachine } from '../../shared/game/machine.js';
import { setMuted, isVoiceSupported, cancelSpeech } from '../../shared/audio/voice.js';
import { setBeepsMuted } from '../../shared/audio/beeps.js';
import { unlockAudio, isAudioSupported } from '../../shared/audio/context.js';
import { SPEAK_AND_MATH_ROWS } from './ui/layout.js';
import { createSolveMode } from './game/modes/solve.js';
import { createCompareMode } from './game/modes/compare.js';
import { createStumperMode } from './game/modes/stumper.js';

const LEVELS = [1, 2, 3, 4];

const display = createDisplay(document.querySelector('#vfd'), { cells: 8 });
const io = createConsole(display);

const shell = document.querySelector('.device');
const notice = document.querySelector('#notice');
const levelPicker = document.querySelector('#levels');

let audioUnlocked = false;
const handlePress = (code) => {
  if (!audioUnlocked) {
    audioUnlocked = true;
    unlockAudio();
  }
  machine.press(code);
};

const keypad = createKeypad(document.querySelector('#keypad'), {
  rows: SPEAK_AND_MATH_ROWS,
  onPress: handlePress,
});

const machine = createMachine(io, {
  modes: {
    SOLVE: createSolveMode,
    COMPARE: createCompareMode,
    STUMPER: createStumperMode,
  },
  initialMode: 'SOLVE',
  levels: LEVELS,
  powerOnMessage: 'SPEAK AND MATH',
  onStateChange: (state) => {
    shell.classList.toggle('device--on', state.powered);
    shell.classList.toggle('device--busy', state.busy);
    keypad.setDisabled(!state.powered);
    document.querySelectorAll('[data-level]').forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.level) === state.level));
    });
    document.querySelectorAll('.key').forEach((key) => {
      key.classList.toggle('key--lit', key.dataset.code === state.modeId && state.powered);
    });
  },
});

LEVELS.forEach((level) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'level';
  button.dataset.level = String(level);
  button.textContent = 'ABCD'[level - 1];
  button.setAttribute('aria-pressed', String(level === 1));
  button.setAttribute('aria-label', `Difficulty level ${level}`);
  button.addEventListener('click', () => machine.setLevel(level));
  levelPicker.append(button);
});

document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const code = codeForKeyboardEvent(event, { letters: false, digits: true });
  if (!code) return;
  event.preventDefault();
  keypad.flashKey(code);
  handlePress(code);
});

const muteButton = document.querySelector('#mute');
muteButton.addEventListener('click', () => {
  const next = muteButton.getAttribute('aria-pressed') !== 'true';
  muteButton.setAttribute('aria-pressed', String(next));
  muteButton.textContent = next ? '🔇 Sound off' : '🔊 Sound on';
  setMuted(next);
  setBeepsMuted(next);
});

window.addEventListener('beforeunload', cancelSpeech);
display.setPowered(false);

if (!isAudioSupported()) {
  notice.hidden = false;
  notice.textContent = 'No Web Audio in this browser — the keypad will be silent.';
} else if (!isVoiceSupported()) {
  notice.hidden = false;
  notice.textContent = 'No speech synthesis here, so problems appear on the display without being read.';
}
