# Guild-Quest Verification — v2.3.1128

The life-skill guild quests ("Reach Lv30 in this skill" → gold + AP)
were a pure client button: `GuildPanel` checked the level locally and
minted the reward. The turn-in is now a server-verified claim against
the **server's own** `ps.lifeSkills[skill].level` — the same numbers
its harvest/craft handlers advance — using the PR5
declarative-objective pattern with zero new tracking.

Server code: `server/src/guilds.js` (`_handleGuildTurnIn`); ladder
mirrored in `server/src/data.js` (`GUILD_QUESTS`, `GUILD_SKILLS`).
Tests: `server/test/guilds.test.mjs`.

## Wire surface

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→s | `guild_quest_turn_in` | `{skill}` | Explicit case. One rung per call, ladder order enforced server-side. |
| s→c | `guild_quest_result` | `{skill, index, gold, ap}` | Private. Client ADOPTS the index (`_guildProgress[skill] = index+1`) — never increments locally. |
| s→c | `guild_quest_error` | `{code, message}` | Codes: `not-now`, `bad-skill`, `done`, `not-ready`. |

Both server-emitted types are in `PRIVILEGED_EVENTS`. Capability:
`state_sync.caps.guilds` — gates GuildPanel's local mint (kept as the
old-worker fallback).

## Rules

- Ladder: `GUILD_QUESTS` (8 rungs, checkLvl 5→150, gold 30→2000, AP
  10→750; index order IS the ladder — append, never reorder).
- Claims: `guild_claims:<pid>` storage key = `{skillKey: count}`.
  Deliberately **not** in the rpg blob (fixed-field-list rule) and
  **not** the client's `_guildProgress` (client-merged field; a server
  write mid-session would clobber — the `_questFlags` lesson).
- Replay-safe by construction: claims increment before pay, so a
  re-sent turn-in meets the *next* rung's higher level requirement.
- Legacy note: pre-server client claims paid nothing real (echo-
  stomped), so the server ladder starting at 0 for everyone is fair —
  players re-claim rungs they "completed" before, this time for real
  gold/AP.
- Rewards: single mutation on live ps (gamble pattern — recipient is
  this session, online): `ps.coins += gold`,
  `ps.achievementPoints += ap`, both echoed authoritatively.

## Attach points for successors

- Only LEVEL objectives exist. Count-based guild work ("cook 50
  meals") should follow the `_questKills` sole-writer pattern with a
  new server counter — do not read client `_compStats`.
- Titles/ranks are client cosmetics computed from the skill level
  (`getGuildRank`); nothing to verify server-side.
- If lifeSkills for the client-progressed skills (farming, enchanting,
  trapping…) ever move server-authored, the same handler covers them
  with no changes — the level check already reads `ps.lifeSkills`.
