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
      { code: 'ON', label: 'ON', tone: 'blue', alwaysOn: true },
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
