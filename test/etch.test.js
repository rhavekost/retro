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
