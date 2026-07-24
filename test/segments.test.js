import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentsFor, canRender } from '../shared/display/segments.js';

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
