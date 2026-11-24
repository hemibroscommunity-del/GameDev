card: WL
branch: claude/plan-wl-5-scoreboard (on claude/plan-wl-4-open-hand)
prs: #2286 tag 6520 (ready), #2287 tag 6521 (ready), #2290 tag 6522 (ready), #2298 tag 6523 (ready), tag 6524 (ready, opened with this push)
state: ready

## Done
- (6520, #2286) Four small true mends, each with its plants red:
  `phone-death` 4c and 5c, `phase-table`'s `Object.assign` source and
  spread key, `switch-reader` off the tree, `four-lines` by statements
  (each line set room for room).
- (6521, #2287) A leaf stays a leaf: `tools/guards/leaves.test.mjs`.
- (6522, #2290) Owned state: `state-ledger` check 8, OWNED (441 fields),
  OWNED_LINE only rises; 8b: 26 of 42 enforced resets outside it.
- (6523, #2298) The open hand is counted: `open-hand.test.mjs`, 225
  code lines in 84 files (32 through common.js's `getState()`).
- (6524) The scoreboard counts what exists: 11 of 22 rows (6 of 17
  before; five rows added, each a number a ledger or guard holds).

## Next
- PR 6 (6525), paper marked as paper, once PR 5 is on `main`.

## The chain (part 4, sitting 57)
- #2286 has `main` merged (sitting 56's renderer lines by statements:
  9730, 8008); CT's #2282 lands with it in either order (rehearsed).
- This file clashed add/add on every pair: #2287 holds #2286, #2290
  #2287, #2298 #2290, 6524 #2298; merge in that order.

## Found
- `tools/dev/state-census.mjs` --json leaves out WHOLE (`Object.assign(S, z)`
  with z a variable, a computed key): OWNED cannot refuse those (card D's).
- `S._extraction` has no owner: skills, social, render and ui write it.
- The open hand is wider than the text count: `src/ui/mobile/dash/common.js`
  exports `getState = () => window._gameState.current`, read by 32 panels.

- The review's 237 suites by path had no rule: bigFileSuites' rule over
  every client file reads 250 of 518 at 0aec6482 (`suites-by-path.mjs`).

## Needs
- Answered by the orchestrator: the four lines' rule; OWNED's set; BK's
  restart words (PR 6524, with #2281); CT's fields join OWNED as they land.
