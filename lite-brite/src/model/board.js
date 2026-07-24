/**
 * The peg board as plain data: one byte per hole, 0 for empty and 1–8 indexing
 * COLORS. Keeping the picture a flat array is what makes sharing it trivial.
 */

/** The eight translucent peg colours. */
export const COLORS = Object.freeze([
  { id: 1, name: 'red', hex: '#ff2f45' },
  { id: 2, name: 'orange', hex: '#ff8a1e' },
  { id: 3, name: 'yellow', hex: '#ffe23d' },
  { id: 4, name: 'green', hex: '#41e05a' },
  { id: 5, name: 'blue', hex: '#2f9dff' },
  { id: 6, name: 'violet', hex: '#a45cff' },
  { id: 7, name: 'pink', hex: '#ff6ec7' },
  { id: 8, name: 'white', hex: '#fdfbf0' },
]);

export const COLS = 28;
export const ROWS = 22;
export const CELL_COUNT = COLS * ROWS;

/** Odd rows sit half a hole to the right, as on the real board. */
export const isStaggered = (row) => row % 2 === 1;

export const emptyBoard = () => new Uint8Array(CELL_COUNT);

export const colorById = (id) => COLORS.find((color) => color.id === id) ?? null;
