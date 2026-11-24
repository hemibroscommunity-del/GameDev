card: WL
branch: claude/plan-wl-6-paper (on claude/plan-wl-5-scoreboard)
prs: #2286 tag 6520 (ready), #2287 tag 6521 (ready), #2290 tag 6522 (ready), #2298 tag 6523 (ready), #2302 tag 6524 (ready), #2303 tag 6525 (ready)
state: ready

## Done
- (6520, #2286) Four small true mends: `phone-death` 4c and 5c,
  `phase-table`, `switch-reader` off the tree, `four-lines` by statements.
- (6521, #2287) A leaf stays a leaf: `leaves.test.mjs`.
- (6522, #2290) Owned state: `state-ledger` check 8, OWNED (441).
- (6523, #2298) The open hand is counted: `open-hand.test.mjs`, 227
  lines in 85 files.
- (6524, #2302) The scoreboard counts what exists: 12 of 22 rows.
- (6525, #2303) Paper marked as paper: `budgets` 4b; the checklist.

## Sitting 58's holds, mended as a class (follow; fail what it cannot)
- #2286 `switch-reader` 3 follows the location (aliases, destructuring,
  `X['location']`, `?.`); 3b the forms it cannot follow (0).
  `phase-table` 2 follows a spread's keys (a name, `?:`/`&&`, a local
  function's return); 2c spreads of an import's or method's call (41).
- #2287 `leaves` follows a function handed over (by name, `.bind`,
  `.call`, `.apply`, an import to its leaf); 2b what it cannot (0).
- #2298 `open-hand` follows a namespace (`await import()`, `.then`,
  taken apart) and judges each getter use: 225 -> 227 (two reaches there
  all along: debugBus.js's object, lazyPanel.js's `import(url)`).
- #2302 `_tree.mjs` reads a table whole or says "not measured".
- `main` (43541e5f) merged at #2286; each PR holds the one below it.

## Next
- The card's six PRs are open: done when they are on `main`.

## Found
- `tools/dev/state-census.mjs` --json leaves out WHOLE writes and
  const-key, `Reflect.set`, `defineProperty` writes (card D's).
- `S._extraction` has no owner: skills, social, render and ui write it.
- `switch-reader` does not follow `document` itself (only its URL).

## Needs
- Answered by the orchestrator: the four lines' rule; OWNED's set; BK's
  restart words (PR 6524, with #2281); CT's fields join OWNED as they land.
