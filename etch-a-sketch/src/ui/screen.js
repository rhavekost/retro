/**
 * The aluminium-powder screen. Segments are stroked immediately; the shake
 * fades the field back rather than clearing it in one frame, because powder
 * settles.
 */
const LINE = '#4b4f52';
const FIELD = '#c8c9c3';

export const createScreen = (canvas, { width, height }) => {
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.aspectRatio = `${width} / ${height}`;
  ctx.scale(ratio, ratio);

  const fill = () => {
    ctx.fillStyle = FIELD;
    ctx.fillRect(0, 0, width, height);
  };

  fill();
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = LINE;

  const drawSegment = ({ from, to }) => {
    if (from.x === to.x && from.y === to.y) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  /** Fades the drawing away over ~12 frames, the way powder resettles. */
  const shake = () =>
    new Promise((resolve) => {
      let frames = 0;
      const step = () => {
        ctx.fillStyle = 'rgba(200, 201, 195, 0.22)';
        ctx.fillRect(0, 0, width, height);
        frames += 1;
        if (frames < 14) {
          requestAnimationFrame(step);
          return;
        }
        fill();
        resolve();
      };
      requestAnimationFrame(step);
    });

  return { drawSegment, shake, dimensions: () => ({ width, height }) };
};
