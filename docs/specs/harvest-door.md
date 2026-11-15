# The harvest door (v2.3.5214)

`server/src/gathering.js` (`_harvestTo`, `HARVEST_WAYS`); held by
`server/test/harvest-door.test.mjs` and the phase table's guard
(`tools/guards/phase-table.test.mjs` §2, its `DOOR_SUITES` line, read off the
syntax tree; since this door, a line marked `keyed` counts a write of one of
the field's keys). Card L PR 5's fifth worker door, after the trade, duel,
party and cook doors. **Fishing's row is the same door**: a fish is a gather
record with skill `fishing` (the phase table's note: "a door for harvest is
fishing's too").

## What it is

- **One field.** A player's gather record, `this.extractions[pid]`: none,
  or started (mining, woodcutting and fishing alike). The window opening is a
  time on the record (`openDelayBase`, or the hits' plan), not a phase; a
  strike ends it, paid or not.
- **One writer.** `this._harvestTo(pid, rec, way)`. Each way in
  `HARVEST_WAYS`:
  - `start`: the record (`_handleExtractionStart`);
  - `strike`: none, once a strike resolves (`_handleNodeStrike`);
  - `end`: none, when the gatherer attacks (a swing, a PvP strike) or
    casts (an ability, an arrow blast, an element burst) (`_endExtraction`;
    a stuck arrow's late chip keeps it, `keepRecord`);
  - `sweep`: none, past `EXTRACTION_TIMEOUT_MS`
    (`_sweepStaleExtractions`, on the tick).

  The first takes the record; the others take `null`. A way to none of no
  record writes nothing.
- **No leave way.** The record outlives its socket on purpose (`leave.js`,
  v2.3.3322): the phone replays a strike its dropped socket ate.
- **The door's one rule**: a started record carries its start, a finite
  `startedAt`. The sweep reads `e.startedAt < cutoff`, which is false for a
  record without one, so such a record would stand forever.
- **Not folded here**: a cook keeps no record (`_planCookHits`): its phase is
  the phone's claim, the cook door (`movement.js _exTo`, v2.3.5213).
  `_extractionShielded` and `botsig.js` only read the record.

## Step 1: nothing a player sees changes

Every record the start builds has its `startedAt` (`Date.now()`). Every way to
none deleted a record before, or did nothing when there was none, and still
does. A strike too early still keeps the record. The gathering suites pass
unchanged.

## The switch

`harvestdoor: false` in the live flags writes a record without its start,
as the old line would have. It never lets a way to none take a record. The
worker's row is in card T's switch table.

## What the test fails

- a write of `this.extractions` or one of its keys anywhere in `server/src`
  but `_harvestTo` and its birth (the room's constructor, an empty map);
- a stale birth;
- a way with no caller, or a caller of a way the table has not got.

It plays every way through the real room, in the Wheel: a mining start and a
strike too early (kept), then in its window (paid, ended); a fishing start
and its paid strike; a chop ended by an attack, and kept by a late chip; the
sweep on either side of its time; a closed socket (kept); and a cook's ask
(no record).

## The page (v2.3.5219)

`src/game/harvestDoor.js` (`harvestTo`, `HARVEST_PAGE_WAYS`, `harvestPhase`);
held by `server/test/harvest-page-door.test.mjs` and the phase table's
guard (the page's `harvest`, `cook` and `fishing` rows: one field). The
phone's harvest is one field, `S._extraction`: none, or the record of the
swing in flight, mining, woodcutting, fishing or a cook at your fire (its
`skill`). Its own `status` goes `waiting` (the swings, the worker's hits
landing) and `ready` (the window open: the gesture cue). Three files wrote it
in ten places; now only `harvestTo` does, by a way of `HARVEST_PAGE_WAYS`:

| way | caller | to |
|---|---|---|
| `start` | `lifeSkillRewards.js startExtraction` | a record `{status: 'waiting'}` |
| `try` | `lifeSkillRewards.js _startLockedTry` (a level you do not have yet: its 0s) | a record `{status: 'waiting', locked}` |
| `open` | `BroTown.jsx`'s tick, at `windowOpensAt` | the record's status, waiting to ready, in place |
| `strike` | `lifeSkillRewards.js succeedExtraction` (the gesture landed) | none |
| `lost` | `succeedExtraction`; the tick (the node is gone) | none |
| `walk` | the tick (the stick pushed, or out of the node's reach) | none |
| `tried` | `lifeSkillRewards.js tickGatherHits` (a try's end) | none |
| `again` | `startExtraction` (a new tap ends the old) | none |
| `zone` | `zoneTransitions.js clearZoneLocalFx` | none |

- **The rules are the callers' own checks**, so nothing a player sees
  changes: a start or a try only from none (`startExtraction` ends the old
  one first), a try's record locked and a start's not, the window open only
  from waiting and only at its time (a try's is at Infinity: it never
  opens), a strike only from ready, `tried` only of a try, and a record only
  of its own way's status. `?harvestdoor=0` lifts them (its row is in card
  T's table).
- **Not folded**: what the record counts and times while it waits (the
  worker's hits, `windowOpensAt`, the gesture's samples), which the tick, the
  gesture layer and the worker's plan (`applyGatherHits`) write on it; the
  fire (`S._campfire`, `S._firemaking`) and the node you stand by
  (`S._nearNode`, `S._proxNode`), fields of their own, notes beside the
  rows.
- **A module of no imports**, so a node test reads its rules. The suite
  also loads `lifeSkillRewards.js` itself (its `@/` imports resolved to
  `src/`, `pixi.js` stubbed and its `.json` read, as `ladder-passes.test`
  does): a mining start and its ask for hits, a new tap, the worker's plan
  landing and the window opening, the strike and its `node_strike`, a cook
  and its `cook_request`, a try and its end, a strike at a node gone.
  `BroTown.jsx` and `zoneTransitions.js` do not load in node: §2 holds
  their calls by their text.
- **The zone's clear asks the door.** `clearZoneLocalFx` is the zone edge's
  own list (the state ledger's guard, check 6), and it clears the harvest by
  `harvestTo(S, null, 'zone')`. The state census now reports every call of
  a page door (`doorCalls`, `state-census.mjs doorCallsFound`), and the
  guard counts such a call in an edge's door list as that edge's clear.
