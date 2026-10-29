# BroTown's new cast (v2.3.3833)

The owner asked for more townsfolk in BroTown. The draft (v2.3.3811,
`docs/specs/npc-cast-draft.md`: who, why, their looks and portraits) was
approved: *"Keep all as you have them for now (NPCs)"*. This change builds
it. Client only: the worker is not touched.

## Who stands where

Ten of BroTown's sixteen buildings had nobody at the door. Each has a keeper
now, and three locals live in town. That makes 21 townsfolk with Mayor Bro.

| Who | Where (`WHEEL_TOWNSFOLK`) | Opens (`WHEEL_KEEPERS`) | `NPC_LOOKS` row |
| --- | --- | --- | --- |
| Sterling | the Bank's door, west of the steps | the Bank | `banker` |
| Slim | the Saloon's door | the Saloon | `barkeep` |
| Chef Blaze | the Cookhouse's door | the Cookhouse | `chef` |
| Glint | the Gem Works' door | the Gem Works | `gemguru` |
| Postmaster Pete | the Post Office's door | the Post Office | `postman` |
| Deed Dave | the Land Office's door | the Land Office | `realtor` |
| Benny | the Hotel's door | the Hotel (once the halls are open, as its door) | `bellhop` |
| Guildmaster Gary | the Guild Hall's door | the Guild Hall | `guildmaster` |
| Sheriff Buck | the Sheriff's Office's door | the Sheriff's Office | `sheriff` |
| Gavel Greg | the Auction House's door | the Auction House | `auctioneer` |
| Bean | the square, east of where you arrive (Lil Bro has the west) | nothing | `streamer` |
| Old Man Reel | the town's south-west edge, past the General Store | nothing | `fisher` |
| Tourist Terry | the street below the Bank | nothing | `tourist` |

- Each keeper stands west of his steps, as Diego and Ace do, 100 px down the
  street (60 at the Post Office and the Guild Hall, whose porches reach
  further). Talking to him (a tap, E, or the right stick's tap) opens his
  building's window, exactly as the Blacksmith and the Mayor do. The door
  still opens too.
- **Old Man Reel is not at the water.** BroTown has no water of its own (the
  plan: "no pond in the town"), and a townsperson must stand on the town's
  ground. He stands at the town's rim instead, toward the sea. His lines
  allow for it ("Sea's that way. Somewhere. I'm practicing out here first.").
- Tourist Terry stands at his spot until P5's walking (v2.3.3809) lets him
  wander.
- Every spot passes test-world-core's rules: the town's ground, 24 px clear
  of any footprint, within 160 px of his own door and clear of its steps, and
  more than 200 px from any other townsperson (so a tap finds the one meant).

## What they say

Four to six lines each (five, as the eight have), in the satire pass's voice
(`docs/specs/npc-dialogue-v2.md`): a sharp stereotype, a dry joke that tells
you who is talking. Chatter only: none gives a quest yet, so none has the
one-line wisecrack before an offer. Bubbles print plain text, so a stressed
word is in capitals, never `*stars*`.

## Their pictures

- **In the world**: each is his `NPC_LOOKS` row in `tools/qa/npc-looks.mjs`,
  photographed in the game standing, facing south
  (`npc-looks.mjs --bake`, then `npc_looks_bake.py`), into
  `public/sprites/npc/<still>.webp`. They load where the eight's do:
  `npcSprites.js` `_wheelCast()` reads the names off `WHEEL_TOWNSFOLK`, behind
  the Wheel's loading screen, cropped to the figure (the preload law). When
  P5's live drawing lands it takes them over from the same rows.
- **Their dialogue portraits**: Hemi Bros busts built from the collection's
  trait art (`tools/qa/nft_portraits.py`, the draft's traits), wearing his
  shirt, beard and eyes as the world does. So the draft's "Suit" or "Yellow
  Raincoat" is drawn as his tee and its pattern, as every bust's clothes are.

## How it is checked

- `server/test/npc-cast.test.mjs`: the dialogue table (every line sayable,
  4-6 each, short, plain ASCII, none twice), chatter only, the spots and
  keepers, the looks, the pictures on disk.
- `tools/world/test-world-core.mjs`: every spot's ground and clearance, each
  keeper at his own door, the locals where this says.
- `mp-wheelfolk`: all 21 where the table puts them on a phone, their pictures
  in behind the loading screen, each drawn a man's height; a tap on Sterling
  opens the Bank, a tap on Bean answers.
- `mp-wheeldoors`: every door still opens.
