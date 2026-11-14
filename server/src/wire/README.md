# The wire table (v2.3.5061)

Grand plan step 4.1, step 1, as code: card N (`docs/plan/cards/N.md`). One
row for every message a phone and the worker trade, and for every HTTP
route. Made from card C's census (`docs/plan/census/wire.md`), its prose
turned into the closed values of `docs/SHAPES.md` part 5. A row says what the
code does today. It is not a design.

**Nothing in the worker imports it yet.** Today's lists (`PRIVILEGED_EVENTS`,
`RELAY.TYPES`, the router's cases, the phone's switches) stay the truth until
card K makes each of them FROM this table (step 4.1, step 2).
`tools/guards/wire-table.test.mjs` (card N's PR 3) holds the table to the
code: a key with no row, a row with no key, two rows for one key, a value off
its column's list.

## The files: one a direction

Every file is a leaf: no imports, plain data, so node and the worker can both
read it.

| File | Holds | Rows |
|---|---|---|
| `in.js` | `WIRE_IN`: the router's cases (`server/src/index.js` `_onMessage`), phone to worker | 139 |
| `relays.js` | `WIRE_RELAY`: `RELAY.TYPES` (`server/src/relay.js`), phone to worker to phones, one row for both ways | 26 |
| `out.js` | `WIRE_OUT`: `PRIVILEGED_EVENTS` (`server/src/index.js`) and `clan_war_declare`, worker to phone | 164 |
| `http.js` | `WIRE_HTTP`: every HTTP method and path, and each handler's fall-through (`dir: 'in'`) | 107 |
| `columns.js` | `WIRE_COLUMNS`: the closed lists every row is held to | |

436 rows: the census's part 8. Count them by direction:

```
node -e "Promise.all(['in','relays','out','http'].map((f) => import('./server/src/wire/' + f + '.js'))).then((ms) => { const rows = ms.flatMap((m) => Object.values(m)[0]); const by = {}; for (const r of rows) { const k = r.dir + (r.envelope === 'http' ? ' (http)' : ''); by[k] = (by[k] || 0) + 1; } console.log(rows.length, by, 'with a note:', rows.filter((r) => r.note).length); })"
```

which prints `436 { in: 139, relay: 26, out: 164, 'in (http)': 107 }` and
how many rows carry a note (below).

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
| `absent` | what a missing field or body means, in words |
| `bad` | what a wrong value gets, a list |
| `answer` | the message that tells the sender what happened |
| `note` | the census's words, where a row fits no closed value |

The machine-filled columns of SHAPES part 5's second table (`privileged`,
`relayed`, `body`, `fight`, `rideEnds`, `idle`, `pace`, `placed`, `muted`,
`watch`, `cap`, `flag`, `roads`, `silent`, `phoneSend`, `phoneCase`,
`rejoin`, `pv`) are NOT here: each is a list in the code today, and a copy
would be a second definition (the plan's rule 2). Card K makes each list from
the table. A handler's live flag, pace lane and fight lock are therefore
never in `phase`.

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

### `note`

A list of the census's words, where a row fits no closed value and took the
safer one (`person` for `mayStart`, `claim` for a field's `trust`, `none` for
`reqId`), or where a column reads by a rule above that loses a fact.
