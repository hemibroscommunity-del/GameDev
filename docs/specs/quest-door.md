# One door for every change to a quest's state (v2.3.5284)

`server/src/queststate.js`; held by `server/test/quest-door.test.mjs`.
Grand plan step 4.3, card R PR 5. Card K's quest hand-in claim (step 4.2)
waits for it.

## Why

A character's quests are three maps and two lists on the server:

| Field | What it holds |
|---|---|
| `_quests` | each quest's STATE: `available` (opened for you), `active` (accepted), `turnedIn` (handed in) |
| `_questKills` | each quest's PROGRESS (the track; the worker is its one writer since `caps.questTrack`, v2.3.1120), 0 to 99999 |
| `_questFlags` | the flags an objective of type `flag` reads; written only at the join |
| `_questGrantOverflow` | in memory only: a quest's armour that did not fit, announced at the hand-in |
| `_questWeaponUnfit` | in memory only: a quest's weapon that did not fit the bag, sent by the mail |

Before this version they were written by hand in about **thirty places across
three files** (`quests.js`, `devtools.js`, `join.js`), each making the map
when it was missing its own way. That is the shape the gold, bag, stash and
build-point doors found and fixed: a rule meant for every quest (a map with no
prototype, the progress cap, the closed list of states) has to be copied into
each place by hand, and a copy that misses it is a bug.

## The door

Seven plain functions, each call naming its **road**, a row in `QUEST_ROADS`:

| Function | What it does |
|---|---|
| `questStateSet(rec, qid, state, road)` | a quest's state made `state` (one of `QUEST_STATES`) |
| `questCountAdd(rec, qid, n, road)` | progress added, capped at `QUEST_COUNT_MAX` (99999); returns it |
| `questCountSet(rec, qid, n, road)` | progress made `n` (the owner's kit: the caller clamps) |
| `questForget(rec, qid, road)` | a quest's state and progress gone |
| `questLoad(rec, parts, road)` | the three maps as a join loads them (each the caller's own copy) |
| `questKeep(rec, list, piece, road)` | a piece kept aside on a kept list |
| `questKeptTake(rec, list, road)` | a kept list read and emptied in one: its pieces, or null |

A map is made with no prototype when it is missing (handoff rule 4). A road
the table does not have, a road of another verb, a state off the list, a kept
list the road does not name, or no quest id throws, the state untouched.

The roads: the game's own (`accept`, `turn_in`, `chain_next`, `progress`,
`grant_overflow`, `weapon_unfit`, `turn_in_clear`, `turn_in_announce`,
`unfit_drain`, `join_stored`, `join_new`) and the owner's kit behind the admin
key (`dev_finish_all`, `dev_count`, `dev_tour_done`, `dev_tour_reset`,
`dev_tour_open`, `dev_kit_weapons`, `dev_kit_armor_clear`, `dev_kit_armor`).
A new way to change quest state is a row there and one call that names it.

## Nothing a player sees changes

Every place does what it did. The only differences are in what is left
behind when a request is REFUSED, never in what a player gets:

- an accept refused (`_questBarred`) no longer leaves an empty `_quests` map
  behind it (the map is made when a state is written);
- a hand-in with no `_quests` map at all is refused as "nothing active", as
  it always was, without making the map first;
- the hand-in's armour list is taken (read and emptied) in one step before
  the announcement, where it was read, announced, then emptied: the same
  list is announced and the same `null` is left.

## What the test holds

1. **The door**: a state from the closed list, progress capped, a quest
   forgotten, the maps loaded, a piece kept and the list taken whole; each map
   made with no prototype; a wrong road, verb, state or list throws, the state
   untouched.
2. **One door**: nothing in `server/src` but `queststate.js` writes the five
   fields, by their names or through a name that holds one (an alias);
   eighteen planted shapes (a set, a delete, a push, an alias; since
   v2.3.5291, the sitting 20 review: `||=`, `??=`, `&&=`, `+=` on a key, and
   `Object.assign` on the map by any receiver or an alias) each found.
3. **One row, one place**: every call names a road the table has, with its
   verb, from its row's file; every road has exactly one caller; none uncalled.
4. **The game**: on a GameRoom, a quest accepted, its signal counted through
   `_creditQuestObjective`, handed in, and the chain's next step opened.

Break proofs, tried by hand (the test's header): `ps._quests[questId] =
'active';` put back in `quests.js` fails §2; the cap made the plain sum fails
§1; a second `questStateSet(..., 'turn_in')` in `devtools.js` fails §3.

## Found on the way

- The join loads the stored maps as plain copies (`{ ...stored._quests }`),
  with a prototype, as it always did. The door does not change that (step 1
  changes nothing a player sees); every quest id written is a key of the
  server's own reward table (`hasOwnProperty` on `QUEST_REWARDS`) or the
  owner's kit's, so no client-supplied id reaches a plain map's write. Making
  the join's copies prototype-free is a later step.

## Kill switch

None: the door changes no behaviour. A later step that does adds its switch.
