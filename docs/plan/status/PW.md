card: PW
branch: claude/plan-pw-2-boards (from claude/plan-pw-1-power; merge #1774 first)
prs: #1774 (5480, ready), PR 2 (5481, working)
state: working

## Done

- #1774 (5480): `server/src/power.js` (the control, the fight on averages,
  `powerOf`), `power.test.mjs` + `power-sim.mjs` (the control 1,000, the
  dice against the door, never lowers, the prediction, six break proofs),
  the spec, this card, the PW tag block. Within five levels the index
  names the winner 84% of the time, today's sum 64%, the plain level 82%.
- PR 2 (5481): the row's `powerIndex`, the Power board (`getTop('power')`),
  `caps.power` (own line, CAP_GATES, a caps-audit row until LB reads it),
  the live flag `power` and its switch row, wire-table notes, a SHAPES
  row; no new write (cost-guard green); suite §6.

## Next

- PR 2 to the gatekeeper; the five stat boards wait on Needs (2).
## Found

- The card's stat names (Might, Fortitude, Vitality, Agility, Mind) are
  nowhere in the worker: the old tier-1 stats, retired (StatScreenPanel.jsx
  v2.3.1236 note). The worker stores prog3's `alloc` (hp, def, dodge, stam,
  mana, eres, move) and a lane each (dmg, luck, aspd, special, range, elem).
- The level edge (prog3.js prog3Edge) takes all of a weaker player's points
  five levels down: the plain level calls 99.7% of fights 4+ levels apart.

## Needs

- (1, the owner's: what players see) The scale: exponent 2 makes scores the
  odds; the median character reads 1 up to level 15, millions from 25.
  Keep it, or exponent 0.5 (17 at level 1, 1,000 the control, 11,000 at
  40; the same order)? Asked the planning session 2026-11-14.
- (2) PR 2's five stat boards: which stored points each reads (proposed:
  might = dmg summed over the lanes, fortitude = def, vitality = hp,
  agility = dodge, mind = mana). Asked 2026-11-14.
- Files outside the card (named in the PRs): guards/lib/systems.mjs (#1774);
  caps-audit.test, DevPanel.jsx, guards/lib/switches.mjs, SHAPES.md (PR 2).
