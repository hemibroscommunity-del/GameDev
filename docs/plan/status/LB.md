card: LB
branch: claude/plan-lb-2-ranks
prs: #1771 (5500), #1783 (5501), #1798 (5502): merged; part 2 (5503): draft PR
state: ready

## Done

- #1771 (5500, merged): the owner's sheet cut into 27 pieces by its own
  alpha (`tools/ui/cut-leaderboard.mjs`, family `ui-leaderboard`); the
  papers, the MEMORY-MAP slot, the spec.
- #1783 (5501, merged): the window after the second mockup (title, pills,
  podium, table, no pages); sittings 10 and 11 mended.
- #1798 (5502, merged): Overall and the Power rating (Overall's columns
  only), the Stats group (`caps.statboards`), the caps' rows.
- Part 2 (5503): the Ranks page in the owner's 2026-11-25 style
  (`RanksPage.jsx`, rules `src/game/ranksPage.js`, suite `ranks-page`,
  phone test `mp-ranksstyle`); `?rankstyle=0` the page before.

## Next

- Nothing: the PR waits for the gatekeeper.

## Found

- The band is 191 px upright (390 x 844; 187 at 375 x 667) and 82 px on
  its side (`sheetGeometry panelInnerHeight`): the card's "five rows
  upright, three sideways" cannot fit with the band kept. Built: three
  upright, two sideways (the PR says why).
- The worker sends a board's top 50 only: a player past 50th reads
  "Rank #—" (a follow-up for the worker: your own rank with the rows).
  The fish board keeps its kinds inside `FishBoard.jsx` (not this card's):
  no pinned row there.

## Needs

- The owner: a taller band for the Ranks page (the mockup's five rows),
  or today's band as built.
