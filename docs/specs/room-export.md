# The paged export (v2.3.5286)

Grand plan step 4.7, card R PR 7. The owner's copy of the room's records, a
page at a time. The code: `server/src/admin.js` (`EXPORT`, `exportSources`,
`exportPage`, the route `GET /api/admin/export`); its switch:
`server/src/liveops.js` `_roomExportOff`; its suite:
`server/test/room-export.test.mjs`; the owner's steps: `docs/OPERATIONS.md`,
"A copy of the room's records, a page at a time".

## What it gives

- **By a registry prefix** (`?prefix=rpg:`): every record under that prefix,
  in key order. The prefix must be one the registry marks
  (`server/src/storagemarks.js` `STORAGE_MARKS`, held to
  `docs/ARCHITECTURE-HANDOFF.md` rule 2 by `storage-marks.test`) AND one on
  the export's allow list (below); nothing typed free. A single-key entry (`shop_stock`, `jackpot:draw`) is its one
  record. A record a longer marked prefix owns is left out of a shorter
  one's page (no marked prefix is the start of another today; the suite §7
  holds it).
- **By one character** (`?player=<id>`): every record of a character's
  (`whose: 'player'`) the allow list gives, each read where the registry
  keeps it: `<prefix><id>`, but the snapshots' ring under `rpgsnap:<id>:`
  and the login streak at `cadence:login:<id>` (the one scope today). Records held between
  players (a listing, an escrow) are not a character's: ask for them by
  their prefix.
- **A page**: `limit` records (50 by default, 1 to 200; a number past them
  is clamped), with `cursor` the `next` of the page before. `next` is the
  last key read when the page is full, and null when nothing is left (a
  full last page is followed by an empty one). The answer:
  `{ok, prefix + marks | player, rows: [{k, v}], read, skipped, limit, next}`.

## An allow list, not a list of what it never gives

The gatekeeper's medium (sitting 16): a list of what it never gives, written
by hand, would give a record marked tomorrow by default, and it gave the
device ids (`device:`, `lspin:`, `botstat:`). So the export gives ONLY the
prefixes on `EXPORT.ALLOW` (`server/src/admin.js`), chosen one by one:

- **a character's own records a copy of them needs**: the save (`rpg:`), the
  bank, the mail, the pets, the gear's proof, the name and look, the
  snapshots, the codex, the fish log, the achievements, the farm and its
  orders, the quest-ladder claims, the daily rewards, the login streak, the
  friends list, a mute list, the owner's freeze and test mode, and the rest
  of the marks that hold a character's state;
- **every record that holds the world's value**, between players or the
  room's: the market's orders, the listings, the duel and arena escrows, the
  bounties, the weekly pool, a weapon in a trade, a pile on the ground,
  Diego's pile.

Everything else is out: a prefix marked since (until it is listed), a
record no mark owns, the room's own books (the live flags, the owner's log,
the hidden settings, the boards...). A character's records kept out each
say why in `EXPORT.KEPT_OUT`: the login (`auth:`, `keyidx:`), anti-bot
evidence with device fingerprints (`botstat:`), the login wheel's stamp
(keyed by a device), the words one player sent another (`friend_msg:`) and
a wallet's address (`bro_link:`). Asked for by prefix: a 400. A page drops
any record it meets that the list does not give (a second wall, counted in
`skipped`). The suite §3 walks every page of the list and checks nothing
off it comes out, even from a storage that hands one back.

## What it costs

It writes nothing (not even a line in the owner's log). It reads: a page
reads up to its `limit` rows (`read` in the answer), one storage call for a
run of single keys and one for each prefix's list; the whole room once over
reads every row it holds. It costs only when the owner runs it, behind the
admin key, so it is **ON**: the owner's word, 2026-11-14, on the planning
session's recommendation, *"Just go recommended"*. `roomexport: false` in the
live flags turns it off (it answers `off`, 409, and reads nothing).

## Not built

- Reading a page back in (a restore from the copy): the owner's copy is to
  keep. The room's way back to an earlier time is `docs/specs/restore.md`
  (card R PR 9).
- A Test panel button: the route is the owner's key's, by hand.
