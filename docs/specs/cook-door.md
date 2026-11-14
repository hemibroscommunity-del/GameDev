# The cook door (v2.3.5213)

`server/src/movement.js` (`_exTo`, `EX_WAYS`, `EX_MAX`); held by
`server/test/cook-door.test.mjs` and the phase table's guard
(`tools/guards/phase-table.test.mjs` §2, its `DOOR_SUITES` line, read off the
syntax tree). Card L PR 5's fourth worker door, after the trade, duel and
party doors (`docs/specs/trade-door.md`, `duel-door.md`, `party-door.md`).

## What it is

Cooking keeps no record on the worker, on purpose (`gathering.js`): the only
"is cooking" is the phone's claim on its moves, `ps.ex === 'cook'`. The same
claim says `fire`, `mine`, `chop`, `fish` and a step on a farm bed
(`farm:<step>:<n>`, `src/game/farmWork.js farmExCode`), and the tick relays it
to the other phones so they see the work. So the cook's door is the claim's.

- **One field.** `ps.ex`: a claim, or nothing.
- **One writer.** `this._exTo(ps, ex, way)`. Each way in `EX_WAYS`:
  - `move`: the move's `ex` (`_handleMove`; only when the move carries one);
  - `linger`: a closed socket's body, held for its grace (`linger.js
    _lingerOnClose`): nothing;
  - `take`: a body a second tab takes over (`bodytake.js _bodyTakeStart`):
    nothing.
- **Its edge stamps.** On the nothing-to-something edge only, the door
  writes when and where the activity began (`_exAt`, `_exX`, `_exY`); on
  nothing, `_exAt` goes to 0. These are the move handler's old stamps, moved
  whole: the phone re-sends its claim every 500 ms, and a stamp on every one
  would slide the cook's shield forever (v2.3.1765). `gathering.js
  _endExtraction` still zeroes `_exAt` on an attack: the shield's end, not
  the claim's.
- **A claim, not a phase** (CLAUDE.md §5: a move's field is a request).
  What a claim buys is judged where it is read, as before:
  `_extractionShielded`, the swing's fire check (`abilities.js`), the pose,
  the ride.
- **Its one rule is the claim's shape**: a string of 1 to 32 characters
  (`EX_MAX`), or nothing. The game's own claims are 16 characters at most
  (`parseFarmEx` refuses longer).
- **Not folded here, and why:** the fire's note (`ps._fireLit`,
  `moveclaims.js`) and the cook's plan (`ps._cookHits`, `gathering.js`) are
  notes beside the claim, each with its own writer, not phases.

## Step 1: nothing a player sees changes

Every claim the game sends passes whole, and the ends still write nothing
and zero the clock, as the old lines did. Only a value no phone of the game
sends changes: a number, an object, a list, an empty or overlong string now
reads as nothing, where the old line kept it and the tick relayed it to every
other phone.

## The wire, both ways

The shape on the wire does not change: the tick still carries `ex` as a
string or null, to a v2 phone and a v1 phone alike (`cook-door.test` §5). The
PR changes no file the phone runs, so:

- an older phone with this worker sends the same claims, which pass whole;
- a newer phone with an older worker is today's phone with today's worker.

No cap is needed.

## The switch

`exdoor: false` in the live flags takes any value a phone sends, as the line
before the door did (`msg.ex || null`). The ends still write nothing. The
worker's row is in card T's switch table.

## What the test fails

- a write of `.ex` anywhere in `server/src` but `_exTo` (an assignment, an
  update, a `delete`, an `Object.assign` naming it);
- a way with no caller, or a caller of a way the table has not got;
- a stamp that moves on the heartbeat, a claim that is no short string
  getting through, or getting to another phone on the tick.

It plays the claim through the real room: a cook, the heartbeat, every code
the game sends, an end, a linger, a take, and the tick to a v2 and a v1 phone.
