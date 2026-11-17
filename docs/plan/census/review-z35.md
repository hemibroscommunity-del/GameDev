# The gatekeeper's review, sitting 35 (card Z; tag 5673)

Taken 2026-11-17 on `main` 01b8f33d (sitting 34 merged: K #2021, K
#2023, L #2022, Z #2025). Two cards still run (K and L), told this
sitting's session at its start (14:22 UTC). Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open and not a draft,
with one merge base at every step (`git merge-base --all`, each against
`main` with the PRs above it merged in as merge commits). The tree after
each merge:

1 K #2024 fe1297b0b43e5c23f19a7d57847bdeb17544ea8d -> 72a2f75571700a54e74ee580358fdc2c77cadf17
@@MORE@@

#2024 was built on #2021 and #2023, both now on `main`. Rehearsed at
c778c680 (one base 5594e52d, tree a8c82322); at 14:44 K sent fe1297b0:
`main` 01b8f33d merged in (its one base now `main` itself) and sitting
34's carry fixed. The new tree differs from the rehearsed one in three
files only: `server/src/testmode.js` (five comment lines), `docs/specs/
test-mode.md` (two rows), `docs/plan/status/K.md`.

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
- Sitting 34's carry, fixed here (fe1297b0): `swordswing` and `bowshot`
  (each asks `_tm`, combat.js 1312-1375, 1735) are now named in
  `testmode.js`'s header and `test-mode.md`'s table (CLAUDE.md §5's three
  lists; `test-mode` §8 already lists combat.js). Comments and a doc
  only: no behaviour change.
- DEPLOYS the worker (`server/src/`).

@@REST@@
