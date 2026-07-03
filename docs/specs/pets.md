# Server-Validated Pet Capture — v2.3.1130

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

`pet_capture_result` is in `PRIVILEGED_EVENTS`. Capability:
`state_sync.caps.pets` — gates MenuBar's local roll (kept as the
old-worker fallback). The pet itself reaches the client via the
authoritative `lifeSkills` echo — the client's per-key merge adopts
it, which turns the old "echo stomps my pets" bug into the intended
authoritative flow.

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
  ids regenerated. **Forgery ceiling: six cosmetic pets** — pets touch
  no server-authoritative number (their loot-vacuum coins were always
  stomped by the echo).

## Attach points for successors

- **Pet evolution/enchant** (`PetHousePanel.jsx`, `evolvePet`) is
  still client-side blob-editing — same sanitize-on-join posture
  applies; a server `pet_evolve` handler would follow this module's
  pattern.
- **The pet loot vacuum** (`BroTown.jsx:3542-3594`) adds coins
  client-side that the echo stomps — pure theatre today. Making pets
  economically real means a server-side pickup grant (the
  `loot_pickup` path already exists; route the vacuum through it).
- `bt_sync_rpg` RPC (networking/index.js:78-101) lists pets in its
  synced subset but has **no handler in the game DO** — profile-DB
  only; don't mistake it for game-authoritative sync.
