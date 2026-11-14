# RT-1 findings: attackers and the bill

> **Contains exploit details: remove or move before the repo goes public.**

Red-team session RT-1 (card RT, 2026-11-14). Scope: cost attacks, taking the
room down, accounts, the admin key, injection. Every finding is proven on a
LOCAL copy (`wrangler dev --local`, the node test rooms) or marked
"suspected, not proven". Nothing here touched the live game.

Status: first pass done 2026-11-14 (sent to the planning session). Proof scripts are in the RT-1 session's scratchpad, NOT in the repo.

## Ranked list

Ranked by likelihood x harm for the owner's question ("dead in three
months: hacked, or bankrupt"). Details and proof under each N below.
"Free" = Cloudflare's free plan, where the repo says the game runs.

| # | What | Proof | Harm | Likely | In the plan? | Smallest fix | Build / run cost |
|---|---|---|---|---|---|---|---|
| 1 | **N8** Plain web requests have no limit; on Free, ~100k of them end the game's day | local: 9 public routes, 435-990/s from one client, none refused | Free: game down until 00:00 UTC, daily, in 3-6 min of `curl`. Paid: no ceiling (~$1,150/month per machine) | HIGH | 11.5 (public reads wake the room) only | OWNER: a rate-limiting rule on api.brotown.net + spending limits. Code: pace and cache the room's public reads (11.5) | settings: minutes; code: S, saves money |
| 2 | **N2** Public feedback/crash routes write rows with no real limit | local: 200/200 accepted in 1 s with made-up ids (3 rows each) | Free: the account's 100k writes gone in <3 min, then EVERY save fails silently for the day. Paid: ~$50/day per laptop | HIGH | no (Feedback DO is outside K's wire door) | feedback.js: limits by address + a global ceiling, clamp `playerName`/`topic`, stop writing `rate:` rows; switch `feedback` | S (~30 lines, 1 PR); run: fewer writes |
| 3 | **N11** Each throwaway guest leaves ~27 KB on the room's heap forever | test room: 1,000 guests in and out, +27.4 MB after GC | ~4,000 guests reset the room (everyone thrown out, unsaved lost), repeatable | MED | no (K bounded its own counter only) | `_lastStrikeById`: keep only known zone ids, delete on leave; same for 6 smaller maps; a heap guard test | S-M; run: none |
| 4 | **N10** Relays carry any 16 KB payload; queue delayed, never dropped | local: 48 sockets on 3 IPv4s -> 2.25 MB/s of junk to an honest player | Every phone flooded (black screens, data plans); room thread next; with 120 sockets a reset (suspected) | MED-HIGH | partly: K's door checks `words` only | `_relayBuild` copies only the row's fields, sized; a queue byte cap that drops | S-M (card K); run: less CPU |
| 5 | **N4** One IPv6 line fills the room's 120 places | local: one /64 -> 104 guests + 16 v4 = full; honest player refused | Nobody can play while it runs; cheap to keep up | MED | no | flood.js `requestIp`: count IPv6 by /64 (and account.js); a guest cap; Turnstile on | XS (~5 lines); run: none |
| 6 | **N1** Old Login Keys rebuilt from the public id; list-less characters taken | offline 20/20 keys in 0.15 s; test room: thief in, handed a new key, owner shut out | Total loss of that character | LOW-MED (grows with players) | no | devicelock.js: an OLD key never adds a device by itself (empty list = refuse); later retire old keys | XS (~3 lines); run: none |
| 7 | **N7** Admin key: unlimited guesses; one key does everything; kept in the game page | test room: 5,000 wrong keys, all 401, no lockout | Leaked or weak key = gold, any character, flags off, whole-room rewind | LOW (if 30+ random) x CATASTROPHIC | no | admin.js: lockout per address after 10 misses; OWNER: rotate to 30+ random | S (~15 lines); run: none |
| 8 | **N3** 1.9 MB anonymous feedback rows | local: stored; `/list` 2 MB with one row | Phone opening the board black-screens; storage (5 GB Free account: suspected) | MED | no | N2's clamps + delete the big rows | in N2's PR |
| 9 | **N5** A full room of sockets at 120 msg/s each | local: 11,940/s for 20 s, none closed | Free: the day's DO requests in ~2.5 min. Paid: bounded, ~$0.40/h | MED | K (budgets) | N4's /64 + a room-wide ceiling on messages in | S (card K) |
| 10 | **N6** Every guest join writes 6 rows, 4 forever, + a leaderboard row `/top` reads whole | test room: 6 rows a guest join | Free writes/reads quota; junk rows forever | MED | no | write a guest's records only when worth keeping; `/top` from a kept top-100 | M (new card) |
| 11 | **N9** Old-key players lockable 60 s at a time | code | Annoyance | LOW | no | goes with N1's fix | -- |

**My recommendation for the order:** the owner's settings first (they are
the only defence against #1, and they cost nothing), then #2 (one small PR,
no card holds feedback.js), then #3 and #5 (one PR each, a few lines), then
#4 with card K, then #6 and #7.

## Only the owner can do (Cloudflare, GitHub, keys)

1. **Choose the plan with eyes open.** On Free, anyone can stop the game
   for the day (N8, N2, N5), and nothing in the code can prevent the
   request count. On Workers Paid ($5/month) the same attacks become money,
   so Paid only with step 2.
2. **Spending limits and alerts** (Cloudflare dashboard > Billing > Spend
   Management; new 2026-11-13): a LIMIT on Workers and one on Durable
   Objects (each pauses that product at the amount), plus email ALERTS at a
   lower amount (they fire at 80% and 100%). Stored data is not counted;
   the limit is "not a hard cap" (metering lags).
3. **A rate-limiting rule** on `api.brotown.net` (dashboard > the brotown.net
   zone > Security > WAF > Rate limiting rules): e.g. one address, more than
   100 requests in 10 s to `/api/*` -> block 10 min. Runs before the worker,
   so a blocked request is never billed as a Workers request. (Check how
   many rules the zone's plan includes.)
4. **Turn the account check on** (OPERATIONS.md "The account check":
   Turnstile site key in wrangler.toml, `TURNSTILE_SECRET` in the
   dashboard): every throwaway guest then costs the attacker a challenge.
5. **The admin key**: replace it with a new 30+ character random one from
   a password manager (Cloudflare > Workers & Pages > brotown-server >
   Settings > Variables and Secrets), and type it only on brotown.net on
   your own devices (it stays in that browser's storage).
6. **Two-factor** (an authenticator app or a security key) on the
   Cloudflare account, the GitHub account, and the email account behind
   both. The Cloudflare login is the whole game: data, deploys, secrets.
7. **The deploy token**: the `production` environment's Cloudflare token
   should be a scoped API token (Workers edit for this one account only),
   never the Global API Key; make a new one if unsure, delete the old.
8. **GitHub Actions billing** (already known): a spending limit, so a loop
   of CI runs cannot run up minutes.
9. **Know the way back**: the rewind lever (`roomrewind`) rests on
   Cloudflare's 30-day point-in-time recovery; the owner's steps for a
   rollback are in OPERATIONS.md.

## Working notes

### N1. An old Login Key can be rebuilt from the player's public id (PROVEN)

- **What.** Characters made before v2.3.3355 have an "old" key: 4 words from
  a 50-word list plus a number 0-98 (`generatePassphrase`,
  `src/networking/index.js`), about 29 bits. Their player id is
  `passphraseToId(key)`: `bp_` + a 31-bit hash of the WHOLE key + `_` + the
  key's FIRST TWO WORDS in plain text. The id is public (player_join, track,
  the public leaderboard `/api/leaderboard/top` returns `id` for every ranked
  row). So the id gives away two words and a checksum of the rest: 247,500
  candidates, checked offline.
- **Proof.** `scratchpad/rt1/oldkey-recover.mjs` (not committed): the game's
  own generator and id function; 20/20 random keys recovered from their ids
  alone, ~0.15 s each, no request to any server.
- **What stops a thief today.** The device lock (devicelock.js): an old key
  is honoured only from a device on the character's list. It does NOT stop:
  (a) a character whose list is empty and not sealed (`_deviceDecide` ->
  'first': the first device to come in is taken, the thief's); (b) the
  `devicelock: false` switch; (c) a join that sends NO device to an empty
  list ('first' without remembering it). New keys (8 words, 84 bits, made by
  the worker, id not derived from them) are safe; a NEW character's first
  key is retired at first use of its new key (`oldGone`).
- **Who is exposed.** Every character registered with an old key and not yet
  retired: everything made before v2.3.3355, whose old key stays valid "for
  its other devices". Live numbers need the owner's overview
  (`/api/admin/overview` device-lock counts).
- **Takeover, proven on the shared test room** (`scratchpad/rt1/takeover.mjs`,
  not committed; the real join path, `server/test/testroom.mjs`). A thief
  joins with the victim's public id and the rebuilt key from a new device:

  | the victim's `auth.devs` | result |
  |---|---|
  | a device listed | refused `device` (4016): safe |
  | no list (the one-time fill found no device record) | IN; the thief's device becomes the ONLY device; the thief is handed a new 8-word key (`key_new`) |
  | `[]` (registered by a join that named no device) | IN, same |
  | sealed by the owner's Forget | refused: safe |

  After the takeover the real player's phone is refused `device` (their
  device is no longer on the list): the character is the thief's.
- **Harm.** Total loss of that character (gold, gear, bank) and its player
  shut out; the owner can undo it only by hand (Forget + Give a new key +
  restore). **Likelihood.** Needs the trick and a list-less old character;
  low today (the owner is the only player), rising with real players.
- **Smallest fix** (devicelock.js, ~3 lines): an OLD key never adds a device
  on its own -- for an old key, an empty, unsealed list is `refuse` (the
  owner's pass is the way in), and the login check answers the same. Better
  later: retire every old key that has a new key on file (`oldGone`), and
  stop putting key words in ids for good (they already are not, for new keys).

### The plan and its limits (the frame for every cost finding)

- The repo's last word (CLAUDE-HISTORY v2.3.3257) is that the account is on
  Cloudflare's **FREE** plan. Cloudflare's docs (read 2026-11-14): Free has
  DAILY account-wide limits, reset 00:00 UTC -- 100,000 requests (Workers),
  100,000 Durable Object requests (20 socket messages in = 1), 13,000 GB-s,
  5 million rows read, **100,000 rows written** (deletes count), **5 GB stored
  per account**. Past one, "further operations of that type fail with an
  error" until midnight UTC. So on Free a cost attack cannot bankrupt the
  owner: it STOPS THE GAME for the rest of the day, every day it is repeated.
- On the paid plan ($5/month) the same traffic becomes a bill: Workers
  $0.30/M requests, DO $0.15/M requests, rows written $1.00/M, stored data
  $0.20/GB-month. **New on 2026-11-13:** Cloudflare spending limits and email
  alerts for Workers and Durable Objects (Billing > Spend Management). A
  limit pauses the product when reached; it is "not a hard cap" (metering
  delays), and stored data is NOT counted in it.

### N2. Anyone can spend the day's 100,000 row writes in about 3 minutes, with no account (PROVEN locally; the Cloudflare limit's effect from its docs)

- **What.** `/api/feedback/submit` and `/api/feedback/crash` (feedback.js,
  the Feedback DO; NOT behind card K's wire door, which guards the GameRoom
  only) are public POSTs. Their only limits are keyed by ids the caller makes
  up (`rate:<playerId>`, `crashrate:<sid>`), so a fresh id each time passes.
  A submit writes 3 rows (`rate:`, `ticket:`, `_stats`), a crash report 2
  (`crashrate:`, `_crashlog`), and the `rate:`/`crashrate:` rows are never
  deleted.
- **Proof** (`scratchpad/rt1/feedback-grow.mjs`, local worker): 200 submits
  with fresh ids, 200 accepted, in 1.03 s; 200 crash reports, 200 accepted.
  So one laptop writes ~600 rows a second: **100,000 rows in under 3
  minutes**.
- **Harm on Free.** The 100,000 rows are the WHOLE ACCOUNT's: after them
  every write in the game room fails until 00:00 UTC -- saves (`_saveRpg`
  swallows the error: progress made after that is lost at the next restart),
  new characters, trades, the market. Card E's value pause (valuepause.js,
  "a value road fails closed while saves are refused") turns money moves
  into refusals, which is the right failure, but the game is still frozen in
  place for the day. Repeatable daily by one person. **Harm on paid:**
  ~$2 an hour of rows per laptop (~$50 a day, ~$1,500 a month running
  continuously), times the number of machines.
- **Likelihood.** High once anyone hostile looks: the route is in the page's
  own code, needs no login, and a loop of `curl` does it.
- **Smallest fix** (feedback.js, a new card or RT's own PR, ~30 lines):
  key both limits by the caller's address (`CF-Connecting-IP`, flood.js
  `requestIp`) as well as the id, with a global ceiling (e.g. 200 tickets
  and 200 crash reports an hour for the whole game, then refuse); clamp
  `playerName` (32) and `topic` (40) and refuse unknown topics; stop
  writing the `rate:`/`crashrate:` rows (keep the counters in memory, which
  is enough to stop a flood). Kill switch `feedback: false`. Cost to run:
  zero (fewer writes than today).

### N3. One anonymous request stores a 1.9 MB row; 50 of them crash a phone that opens the board (PROVEN locally)

- **What.** `playerName` and `topic` in a feedback submit have no length
  limit (only `text` has, 500). A submit with a 1.9 MB `playerName` is
  stored (`SQLITE_TOOBIG` only at ~2 MB). `/api/feedback/list` then serves
  those rows to whoever opens the feedback board: with `limit=50`, 50 x
  1.9 MB = ~95 MB of JSON to a phone (iPhone Safari's budget is ~250 MB).
- **Proof** (`feedback-grow.mjs`): 1 KB, 100 KB, 1 MB, 1.9 MB names stored
  (200); `/list?limit=50` came back 2.0 MB with ONE such row in it.
- **Harm.** Storage: ~2,700 such requests is 5 GB, the Free plan's whole
  account (suspected, not proven: the docs disagree whether one object stops
  at 1 GB first; if the account fills, every save in the game fails). On
  paid, capped at 10 GB in the one object (~$2 a month), but stored data is
  outside the new spending limits. A phone opening the board black-screens.
  The `_stats` row (one row for every topic ever) also grows with each new
  `topic` until it hits SQLite's 2 MB and every NEW topic's submit fails
  (shown: the third 0.9 MB topic got `SQLITE_TOOBIG`).
- **Smallest fix.** The clamps in N2's fix. Plus delete what is there: the
  owner's tool, or a one-time sweep of `ticket:` rows over 4 KB.

### N4. One home internet line fills the room: the per-address limit counts each IPv6 address apart (PROVEN locally)

- **What.** flood.js holds one address to 16 sockets and 20 opens a minute,
  keyed by the exact `CF-Connecting-IP`. An IPv6 home line is given a whole
  /64 block (2^64 addresses), and a script picks a new one per socket. With
  the account check (Turnstile) OFF (`TURNSTILE_SITEKEY = ""` in
  wrangler.toml), a guest join needs nothing at all.
- **Proof** (`scratchpad/rt1/roomfill.mjs`, local worker, the address header
  set as Cloudflare's edge would): one IPv4 address, 20 sockets -> 16 in,
  then refused `ip` (the limit works). One IPv6 /64, a new address per
  socket -> 104 more guests in, then `full`; an honest player next: refused
  `full`. The room's 120 places held by one script.
- **Harm.** Nobody can play while the script runs; it costs the attacker a
  message every 2 minutes per socket (the idle sweep), so it is cheap to keep
  up and does not trip any cost limit. **Likelihood:** medium (needs IPv6,
  which most home and phone lines now have, and a 40-line script).
- **Smallest fix** (flood.js `requestIp`, ~5 lines): count an IPv6 address by
  its /64 (its first four groups); the same in account.js's per-address
  login limit. Better with it: a cap on guests (ids with no `auth:` record)
  at, say, a quarter of the room, and Turnstile on (only the owner can).
  Run cost: none.

### N5. A full room of sockets flooding inside their budget (PROVEN locally; the bill is arithmetic)

- **What.** The per-socket budget (FLOOD.MSG_PER_S = 120, burst 300) closes
  a socket only past it. 120 sockets x ~120 a second is ~14,400 messages a
  second, all taken.
- **Proof** (`scratchpad/rt1/flood.mjs`): 100 joined guests at 118 a second
  for 20 s: 238,800 messages, 11,940 a second, none closed. The local room
  kept its 2 s ping rhythm (local workerd is fast); the Cloudflare lab
  measured ~81 us a socket message on Cloudflare, which at 14,400 a second
  is more than the room's one thread (SUSPECTED freeze, not proven).
- **Harm.** Free plan: 20 messages in are one DO request, so ~600-720
  billed requests a second spend the day's 100,000 in about 2.5 minutes (if
  Cloudflare counts every hibernation message as one, as the lab's
  "invocations" suggested, in seconds). Paid: bounded by the one room's 120
  places, ~$0.40 an hour, ~$280 a month nonstop. Not bankruptcy; a daily
  outage on Free.
- **Smallest fix.** N4's /64 count (it bounds how many sockets one line
  holds), and a room-wide ceiling on messages in (e.g. 4,000 a second: past
  it, the sockets with the most are dropped first). Card K's territory (the
  wire's budgets): route there.

### N6. Every guest join writes 6 rows, 4 of them forever (PROVEN, test room)

- **Proof** (`scratchpad/rt1/adminguess.mjs`, the real join on the shared
  test room): a guest join (no key) wrote 6 rows and left `rpg:`, `pets:`,
  `cadence:login:`, `daily_rewards:` for an id the caller made up; a new
  character's join 9.
- **Harm.** With N4's IPv6 trick, ~17,000 guest joins spend the Free plan's
  100,000 writes (a few minutes), and every one leaves junk rows that are
  never swept (suspected: no sweep of guest records found).
- **Smallest fix.** A guest's record is written only once it does something
  worth keeping (or never: a guest is a throwaway by definition), and
  Turnstile on. Route: a new card (the join is card-less as far as I can see;
  join.js is shared ground).

### N7. The admin key: unlimited guesses, one key for everything, kept in the game page (PROVEN for the guessing)

- **Proof** (`adminguess.mjs`, test room): 5,000 wrong keys in 0.5 s, every
  one a plain 401, no lockout, no slowdown, no log; then the right key: 200.
  Online guessing is limited only by the attacker's bandwidth and the bill
  (each guess wakes the room). A 30-character random key (what OPERATIONS.md
  asks for) cannot be guessed; a word or a short password can.
- **What one leaked key does** (admin.js, devtools.js, devicelock.js,
  liveops.js, hidden.js): grant gold and items to anyone (`/grant`); kick and
  freeze anyone; restore a player from a snapshot; **take over any character**
  (`/key-new` hands the caller a fresh login key for it; `/device-pass` lets a
  new device in); flip every live flag, which includes turning OFF the device
  lock, the wire door, the account check and the room's kill switches, and
  turning ON `roomrewind`, after which `/rewind` rolls the whole room's
  storage back (Cloudflare point-in-time recovery, 30 days; undoable only by
  rewinding again, if the owner knows how); post a server-wide announcement
  (a phishing line in the game's own voice); read and change the hidden
  settings (`/dev/hidden`); test mode on any character.
- **Where it lives.** `localStorage` `bt_dev_key` on the game's own origin
  (DevPanel.jsx), so any script that ever runs on brotown.net can read it;
  there is no Content Security Policy (`public/_headers` sets only caching),
  and Turnstile's third-party script will load on that origin when the
  check is on. The injection sweep found no way today for a player's words
  to become script (all React text / Pixi text), so this is a margin, not a
  hole. The worker takes the key only in a header, never in a URL (good).
- **Smallest fixes.** (1) A failure lockout: after 10 wrong keys from an
  address in 10 minutes, refuse that address for an hour, and keep a count
  the overview shows (admin.js `_adminAuth`, ~15 lines). (2) The owner
  rotates the key and confirms it is 30+ random characters (only the owner).
  (3) Later: a second key for the destructive levers (`/rewind`, `/flags`,
  `/key-new`, `/hidden`), not kept in the browser; a CSP on the Pages site.

### N8. Plain web requests: no limit anywhere, and the Free plan's 100,000 a day is the whole game (PROVEN locally; the quota from Cloudflare's docs)

- **Proof** (`scratchpad/rt1/httpflood.mjs`, local worker, 400 each, one
  client): `/health`, `/api/lobby`, `/api/store/browse`,
  `/api/market/orders`, `/api/arena/status`, `/api/leaderboard/top`,
  `/api/feedback/list`, `/api/store/mine?playerId=` (anyone's bids: plan
  step 11.5), `/api/admin/overview` -- every one answered, 435-990 a second
  from ONE local client, no refusal, no slowdown. The room's routes wake the
  one game room each time (11.5's find, confirmed). `/api/feedback/list` fell
  to 74 a second once N3's big rows were in it: it parses every ticket on
  every read.
- **Harm on Free.** Every request counts against the account's 100,000
  Workers requests a day, which the game's own sockets also use: one
  `curl` loop at a few hundred a second ends the game's day in 3 to 6
  minutes (Cloudflare then answers with its own error page until 00:00 UTC).
  Nothing in the worker can stop it: the count is taken before the worker
  runs. **On paid:** $0.30 a million (+$0.15 for the room's routes): one
  machine at 1,000 a second is ~$1.60 an hour, ~$1,150 a month nonstop;
  a rented botnet multiplies it. This is the one cost attack with no
  ceiling in the code.
- **Smallest fix: only the owner can** (Cloudflare settings, below): a
  rate-limiting rule on `api.brotown.net` (the WAF runs before the worker,
  so a blocked request is not a Workers request), and the paid plan with a
  spending limit. In code (new card, cheap): pace the room's public reads
  per address and cache them (11.5), so a flood that gets through wakes
  nothing.

### N9. Anyone can lock an old-key player out, a minute at a time (from the code; LOW)

- `_authFailCount` (join.js) locks an id for 60 s after 5 wrong keys, and
  ids are public. A NEW key passes the lock (v2.3.3355), an OLD key does
  not: a script sending 5 wrong joins a minute keeps an old-key character
  out for as long as it runs. Shrinks to nothing as old keys are retired
  (N1's fix). Same lock on `/api/account/login`.

### N10. Three addresses make the room send every player ~2 MB a second of junk (PROVEN locally)

- **What.** A relay (`stunned`, `player_shield`, `campfire_lit`, ... the 26
  `relay` rows) is copied with EVERY field the phone put in its payload
  (relay.js `_relayBuild`: `{ ...src }`), up to the 16 KB frame; the wire
  door checks only `words` fields and non-finite numbers. Each socket may
  relay 8 at once then 4 a second. The tick drains 64 KB of events a tick
  and keeps the rest QUEUED (tick.js: "delays a burst, it does not lose
  it"), with no cap on the queue's bytes. Rows not in `RELAY_PLACED` go to
  every phone in the room.
- **Proof** (`scratchpad/rt1/relaybomb.mjs`, local worker): 48 guests on 3
  IPv4 addresses (16 each: inside the address limit), each relaying a 14 KB
  `stunned` 4 times a second for 30 s (76 MB in). An honest player in the
  room received **2.25 MB a second** for the whole 30 s, and still 1.9 MB/s
  for 5 s after the flood stopped (the queue draining). No socket closed.
- **Harm.** Every phone in the world is sent ~18 Mbit/s of junk: a phone on
  a mobile line chokes, its data plan drains (~8 GB an hour), and parsing
  it on iPhone Safari is a likely black screen. The room compresses each
  copy per phone (`permessage-deflate`, ~40% of its thread at 100 players,
  WORLD-ARCHITECTURE §11), so on Cloudflare the room's thread is the next
  thing to go (suspected). With N4's IPv6 trick, 120 sockets push the
  queue's growth to ~4 MB a second, past Cloudflare's 128 MB in about half a
  minute, and the room resets (suspected: arithmetic, not run here).
  **Likelihood:** medium-high (no account, three cheap servers or one IPv6
  line). Free outbound, so not a bill: an outage.
- **Smallest fix** (card K, the relay rows): `_relayBuild` copies only the
  fields the row names, each held to a size (a relay's payload under 1 KB);
  past a queue cap (e.g. 512 KB) events are DROPPED, oldest relay first,
  never the worker's own; a byte budget per socket beside the count. Run
  cost: less CPU than today.

### N11. Every throwaway guest leaves ~27 KB on the room's heap for good; ~4,000 of them reset the room (PROVEN, test room)

- **What** (found by the memory sweep, `scratchpad/agent-maps.md`; the
  worst one proven): `_lastStrikeById` (gathering.js `_strikeRefused`)
  stores the refusal with the phone's raw `zone` (up to the 16 KB frame),
  keyed by the guest's id, never deleted -- not on leave, not by a cap.
  Smaller ones of the same shape (never cleared on leave, no cap):
  `_arrowBlastRejects` (arrowblast.js), `_laneBuckets` (chatlanes.js),
  `_scBuckets` (storechat.js, made before the listing is checked),
  `_chatReportLog` (chatmod.js, plus a stored `chat_report:` row a report),
  `_fireBurnAt` (firetrail.js), `props.js _boxes` (a key a dungeon run).
- **Proof** (`scratchpad/rt1/strikeleak.mjs`, the shared test room, the real
  join and leave): 1,000 guests each joined, sent one `node_strike` with a
  15 KB `zone`, and left. Sessions after: 0. `_lastStrikeById` entries:
  1,000. Heap after a full GC: **+27.4 MB** (~27 KB a guest, linear: 10.5,
  16.2, 21.8, 27.4 MB at 250/500/750/1,000).
- **Harm.** Cloudflare resets a Durable Object past 128 MB: every player
  thrown out at once, whatever was not yet saved lost, and the attacker
  starts again. From the room's ~9-44 MB at rest, ~3,500-4,500 guests do it:
  ~3 hours from one IPv4 address (20 joins a minute), minutes with N4's
  IPv6 trick. **Likelihood:** medium (needs reading the code, which was
  public until 2026-10-28).
- **Smallest fix** (gathering.js, 2 lines + one line each for the others):
  store only `why`, `at` and the zone IF it is a known zone id (else
  `'?'`); delete the player's entry in `_playerLeaves` (leave.js has the
  one place every leaving passes). A guard test: join and leave 100 guests
  sending every message type with 15 KB strings; the heap after GC must not
  grow more than 1 MB. Route: card K (the wire's hostile-values suite is
  the natural home for that guard), or a new card.

### Checked and found sound (so nobody re-checks them)

- **No script injection.** Player text never reaches HTML: no
  `dangerouslySetInnerHTML`, no `innerHTML` with player words, the server
  never answers HTML, the prize draw page escapes names (`esc()`). Low
  notes: a player colour reaches CSS `background` with only a length cap
  (`url(https://...)` makes every viewer's browser fetch the attacker's
  address: an IP leak, no script); `avatar` any 512-character URL loaded as
  an image by every peer; a trade offer's `fromName` comes from the phone
  (impersonation in a trade popup: plan step 11.4's ground).
- **origin.js** stops other WEBSITES, not scripts: no Origin header is let
  in as "a program" (by design, TRAPS §195). It is not a defence against
  any finding here.
- **Turnstile (verify.js)** gates only a character that does not exist yet,
  and is OFF (`TURNSTILE_SITEKEY = ""`). On, it would make N4, N6, N10 and
  N11 cost a solved challenge per guest (solving services exist, ~$1-3 a
  thousand): a real brake, not a wall.
- **Bounded already:** `_ipOpens` (1024), `_paceBuckets` (2048), the
  dungeon zone names (card K / earlier fixes), `_wireDoorCounts` (card K),
  `_lastPlaces`, `_botfp`, the login door's per-address limit (20 a
  minute), the `_authFails` map (only registered ids).
- **New login keys** (84 bits, worker-made, fingerprint only): not
  guessable; a lockout cannot shut their holder out.
- **The admin key** is compared by SHA-256 digest, taken only from a
  header, and the surface 404s when unset.
- **Hidden settings**: private values live in storage, never sent to a
  phone; only the admin key reads them. If the repo goes public, nothing
  new is exposed (the placeholders are public by design).
- **Covered by the plan already:** `/api/store/mine?playerId=` (11.5),
  economy sums and roads (E, R), the wire door (K), the words rule (11.4).
