/**
 * The hole grid. Each hole is a button so it is keyboard-reachable; painting
 * continues as the pointer is dragged across holes.
 */
import { COLS, ROWS, isStaggered, colorById } from '../model/board.js';

export const createGrid = (mount, { cells, onPaint }) => {
  const holes = [];
  let painting = false;

  mount.style.setProperty('--cols', String(COLS));
  mount.style.setProperty('--rows', String(ROWS));

  for (let row = 0; row < ROWS; row += 1) {
    const rowEl = document.createElement('div');
    rowEl.className = `pegrow${isStaggered(row) ? ' pegrow--offset' : ''}`;

    for (let col = 0; col < COLS; col += 1) {
      const index = row * COLS + col;
      const hole = document.createElement('button');
      hole.type = 'button';
      hole.className = 'hole';
      hole.dataset.index = String(index);
      hole.setAttribute('aria-label', `Row ${row + 1}, hole ${col + 1}`);

      hole.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        painting = true;
        onPaint(index);
      });
      // pointerenter fires on the hole the pointer moves onto, which is
      // exactly the drag-to-fill behaviour we want.
      hole.addEventListener('pointerenter', () => {
        if (painting) onPaint(index);
      });
      hole.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onPaint(index);
      });

      rowEl.append(hole);
      holes.push(hole);
    }
    mount.append(rowEl);
  }

  // Releasing anywhere ends the stroke, including outside the board.
  window.addEventListener('pointerup', () => {
    painting = false;
  });
  window.addEventListener('pointercancel', () => {
    painting = false;
  });

  const setCell = (index, value) => {
    const hole = holes[index];
    if (!hole) return;
    const color = colorById(value);
    hole.classList.toggle('hole--lit', Boolean(color));
    hole.style.setProperty('--peg', color ? color.hex : 'transparent');
  };

  const repaintAll = (next) => {
    for (let i = 0; i < holes.length; i += 1) setCell(i, next[i]);
  };

  repaintAll(cells);
  return { setCell, repaintAll };
};
