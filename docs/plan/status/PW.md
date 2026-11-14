card: PW
branch: claude/plan-pw-4-statboards (from -pw-2-boards; merge #1774, #1778, #1776 first)
prs: #1774 (5480), #1778 (5483), #1776 (5481), #1781 (5484): all ready, in that order
state: done

## Done

- #1774 (5480): `server/src/power.js`, `power.test.mjs` + `power-sim.mjs`,
  the spec, this card, the PW tag block. Within five levels the index names
  the winner 84% of the time, today's sum 64%, the plain level 82%. The
  score is the owner's rating (3,000 the control, 400 = ten times the odds,
  `POWER.V` 2), floored at 1 for a style one can fight in.
- #1778 (5483, the owner's AP report): every join's report wrote `ap: 0`;
  now ps.achievementPoints, in the signature (boards.test §11, red before).
- #1776 (5481): the row's `powerIndex`, the Power board, `caps.power`, the
  live flag `power` and its switch row, wire notes, a SHAPES row; no new
  write (cost-guard green); suite §6. Holds #1778 merged in.
- #1781 (5484): `pts_<stat>` a shared stat and `pts_dmg`, the game's
  own names, `statPoints` on the row inside the signature, `caps.statboards`
  (a count), the flag `statboards`; statboards.test (20).

## Next

- Nothing: the gatekeeper, #1774, #1778, #1776, #1781. PR 3 (5482) unneeded.

## Found

- `lifeTotal`, `dungeons`, `goldEarned`, `playtime` (zeroed by the join
  report too): columns nobody reads. Only the old panel (panels/
  LeaderboardPanel.jsx) shows them, and no button opens it; left as they are.
- The level edge (prog3.js prog3Edge): a weaker player's points are gone
  five levels down, so the level alone calls 99.7% of fights 4+ apart.

## Needs

- None. The floor at 1 and the control at 3,000: confirmed (11:17).
- Files outside the card (named in the PRs): guards/lib/systems.mjs,
  caps-audit.test, guards/lib/switches.mjs, SHAPES.md.
