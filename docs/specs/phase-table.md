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
| `monster` | worker | `m.life`, `m.alive` back to true | `_monsterNewLife` (`monsterlife.js`) | the table's scan |
| `monster` | page | `m.alive` back to true | `monsterNewLife` (`monsterCarry.js`) | the table's scan |
| `zone` | page | `S.currentZone` | `changeZone` (`zoneTransitions.js`) | `zone-leftovers.test` §6 |

**How a door is held.** Where the door's own suite already fails a second
writer (`life-door.test` §2, `zone-leftovers.test` §6), the guard only checks
that the suite names the field and the function. It never writes a second
rule that could disagree with the suite. Where nothing holds it, the row's
`scan` is the rule and the guard runs it. Each write its pattern finds in the
side's code (`src/state/` is data and is left out) must sit in one of the
row's places. A write that is not the machine's field goes in `besides`, with
why, and a stale entry there fails. `born` is a place where the field is made
with its first state, as a literal the pattern does not see; the guard checks
it is still there.

Three doors are scans, and why:

- **The session.** `session-door.test` plays the three phases but fails no
  second writer of the field. There are three places: the socket is born
  `open` in `index.js fetch`, the join writes `joined` in `join.js
  _handleJoin`, and the door writes `gone` in `leave.js _leaveRun` (inside
  `_playerLeaves`). So the session has one field and one leave, but `joined`
  is written outside the door. The scan holds all three.
- **A monster's life, on the worker.** The door is the new-life edge.
  `m.life` counts lives, and `m.alive` comes back true only in
  `_monsterNewLife`. The kill (`m.alive = false`: combat.js, devtools.js,
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
