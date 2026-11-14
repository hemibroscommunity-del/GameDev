card: PW
branch: claude/plan-pw-2-boards (holds #1774's and #1778's branches; merge them first)
prs: #1774 (5480, ready), #1778 (5483, ready), #1776 (5481, ready; last)
state: ready

## Done

- #1774 (5480): `server/src/power.js` (the control, the fight on averages,
  `powerOf`), `power.test.mjs` + `power-sim.mjs`, the spec, this card, the
  PW tag block. Within five levels the index names the winner 84% of the
  time, today's sum 64%, the plain level 82%.
- #1778 (5483, the owner's AP report): every join's board report wrote
  `ap: 0` (a join carries no `rpgData`); the AP is now ps.achievementPoints,
  its own field, in the signature (boards.test §11, red before).
- #1776 (5481): the row's `powerIndex`, the Power board, `caps.power`, the
  live flag `power` and its switch row, wire notes, a SHAPES row; no new
  write (cost-guard green); suite §6. Holds #1778 merged in.

## Next

- The gatekeeper: #1774, #1778, then #1776. Stat boards: on hold (owner).

## Found

- The join report also zeroes `lifeTotal`, `dungeons`, `goldEarned` and
  `playtime` (the blob's other columns) until 5 min after each login (told
  the planning session; left as they are).
- The level edge (prog3.js prog3Edge) takes all of a weaker player's points
  five levels down: the plain level calls 99.7% of fights 4+ levels apart.

## Needs

- (the owner's, via the planning session) The scale: exponent 2 (odds),
  exponent 0.5, or a rating (control 1,500, floored at 0: ties 401 of 909
  characters under level 16; control 3,000: nobody floored). Numbers sent
  2026-11-14. A change is `POWER.ALPHA` (or the reading) and `POWER.V`.
- (the owner's) The five stat boards: held; the names are retired.
- Files outside the card (named in the PRs): guards/lib/systems.mjs
  (approved); caps-audit.test, DevPanel.jsx, guards/lib/switches.mjs,
  SHAPES.md (#1776).
