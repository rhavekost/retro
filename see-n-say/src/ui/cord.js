/**
 * The pull-cord. Drag the ring down past the threshold (or press it) and it
 * snaps back with a ratchet, firing `onPull`.
 */
const MAX_PULL = 130;
const TRIGGER_AT = 55;
/** Movement below this counts as a tap rather than a short drag. */
const TAP_SLOP = 8;

export const createCord = (root, onPull) => {
  const ring = root.querySelector('.cord__ring');
  const string = root.querySelector('.cord__string');

  let dragging = false;
  let startY = 0;
  let offset = 0;
  let locked = false;

  const render = () => {
    ring.style.transform = `translateY(${offset}px)`;
    string.style.height = `${70 + offset}px`;
  };

  const settle = (fired) => {
    root.classList.add('cord--returning');
    offset = 0;
    render();
    setTimeout(() => root.classList.remove('cord--returning'), 420);
    if (fired) onPull();
  };

  const begin = (clientY) => {
    if (locked) return;
    dragging = true;
    startY = clientY;
    root.classList.add('cord--dragging');
  };

  const move = (clientY) => {
    if (!dragging) return;
    offset = Math.max(0, Math.min(MAX_PULL, clientY - startY));
    render();
  };

  /** Plays the full pull animation, then fires. Used by taps and the keyboard. */
  const animatedPull = () => {
    if (locked) return;
    offset = MAX_PULL * 0.8;
    render();
    setTimeout(() => settle(true), 180);
  };

  const end = () => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('cord--dragging');

    if (offset >= TRIGGER_AT) {
      settle(true);
      return;
    }
    // A tap is a pull too — plenty of people click the ring instead of
    // dragging it, and silently doing nothing reads as broken.
    if (offset < TAP_SLOP) {
      animatedPull();
      return;
    }
    settle(false);
  };

  ring.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    ring.setPointerCapture(event.pointerId);
    begin(event.clientY);
  });
  ring.addEventListener('pointermove', (event) => move(event.clientY));
  ring.addEventListener('pointerup', end);
  ring.addEventListener('pointercancel', end);

  ring.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    animatedPull();
  });

  /** Plays the pull animation without user input — used by "Surprise me". */
  const autoPull = () => {
    if (locked) return;
    offset = MAX_PULL * 0.8;
    render();
    setTimeout(() => {
      root.classList.add('cord--returning');
      offset = 0;
      render();
      setTimeout(() => root.classList.remove('cord--returning'), 420);
    }, 200);
  };

  const setLocked = (value) => {
    locked = value;
    root.classList.toggle('cord--locked', value);
    ring.setAttribute('aria-disabled', String(value));
  };

  render();
  return { setLocked, autoPull };
};
