/**
 * Arithmetic problem generation.
 *
 * Two rules do the real work here and are easy to get wrong: division is
 * generated backwards from a known product so it is always exact, and
 * subtraction is ordered largest-first so a child is never handed a negative.
 */

export const OPS = Object.freeze(['+', '-', '*', '/']);

export const LEVELS = Object.freeze({
  1: { max: 5, ops: ['+'] },
  2: { max: 9, ops: ['+', '-'] },
  3: { max: 9, ops: ['+', '-', '*'] },
  4: { max: 12, ops: ['+', '-', '*', '/'] },
});

const WORD_FOR = Object.freeze({
  '+': 'plus',
  '-': 'minus',
  '*': 'times',
  '/': 'divided by',
});

/** Display glyphs the 14-segment font can actually draw. */
const GLYPH_FOR = Object.freeze({ '+': '+', '-': '-', '*': '*', '/': '/' });

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
/** Inclusive integer in [min, max]. */
const between = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

const settings = (level) => LEVELS[level] ?? LEVELS[1];

export const makeProblem = ({ rng, level = 1 }) => {
  const { max, ops } = settings(level);
  const op = pick(rng, ops);

  let left;
  let right;

  if (op === '/') {
    // Build from the quotient so the division comes out whole.
    right = between(rng, 1, max);
    const quotient = between(rng, 1, max);
    left = right * quotient;
  } else if (op === '-') {
    // Order the operands so the answer cannot go negative.
    const a = between(rng, 0, max);
    const b = between(rng, 0, max);
    left = Math.max(a, b);
    right = Math.min(a, b);
  } else {
    left = between(rng, 0, max);
    right = between(rng, 0, max);
  }

  const answer = { '+': left + right, '-': left - right, '*': left * right, '/': left / right }[op];

  return {
    left,
    op,
    right,
    answer,
    display: `${left}${GLYPH_FOR[op]}${right}=`,
    spoken: `${left} ${WORD_FOR[op]} ${right} equals?`,
  };
};

export const makeComparison = ({ rng, level = 2 }) => {
  const { max } = settings(level);
  const left = between(rng, 0, max * 2);
  // Bias towards near-misses so equality actually turns up.
  const drift = between(rng, 0, 2) - 1;
  const right = Math.max(0, left + drift);
  const relation = left < right ? '<' : left > right ? '>' : '=';
  return { left, right, relation };
};

export const makeStumper = ({ rng, level = 3 }) => {
  const problem = makeProblem({ rng, level });
  const { left, op, right, answer } = problem;

  // Blank the left operand or the right one, never the result.
  const hideLeft = rng() < 0.5;
  return {
    display: hideLeft
      ? `?${GLYPH_FOR[op]}${right}=${answer}`
      : `${left}${GLYPH_FOR[op]}?=${answer}`,
    answer: hideLeft ? left : right,
    spoken: hideLeft
      ? `What ${WORD_FOR[op]} ${right} equals ${answer}?`
      : `${left} ${WORD_FOR[op]} what equals ${answer}?`,
  };
};
