# The phase table (v2.3.5202)

`src/state/phases.js`; held by `tools/guards/phase-table.test.mjs`. Grand plan
step 5.3b, card L PR 2. It changes no game file: nothing imports the table.

## What it is

The owner, 2026-11-13: every implicit state machine explicit, through one
door. A "state machine" is anything in the game that goes through steps: a
duel (asked, on, over), a trade window, a death, a socket
(`docs/STATE-MACHINES.md`, "What it was"). CLAUDE.md §5's rule is that a
phase lives in **one field with one transition function**, never a second
boolean beside the first. Four already did: the life phase, the session, a
monster's life and the zone. The rest are spread over several fields that
several files write.

The table gives every machine one row a side (the worker, the page), so the
list of machines and how far each is from one door is in one place, held to
the code.

## A row

| Column | Holds |
|---|---|
| `name` | the machine: SHAPES part 5's (`session`, `life`, `zone`, `fight`, `duel`, `trade`, `party`, `ride`, `harvest`, `cook`, `guard`, `pose`, `race`, `arena`, `fishing`) and the plan's (`dungeon`, `connection`, `loading`, `window`, and `monster`, a monster's life) |
| `side` | `worker` (server/src) or `page` (src): a row a side where they differ |
| `status` | `door` (one field, one transition function, something that fails a second writer) or `todo` |
| `what` | one sentence |
| `field` | the one field of a door; `null` for a todo |
| `states` | its states, in the code's own words where it has them |
| `fn`, `file` | a door's one transition function and its file; `null` for a todo |
| `clears` | `[{ edge, at }]`: what ends it. The edge is one of `zone`, `death`, `rejoin` (card D's three, the page's), `leave` (the worker's session door), `end` (its own end) or `never` (a clock that runs out); `at` is the function, `<file> <fn>` |
| `rejoin` | the slots of `REJOIN_SLOTS` (`src/game/rejoinSlots.js`) a rejoin clears on the phone and the worker says again, or `none: <why>` |
| `held` | a door: `{ suite }` or `{ scan, born, besides }` (below) |
| `today` | a todo: today's fields (below) |
| `note` | where a row needs words |

**A todo row's fields.** A page field is `S.<name>`, or a top-of-file variable
and its file: each is a row of the state ledger (`src/state/<system>.js`),
whose `writers` column already holds its writers and is held to the code by
`state-ledger.test` (card L PR 1). The table names the field and never copies
the writers (rule 2: one copy). By function:
`node tools/dev/state-census.mjs --dossier`. A worker field has its file and
its writers, `<file> <function>`, read from the code: the worker's state has
no ledger (card L's reading: "server phases need no ledger rows").

`NOT_A_MACHINE` lists the ledger rows D's census marks `phase` (a field set to,
or compared with, two or more words) that are not a machine's field, each with
why: a QA tag, a direction, an input's source, a setting.

## The doors today

| Machine | Side | Field | Function | Held by |
|---|---|---|---|---|
| `session` | worker | `session.phase`: open, joined, gone | `_playerLeaves` (`leave.js`) | the table's scan |
| `life` | worker | `ps.life`: alive, dying | `_lifeTo` (`life.js`) | `life-door.test` §2 |
| `monster` | worker | `m.alive` back to true (any name) | `_monsterNewLife` (`monsterlife.js`) | the table's scan |
| `monster` | page | `m.alive` back to true | `monsterNewLife` (`monsterCarry.js`) | the table's scan |
| `zone` | page | `S.currentZone` | `changeZone` (`zoneTransitions.js`) | `zone-leftovers.test` §6 |
| `trade` | worker | a session's `s.state` | `_t2To` (`trade2.js`, v2.3.5210) | `trade-door.test` §2, and the guard's tree |
| `duel` | worker | a duel's `d.status` | `_duelTo` (`duel.js`, v2.3.5211) | `duel-door.test` §2, and the guard's tree |
| `party` | worker | a player's entry in `this._partyByPlayer` | `_partyIn` (`party.js`, v2.3.5212) | `party-door.test` §2, and the guard's tree (a Map's calls too) |
| `cook` | worker | the phone's claim on its moves, `ps.ex` (cook, fire, mine, chop, fish, a farm step) | `_exTo` (`movement.js`, v2.3.5213) | `cook-door.test` §2, and the guard's tree |
| `harvest`, `fishing` | worker | a player's gather record, `this.extractions[pid]` (mining, woodcutting, fishing) | `_harvestTo` (`gathering.js`, v2.3.5214) | `harvest-door.test` §2, and the guard's tree (a record's keys too) |
| `dungeon` | worker | a run's `inst.runPhase` (active, boss, done); the old `state` and `bossSpawned` written by the door | `_dungeonTo` (`dungeon.js`, v2.3.5215) | `dungeon-door.test` §2, and the guard's tree |
| `pose` | worker | a held pose, `ps.po` (none, or one of `POSE.IDS`) | `_poseTo` (`poses.js`, v2.3.5216) | `pose-door.test` §2, and the guard's tree |
| `race` | worker | a player's race, `ps._race` (on, or none; the countdown and the running are times on it) | `_raceTo` (`race.js`, v2.3.5217) | `race-door.test` §2, and the guard's tree |
| `arena` | worker | the Gladiator tournament, `this._arena` (none; gathering, running, complete: its record's own `status`) | `_arenaTo` (`gladiator.js`, v2.3.5522) | `arena-door.test` §2, and the guard's tree (its status writes: the duel line's `besides`, in `_arenaTo`) |
| `ride` | worker | the skateboard, `ps._ride` (off, on; the session it tells, `ps._ridePid`, beside it) | `_rideTo` (`ride.js`, v2.3.5523) | `ride-door.test` §2, and the guard's tree |
| `race` | page | the phone's race, `S._race` (none; asked, count, run, done: its record's own `phase`) | `raceTo` (`raceDoor.js`, v2.3.5218) | `race-page-door.test` §2, and the guard's tree |
| `pose` | page | the phone's own held pose, `S._pose` (standing, or its record: posing) | `poseTo` (`poseDoor.js`, v2.3.5520) | `pose-page-door.test` §2, and the guard's tree |
| `arena` | page | your arena, `S._arenaMatch` (none, involved, fighting; its notes `S._arenaInvolved`, `S._arenaTournamentId` beside it) | `arenaTo` (`arenaDoor.js`, v2.3.5531) | `arena-page-door.test` §2, and the guard's tree |
| `trade` | page | the phone's trade, `S._t2Live` (none, or the open trade's id) | `t2LiveTo` (`tradeSlot.js`, v2.3.5530) | `trade-page-door.test` §2, and the guard's tree |
| `ride` | page | your board, `S._ride` (its `on`: off, on) | `rideTo` (`ride.js`, v2.3.5530) | `ride-page-door.test` §2, and the guard's tree |
| `duel` | page | the phone's duel, `S._inDuel` (none, pending, on; its note `S._activeDuel` beside it) | `duelTo` (`duelDoor.js`, v2.3.5529) | `duel-page-door.test` §2, and the guard's tree |
| `party` | page | the phone's party, `S._party` (none, member) | `partyTo` (`partyDoor.js`, v2.3.5529) | `party-page-door.test` §2, and the guard's tree |
| `connection` | page | the phone's socket, `S._realtimeStatus` (connecting, connected, disconnected, idle, linger, and each refusal's screen) | `connTo` (`connectionDoor.js`, v2.3.5528) | `connection-door.test` §2, and the guard's tree |
| `window` | page | what is open over the world, `S._windows` (none; open: a Map from the reason, panel, npc, to its hold) | `windowTo` (`windowDoor.js`, v2.3.5526) | `window-door.test` §2, and the guard's tree |
| `loading` | page | the world's veils, `S._veils` (in; veiled: a Map from the reason, zone, trip, town, farm, avatar, to its hold) | `veilTo` (`veilDoor.js`, v2.3.5525) | `loading-door.test` §2, and the guard's tree |
| `guard` | page | your shield on the phone, `S._shieldUp` (down, up) | `guardTo` (`guardDoor.js`, v2.3.5521) | `guard-page-door.test` §2, and the guard's tree (a peer's copy and the renderers' posed copies are `besides`) |
| `harvest`, `cook`, `fishing` | page | the phone's harvest, `S._extraction` (none; waiting, ready: its record's own `status`; mining, woodcutting, fishing and a cook are its `skill`) | `harvestTo` (`harvestDoor.js`, v2.3.5219) | `harvest-page-door.test` §2, and the guard's tree |

**How a door is held.** What holds a door is a closed list in the guard
(v2.3.5203, after the gatekeeper's sitting 8 found that a suite which merely
named the field let a `todo` row turn `door` with nothing built):

- `DOOR_SUITES`: the suites that fail a second writer of that field through
  that function today (`life-door.test` §2, `zone-leftovers.test` §6).
  **v2.3.5209 (the gatekeeper's sitting 9):** a suite reads with its own
  pattern. Zone-leftovers' is a regex, which passed
  `Object.assign(S, { currentZone })`. So the guard ALSO reads each such door
  off the syntax tree, the one reader below. Each `DOOR_SUITES` line names
  the field's `prop`, and every write of it on the row's side must be in the
  row's function and file, or in that line's `besides`, with why. Today
  there are two: `monsterlife.js m.life` (a monster's lives) and
  `tileRenderer.js this.currentZone` (the zone it drew). A stale door (its
  function writes nothing) fails, and so does a stale `besides`.
  **v2.3.5212:** a field that is a `Map` (the party's) is written by its
  own `set`, `delete` and `clear` too. **v2.3.5214:** a line marked
  `keyed` (the harvest's `this.extractions`, a record keyed by id) counts a
  write of one of its keys as a write of the field: `x.prop[k] =`,
  `delete x.prop[k]`, `x.prop[k]++`, `Object.assign(x.prop, ...)`.
  **v2.3.5214 (the gatekeeper's low, sitting 15):** a `besides` entry
  matched by its text alone let a wipe through (an unconditional
  `this._partyByPlayer = new Map()` read as the map's birth). An entry may
  now say where and how, read off the tree: `fn`, the function it must be
  in (a Durable Object's `this.state = state`, the room's
  `this.extractions`: the `constructor`), and `ifMissing`, a birth only
  (the write is the consequent of `if (!<the same field>)`).
  **v2.3.5219:** the harvest's page door has one `besides`: the renderer's
  posed picture (`entityRenderer.js poseFrame`) makes a copy of the state,
  `Object.assign({}, real, { _extraction: null, ... })`, never `S` itself.
  Three rows (the page's `harvest`, `cook` and `fishing`) name the one
  field and the one suite, as the worker's `harvest` and `fishing` do.
- `SCAN_DOORS`: the rows no suite holds. The guard runs the row's `scan`
  itself. It reads every write of the field off the syntax tree (@babel):
  `x.phase =`, `x['phase'] =`, `++`, `delete`, `Object.assign(x, { phase })`.
  Each write is placed in the function the tree says it is in, never by
  indentation; the sitting found a method whose parameters ran over two lines
  credited to the one above it. Each write must be in one of the row's
  places. A write that is not the machine's field goes in `besides`, with
  why. A stale `besides` entry fails, and so does a place that writes
  nothing. `born` is a place where the field is made as a literal.

A row turned `door` adds its line to one of the lists in its machine's PR,
saying what holds it. A `door` row carrying `today` is refused. The table is
read as plain data before it is imported (no import, no call).

Three doors are scans, and why:

- **The session.** `session-door.test` plays the three phases but fails no
  second writer of the field. There are three places: the socket is born
  `open` in `index.js fetch`, the join writes `joined` in `join.js
  _handleJoin`, and the door writes `gone` in `leave.js _leaveRun` (inside
  `_playerLeaves`). So the session has one field and one leave, but `joined`
  is written outside the door. The scan holds all three.
- **A monster's life, on the worker.** The door is the new-life edge:
  `m.alive` comes back true only in `_monsterNewLife`, under any name (which
  also counts the lives, `m.life`). The kill (`m.alive = false`: combat.js, devtools.js,
  slimeboss.js) is the death edge, not the door. `monster-newlife.test` fails
  a per-monster field that is in no reset list, which is the reset's
  completeness, not a second writer. `life-door.test` §2 passes a monster's
  `m.life` on purpose (its `m` / `mn` rule).
- **A monster's life, on the page.** `monster-life.test` §6 holds that both
  edges call the one reset. The scan fails a new life made anywhere else.
  Its `besides` are a gather node and a townsperson coming back in
  BroTown.jsx.

## What the reading found (2026-11-14)

- On the page, mining, woodcutting, fishing and cooking are one field,
  `S._extraction`, with its `skill`. The `harvest`, `cook` and `fishing` page
  rows all name it. On the worker, harvest and fishing are one record
  (`this.extractions[pid]`), and a cook has no record at all, on purpose
  (`gathering.js`): `ps.ex === 'cook'`, the phone's claim, is the only "is
  cooking".
- `fight` has no field anywhere. The worker derives it at each ask
  (`fightlock.js _fightLockHolds`) from the duel, a 10 s clock on the room
  (`cooking.js this._pvpHealClocks`), the red skull and the place.
- `ride` and `race` on the worker are nearly doors already. Every ride ends in
  `_rideEnd`. The race has two writers, both in `race.js`.
- `ps.blocking` (the guard) has nine writers in seven files. A death touches
  none of the guard's fields.
- A dungeon run has no field on the player: being in a run is the place
  (`ps.z` `dungeon:<id>`).
- `server/src/bodytake.js` (~94) mentions "rejoinresend's pose row". There is
  none: `rejoinresend.js` re-sends the duel and the trade only. The pose slot
  in `REJOIN_SLOTS` has no re-send on purpose (every join makes the body
  afresh).
- `S.fishTimer` is made in the state's first object and nothing reads it.

## The guard

1. Every row has its columns, each from its closed list. No machine is two
   rows on one side. Every machine of step 5.3b and SHAPES part 5 is a row on
   its sides.
2. A door's field has no writer outside its function: the suite named, or the
   scan run.
3. Every slot of `REJOIN_SLOTS` is named by a row, and every slot a row names
   is in it.
4. Every machine named in the wire table's `phase` column
   (`server/src/wire/columns.js` and every row's demands, card N's) is a row.
5. Every ledger row with D's `phase` mark is a page row's field or is in
   `NOT_A_MACHINE`. A page field a row names is a ledger row.
6. A todo row's worker writers are where it says, and every row's `clears`
   names a function its file holds.
7. The `todo` rows are a census (the plan's rule 3): their count, 31 at
   landing (`TODO_LINE`), may only fall. The gatekeeper alone lowers the line
   and makes it strict.

Its break proofs are in its header, each tried by hand.

## Turning a row into a door (card L PR 5, one machine a PR)

As the life door was built (v2.3.4820):

- step 1 changes nothing a player sees;
- one field and one transition function, which writes the old booleans and
  fields for their readers;
- a suite that fails a second writer (then the row's `held` names it), or a
  scan in the row;
- a lower-case kill switch in `liveops.js` on the worker, a `?name=0` on the
  page;
- the row turned `door`, and `TODO_LINE` left for the gatekeeper;
- its row in `REJOIN_SLOTS` if a rejoin must say it again (CLAUDE.md §5);
- a phase sent to the phone is a new field on a message: its cap first
  (`CAP_GATES`), then its wire row (card N's table).

The order, worker first and free files first: `trade`, `duel`, `party`,
`cook`, `harvest`, `fishing`, `dungeon`, `guard`, `ride`, `pose`, `race`,
`arena`; then the page's `life` (the death's one door, one respawn through
`applyLocalRespawn`: the death's resets land with it, v2.3.5203,
`docs/specs/state-resets.md`), `connection`, `loading`, `window`.
