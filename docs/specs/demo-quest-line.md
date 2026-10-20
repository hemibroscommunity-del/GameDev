# The tour: the Mayor's quest, then the whole town (v2.3.3514)

The owner, a week before an exposé where reviewers give each game 20-30
minutes:

> "Right now my quest line is almost exclusively going to 4 zones to kill
> monsters and bring their remains back to mayor bro ... I'm trying to think
> of a good cross section of the game ... Mayor bro would hand off the quest
> to the next person etc. Or would it be better for each NPC to just have
> their own quests? ... I think it would be more fun if the quest line was
> more diversified ... I also think the quest dialog could be better. Like
> why is the character doing this? ... Keep the dialog witty and funny (it's
> an unserious game bro)."

## The call: the Mayor first, then the whole town

The first cut handed one line from giver to giver. Then the owner:

> "Maybe mayor bro is the only quest available for the first quest then
> after completing that other NPCs begin having quest icons appear above
> their head"

So **the Mayor's slimes are the only quest a new player is offered**, and
once they are handed in **six townsfolk offer their quests at once**, each
wearing the gold "!" over his head, on the minimap and on the world map. Each
giver's second step follows his first. The Mayor's snowmen, the finale, wait
until the whole town is done. The gold road still suggests one giver at a
time, in the order below, so a reviewer who just follows it sees everything;
one who wanders can take any of them.

| # | Giver | Quest | What you do | You get |
|---|---|---|---|---|
| 1 | Mayor Bro | Into the Blue | 4 Slime Remains from the Verdant Wilds (the exploding blue slimes, first: "they almost always get a good reaction") | sword + shield on accept; bow + staff, 25 gold |
| 2 | Farmer Bro | Carrot Comeback | plant and water 3 carrots on your farm | 3 carrot seeds + 3 compost on accept; 40 gold |
| 3 | Blacksmith Bro | Heavy Metal | 5 copper ore (the rocks just outside town) | pickaxe on accept; **5 copper bars**, 20 gold |
| 4 | Blacksmith Bro | Some Assembly Required | forge one thing from the bars: a sword, a chest plate or greaves ("your choice") | 60 gold |
| 5 | Woodworker Bro | Knock on Wood | 5 pine logs | axe on accept; **5 hardened pine**, 20 gold |
| 6 | Woodworker Bro | Branching Out | make a bow or a staff at his bench, then swap him a pine one | your pine bow or staff **becomes softwood**, 60 gold |
| 7 | Diego | Something Fishy | catch and cook 2 fish | fishing rod on accept; **10 cooked clownfish**, 40 gold |
| 8 | Farmer Bro | Zoom Juice | pick 3 carrots, cook Zoom Juice at the Cookhouse | 60 gold (and the juice) |
| 9 | Lil Bro | Race Day | beat Lil Bro round the town square | 50 gold |
| 10 | Beastmaster Bro | Box Traps | make 3 box traps at the Woodworker | 3 pine logs on accept; 2 traps, 40 gold |
| 11 | Beastmaster Bro | Set and Spring | spring 3 traps on monsters | 5 traps, 100 gold |
| 12 | Mayor Bro | Cold Reception | 4 Snowman Remains from Frost Ridge (the burrowing snowmen, the finale) | 200 gold, 50 XP |

When each can be taken:

- 1 first and alone.
- 2, 3, 5, 7, 9 and 10 the moment 1 is handed in, all at once.
- 4 after 3, 6 after 5, 11 after 10 (each giver's own next step).
- 8 (Zoom Juice) after 2 **and** 7: Diego's fish is where you learn to cook,
  and by then the carrots have grown (about six minutes, watered).
- 12 after 4, 6, 7, 8, 9 and 11: the whole town.

Diego hands over two pine logs with his rod, for the cooking fire: the town
opens all at once, so the Woodworker's axe may not be yours yet.

Then the Mayor's Wind Dunes and Flame Fields (tut_3, tut_4) and the
Beastmaster's Trapping 6 and first pet (beast_3, beast_4).

The Mayor's old "Learn a Trade" and "Rock Bottom" (fish for a pickaxe, ore for
a torso) are **retired**: their errands and tools belong to the men whose
trades they are now. A save that already holds one keeps it and can hand it in.

### The story (why everyone wants these things)

Slimes are exploding near town. The Mayor wants proof for the insurance guy,
and warns you they explode only AFTER you have met one (the owner's own joke,
kept). A slime blew up Farmer Bro's carrots. Blacksmith Bro hurt his back
lifting a sandwich ("Officially it takes 25 ore. Unofficially, I like you").
Woodworker Bro collects pine bows ("It's a whole wall. Don't make it weird").
Diego is writing a cookbook and has never cooked a fish, and his clownfish
won't stop telling jokes. Lil Bro beat Farmer Bro's scarecrow in a race. The
Beastmaster says pets are caught with boxes, not by running. And the snowmen
have learned to burrow toward the Mayor's office. Every line is in
`src/data/gameSystems.js` QUEST_CHAINS (the `dialogue` of each quest).

## How it works

- **The worker decides.** `server/src/data.js` QUEST_REWARDS has every step:
  its objective, its pay, `after` (the quest, or the list of quests, that
  must all be handed in before this one can be taken: `_questBarred` on the
  worker, `getNpcQuest` and `questAfterMet` on the phone) and `next` (only
  within a giver's own line: a `next` opens its step at once, past any
  `after`, so it never crosses to another giver). `QUEST_TOUR` is the order
  the road suggests. The phone's QUEST_CHAINS and QUEST_TOUR mirror it
  (mirror-audit checks `after`, the retired list, the trade and the order).
- **New objective types** the worker counts (quests.js `QUEST_COUNTED`):
  `farm` (beds worked, by act: farm.js), `craft` (a piece made at the forge
  or the bench: gear.js, armorforge.js), `cook` (a dish by what it makes:
  cooking.js) and `race` (race.js).
- **The swap** (wood_2's `trade`): at the hand-in the worker takes one pine
  bow or staff (the one you pick on the claim window; the one in your hands
  before one in the bag) and remakes it in softwood, its grade, gems and
  hardening kept (quests.js `_questTradePick`, `_questTradeApply`).
- **The road** (src/game/questRoute.js): with no quest in hand it leads to
  the giver of the first step of QUEST_TOUR he offers now (`tourOffer`);
  during a step done at a building, to its giver, whose
  "how's it going" line has a button that opens the building (game/tour.js
  `opens`); to the Cookhouse's door for the juice (a step's `door`); and to
  the next flag during the race.
- **The pinned quest card** says "Next: <quest>" and who to talk to, where,
  when no quest is in hand, and "+5 more: look for a gold ! on your map" when
  others have work too (BroTown.jsx, `tourOffer`'s `more`).

### The quest pins on the maps

The owner: "Make the quest icons appear on the minimap and map too". The pin
over a townsperson's head (his `_questMarker`: a gold "!" to take, the grey
"?" waiting on you, the green check to hand in, in the owner's own pictures)
is drawn on the Wheel's minimap for everyone the box shows (and, smaller, on
the box's edge toward anyone just off it: from where you arrive the box holds
about half the town), and on the world
map at every zoom, bigger and named once the town's buildings are, with "has
a quest" in the key (`src/game/questPins.js`, `wheelMinimap.js`,
`WorldMapOverlay.jsx`). One source, the head's own mark, so a map never
disagrees with the head. The minimap's pictures are the heads' (loaded on
the loading screen); the world map loads its copies as it opens and lets go
of them as it closes, as a window does.

### The gear the tour hands out

- **Copper swords at Smithing 1** (iron 5, black steel 10): the levels the
  armour forge already asked for the same bars. And the forge now asks what
  WEARING the piece asks (gear.js), so a new player can make the copper sword
  their bars are for (it used to need Melee 5 to make and nothing to wear).
- **Bows and staffs are made from hardened wood**: five of their tier's
  hardened wood (the owner: "Bows/staffs should require 5 hard wood before
  making them (5 logs in that tier make 1 hard wood). It should mirror the
  cost of making armor"); each at the Woodworking level its hardened wood is
  made at (1 / 5 / 10 / 15 / 20); the woods past maple keep their logs.
- **So the metal side mirrors it: five bars** for a sword, a greatsword, a
  torso or greaves (four since v2.3.3141). 25 ore or 25 logs a piece, and
  the tour's five bars and five hardened pine make exactly one each. The XP
  moves with the bars (200 / 300 / 400 a bar: 1,000 / 1,500 / 2,000 a piece;
  a bow or staff 1,000 to 3,000). Salvage still gives two bars back (half,
  rounded down, so a forge and a salvage never pay).
- **Softwood is free to wear** at any level, like iron: the owner's "the tier
  after pine should still be wearable at lvl 1 magic/staff and lvl 1 bow but
  the gate to create those items is lvl 5 woodworking".
- `caps.tourgear` tells the phone's forge and bench windows the new rules.

### Zoom Juice

Recipe row 9 at the Cookhouse: 3 carrots, Cooking 1, makes `zoomJuice`, a
bottle drunk from the bag: run 25% faster for 5 minutes (data.js SHOP_ITEMS
`zoomJuice`: spdBuff x1.25, 300 s; the worker's move bound widens by as
much). Never sold.

### Lil Bro's race

A lap of the Town Hall's square: four corner flags and back to Lil Bro's
spot. The worker owns it (`server/src/race.js`): `race_start` answers with
the course and a 3-second countdown; every move it accepts is tested against
the next flag along the step (no hopping over one); a lap begun away from the
line is a false start; finishing before Lil Bro's time is a win and counts
for race_1. Lil Bro runs 165 px a second (a walk is 150, a sprint 200, Zoom
Juice walking 187): walking you lose by about 1.6 s, sprinting or with the
juice you win (tour.test.mjs §1 works it out on the real course).

The phone (`src/game/race.js`, `ui/mobile/RaceHud.jsx`,
`rendering/raceFlags.js`) holds you on the line through the countdown, runs
Lil Bro along the worker's path at the worker's speed (his four straight walk
strips load with the Wheel's cast, about 1 MB), draws the flags (gold next,
green touched, a chequered finish) and the countdown, the clock and the
result card with "Race again".

### The two new townsfolk

**Woodworker Bro** (west of the Woodworker's steps) and **Farmer Bro** (by
the Feed & Seed) stand in the Wheel's BroTown against a worker that says
`caps.tour`, each the keeper of his building (his quests done, talking to him
opens it). Their pictures are stand-ins made by
`tools/make_tour_townsfolk.py` from art the game already has, until the
owner's own (docs/ART-WISHLIST.md has the prompts). Blacksmith Bro and Diego
now give quests too; walking past them to their doors does not stop you with
"how's it going" (`quietProgress`).

### "Remains", not "remnants"

Everywhere a player reads it: the quests, the bag, the trade window, the
market, the codex, the mail (`src/data/remains.js`, one table). The item keys
(`slime-remnants`...) stay, as they are in every saved bag.

## Switches and levers

- `tour: false` in the live flags hides the two new townsfolk (the quests
  stay the worker's); `race: false` hides the Race! button and starts no race.
- Test panel: **Tour: jump to** puts your character at any step (the steps
  before it handed in, no rewards paid) -- for rehearsing a step
  (`/dev/tour {at}`). `/dev/questcount {quest, n}` sets a counted step's
  count (the phone scenario uses it).

## Tests

- `tour` suite (server): the table (the Mayor alone, then six at once, the
  finale on the whole town, no `next` past an `after`), the order, every
  step through its real handler, the swap, softwood, five bars and five
  hardened wood, Zoom Juice, every race rule, the levers.
- `quest-pins` suite: the phone's side -- who offers what at each point
  (getNpcQuest), `questAfterMet`, and the pins.
- `mirror-audit`: the two tables agree on `after` (lists too), the trade,
  the retired quests, and QUEST_TOUR.
- `test-world-core`: the two new townsfolk's spots and keepers; the race
  starts at Lil Bro's spot and its flags and his line are clear of every
  building and prop.
- `mp-questline` (CI's "playable"): the whole tour on a phone, giver to giver,
  through the real dialogues, the road and the card checked at every hand-off;
  after the Mayor's first quest, the six pins over heads, on the minimap and
  on the world map, and the card's "+5 more".
- `mp-race`: the race on a phone, a win and a false start.

## Not done

- The stand-in pictures of Woodworker Bro and Farmer Bro (the owner's own
  pictures replace them).
- A race against a "clone of you": Lil Bro races instead (an NPC with walk
  strips already, where a clone would be a fake player every system reading
  players must ignore).
