# Lite-Brite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A glowing peg board you can draw on, with the finished picture shareable as a URL.

**Architecture:** The board is a flat array of colour indices with no DOM knowledge, and a codec turns that array into a short run-length-encoded string for the URL hash. The rendering layer is a staggered grid of buttons that paint on drag. Because the whole picture is a pure value, sharing is just encoding it — no storage, no backend.

**Tech Stack:** Vanilla ES modules, CSS grid + `box-shadow` bloom, Web Audio via `shared/audio/synth.js`. Node 22 `node:test`.

## Global Constraints

- **Prerequisite:** `2026-07-23-shared-foundations.md` must be complete — this plan imports `shared/audio/synth.js`, `shared/audio/context.js` and `shared/styles/tokens.css`.
- **Zero npm dependencies. No build step. Relative paths only.**
- **Pure logic must not touch `window` or `document` at module scope.** In particular the codec must be importable in Node, so it takes and returns strings — reading `location.hash` happens in `main.js`.
- **A shared URL must survive a round trip exactly.** Encode → decode → encode is the property the tests enforce.
- The page links `../shared/styles/tokens.css` first and `../shared/styles/backlink.css` last, and carries the back-link anchor.

## File Structure

| File | Responsibility |
| --- | --- |
| `lite-brite/src/model/board.js` | Grid dimensions, palette, cell get/set. Pure. |
| `lite-brite/src/model/codec.js` | Run-length encode/decode for the URL. Pure. |
| `lite-brite/src/ui/grid.js` | The staggered hole grid; paint-on-drag. |
| `lite-brite/src/ui/palette.js` | Colour picker and tools. |
| `lite-brite/src/audio/pegs.js` | The peg-push click. |
| `lite-brite/src/main.js` | Wiring, URL load/save. |
| `lite-brite/styles/base.css`, `board.css` | Page frame, board, glow. |
| `lite-brite/index.html` | Markup. |
| `test/lite-brite.test.js` | Specs for `board.js` and `codec.js`. |

---

### Task 1: Board model and codec, test-first

**Files:**
- Create: `lite-brite/src/model/board.js`
- Create: `lite-brite/src/model/codec.js`
- Create: `test/lite-brite.test.js`

**Interfaces:**
- Produces from `board.js`: `COLORS` (frozen array of 8 `{ id, name, hex }`), `COLS` (28), `ROWS` (22), `CELL_COUNT`, `emptyBoard()` → `Uint8Array`, `isStaggered(row)` → boolean.
- Produces from `codec.js`: `encode(cells)` → string, `decode(text, length)` → `Uint8Array`.
- Cell values are `0` for empty and `1…8` indexing `COLORS`.
- Consumed by: `lite-brite/src/main.js`, `lite-brite/src/ui/grid.js`.

- [ ] **Step 1: Write the failing test**

Create `test/lite-brite.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, COLS, ROWS, CELL_COUNT, emptyBoard, isStaggered } from '../lite-brite/src/model/board.js';
import { encode, decode } from '../lite-brite/src/model/codec.js';

test('the palette has eight distinct colours', () => {
  assert.equal(COLORS.length, 8);
  assert.equal(new Set(COLORS.map((c) => c.hex)).size, 8);
});

test('the board is empty to start', () => {
  const cells = emptyBoard();
  assert.equal(cells.length, CELL_COUNT);
  assert.equal(cells.every((value) => value === 0), true);
});

test('CELL_COUNT is rows times columns', () => {
  assert.equal(CELL_COUNT, COLS * ROWS);
});

test('alternate rows are staggered', () => {
  assert.equal(isStaggered(0), false);
  assert.equal(isStaggered(1), true);
  assert.equal(isStaggered(2), false);
});

test('an empty board encodes to a single run', () => {
  const cells = emptyBoard();
  assert.equal(encode(cells), `.${CELL_COUNT}`);
});

test('a single peg round-trips', () => {
  const cells = emptyBoard();
  cells[5] = 3;
  const restored = decode(encode(cells), CELL_COUNT);
  assert.deepEqual(Array.from(restored), Array.from(cells));
});

test('runs of the same colour collapse', () => {
  const cells = new Uint8Array(6);
  cells.fill(1);
  assert.equal(encode(cells), 'A6');
});

test('a run of one omits the count', () => {
  const cells = new Uint8Array(3);
  cells[0] = 1;
  cells[1] = 2;
  cells[2] = 1;
  assert.equal(encode(cells), 'ABA');
});

test('a mixed board round-trips exactly', () => {
  const cells = emptyBoard();
  for (let i = 0; i < cells.length; i += 7) cells[i] = (i % 8) + 1;
  const restored = decode(encode(cells), CELL_COUNT);
  assert.deepEqual(Array.from(restored), Array.from(cells));
});

test('encode is stable — encoding a decoded value reproduces the string', () => {
  const cells = emptyBoard();
  cells[0] = 8;
  cells[1] = 8;
  cells[40] = 2;
  const once = encode(cells);
  assert.equal(encode(decode(once, CELL_COUNT)), once);
});

test('decode pads a short string out to the full board', () => {
  const restored = decode('A2', CELL_COUNT);
  assert.equal(restored.length, CELL_COUNT);
  assert.equal(restored[0], 1);
  assert.equal(restored[2], 0);
});

test('decode truncates an over-long string', () => {
  const restored = decode(`A${CELL_COUNT + 50}`, CELL_COUNT);
  assert.equal(restored.length, CELL_COUNT);
});

test('decode ignores characters outside the alphabet rather than throwing', () => {
  const restored = decode('A2$$$B1', CELL_COUNT);
  assert.equal(restored[0], 1);
  assert.equal(restored[2], 2);
});

test('decode of an empty string gives an empty board', () => {
  const restored = decode('', CELL_COUNT);
  assert.equal(restored.every((v) => v === 0), true);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lite-brite/src/model/board.js'`.

- [ ] **Step 3: Write the board model**

Create `lite-brite/src/model/board.js`:

```js
/**
 * The peg board as plain data: one byte per hole, 0 for empty and 1–8 indexing
 * COLORS. Keeping the picture a flat array is what makes sharing it trivial.
 */

/** The eight translucent peg colours. */
export const COLORS = Object.freeze([
  { id: 1, name: 'red', hex: '#ff2f45' },
  { id: 2, name: 'orange', hex: '#ff8a1e' },
  { id: 3, name: 'yellow', hex: '#ffe23d' },
  { id: 4, name: 'green', hex: '#41e05a' },
  { id: 5, name: 'blue', hex: '#2f9dff' },
  { id: 6, name: 'violet', hex: '#a45cff' },
  { id: 7, name: 'pink', hex: '#ff6ec7' },
  { id: 8, name: 'white', hex: '#fdfbf0' },
]);

export const COLS = 28;
export const ROWS = 22;
export const CELL_COUNT = COLS * ROWS;

/** Odd rows sit half a hole to the right, as on the real board. */
export const isStaggered = (row) => row % 2 === 1;

export const emptyBoard = () => new Uint8Array(CELL_COUNT);

export const colorById = (id) => COLORS.find((color) => color.id === id) ?? null;
```

- [ ] **Step 4: Write the codec**

Create `lite-brite/src/model/codec.js`:

```js
/**
 * Run-length codec for the URL hash.
 *
 * Cells become letters (`.` empty, `A`–`H` for the eight colours) followed by
 * a repeat count when a run is longer than one. Letters and digits never
 * collide, so the format parses without separators and stays URL-safe.
 */
const EMPTY = '.';
const ALPHABET = '.ABCDEFGH';

const charFor = (value) => ALPHABET[value] ?? EMPTY;
const valueFor = (char) => {
  const index = ALPHABET.indexOf(char);
  return index < 0 ? null : index;
};

/** @param {Uint8Array} cells */
export const encode = (cells) => {
  let out = '';
  let run = 0;
  let current = cells[0] ?? 0;

  const flush = () => {
    if (run === 0) return;
    out += charFor(current) + (run > 1 ? String(run) : '');
  };

  for (const value of cells) {
    if (value === current) {
      run += 1;
      continue;
    }
    flush();
    current = value;
    run = 1;
  }
  flush();
  return out;
};

/**
 * @param {string} text
 * @param {number} length total cells to produce
 * @returns {Uint8Array} always exactly `length` long
 */
export const decode = (text, length) => {
  const cells = new Uint8Array(length);
  let cursor = 0;
  let index = 0;

  while (index < text.length && cursor < length) {
    const value = valueFor(text[index]);
    index += 1;
    // Skip anything that is not part of the alphabet rather than failing —
    // a mangled shared link should still render what it can.
    if (value === null) continue;

    let digits = '';
    while (index < text.length && text[index] >= '0' && text[index] <= '9') {
      digits += text[index];
      index += 1;
    }

    const run = digits === '' ? 1 : Number.parseInt(digits, 10);
    for (let i = 0; i < run && cursor < length; i += 1) {
      cells[cursor] = value;
      cursor += 1;
    }
  }

  return cells;
};
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 14 Lite-Brite assertions green, `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add lite-brite/src/model test/lite-brite.test.js
git commit -m "feat: Lite-Brite board model and URL codec"
```

---

### Task 2: The board

**Files:**
- Create: `lite-brite/src/ui/grid.js`

**Interfaces:**
- Consumes: `COLS`, `ROWS`, `CELL_COUNT`, `COLORS`, `isStaggered`, `colorById` from `../model/board.js`.
- Produces: `createGrid(mount, { cells, onPaint })` → `{ render(), setCell(index, value), repaintAll(cells) }`. `onPaint` receives a cell index.

Painting continues while the pointer is held down and moves across holes, which is how anyone actually fills an area.

- [ ] **Step 1: Write the module**

Create `lite-brite/src/ui/grid.js`:

```js
/**
 * The hole grid. Each hole is a button so it is keyboard-reachable; painting
 * continues as the pointer is dragged across holes.
 */
import { COLS, ROWS, isStaggered, colorById } from '../model/board.js';

export const createGrid = (mount, { cells, onPaint }) => {
  const holes = [];
  let painting = false;

  mount.style.setProperty('--cols', String(COLS));
  mount.style.setProperty('--rows', String(ROWS));

  for (let row = 0; row < ROWS; row += 1) {
    const rowEl = document.createElement('div');
    rowEl.className = `pegrow${isStaggered(row) ? ' pegrow--offset' : ''}`;

    for (let col = 0; col < COLS; col += 1) {
      const index = row * COLS + col;
      const hole = document.createElement('button');
      hole.type = 'button';
      hole.className = 'hole';
      hole.dataset.index = String(index);
      hole.setAttribute('aria-label', `Row ${row + 1}, hole ${col + 1}`);

      hole.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        painting = true;
        onPaint(index);
      });
      // pointerenter fires on the hole the pointer moves onto, which is
      // exactly the drag-to-fill behaviour we want.
      hole.addEventListener('pointerenter', () => {
        if (painting) onPaint(index);
      });
      hole.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onPaint(index);
      });

      rowEl.append(hole);
      holes.push(hole);
    }
    mount.append(rowEl);
  }

  // Releasing anywhere ends the stroke, including outside the board.
  window.addEventListener('pointerup', () => {
    painting = false;
  });
  window.addEventListener('pointercancel', () => {
    painting = false;
  });

  const setCell = (index, value) => {
    const hole = holes[index];
    if (!hole) return;
    const color = colorById(value);
    hole.classList.toggle('hole--lit', Boolean(color));
    hole.style.setProperty('--peg', color ? color.hex : 'transparent');
  };

  const repaintAll = (next) => {
    for (let i = 0; i < holes.length; i += 1) setCell(i, next[i]);
  };

  repaintAll(cells);
  return { setCell, repaintAll };
};
```

- [ ] **Step 2: Commit**

```bash
git add lite-brite/src/ui/grid.js
git commit -m "feat: Lite-Brite hole grid with drag-to-paint"
```

---

### Task 3: Palette, tools and peg sound

**Files:**
- Create: `lite-brite/src/ui/palette.js`
- Create: `lite-brite/src/audio/pegs.js`

**Interfaces:**
- Produces from `palette.js`: `createPalette(mount, { onSelect })` → `{ select(id), selected() }`. Colour id `0` is the eraser.
- Produces from `pegs.js`: `pegClick(colorId)`, `sweepClear()`.

- [ ] **Step 1: Write the palette**

Create `lite-brite/src/ui/palette.js`:

```js
/**
 * The colour picker. The eraser is just colour 0, so painting and erasing
 * follow the same code path.
 */
import { COLORS } from '../model/board.js';

export const createPalette = (mount, { onSelect }) => {
  let current = COLORS[0].id;
  const swatches = new Map();

  const paint = () => {
    swatches.forEach((node, id) => {
      node.setAttribute('aria-pressed', String(id === current));
    });
  };

  const add = ({ id, name, hex }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = id === 0 ? 'swatch swatch--eraser' : 'swatch';
    button.style.setProperty('--peg', hex);
    button.setAttribute('aria-label', name);
    button.setAttribute('aria-pressed', 'false');
    if (id === 0) button.textContent = '⌫';
    button.addEventListener('click', () => {
      current = id;
      paint();
      onSelect(id);
    });
    mount.append(button);
    swatches.set(id, button);
  };

  COLORS.forEach(add);
  add({ id: 0, name: 'eraser', hex: 'transparent' });
  paint();

  return {
    select: (id) => {
      current = id;
      paint();
    },
    selected: () => current,
  };
};
```

- [ ] **Step 2: Write the peg sound**

Create `lite-brite/src/audio/pegs.js`:

```js
/**
 * The plastic snap of a peg going in, pitched slightly by colour so filling an
 * area has a bit of melody to it.
 */
import { getAudio, getMaster } from '../../../shared/audio/context.js';
import { tone, noise } from '../../../shared/audio/synth.js';

let lastAt = 0;

export const pegClick = (colorId) => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return;

  // Dragging fires far faster than a distinct click can be heard.
  const now = ctx.currentTime * 1000;
  if (now - lastAt < 35) return;
  lastAt = now;

  noise(ctx, out, ctx.currentTime + 0.004, {
    filter: 'bandpass',
    cutoff: [[0, 3200]],
    q: 5,
    envelope: { peak: 0.1, attack: 0.001, hold: 0.008, release: 0.02 },
  });

  tone(ctx, out, ctx.currentTime + 0.004, {
    type: 'square',
    pitch: [[0, 620 + colorId * 55]],
    filter: 'lowpass',
    cutoff: [[0, 3000]],
    envelope: { peak: 0.07, attack: 0.002, hold: 0.014, release: 0.03 },
  });
};

/** A descending wash when the board is cleared. */
export const sweepClear = () => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return;

  noise(ctx, out, ctx.currentTime + 0.01, {
    filter: 'bandpass',
    cutoff: [[0, 3000], [0.5, 700]],
    q: 1.2,
    envelope: { peak: 0.16, attack: 0.01, hold: 0.35, release: 0.2 },
  });
};
```

- [ ] **Step 3: Commit**

```bash
git add lite-brite/src/ui/palette.js lite-brite/src/audio/pegs.js
git commit -m "feat: Lite-Brite palette and peg sounds"
```

---

### Task 4: Wire it together, with URL sharing

**Files:**
- Create: `lite-brite/index.html`
- Create: `lite-brite/src/main.js`

- [ ] **Step 1: Write the markup**

Create `lite-brite/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lite-Brite</title>
    <meta name="description" content="A browser tribute to the 1967 glowing peg board." />
    <link rel="stylesheet" href="../shared/styles/tokens.css" />
    <link rel="stylesheet" href="../shared/styles/frame.css" />
    <link rel="stylesheet" href="styles/base.css" />
    <link rel="stylesheet" href="styles/board.css" />
    <link rel="stylesheet" href="../shared/styles/backlink.css" />
    <link
      rel="icon"
      href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='2' fill='%23111'/><circle cx='5' cy='5' r='2' fill='%23ff2f45'/><circle cx='11' cy='6' r='2' fill='%232f9dff'/><circle cx='7' cy='11' r='2' fill='%23ffe23d'/></svg>"
    />
  </head>
  <body>
    <a class="backlink" href="../">
      <span class="backlink__arrow" aria-hidden="true">←</span> All toys
    </a>

    <main class="stage">
      <h1 class="title">Lite-Brite</h1>

      <div class="box">
        <div id="board" class="board"></div>
      </div>

      <div id="palette" class="palette" role="group" aria-label="Peg colour"></div>

      <div class="controls">
        <button id="share" type="button" class="button">Copy link to this picture</button>
        <button id="clear" type="button" class="button button--quiet">Clear board</button>
      </div>

      <p id="status" class="status" role="status" aria-live="polite"></p>

      <p class="hint">
        Pick a colour and drag across the board to place pegs. Your picture lives
        in the address bar — copy the link to send it to someone.
      </p>
    </main>

    <script type="module" src="src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Write the wiring**

Create `lite-brite/src/main.js`:

```js
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
```

- [ ] **Step 3: Commit**

```bash
git add lite-brite/index.html lite-brite/src/main.js
git commit -m "feat: Lite-Brite wiring and URL sharing"
```

---

### Task 5: Make it glow

**Files:**
- Create: `lite-brite/styles/base.css`
- Create: `lite-brite/styles/board.css`

The whole toy is the glow. Lit pegs need a bloom that reads against black; unlit holes should be barely-there dimples.

- [ ] **Step 1: Write the page frame**

`.stage`, `.title`, `.button`, `.button--quiet`, `.status` and `.hint` all come from `shared/styles/frame.css`, linked in the markup above. This file declares only the box colours.

Create `lite-brite/styles/base.css`:

```css
:root {
  --box: #d4342c;
  --box-hi: #ea5b4c;
  --box-lo: #9a231d;
  --paper: #0a0a0c;
}
```

- [ ] **Step 2: Write the board**

Create `lite-brite/styles/board.css`:

```css
.box {
  width: 100%;
  max-width: 620px;
  padding: clamp(0.9rem, 3vw, 1.4rem);
  border-radius: 1rem;
  background: linear-gradient(158deg, var(--box-hi), var(--box) 42%, var(--box-lo));
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.3),
    0 20px 40px rgba(0, 0, 0, 0.5);
}

.board {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: clamp(0.5rem, 2vw, 0.9rem);
  border-radius: 0.35rem;
  background: var(--paper);
  box-shadow: inset 0 3px 12px rgba(0, 0, 0, 0.9);
  touch-action: none;
}

.pegrow {
  display: flex;
  gap: 1px;
  justify-content: center;
}

/* Alternate rows sit half a hole over, as on the real board. Each hole is
   1/COLS of the row, so half a hole is half of that. */
.pegrow--offset {
  transform: translateX(calc(50% / var(--cols)));
}

.hole {
  flex: 1 1 0;
  aspect-ratio: 1;
  min-width: 0;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  background: #17171a;
  box-shadow: inset 0 1px 1.5px rgba(0, 0, 0, 0.9);
  transition: box-shadow 0.09s ease, background 0.09s ease;
}

.hole:hover {
  background: #232327;
}

.hole--lit {
  background: var(--peg);
  box-shadow:
    0 0 4px var(--peg),
    0 0 10px var(--peg),
    inset 0 -1px 2px rgba(255, 255, 255, 0.55);
}

/* ---------- Palette ---------- */

.palette {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.swatch {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: var(--peg);
  cursor: pointer;
  box-shadow: 0 0 8px var(--peg);
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.swatch:hover { transform: translateY(-2px); }

.swatch[aria-pressed='true'] {
  border-color: #fff;
  transform: translateY(-3px) scale(1.08);
}

.swatch--eraser {
  background: transparent;
  box-shadow: none;
  color: var(--ink-dim, rgba(236, 232, 224, 0.7));
  font-size: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .hole, .swatch { transition: none; }
}
```

- [ ] **Step 3: Verify in the browser**

Run `python3 -m http.server 8138`, open `http://localhost:8138/lite-brite/`, hard-reload.

Check each of these:
1. Click a hole — a glowing peg appears and clicks.
2. Hold and drag across several holes — they fill continuously.
3. Release outside the board, then move the pointer back over it — it does *not* keep painting.
4. Pick the eraser and drag over pegs — they go out.
5. Place a few pegs, then copy the address bar, open it in a new tab — the same picture loads.
6. **Clear board** empties it and the URL shortens.
7. Tab to a hole and press Enter — a peg appears.
8. Console shows no errors.

- [ ] **Step 4: Commit**

```bash
git add lite-brite/styles/
git commit -m "feat: Lite-Brite board styling and glow"
```

---

### Task 6: Put it on the shelf

**Files:**
- Modify: `shared/data/toys.js`, `styles/gallery.css`, `README.md`

- [ ] **Step 1: Add the manifest entry**

Append to `TOYS` in `shared/data/toys.js`:

```js
  {
    slug: 'lite-brite',
    title: 'Lite-Brite',
    year: '1967',
    blurb:
      'Eight colours of glowing peg on a black field. Your picture lives in the URL, so you can send it to someone.',
    tech: 'Run-length codec · drag-to-paint · CSS bloom',
    thumb: 'brite',
    parts: ['thumb__brite-paper'],
  },
```

- [ ] **Step 2: Add the thumbnail**

Append to `styles/gallery.css`:

```css
/* Lite-Brite: glowing dots on black. */
.thumb--brite {
  background: linear-gradient(165deg, #2a2b2f, #141518);
  display: grid;
  place-items: center;
}

.thumb--brite::before {
  content: '';
  position: absolute;
  width: 150px;
  height: 126px;
  border-radius: 9px;
  background: linear-gradient(158deg, #ea5b4c, #d4342c 42%, #9a231d);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.45);
}

.thumb__brite-paper {
  position: absolute;
  z-index: 1;
  width: 126px;
  height: 100px;
  border-radius: 3px;
  background: #0a0a0c;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}

/* A scatter of lit pegs. */
.thumb__brite-paper::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle 3px at 22% 30%, #ff2f45 60%, transparent 62%),
    radial-gradient(circle 3px at 40% 24%, #ffe23d 60%, transparent 62%),
    radial-gradient(circle 3px at 58% 34%, #41e05a 60%, transparent 62%),
    radial-gradient(circle 3px at 74% 28%, #2f9dff 60%, transparent 62%),
    radial-gradient(circle 3px at 30% 58%, #a45cff 60%, transparent 62%),
    radial-gradient(circle 3px at 48% 66%, #ff6ec7 60%, transparent 62%),
    radial-gradient(circle 3px at 66% 58%, #ff8a1e 60%, transparent 62%),
    radial-gradient(circle 3px at 82% 68%, #fdfbf0 60%, transparent 62%);
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.35));
}
```

- [ ] **Step 3: Document it**

Add to `README.md`:

```markdown
## Lite-Brite (`/lite-brite/`)

Eight colours of peg on a black field, 28 × 22 holes with staggered rows.

The picture is a flat `Uint8Array`, which makes sharing it a pure encoding
problem: `codec.js` run-length encodes the board into the URL hash, so a link
carries the whole drawing with no storage behind it. `test/lite-brite.test.js`
holds the codec to a strict round-trip property, and to degrading gracefully on
a mangled link rather than throwing.
```

- [ ] **Step 4: Verify and commit**

Run: `npm test`
Expected: PASS.

Open the gallery, confirm the Lite-Brite card appears and links correctly.

```bash
git add -A
git commit -m "feat: add Lite-Brite to the gallery"
```

---

## Done when

- `npm test` passes, including 14 board/codec specs with a strict round-trip property.
- Dragging fills holes; releasing outside the board ends the stroke.
- A copied URL reopens the same picture in a fresh tab.
- A mangled hash renders what it can instead of throwing.
