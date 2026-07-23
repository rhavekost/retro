/**
 * Routes keypresses. Global keys (power, mode switches, REPEAT, level) are
 * handled here; everything else goes to the active mode.
 *
 * The device is single-threaded like the original: while it is talking, the
 * keypad is inert apart from OFF.
 */
import { createSpellMode } from './modes/spell.js';
import { createMysteryMode } from './modes/mystery.js';
import { createLetterMode } from './modes/letter.js';
import { createSecretMode } from './modes/secret.js';
import { powerOnBeep, powerOffBeep, keyBeep } from '../audio/beeps.js';
import { cancelSpeech } from '../audio/voice.js';
import { LEVEL_NAMES } from '../data/words.js';

const MODE_KEYS = new Set(['SPELL', 'MYSTERY', 'SECRET', 'LETTER']);

export const createMachine = (io, { onStateChange } = {}) => {
  const state = { powered: false, busy: false, level: 'A', modeId: 'SPELL' };
  let mode = null;

  const publish = () => onStateChange?.({ ...state });

  const buildMode = (id) => {
    const options = { level: state.level };
    switch (id) {
      case 'MYSTERY':
        return createMysteryMode(io, options);
      case 'SECRET':
        return createSecretMode(io, options);
      case 'LETTER':
        return createLetterMode(io, options);
      case 'SPELL':
      default:
        return createSpellMode(io, options);
    }
  };

  /** Serialises everything: one action at a time, keypad frozen meanwhile. */
  const run = async (action) => {
    if (state.busy) return;
    state.busy = true;
    publish();
    try {
      await action();
    } catch (error) {
      console.error('Device fault:', error);
      await io.show('ERROR');
    } finally {
      state.busy = false;
      publish();
    }
  };

  const switchTo = async (id) => {
    state.modeId = id;
    mode = buildMode(id);
    publish();
    await mode.start();
  };

  const powerOn = async () => {
    state.powered = true;
    publish();
    io.display.setPowered(true);
    await powerOnBeep();
    await io.announce('SPEAK AND SPELL', { speech: 'Speak and spell.' });
    await switchTo('SPELL');
  };

  const powerOff = async () => {
    cancelSpeech();
    await powerOffBeep();
    io.display.setPowered(false);
    state.powered = false;
    mode = null;
    publish();
  };

  const setLevel = async (level) => {
    if (!LEVEL_NAMES.includes(level)) return;
    state.level = level;
    publish();
    if (!state.powered) return;
    await io.announce(`LEVEL ${level}`, { speech: `Level ${level}.` });
    await switchTo(state.modeId);
  };

  const press = (code) => {
    if (code === 'ON') {
      if (state.powered) return;
      run(powerOn);
      return;
    }

    // OFF cuts through anything, including mid-sentence.
    if (code === 'OFF') {
      if (!state.powered) return;
      cancelSpeech();
      state.busy = false;
      run(powerOff);
      return;
    }

    if (!state.powered || state.busy) return;

    keyBeep();

    // Typed characters bypass the action lock entirely: they only edit a
    // buffer, and routing them through it would drop keys typed in quick
    // succession.
    if (mode?.handleInput?.(code)) return;

    if (MODE_KEYS.has(code)) {
      run(() => switchTo(code));
      return;
    }

    if (code === 'GO') {
      run(() => switchTo(state.modeId));
      return;
    }

    if (code === 'REPLAY') {
      run(() => mode?.replay?.() ?? switchTo(state.modeId));
      return;
    }

    if (code === 'REPEAT') {
      run(() => io.repeatLast());
      return;
    }

    run(() => mode?.handleKey?.(code));
  };

  return { press, setLevel, getState: () => ({ ...state }) };
};
