/**
 * Everything a game mode needs to talk to the hardware: show text, speak,
 * beep. Display and speech run together so the scroll and the voice line up.
 */
import { say, spellOut, repeatLast } from '../audio/voice.js';
import { correctBeep, wrongBeep, fanfare } from '../audio/beeps.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createConsole = (display) => ({
  display,

  /** Scrolls `text` while speaking it; resolves when both are done. */
  async announce(text, { speech = text, hold = 0 } = {}) {
    await Promise.all([display.show(text), speech ? say(speech) : Promise.resolve()]);
    if (hold) await wait(hold);
  },

  /** Shows text without speaking. */
  async show(text, { hold = 0 } = {}) {
    await display.show(text);
    if (hold) await wait(hold);
  },

  /** Speaks without changing the display. */
  say,

  /** Recites a word letter by letter, showing it as it goes. */
  async spellOut(word) {
    display.showTyping(word.toUpperCase());
    await spellOut(word);
  },

  repeatLast,

  showTyping: (text) => display.showTyping(text),

  async correct(text = 'THAT IS CORRECT') {
    await correctBeep();
    await this.announce(text);
  },

  async wrong(text = 'WRONG TRY AGAIN') {
    await wrongBeep();
    await display.flash(2, 140);
    await this.announce(text);
  },

  async celebrate(text) {
    await fanfare();
    await this.announce(text);
  },

  wait,
});
