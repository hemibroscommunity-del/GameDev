# The paged export (v2.3.5286)

Grand plan step 4.7, card R PR 7. The owner's copy of the room's records, a
page at a time. The code: `server/src/admin.js` (`EXPORT`, `exportSources`,
`exportPage`, the route `GET /api/admin/export`); its switch:
`server/src/liveops.js` `_roomExportOn`; its suite:
`server/test/room-export.test.mjs`; the owner's steps: `docs/OPERATIONS.md`,
"A copy of the room's records, a page at a time".

## What it gives

- **By a registry prefix** (`?prefix=rpg:`): every record under that prefix,
  in key order. The prefix must be one the registry marks
  (`server/src/storagemarks.js` `STORAGE_MARKS`, held to
  `docs/ARCHITECTURE-HANDOFF.md` rule 2 by `storage-marks.test`); nothing
  typed free. A single-key entry (`shop_stock`, `jackpot:draw`) is its one
  record. A record a longer marked prefix owns is left out of a shorter
  one's page (no marked prefix is the start of another today; the suite §7
  holds it).
- **By one character** (`?player=<id>`): every record the marks call a
  character's (`whose: 'player'`), each read where the registry keeps it:
  `<prefix><id>`, but the snapshots' ring under `rpgsnap:<id>:`, the login
  wheel's stamp of a character with no device at `lspin:p:<id>` (a device's
  own, `lspin:d:<device>`, is not theirs by its key), and the login streak
  at `cadence:login:<id>` (the one scope today). Records held between
  players (a listing, an escrow) are not a character's: ask for them by
  their prefix.
- **A page**: `limit` records (50 by default, 1 to 200; a number past them
  is clamped), with `cursor` the `next` of the page before. `next` is the
  last key read when the page is full, and null when nothing is left (a
  full last page is followed by an empty one). The answer:
  `{ok, prefix + marks | player, rows: [{k, v}], read, skipped, limit, next}`.

## What it never gives

- **A login key**: `auth:` (the phrase's fingerprint, the keys' and the
  devices') and `keyidx:` (a key's character). Asked for by prefix: a 400.
  A character's pages leave them out, and a page drops any it meets anyway
  (a second wall, counted in `skipped`).
- **The hidden settings** (`hidden_settings`, `server/src/hidden.js`): the
  same.

## What it costs

It writes nothing (not even a line in the owner's log). It reads: a page
reads up to its `limit` rows (`read` in the answer), one storage call for a
run of single keys and one for each prefix's list; the whole room once over
reads every row it holds. So it is **OFF** until the owner sets
`roomexport: true` in the live flags (anything else, the default included,
answers `off`, 409, and reads nothing), and card R's Needs carries it as a
cost question.

## Not built

- Reading a page back in (a restore from the copy): the owner's copy is to
  keep. The room's way back to an earlier time is `docs/specs/restore.md`
  (card R PR 9).
- A Test panel button: the route is the owner's key's, by hand.
