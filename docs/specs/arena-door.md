# The arena door (card L PR 5, grand plan step 5.3b; v2.3.5522)

`server/src/gladiator.js` (`_arenaTo`, `ARENA_WAYS`, `_arenaPhase`,
`_arenaDoorOff`); held by `server/test/arena-door.test.mjs` and the phase
table's guard (the `arena` row on the worker). The arena itself is
`docs/specs/arena.md`.

## What it is

The Gladiator tournament is one field on the room, `this._arena`: none, or
its record, whose own `status` goes `gathering` (the first entry opens it),
`running` (the start) and `complete` (the crown). Six places wrote it in
`gladiator.js`; now only `_arenaTo` does, by a way of `ARENA_WAYS`:

| way | caller | to |
|---|---|---|
| `open` | `_arenaJoin` (the first entry) | a record `{status: 'gathering'}` |
| `start` | `_arenaStart` (the gather deadline, or a full bracket) | running, in place |
| `crown` | `_arenaCrown` (the last match resolved; its champion on it) | complete, in place |
| `empty` | `_arenaLeave` (the last in the queue left) | none |
| `cancel` | `_arenaLazyTick` (too few at the deadline; refunded) | none |
| `clear` | `_tickArena` (60 s after the crown, the completion poll's grace) | none |

- **No join or load way**: the bracket lives in memory alone, and a deploy
  voids it by design (the entry sweep refunds; `gladiator.js`'s head).
- **A player's place in it** (queued, fighting, eliminated) is read off the
  record (`_arenaStatusFor`). A player's match, `ps._arenaMatch` (the
  healing gates' marker), is a note beside the door: written where a match
  goes live (`_arenaTryActivate`) and where it is resolved
  (`_arenaOnMatchResolved`), the suite holding both.
- **A match is a duel** (wager 0, `arenaMatch`), through the duel door.

## Step 1: nothing a player sees changes

The door's rules are the callers' own checks: a tournament opens only where
none is, with its id, its queue and its gather deadline; it starts only from
gathering, is crowned only from running and with its champion; the queue
empties and the gather is cancelled only while gathering; the finished one
is cleared only when complete. `arena`, `arena-settle`, `sponsorship`,
`duel-door`, `silent-refusals` and `refusal-door` pass unchanged.

## The switch

`arenadoor: false` in the live flags lifts the rules, as the lines before the
door (an open still carries its gathering status). Its row is in card T's
switch table.

## What the test fails

- §1: the door's rules and the switch.
- §2: a write of `this._arena` anywhere in `server/src` outside `_arenaTo`,
  or of a tournament's `status` in `gladiator.js` outside it; every way's
  caller in its function; `ps._arenaMatch` at its two places. The duel
  door's guard line reads every `.status =` in `server/src`: its `besides`
  entry for the tournament now names the arena door (`fn: '_arenaTo'`).
- §3 and §4: the real room: the first entry, the last to leave, too few at
  the deadline, a start, a kill's crown, the clear; an entry while it runs
  still refused.
