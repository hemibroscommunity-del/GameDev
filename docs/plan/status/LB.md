card: LB
branch: claude/plan-lb-2-window (PR 2, begun from claude/plan-lb-1-pieces)
prs: #1771 (5500, ready; the owner's yes); #1783 (5501, draft until questline and membudget; after #1771)
state: working

## Done

- #1771 (5500), the pieces: the owner's sheet and two mockups under
  `assets/ui/leaderboard/`; 27 pieces cut by the sheet's own alpha
  (`tools/ui/cut-leaderboard.mjs`, the door's four steps, family
  `ui-leaderboard`, draw `none`); the papers (`sources.json`, `CREDITS.md`),
  the MEMORY-MAP slot, `docs/specs/leaderboard-look.md`, the card, LB's
  tag block.

## Next

- #1783: `questline` and `mp-membudget` (before on main, after here), then
  ready. PR 3 (5502): Overall and the Power rating (held in #1783:
  caps-audit refuses a cap before #1776 sends it) and PW's stat pills.

## Found

- The sheet is already see-through: its "gradient" is colour under alpha 0
  (565,671 pixels), so the cut needs no key at all (the spec, part 2).
- A second mockup came after the card (2651b21fc): committed with the first.
- Today's rank trophies (`public/icons/ui/rank-<n>.webp`, the owner's
  2026-11-09 sheet, `tools/ui/cut-rank-trophies.py`) are what the card's
  medals 1-3 replace in PR 2.

## Needs

- Answered (2026-11-14): the owner's "Yes" to the pieces; the layout is the
  second mockup's; PW's fields (`powerIndex {power, melee, bow, magic, v}`,
  `caps.power` the version); the stat boards held, none built.
- PR 2 adds `power` to `CAP_GATES` (`DevPanel.jsx`, one line): told the
  planning session and PW (whichever lands second drops its copy).
