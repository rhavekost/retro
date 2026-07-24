/**
 * The gallery shelf. Adding a toy means adding an entry here and a
 * `.thumb--<thumb>` rule in styles/gallery.css — nothing else.
 *
 * `parts` describes the decorative spans a thumbnail needs, in order.
 * Each part is either a plain class-name string, or an object
 * `{ cls, children }` whose children (same shape) nest inside it.
 */
export const TOYS = Object.freeze([
  {
    slug: 'speak-and-spell',
    title: 'Speak & Spell',
    year: '1978',
    blurb:
      'Ten words, two tries each, and it recites the correct spelling letter by letter when you miss. Plus Mystery Word, Letter and Secret Code.',
    tech: 'SVG 14-segment VFD · speech synthesis · 4 difficulty levels',
    thumb: 'sns',
    parts: ['thumb__handle', 'thumb__screen', 'thumb__panel'],
  },
  {
    slug: 'see-n-say',
    title: "See 'n Say",
    year: '1965',
    blurb:
      'Aim the arrow, pull the cord, and the farmer tells you what the cow says. Twelve animals on a spring-loaded dial.',
    tech: 'Web Audio synthesis · zero audio files · drag-to-pull cord',
    thumb: 'wheel',
    parts: ['thumb__dial', 'thumb__pointer', 'thumb__hub'],
  },
  {
    slug: 'talkboy',
    title: 'Talkboy',
    year: '1992',
    blurb:
      'Record thirty seconds onto the tape, then flick the switch and play yourself back at half speed. The reels really spool.',
    tech: 'Live mic recording · tape-speed pitch shift · synthesized deck noise',
    thumb: 'tape',
    parts: [
      'thumb__keys',
      'thumb__slots',
      { cls: 'thumb__porthole', children: ['thumb__reel'] },
    ],
  },
  {
    slug: 'speak-and-math',
    title: 'Speak & Math',
    year: '1980',
    blurb:
      'The same red console asking arithmetic instead of spelling. Solve It, greater-or-less, and equations with a number missing.',
    tech: 'Shared VFD and console machine · exact-division generator',
    thumb: 'snm',
    parts: ['thumb__handle', 'thumb__screen', 'thumb__panel'],
  },
  {
    slug: 'simon',
    title: 'Simon',
    year: '1978',
    blurb:
      'Watch the lights, repeat the sequence, watch it get one longer. Four tones chosen to be consonant, so it never sounds wrong.',
    tech: 'Deterministic rule engine · Web Audio tones · four skill levels',
    thumb: 'simon',
    parts: ['thumb__disc', 'thumb__hub'],
  },
  {
    slug: 'etch-a-sketch',
    title: 'Etch A Sketch',
    year: '1960',
    blurb:
      'Two knobs, one line, and no way to lift the pen. Shake the whole thing to start over.',
    tech: 'Canvas · knob rotation maths · powder-settle erase',
    thumb: 'etch',
    parts: ['thumb__etch-screen', 'thumb__etch-knob thumb__etch-knob--left', 'thumb__etch-knob thumb__etch-knob--right'],
  },
  {
    slug: 'lite-brite',
    title: 'Lite-Brite',
    year: '1967',
    blurb:
      'Eight colours of glowing peg on a black field. Your picture lives in the URL, so you can send it to someone.',
    tech: 'Run-length codec · drag-to-paint · CSS bloom',
    thumb: 'brite',
    parts: ['thumb__brite-paper'],
  },
]);
