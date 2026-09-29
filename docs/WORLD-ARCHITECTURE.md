# The world, long-run: the architecture to grow into (v2.3.2934)

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

- one seamless island, plus separate places behind doors (dungeons, farms,
  interiors);
- everything that stands up is an object, and water is drawn by code;
- many rooms, with characters that move between them and one shared auction
  house;
- iPhone Safari first, on Cloudflare Workers and Durable Objects;
- art made with ChatGPT in one consistent look (chosen by
  [STYLE-TEST.md](STYLE-TEST.md)), with effects done in code.

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

- **Every place is a map.** The island is one. Each dungeon, farm and
  interior is another. Everything has a position `(map, x, y)`.
- **"Zone" goes away; "region" becomes a lookup.** Which region is at
  `(x, y)` is read from a region map the plan bakes. Music, monster sets,
  level bands, banners and quests all ask it.
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
- **The room cap stays a receiver number** (`MAX_PLAYERS` 60). More players
  means more rooms.

---

## 4. Many rooms, and the services they share

```
   players ─►  Room 1      Room 2      Room 3   ◄─ players      (live state)
                 │  │        │  │        │  │
                 ▼  ▼        ▼  ▼        ▼  ▼
   ┌───────────────────────────────────────────────────────────┐
   │ character vaults (one per player)   market   social       │  (owned state)
   │ directory (which rooms, how full)   leaderboard (exists)  │
   └───────────────────────────────────────────────────────────┘
```

- **The character vault**, one Durable Object per player id, is the
  character's home.
  - A room borrows the character with a **lease**, one room at a time, and
    writes saves back.
  - If a room crashes, the lease runs out and the player can join elsewhere.
  - Mail lives in the vault, so it reaches you in any room.
- **The market**, one for the whole world, holds listings, the order book and
  escrow. It settles by mail.
- **Social** holds friends, clans, chat between rooms, and presence ("which
  room is my friend in").
- **The directory** lists the rooms and how full they are. It is what makes
  "join a friend" work. Players choose; nobody is split silently (the
  v2.3.1112 lesson).
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

**Easy to change later:**

- monster density and spawn rates;
- the number of rooms;
- any single picture, NPC or building;
- effects, UI and prices.

---

## 10. Build order

Each step ships on its own and can be tried on the pull request's preview:

1. **The style test**, then the look, then the style key.
2. **The pipeline and the object catalog.** Art can start, and the ground
   approach (World Bible §13) is settled.
3. **Maps, not zones:** region from position, and doors. The trial island is
   the test content.
4. **Cells and interest on the server**, plus server-side walls and message
   caps.
5. **Streaming objects**, the effects layer and the foreground layer.
6. **The character vault and its lease**, with mail moved into the vault.
   Before launch.
7. **The shared market service.**
8. **Rooms:** the directory and "join a friend".
9. **Filling the world:** regions, points of interest, monsters by region.
10. **Climbing and jumping**, from the plan's terrain.

**Why this order:**

- Art cannot start until steps 1–2 are done.
- Steps 3–5 turn the trial into the real world.
- Steps 6–8 are only needed once one room fills, but they are easiest before
  launch.
- Climbing and jumping need the real map.
