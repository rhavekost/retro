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
]);
