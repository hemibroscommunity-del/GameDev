card: Z
branch: claude/plan-z-sitting-32
prs: (this PR), tag 5670, the last line of sitting 32's list (ready)
state: ready

## Done
- Sitting 31 merged (`main` a0b24f2e: T #2007; J2 #2005, #2008, #2009;
  K #2006, #2003; L #2010; Z #2011). Sitting 32 (this list), reviewed and
  rehearsed on a0b24f2e: `census/review-z32.md`. Plan noted for sitting
  31's merges: 4.1b (#2006, step 1), 11.4 ticked (#2003, card K item 12).

## The list: merge in this order, each "Create a merge commit"
1 K #2013 (5198, the sends through the door, batch 1) · 2 K #2014 (5199,
batch 2, stacked on #2013) · 3 R #2015 (5293, the market and Auction
House ledger rows; `xferescrow` stays OFF) · 4 L #2012 (5528, the
connection door; `?conndoor`) · 5 this PR. All based on `main`, one merge
base at every step. The worker deploys (K's and R's `server/src/`, L's
`server/test/`).

## Held
- None.

## Stalled
- None. J2's mp-itemdrop tap fix had no PR by the cut-off (sitting 33).
  Not in: K 14 (the claims), after #2013, #2014. Z's next tag: 5671.

## Found
- `DevPanel.jsx:1638` shows a report's last 3 lines, never `said`. No card.
- `bt-palette-hairclip` and the stencil have no self-test (1.7). No card.
- After #2014: the send-door census to strict (card K's item 13: Z's).
