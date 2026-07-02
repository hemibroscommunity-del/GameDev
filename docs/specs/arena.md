# Gladiator Arena on the Duel Backbone (v2.3.1126) — spec + attach points

Wave 2 PR10. The arena becomes a server-refereed tournament built on the
duel machine; the old Arena DO is retired from routing (its class stays
exported for the wrangler binding, the marketplace.js precedent).

## The holes this closes

- **Results were client-claimed**: the old `POST /api/arena/result`
  trusted `{winnerId}` with zero verification — two colluding clients
  could trade fake wins for the Gladiator title.
- **No money ever moved server-side**: the 100g entry fee was debited
  locally, round/champion rewards and bet payouts were client-minted.

## How it works now (server/src/gladiator.js, GameRoom mixin)

- **Matches ARE duels.** The bracket manager activates a wager-0 duel
  per match, tagged `duel.arenaMatch = {tid, matchId}`; `_resolveDuel`
  notifies `_arenaOnMatchResolved` — kills, disconnect-grace forfeits,
  and shot-clock timeouts all funnel through server-observed duel
  resolution. `POST /result` is answered but **ignored**.
- **Shot-clock** (`duel.expiresAt`, resolved in `_tickDuels` — a generic
  duel-machine addition that also fixes the latent social-duel deadlock
  where a no-death duel blocked both players forever): 3 minutes per
  match; tiebreak = higher hp/maxHp fraction, coin flip on exact tie.
- **Bracket**: gathers up to 8 for 60s from the first join (starts early
  at 8); at the deadline starts with the largest power of two ≥2 and
  refunds the overflow; undersubscribed gathers cancel + refund. Matches
  within a round run concurrently (consent gates are per-pair). Offline
  player at activation = walkover; a player busy in another duel defers
  activation while their match clock runs (a stall can't deadlock the
  bracket).
- **Money**: entry 100g via `_escrowDebitGold` into
  `arena_entry:<tid>:<pid>` records; champion 2000g via `_creditPlayer`
  opId `arenapot:<tid>` (offline-safe). A deploy voids the tournament by
  design — the join-path sweep refunds orphaned entries, checking the
  pot's oplog stamp first (never refund over a payout). **Economics
  flag**: 2000g out vs ≤800g in mints up to 1,200g/tournament — an
  intentional prototype faucet; tune `ARENA.CHAMPION_REWARD`.
- **Healing disabled during matches** (`ps._arenaMatch`, set/cleared by
  activation/resolution): town HP regen (critical — 10% maxHp/670ms
  would make town fights unendable; HP only, stamina/mana still
  regen so blocking works), `eat_request`, shop `healFish`, and the cook
  heal buff are gated in index.js. Lifesteal needs no gate in v1 (town
  spawns no monsters).
- **Venue v1**: town + consent pairs — no new zone, no teleport (the
  server has no push-teleport and the anti-teleport gate rejects
  same-zone jumps). A dedicated non-lawless arena zone with zone-change
  teleport is the v2 path (handoff backlog).

## Wire surface

HTTP (worker routes `/api/arena/*` to the GameRoom; old response shapes
preserved so PartyPanel's polling renders unchanged; mutating responses
carry `settled: true`):

| Endpoint | Behavior |
|---|---|
| `POST /join {playerId, playerName}` | escrows 100g; `settled: true` |
| `POST /leave {playerId}` | refunds (gathering only) |
| `GET /status` / `GET /tournament` | queue + bracket in the old sanitizeTournament shape |
| `POST /result` | **ignored** (`ok:false, settled:true`) |

New server→client events (PRIVILEGED): `arena_match_start {matchId, tid,
round, opponentId, opponentName, deadline}` (private to the two
fighters), `arena_match_result {tid, matchId, round, winner, loser,
how}`, `arena_tournament_complete {tid, champion}` (broadcast).
`state_sync.caps` gains `arena: true` — gates the client's legacy entry
debit/refund and round/champion self-credit. The Gladiator title stays
client-granted for now (titles aren't server-owned — handoff backlog).

**Sponsorship/betting is PR-B2** (stretch/backlog): `arena_stake:` escrow
keys, 3× payout on server-observed results, stake-to-competitor on loss.
The legacy `arena_bet` relay remains cosmetic display only.

Deploy-order note: old client + new worker still self-credits phantom
rewards locally (stomped by the echo) and its `POST /result` is ignored —
but the bracket advances server-side regardless, so mixed-version
tournaments complete correctly.

## Tests

`server/test/arena.test.mjs` (23+ assertions, in `npm test`): entry
economics + double-join/broke rejects + idempotent leave refund,
undersubscribed cancel, overflow refund, duel-tagged activation with
consent pair + flags + private start events, server-kill resolution →
champion pot → entry cleanup → events → flag clears, concurrent 4-bracket
with timeout tiebreak and offline walkover, sweep orphan refund +
paid-pot protection, and (post-wiring) the healing gates.
