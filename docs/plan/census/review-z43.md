# The gatekeeper's review, sitting 43 (card Z; tag 5032)

Taken 2026-11-17 on `main` fcd1ae92 (sitting 42's list merged but for RV
#2072, #2083 and Z #2093: SEC2's #2088, tag 5820 and block 5820 to 5839,
landed at 22:57, before 42 cut its list on the stale `main` bdfa8734).
The running cards were told this sitting's session at 23:15 UTC (V2's
session inactive); J3, O2, K3, K4 at 23:25. Tags bare.

Z took no new block: this PR is on Z's free tag 5032 and carries #2093's
ticks (5.3b, the phase line 3 -> 0, L done), so #2093 is superseded. It
also reserves eight new cards' blocks for the planning session (J3 5840,
O2 5860, K3 5880, K4 5900, V3 5920, V4 5940, V5 5960, P2 5980; twenty
each; `nextBlock` 6000), so those cards never touch `tag-blocks.json`.

Reviews in full (`server/` or `src/`): one reader a PR, the angles of
`/repo-review`, each finding put to its own disproof against the code and
the suites: RV #2091, RV #2094, K2 #2092; T2 #2090 read here (one read
moved). Documents and tools (step 3): U2 #2095 (every test its rows name
exists), RV #2072.

## Findings

### RV #2091 (5802, `risekeep`): held, then the hold lifted

- **Decided for the owner while away** (the planning session, 23:41): a
  restart does NOT free the chest. It stays once per character id, for
  good, because a restart has no pace, and freeing it would make a faucet
  (open, trade the 400 to a main, restart, repeat). The medium below is
  intended, not a bug. Off: `risekeep: false` (the 48 h prune as before).
  RV's eb553118 folds in the two code nits.

- **Medium.** `persistence.js` `_resetCharacterData` (a restart, an
  account delete) clears `oplog:questitem:<pid>:` and `aponce:<pid>`, but
  not `oplog:risechest:<pid>:*`. Before this PR the 48 h prune cleared that
  stamp; now it is kept for good, so a restarted character is told `got`
  forever and never paid the chest (a probe: the stamp survives the
  reset). A player sees it; the owner restarts characters.
- Nits: ARCHITECTURE-HANDOFF's registry row for `oplog:<opId>` still says
  "pruned >48h"; stamps already pruned before the deploy pay once more
  (say so in the body); `OP_PRUNE.KEEP`'s loop is right for one word only.
- Sound: the suite fails on #2083's code (2a, 2b, 4a, 4b) and passes here;
  `risekeep: false` is the old list exactly; no new write or shape.

### RV #2094 (5803, `dyingkeep`): no blocking finding; waits on #2091

- Checked: no copy (the pile is cut at the death, before the credit; the
  respawn keeps min(shield, bag)); no new loss; doors kept (`bagGive`,
  `mail_item`); the switch off is the old path (its test 5); no new write.
  `dying-keep` fails 1, 2a, 2b, 3a on #2091's `inbox.js`.
- Nits: the shield adds the asked count, not what `bagGive` added (equal
  today); a spar knock-down can leave a stale `_deathShield` (overwritten
  at the next death before any read).

### K2 #2092 (5729, `guestshare`): HELD

- **F2 (a new write; the spec says none).** At a full room with an idle
  guest, a fresh keyed join takes a spare socket; `_verifyJoinAuthNow`
  PUTs `auth:<id>` before `_guestShareRefused` (join.js) refuses it
  room_full. Its retry then counts as `played` and takes the guest's seat:
  "a fresh character waits" lasts one knock, and each fresh id leaves an
  orphan `auth:` row. A probe at cap 3 showed both.
- **F1 (medium, tools).** The load benches (`bots.mjs`/`load.mjs`,
  join-bench, memprobe, roster-bench, events-bench) join as keyless
  guests: with `guestshare` ON they get half the room, silently (cap 140,
  120 joins: 70 in; 120 with `guestshare:false`).
- Lows: unjoined sockets on the spares count in `taken`; the guest count
  reads `s.id`, set after the awaits; `_ipOpensOf` at its cap can evict the
  /56 list it just read; `account.js` stops at /56.
- Sound: leaving through `_playerLeaves(ws, 'afk')`; no `auth` reason; the
  share's arithmetic; IPv6 parsing (zone ids, `::ffff:`, `::`); the switch
  off is the old gate.

### T2 #2090 (5743): none

- `killXpOn(pageAddress())`: `pageAddress()` returns `location.search` or
  `''`, as the old read did; switch-reader's line follows the count.

### U2 #2095 (5783): none (documents)

- CLAUDE.md §8: each row names its test, or "by hand" and why; all 33
  named tests exist (server suites, guards or precheck checks).
- U2's note: row 25's break proof (`mp-membudget`) was not tried (it
  needs a browser).
