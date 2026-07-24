/**
 * Vertical pointer-drag handling, shared by the See 'n Say cord, the Etch A
 * Sketch knobs and Lite-Brite's drag-to-paint.
 *
 * The tap/fire/cancel distinction matters: people click things that look like
 * buttons, and a handle that only responds to a long drag reads as broken.
 */

/** Distance travelled from `start` to `current`, clamped into range. */
export const clampOffset = (start, current, { min = 0, max = Infinity }) =>
  Math.max(min, Math.min(max, current - start));

/**
 * What a pointer release means.
 * - `fire`   travelled past the trigger — a deliberate pull
 * - `tap`    barely moved — treat a click as a full activation
 * - `cancel` moved a little but not enough — snap back, do nothing
 */
export const classifyRelease = (offset, { trigger, slop }) => {
  if (offset >= trigger) return 'fire';
  if (offset < slop) return 'tap';
  return 'cancel';
};

/**
 * Wires pointer events on `element`. `onMove` receives the clamped offset;
 * `onRelease` receives the classification.
 */
export const createDragHandle = (
  element,
  { max = Infinity, trigger = 55, slop = 8, onMove, onRelease },
) => {
  let dragging = false;
  let start = 0;
  let offset = 0;
  let locked = false;

  element.addEventListener('pointerdown', (event) => {
    if (locked) return;
    event.preventDefault();
    element.setPointerCapture?.(event.pointerId);
    dragging = true;
    start = event.clientY;
    offset = 0;
  });

  element.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    offset = clampOffset(start, event.clientY, { max });
    onMove?.(offset);
  });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    onRelease?.(classifyRelease(offset, { trigger, slop }), offset);
    offset = 0;
  };

  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);

  return {
    setLocked: (value) => {
      locked = value;
    },
  };
};
