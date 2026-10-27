# Each drop a column over the monster (v2.3.3616)

The owner, 2026-10-26 (docs/OWNER-LIST-2026-10-26.md, item 3 of "Before the
judges"):

> Instead of showing the dice roll for each drop I think it would be better to
> show each drop in columns of the floating icon rising with the quantity
> beneath it and the rarity beneath that. So example: upon monster death and
> dropping gold with remains, show gold icon, number 5 beneath it, and
> "Normal" beneath the number. If two items are dropped it will be spaced apart
> as two columns appearing simultaneously. Rising briefly then disappearing.

## What a player sees

A kill whose pile is yours to pick up shows, over the monster's health bar
(where its damage numbers start, a little higher), one column for each thing it
dropped, side by side and centred on it:

- the drop's picture (the codex's own: the gold coin, the remains, the shard,
  the rare gem, the iron pieces, the gold nugget);
- its amount under the picture -- for gold, the gold the worker put on the pile
  for you (your share, by the damage you did);
- its rarity under the amount, in the rarity's colour.

The group pops in, rises 46 popup px over its life, and fades out at the end,
2.2 s in all. Every size is popup px drawn at the damage numbers' zoom, so the
columns are the same size on the screen whatever the world's zoom.

A kill off your screen (a burn finishing it out of sight) shows its columns
over your own head, as the dice roll did.

The dice roll over the monster is no longer drawn. The roll is still made and
counted, and stays on the codex's page (its ROLL column). `?dropcols=0` draws
the roll again and no columns.

## The rarity

| Drop | How often | Its rarity |
|------|-----------|------------|
| Gold, remains | every kill | Normal |
| A land's shard | 1 in 10 | Uncommon (green) |
| Rare Gem | 1 in 200 | Rare (blue) |
| Gold Nugget | 1 in 10,000 | Very rare (orange) |
| Iron Torso, Greaves, Great Sword | 1 in 500 | its GRADE: "Mystery" (purple) when the worker says the grade is worth a reveal, else "Normal" |

For a piece of gear the rarity is its grade, the word the bag will show, which
the pile keeps hidden until it is picked up (the mystery reveal, GDD
§4.6b.ii): the worker's one bit per piece (`_mysteryPiece`, `weaponMystery`)
says only whether there is something to find out. For everything else it is how
often it drops (`RARITY_TIERS` in src/game/dropColumns.js: 20% and up Normal, 2%
Uncommon, 0.2% Rare, less Very rare), read from the codex's own chances
(data/codexDrops.js), so the column and the codex page always agree.

## How it works

- A kill tells the phone what it dropped in two messages: the pile
  (`loot_drop`: its gold, remains, shard, rare gem, armour and weapon) and the
  killing blow's own (`combat_credit`'s `rh`: the gold nugget goes straight into
  the killer's bag and is on no pile). The credit is sent at once and the pile
  with the next tick, so the credit waits for its pile (`CREDIT_KEEP_MS`), and a
  nugget whose pile never comes shows by itself after `NUGGET_WAIT_MS`.
- `src/game/dropColumns.js` builds the groups (`S._dropCols`, the newest 8);
  `src/rendering/dropColumns.js` draws them on the damage numbers' layer
  (effectsRenderer), and clears them with the zone.
- Nothing is decided on the phone: the drops are the worker's. No worker change.
- A pile that is not yours (you did under 5% of the damage), a death pile and a
  dropped item show nothing.

## Memory and loading

Every picture a column can show (each codex kind's whole drop table, about 15)
is loaded behind the loading screen (`preloadDropColumnIcons`, in
preloadWorldAnimations) and shrunk to 64 px: about 16 KB each on the graphics
chip and the same in a canvas. The words are Text made with the group and
destroyed with it, two a column.

## Tests

- `server/test/drop-columns.test.mjs`: the owner's example (gold 5 "Normal",
  remains 1 "Normal"), every drop's column in order, the rarities by the codex's
  chances and gear by its grade bit, the two messages in either order, a pile
  that is not yours, the newest 8 kept, every picture preloaded, and the wiring
  (the dice popup held back).
- `mp-dropcols` (a phone, real kills at Frost Ridge through the worker's kill
  lever): the pictures loaded at start; gold and remains, two columns with their
  pictures, the amount under the picture and the rarity under the amount, and
  no dice drawn; the shard "Uncommon" in green; the nugget "Very rare"; the
  columns rise and go; a far kill's over you.
- `mp-killroll` runs with `?dropcols=0` (the dice roll as it was).
