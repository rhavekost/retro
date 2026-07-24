/**
 * Wiring, plus the URL round trip: the picture *is* the hash, so sharing needs
 * no storage and no backend.
 */
import { emptyBoard, CELL_COUNT } from './model/board.js';
import { encode, decode } from './model/codec.js';
import { createGrid } from './ui/grid.js';
import { createPalette } from './ui/palette.js';
import { pegClick, sweepClear } from './audio/pegs.js';
import { unlockAudio } from '../../shared/audio/context.js';

const status = document.querySelector('#status');
const say = (text) => {
  status.textContent = text;
};

// A hash present on load is a shared picture; otherwise start blank.
const initial = window.location.hash.slice(1);
let cells = initial ? decode(initial, CELL_COUNT) : emptyBoard();

let unlocked = false;
const ensureUnlocked = () => {
  if (unlocked) return;
  unlocked = true;
  unlockAudio();
};

const palette = createPalette(document.querySelector('#palette'), {
  onSelect: () => ensureUnlocked(),
});

/** Rewriting the hash on every peg would spam history; replaceState does not. */
let saveTimer = null;
const scheduleSave = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const encoded = encode(cells);
    window.history.replaceState(null, '', `#${encoded}`);
  }, 250);
};

const grid = createGrid(document.querySelector('#board'), {
  cells,
  onPaint: (index) => {
    ensureUnlocked();
    const value = palette.selected();
    if (cells[index] === value) return;
    cells[index] = value;
    grid.setCell(index, value);
    if (value !== 0) pegClick(value);
    scheduleSave();
  },
});

document.querySelector('#clear').addEventListener('click', () => {
  ensureUnlocked();
  cells = emptyBoard();
  grid.repaintAll(cells);
  sweepClear();
  scheduleSave();
  say('Board cleared.');
});

document.querySelector('#share').addEventListener('click', async () => {
  const encoded = encode(cells);
  window.history.replaceState(null, '', `#${encoded}`);
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    say('Link copied — send it to someone.');
  } catch {
    // Clipboard access can be refused; the URL is already in the address bar.
    say('Copy the address bar to share this picture.');
  }
});

say(initial ? 'Loaded a shared picture.' : 'Pick a colour and start placing pegs.');
