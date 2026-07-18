# Character Restart (self-service) — v2.3.1347

Owner playtest request (2026-07-17): "Players should be given chance to
restart their character with a confirmation screen (begin at lvl 1)."

## What it does

Settings → **Restart character — start over at Level 1** (red drill row)
→ in-panel confirmation screen (explicit "deleted forever" copy, red
confirm button) → the character restarts at Level 1. Identity survives:
the Login Key, device nonce, display name, friends, clan, block/mute
lists are all kept. Only the CHARACTER (level, T2 build, items, gold,
skills, quests, codex/bestiary caches) resets.

## Wire contract

- Client → server: `character_reset { confirm: true }` (wsClient
  channelShim passthrough; `confirm !== true` is a server no-op, so a
  stray/forged send without the flag does nothing).
- Server (`server/src/persistence.js _handleCharacterReset`):
  1. Parachute snapshot of the current blob to
     `rpgsnap:<pid>:prereset-<ts>` — same registered prefix as the
     admin daily snapshots, so the operator can undo any restart via
     the existing admin `/restore` flow.
  2. `delete rpg:<pid>` from DO storage.
  3. Ack `character_reset_done` (in `PRIVILEGED_EVENTS` — server-emitted
     only; a forged one would wipe another player's local caches).
  4. Evict the session (admin-freeze pattern: `sessions.delete` first,
     then `close(4005)`) and drop the in-memory playerState so no later
     handler can `_saveRpg` the old state back over the wipe.
- Client on `character_reset_done` (wsClient.js): wipe the
  per-character localStorage caches (`bt_rpg bt_stats bt_codex
  bt_bestiary bt_materials bt_zones bt_resume`; KEEP `bt_passphrase`,
  `bt_passphrase_prev`, `bt_device` and the social keys) and
  `location.reload()`. Close code 4005 suppresses the auto-reconnect so
  it can't race the reload.
- The rejoin finds no stored blob → join.js first-connect bootstrap
  from the now-empty client payload → fresh Level-1 character. The
  `auth:<pid>` first-join lock is untouched, so the same Login Key
  keeps working.

## Failure modes

- Not connected: the Settings flow refuses ("no connection") — a
  local-only wipe would just restore from the server blob on rejoin.
- Ack lost mid-flight: 8s fallback reload; whether the server processed
  the delete decides what the rejoin loads (either fully reset or fully
  intact — never half).
- Old worker (deploy-order window): the message relays harmlessly and
  no ack arrives → fallback reload, character intact.

## Tests

`server/test/persistence.test.mjs` §7: no-op without confirm, blob
deleted + snapshot written + ack + eviction, auth survives, rejoin
bootstraps fresh Level 1.
