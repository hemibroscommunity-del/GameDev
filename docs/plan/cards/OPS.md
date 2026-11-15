# Card OPS: the game stays up, and someone knows when it isn't (the red team's crowd, deploy and recovery fixes)

**Starts:** now (the planning session's word, 2026-11-15, after the red
team: RT-2's findings on #1867, `docs/security/rt2-findings.md` on
`claude/red-team-rt2`; RT-1's N6 and N8, `docs/security/rt1-findings.md` on
`claude/red-team-rt1`; RT-3's P1, `docs/security/rt3-findings.md` on
`claude/red-team-rt3`).
**Read:** `CLAUDE.md` (§4 deploying, §5 the wire's rules: deny by default,
either side ships first, writes cost money); `docs/ARCHITECTURE-HANDOFF.md`
(before any server change: rule 2's storage-key registry, rule 10's writes);
`docs/specs/room-full.md`; `docs/specs/cap-120.md`; `docs/specs/migrations.md`
(the newer-save refusal); `docs/specs/load-test.md`; `docs/TRAPS.md` §277
(every merged `server/test/` file deploys) and §316 (a cap on its own line);
`server/src/wire/README.md` (the wire table's columns); the switch table
(`tools/guards/lib/switches.mjs`, `node tools/guards/switches.test.mjs
--write`).
**Tags:** 5600 to 5619, one a PR, in the order below.
**Browser:** none but the local worker (`wrangler dev --local` on a copy,
the way `tools/qa/load/load.mjs` makes one; the probes in
`docs/security/rt2-probes/`). Never the live game.
**Effort:** extra.

## PRs, in order

1. **(tag 5600) This card.** Files: `docs/plan/cards/OPS.md`,
   `docs/plan/status/OPS.md`, `tools/dev/tag-blocks.json` (the block
   `"OPS"`, 5600 to 5619; `nextBlock` 5620).
2. **(tag 5601) The room's own health, and who a rollback shut out** (F3,
   F4).
   - Files: `server/src/index.js` (the outer worker's route; the room's
     internal answer beside `/_room_count`), new `server/src/health.js`,
     `server/src/persistence.js` (one count where the join refuses a newer
     save), `server/src/wire/http.js` (two rows: a shared list, card R's PR 7
     adds one too), the switch table, new `server/test/room-health.test.mjs`.
   - `GET /health/room`: the outer worker asks the room (3 s timeout) for
     its player count, the age of its last tick, whether its last save went
     through, and the newer-save refusals since it started. 200 with those
     numbers when the tick is under 5 s old and the last save went through;
     503 with the same numbers otherwise; 503 `{ room: 'no answer' }` on the
     timeout. Numbers only: no id, no name, no address.
   - `/health` stays as it is (the worker alone).
   - Kill switch `roomhealth: false`: the room answers 404 and the route
     passes it on (the outer worker cannot read the room's switches without
     asking it).
   - OPS's switches sit in a system of their own, `ops`
     (`tools/guards/lib/systems.mjs`, and its row in `budgets.mjs`), whose
     words name only OPS's suites: under `switches-thrown`'s preload,
     `liveops`' and `server-core`'s suites include two that fail with any
     flag (card T's to mend).
   - **Done when:** the suite covers 200, a stalled tick (503), a failed
     save (503), a refusal counted, the switch; on the local worker a probe
     reads 200 with a player in, and 503 once the tick is stopped.
3. **(tag 5602) A waiting crowd knocks more slowly** (F2).
   - Files: `server/src/join.js` (`_roomFullRefusal`), new
     `server/src/rfspread.js`, the switch table, new
     `server/test/rf-spread.test.mjs`.
   - Count refusals over the last 10 s (a ring of ten one-second counts, in
     memory). `retryMs` = `5000 x max(1, refusals a second / 40)`, at most
     30,000 (the phone clamps to 2-30 s and jitters it, `wsClient.js`
     `_rfDelay`: no client change).
   - Kill switch `rf_spread: false`: 5000 as today.
   - **Done when:** the suite holds 5000 under 40 a second, the scale above
     it, the 30 s ceiling, the switch; `rt2-probes/refusalstorm.mjs` shows
     fewer knocks a second at the same crowd.
4. **(tag 5603) A seat held for the player who had it** (F1).
   - Files: `server/src/index.js` (the gate in `fetch()`), `server/src/join.js`
     (the refusal at the join), `server/src/leave.js` (a JOINED session's
     id held on leaving), new `server/src/seathold.js`,
     `docs/ARCHITECTURE-HANDOFF.md` (rule 2's row for the `seats` key), the
     switch table, new `server/test/seat-hold.test.mjs`.
   - A joined session that leaves holds its seat for 60 s (a capped Map,
     id to expiry). The gate lets a socket in while `sessions.size < cap +
     held`; the join refuses an id that holds no seat once the free seats
     are gone, with the same `room_full` and 4009 the phone already reads
     on an open socket.
   - Across a restart: the room keeps who is in as one key, `seats` (at
     most 120 ids), written at most once a minute and only when it changed;
     a room that starts reads it once and holds those seats for 30 s.
   - **Built OFF**: `seathold` is on only when `true` (it adds up to one
     small write a minute: a pace that writes more is the owner's word).
     Its cost goes under Needs.
   - **Done when:** `rt2-probes/seatrace.mjs` with the switch on keeps every
     seated player through a restart and a 2 s blip, against 30 waiting;
     off, today's numbers; the suite holds the cap, the expiry, the restart,
     the switch.
5. **(tag 5604) The owner's reads, a page at a time** (F9).
   - Files: `server/src/botfp.js` (`_botfpFlaggedList`, `?flagged=1`),
     `server/src/charwatch.js` (`/dev/looks`), `server/src/devtools.js`
     (`/dev/apinfo`), `server/src/admin.js` and `server/src/liveops.js` (the
     economy read), their suites; the Test panel only if a reply's shape
     changes (`src/ui/panels/DevPanel.jsx`: a "more" button).
   - Each lists at most 200 rows a request with a cursor (`storage.list`'s
     `start` and `limit`), the way the daily walk does (`liveops.js`, 200 a
     page). A reply says when there is more.
   - **`admin.js` and `liveops.js` are card R's PR 7's** (the export):
     this PR starts after it is merged.
   - **Done when:** each suite puts 1,000 rows and reads them in pages; no
     read lists more than 200.
6. **(tag 5605) The boards: kept a minute, swept, and saying less** (F8,
   RT-3's P1).
   - Files: `server/src/leaderboard.js`, its suite (or a new one).
   - Each board's answer kept in the object's memory for 60 s (one list a
     board and limit); rows past `STALE_MS` deleted in the same pass, at
     most 200 a pass.
   - `/top`'s rows lose `lastSeen` everywhere, and `playtime` everywhere
     but the `playtime` board, where it is the number ranked (the "Time"
     tab reads it: `LeaderboardPanel.jsx`).
   - Kill switch `boardcache: false`: read every time, as today (the rows
     still say less: that is not a cost).
   - **Done when:** `rt2-probes/boardtop.mjs` at 20,000 rows reads once a
     minute, not once a request; the suite holds the minute, the sweep, the
     fields gone, the Time board still filled, the switch.
7. **(tag 5606) The room's public reads, kept and paced** (RT-1's N8; plan
   step 11.5).
   - Files: `server/src/market.js` (`/api/market/orders`),
     `server/src/store.js` (`/api/store/browse`), `server/src/gladiator.js`
     (`/api/arena/status`), new `server/src/publicreads.js`, the switch
     table, a new suite. (`/api/lobby` answers from the outer worker and
     never wakes the room: nothing to do.)
   - An answer to the same read kept for 3 s; past 10 reads a second from
     one address, a 429 with `Retry-After`. Nothing a player owns changes
     because of it (reads only).
   - Kill switch `publicreads: false`.
   - **Done when:** the suite holds the kept answer, its expiry, the pace,
     the switch; RT-1's flood (400 reads from one client) wakes the room's
     read at most once each 3 s.
8. **(tag 5607) A guest's join writes only what is worth keeping** (RT-1's
   N6).
   - Files: `server/src/join.js`, `server/src/persistence.js`,
     `server/src/petbook.js`, `server/src/cadence.js`,
     `server/src/dailyrewards.js`, their suites.
   - Today a guest join (no key) writes 6 rows, 4 for good. Then: a guest's
     records are written at the first thing worth keeping (gold, an item,
     XP, a pet), never at the join itself; a guest who leaves having done
     nothing leaves nothing.
   - Kill switch `guestlazy: false`: today's writes.
   - **Done when:** the suite's guest join writes 0 rows; a guest that
     earns gold writes its record, and comes back with it; a keyed
     character's join is unchanged; `cost-guard.test` holds the new line.

## Readings chosen for you

- **The laws that apply:** deny by default (each new route is a wire-table
  row in its PR); every new behaviour a lower-case kill switch with its
  switch-table row (`on` its merge day); writes cost money (`seathold`'s
  write is OFF until the owner's word; nothing else here writes more, and
  PR 8 writes less); one write (a payment and its stamp: PR 8 writes a
  guest's first record in the same synchronous run as the thing worth
  keeping).
- **No caps.** Nothing here is a new path the phone takes: `/health/room`
  is for monitors, `retryMs` is already obeyed, the seat hold answers with
  the `room_full` every phone reads, the paging is the owner's panel, the
  boards and public reads keep their shapes. If a reply's shape changes for
  the Test panel (PR 5), the panel reads both shapes.
- **Every `server/test/` file deploys** (TRAPS §277): PRs 2, 3, 4, 6, 7 and
  8 go in a sitting's batch. A check that only reads source goes in
  `tools/guards/` instead.
- **What a player sees:** PR 4 (who gets in after a restart) and PR 6 (the
  Time board) change what a player meets. PR 4 is built OFF; PR 6 keeps the
  Time board as it is. Anything more is the owner's (TRAPS §305).
- **The owner's own lists** (no code, the findings' "Only the owner can
  do"): an uptime monitor with a phone alert (on `/health/room` once PR 2
  is out); GitHub's failed-run notifications and spending limit; Cloudflare
  two-factor login and a rate-limiting rule (RT-1's N8); the lab's restore
  try; no server merges while people play on launch days.

## Not yours

The rewind and the export (card R); the phone under load (card O); memory
(card P); the room's row and the day's book's frame (cards A and E: PR 2
reads them, never changes their form); `.github/` and `server/wrangler.toml`
(the owner's words: the post-deploy probe step, F3's second fix, waits for
them).
