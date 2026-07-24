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
