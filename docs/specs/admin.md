# Operator toolkit (v2.3.1148)

The owner-keyed admin surface + the daily save-snapshot ring. Plain-language
usage lives in `docs/OPERATIONS.md`; this file is the wire/storage contract.

## Auth

`Authorization: Bearer <ADMIN_KEY>` on every request. The key is the
`ADMIN_KEY` Worker secret (survives CI deploys). **Fail closed**: with no
secret configured the entire surface returns 404, indistinguishable from a
nonexistent route. Both strings are SHA-256 hashed before comparison (the
`_phraseHash` posture — makes `===` timing-safe).

Routing: `/api/admin/*` → the GameRoom DO, honoring `?room=` (default
`brotown-1`), same as `/api/market`. Auth is checked inside the DO.

## Endpoints

| Method + path | Body / params | Effect |
|---|---|---|
| GET `/overview` | — | sessions, players, occupied zones, tickRunning, eventBufferLen, protocol split |
| GET `/economy` | — | totalGold across `rpg:` blobs, top10 richest, open market orders + buy-side escrow, inbox backlog, H5 mint count, jackpot pool (when PR C lands) |
| GET `/player` | `?id=` | stored blob, live summary, online flag, auth record ts, frozen record, inbox count, snapshot keys |
| POST `/grant` | `{playerId, kind: gold\|item, payload, note, opId?}` | routes through `_creditPlayer` (rule 4) — online delivery or inbox parking for free. Response echoes the `opId`; pass it back on a retried curl to converge as `dup` (rule 5). Weapons deliberately unsupported v1 (stash-cap partial-drain complexity). |
| POST `/kick` | `{playerId, reason?}` | closes the live socket (code 4008) + drops the session |
| POST `/freeze` | `{playerId, note?}` | writes `frozen:<pid>`; kicks if online (code 4004). Frozen ids are rejected at join with `join_rejected {reason:'frozen'}` |
| DELETE `/freeze` | `?id=` | clears the gate |
| POST `/restore` | `{playerId, snapKey}` | 409 while online (kick first — deliberate). Saves the CURRENT blob as `rpgsnap:<pid>:prerestore-<ts>` BEFORE overwriting `rpg:<pid>` with the snapshot — recovery never destroys data. |
| GET `/log` | — | the capped (100) `admin_log` of mutating ops |

## Snapshot ring

On every join where a stored blob exists, `_rpgSnapshotMaybe` snapshots the
PRE-join blob (the state the player last logged out with) to
`rpgsnap:<pid>:<yyyymmdd>` — throttled to one per 20 h via `rpgsnap_at:<pid>`,
ring pruned to 7 per player. v2.3.1177: the daily and `prerestore-` key
classes prune to 7 **separately** — the original shared cap sorted both
classes together, and since `'p'` sorts after every digit the excess-slice
evicted the oldest REAL daily snapshots first while prerestore copies lived
forever (inverting the rollback-parachute intent). Cost:
one get + two puts + one small list per player per day. Snapshots never block
a join (best-effort try/catch).

## Client contract change

`join_rejected` now carries meaningful `reason` values: `'auth'` (the
v2.3.1116 behavior — client mints a fresh identity once) and `'frozen'`
(client shows a frozen banner, stops reconnecting, and must NOT mint — the
old handler minted on ANY rejection, which would have turned a freeze into
accidental freeze-evasion + character abandonment). Unknown future reasons
fail safe (no mint). Close code 4004 also suppresses auto-reconnect.
Caveat: clients on stale cached bundles still mint on freeze — the operator
can freeze the successor id; acceptable at prototype scale.

## Storage keys (registered in ARCHITECTURE-HANDOFF rule 2)

| Prefix | Value |
|---|---|
| `frozen:<pid>` | `{ts, note}` join gate |
| `rpgsnap:<pid>:<yyyymmdd>` | daily blob snapshot |
| `rpgsnap:<pid>:prerestore-<ts>` | pre-restore safety copy |
| `rpgsnap_at:<pid>` | snapshot throttle timestamp |
| `admin_log` | capped ring of mutating admin ops |

## Scale caveat

`/economy` does full-prefix `list()`s. Fine at room scale (tens–hundreds of
blobs; SQLite-backed DO, input gate serializes). Revisit with maintained
aggregate keys if a room ever holds thousands of blobs.
