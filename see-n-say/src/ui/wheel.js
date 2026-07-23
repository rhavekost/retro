/**
 * Renders the twelve-wedge dial as SVG and owns the pointer's rotation.
 * Angles are degrees clockwise from 12 o'clock, matching the animal data.
 */
import { ANIMALS, WEDGE_DEGREES, wedgeAngle } from '../data/animals.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CENTER = 200;
const OUTER_RADIUS = 190;
const INNER_RADIUS = 52;
const GLYPH_RADIUS = 118;
const LABEL_RADIUS = 168;

const toPoint = (angleDeg, radius) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
};

/** Donut-segment path spanning one wedge. */
const wedgePath = (index) => {
  const start = wedgeAngle(index) - WEDGE_DEGREES / 2;
  const end = start + WEDGE_DEGREES;
  const [ox1, oy1] = toPoint(start, OUTER_RADIUS);
  const [ox2, oy2] = toPoint(end, OUTER_RADIUS);
  const [ix2, iy2] = toPoint(end, INNER_RADIUS);
  const [ix1, iy1] = toPoint(start, INNER_RADIUS);

  return [
    `M ${ox1} ${oy1}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
};

const el = (name, attrs = {}, text = null) => {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  if (text !== null) node.textContent = text;
  return node;
};

/**
 * Builds the dial inside `mount`.
 * @param {HTMLElement} mount
 * @param {(index: number) => void} onSelect fired when a wedge is activated
 */
export const createWheel = (mount, onSelect) => {
  const svg = el('svg', {
    viewBox: '0 0 400 400',
    class: 'wheel',
    role: 'radiogroup',
    'aria-label': 'Pick an animal',
  });

  const wedgesLayer = el('g', { class: 'wheel__wedges' });
  const wedgeNodes = [];

  ANIMALS.forEach((animal, index) => {
    const group = el('g', {
      class: `wedge wedge--${animal.color}`,
      role: 'radio',
      tabindex: index === 0 ? '0' : '-1',
      'aria-checked': 'false',
      'aria-label': animal.label,
      'data-index': index,
    });

    group.append(el('path', { d: wedgePath(index), class: 'wedge__face' }));

    const [gx, gy] = toPoint(wedgeAngle(index), GLYPH_RADIUS);
    group.append(el('text', { x: gx, y: gy, class: 'wedge__glyph' }, animal.glyph));

    const angle = wedgeAngle(index);
    const [lx, ly] = toPoint(angle, LABEL_RADIUS);
    // Labels run tangentially. On the bottom half that would read upside down,
    // so flip them and they stay legible all the way around.
    const flipped = angle > 90 && angle < 270;
    group.append(
      el(
        'text',
        {
          x: lx,
          y: ly,
          class: 'wedge__label',
          transform: `rotate(${flipped ? angle + 180 : angle} ${lx} ${ly})`,
        },
        animal.label.toUpperCase(),
      ),
    );

    group.addEventListener('click', () => onSelect(index));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(index);
      }
    });

    wedgesLayer.append(group);
    wedgeNodes.push(group);
  });

  svg.append(wedgesLayer);

  // Hub and pointer sit above the wedges.
  const pointer = el('g', { class: 'pointer' });
  pointer.append(
    el('path', {
      class: 'pointer__arrow',
      d: `M ${CENTER} 34 L ${CENTER + 21} 92 L ${CENTER + 8} 92 L ${CENTER + 8} 200
          L ${CENTER - 8} 200 L ${CENTER - 8} 92 L ${CENTER - 21} 92 Z`,
    }),
  );
  svg.append(pointer);

  svg.append(el('circle', { cx: CENTER, cy: CENTER, r: 34, class: 'hub' }));
  svg.append(el('circle', { cx: CENTER, cy: CENTER, r: 12, class: 'hub__pin' }));

  mount.append(svg);

  // An unbounded angle, so the arrow sweeps smoothly instead of snapping
  // through 0°. Each move takes the shortest arc; `extraTurns` forces the
  // showy multi-rotation spin used by "Surprise me".
  let currentAngle = 0;

  const pointAt = (index, { extraTurns = 0 } = {}) => {
    const target = wedgeAngle(index);
    let delta = (((target - currentAngle) % 360) + 360) % 360;
    if (delta > 180) delta -= 360;
    currentAngle += delta + extraTurns * 360;

    pointer.style.transform = `rotate(${currentAngle}deg)`;
    wedgeNodes.forEach((node, i) => {
      node.setAttribute('aria-checked', i === index ? 'true' : 'false');
      node.setAttribute('tabindex', i === index ? '0' : '-1');
      node.classList.toggle('wedge--active', i === index);
    });
  };

  const focusWedge = (index) => wedgeNodes[index]?.focus();

  const setSpinning = (spinning) => svg.classList.toggle('wheel--spinning', spinning);

  return { pointAt, focusWedge, setSpinning, element: svg };
};
