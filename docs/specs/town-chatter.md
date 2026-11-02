# The townsfolk's idle chatter: less, and only in town (v2.3.3901)

The owner, 2026-11-02: "Way too much town chatter idle while exploring the world."

## Before
Each of the 21 townsfolk said a random idle line every 8-23 s (about 1.4 lines a
second town-wide), everywhere in the one `wheel` zone. The bubbles draw within
2,400 world px (`NPC_BUBBLE_REACH`), so a player out in a land read the town
talking.

## Now (`src/game/townChatter.js`, called from the NPC loop in `BroTown.jsx`)
An IDLE line (a random `npc.phrases` line) plays only when all of these hold:
- you are in BroTown: in the Wheel, inside the safe ground's circle
  (`rideGround(S)`: the centre of the Wheel the room plays and
  `ZONES.wheel.safeR`); a zone that is not the Wheel counts as all town;
- you are within `IDLE_REACH` (350 px) of that townsperson;
- no other idle line has played town-wide in the last `IDLE_GAP_MS` (20 s)
  (`S._idleChatAt`).

Each townsperson's timer then runs 30-60 s, whether or not he spoke. A
townsperson with a quest to offer or hand in keeps the old 8-23 s, so his
"I have a task for you!" and hand-in cue come as often as before.

Unchanged: the quest lines (the offer's hint, the hand-in cue, a follower's
progress line), talking, the hum when you start talking, Lil Bro's race lines,
and the townsfolk's reactions to emotes (`townsfolkReact.js`, its own 20 s gap).

Off-ramp: `?townchat=0` (the old cadence, for one tab).

## Tests
- `server/test/town-chatter.test.mjs`: the numbers, in town, the gate, 21
  townsfolk for 60 s giving at most 3 lines.
- `node tools/qa/mp/run.mjs quiettown`: beside a townsperson with every timer due
  at once, one line (not 21); 60 s standing in town, at most 4; out in a land,
  every timer due and 60 s more, none.
