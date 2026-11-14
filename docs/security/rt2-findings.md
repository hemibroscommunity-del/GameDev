# RT-2: crowds, deploys, recovery and monitoring (red team, 2026-11-14)

v2.3.5586 (card RT's block). Findings only: nothing in the game is changed.

The owner's question: three months on, BroTown is dead because it crashed at
launch, lost player data, or broke and nobody noticed. What are the most
likely ways, proven or ruled out, and the smallest fix for each?

Every number here was measured on a LOCAL copy of the worker (`wrangler dev
--local`, a temp copy of `server/` with its cap lowered, the way
`tools/qa/load/load.mjs` makes one) or in-process. Nothing touched the live
game. The probes are in `docs/security/rt2-probes/`. GitHub's run list was
read (read only) for the deploy history.

Status words: **PROVEN** (a local run or the suite shows it), **READ** (proven
by reading the code; no run needed), **SUSPECTED** (likely, not proven here).

## The ranked list (likelihood x harm)

| # | What | Status | Harm | Likely | In the plan? |
|---|---|---|---|---|---|
| F3 | Nothing tells the owner the game is down, or that a deploy broke it | READ | the "nobody noticed" death | high | no (card A's report and the day's book are pull-only) |
| F1 | A deploy, or any blip, hands the seats of the people playing to the people waiting | PROVEN | launch-day players thrown out, dozens of times a day | certain with a crowd | no |
| F4 | A rollback past a save-shape change locks every recent player out, silently | PROVEN | everyone who played since stuck on "connecting" | medium | half (the switch exists; the owner's rollback steps don't name it) |
| F5 | No copy of the players' data outside Cloudflare, and one unguarded config line deletes it all | READ | total loss | low | half (card R's export #1847, held) |
| F2 | A crowd of waiting phones costs the room's one thread | SUSPECTED | the 120 inside lag | medium at a viral spike | no |
| F6 | Recovery is unrehearsed, and every recovery lever but the switches is a terminal command | READ | a slow or wrong recovery | medium | partly (card R built the rewind, OFF, unrehearsed) |
| F7 | GitHub Actions is the only road to production | READ | a fix cannot ship | low-medium | no (owner's settings) |
| F9 | The owner's own Test panel reads can knock the room over after a big launch | SUSPECTED | everyone disconnected | low-medium | no |
| F8 | The leaderboard reads every row ever written, on every look | PROVEN | boards slow or fail; the game goes on | medium | no |
| F10 | One address holds 16 places: a venue on one Wi-Fi | READ | the 17th judge refused | low | yes (a live switch, documented) |

Ruled out (details at the end): the reconnect storm at 120, a cold start that
scans every account, client/worker skew, Node-only code in the worker today,
the account check (off), a refused join writing anything.

---

## F3. Nothing tells the owner the game is down, or that a deploy broke it -- READ

**What.**
- `/health` (`server/src/index.js`, the outer worker) answers `{status:'ok'}`
  without asking the room. A dead, stuck or crash-looping room still reads
  "ok" there, so an uptime monitor pointed at it would never fire.
- `tools/qa/probe-room.mjs` is the one end-to-end check (HTTP into the room,
  then a real join). It runs only when someone presses the button
  (`probe-room.yml`, `workflow_dispatch`), and it exits 0 whatever it finds
  ("a red run would only hide it"), so even scheduled it could never fail.
- `deploy-worker.yml` runs the server suite (in Node), then `wrangler deploy`,
  and stops. Nothing checks the live game after a deploy.
- Crash reports, the field report (card A) and the day's book are read on
  demand: a workflow button, the Test panel, a curl. Nothing reaches the
  owner's phone.

**How often it matters.** The deploy history (GitHub, read only): **105
production deploys in five days** (Nov 10-14: 25, 23, 11, 9, 37). Each is a
new worker the players get with no check after it. The repo's own record has
the misses: 2026-06-10 (a stale deploy broke combat), 2026-08-06 (GitHub
dropped the events: server code sat unshipped, "no way to notice except
reading the run list"). One deploy run (#677, 2026-11-11 20:53) still reads
`queued` three days later: nobody watches the run list.

**Harm.** A worker that passes the Node suite but fails on Cloudflare (a
missing secret, a binding, a runtime difference: the suite never runs the code
in Cloudflare's runtime; only the `playable` PR check does, on the PR's own
head, and it is not required) stays broken until the owner happens to play.

**Smallest fix.**
1. *(server, a new card, ~1 PR)* a deep health route, `/health/room`: the
   outer worker asks the room (the `_room_count` probe it already has, with a
   3 s timeout) for its player count, the age of its last tick and whether its
   last save went through; 200 when all is well, 503 otherwise. A kill switch
   is not needed (read only). Cost to run: one request per monitor check
   (every 5 min: ~9,000 a month, nothing).
2. *(the owner's word: `.github/`)* one step at the end of the deploy job:
   `node tools/qa/probe-room.mjs` with an exit code, failing the run when the
   join does not reach `state_sync`. GitHub then emails and pushes a failed
   run. ~30 s of a runner already running: about half a cent a deploy.
3. *(owner only)* an uptime monitor with a phone alert (below).

---

## F1. A deploy (or any blip) hands the seats of the people playing to the people waiting -- PROVEN

**What.** The cap gate (`server/src/index.js` `fetch()`, `this.sessions.size
>= this._roomCap()`) counts sockets and knows nothing about who was just
inside. A deploy restarts the room and drops every socket. A phone that was
playing comes back after its ordinary reconnect (`wsClient.js`
`scheduleReconnect`, 1 s); a phone that was waiting retries on its own clock
(`_rfDelay`, 4-6 s, spread). Whoever knocks first after the restart gets the
seat. Nothing holds a seat for the player who had it.

**Proof** (`rt2-probes/seatrace.mjs`: a cap of 6, players reconnecting as
`scheduleReconnect` does, waiters retrying as `_rfDelay` does; a "deploy" is
the object restarting, `state.abort()`, as a new version's cut-over does):

| seated players | waiting | still seated 40 s after the restart |
|---|---|---|
| 6 | 30 (5 for each seat) | **1 of 6** |
| 6 | 6 (1 for each seat) | 4 of 6 |
| 6 | 30, the code reloaded (wrangler's reload: a slower cut-over) | **0 of 6** |

**Harm.** With a crowd waiting, every deploy (37 today) throws most of the
people playing back into a queue that is a lottery. The same happens to ONE
player on any blip: iPhone Safari drops the socket whenever the app goes to
the background, so switching apps for two seconds loses the seat. The people
most likely to quit for good are the ones who were already playing.

**Covered by the plan?** No. `docs/specs/room-full.md` chose a fixed cadence
for fairness between waiters; the seated player's way back was not
considered. Card O is the phone under load.

**Smallest fix (a new card, server only, ~1 PR, kill switch `seathold`).**
- A held seat: when a JOINED session leaves, its id holds a seat for 60 s (a
  capped Map, id -> expiry). The gate lets a socket in while `sessions.size <
  cap + held`, and the join refuses an id that holds no seat once the free
  seats are gone (the same `room_full` + 4009 the phone already reads on an
  open socket).
- Across a restart: the room keeps who is in as one key (`seats`, at most 120
  ids, ~3 KB), written at most once a minute and only when it changed; a room
  that starts reads it once and holds those seats for 30 s.
- Cost to run: at most one small write a minute. No client change.
- Until it lands: on launch and judging days, no server merges while people
  are playing (the planning session's word: the gatekeeper's sittings already
  batch them).

---

## F4. A rollback past a save-shape change locks every recent player out, silently -- PROVEN

**What.** The owner's fast undo is the Cloudflare dashboard's rollback
(CLAUDE.md section 4). A rollback runs older code on the same storage. Since
v2.3.3303 a character saved by a NEWER worker (`_v` above
`RPG_SCHEMA_VERSION`, 21 since v2.3.5083 on 2026-11-12) is refused at the
join: the socket closes 1011 and nothing is written (`migrations.md`). The
phone reads 1011 as an ordinary drop and retries forever behind "connecting".

**Proof.** `server/test/migrations.test.mjs`, last section, passes today:
"newer: the join ends -- the socket closes 1011 ... and the player is not in
the room". So after a rollback across any shape change, every player who
joined under the newer worker is locked out, with no word on screen.

**Harm.** The rollback happens at the worst moment (something already broke),
and turns "a bug" into "nobody can log in". The way out is the live switch
`newersave: false`, but neither the rollback line in CLAUDE.md nor
`docs/OPERATIONS.md` names it: OPERATIONS has no rollback section at all.

**Smallest fix.**
1. *(docs, tiny; card R or a new card)* a "Rolling back" section in
   `docs/OPERATIONS.md`: before or right after a dashboard rollback, set
   `newersave` to false in the Test panel's switches; after the fix is
   deployed, set it back.
2. *(server, small)* count the newer-save refusals in the day's book and on
   the deep health route (F3), so a rollback that locks people out shows.

---

## F5. No copy of the players' data outside Cloudflare, and one unguarded config line deletes it all -- READ

**What.**
- Every player's record, the 7 daily backups (`rpgsnap:`), the market, the
  rewind's 30-day history: all in the same Cloudflare account, most of it in
  ONE Durable Object. Card R's paged export (#1847) is held, not merged.
- `server/wrangler.toml`'s `[[migrations]]` is one line (`new_sqlite_classes`).
  A `deleted_classes = ["GameRoom"]` line, added by mistake or by anyone who
  gets a merge through, deletes every object of that class and its storage
  at the next deploy. Nothing in the suite or precheck reads that block.
  (Whether Cloudflare's 30-day history survives a deleted class is not
  documented that I know of: treat it as gone.)
- An account lost (a lapsed card on the Workers Paid plan, a locked login, a
  takeover) takes all of it.

**Smallest fix.**
1. *(server suite, tiny, a new card or card R)* a test that reads
   `wrangler.toml` and fails unless `[[migrations]]` is exactly the known
   list, with no `deleted_classes`, `renamed_classes` or
   `transferred_classes`. It runs in the deploy's own `test` job, so a bad
   line never deploys. Cost: nothing to run. (A test that READS wrangler.toml
   does not change it.)
2. *(card R)* land the export, and give it a Test panel button that saves a
   file, so the owner keeps a copy off Cloudflare (weekly; cost per run is in
   card R's numbers).
3. *(owner only)* two-factor login and saved recovery codes on Cloudflare and
   GitHub; a card on file that will not lapse.

---

## F2. A crowd of waiting phones costs the room's one thread -- SUSPECTED (an upper bound measured)

**What.** Each waiting phone knocks every ~5 s (`ROOM_FULL.RETRY_MS`), so
2,000 waiting = ~400 refused handshakes a second, each a request into the
room's object (WebSocketPair, accept, send, close). The address limits run
after the full check, so they do not slow the herd.

**Measured** (`rt2-probes/refusalstorm.mjs`: cap 1, one player in, refused
joins at a fixed rate, the busiest thread of the local runtime from `/proc`):

| refused joins a second | busiest runtime thread | all runtime threads | a refusal's answer p50 / p95 |
|---|---|---|---|
| 0 (one player) | 1% | 1% | -- |
| ~60 | 14% | 24% | 7 / 12 ms |
| ~100 | 21% | 35% | 9 / 16 ms |
| ~200 | 35% | 59% | 13 / 26 ms |
| ~400 | **57%** | 98% | 21 / 61 ms |

`docs/specs/cap-120.md` measured the room at ~80% of its thread with 120
players. On this box, 400 refusals a second on top is past 100%: the ticks
slow for the 120 inside. Cloudflare's stated soft limit for one object is
about 1,000 requests a second (~5,000 waiting). **Why only suspected:** the
local runtime does the TCP and HTTP work in the same process; on Cloudflare
the edge does that, and the object sees only the upgrade, so its real share
per refusal is smaller by an unknown factor.

**Smallest fix (server only, tiny, live switch `rf_spread`).** The worker
already sends `retryMs` and the client already obeys it (clamped 2-30 s,
`wsClient.js` `_rfDelay`), made "so a future worker can slow a herd down
without a client deploy". Scale it with the herd: count refusals over the last
10 s and ask for `5000 x max(1, refusals a second / 40)` ms, at most 30 s.
2,000 waiting then knock ~70 times a second, not 400. No client change. Pairs
with F1 (a held seat keeps a slower cadence fair to the people inside).

---

## F6. Recovery is unrehearsed, and every lever but the switches is a terminal command -- READ

- **The rewind** (card R, #1844, merged): OFF (`roomrewind`), two curl
  steps with the admin key. Never tried on Cloudflare: the lab's restore try
  needs `lab.yml` changed (the owner's word, ~65 Actions minutes; card R's
  Needs). It cannot be tried locally: the local runtime's
  `getBookmarkForTime` throws (card R's finding; `rewind.test.mjs` covers the
  logic with a stand-in).
- **One player's restore** (`/api/admin/restore`, the 7 daily backups): curl.
- **The Test panel** (`DevPanel.jsx`) can set the live switches, so
  `max_players`, `ip_sockets` and `newersave` are reachable without a
  terminal. The rewind and the restore are not. The owner is new to coding
  (CLAUDE.md: never ask them to run terminal commands), so in an incident
  these wait for a session.
- **The other objects:** the Leaderboard and the Feedback board have no
  rewind (OPERATIONS says so). Low harm: the boards refill as players come
  back (rows live 7 days); the feedback board holds reports. The Marketplace
  and Arena classes hold nothing live.

**Smallest fix.** *(card R)* Test panel buttons for "plan a rewind" and "do
it" (they wrap the two curl steps; the typed confirmation stays). *(owner)*
run the lab's restore try once.

---

## F7. GitHub Actions is the only road to production -- READ

The deploy needs a GitHub runner (paid minutes since the repo went private)
and the `production` environment's secret. A spending limit reached, an
Actions outage, or dropped events (2026-08-06) means no deploy at all, and
CLAUDE.md forbids a deploy from a laptop (rightly). What still works without
Actions: the dashboard rollback (mind F4) and the live switches.

**Smallest fix.** Owner settings only (below), and one paragraph in
OPERATIONS: "when Actions cannot deploy and the game is broken: 1. the
dashboard rollback, 2. `newersave` false, 3. the switch named for the
broken system".

---

## F9. The owner's own Test panel reads can knock the room over after a big launch -- SUSPECTED

The storage audit found reads with no limit inside the room, on the owner's
buttons: the Bot flags list (`botfp.js` `_botfpFlaggedList` and
`?flagged=1`: `storage.list({ prefix: 'botstat:' })`, every row at once),
`/dev/looks` (`charwatch.js`), `/dev/apinfo` (`devtools.js`) and the economy
read (`admin.js` -> `liveops.js`, every page in one request). After a viral
week, "are there bots?" is the owner's natural first click; at ~20,000 rows of
1-2 KB that is tens of MB read into the room at once, beside the ~45-80 MB a
full room uses (cap-120.md: heap peak + compression buffers), against the
object's 128 MB. Over it, the room resets and everyone is disconnected. Not
measured (needs 20,000 stored rows in the real runtime).

**Smallest fix.** Page each with `limit` and a cursor, the way the daily walk
already does (`liveops.js`, 200 a page). Small, one PR; the owner's card for
the Test panel or a new card.

---

## F8. The leaderboard reads every row ever written, on every look -- PROVEN (in-process)

`server/src/leaderboard.js` `getTop`: `storage.list({ prefix: 'player:' })`,
every row, parsed, filtered by age (7 days), sorted, for every board request.
Every player who joins gets a row (`join.js`, `reportToLeaderboard(session,
true)`), and rows are never deleted (only filtered when read). The route is
public (`GET /api/leaderboard/top`), and the client asks whenever the boards are opened.

Measured (`rt2-probes/boardtop.mjs`, the real `Leaderboard` class, a Map for
its storage, rows made by its own `updatePlayer`):

| rows | stored | one request | heap above rest |
|---|---|---|---|
| 2,000 | 0.6 MB | 9 ms | 2 MB |
| 20,000 | 6.3 MB | ~55 ms | 10 MB |
| 50,000 | 15.8 MB | ~115 ms | 25 MB |

(Real storage adds its own reading.) At 20,000 rows the object serves at most
~18 board requests a second; more queue, and a handful at once can push it
to its 128 MB. The room's own row reports queue behind them. **The game itself
goes on:** the room never waits on the board. Anyone can loop the public
route.

**Smallest fix.** Keep each board's answer in the object's memory for 60 s
(one computed list per board), and delete rows past the 7 days in the same
pass. Tiny, one file.

---

## F10. One address holds 16 places -- READ, covered

`flood.js`: one address holds at most 16 sockets and opens at most 20 a minute
(`ip_sockets`, `ip_joins_min`). A judging hall, a school or a café on one
Wi-Fi: the 17th is refused (`room_full`, reason `ip`). The switches
exist and are documented (flood.js header). Owner: know them for the showing.

---

## Ruled out

- **The reconnect storm at the cap.** `docs/specs/near-join.md` measured it:
  120 phones dropping and coming back cost the room ~0.5 s of its thread (40 MB
  sent). Fine. (Its bots had no stored records; the storage audit found no
  scan at start-up, so a cold start adds one record read per join.)
- **A cold start that scans every account.** The constructor has no list and
  no `blockConcurrencyWhile`. The daily walk is paged (200 every 3 s). The
  first market call after a restart lists the orders (24 h expiry: small).
- **A refused join writes nothing** (the storage audit, join.js): room full
  reads two cached settings and stores nothing.
- **Client/worker skew.** The client requires only `prog3`
  (`serverReady.js` `SERVER_READY_CAPS`), and precheck's `ready-caps` fails a
  push that requires a cap main's worker lacks. New paths gate on caps
  (`CAP_GATES`). Residual: precheck runs on the session's machine, not in CI.
- **Node-only code in the worker.** None today (no `Buffer`, `process`,
  `require`, `node:` imports in `server/src`). Residual: the deploy's suite
  runs in Node, never in Cloudflare's runtime (see F3's fix 2).
- **The account check (Turnstile).** Off in production (`TURNSTILE_SITEKEY`
  empty); when on it fails closed with its `disable_verify` switch.
- **The live switches bricking the room.** Loaded with one `get`; values are
  checked when set.
- **Storage values that grow with accounts.** Capped or pruned (the day's
  book 24 KB a part, the backups a ring of 7, devices 8, and the rest: the
  audit's list). One uncapped: a target's incoming friend requests
  (`friends.js`, ~34,000 requesters to break the put): an attack, for the
  security red team, not a launch-day failure.

## Only the owner can do

1. **An alert on the phone.** Sign up for a free uptime monitor (any
   service with a phone app) and point it at a URL that reaches the room,
   every 5 minutes. Until F3's `/health/room` exists,
   `https://api.brotown.net/api/market/orders` reaches the room's own object
   (`/health` does NOT: it would say "ok" with the room dead).
2. **GitHub:** turn on notifications for failed Actions runs (the GitHub app,
   Settings, Notifications, Actions); check Settings, Billing: the spending
   limit has headroom for a launch week of deploys and checks, and a budget
   email is on. Look at deploy run #677 (`queued` since 2026-11-11).
3. **Cloudflare:** two-factor login with saved recovery codes; the Workers
   Paid plan's card current (Durable Objects need it); any billing or usage
   notification the dashboard offers, to your email.
4. **Rehearse once, on a quiet hour:** the lab's restore try (card R's Needs:
   `lab.yml`, ~65 Actions minutes); a dashboard rollback and back, with
   `newersave` set false and back (F4), so the first one is not during an
   incident.
5. **Launch and judging days:** no server merges while people play (F1, F3).
6. **Know four switches** (the Test panel): `max_players` (fewer seats),
   `ip_sockets` (a hall on one Wi-Fi), `newersave` (after a rollback),
   `roomrewind` (the rewind's lock).
