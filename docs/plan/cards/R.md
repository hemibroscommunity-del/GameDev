# Card R: roads and restore (steps 10.5, 4.3, 4.7)

**Starts:** now. Card E (the books) is merged whole at the gatekeeper's
sitting 11: the roads' classes, the registry's marks (`storagemarks.js`),
`_econ`, the world's sum, the shared test room, the transfer ledger
`xfer:`, the day's book.
**Read:** `CLAUDE.md` (§4: never the Cloudflare lab or a deploy from a
branch; §5: the doors for gold, a bag, health and leaving, one write, writes
cost money, saves; §8's rows for a door); the ten rules at the top of part 5
of `docs/GRAND-PLAN.md` (3, 5 and 8 most); steps 10.5, 4.3, 4.4, 4.7 and
10.3, and part 9's call 12; `docs/SHAPES.md` part 2 (a weapon's `gid`),
part 3 (the classes, what is summed, the mark on a record) and part 8
(names); `docs/ARCHITECTURE-HANDOFF.md` in full (rules 1 to 10, 24, 27, 29
most); `docs/specs/gold-door.md`, `bag-door.md`, `migrations.md`;
`server/src/gold.js` and `bag.js` (their tables) with `gold-door.test`,
`bag-door.test`; `server/src/storagemarks.js`; `server/src/xfer.js`;
`server/src/daybook.js`; `server/src/admin.js` (today's restore and
`rpgsnap:`); `docs/OPERATIONS.md` ("Fixing a broken save");
`server/test/testroom.mjs`, `world-sum.test.mjs`, `cost-guard.test.mjs`;
`docs/specs/cloudflare-lab.md` and `.github/workflows/lab.yml` (read only);
card K (`docs/plan/cards/K.md`), for the files the two cards share.
**Tags:** 5280 to 5299, one a PR, in the order below. The card is committed
by the orchestrator's PR (tag 5180, card K's first number, with card K's):
do not commit it yourself. If the tags run out, ask the planning session
for a second block; never take one yourself.
**Browser:** light: `questline` before each door PR (a door moves every
writer of a value), one run at a time. The rest are node suites.
**Effort:** extra: money, and every player's record.
**Your questions, and "ready":** by message to the planning session,
`session_01LccHak9SKjatMy6sijchun` (not `@parent`). Anything decided for
the owner while away goes in the PR's words under the heading **"Decided
for the owner while away"**, with its switch (`docs/plan/README.md`).

## What the card builds, so the PRs read as one

- **The roads between players, one table** (10.5): every road that moves
  value from one account to another, with its fee, its hold, its pace and
  its ledger. All zero, as today; a guard fails a road with no row.
- **Doors for what is left of value** (4.3), each as `gold.js` and `bag.js`
  are: one function a verb, a ROADS table, a test that fails a second
  writer. The stashes (and a weapon's own id), skill points, quest state,
  experience and levels.
- **The way back** (4.7): a player's restore made from the registry (every
  record of theirs, not the character alone), a paged export, the
  storage's size in the day's book, and the room's way back to an hour ago,
  with its try in the Cloudflare lab written for the owner to run.

## PRs, in order

Each PR's branch starts from `main` and opens against `main`, ready for
review (not a draft). Never begin a branch from another unmerged branch: a
PR that needs an earlier one waits for it to merge (do a free PR meanwhile:
each line says what it waits for), and merges `main` in before its last
push. Nearly every PR here touches `server/**` and so deploys the worker on
merge: say so in its first line; the gatekeeper merges them in batches
(TRAPS §277).

1. **(tag 5280) The roads between players, one table** (10.5). Changes
   nothing.
   - A new leaf file under `server/src/` (its name checked against SHAPES
     part 8 and written there: `playerroads.js` and `PLAYER_ROADS` if
     free), one row a road that moves value from one account to another.
     Read the code for the list; at least: the trade window, the gift, the
     market's settle, the auction house (a sale, a bid won, an offer taken),
     a duel's pot, the arena's stakes, the threat's levy and the bounty, No
     man's land's loss, the jackpot, the gamble hall's wagers between
     players, mail between players.
   - Columns: `fee` (0), `hold` (0), `pace` (0: none), `ledger` (`xfer`,
     `kill`, or `none` with why), `roads` (the `GOLD_ROADS` and `BAG_ROADS`
     rows it runs on), `why`.
   - **All zero, as today.** The owner's call 12: *"YES to building the
     table with everything at zero; turning one up is a later call."* No
     settlement reads `fee`, `hold` or `pace` yet, so the guard fails any
     value but 0: turning one up is a PR that builds its reader, and it is
     the owner's call, never decided while away.
   - `ledger` is read: `XFER.ROADS` and `XFER.KILLS` (`xfer.js`) are made
     from it, the literals deleted (rule 2: one definition).
   - The guard, new `server/test/player-roads.test.mjs`, strict from the
     start (rule 3: a set that value hangs on): every `GOLD_ROADS` and
     `BAG_ROADS` row of class `move`, and every `escrow` row whose place
     E's marks call `between`, is on a row of the table, or is listed `own`
     with why (the bank: the player's own vault); a row that names no road
     fails; a non-zero `fee`, `hold` or `pace` fails.
   - Weapons, gear and pets move between players on roads with no door
     table yet: the table names them now, and the guard holds each once
     its door exists (weapons: PR 2).
   - Files: the new leaf; `server/src/xfer.js` (`ROADS`, `KILLS` only); the
     new suite; `server/test/xfer.test.mjs`; `docs/SHAPES.md` part 3 (and
     part 8); new `docs/specs/player-roads.md`; `tools/guards/lib/systems.mjs`
     and `docs/SYSTEMS.md` (the new file placed, a line of its own).
   - Done when the guard is green on `main` and red on each break proof (a
     planted `move` road with no row; a fee of 1), both in its header.
   - Waits for: nothing.
2. **(tag 5281) The stashes' door** (4.3). Changes nothing a player sees.
   - A new door file (`stash.js` if free in SHAPES part 8): `stashGive`,
     `stashTake`, `stashSet`, each call naming its row in `STASH_ROADS`
     (its verb, its class as E's four, and `other` for a `move` or an
     `escrow`). The weapon stash and the others (`shieldStash`,
     `armorStash`, `amuletStash`, `legsStash`, `gearStash`): read the code
     for each one's writers. Handoff rule 3 (`_saveRpg` truncates the
     weapon stash at its cap) moves into the door: a give past the cap is
     refused there, never cut at the save.
   - Every writer moves through it: 27 writes of `weaponStash` in 11 files
     on `main` 9fd5e58 (`store.js`, `trade2.js`, `nomansland.js`,
     `quests.js`, `revealbag.js`, `salvage.js`, `join.js`, `gear.js`,
     `index.js`, `inbox.js`, `market.js`), and the other stashes' writers.
   - New `server/test/stash-door.test.mjs` fails a second writer, a road
     nobody calls and a road two places call, as `gold-door.test` does. The
     world's sum counts the stashes by the door's classes, as it counts
     gold. A stash road between players is on PR 1's table (its guard now
     holds it).
   - A door is a rule every session follows: one line in CLAUDE.md §5 (with
     the doors for a bag and health), a row in §8, and a rule in
     ARCHITECTURE-HANDOFF beside rule 29.
   - Files: the new door; the writers' files (their writes only); the new
     suite; `world-sum.test.mjs`; PR 1's table; CLAUDE.md;
     ARCHITECTURE-HANDOFF; new `docs/specs/stash-door.md`; the systems map.
   - Waits for: card K's PRs in `index.js` (tags 5181 and 5184) and card
     L's trade door (#1809, `trade2.js`), merged.
3. **(tag 5282) A weapon's own id** (4.3; SHAPES part 2). After 2 is merged.
   - Every weapon gets `gid` from the minter gear already has
     (`_gearProvMintId`, `gearprov.js`): the field on the piece is `gid`,
     and no second name is made. A weapon made before this gets one the
     first time it passes the door (the load at the join), never two. Two
     weapons never share one; a weapon traded, sold, mailed, listed or
     dropped keeps its own.
   - **The reading chosen:** a weapon gets the id, not a row in the
     provenance ledger (`gear_prov:`, 256 rows at most a player): a ledger
     for weapons is more rows, a cost question. If you find it is needed,
     put it under Needs with its count; do not build it.
   - **This changes a stored record's shape** (a weapon on `rpg:` gains
     `gid`): its schema number goes up (`migrations.js`), and the gatekeeper
     lists the PR on a line of its own, merged by itself (a rolled-back
     worker refuses a newer save). Say so in the PR's first line.
   - The page reads nothing new here: card K's PR (tag 5196) names weapons
     by `gid` after this merges.
   - Files: the stash door, `gearprov.js`, `migrations.js`, `join.js` (the
     load), new `server/test/weapon-id.test.mjs`, `docs/specs/stash-door.md`,
     SHAPES part 2 (built).
4. **(tag 5283) Skill points' door** (4.3). Free: its files are held by
   nobody today.
   - A door for the points a player spends on a build (`prog3.js`, the stat
     points, `ps.buildPointsThisLvl`, `pointsreset.js`: read the code for
     every field and writer), its ROADS table, its suite failing a second
     writer, its spec, CLAUDE.md's line.
5. **(tag 5284) Quest state's door** (4.3). After 2 is merged
   (`quests.js`).
   - A door for what a quest's state holds (`quests.js`: progress, hand-in,
     the track, the kept list), its ROADS table, its suite, its spec,
     CLAUDE.md's line. Card K's quest hand-in claim (4.2) waits for it.
6. **(tag 5285) A player's restore made from the registry** (4.7).
   - Today's restore puts back `rpg:` alone (`rpgsnap:`, `admin.js`). It
     now covers every record E's marks call `whose: 'player'`, in a table in
     code beside the marks: each `player` prefix `restored` or `left`, with
     why. Left at least: the login (`auth:`, `keyidx:`: an old key must
     never come back), the owner's levers (`frozen:`, `testmode:`), the
     snapshots themselves, the anti-bot's records. The guard fails a
     `player` prefix the table does not place.
   - **The snapshot (the reading chosen):** today it is one put a player a
     day, at their first login. The fuller snapshot holds every restored
     record of theirs in that same one put: no new row, more bytes, and
     more rows read at that moment for the records the join has not read
     already. Measure rows read, rows written and bytes a snapshot
     (`cost-guard`). If it costs more than today, it is built OFF behind
     the live flag `fullsnap` and goes under Needs as a cost question, with
     the numbers; the restore restores what the snapshot holds.
   - Records held between players (an order, a listing, a pot: `whose:
     'between'`) are never rewound: they are the other side's too. The
     restore says what of theirs it found there.
   - The restore books its difference through the doors (a `restore` road
     in `GOLD_ROADS`, `BAG_ROADS` and the stash door, a `set` road by its
     difference: card E's ruling in SHAPES part 3), so unexplained gold is
     0 after a restore (the test). Its `prerestore-` copy covers every
     record it overwrites; the copies and the restore are one run of writes
     (handoff rule 5); a record a newer worker wrote is refused, never
     rewritten (`migrations.md`).
   - Files: `admin.js`, `persistence.js` (the snapshot), a new
     `server/src/restore.js`, the marks' new table, `gold.js` and `bag.js`
     (one row each), the stash door, new `server/test/restore.test.mjs`,
     `world-sum.test.mjs`, `cost-guard.test.mjs`, `liveops.js`,
     `docs/OPERATIONS.md` (in plain words), new `docs/specs/restore.md`.
   - Waits for: 2 merged (the stash door's road).
7. **(tag 5286) The paged export** (4.7). After card K's 5182 is merged
   (the wire table's columns).
   - An admin route behind the owner's key: a page of records by a
     registry prefix or by one player's id (the marks' `whose`), with a
     cursor. Never a login key, never the hidden settings (`hidden.js`).
   - **A read the owner pays for each time it runs** (rows read a page,
     and the whole room's count): built OFF behind the live flag
     `roomexport`, under Needs as a cost question with those numbers.
   - Its row in the wire table (`server/src/wire/http.js`), in this PR.
   - Files: `admin.js`, the route, `server/src/wire/http.js`, a suite,
     `liveops.js`, `docs/OPERATIONS.md`, `docs/specs/restore.md`.
8. **(tag 5287) The storage's size in the day's book** (4.7).
   - **The reading chosen:** the room's whole size from its own storage
     (`ctx.storage.sql.databaseSize`: the room is a SQLite-backed object,
     `new_sqlite_classes` in `server/wrangler.toml`, read only; it reads no
     row), once a day, riding a put the day's book already makes
     (`DAYBOOK.RIDES`): no new row. A size by prefix reads every row: not
     built; under Needs if it is wanted. If the size cannot be read without
     rows, it is OFF behind `storesize` and a cost question.
   - Shown as one more line of the owner's card in the Test panel (card
     E's panel file).
   - Files: `daybook.js`, the call that reads it, its suite,
     `cost-guard.test.mjs`, the owner's card's panel file (one line).
9. **(tag 5288) The room's way back to an hour ago, and its lab try**
   (4.7's "done when").
   - An owner's lever behind the owner's key: the room restored to a time
     through the storage's own point-in-time bookmarks
     (`getBookmarkForTime`, `onNextSessionRestoreBookmark`). Two steps: the
     first answers what it would do and returns the bookmark of now (so it
     can be undone); the second does it. Every socket is told and closed.
     Never on a word from a page.
   - Built and tested here, locally: the lever's logic in node with a
     stand-in storage, and `wrangler dev --local` if it keeps bookmarks
     (say which). The world's sum after a rewind: unexplained 0.
   - **The lab try is the owner's, never a session's** (CLAUDE.md §4:
     never the lab or a deploy from a branch). Write it as files under
     `tools/lab/` only: a restore to an hour ago in the lab's own worker,
     balanced by 4.4's sum. List it under Needs in plain words ("the lab's
     restore try: from the Actions tab, on main"). If running it needs a
     new input in `.github/workflows/lab.yml`, that is a `.github/` change
     the owner must ask for in their own words: write the line it needs
     under Needs, and never touch the file.
   - Files: `admin.js` (the lever), `restore.js`, new files under
     `tools/lab/`, a suite, `docs/OPERATIONS.md`, `docs/specs/restore.md`,
     `docs/specs/cloudflare-lab.md` (the try's section).
10. **(tag 5289) Experience and levels' door** (4.3). After card L's doors
    in `gathering.js`, `cooking.js`, `dungeon.js` and `party.js` (its
    harvest, cook, dungeon and party doors) are merged, or as L's status
    says.
    - `_xpGive` (a name free in SHAPES part 8) and its `XP_ROADS`; a level
      changes only through it (a level-up is the door's). Today 16 writes
      of `.xp` in 9 files and 16 of `.level` in 8 (`devtools.js`,
      `gathering.js`, `join.js`, `petbook.js`, `grids.js`, `prog3.js`,
      `farm.js`, `dungeon.js`, `cooking.js`, `migrations.js`, `party.js`,
      `pvpextras.js`): grep again. A pet's experience is a pet's: in or
      out, say which and why.
    - New `server/test/xp-door.test.mjs`, its spec, CLAUDE.md's line.
      Before card K's harvest and cook claims and K's sends in those files.
11. **(tag 5290) The escrow roads' ledger** (10.5's `ledger`, step 2).
    After card K's 5194 (`market.js`, `store.js`) and card L's duel and
    arena doors (`duel.js`, `gladiator.js`) are merged.
    - The market's settle, the auction house's sale, a duel's pot and the
      arena's stakes each write one `xfer:` row a settlement, in the
      settlement's own run of writes (handoff rule 5), as the trade window
      does; `ledger` turns to `xfer` on their rows.
    - **More rows a day:** built OFF behind the live flag `xferescrow`,
      under Needs as a cost question, with rows a day at today's volume
      (the bot lab's numbers). `cost-guard` holds the line.

## Readings chosen for you

- **The laws that apply:** the gold and bag doors (every change through
  `_goldGive`/`_goldTake`/`_goldSet` and `bagGive`/`bagTake`/`bagSet`,
  each naming its row); one write (no `await` between a payment, its stamp
  and both sides); a value a player sees is saved before its message goes;
  a new storage key in the registry (precheck `storage-keys`) and its
  mark in `storagemarks.js`; a new server behaviour has a lower-case kill
  switch; never a field added to the `rpg:` blob (handoff rule 1: the
  weapon's `gid` is a field on the piece, not on the record).
- **Nobody else writes `GOLD_ROADS` or `BAG_ROADS` while this card is
  open** (part 11: never two sessions). A card that needs a road asks the
  planning session, which routes it here.
- **Costs are the owner's, even while away.** Anything that adds a row, a
  write pace or a read a player pays for (the fuller snapshot, the export,
  a size by prefix, the escrow ledger) is measured and, if it costs more to
  run, built OFF behind its lower-case flag and listed under Needs as a
  cost question with its numbers (`docs/plan/README.md`: never decided
  while away).
- **Nothing that cannot be undone.** No player's record is deleted; the
  restore keeps a copy of all it overwrites; the room's rewind returns the
  bookmark that undoes it. Never run the rewind, the lab or a deploy
  yourself.
- **A fix never turns on something nobody has seen** (TRAPS §305).
- **A new message or route** gets its row in card N's wire table in the
  same PR (`tools/guards/wire-table.test.mjs` fails one with none).
- **A new live flag or switch row** on a line of its own (rule 3; TRAPS
  §316, §333); say so in the status file.

## The files K and R share, and who goes first

The same table is in card K. "Then" means after the first one's PR is
MERGED, not opened. Neither card writes a file here while the other's
named PR is open. The planning session settles a clash.

| File | First | Then |
|---|---|---|
| `server/src/index.js` | K 5181, then K 5184 | R 5281 (the stash's writers); K's sends (13) |
| `server/src/wire/*` | K 5181, 5182 (the columns) | R's new rows (its route, 5286); K 5194 to 5196 (the `reqId` and `trust` columns of rows) |
| `server/src/market.js`, `store.js` | R 5281 (the stash door) | K 5194, 5196, 5197; R's escrow ledger (its last) |
| `server/src/trade2.js` | card L's trade door (#1809) | R 5281, then K 5195, 5196 |
| `server/src/inbox.js` | R 5281 | K 5197 (the mail's words); K's sends |
| `server/src/join.js` | R 5281, 5282 (the load), the experience door | K 5194, 5196 (a cap's line each); K's sends |
| `gear.js`, `salvage.js`, `revealbag.js`, `amulet.js`, `nomansland.js`, `quests.js` | R 5281, 5282 (and 5284, `quests.js`) | K 5196; K's sends; K's quest hand-in |
| `gathering.js`, `cooking.js`, `dungeon.js`, `party.js` | card L's doors | R's experience door; then K's harvest and cook claims; K's sends |
| `prog3.js`, `pointsreset.js` | R 5283 | K's sends |
| `persistence.js`, `admin.js`, `daybook.js` | R 5285 to 5288 | K 5193 (`daybook.js`), K's sends |
| `duel.js`, `gladiator.js`, `arena.js` | card L's doors | R's escrow ledger; K's sends |
| `gold.js`, `bag.js` (`GOLD_ROADS`, `BAG_ROADS`) | R only while R is open | K never: a road K needs goes under Needs |
| `xfer.js`, `storagemarks.js`, `playerroads.js`, the stash door | R only | |
| `src/game/actions.js`, `wsClient.js`, every page send | K only | |
| `liveops.js`, `cost-guard.test.mjs`, `world-sum.test.mjs`, `systems.mjs`, `switches.mjs`, CLAUDE.md §5 and §8 | either, each line in a place of its own (rule 3) | the gatekeeper lists such PRs one after another |
| `docs/SHAPES.md` | K: parts 2 (`reqId`) and 5; R: parts 2 (the weapon's `gid`) and 3 | part 8 (names): one at a time |

## Files R waits on (read the status files again before each PR)

- **Card L** (state and phases): its trade door (#1809, `trade2.js`), then
  its worker doors in order: `duel.js`, `party.js`, `cooking.js`,
  `gathering.js`, the fishing file, `dungeon.js`, the guard's file,
  `ride.js`, `poses.js`, `race.js`, `gladiator.js`/`arena.js`; its phase
  table `src/state/phases.js` (R adds no row unless a door of yours is a
  state machine: then ask).
- **Card K**: the shared files above; `server/src/wire/*` for any row.
- **Card J2**: `server/src/eventcapes.js` (its capes; none of R's).
- **Card T**: `tools/guards/lib/switches.mjs`, `docs/SWITCHES.md` (you add
  rows).
- No running card holds `admin.js`, `persistence.js`, `daybook.js`,
  `xfer.js`, `storagemarks.js`, `gold.js`, `bag.js`, `prog3.js` or
  `tools/lab/` today.

## Not yours

The wire's lists, the door's checks, the action door, the send door, the
request id and naming by id, the claims, the words rule (card K); the
phase doors (card L); the sitting's card, the signals and the owner's cases
(card Q: "unwind this transfer" reads `xfer:`); turning up any fee, hold or
pace (the owner's); running the lab or the rewind (the owner's);
`.github/` and `server/wrangler.toml` (the owner's own words).
