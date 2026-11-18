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

### K2 #2092 (5729, `guestshare`): held, then mended at 336c238b

- K2's 336c238b: the share is decided BEFORE the key's check
  (`_guestSharePre`: a guest past its share, a guest on a spare socket,
  and a key with no `auth:` on a spare socket are refused there, nothing
  written; one read of `auth:` at a full room); the seat after the key
  (`_guestShareRefused`). `flood-guestshare` 4 gains two checks (no
  `auth:` row; the next knock refused again), red on 471e2d2e. The benches
  turn `guestshare` off. Re-read here: no finding. Kept on purpose: junk
  sockets on the spares count as taken; `account.js` stays /56 (SEC's).

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

### O2 #2098 (5860): none (tools)

- The card's PR 1: `tools/qa/profiles.mjs` (budget-android, hotel-laptop,
  existing knobs only), the harness's lane and knob lines, the guard
  `qa-profiles` (all ok here); `BT_QA_PROFILE=nope` throws before boot.

### K3 #2099 (5880): none

- nmlAsk.js's three sends through `act()`: `party_invite` and
  `trade2_open` leave as the same broadcast; `nml_attack` (body `top`)
  gains a `reqId`, which its wire row trusts (a resend acts once).
  `action-door`'s line 4 -> 1. Nit: with no transport `act` answers false
  where the old send threw, so `sendChoice` would say true; `S.channel`'s
  guard before it covers that.

## The list, step by step (on `main` fcd1ae92)

| # | PR | head | bases | tree after |
|---|---|---|---|---|
| 1 | RV #2072 | 51513256ba36bcf77ab1a58cf13e78a868724ff0 | 1 | 29dd4524c5d14fba708f3fc66931468ff41e5570 |
| 2 | RV #2083 | aaadd4903b25b4445ef877c98924308a80bb683b | 1 | bce3167a299ce7117ec08b813ff0e59938e648f1 |
| 3 | RV #2091 | 9db323ca6bd0f4cb52562bffa64143969ef6ca13 | 1 | 7a7950e131744cf4757e77c967ce4f49f274b037 |
| 4 | RV #2094 | 39d6d49a2f45268fbaaec20f7e5822d407df529d | 1 | dc8e8cc510b559726b47acce68edca1986e94247 |
| 5 | K2 #2092 | 336c238ba6a5604f7d5775857ed52f13e6f60bdf | 1 | 18c3d92ce5c380b81d79a35bbcdfc815205c5120 |
| 6 | T2 #2090 | 7e85d0a9be65e0b7911acf409bdae89e8d63d021 | 1 | 1fdae4b3cc7c79d1191523a457f3f1785952c024 |
| 7 | U2 #2095 | 813df6cd214d4d34c6ff63207bd2ead84322b598 | 1 | b6276f06e491c33738a665c626bbe4d1d8a26da4 |
| 8 | Z #2097 | (this PR's head) | 1 | (in the list's message) |
| 9 | O2 #2098 | 364d239a84364fb767ee1bbc31291484a061df3d | 1 | (in the list's message) |
| 10 | K3 #2099 | 0bb754a061eb90438383dab097511112b9fc243a | 1 | (in the list's message) |

Deploys: 2, 3, 4 and 5 change `server/` (each merge deploys the worker).
1, 6 to 10 do not. No stored shape changes; no new cap.

Rehearsal: `tools/dev/gatekeeper.mjs` on main + #2072, #2083 (earlier
heads), #2092 (471e2d2e), #2090, #2095, #2097: precheck all but its
5-minute `server-tests` limit; `npm run build` PASS. `cd server && npm
test` on main + the RV chain + #2092: 534 suites green, 843 s.
