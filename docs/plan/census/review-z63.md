# The gatekeeper's review, sitting 63 (card Z; tag 6275)

The first sitting of 2026-11-25, by the owner's leave (2026-11-24: "I'd
prefer to get all the stuff done ASAP so don't wait until tomorrow for
anything"; 23:3x: "continue ASAP"). The rule of `docs/plan/finish.md`
part 8 (card Z step 4b): only a red rehearsal or `test`, a bug in
behaviour, a card's own dodge still green, or an earlier review's plant
still green on the head listed as its mend holds a PR. A reviewer's NEW
hole is a line of `docs/plan/debts.md`, and the PR lands.

The queue, given by the orchestrator (part 15): ONE line, a stack, on
`main` afc215c6 (sitting 62's list, all merged). Both heads checked
against `origin`: as given. One merge base with `main` (afc215c6); `main`
is an ancestor of the top.

## The verdict

| Line | PR | Head | Verdict |
|---|---|---|---|
| CT | #2340 (draft, base main, 9a289461) under TOP #2341 (draft, base `claude/plan-ct-8-freefire`) | 3c86a24e | LAND: the purpose lane (top model, high) PASS, no bug in behaviour, modes 1-4 unchanged; `test`, playable, memory-budget, lint-build green on 3c86a24e and on 9a289461; the rehearsal green |

## CT #2340 + #2341: the purpose lane

- Suites on 3c86a24e: `latch`, `free-attack` (25 of 25),
  `two-buttons-choose`, `switches`, `state-ledger`, `sight`,
  `manual-combat`: green.
- Modes 1-4: every new path asks `twoButtonsLive()` (`BroTown.jsx`
  :11702 press, :11710 move, :11828/:11831 lift, :5364 frame;
  `monsterCombat.js:1834` in `freeArrowGo`); the one ungated call,
  :11901 `_releaseButton` -> `twoButtonRelease`, does nothing off mode 5.
- Tap and hold, simulated: a 150 ms tap with its lift never fills (one
  attack, active); a kill in auto goes idle `killed`; a death mid-hold and
  a zone change in auto go idle. `?autohold` is safe for NaN, negative,
  1e9, empty, 0 (600, or clamped 200 to 3000); `?holdauto=0` is #2340's
  press; `?freefire=0` honoured. The phase has one writer (`latchTo`);
  `S.autoAttack` is derived from it. Nothing claims the server's
  authority.
- The author's survivor, `targeting.js:516`: harmless at the head (it
  reads `latchLocked(S)`, active or auto, so the lock holds in auto); the
  mutant `=== 'active'` is green: a debt.
- Plants, each alone: 13 RED (10 from the card: a tap lets the lock go;
  the tap that ends auto also strikes; a kill moves the lock; a lift does
  not end the hold; `handleRBtnPress` beside the press; the free arrow in
  every mode; `?freefire=0` and `?holdauto=0` ignored; a hold started off
  a lock; the held attack on a tap's lock; 3 of the lane's own:
  `Object.assign(S, {_latchPhase})`, `latchPress.bind` dropping the hold,
  the fill by `AUTOHOLD.MS`). 5 GREEN, all debts (`docs/plan/debts.md`
  CT, 63): a second field carrying auto beside the phase (the card's
  line 135 "Never a second boolean" is a rule the head keeps, not a
  listed plant), the lift's two release calls taken out, the slide from
  `bSwipe.lx/ly`, the kill's `false` unwritten at :5364, the survivor.
- For the owner to hear (not holds): "'active': the body faces it"
  (`latch.js:66-68`) is not what the code does between swings: a tap's
  lock is `src: 'auto'`, so `engagedStance` (`targeting.js:798-803`) is
  false and the body does not turn; only the hit goes to the lock. And
  (part 14's reading) after a kill everything lets go in mode 5.
- dc615d6f (the lift ends its hold before the `changedTouches` lookup) is
  harmless; the lane reads the likelier cause of the red run as the
  test's: `HOLD(150,100)` at `mp-twobuttons.mjs:540` makes three page
  reads with the finger down, which can pass 600 ms of wall clock (debt).

## mp-twobuttons on 3c86a24e (the orchestrator's helper)

98 PASS, 10 FAIL, 2 SKIP of 108 (1810 s). Upright: every step PASS (the
mended tap holds). Sideways: the 10 FAILs are one cascade from "2b.
sideways: a TAP": the target wm-mist-1 died at that one tap (`taps: 1`,
one attack asked: `tapJump.js:258` counts `requestTapAttack`), so the
latch let go by the rule and every later sideways step ran one state off.
A lane's reading: the TEST's. The scenario runs whole upright then whole
sideways (:320) with a new character in the same room, and `PICK`
(:503-505) takes the same monster that upright's 2b, 2c (:681 `hurt` to
1 hp) and 7d arrows hit, with no full-health wait. `freeAttack.js:88-95`
asks `requestTapAttack` once a press. A debt and CT's next job, not a
hold. The 2 SKIPs are 7d both ways (another monster in sight).

## Step 5: the rehearsal

`node tools/dev/gatekeeper.mjs claude/plan-ct-9-hold` on `main` afc215c6:
tree 0d586adbf815dd482478ce401f526bb7cbd20efc (29 files differ; the same
tree as 3c86a24e's own). precheck PASS, switches thrown `--whole` PASS,
`claims-gain --whole` PASS (564 s), build PASS, questline 187 of 187, the
unminified build PASS, heldsweep's stand, town and ride 6 of 6.

## Step 5b: what GitHub will merge

- #2341's base is `claude/plan-ct-8-freefire`: it is retargeted to `main`
  before its merge, and #2340 (its base `main`) lands with it. One merge
  base, afc215c6.
- No closing keyword in either body.

## Deploys

#2341 changes `server/test/latch.test.mjs` (nothing under `server/src`):
its merge DEPLOYS the worker (TRAPS §277). #2340 touches no server file.
