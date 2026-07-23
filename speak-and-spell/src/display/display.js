/**
 * The eight-character vacuum-fluorescent display.
 *
 * Anything longer than eight characters scrolls right-to-left, exactly like
 * the original does with "THAT IS CORRECT".
 */
import { CELL_WIDTH, CELL_HEIGHT, SEGMENT_SHAPES, SEGMENT_ORDER, segmentsFor } from './segments.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
export const CELL_COUNT = 8;

const CELL_GAP = 22;
const SCROLL_MS = 260;

const buildCell = (index) => {
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('transform', `translate(${index * (CELL_WIDTH + CELL_GAP)} 0)`);

  const segments = {};
  SEGMENT_ORDER.forEach((name) => {
    const shape = document.createElementNS(SVG_NS, 'polygon');
    shape.setAttribute('points', SEGMENT_SHAPES[name]);
    shape.setAttribute('class', 'seg');
    group.append(shape);
    segments[name] = shape;
  });

  return { group, segments };
};

export const createDisplay = (mount) => {
  const width = CELL_COUNT * CELL_WIDTH + (CELL_COUNT - 1) * CELL_GAP;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `-8 -8 ${width + 16} ${CELL_HEIGHT + 16}`);
  svg.setAttribute('class', 'vfd__grid');
  svg.setAttribute('role', 'img');

  const cells = [];
  for (let i = 0; i < CELL_COUNT; i += 1) {
    const cell = buildCell(i);
    svg.append(cell.group);
    cells.push(cell);
  }
  mount.append(svg);

  let scrollTimer = null;
  let currentText = '';
  // Resolver for an in-flight scroll, so a superseded message can settle
  // instead of leaving its caller awaiting a promise that never lands.
  let pendingScroll = null;

  const paint = (text) => {
    const padded = text.padEnd(CELL_COUNT, ' ').slice(0, CELL_COUNT);
    cells.forEach((cell, index) => {
      const lit = new Set(segmentsFor(padded[index]));
      SEGMENT_ORDER.forEach((name) => {
        cell.segments[name].classList.toggle('seg--on', lit.has(name));
      });
    });
    svg.setAttribute('aria-label', `Display reads ${text.trim() || 'blank'}`);
  };

  const stopScrolling = () => {
    if (scrollTimer) clearInterval(scrollTimer);
    scrollTimer = null;
    if (pendingScroll) {
      const resolve = pendingScroll;
      pendingScroll = null;
      resolve();
    }
  };

  /**
   * Shows `text`. Long strings scroll once, then hold on the final frame.
   * Resolves when the scroll finishes so callers can sequence messages.
   */
  const show = (text) =>
    new Promise((resolve) => {
      stopScrolling();
      currentText = String(text).toUpperCase();

      if (currentText.length <= CELL_COUNT) {
        paint(currentText);
        resolve();
        return;
      }

      // Lead in from the right edge and run off to the left.
      const runway = ' '.repeat(CELL_COUNT) + currentText + ' '.repeat(2);
      let offset = 0;
      paint(runway.slice(0, CELL_COUNT));
      pendingScroll = resolve;

      scrollTimer = setInterval(() => {
        offset += 1;
        if (offset > runway.length - CELL_COUNT) {
          paint(currentText.slice(-CELL_COUNT));
          stopScrolling();
          return;
        }
        paint(runway.slice(offset, offset + CELL_COUNT));
      }, SCROLL_MS);
    });

  /** Right-anchored, for text being typed in. */
  const showTyping = (text) => {
    stopScrolling();
    currentText = String(text).toUpperCase();
    paint(currentText.length > CELL_COUNT ? currentText.slice(-CELL_COUNT) : currentText);
  };

  const clear = () => {
    stopScrolling();
    currentText = '';
    paint('');
  };

  /** Flashes the current contents — used for a wrong answer. */
  const flash = async (times = 3, interval = 180) => {
    const text = currentText;
    for (let i = 0; i < times; i += 1) {
      paint('');
      await new Promise((r) => setTimeout(r, interval));
      paint(text.slice(0, CELL_COUNT));
      await new Promise((r) => setTimeout(r, interval));
    }
  };

  const setPowered = (on) => {
    svg.classList.toggle('vfd__grid--off', !on);
    if (!on) clear();
  };

  clear();
  return { show, showTyping, clear, flash, setPowered, stopScrolling };
};
