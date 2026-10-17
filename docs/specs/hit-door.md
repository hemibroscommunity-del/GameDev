# One door for every monster hit on a player (v2.3.3296)

## Why

The GDD's damage pipeline (README.md §8, "Damage Pipeline (Interceptor
Chain)") was one ordered list of steps that every hit goes through:
immunity, block, dodge, armour, element, modifiers, then apply the damage,
then thorns.

The worker built one part of that well: `_applyDamage` (combat.js) does the HP
arithmetic for every hit. The steps around it were written once for each way
a monster can hurt you, seven times in all:

- the safe ground;
- the harvest shield;
- a rock in the way;
- the shield and what it costs;
- the parry;
- the one-hit rail;
- the element's status;
- the event, the save and the death.

Every rule added later (the safe ground, sparring clones, the harvest shield)
had to be copied into each place by hand, and some copies missed some rules.
The door (`server/src/hits.js`) puts the steps in one place, in one order, with
a table saying what each way of being hit does at each step.

## Today's table

`server/test/hit-door.test.mjs` measures this through the real entry points the
monster loop calls (193 checks). Every row passed on the worker before the
door existed, and the door keeps every one.

**Bold** marks a cell that disagrees with the rest of its column.

| How you're hit | Entry point | A roll | Shield cost | Parry | Shield facing away | Harvesting | Safe ground | Rock between | One-hit rail |
|---|---|---|---|---|---|---|---|---|---|
| Swing | telegraph.js `_resolveBasicWindup` | lands | 10 | yes | lands | left alone | left alone | stops it (asked after the shield) | none |
| Snowball | index.js `_tickMonsters` (the impact) | lands | free | no | **blocked anyway, 15** | left alone | left alone | stops it (its flight line) | none |
| Snow pile touch | telegraph.js `_resolveBurrow` | lands | **15** | no | lands | left alone | left alone | (its touch is too short to reach past one) | none |
| Slam, lunge | telegraph.js `_resolveMonsterTelegraph` | lands | 10 | yes | lands | **hits** | left alone | **goes through** | 50% |
| Slime burst | telegraph.js `_resolveSlimeBurst` | lands | 10 | yes | lands | **hits** | left alone | not asked | 50% |
| Boss ability | dungeon.js `_dungeonBossHitPlayer` | lands | **15** | no | lands | **hits** | (no safe ground in a dungeon) | **goes through** | 50% |
| Fire on the ground | firetrail.js `_tickFireTrail` | lands | can't block | – | – | **hits** | left alone | – | 50% |
| Storm arc | monsterstatus.js `_shockArcs` | lands | can't block | – | – | left alone | left alone | – | 15% |
| Burn, poison tick | monsterstatus.js `_tickDots` | lands | can't block | – | – | left alone | put out | – | 10%, 8% |

Smaller differences the test also pins:

- **A blocked snow-pile touch counts as being hit.** The shield takes it as a
  hit of 0, so out-of-combat regen waits, as it does after a landed hit. The
  wrong-way snowball block works the same way. Every other block stops at the
  shield and is not counted.
- **The blocked boss ability saves the whole character** (`_saveRpg`). Every
  other block saves only the pools, coalesced.
- **Thorn.** Flora's thorn on a monster answers its landed swing and its
  landed ball, and the wrong-way ball's block. It does not answer a swing the
  shield stops, a cast or a boss ability. The pile is invulnerable while it is
  one, so thorn does nothing to it.
- **The hexer's curse** comes with its landed swing, not one your shield stops.
- **The element's status** (the frost chill and the rest) comes with a
  monster's own blow: the swing, the ball, the pile and the two kits. A boss
  ability carries none. The ground fire, the storm arc and the burn/poison
  ticks carry only their element's name and icon.
- **Death.** A killing blow from every source goes through the death path,
  put down to `monster:<id>` (for fire and burns, the goblin that lit them).

## What the table shows (the owner's decisions)

Each of these is one cell in the door's table (`MONSTER_HITS` in hits.js), so
each decision is a one-line change and a test row.

1. **The two 15s.** v2.3.1731 named the block cost `BLOCK_STAMINA_COST` (10)
   "so the cost has ONE home", replacing the melee site's inline 15. The snow
   pile (`_monsterStrikePlayer`) and the boss (`dungeon.js`) kept a literal 15.
   index.js still says that cost is "the same block cost the melee branch
   charges", so these read as two copies that were missed.
2. **The wrong-way snowball.** A shield raised in ANY direction blocks a ball,
   at 15, while one facing it blocks it free. The ball takes two shield tests.
   The impact's own test is measured from the thrower. The second, in
   `_monsterStrikePlayer`, is measured from (atkX, atkY), which for a ball is
   where it landed: the player's own feet. A zero-length direction counts as
   covered (`_blockArcCovers`). v2.3.1705 meant the opposite: "a snowball you
   never turned to face should get through exactly like a swing from behind
   does", and the owner's rule is "yes blocking should be directional".
3. **The harvest shield.** v2.3.1704's rule, in the owner's words: "I wanted
   monsters to IGNORE you during resource extraction", written in the code as
   "A HARVESTER TAKES NO MONSTER DAMAGE, FULL STOP". The slam, the lunge, the
   slime burst, the boss and fire on the ground still hit a harvester.
   - A slam or lunge only checks when its wind-up starts, not when it lands.
     The swing re-checks when it lands ("the gate has to be re-checked here,
     not only at stamp time").
4. **Rolls and monsters.** No monster hit honours a roll; only another player's
   hit does (combat.js). The phone hides the damage number while you roll
   (gameEvents.js `S._dodgeRoll`), so a hit taken mid-roll lowers the HP bar
   with no number. Either rolls should dodge monster hits (the door's `roll`
   cell, using the server's own roll window from v2.3.3292, #929), or the phone
   should show the number.
5. **Parry.** The swing, the kits and the slime burst can be parried; the
   snowball, the pile and the boss cannot.
6. **The one-hit rail.** The kits, the boss and the patches cannot take more
   than a share of a bar in one blow. The swing, the snowball and the pile have
   no rail.
7. **Rocks.**
   - The swing asks the shield before the rock, so a swing through a rock still
     costs a raised shield its 10.
   - The kits and the boss do not ask about rocks at all.
   - v2.3.2652's note says the rock test covers "every telegraphed ability";
     the code says otherwise.
8. **The boss block's save.** It writes the whole character on every blocked
   ability. Every other block saves the pools, coalesced.
9. **A blocked hit that counts as being hit.** The pile and the wrong-way ball
   pause regen; the other blocks do not.
