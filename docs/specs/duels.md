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

## Leaving the zone (v2.3.4371)

Owner, 2026-11-10: *"A dueller who walks into a dungeon or onto their farm
mid-duel forfeits after 15 seconds, the same as closing the app."*

- No blow crosses zones (combat.js walks only the attacker's zone), so a
  duel split across two zones could only end on the 10-minute clock: both
  players without HP regen and with the bag fight-locked (no shop, market,
  trade or ride) all that time, and with a stake, one blow then a hide in an
  empty `dungeon:` id won the pot on the timeout's HP comparison (state-
  machine sweep 2026-11-03, S5-2 and S5-13).
- **The hook**: every server write of a player's zone calls
  `_duelZoneMoved(pid)` (duel.js) right after it: the `move` handler
  (movement.js; this is also how a dungeon start, a party pull and the farm
  trip move a player, since the phone zones in on its own `move`), a join's
  new playerState (join.js), the respawn (index.js) and the sparring clones
  (spar.js). `duel-zone.test.mjs` §7 scans `server/src` and fails for a
  zone writer that does not call it.
- **The clock is the disconnect's**: `duel.away[pid]` with `GRACE_MS`, so
  `_tickDuels` forfeits it through the one `_resolveDuel` and a wager pays
  through the one `duelpot:<id>` opId. There is no second payment path.
  `duel.awayZone[pid]` (null-prototype, like `away`) marks the clocks a
  zone started: being in the same zone again clears only those (never a
  disconnect's), and a rejoin into the other zone keeps the clock running.
  The player whose move split the duel is the leaver; the foe following
  them in, or their coming back, clears it. A running clock keeps its
  deadline (stepping in and out, or closing the app from the dungeon, does
  not give a fresh 15 s). Both away: the first leaver loses, as with two
  disconnects.
- **Arena matches are left alone**: a fighter who changes zone starts no
  clock; the match is decided by its own 3-minute clock's HP tiebreak, as
  before (`duel-zone.test` §6).
- **Kill switch**: live flag `duelzone: false` (`_duelZoneOff`, declared in
  duel.js): no zone starts a clock, today's behaviour before v2.3.4371; a
  clock already running is cleared at the next zone write.
- **The lesson** (would be a TRAPS entry): "the disconnect clock covers a
  player who leaves" was believed for a year (the accept's own comment said
  so), and only a disconnect ever started it. A rule about *where a player
  is* must hang on every write of the place, not on the one road that was
  in mind; hence the scan in §7.

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

## v2.3.4361: the phantom duel (phone side)

Found by the state-machine sweep (2026-11-03, V6). Tapping Accept marked the
accepter's phone "in a duel" before the worker agreed, and only `duel_end`
ever cleared it. A refused accept (the worker's silent drop for a stale or
busy challenge, or its declineBoth) left the phone in a duel that did not
exist until a reload, and in No man's land every melee swing of it was an
untargeted player attack: a bystander hit, a red skull.

- **A duel's melee swing names its foe** as `target` on `player_attack`
  (`monsterCombat.js`, `duelPending.js duelSwingTarget`), as the bow and staff
  already did, so the worker lands it on that player only. Outside a duel a
  swing keeps its cone, as before.
- **The accepter's duel is pending until its own settled echo.** The tap still
  shows "DUEL!" and the lock at once (`enterPendingDuel`); the worker's settled
  `duel_accept` reaches every phone, the accepter's included, on v1 and v2
  (`duel-pending.test` §1), and settles it (`settleOwnAccept`). Unsettled after
  `DUEL_PENDING.SETTLE_MS` (8 s), the frame update (`targeting.js`) drops it and
  its lock and says "Duel did not start". A duel live when a second card was
  accepted is put back.
- **A `duel_decline` from that challenger** (declineBoth) drops a pending duel
  at once. A settled duel is never ended by a decline.

Not changed then (the worker; left for later): the silent drops in `duel.js`
still answered nothing (the phone's clock covered them; answered since
v2.3.4442, below), and a duel that ENDS while the
phone is away or a deploy wipes the worker's duels is still kept by the phone
until a reload: clearing a settled duel at state_sync must ship with the
worker re-sending a live duel, or every network blip would lose one. The
melee `target` above defangs that phantom (no bystander is hit) but does not
end it. Tests: `server/test/duel-pending.test.mjs`.

## After a rejoin (v2.3.4382)

The follow-up the section above left: the phone kept its duel across a
reconnect and the worker never said whether it was still on (sweep V6 N2-18
and "the reverse of the phantom"; review R2 W1.3). Now the party's shape:

- **The worker says it again.** Right after `state_sync`, to the joining
  socket only, a live social or wagered duel is sent as `duel_resume`
  `{foe, foeName, wager}` (PRIVILEGED; the phone's direct switch, refused when
  relayed). An arena match is left to the arena's own `arena_match_start`
  re-send (`_arenaOnRejoin`). Sends only: no storage write.
  (`server/src/rejoinresend.js`)
- **The phone clears at `state_sync`** `_inDuel`, `_activeDuel` and a lock on
  a player, ONLY when `caps.rejoinResend` is 1 or more; the re-send puts back
  what is live, silently (it started before). So a duel that ended while the
  phone was away (the 15 s forfeit, a server update) is gone on return, and a
  phone back inside the 15 s is in it again. An old worker (no cap): the
  phone keeps its duel as before. (`src/game/rejoinSlots.js`)
- **The cap** `rejoinResend` is a COUNT of the slots the worker re-sends (1
  the duel, 2 the trade), growing as slots join (TRAPS §9). **The kill
  switch** `rejoinresend: false` in the live flags: no re-sends, the cap
  un-advertised, so phones clear nothing new.
- **The registry**: `REJOIN_SLOTS` in `rejoinSlots.js` lists every slot the
  phone clears at `state_sync` and the worker method that says it again (the
  party, the ride, the trade's invite, the duel, the arena, the trade window,
  and since v2.3.4415 your own held pose, cleared at every `state_sync`
  because no worker keeps one across a join); `REJOIN_NOT_YET` names the ones
  still left (none since v2.3.4628: the duel challenge card has the worker's
  own 2-minute clock, `duelPending.js DUEL_CARD`, mirror of
  `DUEL.CHALLENGE_TTL`, and closes itself when the challenge runs out, saying
  "Duel challenge expired"; `duel-pending.test` §7). `rejoin-resend.test` §6 fails a clear with no row, and a
  row whose re-send is not called after `state_sync`.

The lesson (for TRAPS): a phone copy of a worker session is cleared at
`state_sync` only together with a worker re-send after it, gated on the cap
that says the worker re-sends it; one without the other is either a phantom
(clear missing) or a lost live session on every network blip (re-send
missing). Tests: `server/test/rejoin-resend.test.mjs`.

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

## v2.3.4442: a refused accept is answered

The two silent drops in `duel.js`'s accept now send `duel_decline`, so the
accepter's card closes at once instead of after `DUEL_PENDING.SETTLE_MS`:

- **One side already in a duel:** a real challenge exists and both pressed a
  button, so both are told (`declineBoth`). The running duel is untouched.
- **No live challenge** (older than `CHALLENGE_TTL`, 2 min, or never real):
  only the accepter is told. Nothing proves the named player challenged, so
  telling them would let a tampered phone send "Duel declined" to anyone it
  names (TRAPS §313).

Test: `server/test/duel-drops.test.mjs`.
