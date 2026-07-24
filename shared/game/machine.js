/**
 * Routes keypresses. Global keys (power, mode switches, REPEAT, level) are
 * handled here; everything else goes to the active mode.
 *
 * The device is single-threaded like the original: while it is talking, the
 * keypad is inert apart from OFF.
 */
import { powerOnBeep, powerOffBeep, keyBeep } from '../audio/beeps.js';
import { cancelSpeech } from '../audio/voice.js';

/**
 * Routes keypresses for a turn-taking console.
 *
 * The toy supplies its own modes and levels; this module only knows about
 * power, the one-action-at-a-time lock, and which key selects which mode.
 */
export const createMachine = (
  io,
  { modes, initialMode, levels = [], powerOnMessage = '', onStateChange } = {},
) => {
  const state = { powered: false, busy: false, level: levels[0] ?? null, modeId: initialMode };
  let mode = null;

  const publish = () => onStateChange?.({ ...state });

  const buildMode = (id) => modes[id](io, { level: state.level });

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
    if (powerOnMessage) await io.announce(powerOnMessage, { speech: powerOnMessage });
    await switchTo(initialMode);
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
    if (!levels.includes(level)) return;
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

    if (Object.hasOwn(modes, code)) {
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
