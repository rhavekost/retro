import test from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, WIN_LENGTHS, intervalFor, createGame } from '../simon/src/game/sequence.js';

/** A deterministic stand-in for Math.random that walks a fixed list. */
const scriptedRng = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

// 0.0 -> green, 0.3 -> red, 0.6 -> yellow, 0.9 -> blue
const rngFor = (...colors) =>
  scriptedRng(colors.map((c) => COLORS.indexOf(c) / COLORS.length + 0.01));

test('extend appends one colour drawn from the injected rng', () => {
  const game = createGame({ rng: rngFor('red'), level: 1 });
  game.extend();
  assert.deepEqual(game.sequence(), ['red']);
});

test('a correct press advances without completing a short round', () => {
  const game = createGame({ rng: rngFor('red', 'blue'), level: 1 });
  game.extend();
  game.extend();
  assert.deepEqual(game.press('red'), { verdict: 'correct' });
});

test('pressing the last colour completes the round', () => {
  const game = createGame({ rng: rngFor('red'), level: 1 });
  game.extend();
  assert.deepEqual(game.press('red'), { verdict: 'round-complete' });
});

test('a wrong press reports what was expected', () => {
  const game = createGame({ rng: rngFor('red'), level: 1 });
  game.extend();
  assert.deepEqual(game.press('blue'), { verdict: 'wrong', expected: 'red' });
});

test('replaying a round starts matching from the beginning again', () => {
  const game = createGame({ rng: rngFor('red', 'blue'), level: 1 });
  game.extend();
  game.extend();
  game.press('red');
  assert.deepEqual(game.press('blue'), { verdict: 'round-complete' });
  game.extend();
  // A new round restarts the match cursor.
  assert.deepEqual(game.press('red'), { verdict: 'correct' });
});

test('reaching the level win length wins the game', () => {
  const game = createGame({ rng: rngFor('green'), level: 1 });
  for (let i = 0; i < WIN_LENGTHS[1]; i += 1) game.extend();
  for (let i = 0; i < WIN_LENGTHS[1] - 1; i += 1) {
    assert.equal(game.press('green').verdict, 'correct');
  }
  assert.deepEqual(game.press('green'), { verdict: 'won' });
});

test('status reports round number and sequence length', () => {
  const game = createGame({ rng: rngFor('green'), level: 2 });
  game.extend();
  game.extend();
  assert.deepEqual(game.status(), { length: 2, level: 2, winAt: WIN_LENGTHS[2], over: false });
});

test('reset clears the sequence', () => {
  const game = createGame({ rng: rngFor('green'), level: 1 });
  game.extend();
  game.reset();
  assert.deepEqual(game.sequence(), []);
});

test('the tempo tightens as the sequence grows', () => {
  assert.ok(intervalFor(3) > intervalFor(7));
  assert.ok(intervalFor(7) > intervalFor(12));
  assert.ok(intervalFor(12) > intervalFor(20));
});

test('the tempo never drops below the floor', () => {
  assert.equal(intervalFor(99), intervalFor(31));
});
