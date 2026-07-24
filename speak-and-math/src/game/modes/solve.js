/**
 * SOLVE IT — ten problems, two attempts each, scored at the end.
 */
import { makeProblem } from '../../data/problems.js';

const ROUND_LENGTH = 10;

export const createSolveMode = (io, { level, rng = Math.random }) => {
  let problem = null;
  let asked = 0;
  let attempts = 0;
  let score = 0;
  let buffer = '';

  const ask = async () => {
    problem = makeProblem({ rng, level });
    attempts = 0;
    buffer = '';
    asked += 1;
    await io.announce(problem.display, { speech: problem.spoken });
    io.showTyping('');
  };

  const finish = async () => {
    await io.celebrate(`YOU GOT ${score} RIGHT OUT OF ${ROUND_LENGTH}`);
    await io.show('SOLVE OR GO');
  };

  const submit = async () => {
    if (buffer.length === 0) return;
    const given = Number.parseInt(buffer, 10);

    if (given === problem.answer) {
      score += 1;
      await io.correct('THAT IS CORRECT');
      if (asked >= ROUND_LENGTH) {
        await finish();
        return;
      }
      await ask();
      return;
    }

    attempts += 1;
    buffer = '';
    if (attempts < 2) {
      await io.wrong('TRY AGAIN');
      io.showTyping('');
      return;
    }

    await io.wrong('THAT IS INCORRECT');
    await io.announce(`${problem.display}${problem.answer}`, {
      speech: `The answer is ${problem.answer}`,
    });
    await io.wait(500);
    if (asked >= ROUND_LENGTH) {
      await finish();
      return;
    }
    await ask();
  };

  return {
    id: 'SOLVE',

    async start() {
      asked = 0;
      score = 0;
      await io.announce('SOLVE IT', { speech: 'Solve it.' });
      await ask();
    },

    async replay() {
      await this.start();
    },

    handleInput(code) {
      if (/^[0-9]$/.test(code)) {
        if (buffer.length < 6) {
          buffer += code;
          io.showTyping(buffer);
        }
        return true;
      }
      if (code === 'ERASE') {
        buffer = buffer.slice(0, -1);
        io.showTyping(buffer);
        return true;
      }
      return false;
    },

    async handleKey(code) {
      if (code === 'ENTER') {
        await submit();
        return;
      }
      if (code === 'REPEAT' || code === 'SAYIT') {
        await io.say(problem.spoken);
      }
    },
  };
};
