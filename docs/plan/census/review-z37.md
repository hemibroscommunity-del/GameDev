# The gatekeeper's review, sitting 37 (card Z; tag 5675)

Taken 2026-11-17 on `main` bbd22176 (sitting 36 merged: SEC #2030, K
#2028, L #2031, L #2033, Z #2036). SEC, K2 and L were told this
sitting's session at its start (16:52 UTC). Gathered 16:51 to 17:35 UTC. Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open and not a draft,
with one merge base at every step (`git merge-base --all`, each against
`main` with the PRs above it merged in as merge commits). The tree after
each merge:

1 SEC #2032 90f32e153575ebf95869564efd28765248a3182a -> 5b5598aa3ddf7f35288e3bcc6e5ed8e93a7d0027
2 SEC #2034 5eba61046bf793a2cbab3f45f8545828f2efbbc4 -> 4ff65c7414789e5572fffe54aa806b1c95c63aec
3 SEC #2037 2275f8ef02bb508481b081d92992359f18a954c8 -> fd606806c74a31f954b7bcb0149d685c59860e5d
4 SEC #2038 0a31cbde65c3b0b6903b446f008c646d08a3fc91 -> a2cf1f65f076569fe1dcdf5a5d922b7738a1d892
5 K2 #2035 b72d2f9cc2443c4a294c638428bf45aff6c9d496 -> 63ba47fb72f31b615c0f91a8f11dc0d1728d1c41
6 L #2039 db797aef56b362b4c2c9144f59531555537f63df -> 8519ead9f3b1384224b93c1ea07ebcdd62d90d0a
7 Z (this PR): its head and tree are in the list (`status/Z.md`).

The bases, step by step: #2032 bbd22176; #2034 90f32e15 (#2032's head:
SEC's stack, each PR holds the one before, each with `main` bbd22176
merged in); #2037 5eba6104 (#2034's head); #2038 2275f8ef (#2037's
head); #2035 bbd22176 (K2 merged `main` in at 17:07, after #2030's
block); #2039 bbd22176; this PR bbd22176. One line each. The
rehearsal's tree (`gatekeeper.mjs`, the six in that order) is 8519ead9,
the same.

## SEC #2032 (5701): a join's id is a string of the id's form

READY (reviewed in full: `server/`). Card SEC PR 2. Late from sitting 36
(it was stacked on #2030, now merged; SEC merged `main` bbd22176 in:
head 90f32e15). `test`, playable, memory-budget and lint-build green on
90f32e15.
- `join.js` `joinIdMalformed(flags, id)`: an `id` present (not
  undefined, not null) that is not `/^[A-Za-z0-9_]{1,64}$/` gets the
  magic-name gate's own answer (`join_rejected` `auth`, close 4003),
  placed in that gate's `if`, before the seat check, the account or any
  read or write. Flag `joinidform` (on unless its own false).
- The census read against the code: `passphraseToId` (page and
  `account.js`) is `bp_` + base 36 + `_` + the key's first two words,
  and the words are `BT_WORDS` (a-z) or the worker's new keys' kept
  `bp_` id; the guest's `Math.random().toString(36).slice(2, 10)`; the
  page's join sends `S.myId` from those only (`wsClient.js` 690). Every
  one fits. The wire table's `join` row trusts `id` as `request`.
- The refusal is `auth`, which makes a phone regenerate its key once: an
  honest phone never meets it (as the magic names), so no player sees it.
- New suite `joinid` (58 FAIL on main, its break proof named). DEPLOYS.

## SEC #2034 (5702): a refused vault write is seen; the bank's records land together

READY (reviewed in full). Card SEC PR 3; holds #2032. `test` and
memory-budget green on 5eba6104 (SEC, 17:09; its earlier head's
memory-budget red, failing to reach BroTown, did not repeat).
- `bank.js` `_bankWatch` marks a vault whose put was refused as owed
  (`owedGen` over `okGen`); `_bankRetryPut` puts it again inside
  `_saveRpg`, before the blob's put with no await between (handoff rules
  5 and 7: one run); the leave (`leave.js`) saves while one is owed, and
  the linger (`linger.js`) forgets the copy only after its save. A
  refused move sends a second `bank_state`, last move `paused`
  (`valuepause.js`'s words, already the game's). Flag `bankretry`.
- No stored shape changes: `vaultRecord` writes the same four fields
  (the new marks live on the memory copy only). No write in the ordinary
  case. DEPLOYS.

## SEC #2037 (5703): the bag-size switch never destroys what is stored

READY (reviewed in full). Card SEC PR 4; holds #2034. `test` and
memory-budget green on 2275f8ef.
- With `disable_bigbags` thrown, the cuts of what is STORED (the join's
  `_sanitizeWeaponList` non-strict, the save's `keepStash`, the join's
  and migration's `gearStashKeepCap()`, `mergeStashLists`' held part)
  run at 140 and 48; the lowered cap bounds only a give, a claim and the
  phone's echo (`capStash`). With the switch not thrown, nothing changes
  (`gearStashKeepCap()` is `GEAR_STASH_CAP`, the same number). No kill
  switch, the card's and handoff rule 3's reason. DEPLOYS.

## SEC #2038 (5704): a newer worker's record keeps its unknown fields

READY (reviewed in full). Card SEC PR 5; holds #2037. `test` and
memory-budget green on 0a31cbde.
- Only under the rollback (`newersave: false`): the record read at a
  newer `_v` is kept by player in memory (`_rpgNewerKept`) and spread
  FIRST into `_saveRpg`'s put; every field this worker writes still wins.
  Flag `newerkeep`. No stored shape change of this worker's own.
- Review note, not a hold: a field this worker knows but leaves out of a
  save would now come through from the newer record as it was read (only
  under the rollback, only for a newer character). For card SEC, if it
  ever matters.
- DEPLOYS.

## K2 #2035 (5720): a body's size before anything reads it

READY (reviewed in full). Card K2 PR 1 (the second red team's CRITICAL
1). K2 merged `main` bbd22176 in at 17:07 (head b72d2f9c): both blocks in
`tag-blocks.json`, `nextBlock` 5740.
- `wire/door.js` `BODY_CAP` (32 KB; `/api/feedback/crash` 64 KB),
  `bodyCapRoute` in `index.js` `routeHttp` before any forward (a declared
  length past the cap, or not a length: 413 unread; no length: read
  through the cap), and `_wireDoorHttp` reads through the same cap
  (`readBodyCapped`), before the door's own switch. Read here: every
  route that takes a body (market, store, arena, account, feedback,
  admin incl. `/flags`, `/restore`, the hidden settings, the dev levers)
  posts a few hundred bytes; the crash report's own cap covers its worst.
  GET and the socket's upgrade are never read.
- Switches: `bodycap: false` (live flag, the room's door); the worker
  setting `BODY_CAP = "off"` for the outer router (read like
  `ORIGIN_LOCK`; nothing added to `wrangler.toml`). The two readings the
  card did not settle (a missing length read through the cap; the
  setting as the router's lever) the planning session answered, in the
  PR's words.
- New suite `bodycap` (14 FAIL on main). DEPLOYS.

## L #2039 (5533): the fight's page door

READY (reviewed in full: `src/`). Card L PR 5's page halves, the fight
(L's message at 17:11 UTC; based on `main` bbd22176). Tag 5533, L's block
5520-5539.
- `src/game/skullDoor.js` `skullTo(S, type, until, way)` (ways `threat`,
  `issue`, `nml`), the one writer of `S._pvpSkullType` and its note
  `S._pvpSkullUntil`; eight direct writes in `gameEvents.js` (four),
  `InspectPlayerPanel.jsx` and `noMansLand.js` (three) replaced, each
  with the same values. The one new refusal: a time that is no finite
  number (a `pvp_threat` whose `countdown` is not a number made
  `Date.now() + countdown` a string, written as the skull's time before);
  the worker sends a number. `?skulldoor=0` writes what a caller asks.
- The phase table: page `fight` `todo` -> `door` (6 -> 5 `todo`); the
  state ledger's two rows move to `social` with the door as writer;
  SHAPES, SWITCHES, SYSTEMS, the switch tables, `phase-table.md` each a
  line of their own. New suite `fight-page-door`. Nothing a player sees
  changes.
- Only `server/test/` under `server/`: DEPLOYS the worker (with the
  others, one).
- After it lands the phase line can go 6 -> 5 (sitting 38).

## The rehearsal

First, #2032 alone (at 90f32e15) on bbd22176: tree 5b5598aa; build
PASS; questline 187/187; precheck 0 FAIL but the server suites' 5-minute
limit under load (the settled one, sittings 33 to 36; its WARNs the tag
check's own reading of SEC's stack, which holds 5701, and the branch
count).

Then the list: `tools/dev/gatekeeper.mjs` on bbd22176 with #2032
(90f32e15), #2034 (5eba6104), #2037 (2275f8ef), #2038 (0a31cbde), #2035
(b72d2f9c) and #2039 (db797aef), in that order: tree 8519ead9 (the same
as the step-by-step merges); build PASS; questline 187/187; precheck the
same one timeout and nothing else red (its one WARN the branch count);
`cd server && npm test` alone in that tree: 488 suites, all green
(418.6 s); every guard in `tools/guards/` green (34). This PR merged on
top of the list (one base, bbd22176): the phase table 5 `todo` under the
line 6. `test`, playable, memory-budget and lint-build green on every
listed head (17:27 UTC).

No two listed PRs share a file but: SEC's stack (`status/SEC.md`,
`persistence.js`: each holds the one before); the switch table's rows
(`switches.mjs`, `SWITCHES.md`: `joinidform`, `bankretry`, `newerkeep`,
`bodycap`, each its own line, merged clean).

## Z (this PR, 5675)

The phase table's line 7 -> 6 (`tools/guards/phase-table.test.mjs`
`TODO_LINE`; 5 fails 7, tried), the count on `main` bbd22176 after L's
#2031. The plan noted for sitting 36's merges: 4.2 (K #2028,
`cookstart`, OFF), 5.3b (L #2031). Documents and the guard's one number:
no deploy of its own.
