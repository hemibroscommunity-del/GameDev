card: WL
branch: claude/plan-wl-4-open-hand
prs: #2286 tag 6520 (ready), #2287 tag 6521 (ready), #2290 tag 6522 (ready), tag 6523 (ready, opened with this push)
state: ready

## Done
- (6520, #2286, on branch claude/plan-wl-1-mends) Four small true mends,
  each with its plants red: `phone-death` 4c and 5c, `phase-table`'s
  `Object.assign` source and spread key, `switch-reader` off the tree,
  `four-lines` by statements (each line set room for room).
- (6521, #2287) A leaf stays a leaf: `tools/guards/leaves.test.mjs`.
- (6522, #2290, claude/plan-wl-3-owned) Owned state: `state-ledger` check
  8, OWNED (443 fields), OWNED_LINE only rises; 8b: 26 of 42 enforced
  resets outside it (only falls).
- (6523, claude/plan-wl-4-open-hand) The open hand is counted:
  `tools/guards/open-hand.test.mjs` (+ `lib/openHand.mjs`, its frozen list
  `lib/openHandKnown.mjs`): 225 code lines in 84 files reach
  `window._gameState`/`_gameFns` off the tree (89 direct in 52 files; 32
  more files through common.js's exported `getState()`); 20 plants played
  every run, 5 break proofs by hand.

## Next
- PR 5 (6524), the scoreboard's counters, from `main`.
- Waiting: CT's #2282 (three DOOR_SUITES rows in phase-table): merge `main`
  into #2286 once after it lands, keep its rows.
- This file is on four branches: each later merge takes `main`'s first.

## Found
- `tools/dev/state-census.mjs` --json leaves out WHOLE (`Object.assign(S, z)`
  with z a variable, a computed key): OWNED cannot refuse those (card D's).
- `S._extraction` has no owner: skills, social, render and ui write it.
- The open hand is wider than the text count: `src/ui/mobile/dash/common.js`
  exports `getState = () => window._gameState.current`, read by 32 panels.

## Needs
- Answered by the orchestrator: the four lines' rule; OWNED's set; BK's
  restart words (PR 6524, with #2281); CT's fields join OWNED as they land.
