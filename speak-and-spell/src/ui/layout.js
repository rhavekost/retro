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
  { code: 'ON', label: 'ON', tone: 'blue', alwaysOn: true },
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
