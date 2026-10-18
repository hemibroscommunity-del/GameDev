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
  2. `delete rpg:<pid>` from DO storage. The other records keyed by the
     player id go with it (`_resetCharacterData`): the quest-reward stamps
     (`oplog:questitem:<pid>:`, v2.3.2421), the gear record `gear_prov:<pid>`
     (v2.3.2537), the farm `farm:<pid>` (v2.3.3127: its beds and crops were
     bought with the gold and skills that reset; the next visit to the Feed &
     Seed hands out the free deed again), the pets `pets:<pid>` (v2.3.3120)
     and the monster codex `codex:<pid>` (v2.3.3209), each with its cache;
     the player leaves their party (v2.3.3284), and the server forgets where
     it last had them (v2.3.3327). Only `rpg:` is snapshotted.

     KEPT (listed v2.3.3373 from the code, `_resetCharacterData` deleting
     none of them):
     - `auth:<pid>` -- the identity: the Login Key, its devices, its keys;
     - `farmorders:<pid>` -- the day's order board: its done flags are the
       day's limit, and deleting it let one player id deliver the same three
       orders again after every restart (v2.3.3134);
     - `guild_claims:<pid>` -- the guild ladder's claims, kept the same way: a
       rung is paid once to a player id;
     - `daily_rewards:<pid>` -- the same: the day's free spin and quests are
       the day's limit, and an open spin pot is gold at rest; the season's
       stars and claimed tiers stay with it;
     - `nml_state:<pid>` -- a No man's land skull's time is not shed by a
       restart;
     - `cadence:login:<pid>` (the login streak), `harden_ledger:<pid>` (the
       hardening history), `friends:`, `chat_mute:`, `bro_link:` -- the
       player's, not the character's;
     - `inbox:<pid>` -- mail waiting is delivered at the next join, to the
       restarted character;
     - `rpgsnap:<pid>:` -- the snapshots, so the owner can undo a restart;
     - `botstat:<pid>`, `device:` -- the anti-bot evidence.
  3. Ack `character_reset_done` (in `PRIVILEGED_EVENTS` — server-emitted
     only; a forged one would wipe another player's local caches).
  4. Drop the in-memory playerState FIRST, so no later handler can
     `_saveRpg` the old state back over the wipe -- then the player leaves
     the AFK sweep's way (v2.3.3374): `close(4005)`, `webSocketClose` now,
     the session gone. The others are told `player_leave`, an open trade
     window or duel ends as on any disconnect, and the last one out stops the
     room's tick. (It deleted the session first, the admin freeze's old way:
     the runtime's own close found nothing, nobody was told, and the tick ran
     on in an empty room -- TRAPS §217.)
- Client on `character_reset_done` (wsClient.js): wipe the
  per-character localStorage caches (`bt_rpg bt_stats bt_codex
  bt_bestiary bt_materials bt_zones bt_resume`; KEEP `bt_passphrase`,
  `bt_passphrase_prev`, `bt_device` and the social keys) and
  `location.reload()`. Close code 4005 suppresses the auto-reconnect so
  it can't race the reload.
- The rejoin finds no stored blob → a new character from the server's
  own defaults (join.js; since v2.3.3138 the payload is not read at all,
  `docs/specs/fresh-start.md`) → fresh Level-1 character. The
  `auth:<pid>` first-join lock is untouched, so the same Login Key
  keeps working.

## Failure modes

- Not connected: the Settings flow refuses ("no connection") — a
  local-only wipe would just restore from the server blob on rejoin.
  - v2.3.1424: the refusal gate no longer trusts `S._realtimeStatus`
    (a shadow of the socket state that went stale on device — owner:
    the button ALWAYS said "can't restart right now"). It now asks the
    socket itself (`channel.isLive()`, readyState probe) and, when the
    socket truly is down, calls `channel.forceReconnect()` and retries
    for ~6 s ("Connecting…") before showing the offline copy.
- Ack lost mid-flight: 8s fallback reload; whether the server processed
  the delete decides what the rejoin loads (either fully reset or fully
  intact — never half).
- Old worker (deploy-order window): the message relays harmlessly and
  no ack arrives → fallback reload, character intact.

## Tests

`server/test/persistence.test.mjs` §7: no-op without confirm, blob
deleted + snapshot written + ack + eviction, auth survives, rejoin
bootstraps fresh Level 1.
