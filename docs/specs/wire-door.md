# The wire door (v2.3.5184)

Grand plan step 4.1, step 3; card K (`docs/plan/cards/K.md`, PR 4).
The worker's one check before any handler, made from the wire table.

## What it does

`server/src/wire/door.js` checks every message a phone sends and every web
request to the room's routes, before any handler reads it. It refuses only
what no page of the game sends:

| Why | What it refuses |
|---|---|
| `key` | a key named `__proto__`, `constructor` or `prototype`, at any depth of the message or the body, or as a query's name |
| `body` | a `payload`, or a route's JSON body, that is not a plain object |
| `number` | a number that is not finite, in a field the row's `trust` names (it arrives as `1e999`; a page's JSON never writes one, as JSON.stringify writes null) |
| `words` | a `words` field (trust) that is not a string, or longer than `WIRE_DOOR.WORDS_MAX` (2,000, above every handler's own clamp: chat 200, feedback 500, names 16 to 64) |
| `reqId` | a `reqId` outside SHAPES part 2's form: 1 to 64 of `A-Z a-z 0-9 _ -`. The action door's maker (`src/game/actions.js`) makes no other |

Everything else passes untouched:

- **A field the row does not name.** An older or a newer phone's extra field
  is not a fault.
- **`null`.** A page's NaN arrives as null, and its handler judges it, as
  before.

## Where it stands

- **The router**: `index.js` `_onMessage`, for every frame and every part of
  a bundle. It runs after the join gate and before the AFK clock, the ride,
  the value pause and the fight lock read the message. A refused frame is
  dropped silently: `refusal-door-list.mjs` code `door`. Only a script sends
  one, and an answer would help it probe.
- **The room's routes**: GameRoom `fetch`, just after the live flags load
  (v2.3.4376) and before the first route. It covers the market, the store,
  the arena, the account, botstat and admin. A refused request is answered
  `400 { ok: false, error: 'bad request' }`. The body is read from a clone,
  so the route reads its own as before.
- **Not behind it**:
  - the feedback routes and the leaderboard. They are their own objects,
    with no live flags to turn a door off. The leaderboard is GET only (its
    POST already answers 405). No route of theirs is in the hostile census.
  - the socket's upgrade. Its frames are judged by the router's door.

The card put the routes' check in `routeHttp`. That function runs in the
stateless worker, where the live flags cannot be read, so the door could not
sit behind its switch there. It sits in the room's `fetch`, where they are
read (asked of the planning session, 2026-11-14).

## What the rows are

The wire table's `trust` column (`server/src/wire/`), made by `lists.js`
into `WIRE_DOOR_ROWS`:

- `SOCKET`: a message by its type (every `in` and `relay` row). A relayed
  event is no exception: the page's shim sends it as `{ type: <event> }`
  (wsClient.js), never `type: 'broadcast'`; a frame typed `broadcast` (only
  a script sends one) reaches no handler (`wire-door.test` §7, v2.3.5542);
- `ROUTES`: a route by `http:<path> <METHOD>`, else `http:<path>`.

A field's path reads `a.b` and `a[].b`. On a socket message it is read both
in `payload` and at the message's top, because the phone's way differs by
type (SHAPES part 5's `body`). A type or a route with no row gets the
checks that need no row (`key`, `body`, `reqId`).

A row added to the table, or a field's trust changed, reaches the door with
no other edit (`wire-door.test` §4).

## The chat lanes (v2.3.5542)

`lists.js` makes **`CHAT_LANE_TYPES`** (v2.3.5543: renamed from `CHAT_LANES`, a name chatlanes.js already exports), the socket rows whose `text` is a `words`
field (a line another player reads: `chat`, `party_chat`, `area_chat`,
`whisper`, `friend_dm`, `store_dm`), for a check on what a player says (card
MOD's silence, its own step after the door). Not the table's `speaks`, which
also holds `join`, `track`, `dice`, the trades, the invites and `emote`.

## Counted

Every refusal is counted:

- on the socket: `session.wireDoor`;
- in the room: `_wireDoorCounts`, by the table's row and the why. A type or
  a path that no row names counts as `(no row)` (`http:(no row)` on the web
  side), never by its own name, so the keys stay at most the table's rows
  times the five whys: a flood of random types grows nothing (the
  gatekeeper's review, sitting 15: keyed by the name that came, 432,000
  frames an hour grew the room by 59 MB; `wire-door.test` 2b).

The first 20 of a worker's life are logged, with what came:
`[wiredoor] refused <type or path>: <why> <field>`. A page that meets the door is
seen at once.

**Honest play counts nothing.** Card K's PR 4 ran two kinds of honest play
with the door on, 2026-11-14, and the door refused nothing in either:

- `questline` (the `playable` phone scenario: a real worker and Chromium):
  187 of 187, and no `[wiredoor]` line in the worker's log. A probe frame
  with a `__proto__` key, sent to the same kind of local worker, does log.
- the bot lab (`tools/qa/load/bot-lab.mjs`, 60 minutes of game time a
  scenario: honest, edge and lying scripts, every one sending only messages
  the real game sends): no `[wiredoor]` line.

## What a refusal costs

A refused frame or route reads and writes nothing in storage. The door reads
only the message, or a clone of the request's body. For the routes, the live
flags' load before it was already there (v2.3.4376: one storage read a
worker's life, before any route). A refused route answers sooner than its
route would have. A refused frame stops before any handler, so it costs
less than the same frame did before. The count is in memory only.

## A body's size (v2.3.5720, card K2 PR 1)

The second red team's CRITICAL 1: the routes' door read every body whole
(`request.clone().text()`) and parsed it before any route asked who sends,
and nothing above it limited a body. A 24 MB POST with no key held the
room's thread 2.8 to 4.5 s and several hundred MB.

- **The cap**: 32 KB a body (`BODY_CAP.BYTES`, `wire/door.js`); a crash
  report 64 KB (`BODY_CAP.ROUTES`: sixteen log lines of 500 characters, about
  10 KB in ASCII, some 49 KB at the very worst). Measured over every route a
  page, the Test panel or a scenario posts: the largest honest bodies are a
  market order (191 bytes), a store listing (150), a feedback post (500
  characters, about 1.6 KB) and the Test panel's levers (about 120).
- **The outer router** (`index.js` `routeHttp`, `bodyCapRoute`), before any
  forward: a declared length past the route's cap is a 413, unread; a body
  with no length is read through the cap and goes on as the bytes read.
- **The room's door** (`_wireDoorHttp`): the same cap, a declared length
  first, then a read that stops past it (`readBodyCapped`); a refusal is a
  413 counted as `<row> size`. Before the door's own switch, so `wiredoor:
  false` keeps the cap.
- **The reader** `readBodyCapped(request, cap)` is exported for the Feedback
  object's own reads (card SEC: `feedback.js`).
- **The switches**: `bodycap: false` in the live flags and the room's door
  reads a body whole again; the outer router has no live flags (they are the
  room's storage), so its lever is the worker's setting `BODY_CAP = "off"`
  (as `ORIGIN_LOCK`). `bodycap.test` holds both.

## The owner's routes and the public reads at the edge (v2.3.5726, card K2 PR 7)

The planning session's addendum to card K2 (item 7) and its answer on the
edge cache, 2026-11-17. Both in the outer router (`index.js` `routeHttp`,
`wire/door.js`), before any object is asked:

- **The owner's routes with no key** (`edgeKeyRefusal`): `/api/admin*` with
  no `Authorization: Bearer <key>` gets the room's own answer (404 `Not
  found` with no ADMIN_KEY set, else 401 `Unauthorized`); `/api/botstat*`
  with neither `Authorization: Bearer` nor `x-admin-key` gets its plain 404.
  A request with a header goes on, so the room still judges a wrong key and
  counts it toward its time-out. A room the worker does not make is still
  `no such room` first.
- **The public reads from the edge's cache** (`edgeCacheRead`): the
  market's book (`/api/market/orders`) and a player's list (`/my`), the
  store's browse and the arena's status, kept in `caches.default` for 3 s by
  the whole URL, but only for a request whose Origin is not one of the
  game's sites (`origin.js` `originAllowed`: `site` or `local`). The page
  always sends its Origin, so it always reads through the room, whose
  copies drop on any write (`publicreads.js`): nothing a player sees
  changes. A read carrying a key, a read not on the list, or an answer that
  is not a 200 is never kept. Nothing in `wrangler.toml`.
- **The levers** are the worker's settings, read like `ORIGIN_LOCK` (absent
  means on): `EDGE_GUARD = "off"` sends the owner's routes on;
  `EDGE_CACHE = "off"` sends every read on. `edge-guard.test`: 15 FAIL on
  main.

## A field's form (v2.3.6443, card DG PR 4)

The review (`docs/plan/census/shape-doors.md`, `tools/dev/plants/judge.mjs`)
found the door let `bank_deposit` in with `n` as `"5"`, `-5`, `1.5`, `true`,
`{}`, `[1,2]` and an `id` of 15,000 characters. Now, once a frame has
passed every check above, each named field is held to its form
(`door.js` `WIRE_FORM`, `formWhy`): its row's, in the table's `form` column
(`server/src/wire/README.md`), or its trust's default (a `request` field's
string at most 8,192 characters, half a frame). A frame the old door
refused is refused for the same why; `form <field>` is only ever the last
why. The rows with a form: the bank's two moves (`kind`, `id`, `n`, `opId`),
the gamble's `wager`, the Ace Flip's `stake`, the jackpot's `amount`,
`player_attack`'s `dmgBase` and `critChance`, `move`'s `dead` and
`trade2_cancel`'s `id` (those last four newly named in `trust`: they were
read but not in the table). Each was written only after reading the page's
sender (`game/bank.js bankMove` and the rest).

THE SWITCH, `wireform` (`liveops.js` `_wireFormMode`; its row in the switch
table, `needs: ['wiredoor']`): absent, a frame out of form is refused like
any other, counted as `<type> form` and by its field in `_wireFormSeen`;
`'count'`, counted and logged (`[wireform] would refuse`) and let in;
`false`, no form read: the door of v2.3.5184. The cap is `wireForm` (1
refusing, 2 counting). The counts are on the owner's overview
(`GET /api/admin/overview`, `wireDoor`: memory only, since the worker woke).

THE COUNT: `server/test/wire-form-count.mjs`, a preload, opens every room
of a run in count mode and writes what it would refuse by test file, type
and field (its header says how to run it). The bank's own checks stay the
second line: `bank.test` §4 holds them with the forms thrown.

## The switch

`wiredoor: false` in the live flags (`liveops.js` `_wireDoorOff`; its row in
the switch table). With it thrown, the door checks nothing and counts
nothing: every message and request reaches its handler, today's way, byte
for byte. Two suites run with it thrown (the plan's rule 4):

- `wire-door.test` §6;
- `wire-hostile.test` with `WIRE_HOSTILE_DOOR=off`, whose count is 19
  again.

## The hostile census

`docs/plan/census/hostile.md` fell from 19 to 1 with this PR:

- **`move`'s 16 cases**: the door drops the keys. `movement.js` kept `vx`,
  `vy`, `d`, `f`, `eqc`, `eql`, `eqs` and `ex` as sent, so an object with
  an own `__proto__` stayed on the record and rode the tick.
- **`chat_mute`'s 2 cases**: `chatmod.js` now answers a mute of
  `__proto__`, `constructor` or `prototype` with the list unchanged. Such a
  name names no player, and as a key of the list it was stored as an own key
  of the record. It rides the same switch.
- **Left: `character_reset`'s 1.** That is card R's honest restart
  (`worldsum.js`), not a handler's fault.

A frame the door drops is a silent exit by design, as the size gate's is
(`wire-hostile.test` §4).

## What holds it

`server/test/wire-door.test.mjs`:

1. the socket's judge: each refusal, and what passes;
2. the room: a refused frame reaches no handler and is counted, and only a
   bundle's bad part is refused;
3. the routes: answered 400 and counted; a good request goes on;
4. made from the table;
5. the action door's request ids pass;
6. the switch thrown.

Its break proofs are in its header.
