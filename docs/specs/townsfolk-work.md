# Each townsperson works with his own tool (v2.3.5460, card TF)

The owner, 2026-11-14: *"make sure all NPCs do things that match their
characters. Like chef blaze should cook, not hammer like an anvil"*.

The townsfolk of the Wheel's BroTown walk and work since v2.3.4058
(`docs/specs/living-town.md`). This page is the audit: who each one is, what
he did at work, what he does now, and what would make it right. Card TF PR 1
(v2.3.5460) put every wrong tool away; PR 2 (v2.3.5461) gives the cook, the
woodworker and the farmer their own poses from the player's skill art. Where
no art fits, the last column says what new animation would make it right:
**that list is the owner's**, and no art is made in card TF.

## What was wrong

A townsperson at work had three poses, the player's own body sheets:

| Pose | What the sheet holds | Fits |
| --- | --- | --- |
| `mine`, the mining swing | a PICKAXE, drawn into the sheet, struck down on a rock painted under the boots | a miner; the blacksmith (the player's own smithing is this very swing with the forge's anvil drawn over the rock: `effectsRenderer` `_updateSmithing`) |
| `pickup` | empty hands: a crouch, a grab, back up | anyone lifting or setting down something small |
| `fish`, the cast | a fishing rod | a fisher |

So the chef's cleaver, Gavel Greg's gavel, the woodworker's axe and the
farmer's hoe were all the blacksmith's pickaxe, struck on a rock: "hammer like
an anvil".

## The rule now (v2.3.5460)

- **Nobody but the blacksmith swings the pickaxe** (and a miner, if the town
  ever has one). **Nobody but Old Man Reel casts the rod.**
- A stop whose tool was wrong takes the closest RIGHT action the three poses
  can give, or none (he stands there). Where each townsperson stands and walks
  did not change (`tools/world/test-world-core.mjs` walks the loops).
- `server/test/townsfolk-walk.test.mjs` §2j holds it: a small table, each work
  pose's tool and who may hold it. The table is the test's own, so a day
  cannot hand itself a tool: a new pose adds its row there (its tool, and
  whose it is) or the check names it. Break proof: put Chef Blaze's `mine`
  back and §2g and §2j go red.
- §2k: no job makes a new bake of a look the colour numbers refuse (the memory
  law). The blacksmith's striped trousers in the swing are the one such job,
  as before (v2.3.4400). Break proof: give Farmer Bro the pickup and §2k names
  him.

## Every townsperson

Each walks the loop in `src/game/townsfolkWalk.js` `FOLK_DAYS`; "his spot" is
where he stands (`src/data/wheelBuildingDoors.js` `WHEEL_TOWNSFOLK`). A quest
giver keeps within 30 px of it. A work pose faces south (you).

| Who, and his door | Who he is (`npcLooks.js` `why`) | At work before 5460 | Now (5460) | Right, from the art there is | New art that would make it right (the owner's list) |
| --- | --- | --- | --- | --- | --- |
| **Mayor Bro**, the Town Hall's steps (quest giver) | small-town politician: top hat, monocle, grey beard | stands, a step either side | the same | standing is right | a wave, or a speech with a raised hand |
| **Lil Bro**, the square west of where you arrive (quest giver) | iPad kid: gamer headphones, bright tee | stands, a step either side | the same | standing is right | head down over a tablet, thumbs going |
| **Beastmaster Bro**, east of the Woodworker's steps (quest giver) | survival-show host: brown hat, camo, sleepless eyes | stands, a step either side | the same | standing; the farm's kneel (`farm-kneel`) could read as crouching by his Snowling, but it is a hand in the soil (the owner's call) | crouching to feed or pet his Snowling |
| **Blacksmith Bro**, east of the forge's steps (keeper of the forge, quest giver) | gym bro: shirtless, sweatband, flat-top | the mining swing at his spot, twice a loop | the same: the blacksmith at his forge is the one who swings it | the swing with the forge's anvil drawn over the rock under his boots, as the player's smithing draws it (`fx/smith-anvil`, already on the loading screen); a PR 2 candidate | a smith's hammer, not a pickaxe, on the anvil |
| **Diego**, west of the General Store's steps (his shop, quest giver) | hustle guy: slicked hair, gold glasses, loud purple tee | the pickup (the store's shelves) | the same | right | none needed |
| **Woodworker Bro**, west of the Woodworker's steps (keeper, quest giver) | overthinking genius: workshop goggles, wild grey afro, graph-paper tee | the mining swing at his spot, twice a loop ("chopping") | the pickup at those two stops: a plank off the pile | **the chop** (`chop-strip`, the look gear's `*-chop-west`, the axe gesture): card TF PR 2. Its sheet faces WEST only, so he chops facing west | a plane or a saw on a board, for his bench |
| **Farmer Bro**, by the Feed & Seed (keeper, quest giver) | paranoid dirt hippie: bucket hat, scraggly beard, wide ("wtf") eyes | the mining swing at one stop ("hoeing") | stands at that stop. Not the pickup: the pickup's sheet blanks his eye style and the swing's does not (`src/rendering/eyeBlankMask.json`), so the pickup would bake a copy of the sheet for his look behind the loading screen, about 0.4 MB, new memory | **the hoe, the can and the kneel** (`farm-hoe`, `farm-water`, `farm-kneel`, the look gear's `*-farmhoe-`, `-farmwater-`, `-farmkneel-`), a mix across his stops: card TF PR 2. His eyes are PR 2's question too: each farm sheet must draw his look from the numbers, or he stands | none needed once PR 2 lands |
| **Ace**, west of the Gambling Den's steps (his coin flip) | back-alley bookie: derby, slicked hair, felt-green tee | walks and stands | the same | walking and standing | flipping a coin, or shuffling cards |
| **Sterling**, the Bank | crypto bro running a bank: laser-eyes visor, pinstripes | the pickup at one stop (stacking his coins) | the same | right enough | counting a stack of coins, or tapping a phone |
| **Slim**, the Saloon | craft mixologist: the beard, the checked shirt, the attitude | walks and stands | the same | walking and standing | shaking a cocktail shaker |
| **Chef Blaze**, the Cookhouse | shouting TV chef: spiky blonde flat-top, white shades, flame tee | the mining swing at his spot ("his cleaver"): "hammer like an anvil" | the pickup at his spot: at his counter | **cooking** (`cook-strip`, the pan gesture, the look gear's `*-cook-south`): card TF PR 2. Also lighting his cookfire (`firemaking-strip`, the look gear's `*-fire-south`) at a second stop | a cleaver chopping on a board |
| **Glint**, the Gem Works | crystal-healing influencer: long hair, a halo, polka purple | the pickup at one stop (a gem held up) | the same | right enough | holding a crystal up to the light |
| **Postmaster Pete**, the Post Office | the slowest clerk alive: postal cap, grey beard | the pickup at his spot (a parcel) | the same | right | a stamp coming down on a letter |
| **Deed Dave**, the Land Office | swamp-selling realtor: a little hat, a loud teal shirt | the pickup at one stop (planting a SOLD sign) | the same | right enough | a SOLD sign pushed into the ground |
| **Benny**, the Hotel | upselling bellhop: the fez, a red windowpane jacket | the pickup at one stop (luggage) | the same | right | carrying a suitcase as he walks |
| **Guildmaster Gary**, the Guild Hall | raid leader who takes it too seriously: the headband | walks and stands | the same | walking and standing | a raised fist, rallying |
| **Sheriff Buck**, the Sheriff's Office | mall cop with a bought badge: black cowboy hat, aviators | walks his beat | the same | right: walking is his job | none needed (perhaps a tip of the hat) |
| **Gavel Greg**, the Auction House | auctioneer who never stops: a crown, a gold-striped tee | the mining swing at his spot ("the gavel": a pickaxe) | the pickup at his spot: holding up a lot | the pickup until there is a gavel | **a gavel's bang** on a block |
| **Old Man Reel**, the town's south-west rim, by the river | fisherman whose fish grow every telling: beanie, white beard, a slicker | the cast at his spot | the same | right | none needed |
| **Bean**, the square east of where you arrive | kid streamer with no viewers: cat ears, pink everything | walks and stands | the same | walking and standing | a phone held out, filming himself |
| **Tourist Terry**, the square below the Town Hall's steps | lost tourist: a souvenir sombrero, a monocle, orange shorts | walks and stands | the same | walking and standing | taking a photo, or turning a map round |

## What PR 2 adds (v2.3.5461), and its questions

From the player's own skill art, the way a player is drawn cooking, chopping
and farming:

- Chef Blaze: the cook (the pan); perhaps the fire at a second stop.
- Woodworker Bro: the chop (the axe), facing west.
- Farmer Bro: the hoe, the can and the kneel, a mix across his stops.
- Candidates the audit found: the forge's anvil under the blacksmith's swing;
  the kneel for the Beastmaster (the owner's call).

Each is held to the laws: loaded behind the loading screen, drawn from the
look palette's colour numbers (or he stands), no bake in play, through the
ghost audit, and `?folkwork=0` stands them all still. Its own section here
says what loads, what memory it measured and what a computer shows.

## Memory and loading (PR 1)

Nothing new loads and nothing new is drawn: the pickup is a body sheet every
phone already holds in colour numbers (`lookSets/body.js` `POSE_DIRS`), with
the stand and the jog. The bakes behind the loading screen
(`entityRenderer` `prewarmFolkBodies`, from `folkBakeJobs`) are unchanged:
the looks the numbers refuse are the blacksmith (his striped trousers),
Farmer Bro, Beastmaster Bro and Old Man Reel (their eye styles), and none of
the three who took the pickup is one of them (§2k). A computer draws the
townsfolk's photographs, standing at their spots, as before.
