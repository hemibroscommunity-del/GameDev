# Quest Verification (v2.3.1120) — spec + attach points

PR5 of the heavy-systems architecture plan. The server now owns quest
progress counters and verifies objectives before paying rewards.

## The holes this closes

- `quest_turn_in` paid on request: the handler validated only the state
  transition (active → turnedIn) and explicitly trusted the completion
  claim — free gold/XP/AP for any accepted quest.
- `_questKills` was never incremented server-side; the join-time
  snapshot was echoed forever, so client-side progress died on every
  reconnect.
- The client incremented `_questKills[qid]` for **every** active quest
  on **any** kill — kills advanced `trader_2`, a gathering quest.

## How it works now

**Declarative objectives** in `server/src/data.js` `QUEST_REWARDS`:

```js
mayor_2:  {gold:100, xp:80, next:'mayor_3', objective:{type:'kill',   arch:null, count:5}},
trader_2: {gold:75,  xp:50, next:'trader_3', objective:{type:'gather', count:3}},
```

- `kill` — incremented in the monster kill-credit loop for every XP
  recipient with the quest active (`arch: null` = any archetype;
  set an archetype string to scope it). Quest-id keyed, exactly what
  the client predicates read (`gameSystems.js` `check()` functions).
- `gather` — incremented in the `_handleNodeStrike` harvest-credit path.
- Schema also supports `{type:'flag', flag}` and
  `{type:'collect', invKey, count}` for future use (see the warning
  below before wiring `flag`).
- **Entries without `objective` stay client-trusted** — turn-in behaves
  as before for them. This is an explicit whitelist: their signals
  (building visits, dungeon clears, collision discoveries, crafting
  flags, pet counts, crit/block tallies) only exist client-side today.
  Verification arrives per-quest as those signals move server-side.

`_handleQuestTurnIn` refuses to pay when a present objective is unmet
(quest stays active, nothing changes).

**⚠ `_questFlags` clobber hazard**: do NOT make the server write
`_questFlags` mid-session. The client keeps live counters there
(`critsLanded`, `blocksLanded`, `zonesVisited`, …) that the server never
sees after the join snapshot; a server-side write re-echoes the whole
map and would reset them. `_questKills` is safe because the server is
now its **sole writer** (see below). Verify flag-based quests only after
their signals are tracked server-side in a server-owned structure.

**Client**: the three `_questKills` increment sites
(`monsterCombat.js` ×2, `projectiles.js` ×1) are gated on
`!S._serverCaps.questTrack` — against a tracking worker the client
never writes the map, it just renders the authoritative echo (arrives
with the same kill-credit flush, so progress still updates in
real time). Old workers keep the legacy client counting. Either side
deploys first, safely.

## Wire surface

| Surface | Change |
|---|---|
| `state_sync.caps` | gains `questTrack: true` |
| `player_state._questKills` | now server-authored; echoed on every counted kill/harvest |
| `quest_turn_in` | unchanged shape; now verified server-side |

## Tests

`server/test/quests.test.mjs` (10 assertions, in `npm test`): caps
advertisement, kill increments (and NOT gather/objective-less), harvest
increments, unmet turn-in refusal, met turn-in pays once + unlocks next,
replay refusal, objective-less quests unchanged.
