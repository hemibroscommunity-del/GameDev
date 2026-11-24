# The wire table (v2.3.5061; the lists made from it, v2.3.5181 and v2.3.5182)

Grand plan step 4.1, step 1, as code: card N (`docs/plan/cards/N.md`). One
row for every message a phone and the worker trade, and for every HTTP
route. Made from card C's census (`docs/plan/census/wire.md`), its prose
turned into the closed values of `docs/SHAPES.md` part 5. A row says what the
code does today. It is not a design.

**The worker's lists are made from it** (card K, step 4.1, step 2), in one
file, `lists.js`: the one place that reads the rows and makes a list.

| List | Made from | Read by |
|---|---|---|
| `PRIVILEGED_EVENTS` | every `out` row but those marked `privileged: 'echo'` | `index.js` (the relay's default branch drops a phone's copy) |
| `RELAY.TYPES` | every `relay` row | `relay.js` (`_relayAllowed`) |
| `RELAY_ECHOES` | every row marked `privileged: 'echo'`, with its why | `server/test/wire-audit.test.mjs` |
| `FIGHT_LOCK` (its types and switches) | every row whose `fight` is `lock:<switch>` (v2.3.5182) | `fightlock.js` (the refusal's code for each, `FIGHT_LOCK_HOW`, stays there: it is behaviour) |
| `FIGHT_OPEN` | every row whose `fight` is `open:<why>` | `fightlock.js` (the whys a closed list there, `OPEN_WHY`) |
| `ROOM_PLACED` | every `out` row whose `placed` is `{ m, xy, p, who }` | `eventplace.js` |
| `RELAY_PLACED` | every `relay` row whose `placed` is `sender` | `eventplace.js` |
| `MUTABLE_RELAY_TYPES` | every row whose `muted` is `mutable` | `chatmod.js` |
| `SOCIAL.TYPES` | every `relay` row whose `pace` names `social` | `chatguard.js` |
| `WATCH_HOOKS` | every row's `watch` hook, once each | `botsig.js` (each wrapped so a throw is counted; the monster's `_sigOnWindup`, called by the tick, named there) |
| `WIRE_DOOR_ROWS` | every `in`, `relay` and `http` row's `trust` (v2.3.5184) | `door.js` (the wire door: each named field to its form, before any handler) |

So a new message the worker sends is an `out` row and nothing else: it is
privileged with no other edit (deny by default). A new relay is a `relay`
row. A list is never ALSO written by hand: the guard fails a literal beside a
made one. The router's cases and the phone's switches are still the code's
own (the guard holds the rows to them). Card K's PR 2 (v2.3.5182) made the
worker's other lists (`fight`, `placed`, `muted`, `pace`, `watch`) the same
way, and added `flag`, which makes no list (below).

The table ships in the worker now: `index.js` imports `lists.js`, which
imports `out.js` and `relays.js`. Measured with the bundler wrangler uses
(esbuild, no minify), v2.3.5181: the bundle grew from 2,659,358 bytes to
2,747,149 (+88 KB, 3.3%; gzipped 788,716 to 800,369, +12 KB). The rows'
comments ship (wrangler does not minify), but they were index.js's and
relay.js's before: moved, not added. v2.3.5182: `lists.js` imports `in.js`
and `http.js` too, so the whole table ships. Measured the same way on main
1cce0b2: 2,756,115 bytes to 2,893,093 (+137 KB, 5.0%; gzipped 799,858 to
818,822, +19 KB, 2.4%). Most of it is the `in` and `http` rows and their
notes, new to the worker; the few comments moved beside them (fightlock.js's
whys, eventplace.js's fields) were the worker's before.
v2.3.5184 (card K PR 4): the wire door's rows (`WIRE_DOOR_ROWS`: each row's
`trust`, read by `door.js`, the one check before any handler;
`docs/specs/wire-door.md`) come from the same two files. Measured the same
way on main 64bb498: 2,905,338 bytes to 2,913,626 (+8 KB; gzipped 822,108 to
824,453, +2 KB), the door itself.

`tools/guards/wire-table.test.mjs` (card N's PR 3) holds the table to the
code: a key with no row, a row with no key, two rows for one key, a value off
its column's list, a list written by hand beside a made one.

## The files: one a direction

Every file of rows is a leaf: no imports, plain data, so node and the worker
can both read it (`lists.js` is the one file that reads them). The door tests read these files like any other in `server/src/`
(`server/test/src-walk.mjs`), so a field named `type` is written quoted
(`'type': 'request'`): `wire-audit` reads `type: '<name>'` as a message the
worker sends.

| File | Holds | Rows |
|---|---|---|
| `in.js` | `WIRE_IN`: the router's cases (`server/src/index.js` `_onMessage`), phone to worker | 140 |
| `relays.js` | `WIRE_RELAY`: phone to worker to phones, one row for both ways (`RELAY.TYPES` is made from it) | 26 |
| `out.js` | `WIRE_OUT`: every type the worker sends, worker to phone (`PRIVILEGED_EVENTS` is made from it) | 164 |
| `lists.js` | not rows: the lists made from the rows (above). It imports the table; nothing in the table imports it | |
| `http.js` | `WIRE_HTTP`: every HTTP method and path, and each handler's fall-through (`dir: 'in'`) | 107 |
| `columns.js` | `WIRE_COLUMNS`: the closed lists every row is held to | |

437 rows: the census's part 8 (436), and card A's `report` (v2.3.5062: a
message that lands after the census gets its row in the PR that adds it;
the guard fails one with none). Count them by direction:

```
node -e "Promise.all(['in','relays','out','http'].map((f) => import('./server/src/wire/' + f + '.js'))).then((ms) => { const rows = ms.flatMap((m) => Object.values(m)[0]); const by = {}; for (const r of rows) { const k = r.dir + (r.envelope === 'http' ? ' (http)' : ''); by[k] = (by[k] || 0) + 1; } console.log(rows.length, by, 'with a note:', rows.filter((r) => r.note).length); })"
```

which prints `437 { in: 140, relay: 26, out: 164, 'in (http)': 107 } with a
note: 119`: the counts, and how many rows carry a note (below).

## A row

A row's key is its `name` and its `dir`: eight names are both a router case
and a message the worker sends (`whisper`, `party_chat`, `friend_dm`,
`area_chat`, `store_dm`, `bro_nonce`, `nml_lock_ask`, and `clan_war_declare`,
which is on neither list the worker keeps), each with two rows.
Columns in this order; only `note` may be left out.

| Column | Holds |
|---|---|
| `name` | the type; for a route, `http:` and its path (below) |
| `dir` | `in`, `out` or `relay` |
| `at` | the file (from `server/src/`) and function that handle it; no line numbers, they drift |
| `wayIn` | `socket`, `http`, `admin` or `room` |
| `envelope` | how it travels |
| `phase` | what the handler demands of the sender's state, a list |
| `mayStart` | who may start it |
| `doesWhat` | what it does, a list |
| `reqId` | what makes a repeat act once |
| `trust` | `{ field: value }`, one value a field |
| `form` | (optional, v2.3.6443) `{ field: form }`, a field of `trust` held to more than its trust's default |
| `absent` | what a missing field or body means, in words |
| `bad` | what a wrong value gets, a list |
| `answer` | the message that tells the sender what happened |
| `privileged` | a machine's column (v2.3.5181): written only as `echo`, below |
| `fight` | a machine's column (v2.3.5182): `lock:<switch>` or `open:<why>`, on an `in`, `relay` or `http` row |
| `placed` | a machine's column: `{ m, xy, p, who }` on an `out` row, `sender` on a `relay` row |
| `muted` | a machine's column: `mutable` |
| `pace` | a machine's column: a lane, or a list of lanes |
| `watch` | a machine's column: an anti-bot hook's name, on an `in` row |
| `flag` | a machine's column: a live flag's row name, or a list of them, on an `in` row |
| `note` | the census's words, where a row fits no closed value |

The machine-filled columns of SHAPES part 5's second table are each a list in
the code until card K moves it here, in the PR that deletes the literal (a
copy beside the list would be a second definition: the plan's rule 2). Moved
so far: `privileged` (v2.3.5181); `fight`, `placed`, `muted`, `pace`,
`watch` and `flag` (v2.3.5182). `relayed` needs no column: it is every row
of `relays.js`, and what the default branch does on the way is in the row's
`at`. A handler's live flag, pace lane and fight lock are never in `phase`:
they are their own columns.

`rideEnds` (`RIDE_ENDS_ON`, `server/src/ride.js`) waits: `ride.js` is card
SK's file while SK runs, so it moves in a small PR of its own after.

**Not moved, and why** (each stays the one list it is):

- `cap`: `CAP_GATES` and join.js's `caps` are its one list, held by
  precheck `cap-registry`. A column would be a second.
- `roads`: the doors' tables (`GOLD_ROADS`, `BAG_ROADS`, `HP_ROADS`,
  `LEAVE_WAYS`) name each road's `at`. The guard can work out a row's roads
  from them; stored here it would be stored twice.
- `silent`: `server/test/refusal-door-list.mjs`, a test's list of the
  refusals that send no answer. It belongs to the test that holds it.
- `rejoin`: `REJOIN_SLOTS` (`src/game/rejoinSlots.js`), which card L's
  phase table reads.
- `body`, `idle` and `pv`: rules written in line in their handlers (what a
  body may hold, what counts as idle, a PvP check), not lists.
- `phoneSend` and `phoneCase`: the page's. `phoneSend` is the action door's
  rows (`src/game/actions.js`, card K PR 5); `phoneCase` is the page's
  switches.

A machine's column is written on a row only where it says something, after
`answer` and before `note` (`columns.js` `OPTIONAL`).

## How each column reads

### `name`

The message's type. A route is `http:` and its path, as `FIGHT_LOCK` writes
its six (`http:/api/store/buy`). The path is the whole path a caller sends.

- A path that more than one row answers by method takes the method after a
  space: `http:/api/admin/flags GET`, `... POST`, `... DELETE`. A path with
  one row takes none.
- `*` is any path below that no other row names: `http:/api/market/*` is
  the market's fall-through, `http:/*` the worker's own. `http:/* OPTIONS`
  is the preflight every path answers.
- `?q` names a query that picks the branch: `http:/api/botstat?id`,
  `http:/api/botstat?flagged`; `http:/api/botstat` is neither.
- `#gate` is a refusal at the gate, before any route is read:
  `http:/*#noroom` (a room the worker does not make), `http:/api/admin/*#nokey`
  (no owner's key).
- A row with no method after its path answers every method no other row of
  that path names: `http:/api/store/*` is any method but its POST row's.

### `at`

- `in`: the handler, `shop.js _shopSell`. A case the router answers itself:
  `index.js _onMessage`.
- `relay`: `index.js _onMessage default`, then `> ` the hooks it meets
  (`index.js _sanitizeChatRelay`), then `; phone: ` the phone's switch.
- `out`: the functions that send it (the first three, then how many more),
  then `; phone: wsClient direct` (the direct switch of `ws.onmessage`) or
  `; phone: gameEvents processGameEvent`.
- A route: the function that answers it. A handler's fall-through ends in
  `(fall-through)`: the guard's lister does not look for it.

### `wayIn`

- `socket` for every row a phone sends.
- A route: `http`, or `admin` behind the owner's key; `room` for the five
  routes only another of the worker's objects calls (the census's
  "internal"; each has a note).
- `out`: how the act that sends it came in. `socket` when a phone's message
  causes it (the receiver's own, or another player's: an invite);
  `http` or `admin` when a route does; `room` when the worker starts it by
  itself (the tick, a timer, a monster, the join's own train is `socket`).
  A type sent for more than one cause is a list.

### `envelope`

SHAPES' values. `in`: `alone` (only `join`) or `frame` (alone or a part of a
bundle). `relay`: `relay`. A route: `http`. `out`: `direct` (one socket),
`group` (a named few), `room` (every socket now), `event` (the next tick's
events), `tick` (the tick message itself), `close`; a list when it travels
more than one way.

### `phase`

A list of demands, each `<machine>:<state>` or `<machine>:!<state>`;
`['none checked']` when the handler acts whatever the sender's state.

- `session:joined`: the router's own gate (every case but `join` and
  `pong`), with "has state" and "not disconnected".
- `life:alive`: not dying or dead.
- `zone:wheel`, `zone:safe` (the safe ground), `zone:nml`,
  `zone:dungeon`.
- The implicit machines (not one field yet): `fight`, `duel`, `trade`,
  `party` (and `party:leader`), `ride`, `harvest`, `cook`, `guard`, `pose`,
  `race`, `arena`, `fishing`, each `in`: `fight:!in` is "not in a fight
  with a player".
- What is not the sender's phase goes elsewhere: a well-formed value, a
  target, "can pay" in `bad`; a pace lane, a live flag, the fight lock's
  router gate, the owner's key in the machine-filled columns or in `wayIn`.
- `out`: what the phone demands of its own state before it acts on the
  frame (the census's "the phone's own check", turned round): almost always
  `none checked`.

### `mayStart`

SHAPES' six. The census's words map one to one: "never a helper" is
`never-helper`, "a person" `person`, "a helper with a grant" `helper`, "the
owner" `owner`, "the system" `system`. `anyone` is a public read that names
no player and needs no grant (`/api/lobby`, a public board): the census wrote
"a helper with a grant (read)" with "needs no grant at all".

The 91 rows the census calls "a person" stay `person` (the owner,
2026-11-14: *"Leave open"*; step 11.7 decides). `helper` only where pillar 11
names the errand: the market, the bank, payments, reading the player's own
things.

### `doesWhat`

SHAPES' seven, every one that applies. From the census: "reads" `reads`,
"changes your own state" `own`, "moves value out" `value-out`, "cannot be
undone" `final`, "speaks" `speaks`, "plays" `plays`; `others` where it
changes another player's state without speaking, playing or moving value (a
kick, a mute, the owner's freeze).

An `out` row changes nothing on the worker by being sent, so it is `reads`,
with `speaks` when it carries a player's words or social ask to another
phone, and `plays` when it shows play (a hit, a step, a monster's move).

### `reqId`

The field's name today (`opId`, `k`, `hitSeq`); `state` (a repeat finds the
thing done or gone); `none` (a repeat acts twice); `harmless` (a repeat
changes nothing: a read, a set to the same value). `out`: the field the
census says it echoes (its "id it echoes": `seq`, `k`, `lootId`), else
`none`.

### `trust`

One value a field: `request`, `look`, `claim`, `words`, or
`bounded:<its judge>` (`bounded:MOVE_BUDGET`). A route's query, body and
header fields alike.

A field is in `trust` only when the phone sent it and the worker reads it;
the field a row names in `reqId` is one (`opId: 'request'`).
Left out: a field the worker never reads (the census's "not read"), a field
it writes itself (a relay's stamped `id` and `name`), and on an `out` row
every field the worker made (its own, and an echo of the request). So an
`out` row's `trust` holds what it passes on from another phone: a `look`, or
`words`. A trust that differs by road is the weaker (`claim`), with a note;
but a bound with known holes keeps its judge (step 4.2 measures each judge's
gain), and the holes go in a note. A demand of `phase` that holds on one road
only (getting ON the board) is in `phase`, with the road in a note.


### `form` (v2.3.6443, card DG PR 4)

Optional. `{ field: form }` for a field the row's `trust` names (never a
`words` one): `count` a whole number of zero or more, `int`, `num`, `yes`
(true or false), `id` (door.js `WIRE_FORM.ID_RE`), `str:<n>`,
`num|str:<n>`, or a closed list (`['gold', 'item']`). The wire door
refuses a value out of it before any handler (`null` passes). A field with
no form is held to its trust's default: a `request` field's string at most
`WIRE_FORM.STR_MAX`. A form is written only where the page's sender was
read and sends nothing else (`wire-form.test` §5 holds the column).
### `absent`

Words, never the census's. Clauses joined by `; `, each opening with
`default`, `older phone`, `refused`, `dropped`, or `nothing` (no field can be
missing): `dropped: no key; default: no qty is 1`. On an `out` row, what the
phone does with a frame that lacks it (the census's columns turned round, as
its part 1 says): `dropped: no payload` is the phone ignoring it.

### `bad`

A list of `clamped`, `refused` (an answer says so), `taken` (used as sent),
`dropped:<code>` (nothing is said, with its code from `CODES` in
`server/test/refusal-door-list.mjs`). `[]` when no field can be wrong. On an
`out` row, what the phone does with a wrong value: `clamped` a stand-in for
an unknown one, `dropped:shape` a body or list of the wrong kind,
`dropped:gone` a thing it no longer holds.

### `answer`

The message that tells the sender what happened: a type (any row's name),
`player_state` (the worker's echo), `none`, or a list. A route: `http` (its
own answer), with any message it also sends to the caller's phone. `out`:
what the phone sends back (`ping` is answered by `pong`, an `in` row), else
`none`.

### `privileged` (v2.3.5181, card K)

Left out on an `out` row: the type is privileged, and the relay's default
branch drops a phone's copy (`PRIVILEGED_EVENTS`). Left out on a `relay`
row: the worker never sends it itself.

`echo`, on an `out` or a `relay` row: the worker sends the type AND a phone's
copy is not dropped as a forgery. Today the 8 relays a sparring clone or a
settlement also sends (`player_swing`, `trade_reject`, ...), and
`clan_war_declare` (an `out` row: an older worker's relay of it must keep
passing). Its why is a note that opens `echo: `; the guard fails an echo
with none. These rows are wire-audit's echo list.

### `fight` (v2.3.5182, card K PR 2)

What a fight with another player does to the request (`fightlock.js`).
`lock:<switch>`: refused or checked while in such a fight, the lock turned
off by that live flag (`fightlocktable`, `fightlockequip`, ...: fightlock.js `LOCK_SWITCHES`); the
refusal's code is `fightlock.js`'s (`FIGHT_LOCK_HOW`), and the guard fails a
code for a row the table does not lock. `open:<why>`: allowed in a fight,
the why one of `fightlock.js`'s `OPEN_WHY` (`the fight itself`, `moves no
goods`, `a relay`, ...). Left out: the request is not one a fight judges
(an `out` row never has it).

### `placed`

Where the room sends a message, by place (`eventplace.js`). On an `out`
row, the fields that place it: `m` the monster's id field, `xy` its x and y
fields, `p` a player's id field, `who` the players it names (always told).
On a `relay` row, `sender`: placed where the room has its sender.

### `muted`

`mutable`: a player who muted the sender does not hear it (`chatmod.js`).
Today `chat`, `emote` and the worker's `dice_roll`, stamped with its roller.

### `pace`

The allowance a request spends beside the socket's. `social`: a relay paid
from the social allowance (`chatguard.js`) in place of the relay bucket.
Any other word is a lane of `flood.js` that the row's handler (the first
`at`) takes with `_paceTake('<lane>'` or `_paced('<lane>'`; the guard fails
one it does not). `flood.js`'s `PACE` holds each lane's rate, not its
types, so no list moved out of it.

### `watch`

The anti-bot hook (`botsig.js`) that the request's router case calls
(`join`'s: `join.js`). The guard fails a hook its case never calls.

### `flag`

The live flags the request's handler asks before it acts, by their row's
name in card T's switch table (`tools/guards/lib/switches.mjs`); the guard
fails a name that is not a row there. It makes no list: T's table is the one
list of flags (the plan's rule 2).

### `note`

A list of the census's words, where a row fits no closed value and took the
safer one (`person` for `mayStart`, `claim` for a field's `trust`, `none` for
`reqId`), or where a column reads by a rule above that loses a fact.

v2.3.5181: a note that opens `echo: ` is the why of a `privileged: 'echo'`
(above), read by `lists.js` into wire-audit's echo list.
