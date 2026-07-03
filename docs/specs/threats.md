# Threat Machine (red-skull PvP) — v2.3.1129

GDD §19 posture: a player THREATENS another in a safe zone; the target
gets a countdown and chooses **Ignore** (both may fight) or **Call
Guards** (the threatener is fined and gear-locked). Before this, the
system was an interim consent observer plus mostly-dead UI — three
code-verified breaks meant it never worked end-to-end:

1. Consent required `payload.accepted`, a field the client never sent
   (`ThreatIncomingPanel` sends `action: 'ignored'|'guards'`).
2. The threat popup did millisecond math on a countdown the handler
   defaulted to `120` (seconds) — a ~0.12-second bar.
3. The guards fine + gear lock were button copy only, and the 30-min
   threat cooldown lived in the threatener's own client.

Server code: `server/src/threat.js` (`_interceptThreat`,
`_tickThreats`, `_threatGearLocked`). Tests:
`server/test/threat.test.mjs`.

## Wire surface

The handshake stays a **relay** (the existing panel UI renders the
relayed messages) with the intercept-and-annotate pattern from
trades/duels — forged, expired, replayed, or cooldown-blocked halves
are dropped, never relayed.

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→relay | `pvp_threat` | `{target, from, fromName, fromLevel}` | Server stamps `countdown` (**ms**, authoritative — from SERVER levels, `fromLevel` is never trusted) + `settled: true`, then relays. |
| c→relay | `threat_response` | `{target, from, action: 'ignored'\|'guards'}` | Must match a pending threat. Server stamps `settled` (+ `levy` on guards) and relays — the relay drives the threatener-side popup. |
| s→c | `threat_penalty` | `{levy, lockUntil, by}` | Private to the fined threatener. |
| s→c | `threat_expired` | `{from\|target, attackable: true}` | Private to both when a countdown lapses unanswered. |
| s→c | `gear_locked` | `{until}` | Private, rate-limited (2s); sent when a gated equip mutator rejects. Accompanied by a `player_state` echo that snaps local equip mutations back. |

`threat_penalty` / `threat_expired` / `gear_locked` are in
`PRIVILEGED_EVENTS`. **No caps flag** — deliberate deviation: there is
no client self-credit path to gate; old and new clients send identical
messages (the client's countdown default fix keeps old workers
rendering sanely).

## Rules (`THREAT` config)

- Countdown = `2min + 2min × max(0, attackerLvl − targetLvl)`, capped
  at 10 min — higher-level gankers give their prey more response time.
- Threat cooldown 30 min, enforced server-side per threatener
  (in-memory: a relog resets it, which only buys more *spam* — the
  target can keep ignoring; the punishments are what persist).
- **Ignore / expiry** → the undirected consent pair (the same
  `_pvpAllowed` primitive duels use) for 10 min: both sides can fight
  in safe zones. Ignoring a threat is accepting the risk.
- **Call Guards** → threatener fined `floor(coins × 10%)` (a pure gold
  SINK, single mutation on live ps — the gamble pattern) + gear lock
  30 min. No consent granted.

## Gear lock

`gearlock:<pid>` in **storage** (a ps-only flag would make the
punishment "reload the page"); loaded into `ps._gearLockUntil` at
join. `_threatGearLocked` gates the four real equip mutators:

| Handler | What it blocks |
|---|---|
| `_handleEquipRequest` | stash ⇄ active weapon swaps |
| `_handleUnequipRequest` | weapon→stash, armor/shield/amulet→null |
| `_handleStatsUpdate` armor branch | armor swaps (the client's armorStash path) — gated inside the change-detection so identical re-sends don't spam notices |
| `_handleForgeWeapon` | forging (mints into the active slot) |

`shop_purchase` is deliberately ungated (SHOP_ITEMS are consumables
only) and so is the cosmetic `eqc/eql/eqs` move relay (peer-render
presentation, not the loadout). The gate re-echoes `player_state`,
which snaps back any local client equip mutation — the same
self-correction the armor-swap comment in `_handleStatsUpdate`
documents.

## Client changes (v2.3.1129)

- `gameEvents.js` `pvp_threat`: countdown default `120` → `120000`
  (bug 2 against old workers).
- `gameEvents.js` `threat_response`: reads `action` (the dead
  `accepted` branch removed); new `threat_penalty` / `threat_expired`
  / `gear_locked` handlers (popups only — coins move via the echo).
- Panels unchanged: their payloads were always correct.

## Attach points for successors

- **Skull rendering does not exist.** `S._pvpSkullType` /
  `S._pvpSkullUntil` are written (InspectPlayerPanel.jsx:367-368) and
  read nowhere; `S.rpg._threatState` (BroTown.jsx:2058-2059) is an
  orphaned stub. Red skull over an active threatener / white skull
  over an ignored one is pure client rendering fed by the relayed
  messages — no server work needed.
- **Bounty board**: guards fines currently evaporate (sink). A bounty
  pool per griefer (paid to whoever kills them) would reuse
  `_creditPlayer` + an oplog-stamped claim.
- The countdown/cooldown constants mirror
  `PVP_THREAT_BASE_COUNTDOWN` / `PVP_THREAT_COOLDOWN`
  (gameSystems.js:6849-6854) — keep in sync.
