# Dungeons today: what a player meets (2026-10-21, main at v2.3.3549)

The owner, 2026-10-21: "I have no clue what the state of dungeons are right now
in the game. I have never played dungeons yet. This will probably need work to
get right."

This is what a player meets. It was measured on a phone in the world by
`tools/qa/mp/mp-dungeontour.mjs`, which walks into all four dungeons at the
level each is for, and read from the code (server/src/dungeon.js,
wheeldungeon.js).

**Since v2.3.3556 the four fixes that needed no decision are in**
([dungeon-fixes.md](dungeon-fixes.md)): a real boss, 30 seconds to pick up the
loot, straight back in, and "(Lv 28)" on the top bar. So is the owner's answer
on a death inside: "Keep your bag in dungeons". They are marked FIXED below.
The rest is still the owner's call.

## The four

| Dungeon | Land | For levels | Walk from BroTown | Its monsters |
| --- | --- | --- | --- | --- |
| the Goo Grotto | Verdant Wilds | 1–5 | about 30 s | Blue Slimes |
| the Great Cave | Stone Hollows | 26–30 | about 3 min | Amethyst Golems |
| the Foundry Dome | Electric Foundry | 26–30 | about 2–3 min | Storm Slimes |
| the Buried City | Wind Dunes | 41–45 | about 5 min | Mummies |

The other four lands have no dungeon. The Mayor's "Dungeon Delver" quest sends
you to the Grotto.

## A run, step by step

1. **The mouth.** It's a dark oval on the ground with the dungeon's name
   floating over it. Within a few steps an "Enter the Goo Grotto" button comes
   up (or E on a computer). Since v2.3.3566 the Goo Grotto's is the owner's
   picture, a mossy mound dripping slime ([dungeon-art.md](dungeon-art.md)).
2. **Inside.** It's a bare arena floored with the land's ground. There are no
   walls, rocks or decorations, just "Way Out" at the bottom. The top bar says
   "the Great Cave (Lv28-28)". Since v2.3.3566 the Goo Grotto's has the
   owner's mossy walls and 17 things round its edges.
3. **Three waves of six** of the land's monsters, at your level to two above.
   "Wave 2/3" shows over you when one ends.
4. **"BOSS FIGHT!"**, and one more monster comes. **It looks exactly like the
   ones before it**: same picture, same size, same name ("Mummy 43"), no
   boss mark.
5. **"DUNGEON CLEARED!" and "+96G"**, then about 3 seconds later you're put
   back outside at the mouth.

## What it measured

| | Goo Grotto (Lv 3) | Great Cave (Lv 28) | Foundry Dome (Lv 28) | Buried City (Lv 43) |
| --- | --- | --- | --- | --- |
| A wave monster's HP | 128 | 1,159 | 1,344 | 2,548 |
| **The boss's HP** | **120** | 1,384 | **1,204** | 2,597 |
| The clear pays | 96 gold | 146 gold | 146 gold | 176 gold |

The kills inside pay what the same monsters pay outside (their gold, XP and
drops). The clear adds the gold above. There is no chest and nothing special.

## What is wrong

1. FIXED (v2.3.3556). **The boss is no boss.** It's made at your level while the waves go up to
   two above. It also gets 4× only a small part of its health: since
   v2.3.3055 most of a monster's health is its level's flat amount, and that
   part isn't multiplied. So the boss has about a wave monster's health, and
   in two of the four it has **less**.
2. FIXED (v2.3.3556). **Nothing marks the boss.** It isn't bigger, and nothing on its name says
   "boss".
3. FIXED (v2.3.3556). **You're pushed out 3 seconds after the clear.** Whatever the boss dropped
   is left on the floor.
4. FIXED (v2.3.3556). **You can't go straight back in.** After you leave by "Way Out", the run
   lingers for a minute and the door says "You already have a dungeon running".
5. FIXED (v2.3.3556, the owner: "Keep your bag in dungeons"). **A death inside loses your whole bag.** Your pile is left inside the run.
   You wake in BroTown, can't get back in for a minute, and the run is then
   deleted with the pile in it.
6. FIXED (v2.3.3563, [boss-chest.md](boss-chest.md)). **The clear's XP goes nowhere.** It's paid into an old counter no skill
   reads. Since v2.3.3543 the words only say the gold.
7. FIXED (v2.3.3563: the boss's chest, [boss-chest.md](boss-chest.md)). **Nothing is worth the trip.** It's the same monsters as outside plus about
   100–180 gold, and the far ones take 3–5 minutes to walk to.
8. **The farm's Dungeon Workshop** (build your own dungeon) is half broken. It
   uses the old small arena, its way out can't be reached, and some of its
   settings error under level 10.
9. FIXED (v2.3.3556). **The top bar says "(Lv28-28)"**, a range that's one number.

## Recommended

The clear fixes, which need no decision:

- **A real boss:** made at the dungeon's top level, with 4× a wave monster's
  **whole** health (more with a party, as now), drawn bigger, and named
  "Boss" on a red plate.
- **Time to pick up the loot:** after the clear the way out stays open and a
  countdown shows (30 s) before you're taken out.
- **Straight back in:** if your last run is empty, the door ends it and starts
  you a new one.
- **"(Lv 28)"** on the top bar when the range is one level.

Your call:

- **Death inside:** your pile waits outside at the mouth (as a death
  outdoors leaves it where you fell), or you keep your bag in a dungeon.
- DONE (v2.3.3563, the owner's "Yes"). **A reward worth the trip:** the boss drops a chest with sure rewards, for
  example extra gold, the land's shards and a chance at its gem. The clear's
  XP would go into the weapon you used.
- **Getting there:** once you've found a dungeon, the Town Hall's map can take
  you to its mouth.
- **The farm's Dungeon Workshop:** remove it, or rebuild it on the world's
  arena.
- **Something to look at inside:** rocks and walls in each arena, drawn in
  code at first. Done instead with the owner's ChatGPT pictures: the Goo
  Grotto's first, v2.3.3566 ([dungeon-art.md](dungeon-art.md)).
