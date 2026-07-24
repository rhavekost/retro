/**
 * Boots the device: display, keypad, machine, and the physical-keyboard bridge.
 */
import { createDisplay } from '../../shared/display/display.js';
import { createKeypad, codeForKeyboardEvent } from '../../shared/ui/keypad.js';
import { SPEAK_AND_SPELL_ROWS } from './ui/layout.js';
import { createConsole } from './game/console.js';
import { createMachine } from './game/machine.js';
import { setMuted, isVoiceSupported, cancelSpeech } from './audio/voice.js';
import { setBeepsMuted } from '../../shared/audio/beeps.js';
import { unlockAudio, isAudioSupported } from '../../shared/audio/context.js';
import { LEVEL_NAMES } from './data/words.js';

const display = createDisplay(document.querySelector('#vfd'));
const io = createConsole(display);

const shell = document.querySelector('.device');
const notice = document.querySelector('#notice');
const levelPicker = document.querySelector('#levels');

let audioUnlocked = false;
/** Every press goes through here so the first one can unlock audio. */
const handlePress = (code) => {
  if (!audioUnlocked) {
    audioUnlocked = true;
    unlockAudio();
  }
  machine.press(code);
};

const keypad = createKeypad(document.querySelector('#keypad'), {
  rows: SPEAK_AND_SPELL_ROWS,
  onPress: handlePress,
});

const machine = createMachine(io, {
  onStateChange: (state) => {
    shell.classList.toggle('device--on', state.powered);
    shell.classList.toggle('device--busy', state.busy);
    keypad.setDisabled(!state.powered);
    document.querySelectorAll('[data-level]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.level === state.level));
    });
    document.querySelectorAll('.key').forEach((key) => {
      key.classList.toggle('key--lit', key.dataset.code === state.modeId && state.powered);
    });
  },
});

// Difficulty selector — the original used swappable cartridges for this.
LEVEL_NAMES.forEach((level) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'level';
  button.dataset.level = level;
  button.textContent = level;
  button.setAttribute('aria-pressed', String(level === 'A'));
  button.setAttribute('aria-label', `Difficulty level ${level}`);
  button.addEventListener('click', () => machine.setLevel(level));
  levelPicker.append(button);
});

// Typing on a real keyboard drives the membrane keys.
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const code = codeForKeyboardEvent(event);
  if (!code) return;
  event.preventDefault();
  keypad.flashKey(code);
  handlePress(code);
});

// Mute toggle, standing in for the volume key.
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
  notice.textContent =
    'No speech synthesis here, so the words appear on the display without being spoken.';
}
