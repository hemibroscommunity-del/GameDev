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
  Since v2.3.3179 they are bounded by three rules (below).

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

## What the worker can't check is not paid for nothing (v2.3.3179)

Characters are free to make and gold moves by trade, so a quest paid on the
game's word was a faucet: a brand-new character sent `quest_accept` +
`quest_turn_in` for the 23 quests with no `objective` and was paid **5,025
coins + 115 AP** in 46 messages. Three rules close it, in
`_questBarred(ps, questId, reward, accepting)` (quests.js), checked at the
accept AND the hand-in (an old save may hold a quest active from before):

- **`gone` — the giver is not in the world.** 22 quests belong to Trader
  Tix, the Enchantress, the Scout, Blacksmith Bron, Healer Luna,
  Beastmaster Kai and Veteran Ash, none of whom is in the game's
  `NPC_DATA`; the game has hidden their quests since v2.3.1681. They are
  `QUEST_DORMANT` in data.js, and can be neither taken nor handed in.
  `mirror-audit` §5b2 holds the list to `NPC_DATA` both ways: bring a giver
  back and their chain must come off the list in the same change.
- **`first` — an unchecked quest waits for the first quest.** A quest with
  no `objective` (today only the Mayor's `mayor_1` and `mayor_3`) is taken
  and handed in only once `QUEST_FIRST` (`tut_1`, checked) is handed in —
  the same gate as the daily quests. The Mayor never offers them before it
  (the game's `getNpcQuest` goes down his line in order), so nobody playing
  the game meets this rule.
- **`order` — a later step waits for the checked step before it.**
  Accepting from nothing is for a chain's first step; it also let `mayor_3`
  (300 g, behind `mayor_2`'s five kills), `tut_4` and others be taken
  first. Now a step whose previous step (the quest naming it as `next`) HAS
  an objective is taken from nothing only once that step is handed in. A
  step behind an UNCHECKED step is still taken from nothing (the Mayor
  offers `mayor_2` while `mayor_1` is hidden, v2.3.3029), and a step the
  worker opened itself (`available`) is never refused.

A refusal changes nothing and sends `_quests` and `coins` back to the game
(`_questRefusedEcho`), which drew the quest taken (and paid) before the
worker answered. What a new character can still be paid without the worker
checking: nothing until `tut_1` is in, then `mayor_1`'s 50 coins.

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
replay refusal, and since v2.3.3179 (§5) the three rules above: a new
character asking for all 23 unchecked quests is paid nothing, a giver who
is gone closes their quests at the accept and the hand-in, `mayor_1` waits
for `tut_1` and then pays as before, `mayor_3` and `tut_4` wait for the
checked step before them, `mayor_2` is still taken with `mayor_1` undone.

## Quest objectives survive death (v2.3.1701)

Owner playtest: dying on an errand dropped the very remnants you were sent
to fetch, so a death did not merely cost loot — it reset the quest. The
tutorial arc is four collect-and-return steps in zones that can kill a
level-1 character, so the step you are on is exactly what the death takes.

Objective items now join the gathering tools (v2.3.1688) in the death
carve-out: one predicate, `_keptThroughDeath` (`server/src/gathering.js`),
is read by BOTH death paths — the wipe in `_handlePlayerDeath` /
`_tickPlayerRespawn` and the drop in `_spawnDeathPile` — so an item can
never be both kept and dropped (which would mint a duplicate on the
ground). Everything else in the bag still drops.

The protected keys are DERIVED from the shipped table, never hardcoded:
`_isQuestObjectiveItem` / `_QUEST_KEEP_SPEC` (`server/src/quests.js`) walk
every `QUEST_REWARDS` objective's `invKey` (exact) and `invPrefix` (a
family — `cooked_fish_<species>`, `ore_<name>`), the same two fields
`_collectHeld` / `_collectConsume` read, so "countable" and "protected" are
the same set and a new quest is covered without touching either death path.
Memoised per DO; table-wide rather than per-active-quest, deliberately —
protecting only accepted steps loses the remnants of a step you farmed
ahead of, which is the same bad moment one indirection later.

Pinned by `server/test/combat-lifecycle.test.mjs` (both objective shapes,
both wipes, and the "no duplicate on the ground" property).
