# The hostile values census (card K PR 3, v2.3.5183)

Made by `node server/test/wire-hostile.test.mjs --write` (cd server first:
`node test/wire-hostile.test.mjs --write`). Every `in` row of the wire table
and every route a phone may call, one field its `trust` names at a time,
each value of one closed list (the suite's header). A line is a case that
fails today; the suite's `LINE` is their count, and it only falls (the
plan's rule 3). Fix no handler from this page alone: card K's PR 4 (the
door's checks) lowered it, and each row's own fix after.

**1 failing cases** of 10524. By kind: value moved unexplained 1.

v2.3.5183 (main 9fd5e58): 19. v2.3.5184 (card K PR 4): the wire door
(`server/src/wire/door.js`) drops a key named `__proto__`, `constructor`
or `prototype` at any depth before any handler, which took `move`'s 16
(movement.js kept `vx`, `vy`, `d`, `f`, `eqc`, `eql`, `eqs` and `ex` as
sent); chatmod.js answers a mute of `__proto__` unchanged, which took
`chat_mute`'s 2. With `wiredoor: false` the count is 19 again
(`WIRE_HOSTILE_DOOR=off`, the plan's rule 4).

## By row

| Row | Failing cases | Why |
|---|---|---|
| `character_reset` | 1 | not the handler: the honest restart (`confirm: true`) deletes the character, and the world's sum (worldsum.js) reads it as value gone with no burn written: card E's sum or card R's roads |

Not failing, and why: a frame of 1 MB is dropped by the router's size gate
before any handler (`MAX_INBOUND_BYTES`, v2.3.1618), silent by design for
every row; a frame the wire door drops is silent by design too (its code
`door`); NaN cannot arrive in a frame or a JSON body (the parse refuses
it), so it is sent only as the text `NaN` in a query or a header.

## Every case

| Row | Field | Value | What happened |
|---|---|---|---|
| `character_reset` | `confirm` | boolean | value moved unexplained: gold -5000 copper_ore -20 wood_oak -10 fish_minnow -10 iron_bar -5 |
