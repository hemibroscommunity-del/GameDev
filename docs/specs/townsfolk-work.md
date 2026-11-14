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
| **Woodworker Bro**, west of the Woodworker's steps (keeper, quest giver) | overthinking genius: workshop goggles, wild grey afro, graph-paper tee | the mining swing at his spot, twice a loop ("chopping") | 5460: the pickup (a plank off the pile); **5461: the chop, his axe**, at both stops, facing as the lumberjack does | right | a plane or a saw on a board, for his bench |
| **Farmer Bro**, by the Feed & Seed (keeper, quest giver) | paranoid dirt hippie: bucket hat, scraggly beard, wide ("wtf") eyes | the mining swing at one stop ("hoeing") | 5460: stood at that stop (the pickup's sheet blanks his eye style: a bake of his look); **5461: on his knees in the soil, then hoeing, then watering**, a stop each. These figures take his eyes as a piece of his head, so nothing is baked | right | none needed |
| **Ace**, west of the Gambling Den's steps (his coin flip) | back-alley bookie: derby, slicked hair, felt-green tee | walks and stands | the same | walking and standing | flipping a coin, or shuffling cards |
| **Sterling**, the Bank | crypto bro running a bank: laser-eyes visor, pinstripes | the pickup at one stop (stacking his coins) | the same | right enough | counting a stack of coins, or tapping a phone |
| **Slim**, the Saloon | craft mixologist: the beard, the checked shirt, the attitude | walks and stands | the same | walking and standing | shaking a cocktail shaker |
| **Chef Blaze**, the Cookhouse | shouting TV chef: spiky blonde flat-top, white shades, flame tee | the mining swing at his spot ("his cleaver"): "hammer like an anvil" | 5460: the pickup at his counter; **5461: cooking, his pan**, at his spot | right. Lighting his cookfire (`firemaking-strip`) is a candidate for a second stop: its strip is 384 x 512 a frame and glows, so it waits for the owner | a cleaver chopping on a board |
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

## The trades' figures (v2.3.5461, card TF PR 2)

Chef Blaze cooks, Woodworker Bro chops, and Farmer Bro kneels, hoes and waters,
each in the player's own skill figure, drawn the way another player's is:
the figure, his tee over it, the farmer's hoe or can over that, his head at
the figure's crown. What is different is where the figure comes from.

- **Why not as another player's.** The player's cook, lumberjack and farmer
  are whole pre-drawn strips (`public/sprites/skills/`), recoloured for a
  look by a canvas bake. Another player in other colours costs 1 to 5 MB
  each while they work (`effectsRenderer` `PEER_FIG_EST`). A townsperson so
  drawn would be one more bake per look: the memory law's no.
- **The `skills` look set.** Each figure is kept ONCE as colour numbers
  (`src/rendering/lookSets/skills.js`, baked offline by
  `node tools/art/role-bake.mjs --set skills` into
  `public/sprites/look/skills/`), as the sword's and the bow's stand-ins are.
  His colours are a row of the look palette, as his walking body's are. The
  bake runs the game's own recolour, argument for argument as another
  player's figure is baked (no drawings, no patterns), and checks itself
  against it: every pixel explained, 256 colours a sheet. Seven sheets: the
  cook (24 frames), the lumberjack (his 12 played frames), the farmer's
  three moves (8 each) and his hoe and can (8 each). No new drawing.
- **The cook's colours (decided for the owner while away).** His strip has
  72,439 colours (the pan, the food, his shading). Cut to 256 his worst
  colour moves 22 levels against the bar of 16 every other sheet keeps (a
  mean of 4.3 in the bake's self-check), and at 16 bits he is over 65,535
  entries, so 256 colours is his only form. The planning session's answer
  (A, 2026-11-14): the owner's rule is 256 colours (*"I won't notice at all
  from anything at 256"*) and Chef Blaze cooking is the owner's own
  request, so his sheet has a bar of its own, 23, written with its reason
  in the set module (`bars`), recorded in its manifest and reproduced by a
  re-bake or `role-bake.mjs --check`. `townsfolk-walk.test` §6e fails any
  sheet whose bar is raised without a written reason. His strip beside its
  256-colour copy: `docs/specs/townsfolk-work/cook-256-frames.png`, the pan
  close up `cook-256-pan.png`. `?folkskills=0` takes him back to the
  pickup.
- **His tee** is the `gear` set's strip for the pose (`gearLookFrame.js`,
  loaded already for the player's own skills), in his tee's colour without
  its print, as at any work. The cook's is pinned to frame 22, as another
  player's is (the 24 tee frames are 24 different garments: the owner's
  "flashing shirt").
- **His head** is the shared pieces every player wears, placed at the
  figure's crown (`entityRenderer` `placeSkillTraitsFor`): the cook's and the
  lumberjack's crowns from `crowns.json`, the farmer's from his strips' own
  table (`farmAnims.js`). Farmer Bro's lowered bucket hat is kept.
- **His place and size.** His boots on his spot (the figure's own boot
  point), at his size against a player's, at the figure's own height
  against a player's, as the player's figures are matched.
- **Loading.** The set loads behind the loading screen with the other look
  sets; the crowns are read behind the world's (`prewarmFolkBodies` waits).
  Nothing loads, and nothing is baked, in play. A part not in (no look
  palette, the set missing, no crowns, the tee's strip missing): he stands
  where he would have worked.
- **Memory, measured** (`mp-membudget`, this box, the same build with the
  set off by `?folkwork=0` and on): the graphics chip's highest 73.2 MB off
  against 76.4 on (+3.2 MB: the set's 2.7 MB of numbers and its pages);
  the page's objects 35.8 / 35.5, its buffers 22.8 / 22.5, art from files
  38.1 / 38.1; the canvases 14.4 / 15.4, the second after two reconnects in
  that run (the change makes no canvas). Every line passes; none is raised.
  What would bring it down, the owner's call: the cook at every other
  frame (12 of 24, about 0.5 MB less, a choppier stir); or the set loaded
  only on a first sight of a working townsperson (off the loading screen:
  the preloading law's exception, the owner's to make). And a saving
  beyond this card: another player's cook, chop or farm figure in other
  colours is a 1 to 5 MB canvas bake today (`PEER_FIG_EST`); drawn from
  this set's numbers it would be a palette row (card P's to take).
- **A computer** (Windows, a Mac) draws the townsfolk's photographs,
  standing, as before: no look palette, so none of this is loaded there.
- **The switches.** `?folkskills=0` (its row in the switch table,
  `tools/guards/lib/switches.mjs`) puts the three back in PR 1's poses
  (Chef Blaze and Woodworker Bro the pickup, Farmer Bro standing) and loads
  none of the set; a figure with a part not in falls back the same way.
  `?folkwork=0` stands them at every stop, these included, and loads none
  of the set either.
- **Checked by** `townsfolk-walk.test` §2g, §2i-2k and §6 (the copies of
  `effectsRenderer`'s numbers, the set on disk, the switch, the wiring) and
  `mp-folkwork` (on a phone upright and sideways, and a computer: each trade
  drawn from the numbers, his tee on, the farmer's tools, no frame stood;
  `?folkwork=0` loads none). Its pictures: `tools/qa/mp/out/folkwork-*.png`.

Not drawn yet, for the owner: the blacksmith's swing over the forge's anvil
(the player's smithing draws `fx/smith-anvil` over the rock under the
swing's boots: an effect of `effectsRenderer`, another card's file);
Beastmaster Bro crouching by his Snowling; the cook lighting his fire.

## Memory and loading (PR 1, v2.3.5460)

Nothing new loads and nothing new is drawn: the pickup is a body sheet every
phone already holds in colour numbers (`lookSets/body.js` `POSE_DIRS`), with
the stand and the jog. The bakes behind the loading screen
(`entityRenderer` `prewarmFolkBodies`, from `folkBakeJobs`) are unchanged:
the looks the numbers refuse are the blacksmith (his striped trousers),
Farmer Bro, Beastmaster Bro and Old Man Reel (their eye styles), and none of
the three who took the pickup is one of them (§2k). A computer draws the
townsfolk's photographs, standing at their spots, as before.
