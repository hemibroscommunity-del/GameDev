# Card UI3, PR 11: no tutorial message over the controller (one PR)

Model and effort: the strong model, high. Tag: 6791 (block UI3, 6780 to 6799). Branch `claude/plan-ui3-11-tutor`, from `main` (e8ccff26). ONE draft PR, base `main`; ONE message to the orchestrator (line 5 of `git show origin/claude/plan-orc:docs/plan/status/ORC.md`), then stop. No server file, no cap, no live flag: the PR deploys nothing. You commit this card as `docs/plan/cards/UI3-tutor.md` in the PR.

## Purpose

The owner, 2026-11-27 (about 04:36 UTC), typed in the orchestrator's session, after the new controller landed: *"Needs to fix tutorial messages over new controller area."*

A BUG IN WHAT THE PLAYER SEES: a tutorial message is drawn over the on-screen controller (card PAD's: the left stick's housing and the right housing of five buttons, docked to the top edge of the dashboard's band, the middle open), so a new player cannot see or press what the message is teaching. NO TUTORIAL, COACH, HINT OR NUDGE MESSAGE COVERS ANY PART OF THE CONTROLLER, upright and sideways, on a phone and in a computer's window (every screen plays the one band, `src/ui/oneBand.js`).

## What is there today (on main; read by range, never BroTown.jsx whole)

- The controller's footprint: `combatBandTopPx(isLandscape)` in `src/ui/panels/ShieldButton.jsx` near 740 (measured over every control slot); the band `--dash-h` / `--sheet-h` (`src/styles/game.css` near 97); the play area's sizes `playVw` / `playVh` / `playIsLandscape` (`src/ui/mobile/playViewport.js` 159 to 192). `docs/specs/control-redesign.md` and the PAD cards say what the housings are.
- THE MESSAGES (find them all first; this list is a lane's, not checked): the welcome tutorial's text and its "Skip tutorial" button (BroTown.jsx near 14005 and 14326 to 14345, `tutorialStep` 0 to 6); `src/ui/ControlsTutorial.jsx` (or where it lives: `top: cardTop; left: 50%`, placed from its target's box); `src/ui/mobile/QuestCoach.jsx` (a card's `bottom` is `max(bandClear, broClear, ...)` near 2171; `bandClear` near 1924; BUT a card anchored BELOW its target uses `top: r.top + r.height + pad + 10` near 2163: the likeliest to land on the controller); `src/ui/mobile/QuestStepNudge.jsx`; `InstallHint.jsx` (`bottom: calc(var(--dash-h) + 12px)`: clears the band, not the housings above it); `deskTeach.js` (a computer's toast at 22% and its combat tips).

## The job

1. FIND IT FIRST, on the phone page: play the first steps (`mp-firststeps`, `mp-onboarding`, `mp-tutorialpolish`, `mp-questguide`'s coach, `world: 'wheel'`) and at every message measure its box against the controller's housings. Write down which messages overlap, at which step, upright and sideways. That list goes in your message.
2. ONE RULE, a module under `src/game/` (no imports where possible): given the play area's box, the controller's housings (their boxes, from the same measure the controls use) and a message's wanted place and size, it returns a place that covers no housing: above the controller's top edge, or in the open middle between the housings when the message is narrow enough and points at a control. Its node suite tests what it does (a card wanted below a target near the stick; a wide card sideways; a tall card on a short screen that must shrink or move up).
3. Every message found in step 1 takes its place through that rule (the big file gains calls, not logic). A message that TEACHES a control points at it (its arrow or ring may touch the control; its words never cover it).
4. A layout read goes through the ways of `docs/specs/layout-reads.md` (`layout-reads.test` fails a new one); nothing measures the page inside a frame; a redraw on a timer is a `startTransition`.

## Dodges (each must turn a check RED; a guard reads the syntax tree or the running page, never a pattern of text)

- a message placed with a fixed `bottom` or `top` that does not ask the rule (a new message added tomorrow with `bottom: 160`);
- the rule clearing the band's height only, not the housings standing above it;
- right upright, wrong sideways (or in a computer's wide window);
- a message pushed off the top of the play area, or under the top-left HUD (`charHudSpan()` on branch `claude/plan-ui3-2-hud`: keep the coach's existing HUD clearance working), to clear the controller;
- the welcome text fixed and the coach's below-target cards left.

## Done when

- A phone test (a step added to `mp-firststeps` or a new `mp-tutorclear`, `world: 'wheel'`, with its `lane`) walks every tutorial message of the first minutes and FAILS when a message's box meets a housing's box: RED on main today at the overlaps of step 1, green on your final code, upright 375 x 667 and sideways; and one computer step (`wide: true`).
- The node suite of the rule; the dodges above planted and red.
- Pictures for the owner in `docs/shots/`: before and after of each message that overlapped, upright and one sideways.
- `docs/UI-DESIGN-NOTES.md`'s tutorial section and the controller's spec say the rule in one paragraph.

## Not yours

The controller itself (card PAD: its housings, sizes and skin), the top-left corner (UI3-corner, branch `claude/plan-ui3-10-corner`, built beside you: in QuestCoach.jsx it touches ONLY the `charHudSpan` lines near 279 and 303; it removes the quest line from the world, so do not anchor a message to the quest card), what the messages SAY. A file outside this card that the job truly needs: ask the orchestrator first, one message, your recommendation in it.
