# Etch A Sketch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two knobs driving one unbroken line across an aluminium-powder screen, with a shake to erase.

**Architecture:** The stylus is a pure model that owns position, clamping and segment emission — it never touches the canvas. Knob rotation is pure angle maths converted into stylus steps. The canvas layer only draws segments it is handed, and the erase is a CSS/canvas wipe. The defining constraint of the toy — the line can never lift — falls out of the model emitting a `from`→`to` segment for every move.

**Tech Stack:** Vanilla ES modules, 2D canvas, Web Audio via `shared/audio/synth.js`. Node 22 `node:test`.

## Global Constraints

- **Prerequisite:** `2026-07-23-shared-foundations.md` must be complete — this plan imports `shared/audio/synth.js`, `shared/audio/context.js` and `shared/styles/tokens.css`.
- **Zero npm dependencies. No build step. Relative paths only.**
- **Pure logic must not touch `window` or `document` at module scope.**
- **The line never lifts.** There is no "pen up" state; every knob movement draws.
- The page links `../shared/styles/tokens.css` first and `../shared/styles/backlink.css` last, and carries the back-link anchor.

- **Never run `git add -A` or `git commit -a`.** Stage only the files your task touches, by explicit path. A concurrent session edits this repo, and a blanket stage sweeps that unrelated work into your commit.

## File Structure

| File | Responsibility |
| --- | --- |
| `etch-a-sketch/src/model/stylus.js` | Position, clamping, segment emission. Pure. |
| `etch-a-sketch/src/model/knob.js` | Pointer angle → rotation delta → stylus steps. Pure. |
| `etch-a-sketch/src/ui/screen.js` | Canvas: draw segments, shake-wipe, resize. |
| `etch-a-sketch/src/ui/knobs.js` | The two physical knobs; emits rotation deltas. |
| `etch-a-sketch/src/audio/scratch.js` | The stylus scrape while drawing. |
| `etch-a-sketch/src/main.js` | Wiring. |
| `etch-a-sketch/styles/base.css`, `frame.css` | Page frame, red shell, screen, knobs. |
| `etch-a-sketch/index.html` | Markup. |
| `test/etch.test.js` | Specs for `stylus.js` and `knob.js`. |

---

### Task 1: Stylus and knob maths, test-first

**Files:**
- Create: `etch-a-sketch/src/model/stylus.js`
- Create: `etch-a-sketch/src/model/knob.js`
- Create: `test/etch.test.js`

**Interfaces:**
- Produces from `stylus.js`: `createStylus({ width, height, x, y })` → `{ move(dx, dy) → { from: {x,y}, to: {x,y} }, position() → {x,y}, reset() }`
- Produces from `knob.js`: `angleAt(cx, cy, x, y)` → degrees 0–360; `rotationDelta(previous, current)` → signed degrees in −180…180; `stepsFor(deltaDegrees, { pixelsPerTurn })` → signed pixels.
- Consumed by: `etch-a-sketch/src/main.js`.

- [ ] **Step 1: Write the failing test**

Create `test/etch.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStylus } from '../etch-a-sketch/src/model/stylus.js';
import { angleAt, rotationDelta, stepsFor } from '../etch-a-sketch/src/model/knob.js';

test('the stylus starts where it is told', () => {
  const stylus = createStylus({ width: 100, height: 80, x: 10, y: 20 });
  assert.deepEqual(stylus.position(), { x: 10, y: 20 });
});

test('a move emits the segment it just drew', () => {
  const stylus = createStylus({ width: 100, height: 80, x: 10, y: 10 });
  const segment = stylus.move(5, 3);
  assert.deepEqual(segment, { from: { x: 10, y: 10 }, to: { x: 15, y: 13 } });
});

test('the stylus cannot leave the left or top edge', () => {
  const stylus = createStylus({ width: 100, height: 80, x: 2, y: 2 });
  const segment = stylus.move(-50, -50);
  assert.deepEqual(segment.to, { x: 0, y: 0 });
});

test('the stylus cannot leave the right or bottom edge', () => {
  const stylus = createStylus({ width: 100, height: 80, x: 98, y: 78 });
  const segment = stylus.move(50, 50);
  assert.deepEqual(segment.to, { x: 100, y: 80 });
});

test('a move that changes nothing still reports a zero-length segment', () => {
  const stylus = createStylus({ width: 100, height: 80, x: 0, y: 0 });
  const segment = stylus.move(-10, -10);
  assert.deepEqual(segment, { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } });
});

test('reset returns the stylus to the centre', () => {
  const stylus = createStylus({ width: 100, height: 80, x: 90, y: 70 });
  stylus.reset();
  assert.deepEqual(stylus.position(), { x: 50, y: 40 });
});

test('angleAt measures clockwise from twelve o clock', () => {
  assert.equal(Math.round(angleAt(0, 0, 0, -10)), 0);
  assert.equal(Math.round(angleAt(0, 0, 10, 0)), 90);
  assert.equal(Math.round(angleAt(0, 0, 0, 10)), 180);
  assert.equal(Math.round(angleAt(0, 0, -10, 0)), 270);
});

test('rotationDelta takes the short way round', () => {
  assert.equal(rotationDelta(10, 20), 10);
  assert.equal(rotationDelta(20, 10), -10);
});

test('rotationDelta wraps across the zero crossing instead of spinning back', () => {
  assert.equal(rotationDelta(350, 10), 20);
  assert.equal(rotationDelta(10, 350), -20);
});

test('a full turn of the knob moves the stylus by pixelsPerTurn', () => {
  assert.equal(stepsFor(360, { pixelsPerTurn: 240 }), 240);
  assert.equal(stepsFor(-180, { pixelsPerTurn: 240 }), -120);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../etch-a-sketch/src/model/stylus.js'`.

- [ ] **Step 3: Write the stylus**

Create `etch-a-sketch/src/model/stylus.js`:

```js
/**
 * The stylus: a point that can be nudged but never lifted.
 *
 * Every move returns the segment it travelled, which is what makes the
 * unbroken-line constraint structural rather than something the drawing layer
 * has to remember.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const createStylus = ({ width, height, x = width / 2, y = height / 2 }) => {
  let position = { x: clamp(x, 0, width), y: clamp(y, 0, height) };

  const move = (dx, dy) => {
    const from = position;
    const to = {
      x: clamp(position.x + dx, 0, width),
      y: clamp(position.y + dy, 0, height),
    };
    position = to;
    return { from, to };
  };

  return {
    move,
    position: () => ({ ...position }),
    reset: () => {
      position = { x: width / 2, y: height / 2 };
    },
  };
};
```

- [ ] **Step 4: Write the knob maths**

Create `etch-a-sketch/src/model/knob.js`:

```js
/**
 * Turning a knob is an angle problem, not a drag problem: what matters is how
 * far around the pointer travelled, including across the 359°→0° seam.
 */

/** Degrees clockwise from twelve o'clock, 0–360. */
export const angleAt = (cx, cy, x, y) => {
  const degrees = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
  return (degrees + 360) % 360;
};

/**
 * Signed change between two angles, always the short way round, so a knob
 * crossing zero does not read as a near-full turn backwards.
 */
export const rotationDelta = (previous, current) => {
  let delta = ((current - previous + 540) % 360) - 180;
  // -180 and 180 are the same rotation; normalise to the positive one.
  if (delta === -180) delta = 180;
  return delta;
};

/** How far the stylus travels for a given rotation. */
export const stepsFor = (deltaDegrees, { pixelsPerTurn = 240 }) =>
  (deltaDegrees / 360) * pixelsPerTurn;
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 10 Etch assertions green, `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add etch-a-sketch/src/model test/etch.test.js
git commit -m "feat: Etch A Sketch stylus and knob maths"
```

---

### Task 2: The screen

**Files:**
- Create: `etch-a-sketch/src/ui/screen.js`

**Interfaces:**
- Produces: `createScreen(canvas, { width, height })` → `{ drawSegment(segment), shake(): Promise<void>, dimensions() → {width, height} }`.

The screen draws in aluminium grey on the classic silver field. Erasing is not `clearRect` — a real shake redistributes powder, so the wipe fades rather than blinking off.

- [ ] **Step 1: Write the module**

Create `etch-a-sketch/src/ui/screen.js`:

```js
/**
 * The aluminium-powder screen. Segments are stroked immediately; the shake
 * fades the field back rather than clearing it in one frame, because powder
 * settles.
 */
const LINE = '#4b4f52';
const FIELD = '#c8c9c3';

export const createScreen = (canvas, { width, height }) => {
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.aspectRatio = `${width} / ${height}`;
  ctx.scale(ratio, ratio);

  const fill = () => {
    ctx.fillStyle = FIELD;
    ctx.fillRect(0, 0, width, height);
  };

  fill();
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = LINE;

  const drawSegment = ({ from, to }) => {
    if (from.x === to.x && from.y === to.y) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  /** Fades the drawing away over ~12 frames, the way powder resettles. */
  const shake = () =>
    new Promise((resolve) => {
      let frames = 0;
      const step = () => {
        ctx.fillStyle = 'rgba(200, 201, 195, 0.22)';
        ctx.fillRect(0, 0, width, height);
        frames += 1;
        if (frames < 14) {
          requestAnimationFrame(step);
          return;
        }
        fill();
        resolve();
      };
      requestAnimationFrame(step);
    });

  return { drawSegment, shake, dimensions: () => ({ width, height }) };
};
```

- [ ] **Step 2: Commit**

```bash
git add etch-a-sketch/src/ui/screen.js
git commit -m "feat: Etch A Sketch canvas screen"
```

---

### Task 3: The knobs

**Files:**
- Create: `etch-a-sketch/src/ui/knobs.js`

**Interfaces:**
- Consumes: `angleAt`, `rotationDelta`, `stepsFor` from `../model/knob.js`.
- Produces: `createKnob(element, { pixelsPerTurn, onTurn })` → `{ element }`. `onTurn` receives signed pixels.

Both pointer drag *and* arrow keys drive the knob, so it is usable without a mouse.

- [ ] **Step 1: Write the module**

Create `etch-a-sketch/src/ui/knobs.js`:

```js
/**
 * A knob you grab and turn. Rotation is measured from the knob's centre, so
 * the gesture works wherever on the knob you grab it.
 */
import { angleAt, rotationDelta, stepsFor } from '../model/knob.js';

const KEY_STEP = 6;

export const createKnob = (element, { pixelsPerTurn = 240, onTurn }) => {
  let turning = false;
  let lastAngle = 0;
  let rotation = 0;

  const centre = () => {
    const box = element.getBoundingClientRect();
    return { cx: box.left + box.width / 2, cy: box.top + box.height / 2 };
  };

  const render = () => {
    element.style.transform = `rotate(${rotation}deg)`;
  };

  element.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    element.setPointerCapture?.(event.pointerId);
    const { cx, cy } = centre();
    lastAngle = angleAt(cx, cy, event.clientX, event.clientY);
    turning = true;
    element.classList.add('knob--turning');
  });

  element.addEventListener('pointermove', (event) => {
    if (!turning) return;
    const { cx, cy } = centre();
    const angle = angleAt(cx, cy, event.clientX, event.clientY);
    const delta = rotationDelta(lastAngle, angle);
    lastAngle = angle;
    rotation += delta;
    render();
    onTurn(stepsFor(delta, { pixelsPerTurn }));
  });

  const release = () => {
    turning = false;
    element.classList.remove('knob--turning');
  };
  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);

  // Arrow keys turn the knob too, so the toy works without a pointer.
  element.addEventListener('keydown', (event) => {
    const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!direction) return;
    event.preventDefault();
    rotation += direction * KEY_STEP;
    render();
    onTurn(stepsFor(direction * KEY_STEP, { pixelsPerTurn }));
  });

  return { element };
};
```

- [ ] **Step 2: Commit**

```bash
git add etch-a-sketch/src/ui/knobs.js
git commit -m "feat: Etch A Sketch knobs"
```

---

### Task 4: The scrape

**Files:**
- Create: `etch-a-sketch/src/audio/scratch.js`

**Interfaces:**
- Consumes: `getAudio`, `getMaster` from `shared/audio/context.js`.
- Produces: `scrape(intensity)` — call on every move; internally rate-limited. `shakeNoise()` → `Promise<void>`.

- [ ] **Step 1: Write the module**

Create `etch-a-sketch/src/audio/scratch.js`:

```js
/**
 * The gritty scrape of the stylus and the rattle of a shake. Both are filtered
 * noise; the scrape is rate-limited because move events arrive far faster than
 * a listenable grain.
 */
import { getAudio, getMaster } from '../../../shared/audio/context.js';
import { noise } from '../../../shared/audio/synth.js';

const MIN_GAP_MS = 55;
let lastAt = 0;

/** `intensity` is pixels travelled since the last call. */
export const scrape = (intensity) => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return;

  const now = ctx.currentTime * 1000;
  if (now - lastAt < MIN_GAP_MS) return;
  lastAt = now;

  const strength = Math.min(1, Math.abs(intensity) / 8);
  if (strength < 0.08) return;

  noise(ctx, out, ctx.currentTime + 0.005, {
    filter: 'bandpass',
    cutoff: [[0, 2200 + strength * 1400]],
    q: 1.4,
    playbackRate: 1.2,
    envelope: { peak: 0.05 + strength * 0.07, attack: 0.004, hold: 0.03, release: 0.05 },
  });
};

/** A longer wash for the shake. */
export const shakeNoise = async () => {
  const ctx = getAudio();
  const out = getMaster();
  if (!ctx || !out) return;

  noise(ctx, out, ctx.currentTime + 0.01, {
    filter: 'bandpass',
    cutoff: [[0, 1400], [0.5, 2600], [0.9, 1100]],
    q: 0.9,
    playbackRate: 0.8,
    envelope: { peak: 0.22, attack: 0.02, hold: 0.6, release: 0.25 },
  });
  await new Promise((resolve) => setTimeout(resolve, 900));
};
```

- [ ] **Step 2: Commit**

```bash
git add etch-a-sketch/src/audio/scratch.js
git commit -m "feat: Etch A Sketch stylus scrape"
```

---

### Task 5: Wire it together

**Files:**
- Create: `etch-a-sketch/index.html`
- Create: `etch-a-sketch/src/main.js`

- [ ] **Step 1: Write the markup**

Create `etch-a-sketch/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Etch A Sketch</title>
    <meta name="description" content="A browser tribute to the 1960 drawing toy." />
    <link rel="stylesheet" href="../shared/styles/tokens.css" />
    <link rel="stylesheet" href="../shared/styles/frame.css" />
    <link rel="stylesheet" href="styles/base.css" />
    <link rel="stylesheet" href="styles/frame.css" />
    <link rel="stylesheet" href="../shared/styles/backlink.css" />
    <link
      rel="icon"
      href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='2' fill='%23c0392b'/><rect x='2' y='3' width='12' height='8' rx='1' fill='%23c8c9c3'/></svg>"
    />
  </head>
  <body>
    <a class="backlink" href="../">
      <span class="backlink__arrow" aria-hidden="true">←</span> All toys
    </a>

    <main class="stage">
      <h1 class="title">Etch A Sketch</h1>

      <div class="frame">
        <canvas id="screen" class="screen" aria-label="Drawing screen"></canvas>
        <p class="frame__wordmark" aria-hidden="true">Etch A Sketch</p>

        <button
          id="knob-left"
          type="button"
          class="knob knob--left"
          aria-label="Left knob, moves horizontally. Use arrow keys."
        ></button>
        <button
          id="knob-right"
          type="button"
          class="knob knob--right"
          aria-label="Right knob, moves vertically. Use arrow keys."
        ></button>
      </div>

      <div class="controls">
        <button id="shake" type="button" class="button">Shake to erase</button>
      </div>

      <p class="hint">
        Left knob draws across, right knob draws up and down — and the line
        never lifts. Grab a knob and turn it, or tab to one and use the arrow keys.
      </p>
    </main>

    <script type="module" src="src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Write the wiring**

Create `etch-a-sketch/src/main.js`:

```js
/**
 * Knobs turn → the stylus moves → the segment it travelled gets stroked.
 */
import { createStylus } from './model/stylus.js';
import { createScreen } from './ui/screen.js';
import { createKnob } from './ui/knobs.js';
import { scrape, shakeNoise } from './audio/scratch.js';
import { unlockAudio } from '../../shared/audio/context.js';

const WIDTH = 640;
const HEIGHT = 460;

const screen = createScreen(document.querySelector('#screen'), {
  width: WIDTH,
  height: HEIGHT,
});
const stylus = createStylus({ width: WIDTH, height: HEIGHT });

let unlocked = false;
const ensureUnlocked = () => {
  if (unlocked) return;
  unlocked = true;
  unlockAudio();
};

const nudge = (dx, dy) => {
  ensureUnlocked();
  const segment = stylus.move(dx, dy);
  screen.drawSegment(segment);
  scrape(Math.abs(dx) + Math.abs(dy));
};

createKnob(document.querySelector('#knob-left'), {
  pixelsPerTurn: 520,
  onTurn: (steps) => nudge(steps, 0),
});

createKnob(document.querySelector('#knob-right'), {
  pixelsPerTurn: 520,
  onTurn: (steps) => nudge(0, steps),
});

const shakeButton = document.querySelector('#shake');
shakeButton.addEventListener('click', async () => {
  ensureUnlocked();
  shakeButton.disabled = true;
  document.querySelector('.frame').classList.add('frame--shaking');
  await Promise.all([screen.shake(), shakeNoise()]);
  document.querySelector('.frame').classList.remove('frame--shaking');
  stylus.reset();
  shakeButton.disabled = false;
});
```

- [ ] **Step 3: Commit**

```bash
git add etch-a-sketch/index.html etch-a-sketch/src/main.js
git commit -m "feat: Etch A Sketch wiring"
```

---

### Task 6: The red shell

**Files:**
- Create: `etch-a-sketch/styles/base.css`
- Create: `etch-a-sketch/styles/frame.css`

- [ ] **Step 1: Write the page frame**

`.stage`, `.title`, `.button` and `.hint` come from `shared/styles/frame.css`, linked in the markup above. This file declares only the shell colours.

Create `etch-a-sketch/styles/base.css`:

```css
:root {
  --shell: #c0392b;
  --shell-hi: #e05a4a;
  --shell-lo: #8e2820;
  --screen-field: #c8c9c3;
  --knob: #f0ece3;
  --knob-lo: #b8b3a6;
}
```

- [ ] **Step 2: Write the frame**

Create `etch-a-sketch/styles/frame.css`:

```css
.frame {
  position: relative;
  width: 100%;
  max-width: 560px;
  padding: clamp(1.1rem, 4vw, 1.8rem) clamp(1rem, 3.5vw, 1.5rem) clamp(4.5rem, 14vw, 6rem);
  border-radius: 1.4rem;
  background: linear-gradient(158deg, var(--shell-hi), var(--shell) 42%, var(--shell-lo));
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.35),
    inset 0 -8px 18px rgba(0, 0, 0, 0.28),
    0 22px 42px rgba(0, 0, 0, 0.5);
}

.screen {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 0.35rem;
  background: var(--screen-field);
  box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.45);
  touch-action: none;
}

.frame__wordmark {
  margin: 0.7rem 0 0;
  text-align: center;
  font-size: clamp(1rem, 4vw, 1.5rem);
  font-weight: 800;
  font-style: italic;
  letter-spacing: 0.02em;
  color: #f7efe0;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
}

.knob {
  position: absolute;
  bottom: clamp(0.9rem, 3vw, 1.4rem);
  width: clamp(52px, 14vw, 74px);
  aspect-ratio: 1;
  border: none;
  border-radius: 50%;
  cursor: grab;
  touch-action: none;
  background:
    radial-gradient(circle at 38% 32%, #fff, var(--knob) 42%, var(--knob-lo));
  box-shadow:
    0 3px 0 #8a8578,
    0 8px 16px rgba(0, 0, 0, 0.4),
    inset 0 -3px 6px rgba(0, 0, 0, 0.18);
}

/* The grip notch, so rotation is actually visible. */
.knob::after {
  content: '';
  position: absolute;
  top: 8%;
  left: 50%;
  translate: -50% 0;
  width: 10%;
  height: 26%;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.35);
}

.knob--left { left: clamp(0.9rem, 3vw, 1.4rem); }
.knob--right { right: clamp(0.9rem, 3vw, 1.4rem); }
.knob--turning { cursor: grabbing; }

@keyframes frame-shake {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  20% { transform: translate(-6px, 3px) rotate(-1.1deg); }
  40% { transform: translate(5px, -4px) rotate(0.9deg); }
  60% { transform: translate(-4px, -2px) rotate(-0.7deg); }
  80% { transform: translate(4px, 3px) rotate(0.6deg); }
}

.frame--shaking {
  animation: frame-shake 0.42s ease-in-out 2;
}

@media (prefers-reduced-motion: reduce) {
  .frame--shaking { animation: none; }
}
```

- [ ] **Step 3: Verify in the browser**

Run `python3 -m http.server 8138`, open `http://localhost:8138/etch-a-sketch/`, hard-reload.

Check each of these:
1. Drag the left knob — a horizontal line draws and the knob visibly rotates.
2. Drag the right knob — the line continues vertically from where it stopped, with no gap.
3. Turn a knob hard against an edge — the line stops at the border and does not wrap or escape.
4. Cross the knob's twelve-o'clock position mid-drag — the line keeps going the same direction and does not jump backwards.
5. Tab to a knob, hold an arrow key — it draws.
6. Press **Shake to erase** — the frame shakes, the drawing fades out, the stylus recentres.
7. Console shows no errors.

- [ ] **Step 4: Commit**

```bash
git add etch-a-sketch/styles/
git commit -m "feat: Etch A Sketch shell and knobs styling"
```

---

### Task 7: Put it on the shelf

**Files:**
- Modify: `shared/data/toys.js`, `styles/gallery.css`, `README.md`

- [ ] **Step 1: Add the manifest entry**

Append to `TOYS` in `shared/data/toys.js`:

```js
  {
    slug: 'etch-a-sketch',
    title: 'Etch A Sketch',
    year: '1960',
    blurb:
      'Two knobs, one line, and no way to lift the pen. Shake the whole thing to start over.',
    tech: 'Canvas · knob rotation maths · powder-settle erase',
    thumb: 'etch',
    parts: ['thumb__etch-screen', 'thumb__etch-knob thumb__etch-knob--left', 'thumb__etch-knob thumb__etch-knob--right'],
  },
```

- [ ] **Step 2: Add the thumbnail**

Append to `styles/gallery.css`:

```css
/* Etch A Sketch: red slab, grey screen, two knobs. */
.thumb--etch {
  background: linear-gradient(165deg, #2a2b2f, #17181b);
  display: grid;
  place-items: center;
}

.thumb--etch::before {
  content: '';
  position: absolute;
  width: 148px;
  height: 122px;
  border-radius: 10px;
  background: linear-gradient(158deg, #e05a4a, #c0392b 42%, #8e2820);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.45);
}

.thumb__etch-screen {
  position: absolute;
  z-index: 1;
  width: 122px;
  height: 74px;
  border-radius: 3px;
  transform: translateY(-14px);
  background: #c8c9c3;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
}

/* A scribble, so the thumbnail reads as a drawing toy. */
.thumb__etch-screen::after {
  content: '';
  position: absolute;
  inset: 12px 14px;
  background:
    linear-gradient(90deg, transparent 0 8px, #4b4f52 8px 10px, transparent 10px 100%),
    linear-gradient(180deg, transparent 0 18px, #4b4f52 18px 20px, transparent 20px 100%);
}

.thumb__etch-knob {
  position: absolute;
  z-index: 1;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  transform: translateY(44px);
  background: radial-gradient(circle at 38% 32%, #fff, #f0ece3 42%, #b8b3a6);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.45);
}

.thumb__etch-knob--left { margin-right: 108px; }
.thumb__etch-knob--right { margin-left: 108px; }
```

- [ ] **Step 3: Document it**

Add to `README.md`:

```markdown
## Etch A Sketch (`/etch-a-sketch/`)

Two knobs, one continuous line, shake to erase.

The unbroken-line rule is structural, not enforced: `stylus.js` returns the
segment it just travelled on every move, so there is no pen-up state to get
wrong. Knob turning is angle maths rather than drag maths — `rotationDelta`
takes the short way round, so crossing twelve o'clock mid-turn doesn't send the
line flying backwards. Both are pure and covered by `test/etch.test.js`.
```

- [ ] **Step 4: Verify and commit**

Run: `npm test`
Expected: PASS.

Open the gallery, confirm the Etch card appears and links correctly.

```bash
git add -A
git commit -m "feat: add Etch A Sketch to the gallery"
```

---

## Done when

- `npm test` passes, including 10 stylus/knob specs.
- Drawing works from both knobs and joins without gaps when you switch knobs.
- The stylus clamps at all four edges.
- Crossing the knob's zero angle does not reverse the line.
- Shake erases and recentres.
