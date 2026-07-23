# retro

Browser recreations of classic electronic toys, built with no dependencies and
no build step — plain ES modules, SVG, Web Audio and the Web Speech API.

Live at **<https://rhavekost.github.io/retro/>**.

The root page is a gallery; each toy lives in its own directory and is entirely
self-contained apart from the shared audio primitives.

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

## Running it

```bash
python3 -m http.server 8137
```

Then open <http://localhost:8137>. Any static server works; ES modules need
HTTP, so opening `index.html` from the filesystem will not work.

## Layout

```
index.html              the gallery
styles/gallery.css      gallery styling; the thumbnails are pure CSS
speak-and-spell/
  src/display/          14-segment geometry + the 8-cell VFD
  src/game/             machine.js routes keys; modes/ holds the four games
  src/audio/            voice.js (speech), beeps.js (blips)
  src/ui/keypad.js      membrane keypad + physical-keyboard mapping
  src/data/words.js     spelling lists, levels A–D
see-n-say/              the pull-cord wheel, self-contained
shared/audio/           AudioContext + synthesis primitives, used by both toys
```

## Adding another toy

Create a directory, drop an `index.html` in it, import anything you need from
`../shared/audio/`, and add a card to the root `index.html`. Keep every path
relative — GitHub Pages serves this project from a subpath, so absolute paths
starting with `/` will break.

## Notes

- Audio starts on the first keypress — browsers block it before a user gesture.
- Segment shapes for `B`, `V` and `X` are the usual 14-segment compromises;
  some letters simply cannot be drawn exactly with fourteen bars.
- Both toys degrade gracefully: without Web Audio or speech synthesis they
  still play, silently, with a notice explaining what is missing.
```
