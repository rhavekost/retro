/**
 * The stylus: a point that can be nudged but never lifted.
 *
 * Every move returns the segment it travelled, which is what makes the
 * unbroken-line constraint structural rather than something the drawing layer
 * has to remember.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const createStylus = ({ width, height, x = width / 2, y = height / 2 }) => {
  let position = { x: clamp(x, 0, width), y: clamp(y, 0, height) };

  const move = (dx, dy) => {
    const from = position;
    const to = {
      x: clamp(position.x + dx, 0, width),
      y: clamp(position.y + dy, 0, height),
    };
    position = to;
    return { from, to };
  };

  return {
    move,
    position: () => ({ ...position }),
    reset: () => {
      position = { x: width / 2, y: height / 2 };
    },
  };
};
