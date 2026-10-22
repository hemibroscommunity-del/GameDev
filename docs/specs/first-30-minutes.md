# The first 30 minutes, from the game's own numbers (v2.3.3564)

The owner asked what "the quest progression the first 30 mins" looks like, a
week before reviewers give each game 20–30 minutes. This doc is an
**estimate**, worked out from the code's own numbers (distances from the baked
world, speeds, monster health, harvest timings). It is not a timed playthrough.

## The short answer

At a steady pace, following the gold road, a new player finishes the whole
12-step tour in about **30 minutes**.

| Time | Where a reviewer is |
|---|---|
| 0:00–2:30 | Making a character, then the loading screen |
| ~4 | Armed by the Mayor, walking to the Verdant Wilds |
| ~6 | Back with 4 Slime Remains (~7:30 if a slime's blast killed them, which is likely: below) |
| ~10 | At the forge: copper mined, their first piece forged |
| ~12 | Diego's fish caught and cooked |
| ~16 | The Mayor's snowmen done (the game's showpiece monsters) |
| ~20 | On the farm, or chopping pine for the Woodworker |
| ~26 | Zoom Juice cooked (the carrots need 6 minutes to grow) |
| ~28 | Lil Bro's race |
| ~31 | The Beastmaster's traps, the tour's last step |

They will **not** reach a dungeon on the tour in 30 minutes. The Goo Grotto's
mouth is about 2,200 px past the first slimes, off the tour's path, and the
Mayor's "Clear any dungeon" comes after his last story quest.

Since v2.3.3570 the Grotto is a party dungeon: level 16, built for 2–3
players (docs/specs/grotto-party.md). A reviewer at level 3–5, alone, in copper,
cannot clear it. The world map and its mouth say "Lv 16 · 2–3 players".

## The numbers it rests on

| | Value | From |
|---|---|---|
| Walking | 150 px a second (sprint about 200 while stamina lasts) | `server/src/race.js` |
| Routes | straight-line distance + 20% for streets and gates | assumption |
| Your first sword | Copper Great Sword: 11.5 average damage, a swing every 0.6 s | `_maxWeaponDmg` at Melee 1, `SWING_COOLDOWN` |
| Your health at level 1 | 250 | one formula |
| A level-1 blue slime | 55 HP (5 swings, 3 s), hits for 22, its death blast up to 125 | `_makeZoneMonster`, `SLIME_BURST` |
| A level-1 snowman | 67 HP (6 swings), hits for 30, throws snowballs | `_makeZoneMonster` |
| A harvest at level 1 | 10 hits: about 7.7 s for ore or fish, 6.7 s for wood (with the gesture) | `GATHER_HITS.MS`, `HONEST_CYCLE` |
| A resource comes back | after 20 s | `NODE_RESPAWN_TIME` |
| Carrots | 8 minutes to ripen, 6 if watered | `FARM.CROPS.carrot` |
| Lil Bro's race | a 4,010 px lap: he takes 24.3 s; walking takes 26.7 s (you lose), sprinting 20.1 s | `server/src/race.js` |
| Reading and tapping | about 20–30 s per giver's lines, 30–45 s for a first-time menu | assumption |

The distances below are from where you arrive (beside the Town Hall), on the
long world the server plays.

## Step by step

1. **Getting in (0:00–2:30).**
   - Making a character takes about 1–1.5 minutes for someone who looks around.
   - The first loading screen takes 30–60 s on a phone, as the art downloads.
2. **Mayor Bro, "Into the Blue" (to ~4:00).**
   - He stands 162 px from where you arrive.
   - About 30 s for his welcome, then 30–45 s to equip the sword and shield he
     hands you (the band and its tiles flash to show where).
3. **The first slimes (to ~6:15).**
   - The Verdant Wilds' first level-1 slimes are 3,233 px away: about 26 s on
     foot.
   - Each slime takes about 3 s of swings, with about 500 px between them, so
     four take about 45 s.
   - Back to the Mayor (26 s) for his hand-in and the joke about the slimes.
4. **Blacksmith Bro, "Heavy Metal" (to ~9:00).**
   - He is 1,725 px from the Mayor.
   - The two copper veins nearest the forge are 936 and 1,237 px from it, and
     a vein is back 20 s after it is mined.
   - Five ore take about 1.5 minutes: 38 s of mining, plus walking between the
     two veins and waiting for them to come back.
5. **"Some Assembly Required" (to ~10:00).** Forging a copper piece at the
   forge, about a minute for a first-timer.
6. **Diego, "Something Fishy" (to ~12:00).**
   - He is 2,825 px from the forge.
   - The nearest fishing spots are 386–690 px from his store.
   - Two fish take about 20 s, then light a fire with his two logs and cook
     them.
7. **The Mayor's snowmen, "Cold Reception" (to ~16:30).**
   - From Diego back to the Mayor is 2,132 px.
   - Frost Ridge's first snowmen are 3,463 px from town.
   - Four snowmen take 1–1.5 minutes, with Diego's ten cooked clownfish as
     food.
8. **The rest of the town (to ~31:00).**
   - Farmer Bro's carrots: the trip to your farm and back, then dig, plant and
     water three beds: about 3 minutes.
   - Woodworker Bro's five pine logs (the nearest trees 818–1,488 px from his
     bench): about 2.5 minutes. Then a pine bow or staff: about 1.25 minutes.
   - Zoom Juice: the carrots, cooked at the Cookhouse: about 3 minutes. The
     carrots have about grown by then.
   - Lil Bro's race (you must sprint to win): about 1.5 minutes.
   - The Beastmaster's three traps, made and sprung on monsters: about 3
     minutes.

## Two risks the numbers show (the owner's call)

### 1. A reviewer is likely to die on the first quest

A blue slime goes off when it dies. At level 1 its blast is 128, cut to half
your bar by the rule that no blow takes more: 125 of your 250. It swells for
1.6 s first, so stepping back avoids it.

The Mayor's warning comes after the quest, on purpose: the owner's joke ("The
blue ones swell up right before they go ... You'd have met one already.").
Four slimes are four blasts, and a player who keeps swinging at the swelling
slime dies on the second. Health only trickles back out of a fight (below).
A death costs about 1–1.5 minutes: back in town, then the walk to your pile
of remains.

Options (keeping the joke):
- **"BURSTING!" over a swelling blue slime**, as the dungeon's giant slime
  already shows. It teaches the warning sign the first time without the Mayor
  spoiling it.
- **A smaller blast at levels 1–5**, for example a quarter of your bar.
- **Leave it as it is.** A first death is a lesson, and the joke lands harder.

**Decided (v2.3.3568): left as it is.** The owner: "No warning for the
bursting I think it's more fun to discover that." Nothing in the game
changed: an ordinary blue slime swells with no words over it ("BURSTING!"
stays the dungeon's giant slime's alone), and its blast is the same size.

### 2. BroTown heals you slowly

BroTown in the new world is not a "hub" to the healing rule. It heals as the
wilds do: nothing for 6 s after a fight, then 1% of your bar about every 0.67 s.
That is about 67 s from empty to full. The old town healed 10% a tick, full in
about 7 s.

A reviewer coming back to the Mayor half dead stays half dead for a minute.
The Hotel's rest fills you at once, but nothing tells a new player it exists.

Options:
- **The safe ground heals as the old town did** (10% a tick).
- **The Mayor points at the Hotel.**
- **Leave it as it is.**

**Decided and built (v2.3.3569): the safe ground heals as the old town did.**
The owner: "Yes standing on the safe ground should heal you quickly." BroTown
and the commons now heal 10% of each bar a tick once 6 s pass out of a fight:
empty to full in about 7 s, measured on a phone at 5.8–6.9 s
(docs/specs/safe-ground-heal.md).

## Not counted

- Time spent looking around, reading the world map or opening other windows.
  Reviewers often do this, so 30 minutes is the tour at a steady pace, not a
  guarantee.
- Losing the way: the gold road on the minimap leads every step.
- A slow phone: loading screens on an older phone can take twice as long.
