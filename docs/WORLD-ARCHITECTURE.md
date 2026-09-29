# The world, long-run: the architecture to grow into (v2.3.2934–2936)

> Owner, 2026-09-29: *"Also consider long run considerations and what works
> best architecturally for the direction I'm going in."*

**Status:** a target, not a description. It sets out the shape the game
should grow into for the direction the owner has chosen, and the order to
build it. Two other documents still govern:

- **Today's code:** the server rules in
  [ARCHITECTURE-HANDOFF.md](ARCHITECTURE-HANDOFF.md). Where this document
  describes something different, it is where the code is going, not where it
  is.
- **The world's content:** [WORLD-BIBLE.md](WORLD-BIBLE.md) and
  [WORLD-MAP-PIPELINE.md](WORLD-MAP-PIPELINE.md).

**The direction, as decided so far:**

- one seamless island shaped as **the Wheel** (v2.3.2936): a spoke of land
  per element, levels 1–80 along each, and the Dark and Light realms
  (80–100) behind gates at the tips
  ([WORLD-BIBLE.md §3](WORLD-BIBLE.md#3-the-wheel-a-spoke-of-land-for-every-element)),
  plus separate places behind doors (the realms, dungeons, farms,
  interiors);
- everything that stands up is an object, and water is drawn by code;
- many worlds, with characters that move between them and one shared
  auction house;
- iPhone Safari first, on Cloudflare Workers and Durable Objects;
- art made with ChatGPT in **HD pixel art**, kept at 2 px per game px, the
  phone's own sharpness (v2.3.2935; a 1.5 game px grid until v2.3.2942,
  [WORLD-BIBLE.md §6](WORLD-BIBLE.md#6-one-look-for-everything-brotown-hd-pixel-art)),
  with effects done in code.

---

## 1. One rule: every piece of state has exactly one home

A game like this has three kinds of state:

| Kind | Examples | Its home | Why there |
|---|---|---|---|
| **Content** | the map, object pictures and positions, items, monsters, quests | data files made by tools, served as static files by Cloudflare Pages | the same for everyone, versioned, free to serve |
| **Live** | where everyone is, monsters, fights, loot on the ground | a room, in memory | fast; losing it costs seconds, not progress |
| **Owned** | a character, bag, coins and mail; the market; clans | a store per owner, outside every room | must outlive any room, and be shared by all of them |

**Most of the worst bugs in online games are one piece of state with two
homes.** Coins held both in a room and in a vault can be spent twice. So each
piece has one home, and anything else *borrows* it and hands it back.

---

## 2. The world: maps, not zones

- **Every place is a map.** The island is one. Each realm, dungeon, farm and
  interior is another. Everything has a position `(map, x, y)`.
- **"Zone" goes away; region and level become lookups.** Which spoke is at
  `(x, y)`, and which **tier** (five levels a tier, 1–16), is read from the
  maps the plan bakes: the World Builder's blueprint already stores both
  for every cell (`public/tools/world/core/layout.js`, v2.3.2936). Music,
  monster sets and levels, banners and quests all ask them.
- **Doors link places.** A door joins `(map, x, y)` to `(map, x, y)`, and it
  is the only kind of loading screen left.
- **The client and the server read the same map files**, generated from the
  plan: the walk mask, the footprints of blocking objects, spawn areas, doors
  and points of interest. There is one source of truth, and the server gets
  its copy with each deploy (the island's walk mask is about 21 KB).
- **Maps carry a version.** On join, a saved position that is no longer
  walkable (a new wall, a moved river) moves the player to the nearest safe
  spot.

**Where the code is today:** nearly every system keys on `S.currentZone`
(client) or the zone id (server). The move is made one system at a time.
While few people play, a clean cut-over is allowed rather than running the
old and new ways side by side.

---

## 3. The room: cells and interest

- **A room runs one copy of the island**, and its instances, as dungeons are
  run today.
- **The island is cut into cells** of 1024 × 1024 game px, about one screen
  height. A player receives what is in the 3 × 3 cells round them: players,
  monsters, loot and events.
- **Monsters only run in cells near players.** Zones already work this way
  (`_activeZones`).
- **Nearby players update at full rate; players further off update less
  often.** That keeps each phone's download flat however crowded the island
  gets. Download is the real limit today: about 4 KB/s per moving player near
  you.
- **The server knows the walls.** Every move is checked against the walk mask
  and blocking objects, not only against speed (today: speed only).
- **Every message type has a rate cap.** `move` has none today. With
  Cloudflare billing for incoming messages, a tampered client flooding moves
  would cost money as well as fairness.
- **The room cap is set by messages, not by the tick** (§11). Today's
  `MAX_PLAYERS` 60 is a receiver number (what one phone can hear); what one
  room can *take in* is lower than it looks, and splitting a world into area
  servers is how it grows.

---

## 4. Many worlds, and the services they share

A **world** is one copy of the Wheel. Early on it is one room; grown up it is
**eleven area servers** (Brotown and its commons, the eight spokes and the
two realms, §11). Either way the diagram is the same:

```
   players ─►  World 1     World 2     World 3  ◄─ players      (live state)
                 │  │        │  │        │  │
                 ▼  ▼        ▼  ▼        ▼  ▼
   ┌───────────────────────────────────────────────────────────┐
   │ character vaults (one per player)   market   social       │  (owned state)
   │ directory (which worlds, how full)  leaderboard (exists)  │
   └───────────────────────────────────────────────────────────┘
```

- **The character vault**, one Durable Object per player id, is the
  character's home.
  - A room borrows the character with a **lease**, one room at a time, and
    writes saves back. Walking from one area server to the next hands the
    lease across.
  - If a room crashes, the lease runs out and the player can join elsewhere.
  - Mail lives in the vault, so it reaches you in any room.
- **The market**, one for the whole world, holds listings, the order book and
  escrow. It settles by mail.
- **Social** holds friends, clans, chat between rooms, and presence ("which
  room is my friend in").
- **The directory** lists the worlds and how full they are. It is what makes
  "join a friend" work. Players choose; nobody is split silently (the
  v2.3.1112 lesson). New players go to the fullest world that has room, so
  worlds fill before a new one opens.
- **Every hand-off between two of these follows one pattern:**
  - commit locally first (an outbox record);
  - then send, with an `opId`;
  - the receiver applies each `opId` once (`oplog:`);
  - anything owed to a player is delivered to their mailbox.

  This is ARCHITECTURE-HANDOFF rule 9 (never wait on another service between
  checking and committing), plus the existing `opId`, `oplog:` and inbox
  machinery. It is used between services instead of only inside one room.

---

## 5. The client: a streaming renderer

- **Pieces stream by distance.** Ground pieces and object sheets load as you
  approach and are freed behind you. `chunkGround.js` is the first piece. The
  ZONE-ASSET rule in CLAUDE.md applies per area instead of per zone.
- **The ground is composed on the phone from swatches** (v2.3.2937): the
  download is the ~48 swatch tiles, whatever the size of the map.
  `public/tools/world/core/ground.js` already composes it, deterministic and
  seamless between chunks composed apart; the Ground Studio previews with it.
- **Layers, bottom to top:**
  1. ground;
  2. ground details;
  3. water (code);
  4. objects and characters, sorted by where they meet the ground;
  5. foreground: canopies and arches, the layer the renderer lacks today
     (DEPTH-ROADMAP item 5);
  6. effects: weather and light;
  7. UI.
- **Every area has a measured memory budget** (`window.__btTex`). iPhone Safari
  kills the tab at about 250 MB of pictures, and the game uses 165–185 MB
  today.
- **A region's art loads while you cross border land**, so meeting its
  monsters never hitches. This is the preloading law, applied by area.
- **Prediction stays on the client and truth on the server**, as today.

---

## 6. The art pipeline: consistency by machine

- **Every picture goes through one pipeline before the game sees it:**
  - the background removed;
  - trimmed;
  - for pixel art, snapped to the grid and one palette;
  - packed into sheets per region, and compressed;
  - its footprint, shadow and anchor written into a catalog.
- **The settings live in one config:** pixel size, palette, scale and density.
  They are the settings the style test picks.
- **An object catalog (JSON)** says what each object is: its picture, size,
  footprint, what it does (chop, mine, open, block), and its variants.
- **The pipeline is also the budget check.** It measures each region's
  decoded memory and fails if the region is over.
- **A later change of look is partly a re-run.** A new palette or pixel size
  re-processes every picture; a whole new look needs new pictures.
- `public/tools/style/process.js` is its first version: keying, splitting
  sheets, snapping, one shared palette.

---

## 7. Effects: code, not art

- **What the code draws:** night and lights, weather, water surfaces,
  shadows, sway, hit reactions and seasons, set per region.
- **Pictures are drawn flat-lit**, with soft, even daylight and no strong
  baked shadows, so the code can light them. This is what makes code-drawn
  effects work in any look.
- **For pixel art, effects are drawn on the art's grid and in its palette**,
  with the effects' own colours reserved in that palette. The Style Lab does
  exactly this.
- **Effects stay cheap on the phone:** small buffers scaled up, as the lab's
  night and water are, and the GPU doing whatever it can.

---

## 8. Saves, items and the economy, long-run

- **Item ids are forever.** Retire an item; never delete or reuse its id.
- **Every value move has an `opId` and a log.** This is already the rule.
- **One shared economy needs sinks.** With one economy across all rooms,
  prices only rise without fees, repairs and consumables. That is a design
  job, not code.
- **Backups:** vaults are exported regularly, and a restore is actually
  tested.
- **Characters move out of the room before launch** (§4), while it is easy.

---

## 9. Decisions that are hard to undo, and ones that are not

**Hard to undo: decide once, soon.**

- maps-not-zones and the coordinate system;
- where characters live (the vault) and the lease;
- item ids;
- the piece, catalog and pipeline formats;
- the look, and for pixel art the pixel size. Every picture is made for it.
  (Decided: HD pixel art, v2.3.2935; kept at 2 px per game px since
  v2.3.2942.)
- the Wheel's shape and its levels per tier: quests, monsters and drops are
  all placed against it. (Decided v2.3.2936.)

**Easy to change later:**

- monster density and spawn rates;
- the number of worlds, and how each is split into areas;
- any single picture, NPC or building;
- effects, UI and prices.

---

## 10. Build order

Each step ships on its own and can be tried on the pull request's preview:

1. **The style test**, then the look, then the style key. *(The look is
   decided, v2.3.2935; the key is next.)*
2. **The pipeline and the object catalog.** Art can start. The ground is
   made from swatches (World Bible §13).
3. **Maps, not zones:** region and level from position, and doors. The
   Wheel (v2.3.2936) is the layout.
4. **Cells and interest on the server**, plus server-side walls, message
   caps, **the message diet, and a bot load test** (§11).
5. **Streaming objects**, the effects layer and the foreground layer.
6. **The character vault and its lease**, with mail moved into the vault.
   Before launch.
7. **The shared market service.**
8. **Worlds:** the directory and "join a friend", then each world split into
   its **area servers** (§11).
9. **Filling the world:** each spoke's monsters by tier, points of interest,
   the passes' two-element monsters, then the realms.
10. **Climbing and jumping**, from the plan's terrain.

**Why this order:**

- Art cannot start until steps 1–2 are done.
- Steps 3–5 turn the trial into the real world.
- The load test in step 4 comes early because today's room cap may already
  be above what one room can take in (§11).
- Steps 6–8 are only needed once one world fills, but they are easiest
  before launch.
- Climbing and jumping need the real map.

---

## 11. What it costs, and how many one world holds

> Owner, 2026-09-29: *"From a cost perspective is 200 per room or more
> feasible? I'm just thinking there could be thousands of rooms if this
> becomes popular and I'm not sure that's the best option."*

### What Cloudflare charges for (Durable Objects, paid plan)

From Cloudflare's own pricing and limits pages
([pricing](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/durable-objects/platform/pricing.mdx),
[limits](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/durable-objects/platform/limits.mdx),
[message throughput](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/durable-objects/best-practices/rules-of-durable-objects.mdx)),
read 2026-09-29:

| What | Price | Included each month |
|---|---|---|
| Requests | $0.15 per million | 1 million |
| Messages from players (WebSocket) | 20 incoming messages count as one request | |
| Messages to players | free | |
| Time a room is running | $12.50 per million GB-seconds, at 128 MB per room | 400,000 GB-s |
| Saves (SQLite rows written) | $1.00 per million | 50 million |
| Loads (rows read) | $0.001 per million | |
| Stored data | $0.20 per GB-month | |
| Number of rooms | unlimited | |

A room with a running game tick (a live `setInterval`) cannot hibernate, so a
busy room pays for all the time it is up. An empty room stops its tick
(`webSocketClose` in `server/src/index.js`) and costs nothing.

### What BroTown costs: about 0.1 cent per player-hour

| Part | Per player-hour | How |
|---|---|---|
| Messages in | $0.0004–0.0008 | a moving phone sends 15–30 a second: 54,000–108,000 an hour, billed as 2,700–5,400 requests |
| Saves | about $0.0004 | about 340–450 rows written an hour |
| Room time | about $0.0001 | half a cent an hour per busy room, shared by everyone in it |
| **Total** | **about $0.001** | |

| Players | Cost |
|---|---|
| one playing an hour a day | 3–4 cents a month |
| 1,000 online round the clock | $360–720 a month |
| 10,000 online round the clock | $3,600–7,200 a month |

**Cost follows players, not rooms.** Room size barely changes these numbers:
bigger rooms save only the room-time line, about 5%. What does waste money is
many nearly empty rooms, each paying its half-cent an hour. So **fill worlds
before opening new ones** (the directory, §4). "Thousands of rooms" would
mean hundreds of thousands of players online at once.

### What limits a room: messages in

Cloudflare's guidance is that one Durable Object handles about **500–1,000
requests a second**. Their own example is a game with 50,000 players sending
10 updates a second, which needs 500–1,000 objects.

- **Today** each moving phone sends 15–30 positions a second (every 33 ms
  when another player can see you, every 66 ms alone). So one room tops out
  around **30–60 busy players**.
- **Today's cap of 60 may already be above that** at the full send rate. A
  bot load test (build order, step 4) should settle it before any launch
  push.
- **200 in one room will not work** as the game stands. The processor is not
  the limit: 60 players cost 0.16 ms of each 22 ms tick
  (`docs/specs/room-full.md`). Taking the messages in is.

### The fix: fewer messages, and a world of area servers

1. **The message diet.** Phones send their position about **5 times a
   second, with direction and speed**, and the server and the other phones
   fill in between. That is about 5 × fewer messages in, and roughly halves
   the bill, because messages are its biggest line.
   - **The server must fill in, not wait.** v2.3.1635 tried a plain 5 Hz
     while alone, and chasing monsters rubber-banded: they chase the
     server's copy of you, which then moved in 40 px jumps. v2.3.1767 put
     the floor back to 15 Hz. With direction and speed, the server moves
     your copy between messages, and monsters chase that.
2. **Area servers.** Each world is split along the Wheel: **Brotown and its
   commons, each of the eight spokes, and the two realms: 11 servers per
   world.**
   - Each comfortably holds about 100 players, so **one world holds 1,000 or
     more**.
   - Players cross from one to the next at the town gates and on the
     passes: natural chokepoints, far apart, and few. The phone opens the
     next area's connection while you cross, and your character's lease
     (§4) moves with you, so there is no loading screen.
   - The Wheel's shape is what makes this easy. A round island would need
     borders cutting across open land.
3. **A handful of big worlds**, not thousands of small rooms: about 10
   worlds for 10,000 players online. Each feels busy, and the market, chat
   and guilds span all of them (§4).

**The order:** distance-based updates and the message diet first (needed
anyway, and they cut the bill); the Wheel's area borders at the gates and
passes; one world until it fills, then a second.

### What it costs at 100 to 100,000 players, and the supporter pass (v2.3.2938)

> Owner, 2026-09-29: *"Let's say the game scales to 100, 500, 1000, 10,000,
> 20,000 or 100,000 players … I understand the most likely outcome is barely
> any players (less than 20). But I'd like to know. My cost model would be
> free players capped at let's say 2 hours a day then usage goes to a $2 a
> month supporter pass where they can play as long as they want."*

**The business model (the owner's intent; not built yet):** free play up to
2 hours a day, and a $2-a-month supporter pass for unlimited play. The server
counts the hours, per character (§1): the phone cannot be trusted with it.

**The assumptions.**

- **"Players"** means people who play at least once in a month.
- **How long each plays** is the big unknown, so the table gives a range:
  - **typical:** 15 hours a month each (about 30 minutes a day, averaged over
    everyone: many play a little, a few a lot). Most mobile games see less,
    nearer 5;
  - **keen:** 40 hours a month each (about 80 minutes a day);
  - the free cap stops a free player at 60 hours a month.
- **The busiest hour** has about 2.5 times the day's average online, for
  players mostly in one part of the world.
- **The game as planned**, with the message diet and area servers above. Per
  player-hour that is about $0.00016 of messages in (about 6 a second) and
  $0.0004 of saves (about 400 rows), plus the time rooms run. Today's game
  costs about $0.001 (its messages alone are $0.0006).
- **Cloudflare's included usage** is counted (the $5 a month buys 1 million
  requests, 400,000 GB-s and 50 million rows written), and so is its
  rounding: usage past it is billed in whole millions.

| Players a month | Online at the busiest hour | Monthly bill (typical – keen) |
|---|---|---|
| 20 | 1–3 | $5 |
| 100 | 5–15 | $5–20 |
| 500 | 25–70 | $20–35 |
| 1,000 | 50–140 | $30–50 |
| 10,000 | 500–1,400 | $90–270 |
| 20,000 | 1,000–2,800 | $210–540 |
| 100,000 | 5,000–14,000 | $1,100–2,800 |

- **If every player used the full free 2 hours every day,** the bill would be
  about 1.5 times the keen figure: $4,300 at 100,000 players.
- **Per player per month:** about 1 cent typical, 3 cents keen, and 4 cents
  at the cap. A supporter playing 4 hours a day costs about 8 cents.
- **Today's game holds 60 at once** (one room): enough for about 500–1,000
  monthly players. Past that, the area servers and more worlds are not
  optional.
- **Under about 1,000 players,** the $5 minimum and room time are most of the
  bill. A quiet world can run as one server instead of 11, splitting into
  areas only as it fills, which keeps it near $5–10.

**The supporter pass pays for itself easily.**

- After card fees (Stripe: 2.9% + 30¢), about **$1.64** of each $2 reaches
  the owner.
- One supporter pays for about **40 free players who use the full 2 hours
  every day**, or **around 150 typical ones**.
- **Break-even from 10,000 players up:** about 1 player in 150 buying the
  pass (0.7%) at typical play, and 1 in 60 (1.7%) at keen play. Below 1,000
  players, what needs covering is mostly the $5 minimum: 4 supporters cover
  it.
- For comparison, free-to-play games commonly see about 1–5% of their
  monthly players pay anything.

**Things to know:**

- **The cap is not needed to control costs.** Free play is cheap. The cap's
  only job is to be a reason to buy the pass.
- **Card fees are the biggest cost of a $2 pass.** The fixed 30¢ takes 15% of
  it. A yearly option (say $20) loses about 4% instead.
- **Sales tax and VAT** apply to digital subscriptions in many places. A
  "merchant of record" (Paddle, Lemon Squeezy) collects and files them, for a
  bigger cut: about 5% + 50¢, which is 30% of $2. Decide before launch.
- **Selling on the web** (iPhone Safari) avoids Apple's App Store cut.
- **Keep Cloudflare's per-request logging off for the game room.**
  - Workers Logs is not enabled in `server/wrangler.toml` today.
  - Every message the room takes in is its own `webSocketMessage`
    invocation, so logging each one could add an invocation log per message.
  - At about 30 billion messages a month (100,000 typical players), that is
    $0.60 a million past the first 20 million: many times the rest of the
    bill.
  - Use sampling (`head_sampling_rate`) if logs are ever needed.
- **After the diet, saves are the biggest line:** about two-thirds of a
  player-hour.
  Making the 10-second pool save (`REGEN_SAVE_MS`) cheaper is the next
  saving, when it matters.
