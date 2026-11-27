# Card PAD, part 13: the bow and the staff aim by the thumb in the two buttons, the sword keeps its latch (the owner's change; one PR)

Model and effort: the strong model, high (it touches `src/ui/BroTown.jsx` by a few lines and how ranged combat feels). Tag: 6648 (PAD's block 6640 to 6659). Branch `claude/plan-pad-13-rangedstick`, from main 5ab943fe. ONE draft PR, base main. The orchestrator is part 37 (session_01LccHajW9zn1bth8aMvQ7zb): a question that blocks, and the ONE ready message, go there by `send_message`.

PHONE-ONLY: no file under `server/`, `.github/`, `src/networking/`; no wire field changes (the worker tests no direction: it takes the arrow's relay line and the phone's claim, and `bowpath` already holds a claim to the line the phone declared). Needing any of those is a STOP and ask.

## Purpose

The owner, typed to the orchestrator at about 16:20 UTC 2026-11-27 (the game's only player, on an iPhone, playing the two-button controls, `?manual=5`, which their phone remembers): *"I think I want this change: for melee to stay as it is (attacking and locking towards nearest enemy) but [BOW] and magic need to use the right button that turns into the right joystick again where attacks must be used in that directional rotation with no lock on mechanism. Right now I can run through the [forest] and just hold down the attack button and I'm destroying every monster. It needs to be more skill based than an auto lock on system for ranged attacks"*. Then: *"I meant BOW and magic using right button as right joystick"*. And: *"it's very similar to mechanisms you have already built before. So hopefully it can be a quick change"*.

In the two-button controls, a SWORD keeps today's Attack button whole (the sight's pick, the latch's lock, the hold that auto-attacks). With a BOW or a STAFF in hand the Attack disc IS A STICK: the thumb aims, the shot goes where the thumb points, and nothing locks, picks or turns the shot toward a monster. Ranged kills take aim.

## What is there today (main 5ab943fe; a reading lane's map, check each line before leaning on it)

- The schemes: `src/game/manualCombat.js` `manualMode()` about 233 (0 to 5; 4 is the default, "the held combat"; 5 is the two buttons, card CT, remembered in localStorage `bt_manual`), `twoButtonsOn()` about 275.
- MODE 4 ALREADY AIMS BOW AND STAFF BY THE THUMB WITH NO LOCK: that is the "again". In `src/ui/BroTown.jsx` (never read whole: grep, then by range): the zone's handlers rS/rM/rE about 11358 to 11500, the disc's bS/bM/bE about 11674 to 11830, `handleRBtnPress` about 10259, `rKnobFollow` 10383, `rJoyAim` 10420 (writes `S._aimAngle`, `S._lastAimAngle`, `S._aiming`, `S._aimSrc='stick'`, `S.autoAttack`), `handleRBtnRelease` 10468 (clears them). The aim ladder: `rangedAimAngle`, `src/game/combatHelpers.js` about 176 (a lock beats a thumb that is aiming, then the last aim, then the facing). `autoAcquires(S)` is false for 'ranged' and 'staff' in mode 4 (`targeting.js` about 427). The held bow's sight gate: `monsterCombat.js` about 1549 to 1590 and 1822 to 1834 (`firstSightHit`; TRAPS 236). A staff's bolt is steered by the thumb after launch.
- MODE 5 TODAY: the Attack disc is a latch with no aim: `src/game/latch.js` (a press with a monster in sight locks it; a 0.6 s hold turns auto-attack on), `src/game/sight.js` `sightPick` and `sightRange`, `src/game/freeAttack.js` (`twoButtonPress` about 88, `twoButtonSlide` 107, `twoButtonRelease` 100; a press with nothing sighted is one attack the way the body faces, a bow's a free arrow), called at BroTown.jsx about 11674, 11682, 11800; in mode 5 the right half is the world's taps only (about 11358, 11429, 11483, 11826).
- The disc is drawn in `src/ui/panels/TouchControls.jsx` (`rJoyRef` about 406, `rKnobRef` 536, the latch's sword picture 569) inside the steel controller (`src/game/padSkin.js` `WELLS`, `attack` about 173; `PadHousings.jsx`, `padSpot.js`).
- Suites and scenarios near this: `server/test/` manual-combat, latch, sight, bow-path, bow-shot, free-swing, staff-feel (read, do not change: a pinned string that must change is a STOP and ask); `tools/guards/` free-attack, two-buttons-choose, pad-steel, context-button; phone: mp-twobuttons (its attack parts are RED ON MAIN already: the test first, not yours to mend; say what you saw), mp-manualcombat, mp-bowfeel, mp-stafffeel, mp-padskin.

## What to build (the readings are chosen; do not widen them)

1. ONE RULE, a new pure module under `src/game/` (no imports where possible; node-testable): from the scheme, the weapon in hand's kind and the switch, the Attack disc is ONE of two kinds, `'latch'` or `'stick'`, held in ONE field with ONE transition function (CLAUDE.md section 5: a phase lives in one field). Two buttons and a sword: `'latch'`, today's code untouched. Two buttons and a bow or staff: `'stick'`. Every other scheme, and a computer: exactly as today.
2. THE STICK IS MODE 4's, reused, not rebuilt: the thumb goes down ON THE ATTACK DISC and drags; the knob follows inside the disc's well; past its dead zone the shot goes along the thumb, again and again while held (mode 4's cadence, its sight gate for a held bow, its steered bolt for a staff: exactly mode 4's feel, which the owner chose on 2026-11-13); release stops it and clears the aim. The right half of the screen stays the world's taps, as in mode 5 today: only the disc is the stick.
3. A TAP on the disc with no drag (bow or staff): ONE shot the way the bro faces. It never turns toward a monster.
4. NO LOCK FOR RANGED in the two buttons: with a bow or staff, `sightPick`, the latch, the 0.6 s auto-hold and any reticle or "lit" lock state do not run or show; `rangedAimAngle` is fed no lock. The Attack disc's picture shows the weapon as today; choose the plainest honest sign that it is a stick (the knob), inside the steel skin's rules (`pad-steel` stays green).
5. A weapon swapped while the thumb is down: the hold ends cleanly (aim cleared, auto-attack off, no lock left over); the next press is the new weapon's kind.
6. ON by default, with `?rangedstick=0` (its row in the switch table) giving today's two-button bow and staff back.
7. `BroTown.jsx` gains CALLS, not logic, and its lines do not grow past `four-lines` (never raise a line: move code out if you must). You are ALONE in `BroTown.jsx` and `TouchControls.jsx` while you run; `src/rendering/systems/entityRenderer.js` is another session's today: do not touch it.
8. ITS SUITE under `tools/guards/` (finish.md part 5, rules 1 and 2: it runs the rule and the real functions it feeds, never a pattern of text).
9. A PHONE TEST `tools/qa/mp/mp-rangedstick.mjs` (`world: 'wheel'`, `manual=5` on a touch page, its `lane` named): with a bow, a monster to one side and the thumb dragged the OTHER way: the arrow's angle is the thumb's, nothing is locked, the monster is not hit; the thumb toward the monster: it is hit; the same with a staff; a tap fires along the facing; with a sword the press locks the nearest as today; `?rangedstick=0` brings today's bow back. Time by the renderer's clock (TRAPS 200).
10. Pictures for the owner in `docs/shots/` (upright 375 x 667 and one sideways: the disc with a sword, and as a stick with a bow, thumb dragged). The screen's section in `docs/UI-DESIGN-NOTES.md` (the controller's) gains this, with the owner's words; one line in `manualCombat.js`'s header history.

The laws that apply: touch (`touch-action: manipulation`; upright AND sideways, TRAPS 175); nothing measures the page inside a frame (the layout-reads law: use the kept sizes); no new art, sound or server behaviour (so no cap, no live flag); the same-change checklist's rows for a switch and a phone test. If the tour or a hint's words about Attack are now wrong for a bow, REPORT the line; do not rewrite the owner's words.

## Dodges (each planted and seen RED, each named in the ready message)

- (a) a lock or a sight pick still taken with a bow, and with a staff;
- (b) a held bow or staff shooting at the nearest monster whatever the thumb says;
- (c) a tap that turns the shot toward a monster;
- (d) the sword losing its pick, its lock or its auto-hold;
- (e) `?rangedstick=0` not giving today back;
- (f) mode 4, modes 0 to 3 or a computer changed in any way;
- (g) the aim or auto-attack left on after release;
- (h) a swap in mid-hold leaving the old weapon's state;
- (i) a second boolean beside the kind's one field.

## Done when

- The suite kills those plants on the real functions; `mp-rangedstick` green upright and sideways on the final code.
- Rules of this phase: THE LAST PHONE RUN IS ON THE FINAL CODE. More than three scenario runs, or any repeat run, go to helper sessions on `claude-haiku-5-5`, effort low (a helper changes no file, has leave to fetch, sends back only PASS and FAIL lines): mp-rangedstick, mp-twobuttons, mp-manualcombat, mp-bowfeel, mp-stafffeel and mp-padskin on the final code, each compared with main's own result where it is red. Precheck before every push; push when the PR's line is done; merge `origin/main` once, before the last push. ONE wait for the checks (`test`, `playable`, `memory-budget`, `lint-build`), never a poll.
- Memory kept small: hand over at 250,000 tokens (`get_session`, `context_usage.used_tokens`). Read by range, at most 60 lines of a big file at a time.
- ONE message to the orchestrator: the PR's number, FULL head, base, the four checks; the file list in one line; each dodge now red, named; what the OWNER DOES AND SEES, in plain words; everything chosen that a player feels (the dead zone, the tap's shot, the knob's look: theirs to change); the runs on the final code beside main's; anything found outside the card (reported, not mended). Then stop.

## Not yours

`server/`, `.github/`, `src/networking/`, the wire; `src/rendering/systems/entityRenderer.js` (another session's today); the tour's and the hints' words (reported, not rewritten); mp-twobuttons' red parts on main (the test first, reported).
