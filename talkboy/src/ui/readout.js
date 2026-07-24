/**
 * The two things in the little window above the keys: the three-digit tape
 * counter and the record-level meter.
 */

/** Tape counters never counted seconds — they counted spool turns. */
const COUNTS_PER_SECOND = 33;

export const createCounter = (mount) => {
  const digits = [0, 1, 2].map(() => {
    const cell = document.createElement('span');
    cell.className = 'counter__digit';
    cell.textContent = '0';
    mount.appendChild(cell);
    return cell;
  });

  const update = (position) => {
    const value = Math.min(999, Math.round(position * COUNTS_PER_SECOND));
    const text = String(value).padStart(3, '0');
    digits.forEach((cell, index) => {
      if (cell.textContent === text[index]) return;
      cell.textContent = text[index];
      // Retrigger the roll animation on the digit that actually moved.
      cell.classList.remove('counter__digit--rolling');
      void cell.offsetWidth;
      cell.classList.add('counter__digit--rolling');
    });
  };

  update(0);
  return { update };
};

export const createMeter = (mount, segments = 12) => {
  const bars = Array.from({ length: segments }, (_, index) => {
    const bar = document.createElement('span');
    bar.className = 'meter__seg';
    if (index >= segments - 3) bar.classList.add('meter__seg--hot');
    else if (index >= segments - 5) bar.classList.add('meter__seg--warm');
    mount.appendChild(bar);
    return bar;
  });

  let shown = 0;

  const update = (level) => {
    // Fast attack, slow decay — the way a real VU needle behaves.
    shown = level > shown ? level : shown * 0.86 + level * 0.14;
    const lit = Math.round(shown * segments);
    bars.forEach((bar, index) => bar.classList.toggle('meter__seg--on', index < lit));
  };

  return { update };
};
