# The pose door (v2.3.5216)

`server/src/poses.js` (`_poseTo`, `POSE_WAYS`); held by
`server/test/pose-door.test.mjs` and the phase table's guard
(`tools/guards/phase-table.test.mjs` §2, its `DOOR_SUITES` line, read off the
syntax tree). Card L PR 5's seventh worker door, after the trade, duel,
party, cook, harvest and dungeon doors. The pose itself is
`docs/specs/emote-moves.md` (v2.3.3392).

## What it is

- **One field.** `ps.po`: none (standing), or one of `POSE.IDS` (sit,
  sleep, flop, bounce, robot, sprinkler, zombie).
- **One writer.** `this._poseTo(ps, id, way)`. Each way in `POSE_WAYS`:
  - `hold`: the phone's `pose {id}` with a pose (`_handlePose`);
  - `stand`: the phone's `pose {id: null}`, or a pose its handler turned
    down (`_handlePose`);
  - `move`: the worker ends it on a real move (`movement.js _handleMove`,
    when `_poseEndsOn` says so: a step past `MOVE_END_PX`, a zone change, a
    speed, a raised shield, a dodge, a harvest, a death);
  - `take`: a body a second tab takes over in a fight stands up
    (`bodytake.js _bodyTakeStart`).
- **No join way.** A join makes the body afresh with no pose.
- **The door's rule**: a pose held is one of `POSE.IDS`, and never by the
  dead or the dying.
- **The handler's, not the door's**: the spacing between poses
  (`POSE.MIN_GAP_MS`, the session's `_poseAt`) and the switches (`emotes`,
  `emotemoves`). They decide whether to ask the door, not what a pose is.

## Step 1: nothing a player sees changes

The door's rule is the handler's own two checks. The handler still turns a
pose that is no pose, or a dead body's pose, into a stand-up before it asks,
so the door refuses nothing today. `emotes`, `ride`, `join-stands-up`,
`linger`, `takeover-linger` and `move-claims` pass unchanged.

## The switch

`posedoor: false` in the live flags writes any pose a caller asks, the dead's
included, as the line before the door could have. It never lets an unknown
way through. The worker's row is in card T's switch table.

## What the test fails

- a write of `.po` anywhere in `server/src` but `_poseTo`;
- a way with no caller (the phone's hold and stand go through one call, by
  its id);
- a pose that is no pose, or the dead's, getting through the door.

It plays every way through the real room, in the Wheel: a pose on the tick to
a phone near, a stand-up, a step that ends it, the takeover's start, and a
fresh join; and the handler's own checks answering first.

## The page (v2.3.5520)

`src/game/poseDoor.js` (`poseTo`, `POSE_PAGE_WAYS`, `posePhase`); held by
`server/test/pose-page-door.test.mjs` and the phase table's guard (the `pose`
row on the page). The phone's own held pose is one field, `S._pose`: none
(standing), or its record (posing): its `id`, when it began (`at`), where
(`x`, `y`, `zone`, the line `updateOwnEmote`'s stand-up reads) and its
emoji's beat (`popAt`). Two files wrote it in three places; now only `poseTo`
does, by a way of `POSE_PAGE_WAYS`:

| way | caller | to |
|---|---|---|
| `hold` | `interactions.js sendMove` (a held move; a new one replaces the old) | a record |
| `stand` | `interactions.js endOwnPose` (a step, a blow, a swim, a jump, a harvest, a death, a moment's move, a change of place), before its word to the worker | standing |
| `forget` | `rejoinSlots.js rejoinClear` (the rejoin: the worker that answered holds none, and is told nothing) | standing |

- **The rules are the callers' own checks**, so nothing a player sees
  changes: a pose held by the living only, with its id and where it began;
  a stand-up only of a pose held. `?posedoor=0` lifts them (its row is in
  card T's table).
- **Not folded**: the emoji's beat (`popAt`), a count on the record; a
  moment's move (`S._emoteMove`), which is no pose.
- **The zone's reset is `endOwnPose`** (`resetOn('zone', ...)`), and the
  rejoin's is `rejoinClear`: both ask the door. The census counts the first
  as a reset through a page door (v2.3.5218) and the second as an edge's own
  clear asking one (v2.3.5219).
- **A module of no imports**, so a node test reads its rules. The suite also
  loads `interactions.js` and `rejoinSlots.js` themselves and plays each way
  through them, the word to the worker read off the action door's transport.
