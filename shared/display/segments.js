/**
 * Geometry and character map for a 14-segment display cell.
 *
 * Segment names follow the usual convention:
 *   a  top          d  bottom       g1 middle-left   g2 middle-right
 *   b  upper-right  e  lower-left   i  centre-upper  l  centre-lower
 *   c  lower-right  f  upper-left
 *   h/j/k/m  the four diagonals, all radiating from the centre point
 */

export const CELL_WIDTH = 100;
export const CELL_HEIGHT = 160;

/** Beveled horizontal bar centred on `y`, spanning x1..x2. */
const hbar = (x1, x2, y, t) =>
  [
    [x1, y],
    [x1 + t, y - t],
    [x2 - t, y - t],
    [x2, y],
    [x2 - t, y + t],
    [x1 + t, y + t],
  ]
    .map((point) => point.join(','))
    .join(' ');

/** Beveled vertical bar centred on `x`, spanning y1..y2. */
const vbar = (x, y1, y2, t) =>
  [
    [x, y1],
    [x + t, y1 + t],
    [x + t, y2 - t],
    [x, y2],
    [x - t, y2 - t],
    [x - t, y1 + t],
  ]
    .map((point) => point.join(','))
    .join(' ');

/** Diagonals are drawn as thin quads between two points. */
const diag = (x1, y1, x2, y2, t) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const dx = (Math.sin(angle) * t) / 2;
  const dy = (Math.cos(angle) * t) / 2;
  return [
    [x1 + dx, y1 - dy],
    [x2 + dx, y2 - dy],
    [x2 - dx, y2 + dy],
    [x1 - dx, y1 + dy],
  ]
    .map((point) => point.map((n) => n.toFixed(1)).join(','))
    .join(' ');
};

const T = 6;

export const SEGMENT_SHAPES = Object.freeze({
  a: hbar(16, 84, 12, T),
  d: hbar(16, 84, 148, T),
  g1: hbar(16, 46, 80, 5),
  g2: hbar(54, 84, 80, 5),
  f: vbar(12, 18, 74, T),
  e: vbar(12, 86, 142, T),
  b: vbar(88, 18, 74, T),
  c: vbar(88, 86, 142, T),
  i: vbar(50, 20, 72, 5),
  l: vbar(50, 88, 140, 5),
  h: diag(24, 26, 42, 66, 9),
  j: diag(76, 26, 58, 66, 9),
  k: diag(24, 134, 42, 94, 9),
  m: diag(76, 134, 58, 94, 9),
});

export const SEGMENT_ORDER = Object.freeze(Object.keys(SEGMENT_SHAPES));

/** Which segments light up for each supported character. */
const CHARACTERS = {
  A: 'abcefg1g2',
  B: 'abcdig2l',
  C: 'adef',
  D: 'abcdil',
  E: 'adefg1g2',
  F: 'aefg1',
  G: 'acdefg2',
  H: 'bcefg1g2',
  I: 'adil',
  J: 'bcde',
  K: 'efg1jm',
  L: 'def',
  M: 'bcefhj',
  N: 'bcefhm',
  O: 'abcdef',
  P: 'abefg1g2',
  Q: 'abcdefm',
  R: 'abefg1g2m',
  S: 'acdfg1g2',
  T: 'ail',
  U: 'bcdef',
  V: 'efkj',
  W: 'bcefkm',
  X: 'hjkm',
  Y: 'hjl',
  Z: 'adjk',
  0: 'abcdefjk',
  1: 'bcj',
  2: 'abdeg1g2',
  3: 'abcdg1g2',
  4: 'bcfg1g2',
  5: 'acdfg1g2',
  6: 'acdefg1g2',
  7: 'abc',
  8: 'abcdefg1g2',
  9: 'abcdfg1g2',
  '-': 'g1g2',
  '+': 'g1g2il',
  '=': 'dg1g2',
  '/': 'jk',
  '*': 'hjkm',
  _: 'd',
  "'": 'i',
  '?': 'abg2l',
  '!': 'il',
  '.': 'l',
  '#': 'g1g2il',
  ' ': '',
};

/** Splits a segment string like "abcefg1g2" into its individual names. */
const parseSegments = (spec) => {
  const found = [];
  let rest = spec;
  while (rest.length > 0) {
    // g1/g2 are two characters; everything else is one.
    const size = rest.startsWith('g1') || rest.startsWith('g2') ? 2 : 1;
    found.push(rest.slice(0, size));
    rest = rest.slice(size);
  }
  return found;
};

export const CHARACTER_SEGMENTS = Object.freeze(
  Object.fromEntries(
    Object.entries(CHARACTERS).map(([char, spec]) => [char, Object.freeze(parseSegments(spec))]),
  ),
);

/** Characters this display can render; anything else becomes a blank. */
export const canRender = (char) => Object.hasOwn(CHARACTER_SEGMENTS, char.toUpperCase());

export const segmentsFor = (char) => CHARACTER_SEGMENTS[char.toUpperCase()] ?? [];
