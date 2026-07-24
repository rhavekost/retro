# retro

Browser recreations of classic electronic toys, built with no dependencies and
no build step — plain ES modules, SVG, Web Audio and the Web Speech API.

Live at **<https://rhavekost.github.io/retro/>**.

The root page is a gallery; each toy lives in its own directory and draws on a
shared layer for audio, display, UI components, and styling.

## Speak & Spell (`/speak-and-spell/`)

A tribute to the 1978 Texas Instruments original.

- **Eight-character 14-segment VFD**, drawn as SVG with a per-character segment
  map and a right-to-left scroll for anything longer than eight characters.
- **Four games**, all faithful to the original's function keys:
  - `SPELL` — ten words, two attempts each, and it recites the correct spelling
    letter by letter when you run out. Scored at the end of the round.
  - `MYSTERY WORD` — hangman, six misses.
  - `LETTER` — it calls out a letter, you find it on the keypad.
  - `SECRET CODE` — type a word, it shows a shifted cipher, someone else decodes it.
- **Four difficulty levels** (A–D), standing in for the swappable cartridges.
- `CLUE`, `SAY IT`, `REPEAT`, `REPLAY`, `ERASE`, `ENTER`, and a real `OFF` that
  cuts the voice off mid-sentence.
- Your physical keyboard drives the membrane keys: letters, Enter, Backspace.

The voice is speech synthesis pushed slow and low. It gets to the right
monotone neighbourhood but it is not LPC-10 — nothing in a browser is.

## See 'n Say (`/see-n-say/`)

The pull-cord animal wheel. Aim the arrow at a wedge, drag the orange ring
down, and it announces the animal and makes the sound.

Every animal sound is **synthesized at runtime** — no audio files. Each of the
twelve is an oscillator recipe in `see-n-say/src/audio/voices.js`: the cow is a
sawtooth gliding 150→92 Hz under a lowpass, the bee is a 42 Hz tremolo on a
bandpassed saw, the lion is filtered brown noise over a detuned growl.

## Talkboy (`/talkboy/`)

The 1992 Tiger Electronics handheld from *Home Alone 2*. Press `REC`, talk, then
flick the speed switch to **Slow** and hit `PLAY`.

- **A real tape.** One 30-second mono buffer that recordings are written into
  *in place*. Recording over the middle of something wipes only that part, and
  the head position survives stop, rewind and fast-forward.
- **Slow playback is not a pitch shifter.** It is an `AudioBufferSourceNode`
  running at 0.62×, so speed and pitch drop together exactly the way tape does.
  `Fast` runs at 1.55×.
- **The mechanism is synthesized too** — piano-key thunks, the spool motor
  during shuttle, and tape hiss that rides under playback and brightens with
  speed.
- The reels spool at the right relative rates: the take-up reel is fat and slow
  while the supply reel gets thin and frantic, because angular speed is linear
  speed over pack radius.
- Live VU meter, three-digit tape counter, and a strip showing where on the
  tape your recordings actually sit.
- The case is drawn to match the real Deluxe: silver, keys on the top edge, the
  round porthole, the speaker on the wedge end, the fold-out carry handle. The
  telescoping microphone slides out of the top-right corner while you record.

Recording needs microphone permission. Nothing is uploaded — the audio never
leaves the page, and the tape is gone when you close the tab.

## Running it

```bash
python3 -m http.server 8138
```

Then open <http://localhost:8138>. Any static server works; ES modules need
HTTP, so opening `index.html` from the filesystem will not work. The Talkboy
also needs a secure context for the microphone — `localhost` counts, as does
the GitHub Pages URL.

## Layout

```
index.html              the gallery (rendered from shared/data/toys.js)
src/gallery.js          builds the shelf
styles/gallery.css      gallery styling; the thumbnails are pure CSS
test/                   node --test specs for pure logic
speak-and-spell/        the spelling console
see-n-say/              the pull-cord wheel
talkboy/                the cassette recorder
shared/
  audio/                AudioContext, synthesis primitives, beeps
  display/              14-segment geometry + the N-cell display
  ui/                   keypad (layout-driven), drag handle
  data/toys.js          the gallery manifest
  styles/               design tokens + the "all toys" pill
```

## Adding another toy

1. Create a directory with an `index.html`.
2. Link `../shared/styles/tokens.css` first, then `../shared/styles/frame.css`,
   your toy's stylesheets, and `../shared/styles/backlink.css` last. Paste in
   the back-link anchor.
3. Import what you need from `../shared/` — don't fork it.
4. Add an entry to `shared/data/toys.js` and a `.thumb--<name>` rule in
   `styles/gallery.css`.
5. Put pure logic in modules that never touch `window` or `document`, and add
   a spec under `test/`. Run `npm test`.

Keep every path relative — GitHub Pages serves this project from a subpath, so
absolute paths starting with `/` will break.

## Notes

- Audio starts on the first keypress — browsers block it before a user gesture.
- Segment shapes for `B`, `V` and `X` are the usual 14-segment compromises;
  some letters simply cannot be drawn exactly with fourteen bars.
- Both toys degrade gracefully: without Web Audio or speech synthesis they
  still play, silently, with a notice explaining what is missing.
```
