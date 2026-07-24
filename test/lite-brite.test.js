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
