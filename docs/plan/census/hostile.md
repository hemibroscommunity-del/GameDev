# The hostile values census (card K PR 3, v2.3.5183)

Made by `node server/test/wire-hostile.test.mjs --write` (cd server first:
`node test/wire-hostile.test.mjs --write`). Every `in` row of the wire table
and every route a phone may call, one field its `trust` names at a time,
each value of one closed list (the suite's header). A line is a case that
fails today; the suite's `LINE` is their count, and it only falls (the
plan's rule 3). Fix no handler from this page alone: card K's PR 4 (the
door's checks) lowers it, and each row's own fix after.

**19 failing cases** of 10524, on main 9fd5e58. By kind: a __proto__ kept in memory 17; value moved unexplained 1; a __proto__ stored 1.

## By row

| Row | Failing cases | Why |
|---|---|---|
| `move` | 16 | movement.js _handleMove keeps `vx`, `vy`, `d`, `f`, `eqc`, `eql` and `ex` on the record as sent (`ps.vx = msg.vx \|\| 0`, `ps.f = msg.f`): an object stays in memory, and rides the tick to the others |
| `chat_mute` | 2 | chatmod.js keeps the mutes in a list keyed by the target's id and stores `{ list: { ...doc } }`: a target named `__proto__` becomes an own key of the stored record |
| `character_reset` | 1 | not the handler: the honest restart (`confirm: true`) deletes the character, and the world's sum (worldsum.js) reads it as value gone with no burn written: card E's sum or card R's roads |

Not failing, and why: a frame of 1 MB is dropped by the router's size gate
before any handler (`MAX_INBOUND_BYTES`, v2.3.1618), silent by design for
every row; NaN cannot arrive in a frame or a JSON body (the parse refuses
it), so it is sent only as the text `NaN` in a query or a header.

## Every case

| Row | Field | Value | What happened |
|---|---|---|---|
| `move` | `vx` | key __proto__ | kept in memory: ps aaa.vx.__proto__ (an own key) |
| `move` | `vx` | key __proto__ deep | kept in memory: ps aaa.vx.a.b.0.__proto__ (an own key) |
| `move` | `vy` | key __proto__ | kept in memory: ps aaa.vy.__proto__ (an own key) |
| `move` | `vy` | key __proto__ deep | kept in memory: ps aaa.vy.a.b.0.__proto__ (an own key) |
| `move` | `ex` | key __proto__ | kept in memory: ps aaa.ex.__proto__ (an own key) |
| `move` | `ex` | key __proto__ deep | kept in memory: ps aaa.ex.a.b.0.__proto__ (an own key) |
| `move` | `d` | key __proto__ | kept in memory: ps aaa.d.__proto__ (an own key) |
| `move` | `d` | key __proto__ deep | kept in memory: ps aaa.d.a.b.0.__proto__ (an own key) |
| `move` | `f` | key __proto__ | kept in memory: ps aaa.f.__proto__ (an own key) |
| `move` | `f` | key __proto__ deep | kept in memory: ps aaa.f.a.b.0.__proto__ (an own key) |
| `move` | `eqc` | key __proto__ | kept in memory: ps aaa.eqc.__proto__ (an own key) |
| `move` | `eqc` | key __proto__ deep | kept in memory: ps aaa.eqc.a.b.0.__proto__ (an own key) |
| `move` | `eql` | key __proto__ | kept in memory: ps aaa.eql.__proto__ (an own key) |
| `move` | `eql` | key __proto__ deep | kept in memory: ps aaa.eql.a.b.0.__proto__ (an own key) |
| `move` | `eqs` | key __proto__ | kept in memory: ps aaa.eqs.__proto__ (an own key) |
| `move` | `eqs` | key __proto__ deep | kept in memory: ps aaa.eqs.a.b.0.__proto__ (an own key) |
| `character_reset` | `confirm` | boolean | value moved unexplained: gold -5000 copper_ore -20 wood_oak -10 fish_minnow -10 iron_bar -5 |
| `chat_mute` | `target` | "__proto__" | stored chat_mute:bp_hq_aaa.list.__proto__ (an own key) |
| `chat_mute` | `(any)` | (the row's cases) | kept in memory: room.chatMuteDocs<bp_hq_aaa>.__proto__ (an own key) |
