# The gatekeeper's review, sitting 35 (card Z; tag 5673)

Taken 2026-11-17 on `main` 01b8f33d (sitting 34 merged: K #2021, K
#2023, L #2022, Z #2025). Two cards still run (K and L), told this
sitting's session at its start (14:22 UTC). Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open and not a draft,
with one merge base at every step (`git merge-base --all`, each against
`main` with the PRs above it merged in as merge commits). The tree after
each merge:

1 K #2024 c778c6801a9ae4005a967e963937df52b0b03a57 -> a8c8232238083a0532af94e1a6d8a73be3aa8074
@@MORE@@

#2024 was built on #2021 and #2023 (K merged #2023's head 5594e52d in at
sitting 34's word); both are now on `main`, so its one base is 5594e52d.
Its PR page still shows the base sha ea7df6b0 (where it was opened); its
`base.ref` is `main`.

## K #2024 (5551): `swordswing` and `movetop` ON (the owner's yes)

READY (reviewed in full: `server/`). The owner's yes, relayed by the
planner at 13:21 UTC: "Go recommended". The two switches merged OFF
(#2018 at sitting 33, #2021 at sitting 34), reviewed then in full; this
PR turns their defaults:
- `server/src/movement.js` `_moveTopOn()` and `server/src/swordswing.js`
  `_swordSwingOn()`: from "an own `true`" to "on unless an own falsy
  value", the form the ON switches already use (`power.js` 349,
  `store.js` 1250, 1283). `movetop: false` / `swordswing: false` in the
  live flags is the kill switch: every path as before #2021 / #2018.
- The switch table (`switches.mjs`, `SWITCHES.md`): both rows `thrown:
  'false'`, `on: 2026-11-17`; their `thrownFails` now the one check that
  tests the new path (move-budget 10, hit-proof 4b).
- 16 server suites: those that test the flat 500 px a second itself
  (move-budget 1-8, move-path, ride, sprint, potions, prog3, last-place,
  monsterstatus) set `movetop: false` explicitly; those that swing a test
  sword faster than a cycle clear the swing's bucket (`_ss`) as they
  already clear the cadence (`_monHitCad`): "the next swing a cycle
  later, as in real play". No assertion removed; hit-proof 4b's count
  30 -> 24 (one swing takes SWING_TARGETS, #2018's own rule);
  combat-lifecycle section 6 measures the spark with `swordswing: false`
  (the sword's `noKb` is only believed there) and puts the flags back.
  New: move-budget 10 (with `movetop` on, an honest walk and a walk just
  under its own top all taken; 600 px a second with no stats behind it
  followed, not taken whole).
- The bench (`claims-gain`): the expected gains `reach` 2.96 -> 1.42 and
  `move` 2.56 -> 1.17; 2d and 2e now run their off sides with the switch
  thrown, and 2e asks the on gain to be under the bar AND under the off.
- What a player feels: a sword claim lands from 150 px (was 400), one
  swing a cycle with an allowance of two, a swing's ring at 24 targets;
  the move's bound is the player's own top speed (a new character ~293 px
  a second before the buff, the ride and the sprint) instead of 500. K's
  phone runs at #2021 with `movetop` on: sprint 38/38, townride 10/10,
  rollhit 5/5, questline 187/187.
- Review note, not a hold: the ride, sprint and potion suites are now
  held only on the flat bound (`movetop: false`); with it on they are
  covered by the bench and #2021's phone runs, not by a node suite.
- Found (carried from sitting 34, now live): `swordswing` (ON with this
  PR) and `bowshot` ask `_tm` (combat.js 1312-1375, 1735) but
  `testmode.js`'s header names neither (CLAUDE.md §5): card K.
- DEPLOYS the worker (`server/src/`).

@@REST@@
