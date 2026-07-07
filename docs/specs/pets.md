# Server-Validated Pet Capture — v2.3.1130 (+ loot vacuum v2.3.1200)

The Dungeon of client theatre's last resident: pet capture ran
entirely in `MenuBar.jsx` (local HP gate, the player's own
`Math.random()` roll, self-awarded trapping XP, locally minted pet) —
and two things were worse than the backlog assumed: **traps were never
consumed** (sold server-side, spent by nothing), and the "captured"
monster only died on the capturer's own screen while the authoritative
monster kept attacking. The server now owns the attempt end to end.

Server code: `server/src/pets.js` (`_handlePetCapture`,
`_sanitizePets`, `_petsAdoptOnJoin`). Tests: `server/test/pets.test.mjs`.

## Wire surface

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→s | `pet_capture` | `{monsterId}` | Explicit case. Zone = the sender's `ps.z`. |
| s→c | `pet_capture_result` | `{captured, pet?, chance?, error?}` | Private. Error codes: `no-monster`, `too-healthy`, `too-far`, `slots-full`, `no-trap`, `not-now`. |
| c→s | `loot_pickup` | `{lootId, zone, viaPet: true}` | v2.3.1200 vacuum — the EXISTING pickup case with one extra flag; answered by the existing `loot_credit` (now carrying `viaPet`) / `loot_pickup_rejected` (new reason `no-pet`). No new event types. |

`pet_capture_result` is in `PRIVILEGED_EVENTS`. Capability:
`state_sync.caps.pets` — gates MenuBar's local roll (kept as the
old-worker fallback). The pet itself reaches the client via the
authoritative `lifeSkills` echo — the client's per-key merge adopts
it, which turns the old "echo stomps my pets" bug into the intended
authoritative flow.

## Pet loot vacuum — v2.3.1200

The §18.1 client vacuum (`BroTown.jsx`) used to self-credit
coins/shards for worker-owned piles that the next `player_state` echo
stomped — pure theatre. It now routes through the REAL loot path:

- **Client** (gated on `state_sync.caps.petLoot`): when the active
  pet's vacuum radius (`PET_LOOT_RADIUS`, 80 px) touches a
  `_serverLoot` pile, the client sends the normal `loot_pickup`
  request with `viaPet: true` and waits for `loot_credit` — sharing
  `_pickupPending` (+ the 5 s watchdog) with the manual walk-over path
  in `groundLoot.js` so pet and player never double-send. Without the
  cap (old worker), the legacy self-credit vacuum stays — harmless,
  stomped as ever (deploy-order safety).
- **Server**: `_handleLootPickup` (index.js) treats a `viaPet` pickup
  IDENTICALLY to a manual one — same pile-exists / per-player
  `claimedBy` claim flags / recipient list / death-drop windows / share
  math / despawn bookkeeping — so double credit against a manual
  pickup is impossible (one shared `claimedBy` map). Two deltas only:
  the sender must have a server-known active pet (`lifeSkills.pets` +
  `activePet`, else reject `no-pet`), and the range gate is
  `PETS.VACUUM_RANGE` (240 px) instead of `LOOT_PICKUP_RANGE` (160).
- **Range is measured from the OWNER's server-known position** — the
  server does not track pet position (`S._petX/_petY` is client-only
  cosmetics), so the owner's spot plus a modestly larger radius stands
  in for the pet: the pet's trigger point sits up to ~130 px from the
  player (≤50 px follow orbit + 80 px `PET_LOOT_RADIUS`) where the
  manual trigger is 20 px, so +80 px keeps the v2.3.1161 lag/magnetism
  slack without enabling cross-screen theft.
- `loot_credit` carries `viaPet: true` back so the client renders the
  pickup at the pet, skips the manual-pickup movement freeze, and keeps
  the legacy `petLootCount` quest tally ticking (`_applyLootCredit`,
  wsClient.js).

## Rules (`PETS` config — mirrors the client constants)

- Monster must exist in the sender's zone, be alive, at ≤20% of the
  **server's** hp, and within 200px of the player.
- ≤6 pets (server copy of the list).
- **One `basic_trap` consumed per attempt** — the vendor item finally
  matters (new 20g sink). Validation ALL happens before consumption:
  a rejection costs nothing; only a real roll spends the trap.
- Chance = `0.4 + trappingLvl×0.005 + woodcuttingLvl×0.002 −
  max(0, monsterLvl − playerLvl)×0.05`, clamped [0.1, 0.95] — the
  client's exact formula, from SERVER skill levels.
- The server is now the trapping-XP writer (+5 escape, +15+2·lvl
  capture) — the previously client-only skill converges over time.
- Success **removes the monster for everyone**: `alive=false`,
  normal `RESPAWN_TIME` respawn (dungeon-instance monsters honor
  `noRespawn` — a captured wave member counts as cleared). No loot,
  no XP/gold shares, no quest credit: a capture is not a kill.

## Join-time sanitization + legacy adoption

`_petsAdoptOnJoin` runs at every join:

- Sanitizes whatever pets the server already holds (old bootstraps
  took `rpgLifeSkills` wholesale, unvalidated).
- One-time adoption: if the server has **no** pets on record and the
  client brought some, the sanitized list is adopted — existing
  players keep their client-side captures. A non-empty server list
  always wins.
- `_sanitizePets`: cap 6; archetype whitelisted against `ARCHETYPES`
  (else fodder), level 1..100, element whitelisted, name ≤24 chars,
  emoji ≤8, personality whitelisted, color must be a hex literal,
  ids regenerated. **Forgery ceiling: six cosmetic pets** — since
  v2.3.1200 an active pet also widens the owner's loot-pickup radius
  to `PETS.VACUUM_RANGE` (that's the feature, not a leak: the wider
  radius only reaches piles the player is already a recipient of).

## Attach points for successors

- **Pet evolution/enchant** (`PetHousePanel.jsx`, `evolvePet`) is
  still client-side blob-editing — same sanitize-on-join posture
  applies; a server `pet_evolve` handler would follow this module's
  pattern.
- ~~The pet loot vacuum~~ — DONE v2.3.1200 (see the vacuum section
  above): routed through the real `loot_pickup` path under
  `caps.petLoot`; the client self-credit stays as the old-worker
  fallback only.
- `bt_sync_rpg` RPC (networking/index.js:78-101) lists pets in its
  synced subset but has **no handler in the game DO** — profile-DB
  only; don't mistake it for game-authoritative sync.
