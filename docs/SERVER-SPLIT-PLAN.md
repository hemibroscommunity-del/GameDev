# One world for 1,000 players: how to split the server (v2.3.3208)

> Owner, 2026-10-13: *"I think 120 is a good cap limit for now. But I want to
> see how many players I can fit while appearing to be in the same world.
> Hopefully 1000 while just as smooth is possible. ... begin planning what the
> best server split would look like."*

This is a PLAN, measured where it could be measured here. Nothing in it is
built yet. Numbers marked *estimate* are worked out from the measurements, not
measured themselves; each phase below says how it will be measured before the
next one starts.

## The answer, short

- **Yes, 1,000 in one world looks possible, as smooth as today, with no loading
  screens and no copies of BroTown.** But not by cutting the map into areas
  first, which is what `docs/WORLD-ARCHITECTURE.md` §11 planned.
- **Split the room by CONNECTIONS, not by PLACE.** Several **front doors**
  each hold about 125 phones' connections and do everything that is *per
  phone*: taking their messages in, building what each phone is sent, and
  compressing it. **One world server** behind them runs what everyone shares:
  the monsters, the fights, the economy, the saves.
- **Why: the room's work is mostly per phone.** On the real runtime
  (Cloudflare's workerd, run here) at 150 players, about four fifths of the
  room's busy thread went on each phone's own
  messages: receiving them, building what it is sent, and compressing it. In
  a crowd that part grows with the square of the crowd. At 600 players the
  world itself (monsters, fights, the other systems) was 6% of the room's own
  JavaScript, against 69% building the phones' messages. A copy of the room
  doing only the world's part ran 1,000 players in **6 ms of each 22 ms tick,
  about two thirds of one processor**, mostly judging their moves (measured
  in Node, below).
- **The phone has its own limit.** With 100 players on one screen, the game's
  own work for each frame was about **4 times** an empty town's. So each
  phone should draw the **nearest 40-60 players** in full, and always your
  party, your target and whoever is fighting you. Decided: **50** (below). It
  is worth doing even at today's cap of 120.
- **Area servers are still the plan for later,** when the one world server
  fills, which by these numbers is somewhere past 1,000. The front doors would make
  their borders invisible: your connection never moves, only which server is
  in charge of you.
- **Cost at 1,000 players around the clock: about $245 a month** (*estimate*).
  Most of that is the phones' own messages, as today. The split adds about
  $50.
- **The biggest unknown is Cloudflare itself.** Its documentation says
  several servers of the same kind may be put on one machine and share its
  memory, and its runtime's source suggests they then share one processor
  too. That can only be tested on Cloudflare, with a lab copy that never
  touches the live game. I need your yes for that (the last section).

## What "the same world" means here

- **One BroTown and one map.** Anyone can walk up to anyone, with no channels,
  layers or copies of town.
- **No loading screen** for walking anywhere, and no reconnect when you cross
  a line.
- **Fight, trade, party, duel and chat with anyone.**
- **One market, one auction house, one bank, one leaderboard.**
- **"Just as smooth"** in three ways:
  - the world's speed: 33 ticks a second or more, and today's 41-42 up to 100
    players;
  - others' moves reaching you as quickly as now: 16-46 ms in the load test,
    from 50 to 150 players;
  - your phone's frame rate.

## What limits one room today (measured)

The room is one Cloudflare Durable Object, and a Durable Object runs on ONE
thread. Since #887-#891 it is smooth to about **145 players**
(`docs/specs/move-diet.md`); the cap is 120 (`docs/specs/cap-120.md`).

**Where its work goes.** `tools/qa/load/load-wheel.mjs` runs the real room code in Node,
with everyone in the Wheel and 30% of them fighting. A CPU profile sorts its
time into buckets:

| Players | the room's own work (Node, % of a core) | per phone: building, interest, steady movers | the world: monster AI and the other systems | taking messages in: parse, judge moves, fights | garbage collection |
|---|---|---|---|---|---|
| 150 | 36% | 66% | 17% | 10% | 7% |
| 300 | 61% | 72% | 10% | 10% | 8% |
| 600 | 213% (could not keep up) | 69% | 6% | 7% | 18% |

(Each line's shares add up to its whole. "Per phone" includes the rest of the
tick's own body, which is mostly the loop over the phones. Garbage collection
is mostly the per-phone strings' leftovers.)

**That is only the JavaScript.** On the real runtime, at 150 players, two
more things land on the same thread:

- compressing every message for every phone, about **a third of the
  thread**;
- taking each message in, about 35 µs of the thread each: the runtime's
  share and the room's own reading of it.

Both are per phone as well (`docs/specs/load-test.md`; CPU and native samples
of the real runtime, `tools/qa/load/cdpprof.mjs`, `gdbprof.mjs`).

**Why per phone grows with the square of the crowd.** In BroTown everyone is
near everyone. Each phone is sent every moving player near it, so 150 players
make 150 lists of 150. That is also why one phone's download, unzipped, went
from 311 KB/s at 150 players to 1,165 KB/s at 600 (the room had no diet in
this harness).

**The world's own part is small and grows slowly.** It was 37 ms of CPU a
second at 150 players and 86 ms at 600.

### The world alone at 1,000 (measured)

A scratch copy of the room was made to do only what a world server would do.
Its tick built ONE update of every player and monster that changed,
stringified it once and "sent" it to 8 doors, with no per-phone messages
(the patch is under "How to re-run"). Every phone's message was still taken
in and judged by the world, as it would be.

| Players | messages in a second | tick, average / 95th percentile | taking messages in, CPU a second | % of a core |
|---|---|---|---|---|
| 150 | 3,445 | 2.8 / 9.2 ms | 81 ms | 21% |
| 300 | 6,867 | 2.7 / 5.5 ms | 126 ms | 25% |
| 600 | 13,712 | 4.3 / 7.9 ms | 237 ms | 44% |
| 1,000 | 22,834 | 6.1 / 10.0 ms | 374 ms | 65% |

- **At 1,000 players the world's tick takes about 6 ms of its 22 ms**, and the
  thread still has a third to spare.
- **Most of what it does is judging the phones' moves.** These bots send every
  move, 30 a second each. Real phones on the safe ground send about half that
  since #891, so a real crowd costs less.
- **The update it sends each door is about 80 KB a tick** at 1,000 players
  (8 doors × 41 ticks × 80 KB, about 26 MB a second, inside one Cloudflare
  data centre and not compressed).

## What limits the phone (measured)

`tools/qa/mp/mp-crowdbots.mjs` (new) stands one phone page in BroTown and walks the load
test's bots round it, adding them in steps. *This box draws in software, so
read the growth, not the absolute numbers.*

| Bots | on the phone's screen | the game's work for one frame, middle / 95th percentile | the entities' share of it | page memory (JS) |
|---|---|---|---|---|
| 0 | 0 | 5.4 / 8.7 ms | 0.5 ms | 32 MB |
| 25 | 24 | 11.4 / 19 ms | 2.2 ms | 29 MB |
| 50 | 48 | 14.4 / 18.5 ms | 2.6 ms | 33 MB |
| 80 | 74 | 18.6 / 28.7 ms | 4.0 ms | 39 MB |
| 110 | 106 | 22.9 / 46.6 ms | 4.6 ms | 47 MB |

- **Each player on screen adds about 0.16 ms to every frame** on this box. A
  frame at 60 a second has 16.7 ms for everything.
- **A fast iPhone may do the same work in about half the time.** Even so,
  about 100 figures on one screen would cost a phone its smoothness.
- **That can already happen at today's cap of 120** if most players stand in
  BroTown's square together.
- **The bots all look the same.** Real players in different outfits each need
  their own recoloured pictures, so a real crowd costs MORE memory than this.
  That is not measured yet.

## Four ways to split, compared

| | Copies of the world ("layers") | Area servers (the old §11 plan) | **Front doors + one world (recommended)** | Fine moving cells |
|---|---|---|---|---|
| Everyone in one world? | **No**: you see only your copy | Yes | Yes | Yes |
| A crowd in BroTown | each copy holds part of it | **all on one area server**: BroTown and the commons are where everyone starts, respawns, shops, banks and takes quests | spread across all the doors | split into small cells, many borders |
| Borders inside the world | none | at the gates and passes: seeing across, fighting across, monsters chasing across, the character handed across | **none** | everywhere, moving |
| Saves and the economy | split by copy | the character moves between servers: needs the character vault (§4) and every save moved out of the room | **unchanged**: the world server keeps them all | as areas, but harder |
| Phone changes | small | the phone holds two connections while crossing | **none in its first step** | a lot |
| Size of the work | small | large | medium | very large |
| Can be turned off | yes | hard once saves move | **yes, in the routing** | no |

**Copies** fail the brief: you would not see everyone. **Fine moving cells**
(the SpatialOS style) is what a 100,000-player shooter needs, not 1,000.

**Area servers fail at the hub.** Suppose a third of 1,000 players are in
BroTown and the commons, as everyone starts, respawns and shops there. That is
over 300 on one area server, about twice what one room holds. Cutting the town
itself in two would put a border down its busiest street. Area servers also
bring every hard problem of borders, and they need the character vault before
the first one opens.

**Front doors** attack the measured cost directly. The per-phone work, about
four fifths of the room at 150 players and more in a bigger crowd, is spread
over as many doors as needed, wherever the crowd stands. The world stays one place, so nothing about saves, trades, the market
or quests changes, and ARCHITECTURE-HANDOFF's rules stay exactly as they are.

## The recommended design

```
  phones ──► the Worker ──► door 1 ─┐
                       ├──► door 2 ─┤ one socket each,
                       ├──► ...     ├──────────────────►  the WORLD (one)
                       └──► door 8 ─┘ updates batched     monsters, fights, moves judged,
                                         once a tick      loot, XP, quests, economy, saves
```

- **A door holds about 125 phones** (*estimate*). It does what is per phone:
  - accepting the phone's socket, and the runtime's per-message cost;
  - reading (parsing) each message, and the flood and rate checks;
  - pings and the AFK clock;
  - building each phone's tick: who is near, the crowd cap, steady movers,
    far players;
  - compressing it. That last part alone was about a third of today's room.
- **The world** keeps everything that decides anything:
  - moves judged, monsters, hits, loot, XP, quests;
  - the market, trades, duels, mail, saves.

  It sends ONE update a tick, the same for every door.
- **Doors talk to the world over a socket, not by calling it.**
  - *Calls* (Cloudflare's JS RPC) are billed as one request each, which is
    documented.
  - Socket messages are billed at one request per 20, as far as the
    documentation says. Doors talking to the world are not mentioned, so the
    lab must confirm it.
  - Inputs are batched every 10-20 ms. Cloudflare's own guidance is to batch,
    because "many small messages can overwhelm" one object.
  - Measured here (`tools/qa/load/dobench/`, below): a message between two
    servers costs about what a phone's message costs. A call costs 3-4 times
    that, before the network.
- **The world never waits for a door.** Inputs are applied when they arrive,
  as phones' are today. A late door batch is a late input, not a frozen
  world: Cloudflare users report rare 3-second stalls between two objects
  (workerd issue 7607).
- **The world runs in its own Worker script and the doors in another.**
  Cloudflare may run several objects of the same Worker in one "isolate" on
  one machine, sharing its 128 MB and, by the runtime's source, its one
  thread. A separate script keeps the doors from ever sharing the world's
  processor. Whether doors share processors with EACH OTHER is the first
  thing the lab measures.
- **The phone's messages are unchanged in the first step.** A door speaks
  exactly today's protocol, so client and server stay deployable in either
  order (CLAUDE.md, wire protocol).

## The phases

Each phase is one or a few PRs, measured before the next, with a kill switch.

### Phase 0: crowd-proof the wire and the phone, in today's single room

These are needed by ANY split. Several help at today's 120.

- **0a. The crowd cap on the phone.** Draw the nearest *K* players in full,
  and always your party, your target, whoever is attacking you and your duel.
  *K* and what lies beyond it are your call: hidden, a simple figure, or only
  a dot on the minimap. A setting such as `?crowd=K` lets you try it on your
  own phone, and `mp-crowdbots` measures each change.
- **0b. Presence at scale.** Once a second, every phone is sent EVERY
  connected player in full (tick.js, the presence roster). At 1,000 players
  that is about 100-150 KB a second to each phone, unzipped.
  - Instead, send only what changed: joins, leaves, names, levels.
  - Positions go only for players within the minimap's reach.
  - The world map asks for a snapshot when it is opened.
  - *v2.3.3246, the first step (the worker alone).* A far player is sent
    slim: position, facing, zone and speed. A far player standing still is
    sent every 4 s instead of every second (`docs/specs/slim-roster.md`). The
    rest needs a phone change: the phone has to stop sweeping away the far
    players it no longer hears from.
  - *v2.3.3250, the rest (worker and phone).* A phone that joins with
    `pres: 2` is sent, in the Wheel, the players near it and its party; far
    players only while its world map is open (`map_watch`); and everyone's
    id and zone every 30 s (`on`), which replaces its 10 s ghost sweep. A far
    player's copy is parked out of sight, so it is never a ghost where they
    were last seen. In-process, 20-25% less to each phone than the slim roster
    at 120 players and 34-42% less at 500; merged with 0c's roster-only far
    players (#898) the extra cut is small at 120 (1-10%) and 8-24% at 1,000
    (`docs/specs/presence-v2.md`).
- **0c. Far players at scale.** Four times a second, every phone is sent every
  player who moved anywhere in the Wheel (`FAR_PLAYERS`, #886). At 1,000 this
  becomes "the players on your minimap", as positions only.
  - *v2.3.3243, the first step:* that send is gone. A player past 2,400 px
    (who is on neither your screen nor your minimap) reaches you only in the
    once-a-second roster, which is 0b's to slim down. At 120 players the room
    is about 5 points less busy and each phone downloads 15-18% less
    (`docs/specs/far-players.md` "Once a second").
- **0d. Events by place.** Every game event goes to every phone in the Wheel:
  up to 500 events and 64 KB a tick (tick.js). At 1,000 players that is one
  room-wide queue of everyone's fights.
  - Events should carry where they happened, and a phone should get those
    near it.
  - Truly global ones (world chat, clan wars) still go to everyone.
  - *v2.3.3245, done:* the fights' events are placed by an allowlist
    (`server/src/eventplace.js`). They go to the players they are about, and
    to the phones within 2,800 px of them in the Wheel; everything else still
    goes to everyone. At 120 players with real swings and arrows, each phone
    gets about 16 events a second instead of 50
    (`docs/specs/events-by-place.md`).
- **0e. The join snapshot.** A joining phone is sent every player's full state
  (`getAllPlayerData`, `state_sync`). That is O(N) work for each join and
  about 1-2 MB at 1,000 players (*estimate*). Send only what the joiner's surroundings
  need.
- **0f. Memory with real characters.** The room keeps about 22 KB per bot
  player after a full collection (`heapprobe.mjs`, cap-120.md). Real
  characters carry bags, quests and pets. Measure a real character and the
  world's memory at 1,000, against Cloudflare's 128 MB.

### Phase 1: doors as relays

- **The Door class, in its own Worker script.**
  - The Worker routes the game's socket to a door instead of the room.
  - A door forwards its phones' messages to the world in batches over one
    socket, and passes the world's messages back, compressing them itself.
- **The world treats each door's phones as "virtual sockets".** It has
  about 95 places that send to a socket today; they keep calling `send`, and a
  virtual socket queues the message for its door. The world's real sockets keep working, so old
  clients and the kill switch still work.
- **Kill switch:** the Worker routes the socket straight to the room again, as
  today.
- **What it should give:** the world sheds the compressing (about a third of
  its thread) and most of the runtime's per-message cost. That is roughly
  **twice today's players** (*estimate*: about 250-300).
- **Gate:**
  - the local load test with the doors in their own process, which is how
    wrangler runs a second script;
  - then the Cloudflare lab.
- **What the lab says (v2.3.3252, runs 3 and 4, docs/specs/cloudflare-lab.md):**
  - **One script of doors works.** Objects of one script run side by side:
    8 at once did the work of 5.9-6.6, 16 of 6.2-8.6. Plan for about 6
    doors' worth of parallel work per 8, not 8.
  - **The world makes its doors, and keeps them in its city.** Two objects in
    one city were 3-4 ms apart a round trip (p95 4-6 ms); in two cities
    (Newark, Chicago), 22 ms. A door is made near whoever asks for it first,
    so the world asks first, by names of its own, and a door that finds itself
    elsewhere (its own trace page says where) should be retired.
  - **Doors talk over sockets.** In one city a socket message cost 75-81 µs
    end to end; a call, 852 µs. A call is also billed one for one, against 20
    socket messages to a request. The game's room keeps its hibernation
    sockets: one city made them as cheap as plain ones.
  - **Billing adds, it doesn't save.** Phones' messages to a door are billed
    as they are to the room today, plus each door's batches to the world. On
    the paid plan that is cents; on the free plan Phase 1 does not fit at all
    (risk 8).
  - **So the gate is now Workers Paid,** then the local load test with doors,
    then a lab run of a door and a world in one city carrying a load-test
    crowd.

### Phase 2: doors build each phone's messages

- **The world sends ONE update a tick to every door:** everything that changed
  (about 80 KB at 1,000 players, measured above).
- **Each door keeps a copy of the world** and builds each of its phones' ticks
  with today's code from tick.js, moved into a module both can use. That is
  interest, the crowd cap, steady movers and far players.
- **What it should give:** the world measured above, about two thirds of a
  thread at 1,000 players (in Node: Cloudflare's runtime is the same V8, but
  the lab confirms it). Each door does roughly what today's room does for
  125 players, minus the world. So **8 doors for 1,000** (*estimate*).
- **Gate:** the load test at 1,000 bots, plus `mp-crowdbots` and
  `mp-questline` on a phone through a door.

### Phase 3: area worlds behind the doors (only if the world fills)

- **When:** if the world server itself runs out of thread, which by the table
  above is well past 1,000.
- **What:** WORLD-ARCHITECTURE §11's area servers come in BEHIND the doors.
  - A door listens to the area your phone is in, and to its neighbour near a
    border, and merges the two.
  - Crossing a border hands the decisions about you to the next area. Your
    phone's connection stays where it is: no loading screen and no second
    socket.
- **What it needs first:** the character vault and lease (§4).

### Phase 4: services out of the world

- **What:** the market, mail and social, as their own servers (§4).
- **When:** only when the world needs the processor time, or a second world
  opens.

## What it costs at 1,000 players (*estimate*, Cloudflare's list prices)

| | How much | A month, 1,000 players around the clock |
|---|---|---|
| Phones' messages in (about 10 a second each, at 20 to a billed request) | 500 billed requests a second | about $194 |
| Doors ↔ world, over sockets (8 doors, a batch each way about 40 times a second) | about 34 billed requests a second | about $13 (about $270 if they were calls) |
| Time the servers are awake (9 always on, at 128 MB each) | about $4.15 each | about $37 |
| **Total** | | **about $245** |

- **Messages going OUT are free**, and so is bandwidth.
- **This is about 0.03 cents per player-hour.** WORLD-ARCHITECTURE §11
  estimated about 0.1 cents before the message diet; its business-model
  table still stands.
- **A real 1,000-player game peaks at 1,000** and averages far less, so the
  real bill would be a fraction of this.
- **These are the paid plan's prices.** The account is on the FREE plan today
  (v2.3.3252, found by the lab's first run), where Durable Objects have daily
  limits instead of a bill: risk 8.

## Risks and unknowns

1. **Shared processors.** Two doors on one machine may share one thread, and
   two doors sharing it would each have half. The first lab test is "do 8
   doors run in parallel?". If they do not, there are fallbacks: more,
   smaller doors, or doors spread over several scripts.
2. **Delays between servers.** Users report "tens of ms" between two objects
   in one data centre, with rare stalls of 3 s (workerd 7607).
   - The world never waits on a door.
   - Doors and world reconnect on their own: every deploy, and every
     Cloudflare runtime update, drops their sockets as it drops the phones'.
   - The phones' "others' moves seen" is measured through a door. Two hops
     inside one data centre and a batch should add about 10-20 ms
     (*estimate*).
3. **How Cloudflare bills a socket between two servers** is not documented.
   The lab reads it off the account's own figures.
4. **Placement.** A Durable Object is made near whoever first asks for it, and
   never moves.
   - The world should make its doors itself, so they start next to it.
   - `locationHint` is a region, best effort, and in one report it put an
     object in a different city.
5. **Memory.**
   - The world's at 1,000, with real characters (Phase 0f).
   - A door's: the runtime keeps about 300 KB of compression buffers for
     each socket (cap-120.md), so 125 phones hold about 37 MB. That is one
     more reason to keep a door near 125.
6. **The phone:**
   - the crowd cap (0a);
   - memory for many different outfits, which the bots do not show;
   - download stays bounded by the cap.
7. **Every local test is only half the story.** Wrangler runs all objects of a
   script on one thread and enforces no Cloudflare limits. The lab is the
   only real answer for 1-4.
8. **The free plan (v2.3.3252).** The lab's first run was refused at its
   deploy: "In order to use Durable Objects with a free plan, you must create
   a namespace using a `new_sqlite_classes` migration" (code 10097). So this
   account, and the game's `brotown-server` with it, is on the Workers FREE
   plan. There, Durable Objects have limits **per day, for the whole account**,
   reset at 00:00 UTC, and past one Cloudflare refuses that kind of work until
   midnight -- the game stops working:
   - **100,000 requests.** A web request, a call or an alarm is one, and so
     are 20 incoming socket messages -- for the BILL. A playing phone sends
     about 10-30 messages a second (the move diet, safe ground and standing
     still keep it near the low end), so one player-hour is about 1,800-5,400
     requests: **about 20-55 player-hours of play a day in all** (*estimate*).
     That is a handful of players for an evening, or 120 players for 10-30
     minutes. Whether the free plan's daily LIMIT counts phone messages 20 to
     one as well was not documented; **measured 2026-10-14 (the lab's limit
     test, run 5): it does** -- 124,999 socket messages took Cloudflare's
     every-message count of the day to 125,271 and nothing was refused, so
     the 20-55 player-hours stand (and the quiet phone, #913, stretches them).
     Measured (the lab's part 4): the game's objects counted
     76,277 on 2026-10-11, an hour of the room awake with a few players, and
     1,983-3,613 on the days round it. Cloudflare counts every hibernation
     socket message among the invocations (socket messages in read 0).
   - **13,000 GB-s awake.** The room is awake while anyone is connected
     (`startTickLoop` / the last leave), at 128 MB: about 29 hours of one room
     a day. Phase 1's doors break this alone -- 9 servers always on are
     about 97,000 GB-s a day.
   - Rows written (100,000 a day) bind later: about 340 a player-hour since
     v2.3.1619 (ARCHITECTURE-HANDOFF).

   **So the paid plan (Workers Paid, $5 a month, then the prices above)
   comes before anything else in this plan, and is the owner's call.** On it
   there are no daily limits: the same play costs about $5-6 a month (the $5
   includes 1 million requests and 400,000 GB-s a month), and more play the
   prices above. The lab's part 4 now reads the game's own last 7 days
   against these limits, and the lab itself is sized to under 3% of a day's
   requests and stops if the day is already near the limit
   (`docs/specs/cloudflare-lab.md`).

## Decided (the owner, 2026-10-13)

> *"Go recommended but I want you to stress test to see what can be optimized"*

1. **The crowd cap: 50.**
   - Each phone draws the nearest 50 players in full, and always:
     - your party;
     - your target;
     - whoever hit you in the last 10 s;
     - your duel.
   - Past 50, **light figures**: one body picture each, with no gear, name,
     shadow or effects, IF the stress test shows them cheap enough.
     Otherwise they are hidden, and the minimap's dots still show them.
   - `?crowd=K` tries another number on a phone.
2. **The Cloudflare lab: yes**, after Phase 0.
   - *v2.3.3247, built.* Actions tab, then "Cloudflare lab", then "Run
     workflow" (`.github/workflows/lab.yml`, `tools/lab/`). It answers risks
     1-3 with a tiny worker of its own, then deletes it; about a cent a run
     (`docs/specs/cloudflare-lab.md`).
3. **The order:** Phase 0, then the lab, then Phase 1.
4. **Stress tests first**, to find what can be optimized: the server well
   past its cap, and a phone in big crowds. Each optimization they find is
   measured before and after; the results go in `docs/specs/stress-tests.md`
   as they come.

The questions as they were put:

1. **The crowd cap:** how many players a phone draws in full, and what is
   shown past that: nothing, simple figures, or only minimap dots. I can build
   a setting you can try on your own phone.
2. **A Cloudflare lab, for Phase 1's gate:**
   - a separate Worker ("brotown-lab"), deployed by a workflow you start by
     hand from GitHub's Actions tab;
   - driven by the load test's bots from GitHub's machines for about ten
     minutes, then taken down;
   - it never touches the live room or anyone's saves;
   - it costs cents a run.

   It answers the shared-processor question, the billing question and the
   delay between servers, before anything is built on them.
3. **The order:** Phase 0 first (0a and 0b help even at 120), then the lab,
   then Phase 1.

## How to re-run

- **The world-alone table:**
  1. Copy `server/src/` and `tools/qa/load/load-wheel.mjs` side by side, as in
     the repo.
  2. In the copy of tick.js, just before the per-session send loop
     (`for (const [ws, s] of this.sessions)`), build when
     `globalThis.__WORLD_ONLY` is set:
     - `'{"p":' + JSON.stringify(<the Wheel's dirty players as [id, playerWire(ps)]>)`
     - `+ ',"m":' + zoneListJson('wheel', <its dirty monsters>)`
     - `+ ',"e":' + JSON.stringify(events) + '}'`

     Send it 8 times to that object, and loop over no sessions.
  3. Set `globalThis.__WORLD_ONLY = { send() {} }` in load-wheel and run
     `node tools/qa/load/load-wheel.mjs 150,300,600,1000`.

  It is not shipped: anything under `server/` redeploys the live worker.
- **The per-phone buckets:**
  - `node --cpu-prof --cpu-prof-dir=<dir> tools/qa/load/load-wheel.mjs 600`;
  - then sum the self time under `_handleMove` / `_handleMonsterDamage` /
    `webSocketMessage` (taking in), the `_tick*` world systems (world),
    `_wheelInterest` / `_steady*` / tick.js's builders (per phone);
  - count only samples under load-wheel's `run`, as the joins happen before.
- **The phone:** `BT_NO_TRACE=1 node tools/qa/mp/run.mjs crowdbots`.
  - `BT_CROWD_STEPS=0,50,110` picks the steps.
  - `BT_CROWD_PROFILE=<dir>` saves a CPU profile of the page at each step.
  - Without `BT_NO_TRACE=1`, wrangler's own tracing stops the local room
    letting bots in at about 95 (TRAPS §168).
- **Messages between two servers:** `node tools/qa/load/dobench/drive.mjs`.
  - It is a two-class worker: one call or one socket message at a time,
    against a phone's socket, run locally with tracing off;
  - per message, at about 100 B / 2 KB / 40 KB:

    | | about 100 B | 2 KB | 40 KB |
    |---|---|---|---|
    | a call | 54-66 µs | 44-118 µs | 62-104 µs |
    | a socket message between the two | 13-16 µs | 18 µs | 64-196 µs |
    | a phone's message, compressed | 15-18 µs | 35 µs | 330 µs |

    Local, one thread for both servers, so read it as relative.
- **Cloudflare's facts:** the pricing, limits, Rules of Durable Objects and
  data-location pages on developers.cloudflare.com, read 2026-10-13 from
  their public source.
  - Requests are $0.15 a million.
  - Duration is $12.50 a million GB-s, at 128 MB each.
  - WebSocket messages in count 20 to a request; messages out are free.
  - Each call is one request.
  - Up to 32,768 sockets per object.
  - A soft limit of about 1,000 requests a second per object.
  - Same-class objects may share an isolate and its 128 MB.
