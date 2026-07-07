# Duel Machine (v2.3.1121) — spec + attach points

PR6 of the heavy-systems architecture plan. Duels are a real server
state machine now: challenge → accept → active → resolved, with wager
escrow that survives worker deploys.

## What this fixes

- **UI duels never earned consent.** The live duel button sends
  `duel_wager_request`; the PR1 interim observer only knew
  `duel_request`, so UI-initiated town duels couldn't actually fight.
  Both request types work now.
- **Wagers were pure UI.** The accept popup said "winner takes all" but
  no gold ever moved. Both wagers are now debited at accept (idempotent
  PR2 escrow), the pot persists in `duelEscrow:<id>` storage, and the
  winner is paid via `_creditPlayer` — online or by mail.
- **Duel deaths were full deaths** — death pile + inventory wipe, in
  town, from a consensual fight, despite the popup promising "No item
  loss." A clean duel kill (cause `pvp:<opponent>`) now skips both.
- **Disconnect ≠ instant forfeit.** iOS tab suspends and deploy bounces
  are routine; a 15s reconnect grace runs before the pot forfeits.
  v2.3.1175: the grace clock is **per player** (`duel.away = {pid:
  deadline}`) — previously a single `awayId` slot, so if both players
  dropped, the second disconnect overwrote the first and a lone rejoin
  left the duel stuck 'active' forever, blocking both from new duels
  (handoff item L). Both clocks expired = the first leaver forfeits.

Dying to a **monster** mid-duel still resolves the duel (opponent takes
the pot — no suiciding out of a losing wager) but is a normal death.

## Machine rules (server/src/duel.js, GameRoom mixin)

- Challenge: `duel_request` / `duel_wager_request` from the challenger's
  own session; wager sanitized; 2 min TTL. One duel per player.
- Accept: valid only against a live challenge from the other side. The
  **challenge's wager is authoritative** (an edited accept can't inflate
  the opponent's stake). Both escrows debit inside one gated event; if
  the accepter can't pay, the challenger's already-taken wager refunds
  and both sides get `duel_decline`. On success the relayed accept
  carries `settled: true` + the authoritative `wager`, and the pair is
  registered in the PvP damage gate (`_pvpAllowed`).
- Resolution (`_resolveDuel`): status flips synchronously
  (double-resolution guard), consent pair cleared, `duel_end
  {winner, loser, wager, how: kill|death|forfeit}` broadcast, pot paid
  via opId `duelpot:<id>`, escrow record deleted.
- Crash safety: the stale-escrow sweep (join-path, rate-limited) refunds
  both sides of orphaned records >10 min old — but checks the
  `duelpot:<id>` oplog stamp first, so a crash between pot-credit and
  record-delete can never double-pay.

## Wire surface (for future UI)

| Message | Direction | Notes |
|---|---|---|
| `duel_request` / `duel_wager_request` | c→relay | `{target, fromName, wager}`; wager sanitized on relay |
| `duel_accept` | c→relay | relayed with `settled: true` + authoritative `wager` after activation |
| `duel_decline` | c→relay / s→c | also server-emitted to both sides on failed activation |
| `duel_end` | s→c | `{winner, loser, wager, how}` — PRIVILEGED (not client-forgeable) |

Integration points in `index.js`: default-branch intercept (like
trades), `_duelOnDeath` in `_handlePlayerDeath` (before the pile),
`_duelOnDisconnect` in `webSocketClose`, `_duelOnRejoin` +
`_duelEscrowSweep` in the join path, `_tickDuels` beside
`_tickPlayerRespawn`. Threat-machine (red-skull) consent remains the
PR1 interim observer — deliberately deferred.

## Tests

`server/test/duel.test.mjs` (25 assertions, in `npm test`): handshake +
escrow + gate registration, wager-inflation immunity, forged-accept
drop, poor-accepter refund, clean-kill pot/no-pile/no-wipe, monster-
death forfeit with normal death, reconnect grace + forfeit (including
both-away independent clocks, first-leaver-loses, and a `'__proto__'`
join id still arming a clock on the null-prototype away map), orphan
refund + settled-pot protection, zero-wager path.
