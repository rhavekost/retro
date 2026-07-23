/**
 * The membrane keypad: a function row across the top, then the alphabet laid
 * out A–Z in rows of ten, with punctuation and ENTER filling the last row.
 */

/** Function keys, in the order printed above the letters. */
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
  { code: 'ON', label: 'ON', tone: 'blue' },
]);

const LETTER_ROWS = Object.freeze([
  'ABCDEFGHIJ'.split(''),
  'KLMNOPQRST'.split(''),
  'UVWXYZ'.split(''),
]);

/** Right-hand end of the bottom row, mirroring the real console. */
const TAIL_KEYS = Object.freeze([
  { code: '-', label: '-', tone: 'yellow' },
  { code: "'", label: "'", caption: 'VOLUME', tone: 'yellow' },
  { code: 'ERASE', label: '#', caption: 'ERASE', tone: 'yellow' },
  { code: 'ENTER', label: '↑', caption: 'ENTER', tone: 'yellow' },
]);

const makeKey = ({ code, label, caption, tone }, onPress) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `key key--${tone ?? 'letter'}`;
  button.dataset.code = code;
  button.setAttribute('aria-label', (caption ?? label ?? code).replace('\n', ' '));

  if (caption) {
    const cap = document.createElement('span');
    cap.className = 'key__caption';
    cap.textContent = caption;
    button.append(cap);
  }

  const glyph = document.createElement('span');
  glyph.className = 'key__glyph';
  glyph.textContent = label;
  button.append(glyph);

  button.addEventListener('click', () => onPress(code));
  return button;
};

/**
 * Builds the keypad into `mount`.
 * @param {(code: string) => void} onPress receives 'A'..'Z', 'ENTER', 'ERASE', or a function code
 */
export const createKeypad = (mount, onPress) => {
  const keysByCode = new Map();

  const addRow = (className, specs) => {
    const row = document.createElement('div');
    row.className = `keyrow ${className}`;
    specs.forEach((spec) => {
      const key = makeKey(spec, onPress);
      row.append(key);
      keysByCode.set(spec.code, key);
    });
    mount.append(row);
  };

  addRow('keyrow--function', FUNCTION_KEYS);
  LETTER_ROWS.forEach((letters, index) => {
    const specs = letters.map((letter) => ({ code: letter, label: letter }));
    addRow(`keyrow--letters keyrow--letters-${index + 1}`, index === 2 ? [...specs, ...TAIL_KEYS] : specs);
  });

  /** Briefly highlights a key — used when the physical keyboard drives it. */
  const flashKey = (code) => {
    const key = keysByCode.get(code);
    if (!key) return;
    key.classList.add('key--pressed');
    setTimeout(() => key.classList.remove('key--pressed'), 130);
  };

  const setDisabled = (disabled) => {
    keysByCode.forEach((key, code) => {
      // ON always stays live, otherwise you could never wake the toy up.
      key.disabled = disabled && code !== 'ON';
    });
  };

  return { flashKey, setDisabled };
};

/** Maps a physical keyboard event to a keypad code, or null. */
export const codeForKeyboardEvent = (event) => {
  if (event.key === 'Enter') return 'ENTER';
  if (event.key === 'Backspace' || event.key === 'Delete') return 'ERASE';
  if (/^[a-zA-Z]$/.test(event.key)) return event.key.toUpperCase();
  if (event.key === '-' || event.key === "'") return event.key;
  return null;
};
