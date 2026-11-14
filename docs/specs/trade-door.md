# The trade door (v2.3.5210)

`server/src/trade2.js` (`_t2To`, `TRADE_WAYS`); held by
`server/test/trade-door.test.mjs` and the phase table's guard
(`tools/guards/phase-table.test.mjs` §2, its `DOOR_SUITES` line, read off the
syntax tree). Card L PR 5, the first of the worker's phase doors, built as
the life door was (`docs/specs/life-door.md`).

## What it is

- **One field.** A trade session's phase is `s.state`. It is born `'open'` at
  the mutual open (the session literal in `_handleTrade2Open`), and ends
  `'done'` (the swap) or `'cancelled'`.
- **One writer.** `this._t2To(s, to, way)`. `way` is a row of `TRADE_WAYS`:
  `cancel` goes to `'cancelled'` (`_t2Cancel`: a decline, a leave, the idle
  sweep, a check that failed at the commit), and `swap` goes to `'done'`
  (`_handleTrade2Confirm`). A way names its own phase and no other.
- **Both ends are final.** A finished trade never changes its end: `_t2To`
  refuses a write over `'done'` or `'cancelled'`.
- **An invite is not a session.** It is a key of `_t2Invites`
  (`from>to` -> when), with its own TTL (`TRADE2.INVITE_TTL`), as before. The
  table's row says so; folding it in would change the handshake, which is
  not a step 1.

## Step 1: nothing a player sees changes

Both old lines wrote over `'open'` only:

- `_t2Cancel` kept its guard (`s.state !== 'open'` returns), which also
  decides the weapons' refund;
- the swap finds an open session (`_t2SessionFor`) and writes `'done'` in the
  same synchronous run, with no await between.

So the door's refusal of a finished phase never refuses anything today. The
suite plays every way a trade ends through the real room, and a cancel of a
done trade still sends nothing.

## The switch

`tradedoor: false` in the live flags lets `_t2To` write over a finished
phase, as the two old lines would have. It never lets a way go to another
way's phase. The worker's row is in card T's switch table.

## What the test fails

- a write of `.state` anywhere in `server/src` but `_t2To`, beside
  `NOT_A_TRADE`'s (the Durable Objects' own `this.state = state`, and a
  dungeon instance's `inst.state`, which is the `dungeon` row's machine);
- a stale `NOT_A_TRADE` entry;
- the session born open in more than one place, or either old line not
  through the door.

The guard reads the same off the syntax tree, so `Object.assign(s, { state })`
fails too.
