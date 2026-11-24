card: WL
branch: claude/plan-wl-3-owned
prs: #2286 tag 6520 (ready), #2287 tag 6521 (ready), tag 6522 (ready, opened with this push)
state: ready

## Done
- (6520, #2286, on branch claude/plan-wl-1-mends) Four small true mends,
  each with its plants red: `phone-death` 4c and 5c, `phase-table`'s
  `Object.assign` source and spread key, `switch-reader` off the tree,
  `four-lines` by statements (each line set room for room).
- (6521, #2287) A leaf stays a leaf: `tools/guards/leaves.test.mjs`.

- (6522, #2290) Owned state: `state-ledger` check 8, OWNED (441 fields
  pinned to a system: every field written from one file today, and the
  phase field _inDuel), read off the census's writes; OWNED_LINE only
  rises; 8b: 26 of 42 enforced resets outside it (only falls); 8c: 4
  fields wait for one owner (_extraction, _pose, stickX, stickY; only
  falls). stickX/Y out at the orchestrator's word: CT's #2293 writes them
  from input too (CT's PR 3, 6542, gives them one owner).

## Next
- Hand over (memory past 200k): 6523, the open hand's census, from `main`.
- Waiting: CT's #2282 (three DOOR_SUITES rows in phase-table): merge `main`
  into #2286 once after it lands, keep its rows.
- This file is on three branches: each later merge takes `main`'s first.

## Found
- `tools/dev/state-census.mjs` --json leaves out WHOLE (`Object.assign(S, z)`
  with z a variable, a computed key): OWNED cannot refuse those (card D's).
- `S._extraction` has no owner: skills, social, render and ui write it.

## Needs
- Answered by the orchestrator: the four lines' rule; OWNED's set (its
  recommendation, 2026-11-23); BK's restart words (PR 6524, with #2281);
  CT's fields (S._stickPhase, _sightPhase/_sightId/_sightAt,
  _latchPhase/_latchId/_latchEnd, system `input`) join OWNED as they land.
