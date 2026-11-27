# Card PAD, part 12: sprint at a full push, reachable from anywhere on the screen (the owner's bug; one PR)

Model and effort: the strong model, high (it touches `src/ui/BroTown.jsx` by a few lines and how movement feels). Tag: 6647 (PAD's block 6640 to 6659; 6646 is PAD part 11's, #2409). Branch `claude/plan-pad-12-fullpush`, from `main` (17124fc8). ONE draft PR, base `main`; ONE message to the orchestrator (line 5 of `git show origin/claude/plan-orc:docs/plan/status/ORC.md`), then stop. No file under `server/src`, no cap, no live flag: the PR deploys nothing. You commit this card as `docs/plan/cards/PAD-fullpush.md` in the PR.

## Purpose

The owner, 2026-11-27 (about 05:00 UTC), typed in the orchestrator's session, playing on an iPhone, upright: *"the sprint action isn't working correctly because you can't move a big enough distance off screen (in the southwest corner where the joystick is) when moving west or area too close to the edge of the screen. Maybe just make sprint the default behavior when moving until you run out of energy unless you have better idea"*.

A BUG IN HOW THE GAME PLAYS: the rim sprint (card PAD part 9, tag 6644) asks the thumb to travel 1.25 of the drawn disc's radius from where it LANDED (about 52 px on a 430 px phone), and the disc is drawn about 55 px from the left edge and 57 px above the band: a thumb that lands on the disc runs out of screen going west or south before it reaches the sprint.

THE ORCHESTRATOR'S READING (the owner approved its recommendations for the night, 04:56: *"I Approve your recommendations"*; what a player feels here is LISTED for them, theirs to change):

1. A FULL PUSH SPRINTS. Sprint starts when the stick is pushed all the way (the thumb at the reach of the stick: share 1.0, not past it) and ends when the thumb eases back (hysteresis: off below about 0.8) or lifts. A part push walks and spends nothing. So moving with the stick held over IS sprinting, until the energy runs out (the owner's idea), and a player who wants to save energy eases off (the better idea: they keep the choice).
2. THE FULL PUSH IS ALWAYS REACHABLE. From ANY landing point in the left zone, in ANY direction, the thumb reaches a full push before it reaches the edge of the play area less the phone's edge margin (16 px; the band's top edge counts as an edge going south). The recommended way: the reach in a direction is the smaller of the drawn radius and the room the thumb has in that direction, never under a floor (about 18 px), as one pure function of the landing point, the direction and the zone's box. Another way that meets the tests below is yours to choose and to say.
3. A STILL THUMB NEVER MOVES THE BRO: touching down moves nothing, whichever way you solve 2 (so not an origin shifted under a thumb at rest).
4. OUT OF ENERGY: the sprint ends and the bro walks on, the stick still held over; it sprints again by today's re-arm rule (ease back, push again) once the worker's minimum is back: no flicker on and off while the bar trickles. The refusal's words ("Not enough energy!", `sprintTiredSay`) must not nag at every full push now that a full push is how people walk far: at most once each time the bar empties.
5. `?fullpush=0` gives one phone yesterday's rule back (1.25 of the radius from the landing point, no reach rule). `?rimsprint=0` still gives the Sprint button back and the edge does nothing. A computer is untouched (Shift). The two-button trial (`?manual=5`, `stickDrive`) takes the same rule as the usual stick.

## What is there today (main 17124fc8; a lane's map, check it; read by range, never BroTown.jsx whole)

- THE RULE: `src/game/stickZones.js`: `STICK_ZONES.SPRINT_AT` 1.25 and `SPRINT_OFF` 1.05 near 74 (fractions of the DRAWN radius); `rimPast()` near 164 (the band); `rimSprintLive()` near 182 (`!fineInput() && rimSprintOn()`); `rimSprint()` near 200 (starts a hold like Shift: `startSprint(S, now, 'rim')`; stops under SPRINT_OFF or on lift near 327; re-arms only after the thumb comes back in); `stickAnalog` near 309 (the usual stick), `stickDrive` (the trial). "Walk at the rim spends nothing" near 137: that design is what this card changes; rewrite its comment with why.
- THE PAGE: `src/ui/BroTown.jsx` near 10186 to 10212: the left stick's move handler measures from the touch-down point (`lTapState.startX/Y`, set near 11153 to 11156; nothing clamps it) and calls `stickAnalog(S, dist, angle, maxR, rect.width/2, ...)`; `stickDrive` near 10192. The page gains a call's arguments (the landing point and the zone's box it already holds), not logic: the reach rule is `stickZones.js`'s (finish.md rule 5).
- THE ZONE: `[data-joyzone="L"]` (`src/ui/panels/TouchControls.jsx` near 204) is the whole left half above the dashboard; the drawn disc is a picture (`src/game/padSkin.js` `REF_SLOTS` near 54, `padLayout` near 106: centre `fromL(118)`, `up(159)`, scale `min(width, 430)/920`). The drawn stick's knob should still show a full push at a full push (if the knob's travel is drawn from the share, a shorter reach must not draw a half-pushed knob).
- THE WORKER (not yours, nothing changes): sprint is `sp: 1` on the move (`src/game/sprint.js` near 75), judged in `server/src/sprint.js` (drain 11 a second, minimum 5 to start).
- SUITES: `server/test/stick-zones.test.mjs` (section 10 the rim's sprint, 11 the usual stick): a server TEST file, which you may change (a merge whose only files under `server/` are tests deploys nothing, CLAUDE.md section 4); `tools/qa/mp/mp-rimsprint.mjs`, `mp-sprint.mjs`, `mp-twobuttons.mjs`. The words: `docs/specs/sprint.md` 11 to 39, `docs/UI-DESIGN-NOTES.md` near 2036, 2087, 2104, `docs/SWITCHES.md` near 256.

## Dodges (each must turn a check RED)

- the constant lowered to 1.0 while the usual stick clamps its share AT 1.0, so the band's edge is never crossed or chatters at the rim;
- right going east, wrong going west from a landing point 20 px, 40 px and 60 px from the left edge; wrong going south from a landing point just above the band; wrong sideways;
- a full push reachable but the bro walking on touch-down (reading 3);
- a part push that sprints (the floor so small that any twitch at the edge is a full push: a thumb resting must not sprint);
- the refusal's words at every push when tired;
- the two-button trial left on the old rule; `?fullpush=0` not giving the old rule back whole.

## Done when

- The node suite kills those plants on the pure functions (the reach from a landing point and a direction in a box; the band at 1.0; the re-arm; the once-only words).
- `mp-rimsprint` (`world: 'wheel'`, its `lane`) lands the thumb ON the drawn disc and 20 px from the left edge, pushes west, south, south-west and east, upright 375 x 667 and 390 x 844 and sideways, and reads the bro SPRINTING (the worker's word, not the page's wish) before the thumb passes the margin: RED on main today going west and south, green on your final code. One step holds a full push until the bar empties and reads walking, no flicker, the words once.
- `mp-sprint`, `mp-twobuttons`, `mp-padskin` green on the final code (helpers on the cheapest model run them: you are at depth 7 of 8, so a helper is the last level and starts none).
- The switch row for `?fullpush=0`; sprint's spec and the design notes say the new rule in a paragraph, with the owner's words.
- THE FAST LANE (the owner, 04:49 11-27: a change that only touches what is on screen lands as soon as its own tests are green, the checker reading it afterwards): no file under `server/src`, `.github/`, the wire, gold or logins; your ready message goes when `test`, `playable`, `memory-budget` and `lint-build` are green on your exact head.

## Not yours

The controller's look (PAD part 11, #2409: `padSkin.js`'s colours, `game.css`'s glow, `mp-padskin`'s steps: it lands tonight, merge `origin/main` once before your last push); the attack button's states (BroTown.jsx near 6440 to 6706); the tutorial's cards (UI3-tutor, `QuestCoach.jsx`); the top-left corner (UI3-corner). The worker's sprint numbers. A file outside this card that the job truly needs: ask the orchestrator first, one message, your recommendation in it.
