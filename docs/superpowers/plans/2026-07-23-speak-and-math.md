# Speak & Math Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Speak & Spell's sibling — the same red console asking arithmetic instead of spelling.

**Architecture:** Speak & Math is the second consumer of machinery that currently lives inside Speak & Spell: the turn-taking machine, the console I/O wrapper and the robot voice. This plan hoists those three into `shared/game/` and `shared/audio/` with the toy-specific parts passed in, then builds three activities on top. Problem generation is pure with an injected random source, so the arithmetic rules — exact division, no negative answers at low levels — are enforced by tests rather than by hope.

**Tech Stack:** Vanilla ES modules, the shared 14-segment display, Web Speech API, Web Audio. Node 22 `node:test`.

## Global Constraints

- **Prerequisite:** `2026-07-23-shared-foundations.md` must be complete — this plan builds on `shared/display/`, `shared/ui/keypad.js`, `shared/audio/beeps.js` and `shared/styles/tokens.css`.
- **Zero npm dependencies. No build step. Relative paths only.**
- **Pure logic must not touch `window` or `document` at module scope.** `problems.js` must be importable in Node.
- **Randomness is injected**, wired to `Math.random` exactly once in `main.js`.
- **Division problems are always exact** — no remainders, no decimals. **Subtraction never goes negative.**
- Speak & Spell must not regress. The hoisting task ends by exercising it.
- The page links `../shared/styles/tokens.css` first and `../shared/styles/backlink.css` last, and carries the back-link anchor.

- **Never run `git add -A` or `git commit -a`.** Stage only the files your task touches, by explicit path. A concurrent session edits this repo, and a blanket stage sweeps that unrelated work into your commit.

## File Structure

| File | Responsibility |
| --- | --- |
| `shared/game/machine.js` | Power, busy lock, mode switching. Hoisted, mode registry injected. |
| `shared/game/console.js` | `announce` / `correct` / `wrong` I/O wrapper. Hoisted. |
| `shared/audio/voice.js` | The robot narrator. Hoisted. |
| `speak-and-math/src/data/problems.js` | Problem generation. Pure. |
| `speak-and-math/src/game/modes/solve.js` | "Solve It". |
| `speak-and-math/src/game/modes/compare.js` | Greater / less than. |
| `speak-and-math/src/game/modes/stumper.js` | Missing-number puzzles. |
| `speak-and-math/src/ui/layout.js` | Digit-and-operator keypad. |
| `speak-and-math/src/main.js` | Wiring. |
| `speak-and-math/styles/*.css`, `index.html` | Chrome. |
| `test/speak-and-math.test.js` | Specs for `problems.js`. |

---

### Task 1: Problem generation, test-first

**Files:**
- Create: `speak-and-math/src/data/problems.js`
- Create: `test/speak-and-math.test.js`

**Interfaces:**
- Produces:
  - `LEVELS` — `{ 1: {max: 9, ops: ['+']}, 2: {...}, 3: {...}, 4: {...} }`
  - `makeProblem({ rng, level })` → `{ left, op, right, answer, display, spoken }`
  - `makeComparison({ rng, level })` → `{ left, right, relation }` where `relation` is `'<' | '>' | '='`
  - `makeStumper({ rng, level })` → `{ display, answer, spoken }` — one operand blanked out
  - `OPS` — `['+', '-', '*', '/']`
- Consumed by: the three mode modules.

- [ ] **Step 1: Write the failing test**

Create `test/speak-and-math.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, OPS, makeProblem, makeComparison, makeStumper } from '../speak-and-math/src/data/problems.js';

/** Deterministic rng cycling a fixed list of values in [0, 1). */
const scriptedRng = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

/** Exercises a generator across a wide spread of rng values. */
const sample = (make, level, count = 300) => {
  const results = [];
  for (let i = 0; i < count; i += 1) {
    const rng = scriptedRng([i / count, ((i * 7) % count) / count, ((i * 13) % count) / count]);
    results.push(make({ rng, level }));
  }
  return results;
};

test('there are four levels and each names at least one operator', () => {
  assert.equal(Object.keys(LEVELS).length, 4);
  for (const level of Object.values(LEVELS)) {
    assert.ok(level.ops.length > 0);
    assert.ok(level.ops.every((op) => OPS.includes(op)));
  }
});

test('every generated problem states the truth', () => {
  for (const level of [1, 2, 3, 4]) {
    for (const p of sample(makeProblem, level)) {
      const expected = { '+': p.left + p.right, '-': p.left - p.right, '*': p.left * p.right, '/': p.left / p.right }[p.op];
      assert.equal(p.answer, expected, `${p.left} ${p.op} ${p.right} claimed ${p.answer}`);
    }
  }
});

test('division is always exact', () => {
  for (const level of [1, 2, 3, 4]) {
    for (const p of sample(makeProblem, level)) {
      if (p.op !== '/') continue;
      assert.equal(Number.isInteger(p.answer), true, `${p.left} / ${p.right} is not exact`);
      assert.notEqual(p.right, 0, 'divided by zero');
    }
  }
});

test('subtraction never produces a negative answer', () => {
  for (const level of [1, 2, 3, 4]) {
    for (const p of sample(makeProblem, level)) {
      if (p.op !== '-') continue;
      assert.ok(p.answer >= 0, `${p.left} - ${p.right} went negative`);
    }
  }
});

test('a level only uses the operators it declares', () => {
  for (const level of [1, 2, 3, 4]) {
    for (const p of sample(makeProblem, level)) {
      assert.ok(LEVELS[level].ops.includes(p.op), `level ${level} produced ${p.op}`);
    }
  }
});

test('operands stay within the level ceiling', () => {
  for (const level of [1, 2, 3, 4]) {
    for (const p of sample(makeProblem, level)) {
      assert.ok(p.left <= LEVELS[level].max * LEVELS[level].max, 'left operand too large');
      assert.ok(p.right <= LEVELS[level].max, 'right operand too large');
    }
  }
});

test('the display string shows the operands and hides the answer', () => {
  const p = makeProblem({ rng: scriptedRng([0.4, 0.2, 0.7]), level: 1 });
  assert.match(p.display, /^\d+.\d+=$/);
  assert.equal(p.display.includes(String(p.answer)) && p.answer > 9, false);
});

test('the spoken string reads the operator as a word', () => {
  for (const level of [1, 2, 3, 4]) {
    for (const p of sample(makeProblem, level, 40)) {
      assert.match(p.spoken, /plus|minus|times|divided by/);
    }
  }
});

test('comparisons report the true relation', () => {
  for (const c of sample(makeComparison, 2)) {
    const truth = c.left < c.right ? '<' : c.left > c.right ? '>' : '=';
    assert.equal(c.relation, truth, `${c.left} vs ${c.right} claimed ${c.relation}`);
  }
});

test('comparisons sometimes produce equal pairs', () => {
  const relations = new Set(sample(makeComparison, 2, 400).map((c) => c.relation));
  assert.ok(relations.has('='), 'never generated an equality');
  assert.ok(relations.has('<') && relations.has('>'), 'missing an inequality direction');
});

test('a stumper hides exactly one operand and its answer solves it', () => {
  for (const s of sample(makeStumper, 3)) {
    assert.equal((s.display.match(/\?/g) ?? []).length, 1, `expected one blank in ${s.display}`);
    assert.ok(Number.isInteger(s.answer));
    assert.ok(s.answer >= 0);
  }
});

test('generation is deterministic for a given rng', () => {
  const a = makeProblem({ rng: scriptedRng([0.3, 0.6, 0.1]), level: 3 });
  const b = makeProblem({ rng: scriptedRng([0.3, 0.6, 0.1]), level: 3 });
  assert.deepEqual(a, b);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../speak-and-math/src/data/problems.js'`.

- [ ] **Step 3: Write the implementation**

Create `speak-and-math/src/data/problems.js`:

```js
/**
 * Arithmetic problem generation.
 *
 * Two rules do the real work here and are easy to get wrong: division is
 * generated backwards from a known product so it is always exact, and
 * subtraction is ordered largest-first so a child is never handed a negative.
 */

export const OPS = Object.freeze(['+', '-', '*', '/']);

export const LEVELS = Object.freeze({
  1: { max: 5, ops: ['+'] },
  2: { max: 9, ops: ['+', '-'] },
  3: { max: 9, ops: ['+', '-', '*'] },
  4: { max: 12, ops: ['+', '-', '*', '/'] },
});

const WORD_FOR = Object.freeze({
  '+': 'plus',
  '-': 'minus',
  '*': 'times',
  '/': 'divided by',
});

/** Display glyphs the 14-segment font can actually draw. */
const GLYPH_FOR = Object.freeze({ '+': '+', '-': '-', '*': '*', '/': '/' });

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
/** Inclusive integer in [min, max]. */
const between = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

const settings = (level) => LEVELS[level] ?? LEVELS[1];

export const makeProblem = ({ rng, level = 1 }) => {
  const { max, ops } = settings(level);
  const op = pick(rng, ops);

  let left;
  let right;

  if (op === '/') {
    // Build from the quotient so the division comes out whole.
    right = between(rng, 1, max);
    const quotient = between(rng, 1, max);
    left = right * quotient;
  } else if (op === '-') {
    // Order the operands so the answer cannot go negative.
    const a = between(rng, 0, max);
    const b = between(rng, 0, max);
    left = Math.max(a, b);
    right = Math.min(a, b);
  } else {
    left = between(rng, 0, max);
    right = between(rng, 0, max);
  }

  const answer = { '+': left + right, '-': left - right, '*': left * right, '/': left / right }[op];

  return {
    left,
    op,
    right,
    answer,
    display: `${left}${GLYPH_FOR[op]}${right}=`,
    spoken: `${left} ${WORD_FOR[op]} ${right} equals?`,
  };
};

export const makeComparison = ({ rng, level = 2 }) => {
  const { max } = settings(level);
  const left = between(rng, 0, max * 2);
  // Bias towards near-misses so equality actually turns up.
  const drift = between(rng, 0, 2) - 1;
  const right = Math.max(0, left + drift);
  const relation = left < right ? '<' : left > right ? '>' : '=';
  return { left, right, relation };
};

export const makeStumper = ({ rng, level = 3 }) => {
  const problem = makeProblem({ rng, level });
  const { left, op, right, answer } = problem;

  // Blank the left operand or the right one, never the result.
  const hideLeft = rng() < 0.5;
  return {
    display: hideLeft
      ? `?${GLYPH_FOR[op]}${right}=${answer}`
      : `${left}${GLYPH_FOR[op]}?=${answer}`,
    answer: hideLeft ? left : right,
    spoken: hideLeft
      ? `What ${WORD_FOR[op]} ${right} equals ${answer}?`
      : `${left} ${WORD_FOR[op]} what equals ${answer}?`,
  };
};
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 12 Speak & Math assertions green, `# fail 0`.

> If `comparisons sometimes produce equal pairs` fails, the drift range is too wide for the sampled rng values — widen `sample`'s count rather than loosening the assertion.

- [ ] **Step 5: Commit**

```bash
git add speak-and-math/src/data test/speak-and-math.test.js
git commit -m "feat: Speak & Math problem generation with exact division"
```

---

### Task 2: Hoist the console machinery

**Files:**
- Create: `shared/game/machine.js` (moved from `speak-and-spell/src/game/machine.js`)
- Create: `shared/game/console.js` (moved from `speak-and-spell/src/game/console.js`)
- Create: `shared/audio/voice.js` (moved from `speak-and-spell/src/audio/voice.js`)
- Modify: `speak-and-spell/src/main.js`, `speak-and-spell/src/game/modes/*.js` (import paths)

**Interfaces:**
- Produces: `createMachine(io, { modes, initialMode, levels, onStateChange })` → `{ press(code), setLevel(level), getState() }` where `modes` is `Record<string, (io, options) => Mode>` and a `Mode` is `{ id, start(), replay?(), handleInput?(code) => boolean, handleKey?(code) }`.
- Produces: `createConsole(display)` → unchanged public surface.
- Produces from `voice.js`: `say`, `spellOut`, `repeatLast`, `cancelSpeech`, `setMuted`, `isVoiceSupported`.

The current machine hard-codes `MODE_KEYS`, the four Speak & Spell modes and the `LEVEL_NAMES` import. Those are the toy's, not the machine's.

- [ ] **Step 1: Move the three files**

```bash
mkdir -p shared/game
git mv speak-and-spell/src/game/machine.js shared/game/machine.js
git mv speak-and-spell/src/game/console.js shared/game/console.js
git mv speak-and-spell/src/audio/voice.js shared/audio/voice.js
```

- [ ] **Step 2: Fix the moved files' own imports**

In `shared/game/console.js`:

```js
import { say, spellOut, repeatLast } from '../audio/voice.js';
import { correctBeep, wrongBeep, fanfare } from '../audio/beeps.js';
```

In `shared/game/machine.js`, delete the four `./modes/*.js` imports and the `LEVEL_NAMES` import, and change the beeps/voice imports to:

```js
import { powerOnBeep, powerOffBeep, keyBeep } from '../audio/beeps.js';
import { cancelSpeech } from '../audio/voice.js';
```

- [ ] **Step 3: Inject the mode registry**

In `shared/game/machine.js`, replace the `MODE_KEYS` constant, the `buildMode` switch and the `setLevel` guard:

```js
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
```

Replace the `powerOn` announcement line with the injected message:

```js
  const powerOn = async () => {
    state.powered = true;
    publish();
    io.display.setPowered(true);
    await powerOnBeep();
    if (powerOnMessage) await io.announce(powerOnMessage, { speech: powerOnMessage });
    await switchTo(initialMode);
  };
```

Replace the `setLevel` guard:

```js
  const setLevel = async (level) => {
    if (!levels.includes(level)) return;
    state.level = level;
    publish();
    if (!state.powered) return;
    await io.announce(`LEVEL ${level}`, { speech: `Level ${level}.` });
    await switchTo(state.modeId);
  };
```

And in `press`, replace the `MODE_KEYS.has(code)` check with a lookup against the injected registry:

```js
    if (Object.hasOwn(modes, code)) {
      run(() => switchTo(code));
      return;
    }
```

- [ ] **Step 4: Repoint Speak & Spell**

In `speak-and-spell/src/main.js`:

```js
import { createConsole } from '../../shared/game/console.js';
import { createMachine } from '../../shared/game/machine.js';
import { setMuted, isVoiceSupported, cancelSpeech } from '../../shared/audio/voice.js';
import { createSpellMode } from './game/modes/spell.js';
import { createMysteryMode } from './game/modes/mystery.js';
import { createLetterMode } from './game/modes/letter.js';
import { createSecretMode } from './game/modes/secret.js';
```

and pass the registry to the existing `createMachine` call:

```js
const machine = createMachine(io, {
  modes: {
    SPELL: createSpellMode,
    MYSTERY: createMysteryMode,
    LETTER: createLetterMode,
    SECRET: createSecretMode,
  },
  initialMode: 'SPELL',
  levels: LEVEL_NAMES,
  powerOnMessage: 'SPEAK AND SPELL',
  onStateChange: (state) => { /* unchanged body */ },
});
```

In each of `speak-and-spell/src/game/modes/spell.js`, `mystery.js`, `letter.js` and `secret.js`, no import changes are needed — they only import from `../../data/words.js`.

- [ ] **Step 5: Verify Speak & Spell has not regressed**

Run `python3 -m http.server 8138`, open `http://localhost:8138/speak-and-spell/`, hard-reload.

1. Click **ON** — power arpeggio, `SPEAK AND SPELL` scrolls, then it asks you to spell a word.
2. Type the word and press **ENTER** — it confirms and moves on.
3. Press **MYSTERY WORD** — the mode switches and dashes appear.
4. Change level to **C** — it announces the level and restarts.
5. Press **OFF** — the display goes dark mid-sentence.
6. Console shows no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: hoist the console machine, io wrapper and voice to shared"
```

---

### Task 3: The three activities

**Files:**
- Create: `speak-and-math/src/game/modes/solve.js`
- Create: `speak-and-math/src/game/modes/compare.js`
- Create: `speak-and-math/src/game/modes/stumper.js`

**Interfaces:**
- Each exports a factory `(io, { level }) => Mode` matching the machine's contract: `{ id, start(), replay(), handleInput(code) => boolean, handleKey(code) }`.

- [ ] **Step 1: Write Solve It**

Create `speak-and-math/src/game/modes/solve.js`:

```js
/**
 * SOLVE IT — ten problems, two attempts each, scored at the end.
 */
import { makeProblem } from '../../data/problems.js';

const ROUND_LENGTH = 10;

export const createSolveMode = (io, { level, rng = Math.random }) => {
  let problem = null;
  let asked = 0;
  let attempts = 0;
  let score = 0;
  let buffer = '';

  const ask = async () => {
    problem = makeProblem({ rng, level });
    attempts = 0;
    buffer = '';
    asked += 1;
    await io.announce(problem.display, { speech: problem.spoken });
    io.showTyping('');
  };

  const finish = async () => {
    await io.celebrate(`YOU GOT ${score} RIGHT OUT OF ${ROUND_LENGTH}`);
    await io.show('SOLVE OR GO');
  };

  const submit = async () => {
    if (buffer.length === 0) return;
    const given = Number.parseInt(buffer, 10);

    if (given === problem.answer) {
      score += 1;
      await io.correct('THAT IS CORRECT');
      if (asked >= ROUND_LENGTH) {
        await finish();
        return;
      }
      await ask();
      return;
    }

    attempts += 1;
    buffer = '';
    if (attempts < 2) {
      await io.wrong('TRY AGAIN');
      io.showTyping('');
      return;
    }

    await io.wrong('THAT IS INCORRECT');
    await io.announce(`${problem.display}${problem.answer}`, {
      speech: `The answer is ${problem.answer}`,
    });
    await io.wait(500);
    if (asked >= ROUND_LENGTH) {
      await finish();
      return;
    }
    await ask();
  };

  return {
    id: 'SOLVE',

    async start() {
      asked = 0;
      score = 0;
      await io.announce('SOLVE IT', { speech: 'Solve it.' });
      await ask();
    },

    async replay() {
      await this.start();
    },

    handleInput(code) {
      if (/^[0-9]$/.test(code)) {
        if (buffer.length < 6) {
          buffer += code;
          io.showTyping(buffer);
        }
        return true;
      }
      if (code === 'ERASE') {
        buffer = buffer.slice(0, -1);
        io.showTyping(buffer);
        return true;
      }
      return false;
    },

    async handleKey(code) {
      if (code === 'ENTER') {
        await submit();
        return;
      }
      if (code === 'REPEAT' || code === 'SAYIT') {
        await io.say(problem.spoken);
      }
    },
  };
};
```

- [ ] **Step 2: Write Greater / Less Than**

Create `speak-and-math/src/game/modes/compare.js`:

```js
/**
 * GREATER THAN — two numbers, pick the relation. Answered with the three
 * relation keys rather than typed digits.
 */
import { makeComparison } from '../../data/problems.js';

const ROUND_LENGTH = 10;
const RELATION_KEYS = { LT: '<', GT: '>', EQ: '=' };

export const createCompareMode = (io, { level, rng = Math.random }) => {
  let pair = null;
  let asked = 0;
  let score = 0;

  const ask = async () => {
    pair = makeComparison({ rng, level });
    asked += 1;
    await io.announce(`${pair.left}  ${pair.right}`, {
      speech: `Is ${pair.left} greater than, less than, or equal to ${pair.right}?`,
    });
  };

  const finish = async () => {
    await io.celebrate(`YOU GOT ${score} RIGHT OUT OF ${ROUND_LENGTH}`);
    await io.show('SOLVE OR GO');
  };

  return {
    id: 'COMPARE',

    async start() {
      asked = 0;
      score = 0;
      await io.announce('GREATER OR LESS', { speech: 'Greater than or less than.' });
      await ask();
    },

    async replay() {
      await this.start();
    },

    async handleKey(code) {
      const chosen = RELATION_KEYS[code];
      if (!chosen) {
        if (code === 'REPEAT' || code === 'SAYIT') {
          await io.say(`Is ${pair.left} greater than, less than, or equal to ${pair.right}?`);
        }
        return;
      }

      if (chosen === pair.relation) {
        score += 1;
        await io.correct('THAT IS CORRECT');
      } else {
        await io.wrong('NO');
        await io.announce(`${pair.left}${pair.relation}${pair.right}`, {
          speech: `${pair.left} is ${
            pair.relation === '=' ? 'equal to' : pair.relation === '<' ? 'less than' : 'greater than'
          } ${pair.right}`,
        });
      }

      if (asked >= ROUND_LENGTH) {
        await finish();
        return;
      }
      await ask();
    },
  };
};
```

- [ ] **Step 3: Write Number Stumper**

Create `speak-and-math/src/game/modes/stumper.js`:

```js
/**
 * NUMBER STUMPER — the equation is shown with one operand missing.
 */
import { makeStumper } from '../../data/problems.js';

const ROUND_LENGTH = 10;

export const createStumperMode = (io, { level, rng = Math.random }) => {
  let puzzle = null;
  let asked = 0;
  let attempts = 0;
  let score = 0;
  let buffer = '';

  const ask = async () => {
    puzzle = makeStumper({ rng, level });
    attempts = 0;
    buffer = '';
    asked += 1;
    await io.announce(puzzle.display, { speech: puzzle.spoken });
    io.showTyping('');
  };

  const finish = async () => {
    await io.celebrate(`YOU GOT ${score} RIGHT OUT OF ${ROUND_LENGTH}`);
    await io.show('SOLVE OR GO');
  };

  const submit = async () => {
    if (buffer.length === 0) return;
    if (Number.parseInt(buffer, 10) === puzzle.answer) {
      score += 1;
      await io.correct('THAT IS CORRECT');
      if (asked >= ROUND_LENGTH) return finish();
      return ask();
    }

    attempts += 1;
    buffer = '';
    if (attempts < 2) {
      await io.wrong('TRY AGAIN');
      io.showTyping('');
      return undefined;
    }

    await io.wrong('THAT IS INCORRECT');
    await io.announce(`${puzzle.answer}`, { speech: `The missing number is ${puzzle.answer}` });
    await io.wait(500);
    if (asked >= ROUND_LENGTH) return finish();
    return ask();
  };

  return {
    id: 'STUMPER',

    async start() {
      asked = 0;
      score = 0;
      await io.announce('NUMBER STUMPER', { speech: 'Number stumper.' });
      await ask();
    },

    async replay() {
      await this.start();
    },

    handleInput(code) {
      if (/^[0-9]$/.test(code)) {
        if (buffer.length < 6) {
          buffer += code;
          io.showTyping(buffer);
        }
        return true;
      }
      if (code === 'ERASE') {
        buffer = buffer.slice(0, -1);
        io.showTyping(buffer);
        return true;
      }
      return false;
    },

    async handleKey(code) {
      if (code === 'ENTER') {
        await submit();
        return;
      }
      if (code === 'REPEAT' || code === 'SAYIT') {
        await io.say(puzzle.spoken);
      }
    },
  };
};
```

- [ ] **Step 4: Commit**

```bash
git add speak-and-math/src/game
git commit -m "feat: Speak & Math activities"
```

---

### Task 4: Keypad, markup and wiring

**Files:**
- Create: `speak-and-math/src/ui/layout.js`
- Create: `speak-and-math/index.html`
- Create: `speak-and-math/src/main.js`

- [ ] **Step 1: Write the keypad layout**

Create `speak-and-math/src/ui/layout.js`:

```js
/**
 * Speak & Math's board: a function row, then digits and the relation and
 * operator keys.
 */
export const SPEAK_AND_MATH_ROWS = Object.freeze([
  {
    className: 'keyrow--function',
    keys: [
      { code: 'OFF', label: 'OFF', tone: 'blue' },
      { code: 'GO', label: 'GO', tone: 'blue' },
      { code: 'REPLAY', label: '↺', caption: 'REPLAY', tone: 'red' },
      { code: 'REPEAT', label: '"', caption: 'REPEAT', tone: 'red' },
      { code: 'SOLVE', label: '=', caption: 'SOLVE\nIT', tone: 'red' },
      { code: 'COMPARE', label: '≷', caption: 'GREATER\nLESS', tone: 'red' },
      { code: 'STUMPER', label: '?', caption: 'NUMBER\nSTUMPER', tone: 'red' },
      { code: 'SAYIT', label: '☺', caption: 'SAY\nIT', tone: 'red' },
      { code: 'ON', label: 'ON', tone: 'blue' },
    ],
  },
  {
    className: 'keyrow--digits',
    keys: ['1', '2', '3', '4', '5'].map((d) => ({ code: d, label: d })),
  },
  {
    className: 'keyrow--digits',
    keys: ['6', '7', '8', '9', '0'].map((d) => ({ code: d, label: d })),
  },
  {
    className: 'keyrow--digits',
    keys: [
      { code: 'LT', label: '<', tone: 'yellow' },
      { code: 'GT', label: '>', tone: 'yellow' },
      { code: 'EQ', label: '=', tone: 'yellow' },
      { code: 'ERASE', label: '#', caption: 'ERASE', tone: 'yellow' },
      { code: 'ENTER', label: '↑', caption: 'ENTER', tone: 'yellow' },
    ],
  },
]);
```

- [ ] **Step 2: Write the markup**

Create `speak-and-math/index.html` as a copy of `speak-and-spell/index.html` with these changes: `<title>Speak &amp; Math</title>`, the wordmark spans read `Speak` / `&` / `Math`, the stylesheet links point at `styles/base.css`, `styles/device.css`, `styles/keypad.css` in this folder plus `../shared/styles/tokens.css` first and `../shared/styles/backlink.css` last, and the "How to play" list becomes:

```html
        <ul>
          <li><strong>ON</strong> wakes it up. <strong>OFF</strong> stops it mid-sentence.</li>
          <li><strong>SOLVE IT</strong> — it reads a problem, you type the answer and press <strong>ENTER</strong>. Two tries, ten problems, then a score.</li>
          <li><strong>GREATER / LESS</strong> — two numbers; press <strong>&lt;</strong>, <strong>&gt;</strong> or <strong>=</strong>.</li>
          <li><strong>NUMBER STUMPER</strong> — one operand is missing; supply it.</li>
          <li>Levels A–D add subtraction, multiplication and division. Division always comes out even.</li>
          <li>Your number keys work, plus Enter and Backspace.</li>
        </ul>
```

- [ ] **Step 3: Write the wiring**

Create `speak-and-math/src/main.js`:

```js
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
```

- [ ] **Step 4: Commit**

```bash
git add speak-and-math/index.html speak-and-math/src/ui speak-and-math/src/main.js
git commit -m "feat: Speak & Math keypad, markup and wiring"
```

---

### Task 5: Styling

**Files:**
- Create: `speak-and-math/styles/base.css`, `device.css`, `keypad.css`

- [ ] **Step 1: Copy and retint**

Copy the three stylesheets from `speak-and-spell/styles/`. Speak & Math shipped in the same moulding with a blue panel instead of yellow, so change only the panel tokens in `base.css`:

```css
  --panel-blue: #4f83c4;
  --panel-blue-dark: #35618f;
```

and in `device.css` swap the `.panel` background to use them:

```css
.panel {
  background: linear-gradient(170deg, #6a9ad6, var(--panel-blue) 45%, var(--panel-blue-dark));
}
```

Adjust `.keyrow--digits` in `keypad.css` to five columns:

```css
.keyrow--digits {
  grid-template-columns: repeat(5, 1fr);
}
```

and the function row to nine:

```css
.keyrow--function {
  grid-template-columns: repeat(9, 1fr);
}
```

- [ ] **Step 2: Verify in the browser**

Open `http://localhost:8138/speak-and-math/`, hard-reload.

1. Click **ON** — `SPEAK AND MATH` scrolls, then a problem appears and is read aloud.
2. Type the answer and press **ENTER** — it confirms and asks the next.
3. Answer wrong twice — it shows and speaks the answer, then moves on.
4. Press **GREATER / LESS** — two numbers appear; the `<`, `>`, `=` keys score.
5. Press **NUMBER STUMPER** — an equation with one `?` appears.
6. Switch to level **D** and confirm division problems appear and always divide evenly.
7. Type fast — no digits are dropped.
8. Console shows no errors.

- [ ] **Step 3: Commit**

```bash
git add speak-and-math/styles
git commit -m "feat: Speak & Math styling"
```

---

### Task 6: Put it on the shelf

**Files:**
- Modify: `shared/data/toys.js`, `styles/gallery.css`, `README.md`

- [ ] **Step 1: Add the manifest entry**

Append to `TOYS` in `shared/data/toys.js`:

```js
  {
    slug: 'speak-and-math',
    title: 'Speak & Math',
    year: '1980',
    blurb:
      'The same red console asking arithmetic instead of spelling. Solve It, greater-or-less, and equations with a number missing.',
    tech: 'Shared VFD and console machine · exact-division generator',
    thumb: 'snm',
    parts: ['thumb__handle', 'thumb__screen', 'thumb__panel'],
  },
```

- [ ] **Step 2: Add the thumbnail**

Append to `styles/gallery.css` — it reuses the Speak & Spell thumbnail parts with a blue panel:

```css
/* Speak & Math: the same slab with a blue keypad. */
.thumb--snm {
  background: linear-gradient(165deg, #2a2b2f, #17181b);
  display: grid;
  place-items: center;
}

.thumb--snm::before {
  content: '';
  position: absolute;
  width: 132px;
  height: 138px;
  border-radius: 12px 12px 9px 9px;
  background: linear-gradient(158deg, #e8574a, var(--case-red) 40%, var(--case-red-dark));
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.45);
}

.thumb--snm .thumb__panel {
  background: #4f83c4;
}

.thumb--snm .thumb__panel::after {
  background:
    repeating-linear-gradient(90deg, #dfe8f2 0 8px, transparent 8px 11px),
    repeating-linear-gradient(180deg, #dfe8f2 0 9px, transparent 9px 13px);
}
```

> `.thumb__handle`, `.thumb__screen` and `.thumb__panel` are already defined for `.thumb--sns` and are not scoped to it, so they apply here too.

- [ ] **Step 3: Document it**

Add to `README.md`:

```markdown
## Speak & Math (`/speak-and-math/`)

Speak & Spell's chassis with arithmetic in it — the same display, machine and
voice, a numeric keypad, and three activities: Solve It, greater-or-less, and
Number Stumper.

Problem generation is pure and lives in `speak-and-math/src/data/problems.js`.
Two rules there are easy to get wrong and are pinned by `test/speak-and-math.test.js`:
division is generated backwards from a known quotient so it is always exact, and
subtraction operands are ordered largest-first so the answer never goes negative.
```

- [ ] **Step 4: Verify and commit**

Run: `npm test`
Expected: PASS — all four suites green.

Open the gallery, confirm the Speak & Math card appears and links correctly.

```bash
git add -A
git commit -m "feat: add Speak & Math to the gallery"
```

---

## Done when

- `npm test` passes, including 12 problem-generation specs.
- Division is always exact and subtraction never negative, at every level.
- All three activities are playable and scored.
- **Speak & Spell still works** — same games, same levels, same power behaviour.
- The gallery card links to it.
