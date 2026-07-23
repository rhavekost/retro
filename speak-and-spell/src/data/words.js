/**
 * Spelling lists, in the four difficulty levels the original shipped with.
 * Level A is early-reader vocabulary; level D is where the toy starts
 * showing off ("rendezvous" was genuinely on the real thing).
 */
export const LEVELS = Object.freeze({
  A: Object.freeze([
    'cat', 'dog', 'bed', 'cup', 'fish', 'milk', 'tree', 'rain', 'star', 'boat',
    'hand', 'jump', 'book', 'ball', 'cake', 'door', 'farm', 'gate', 'lamp', 'nest',
    'sock', 'wind', 'frog', 'ship', 'corn', 'ring', 'shoe', 'snow', 'bird', 'moon',
  ]),
  B: Object.freeze([
    'apple', 'bread', 'chair', 'dance', 'eagle', 'floor', 'grass', 'house', 'juice', 'knife',
    'lemon', 'money', 'night', 'ocean', 'paper', 'queen', 'river', 'stone', 'table', 'uncle',
    'voice', 'water', 'young', 'zebra', 'candy', 'dream', 'earth', 'field', 'green', 'horse',
  ]),
  C: Object.freeze([
    'ancient', 'balloon', 'captain', 'diamond', 'evening', 'freedom', 'gallery', 'harvest',
    'imagine', 'journey', 'kitchen', 'library', 'machine', 'natural', 'october', 'package',
    'quarter', 'reptile', 'silence', 'teacher', 'uniform', 'village', 'weather', 'crystal',
    'blanket', 'chimney', 'dolphin', 'factory', 'gravity', 'holiday',
  ]),
  D: Object.freeze([
    'accordion', 'beautiful', 'chocolate', 'dangerous', 'elephant', 'furniture', 'gymnasium',
    'hurricane', 'important', 'jubilant', 'knowledge', 'laboratory', 'mysterious', 'necessary',
    'obedient', 'parachute', 'quarantine', 'rendezvous', 'saxophone', 'telescope', 'umbrella',
    'vegetable', 'wilderness', 'xylophone', 'yesterday', 'zeppelin', 'adventure', 'butterfly',
    'chameleon', 'dictionary',
  ]),
});

export const LEVEL_NAMES = Object.freeze(Object.keys(LEVELS));

export const WORDS_PER_ROUND = 10;

/** Fisher-Yates over a copy — the source lists stay frozen and untouched. */
const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** A fresh round of ten words drawn from the given level. */
export const buildRound = (level) => shuffle(LEVELS[level] ?? LEVELS.A).slice(0, WORDS_PER_ROUND);

export const randomWord = (level) => {
  const list = LEVELS[level] ?? LEVELS.A;
  return list[Math.floor(Math.random() * list.length)];
};
