card: Z
branch: claude/plan-z-sitting-50
prs: WD2 #2211, #2213-#2223 (ready); this PR (tag 6264), the last line of sitting 50's list
state: ready

## Done
- `census/review-z50.md`: WD2's 12 PRs checked against the card,
  reviewed (4 finders, 14 screens: the phone's words identical), merge
  bases counted (one each), rehearsed on `main` aaeb5ccc: build PASS,
  questline 187/187, precheck 0 FAIL (by hand; the tool's cap cut it).
  Nothing merged since 49 but its own docs: nothing to tick.
## The list: merge in this order, "Create a merge commit", in one go
1 #2211 (6320)  2 #2213 (6321, DEPLOYS)  3 #2214  4 #2215 (6323, DEPLOYS)
5 #2216  6 #2217  7 #2218  8 #2219  9 #2220  10 #2221
11 #2222 (6330, DEPLOYS)  12 #2223 (6331)  13 Z (this PR).
The stack fixes the order, so the three deploys cannot sit side by side;
merged in one go the deploy queue makes it at most two, same worker code.
## Held / To 51
- None held. To 51: HB2 6280 (branch 3f72925e, no PR); RR 6300 (census
  batch 3 of 8); EN 6203 (copperwaist red 2 of 4, fish-top-evict).
- Old drafts, listed (not closed): #1870, #1869, #1867, #1415, #1211.
## Found
- 46-49 carried: wsClient.js `_aliveTimer` rejoin loop (card RR's);
  `mp-mayordoor` parts 2-3 red on main (no card); mp-membudget's heap and
  buffers lines at their edge on session boxes; gatekeeper.mjs's 15-min
  precheck cap (hit again: no card owns the tool); canvas-witness 8b reads
  only a comment; CS's stale "off by default" comments and the Set-a-switch
  chips; TL's run.mjs orphans; elemental2 maxMana under duelpace; EN's
  comments naming tools/guards/folk-sheets.test.mjs; `switches-thrown`
  once under load. Cleared: WD2's comments naming server/test/say.test.
- New: say.test §7 checks single-quoted keys only, and 4 more mends
  (review-z50.md): WD2's 12 PRs are spent, so they go to the next words
  card (WD3).
## Needs
- Decided for the owner while away, carried: EN's folksheets ON
  (`?folksheets=0`); HB's afterpaint ON (`?afterpaint=0`).
- Owner's own: `.github/`, Cloudflare; wind-dunes.mp3's source; SEC2's
  report form needing a public repository; RR's full 388-scenario sweep
  (a sample now).
