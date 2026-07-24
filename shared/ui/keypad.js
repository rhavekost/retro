/**
 * A membrane keypad rendered from a layout descriptor. The layout lives with
 * the toy that owns it; this module only knows how to draw and wire keys.
 */

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
 * @param {HTMLElement} mount
 * @param {{rows: Array<{className: string, keys: Array}>, onPress: (code: string) => void}} options
 */
export const createKeypad = (mount, { rows, onPress }) => {
  const keysByCode = new Map();

  rows.forEach((row) => {
    const element = document.createElement('div');
    element.className = `keyrow ${row.className}`;
    row.keys.forEach((spec) => {
      const key = makeKey(spec, onPress);
      element.append(key);
      keysByCode.set(spec.code, key);
    });
    mount.append(element);
  });

  const flashKey = (code) => {
    const key = keysByCode.get(code);
    if (!key) return;
    key.classList.add('key--pressed');
    setTimeout(() => key.classList.remove('key--pressed'), 130);
  };

  // 'ON' stays live even when the rest of the board is disabled, otherwise
  // there is no way to wake the toy up.
  const setDisabled = (disabled) => {
    keysByCode.forEach((key, code) => {
      key.disabled = disabled && code !== 'ON';
    });
  };

  const keyFor = (code) => keysByCode.get(code) ?? null;

  return { flashKey, setDisabled, keyFor };
};

/** Maps a physical keyboard event to a keypad code, or null. */
export const codeForKeyboardEvent = (event, { letters = true, digits = false } = {}) => {
  if (event.key === 'Enter') return 'ENTER';
  if (event.key === 'Backspace' || event.key === 'Delete') return 'ERASE';
  if (letters && /^[a-zA-Z]$/.test(event.key)) return event.key.toUpperCase();
  if (digits && /^[0-9]$/.test(event.key)) return event.key;
  if (event.key === '-' || event.key === "'") return event.key;
  return null;
};
