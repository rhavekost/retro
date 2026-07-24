/**
 * Wires the deck together.
 *
 * The whole toy is one idea: your voice goes onto a 30-second tape, and the
 * speed switch changes how fast the tape moves under the head. Slow playback
 * drops the pitch because that is what tape does — there is no pitch-shifting
 * here, just an AudioBufferSourceNode running below 1×.
 */
import { getAudio, unlockAudio, isAudioSupported } from '../../shared/audio/context.js';
import { createTape, TAPE_SECONDS } from './tape/tape.js';
import { createRecorder, isMicSupported } from './tape/recorder.js';
import { createTransport, SHUTTLE_RATE } from './tape/transport.js';
import { createReels } from './ui/reels.js';
import { createCounter, createMeter } from './ui/readout.js';

const WAVEFORM_BARS = 28;

const el = {
  deck: document.querySelector('.deck'),
  boom: document.querySelector('#boom'),
  caption: document.querySelector('#caption'),
  notice: document.querySelector('#notice'),
  lamp: document.querySelector('#rec-lamp'),
  waveform: document.querySelector('#waveform'),
  speedKnob: document.querySelector('#speed-knob'),
  rewindAll: document.querySelector('#rewind-all'),
  erase: document.querySelector('#erase'),
};

const keys = {
  rew: document.querySelector('#key-rew'),
  play: document.querySelector('#key-play'),
  ff: document.querySelector('#key-ff'),
  stop: document.querySelector('#key-stop'),
  rec: document.querySelector('#key-rec'),
};

const speedOptions = [...document.querySelectorAll('.speed__option')];
const SPEED_ORDER = ['slow', 'normal', 'fast'];

const setCaption = (text) => {
  el.caption.textContent = text;
};

const showNotice = (text) => {
  el.notice.hidden = false;
  el.notice.textContent = text;
};

/* ---------- Bail out early if the browser cannot do the job ---------- */

if (!isAudioSupported()) {
  showNotice('This browser has no Web Audio support, so the deck cannot run.');
  [...Object.values(keys), el.rewindAll, el.erase, ...speedOptions].forEach((control) => {
    control.disabled = true;
  });
  setCaption('No audio support.');
}

/* ---------- Build the deck ---------- */

// Creating the context here is safe: it starts suspended and the first key
// press resumes it.
const ctx = getAudio();
const tape = ctx ? createTape(ctx) : null;
const recorder = createRecorder();
const reels = createReels(document.querySelector('#reels'));
const counter = createCounter(document.querySelector('#counter'));
const meter = createMeter(document.querySelector('#meter'));

const waveformBars = Array.from({ length: WAVEFORM_BARS }, () => {
  const bar = document.createElement('span');
  bar.className = 'waveform__bar';
  bar.style.height = '2px';
  el.waveform.appendChild(bar);
  return bar;
});

const transport = tape
  ? createTransport({ tape, recorder, onChange: () => render() })
  : null;

/* ---------- Rendering ---------- */

const CAPTIONS = {
  stopped: () =>
    tape.isBlank
      ? 'Blank tape. Press Rec and say something.'
      : `Stopped at ${format(transport.position())}. Press Play.`,
  playing: () => `Playing back — ${transport.speed} speed.`,
  recording: () => 'Recording… the tape is rolling.',
  ff: () => 'Fast forward…',
  rew: () => 'Rewinding…',
};

const format = (seconds) => `${seconds.toFixed(1)}s`;

const render = () => {
  if (!transport) return;
  const mode = transport.mode;

  Object.entries(keys).forEach(([name, key]) => {
    const engaged =
      (name === 'play' && mode === 'playing') ||
      (name === 'rec' && mode === 'recording') ||
      (name === 'ff' && mode === 'ff') ||
      (name === 'rew' && mode === 'rew');
    key.classList.toggle('key--engaged', engaged);
    key.setAttribute('aria-pressed', String(engaged));
  });

  el.deck.classList.toggle('deck--rolling', mode === 'playing');
  el.deck.classList.toggle('deck--recording', mode === 'recording');
  el.boom.classList.toggle('mic--extended', mode === 'recording');
  el.lamp.classList.toggle('lamp--on', mode === 'recording');

  el.erase.disabled = tape.isBlank || mode !== 'stopped';

  setCaption((CAPTIONS[mode] ?? CAPTIONS.stopped)());
};

/** Redraws the brown strip on the cassette label after a recording lands. */
const renderWaveform = () => {
  if (!tape) return;
  const peaks = tape.peaks(WAVEFORM_BARS);
  waveformBars.forEach((bar, index) => {
    const height = 2 + peaks[index] * 9;
    bar.style.height = `${height.toFixed(1)}px`;
    bar.style.opacity = peaks[index] > 0.01 ? '1' : '0.35';
  });
};

/* ---------- The frame loop: reels, counter, meter ---------- */

const RATES = {
  stopped: () => 0,
  playing: () => transport.speedRate,
  recording: () => 1,
  ff: () => SHUTTLE_RATE,
  rew: () => -SHUTTLE_RATE,
};

const tick = (now) => {
  if (transport) {
    const position = transport.position();
    const rate = (RATES[transport.mode] ?? RATES.stopped)();

    reels.update({ position, duration: TAPE_SECONDS, rate, now });
    counter.update(position);
    meter.update(transport.mode === 'recording' ? recorder.level() : 0);
  }
  requestAnimationFrame(tick);
};

requestAnimationFrame(tick);

/* ---------- Controls ---------- */

let unlocked = false;

/** The first gesture is our only chance to start the audio context. */
const ensureUnlocked = () => {
  if (unlocked) return;
  unlocked = true;
  unlockAudio();
};

const actions = {
  play: () => transport.play(),
  stop: () => transport.stop(),
  ff: () => transport.fastForward(),
  rew: () => transport.rewind(),
  rec: async () => {
    const result = await transport.record();
    if (result === 'started' || result === 'busy') return;

    if (result === 'end-of-tape') {
      showNotice('You are at the end of side A. Rewind before recording again.');
      return;
    }
    showNotice(
      isMicSupported()
        ? 'The microphone was not available — allow mic access for this page and press Rec again.'
        : 'This browser has no microphone recording support.',
    );
  },
};

Object.entries(keys).forEach(([name, key]) => {
  key.addEventListener('click', () => {
    if (!transport) return;
    ensureUnlocked();
    Promise.resolve(actions[name]()).then(renderWaveform);
  });
});

speedOptions.forEach((option) => {
  option.addEventListener('click', () => {
    if (!transport) return;
    ensureUnlocked();
    transport.setSpeed(option.dataset.speed);
    syncSpeedSwitch();
  });
});

const syncSpeedSwitch = () => {
  if (!transport) return;
  const index = SPEED_ORDER.indexOf(transport.speed);
  speedOptions.forEach((option) => {
    option.setAttribute('aria-checked', String(option.dataset.speed === transport.speed));
  });
  el.speedKnob.style.transform = `translateX(${index * 100}%)`;
};

el.rewindAll.addEventListener('click', () => {
  if (!transport) return;
  ensureUnlocked();
  transport.rewindToStart();
});

el.erase.addEventListener('click', () => {
  if (!transport) return;
  ensureUnlocked();
  transport.eraseAll().then(renderWaveform);
});

/* ---------- Keyboard ---------- */

document.addEventListener('keydown', (event) => {
  if (!transport || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target;
  // Let the transport keys handle their own Space/Enter presses.
  if (target instanceof HTMLElement && target.tagName === 'BUTTON') return;

  const key = event.key.toLowerCase();
  const handler = {
    ' ': () => (transport.mode === 'stopped' ? actions.play() : actions.stop()),
    r: () => actions.rec(),
    s: () => actions.stop(),
    arrowright: () => actions.ff(),
    arrowleft: () => actions.rew(),
  }[key];

  if (!handler) return;
  event.preventDefault();
  ensureUnlocked();
  Promise.resolve(handler()).then(renderWaveform);
});

window.addEventListener('beforeunload', () => recorder.dispose());

/* ---------- Initial state ---------- */

syncSpeedSwitch();
renderWaveform();
render();

if (isAudioSupported() && !isMicSupported()) {
  showNotice(
    'This browser cannot record audio, so the tape will stay blank — everything else still runs.',
  );
}
