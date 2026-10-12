# Duel Machine (v2.3.1121, combat tuning v2.3.1302) — spec + attach points

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
  the opponent's stake) -- but since v2.3.3168 never MORE than the
  accepter was shown: a challenge whose stake is over the accept's echoed
  `wager` is refused (`duel_decline` to both, nothing escrowed). Only a
  `duel_wager_request` carries a stake; a plain `duel_request` is a
  no-stakes duel, as the game shows it. Both escrows debit inside one gated event; if
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
- v2.3.3185: the two stakes and the `duelEscrow:` record are ONE write
  (`_escrowDebitGoldTogether`, inbox.js; both purses checked first). They
  were three, and a restart after a stake but before the record lost it --
  the sweep refunds only what a record names. `duel.test.mjs` §7b crashes the
  start at every write (inbox-escrow.md "Writes that must commit together").

## Wire surface (for future UI)

| Message | Direction | Notes |
|---|---|---|
| `duel_request` / `duel_wager_request` | c→relay | `{target, fromName, wager}`; wager sanitized on relay |
| `duel_accept` | c→relay | relayed with `settled: true` + authoritative `wager` after activation |
| `duel_decline` | c→relay / s→c | also server-emitted to both sides on failed activation |
| `duel_end` | s→c | `{winner, loser, wager, how}` — PRIVILEGED (not client-forgeable) |
| `player_attack` | c→s | pre-existing PvP hit report, extended v2.3.1302: optional `kind: 'melee'\|'ranged'\|'staff'` (absent = melee, legacy behavior) + `special` |

## Combat tuning (v2.3.1302)

Owner's two-player duel report: only melee damage landed, and every
hit one-shot the target. Two independent bugs, fixed together in
`_resolvePvPAttack` (server/src/combat.js) + the projectile client:

- **Ranged/magic never reported.** Only the melee swing emitted
  `player_attack`; arrows and staff bolts collided only with monsters.
  `src/game/projectiles.js` now tests projectile collision against the
  intentional PvP target (duel opponent or tap-locked player — never a
  bystander, so a co-op partner can't stop a stray arrow) and reports
  the hit with `kind: 'ranged'|'staff'`. Server consent
  (`_pvpAllowed`) remains the authority.
- **Kind-aware range clamp.** The old flat 250px anticheat clamp
  silently rejected hits reported at projectile impact distance.
  `PVP_TUNING.RANGE_CAP`: melee 250 (unchanged, and the fallback for
  absent/unknown kinds — fails closed), ranged/staff 950 (the 900px
  arrow travel limit + lag slack).
- **PvP damage pass ("Both", owner decision 2026-07-15):**
  `dmg = dmgBase × crit × 0.5 × 100/(100+def)`. PvE dmgBase is
  balanced against monster HP pools, so raw specials one-shot player
  pools; def still exists server-side (clamped `lvl*20+100` in
  grids.js) even though PvE mitigation retired it in Phase 1 — PvP
  now consumes it. PvE damage math untouched.

Deploy-order safe both ways: old client + new server = no `kind`
field = melee clamp (today's behavior, but scaled); new client + old
server = `kind` ignored, distant hits rejected (today's behavior).

## Hardening pass (v2.3.1306 — adversarial review of the above)

A same-day repo-review of v2.3.1302 found the tuning had wired two
client-influenced inputs into wager-deciding outcomes. Fixes, all in
`_resolvePvPAttack` unless noted:

- **DEF_CAP 150 at consumption** (+ absolute clamp 2100 at the join
  ingest, `server/src/join.js`): `ps.def` is client-derived; the
  stats_update clamp was deliberately 4x legit max (sized for the
  retired Phase-1 formula) and the join path had NO upper bound —
  spoofed def bought near-immunity in wagered duels. Mitigation now
  tops out at 60%.
- **kind requires the matching server-known weapon** (`rangedWeapon`/
  `staffWeapon`, both `_sanitizeWeapon`-validated): a bare
  `kind:'ranged'` claim from a weaponless attacker falls back to the
  250px melee clamp instead of buying a 950px x PI*1.1 cone (most of a
  1024px lawless zone).
- **Per-(attacker,target) hit-cadence floor** mirroring the v2.3.1134
  monster lanes: normal hits >= 300ms apart, specials <= 3 per 1200ms
  (the staff heavy is a 3-bolt burst). In-memory only; a deploy wipe
  just re-opens the lane.
- **Optional `target` field on `player_attack`**: the projectile path
  declares its single intended target and the server skips everyone
  else in the cone — the "never a bystander" property is now enforced
  server-side, not just client-side. Absent = cone (melee/old clients).
- **Authoritative `died` flag on `pvp_hit`**: the target's local
  would-die prediction (stale hp across a 3-bolt burst) fed the
  attacker's pvpKills ledger via `pvp_confirmed`, both under-counting
  real kills and minting phantom ones past Second Wind. New clients
  prefer the flag; old clients ignore it.
- **Client, `gameEvents.js` duel_accept**: the CHALLENGER now gets
  `S._inDuel` (previously only the accepter set it, so the challenging
  side's attack gates only fired while tap-locked — half of the
  original "only melee hurt" report).

Known residual (documented, not fixed): `_maxDmgForAttacker`'s
`special:true` headroom (x2) plus post-cap crit means a forged
max-dmgBase special still hits far above an honest hit — pre-existing
cap posture, now bounded by the cadence floor and weapon gate rather
than eliminated. Re-deriving the cap is a balance task, not a patch.

Integration points in `index.js`: default-branch intercept (like
trades), `_duelOnDeath` in `_handlePlayerDeath` (before the pile),
`_duelOnDisconnect` in `webSocketClose`, `_duelOnRejoin` +
`_duelEscrowSweep` in the join path, `_tickDuels` beside
`_tickPlayerRespawn`. Threat-machine (red-skull) consent remains the
PR1 interim observer — deliberately deferred.

## v2.3.3168: no hidden stakes, and duel kills stay out of wars and bounties

Found by the overnight economy review (2026-10-12), both reproduced on main
in `duel.test.mjs` §15-§16:

- **A stake the accepter never saw.** The challenge map keeps only the
  challenger's latest challenge, and the accept escrowed its stake whatever
  the accepter's screen said. A plain `duel_request` (which the game opens
  as a no-stakes duel, its Accept echoing 0) could carry a stake, and a
  `duel_wager_request` re-sent with a bigger stake just before the press
  took the bigger number. Now a plain request is relayed and stored with
  stake 0, and an accept whose echoed `wager` is under the challenge's
  stake is refused before any gold moves. A stake at or under the echo
  (the honest case, or a challenger who LOWERED it) still duels at the
  challenge's number.
- **Duel kills scored clan wars and paid bounties.** `_warOnDeath`
  (clans.js) and `_bountyOnDeath` (threat.js) each skip a consensual duel by
  asking `_duelFor(killer)`, but `_handlePlayerDeath` ran them after
  `_duelOnDeath` had resolved the duel and removed it, so the check never
  matched. They are now skipped when the duel hook reports a clean duel
  kill (`_duelKill`); a kill by anyone else, or with no duel open, runs
  them as before. Arena matches ride the duel machine, so an arena kill is
  excluded too, as both hooks always intended.

## Tests

`server/test/duel.test.mjs` (in `npm test`): handshake +
escrow + gate registration, wager-inflation immunity, forged-accept
drop, poor-accepter refund, clean-kill pot/no-pile/no-wipe, monster-
death forfeit with normal death, reconnect grace + forfeit (including
both-away independent clocks, first-leaver-loses, and a `'__proto__'`
join id still arming a clock on the null-prototype away map), orphan
refund + settled-pot protection, zero-wager path, and the v2.3.1302
PvP resolution block (ranged kind lands at projectile distance,
0.5×+def-mitigated damage with exact expected values, no one-shot at
the old lethal dmgBase, legacy no-kind payload keeps the 250 clamp
but still lands in melee reach, 950 ranged cap intact, def-0
scale-only case), and since v2.3.3168 no hidden or switched stake (§15)
and no war point or bounty from a duel kill, driven through
`_handlePlayerDeath` (§16).
