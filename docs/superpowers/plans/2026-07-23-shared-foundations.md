# Shared Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the code that the next four toys would otherwise duplicate into `shared/`, and stand up a zero-dependency test harness so that logic can be built test-first.

**Architecture:** The repo currently has three self-contained toys with a thin `shared/audio/` layer. Four more toys are coming; three of them need a segment display, a keypad, or beeps that already exist inside `speak-and-spell/`. This plan moves those into `shared/`, generalising each one just enough for a second caller, and adds a manifest so the gallery stops being hand-edited. It also introduces `node --test` for pure-logic modules.

**Tech Stack:** Vanilla ES modules, SVG, Web Audio, CSS custom properties. Node 22's built-in test runner (`node:test`, `node:assert`). No npm dependencies.

## Global Constraints

- **Zero npm dependencies.** A `package.json` is added for `"type": "module"` and a test script only. The `dependencies` and `devDependencies` fields must not exist.
- **No build step.** Browsers load the ES modules directly; nothing is compiled or bundled.
- **Relative paths only.** GitHub Pages serves this project from `/retro/`. Any path beginning with `/` breaks in production.
- **Pure-logic modules must not touch `window` or `document` at module scope.** Node cannot import them otherwise. DOM access belongs in `ui/` and `display/` modules, and only inside functions.
- **Every toy page links `../shared/styles/backlink.css` last** and carries the back-link anchor from the README.
- Existing behaviour of Speak & Spell, See 'n Say and Talkboy must not regress. Each extraction task ends by loading the affected page and confirming no console errors.

## Preflight

The working tree currently has uncommitted changes (`talkboy/` is untracked; `README.md`, `index.html`, `styles/gallery.css`, `see-n-say/index.html`, `speak-and-spell/index.html`, `shared/styles/backlink.css`, `.claude/launch.json` are modified). Commit or stash them before starting so that the moves in this plan produce reviewable diffs.

```bash
git add -A && git commit -m "feat: add Talkboy and shared back-link"
```

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json` | `"type": "module"` + `npm test`. No dependencies. |
| `test/segments.test.js` | Segment-map correctness. |
| `test/drag.test.js` | Drag classification maths. |
| `shared/display/segments.js` | 14-segment geometry + character map (moved). |
| `shared/display/display.js` | N-cell segment display with marquee scrolling (moved, parameterised). |
| `shared/audio/beeps.js` | Key clicks, correct/wrong/fanfare cues (moved). |
| `shared/ui/keypad.js` | Generic membrane keypad driven by a layout descriptor. |
| `shared/ui/drag.js` | Pointer-drag handle: clamping + tap/fire/cancel classification. |
| `shared/styles/tokens.css` | Palette and font tokens shared by every toy. |
| `shared/styles/frame.css` | Page chrome: stage, title, buttons, level picker. |
| `shared/data/toys.js` | The gallery manifest. |
| `speak-and-spell/src/ui/layout.js` | Speak & Spell's keypad layout descriptor. |
| `index.html` + `styles/gallery.css` | Gallery renders cards from the manifest. |

---

### Task 1: Test harness

**Files:**
- Create: `package.json`
- Create: `test/segments.test.js`

**Interfaces:**
- Consumes: `speak-and-spell/src/display/segments.js` (existing, still in place).
- Produces: `npm test` runs every `test/*.test.js`. Later tasks add files to `test/`.

- [ ] **Step 1: Write the failing test**

Create `test/segments.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentsFor, canRender } from '../speak-and-spell/src/display/segments.js';

test('every letter A-Z maps to at least one lit segment', () => {
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    assert.ok(segmentsFor(letter).length > 0, `${letter} lights nothing`);
  }
});

test('space renders as a blank cell', () => {
  assert.deepEqual(segmentsFor(' '), []);
});

test('canRender rejects an unmapped character', () => {
  assert.equal(canRender('%'), false);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/`
Expected: FAIL — `Cannot find package 'retro'` or an ES-module resolution error, because there is no `package.json` declaring `"type": "module"`.

- [ ] **Step 3: Add the package manifest**

Create `package.json`:

```json
{
  "name": "retro",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Browser recreations of classic electronic toys",
  "scripts": {
    "test": "node --test test/"
  }
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — `# pass 3`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add package.json test/segments.test.js
git commit -m "test: add zero-dependency node:test harness"
```

---

### Task 2: Move segments into shared, add the maths glyphs

**Files:**
- Create: `shared/display/segments.js` (moved from `speak-and-spell/src/display/segments.js`)
- Delete: `speak-and-spell/src/display/segments.js`
- Modify: `speak-and-spell/src/display/display.js:8` (import path)
- Modify: `test/segments.test.js:3` (import path)

**Interfaces:**
- Produces: `CELL_WIDTH`, `CELL_HEIGHT`, `SEGMENT_SHAPES`, `SEGMENT_ORDER`, `CHARACTER_SEGMENTS`, `canRender(char)`, `segmentsFor(char)`. Speak & Math (separate plan) consumes `segmentsFor` for digits and operators.

- [ ] **Step 1: Write the failing test**

Append to `test/segments.test.js`, and change the import on line 3 to `'../shared/display/segments.js'`:

```js
test('digits 0-9 render', () => {
  for (const digit of '0123456789') {
    assert.ok(segmentsFor(digit).length > 0, `${digit} lights nothing`);
  }
});

test('arithmetic operators render and are distinct from each other', () => {
  const ops = ['+', '-', '/', '*', '='];
  for (const op of ops) {
    assert.ok(segmentsFor(op).length > 0, `${op} lights nothing`);
  }
  const shapes = ops.map((op) => segmentsFor(op).join(','));
  assert.equal(new Set(shapes).size, ops.length, 'two operators share a glyph');
});

test('plus and equals do not collide', () => {
  assert.notDeepEqual(segmentsFor('+'), segmentsFor('='));
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../shared/display/segments.js'`.

- [ ] **Step 3: Move the file and add the operators**

```bash
mkdir -p shared/display
git mv speak-and-spell/src/display/segments.js shared/display/segments.js
```

In `shared/display/segments.js`, the `CHARACTERS` map already contains `'-': 'g1g2'` and `'*': 'g1g2hjkmil'`. Replace those two entries and add the rest so the arithmetic set is distinct:

```js
  '-': 'g1g2',
  '+': 'g1g2il',
  '=': 'dg1g2',
  '/': 'jk',
  '*': 'hjkm',
```

- [ ] **Step 4: Repoint the one existing consumer**

In `speak-and-spell/src/display/display.js`, change the import on line 8 to:

```js
import { CELL_WIDTH, CELL_HEIGHT, SEGMENT_SHAPES, SEGMENT_ORDER, segmentsFor } from '../../../shared/display/segments.js';
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — `# fail 0`.

- [ ] **Step 6: Verify Speak & Spell still runs**

Run: `python3 -m http.server 8138`, open `http://localhost:8138/speak-and-spell/`, hard-reload, click **ON**.
Expected: the display scrolls `SPEAK AND SPELL`, then asks you to spell a word. Browser console shows no errors.

> Module caching bites here. If a change appears not to have taken, hard-reload with a cache-busting query (`?v=2`) before concluding the code is wrong.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move segment map to shared, add arithmetic glyphs"
```

---

### Task 3: Move the segment display into shared and parameterise cell count

**Files:**
- Create: `shared/display/display.js` (moved from `speak-and-spell/src/display/display.js`)
- Delete: `speak-and-spell/src/display/display.js`
- Modify: `speak-and-spell/src/main.js:5` (import path + call site)

**Interfaces:**
- Consumes: `shared/display/segments.js` from Task 2.
- Produces: `createDisplay(mount, { cells = 8 })` returning `{ show(text): Promise<void>, showTyping(text): void, clear(): void, flash(times, interval): Promise<void>, setPowered(on): void, stopScrolling(): void }`. Speak & Math consumes this with `{ cells: 8 }`.

The current module exports a fixed `CELL_COUNT = 8`. Speak & Math also wants 8, but hard-coding a module-level constant in a shared file is what forces the next fork; make it an argument now.

- [ ] **Step 1: Move the file**

```bash
git mv speak-and-spell/src/display/display.js shared/display/display.js
rmdir speak-and-spell/src/display
```

- [ ] **Step 2: Parameterise the cell count**

In `shared/display/display.js`, change the import to a sibling path and replace the module-level constant with a parameter:

```js
import { CELL_WIDTH, CELL_HEIGHT, SEGMENT_SHAPES, SEGMENT_ORDER, segmentsFor } from './segments.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
export const DEFAULT_CELLS = 8;

const CELL_GAP = 22;
const SCROLL_MS = 260;
```

Change the factory signature and replace every remaining `CELL_COUNT` in the body with `cells`:

```js
export const createDisplay = (mount, { cells = DEFAULT_CELLS } = {}) => {
  const width = cells * CELL_WIDTH + (cells - 1) * CELL_GAP;
```

The identifier `CELL_COUNT` appears in `width`, `paint`, `show`, `showTyping` and `flash`. Replace all of them.

- [ ] **Step 3: Repoint Speak & Spell**

In `speak-and-spell/src/main.js`, change the import on line 5 to:

```js
import { createDisplay } from '../../shared/display/display.js';
```

The existing call `createDisplay(document.querySelector('#vfd'))` still works — `cells` defaults to 8.

- [ ] **Step 4: Verify in the browser**

Open `http://localhost:8138/speak-and-spell/`, hard-reload, click **ON**, type a word and press **ENTER**.
Expected: eight cells render, long messages scroll, typed letters appear right-anchored. No console errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move segment display to shared, parameterise cell count"
```

---

### Task 4: Move beeps into shared

**Files:**
- Create: `shared/audio/beeps.js` (moved from `speak-and-spell/src/audio/beeps.js`)
- Delete: `speak-and-spell/src/audio/beeps.js`
- Modify: `speak-and-spell/src/main.js:8`, `speak-and-spell/src/game/console.js:6`, `speak-and-spell/src/game/machine.js:11` (import paths)

**Interfaces:**
- Produces: `keyBeep()`, `correctBeep()`, `wrongBeep()`, `powerOnBeep()`, `powerOffBeep()`, `fanfare()`, `setBeepsMuted(bool)`. Simon and Speak & Math both consume these.

- [ ] **Step 1: Move the file and fix its own imports**

```bash
git mv speak-and-spell/src/audio/beeps.js shared/audio/beeps.js
```

In `shared/audio/beeps.js`, the two imports become siblings:

```js
import { getAudio, getMaster } from './context.js';
import { tone } from './synth.js';
```

- [ ] **Step 2: Repoint the three consumers**

In `speak-and-spell/src/main.js`:

```js
import { setBeepsMuted } from '../../shared/audio/beeps.js';
```

In `speak-and-spell/src/game/console.js`:

```js
import { correctBeep, wrongBeep, fanfare } from '../../../shared/audio/beeps.js';
```

In `speak-and-spell/src/game/machine.js`:

```js
import { powerOnBeep, powerOffBeep, keyBeep } from '../../../shared/audio/beeps.js';
```

- [ ] **Step 3: Verify in the browser**

Open Speak & Spell, click **ON**, press a letter key.
Expected: power-on arpeggio, then a click on each keypress. Toggle **Sound on/off** and confirm the beeps stop.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: move beeps to shared audio"
```

---

### Task 5: Generalise the keypad

**Files:**
- Create: `shared/ui/keypad.js` (moved from `speak-and-spell/src/ui/keypad.js`)
- Create: `speak-and-spell/src/ui/layout.js`
- Delete: `speak-and-spell/src/ui/keypad.js`
- Modify: `speak-and-spell/src/main.js:6` (import + call site)

**Interfaces:**
- Produces:
  - `createKeypad(mount, { rows, onPress })` where `rows` is `Array<{ className: string, keys: Array<{ code, label, caption?, tone? }> }>`. Returns `{ flashKey(code), setDisabled(bool), keyFor(code) }`.
  - `codeForKeyboardEvent(event, { letters = true, digits = false })` returning a code string or `null`.
- Speak & Math consumes both with a digit-and-operator layout.

The current module hard-codes `FUNCTION_KEYS`, `LETTER_ROWS` and `TAIL_KEYS` — a layout, not a component. Splitting the layout out is what lets a second toy reuse it.

- [ ] **Step 1: Move the file**

```bash
mkdir -p shared/ui
git mv speak-and-spell/src/ui/keypad.js shared/ui/keypad.js
```

- [ ] **Step 2: Cut the layout out of the component**

Create `speak-and-spell/src/ui/layout.js` and move `FUNCTION_KEYS`, `LETTER_ROWS` and `TAIL_KEYS` into it verbatim from the old keypad module, then export an assembled descriptor:

```js
/**
 * Speak & Spell's keypad: a function row, then the alphabet in rows of ten
 * with punctuation and ENTER filling the last row.
 */
export const FUNCTION_KEYS = Object.freeze([
  { code: 'OFF', label: 'OFF', tone: 'blue' },
  { code: 'GO', label: 'GO', tone: 'blue' },
  { code: 'REPLAY', label: '↺', caption: 'REPLAY', tone: 'red' },
  { code: 'REPEAT', label: '"', caption: 'REPEAT', tone: 'red' },
  { code: 'CLUE', label: '—', caption: 'CLUE', tone: 'red' },
  { code: 'MYSTERY', label: '?', caption: 'MYSTERY\nWORD', tone: 'red' },
  { code: 'SECRET', label: '🔒', caption: 'SECRET\nCODE', tone: 'red' },
  { code: 'LETTER', label: '?', caption: 'LETTER', tone: 'red' },
  { code: 'SAYIT', label: '☺', caption: 'SAY\nIT', tone: 'red' },
  { code: 'SPELL', label: '▤', caption: 'SPELL', tone: 'red' },
  { code: 'ON', label: 'ON', tone: 'blue' },
]);

const LETTER_ROWS = Object.freeze([
  'ABCDEFGHIJ'.split(''),
  'KLMNOPQRST'.split(''),
  'UVWXYZ'.split(''),
]);

const TAIL_KEYS = Object.freeze([
  { code: '-', label: '-', tone: 'yellow' },
  { code: "'", label: "'", caption: 'VOLUME', tone: 'yellow' },
  { code: 'ERASE', label: '#', caption: 'ERASE', tone: 'yellow' },
  { code: 'ENTER', label: '↑', caption: 'ENTER', tone: 'yellow' },
]);

export const SPEAK_AND_SPELL_ROWS = Object.freeze([
  { className: 'keyrow--function', keys: FUNCTION_KEYS },
  ...LETTER_ROWS.map((letters, index) => ({
    className: `keyrow--letters keyrow--letters-${index + 1}`,
    keys:
      index === 2
        ? [...letters.map((l) => ({ code: l, label: l })), ...TAIL_KEYS]
        : letters.map((l) => ({ code: l, label: l })),
  })),
]);
```

- [ ] **Step 3: Rewrite the shared keypad to consume a descriptor**

Replace the body of `shared/ui/keypad.js` with:

```js
/**
 * A membrane keypad rendered from a layout descriptor. The layout lives with
 * the toy that owns it; this module only knows how to draw and wire keys.
 */

const makeKey = ({ code, label, caption, tone }, onPress) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `key key--${tone ?? 'letter'}`;
  button.dataset.code = code;
  button.setAttribute('aria-label', (caption ?? label ?? code).replace('\n', ' '));

  if (caption) {
    const cap = document.createElement('span');
    cap.className = 'key__caption';
    cap.textContent = caption;
    button.append(cap);
  }

  const glyph = document.createElement('span');
  glyph.className = 'key__glyph';
  glyph.textContent = label;
  button.append(glyph);

  button.addEventListener('click', () => onPress(code));
  return button;
};

/**
 * @param {HTMLElement} mount
 * @param {{rows: Array<{className: string, keys: Array}>, onPress: (code: string) => void}} options
 */
export const createKeypad = (mount, { rows, onPress }) => {
  const keysByCode = new Map();

  rows.forEach((row) => {
    const element = document.createElement('div');
    element.className = `keyrow ${row.className}`;
    row.keys.forEach((spec) => {
      const key = makeKey(spec, onPress);
      element.append(key);
      keysByCode.set(spec.code, key);
    });
    mount.append(element);
  });

  const flashKey = (code) => {
    const key = keysByCode.get(code);
    if (!key) return;
    key.classList.add('key--pressed');
    setTimeout(() => key.classList.remove('key--pressed'), 130);
  };

  // 'ON' stays live even when the rest of the board is disabled, otherwise
  // there is no way to wake the toy up.
  const setDisabled = (disabled) => {
    keysByCode.forEach((key, code) => {
      key.disabled = disabled && code !== 'ON';
    });
  };

  const keyFor = (code) => keysByCode.get(code) ?? null;

  return { flashKey, setDisabled, keyFor };
};

/** Maps a physical keyboard event to a keypad code, or null. */
export const codeForKeyboardEvent = (event, { letters = true, digits = false } = {}) => {
  if (event.key === 'Enter') return 'ENTER';
  if (event.key === 'Backspace' || event.key === 'Delete') return 'ERASE';
  if (letters && /^[a-zA-Z]$/.test(event.key)) return event.key.toUpperCase();
  if (digits && /^[0-9]$/.test(event.key)) return event.key;
  if (event.key === '-' || event.key === "'") return event.key;
  return null;
};
```

- [ ] **Step 4: Repoint Speak & Spell**

In `speak-and-spell/src/main.js`, replace the keypad import and call site:

```js
import { createKeypad, codeForKeyboardEvent } from '../../shared/ui/keypad.js';
import { SPEAK_AND_SPELL_ROWS } from './ui/layout.js';
```

```js
const keypad = createKeypad(document.querySelector('#keypad'), {
  rows: SPEAK_AND_SPELL_ROWS,
  onPress: handlePress,
});
```

- [ ] **Step 5: Verify in the browser**

Open Speak & Spell, hard-reload, click **ON**. Click letters with the mouse, then type on the physical keyboard.
Expected: identical behaviour to before — captions in the right places, mode key lit, letters register, Backspace erases. No console errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: make the keypad layout-driven and shared"
```

---

### Task 6: Shared drag handle

**Files:**
- Create: `shared/ui/drag.js`
- Create: `test/drag.test.js`
- Modify: `see-n-say/src/ui/cord.js` (consume the shared classifier)

**Interfaces:**
- Produces:
  - `clampOffset(start, current, { min = 0, max = Infinity })` → number
  - `classifyRelease(offset, { trigger, slop })` → `'fire' | 'tap' | 'cancel'`
  - `createDragHandle(element, { max, trigger, slop, onMove, onRelease })` → `{ setLocked(bool) }`
- Etch A Sketch (knobs) and Lite-Brite (drag-to-paint) both consume this.

The tap-versus-drag rule was a real bug in See 'n Say — a click did nothing because only a drag past 55px fired. Encoding that rule once, with tests, keeps the next two toys from reinventing it wrong.

- [ ] **Step 1: Write the failing test**

Create `test/drag.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { clampOffset, classifyRelease } from '../shared/ui/drag.js';

test('clampOffset floors at zero when dragging backwards', () => {
  assert.equal(clampOffset(100, 40, { max: 130 }), 0);
});

test('clampOffset ceils at max', () => {
  assert.equal(clampOffset(100, 400, { max: 130 }), 130);
});

test('clampOffset reports the travelled distance in range', () => {
  assert.equal(clampOffset(100, 160, { max: 130 }), 60);
});

test('a release past the trigger fires', () => {
  assert.equal(classifyRelease(90, { trigger: 55, slop: 8 }), 'fire');
});

test('a release that never moved is a tap', () => {
  assert.equal(classifyRelease(0, { trigger: 55, slop: 8 }), 'tap');
});

test('a short drag below the trigger is cancelled, not treated as a tap', () => {
  assert.equal(classifyRelease(30, { trigger: 55, slop: 8 }), 'cancel');
});

test('the slop boundary counts as a tap', () => {
  assert.equal(classifyRelease(7, { trigger: 55, slop: 8 }), 'tap');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../shared/ui/drag.js'`.

- [ ] **Step 3: Write the implementation**

Create `shared/ui/drag.js`:

```js
/**
 * Vertical pointer-drag handling, shared by the See 'n Say cord, the Etch A
 * Sketch knobs and Lite-Brite's drag-to-paint.
 *
 * The tap/fire/cancel distinction matters: people click things that look like
 * buttons, and a handle that only responds to a long drag reads as broken.
 */

/** Distance travelled from `start` to `current`, clamped into range. */
export const clampOffset = (start, current, { min = 0, max = Infinity }) =>
  Math.max(min, Math.min(max, current - start));

/**
 * What a pointer release means.
 * - `fire`   travelled past the trigger — a deliberate pull
 * - `tap`    barely moved — treat a click as a full activation
 * - `cancel` moved a little but not enough — snap back, do nothing
 */
export const classifyRelease = (offset, { trigger, slop }) => {
  if (offset >= trigger) return 'fire';
  if (offset < slop) return 'tap';
  return 'cancel';
};

/**
 * Wires pointer events on `element`. `onMove` receives the clamped offset;
 * `onRelease` receives the classification.
 */
export const createDragHandle = (
  element,
  { max = Infinity, trigger = 55, slop = 8, onMove, onRelease },
) => {
  let dragging = false;
  let start = 0;
  let offset = 0;
  let locked = false;

  element.addEventListener('pointerdown', (event) => {
    if (locked) return;
    event.preventDefault();
    element.setPointerCapture?.(event.pointerId);
    dragging = true;
    start = event.clientY;
    offset = 0;
  });

  element.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    offset = clampOffset(start, event.clientY, { max });
    onMove?.(offset);
  });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    onRelease?.(classifyRelease(offset, { trigger, slop }), offset);
    offset = 0;
  };

  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);

  return {
    setLocked: (value) => {
      locked = value;
    },
  };
};
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — `# fail 0`, 7 drag assertions green.

- [ ] **Step 5: Consume it from the See 'n Say cord**

In `see-n-say/src/ui/cord.js`, replace the hand-rolled `TAP_SLOP` / `TRIGGER_AT` comparison inside `end()` with the shared classifier. Add at the top:

```js
import { classifyRelease } from '../../../shared/ui/drag.js';
```

and replace the body of `end()` with:

```js
  const end = () => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('cord--dragging');

    const verdict = classifyRelease(offset, { trigger: TRIGGER_AT, slop: TAP_SLOP });
    if (verdict === 'fire') settle(true);
    else if (verdict === 'tap') animatedPull();
    else settle(false);
  };
```

- [ ] **Step 6: Verify the cord in the browser**

Open `http://localhost:8138/see-n-say/`, hard-reload. Click the orange ring once. Then drag it down past halfway. Then drag it only ~25px and release.
Expected: click plays a full pull; long drag plays a full pull; short drag snaps back silently. No console errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: shared drag handle with tap/fire/cancel classification"
```

---

### Task 7: Shared design tokens

**Files:**
- Create: `shared/styles/tokens.css`
- Modify: `styles/gallery.css:1-18`, `speak-and-spell/styles/base.css:1-24`, `see-n-say/styles/base.css:1-18`, `talkboy/styles/base.css` (`:root` block)
- Modify: `index.html`, `speak-and-spell/index.html`, `see-n-say/index.html`, `talkboy/index.html` (add stylesheet link)

**Interfaces:**
- Produces: `--font-display`, `--backdrop`, `--backdrop-2`, `--plastic`, `--plastic-shade`, `--plastic-deep`, `--vfd-glow`, `--vfd-dim`, `--toy-red`, `--toy-yellow`, `--toy-blue`, `--toy-green`. Every later toy consumes these instead of redeclaring them.

Only genuinely shared values move. Each toy keeps its own case colours — Talkboy's greys and Speak & Spell's moulded red are not shared vocabulary, and hoisting them would couple unrelated toys.

- [ ] **Step 1: Create the token sheet**

Create `shared/styles/tokens.css`:

```css
/**
 * Tokens every toy shares. Toy-specific case colours stay in that toy's
 * own base.css — only vocabulary used by two or more toys belongs here.
 */
:root {
  --font-display: 'Futura', 'Avenir Next', 'Century Gothic', 'Trebuchet MS', system-ui, sans-serif;

  /* Page background behind the toy. */
  --backdrop: #232427;
  --backdrop-2: #34363a;

  /* Cream ABS, used by any toy with a light shell. */
  --plastic: #f4ecd8;
  --plastic-shade: #ded2b6;
  --plastic-deep: #c4b795;

  /* Vacuum-fluorescent teal. */
  --vfd-glow: #79f7d8;
  --vfd-dim: rgba(121, 247, 216, 0.07);

  /* Primary-colour toy palette. */
  --toy-red: #d8342c;
  --toy-yellow: #f2b829;
  --toy-blue: #2f6dbc;
  --toy-green: #3d9c53;
}
```

- [ ] **Step 2: Link it first in every page**

In each of `index.html`, `speak-and-spell/index.html`, `see-n-say/index.html`, `talkboy/index.html`, add this **before** the page's own stylesheets so local `:root` values still win:

```html
    <link rel="stylesheet" href="shared/styles/tokens.css" />
```

For the toy pages the path is `../shared/styles/tokens.css`; for the root gallery it is `shared/styles/tokens.css`.

- [ ] **Step 3: Delete the now-duplicated declarations**

From each toy's `:root` block, remove only the properties now defined in `tokens.css`. Keep everything else. For example `see-n-say/styles/base.css` keeps `--ring-orange`, `--ring-orange-dark`, `--ink` and `--backdrop-glow`, and drops `--toy-red`, `--toy-yellow`, `--toy-blue`, `--toy-green`, `--plastic`, `--plastic-shade`, `--plastic-deep`, `--font-display`.

> See 'n Say overrides `--backdrop: #2a4a52` deliberately (it sits on teal, not charcoal). Keep that override.

- [ ] **Step 4: Verify all four pages**

Open each of `/`, `/speak-and-spell/`, `/see-n-say/`, `/talkboy/` and hard-reload.
Expected: no visual change anywhere. If a colour goes wrong, the token was toy-specific and belongs back in that toy's file.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: hoist shared design tokens"
```

---

### Task 8: Shared page frame

**Files:**
- Create: `shared/styles/frame.css`
- Modify: `see-n-say/styles/base.css`, `speak-and-spell/styles/base.css`, `talkboy/styles/base.css` (delete the now-shared rules)
- Modify: the three toy `index.html` files (add the stylesheet link)

**Interfaces:**
- Produces the classes every toy page uses for chrome: `.stage`, `.title`, `.caption` / `.status`, `.controls`, `.button`, `.button--quiet`, `.levels`, `.levels-wrap`, `.levels-label`, `.level`, `.hint`, `.notice`.
- Each of the four new toys links this instead of restating it.

Every toy so far has reimplemented the same centred column, title, pill readout and level picker. Four more toys are coming; this is the moment to stop copying it.

- [ ] **Step 1: Create the frame**

Create `shared/styles/frame.css`:

```css
/**
 * The furniture every toy page shares: a centred column, a title, a status
 * pill, chunky buttons and a level picker. Toy-specific chrome stays in that
 * toy's own stylesheet.
 */
body {
  font-family: var(--font-display);
  color: #ece8e0;
  margin: 0;
  min-height: 100%;
  display: flex;
  justify-content: center;
  padding: clamp(1rem, 3vw, 2.5rem) 1rem 3rem;
}

.stage {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.title {
  margin: 0;
  font-size: clamp(1.6rem, 5vw, 2.4rem);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--plastic);
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
}

.caption,
.status {
  margin: 0;
  min-height: 2.4rem;
  display: grid;
  place-items: center;
  padding: 0.6rem 1.4rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
  color: var(--plastic);
  font-size: clamp(1rem, 3vw, 1.3rem);
  font-weight: 600;
  text-align: center;
}

.controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.button {
  font: inherit;
  font-weight: 700;
  color: #2a2118;
  background: var(--toy-yellow);
  border: none;
  border-radius: 999px;
  padding: 0.7rem 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 0 #b8871a, 0 8px 16px rgba(0, 0, 0, 0.3);
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.button:hover:not(:disabled) { transform: translateY(-1px); }

.button:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #b8871a, 0 3px 8px rgba(0, 0, 0, 0.3);
}

.button:disabled { opacity: 0.55; cursor: not-allowed; }

.button--quiet {
  background: transparent;
  color: rgba(236, 232, 224, 0.8);
  border: 2px solid rgba(236, 232, 224, 0.25);
  box-shadow: none;
}

.button--quiet:hover:not(:disabled) { border-color: rgba(236, 232, 224, 0.6); }

.levels-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.levels { display: flex; gap: 0.35rem; }

.levels-label {
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(236, 232, 224, 0.65);
}

.level {
  font: inherit;
  font-weight: 700;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 0.45rem;
  border: 2px solid rgba(236, 232, 224, 0.25);
  background: transparent;
  color: rgba(236, 232, 224, 0.8);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.level:hover { border-color: rgba(236, 232, 224, 0.6); }

.level[aria-pressed='true'] {
  background: var(--toy-yellow);
  border-color: var(--toy-yellow);
  color: #2a2118;
}

.hint,
.notice {
  margin: 0;
  max-width: 44ch;
  text-align: center;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(236, 232, 224, 0.7);
}

.notice { color: var(--toy-yellow); }

:focus-visible {
  outline: 3px solid var(--vfd-glow);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Link it in the three existing toys**

In `see-n-say/index.html`, `speak-and-spell/index.html` and `talkboy/index.html`, add after the tokens link and before the toy's own stylesheets:

```html
    <link rel="stylesheet" href="../shared/styles/frame.css" />
```

- [ ] **Step 3: Delete the duplicated rules**

From each toy's `base.css`, remove the rule blocks now provided by the frame: `body`, `.stage`, `.title`, `.caption`, `.controls`, `.button`, `.levels*`, `.level`, `.hint`, `.notice`, `:focus-visible` and the reduced-motion block. Keep each toy's `:root` and anything toy-specific.

> See 'n Say sets `--backdrop: #2a4a52` and its own `--font-display`; those live in its `:root` and still win because its stylesheet is linked after the frame.

- [ ] **Step 4: Verify all three pages**

Open `/see-n-say/`, `/speak-and-spell/` and `/talkboy/`, hard-reloading each.
Expected: no visual change. Buttons, titles, captions and level pickers look exactly as before. If something shifts, that rule was toy-specific — put it back in the toy's stylesheet.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: hoist the shared page frame"
```

---

### Task 9: Gallery manifest

**Files:**
- Create: `shared/data/toys.js`
- Modify: `index.html` (cards become a mount point)
- Create: `src/gallery.js`
- Modify: `styles/gallery.css` (no change needed if class names are preserved)

**Interfaces:**
- Produces: `TOYS` — `Array<{ slug, title, year, blurb, tech, thumb }>` where `thumb` is the CSS modifier suffix (`'sns'`, `'wheel'`, `'tape'`, …). Each later toy's plan appends one entry.

Four toys are about to be added. Hand-editing the gallery markup four more times is four chances to forget one.

- [ ] **Step 1: Create the manifest**

Create `shared/data/toys.js`:

```js
/**
 * The gallery shelf. Adding a toy means adding an entry here and a
 * `.thumb--<thumb>` rule in styles/gallery.css — nothing else.
 */
export const TOYS = Object.freeze([
  {
    slug: 'speak-and-spell',
    title: 'Speak & Spell',
    year: '1978',
    blurb:
      'Ten words, two tries each, and it recites the correct spelling letter by letter when you miss. Plus Mystery Word, Letter and Secret Code.',
    tech: 'SVG 14-segment VFD · speech synthesis · 4 difficulty levels',
    thumb: 'sns',
    parts: ['thumb__handle', 'thumb__screen', 'thumb__panel'],
  },
  {
    slug: 'see-n-say',
    title: "See 'n Say",
    year: '1965',
    blurb:
      'Aim the arrow, pull the cord, and the farmer tells you what the cow says. Twelve animals on a spring-loaded dial.',
    tech: 'Web Audio synthesis · zero audio files · drag-to-pull cord',
    thumb: 'wheel',
    parts: ['thumb__dial', 'thumb__pointer', 'thumb__hub'],
  },
  {
    slug: 'talkboy',
    title: 'Talkboy',
    year: '1992',
    blurb:
      'Record thirty seconds onto the tape, then flick the switch and play yourself back at half speed. The reels really spool.',
    tech: 'Live mic recording · tape-speed pitch shift · synthesized deck noise',
    thumb: 'tape',
    parts: ['thumb__shell', 'thumb__keys'],
  },
]);
```

> `parts` lists the decorative spans each thumbnail needs. `thumb--tape` nests two reels inside `thumb__shell`; keep that nesting by special-casing it in the renderer below.

- [ ] **Step 2: Write the renderer**

Create `src/gallery.js`:

```js
import { TOYS } from '../shared/data/toys.js';

const span = (className, text) => {
  const node = document.createElement('span');
  node.className = className;
  if (text) node.textContent = text;
  return node;
};

const buildThumb = (toy) => {
  const thumb = span(`thumb thumb--${toy.thumb}`);
  thumb.setAttribute('aria-hidden', 'true');

  toy.parts.forEach((part) => {
    const node = span(part);
    // The cassette shell carries the two reels.
    if (part === 'thumb__shell') {
      node.append(span('thumb__reel thumb__reel--left'));
      node.append(span('thumb__reel thumb__reel--right'));
    }
    thumb.append(node);
  });

  return thumb;
};

const buildCard = (toy) => {
  const item = document.createElement('li');
  item.className = 'card';

  const link = document.createElement('a');
  link.className = 'card__link';
  link.href = `${toy.slug}/`;

  const body = span('card__body');
  body.append(span('card__year', toy.year));
  body.append(span('card__title', toy.title));
  body.append(span('card__text', toy.blurb));
  body.append(span('card__tech', toy.tech));

  link.append(buildThumb(toy), body);
  item.append(link);
  return item;
};

const buildPlaceholder = () => {
  const item = document.createElement('li');
  item.className = 'card card--empty';
  const thumb = span('thumb thumb--empty', '?');
  thumb.setAttribute('aria-hidden', 'true');
  const body = span('card__body');
  body.append(span('card__title', 'More on the way'));
  body.append(span('card__text', 'Merlin, Big Trak, the Casio SK-1 — the shelf is not full yet.'));
  item.append(thumb, body);
  return item;
};

const shelf = document.querySelector('#shelf');
TOYS.forEach((toy) => shelf.append(buildCard(toy)));
shelf.append(buildPlaceholder());
```

- [ ] **Step 3: Reduce the gallery markup to a mount point**

In `index.html`, replace the entire `<ul class="shelf">…</ul>` block with:

```html
      <ul id="shelf" class="shelf"></ul>
```

and add before `</body>`:

```html
    <script type="module" src="src/gallery.js"></script>
```

- [ ] **Step 4: Verify the gallery**

Open `http://localhost:8138/`, hard-reload.
Expected: three cards plus the dashed placeholder, visually identical to before, thumbnails intact. Click each card and confirm it opens the right toy.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: render the gallery from a manifest"
```

---

### Task 10: Document the shared layer

**Files:**
- Modify: `README.md` (Layout and "Adding another toy" sections)

- [ ] **Step 1: Update the layout block**

Replace the `## Layout` code block in `README.md` with:

```
index.html              the gallery (rendered from shared/data/toys.js)
src/gallery.js          builds the shelf
styles/gallery.css      gallery styling; the thumbnails are pure CSS
test/                   node --test specs for pure logic
speak-and-spell/        the spelling console
see-n-say/              the pull-cord wheel
talkboy/                the cassette recorder
shared/
  audio/                AudioContext, synthesis primitives, beeps
  display/              14-segment geometry + the N-cell display
  ui/                   keypad (layout-driven), drag handle
  data/toys.js          the gallery manifest
  styles/               design tokens + the "all toys" pill
```

- [ ] **Step 2: Rewrite "Adding another toy"**

```markdown
## Adding another toy

1. Create a directory with an `index.html`.
2. Link `../shared/styles/tokens.css` first and `../shared/styles/backlink.css`
   last, and paste in the back-link anchor.
3. Import what you need from `../shared/` — don't fork it.
4. Add an entry to `shared/data/toys.js` and a `.thumb--<name>` rule in
   `styles/gallery.css`.
5. Put pure logic in modules that never touch `window` or `document`, and add
   a spec under `test/`. Run `npm test`.

Keep every path relative — GitHub Pages serves this project from a subpath, so
absolute paths starting with `/` will break.
```

- [ ] **Step 3: Run the full suite and commit**

Run: `npm test`
Expected: PASS.

```bash
git add README.md
git commit -m "docs: describe the shared layer"
```

---

## Done when

- `npm test` passes with segment and drag specs green.
- Speak & Spell, See 'n Say and Talkboy all load with no console errors and behave as before.
- `shared/` contains `audio/`, `display/`, `ui/`, `data/`, `styles/`.
- The gallery renders from the manifest.
