# The way back (grand plan step 4.7, card R)

How the game's saved data can be put back when something goes wrong. Step
4.7 has four parts; this spec grows with each:

| Part | Card R PR | Where |
|---|---|---|
| The room's way back to an earlier time | 9 (tag 5288) | `server/src/restore.js`, below |
| A player's restore made from the registry | 6 (tag 5285) | `server/src/playerrestore.js`, below |
| The paged export | 7 (tag 5286) | `server/src/admin.js` `exportPage`; its own spec, `docs/specs/room-export.md` |
| The storage's size in the day's book | 8 (tag 5287) | `server/src/daybook.js` (its header) |

## The room's way back (v2.3.5288)

`server/src/restore.js` (`rewindPlan`, `rewindDo`); the route
`POST /api/admin/rewind` (`admin.js`, behind the owner's key); held by
`server/test/rewind.test.mjs`; the owner's steps in `docs/OPERATIONS.md`
("Taking the whole room back to an earlier time").

### Why

A player's restore (`/api/admin/restore`) puts back one character from its
daily copy (`rpgsnap:`). When something goes wrong for the whole room (a
deploy that wrote nonsense into every save, a road that copied gold for an
hour) there was no way back but editing storage by hand. The room is a
SQLite-backed Durable Object (`new_sqlite_classes` in `server/wrangler.toml`),
and Cloudflare keeps every change of its storage for 30 days
(point-in-time recovery): it can be put back to any moment in them.

### The two steps

Both behind the owner's key, by hand only (never a timer, never a
refusal's answer), and only while `roomrewind: true` is in the live flags
(OFF by default): the planning session's limits for it, 2026-11-14.

1. **The plan** (the dry run), `{step: 'plan', minutesAgo | at | bookmark}`,
   and what any ask that is not a do gets: what it would do, and nothing
   changes. The answer: what it would RESTORE (`restore`: the time, in
   words) and what it would LOSE (`lose`: everything written since, how
   many minutes, who is in the room now, in words), the time (`at`), the storage's
   bookmark for it (`target`, from `getBookmarkForTime`), the bookmark of now
   (`now`, from `getCurrentBookmark`: the way back to this moment), how many
   sockets and players it would close, words saying all of it, the words to
   type back (`confirm`: the hour, "2026-11-14 11:02 UTC"; for a bookmark,
   "bookmark" and its first eight characters) and a one-time `token` good for
   10 minutes (`REWIND.PLAN_TTL_MS`). `bookmark` takes an earlier answer's
   bookmark: that is how an undo is planned.
2. **The do**, `{step: 'do', token, confirm}`, the hour typed back exactly
   as the plan wrote it (a slip changes nothing and keeps the plan), once.
   Its answer repeats what it restores and what is lost, written before it
   acts:
   - every socket is closed with code 1012 and the words "the room is being
     restored to an earlier time"; each player leaves through the leave door
     (`admin.js` `_adminPutOut`, `leave.js` `kick`), so their last state is
     saved first;
   - the storage is asked to be the target's at the room's next start
     (`onNextSessionRestoreBookmark`); its answer is the `undo`: the room as
     it was just before, the leavers' saves included;
   - the room restarts 50 ms after the answer goes (`state.abort`), and the
     next request starts it, restored.

The `undo` is written in the answer and in the worker's log line only: the
room's own storage (its `admin_log` included) goes back with the rest. The
owner's log line (`op: 'rewind'`) is written BEFORE the restore is armed, and
nothing is awaited between the arming and the answer, so a slow write can
never lose the answer that carries `undo` while the restore still happens
(the planning session's mend, sitting 16; `rewind.test` §3).

### What else goes back

Everything in the room's storage goes back, not only the players' things
(the planning session's mend, sitting 16, found by its probe):

- the live flags (`liveflags`): a switch thrown since is unthrown, and
  `roomrewind` itself goes back to off if it was set after the target, so
  the undo's plan answers "off" until it is set again;
- the owner's freezes (`frozen:<pid>`);
- the logins (`auth:`, `keyidx:`): a key handed out or a device admitted
  since is refused after (the owner gives that character a new key,
  `/api/admin/key-new`);
- the announcement (`motd`).

The plan and the do say so in their words and in `alsoBack`
(`{flags, frozen, words}`): the flags as they are now (their one record,
`liveflags`) and the frozen ids (one list of `frozen:`, at most 100), so the
owner can set again
what was set since. `rewind.test` §4b holds it.

### What a player sees

Their connection drops, as at a deploy: the page reads an unknown close as an
ordinary drop (its veil, then a reconnect, `wsClient.js`), and they come back
into the room as it was. No new words on a page (that would be the page's
code, card K's, and the owner's call).

### What stays balanced

The world's sum (step 4.4: everything held equals the start plus minted less
burned) holds at ANY moment of the storage, because what the sum reads is
written with what it counts (the plan's rule 5): a purse and its `_econ` in
one put, both sides of a swap in one run of writes. `rewind.test.mjs` §5
plays a room (a trade, a gamble won and lost, a grant by the mail, a sale to
Diego) and counts every committed moment of its storage: all balance, and a
rewind through the lever to the middle of the play leaves unexplained gold 0.

### What it does not do

- Keep anything written after the target. The undo is the way back.
- Reach any other object: the Leaderboard and the Feedback board keep theirs.
- Keep what lives only in memory.
- Run on a word from a page: the owner's key only.

### Where it can be tried

- **Locally, no**: `wrangler dev --local` keeps `getCurrentBookmark` but
  answers `getBookmarkForTime` with "This Durable Object's storage back-end
  does not implement point-in-time recovery" (tried 2026-11-14); the plan
  then answers `no-pitr`. The logic is tested in node on a stand-in storage
  (`rewind.test.mjs`: every committed run of writes a moment to go back to).
- **On Cloudflare, in the lab**: the lab's own `Vault` runs these same
  functions, with the game's gold door and world's sum, on records of its
  own (`tools/lab/`, `run.mjs --restore`); `docs/specs/cloudflare-lab.md`,
  "The restore try". The owner runs it, from the Actions tab, on `main`.

### Its switch

`roomrewind: true` in the live flags turns the lever on; unset or `false`
(the default), both steps answer `off`.

## The paged export (v2.3.5286)

The owner's copy of the room's records, a page at a time, behind the admin
key: `GET /api/admin/export` by a registry prefix or by one character's id,
never a login key or the hidden settings. Read only. ON (the owner,
2026-11-14: *"Just go recommended"*); `roomexport: false` turns it off. Its
whole spec is its own file, `docs/specs/room-export.md` (written while this
one was still on #1844's branch).

## One player's restore (v2.3.5285)

`server/src/playerrestore.js` (`playerRestore`, `snapshotCopy`); its table
`RESTORE_WAYS` in `server/src/storagemarks.js`, beside the marks; the route
`POST /api/admin/restore` (`admin.js`, behind the owner's key); held by
`server/test/restore.test.mjs`; the owner's steps in `docs/OPERATIONS.md`
("Fixing a broken save").

### Why

The owner's restore put back one record, the character (`rpg:`), from a
daily copy, and it put it back by hand: the purse, the bag and the stashes
changed with no door and nothing booked, so the world's sum (step 4.4) read
every restore as gold and goods made or lost from nowhere. A character's
vault and pets were not in the copy at all.

### What is put back: the registry's table

Every record the marks call a player's (`whose: 'player'`, 35 of them) is
placed in `RESTORE_WAYS`: **restored** or **left**, with why. The suite fails
a player's record the table does not place, and a place for a record that is
not a player's.

| Way | Records | Why |
|---|---|---|
| restored | `rpg:` (the character), `bank:` (the vault), `pets:` | what holds a character's value, theirs alone |
| left | `auth:`, `keyidx:` | the login: an old key must never come back |
| left | `frozen:`, `testmode:` | the owner's levers |
| left | `rpgsnap:`, `rpgsnap_at:` | the snapshots themselves |
| left | `botstat:` | the anti-bot evidence: never rewound |
| left | `inbox:` | mail: credits others sent, each stamped once (rewound, one claimed since would pay again, one sent since be lost) |
| left | `gear_prov:` | the ownership ledger: a restored piece whose row is gone loads as `legacy` (kept, not sellable), never sellable twice |
| left | `achv:`, `aponce:`, `guild_claims:`, `lspin:`, `daily_rewards:`, `farmorders:` | a claim: rewound, it would pay twice |
| left | the rest (counts, notes, links, the name and look) | rewinding them fixes no broken save |

Records held **between** players (an order, a listing, a pot, a pile) are
never rewound: they are the other side's too. The answer names those that
name the player (`between`): one page of each value-holding between prefix
(`PLAYER_RESTORE.BETWEEN_PAGE`, 200 rows) read when the owner presses it,
`betweenFull` the prefixes whose page was full. A piece listed since the copy
comes back in the character AND stays in its listing: the owner sees it
there.

### The copy: the reading chosen

A daily copy (`rpgsnap:<pid>:<yyyymmdd>`, the first login of a day) is the
stored character, one put. **The fuller copy** carries the player's other
restored records at the same moment under `_with` (`{'bank:': vault or null,
'pets:': pets or null}`), in that same one put: no new row, more bytes, and
two keys more read at that moment. Measured (`cost-guard` §18, a player with
a vault and a pet): off, 2 keys read and 2 rows written; on, 4 keys read, 2
rows written, the copy 186 bytes bigger. It costs more than today, so it is
built **off**, behind `fullsnap: true` in the live flags, a cost question
for the owner. The restore restores what the copy holds: today's copies (and
every copy while `fullsnap` is off) put back the character alone.

### Through the doors: nothing unexplained

The restored character starts from the record as it is NOW (its purse, its
bag, its count `_econ`) and is made the copy's by the doors: the gold door's
`restore` road (a `set`, judged by its difference: SHAPES part 3, edge 1;
signed, so a restore that lowers books a negative mint), the bag door's
`restore` for each key, the stash door's `restore` for each stash. The
vault's difference books on the character too (`restore_vault`, gold and
bag). Every other field is the copy's. So the sum's held and net move
together: `restore.test` holds the world's sum to 0 after a restore and
after restoring its way back. The copy's own `_econ` is never put back: a
count is the record's history, not a value.

### One run of writes, and its way back

The `prerestore-` copy covers every record the restore overwrites or deletes
that exists now: the character at its top (none: `_norpg: true`), each other
under `_with`. It is written in the same run as the restore and its deletes,
nothing awaited between (handoff rule 5): a restart at that run keeps
neither. Restoring the `prerestore-` copy puts every record back (the
suite).

### A newer worker's record

A copy, or a record now, whose shape number is past this worker's (the
character's `_v` or its count's `v`, the vault's `_v`, the pets' `v`) is
refused (`409`, `newer`), never rewritten (`docs/specs/migrations.md`).

### A dry run

`dry: true` answers everything (what it would restore, leave and book, what
is held between) and writes nothing.

## A restart, booked (v2.3.5285)

Card K's hostile census found it: an honest `character_reset` deletes the
character and its vault, and the character's own count goes with them, so
the world's sum read every restart as value gone with no burn written (gold
-5000 in the census). The mend is a record of the end: `econ_gone`, one key
for the room, `_econ`'s shape and `n`. The restart books into it what the
character and its vault HELD, as burned, less what the character's own count
already says it made (`worldsum.js goneAdd`), and the sum reads its net
(`NET_READERS`). It is written in the same run as the character's and the
vault's deletes (the vault's delete moves into that run: not a row more).

A new row for the room, and a read and a write a restart (`cost-guard` §19:
15 rows written a restart off, 16 on; 6 keys read off, 8 on): built **off**,
behind `resetbook: true` in the live flags, a cost question for the owner.
Off, a restart is exactly as before.

**What reads it** (the sitting 20 review): the world's sum as the tests take
it (`count()` over the whole store: `restore.test`, `world-sum.test`).
Nothing live reads it yet: the day's walk (`liveops.js`, `WORLD.PREFIXES`)
reads only the records that hold value, and the owner's economy card already
counts restarts on its own (`econcard.js econResetBook`, the day's book's `r`
part). Card K's hostile census runs on the default flags, so its line does
not fall with this switch: it would only with `resetbook` on for the census.

### Their switches

`fullsnap: true` and `resetbook: true` in the live flags, each off by
default (`docs/SWITCHES.md`).


## v2.3.5710: what moved since the copy (card SEC PR 11)

With `fullsnap` off a copy carries the character only, so a restore gave
back what the player banked since the copy (the vault is not rewound) and
what they traded or gifted away (the other side keeps it). The answer, dry
and real, now carries `moved` when anything did (`playerrestore.js`
`movedSince`): `vault`, the vault's gold and items now when the copy does
not carry the vault; `given`, what this player handed over since the copy,
from the transfer ledger's `xfer:` rows: as the giver (`from`) the row's own
side, and as the other side (`to`) its `price` (a trade window's side b, a
market's or auction's buyer), each with its gold, goods and ids (pets,
weapons, gear), at most 50 (`givenMore` past five pages of 200). Rows from
the copy's own time on, `givenSince`: a `prereset-` or `prerestore-` key's
time (`copyTime`); a daily copy's from `rpgsnap_at:` when that is the same
day, else the day's start with `exact: false` (daily copies are taken every
20 h, not at midnight). Sitting 38's review found the first version named
the giver's side only, dropped the ids, and counted the whole copy day. Nothing moved: no field, the answer as
before. Reads only; no new write, no new lever. Suite:
`server/test/restoremoved.test.mjs`.
