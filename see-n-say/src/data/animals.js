/**
 * The twelve wedges of the wheel, in clockwise order starting from the top.
 * `id` keys into the synthesized voices; `say` is what the caption prints
 * once the narrator finishes the "The X says…" line.
 */
export const ANIMALS = Object.freeze([
  { id: 'cow', label: 'cow', say: 'Moooo', glyph: '🐄', color: 'red' },
  { id: 'sheep', label: 'sheep', say: 'Baaaa', glyph: '🐑', color: 'yellow' },
  { id: 'pig', label: 'pig', say: 'Oink oink', glyph: '🐖', color: 'blue' },
  { id: 'duck', label: 'duck', say: 'Quack quack', glyph: '🦆', color: 'green' },
  { id: 'dog', label: 'dog', say: 'Woof woof', glyph: '🐕', color: 'red' },
  { id: 'cat', label: 'cat', say: 'Meoww', glyph: '🐈', color: 'yellow' },
  { id: 'horse', label: 'horse', say: 'Neighhh', glyph: '🐎', color: 'blue' },
  { id: 'rooster', label: 'rooster', say: 'Cock-a-doodle-doo', glyph: '🐓', color: 'green' },
  { id: 'frog', label: 'frog', say: 'Ribbit ribbit', glyph: '🐸', color: 'red' },
  { id: 'owl', label: 'owl', say: 'Hoo hoo', glyph: '🦉', color: 'yellow' },
  { id: 'lion', label: 'lion', say: 'Rooaaar', glyph: '🦁', color: 'blue' },
  { id: 'bee', label: 'bee', say: 'Bzzzzz', glyph: '🐝', color: 'green' },
]);

export const WEDGE_COUNT = ANIMALS.length;
export const WEDGE_DEGREES = 360 / WEDGE_COUNT;

/** Center angle of a wedge, in degrees clockwise from 12 o'clock. */
export const wedgeAngle = (index) => index * WEDGE_DEGREES;

export const findAnimal = (id) => ANIMALS.find((animal) => animal.id === id) ?? null;
