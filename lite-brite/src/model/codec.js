/**
 * Run-length codec for the URL hash.
 *
 * Cells become letters (`.` empty, `A`–`H` for the eight colours) followed by
 * a repeat count when a run is longer than one. Letters and digits never
 * collide, so the format parses without separators and stays URL-safe.
 */
const EMPTY = '.';
const ALPHABET = '.ABCDEFGH';

const charFor = (value) => ALPHABET[value] ?? EMPTY;
const valueFor = (char) => {
  const index = ALPHABET.indexOf(char);
  return index < 0 ? null : index;
};

/** @param {Uint8Array} cells */
export const encode = (cells) => {
  let out = '';
  let run = 0;
  let current = cells[0] ?? 0;

  const flush = () => {
    if (run === 0) return;
    out += charFor(current) + (run > 1 ? String(run) : '');
  };

  for (const value of cells) {
    if (value === current) {
      run += 1;
      continue;
    }
    flush();
    current = value;
    run = 1;
  }
  flush();
  return out;
};

/**
 * @param {string} text
 * @param {number} length total cells to produce
 * @returns {Uint8Array} always exactly `length` long
 */
export const decode = (text, length) => {
  const cells = new Uint8Array(length);
  let cursor = 0;
  let index = 0;

  while (index < text.length && cursor < length) {
    const value = valueFor(text[index]);
    index += 1;
    // Skip anything that is not part of the alphabet rather than failing —
    // a mangled shared link should still render what it can.
    if (value === null) continue;

    let digits = '';
    while (index < text.length && text[index] >= '0' && text[index] <= '9') {
      digits += text[index];
      index += 1;
    }

    const run = digits === '' ? 1 : Number.parseInt(digits, 10);
    for (let i = 0; i < run && cursor < length; i += 1) {
      cells[cursor] = value;
      cursor += 1;
    }
  }

  return cells;
};
