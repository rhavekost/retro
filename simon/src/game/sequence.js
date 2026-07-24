/**
 * Simon's rules, with no knowledge of the DOM or the audio graph.
 *
 * Randomness arrives as an injected `rng` so every rule here is
 * deterministically testable; `Math.random` is wired in once, in main.js.
 */

export const COLORS = Object.freeze(['green', 'red', 'yellow', 'blue']);

/** Signals needed to win, per skill level, as on the original unit. */
export const WIN_LENGTHS = Object.freeze({ 1: 8, 2: 14, 3: 20, 4: 31 });

/** The unit speeds up as the sequence lengthens. */
export const intervalFor = (step) => {
  if (step <= 5) return 720;
  if (step <= 9) return 580;
  if (step <= 13) return 460;
  return 380;
};

export const createGame = ({ rng, level = 1 }) => {
  const winAt = WIN_LENGTHS[level] ?? WIN_LENGTHS[1];
  let sequence = [];
  let cursor = 0;
  let over = false;

  const extend = () => {
    sequence = [...sequence, COLORS[Math.floor(rng() * COLORS.length)]];
    cursor = 0;
    return sequence;
  };

  const press = (color) => {
    if (over) return { verdict: 'wrong', expected: sequence[cursor] };

    const expected = sequence[cursor];
    if (color !== expected) {
      over = true;
      return { verdict: 'wrong', expected };
    }

    cursor += 1;
    if (cursor < sequence.length) return { verdict: 'correct' };

    if (sequence.length >= winAt) {
      over = true;
      return { verdict: 'won' };
    }
    return { verdict: 'round-complete' };
  };

  const reset = () => {
    sequence = [];
    cursor = 0;
    over = false;
  };

  return {
    extend,
    press,
    reset,
    sequence: () => [...sequence],
    status: () => ({ length: sequence.length, level, winAt, over }),
  };
};
