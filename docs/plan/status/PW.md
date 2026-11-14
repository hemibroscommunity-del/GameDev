card: PW
branch: claude/plan-pw-2-boards (holds #1774's and #1778's branches; merge them first)
prs: #1774 (5480, ready), #1778 (5483, ready), #1776 (5481, ready; last)
state: working

## Done

- #1774 (5480): `server/src/power.js`, `power.test.mjs` + `power-sim.mjs`,
  the spec, this card, the PW tag block. Within five levels the index names
  the winner 84% of the time, today's sum 64%, the plain level 82%. The
  score is the owner's rating (3,000 the control, 400 = ten times the odds,
  `POWER.V` 2), floored at 1 for a style one can fight in.
- #1778 (5483, the owner's AP report): every join's board report wrote
  `ap: 0` (a join carries no `rpgData`); the AP is now ps.achievementPoints,
  its own field, in the signature (boards.test §11, red before).
- #1776 (5481): the row's `powerIndex`, the Power board, `caps.power`, the
  live flag `power` and its switch row, wire notes, a SHAPES row; no new
  write (cost-guard green); suite §6. Holds #1778 merged in.

## Next

- The stat boards (5484), after #1776: a board a shared stat and one Damage
  board, the game's own names, `caps.statboards`, on the report's points.

## Found

- The join report also zeroes `lifeTotal`, `dungeons`, `goldEarned` and
  `playtime` (the blob's other columns) until 5 min after each login (told
  the planning session; left as they are).
- The level edge (prog3.js prog3Edge) takes all of a weaker player's points
  five levels down: the plain level calls 99.7% of fights 4+ levels apart.

## Needs

- (owner, via the planning session; told 2026-11-14) The rating's floor: a
  few level-1 staffs fall under 0 at a control of 3,000, so a fightable
  style floors at 1; a control at 3,200 would clear the floor.
- Files outside the card (named in the PRs): guards/lib/systems.mjs
  (approved); caps-audit.test, guards/lib/switches.mjs, SHAPES.md (#1776).
