# Each drop a line of words, rising over the monster (v2.3.3627)

The owner, 2026-10-27:

> Also instead of the two column icon, quantity, rarity, when item drops, I
> think I just want the name of the item to float upwards with quantity in
> parenthesis and the color of the font indicating rarity. So normal would
> just be white. So coins (5) rising and disappearing in white, slime remains
> (1) rising beneath that message then disappearing in white (as a example)

This replaces v2.3.3616's columns (docs/specs/drop-columns.md: a picture, the
amount under it and the rarity's word under that), which replaced the dice
roll over the monster.

## What a player sees

A kill whose pile is yours to pick up shows one line for each thing it
dropped, on the monster's body, each line under the one before:

    Coins (5)
    Slime Remains (1)
    Frost Shard (1)

- The name is the drop's name, followed by its amount in brackets:
  - the gold is "Coins" (the owner's word), and its amount is the gold the
    worker put on the pile for you;
  - the remains are named by the pile's own key (data/remains.js);
  - the shard is named by its key (data/shards.js);
  - the rest by the codex's own table.
- The colour is the rarity:

  | Drop | How often | Colour |
  |------|-----------|--------|
  | Coins, remains | every kill | white |
  | A land's shard | 1 in 10 | green |
  | Rare Gem | 1 in 200 | blue |
  | Gold Nugget | 1 in 10,000 | orange |
  | Iron Torso, Greaves, Great Sword | 1 in 500 | its grade: purple when the worker says the grade is worth a reveal, else white |

- How the lines move:
  - Each line comes in 0.12 s after the one above it, with a small pop.
  - The group rises together, 92 popup px over 2 s.
  - Each line fades over the last half second of its own life, so the top
    line goes first.
- The lines are a message's size, type and outline: the game's
  MSG_FONT_PX, the size of a damage number (the owner's rule from v2.3.3192).
  They are the same size on the screen at any zoom, and are kept 12 px inside
  the screen's sides by the widest line.
- WHERE:
  - The first line starts halfway up the monster's body, so the stack sits
    under the killing blow's own number. That number starts over the bar and
    climbs faster, so the two never cover each other.
  - A kill off your screen (a burn finishing it out of sight) shows its lines
    over your head instead. There the last line's foot sits over your bar, so
    the lines never cover you.

The dice roll over the monster is still not drawn. The roll is still made and
counted, and its ROLL column is still on the codex's page. `?droplines=0`
draws the roll again and no lines.

## How it works

- A kill tells the phone what it dropped in two messages:
  - the pile (`loot_drop`): its gold, remains, shard, rare gem, armour and
    weapon;
  - the killing blow's own (`combat_credit`'s `rh`): the gold nugget, which
    goes straight into the killer's bag and is on no pile.
- The credit is sent at once and the pile with the next tick, so the credit
  waits for its pile (`CREDIT_KEEP_MS`). A nugget whose pile never comes shows
  by itself after `NUGGET_WAIT_MS`.
- `src/game/dropLines.js` builds the groups (`S._dropLines`, the newest 8).
- `src/rendering/dropLines.js` draws them on the damage numbers' layer
  (effectsRenderer, which hands it a message's size and outline) and clears
  them with the zone.
- Nothing is decided on the phone: the drops are the worker's. The worker is
  unchanged.
- These show nothing:
  - a pile that is not yours (you did under 5% of the damage);
  - a death pile;
  - a dropped item.

## Memory and loading

There are no pictures. The columns' ~15 drop pictures are no longer loaded
behind the loading screen, about 0.5 MB less between the graphics chip and
their canvases.

The words are Text, made with the group and destroyed with it: a line a drop,
two or three a kill. The columns made two a column, and a sprite.

## Tests

- `server/test/drop-lines.test.mjs` (28 checks):
  - the owner's example, "Coins (5)" over "Slime Remains (1)", both white;
  - every drop's line, by name and in order;
  - the colours by the codex's chances, and gear by its grade bit;
  - the two messages in either order;
  - a pile that is not yours;
  - the newest 8 kept;
  - where the lines start, the stagger, and the screen's sides;
  - the wiring: a message's size, no pictures loaded, the dice popup held
    back.
- `mp-droplines` (a phone, real kills at Frost Ridge through the worker's
  kill lever):
  - "Coins (n)" over "Snowman Remains (1)" in white, n the pile's gold for
    you;
  - the second line under the first and a little after it;
  - a message's size;
  - starting on the snowman's body;
  - no dice drawn;
  - "Frost Shard (1)" in green, "Gold Nugget (1)" in orange;
  - the lines rise and go;
  - a far kill's lines over you.
- `mp-killroll` runs with `?droplines=0` (the dice roll as it was).
