# Card CT, part 22: the frame and the caret (what the aim shows; one PR)

Model and effort: the strong model, high. Tag: 6555 (card CT's block; `v2.3.6555`). Branch `claude/plan-ct-22-aimmarks`, from `main`. ONE draft PR, one message to the orchestrator, then stop. No server file, no cap.

The owner, 2026-11-25, playing the two buttons (`?manual=5`) with the bow (their screenshot, on the branch `claude/plan-orc`: `docs/plan/status/assets/owner-2026-11-25-bars-and-target.png`):
- *"Put a tiny directional Carat out in front of the character so that way you can see which way your aim is facing (sometimes hard to tell cause left thumb covers directional pad)"*
- *"Instead of tiny red hollow arrow above the monster that it tentatively targeted it needs to be something larger like the old way where it frames the monster enemy in a large but semi transparent square shape reticle. The frame should be yellow if that monster is in queue for lock on targeting (no first hits yet) and after you you hit the monster it turns red and locks on."*

PURPOSE: at a glance, with the left thumb over the stick, the player reads three things: which way the aim points (the caret), which monster the next press will take (a yellow frame), and which monster is locked (a red frame). One frame at a time, big enough to see beside a thumb.

## The facts (a reading lane's, 2026-11-25: check each by range before you lean on it)

- Today's mark: `src/rendering/systems/effectsRenderer.js:7804-7833`, a stroked hollow chevron over each monster of `S._targetCands` (keyline 0x14181A, then red 0xFF3C3C while `_atkHot` (:7710), else brass 0xD8A85F; 11 x 10 CSS px for the lock (`isTarget`, :7727), 7.5 x 7 for the others).
- "The old way" is alive: `src/rendering/lockReticle.js` (class `LockReticle`: four corner brackets, BOX 1.15, orange 0xF08A2E, a 1 px line, a pulse; made at `effectsRenderer.js:2793`, updated at :8093-8111). It shows only for a lock with `src === 'tap'` and as the sword's softer "reach" box; mode 5's lock is written `src: 'auto'` (`src/game/targeting.js:533`) and the bow gets no reach box (:8098), so mode 5 never sees it.
- The latch: `src/game/latch.js:67` `LATCH_PHASES = ['idle','active','auto']`, field `S._latchPhase`, `_latchId`; written only by `latchTo` (:89). The press: `latchAttackPress` (:343-350) takes `sightNow`, so `sightPick` (`src/game/sight.js:80-96`). The sight's own phase `S._sightPhase`, `S._sightId` (`sight.js:51`). The facing the sight reads: `drawnFace(S)` (`sight.js:107`, the 8-way `S._renderFacing`).

## The readings, chosen so you do not guess

1. **The frame is the game's own reticle in a new dress**, in mode 5 on a touch screen (`twoButtonsLive()`), for the sword, the bow and the staff alike: four corner brackets round the monster's drawn box x 1.25, never under 48 CSS px a side, the line 2 CSS px with the dark keyline, the whole at about 0.6 alpha (the owner's "large but semi transparent"). No fill. The other modes' orange tap reticle and the sword's reach box stay as they are.
2. **Yellow (0xF2C94C): the monster the next press of Attack would take**, asked of the SAME function the press asks (`sightNow` / `sightPick` for the drawn facing): never a second copy of the rule. Nothing to take, no frame.
3. **Red (0xFF3C3C): the latch's monster** (`_latchPhase` 'active' or 'auto'), from the press that locks it. (Chosen: red at the lock, not at the arrow's landing: a shot that misses a locked monster must not leave it yellow. Say so in the PR's words for the owner.) While a latch holds there is no yellow frame.
4. **The chevrons of :7804-7833 are not drawn in mode 5 while the frame is on.** `?targetframe=0` gives them back and hides the frame.
5. **The caret**: one small chevron on the ground in front of the bro, 26 CSS px from his feet's middle, about 8 CSS px wide, brass 0xD8A85F on the dark keyline, 0.75 alpha, pointing where a press would go: at the latch's monster while a latch holds, else along `drawnFace(S)` (the 8 ways the sight really reads: the truth, not the thumb's analog angle). Shown in mode 5 while the bro is alive, on foot and not in a harvest, fishing, cooking or talking pose. `?aimcaret=0` hides it.
6. **The slice** (finish.md part 5, rule 5): what shows is a module with no imports from the page, `src/game/aimMarks.js` (given the state: the frame's monster and its tone or none; the caret's angle or none), with a suite (`server/test/aim-marks.test.mjs`) that tests what it does and kills every mutant of its lines or lists the survivor with why. The renderer gains calls.
7. **The drawing laws** (CLAUDE.md §7 "Drawing"; TRAPS §218): the brackets and the caret are drawn ONCE and then only moved, turned, scaled, tinted and faded; nothing is redrawn or shown and hidden every frame in a big layer (a change of state may). No new art file. They cast no shadow (`src/rendering/lightfx/casters.js`). `mp-membudget`'s and the held page's lines do not rise.

## Files

Yours: `src/rendering/lockReticle.js`; `src/rendering/systems/effectsRenderer.js` (the two blocks above, read by range, never whole; a new leaf under `src/rendering/leaves/effects-*.js` if it takes lines out); `src/game/aimMarks.js` and its suite; the two switch rows (`tools/guards/lib/switches.mjs`, `--write`); `tools/qa/mp/mp-aimmarks.mjs` (`world: 'wheel'`, its `lane`; a probe it reads must exist: precheck `qa-handles`); the phone tests that read the old chevrons, mended where the shape changed (`mp-twobuttons`, `mp-contextbuttons`).
READ ONLY: `src/game/sight.js`, `latch.js`, `playerActions.js`, `monsterCombat.js` (CT part 23 changes the pick's rule beside you: you call the function, so you follow it). NOT yours: `src/ui/BroTown.jsx` and the control panels (card PAD holds them; ask the orchestrator if ONE call line cannot be avoided), `src/rendering/systems/entityRenderer.js` and `src/rendering/leaves/entity-*.js` (card EN's session).
Beside you: PAD, CT part 23 and card EN share `tools/dev/tag-blocks.json` (do not edit it), the switch table and its generated documents: keep your lines few; merge `main` ONCE just before your one push and write the generated tables again.

## Done when

`mp-aimmarks` passes once on your box (a repeat is a helper's): with no press the pick wears the yellow frame; after an Attack press the latched monster wears the red one and no yellow shows; the caret turns through the eight ways and points at the lock; each switch gives the old picture back. The suites and `node tools/dev/precheck.mjs` pass. Pictures at deviceScaleFactor 2 in `docs/shots/` (the yellow frame, the red frame, the caret, upright and sideways), described in the PR body in plain words for the owner with the preview address `https://claude-plan-ct-22-aimmarks.gamedev-aix.pages.dev/?manual=5`. `docs/plan/status/CT.md` true, riding the work's commit; this card committed as `docs/plan/cards/CT-part22.md`; ONE push.
