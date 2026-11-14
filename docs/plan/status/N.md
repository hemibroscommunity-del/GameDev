card: N
branch: claude/grand-plan-n-2-wire-table (one branch a PR, each begun from the one before: merge them in order)
prs: #1684 (ready), PR 2 the table (working)
state: working

## Done

- PR 1 (tag 5060), the door tests read `server/src/` in depth: one walker,
  `server/test/src-walk.mjs` (`vendor/` left out by name, with why), used by
  the 17 suites that listed the folder flat. A scratch `server/src/zz/x.js`
  writing `.coins` fails `gold-door` (and one calling `_applyDamage` fails
  `hit-door`); without it all 370 suites pass. `gold-door` §2 holds the
  walker itself on a folder of its own. Touches `server/test/`: its merge
  deploys the worker, so it merges with PR 2 in one sitting (TRAPS §277).

## Next

- PR 2 (tag 5061), the table: `server/src/wire/`. Its columns
  (`columns.js`) and README are in; the 436 rows are being read.

## Found

- `caps-audit` (named on the card) never lists `server/src/`: it reads
  `join.js` alone, and its walk is the phone's `src/`, already in depth.
- Eight more suites listed `server/src/` flat beyond the card's nine:
  `test-mode`, `event-place`, `quiet-phone`, `move-budget`, `last-place`,
  `device-lock`, `duel-zone`, `monster-newlife` (the card said "among
  them").

## Needs

- Nothing.
