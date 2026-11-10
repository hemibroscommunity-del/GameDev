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
  no `objective` (today only the Mayor's retired `mayor_1`; `mayor_3` until
  v2.3.4441) is taken
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
worker answered.

### Every refused quest tap is answered (v2.3.4401)

The state-machine sweep (V9a) found six more refusals that sent nothing: a
hand-in while dying or dead, with no XP skill named, of a quest that is not
active, or with its objective unmet; an accept while dying or dead, or of a
quest already taken or handed in. The game had already drawn the hand-in
paid (gold, XP, +5 achievement points, the giver's next quest), and on
protocol v2 nothing came later, so the phone kept a reward the worker never
paid until the next join. Each now sends the worker's own values back
(`_questSilentEcho`), and every quest echo carries `achievementPoints`, `xp`
and `prog3` beside `_quests` and `coins` (the old echo left the predicted XP
and +5 points standing). Nothing is written: a refusal changes no record
(`cost-guard` §14). Only a junk quest id and a message with no player still
get no answer.

The server only ever sends its own truth here, so this holds whether the
game goes on predicting the hand-in (the echo undoes a refused one) or one
day waits for the worker's yes (the echo then repeats what it shows).

Kill switch: the live flag `disable_quest_echo` makes these six refusals
silent again and the old echoes send only `_quests` and `coins`.
Suite: `server/test/quest-echo.test.mjs` (every refusable quest request, on
v1 and v2, fails on silence). What a new character can still be paid without the worker
checking: nothing until `tut_1` is in, then `mayor_1`'s 50 coins.

### The Mayor's "Clear any dungeon" is checked (v2.3.4441)

`mayor_3` (300 g, 70 XP) had no objective, so the worker paid it on the
phone's word: once `mayor_2` was handed in, one `quest_turn_in` paid it,
dungeon or no dungeon (#1486's "left for later", S9-1). Its objective is now
`{type:'dungeon_clear', count:1}`, read in `_questObjectiveMet`
(`_dungeonClearCount`): the keys of `lifeSkills.dungeonClears` set to
`true`. Only the worker writes that map (dungeon.js `_dungeonComplete`, on
every clear, a party's included); a join takes no `rpg*` claim, so a phone
cannot bring one in. The game's own check reads the same map
(gameSystems.js `QUEST_CHAINS.mayor_3`), so an honest Claim is paid exactly
as before; a refused one is answered by v2.3.4401's echo.

- No migration and no clawback: a character already paid keeps the gold and
  its `turnedIn` mark (the check runs only at a hand-in).
- Not a test-mode exemption: like every objective, it is checked at the
  hand-in for a test-mode character too (`_questBarred`'s test-mode skip is
  the ORDER rules only).
- Now checked, `mayor_3` leaves the `first` rule (it never needed it: the
  `order` rule already holds it behind `mayor_2`'s five kills).
- Kill switch: the live flag `disable_mayor3_check` counts the objective as
  met, i.e. the old payment on the word.
- Suite: `server/test/mayor-dungeon.test.mjs` (v1 and v2: refused and
  answered with no clear; paid once with one; a double tap and a rejoin pay
  nothing more; the kill switch; a real `_dungeonComplete` opens it; a join
  cannot carry a clear in; a character paid before keeps it).

The only quest left that a live save can be paid for without a check is
`mayor_1` (retired, 50 g): a save that still holds it ACTIVE may hand it in
once `tut_1` is in. Its objective ("visit 3 buildings") has no worker record.

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
character asking for all 22 unchecked quests (23 before v2.3.4441) is paid nothing, a giver who
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
