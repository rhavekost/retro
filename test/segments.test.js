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
