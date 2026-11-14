card: LB
branch: claude/plan-lb-2-window (PR 2, begun from claude/plan-lb-1-pieces)
prs: #1771 (5500, ready; the owner to see its pieces before PR 2 uses them); PR 2 (5501) working
state: working

## Done

- #1771 (5500), the pieces: the owner's sheet and two mockups under
  `assets/ui/leaderboard/`; 27 pieces cut by the sheet's own alpha
  (`tools/ui/cut-leaderboard.mjs`, the door's four steps, family
  `ui-leaderboard`, draw `none`); the papers (`sources.json`, `CREDITS.md`),
  the MEMORY-MAP slot, `docs/specs/leaderboard-look.md`, the card, LB's
  tag block.

## Next

- PR 2 (5501), the window after mockup 2: built; `mp-boardslook`, `mp-boards`
  (moved to the medals), `questline`, `mp-membudget` running. No pages (the
  board scrolls in the band; the spec says why).

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
