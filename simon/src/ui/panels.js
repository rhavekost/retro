/**
 * The four quadrants. Each is an SVG wedge; lighting one just toggles a class
 * so the glow is CSS's problem, not JavaScript's.
 */
import { COLORS } from '../game/sequence.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CENTER = 200;
const OUTER = 190;
const INNER = 74;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const point = (angleDeg, radius) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
};

/** A quarter-ring with a 2° gap on each side so the quadrants read as separate. */
const quadrantPath = (index) => {
  const start = index * 90 + 2;
  const end = start + 86;
  const [ox1, oy1] = point(start, OUTER);
  const [ox2, oy2] = point(end, OUTER);
  const [ix2, iy2] = point(end, INNER);
  const [ix1, iy1] = point(start, INNER);
  return [
    `M ${ox1} ${oy1}`,
    `A ${OUTER} ${OUTER} 0 0 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${INNER} ${INNER} 0 0 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
};

export const createPanels = (mount, { onPress }) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 400 400');
  svg.setAttribute('class', 'simon');

  const nodes = new Map();
  let interactive = false;

  COLORS.forEach((color, index) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', quadrantPath(index));
    path.setAttribute('class', `quadrant quadrant--${color}`);
    path.setAttribute('role', 'button');
    path.setAttribute('tabindex', '0');
    path.setAttribute('aria-label', color);

    const fire = () => {
      if (interactive) onPress(color);
    };
    path.addEventListener('click', fire);
    path.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      fire();
    });

    svg.append(path);
    nodes.set(color, path);
  });

  const hub = document.createElementNS(SVG_NS, 'circle');
  hub.setAttribute('cx', CENTER);
  hub.setAttribute('cy', CENTER);
  hub.setAttribute('r', INNER - 8);
  hub.setAttribute('class', 'simon__hub');
  svg.append(hub);

  mount.append(svg);

  const light = async (color, ms = 320) => {
    const node = nodes.get(color);
    if (!node) return;
    node.classList.add('quadrant--lit');
    await wait(ms);
    node.classList.remove('quadrant--lit');
  };

  const flashAll = async (times = 3) => {
    for (let i = 0; i < times; i += 1) {
      nodes.forEach((node) => node.classList.add('quadrant--lit'));
      await wait(140);
      nodes.forEach((node) => node.classList.remove('quadrant--lit'));
      await wait(140);
    }
  };

  const setInteractive = (value) => {
    interactive = value;
    svg.classList.toggle('simon--live', value);
  };

  return { light, flashAll, setInteractive };
};
