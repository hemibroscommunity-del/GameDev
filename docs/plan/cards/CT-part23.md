# Card CT, part 23: the bow in the two buttons (two PRs, in order)

Model and effort: the strong model, high. Tags: 6556 then 6557 (card CT's block). PR 1 on `claude/plan-ct-23-nearpick` from `main`; PR 2 on `claude/plan-ct-24-bowspecial` STACKED on PR 1 (they share the rules' files). Each a draft PR opened when its line is done; one message to the orchestrator after each; stop after the second (or hand over at 250,000 with the status file true). No server file, no cap: both are the page's rules.

The owner, 2026-11-25, playing `?manual=5` with the bow:
- *"Right know I'm having some trouble with archery locking on monsters that aren't the monsters closest to the bro. Like monsters off screen I may have shot accidentally while shooting around but the monster closest to me looks like the only threat and it's locking somewhere else."*
- *"For archery allow shooting the special attack as the first attack (pressing the button shoots the special attack towards the enemy it's facing - ring now it just readies it for the next shot instead of shooting)"*

## PR 1 (6556): the nearest threat first

PURPOSE: the monster a press takes, and the monster a lock holds, is the one the player sees as the threat: the nearest in front of them on the screen. Never one out of view while one in view stands in front of them.

The facts (a reading lane's: check by range): the press is `latchAttackPress` (`src/game/latch.js:343-350`), so `sightNow` and `sightPick` (`src/game/sight.js:80-96`): a cone of 45 degrees a side of `drawnFace(S)` (`SIGHT.CONE_DEG`, :39), a range of 675 x the bow's multiplier (:46-48, `sightRange` :60), and the deciding line :94: the LEAST ANGLE off the facing wins, the distance only breaks a tie. A monster already sighted is kept out to x1.25 and 55 degrees (:91-92). Nothing asks whether the monster is in view. `latchCheck` (`latch.js:207-222`) lets a lock go only at the target's death or past the out range (:217); `latchFrame` (:269-310) moves it at a death.

The readings:
1. **The pick: nearest first.** Among the monsters in the cone and the range, the nearest wins. The angle only breaks a near-tie (two whose distances differ by under 15%: the one nearer the facing's line).
2. **In view first.** A monster outside the view (the world's rectangle the page draws, given to the rule as numbers by its caller; the rule imports nothing and nothing measures the page inside a frame: `docs/specs/layout-reads.md`) is picked only when no monster in view is in the cone.
3. **No flicker.** A monster already picked keeps the pick against a newcomer unless the newcomer is at least 20% nearer, or the kept one has left the view and the newcomer is in it. (The x1.25 and 55 degree keep stays.)
4. **A lock out of view lets go to one in view.** While a latch holds a monster that is out of view, and a monster in view is in range, the latch moves to the nearest such after 400 ms (the transition `latchFrame` already has for a death; one phase field, one transition function: CLAUDE.md §5). A lock on a monster IN view is never taken away by a nearer one: the player chose it.
5. Readings 1 to 3 are `sight.js`'s own, so every mode that asks the sight follows; reading 4 lives where the latch lives. `?nearpick=0` gives back the least angle and the old hold: its row in the switch table.
6. If the view cannot reach the rule without ONE changed call in `src/ui/BroTown.jsx` (card PAD holds that file for the controls' look), change that one call's arguments and say so in the PR body and to the orchestrator.

Done when: `server/test/sight.test.mjs` and `latch.test.mjs` hold these plants red, each written the way a tired programmer would: (a) a near monster 30 degrees off against a far one 2 degrees off picks the far one; (b) a monster out of view picked while one in view is in the cone; (c) the only monster, out of view, NOT picked; (d) the pick flickering between two at 5% apart; (e) a lock on an out-of-view monster held for 2 s with one in view in range; (f) a lock on an in-view monster taken by a nearer one; (g) `nearpick=0` not giving the old answers. Every mutant of the added lines killed, or the survivor listed with why. `tools/qa/mp/mp-nearpick.mjs` (`world: 'wheel'`, its `lane`): with the bow, a near and a far monster, the press latches the near one; once on your box.

## PR 2 (6557): the bow's special at once

PURPOSE: Special with the bow is a first strike. A press with a monster to take shoots the special at it now.

The facts (check by range): in mode 5 the press calls `specialAttack` directly (`src/ui/panels/SpecialButton.jsx` about :244-260; `mcSwipes` is false there). `src/game/playerActions.js:170-209`: with the bow and no target on the drawn sight line (`!(S._bowSight && S._bowSight.d != null)`) it sets `S._bowSpecialQueued = now` and returns, spending nothing; the queue runs out after `BOW_SPECIAL_QUEUE_MS` 2500 (`src/game/combatHelpers.js:205`). `src/game/monsterCombat.js:1822-1829` fires it on the first frame the sight line lands (`_bowSight` is worked out at about :1535-1600 from `rangedAimAngle`, `combatHelpers.js:176`). The worker has no queue: the special is `act('ability_use', {type:'swipe', ...})` (`playerActions.js` about :266) and its arrows `player_projectile` with `isSpecial: true` (:458).

The readings:
1. **With a monster to take** (the latch's; else the one a press of Attack would take now, PR 1's pick: the one function), a press of Special with the bow fires the special AT ONCE along the line to that monster, the bro turned to it, and the latch takes it as an Attack press would. Mana and the cooldown are spent once, as the queued shot spent them; never the queue AND the shot.
2. **With nothing to take**, today's stands: the special is readied for 2.5 s and nothing is spent on empty air.
3. Mode 5 with the bow only: the sword's and the staff's specials, and the other modes' armed path (`mcArmToggle`), are untouched.
4. The choice "fire now, or ready" is a pure function under `src/game/` with its suite; `playerActions.js` gains a call. `?specialnow=0` gives back the queue: its row in the switch table.
5. NOT yours: `SpecialButton.jsx` and every control panel (card PAD is changing their look), the renderers.

Done when: the suite kills every mutant of the added lines (plants: firing with nothing to take; readying with a monster to take; spending twice; the sword's special changed; the switch not giving the queue back). `tools/qa/mp/mp-bowspecial.mjs` (`world: 'wheel'`, its `lane`): with the bow and a monster in the pick, ONE press of Special and no press of Attack: an `ability_use` leaves and the special's arrows fly within 300 ms by the renderer's clock (TRAPS §200), and the monster takes the special's hit; with no monster the special is readied as before; once on your box.

## Both PRs

Files yours: `src/game/sight.js`, `latch.js`, `playerActions.js`, `monsterCombat.js`, `combatHelpers.js`, a new module under `src/game/`, their suites, the switch rows (`--write`), the two phone tests, and the phone tests of the sight and the latch mended where the pick changed (`mp-twobuttons` and its kin). Beside you: card PAD (the controls' look: `BroTown.jsx` and the panels), CT part 22 (the frame and the caret, in `effectsRenderer.js`: it CALLS your pick, so keep `sightNow`'s and `sightPick`'s names and shapes, or tell the orchestrator at once), card EN (`entityRenderer.js`). Do not edit `tools/dev/tag-blocks.json`. Merge `main` ONCE before each PR's one push and write the generated tables again. `node tools/dev/precheck.mjs` passes. Each PR's body says in plain words what the owner will feel, with the preview address (`https://claude-plan-ct-23-nearpick.gamedev-aix.pages.dev/?manual=5`, `https://claude-plan-ct-24-bowspecial.gamedev-aix.pages.dev/?manual=5`). `docs/plan/status/CT.md` true, riding the work's commit; this card committed as `docs/plan/cards/CT-part23.md` in PR 1.
