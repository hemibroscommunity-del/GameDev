card: LB
branch: claude/plan-lb-4-done (the status, done, on main)
prs: #1771 (5500), #1783 (5501), #1798 (5502): all merged
state: done

## Done

- #1771 (5500, merged): the owner's sheet cut into 27 pieces by its own
  alpha (`tools/ui/cut-leaderboard.mjs`, family `ui-leaderboard`); the
  papers, the MEMORY-MAP slot, the spec.
- #1783 (5501, merged): the window after the second mockup (title, pills,
  podium, table, no pages); sittings 10 and 11 mended.
- #1798 (5502, merged): Overall and the Power rating (Overall's columns
  only), the Stats group (`caps.statboards`), the caps' rows.

## Next

- Nothing: the card is done.

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
- #1783 held at the gatekeeper's sitting 10 (whole names at 375 px, the
  podium's value, two "Lv"; lows): mended (mp-boardslook 18/18, mp-boards
  37/37, the 375 px picture in the PR). `CAP_GATES`'
  `power` row is PR 3's (#1783 reads no cap).
