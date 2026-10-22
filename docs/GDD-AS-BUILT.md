# BroTown (Hemi Bros ARPG) — Game Design Document, As Built

**Version described:** v2.3.3547 (main, 2026-10-21: v2.3.3530 plus the changes merged since, v2.3.3533–3541 and v2.3.3543–3546) · **Platform:** browser game at brotown.net, iPhone Safari first · **Status:** live, free to play, pre-launch content ("players start fresh at launch")

> **What this document is.** A description of the game that exists in the code today, written from the server and client source and the implementation specs of shipped features. It replaces, for evaluation purposes, the original design document (README.md), which describes a much larger imagined game that was never built. Where this document gives a number, the number was read from the code. Where a system is planned, partly built, or switched off, it says so in the section's "Not built" list and in Part 12.
>
> **What this document is not.** It is not a roadmap and not a wish list. Systems listed as "planned" are the owner's open options, not commitments.

---

## 0. Brief for the evaluator

This document is being given to an AI model to find areas for improvement. To make that evaluation useful, here is the frame.

**The ask.** Evaluate the game as designed and built: where is the design weak, incoherent, under-motivated, over-complicated, unbalanced, or likely to lose players? Where does it give the best return for a small team's effort? Rank suggestions by expected player impact per unit of work. Prefer suggestions that change rules and numbers over suggestions that need large new art or content, and say which is which.

**The constraints the design lives under (not negotiable in the short term).**

1. **One developer** (the owner, who directs the design and commissions art from ChatGPT prompts) plus AI coding sessions. There is no art team, no QA team, no community team. A suggestion that needs "a dozen new monsters with animations" costs weeks; one that changes a table costs an hour.
2. **100% server-based multiplayer, one shared world.** Everyone plays on one Cloudflare Durable Object room with a cap of 120 players. There is no single-player mode and never will be (owner directive). Instanced play exists only for dungeons (4 players), the arena, and each player's farm. Every rule that matters is settled on the server.
3. **iPhone Safari, portrait, one thumb each side.** Memory on the phone is the hard wall (a tab dies near 250 MB); every feature is budgeted against it in CI. Landscape and desktop are supported second.
4. **Pixel art at 2 px per game px, commissioned from ChatGPT, processed by the game's own tools.** New art is possible but slow; recolours and code-drawn effects are cheap.
5. **Free to play, no purchasables, no play caps.** A $2-per-30-days supporter pass paid in ETH on the Hemi chain is designed but not built. The owner's NFT collection (Hemi Bros) gives only a cosmetic badge.
6. **A reviewer exposé is a week away** (as of 2026-10-19); reviewers will give the game 20–30 minutes. The first half hour is therefore the most valuable surface to improve.
7. **It is still a demo with no live players.** The owner, 2026-10-21: "the game is still a DEMO with no other live players yet. If everyone needed to start from scratch it's no problem." A change that would need a save migration for live characters can instead start everyone fresh.
8. **Simplicity and intelligibility come first.** The owner, 2026-10-21: "I value SIMPLICITY and INTELLIGIBILITY it's far more important for me that the player understands the game than to have precise finely tuned details." Prefer the change a player can understand in one sentence over the finely tuned one, and a rule that holds everywhere over a special case.

**Decisions the owner has already made and reversed or rejected.** Part 11 lists them per screen and system (daily quests removed, no ground quest path, no monster-dropped random weapons, no food from shops, and so on). Suggestions that re-propose one of these should say why the earlier reason no longer holds.

**Vocabulary.** "The Wheel" is the whole world map (BroTown in the middle, eight lands as spokes). "BroTown" is the town at the hub and also the player-facing name of the Wheel zone. "A land" is one element's spoke. "A stretch" is five levels of a land. "No man's land" (NML) is the PvP-enabled part of each land. "The worker" is the game server. "Bro" is the player character. Numbers in "px" are game-world pixels; a bro is about 64 px tall on screen and 100 px tall in world units.

---

## Contents

- Part 1. Overview
- Part 2. The world: the Wheel, BroTown, and getting around
- Part 3. The player: identity, creation, progression, pools, death
- Part 4. Controls, the screen, the menus, and the first minutes
- Part 5. Combat (player versus monster)
- Part 6. Monsters, loot and dungeons
- Part 7. Life skills, crafting and gear
- Part 8. The farm, food and pets
- Part 9. The economy, shops, trading, daily rewards and quests
- Part 10. Player versus player, and the social layer
- Part 11. Presentation: art, audio, effects, and the owner's standing decisions
- Part 12. Platform, fairness, operations and the business model
- Part 13. What is not built, put away, or dormant (consolidated)
- Part 14. Open questions and tensions already on record

---

## Part 1. Overview

### 1.1 What the game is

BroTown is a real-time, server-based multiplayer action RPG played in a phone's browser, in one shared world with up to 120 players at a time. You make a "bro" (a small pixel-art character you can draw on), walk out of a frontier town into eight element lands laid out like the spokes of a wheel, fight the land's monsters with a sword, a bow or a staff, gather ore, wood and fish, craft gear, farm, trap pets, and fight other players in the outer rings if you choose to. The tone is deliberately silly ("it's an unserious game bro"): the Mayor's insurance guy, Diego's "No zombies in my store!", quick-line emotes like "Bruh" and "gg ez". It is tied to the owner's Hemi Bros NFT collection only by a cosmetic badge; play is free and there is nothing to buy.

### 1.2 The loop

1. **Arrive** on the town square, unarmed, held on the safe commons until Mayor Bro's first quest arms you (a sword and shield on accept; a bow and staff at the hand-in).
2. **The tour**: six townsfolk then offer their lines at once (farming, smithing, woodworking, fishing and cooking, a foot race, trapping), each teaching one building and one system, ending in the Mayor's finale (the burrowing snowmen) and two more hunts.
3. **The lands**: walk out a gate down a road into a land whose monsters climb from level 1 at the town end to 40 at its far camp; kill for skill XP (0.2 per point of damage, into the weapon's own skill), gold, remains, shards and the one-roll drop; the XP fades for anything 5+ levels below you, so the game keeps pulling you outward.
4. **The lands feed the town**: ore, logs and fish come back to the Blacksmith, the Woodworker, the Gem Works and the Cookhouse; shards become gems that give a weapon its element; crops from your farm become meals and brews for fights.
5. **Risk**: from each land's second ring onward is No man's land, where other players within a few levels may attack you after a confirmation window, and a death there costs everything carried.
6. **Depth**: three dungeons, a persistent party of up to 50 that becomes an alliance at 20 active members, duels, an arena, pets that ward their land's element, a monster codex, hardening as the long gold sink, and material rungs that today stop at obsidian (rung 5 of 20).

### 1.3 Pillars as the code expresses them

- **One world, one truth.** Everyone is in one room; the server rolls every hit and settles every coin; a phone only predicts.
- **The Wheel.** A seamless map where level is distance from town and the element of the land is the element of everything in it: its monsters' statuses, its shards and gems, its trees' specks, its music.
- **Phone first.** One thumb each side, controls that appear when they can do something, menus that never pause the world, a band never taller than a third of the screen.
- **Numbers you can feel.** Front-loaded stat curves (the first point is the biggest), damage numbers 1.75× size, every tier step ~+18%, grades that are "game-breaking good" at the top.
- **Everything is a choice.** Attacking a player, taking a point, doubling a pot, cracking a shard, hardening a blade: each is a deliberate press with the odds shown.
- **Art the owner can commission.** HD pixel art processed by the game's own studios; everything that moves is drawn in code.

### 1.4 Scope in numbers (as built, 2026-10-20)

| | |
|---|---|
| Lands / levels populated | 8 lands, levels 1–40 of a planned 1–80 (+ realms 80–100) |
| Monsters | 9 kinds (+ the skeleton), recoloured for levels 21–40; 1,920 standing on the Wheel |
| Dungeons | 3 of 8 lands (3 waves and a boss, up to 4 players) |
| Weapons | sword/greatsword, bow, staff on a 20-rung material ladder, 5 rungs reachable |
| Armour | torso and greaves in copper, iron, black steel; one shield |
| Life skills | 10 (five gathering, five crafting); resources in 5 tiers |
| Crops / recipes / fish | 16 / 10 / 5 |
| Pets | 9 kinds (18 looks) |
| Quests | 16 live tour quests + 3 legacy errands; 22 dormant |
| Buildings | 16 standing, all 16 open (11 doors + 5 halls; the Hotel since v2.3.3539) |
| Social | parties to 50, alliances at 20, friends, 5 chat lanes, 30 emoji, 13 moves |
| Players | 120 a room, one room |
| Specs / tests | ~250 feature specs; 165 server suites; 566 phone scenarios |

### 1.5 How to read the parts

Parts 2–12 describe each system with its rules and numbers, each ending with what is not built in that area. Part 13 collects the gaps in one place; Part 14 lists the open questions and tensions the owner or the specs have already named, which is where an evaluator's attention is most likely to be rewarded.

---

## Part 2. The world: the Wheel, BroTown, and getting around

### 2.1 The shape of the world

The whole game is one seamless map, **the Wheel** (zone id `wheel`, shown to players as "BroTown"). At the hub is the town and its safe commons; from it run eight **spokes**, one land per element, each a long capsule of ground with sea between them; the open sea is a wall, so the spokes are joined only through the hub and the two **passes** between neighbours at levels 20 and 60. Every spoke is sixteen **stretches** of five monster levels each (1–80), one stretch per level band; at each tip the plan places a keystone **gate** to a Dark or Light realm (levels 80–100). The live Wheel is the "long" one, rebuilt five times longer at the owner's "Maybe 5x larger map is needed": a stretch is 5,120 px (about 34 seconds of walking), a spoke is about 85,000 px from the Town Hall to its tip (about ten minutes), the world is 174,336 px square. The positions are deterministic so a phone and a computer never disagree about a line.

**What is populated**: eight stretches per spoke, monster levels 1–40, with resources in four bands and the commons. Stretches 9–16 (levels 41–80), the camps at 60 and 80, the Lv 60 passes, the tips and the realms are drawn terrain with nothing in them. The gate signposts and the codex say "Lv 1–40".

| Land | Element | Compass | Monsters (first stage look → second stage recolour) | Landmark / dungeon | Music |
|---|---|---|---|---|---|
| Frost Ridge | frost | NW | Snowman → Glacier Snowman | — | frost.mp3 |
| Flame Fields | flame | N | Fire Goblin → Cinder Goblin | — | fire.mp3 |
| Wind Dunes | wind | NE | Mummy/Skeleton → Gilded | the Buried City (Lv 41–45) | desert.mp3 |
| Stone Hollows | stone | E | Rock Monster → Amethyst Golem | the Great Cave (Lv 26–30) | the theme (no track yet) |
| Electric Foundry | storm | SE | Slime → Storm Slime | the Foundry Dome (Lv 26–30) | the theme |
| Water Caves | water | S | Fishman → Coral Fishman | — | the theme |
| Poison Forest | venom | SW | Mire Wisp, Bog Lurker → Spectral, Shade | — | the theme |
| Verdant Wilds | flora | W | Blue Slime → Jade Slime | the Goo Grotto (Lv 1–5, v2.3.3540) | forest.mp3 |

Each land has four named **stages** (one look per twenty levels: Frost Ridge's thaw line, snowbound taiga, glacier, frozen crown) with a named **camp** at the middle of levels 20, 40, 60 and 80 (Trapper's Rest, the Snowshoe Lodge …); camps are clearings in the ground plan with nothing standing or happening in them. Sixteen named passes (Geyser Gap, Cinder Crossing, Ore Cut …) join neighbours at 20 and 60; nothing in the server treats a pass specially. A river (the Sweetwater) runs from the glacier through the commons to a delta; a mine railway runs from the Rail Depot outside the east gate down the Stone Hollows to the Great Cave; ten oases ring the Wind Dunes' palms; Bro Pond lies south-west of town. The Dark gates are on the four compass points and the Light gates on the diagonals, by plan only: no gate object exists and no way into the `shadow` or `radiant` zones exists from the Wheel.

**The safe ground** is one circle of 2,937 px round the Town Hall: no monster targets, chases or hits anyone on it, except a monster that player **provoked** (hurt it this life and dealt damage to anything in the last 10 s), which follows them onto the grass and out to 1,800 px from its home. An unprovoked chase ends 720 px from home. Monsters know nothing of water or walls on the server side: they follow you into rivers and through props.

**No man's land** (the PvP rings, Part 10) begins at each land's Lv 6–10 ring (ring 1) and counts up to 15 at Lv 76–80; the hub and the Lv 1–5 ring are never PvP. The rings are plain radii from the centre so phone and server agree.

### 2.2 BroTown

A courthouse-square town laid at 1.5× its plan's plots with the buildings drawn at 1.15×, "a designed place" since the owner passed on a reviewer's note that it read "as one huge tan clearing": grass between the blocks, an earth apron round each plot, a worn verge along each street, a paved square 576 game px across under a Town Hall drawn 18% bigger, districts, fences and hedges on the edge, a wagon yard inside each gate. Main Street runs north–south and Market Row east–west; each street leaves through a **gate** (about 2,000 game px from the centre) and becomes an Old Road to a land, with a trail forking off it to the neighbour (North Road → Flame Fields, the Frost Trail; East → Stone Hollows, the Dune Trail; South → Water Caves, the Foundry Road; West → Verdant Wilds, the Bog Trail). A signpost at each gate shows two plates, popping up when you are within 300 px: the land straight on and the land whose trail forks off, with an arrow, the element's icon and "Lv 1–40".

**Sixteen buildings stand** (the plan's seventeenth, the Assay Office, was removed when the owner chose one gem building). Nobody walks inside: standing with your boots within 140 px of a building's steps shows a small "Enter" button over its sign; a tap, E, or a tap on the right stick opens the building's window over the street with the owner's picture of the room as the window's background.

| District | Building | What the door opens |
|---|---|---|
| North, west side | Guild Hall | the ten skill guilds (and "Clans are parties now") |
| | Blacksmith | the forge (Smelt, Forge, Armor, Upgrade, Amulet, Salvage) |
| North, east side | Post Office & Telegraph | your mail and friends' messages |
| | Woodworker | the bench (Bow, Staff, Traps, Harden) |
| South, west side | Saloon | your party, Invite a player, the alliance part |
| | Gambling Den | the free daily spin, the wager, the weekly jackpot; Ace stands beside it |
| South, east side | Hotel | **Rest**: full health, stamina and mana and Well Rested (+10% combat XP for 30 minutes), free, paid by the server (v2.3.3539) |
| | Sheriff's Office | Duel a player (the player list) and the arena sign-up |
| West, north side | Cookhouse | recipes and your cooked food |
| | Feed & Seed | Visit Your Farm, Seeds, Orders |
| West, south side | Land Office | travel to your farm |
| | General Store | the Exchange (the order book); Diego stands beside it with his own shop |
| East, north side | Bank | a display of your gold and gear ("Nothing can be stored here yet") |
| East, south side | Gem Works | Cut gems / Set gems |
| | Auction House | listings by players |
| Centre | Town Hall | the Leaderboard and the World map; Mayor Bro beside its steps |

Eleven of these count as building visits for the Mayor's "Visit 3 buildings" errand; the four halls (Guild Hall, Post Office, Sheriff, Town Hall) do not.

**Townsfolk** stand still in the Wheel's town, facing the street: Mayor Bro east of the Town Hall's steps (the first quest, his chain, then the Town Hall), Lil Bro on the square 260 px west (the race), Diego west of the General Store (his shop; the fish quest), Ace west of the Gambling Den (his coin flip, on a tap only), Blacksmith Bro east of the forge (smithing quests; then he opens the forge), Beastmaster Bro east of the Woodworker (trapping quests; then the Pets page), Woodworker Bro and Farmer Bro west of their buildings (their quests; then their buildings). A keeper's quest always comes first; nine buildings have no keeper yet (art pending). Over a giver's head: a gold "!" for a quest to take, a grey "?" accepted and waiting, a green check ready to hand in, a talk bubble when he has nothing. A new character is held inside the safe circle until the Mayor's first quest is accepted ("Speak to Mayor Bro first — he'll arm you").

### 2.3 Finding your way

- **The minimap** (top right, 132 × 132 CSS px, opaque, a 7 px slate-and-brass frame with a brass N) shows 3,200 game px across: the land in its flat colour, the sea, roads, river and railway as clean lines, the town, camps, passes, gates and landmarks, you as a chevron, other bros green, monsters red, your party blue, resources as tier-tinted glyphs, every building on its footprint with its icon, quest pins over givers. Under the map a **name plate** names the land with its icon and colour over the level band in gold ("Lv 6–10"), "safe" at home. The **quest's gold road** runs from your chevron to a gold star where the tracked quest leads (held at the box's edge when off it); nothing is drawn on the ground (the owner: "rely on the gold road on the minimap"). A **home badge** rides the edge toward town whenever town is off the box.
- **The world map** (a tap on the minimap, or M) is full screen, north always up, zoom 1 to 28 (and ~4× further on the long Wheel): the lands' names and the gold road always; other bros from 1.5; the gates and the realm each leads to from 1.6; each land's stages and levels from 2.2; level-band ticks from 2.6; camps, passes, resources by tier and nearby monsters from 3; landmarks, bridges and Bro Pond from 3.6; "Lv 6–10" in each band from 4.2; road names from 4.6; in town every building named at its door from 6. In BroTown it opens on the town. Far-off land loads sharp detail tiles only while shown.
- **The top bar** says "BroTown"; crossing into a land plays a plaque banner with the element and name that docks into the minimap's plate, and the owner's small scene for the land shows under the minimap for ~3.6 s; the land's music starts 1.2 s after crossing and the town's returns only after 8 s back on the safe ground.

### 2.4 Moving

| Move | Rule |
|---|---|
| Walk | 150 game px/s base (up to ~441 with every legitimate buff). Your position is your body's centre; doors, water and footprints are judged at your boots, 52 px below. Only water and object footprints stop you (cliffs and lava are drawn ground you walk over). Bridges are walked. |
| Sprint | a tap on the winged-boot button north of the attack disc (Shift on a keyboard): 1.33× while moving, 11 stamina a second, needs 5 to start, ends at zero, on a second tap, after 0.7 s standing, on the shield, an attack, the water, death or a zone change. The server bills it. Others see your legs at sprint pace and dust at each foot plant; the owner's grunt at the push-off, a worn-out grunt or an out-of-breath when it runs dry. |
| Jump | a tap on the right stick when nothing else applies (X on a keyboard): the picture rises 85 world px over 625 ms on four frames of the jog with squash, stretch and lean; your position never leaves the ground. While the lift is at least 36% of the peak your feet clear anything **low** (fences, walls, rails, barrels, crates, benches, troughs, hay bales, stones, bushes, stumps, minecarts, rowboats, anything 87 px tall or less); everything else (trees, boulders, carts, buildings, resources, monsters, people, open sea) stops you in the air. No swing, shot, roll, shield, harvest or second jump until you land. |
| Swim | every river, pond, lake, oasis and the sea's shallows (about 120 px out from a coast), never the open sea; 0.55× your walk in strokes every 650 ms with a glide; no swing, special, burst, ability, roll or shield in the water ("Swimming!"), no jump; sunk to the neck with a foam ring; monsters follow you in. A fishing or mining seat stays dry while you sit on it. |
| Roll | a swipe on the left half of the screen (Space): one stamina block, 250 ms for every current character, i-frames against every monster blow you can see coming inside a 1 s window the server opens; with a target it becomes the sword's lunge or the bow's and staff's retreat shot. |

**Props take hits, on your screen only.** Every object has a material (its sound and the pieces that fly) and hit points: flowers 1; barrels, crates, benches, bushes 3; fences, lamps, signposts, cactus 4; carts, stones, crystal 6; most trees and rocks 8–10; gates 14; jungle trees and pylons 16; every building 24; the Town Hall 30. A plain hit is 1, a special 3. Arrows stick in a prop 90 s, bolts leave burn marks, a tree's crown sheds, each hit shakes the object; the count is forgotten after 30 s; at the break the picture shatters into shards of itself that settle on its footprint, which leaves the walk test at once; mended after 3 minutes (never under you), at most 24 broken at once. A building hit often enough **catches fire** where it is hit (smouldering from 12% of its hits, alight at 25%, flames climbing the wall) and collapses burning. The server knows nothing of any of it; nothing changes for other players.

### 2.5 Arriving, dying, leaving

- **A session** starts at one loading screen (the owner's "washed ashore" clip) that waits for the server and for your arrival on the Wheel's town square, 108 px south of the Town Hall's door, Mayor Bro to the east, Lil Bro to the west, a welcome plate ("Find Mayor Bro — he wants a word. Follow the gold road on your map.") with one button, Skip tutorial.
- **A death** respawns you on that square after 5 s with every pool full.
- **The old town** (the game's original BroTown map) is only an unseen stop on every way in; nothing leads back to it. **The old lands** (eight zones and a World View with trails) are closed; their code still runs the Wheel's monsters, and `?trial=off` reopens them for one tab.
- **Dungeons** (Part 6.8): a mouth at a land's landmark, "⚔️ Enter the Great Cave" within 200 px; a run comes out at the mouth; a death comes out in town. **The farm** (Part 8) is reached from the Feed & Seed or the Land Office and its gate leads back to the door you left by.
- **A reconnect** joins where the server last had you, judged at honest walking speed for the time away (an hour's memory).

### 2.6 Not built, put away, open in the world

- Levels 41–80, the camps as places with anything in them, the Lv 60 passes as more than ground, the keystone gates and the Dark and Light realms; four lands' dungeons; mouth pictures.
- Keepers for nine buildings; townsfolk who walk; walk-in interiors (rejected: keepers and room pictures were chosen instead).
- Elevation (a plan with a knoll behind a switch, "nothing here is built yet"); weather (no rain; the Wheel is always day though a 40-minute day and night exist in code and run on the farm and the old zones); monster collision with walls and water.
- Music for four lands (the owner declined reusing the old world track; ~25 MB more memory).
- Put away behind switches: the ground quest path, the short Wheel, placing v2 (woods and glades), the big-town previews, ground edge pieces and blends, the town's boardwalks, the dedicated jump button.

*Sources: public/tools/world/plan.js, core/wheel.js, core/ground.js; server/src/wheelspawns.js, wheelzone.js, wheeldungeon.js, nomansland.js, sprint.js, movement.js; src/data/wheelLands.js, wheelBuildingDoors.js, wheelSignposts.js, zones.js, wheelMaterials.js; src/game/jump.js, wheelSwim.js, wheelBreak.js, wheelHome.js; src/rendering/systems/wheelMinimap.js; src/ui/WorldMapOverlay.jsx; docs/WORLD-MAP-PIPELINE.md, docs/specs/wheel-5x.md, wheel-doors.md, wheel-halls.md, gate-signposts.md, wheel-swimming.md, jumping.md, sprint.md, wheel-land-music.md, building-rooms.md, no-mans-land.md, quest-path-guide.md.*

---

## Part 3. The player: identity, creation, progression, pools, death

### 3.1 Identity and the Login Key

A character is a server record keyed by a player id. **There is no account**: no email, no password, no social login. The only credential is the **Login Key**, eight short words made by the server (from a 1,422-word list, ~84 bits, for example `crowd-crate-yoga-eagle-rule-agony-mop-grove`), shown once, stored only as a fingerprint, good from any device. One key is one character; a device keeps up to 10 characters in its roster and can hold a key per device per character (12 keys, 12 devices). Older self-made 4-word keys still work but only on the devices the character was played on; a new device shows a code to send the owner, who lets one device in for 30 minutes from an admin panel. Five wrong keys for an id in a minute lock that id for a minute; refusals never destroy a key. Losing every key is losing the character, by design. iOS Safari evicts all script storage after about 7 days without a visit, so the key is the only recovery across that.

The door: every load stops at CONTINUE (the roster: portrait, name, level, "Played 3d ago"; each card's menu holds *Restart at level 1* and *Remove from this device*, both needing a typed "yes") or CREATE CHARACTER, with "Playing on another device? USE LOGIN KEY" folded in one line. In game, More → Login Key shows the words with Copy and the warning that there is no email recovery. Nothing pops up at login (the daily chest was removed). A `?guest=1` tab gives a throwaway identity for testing two players in one browser. A brand-new character can be asked for a Cloudflare Turnstile check; this is built but off until the owner sets the secrets.

**Restart** (Settings or the roster card): the server snapshots the record for the owner's undo, deletes the character, its quests, gear ledger, farm, pets and codex, leaves its party; keeps the key and devices, friends, mutes, mail, login streak, hardening ledger, guild claims, daily-rewards record and the No man's land skull. The next join is a level-1 character from the server's defaults.

### 3.2 The creator (cosmetic only)

Nothing chosen in the creator reads into a hitbox, reach, speed, damage or defence. The one physical option that ever existed (height and frame) was a render scale, and the owner removed it ("It looks bad. Use the medium character only").

Nine tabs in a 3×3 grid, opening on Skin: **Hair** (none + 8 styles, 14 colours), **Hats** (none + 39, 12 colours), **Skin** (species Human or Monkey; 13 rollable tones from Alabaster to Ebony plus 12 novelty tones such as Alien Cyan, Purple, Snow that Randomize never picks), **Eyes** (5 styles: Normal, Sleepy, One Eye, Demon, WTF; 9 colours), **Eyewear** (none + 8: 3D Glasses, Goggles, Laser Glasses, Thug Life, White Glass, Golden Monocle, Golden Glasses, Eye Patch), **Beard** (none or beard, 8 colours), **Shirt** (none or T-shirt, 13 colours, 9 tile patterns), **Pants** (14 colours, patterns), **Shoes** (8 colours, patterns). Skin, shirt, pants and shoes each carry a **drawing card**: a 16×16 pixel editor with 16 inks, three brushes, pen/eraser/fill/shapes/letters/mirror/select, undo, and 37 ready-made designs in eight categories (Skulls, Blades, Beasts, Fire, Hearts & Flowers, Sky, Symbols, Tribal); face front and back, chest front and back, arm, shirt front and back, pants front and back are separate canvases. A name is 2–20 characters with a random-name roller ("… Bro / Flex / Gains"). Randomize rolls the whole look; Reset gives "bald shirtless". The look is permanent per character apart from what the game's own panels change later (a shirt can come off and go back on from its item card; worn armour and capes come from play, not the creator).

### 3.3 Progression v3: three skills, one level, two point pools

| | Rule |
|---|---|
| Skills | **Melee**, **Bow**, **Magic**, each 1–100, trained only by use (0.2 XP per point of damage dealt with that weapon; a special trains the weapon that fired it). |
| Character level | **your best weapon's level** (1 to 100; v2.3.3538, it was the three added together, 3 to 300). A new character is level 1. Trying a second weapon no longer raises it. |
| Quest XP | paid flat into a chosen skill (the first quest pays none). All quest XP was halved with the damage rate in v2.3.3054. |
| XP fade | a monster 5+ levels below the trained skill pays a third, then 15% less per level; full XP down to 4 below. Its name plate turns grey. |
| XP curve | to go from level L to L+1: ceil(280 × 1.16^(L−1)): 280 at 1, 1,065 at 10, 4,698 at 20, 20,723 at 30, 403,274 at 50, ~581 million at 99. Cumulative to 100 is ~4.2 billion; at 0.2 XP per damage point this is a lifetime curve by construction. |
| At a level-up | HP, stamina and mana fully restored; 3 **lane points** stamped to the skill that earned them, and 3 **shared points** when your character level rises (a weapon below your best pays its own lane points only; v2.3.3538). |
| Lane points | buy only that weapon's six offense stats; shared points buy only the seven body stats. |
| Spending | one point at a time, "are you sure" with a now → after preview. A free **points reset** (v2.3.3541) gives every placed point back: two taps on the Points tab's "Reset points (free)", refused in a fight and within a minute of the last one; levels, XP and gear kept. Waiting points make the Character tab glow and the counts in the Points tab's gold weapon and character frames breathe (v2.3.3559, the owner's art: gold with points, grey at 0). |
| Bound | a stat may hold no more points than your character level; Power, Luck, Special and Elemental may hold twice that. |

**Per-weapon lane stats** (six per skill), all on the front-loaded curve `max × q / (q + k)`:

| Stat | Curve | 1 pt | 5 pts | 20 pts | 50 pts | Uses the edge | What it does |
|---|---|---|---|---|---|---|---|
| Power | +100% max, k 7 | +13% | +42% | +74% | +88% | yes | multiplies base + skill term before the tier |
| Luck | crit 1% + 60% × curve; crit mult 1.5 + 2.0 × curve | 9% / ×1.75 | 26% / ×2.33 | 45% / ×2.98 | 54% / ×3.25 | yes | crit chance and crit damage in one |
| Special | +150% max, k 7 | +19% | +63% | +111% | +132% | yes | special damage |
| Elemental | 120 max, k 10 | 11 | 40 | 80 | 100 | yes | the P in burn, root, thorn and collisions; needs a gem |
| Speed | −39% max, k 10 | −4% | −13% | −26% | −33% | no | attack period |
| Range | +55% max, k 10 | +5% | +18% | +37% | +46% | no | reach of swing, arrow, bolt |

**Shared stats** (seven, one set):

| Stat | Rule | 5 pts | 20 pts | Uses the edge | What it does |
|---|---|---|---|---|---|
| Max HP | +40 per point, cap 100 | +200 | +800 | no | the bar |
| Defense | 90% max, k 7 | 38% | 67% | yes | cut on a base hit |
| Dodge | 90% max, k 7 | 38% | 67% | yes | a base hit misses outright |
| Resist | 90% max, k 7 | 38% | 67% | yes | cut on an elemental hit (the only stat an elemental hit meets) |
| Stamina | +3 per point, cap 100 | +15 | +60 | no | the bar and the block ladder |
| Max Mana | +2.5 per point, cap 100 | +12.5 | +50 | no | the bar and the block ladder |
| Move Speed | +35% max, k 10 | +12% | +23% | no | walk speed |

Dodge and Defense together never let less than 10% of a base hit through. Elemental damage today is a short list: the fire goblin's ground fire, the blue slime's burst, storm arcs and burn/poison ticks; every ordinary swing is base damage. The lifetime supply is 297 lane points per lane against 525 lane sinks (lane pools stay scarce), and 891 shared points against 625 shared sinks (every shared stat can be maxed by about character level 220).

**Gear gates**: a weapon needs its trained skill at tier index × 5 (iron and softwood free); since v2.3.3544 armour, shields and amulets gate on your **character level** (the best weapon's), at the numbers armour and shields once asked in allocated Defense points and amulets in Magic levels (`gearlevel: false` puts those back). Gates apply at equip time only; worn gear is grandfathered.

**The Points window** is a four-column accordion (MELEE | MAGIC | BOW | SHARED) following the weapon in your hand, each stat a row with a [+] and an explainer, and a **live preview**: the window fights a Starting Meadow slime (58 HP, a 10-damage ball) with your real character before and after the point, through the client mirrors of the server's arithmetic, printing "Slime down in N hits · T s", "Slime hits to drop you", "Guard holds vs. a slime", "Cross the meadow", "Specials on a full bar". The Hero sheet's Equipment tab shows fourteen stat pills (HP, Stamina, Mana as bars; Damage, Range, Attack Speed, Crit Chance, Crit Dmg, Special Dmg, Elem Power in gold with DPS; Defense, Armor, Stamina, Dodge, Move, Resist in blue).

### 3.4 The pools

| Pool | Formula | New character |
|---|---|---|
| Max HP | 100 + 50 × character level + 40 × points (shown ÷5) | 250 (shows 50) |
| Stamina | 100 + 3 × points | 100 |
| Mana | 100 + 2.5 × Magic level + 2.5 × points | 102 |

Blocks: a bar holds 5 blocks, plus one at every 20 invested (Magic level + Max Mana points for mana; Stamina points for stamina), to 10; a block is a fifth to a tenth of the bar, and every special, burst, roll, lunge, retreat shot, bash and whirlwind costs exactly one. Investing therefore buys more casts, not only a bigger bar. Sprint costs 11 stamina a second while moving (5 to start, 1.33× speed). Holding the shield costs 5 a tick; a blocked hit 10; at 0 the guard breaks for 3 s.

Regen per ~0.67 s tick: HP 10% of max in today's town, the farm and the old hub, and since v2.3.3569 on BroTown's safe ground (the town and the commons) once 6 s pass with no damage dealt or taken, so empty to full in about 7 s; 1% in the rest of the Wheel only after those 6 s (doubled by Herb Bread); nothing in a fight, where food and melee lifesteal are the only heals. Stamina about 7 a tick everywhere (×0.4 while soaked, not while blocking or within a second of a sprint step). Mana 1.8% a tick out of combat, 0.7% in. Duels and the arena gate HP regen off.

### 3.5 A fresh start

50 coins; Melee 1, Bow 1, Magic 1; 250 HP; no weapons, armour, shield or amulet; all ten life skills at 1; no pet; 1% crit. An unarmed character cannot leave the safe commons (a gate that moves with you, 2,937 px around the Town Hall, "Speak to Mayor Bro first — he'll arm you") until Mayor Bro's first quest is accepted, which puts a Copper Great Sword and a Pine Shield in the bag; its hand-in pays 25 gold, a Pine Bow and a Pine Staff. The tools for gathering come from the tour's other givers.

### 3.6 Death (the ordinary rule)

At 0 HP: "YOU DIED", 5 s, then a respawn on BroTown's stairs with every pool full. **No XP, gold or level is lost.** The bag drops into a pile at the death spot that is yours alone for 60 s, anyone's until 120 s, holding no coins. Kept through a death: the three gathering tools, every quest-objective item (remains, every ore and cooked fish), gems, anything picked up in the last second (so dying on your own pile cannot re-drop it), worn gear, the spare weapon stash, spare armour and shields, outfits and gold. A duel death loses nothing; a No man's land death loses everything carried (Part 10). A dungeon death returns you to BroTown.

### 3.7 Life skills: the list and the curve

Ten life skills in a fixed order: Woodcutting, Fishing, Mining, Farming, Trapping, Cooking, Smithing, Woodworking, Gem Cutting, Enchanting. Every one starts at level 1. The level cost is ceil(1000 × 1.08^(L−1)): 1,000 at 1, 1,851 at 9, 3,997 at 19, 40,211 at 49, ~1.9 million at 99 (cumulative ~25 million to 100). No cap is coded; the resource tables reach level 20, the guild ladder 150, the rank titles Novice (1) to Legendary (100) and Transcendent (150). Each skill's rules are in Parts 7 and 8.

### 3.8 The Hemi Bros tie-in, Achievement Points, on-chain records

- **The checkmark**: Info → "Verify my Hemi Bros" asks an injected wallet to sign a free message (no transaction); the server reads the collection's balance. One or more Bros gives a verified badge on the name plate, the profile ("3 Hemi Bros") and the player list, visible to everyone; re-read daily in the background, fails closed. The game can move nobody's Bros or money. Wearing a Bro's picture as your avatar once existed; no UI reaches it today (dormant).
- **Achievement Points (AP)** are a score that **buys nothing**: +5 per quest hand-in; the skill guilds' ladder per life skill (10 / 25 / 40 / 75 / 150 / 250 / 400 / 750 AP with 30 to 2,000 gold at levels 5 / 15 / 30 / 50 / 70 / 90 / 100 / 150); the arena champion's 500, a character's first win only. Shown on the profile, the Skills header, the Gambling Den and the leaderboard.
- **On-chain records**: at character levels 2, 5, 10, 20, 30, 40, 50, 75 and 100 (v2.3.3538, for the one level; they were 4 to 300) the server writes the three combat skills, the ten life skills and the kill count to a contract on Hemi mainnet; the player sees a "recorded on Hemi" receipt in the Journey tab. Fire-and-forget; a chain problem is never a game problem. The Journey tab also keeps Kills, Deaths, Lifetime Gold and XP, Duels Won, Deepest Zone. Leaderboard categories: Combat (your level, the best of the three since v2.3.3538), Melee, Bow, Magic, Kills, and each life skill.

### 3.9 Amulets

Forged at the Blacksmith from gold bars (5 nuggets a bar; a nugget drops 1 in 10,000 kills): Simple (Smithing 1, 1 bar, 50 gold, power 1.0), Ornate (15, 3, 200, 1.5), Regal (35, 6, 500, 2.2), Mythic (60, 10, 1,200, 3.0). One gem socket. Only the flame gem (+3% + 2.5% × power elemental damage) is applied by the server. Storm (attack speed) and wind (move speed) work because the server's limits leave room for them, and the server works out light's stamina regen from the amulet it holds (v2.3.3536: it was a number the phone reported, which any phone could claim with no amulet). Frost (max mana), water (HP regen: the phone reports it and the server never reads it), venom (max HP) and stone (elemental resist) do nothing on the server. No dark (crit damage) or light gem can be made: shards and the Rare Gem make only the eight lands' elements. Amulets gate on your character level (v2.3.3544; before, the Magic level), though no amulet carries a tier the server's gate reads, so none asks anything yet. Because nuggets are a 1-in-10,000 drop, an Ornate amulet is 15 nuggets: this is the game's scarcest ordinary material.

### 3.10 Not built, put away, open

- No milestone unlocks (removed). Species beyond Human and Monkey (an alien skin tone exists). The Build tab (removed). The worn-Bro avatar (dormant).
- The supporter pass (planned); the Turnstile account check (built, off).
- Legacy T1/T2 stats are inert and stored for rollback; the PvP-side legacy equipment-defense formula still stacks on the Defense stat.
- Elemental Resist has four typed sources only.
- AP has no sink. Amulet salvage is dead client code.
- The bro list's "last location" line was asked for and not built.

*Sources: server/src/prog3.js, oneformula.js, join.js, loginkeys.js, devicelock.js, migrations.js, gathering.js, broverify.js, chainscore.js, amulet.js, index.js; src/rendering/traits/*Catalog.js; docs/specs/progression-v3.md, relative-points.md, one-formula.md, hero-sheet-pills.md, fresh-start.md, character-restart.md, login-keys.md, device-lock.md, identity.md, account-login.md, hemi-bro-count.md, progression-onchain.md, amulet-forge.md, death-recovery-shield.md, item-drop.md.*

---

## Part 4. Controls, the screen, the menus, and the first minutes

### 4.1 Platform and views

iPhone Safari held upright is the first platform; everything is laid out for a thumb on a 390 × 844 screen. Sideways, the world takes the whole screen and an open menu is a full-height column beside it (never an overlay), on the side away from the Dynamic Island. On a computer (mouse and a window 1,000 px or wider) the game is the phone blown up in a centred column with black bars; touch controls hide and keys and the mouse do everything, with a keys strip in the margin. One fairness rule: **everyone sees the same slice of the world**; a bigger screen zooms in instead of seeing further. Adding to the Home Screen is the recommended way to play (an install card after 75 s on a quiet screen). Nothing ever pauses.

### 4.2 Touch controls

Every touch button follows the owner's mockup: a gold ring, a picture, no words; sky blue on a control means a cooldown; controls appear only when they can do something.

| Control | Where and what |
|---|---|
| Left stick | the left half of the world; drawn only while the thumb drives it. A swipe on the left half rolls; a double tap swaps weapon. |
| Weapon button | bottom-left corner under the stick, showing the held weapon; a tap cycles the three. |
| Right disc | a stick and a contextual button: **hold** auto-attacks, **drag** aims, a quick **swipe** fires the special; beside a resource it is the harvest button with the gesture's instruction (PUMP, CHOP, REEL, FLIP); its picture shows what a **tap** would do: the weapon (attacking), the tool, a speech bubble by a townsperson, a door at steps and dungeon mouths, the moon at the farm's bed, a farm step, otherwise a see-through JUMP arrow. In a fight the disc turns warm orange and nearly vanishes over a monster under it. No cooldown ring on the base attack. |
| Targeting | automatic nearest monster for the sword; a tap on a monster locks it; faint rings at monsters' feet show whom the attack can reach. |
| Sprint | the winged-boot button just north of the disc, its gold ring the stamina running down. |
| Special and Whirlwind | a row above Sprint; Special shows the held weapon's own special picture and greys with no mana; Whirlwind shows only in a fight. |
| Block | a toggle at the disc's lower left, apart "as a mental separation"; up in a fight with a shield on; Shield Bash appears beside it only while the shield is up. |
| Left cluster | Element Burst (a gem in the weapon) and Quick Eat (while carrying a heal and missing HP, its ring the bite rule's wait). |
| Bell | bottom left above the band, shut with an unread count; a tap opens the chat feed. |
| Enter | a small button over a building's sign when your boots are within 140 px of its steps. |
| No man's land badge | a red skull with the ring number just left of centre above the band; a tap opens the rules. |
| Minimap tap | the world map. |
| OPEN / CLOSE pill | folds the dashboard to its button row (remembered; a new character starts folded). |

Chat opens by tapping your own bro; the emote picker is the chat box's smiley; the TRAP button appears in the door prompt's slot over a targeted monster.

**Keyboard** (one table, each key worn by its button on a computer): WASD walk, Space roll, X jump, Shift sprint, E interact (held works a harvest), Q shield, F special toward the mouse, G burst, R whirlwind, T trap, V quick eat, Tab or 1–3 weapons, C chat, B emotes, I bag, P character, J quests, L life skills, K codex, O more, M map, H the keys strip, Enter a dialogue's front button, Esc the front window's ✕. Left click attacks (a click on a townsperson, a resource in reach or a farm bed is that thing's, never a swing); right click fires the special.

### 4.3 The screen at rest

- **The top bar**: a door chip (Log Out / Switch Bro), the time-of-day icon (always day in the Wheel) and the place name, gold on the right; a long press on the name opens the owner's test panel.
- **The minimap** with its name plate (Part 2.3).
- **The pinned quest card** top left: the quest's picture, title, next step and count, a painted green check when everything is in hand.
- **Over heads**: your name plate and HP bar (hidden while you gather); other players' HP bars the size of your own; monsters' smaller plates in a band colour by level (grey = reduced XP); townsfolk a step smaller with a gold role line; skulls, the party badge, an alliance tag, the Hemi Bro checkmark.
- **Damage numbers** 1.75× their first size, one fixed size at any zoom, every message the plain hit's size; **status chips** with seconds left; **speech bubbles** 5 s (white for townsfolk, dark for players, pumpkin in Halloween week); an emoji pops 2.6 s.
- **The dashboard band** at the bottom, never more than a third of the screen: at rest **the bag** (4 × 2 tiles then scroll, five filter chips) beside the three combat cards (Melee, Bow, Magic with level and bar); folded, the world is drawn ~1.3× bigger. Six icon-only buttons: Dashboard, **Character** (your own face; a glow for unspent points), **Quests** (a badge for a ready hand-in), **Life Skills** (a dot for a level-up), **Codex** (new pages), **More**. Every page takes the bag's place at one height (~191 px on the reference phone) and scrolls inside; a drilled page has one back button; nothing in the row ever moves.

### 4.4 The pages

- **Character**: Equipment (you as drawn, six gear slots, fourteen stat pills: OFFENSE in gold with DPS, PLAYER in blue, HP / EN / MP as bars; a slot's card opens in place; a grade is the item name's colour), Points (the six weapon stats behind a cell of the three weapons that follows the held one, the seven character stats behind your portrait; one window explains and spends, with the slime simulation "Now" and "+n" on the same dice), Journey (kills, deaths, lifetime gold and XP, duels won, deepest zone).
- **Quests**: Active · Available · Completed; READY first, then the tracked; a row with title, next step, giver and pay; no Accept or Turn In here (everything happens with the giver in the world); a page with a steps checklist, "Track this quest", the giver's words; the Daily rewards card on top.
- **Life Skills**: ten app tiles in a fixed order with level chips and XP bars; a detail with "Each hit" / "At Lv n+1" odds for the hit ladder, "Full XP / Less XP" for the fade, unlocks from the real tables.
- **Codex**: nine monster cards, a page per kind (Part 6.7).
- **More**: Quests, Life Skills, Journey (a travel log nothing writes yet), Codex, Ranks (the leaderboards), Friends, Clan (now "Clans are parties"), Guild (your rank per skill guild), Settings, Login Key, Pets. Settings: audio toggle and sliders, landscape menu side, silence notifications, replay the controls tutorial, play full screen, feedback, about, restart character. No dropdowns anywhere; choices are chips.
- **The bag's item card**: picture, name, stats against what you wear, caption, Eat / Drink / Light fire / Equip / Sell (to the auction house) / Drop, an anchor pin; a rare edge blue, elite orange, godly a turning rainbow ring (the one always-running animation).

### 4.5 Windows

- **Talking**: walking within 90 px of a giver opens his dialogue (his head, his lines a chunk at a time, Next); then a separate OFFER window (title, errand, "He hands you now" and "For finishing" with pictures, Accept Quest as the one gold bar, Not now); a CLAIM window with no Not now; XP placement chips only when there is XP; coins fly to the purse and items to the bag; the next quest offered after 1.9 s. The dark backdrop blurs the world 2 px, the one blur the owner kept. The windows wear the owner's painted art.
- **Buildings**: the room behind the menu (Part 2.2); one big ✕ in the corner; a tap outside closes. The forge's window sits low so your bro is seen working at the anvil above it. Diego's shop and the trade window are **drawers growing out of the top of your bag** (his shelf and your tiles with price badges; your pile on light brown, theirs on light grey, the UI's only light surfaces); Ace's flip is tap-only.
- **Other players**: the player list (top left), the player card (Invite to Party / Trade / Add Friend / Duel; Mute · Block · Report), the Inspect card behind the portrait; a duel challenge as a small centred card; a party invite at the top centre; the party strip under the top bar.
- **Daily Rewards** opens only from the Quests card or the Gambling Den (nothing opens by itself at login); the free spin's wheel has eight equal slices with the real odds printed under it.
- **The world map**, the level-up medallion, the rarity reveal (a 2 s spin per stage, never a modal), the NEW MONSTER card, the linger countdown, the device and origin screens.

### 4.6 The first minutes, as built

1. **The door**: the owner's painted login screen; CONTINUE (the roster) or CREATE CHARACTER; "Playing on another device? USE LOGIN KEY" folded in a line.
2. **The creator** (Part 3.2): the bro on a pedestal between braziers, BRO NAME with a reroll, Randomize, Reset, ENTER BRO TOWN (always pressable, says why not).
3. **One loading screen**: the owner's "washed ashore" beach clip with the loading bar painted into the film; the server, the animations and your arrival waited for behind it; the Wheel's monster looks load as you walk.
4. **Arrival** on the Town Hall's stairs, unarmed, held inside the commons; the WELCOME plate ("Find Mayor Bro — he wants a word. Follow the gold road on your map.") with one button, Skip tutorial; the band folded with a coach ring on OPEN; the gold road to the Mayor.
5. **The first quest**: the Mayor's exploding slimes; on accept a sword and shield land in the bag and their tiles flash until worn; the **quest coach** rings each control as the quest gives you its thing, one card at a time beside the control, never blocking (eleven lessons: open the dashboard, move, equip, the dashboard after the hand-in, equip everything, cycle weapons, block a ranged attack, attack, the special as "a quick swipe", tap yourself to chat, save your Login Key); the hand-in pays 25 gold, the bow and staff (no XP choice), unlocks the free spin, and six townsfolk offer their quests at once.
6. **Pacing**: the welcome first and alone; a coach card never over a plate, 2.6 s quiet between cards, at least 20 s between tutorial pop-ups; a returning player (a tutorial quest on record, or level above 3) is never welcomed or coached again; a manual controls tour lives in Settings.

### 4.7 Not built, open

- Each bro's last location on the roster; a button to open your own Inspect card; an edge arrow to an off-screen party member; a sitting picture (sit is a squash); choosing your emote slots; a server-side block list; the NML badge over the bell at 320 px wide; the Journey log (nothing writes it); some buttons under Apple's 44 px guide, none unreachable.

*Sources: docs/UI-DESIGN-NOTES.md, docs/UI-BIBLE.md, docs/LANTERN-SLATE-SPEC.md; docs/specs/control-redesign.md, landscape-mode.md, desktop-keys.md, desktop-clicks.md, desktop-harvest.md, reach-every-button.md, onboarding-pace.md, quest-coach.md, quest-guidance.md, quest-windows.md, building-rooms.md, demo-polish.md, damage-number-size.md, item-drop.md, daily-rewards.md; src/game/deskKeys.js, desktopControls.js; src/ui/mobile/BottomDashboard.jsx, QuestCoach.jsx, dash/*.jsx.*

---

## Part 5. Combat (player versus monster)

Every number that matters in a fight is rolled on the server. The phone sends an intent ("I swung at monster X with slot Y, special or not") and the worker rolls the hit, applies the target's defences, writes the HP, and tells every phone nearby. The phone's own damage popups are predictions that the server's answer overwrites. HP and damage are shown to players **divided by 5** (a 250-HP new character shows "50"); this document uses the server's numbers unless it says "on screen".

### 5.1 Three weapons, three skills

| Weapon | Trained skill (shown as) | Base damage | Per-hit variance band | Role as tuned |
|---|---|---|---|---|
| Sword / Great Sword | Melee | 6.67 / 10 | 0.75–1.25 | the reliable wide swing; the only weapon that auto-targets; opens with a dash |
| Bow | Bow | 12.80 | 0.60–0.80 | "the predictable one": speed and DPS, kites |
| Staff | Magic | 13.44 | 0.50–1.65 | "the swingy weapon": the hardest single hit on average, the weakest on a bad roll; splashes |
| Fists | Melee | 6.25 | melee band | an unarmed player cannot leave the safe commons until armed |

Each skill trains to 100; the character level is your best weapon's level (a new character is level 1; v2.3.3538). A special trains the weapon that fired it. Magic's cross-weapon job is the mana pool every special spends. The starter kit is Mayor Bro's: a Copper Great Sword and a Pine Shield on accepting the first quest, a Pine Bow and a Pine Staff at its hand-in, so a new player has all three archetypes within the first ten minutes.

**Cadence.** 600 ms per swing for every weapon (the bow 495 ms; the staff 900 ms, a +300 ms cast penalty the owner has flagged as an open balance question), cut by the Speed stat down to a 200 ms floor, and floored on the server at one accepted hit per monster per 210 ms.

**Reach.** The sword's swing is a 360° core of radius 38 px plus a forward half-circle of radius 72 px, scaled by the Range stat. An arrow flies 24 px a frame (1,440 px/s) to 675 px, or to 24 px short of the screen edge it flies toward. A bolt drifts at 5 px a frame to 675 px, homing on a locked target. Range stat scales all three.

**Aiming.** A monster becomes engageable inside its 220 px perimeter; a lock holds out to 275 px and drops on death, distance (1,700 px) or 1.5 s off screen. Only the sword auto-targets the nearest monster; the bow and staff lock only by a tap on the monster (owner decision). The bow has a **sight gate**: it looses only when its drawn line crosses a monster, a prop or a fightable player, and otherwise waits with its cooldown running, which removes wasted arrows on a phone. Arrows and bolts stop at props and buildings, fly over anything low enough to jump unless aimed at it, and a target behind a rock is still the aim but the shot stops at the rock. A basic bolt also splashes 50% of its roll onto up to three monsters within 60 px of impact.

**A hit's side effects.** A hit pulls the monster onto you for 10 s wherever it was, shoves it 30 px (crit 45, special 60), which it walks back at extra pace. You cannot attack with the shield up, while swimming, dazed, staggered, mid-jump or harvesting.

### 5.2 Materials, grades and hardening

Weapons sit on a 20-rung material ladder, metals for swords and woods for bows and staffs. Each rung's multiplier is raised to the power 1.5 in the roll so each step is felt as roughly +18% (the owner found the table's raw ~11% "a player cannot feel").

| Rung | Metal (swords, armour) | Wood (bows, staffs) | Damage factor | Skill to make (Smithing / Woodworking) | Gem slots |
|---|---|---|---|---|---|
| 0 | wood (legacy) | pine | 1.00 | 1 / 1 | 1 |
| 1 | copper | softwood | 1.19 | 1 / 5 | 1 |
| 2 | iron | hardwood | 1.40 | 5 / 10 | 1 |
| 3 | black steel | cedar | 1.66 | 10 / 15 | 1 |
| 4 | titanium | maple | 1.95 | 15 / 20 | 1 |
| 5 | obsidian | ironbark | 2.30 | 20 / 26 | 1 |
| 6 | mythril | crystalwood | 2.70 | 25 / 31 | 2 |
| 7 | diamond | elder | 3.17 | 30 / 36 | 2 |
| 8 | abyssal | spiritwood | 3.72 | 35 / 41 | 2 |
| 9 | dragonbone | dragonwood | 4.39 | 40 / 46 | 2 |
| 10 | shadowsteel | shadowthorn | 5.14 | 45 / 51 | 2 |
| 11 | bloodstone | bloodoak | 6.05 | 50 / 56 | 2 |
| 12 | runestone | runewood | 7.12 | 55 / 61 | 2 |
| 13 | sunstone | sunbark | 8.36 | 60 / 66 | 2 |
| 14 | demonite | demonwood | 9.80 | 65 / 71 | 2 |
| 15 | spiritforge | ghostwood | 11.52 | 70 / 76 | 2 |
| 16 | starforged | starwood | 13.54 | 75 / 81 | 2 |
| 17 | celestial | worldtree | 15.89 | 80 / 86 | 2 |
| 18 | antimatter | voidtimber | 18.68 | 85 / 91 | 2 |
| 19 | worldbreaker | worldbreaker | 21.95 | 90 / 96 | 2 |

Only rungs 0–5 have resources, art and a place in the world today (Part 7). Rungs 6–19 exist in the tables with names and numbers but no ore, no tree, no icon and no forge recipe a player can reach.

**Wearing.** A weapon needs its own trained skill at (rung above the starter) × 5: copper, pine, iron and softwood are free at level 1; black steel 10, titanium 15, obsidian 20 … worldbreaker 90 (woods 95). Armour, shields and amulets gate on your character level since v2.3.3544 (before: Defense points, and Magic for amulets).

**Quality grades**, rolled once at the forge or the drop and never changed:

| Grade | Odds per mint | Weapon: whole hit × | Armour: tier × and the damage-reduction cap raised by |
|---|---|---|---|
| Normal | ~90.1% | 1.00 | +0 |
| Rare | 9% | 1.30 | +2.5% |
| Elite | 0.9% | 1.75 | +5% |
| Godly | 1 in 2,000,000 | 5.00 | +10% |

The owner's brief for Godly was "literally one in millions so make it basically game breaking good". Worn armour draws its grade as an edge colour (rare blue, elite orange, godly rainbow), so a grade is visible to other players.

**Hardening** (the Blacksmith's lottery, H0–H5): each attempt costs 500 × 2^(n−1) gold (500, 1,000, 2,000, 4,000, 8,000) and n of the weapon's material (bars for a sword, hardened wood for a bow or staff), with odds 80 / 20 / 5 / 1 / 0.5%. Each level adds +1.04 to the weapon's effective base before the skill term and the multipliers (H5 on a Great Sword: base 10 → 15.2). Since v2.3.3529 a failure keeps the level and only costs the gold and materials. On average H5 takes ~326 attempts, ~2 million gold and ~1,471 bars.

### 5.3 The hit formula

One roll, whoever takes it (a monster or a player):

```
base      = (weapon base + hardness × 1.04 + skill level × per-level)   per-level: sword 1.5, bow 1.5, staff 1.8
            × Power                 1 + 1.0 × curve(Power points × edge)
            × tier factor           material multiplier ^ 1.5
            × grade                 1 / 1.3 / 1.75 / 5
draw      = base × a number from the weapon's band (big bolt 0.3–2.5)
special   = × 4.5 (sword) / 3.0 (bow, split over three arrows) / 2.0 per orb (staff) × (1 + 1.5 × curve(Special points × edge))
            × 1.30 if the weapon is volatile × the brew (Firebloom Tea 1.2, Fury Tonic 2.0)
crit      = chance 1% + 60% × curve(Luck); on a crit × (1.5 + 2.0 × curve(Luck)), never under 2 × the top of the weapon's range
then      × flame-amulet bonus on an elemental weapon; × 0.7 under a hexer's curse; rounded, at least 1
ceiling   clamped to a per-attacker ceiling that "only binds on a roll no honest build makes"
after     × (1 + 0.06 × fracture stacks, up to 5) × 1.25 when the gem beats the monster's element
```

**The curve** is the whole stat system's shape: every point-driven value is `max × q / (q + k)` where q is the points times the edge. It is front-loaded and uncapped: 5 Power points give +42%, 5 Luck points give 26% crit chance and a ×2.33 crit, 5 Special points give +62.5% special damage, 5 Dodge or Defense points give 37.5%, 20 give 67%, 90 give 83%.

**The edge** makes level matter without a hidden multiplier: your points count fully against an opponent at or below your level and lose 20% of their count per level the opponent is above you, reaching zero at +5. "Your level" is the weapon's trained skill for attack stats and your highest trained skill for body stats; a monster's is its level; a player's, as an opponent, is their highest trained skill. The edge works both ways.

Every credited point of damage pays the swinging skill 0.2 XP (a kill is worth about a fifth of the monster's HP in XP), halved in v2.3.3054 at the owner's "slow it by about 50%". Each level gives 3 points to spend.

Worked example, a fresh character with the Copper Great Sword: a plain swing rolls 10–17 (2–3 on screen), a crit at least 34, the special 46–77.

### 5.4 What defends the one who is hit

In order: zone-entry grace (500 ms) → block (0 damage) → **Dodge** (a roll at 90% × curve(Dodge); an elemental hit cannot be dodged; "Dodged" is printed, never "−0") → **Defense** (a cut of 90% × curve(Defense) on base damage; Dodge and Defense together never let less than 10% through) or, for elemental damage, **Elem Resist** alone (always lets 10% through) → **armour** (torso 30% + 7.5% per tier step, legs 20% + 5%, multiplied by grade, capped at 75% plus grade lifts: a copper set 44%, iron 53%, a godly iron set 92%) → the Root Stew's −5% → a floor of 1 ("an enemy that literally cannot hurt you is a bug, not a build").

**Max HP = 200 + 50 × character level + 40 × Max HP point** (v2.3.3538: the level is the best weapon's, so a one-weapon character's bar is exactly what the old sum gave). A new character has 250 (50 on screen), level 10 has 700, level 40 has 2,200. Stamina = 100 + 3 per Stamina point; Mana = 100 + 2.5 × Magic level + 2.5 per Max Mana point. Monsters' hits are multiplied at creation so a monster takes the same share of a matching player's bar as before the formula changed (2.1× at level 1, 6.3× at level 40).

**Regen**: in a fight, mana 0.7% of max per ~0.67 s tick (1.8% out of combat, 2 s after the last damage taken); stamina +7 a tick, never while holding the shield or sprinting, ×0.4 while soaked; HP 1% a tick after 6 s with no damage dealt or taken, doubled by Herb Bread; in town, on the farm and the old hub 10% a tick for all three, and on BroTown's safe ground too after those 6 s (v2.3.3569, the owner: "standing on the safe ground should heal you quickly"; none of the three in a duel, and stamina not during Lil Bro's race).

### 5.5 Specials and abilities

Costs are charged in **blocks**: a bar has 5 blocks plus one at each of 20/40/60/80/100 invested (Magic level for mana, Stamina points for stamina), to 10; every special costs one block (owner: "All special attacks will cost one block").

**The swipe special** (a flick of the attack control; one mana block; 1.5 s cooldown):

| Weapon | What happens | Damage |
|---|---|---|
| Sword / Great Sword | one 360° spin at 1.5× reach | 4.5× a plain hit to every monster in the ring |
| Bow | three white-hot arrows on one line, 200 px apart | each arrow 2/3 of a 3× special roll; the first to land burns its monster for 2.5 s (4 ordinary ticks) |
| Staff | one big bolt 2.55× the size, then an explosion | one roll from 0.3–2.5 × 2 × 3 orbs × 0.6, under a special ceiling; every other monster within 90 px takes a third (up to 6) |

A bow special pressed on an empty line is queued 2.5 s and charged only when it leaves (the button reads "AIM").

**Stamina abilities** (identical tables on both sides):

| Ability | Needs | Cost | Cooldown | Damage | Reach | Effect |
|---|---|---|---|---|---|---|
| Sword dash (the opening lunge) | a melee weapon; fires as the first attack of an engagement at a lock | free | 2.5 s | 1.0× | closes up to 900 px, lands you 46 px from the target | stun 1.6 s, 40 px knockback |
| Shield Bash | a raised shield | 1 block | 4 s | 0.75× | 70 px, or a declared target within 240 px (dashes to it) | stun 1.6 s, 90 px shove, cancels a wind-up |
| Whirlwind | a melee weapon and a locked monster | 1 block | 6 s | 1.0× each | 240 px radius, up to 16 targets, 1 s wind-up you can walk during | pulls every target to a 34 px ring round you, stuns 1 s |
| Dodge lunge (swipe toward a lock with a sword) | a lock within 220 px | 1 block | 1 s | 0.6× | 220 px | a dodge with i-frames |
| Retreat shot (swipe away from a lock with a bow or staff) | a lock | 1 block | — | 0.5× (one arrow, or three bolts in a 25° cone) | the weapon's range | a roll with no i-frames against monsters ("the shot is the tradeoff for safety") |
| Element Burst | a gem in the weapon | 1 mana block | 3 s | 1.5× | 70 px nova | puts the gem's status on everything hit |

A whiff still costs the block and the cooldown and floats "Missed!". There is no level gate on any ability: the old milestone ladder (bash at level 4, whirl at 8…) was removed on the owner's word ("I did not make those"), as was the x1/x2/x3 combo chain.

### 5.6 Defence: the roll, the shield, the daze

**The roll** (a swipe on the left stick, or Space): one stamina block, 250 ms long, about 360 px/s, cancels the shield; the worker opens a 1 s window in which a paid roll slips every monster blow you can see coming (the swing, snowball, slam, lunge, slime burst, a boss ability) but not the snow pile, ground fire, storm arcs or burn and poison ticks.

**The shield** is a toggle button that appears in a fight when you carry one. The guard faces the locked target, else whoever hit you in the last 3 s, else the nearest monster. Blocking is **directional**: ±60°, a blow from outside the wedge lands. Cost: 10 stamina per blocked hit (a snowball is free to block) plus 5 stamina per tick while held; no regen while holding; at 0 the guard breaks for 3 s. Movement is halved while blocking. **Parry**: a hit landing within 250 ms of the shield going up is negated, refunds 10 stamina and staggers the monster 1.5 s (it loses its swing and any wind-up); a parried player is staggered 1.5 s too. Shield items add client-side stats (block bonus, stamina, a shield gem's single bonus such as thorns or HP on block); the server reads none of them in its own hit math.

**Held or dazed**: a rock monster's daze (0.5 s of no walk, swing, roll or shield, then 2.5 s immune) and a blue slime's hold (0.7 s, then 2 s immune) are the two "lock-down" lengths in the game, and the same two lengths cap any gem's freeze or root on a player.

**Death**: at 0 HP you respawn after 5 s on BroTown's stairs. Everything in the bag except tools, quest items, worn gear, shields, outfits and gold drops as a pile only you may take for 60 s, then anyone, gone at 120 s. Items picked up within 1 s of a pickup are shielded from a second death.

### 5.7 The one door for monster hits

Every way a monster hurts you runs the same ordered steps: the harvest shield (a harvester takes no monster damage) → the Wheel's safe ground (nothing lands there except from a monster you provoked) → a paid roll → a rock between the blow and you → the shield (cost or parry) → a soaked monster's ×0.8 → the one-hit rail → the defences of §5.4 → after-effects (thorn recoil, the hexer's curse, the element's status) → the event, the save, the death.

| Blow | Roll slips it | Shield cost | Parry | One-hit rail | Elemental (Resist, not Dodge) |
|---|---|---|---|---|---|
| Basic swing | yes | 10 | yes | none | no |
| Snowball | yes | free | no | none | no |
| Snow-pile touch | no | 10 | yes | none | no |
| Slam (brute 2.0×) / lunge (fodder 1.0×) | yes | 10 | yes | 50% of max HP | no |
| Blue slime burst | yes | 10 | yes | 50% | yes |
| Dungeon boss ability | yes | 10 | yes | 50% | no |
| Fire on the ground | no | cannot block | — | 50% | yes |
| Storm arc | no | cannot block | — | 15% | yes |
| Burn / poison tick | no | cannot block | — | 10% / 8% | yes |

Every basic monster attack has a wind-up you can react to (swarm 350 ms, brute 600, default 450) and is re-measured at impact through a ring 1.3× its reach, so stepping out whiffs. Monsters stop and strike from 72 px (the sword's own reach) every 1.5 s.

### 5.8 Elements and gems

**Ten elements, eight in play**: flame (burn), frost (freeze), water (soak), venom (root), storm (shock), stone (fracture), wind (slow), flora (thorn); dark (curse) and light (reveal) are the realms' and no weapon gem may carry them.

**The wheel**: flame > frost > storm > stone > wind > venom > flora > water > flame; dark and light beat each other. A hit whose gem beats the monster's element lands ×1.25; a losing matchup carries no penalty (the "DN" was removed so that every gem pulls its weight).

**A gem in a weapon** changes no damage; every hit carries the gem's element and status. One slot up to obsidian/ironbark, two from mythril on (the second needs Enchanting 20 and a different element). A "volatile" pair of elements makes a weapon hit ×1.30, but a volatile pair can only be set in the top-rung worldbreaker sword or bow (`FUSION_BASES`), so no weapon in the game is volatile today.

| Gem | Status on a monster | Length | Effect (P = the Element stat on the curve, 5 points = 40) |
|---|---|---|---|
| flame | burn | 4 s (+1 per hit, max 6) | 5 + 0.3P every 0.5 s |
| frost | freeze | 3 s (max 5) | **the hold rule**: stops 1.5 s (a boss 0.75), then cannot be stopped again for 3 s; chilled to half speed for the rest |
| venom | root | 5 s (max 7) | the same hold, then 3 + 0.15P a second while it walks |
| wind | slow | 5 s (max 7) | moves at ×0.4 |
| stone | fracture | 6 s, up to 5 stacks | +6% damage taken per stack |
| water | soak | 5 s (max 7) | its own blows land ×0.8 |
| storm | shock | 4 s | every later hit sparks a quarter of itself to the nearest other monster within 150 px |
| flora | thorn | 6 s (max 8) | takes 4 + 0.25P each time it attacks |

**Collisions**: a hit of one element on a monster carrying another element's status detonates a named burst (Steam 40 + 0.8P, Wildfire 45 + 0.8P, Overcharge 70 + 1.2P, Shatter 70 + 1.2P, Lightning Rod 65 + 1.1P, 45 pairs in all), ×1.10–1.30 inside the status's last quarter (the "resonance window"), capped at 3.2× the raw hit, bypassing the attacker's ceiling, and consuming the status. A resonating collision restores about 4% of max mana (more on a streak), at most once per 3 s. Two players with different gems therefore combine; one player with a two-slot weapon can collide with themselves.

**Monster statuses on the player** (every landed hit carries its land's element; the worker decides, the phone carries out the movement):

| Element | Monster | Status | Numbers |
|---|---|---|---|
| frost | snowman | chill | walk ×0.55 for 1 s |
| flame | fire goblin | burn | 3 ticks of 20% of the hit, ≤10% of max HP each |
| wind | mummy | gust | shoved 48 px away |
| flora | blue slime | stuck | held 0.7 s, then 2 s immune |
| stone | rock monster | daze | 0.5 s of no walk/swing/roll/shield, then 2.5 s immune |
| storm | storm slime | shock | arcs to the nearest 4 other players within 150 px, half the hit each, ≤15% of their max HP |
| water | fishman | soak | 4 s of stamina refilling at ×0.4 |
| venom | wisp, bog lurker | poison | 5 ticks of 12% of the hit, ≤8% of max HP each |

A pet from that land out with you **wards** its element: 15% off at pet level 1, +1% a level, at most 50% (a shorter hold, lighter ticks), never the hit itself.

### 5.9 Food in a fight, lifesteal, feedback

Fish heal a fixed number (minnow 100, clownfish 150, trout 225, salmon 325, pike 475; the Garden Stew 150) and one healing bite is allowed every 15 s while fighting anything; a quick-eat button picks the smallest heal that fills what you miss. Brews: Firebloom Tea ×1.2 damage, Fury Tonic ×2.0, one brew and one meal at a time; Root Stew −5% damage taken; Zoom Juice +25% move speed for 5 minutes; Herb Bread doubles out-of-combat regen. A melee killing blow heals 90% of the net damage that monster dealt you.

Feedback: damage numbers are 1.75× their original size and one fixed size at every zoom, each carrying a mark (your weapon, a crit, the element, a heart on a hit taken, "UP" on a winning gem, a collision's name); the monster's plate becomes its HP bar in a fight and its ring colour is its level against your weapon's skill (grey = reduced XP, green, yellow, orange, red); a "!" pops over a monster that notices you; monsters throb before a blow, flash red and squash on a hit, and sound like their material (snow, goo, ember, stone, bone, wet). Hit-stop is deliberately off.

### 5.10 Honesty limits an honest player meets

A ranged claim needs a bow in the worker's own bow slot; melee lands within 400 px; a bow's reach is 675 × Range + 150 px + one second of the fastest run; a special counts only inside a paid swipe's 4.5 s window (an unpaid "special" rolls as a plain hit); a bow lands at most 5 × (1 + Piercing) hits a second across all monsters, a staff 2; a roll counts only inside its paid 1 s window; a move faster than 500 px/s (× sprint, potions, the Move stat) over a 3 s budget is followed, never refused. Honest play is unchanged by any of these (an honest sword in the bot lab: 471 kills an hour before and after).

### 5.11 Not built, put away, or open in combat

- **Knockback and the bow volley's burn on players** — deliberately monster-only; the fight simulator showed both turn fights toward whoever keeps distance (a skilled sword against a skilled bow fell from 91% to 27% wins with both on). The owner's call.
- **Jumping over attacks** — the jump is drawn only; shots fly over low props, not over monster blows.
- **The staff's +300 ms cast penalty** — named in the specs as "the owner's next decision".
- **Dark and light** — in the tables (curse, reveal, the Eclipse collision at 120 + 1.8P) with no gem, no realm and no mechanical effect.
- **Shield-gem effects** — client-only stats; the server reads none in its hit math.
- **Material rungs 6–19** — names and multipliers only.
- Removed on the owner's word and not to be re-proposed as new: hit-stop, the combo chain, the ability milestone ladder, random weapon drops off kills, the old three-orb staff special and the single-arrow bow blast (both behind kill switches).

*Sources: server/src/combat.js, abilities.js, elemental.js, hits.js, monsterstatus.js, oneformula.js, hardening.js, gear.js, hitproof.js, data.js; src/game/targeting.js, projectiles.js, dodge.js, shieldToggle.js; docs/specs/one-formula.md, hit-door.md, specials-rebalance.md, bow-volley.md, weapon-gems.md, gem-weight.md, elemental-completion.md, monster-statuses.md, roll-window.md, directional-block.md, fight-food.md, xp-decay.md, damage-number-size.md.*

---

## Part 6. Monsters, loot and dungeons

### 6.1 The roster

Every monster is an **archetype** (the stat template the AI runs against) dressed as a **variant** (the look, the name, the speed, what it drops). Nine kinds are met in the world; a tenth look (the skeleton) is a hit mummy.

| Kind | Home land (element) | Archetype | HP × / Dmg × / Speed × | Speed (px/s) | Body type | Level 21–40 recolour |
|---|---|---|---|---|---|---|
| Snowman | Frost Ridge (frost) | snowman | 1.3 / 1.1 / 0.8 | 18 | Humanoid | Glacier Snowman |
| Fire Goblin | Flame Fields (flame) | fodder | 0.6 / 0.8 / 1.0 | 67 | Humanoid | Cinder Goblin |
| Mummy → Skeleton | Wind Dunes (wind) | fodder, stalker (0.7/1.2/1.3), hexer (0.9/0.8/1.0), volatile (0.8/1.0/1.0) | — | 18 → 79 as a skeleton | Humanoid | Gilded Mummy |
| Rock Monster | Stone Hollows (stone) | brute | 1.5 / 1.3 / 0.7 | 16 | Beast | Amethyst Golem |
| Slime | Electric Foundry (storm) | fodder | 0.6 / 0.8 / 1.0 | 22 | Ooze | Storm Slime |
| Fishman | Water Caves (water) | brute | 1.5 / 1.3 / 0.7 | 16 | Aquatic | Coral Fishman |
| Mire Wisp | Poison Forest (venom) | fodder | 0.6 / 0.8 / 1.0 | 22 | Ooze | Spectral Wisp |
| Bog Lurker | Poison Forest (venom) | brute | 1.5 / 1.3 / 0.7 | 16 | Aquatic | Shade Lurker |
| Blue Slime | Verdant Wilds (flora) | fodder, HP × 0.55 | 0.33 / 0.8 / 1.0 | 52 | Ooze | Jade Slime |

A player walks at ~150 px/s, so no monster can catch a walking player except by reach, telegraph, a thrown ball or a shove. Each land spawns six monsters a stretch list (the Wind Dunes: 2 stalkers, 2 hexers, 2 volatiles; the Poison Forest: 4 wisps, 2 lurkers), repeated five times on the long Wheel. Two further archetypes (swarm, sentinel) exist only as dungeon summons and Workshop picks.

### 6.2 Stats by level

HP = a small curve (12.5 × 1.052^(L−1) × the archetype's multiplier) plus a **flat** that is nearly all of a monster's health: 50 at levels 1–2, 100 at level 3, then +10% a level (195 at 10, 506 at 20, 1,311 at 30, 2,090 at 40). So every kind of one level has about the same HP and the archetype multipliers matter mostly for damage. The jump from level 2 to 3 is the biggest in the game. Damage = 12 × 1.065^(L−1) × the multiplier, then × the one-formula stamp so the hit keeps its share of a matching player's bar (×2.1 at level 1, ×6.3 at 40). A new character has 250 HP.

| Level | Fodder (slime, goblin, mummy, wisp) HP · hit | Brute (rock, fish, lurker) HP · hit | Snowman HP · hit | Legacy kill XP (saved, never shown) | Gold |
|---|---|---|---|---|---|
| 1 | 58 · 22 | 70 · 34 | 67 · 30 | 10 | 5 |
| 3 | 109 · 33 | 121 · 52 | 119 · 44 | 11 | 6 |
| 5 | 132 · 42 | 146 · 67 | 143 · 58 | 12 | 6 |
| 10 | 207 · 74 | 225 · 119 | 221 · 102 | 15 | 7 |
| 20 | 526 · 166 | 556 · 269 | 549 · 228 | 24 | 10 |
| 30 | 1,344 · 350 | 1,394 · 571 | 1,383 · 484 | 36 | 14 |
| 40 | 2,137 · 488 | 2,207 · 794 | 2,192 · 669 | 47 | 18 |
| 45 (Buried City) | 2,538 · 565 | 2,622 · 911 | 2,603 · 770 | 53 | 19 |

The legacy kill XP column is a number the server still adds to the old XP field on a kill; nothing reads it, no bar fills from it, and since v2.3.1727 no player on the trained-skill system (every player, from the first join) is shown it. The real progression is 0.2 skill XP per point of damage dealt (a level-20 kill is about 105 XP into the weapon's skill before the fade). The owner's pacing decisions baked in: every monster +100 flat HP (levels 1–2 carry only 50), "a level 7 now loses to a level 17 slime".

### 6.3 Where they stand and what level they are

The Wheel is one zone; each land's six-monster list is laid along its spoke a **stretch** (five levels) at a time, 30 monsters a stretch on 60 baked places, farthest apart first: 1,920 monsters in eight stretches per land, levels 1–40. Within a stretch a monster's level is set by where it stands: the first stretch climbs 1 at the town end to 5 at its far end (the owner's "the nearest monsters are level 1" directive holds), then 6–10, 11–15, 16–20 to the first pass, and 21–40 in the second stage as the nine recolours. A place is open ground of its land, within 420 px of the spoke's axis, 120 px inside its tier, clear of camps, water, roads and objects, at least 150 px from another. Respawn is a fixed 18.75 s at the own spawn point, whole (a skeleton comes back as a mummy). Population does not scale with players on the Wheel (the old zones' 6-to-24 scaling is dormant with them).

### 6.4 AI

| Rule | Value |
|---|---|
| Notice range | 120 px (snowman 300); checked every tick, so walking out of it loses an unhurt monster |
| Sticky aggro after being hit | 1,200 px for 10 s: "whoever shot me, from anywhere on screen" |
| Stop and strike | from 72 px (the sword's own reach), every 1.5 s, with a wind-up of 350–600 ms by archetype (brute 600) re-measured at impact through a ring 1.3× its reach so stepping out whiffs |
| Wander | 30–80 px legs, leashed 180 px from the spawn |
| Chase leash | 720 px from the spawn, then it walks home; a **provoked** monster (you hurt it this life and dealt damage in the last 10 s) follows you onto the safe ground and out to 1,800 px |
| Safe ground | one circle of 2,937 px round the Town Hall: nobody on it is targeted or hit except by a monster they provoked |
| Rest | a monster with no player within ~3,200 px does nothing that tick (its respawn and statuses still run) |
| Ranged | the snowman throws a snowball between 100 and 300 px (900 ms flight, 2.6 s cooldown); every fodder kind throws a glob between 70 and 220 px (650 ms, 2 s); one ball in the air; a player 40 px from the frozen aim point is missed; a rock on the line stops it; a shield facing the thrower blocks it free |
| Hit shove | 30 px (45 crit, 60 special), walked back at 1.1 px a tick on top of the chase |
| Knockback / hold | freeze, root or stun is a full stop; the hold rule (1.5 s, then 3 s immune, a boss 0.75 s) |
| Harvester | a player mid-harvest is invisible to acquisition and takes no monster damage |

A "!" pops and the kind's noise plays when a monster starts chasing you; the name plate's ring colour reads its level against yours (green two or more under, yellow near, orange one or two above, red three or more above, grey when it pays reduced XP).

### 6.5 Signature moves and phases

| Kind | Move | Numbers |
|---|---|---|
| Brutes (rock, fishman, lurker) | **Slam** | 900 ms wind-up, 5 s cooldown, ×2.0 damage in an 88 px ring, started only with the target within 150 px; blockable facing it |
| Fodder (slime, goblin, mummy, wisp, blue slime) | **Lunge** | 1,200 ms wind-up ("the beginner's tell, tuned to teach blocking"), 9 s cooldown, ×1.0 in 80 px |
| Snowman | **Snow-pile burrow** | the first time it drops to half HP: digs 600 ms (vulnerable), becomes an intangible pile for 1.2–3 s that creeps toward you at 95 px/s (under your 150) and hurts on touch once a second, then emerges 600 ms (the punish window); 20 s between burrows; a raised shield facing the pile bonks it up early, dazed 1 s |
| Mummy | **Unwraps** | any damage turns it into a skeleton: speed 18 → 79 px/s, drawn taller, its own death; respawns as a mummy |
| Blue Slime | **Death burst** | at 0 HP it swells 1.6 s to 3.5× its size, untouchable, then bursts for a flat 60 (stamped) to everyone within 110 px and holds them; walking away is the counter; the kill then resolves with the same killer and loot; no words over it, by the owner's choice (v2.3.3568: "more fun to discover") |
| Fire Goblin | **Fire trail** | while chasing it drops a burning patch every 48 px: 300 ms to arm, 6 damage (stamped) every 500 ms to anyone within 26 px, out after 4 s, at most 8 patches a goblin; unblockable, movement is the counter |
| Hexer mummy | **Curse** | its landed hit cuts your outgoing damage 30% for 4 s |
| Stalker mummy | — | hits harder (×1.2), faster, less HP; its pounce was removed (it read as teleporting) |

No telegraphed hit, burst or boss ability ever exceeds 50% of the victim's max HP. Every monster's landed hit carries its land's status (Part 5.8).

### 6.6 Loot and credit

**Credit**: every point of damage is tallied; at the kill each contributor's share is their damage over all damage dealt. Anyone with a share gets skill XP; a share of 5% or more gets gold and may take from the pile; the killing blow alone gets the kill count, the nugget roll, melee lifesteal and the trap judge. Every XP recipient also gets the quest kill credit, the codex count, and a tenth of their XP to the pet out with them. A contributor must be alive, connected and still in the zone.

**The pile** appears where the monster died, lasts 60 s, is picked up within 160 px (a pet reaches 240), and holds three lanes: the one-of item (remains, the shard or a Rare Gem, to the first picker), a weapon, an armour piece; gold is split by share. **Remains** drop on every kill of a snowman, goblin, mummy/skeleton or any slime-based kind (quests ask for them, Diego buys them); the rock monster, fishman and bog lurker leave none.

**One roll a kill**: the server rolls one number 1–10,000 and each rarer drop owns its own run of numbers, so a kill drops at most one of them. The live layout for a snowman:

| Numbers | Drop | Chance |
|---|---|---|
| 1 | Gold Nugget (to the killer) | 1 in 10,000 |
| 2–21 | Iron Great Sword (grade rolled) | 1 in 500 |
| 22–41 | Iron Greaves | 1 in 500 |
| 42–61 | Iron Torso | 1 in 500 |
| 62–111 | Rare Gem (cut into any elemental gem at the Gem Works) | 1 in 200 |
| 112–1,111 | the land's Shard | 1 in 10 |
| 1,112–10,000 | nothing more | — |

Every weapon or armour drop rolls its grade (Rare 9%, Elite 0.9%, Godly 1 in 2,000,000). The roll is shown over the monster ("7,431" in grey, "640 Frost Shard" in gold), and the codex prints the same bands. The random weapon off a kill was removed on the owner's word; the raw gem off a kill was replaced by shard cracking.

### 6.7 The Monster Codex

A dashboard button of its own. One card per kind; a silhouette and "???" until **one kill** (the owner: "all the facts revealed after just 1 kill"), when a NEW MONSTER card pops. A page is the owner's mockup: a header (portrait, name, level band, element, body type, your kill count), **Drops** (every row with its roll numbers and chance on a 100% bar, a tap opening the item's card), **Info** (a stage that plays your own character against the monster with its attack, its element's effect and its special on the world's own timings; what it does, a tip, a two-paragraph made-up story, its elder form), **Locations** (land, stages, the road from BroTown, its dungeon). The page's numbers are held to the server's own constants by a test.

### 6.8 Dungeons

Four of the eight lands have a dungeon mouth at their landmark:

| Dungeon | Land | Levels | Boss |
|---|---|---|---|
| The Goo Grotto (v2.3.3540) | Verdant Wilds | 1–5 | a giant Blue Slime that splits three times (v2.3.3558); its mouth, walls and 17 things inside the owner's pictures (v2.3.3566), moving since v2.3.3567: slime drips and bubbles, the torches burn, spores rise, the ferns sway |
| The Great Cave | Stone Hollows | 26–30 | Amethyst Golem |
| The Foundry Dome | Electric Foundry | 26–30 | a giant Storm Slime that splits three times (v2.3.3562) |
| The Buried City | Wind Dunes | 41–45 | Gilded Mummy |

- **Entry**: walk within 200 px of the mouth, "⚔️ Enter the Great Cave" (or E). The run's level is the place's top **but never above your own character level** (your best weapon's): a player whose best weapon is at 8 meets a level-8 Cave, waves of 8–10 and a boss at 8. The code calls the dungeons open to anyone from the first hour; that was written when the Wheel was short and the Great Cave stood about 8,400 px from town. On today's long Wheel it stands about 31,000 px out, through every stretch from level 1 to level 30. The **Goo Grotto** (v2.3.3540) is the starter: the Verdant Wilds' landmark in their first stretch, about 36 seconds' walk from where you arrive, where the Mayor's first quest already sends you for slimes; nothing is drawn over any mouth (`MOUTH_CLEAR`). Refused if dead, already in a run, or 8 runs are open room-wide.
- **Party**: the leader pulls the three eligible members nearest them within 600 px of the mouth; a dungeon is four even though a party is 50.
- **Inside**: a private 36 × 52-tile arena floored with the land's own ground; **three waves** of the land's whole six-monster list, every one at the run's level (v2.3.3556: they rolled +0..2), each wave held until all are dead; kills pay exactly as in the world (XP, gold, pile, the land's shard, quest and codex credit); nothing respawns.
- **The boss**: the land's last kind at the dungeon's own level (v2.3.3540; it was five levels up: 30 at the Cave and Dome, 45 at the City, 5 at the Grotto), its whole health × 4 × party scale (1.0 / 1.6 / 2.2 / 3.0 for 1–4 players; v2.3.3556: only the part past the level's flat was multiplied, which left it about a wave monster's health), drawn about twice your height with a "Boss <name>" plate on deep red, hit where it is drawn and see-through while it covers you (v2.3.3556), damage ×1.5, with a kit by archetype: slam (80 px, ×1.5), sweep (70 px, ×1.2), charge (600 ms lunge at 8× speed, ×1.5 on contact), summon (2–3 minions at −5 levels with 30% HP, at most 4 alive and 60 a run, only while the boss was hurt in the last 15 s), siphon (hexer, 100 px, ×1.3, heals 3%). First cast 3 s after spawn, then every 4 s with a 1 s telegraph; every hit ≤ 50% of max HP; after 2 minutes in combat it enrages (+10% damage every 30 s to +50%, cooldowns ×0.6; never a wipe). The level edge reads the boss's own level, now the run's (at five levels above, before v2.3.3540, every point a player spent in the seven edge stats counted as zero against it).
- **The Goo Grotto's giant slime splits** (v2.3.3558, the owner's "a giant slime that explodes and spawns small (normal size slimes) like 8-10 maybe but shrinks in size afterwards ... 3 rounds of that before it finally just becomes a normal slime then after you kill that you defeat the dungeon"). Its bar wears three dark marks, at 75%, 50% and 25% of its health. At each it swells for 1.6 s ("BURSTING!", unhittable, still), then goes off as a blue slime does: a blast as wide as its swollen body (180, 115, 110 px; a blue slime's 60 at the hit scale, at most half your bar), and 10, then 9, then 8 of the Grotto's own blue slimes thrown out on a ring 125–230 px round it, at the run's level, paying as any. Each split it is drawn a step smaller (×4.59 a slime, then ×2.76, ×1.66, ×1). No hit can skip a split: its next mark is a floor no damage passes until it has split. Its last quarter is one wave slime's health, and killing that last form is the win: it bursts as any blue slime, and every slime it threw out that is still standing pops with it, unpaid. Between splits it keeps its kit's slam and charge, and it summons nothing. A level-3 run's health is about 5,145 (was 2,310), so it takes and pays about twice as long. Kill switch `slimeboss: false`.
- **The Foundry Dome's giant Storm Slime splits the same way** (v2.3.3562, the owner's "Yes"): its marks, swell, blast and 10, 9 then 8 of its own storm slimes. Every split goes off even though a storm slime never bursts on death, and the blast carries the storm's shock to players standing near the one it hits. Its last form simply dies, and the slimes still standing pop.
- **Reward**: on top of each kill, gold 90 + 2 × level (a level-30 run: 150 gold), paid at once. Since v2.3.3565 a world dungeon's clear also opens **the boss's chest** for everyone in the run: 20 gold a level, 3 of the land's shards, and one time in 10 a Rare Gem (never a raw gem: those come only from cracking shards). Its XP, 240 + 5 × level, goes into the weapons you fought with in that run, by their shares (the weapon in your hand if you earned none there), faded as fight XP is; the clear's card shows the chest opening and lists all of it, and since v2.3.3566 the chest itself (the owner's picture) lands where the boss fell and opens with it. A Workshop run pays its XP to the old single-level counter only, which no skill reads. Since v2.3.3543 the words over you show only the clear's gold ("DUNGEON CLEARED!", "+150G"). You then have 30 s to pick up the loot, a card counting down with "Leave now" (v2.3.3556: it was 3 s), and you come out at the mouth; starting it again with your last run empty ends that run. Walk out the door: nothing. Die inside: BroTown, with your bag kept (v2.3.3556; a red skull's loss is still No man's land's). A run lives in memory only; a deploy ends it.

**The Dungeon Workshop** (the farm's notice board) lets a player design a run the server clamps: 1–10 waves, monster level up to your own, up to 4 groups of 1–8 of any archetype, a boss at ×2–8, a cosmetic terrain. Its monsters have no land, so they drop no shards; the clear pays × min(1, monsters per wave / 4) and rare drops scale down by monster level over yours ("the Workshop is not a pen"). Its paid terrain and monster packs (200–1,000 gold) are client-local purchases with no server settlement: effectively dormant.

### 6.9 Not built, put away, open

- Monsters past level 40 and the Dark/Light realms (80–100); the plan has the passes and gates, the tables stop at tier 8. The second stage is nine recolours; the owner's word is wanted on new kinds rather than more recolours.
- Five lands have no dungeon ("a landmark added to the plan, then one word in the table"); no mouth pictures, arena props or dungeon-specific rewards (a chest, a rare drop); coming out at the mouth without the trip through town.
- New species: none; the codex reserves Winged and Insectoid. The stalker's pounce (removed), boss phase armour (never ported), a player-thrown snowball (dead client code).
- Noise recordings for the mummy, rock monster, fishman, lurker and wisp; art for the second-stage looks.
- A monster never threatens NPCs or pets; pets are never hurt.
- Every monster subsystem has a kill switch (wheelmonsters, wheeldeep, wheelpast20, wheelslope, wheel5x, wheelrest, wheelpursue, wheeldungeons, monsterhold, elemhits, killroll, codex, oneformula, xp_mult 1–4).

*Sources: server/src/data.js, index.js, wheelzone.js, wheelspawns.js, telegraph.js, killroll.js, codex.js, dungeon.js, wheeldungeon.js, firetrail.js, spawnscale.js, xpdecay.js; src/data/monsterVariants.js, wheelStageLooks.js, monsterCodex.js, codexDrops.js; docs/specs/wheel-monsters.md, monster-codex.md, monster-drops.md, monster-phases.md, monster-aggression.md, snowman-snow-pile.md, fire-trail.md, dungeons.md, wheel-dungeons.md, hit-door.md, pace-and-difficulty.md.*

---

## Part 7. Life skills, crafting and gear

Ten life skills share one curve (Part 3.7). Gathering feeds crafting: ore → bars → swords and armour at the Blacksmith; logs → hardened wood → bows, staffs and traps at the Woodworker; shards → raw gems → gems at the Gem Works, set into gear; fish and crops → food (Part 8).

### 7.1 Gathering: Mining, Woodcutting, Fishing

**Tools** come from the tour's givers on accepting their first quests (the pickaxe from Blacksmith Bro, the hatchet from Woodworker Bro, the rod from Diego) and are kept through an ordinary death; lost in No man's land, each is bought back from Diego at 100 gold. Without the tool a resource is not drawn, not on the minimap and does not block you.

**Where things grow**, in five bands, richer the farther from town:

| Band | Tier | Ore (Mining level) | Wood (Woodcutting level) | Fish (Fishing level) | Node HP |
|---|---|---|---|---|---|
| The safe commons | 1 | Copper (1) | Pine (1) | Minnow (1) | 10 / 10 / 10 |
| Each land's levels 1–10 | 6 | Iron (1) | Softwood (5) | Clownfish (5) | 20 / 40 / 40 |
| Levels 11–20 | 11 | Black Steel (5) | Hardwood (10) | Trout (10) | 80 / 220 / 220 |
| Levels 21–30 | 16 | Titanium (10) | Cedar (15) | Salmon (15) | 440 / 840 / 840 |
| Levels 31–40 | 21 | Obsidian (15) | Maple (20) | Pike (20) | 1,680 / 2,480 / 2,480 |

The long Wheel bakes 1,222 resources (486 veins, 486 trees, 250 fishing spots; the commons has 6 veins, 6 pines and 10 fishing spots). Not every band of every land has water a line can reach (the Stone Hollows' 1–10, the Verdant Wilds' 11–20 and 31–40 have no fishing of their tier). Each tier has its own picture (five trees from a pine to a huge autumn maple, five rocks from an 81 px copper to an obsidian boulder), the same in every land, the land shown by code-drawn specks (snowflakes, embers, petals…). A tree's trunk is the only solid part. Every tree and vein you hold the tool for wears a small disc with the tool's picture, grey when it asks more than your level; only the nearest within 260 px says its name and level. A locked resource can be **tried**: three swings, a 0 off it on each, "Requires Fishing Lv 5", nothing sent.

**How a harvest plays.** Two halves: a wind-up of **hits** the server rolls, then a **gesture** the player makes.

- Each hit is a ten-sided die read down from your level: `max(1, level − 9 + face)`. Level 1 always hits 1; level 3 hits 1 eight times in ten; level 10 hits 1–10 evenly; from 11 there are no 1s. One hit per swing of the art (the pick 650 ms, the axe 540, a nibble 650). The node HP table is solved so that at the level a tier opens it takes on average 10, 20, 40, 80, 160 hits: tier 1 about 6 s of swinging, tier 5 about 100 s. A green bar over the resource reads "7/10"; your name plate hides while you gather; at 0 the character freezes and waits, as long as you like.
- The gesture, on the right button (or anywhere on the world with a mouse, or E held): a pump for the pick, a chop for the axe, a circle for the reel, a flick for the pan, 1.5 s of work at a quick pace, a 1.2 s floor. **Perfect** (within 1.8 s of motion and 2.25 s overall, by a hand that looks human) doubles ore only and XP ×2; **good** (within 3.5 s) XP ×1.5; **ok** otherwise. A tree always yields one log and a catch one fish (the owner's rule). A keyboard-worked gesture is never perfect.
- Monsters leave a harvester alone (no targeting, no damage) for up to 120 s after the hits end; swinging a weapon ends the shield.

**What a harvest pays**: the tier's item (two ore on a perfect); the land's **shard** one time in three (none on the commons); XP by tier, 163 / 326 / 652 / 1,304 / 2,608, × the grade, so every tier pays about 22–30 XP a second at the level it opens; the XP fades for a resource whose required level is 5+ below your skill (a third at 5, then 15% less a level), so "it should always be most efficient to harvest things within your current level", and past the top resources (Mining 20, the others 25) everything fades, the owner's call ("I'll add more content"). A node respawns after 20 s.

### 7.2 The Blacksmith

Tabs: Smelt, Forge, Armor, Upgrade, Amulet, Salvage. Blacksmith Bro opens it after his quests; the smith works at the painted anvil while anything forges.

- **Smelt**: 5 ore → 1 bar; Copper Bar at Smithing 1 (400 XP), Iron Bar at 5 (600), Black Steel Bar at 10 (800). Diego values a bar at 240 against its ore's 200. No bar exists for titanium or obsidian; those weapons still take raw ore.
- **Forge**: greatswords only (the one-handed tab was removed; swords already owned still work). Copper (Smithing 1, 5 bars, 20 gold, 1,000 XP), Iron (5, 5 bars, 35, 1,500), Black Steel (10, 5 bars, 55, 2,000), then Titanium (15, 5 ore, 85) and Obsidian (20, 6 ore, 120); every rung past that asks ore that grows nowhere. To forge a blade you need what wearing it needs (black steel Melee 10, titanium 15…). The weapon in hand goes into the **weapon bag** (8 spares); a full bag refuses the forge.
- **Armor**: a torso or greaves in copper (Smithing 1), iron (5) or black steel (10), **5 bars each, no gold**, 1,000 / 1,500 / 2,000 XP. Armour is on its own ladder of whole steps: a torso stops 30% + 7.5% a step, greaves 20% + 5%, multiplying to 44% (copper), 53% (iron), 61.5% (black steel), capped at 75% plus grade lifts; black steel asks level 5 to wear (5 allocated Defense points before v2.3.3544), copper and iron nothing. Armour adds no HP. A kill drops Iron Torso, Iron Greaves or an Iron Great Sword at 1 in 500 each.
- **Upgrade** is hardening (Part 5.2): H1–H5 at 80 / 20 / 5 / 1 / 0.5%, 500 × 2^(n−1) gold plus n bars, a failure keeping the level.
- **Salvage**: any carried copper, iron or black steel torso, greaves, sword or greatsword gives back 2 bars (of the 5 it took); a Rare, Elite or Godly piece also leaves an **essence** of its grade and metal that raises any carried piece of the same metal to that grade (Diego pays 750 / 4,000 / 125,000 for an essence). A piece from before the gear ledger ("Too old to salvage") cannot be salvaged or sold but still works.
- **Amulet**: gold nuggets (1 in 10,000 kills) smelt 5 to a bar; Simple / Ornate / Regal / Mythic at Smithing 1 / 15 / 35 / 60 for 1 / 3 / 6 / 10 bars and 50 / 200 / 500 / 1,200 gold, power 1.0 / 1.5 / 2.2 / 3.0, one gem socket (Part 3.9). Crafting replaces the amulet you wear.
- **Shields**: no forging; the only shield in the game is the Pine Shield from the Mayor's first quest (+2% block, +15 stamina, 1.5 flat defence, client-side numbers) with one gem socket (its bonus client-side).

### 7.3 The Woodworker

Tabs: Bow, Staff, Traps, Harden. Woodworker Bro opens it after his quests (his second quest swaps your pine bow or staff for a softwood one at the hand-in).

- **Hardened wood**: 5 logs → 1 hardened wood; pine at Woodworking 1 (400 XP), softwood 5 (600), hardwood 10 (800), cedar 15 (1,000), maple 20 (1,200). Diego values it at 144 against its logs' 120.
- **Bows and staffs**: 5 hardened wood of the tier and a little gold (pine 8, softwood 20, hardwood 35, cedar 55, maple 85), 1,000 / 1,500 / 2,000 / 2,500 / 3,000 XP; ironbark and beyond ask logs that grow nowhere. Pine and softwood are free to wear; hardwood asks Bow or Magic 10, cedar 15, maple 20.
- **Box traps**: one log of any kind each, 40 XP.

### 7.4 The Gem Works

One building, two tabs, the owner's choice ("one gem building is enough"): **Cut gems** and **Set gems**.

- **Shards** come from kills (1 in 10, the monster's land) and harvests (1 in 3, the node's land); eight kinds, one per land. **Cracking** a shard yields the land's raw gem 10% of the time (12% from Gem Cutting 15, 15% from 35, 20% from 60), 40 Gem Cutting XP a crack found or not; up to 50 at once, the reveal played tile by tile from the server's rolls. **Three raw gems combine** into one elemental gem, never failing, 200 XP. The **Rare Gem** (1 kill in 200) cuts into any one of the eight. About one elemental gem an hour in one land by the plan's estimate. Diego pays 600 for a raw gem and 2,000 for a gem. Gems are bag items, kept through an ordinary death, lost with the bag in No man's land.
- **Setting**: one gem into a weapon's slot (one slot up to obsidian/ironbark; a second from mythril, which cannot be made, so two-gem "fusion" weapons are unreachable), into an amulet or a shield. A gem **changes no damage**: the metal's damage stays and the element is the gain (every hit carries the gem's status and the ×1.25 "UP" against the element it beats; Part 5.8). 400 Enchanting XP a set, paid only for a gem you made. **Take out** returns every gem for 25 × the weapon's material multiplier gold (28 copper, 35 black steel). A full weapon is not overwritten.
- The gem plan's fifteen decisions were all taken by the owner on 2026-10-20 ("All of that sounds good"); phases 1, 2 and 4 are built. Not built: phase 3 (gem pictures from the owner's sheets; gems show the element's picture), phase 5 (a Gem Cutter Bro and Gem Setter Bro outside, each opening his tab, and a three-step gem quest), the shard rename, a Flora gem's amulet and shield bonus, Dark and Light gems, gem grades.

### 7.5 Inventory and gear

- **The bag** has no slot or stack limit on ordinary items. Five filter chips: All, Weapon, Armor, Consumable, Crafting (everything unrecognised files under Crafting). Newest first; an anchored item pins to the front. The item card gives the picture, name, count, what it is for ("Smelt 5 into a Copper Bar at the Blacksmith"), and Equip / Eat / Drink / Sell (which lists it on the auction house) / Drop. Gear lives apart: the weapon bag (8), and server stashes of 32 for armour, greaves, shields and amulets.
- **Worn**: three weapon slots at once (melee, bow, staff), swapped by the weapon button or double-tap; torso, greaves, shield, amulet, cape and the cosmetic shirt and plate looks. An amulet has no unequip (it is replaced).
- **Provenance**: every piece of armour, greaves, shield or amulet the server mints carries a server id and a ledger row; a piece sent in with an id is rebuilt from the ledger, so a forged id buys nothing. Only a minted piece can be sold, salvaged, regraded or count as godly; a piece adopted from before the ledger is usable but "too old to salvage". Weapons are held by reference in the weapon bag.
- **The Bank** stores nothing ("Your gold and what you wear. Nothing can be stored here yet."). Gold is kept on death unless a player kills you in No man's land or you die with a red skull.
- **Dropping**: any bag item (never gear), yours alone for 60 s, anyone's after a minute, flashing at two, gone at 130 s.

**Diego's prices** (he pays half the base into an empty pile, less as his pile grows; he sells at the base, flat): ore 40, logs 24, raw fish 28, bars 240, hardened wood 144, shards 110, remains 18 (a snowman's 26), raw gem 1,200, gem 4,000, Rare Gem 4,000, essences 1,500 / 8,000 / 250,000, box traps 20; seeds, crops and compost at the farm's prices. He sells no food, drink or gear and buys no cooked food or dish.

### 7.6 Not built, put away, open

- Resource tiers past 21 (the client ladders name twenty woods and twenty ores; only five of each grow); fishing on an east-facing shore; bars for titanium and up; armour past black steel; the one-handed sword tab (removed); shield forging; amulet take-out; woods past maple; two-slot weapons in practice.
- The old one-raw-gem cut and raw gems off kills (behind `shardcrack: false`); a browser-only salvage, reforge and affixes (removed in the Blacksmith rebuild).
- The Bank; an item search or sort; dropping gear; cosmetic mints; Diego's shelf (empty by directive).

*Sources: server/src/gathering.js, smelting.js, gear.js, armorforge.js, forgeladder.js, hardening.js, salvage.js, amulet.js, hardenedwood.js, trapping.js, gems.js, shardcrack.js, weapongem.js, shieldgem.js, gearprov.js, gearstash.js, itemdrop.js, shop.js, xpdecay.js, data.js; src/data/lifeSkills.js, items.js, shards.js; docs/specs/gathering-hits.md, hit-ladder.md, resource-hp.md, xp-decay.md, wheel-resources.md, gesture-cue.md, tier-trees.md, tier-ore.md, smelting.md, armor-forge.md, blacksmith-rebuild.md, hardening.md, hardened-wood.md, salvage.md, amulet-forge.md, shield-gems.md, shard-crack.md, weapon-gems.md, gem-works.md, docs/GEM-PLAN.md, gear-provenance.md, gear-stash.md, inventory.md, item-drop.md, diego-prices.md.*

---

## Part 8. The farm, food and pets

### 8.1 The farm

The Feed & Seed in BroTown is the shop and order board; the farm itself is a zone you walk, `farm_home`, reached from the Feed & Seed's "Visit Your Farm" or the Land Office's door, under its own loading screen; its gate leads back to the Wheel at the door you left by. The owner's brief: "mechanics similar to the old FarmVille game … dig, plant seeds, fertilize, water", and then "I want your character to be able to walk around on the farm … I don't want the game to just be reading a bunch of boring menus".

- **The deed**: six beds, free, created the first time the window opens. The record allows 25 but nothing sells more (the planned Land Office purchase, 500 → 7,500 coins, is not built).
- **The steps**, in the server's order: **Dig** (grass → tilled; a harvested bed goes back to grass) → **Plant** (needs the crop's Farming level and a seed) → optional **Water** (once, while growing: the crop is ready 25% sooner) → optional **Fertilize** (one compost: harvest ×1.5, a fraction paid as a chance) → **Harvest** (when the server's clock passes the ready time).
- **Nothing withers, nothing ticks**: crops grow while you are logged out and while the room is empty, and a ripe crop waits forever. XP is paid only at harvest. On joining, "🧺 3 beds are ready on your farm".
- **The walk**: a 32 × 44-tile farm with the barn, a scarecrow, tools, trees, fences and a well, six beds in two rows. Each bed floats its next step as a picture and its timer; the nearest says it in words ("4m 12s · Needs Watering", "Ready to Harvest!"). Take a step by the button over the dashboard, a tap on the right stick (which wears the step's picture), E, or a tap on the bed. Your character works it for 1.1–1.5 s with the owner's own moves (the hoe swung twice, a kneel, a watering can poured), dressed as you are, and other players on the farm see you work; walking away sends nothing. Everyone's farm is the one zone: two farmers see each other among their own beds (a private farm per player is the plan's open question).
- **On the farm**: the barn is the Pet House (the Pets page); the haystack is "Sleep in the hay" (3 s: the Hotel's rest, paid by the server since v2.3.3539: full pools and Well Rested, +10% combat XP for 30 min); the notice board is the Dungeon Workshop (Part 6.8).

**The sixteen crops** (the owner: "the main focus is just getting a good variety of crops to grow, then the next step is deciding what each one does"):

| Crop | Farming | Seed | Grows (dry / watered) | Yield (plain / fertilized) | XP | Diego pays (base) | Cooked into |
|---|---|---|---|---|---|---|---|
| Carrot | 1 | 2 | 8 m / 6 m | 2 / 3 | 25 | 8 | Garden Stew, Stamina Tonic, Zoom Juice |
| Wheat | 1 | 3 | 20 m / 15 m | 3 / 4–5 | 35 | 6 | nothing yet |
| Firebloom | 1 | 5 | 40 m / 30 m | 2 / 3 | 50 | 16 | Herb Bread, Firebloom Tea, Fury Tonic |
| Strawberry | 1 | 4 | 1 h / 45 m | 3 / 4–5 | 60 | 10 | nothing yet |
| Tomato | 5 | 5 | 1 h 40 m / 1 h 15 m | 3 / 4–5 | 75 | 11 | nothing yet |
| Potato | 5 | 6 | 2 h 40 m / 2 h | 3 / 4–5 | 90 | 12 | Garden Stew, Pumpkin Pie |
| Frostberry | 5 | 8 | 4 h / 3 h | 2 / 3 | 110 | 26 | nothing yet |
| Rock Vine | 5 | 10 | 5 h 20 m / 4 h | 2 / 3 | 120 | 30 | Root Stew, Mana Draught |
| Corn | 10 | 9 | 5 h / 3 h 45 m | 2 / 3 | 125 | 28 | nothing yet |
| Cabbage | 10 | 11 | 7 h / 5 h 15 m | 2 / 3 | 150 | 34 | nothing yet |
| Cloudpetal | 10 | 15 | 10 h 40 m / 8 h | 2 / 3 | 180 | 40 | Root Stew, Swift Draught |
| Dewmelon | 10 | 18 | 15 h / 11 h 15 m | 2 / 3 | 220 | 48 | nothing yet |
| Pumpkin | 10 | 25 | 29 h 20 m / 22 h | 2 / 3 | 320 | 60 | Pumpkin Pie |
| Thunder Pepper | 15 | 12 | 9 h / 6 h 45 m | 3 / 4–5 | 200 | 30 | nothing yet |
| Gloomcap | 15 | 20 | 18 h / 13 h 30 m | 2 / 3 | 270 | 55 | nothing yet |
| Heartroot | 20 | 28 | 24 h / 18 h | 2 / 3 | 340 | 70 | nothing yet |

Compost is 4 coins. Diego values a seed at its shop price, so reselling a seed is always a loss, and pays about half a crop's base into an empty pile. **Diego sells no food or drink** (owner: food and drink come only from farming and recipes). **Every crop is food** (v2.3.3537): eaten raw from the bag it heals half what a fish of its level does (+10 HP on screen at Farming 1, +15 at 5, +23 at 10, +33 at 15, +48 at 20), under the fish's one-bite-in-a-fight rule. Ten of the sixteen cook into nothing; the magic herbs pair with lands by design only (nothing reads a crop's land).

**Farm orders**: three a UTC day per player, drawn from an 11-order pool by what your own Farming and Cooking levels can make (fewer if fewer fit: a brand-new farmer sees two), stored for the day, each deliverable once for gold and Farming XP: 12 carrots → 50 gold + 150 XP; 6 Firebloom → 55 + 200; 3 Herb Bread → 50 + 250; 3 Stamina Tonic → 40 + 200; 6 Rock Vine → 100 + 400; 9 potatoes → 70 + 350; 2 Garden Stew → 80 + 400; 4 Cloudpetal → 110 + 500; 3 pumpkins → 120 + 600; 2 Root Stew → 110 + 450; 3 Pumpkin Pie → 220 + 800. About 150 gold a day for a new farmer, 450 at most. The ten newer crops are in no order.

The tour's farm quests: Farmer Bro's "Carrot Comeback" (plant and water 3 carrots; 3 seeds and 3 compost on accept; 40 gold) and "Zoom Juice" (after it and Diego's fish quest: pick 3 carrots and cook Zoom Juice; 60 gold).

### 8.2 Cooking and food

- **Raw fish cook only at a campfire**: tap a log in the bag, "Light fire" (one log is consumed; the fire burns ~45 s and is kept alive while you cook), then tap the fire and pick a fish. A fish has hit points like a resource (minnow 10, clownfish 35, trout 60, salmon 85, pike 110), worked down by "grease pops" every 650 ms on the hit ladder (a ten-sided die read down from your Cooking level), then a flip gesture in a 1.5 s window: flip in time → a cooked fish and **200 Cooking XP**; miss → burnt dust. The outcome is the player's timing, never a dice roll (considered and rejected). The Cookhouse's own fish game was removed by the owner.
- **Fish heal fixed numbers**, the same anywhere and in any fight: minnow 100, clownfish 150, trout 225, salmon 325, pike 475 (20 / 30 / 45 / 65 / 95 on screen), a fifth to two fifths of a bar where each is caught. One healing bite every 15 s while fighting anything; a quick-eat button picks the fish that fills what you miss.
- **The Cookhouse recipes** (herbs and crops; the dish goes into the bag):

| Dish | Cooking | Ingredients | Kind | Effect | Lasts | XP |
|---|---|---|---|---|---|---|
| Herb Bread | 1 | 1 Firebloom | meal | out-of-combat healing ×2 | 30 min | 25 |
| Stamina Tonic | 1 | 2 Carrot | at once | +60 stamina | — | 25 |
| Zoom Juice | 1 | 3 Carrot | brew | run ×1.25 | 5 min | 25 |
| Root Stew | 3 | 1 Rock Vine + 1 Cloudpetal | meal | take 5% less damage | 30 min | 25 |
| Garden Stew | 4 | 2 Carrot + 1 Potato | at once | heals 150 (30 on screen) | — | 50 |
| Mana Draught | 5 | 2 Rock Vine | brew | mana filled and a regen floor: specials nonstop | 3 min | 75 |
| Swift Draught | 5 | 2 Cloudpetal | brew | run ×1.5 | 3 min | 75 |
| Firebloom Tea | 6 | 2 Firebloom | brew | +20% damage | 30 min | 50 |
| Pumpkin Pie | 8 | 1 Pumpkin + 2 Potato | meal | +10% combat XP | 30 min | 75 |
| Fury Tonic | 10 | 3 Firebloom | brew | ×2 damage | 3 min | 75 |

One meal and one brew run at once (a new one replaces the old; timers never stack and keep running while logged out); damage is only ever a brew, and the ×2 Fury Tonic is the biggest multiplier in the game outside gear grades. The owner's stated purpose: "Farming needs a purpose … temporary buffs (boss fights, PvP, dueling, etc.)". Two more fight meals (element resist, stamina) were offered and not built.

### 8.3 Pets and trapping

The owner's rules: arm a trap, then kill the monster; your Trapping level decides what you can catch; catching is rare (about 1% at best); a trap costs at least one log; pets trade; a pet levels but never past your Trapping level; **no bad-luck rule** ("leave the odds exactly the same for everyone"); players name their pets.

- **Box traps**: one log of any kind each at the Woodworker's Traps tab (40 Woodworking XP a trap); an ordinary bag item.
- **Arming**: target a Wheel monster within 480 px, off the safe ground, at or below your Trapping level; the TRAP button shows the true odds ("0.6%") or is grey with "Requires Trapping N". The mark lasts 15 s; one mark at a time; at most 10 catches an hour.
- **The roll at the kill**: everyone with a live mark who did at least 5% of the damage rolls; one trap is used per roll, caught or not; four hidden checks each at the chance's fourth root (the 0–3 "shakes" the phone draws before the snap or the break).
- **The odds**: best 1% × 0.8 per stretch (levels 1–5: 1%; 6–10: 0.8%; 11–15: 0.64%; … 36–40: 0.21%); half the best when your Trapping level has only just reached the monster's, rising to the best 20 levels above it. Nothing else moves them. At 1%, half of players catch within 69 tries, one in eight needs more than 200.
- **Trapping XP**: every roll pays (163 at the first stretch, rising to 1,475 at the eighth, fading past 20 levels above the monster), a catch ten rolls more.
- **The kinds** (nine, eighteen with the level-21–40 recolour): Snowling, Gobling, Mumling, Pebbling, Sparklet, Finling, Wisplet, Lurkling, Dewdrop. About 1 catch in 50 is **golden**, a size of 1.18+ is **big** (about one in sixteen); both are a tint and a badge only. There is no evolution; a pet's stage is fixed at the catch.
- **What a pet does**: follows you at 120 px/s; picks up loot within 240 px of you (160 by hand); copies your held pose; **wards** its land's element (15% off the status at pet level 1, +1% a level, to 50%: shorter chills, holds and dazes, lighter burn and poison ticks; never the hit itself); is seen by other players. Pets do not fight, eat, starve or die, and are never lost on death or in No man's land.
- **Levels**: the pet out with you earns a tenth of your kill XP; a level costs ⌈25 × 1.08^(lv−1)⌉; never past your Trapping level.
- **The Pet House**: 30 places, +10 for 1,000 gold, then 2,000, 3,000 … to 120 (45,000 for all ninety). Rename (2–16 characters), take out, put away, release.
- **Trading**: a pet that is put away, not legacy and a day past its catch moves through the trade window (up to 4 a side), the auction house (escrowed in the listing) or the mail (queued while the collection is full), keeping its name, level and owners list.
- **Beastmaster Bro** (east of the Woodworker): make 3 traps (40 gold, 2 traps; 3 pine logs on accept) → spring 3 traps (100 gold, 5 traps) → reach Trapping 6 (250 gold, 10 traps; after the Mayor's finale) → catch a pet (500 gold, 15 traps).

### 8.4 Not built, put away, open

- The Land Office's paid land (more beds); friends visiting and watering; a private farm per player; better compost, elemental seeds, crop quality, tool upgrades; recipes for the ten crops nothing cooks; the crop art sheet and the Farmhouse and Workshop pictures (the haystack and notice board stand in).
- Pet Phase 5 (a monthly featured monster, bounties, eggs, a helping bite, cosmetics on the supporter pass); no mercy rule by decision; pet art is a shrunk monster until the owner wants its own; Beastmaster Bro's picture is a stand-in.
- The plan document every farm spec cites (docs/FARMING-PLAN.md) is not in the repository; its phases are known only from the specs.

*Sources: server/src/farm.js, farmorders.js, cooking.js, data.js, gathering.js, trapping.js, petbook.js, pets.js; src/data/farmCrops.js, dishes.js, farmLayout.js, trapping.js; docs/specs/farm.md, farm-walk.md, farm-orders.md, cooking.md, meals.md, fight-food.md, trapping.md, pets.md, docs/PET-TRAPPING-PLAN.md.*

---

## Part 9. The economy, shops, trading, daily rewards and quests

### 9.1 Gold

A new character has 50 gold. The server settles every coin.

**Sources**

| Source | Amount |
|---|---|
| Monster kills | 5 gold at level 1, 7 at 10, 10 at 20, 14 at 30, 18 at 40, split by damage share among those with 5% or more (the pile also holds the remains and the one-roll drop) |
| Dungeon clear | 90 + 2 × level (a level-30 run 150) on top of the kills |
| Quests | the live quest list pays 2,015 gold once per character (2,465 with the Mayor's three legacy errands): tut_1 25, farm_1 40, smith_1 20, smith_2 60, wood_1 20, wood_2 60, fish_1 40, farm_2 60, race_1 50, beast_1 40, beast_2 100, tut_2 200, tut_3 150, tut_4 400, beast_3 250, beast_4 500 |
| Farm orders | three a day, 40–220 each: ~150 a day for a new farmer, 450 at most |
| The free daily spin | a lump sum of 25 (40%), 50 (25%), 100 (15%), 200 (10%), 400 (6%), 1,000 (3%), 2,500 (0.9%) or 10,000 (0.1%), average 144, × up to 1.6 on a 7-day streak; then double-or-nothing at 50% as often as you dare, to a 100,000 house limit |
| Guild ladders | per life skill, at levels 5 / 15 / 30 / 50 / 70 / 90 / 100 / 150: 30 / 80 / 150 / 300 / 500 / 800 / 1,200 / 2,000 gold (5,060 a skill, 50,600 across ten) with AP |
| Alliance wars | 500 to each winner who fought, 50 to each loser |
| The arena | the champion's 250 per gladiator (8 → 2,000), the house adding 150 a gladiator up to 3,600 gold an hour game-wide; backers share losing stakes |
| Selling to Diego | half the base into an empty pile, falling as his pile grows (Part 7.5) |
| The auction house and the Exchange | another player's gold, no fee |
| Ace's flip, the Den's wager, the weekly jackpot | gold from other players and the house (below) |

**Sinks**

| Sink | Amount |
|---|---|
| Hardening | 500 / 1,000 / 2,000 / 4,000 / 8,000 an attempt (plus bars), the main sink in the game: H5 is ~2 million gold on average |
| Forging | 20 / 35 / 55 gold a blade (copper / iron / black steel) and 8–85 a bow or staff; armour costs no gold; smelting and hardened wood none |
| Gem take-out | 25 × the material multiplier |
| Pet House | 1,000, 2,000 … 9,000 for ten places each, to 120 (45,000 in all) |
| Amulets | 50 / 200 / 500 / 1,200 |
| Seeds and compost | 2–28 a seed, compost 4 |
| Lost tools | 100 each |
| Arena entry | 100 |
| Gambling | Ace's flip (±3 × stake at 45% to win), the Den's wager (10–10,000 at 40% to win), the weekly jackpot's 50-gold tickets |
| Death in No man's land | the purse to the killer |

The design document that sizes the free spin says "an hour of fighting earns ~1–2k", a designer's estimate, not a measured number.

### 9.2 Shops and markets

- **Diego** (beside the General Store) runs a sink-and-pile shop with **one shared pile for the whole world**: what he buys he sells back at the flat base price; what he pays falls as his pile grows (half the base into an empty pile, about a quarter after forty units, never below 1). He stops buying at 999 of a thing; 100 units a transaction. **His shelf is empty** by directive ("food and drink come exclusively from farming and recipes"), except the three lost tools at 100 gold; he buys no cooked food or dish, no gear, nothing without a price family.
- **The Exchange** (the General Store's door) is an order book for weapons by bucket (category, type, tier, elements): a sell lists a weapon from the weapon bag, a buy escrows gold; the first crossing order executes at the resting price; 24 h expiry, 10 open orders a player, no fee; a price history per bucket.
- **The Auction House** lists any stackable item, a weapon from the weapon bag, a minted gear piece by its ledger id, or a pet (put away, a day past its catch), at the seller's own price (1–999,999), for **7 days fixed** ("don't mess with different duration settings"); 10 listings a player, 2,000 in the game; buy now, bid (escrowed, minimum step 1), accept the top bid, cancel; **offers** in a listing's thread (up to 5 a listing, gold taken at once, 48 h) with yes / think / no; a **thread** per buyer per listing (200 characters, 20 messages). Settlement goes by mail when a side is offline. No fee.
- **Trading**: a gift lane (an offer the receiver accepts within 2 minutes, validated at the accept) and the **trade window** from a player's card: items and gold (to 999,999), up to 4 weapons (escrowed as staged) and 4 pets (validated at the commit); any change resets both confirms and locks Accept for 2.5 s; both sides debited and credited in one run. No fee. Nothing trades, sells or drops within 10 s of a hit between players.
- **Mail** is how every offline payout arrives (sales, refunds, trade payouts, the jackpot, war pay, arena prizes, a killer's spoils, pets): drained at the next join before the first snapshot, each entry paid exactly once; a weapon waits while the weapon bag is full, gear while its stash of 32 is full, a pet while the collection is full. The Post Office shows the visit's last 30 deliveries and friends' messages.
- **The Bank** stores nothing.

### 9.3 The Gambling Den, Ace, the streak

- **The free daily spin** (the top of the Gambling Den's window, unlocked by handing in the Mayor's first quest): the lump sum above as a **pot**, then TAKE IT or DOUBLE OR NOTHING at exactly 50%, again and again, the pot paid by itself when one more double would pass 100,000. A pot left open is paid at the day's end. The owner's brief: "Your first spin is for a lump sum … then the option of spinning it for double or nothing at 50% odds and that continues on." Nothing opens at login (the daily chest was removed: "I find the login page with the chest intrusive").
- **The login streak**: consecutive UTC days; a freeze earned every 7th day, at most 2 held, spent on a missed day; its only effect today is the spin's multiplier (+10% a day to +60%).
- **The Den's wager**: 10–10,000 gold at 40% to win double (expected −20%).
- **The weekly jackpot**: 50-gold tickets (50–5,000 a deposit); one ticket-weighted winner per ISO week takes the whole pool; the house takes nothing.
- **Ace's coin flip** (a tap on Ace): stake S of at least 10, allowed only while 3S ≤ your coins; a win pays +3S, a loss −3S, at 45% to win; or any bag stacks double-or-nothing at the same 45%. A hall of fame keeps the ten biggest wins and losses.

### 9.4 Quests

**The engine**: the server is the only writer of every counter and the only payer; objectives are counted kinds (kill, gather, traps made, trap rolls, catches, farm acts, crafts, cooks, the race), a `collect` of bag items (consumed at the hand-in), or a skill level read at the hand-in; prerequisites are a giver's own order (`next`) and `after` lists; every hand-in pays +5 Achievement Points; XP is paid flat into one chosen combat skill (every tour quest pays none, so no window asks); items that do not fit go to the bag or the mail, never lost; quest items survive an ordinary death.

**The tour** (the owner, a week before a reviewers' exposé giving each game 20–30 minutes: "Mayor bro is the only quest available for the first quest then after completing that other NPCs begin having quest icons appear above their head", "Keep the dialog witty and funny, it's an unserious game bro"):

| Quest | Giver | Objective | Pays | On accept / at the hand-in | After |
|---|---|---|---|---|---|
| Into the Blue | Mayor Bro | bring 4 Slime Remains from the Verdant Wilds | 25 g | Copper Great Sword + Pine Shield / Pine Bow + Pine Staff | — (the only first quest) |
| Carrot Comeback | Farmer Bro | plant and water 3 carrots on your farm | 40 g | 3 carrot seeds + 3 compost | tut_1 |
| Heavy Metal | Blacksmith Bro | bring 5 Copper Ore | 20 g | the pickaxe / 5 Copper Bars | tut_1 |
| Some Assembly Required | Blacksmith Bro | forge one thing at his anvil | 60 g | — | smith_1 |
| Knock on Wood | Woodworker Bro | bring 5 Pine Logs | 20 g | the hatchet / 5 Hardened Pine | tut_1 |
| Branching Out | Woodworker Bro | make a bow or staff, hand in a pine one | 60 g | your pine bow or staff remade in softwood | wood_1 |
| Something Fishy | Diego | bring 2 cooked fish | 40 g | the fishing pole + 2 pine logs / 10 Cooked Clownfish | tut_1 |
| Zoom Juice | Farmer Bro | cook Zoom Juice at the Cookhouse | 60 g | — | farm_1 and fish_1 |
| Race Day | Lil Bro | beat Lil Bro round the square | 50 g | — | tut_1 |
| Box Traps | Beastmaster Bro | make 3 box traps | 40 g | 3 pine logs / 2 traps | tut_1 |
| Set and Spring | Beastmaster Bro | spring 3 traps | 100 g | 5 traps | beast_1 |
| Cold Reception | Mayor Bro | bring 4 Snowman Remains from Frost Ridge (the finale: four ordinary snowmen and their burrow; there is no snowman boss) | 200 g, 50 XP | — | Heavy Metal and Something Fishy (v2.3.3533) |
| Bad Wind | Mayor Bro | 5 Skeleton Remains from the Wind Dunes | 150 g, 53 XP | — | tut_2 |
| Bro Ascendant | Mayor Bro | 6 Fire Goblin Remains from the Flame Fields | 400 g, 105 XP | Copper Greaves | tut_3 |
| A Trapper's Eye | Beastmaster Bro | reach Trapping 6 | 250 g | 10 traps | tut_2 |
| Your Own Beast | Beastmaster Bro | catch a pet | 500 g | 15 traps | beast_3 |
| Into the Wild / Dungeon Delver | Mayor Bro | kill 5 monsters / clear a dungeon (the gold road leads to the Goo Grotto, v2.3.3540) | 100 / 300 g | — | the Mayor's legacy line after tut_4 (its first step, Welcome Home, "visit 3 buildings", was retired in v2.3.3550) |

Twenty-two quests for seven givers who are not in the world (a trader, an enchantress, a scout, a second blacksmith, a healer, a second beastmaster, a veteran) are dormant in the table. Three old Mayor quests are retired: the tools' two old errands, and Welcome Home (v2.3.3550).

**Guidance**: a gold "!" over a giver with a quest, a grey "?" while his quest waits, a green check when it is ready, the same pins on both maps; **the gold road** on the minimap to the giver, to the quest's land's level-1 monsters, to the nearest needed resource, to the right building's door, to Lil Bro for the race; the pinned card ("Next: … (2/4)", or with nothing in hand "Next: <quest> / Talk to <him> <where>" and "+N more: look for a gold ! on your map"); gear tiles that flash until worn; the quest windows in the owner's painted art (a NEW QUEST offer with the items pictured, a claim window only when XP must be placed, otherwise "Claim reward" and coins flying to the purse). A giver's "how's it going" line carries a button that opens his building.

**Lil Bro's race**: four flags round the Town Hall's square and back, judged on every accepted move (80 px to touch a flag, in order), a 3-second countdown, a false start called; Lil Bro runs at 165 px/s (a walk at 150 loses by ~1.6 s; a sprint or Zoom Juice wins); "Race again".

**Guild quests** are ladders, not errands: each of the ten skill guilds pays gold and AP at eight level rungs (above); ranks (Novice to Transcendent) are titles.

**The leaderboard** (the Town Hall) ranks Combat (your level, the best of the three since v2.3.3538), each skill, kills and every life skill from server-counted series, reported at most every 5 minutes and dropping players unseen for 7 days.

### 9.5 Not built, put away, open

- The daily quests (three a day) and the 28-day season (25 tiers) are built and **off** (the owner: "they're randomly appearing as complete … I'd rather it go away"; "Yes drop the season"); the login chest and login gold are gone.
- The supporter pass (Part 12); a spectator stake board; the arena economics check-in (stale); collectibles (dormant content); hard zone gating.
- A "choose one reward" quest window; a race against a clone of yourself (Lil Bro races instead); count-based guild work; marketplace fee holidays, weekend XP events, rested XP (ideas noted, none built); commit-reveal fairness for gambling (deferred as "proportionate at this scale").

*Sources: server/src/join.js, index.js, combat.js, dungeon.js, shop.js, market.js, store.js, storeoffer.js, storechat.js, trade.js, trade2.js, inbox.js, gamble.js, cadence.js, dailyrewards.js, dailychest.js, quests.js, race.js, guilds.js, leaderboard.js, data.js; docs/specs/diego-prices.md, marketplace.md, auction-house.md, store-offers.md, store-chat.md, trading.md, inbox-escrow.md, gambling.md, ace-coin-flip.md, daily-rewards.md, cadence.md, quests.md, demo-quest-line.md, quest-guidance.md, quest-windows.md, quest-reward-overflow.md, guild-quests.md, farm-orders.md.*

---

## Part 10. Player versus player, and the social layer

### 10.1 No man's land

Fighting other players is off everywhere except No man's land, duels and the arena (and the owner's sparring clones). The master switch for open PvP has been off since the owner's "remove the option to kill other players for now"; No man's land is the one place its rule allows a fight.

**Where**: each land's Lv 6–10 ring is No man's land 1, the next ring 2, out to 15 at Lv 76–80 (so 1–8 in the populated world). The hub, the commons and each land's first ring are never PvP; dungeons never.

**Who may fight whom**: both standing in No man's land, both alive; their **character levels** at most N apart, where N is the **lower** of their two ring numbers (a ring-3 player cannot reach into ring 1 at someone 3 levels apart); not in one party.

**Attacking is a choice.** A stray shot or swing never hurts a player. The first time you tap a fightable player, pass a shot through one, reach one with a sword swing, or rest the bow's line on one, a small window asks **"Attack <name>?"** with three answers: **Attack** (they become your foe: every weapon lands on them, locked or not, until the fight lapses), **Party** (a party invite), **Ignore** (or 10 s). The window's Attack is itself the attack: the server starts both skulls at once, before any blow. The one attacked gets "**Hit back <name>?**" with the white skull; hitting back gives no red skull. Once you have a live foe, everyone else who attacks you joins the fight with no window of their own. A foe lapses when the rule stops allowing the fight, they leave, or 60 s pass with no blow either way. While a foe (or anyone you traded a blow with in the last minute) is within 900 px the shield and Special buttons stay up for every weapon.

**The skulls**: the attacker wears a **red** skull, the attacked a **white** one, each for 20 minutes of time online (reset by every hit); hitting back anyone whose right still runs gives no red; a red skull is not washed white.

**What a death costs** (the owner's rule, "You only keep what you have equipped"):

| Situation | Loses | Keeps |
|---|---|---|
| Killed by a player (no red skull) | **everything carried**: the whole bag with no carve-outs (tools, ores, cooked fish, quest remains, gems) into a pile that is the killer's for a minute, then anyone's; gold, spare weapons, spare armour, spare shields and amulets credited to the killer (mail if offline) | everything worn |
| Red skull killed by a player | all of that **and everything worn** | outfit pieces (nothing in them to take) |
| Red skull killed by a monster | everything carried, to nobody | everything worn |
| An ordinary death | the usual pile with its carve-outs (Part 3.6) | tools, quest items, gems, worn gear, gold |

A lost tool is bought back from Diego at 100 gold (only to a player a quest gave it, only while they hold none). Nothing leaves the bag in a fight: within 10 s of a hit between players Diego won't buy, the auction house, trades, drops and farm acts are refused. Crossing in plays a red plaque ("No man's land 1") and a chat line explaining the rule the first time; a red skull badge with the ring number sits above the dashboard and opens the rules on a tap.

### 10.2 The rules of a fight between players

- **The server rolls every hit with the monster formula**, whole (Part 5.3): no PvP multiplier and no PvP cap. A sword lands one hit a swing; a special counts only inside a 3.5 s window a paid swipe opened. The level edge works both ways, a player's level as an opponent being their highest trained skill. Max HP is the one formula's 100 + 50/level + 40/point.
- **Measured** on the fight simulator, which runs the server's own combat code (two equal players, average skill, no points, no food; median seconds from first hit to a kill, and how often the first weapon wins):

| | Sword v sword | Bow v bow | Staff v staff | Sword v bow | Sword v staff | Bow v staff |
|---|---|---|---|---|---|---|
| Lv 7, copper set | 11.2 s | 17.5 s | 17.0 s | sword 85% | 39% | bow 57% |
| Lv 12, copper set | 9.9 s | 12.2 s | 12.4 s | 23% | 25% | 64% |
| Lv 12, iron set | 12.2 s | 16.3 s | 15.6 s | 39% | 26% | 67% |
| Lv 22, copper set | 7.8 s | 11.6 s | 9.0 s | 51% | 9% | 36% |

Before the one formula those Lv 12 copper fights were 2.7 / 4.5 / 2.1 s. The better player wins 93–100% of same-weapon fights. With five fish each and quick-eat, Lv 7 fights last 18–37 s and the better fish wins 93–100%.

- **The sword's opening lunge works on players** (added because the sword lost to anything that kited it): with a fightable player locked, the attack press dashes up to 900 px to them, free, 2.5 s cooldown, and a landed lunge **dazes** 0.5 s (then 2.5 s immune). Win rates at Lv 12 copper went from 8 / 19 / 0% (low / average / top skill) to 32 / 39 / 89% against a bow and 3 / 24 / 0% to 12 / 21 / 66% against a staff. The owner's open question: a top-skill sword beats a top-skill bow ~90% (the lever named: a longer lunge cooldown against players).
- **The extras** on players: a gem's statuses, collisions, the staff's splash, the big bolt's blast, the Element Burst, the shield bash's shove, the whirlwind's pull, the dodge's lunge, melee lifesteal and a parry's stagger work as on monsters; an area move reaches only players you are already fighting. **A player cannot be locked down**: a freeze or stun holds 0.5 s then 2.5 s immune; a root 0.7 s then 2 s. **Not on players**: an ordinary hit's knockback and the volley's burn, which the simulator showed turn fights toward whoever keeps distance (knockback moved win rates by 11.5 points on average, the burn by 19.5); the owner's call.
- **Food**: one healing bite every 15 s in any fight (fish heal 100–475, fixed).
- **Leaving is no escape**: leave within 10 s of a hit between players and your body stays 20 s, hittable; a reconnect from within 300 px takes it back.

### 10.3 Duels, the arena, sparring

**Duels** start only from another player's card (Duel tile) and are **always no-stakes** (the server supports a wager up to 999,999 escrowed at the accept, but no screen sets one). "Duels are consensual. No wager, no item loss, no reputation penalty." Two minutes to accept, both in the same zone at the accept, one duel at a time, a 10-minute cap decided by the higher HP fraction, a 15 s reconnect grace, healing regen off. A duel kill drops nothing and wipes nothing; dying to a monster mid-duel is a normal death. The "threat" machine (a red-skull countdown, Call Guards fines, bounties) is coded and **off**.

**The arena** (the Sheriff's Office → "The arena"): 100 gold to enter, escrowed; 60 s to gather; a bracket of up to 8; each match a no-stakes duel with a 3-minute clock, fought **where the two stand** (no arena zone, no teleport), healing off. The champion's prize is 250 gold per gladiator in the bracket (8 → 2,000): the entries plus 150 a gladiator from the house, which pays at most 3,600 gold an hour game-wide. 500 Achievement Points to a character's **first** win only. Spectators may **back a fighter** with 10–5,000 gold, one stake per match: winners share the losing stakes pro rata, the winning fighter keeps 10% of the losing pool, nothing is minted, stakes are private.

**Sparring clones** are the owner's test tool: up to three AI copies of yourself (sword, bow, staff; Dummy / Easy / Normal / Hard, the simulator's player models) fight you through the real PvP code anywhere in the Wheel; a knockout is not a death. Players cannot start them.

### 10.4 Parties and alliances

**A party lasts**: up to 50 members, online or not, stored on the server, surviving logouts and deploys; any member invites from a player's card (60 s); the leader passes on leaving or after 7 days unseen; leaving takes two taps. A party changes no combat, XP or loot math; its members cannot fight each other in No man's land; a dungeon pulls only the three members nearest the leader within 600 px of the mouth. The party strip under the top bar shows six rows ("+N more · M online"), the Saloon lists everyone; members are blue on both maps (riding the minimap's edge when off it); party chat is `/p`.

**An alliance** is a party whose **active** members (played in the last 7 days and level 5+) reach 20; it stays one until they fall below 15. The leader names it (3–16 characters) and gives it a tag (1–4 letters, worn as `[TAG] Name` on every member's plate), changeable once a day, unique game-wide. **Wars**: a named alliance's leader declares war on another by tag; 30 minutes, rosters frozen, scored by kills under No man's land's own rule (so the fight still needs both in NML within the level rule), 500 gold to each winner who fought and 50 to each loser, an hour's rest after. A board ranks alliances by active members then total level. **Clans were retired into parties** (every clan became a party once, keeping its tag below 20; the 500-gold founding fee was not refunded, the owner's call: "the gold should be gone").

### 10.5 Finding, meeting and talking

- **The player list** (top left) lists everyone the phone knows of; a tap opens the **player card**: portrait, name, level, Friend / In party; four tiles (Invite to Party, Trade, Add Friend, Duel); Mute · Block · Report. The **Inspect card** adds the Hemi Bro checkmark and count, achievement points, the three combat levels, six gear pictures, kills.
- **Friends** are mutual (a request and an accept; declining is private), 100 at most, stored on the server; direct messages of 280 characters, queued up to 50 while offline and delivered at the next join. **Block** hides a player's chat and emotes and drops their duel challenges, trade requests and party invites on your phone (the list lives on the device). **Mute** is a server fact: a muted player's lines are never delivered to you. **Report** (two taps, a reason) attaches the server's own copy of their last three lines; the owner reads reports in the Test panel with Kick / Freeze.
- **Chat lanes**: All (the room), Area (your zone; the Wheel is one zone), Party, Whisper (by name, never a bubble), a friend DM, and a thread on an auction listing. Lines are 200 characters; a bubble over the head for 5 s; a feed of the last 40 lines behind a bell. Allowances: 5 lines at once then one per 2 s (room, emotes, party), 6 then one per 1.5 s (area, whisper, DM); a line repeated within 30 s is dropped; text is cleaned (six emoji at most, runs of a letter cut to six) but there is **no word filter** (the owner's choice). The sender's identity is the server's.
- **Emotes and moves**: from the chat box's smiley (never an always-on button): 30 emoji that pop over the head, 12 quick lines as a bubble ("67", "GG", "Bruh", "Gritty"…), six **moves** that play for a moment (wave, laugh, flex, shrug, facepalm, cheer) and seven **poses** the server keeps until you move (sit, sleep, flop, three dances on a 120-bpm clock so neighbours bob together, and the Zombie Shuffle), the whole figure tilted or squashed in code about its feet, each with its own sound; while you dance the music deck plays the dance beat. Your pet copies a held pose a beat late; Lil Bro copies the nearest player's move, Blacksmith Bro flexes back, Diego objects to dancing in his store, Ace calls a dance-off, the Mayor approves of three dancers. `/roll` (1–100 or N up to 1,000) and `/flip` are rolled by the server, shown as a chat line and a bubble, one every 5 s, nothing staked.
- **Halloween week** (18 October to 1 November by the phone's calendar): the Zombie Shuffle tile, pumpkin-orange speech bubbles, Diego's "No zombies in my store!" (a look, never a rule).
- **Capes and the Golden Ticket**: a cosmetic crimson cape from a contest ticket that drops from kills at a live-flag rate (default 1 in 2 while an event runs), one per account, capped per event (20); the event is switched on by a code change and is off. A merch draw tool picks winners from the leaderboard by a future Bitcoin block hash.

### 10.6 Not built, put away, open

- Off or dormant in code: threats and bounties; open PvP outside No man's land; duel stakes (no UI); clans; arena blind bets; daily quests and the season.
- The owner's fun-and-social plan, phases 2–4: two-player emotes (high five, dap, bro hug), "GG" after a duel, dance parties and a conga line, a group photo; farm-made toys (tomatoes, pies, snowballs, fireworks), a soapbox, a cannonball into Bro Pond, a town ball, chat styles, earned emotes and titles, silly stats in the Town Hall, cosmetics as the supporter pass's perk, Area chat meaning "near you"; a word filter, timeouts, a server-side block.
- Alliances: their own chat, storage, territory, war kills on the map. The arena: a dedicated zone, server-owned titles, a public stake board.
- PvP levers named and not pulled: knockback and burn on players; a longer lunge cooldown; the player hit lane 300 ms against the monster's 210.

*Sources: server/src/nomansland.js, duel.js, gladiator.js, spar.js, pvpbalance.js, pvplunge.js, pvpextras.js, linger.js, party.js, alliance.js, clanparty.js, friends.js, chatlanes.js, chatguard.js, chatmod.js, emotes.js, poses.js, dice.js, eventcapes.js; src/game/nmlAsk.js, sparTargets.js, townsfolkReact.js, season.js; docs/specs/no-mans-land.md, duels.md, arena.md, sponsorship.md, sparring.md, pvp-fights.md, pvp-lunge.md, one-formula.md, party.md, alliance.md, friends.md, chat-lanes.md, chat-guard.md, chat-moderation.md, emotes.md, emote-moves.md, dice.md, halloween.md, cape-and-contest.md, docs/FUN-SOCIAL-PLAN.md.*

---

## Part 11. Presentation: art, audio, effects, and the owner's standing decisions

### 11.1 The art law

- **HD pixel art for everything except the bro**, the owner's decision after a Style Lab test of six looks round the real character. Every picture is kept at **2 px per game px** (the phone's own sharpness; a 1.5 px grid read "soft and gritty"); a ground swatch covers 512 game px; a tree is ~380 px tall. The world is finer-grained than the bro on purpose: characters read as figures on a stage.
- **Rules**: hard pixels, no blur, anti-aliasing or gradients; no shadows, glow, fog or night drawn into a picture (the code adds those); each ground swatch on its own 64 colours (a shared palette made the grass "clumpy"), objects on 64 of their own; quiet ground with nothing bigger than a pebble; every material drawn as itself; nothing in a ground swatch runs one way; ground calm, objects medium, characters, monsters and loot punchiest.
- **The pipeline**: art is commissioned from ChatGPT with one style paragraph and a style key (the bro is never attached: ChatGPT copies his chunkier pixels), then processed by the game's own tools: the World Builder (the plan, the blueprint, per-square prompts), the Ground Studio (48 swatches, water pictures, footstep rows, seamless by a cut), the Object Studio (76 objects including 17 buildings cut from magenta, found by count on sprite sheets, packed as palette PNGs), room pictures, icon sheets. The whole Wheel's objects and overview are baked. New art is possible but slow; recolours, cut-outs and code-drawn effects are cheap.
- **The bro** is a layered paper doll (body, clothes, every gear piece and weapon, eight directions, walking, attacking, bow, staff and gathering strips), recoloured and stamped with the player's drawings; copper, iron and black steel share the steel plate art tinted by metal; a worn piece shows its grade as a rim; gathering stand-ins (lumberjack, cook, fire-lighter, miner, angler, farmer) wear your colours and size.

### 11.2 What the code draws

- **View**: the bro about 64 CSS px tall with the band folded; the town's buildings at 1.15× on a town laid 1.5× roomier.
- **Depth and occlusion**: everything sorted by its feet; you walk behind trees and building corners; a tree whose crown covers you turns see-through.
- **Shadows**: every character, monster and object casts a silhouette shadow along one sun for the whole Wheel, shade coloured by the land, drawn in a pre-pass; the old ellipse blobs were removed ("worse than nothing").
- **Time of day**: a 40-minute day with dawn, day, golden hour, dusk and night exists in code and runs on the farm and the old zones; **the Wheel is always daylight for now** (the owner, after one unexplained very dark visit).
- **Air**: motes per land (pollen, spores, embers, sand, snow), cloud shadows, dust at the feet coloured by the ground, snow prints on snow, one shared breeze that sways trees and sheds leaves, snow or char from them. No rain.
- **Water**: the owner's three water pictures with motion drawn over them on the GPU: a swell, surf and foam at the shore, sparkles, crests, streaks drifting downstream, rings on still water, whitecaps and a moving web of caustics (the baked honeycomb was taken out of the pictures because it read as a tiled floor).
- **Land auras**: each land's trees and rocks wear its element over an unchanged picture: snowflakes and rime, embers rising and cooling with smoke, sand streaks, dust and crystal glints, spark bursts and arcs, drops forming and falling, spores and haze, petals and fireflies.
- **Building life**: chimney smoke, breathing lamps, forge sparks, glints on gold and glass, chaff from the loft; the Town Hall's flag cut from its picture and waved as a mesh on the breeze; buildings catch fire and collapse when hit (Part 2.4).
- **Bodies**: swimming sinks the figure to its neck with a foam ring and wake; the jump squashes, stretches and leans about the feet; the emote moves tilt and hop the whole figure in code; a monster's death is jagged pieces of its own picture in its own colour; a player's death crumbles the skin off and leaves a skeleton that explodes; blood drops by the hit's share of max HP; hit chips of the monster's material fly; a level-up plays the owner's medallion.
- **Halloween week**: pumpkin speech bubbles and the Zombie Shuffle, by the phone's calendar.

### 11.3 Audio

- **Only recordings**: every synthesised sound was removed ("worse than nothing"); new sounds are slices of files already shipped or the owner's own recordings from Pixabay and Freesound (CC0 or CC BY; never CC BY-NC).
- **Music by land**: the town's track on the safe ground, Frost Ridge, Flame Fields, Wind Dunes and Verdant Wilds their own tracks, the other four lands the game's theme until each has one (the owner declined reusing the old world track for memory's sake); into a land after 1.2 s, home after 8 s; streamed, never decoded. While you dance the deck plays the club beat.
- **Ambience beds**: birdsong, lava, wind for three lands (five have none yet); surf by the sea; the town's crowd; a fire's crackle; rivers, the pond and the falls on their banks; the forge's anvil.
- **Footsteps** by the ground drawn under the boots: twelve sounds (grass, dirt, gravel, stone, sand, snow, ice, mud, forest floor, ash, wood for every bridge, metal), 2.5× louder on a computer, other players' at about half.
- **Hits sound like their material** (snow, goo, ember, stone, wet, mud, bone; props by wood, plant, mushroom, stone); monster noises of their own for four kinds (the goblin's rawr, the skeleton's rattle, the slimes' bounce, the snowman's snarl) as one notices you and while it chases; a boss roar; a far death, slam or blast is not heard or felt.
- **The owner's 21+ recordings**: hurt grunts, a low-HP heartbeat, munch and gulp, the chat pop, the chime, a "denied" tick, a laugh and a snore, the war horn, the Blue Slime's explosion, the townsfolk's hums, the swim's splash, the points chime, the sprint's grunt and out-of-breath; and about 130 cues sliced from existing files for everything from a parry to a pet's level-up, other players' at half yours. A Sound Studio in the test panel lists every sound under the moment it plays.
- **Still missing**: voices for six monster kinds, air for five lands, music for four, the Saloon's piano, big monsters' footsteps.

### 11.4 The design system

"The world is the illustration; the interface is the field kit": dark mineral slate, warm-white text, about 85% neutral, 10% content colour, 5% brass; the login door and the creator keep their own painted title look. Priorities: instant comprehension without reading, minimal screen use, hierarchy, consistency, beauty ("Apple, not Blizzard"; "icons, not words"). Hard locks: the band at most a third of the screen; the painted world the brightest thing; all chrome CSS (no baked panels, parchment or filigree); no backdrop blur except the 2 px behind a dialogue; brass only for focus, selection and the one main action; the 90-icon set kept unchanged, with the owner's own sheets added since (small icons, 53 bag icons, the quest windows' painted art, land scenes, quest pins, the arena helmet, the handshake, the sack, the pet house, the prize wheel, the treasure map). Rarity is a thin edge, never a fill (grey, blue, orange, a turning rainbow); elements are shapes first (diamond, hexagon, circle, teardrop, star, square, triangle, leaf, trefoil, starburst). Type is Source Sans 3 with nothing under 11 px; greyed states are baked grey copies; choices are chips, never dropdowns; 44 pt touch targets (many buttons are smaller by the owner's choice, none unreachable).

### 11.5 Decisions the owner has made that an evaluator should not re-propose

The owner has tried, seen and turned down many obvious suggestions. Each of the following is a recorded decision; a suggestion that goes against one should say why the recorded reason no longer holds.

**Layout and controls**: a light theme, blur or frosted glass, text labels instead of icons, emoji in the UI; a bigger screen seeing more of the world; menus over the world sideways; pausing while a menu is open; a band taller than a third of the screen or title bars on main pages; narrower dashboard buttons (the back arrow was moved instead); a Bag button; any new always-on button on a phone; words on touch buttons; a cooldown ring on the base attack; moving Sprint, Special or Whirlwind; a fixed JUMP button or a double-tap jump; the target-switch arrows; zooming the view further out (64 px was "probably best"; 37 was "too small"); a harvest button mid-screen or off the right button; a time limit on the harvest's frozen wait; anything always on screen over the bottom-left corner (the stick's area); a Send button or a scrollable chat feed on a phone; a chat or emote button on the HUD.

**Onboarding and quests**: the creator as the first screen or auto-entering the world; email, password or social recovery; the Mayor's video greeting; a path drawn on the ground; a dimming step-by-step tutorial that stops play; more pop-ups on arrival; starting armed or leaving before the Mayor; an XP-choice window on the first quest; a coach for returning players; merging the dialogue with the offer; Accept or Turn In buttons in the quest log; several offers at once; the daily quests or the season as they were; anything that opens by itself at login; the spin before the first quest.

**Windows and systems**: walking inside buildings (keepers and the room behind the menu were chosen); opening Diego's shop or Ace's flip from a door; food or drink on any shelf; a buy/sell toggle in the shop; explanations in the forge or listing every future tier; showing a result before the server confirms it; a one-handed or wooden sword at the forge; two gem buildings; a combine that can fail; a sixth bag chip for food; a suggested sell price; a one-tap Report; a Threat or teleport button; facts revealed over several kills in the codex; the random weapon drop; Track / Find Trainer / View Recipes buttons or "coming soon" cells on the skills page; a name-and-level label over every resource; a rod over the fish.

**Fighting and numbers**: damage numbers that change with the zoom; hit-stop; auto-targeting for the bow or staff ("You must tap on the monster"); the bow firing at empty ground; dropping the shield after one block; the ability milestone ladder and the combo chain; a stray shot hurting a player; a bottom placement or backdrop for the "Attack?" window; a bad-luck rule for trapping; knockback and the volley's burn on players (held back on the simulator's evidence); a steadier staff special.

**Art, sound and maps**: attaching the bro to any art chat; gradients, baked shadows, glow or night in pictures; directional detail in ground swatches; enlarging the minimap or stretching the land scenes; synthesised sounds; CC BY-NC recordings; the old world track as a stopgap; a louder /roll; opening the map on the whole Wheel while in town; showing every label at once; a road on the ground beside the minimap's.

*Sources: docs/WORLD-BIBLE.md §6, STYLE-TEST.md, WORLD-MAP-PIPELINE.md, UI-DESIGN-NOTES.md, UI-BIBLE.md, LANTERN-SLATE-SPEC.md, ART-WISHLIST.md, SOUND-GAPS.md; docs/specs/light-and-shine.md, shadow-prepass.md, world-fx.md, moving-water.md, land-auras.md, building-fire.md, flag-wave.md, wheel-swimming.md, jumping.md, emote-moves.md, combat-feel-2026-10-19.md, material-hit-sounds.md, monster-noises.md, owner-recordings.md, sounds-2026-10-19.md, wheel-land-music.md, small-icons.md, bag-icons.md, owner-icons.md, armor-grade-look.md, metal-sheen.md.*

---

## Part 12. Platform, fairness, operations and the business model

### 12.1 One world on one server

| Fact | Consequence for design |
|---|---|
| A browser game (Vite + React + PixiJS WebGL) served by Cloudflare Pages at brotown.net; the server one Cloudflare Worker with Durable Objects | no app store, no install, a link is the game; iPhone Safari's memory is the ceiling |
| **One room for the whole world**, `brotown-1`, capped at **120 players**; the tick runs at ~45 Hz and stops when the room is empty | everyone online shares one BroTown, one market, one chat; the cap on simultaneous players is the room; no channels or layers; dungeons (4 players), the arena and the farm are zones inside the same room, not separate servers |
| The server is authoritative for damage, HP, loot, XP, inventory, coins, quests and every settlement; the phone's numbers are predictions | no client can mint; every rule in this document is the server's |
| Interest management: a phone hears every tick about players and monsters within 2,400 px, fight events within 2,800 px, far players only in a roster or while the world map is open; monsters with no player within ~3,200 px rest; the nearest 50 players are drawn in full | a crowd of 120 is playable on a phone; a far monster's death is not news until you return |
| Two protocol versions coexist and the server advertises its capabilities; client and server can deploy in either order | features ship behind capability flags and every system has a kill switch |

**Capacity, measured** with bots on a copy of the room: smooth (33+ ticks a second) to about 145 players; at 120, 39 ticks a second with the thread about 80% busy; the room's memory under 10 MB after GC with bots, 80 MB with 1,000 played characters (231 MB with every stash at its cap, over Cloudflare's 128 MB; fixes not built). About four fifths of the room's work at 150 players is per-phone (taking messages in, building and compressing each phone's tick); the world itself is small. The plan past 1,000 (not built) splits by **connections**, front doors doing per-phone work in front of one world, about $245 a month at 1,000 concurrent.

**The account is on Cloudflare's free plan.** Durable Objects have account-wide daily limits (100,000 requests, 13,000 GB-s awake, 100,000 rows written, reset at 00:00 UTC) and refuse work past them; a measured test showed socket messages count 20 to 1, so the account allows roughly **20–55 player-hours of play a day** (the busiest playtest so far was ~4–5% of a day). The owner has decided the free plan is enough for the review period (2026-10-21: "The games free tier will work just fine for the review period"): reviewers play 20–30 minutes each, so a day's allowance covers roughly 40–110 half-hour sessions, and the busiest playtest used about 4–5% of it. The game is tuned to write little: standing and walking write nothing, a kill or a harvest writes one row, and a test on every PR holds those lines.

### 12.2 Fairness and anti-cheat

Posture: server authority over everything of value; behavioural anti-bot evidence is **recorded, never acted on** ("flag, never act"), shown to the owner in the Test panel. Hard limits that bind: 2,400 harvests a skill an hour and 45 "perfect" claims a minute (sized above the fastest honest cycle of 1,510 ms); a harvest paid only against its own start; the move budget (500 px/s with a 3-second allowance, moves past it followed rather than refused); a reconnect judged from where the server last had you; a hit needs the weapon in the server's own slot, within the weapon's reach, at most 5 bow hits a second and 2 bolts, a special only inside a paid swipe's window; a roll only inside a paid roll's second; 300 messages then 120 a second per socket; one join per socket; 16 sockets and 20 opens a minute per address. Before these fixes a script mined obsidian 48× an honest miner and walked 20× a walk; after, honest play is unchanged and the scripts are at or under honest rates.

What a cheater can still do (the review's open items): a fresh human-looking gesture fingerprint scores nothing and a flag changes nothing (policy); cooked-or-burnt is the phone's word; free accounts are unlimited until the Turnstile check is switched on and gold moves between accounts with no fee, limit or record; the server has no map of walls or water (a script walks through them, bounded in speed, not path); eight accounts can hold all eight dungeon instances. The owner's **test mode** switches the honesty checks off for their own characters, never anything that protects other players.

### 12.3 Account security

Identity is a key, not an account (Part 3.1): server-made 8-word keys good from any device; the older self-made keys locked to the devices they were played on, with the owner's 30-minute device pass as the way in; a lost or stolen character is reset by the owner's "Give it a new key"; five wrong keys lock an id for a minute. **Origin lock**: only brotown.net, the preview host, local addresses and programs may open a game socket ("This isn't the official BroTown" on a copy site). Economy routes over HTTP need a per-session token; admin routes a bearer secret, fail closed. The Turnstile check for new characters is built and off. Chain contact is read-only (a free signature, a balance read); score attestations are fire-and-forget.

### 12.4 Live operations

- **Live flags** change the game without a deploy: `disable_*` switches (jackpot, weapon drops, dungeons, threats, event capes, verify), value flags (`xp_mult` 1–4 for a 2× weekend, `max_players` only downward, the cape drop rate), and about 109 named kill switches, one per system built since the Wheel (sprint, nomansland, farm, weapongem, oneformula, pvpbalance, wheel5x …), each un-advertising the capability at the next join and turning the server's path off.
- **The Test panel** (a long press on the top bar's place name, the admin key pasted once a device): kit and levels, life-skill and combat level levers, "Tour: jump to", farm ripe, codex and kill-roll levers, sparring clones, bot flags, test mode, player logins (device pass, forget, new key), chat reports with Kick / Freeze, the Speed test and the Sound Studio. Every button is an HTTP call; without the key the panel is inert.
- **Telemetry**: crash reports with a memory snapshot; a black-screen watchdog that rebuilds the renderer after two dark samples and reloads after four; a page iOS kills is reported by the next; a lost connection is noticed in 15 s and the harvest strike replayed; an idle logout after 2 minutes.
- **CI**: 165 zero-dependency server suites on every PR (~30 s); lint and build; a real phone playing the whole quest line against a real local worker; the memory budget (a 3× phone in town, at a fight and home, three times, each kind of memory within its line); the worker deploys on a merge to main touching the server only after the suite passes; the provenance branch timestamps every commit in Bitcoin and has GitHub sign it, the owner's proof against copies.
- **Repo safety**: deploys and the Cloudflare lab run only from main with a production environment's token; the workflow and worker config files need the owner's approval; AI sessions never deploy from a branch.

### 12.5 The business model

- **Free to play, no payments, no purchasables.** No real-money code exists anywhere; every "buy" is gold. The owner expects "barely any players (less than 20)" as the likeliest outcome but wants the cost known: about $5–6 a month on the paid plan for today's play, $30–50 at 1,000 monthly players.
- **The supporter pass** (designed, nothing built, waiting on the owner's repo lock-down steps): $2 for 30 days, paid in $2 worth of ETH on the Hemi chain into an address of the character's own from an address book signed by the owner's hardware wallet, no wallet connection or signature, the server holding no key; **no play caps** ("Dont ship any caps yet"), so the pass would unlock nothing yet beyond a Supporter mark; cosmetics are its planned perk. Two reviewers' 41-row attack table found that a broken-into server could hand out free passes but not move a cent.
- **Hemi Bros NFTs**: a free, read-only ownership check gives a verified badge and a count on the profile; nothing to buy; the worn-Bro avatar is dormant.
- **Capes**: a limited cosmetic from a contest ticket; off.

### 12.6 What the phone can hold

iPhone Safari kills a tab near 250 MB of decoded pictures; the Wheel arrives at ~176 MB. Rules every feature keeps: every animation loads behind the loading screen (the loading screen may take longer instead; a first-use hitch is a regression), except per-zone art behind a per-zone veil and the Wheel's monster looks, which load by land as you walk toward it (a monster whose look is not ready is not drawn); art is freed on leaving where it is used; music and long sounds stream; caches are capped; pictures on 256 colours or fewer are kept as one byte a pixel. The memory check on every PR holds each kind of memory to a line (art from files 156 MB, GPU textures 105, canvases 96, decoded sound 30, heap 32, buffers 24, workers 36); raising a line is said in the PR in plain words.

### 12.7 Tools that shape design decisions

A balance question gets a number before the owner decides: the **PvP fight simulator** runs the server's own combat code (it decided the one formula, the fish ladder, the lunge on players, the Easy clone; since v2.3.3315 its two fighters join without saying which Wheel they draw, so No man's land refuses every hit and every fight it runs ends unfought until its join is mended); the **load test** fills a copy of the room with bots; the **bot lab** runs scripted cheaters against the real code; the **cost audit** counts rows per player-hour; the **Cloudflare lab** answers what the sandbox cannot (parallelism, latency, the daily limits); **566 phone scenarios** play features on a phone-shaped browser against a real local server; the **UI review kit** screenshots every screen in three views with the owner's design notes for ChatGPT; the **Speed test** measures frames on the phone itself. A feature is not done without its server suite, its spec and a phone scenario.

### 12.8 Not built, put away, planned

- The server split (doors and area worlds); looks sent by interest; the room's memory with 1,000 long-time players; the paid Cloudflare plan; the supporter pass; play caps; the Turnstile keys.
- Anti-bot policy items: act on evidence (lower a flagged account's caps, hold its trades), make a new account earn the right to move value, judge hours online per device, time the gesture on the server, reject tapless cooks.
- Memory items left: purgeable canvas art (~70 MB), skill figures baked for what you wear only, Wheel objects loaded by their own size, decoded sound across an audio rebuild.
- Owner directives that stand: no single-player mode; never deploy the worker from a laptop; never re-derive level from stat sums; never use the old design document as a blueprint; never raise a memory or cost line silently.

*Sources: docs/ARCHITECTURE-HANDOFF.md, SERVER-SPLIT-PLAN.md, WORLD-ARCHITECTURE.md §11, SUPPORTER-PASS-PLAN.md, MEMORY-PLAN.md, REPO-SAFETY.md, OPERATIONS.md; docs/specs/cost-diet.md, cap-120.md, load-test.md, cloudflare-lab.md, hit-proof.md, move-budget.md, last-place.md, harvest-proof.md, anticheat-botfp.md, antibot-review.md, test-mode.md, origin-lock.md, account-check.md, one-socket.md, liveops.md, provenance.md, login-keys.md, device-lock.md, identity.md, admin.md, devtools.md, migrations.md, interest-management.md, presence-v2.md, peer-cull.md, dead-connection.md; server/src/index.js, wrangler.toml; tools/qa, tools/pvp-sim, tools/lab.*

---

## Part 13. What is not built, put away, or dormant (consolidated)

**The world past level 40.** Stretches 9–16 (levels 41–80), the camps at 60 and 80 as places, the Lv 60 passes, the keystone gates and the Dark and Light realms (80–100) exist as drawn ground only. No monsters, resources or rules past 40; the dark and light elements are in the tables with no gem and no effect. Levels 21–40 are nine recolours; the owner's word is wanted on new kinds rather than more recolours.

**Dungeons** for four of eight lands (the Goo Grotto, v2.3.3540, was the fourth); mouth pictures for three of them (the Goo Grotto's are in since v2.3.3566, and the boss's chest since v2.3.3565); coming out at the mouth directly.

**Crafting**: rungs 6–19 of the material ladders (names and multipliers only); bars and armour past black steel; woods past maple; two-gem weapons in practice; shield forging; amulet take-out; gem pictures; the Gem Works' two keeper NPCs and a gem quest.

**Town**: keepers for nine buildings; townsfolk who walk; music for four lands; ambience for five; voices for six monster kinds.

**Farm and food**: paid land (more beds); a private farm per player; friends visiting; recipes for the ten crops nothing cooks; element-resist and stamina meals; the Farmhouse and Workshop pictures.

**Pets**: phase 5 (a featured monster, bounties, eggs, a helping bite, cosmetics).

**Social**: two-player emotes, dance parties, a conga line, farm-made toys, a soapbox, a town ball, chat styles, earned titles; a word filter, timeouts and a server-side block; alliance chat, storage, territory; an arena zone and a stake board.

**PvP levers named, not pulled**: knockback and the volley's burn on players; a longer lunge cooldown against players; the player hit lane at 300 ms.

**Platform and business**: the server split; the paid Cloudflare plan; the supporter pass; play caps (none, by directive); the Turnstile check (built, off); anti-bot policy that acts on evidence.

**Put away behind switches (kept and tested)**: the daily quests and the 28-day season; the login chest; the quest road on the ground; the old lands and World View; the short Wheel; placing v2 (woods and glades); the big-town previews; ground edge pieces and blends; the boardwalks; the dedicated jump button; the one-raw-gem cut and raw gems off kills; the old three-orb staff special and single-arrow bow blast; clans; threats and bounties; the cape contest; open PvP outside No man's land; duel stakes (no UI).

**Removed on the owner's word (not "missing")**: the ability milestone ladder, the combo chain, hit-stop, random weapon drops, the Cookhouse's fish game, Diego's food and potions, the Build tab, the Assay Office, the one-handed sword at the forge, shield forging, the old synthesised sounds, the ellipse shadows, the ground quest path.

**Dormant content in the code**: 22 quests for seven absent givers; collectibles; the Dungeon Workshop's paid packs; the worn-Bro avatar; the Journey log; the "Winged" and "Insectoid" codex types.

---

## Part 14. Open questions and tensions already on record

These are not the evaluator's findings; they are the questions the owner, the specs or the measurements have already raised and left open. They are the cheapest places to add value, because the groundwork and the numbers exist.

1. **The staff's cast penalty** (+300 ms on every cast, 900 ms against the sword's 600 and the bow's 495) is named in the specs as "the owner's next decision". Magic is the swingy weapon by design; whether its cadence should stay slow is open.
2. **Top-skill sword v top-skill bow at ~90%** after the lunge was given to players; the named lever is a longer lunge cooldown against players (6 s brings it to about two thirds, at a cost against the staff).
3. **Knockback and the volley's burn on players**: measured to favour whoever keeps distance; the owner has not decided; the options named are a knockback with a catch-up built for players, or a one-tick burn for everyone.
4. **The player hit lane** (300 ms) against the monster lane (210 ms): "one more one-version step" not taken; a top-Speed bow fires every ~302 ms.
5. **XP past the top content**: by design everything fades once your skill is 5+ above the top resource (Mining 20, others 25) or the top monster (40); the owner's answer was "I'll add more content". Until levels 41–80 exist, high-skill players have nothing that pays full XP.
6. **The XP curve is a lifetime curve**: level 100 in a skill needs ~4.2 billion XP at 0.2 XP per damage point; level 20 needs ~32,000. Whether the mid-game (levels 20–40, the recoloured second stage) is paced well is unmeasured.
7. **Hardening is the only large gold sink** (H5 ≈ 2 million gold, 326 attempts on average); the rest of the economy's sinks are small (forging 20–120, the pet house 45,000 in all), and gold moves between accounts with no fee, limit or record.
8. **Diego's one shared pile** means the first seller of anything gets his best price and everyone after less; two of the farm orders a day can be filled from his own stock.
9. **No man's land takes everything carried**, tools and quest items included, by the owner's rule; the spec notes this is the harshest death in the game and that tools are bought back at 100 gold.
10. **The magic herbs' land pairing**: every crop is food since v2.3.3537 (eaten raw, half a fish of its level), but nothing reads a crop's land; the suggestion on record is one land's-status guard per magic crop.
11. **Pets as a feature**: a pet follows, vacuums loot, copies poses and wards one element; the plan's phase 5 (a helping bite, eggs, featured days) waits on the owner; the catch rate is about 1% at best by design, with no mercy rule.
12. **Cooked-or-burnt and gesture fingerprints are the phone's word**, by policy ("flag, never act"); whether to act on evidence, to make new accounts earn the right to move value, or to judge hours online per device are listed policy items.
13. **The room cap of 120** and the free Cloudflare plan's ~20–55 player-hours a day are the live capacity; the owner has decided the free plan is enough for the review period, and the split past 1,000 is planned, not built.
14. **What a rest is worth**: the Hotel opened in v2.3.3539 with a server-paid rest (full pools and +10% combat XP for 30 minutes); pools already refill at 10% a tick in town (on BroTown's safe ground too since v2.3.3569), so the XP is most of its value.
15. **The second stage's monsters are recolours**; the codex reserves Winged and Insectoid types; the owner has said new kinds are wanted over more recolours but has not chosen them.
16. **Music and ambience for four and five lands**, voices for six monster kinds, keepers for nine buildings and the three dungeon mouths' pictures are the art and sound wishlist, in the owner's order.
17. **The reviewers' half hour**: the tour was built for it (the Mayor first, six givers at once, three springs instead of five, witty dialogue); whether a reviewer reaches a land's monsters, a dungeon or No man's land in 20–30 minutes has not been timed on a real phone by someone who has never played.

