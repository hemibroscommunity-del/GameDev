# Your list of 2026-10-26: what's there, what I'll do, in what order (v2.3.3607)

You sent 38 things at once: changes, bugs, new features and questions. Each
one is below, checked against the game's code, with what is there today and
what I'd do. The judges play the **desktop version in 2 days**, so the order is
what makes the first half hour on a computer smooth and impressive first, and
the big new features after.

Sizes: **S** is under two hours, **M** about half a day, **L** a day or two,
**XL** several days. Each line is its own small PR, merged as soon as it
passes its checks, so a finished item is in the game the same day.

---

## 1. The order

### Before the judges (today and tomorrow)

| # | What | Size |
|---|------|------|
| 0 | Your hair and hat stay on (#1114) | merged |
| 1 | **Desktop play-through.** I play the first 30 minutes in a laptop-size window and on a big monitor, keyboard and mouse only, and fix every snag (section 2). | M, then fixes |
| 2 | Your quick changes: the old leg-armour icon, the Equipment figure facing southwest, the level-up message half as long, the red skull centred, the Goo Grotto "Lv 10", the older zone banners, plain element icons, the townsfolk's zingers back | S each |
| 3 | **Drops you can see**: each drop rises over the monster as a column (its icon, the amount, the rarity) instead of the dice number | M |
| 4 | **Monsters' elements you can see coming**: a short element wind-up before each attack, and your five stronger element hits | L |
| 5 | **No man's land from your first step into a land**, with a red line on the ground at the edge of the safe ground | M |
| 6 | The minimap's business icons: a white symbol on a dark grey circle | M |
| 7 | The TRAP button out from under the other buttons | S |
| 8 | The look bugs: fishing hands in torso armour, the shirt while mining, the iron armour's colour while farming | M each |
| 9 | A **Music** section in the Sound Studio: what plays where, with a play button | S |
| 10 | **Add pet** in the Test panel | S |
| 11 | If you say yes (section 5): one ore = one bar, one log = one hardened wood; the Mayor's seed quest | S / M |

### After the judges

| What | Size |
|------|------|
| Townsfolk who walk around and work (the blacksmith hammering, a cook at the fire), made in the character creator | L-XL |
| Night again: 2 minutes of moonlight every so often | M |
| Battery saver (a cooler phone) | M |
| Hair and clothes that move in the breeze | M |
| Portraits that blink, breathe and talk in dialogue | M |
| Diving: an underwater view and an air meter | L |
| The arena: its own place, matchmaking, staked fights, people watching | XL |
| Gems: 50% from a shard, cut, set, extra damage, the element's icon on your hits | L |
| A second special for the bow (piercing arrow) and the staff (a shield) | L |
| Skateboard or scooter | L |
| BroTown on a hill (elevation), things to jump up on, a chest on top | XL |
| New land names (once you pick them) | M |
| Harder monsters (after the element changes, measured) | M |
| A monster hidden behind a tree shows as a silhouette (from your earlier list) | M |

---

## 2. The desktop play-through (before the judges)

The game has the tools for this already: the phone tests can run in a computer
window, and the screenshot tool has laptop (1366 x 768) and desktop views. I'll
go through, in a desktop window, keyboard and mouse only:

- the door, making a character, the loading screen;
- the Mayor, the slimes, the hand-in; every townsperson's first quest;
- every menu and building window, and every close button (Esc);
- a harvest (mouse and the E key), cooking, the forge;
- a fight with each weapon, the specials, blocking, dodging, sprinting;
- the Goo Grotto's door; the world map; the chat;
- the words on screen: nothing should say "tap" on a computer;
- the frame rate, the sound levels, and how long the loading screen takes.

One thing I can't check here: other browsers. This machine only has Chrome.
If you can, open brotown.net once in Safari or Edge on a computer before the
judges do.

---

## 3. Every item

### Looks and reverts

1. **The leg armour icon.** Today: your icon picks of Oct 20 (v2.3.3526)
   replaced all four greaves pictures (plain, copper, iron, black steel). I'll
   put the four former pictures back, byte for byte. **S**
2. **The Equipment tab's figure faces southwest.** Today: southeast since
   Oct 22 (v2.3.3577, your earlier ask). One setting back. **S**
3. **The zone intro graphics.** Today: a plain plaque with the land's name,
   then a small picture of the land under the minimap (since Oct 20). Before
   Oct 19, your own animated banners played across the top for the Frost,
   Flame, Wind and Verdant lands (the plaque alone for the other four). I'll
   bring those back and drop the small picture under the minimap. **S-M**
4. **Plain element icons.** Today: a snowflake, a flame, a wave, a drop and a
   leaf read well; **wind is a spiral rune on a grey triangle**, storm a
   purple star, stone a cracked tile. I'll redraw those three as the element
   itself: wind lines, a lightning bolt, a rock, in the same style. **S-M**
5. **New land names.** Today: Frost Ridge, Flame Fields, Wind Dunes, Stone
   Hollows, Electric Foundry, Water Caves, Poison Forest, Verdant Wilds. Ideas
   a 10-year-old gets at once, two per land (pick one, or write your own):
   - Frost Ridge: **Snowy Mountain** / Ice Hills
   - Flame Fields: **Fire Fields** / Lava Land
   - Wind Dunes: **Windy Desert** / Sandy Desert
   - Stone Hollows: **Rocky Caves** / Rock Valley
   - Electric Foundry: **Thunder Factory** / Zap Town
   - Water Caves: **Water Caves** (already simple) / Splash Bay
   - Poison Forest: **Poison Swamp** / Spooky Woods
   - Verdant Wilds: **Green Jungle** / Leafy Woods

   Each name is in quests, signposts, the maps and the banners, so it's one
   careful pass once you choose. **M**
6. **Level-up message half as long.** Today it stays 2.6 s. It'll be 1.3 s:
   the burst plays as it does, the hold and the fade shorter. **S**
7. **The red skull centred.** Today it sits left of the middle so it never
   covers the shield button (v2.3.3268). I'll centre it and lift it clear of
   the shield instead. **S**
8. **Minimap business icons.** Today each building on the minimap wears a
   small coloured picture of its business, which blends into the building. I'll
   draw a white symbol on a plain dark grey circle for each (an anvil, a gem,
   a mug, coins...). **M**
9. **The TRAP button.** Today it's a pill at the bottom middle, and the shield
   button can cover it (your screenshot). I'll make it a round button in the
   right-hand cluster, shown only while a monster is picked, with T on a
   keyboard. **S**

### Look bugs

10. **Fishing with torso armour: the hands go wrong.** The fishing pose draws
    the armour over the arms. I'll find which frames and fix the cut. **M**
11. **The shirt shifts while mining.** You're right about why: since the rocks
    were cut smaller (Oct 19) the copper rock no longer hides the shirt's hem as
    it rides up in the swing. I'll fix the shirt's fit in the mining frames
    rather than grow the rock again. **M**
12. **The iron armour's colour while farming.** The farm poses' armour was
    graded to the walking armour's greys (v2.3.3472), and iron still reads
    different. I'll measure it against the walking iron and match it per metal.
    **M**

### Words and quests

13. **The townsfolk's zingers back.** One message each, the zinger and the call
    to action together, so you know who he is from that one line. **S-M**
14. **The Goo Grotto says level 10.** Today "Lv 16 · for 2–3 players" (the
    monsters' level). It'll say "Lv 10 · for 2–3 players", and the Mayor's line
    too; the monsters and the boss stay exactly as they are. **S**
15. **The Mayor's seed quest.** The Mayor hands you carrot seeds and compost:
    plant them on your farm. Carrots take 8 minutes (6 watered), so you do the
    slimes and come back to harvest and hand in. Today Farmer Bro's first quest
    is planting carrots; see section 5 for how the two fit. **M**

### Fights

16. **No man's land from your first step into a land.** Today it begins at the
    levels 6-10 stretch. It'll begin where the safe ground ends, so the whole
    first stretch (levels 1-5) is No man's land 1: only players within 1 level
    of you can choose to fight you, and the "Attack?" window still asks first.
    A **red line on the ground** shows where the safe ground ends. It's the
    worker's rule, so the phone and the worker change together. **M**
17. **Monsters' elements, stronger and clearer.** What each does today, and
    what it'll do:
    - **Slimes (Verdant):** today a 0.7 s hold. Then: plant goo that holds you
      about 2 s and stings while it holds.
    - **Snowmen:** today a 1 s chill. Then: a snowball freezes you solid for a
      moment, then slows you for 2 s, with ice on you.
    - **Fire goblins:** today 3 small burn ticks. Then: you burn for 3 s with
      flames you can see.
    - **Mummies:** today a 48 px shove when they hit. Then: a roar, wound up so
      you can see it coming, that blows you back from a few steps away.
    - **Rock monsters:** today a 0.5 s daze. Then: a bash that leaves you
      wobbling for a second (your steering sways).
    - **Telegraphs:** before each attack, a short wind-up in the monster's
      element (a snow swirl, sparks, a gust, goo bubbles, rock dust) so a
      player who watches can block or dodge.
    The worker decides every effect, so this is a worker change with the
    phone's looks; each gets its own switch so it can be turned off live.
    **L**
18. **Monsters a bit too easy.** After 17, I'd measure with the fight
    simulator and raise the early monsters' damage a little, without making
    the judges' first slimes a wall. **M**
19. **A second special for the bow and the staff.** The sword has its spin and
    its whirlwind; the bow and staff have one each. Bow: a piercing arrow that
    knocks back everything on its line and makes them bleed. Staff: a shield
    that makes you immune to damage for a few seconds. New moves on both the
    worker and the phone, with buttons and keys. **L**
20. **Gems on weapons.** Most of your idea is built already (GEM-PLAN, Oct 19):
    cracking a shard can give a raw gem (10%, up to 20% with Gem Cutting),
    three raw gems make an elemental gem at the Gem Works, and the gem sits in
    the weapon so every hit is that element (1.25x against the element it
    beats, plus its burn, freeze...). Your version changes four things:
    - a shard gives a gem half the time (50%);
    - one raw gem is cut into one gem (no three-into-one);
    - the gem adds damage of its own, more or less by the matchup;
    - your hit shows the weapon's icon then the element's, and one total.
    **L**

### The world

21. **Night again.** Today it's always day (since Oct 2, after one visit that
    went very dark). I'll bring back a short night, about 2 minutes, lit like
    moonlight: blue and soft, never black, the lamps and fires glowing. **M**
22. **BroTown alive with work.** Today's townsfolk are photographs of creator
    looks, one picture per pose, which is why they stand where they are.
    Townsfolk drawn the way players are drawn can walk anywhere and use every
    move players have: hammering at the anvil, cooking at a fire, chopping,
    fishing, farming. They'd be made in the character creator, like the cast
    now. **L-XL**
23. **Hair and clothes in the breeze.** Hair, capes and bandana tails sway a
    little with the wind and with your steps, drawn in code. **M**
24. **Portraits that move in dialogue.** A blink, a slow breath and the mouth
    moving while the words type, drawn over the portrait in code. **M**
25. **Diving.** In water, a Dive button: the view turns to an underwater one
    for about 10 s of air, then 10% of your health a second until you come up.
    **L**
26. **A vehicle.** A skateboard or scooter: faster than sprinting, off when you
    fight, swim or get hit. The worker's speed check has to know it. **L**
27. **Elevation.** Today the world is flat. The plan (ELEVATION-PLAN.md, Oct 3)
    is the way Zelda and Stardew do it: a raised area is ordinary ground with a
    rock face on its south side and steps up. BroTown on a hill is one big
    raised area with steps at its gates. **XL**
28. **Things to jump up on, and a chest on top.** Today a jump clears low
    things but never lands you on top of anything. With 27, a low ledge could
    be jumped onto, and a chest on top opened once per player (the worker keeps
    who opened it). **L**, after 27.
29. **The arena.** See section 4. **XL**
30. **An easier economy.** See section 5. **S**

### Tools

31. **The Sound Studio's music.** The Sound Studio exists (section 4), but it
    only lists sound effects. I'll add a Music section: every track, where it
    plays, and a play button. **S**
32. **Add pet in the Test panel.** The worker already has the lever. I'll add
    a row: pick a land, get its pet, take it out from the Pets page. **S**
33. **Battery saver.** See section 4. **M**

---

## 4. Your questions

**Is there a sound studio?** Yes. Hold the "BroTown" title on the top bar for
a second to open the Test panel, then "Sound studio": every sound under the
moment it plays, with a play button, and "Heard just now". It has no music in
it yet (item 31). What plays where today:

| Where | Track |
|-------|-------|
| BroTown and the safe ground round it | village.mp3 |
| Frost Ridge | frost.mp3 |
| Flame Fields | fire.mp3 |
| Wind Dunes | desert.mp3 |
| Verdant Wilds | forest.mp3 |
| Stone Hollows, Electric Foundry, Water Caves, Poison Forest | the game's theme (no track of their own yet) |
| Dungeons, the farm, the login screen | the game's theme |
| While you dance | dance-beat.mp3 |

So four lands have no music of their own. If music matters most to you, the
best next step is a track each for those four, and maybe a fight layer that
swells when monsters chase you.

**How does elevation work?** It doesn't yet: the world is flat, and a jump
only lifts your picture. The plan is in item 27.

**Why can't the townsfolk walk around?** They could. A walking townsperson
drawn the way players are drawn costs about what another player costs (a few
MB), because he reuses the body pictures already loaded. Today's townsfolk are
photographs, one picture per pose, chosen in October to save memory, and a
photograph can't walk in eight directions without eight more photographs. Item
22 redraws them as players, which is also what lets them work.

**Can the portraits move?** Yes, item 24.

**My phone gets hot.** It draws up to 60 or 120 frames a second at the phone's
full sharpness, with lighting, shadows and moving water. A Battery saver
setting would draw 30 frames a second at a little less sharpness and trim the
effects: about half the work, so a cooler phone. **M**

**How close is the arena?** Closer than it looks. Today the worker runs
tournaments of up to 8 (100 gold to enter, a prize for the champion), 1-on-1
duels with stakes, and onlookers can back a fighter with gold. What's missing
is the **place**: matches are fought wherever the two players stand. To build:
an arena ground (your ChatGPT picture, or one drawn in code to start), players
moved there for their match, a queue that pairs players of close level, and
stands where others watch without being hit. About a week.

**One ore = one bar, one log = one hardened wood?** I think it's right for the
judges. Today a piece of gear takes 5 bars, and a bar takes 5 ore: 25 rocks for
one sword. 1:1 makes it 5. My suggestions:
- keep each bar's XP tied to the ore it took (80 XP a copper bar instead of
  400), so Smithing levels come at the same pace and the gear comes faster;
- hardening and salvage stay in bars, so they get 5 times cheaper too;
- quests that say "5 ore for 5 bars" read right as they are.

**Ideas for code-made effects** (beyond the shadows, ambience and breaking
things):
- weather by land: snowfall, rain, sand blowing, falling leaves, embers;
- clouds' shadows drifting over the ground;
- grass and bushes that bend as you walk through them, birds that take off;
- fireflies at night, an aurora over Frost Ridge;
- a short hit-pause and screen kick on big hits, slow motion on a boss kill;
- loot that bounces when it drops;
- reflections in the water near the shore;
- a heat shimmer in the Flame Fields, low fog in the Poison Forest;
- music that swells in a fight and calms after.

---

## 5. What I need from you

1. **Land names**: pick from item 5, or write your own.
2. **The zone banners**: the "older ones" are your animated banners of
   Oct 2-18 (Frost, Flame, Wind, Verdant)? I'll go with that unless you say.
3. **One ore = one bar**: yes? And a bar's XP tied to its ore (my suggestion),
   or kept as it is (Smithing levels 5 times faster)?
4. **The Mayor's seed quest**: in addition to Farmer Bro's carrot quest, or in
   its place (Farmer Bro then starts at his second quest)?
5. **No man's land in the first stretch**: two judges playing at once could
   then fight each other there, if they both click Attack. OK?
6. **Night**: how often? I'd say 2 minutes of night every 15 minutes.
7. **The arena**: will you make its picture in ChatGPT, or should I draw one
   in code first?
8. **The vehicle**: skateboard or scooter? Bought from Diego, or made at the
   Woodworker's?
9. **Gems**: one raw gem cuts into one gem (no three-into-one)? And how much
   damage should a gem add: I'd say 10% of the weapon's damage, up to 15%
   against the element it beats.
