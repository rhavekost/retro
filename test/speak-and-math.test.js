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
