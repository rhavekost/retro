/**
 * The colour picker. The eraser is just colour 0, so painting and erasing
 * follow the same code path.
 */
import { COLORS } from '../model/board.js';

export const createPalette = (mount, { onSelect }) => {
  let current = COLORS[0].id;
  const swatches = new Map();

  const paint = () => {
    swatches.forEach((node, id) => {
      node.setAttribute('aria-pressed', String(id === current));
    });
  };

  const add = ({ id, name, hex }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = id === 0 ? 'swatch swatch--eraser' : 'swatch';
    button.style.setProperty('--peg', hex);
    button.setAttribute('aria-label', name);
    button.setAttribute('aria-pressed', 'false');
    if (id === 0) button.textContent = '⌫';
    button.addEventListener('click', () => {
      current = id;
      paint();
      onSelect(id);
    });
    mount.append(button);
    swatches.set(id, button);
  };

  COLORS.forEach(add);
  add({ id: 0, name: 'eraser', hex: 'transparent' });
  paint();

  return {
    select: (id) => {
      current = id;
      paint();
    },
    selected: () => current,
  };
};
