/**
 * The deck mechanism. Owns the head position, the transport mode, and the
 * motor/hiss noises that go with each mode.
 *
 * Head position is never stepped by a timer — it is derived from the audio
 * clock, so playback and the reels stay locked together even if the page
 * stutters.
 */
import { getAudio, getMaster } from '../../../shared/audio/context.js';
import { startHiss, startMotor, clunk, release } from '../audio/mechanics.js';
import { TAPE_SECONDS } from './tape.js';

/** How much faster than play the spools run when shuttling. */
export const SHUTTLE_RATE = 9;

export const SPEEDS = {
  slow: 0.62,
  normal: 1,
  fast: 1.55,
};

const clamp = (value) => Math.max(0, Math.min(TAPE_SECONDS, value));

export const createTransport = ({ tape, recorder, onChange }) => {
  const state = {
    mode: 'stopped',
    speed: 'normal',
    /** Where the head sat when the current move began. */
    anchorHead: 0,
    anchorTime: 0,
    /** Signed tape-seconds per wall-clock second. */
    rate: 0,
  };

  let source = null;
  let hiss = null;
  let motor = null;
  let autoStop = null;
  let recordStartedAt = 0;
  let busy = false;

  const notify = () => onChange?.();

  /** Where the head is right now, in tape-seconds. */
  const position = () => {
    if (state.rate === 0) return clamp(state.anchorHead);
    const ctx = getAudio();
    if (!ctx) return clamp(state.anchorHead);
    return clamp(state.anchorHead + (ctx.currentTime - state.anchorTime) * state.rate);
  };

  /** Freezes the derived position into the anchor and halts the clock. */
  const anchor = (head = position(), rate = 0) => {
    const ctx = getAudio();
    state.anchorHead = clamp(head);
    state.anchorTime = ctx ? ctx.currentTime : 0;
    state.rate = rate;
  };

  const clearAutoStop = () => {
    if (autoStop) clearTimeout(autoStop);
    autoStop = null;
  };

  const silenceMechanics = () => {
    hiss?.stop();
    hiss = null;
    motor?.stop();
    motor = null;
  };

  const stopSource = () => {
    if (!source) return;
    source.onended = null;
    try {
      source.stop();
    } catch {
      // Already stopped on its own — nothing to undo.
    }
    source.disconnect();
    source = null;
  };

  /** Halts whatever the deck is doing. Recording is flushed to tape first. */
  const stop = async ({ quiet = false } = {}) => {
    if (state.mode === 'stopped') return;

    const wasRecording = state.mode === 'recording';
    clearAutoStop();
    stopSource();

    if (wasRecording) {
      busy = true;
      state.mode = 'stopped';
      anchor();
      notify();

      const recording = await recorder.stop();
      if (recording) {
        const endedAt = tape.write(recording, recordStartedAt);
        anchor(endedAt);
      }
      busy = false;
    } else {
      state.mode = 'stopped';
      anchor();
    }

    silenceMechanics();
    if (!quiet) release();
    notify();
  };

  const play = async () => {
    if (busy) return;
    if (state.mode !== 'stopped') await stop({ quiet: true });

    const ctx = getAudio();
    const out = getMaster();
    if (!ctx || !out) return;

    const head = position();
    if (tape.isBlank || head >= tape.recordedTo - 0.02) {
      // Nothing under the head — the deck just clunks and sits there.
      clunk({ soft: true });
      notify();
      return false;
    }

    const speed = SPEEDS[state.speed];
    clunk();

    source = ctx.createBufferSource();
    source.buffer = tape.buffer;
    source.playbackRate.value = speed;

    // Slow playback loses its highs on a real deck; fast playback gets thin.
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = speed < 1 ? 5200 : 9000;
    tone.Q.value = 0.7;

    source.connect(tone).connect(out);
    source.start(0, head);

    hiss = startHiss({ speed });
    state.mode = 'playing';
    anchor(head, speed);

    const remaining = (tape.recordedTo - head) / speed;
    autoStop = setTimeout(() => stop(), remaining * 1000 + 60);
    source.onended = () => {
      if (state.mode === 'playing') stop();
    };

    notify();
    return true;
  };

  /**
   * Returns why it could not start rather than a bare false, so the UI can
   * tell "you never allowed the mic" apart from "you are at the end of side A".
   */
  const record = async () => {
    if (busy) return 'busy';
    if (state.mode !== 'stopped') await stop({ quiet: true });

    const head = position();
    if (head >= TAPE_SECONDS - 0.5) return 'end-of-tape';

    const armed = recorder.isArmed || (await recorder.arm().catch(() => false));
    if (!armed) return 'no-mic';

    if (!recorder.start()) return 'no-mic';

    clunk();
    recordStartedAt = head;
    hiss = startHiss({ speed: 1 });
    state.mode = 'recording';
    anchor(head, 1);

    autoStop = setTimeout(() => stop(), (TAPE_SECONDS - head) * 1000);
    notify();
    return 'started';
  };

  /** Shared implementation for the two shuttle keys. */
  const shuttle = async (direction) => {
    if (busy) return;
    if (state.mode !== 'stopped') await stop({ quiet: true });

    const head = position();
    const limit = direction > 0 ? TAPE_SECONDS : 0;
    if (head === limit) return;

    clunk({ soft: true });
    motor = startMotor({ rate: 1 });
    state.mode = direction > 0 ? 'ff' : 'rew';
    anchor(head, direction * SHUTTLE_RATE);

    const distance = Math.abs(limit - head);
    autoStop = setTimeout(() => stop(), (distance / SHUTTLE_RATE) * 1000);
    notify();
  };

  const fastForward = () => shuttle(1);
  const rewind = () => shuttle(-1);

  /** Snap back to the top of the tape without the long spool-down. */
  const rewindToStart = async () => {
    await stop({ quiet: true });
    release();
    anchor(0);
    notify();
  };

  const eraseAll = async () => {
    await stop({ quiet: true });
    tape.erase();
    anchor(0);
    release();
    notify();
  };

  const setSpeed = (speed) => {
    if (!SPEEDS[speed]) return;
    state.speed = speed;
    // Changing speed mid-play would desync the anchor, so the deck restarts
    // the pass from where the head sits — the same as flicking the real switch.
    if (state.mode === 'playing') {
      const head = position();
      stop({ quiet: true }).then(() => {
        anchor(head);
        play();
      });
    }
    notify();
  };

  return {
    play,
    record,
    stop,
    fastForward,
    rewind,
    rewindToStart,
    eraseAll,
    setSpeed,
    position,
    get mode() {
      return state.mode;
    },
    get speed() {
      return state.speed;
    },
    get speedRate() {
      return SPEEDS[state.speed];
    },
    get isBusy() {
      return busy;
    },
  };
};
