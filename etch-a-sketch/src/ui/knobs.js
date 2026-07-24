/**
 * A knob you grab and turn. Rotation is measured from the knob's centre, so
 * the gesture works wherever on the knob you grab it.
 */
import { angleAt, rotationDelta, stepsFor } from '../model/knob.js';

const KEY_STEP = 6;

export const createKnob = (element, { pixelsPerTurn = 240, onTurn }) => {
  let turning = false;
  let lastAngle = 0;
  let rotation = 0;

  const centre = () => {
    const box = element.getBoundingClientRect();
    return { cx: box.left + box.width / 2, cy: box.top + box.height / 2 };
  };

  const render = () => {
    element.style.transform = `rotate(${rotation}deg)`;
  };

  element.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    element.setPointerCapture?.(event.pointerId);
    const { cx, cy } = centre();
    lastAngle = angleAt(cx, cy, event.clientX, event.clientY);
    turning = true;
    element.classList.add('knob--turning');
  });

  element.addEventListener('pointermove', (event) => {
    if (!turning) return;
    const { cx, cy } = centre();
    const angle = angleAt(cx, cy, event.clientX, event.clientY);
    const delta = rotationDelta(lastAngle, angle);
    lastAngle = angle;
    rotation += delta;
    render();
    onTurn(stepsFor(delta, { pixelsPerTurn }));
  });

  const release = () => {
    turning = false;
    element.classList.remove('knob--turning');
  };
  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);

  // Arrow keys turn the knob too, so the toy works without a pointer.
  element.addEventListener('keydown', (event) => {
    const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!direction) return;
    event.preventDefault();
    rotation += direction * KEY_STEP;
    render();
    onTurn(stepsFor(direction * KEY_STEP, { pixelsPerTurn }));
  });

  return { element };
};
