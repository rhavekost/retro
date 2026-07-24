# Shared Foundations — progress ledger

Plan: docs/superpowers/plans/2026-07-23-shared-foundations.md
Branch: shared-foundations
Base: 77911a2

Pre-flight fix: Task 8 Step 3 said to delete each toy's `body` rule, which would
have destroyed per-toy backgrounds and contradicted Step 4. Corrected in plan.

## Tasks
Task 1: complete (commits 9a014de..9108918, review clean)
  - Reviewer ❌ on exact package.json value: plan mandated `node --test test/`,
    which the reviewer empirically verified FAILS on Node 22.23.1 (treats `test`
    as a literal file, MODULE_NOT_FOUND). Implementer's `test/*.test.js` is
    correct and necessary. Resolved by correcting the PLAN, not the code.
Task 2: complete (commit 2ca6b47, re-review clean)
  - Reviewer caught commit-scope creep: `git add -A` swept a CONCURRENT
    SESSION's in-progress Talkboy gallery work (index.html, styles/gallery.css,
    talkboy/styles/deck.css) into the commit. Controller split it; that work is
    back in the working tree, uncommitted, untouched.
  - Root cause removed: all 5 plans now stage explicit paths + carry a
    "never git add -A" global constraint.
  - NOTE FOR TASKS 7 & 8: they modify index.html, talkboy/index.html and the
    toy base.css files — the same files the concurrent session is editing.
    Surface the conflict before dispatching those.
Task 3: complete (commit 10572d3, review clean)
  - Reviewer confirmed all 8 CELL_COUNT sites parameterised; caught the
    deliberate cells->cellElements rename avoiding parameter shadowing.
  - Browser verification note: the dev server's module cache serves STALE
    main.js on plain reload. A fresh dynamic import executes correctly.
    Verify with import('./src/main.js?p='+Date.now()), not reload.
Task 4: complete (commit 0d3053e, review clean)
Task 5: complete (commit 4cb960b, review clean — Approved)
  - OPEN, needs human decision (Important, plan-mandated):
    shared/ui/keypad.js setDisabled() hardcodes `code !== 'ON'`. My brief
    mandated it verbatim, but it contradicts the task's own goal of a
    toy-agnostic component. Speak & Math's planned layout happens to use
    'ON' too, so it works today; still latent. Fix belongs in the interface
    (alwaysEnabled predicate or an `alwaysOn` field on the key spec).
  - Minor: layout.js exports FUNCTION_KEYS which nothing outside consumes.
Task 6: complete (commit e0c4f96, review clean — Approved)
  - Implementer subagent was killed mid-task by a session limit after writing
    code+tests but before verifying/committing. Controller finished it.
  - TDD evidence incomplete: RED was never captured. drag.js did not exist at
    237218f so the failure was mechanically certain, but nobody observed it.
  - OPEN, needs human decision (Important, plan-mandated):
    test/drag.test.js boundary tests miss the actual boundaries — 'the slop
    boundary counts as a tap' asserts offset 7, not slop (8); 'a release past
    the trigger fires' asserts 90, not trigger (55). Code is correct at both
    edges; nothing would catch a future `<` -> `<=` slip.
  - Minor: createDragHandle has no consumer or coverage until Etch A Sketch;
    setLocked(true) mid-drag does not abort an in-flight drag (undefined by
    the brief — decide when the first consumer lands).

## BLOCKED: Tasks 7 & 8 vs the concurrent session
Tasks 7 (tokens) and 8 (frame) must edit index.html, talkboy/index.html and the
toy base.css files. The concurrent session currently has these dirty and
uncommitted: README.md, index.html, styles/gallery.css, talkboy/index.html,
talkboy/src/main.js, talkboy/styles/base.css, talkboy/styles/deck.css.
Direct overlap on index.html, talkboy/index.html, talkboy/styles/base.css.
Editing them now risks clobbering that work. Needs the human to land or park it.

(RESOLVED — shared-foundations merged to main through commit fe94356. All
tasks above complete. This file continues below for the next plan.)

---

# Speak & Math — progress ledger

Plan: docs/superpowers/plans/2026-07-23-speak-and-math.md
Branch: speak-and-math
Base: fe94356 (= main)

Pre-flight fix, applied before Task 1: the two open foundation findings this
plan builds on.
  - shared/ui/keypad.js setDisabled() hardcoded `code !== 'ON'`. Replaced with
    an `alwaysOn` field on the key spec, collected into a set at keypad
    creation. speak-and-spell/src/ui/layout.js's ON key now carries
    `alwaysOn: true`. Verified live: Speak & Spell powers on/off correctly,
    no console errors.
  - test/drag.test.js asserted offsets 7 and 90, not the real
    classifyRelease boundaries (slop=8, trigger=55). Tightened to the exact
    edges (55 -> fire, 8 -> cancel), so a future `<` -> `<=` slip would be
    caught. npm test: 14/14 passing.
  - Committed as f597424 before dispatching Task 1.

Pre-flight plan scan:
  - Task 2 Step 6 says `git add -A`, contradicting this plan's own Global
    Constraint ("Never run git add -A"). Corrected in the dispatch to
    explicit paths (shared/game/machine.js, shared/game/console.js,
    shared/audio/voice.js, speak-and-spell/src/main.js).
  - Task 4's SPEAK_AND_MATH_ROWS gives the ON key as
    `{ code: 'ON', label: 'ON', tone: 'blue' }` with no `alwaysOn` — written
    before the keypad fix above existed. Implementer instructed to add
    `alwaysOn: true` to that key, matching speak-and-spell's layout.
  - Task 6 (gallery integration) — per hard-won lesson, skipped for the
    implementer; controller does all three toys' gallery integration itself
    at the very end to avoid the shared-file conflict that bit foundations.
  - Task 2's Files list says modes/*.js need import-path changes, but Step 4
    says no changes are needed there — plan self-contradiction, no action
    needed (Step 4 governs, it's the concrete instruction).

## Tasks
Task 1: complete (commits f597424..b131f22, review clean — Approved)
  - Minor (plan-mandated, no action): GLYPH_FOR is currently an identity map;
    makeComparison's drift clamp slightly skews equality frequency at left=0.
Task 2: complete (commits b131f22..2292054, review clean — Approved)
  - shared/game/machine.js confirmed toy-agnostic: zero Speak & Spell-specific
    strings remain (reviewer read the full file to verify).
  - Controller did the live browser check (implementer had no browser):
    power-on, MYSTERY WORD mode switch, OFF-mid-sentence all work. One false
    alarm along the way — a MYSTERY WORD click sent while the console was
    still busy announcing power-on was silently dropped (by design: "while
    it's talking, the keypad is inert apart from OFF"), which briefly looked
    like a regression. No console errors at any point.
  - Minor (no action): speak-and-spell/src/audio/ is now an empty directory.
Task 3: complete (commits 2292054..21fdd1e, fix 3508b21, review clean — Approved)
  - Two Important, plan-mandated bugs fixed (both copy-paste errors baked
    into the plan's own example code, not implementer error): compare.js
    and stumper.js both announced 'SOLVE OR GO' at round end instead of
    their own mode name; stumper.js's final-wrong-attempt message showed a
    bare answer instead of the completed equation like solve.js does.
  - Minor (plan-mandated, no action): dead REPEAT branch in each mode's
    handleKey (machine.js intercepts REPEAT globally first); replay()
    re-announces the full mode title rather than a distinct replay cue.
Task 4: complete (commits 21fdd1e..db286c4, review clean — Approved)
  - alwaysOn: true correction on the ON key verified applied correctly and
    nowhere else.
  - ⚠️ noted: Math.random appears 3x (once per mode file's rng default)
    rather than once in main.js, technically diverging from this plan's
    Global Constraint wording. Accepted as-is — it exactly mirrors already-
    shipped Speak & Spell precedent (Math.random lives in data/words.js and
    letter.js there too, not centralized), and the pure logic that actually
    needs deterministic testing (problems.js) already takes injected rng
    directly per Task 1. Redesigning 3 mode factories + main.js to
    centralize it would be disproportionate to a wording technicality with
    no real testability gap.
  - ⚠️ caught real bug for Task 5: index.html's "Math" span uses class
    wordmark__math, but device.css (copied verbatim from speak-and-spell)
    only styled .wordmark__spell. Fixed directly by controller (commit
    7f58625) rather than round-tripping a fix subagent for a 1-line CSS
    selector rename.
Task 5: complete (commit 4fa7262, controller fixes 7f58625 + 58c9367,
  review clean — Needs fixes -> fixed)
  - Important: base.css renamed --panel-yellow to --panel-blue at :root but
    left 4 other rules (.level[aria-pressed='true'] x2, .notice, .guide
    strong) referencing the removed token, silently losing their color.
    Fixed directly by controller (58c9367) — mechanical sed rename, not
    worth a fix-subagent round-trip. Verified live via computed styles:
    wordmark, level highlight and notice text all pick up --panel-blue now.
  - ⚠️ (repeat of Task 4's note) wordmark__math CSS rule missing — already
    fixed in Task 4's slot (commit 7f58625).

## Live browser verification (controller, all three modes)
Powered on -> straight into SOLVE IT ("5+3="), answered correctly, advanced
to next problem. Switched to GREATER LESS ("9 _ 10"), answered "<". Switched
to NUMBER STUMPER, typed a digit (shown correctly via showTyping), submitted,
no crash. Switched to level D, confirmed via aria-label a stumper puzzle
rendered correctly with the '?' glyph and multiplication ("?*3=30"). OFF cut
through cleanly (ON stays enabled, digits disabled). No console errors at
any point.
  - False alarm investigated at length: after each announce(), the display
    goes blank (io.showTyping('') runs right after, and showTyping repaints
    the whole display rather than overlaying). This looked like a bug but is
    identical, already-reviewed plan-mandated behavior in solve.js too —
    the spoken announcement carries the prompt; the display clears to make
    room for the typed answer. Not a regression, no action taken.
  - Two silently-dropped clicks (MYSTERY WORD earlier on Speak & Spell,
    NUMBER STUMPER here) were both because the console was still busy
    finishing its power-on announcement — by design ("while it's talking,
    the keypad is inert apart from OFF"), not a bug.

Speak & Math (tasks 1-5) implementation complete. Gallery integration done
(commit ba8d95d): manifest entry, .thumb--snm CSS, README section. Verified
live (worked around a local dev-server heuristic-HTTP-cache quirk — python's
bare http.server sends no Cache-Control, so Chromium served an hours-stale
copy of already-visited URLs across new tabs and even server restarts; used
cache:'no-store' fetches to confirm the actual served bytes were correct —
not a concern for the real GitHub Pages deploy).

## Final whole-branch review (Opus, fe94356..ba8d95d)
Ready to merge: with fixes. Confirmed the hoist is genuinely generic (no
hidden Speak & Spell assumptions in shared/game/machine.js), Speak & Spell
doesn't regress, gallery stays in lockstep, all 26 tests real and passing,
both hard invariants (exact division, non-negative subtraction) correct and
well-tested.
  - Important (fixed, commit 93c4636): shared/display/segments.js's font has
    no '<'/'>' glyph. compare.js's wrong-answer feedback displayed the raw
    relation symbol, so a non-equal answer rendered a blank gap on the VFD
    (speech was always correct). Fixed by spelling the relation out
    (LESS THAN / MORE THAN / EQUAL TO) instead of adding new segment
    geometry to the shared font — lower blast radius, and the display
    already scrolls for longer text. Verified live: scrolled "MORE THAN"
    with no blank segments.
  - Minor (fixed, same commit): dead .keyrow--letters/-3 CSS rules and a
    stale "MYSTERY" caption comment left over from copying Speak & Spell's
    keypad.css (speak-and-math has no letter rows).
  - Accepted, no action: Math.random x3 (already sign-off in Task 4's
    review); dead REPEAT branch in each mode's handleKey (machine.js
    intercepts it first, same as noted in Task 3's review).

Ready to merge to main.

---

# Lite-Brite — progress ledger

Plan: docs/superpowers/plans/2026-07-23-lite-brite.md
Branch: lite-brite
Base: e6d101c (= main, after Etch A Sketch)

Clean, self-contained plan — no pre-flight corrections needed (Task 6/gallery
skipped per standing practice). Same design note as Etch A Sketch: grid.js
implements its own simple paint-state tracking rather than consuming
shared/ui/drag.js — a continuous multi-cell paint operation doesn't fit
drag.js's single-gesture tap/fire/cancel model. drag.js now remains
unconsumed by any of the four toys built this session; worth a human look
at whether it's dead code, but out of scope for this task.

## Tasks
Task 1 (board model + codec): commits e6d101c..7e67e4e, review Approved.
  Reviewer hand-traced the codec's hardest property (round-trip stability)
  against a real board and confirmed exact reproduction.
Task 2 (hole grid): commits 7e67e4e..4f3484b, review Needs fixes -> fixed.
  - Important: painting relies entirely on pointerenter to continue across
    holes during a drag, but a touch pointer is implicitly captured by its
    pointerdown target, suppressing pointerenter on every other element for
    the rest of that touch gesture — drag-to-paint would only ever paint
    the first hole touched on a touchscreen. Fixed by releasing pointer
    capture on pointerdown (commit e7c58b1).
Task 3 (palette + pegs audio): commits 4f3484b..7f1aba3, review Approved
  with a fix bundled in.
  - Minor (fixed alongside Task 2's, same commit e7c58b1): pegClick's rate
    limiter initialized lastAt to 0, but ctx.currentTime also starts near 0
    when the AudioContext is first lazily created — if pegClick itself
    triggers that creation, the very first peg of a session could be
    silently throttled away. Changed to -Infinity.
Task 4 (wiring + URL sharing): commits 7f1aba3..cbc4072, review Approved.
  Reviewer independently verified decode()'s malformed-input resilience and
  that grid.js's repaint functions take cells as a parameter (not a stale
  closure), so the Clear handler's board reassignment is correctly picked
  up.
Task 5 (styling): commits e7c58b1..fd3bc3d, review Approved. Confirmed the
  --peg/--cols CSS variable contract between grid.js/palette.js (JS-owned)
  and board.css (consumes only, never redefines) has no conflict.

## Live browser verification (controller)
Full render (red box, dimpled hole grid, 8 swatches + eraser). Selected a
color, dragged across holes — painted (some intermediate holes missed due
to the Browser pane's drag-tool granularity, not the app's touch-capture
fix, which is what the fix specifically targets). Eraser correctly un-lit a
painted peg (verified via direct pointerdown dispatch after visually
confirming a UI-coordinate mismatch was a tool/scaling issue, not a bug).
**The critical URL round-trip**: grabbed the live hash after painting
2 pegs (#.153C.8H.453), opened it in a completely fresh tab — identical
picture loaded (same 2 cells, same colors), status correctly read "Loaded a
shared picture." Clear board: URL shortened to #.616 (single empty run),
0 lit pegs, status "Board cleared." No console errors at any point.
Gallery card verified (7 toys + placeholder, glowing-dots thumbnail
renders).

---

# Etch A Sketch — progress ledger

Plan: docs/superpowers/plans/2026-07-23-etch-a-sketch.md
Branch: etch-a-sketch
Base: c428d4d (= main, after Simon)

Clean, self-contained plan — no pre-flight corrections needed (Task 7/gallery
skipped per standing practice). Note: unlike shared-foundations' ledger
anticipated, this plan does NOT consume shared/ui/drag.js for the knobs —
knob rotation is angle maths (createKnob in etch-a-sketch/src/ui/knobs.js),
a different model than drag.js's linear tap/fire/cancel classification.
Legitimate design choice, not a defect; drag.js remains unconsumed pending
Lite-Brite.

## Tasks — all six approved clean, no controller fixes needed
Task 1 (stylus+knob maths): commits c428d4d..a580f40, review Approved.
  Reviewer hand-verified both trapdoor mechanics (4-edge clamping,
  rotationDelta's 350->10 = +20 zero-crossing) by direct calculation.
  Minor, no action (plan-mandated): move() returns a live reference for
  `from`, not a defensive copy; harmless since no consumer mutates it.
Task 2 (canvas screen): commits a580f40..a008a55, review Approved.
  Minor, no action (plan-mandated): comment says "~12 frames," loop runs 14.
Task 3 (knobs UI): commits a008a55..4dfc2c4, review Approved.
  Important flagged but resolved by Task 5's markup (native <button>
  elements are focusable by default) — confirmed in Task 5's review.
Task 4 (scrape audio): commits 4dfc2c4..be431a8, review Approved.
Task 5 (wiring): commits be431a8..ec78ccb, review Approved. Confirmed knob
  buttons are native <button>s (resolves Task 3's focusability flag) and
  every main.js call site matches the real (already-landed) module exports,
  not just the brief's assumptions.
Task 6 (styling): commits ec78ccb..36c1396, review Approved.

## Live browser verification (controller)
Full render (red shell, grey screen, two knobs, wordmark) correct on first
load. Dragging the left knob rotated it visibly and drew a horizontal line;
dragging the right knob continued the line vertically with no gap at the
join (the exact behavior the plan's Global Constraints call out as the
point of the whole toy). Shake to erase: frame animation ran, drawing faded
to nothing, button correctly re-enabled after. No console errors at any
point. Gallery card verified (6 toys + placeholder, thumbnail renders).

Tooling note: the Browser pane's screenshot tool got stuck on the tab that
had loaded this toy's canvas; a fresh tab resolved it immediately. Recorded
in case it recurs — not an app bug (page state was confirmed fine via
read_page/JS while screenshot was stuck).

## Final whole-branch review (Opus, c428d4d..73c7857)
Ready to merge: yes, no fixes needed — the first of the four toys this
session to get a clean final review with zero task-level controller fixes.
Confirmed purely additive (zero diff to the five existing toys), the
gallery's multi-class part strings (`thumb__etch-knob thumb__etch-knob--left`
etc.) are handled correctly by buildPart, the two frame.css files (shared +
toy-local) share no selectors, both hard mechanics independently re-verified
correct. Repeated the two pre-known cosmetic minors (comment/frame-count,
non-defensive `from` reference) and one new observation (arrow-key Up/Down
semantics on the right knob model rotation direction, not screen direction —
a defensible reading, not a defect) — none blocking.

Ready to merge to main.

---

# Simon — progress ledger

Plan: docs/superpowers/plans/2026-07-23-simon.md
Branch: simon
Base: a6693b4 (= main, after Speak & Math)

Clean, self-contained plan — no pre-flight corrections needed (Task 6/gallery
skipped per standing practice; controller does it directly).

## Tasks
Task 1 (rules): complete (commits a6693b4..090fc00, review clean — Approved)
  - Minor, no action: post-win press() returns expected: undefined (out-of-
    bounds sequence[cursor]); harmless since main.js gates on state.playing.
Task 2 (voices): complete (commits 090fc00..01ce427, review clean — Approved)
  - Minor, no action: playColor's wait() resolves ~12ms before the tone's
    envelope actually finishes decaying; inaudible, plan-mandated.
Task 3 (panels): complete (commits 01ce427..6ecf99d, review clean — Approved)
Task 4 (wiring): complete (commit 551fa1b, controller fix 2b32c61 — Needs
  fixes -> fixed)
  - Important: handlePress computed the verdict and mutated game state
    before locking panels/busy — the lock only flipped inside each verdict
    branch, after awaiting playColor (~200ms). A press landing in that
    window called game.press() again against an already-advanced cursor,
    producing "Wrong — that was undefined". Bug was verbatim from the
    plan's own template. Fixed by locking synchronously right after the
    verdict is read, before the await. Verified live: rapid double-click
    during a wrong answer produced one clean message, no "undefined", no
    corrupted state.
Task 5 (styling): complete (commit dda6c44, controller fix 2b32c61 —
  Approved with a follow-up)
  - Important: .level/.levels-label used by Simon's markup/JS but defined
    nowhere — shared/styles/frame.css explicitly leaves the chip look to
    each toy, and this plan's own styling task never asked for it. Ported
    speak-and-spell's version, retinted to --simon-yellow. Verified live:
    level buttons now render as proper chips, level switching works.

## Live browser verification (controller)
Disc renders correctly (4 quadrants + hub). Start -> sequence plays -> "Your
turn". Wrong answer produces a clean single message and correct state
(start re-enabled, not corrupted) even under a deliberate rapid double-click
stress test of the just-fixed race window. Level switching updates
aria-pressed and the readout correctly. No console errors at any point.
Gallery card verified (5 toys + placeholder, disc thumbnail renders).

Noted for the final step (after all 3 remaining toys ship): src/gallery.js's
placeholder text hardcodes "Simon, Merlin, Lite-Brite, the Big Trak" as
still-to-come — will need updating once Simon/Etch/Lite-Brite are all
merged, since only Merlin and Big Trak will still be true. Not part of any
current plan's scope; a one-line polish pass at the very end.

## Final whole-branch review (Opus, a6693b4..8d3117c)
Ready to merge: yes, no further fixes. Confirmed purely additive (zero diff
to speak-and-spell/see-n-say/talkboy/speak-and-math), turn-lock race fix and
level-chip CSS fix both verified present and correct, no shared .thumb__hub
class leakage between Simon's and See 'n Say's cards, all 36 tests pass.
Repeated the already-tracked placeholder-text nit (deferred, not blocking).

Ready to merge to main.
