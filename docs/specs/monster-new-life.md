# A world monster's one reset for a new life (v2.3.4843)

From STATE-MACHINES.md "what is left" ("the bigger one reset for a whole
life") and the sweep's V7 (S1-1, opacity).

## The problem

A world monster dies and comes back as the same object with the same id. So
whatever it was doing in its last life (a wind-up, a ball in the air, a
swell, a stun) lives on unless the respawn wipes it. The respawn in
`index.js _tickMonsters` wiped a hand list of about 30 fields from six
systems, each added after its own incident. Nothing noticed when a new field
was missing from it: the ball across lives (v2.3.4403) was the latest one
found by hand.

## What it is now

- `server/src/monsterlife.js` holds `_monsterNewLife(m, now)`, the ONE reset.
  The respawn edge calls it, and the old list moved there with each row's
  incident.
- `MONSTER_LIFE` names every per-monster `_` field the worker writes:
  - `RESET`: the old list;
  - `NEW`: the fields it missed. These are a stun, the swing's movement
    freeze, the sticky aggro pull, the swell's radius and its
    hit-the-killer mark, the burrow's contact clock, the wander leg and the
    fire trail's last spot. None of them bit hard (each is short, or rewritten
    before it is read), but none belongs in a fresh life;
  - `KEPT`: the fields kept on purpose, each with its reason. These are a
    kit's cooldown, the spawn scale, the moves `_clearMonsterMove` already
    clears, and the dungeon's own (a dungeon monster never respawns).
- `m.life` counts the lives: absent at spawn (read as 1), and +1 at each
  respawn. It is not sent to phones. It is there so a later fix can tie
  something to one life.
- **The guard:** `server/test/monster-newlife.test.mjs` reads every write of
  an `m._` field in `server/src`. It fails on a field that is in no list, so
  the next new field is placed on purpose.
- **Kill switch:** `monsterlife: false` (the old list only, no count).

## The phone's side (v2.3.4910)

The phone's copy of a monster is the same object across its lives too, and
two edges reset it with two hand lists that had drifted apart: the worker's
tick (`wsClient.js`, a monster `alive` again) and the phone's own respawn
(`monsterCombat.js`, a zone the worker does not model). The tick's edge
cleared the death sound, the loot pile and the swell; the phone's own edge
did not.

- `src/game/monsterCarry.js` `monsterNewLife(m, MONSTER_VARIANTS)` is the
  phone's ONE reset, and `PHONE_NEW_LIFE` names each per-life field it wipes
  with the value a new life starts from. It also clears the stuck arrows,
  ends a swell (`endSwell`) and turns a mid-fight transform back (a mummy
  that died a skeleton comes back a mummy).
- Both edges call it. Where the monster is, its health and its statuses stay
  each edge's own (the worker sends them for its monsters).
- The renderer keeps its own edge (`_fxWasAlive`): the arrival it stamps is
  the one it SEES, so a respawn off screen still grows in when it comes into
  view. The re-push's carry lists (`CARRY_ALIVE`, `CARRY_DEAD`) are a
  different question (a list replaced, not a life) and stay as they are.
- **The guard:** `server/test/monster-life.test.mjs` §6: every listed field
  starts fresh, both edges call the reset, and neither clears a listed field
  by hand beside it. A new phone field that belongs to one life goes on the
  list.
- No kill switch: it is the same resets the two edges already did, in one
  place.
