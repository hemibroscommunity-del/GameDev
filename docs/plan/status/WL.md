card: WL
branch: claude/plan-wl-6-paper (on claude/plan-wl-5-scoreboard)
prs: #2286 tag 6520 (ready), #2287 tag 6521 (ready), #2290 tag 6522 (ready), #2298 tag 6523 (ready), #2302 tag 6524 (ready), tag 6525 (ready, opened with this push)
state: ready

## Done
- (6520, #2286) Four small true mends, each with its plants red:
  `phone-death` 4c and 5c, `phase-table`'s `Object.assign` source and
  spread key, `switch-reader` off the tree, `four-lines` by statements
  (each line set room for room).
- (6521, #2287) A leaf stays a leaf: `leaves.test.mjs`.
- (6522, #2290) Owned state: `state-ledger` check 8, OWNED (441).
- (6523, #2298) The open hand is counted: `open-hand.test.mjs`, 225
  code lines in 84 files (32 through common.js's `getState()`).
- (6524, #2302) The scoreboard counts what exists: 11 of 22 rows (6 of
  17 before; five rows added, each a number a ledger or guard holds).
- (6525) Paper marked as paper: `budgets` 4b (a spend is null or a
  measure; no sum checked says so, never `ok`; plants 5-7 red); the
  checklist's break proofs: 4 rows run by a guard, the rest by hand.

## Next
- The card's six PRs are open: done when they are on `main`.

## The chain (part 4, sitting 57)
- #2286 has `main` merged; CT's #2282 lands with it either way.
- This file clashed add/add on every pair: #2287 holds #2286, #2290
  #2287, #2298 #2290, #2302 #2298, 6525 #2302; merge in that order.

## Found
- `tools/dev/state-census.mjs` --json leaves out WHOLE (`Object.assign(S, z)`
  with z a variable, a computed key): OWNED cannot refuse those (card D's).
- `S._extraction` has no owner: skills, social, render and ui write it.
- The open hand is wider than the text count: `src/ui/mobile/dash/common.js`
  exports `getState = () => window._gameState.current`, read by 32 panels.

- The review's 237 suites by path had no rule; the scoreboard's reads 250.

## Needs
- Answered by the orchestrator: the four lines' rule; OWNED's set; BK's
  restart words (PR 6524, with #2281); CT's fields join OWNED as they land.
