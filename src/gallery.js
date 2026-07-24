import { TOYS } from '../shared/data/toys.js';

const span = (className, text) => {
  const node = document.createElement('span');
  node.className = className;
  if (text) node.textContent = text;
  return node;
};

/**
 * Builds one decorative part of a thumbnail. A part is either a plain
 * class-name string, or `{ cls, children }` whose children nest inside
 * it (same shape, recursively) — no toy-specific class names here.
 */
const buildPart = (part) => {
  if (typeof part === 'string') {
    return span(part);
  }
  const node = span(part.cls);
  (part.children || []).forEach((child) => node.append(buildPart(child)));
  return node;
};

const buildThumb = (toy) => {
  const thumb = span(`thumb thumb--${toy.thumb}`);
  thumb.setAttribute('aria-hidden', 'true');
  toy.parts.forEach((part) => thumb.append(buildPart(part)));
  return thumb;
};

const buildCard = (toy) => {
  const item = document.createElement('li');
  item.className = 'card';

  const link = document.createElement('a');
  link.className = 'card__link';
  link.href = `${toy.slug}/`;

  const body = span('card__body');
  body.append(span('card__year', toy.year));
  body.append(span('card__title', toy.title));
  body.append(span('card__text', toy.blurb));
  body.append(span('card__tech', toy.tech));

  link.append(buildThumb(toy), body);
  item.append(link);
  return item;
};

const buildPlaceholder = () => {
  const item = document.createElement('li');
  item.className = 'card card--empty';
  const thumb = span('thumb thumb--empty', '?');
  thumb.setAttribute('aria-hidden', 'true');
  const body = span('card__body');
  body.append(span('card__title', 'More on the way'));
  body.append(
    span('card__text', 'Simon, Merlin, Lite-Brite, the Big Trak — the shelf is not full yet.')
  );
  item.append(thumb, body);
  return item;
};

const shelf = document.querySelector('#shelf');
TOYS.forEach((toy) => shelf.append(buildCard(toy)));
shelf.append(buildPlaceholder());
