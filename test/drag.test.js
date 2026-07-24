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
