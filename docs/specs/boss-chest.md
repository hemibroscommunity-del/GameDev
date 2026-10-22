# The boss's chest, and the clear's XP into the weapons you used (v2.3.3563)

The owner said "Yes" to the dungeons' recommendation "A reward worth the trip"
([dungeons-today.md](dungeons-today.md)):

> the boss drops a chest with sure rewards, for example extra gold, the land's
> shards and a chance at its gem. The clear's XP would go into the weapon you
> used.

Before this, a clear paid about 100–180 gold and nothing else. Its XP went
into an old counter that no skill reads.

## What a player meets

When a world dungeon clears, the clear's card at the top of the screen grows a
row:

1. The boss's chest opens, its lid knocking and its coins chiming, just after
   the clear's fanfare. Since v2.3.3565 it is the owner's chest, shut then open,
   the same one that lands in the arena where the boss fell
   ([dungeon-art.md](dungeon-art.md)); it was the old daily chest's picture.
2. Beside it, what it held, each with its picture:
   - its gold;
   - 3 of the land's shards ("Flora Shard ×3" in the Goo Grotto);
   - a Rare Gem, one time in 10;
   - the clear's XP in the weapons you fought with ("+245 Sword XP").
3. The card still counts down the 30 seconds to pick up the loot, with Leave
   now beside it.

Everyone standing in the dungeon when it clears gets their own chest.

## The numbers (`server/src/dungeonreward.js` `BOSS_CHEST`)

| | Value | Why |
|---|---|---|
| Gold | 20 for each level of the run (60 at a level-3 Goo Grotto, 560 at the Great Cave's or Foundry Dome's 28, 860 at the Buried City's 43) | about what the run's kills pay again, so the trip is worth it at every level |
| Shards | 3 of the land's own (`shard_<land>`) | the road to its raw gems |
| Rare Gem | one time in 10 (`RARE_IN`) | the owner's "chance at its gem"; the Gem Works cuts it into the land's gem or any other |
| The clear's XP | as before: 80 a wave + 5 a level (255 at level 3), now paid into skills | "the weapon you used" |

## Decided here, and why

- **No raw gems in the chest.** The owner's gem plan keeps raw gems for
  cracking shards ([GEM-PLAN.md](../GEM-PLAN.md), decision 1: "Raw gems
  coming only from shards keeps them as the one road"). So the chest gives
  shards, the road to the land's raw gems, and its "chance at its gem" is a
  Rare Gem: the drop any monster gives 1 time in 200, which cuts into any
  land's gem.
- **The XP follows the weapons you used in this run.** Every damage path pays
  fight XP through one function (`prog3.js _prog3AwardXp`). While you stand in
  a dungeon it notes that XP by weapon (`_dungeonNoteXp`, `ps._dgXp`, in
  memory, never saved). At the clear, the clear's XP is split by those shares,
  in whole numbers that add up to it.
  - A party member who earned none there gets it in the weapon in their hand.
  - A record from another run counts for nothing: a new run is a new zone.
- **It fades as fight XP does** (`xpdecay.js`: from five levels below the
  run's level). This keeps the owner's rule: "It should always be most
  efficient to harvest or fight things within your current level". A skill at
  its cap takes none.
- **World dungeons only.** A Workshop run's monsters, their number and their
  level are the player's to choose, and its clear XP is counted by waves, not
  by level. Paid into a skill, it would be a farm. Its clear pays as before.
- **Paid in the clear's own run and save.** The chest's one roll and every
  payment are made in the same synchronous run as the clear's existing
  `_saveRpg` and before its message (handoff rule 10). The players are online
  by definition (they stand in the zone), as the clear has always paid. There
  is no window between the roll and the payout.
- **The old counter still gets the clear's XP**, as before. Nothing that reads
  it changes.

## Server

- **`server/src/dungeonreward.js`** (the mixin `dungeonRewardMethods`):
  - `_dungeonReward(pid, ps, inst, xp)`: called by `dungeon.js
    _dungeonComplete` for each player it pays, before the save. It pays the
    chest and the XP and returns `{chest?, skillXp?}` for the event.
  - `_dungeonNoteXp`: notes fight XP by weapon while you stand in a dungeon.
  - `_bossChestRoll`: the chest's one random number, so a test can set it.
  - `splitClearXp`: splits the clear's XP by the run's shares.
- **`server/src/prog3.js`**: `_prog3AwardXp` notes fight XP (never a flat
  award) while `ps.z` is a dungeon's.
- **No new event type, storage key or caps flag.** The rpg blob gains no field:
  the chest pays into `coins` and `inventory`.
- **Kill switches** (live flags, lower case):
  - `bosschest: false`: no chest;
  - `clearxp: false`: the clear's XP goes to the old counter only.

## The wire

`dungeon_complete` (already privileged) gains two fields. An older phone
ignores them. The coins and the bag reach every phone on the worker's echo
anyway (handoff rule 20).

| Field | Shape | When |
|---|---|---|
| `chest` | `{gold, items: [{key, n}]}`: the shard and, when rolled, `rare_gem` | a world dungeon with a boss, `bosschest` on |
| `skillXp` | `{sword?, bow?, staff?: n}`: what each skill was paid | a world dungeon, `clearxp` on, some XP paid |

## Phone

- **`src/game/dungeonClear.js` `setDungeonClearReward`**: keeps the event's
  chest and XP on the clear of that dungeon, and nothing for another zone's
  clear. `dungeonClearView` hands the reward to the card.
- **`src/game/bossChest.js` `chestLines`** (no imports, tested in node): turns
  the reward into the card's lines, "+60 gold", "Stone Shard ×3", "Rare Gem",
  "+192 Sword XP".
- **`src/ui/mobile/DungeonClearHud.jsx`**: the chest row.
  - The chest is the owner's (v2.3.3565, `BOSS_CHEST_ART`): shut, then open
    0.975 s after the clear, the moment the arena's chest opens
    (`rendering/arenaWorld.js` `CHEST_OPEN_MS`). Its picture is warmed with the
    row's others. (It was the daily chest's strip, frames 3–8.)
  - The lid's knock and shimmer and the coins' chime play on its frames, as the
    daily chest's did (`ChestReveal.jsx`, v2.3.3045).
  - Each line has a 16 px picture, warmed when the game loads: the gold, the
    three weapons, the Rare Gem and the lands' shards.
- **`src/ui/panels/NewMonsterCard.jsx`**: the codex's "New monster" card stood
  just under the minimap, over the taller clear card. While the clear card is
  up, it now steps down under it, read on its own 200 ms poll.
- **`src/networking/gameEvents.js`**: the clear keeps the reward, and the
  stats' gold earned counts the chest's gold.

## Tested

- **`server/test/dungeon-reward.test.mjs`** (27 checks):
  - The chest: gold, shards and a Rare Gem on a low roll, never a raw gem. The
    event says what it held. A party member gets their own. It is saved with
    the clear.
  - The Goo Grotto's shard, and no Rare Gem on a high roll.
  - The XP: split by the run's shares, paid into the skills exactly, the old
    counter unchanged. A watcher's XP goes to the weapon in hand, and so does
    a record from another run's zone.
  - The fade, and the cap.
  - What is noted: nothing outside a dungeon, never a flat award.
  - The Workshop: no chest and no skill XP.
  - Both kill switches.
  - The split's arithmetic.
  - The phone's lines, and the clear keeping its reward.
- **Eleven mutations, each failing the suite:**
  - a Workshop run paid;
  - a Rare Gem nine times in ten;
  - an even split;
  - another run's record counted;
  - no fade;
  - a capped skill paid;
  - either kill switch ignored;
  - flat awards noted;
  - the rounding's remainder lost;
  - raw gems in place of shards.
- **`server/test/wheeldungeon.test.mjs`**: the clear's check counts the chest's
  gold beside the clear's.
- **`tools/qa/mp/mp-bosschest.mjs`**, a phone in the world at the Goo Grotto
  (7 checks):
  - the card's chest opens to frame 8;
  - it lists the worker's lines, each with its picture;
  - the bag, the purse and the sword's XP hold it on the echo;
  - the card still counts down;
  - the "New monster" card sits under it;
  - no page errors.

  Picture: `tools/qa/mp/out/bosschest-card.png`.

## Not done (the owner's call)

- **The chest in the world.** Done in v2.3.3565 with the owner's picture: it
  lands where the boss fell and opens with the card's
  ([dungeon-art.md](dungeon-art.md)).
- **The numbers.** Each is one line in `BOSS_CHEST`.
