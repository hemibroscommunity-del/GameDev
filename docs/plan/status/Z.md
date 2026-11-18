card: Z
branch: claude/plan-z-sitting-51
prs: SB #2228; WD3 #2227, #2229-#2243, #2246, #2248; EN #2234; HB2 #2224; LR #2226, #2245 (ready); this PR (tag 6265), the last line
state: ready

## Done
- `census/review-z51.md`: 22 PRs checked against their cards; #2224 and
  #2234 reviewed in full, WD3's 16 screens PRs by 6 word checkers and by
  hand (the phone's words identical); merge bases one each; rehearsed on
  `main` 7569a0c0: REHEARSAL_LINE.
  Blocks WD3 6340, LR 6360, SB 6380 registered (nextBlock 6400); WD2 done.
## The list: merge in this order, "Create a merge commit", in one go
1 #2228 (SB 6380)  2 #2227 (WD3 6340, DEPLOYS)  3 #2229  4 #2230  5 #2231
6 #2232  7 #2233  8 #2235  9 #2236  10 #2237  11 #2238  12 #2239  13 #2240
14 #2241  15 #2242  16 #2243  17 #2246  18 #2248 (WD3 6356, DEPLOYS)
19 #2234 (EN 6203)  20 #2224 (HB2 6280)  21 #2226 (LR 6360)  22 #2245
(LR 6361)  23 Z.  The stacks fix the order; the deploy queue makes it at
most two deploys, same worker code. LR re-freezes after #2224 lands.
## Held / To 52
- None held. To 52: HB2 #2244 (6281, draft; merges main after WD3:
  BroCard, dash InventoryPanel, QuestJournalPage clash); LR's re-freeze;
  SB 6381 onward (`atlasrow` parked); RR; EN 6204.
## Found
- 46-50 carried: wsClient `_aliveTimer` rejoin loop (RR's); `mp-mayordoor`
  2-3 red on main (no card); mp-membudget heap line at its edge (EN saw
  38.5-39.1); gatekeeper.mjs's 15-min precheck cap (861-889 s here, no
  card); canvas-witness 8b; CS's comments and chips; TL's run.mjs orphans;
  elemental2 maxMana; `switches-thrown` once under load.
- New: `mp-firststeps` part 6 red on main (HB2's find; tools/qa/mp: RR's);
  `state-census.mjs --check` red on main, no guard runs it (EN's find);
  SB: the board outruns the ground (79% pop-ins on budget-android: a thing
  seen, asked), stripRead's worker remade after 4 s idle (now SB's).
- Mends, no hold: SB `RING_R` from the geometry; EN `_keepQueue` cap (its
  6204). Old drafts #1870 #1869 #1867 #1415 #1211: closed on GitHub.
## Needs
- Decided for the owner while away: SB `groundsend` ON (`?groundsend=0`,
  a later PR); carried: EN `folksheets` ON, HB `afterpaint` ON. Parked:
  SB `atlasrow` (0.3 ms). Computer "tap" -> "click": review-z51.md.
- Owner's own: `.github/`, Cloudflare; wind-dunes.mp3's source; SEC2's
  report form; RR's full 388-scenario sweep (a sample now).
