# Sitting 64's review (v2.3.6276): the CT join #2345

The sitting's facts are in `docs/plan/status/Z.md` (the list) and
`docs/plan/debts.md` (CT 64, PH 64). Below: the purpose lane's own notes
(top model, high), as it wrote them; the owner chose the lighter review at
01:53 UTC after it had run, so no further lanes.

## The lane: review-z64: purpose lane, sitting 64 — PR #2345 (claude/plan-ct-12-join, head 724cc6d8, main 53a5257d)

Scratch worktree: scratchpad/wt-review (node_modules symlinked from the rehearsal tree; node suites only).

## Step 0: read
- Card CT parts 16 (6549), 17 (6550), 18 (6551, the join + lock faces). The card lists NO plants for parts 16-18
  (only item 6's five plants, 6545). Status says "contextButton.js (35 mutants, none left)", "lock-face.test, 6 mutants, none left".
- Baseline suites green on the head: thumb-arc, thumb-side, lock-face, sight.

## Step 1: behaviour (reading)
- 6551 lockFace.js facesLock(engaged, twoLive, phase, lock): off mode 5 (`twoLive` false) returns `engaged` = engagedStance, so the three
  sites (monsterCombat.js:1430 aim write, BroTown.jsx:5627 _lkFace, entityRenderer.js:12329 lockFacing) are unchanged in modes 0-4.
  In mode 5 the latch's lock is written by targeting.js:533 as {type:'monster', ref, src:'auto', latch:true}; phase active/auto -> true.
  So a tap's lock (src 'auto') IS faced in mode 5: the aim write sets S._aimAngle/_aimSrc 'lock'/S._facing each frame, the walk backpedals,
  the renderer's lockFacing is true. A player lock (duel, spar) is not faced by the new rule (type !== 'monster').
- 6550 press (BroTown.jsx:11661-11668): both harvest branches ask `!_ctxPress` (ctxButtonsLive = twoButtonsLive && ?ctxbuttons != 0).
  In mode 5 Attack's press goes on to twoButtonPress; a swing during a harvest is refused by playerActions.js:37 (the harvest goes on).
  Off mode 5 the harvest press is ctxTap({kind:'node', skill: ctxSkillOf(node)}): the same four nodeTypes, the same try/catch.
- 6549: thumbFrame gated at BroTown.jsx:5364 `if (twoButtonsLive())`; specialsShown/blockShown return true and chargeShown false with twoOn false;
  combatReach unchanged off mode 5; thumbAnchor null off the arc.

## Step 2: plants (tools/dev/plants/batch.mjs, each alone, the part's own suites; lists in scratchpad/plants/p49|p50|p51.json, raw output *.out)
Baseline on the head: thumb-side, thumb-arc, sight, lock-face, context-button, phase-table, state-ledger, switches(+thrown), latch,
free-attack, say, layout-reads, four-lines, two-buttons-choose, manual-combat, stick-zones, screens-listed, scenario-lanes: all green.
The card lists no plants for parts 16-18 (only item 6's five, 6545, not in this diff).

### 6551 (lock-face)
| plant | suite | result |
|---|---|---|
| L1 BroTown.jsx:5628 `_lkFace = engagedStance(S);` on the line after the site | lock-face | GREEN |
| L2 monsterCombat.js:1430 `if (!S.autoAttack && lock.src==='auto') _lkRef = null;` before the aim site (63's finding put back) | lock-face, latch | GREEN, GREEN |
| L3 entityRenderer.js:12330 aimAttackActive asks engagedStance(S), lockFacing left unused | lock-face | GREEN |
| L4 lockFace.js:27 `lock.type !== 'npc'` (a PLAYER's lock faced in mode 5) | lock-face | GREEN (a live mutant of the module; "6 mutants, none left") |
| L5 control: targeting.js:809 the gate handed as `tapLockOn() === false` | lock-face | RED (3a) |
| L6 targeting.js:809 bodyFacesLock: `if (S._latchPhase==='active') return engagedStance(S);` first line | lock-face, latch | GREEN, GREEN |

### 6550 (context-button)
| plant | suite | result |
|---|---|---|
| C1 contextButton.js:64 ctxButtonsLive `return ctxButtonsOn();` (EVERY mode: Attack stops harvesting in mode 4, a button under trees) | context-button, latch | GREEN, GREEN |
| C2 ctxButtonsLive asks twoButtonsOn() (a mouse) | context-button / latch | GREEN / RED (H2) |
| C2b ctxButtonsLive asks manualMode() === 5 | context-button, latch, two-buttons-choose | GREEN x3 |
| C3 BroTown.jsx:10642 TALK's tap without its townsperson (`tapNpcAtCss(x, y)`: a search 34 px under his feet) | context-button | GREEN |
| C4 BroTown.jsx:11665 modes 1-4: the harvest press `skill: 'woodcutting'` always | context-button | GREEN |
| C5 BroTown.jsx:11701 Attack harvests in mode 5 through an alias `_n5` beside twoButtonPress | context-button / free-attack | GREEN / RED (6b) |
| C6 ContextButton.jsx:122 the button fires at the lift too | context-button | GREEN |
| C7 ContextButton.jsx:106 zIndex 29 -> 32 (over Attack and the arc: the join's own mend undone) | context-button, thumb-arc | GREEN, GREEN |
| C8 control: BroTown.jsx:6263 `busy: false` | context-button | RED (6c) |
| C9 a second flag S._ctxLive beside the gate | context-button / state-ledger | GREEN / RED (4) |
| C10 ContextButton.jsx:39 ctxPick handed `live: true` always (the button in every mode) | context-button, latch | GREEN, GREEN |
| C11 BroTown.jsx:15880 the button's tap on a beat acted as a node | context-button | GREEN |

### 6549 (thumb-side, thumb-arc, sight)
| plant | suite | result |
|---|---|---|
| T1 thumbGlue.js:31 `S['_thumb' + 'Phase'] = 'threat'` | thumb-side, state-ledger, phase-table | GREEN x3 |
| T2 BroTown.jsx:5364 `var _tc = {_thumbPhase:'calm'}; Object.assign(S, _tc)` | thumb-side, state-ledger | GREEN, GREEN |
| T2b control: `Object.assign(S, { _thumbPhase: 'calm' })` literal | thumb-side | RED (5) |
| T3 BroTown.jsx:5364 the frame's gate dropped (thumbFrame in every mode) | thumb-side, latch, sight | GREEN x3 (harmless off mode 5 by reading) |
| T4 thumbSide.js:131 a second field `S._thumbReach = true` | thumb-side / state-ledger / phase-table | GREEN / RED (4) / GREEN |
| T4b a second boolean READ (`blockUp || S._thumbHurt`) | thumb-side, sight / state-ledger | GREEN, GREEN / RED (4) |
| T5 thumbSpot.js:16 `arcOn(true, ...)` (the arc in EVERY mode: modes 1-4's buttons move) | thumb-arc, sight, latch | GREEN x3 |
| T6 thumbSpot.js `manualMode() === 5` in place of the gate | thumb-arc, latch, sight | GREEN x3 |
| T7 ChargeButton.jsx:46 the press without chargeLock | thumb-side, sight | GREEN, GREEN |
| T8 thumbGlue.js:36 a sword's gap centre to centre (engageGap dropped) | thumb-side, sight | GREEN, GREEN |
| T9 JumpButton.jsx:150 Jump on Block's spot (`thumbAnchor('block')`) | thumb-arc, sight | GREEN, GREEN |
| T10 controlVisibility.js:172 combatReach no limit in every mode | sight | RED (8) |
| T11 RideButton.jsx:71 the arc gate dropped, hidden after any hit (a modes 1-4 change) | thumb-side, sight, latch | GREEN x3 |
| T12 `.bind`: ChargeButton.jsx:99 `chargeShown.bind(null, S, true)` in the render gate | sight | RED (10) |
| T13 BroTown.jsx:5364 thumbFrame fed performance.now() (an unseen hit never a threat) | thumb-side, sight | GREEN, GREEN |
| T14 specials at a threat | sight | RED (8) |
| T15 `?chargebtn=0` ignored | sight | RED (8) |

### Sitting 63's plants
- The head claims two mends of 63's findings: the facing (6551; 63 named it "for the owner to hear", not a plant) and mp-twobuttons' PICK
  (a phone scenario: read, not run -- `skip: used`, and a monster under full health passed over; reads right).
- None of 63's five GREEN plants is claimed mended in this head. Re-run for the record: targeting.js:516 `latchPhase(S) === 'active'`
  GREEN (latch, lock-face); BroTown.jsx:5364 `if (_lw) S.autoAttack = _lw` GREEN (latch, free-attack). Both stay debts, as written.
- So: no sitting-63-named plant claimed mended is green. (L2 above is 63's FINDING re-planted by a side door: green; the plain spelling,
  a site back to engagedStance, is red by 3b-3d.)

## Step 1 (cont.): behaviour findings, by reading and by the suites
No behaviour bug found that changes modes 0-4, claims the worker's authority, or breaks a part's purpose at the head.
- Authority: nothing new claims damage, loot or economy. Charge is castAbility(S,'sworddash') (abilities.js:926), the worker's as always;
  the context button calls the same _startExtraction / _startCookingAtCampfire / tapNpcAtCss doors. No `{}` keyed by a client id (the one
  new map, CTX_NODE_WORDS/CTX_BEAT_WORDS, is frozen and keyed by the game's own nodeType/skill; thumbArc asks hasOwnProperty).
- Z order: ContextButton z 29; Attack's box 30 (TouchControls.jsx:371), the left disc's box 30 (game.css .bt-joystick-zone), every other
  control 31 (Jump, Ride, Sprint, QuickEat, Block, Special, abilities, Charge, WeaponPill), the zones 6. No collision: a thing under a
  thumb is drawn under the control and the control takes the tap. Not pinned by any node suite (plant C7 green).
- Modes 0-4, every new path: BroTown.jsx:5364 thumbFrame (twoButtonsLive); :5627 / monsterCombat.js:1430 / entityRenderer.js:12329
  bodyFacesLock (facesLock returns engagedStance when !twoLive: lock-face 1); BroTown.jsx:6143 `_ctxOn`, :6196, :11661-11664 `_ctxPress`
  (ctxButtonsLive); :6263 ctxButtonFrame (called every mode, `live: _ctxOn`: with live false it writes two expando fields on its own
  element and nothing else); :11665 the harvest press now ctxTap(ctxSkillOf(node)) (same four nodeTypes, same try/catch: unchanged);
  tapNpcAtCss's third argument (undefined for its three old callers); ExtractionSwipeLayer.jsx:208 (the button only with data-show=1,
  never off mode 5); specialsShown / blockShown / combatReach (true / true / base off mode 5: sight 8); chargeShown false; thumbAnchor
  null off the arc (thumbSpot.js:16); RideButton.jsx:71 (thumbArcLive first). One new cost in every mode: ChargeButton's 200 ms render
  (the house tick of its neighbours) that returns null, and the hidden ContextButton element. VERDICT: unchanged, by reading.
  What holds it in node: lock-face 1, sight 8/10, latch H2. What does NOT (plants C1, C2b, C4, C10, T3, T5, T6, T11 all green):
  ctxButtonsLive's gate, the stamp's `live`, modes 1-4's harvest mapping, the arc's gate, Ride's gate. Those rest on the phone scenarios.
- OPEN EVIDENCE for modes 1-4: #2344's own last run of mp-contextbuttons had step 5 RED ("mode 4: a press of Attack starts the chop, as
  before"); the author reads it as the test's (a pine an earlier pass chopped), unconfirmed, "a helper session runs it next" (status CT
  "Found", PR #2344 "Two failed"). By reading the mode-4 press is the same road that passed with `&ctxbuttons=0`. This lane ran no
  browser: the gatekeeper should see that step green (or red the same way on main) in the rehearsal/helper run before the merge.

### Not what the owner was told (for the owner to hear; not holds)
- #2344's body and the card (CT.md "a press swings (during a harvest too: the harvest goes on)") say Attack SWINGS during a chop. It
  does not: the press only ASKS (tapJump.js:258 requestTapAttack, S._tapAttacks++), and both swing roads refuse during a harvest
  (playerActions.js:37 `if (S._extraction) return;`, the owner's v2.3.1500; monsterCombat.js:1670 `!S._extraction`). The ask lapses at
  600 ms (TAP_ATTACK_WAIT_MS). mp-contextbuttons 2e passes on the ask counter (`w1.taps > wait0.taps`), not on a swing. The chop does go on.
- #2342's body: "Nothing on the worker changes (no server file), so this deploys nothing". It adds server/test/thumb-side.test.mjs and
  thumb-arc.test.mjs and changes sight.test.mjs; the join adds lock-face.test.mjs: the merge touches server/** and DEPLOYS the worker
  (CLAUDE.md section 4, TRAPS 277). #2345's body says "only the server's test folder gets a new test" and not that it deploys.
- The card's last line: "`playable` and `memory-budget` green on every PR; no memory line raised." Part 16 raises one (below).

### New holes (CT's next job)
1. src/game/contextButton.js:64 ctxButtonsLive: no suite calls it (plants C1 `return ctxButtonsOn();`, C2b `manualMode() === 5`: green).
2. src/ui/panels/ContextButton.jsx:39 (C10 `live: true`), :106 z 29 (C7), :122 a second fire at the lift (C6): green; no node guard reads the panel.
3. src/ui/BroTown.jsx:11665 modes 1-4's harvest press (C4 `skill: 'woodcutting'`), :10642 TALK's `npc` dropped (C3), :15880 (C11): green.
4. src/ui/panels/thumbSpot.js:16 the arc's gate (T5 `arcOn(true, ...)`, T6 `manualMode() === 5`): green; no suite loads thumbSpot.js.
5. src/game/thumbGlue.js:31-36 (T1 computed-key write of the phase, T8 engageGap dropped), BroTown.jsx:5364 (T2 Object.assign through
   a variable, T3 the gate, T13 the clock): green in thumb-side, state-ledger and phase-table; thumbGlue.js has no node suite.
6. src/ui/panels/ChargeButton.jsx:46 (T7 the lock dropped), JumpButton.jsx:150 (T9 another button's spot), RideButton.jsx:71 (T11): green.
7. src/game/lockFace.js:27 (L4 `lock.type !== 'npc'`: a player's lock faced, a fight between players) green: the suite's locks have no
   player. src/ui/BroTown.jsx:5628 (L1), src/game/monsterCombat.js:1430 (L2), src/rendering/systems/entityRenderer.js:12330 (L3),
   src/game/targeting.js:809 (L6): green -- lock-face 3b-3d read that the call is PRESENT, not that its answer is what is used.
8. src/ui/BroTown.jsx:6163 `_lockHeld = engagedStance(S)`: a tap's latched lock (src 'auto', 'active') on a monster past 220 px is no
   "lock held", so S._btnHarvest and the button's `busy` are false: CHOP and TALK are offered in a latched fight (the header of
   contextButton.js says "no lock"; 6551 made the same lock turn the body, and left this site on engagedStance).
9. src/game/controlVisibility.js:149 chargeShown never asks `fight` though its header says a fight between players "never shows Charge":
   in a duel with a monster in sight Charge shows, chargeLock latches the MONSTER, and maybeSwordDash dashes at S.lockedTarget, the
   PLAYER (targeting.js:602 returns before latchLock for a player's lock). sight 8's "never Charge" check has nothing in sight.
10. src/game/thumbSide.js:182 chargeLock locks 'active' whatever the hold's rule: with `?holdauto=0` Charge leaves a lock that the next
    Attack press lets go ('unlock', no strike). And on cooldown a Charge press still locks (ChargeButton.jsx:46 before :48).
11. tools/qa/mp/mp-contextbuttons.mjs:216 step 2e reads the ask, not a swing (see above).

## Step 3: the memory raise
`tools/qa/mp/memory-budget.mjs` buffers 24.8 -> 25.0 MB. Stated with the MB and why in the commit (ab2eea76: "the base read 24.7 and
rising, this PR 24.9; its script about 12 KB"), in the line's own comment, in #2342's body ("Memory: one line raised, 0.2 MB": the base
24.2, 24.5, 24.7 over three trips; this PR 24.9; about 12 KB of script counted by that reading) and in #2345's body ("The memory line
it raises"). PR bodies read through the GitHub connector (read only). CLAUDE.md's rule is met. Note: the reason given is mostly main's
own drift (0.1 under the line before this PR), and the card's own last line says no memory line is raised: the gatekeeper's / owner's call.
`measured: 23.5` on that line is left stale (debt 58).

## Step 4: closing keywords
None: no fix/fixes/close/closes/resolve/resolves + #number in the 17 commit messages, in the docs' diff (card, status, UI-DESIGN-NOTES,
SWITCHES, SYSTEMS) or in the bodies of #2345, #2342, #2344.

## Verdicts
- 6549 (#2342): LAND. No behaviour bug; no card-listed dodge for part 16; 6 plants red, 11 green (debts above).
- 6550 (#2344): LAND, with the open evidence above (mp-contextbuttons step 5, mode 4) to be seen green by the phone lane. 3 red, 9 green.
- 6551 (the join's): LAND. The body does face a tap's lock in mode 5 and only there (reading + lock-face 1, 2). 1 red, 5 green.
- Sitting 63: none of its named plants is claimed mended; its two re-run stay green as debts.
