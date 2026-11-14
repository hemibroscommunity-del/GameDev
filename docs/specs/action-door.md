# The action door (v2.3.5185)

Grand plan step 5.8, card K (`docs/plan/cards/K.md`, PR 5; its moves are PR 7).
The one way a request leaves the page.

## What it is

`src/game/actions.js` holds one row for every request a player's page makes of
the worker: every `in` and `relay` row of the wire table (`server/src/wire/`)
the page sends, and every route it calls. A row says the request's **way**:

| Way | How it leaves | Today |
|---|---|---|
| `own` | the connection's own send; `act()` refuses it | `join`, `pong`, `track` |
| `move` | the batch's latest place, never queued | `move` |
| `alone` | at once, in a frame of its own | 91 types: the shim's old pass-through |
| `claim` | alone; a waiting batch flushed first when frames bundle | `monster_damage` |
| `aftermove` | alone; the pending move sent first (the worker measures it from where it has you) | `loot_pickup`, `ability` |
| `priority` | a broadcast event at once, the 33 ms batch flushed first | 31, the old `PRIORITY_EVENTS` |
| `attack` | a PvP swing: the batch flushed, then sent as its own type | `player_attack` |
| `rider` | rides the next frame (`game/quietPhone.js`) | `gather_node` |
| `batch` | a broadcast event in the 33 ms batch | the rest |
| `http` | a route: its method and path, the session's token in `x-bt-auth` | 20 routes |

and its flags:

- `settled`: the worker answers it, so the dead-pipe watch waits for an answer
  (the old `SETTLED_SENDS`, 9);
- `held`: kept through a lost socket and sent on the rejoin (`node_strike`);
- `req`: it moves value out or cannot be undone (its wire row's `doesWhat`
  holds `value-out` or `final`), so the door gives it a request id;
- `body: 'top'`: its fields sit at the message's top, not in `payload`
  (`dice`, `pose`, `nml_attack`, `map_watch`);
- `legacy`: sent for an older worker, and today's drops it. Two rows have it:
  `clan_war_kill` and `clan_war_end`, which the page still sends after a war
  it tracks itself, and which today's worker refuses as privileged.

## The shim is its transport

`src/networking/wsClient.js`'s channel shim reads the rows. Before this, it
kept three lists by hand:

- its pass-through, a chain of 66 `if (msg.type === ...)` lines;
- `PRIORITY_EVENTS`;
- `SETTLED_SENDS`.

The pass-through was an ALLOWLIST: a type it forgot was dropped in silence
(TRAPS §18), and that bit four times. Now:

- **The chain is one lookup** (`actionWay(msg.type)`). The three ways that do
  more than pass through keep their code and their notes in the shim.
- **Each old line's comment moved** to its row in `actions.js`, word for word.
- **A direct type with no row** is still not sent, as before. It is now counted
  (`doorCounts()`), and on a QA page (`window.__btProbe`) said aloud, with
  `window.__btDoorRefused`.
- **A broadcast event with no row** still rides the batch, as before.

Every name takes exactly the way it took before
(`tools/guards/action-door.test.mjs` §6 holds today's way for each, for this PR).

## `act(name, payload, opts)`

The door itself:

- **No row** (or an `own` row): it refuses the name and counts it.
- **A `req` row:** it adds a request id, `payload.reqId` (in an HTTP body,
  `reqId`). The id comes from `makeReqId()`, the one maker of SHAPES part 2: 1
  to 64 of `A-Z a-z 0-9 _ -`. It adds bytes, never a message. A worker that
  does not read the id yet (before card K's PR 9) lets it pass: the wire door
  passes a field its row does not name.
- **Then it sends the request its row's way:**
  - a direct type as `{ type, payload }` (or at the top);
  - an event as `{ type: 'broadcast', event, payload }`;
  - a route through the transport's `http(path, init)`, with its method, the
    session's token, and `opts.query`.

Nothing calls `act()` in PR 5. Card K's PR 7 moves the page's sends to it a
family at a time, each with the same payload and the same way. Where a helper
would one day act for a player (pillar 11), it acts here.

## What holds it

`tools/guards/action-door.test.mjs` fails:

- a row that is not a row of the wire table (but a `legacy` row of an `out`
  type);
- a type, event or route the page sends by name with no row;
- a `req` that is not the table's;
- a list of the shim's kept by hand again;
- `act()` sending a way differently from the shim;
- (PR 5 only) a name whose way is not today's.

**The census** counts every send to the socket (`channel.send(`) and every
fetch of `/api/` outside the door: 203 sends and 25 fetches on main 82fb78d.
The count only falls (the plan's rule 3). Card K's PR 7 lowers it; the
gatekeeper makes it strict once it reaches nothing.

**The exceptions** are named in the guard, and stay outside the door:

- `src/debug/crashTrap.js` and `src/networking/index.js`: they run before a
  session;
- `wsClient.js`'s fetch of `/api/lobby`: the connection's own.

`tools/dev/precheck.mjs` reads the rows too:

- `shim-allowlist`: a direct send needs a row that sends it alone;
- `town-gate`: a send through `act()` gated on `_serverMonsters` is a send too.

## The door never imports the worker's table

The table carries every row and its notes. In a phone's memory that would be
weight for nothing (the memory law). So the page's rows are its own, and the
guard holds them to the table.
