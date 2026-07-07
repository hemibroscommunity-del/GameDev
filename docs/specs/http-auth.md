# HTTP economy-endpoint auth (session tokens) — v2.3.1176

## The hole this closes

Player ids are **public**: every client in the room sees every other
player's id in `player_join` / `track` broadcasts and the leaderboard.
The GameRoom's mutating HTTP endpoints — `POST /api/market/place`,
`DELETE /api/market/cancel`, `POST /api/arena/join`, `POST
/api/arena/leave` — trusted the request's `playerId` and gated only on
"is that player online in this room". That authenticated nothing:

- **Item theft (P0):** `/api/market/place {type:'sell',
  playerId:<victim>, stashIndex:0, price:1}` escrows the weapon out of
  the SERVER's own copy of the victim's stash (the very design that
  makes forged `item` blobs harmless made forged `playerId`s lethal).
  The attacker then buys the 1g listing with their own account.
- **Forced debits:** a forged `/api/arena/join` takes 100g from any
  online player; forged `cancel`/`leave` delist/dequeue a victim
  (refunds land with the victim — griefing, not theft).
- **Leaderboard forgery:** public `POST /api/leaderboard/update` wrote
  arbitrary rows for arbitrary ids.

## Design

**Token mint.** `_handleJoin` calls `_httpAuthMint(session, msg)`
(httpauth.js): a `crypto.randomUUID()` stored on the live session
object. Delivered ONLY to the joining socket inside its `state_sync`
(`httpToken` top-level field, advertised by `caps.httpAuth`). The
v2.3.702 same-id eviction guarantees one live session — one valid
token — per player id, and a rejoin rotates it.

**Client attach.** The client stores the token as `S._httpToken`
(wsClient.js `state_sync` case) and attaches it as the `x-bt-auth`
header on the four mutating calls (ExchangePanel place/cancel,
PartyPanel arena join/leave). It also declares `httpAuth: true` on its
`join` message.

**Server check.** `_httpAuthCheck(playerId, request)` (httpauth.js),
called at the top of the four endpoint branches before any
escrow/debit:

| Case | Result |
|---|---|
| no live session for `playerId` | reject |
| header present, matches that session's token | allow |
| header present, wrong | reject (always — even legacy sessions) |
| no header, session declared `httpAuth` on join | reject |
| no header, legacy session (no declaration) | allow (grace window) |

Rejections return `403 {ok:false, settled:true, error:'Not
authorized'}` — `settled:true` so no capable client runs a legacy
self-credit fallback off the error.

**Leaderboard.** No client has posted `/api/leaderboard/update` since
the GameRoom began reporting server-side (`reportToLeaderboard` on
track/join, straight through the DO binding). The public router in
`server/src/index.js` now forwards only `GET` to the Leaderboard DO
(405 otherwise); the internal binding path bypasses the router and is
unaffected.

## Deploy-order safety (rule 19)

- **New client + old worker:** worker ignores `httpAuth` on join and
  sends no `httpToken`; the client attaches no header (it only attaches
  a token it actually received). Everything works.
- **Old client + new worker:** the session never declared `httpAuth`,
  so tokenless requests ride the grace row above. Works until the
  browser picks up the new client — the exposure window decays to zero
  as cached clients refresh.
- **Enforcement follows the VICTIM's session**, not the requester's
  client: the declaration is made on the victim's own socket at join,
  so an attacker cannot downgrade a new-client victim by "being" an old
  client. A registered (`bp_` + passphrase) victim's id also cannot be
  re-joined by the attacker to mint a token for it — the v2.3.1116
  identity gate rejects that join before the mint.

## Storage / lifetime

No storage keys. Tokens are session memory: a worker deploy wipes
sessions, clients auto-reconnect, fresh tokens arrive with the new
`state_sync`. Nothing to sweep, nothing to expire.

## Wire surface

| Direction | Message/endpoint | Change |
|---|---|---|
| c→s | `join` | new optional `httpAuth: true` declaration |
| s→c | `state_sync` | new `httpToken` (string) + `caps.httpAuth` |
| c→s | market place/cancel, arena join/leave | new `x-bt-auth` request header |
| public router | `/api/leaderboard` | GET-only (405 otherwise) |

## Tests

`server/test/httpauth.test.mjs`: token delivery + per-session
uniqueness, forged place/cancel/arena-join/leave rejected with no
escrow/debit, owner's token succeeds, legacy grace (tokenless works,
wrong token never), rejoin rotation, leaderboard router read-only.
