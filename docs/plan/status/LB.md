card: LB
branch: claude/plan-lb-2-window (PR 2, begun from claude/plan-lb-1-pieces)
prs: #1771 (5500, merged); #1783 (5501, ready); #1798 (5502, draft until its phone tests)
state: working

## Done

- #1771 (5500, merged): the owner's sheet and two mockups; 27 pieces cut by
  the sheet's own alpha (`tools/ui/cut-leaderboard.mjs`, family
  `ui-leaderboard`); the papers, the MEMORY-MAP slot, the spec, LB's block.
- #1783 (5501): the window after mockup 2 (title, pills, podium, table, no
  pages); `mp-boardslook` 17/17, `mp-boards` 37/37, `questline` 187/187,
  `mp-membudget` 11/11 before and after (no line moves); CI green.

## Next

- PR 3 (5502), on claude/plan-lb-3-power (from #1783's branch, main with
  PW's #1776 and #1781 merged in): Overall and the Power rating (Overall's
  columns only), the Stats group (`caps.statboards`), both `CAP_GATES`
  rows, the caps-audit allowlist rows gone. Merges after #1783.

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
