# The bow shoots props, buildings included (v2.3.3206)

> *"Make the bow able to shoot at any props including buildings"* -- the owner,
> 2026-10-13.

## What was wrong

The Wheel's objects already took arrows: an arrow stopped at a prop
(v2.3.2652), left chips and stayed in it (v2.3.2730), and the Wheel's buildings,
trees, barrels and benches shook, broke and were mended (v2.3.2995).
`mp-wheelbreak` proves all of that with arrows it puts in the air itself. A
player could not do the same with a bow, for two reasons.

**The bow only looses when its line is on something, and props did not
count.** Since v2.3.2473 the bow fires only while its sight line is on a
target, and the line stops at that target (`firstSightHit`, projectiles.js;
read by the fire gate in monsterCombat and by the drawn line in
effectsRenderer). The question it asked was "which monster, or which duel
opponent, is on the line". That gate is older than the objects taking hits,
and nobody went back to it. Measured on main on a phone in BroTown, holding the
attack with a bow:

| Aimed at | Arrows | The line |
|---|---|---|
| the Town Hall, boots 70 px from its front | 0 | straight through the wall |
| the Town Hall, boots 14 px from its front | 0 | straight through the wall |
| a bench level with you | 0 | straight over it |

**The arrow judged props 52 px north of your feet.** A prop's footprint is on
the ground. A player's position is the body's centre, 52 px above the boots
(`playerGroundDy`, v2.3.2748). The arrow took the shooter's position for the
ground: the drawn arrow minus the bow grip's offset, "at dist 0 exactly
P.x/P.y" (v2.3.2652). So its track along the ground ran 52 px north of your
feet:

- **Point blank**, your chest is already INSIDE a building's footprint, and a
  shot that starts inside a box flies out of it (`sweepBlockPoint`, the rule
  for a monster spawned in a rock). The arrow went through the Town Hall.
- **A level shot** at a tree trunk, a lamp post or a sign ran 52 px behind it
  and missed.

Walking (v2.3.2748), the swing (v2.3.3105), the water (v2.3.2999), the doors
and the footprints in the snow already ask the ground at the boots. The arrow
was the one left at the chest.

## What changed

**The sight sees props.** `firstSightHit` takes `ground`, your boots, and casts
the arrow's own prop test along the arrow's own ground track: `sweepBlockPoint`
from the boots, at the same heading, as far as the arrow flies. The track runs
parallel to the drawn line, so a distance along one is the same distance along
the other. The answer is whichever comes first, a monster, the duel target or
a prop. For a prop the gate's `id` is `prop:<the object's number>`:

- the gate opens on a prop, so the bow fires;
- the drawn line stops at the prop's face, where the arrow will stop;
- a monster in front of a prop is still the target;
- a monster standing INSIDE a prop's footprint is still the target. The arrow
  is let into the box to reach it (`_quarryInBox`, v2.3.2701), so the line
  is too.
- The farm's edge stops arrows but is a boundary, not a thing, so it never
  opens the gate.
- A prop past the edge of the screen does not count either. A plain arrow
  comes down 24 px short of the screen's edge (v2.3.1095), so a building off to
  the side of an upright phone is out of its reach. The sight looks only as far
  as the arrow can really fly (`ground.len`, monsterCombat `_viewEdgeDist`).
  Monsters are still counted out to the bow's full reach, as before.
- Things you walk through have no footprint: flowers, ferns, shells,
  tumbleweeds, skulls, rubble, sage, the frost bushes. They are not targets,
  and arrows fly over them as before.

A queued bow special (v2.3.2473) goes out on the first frame the line lands on
a prop too.

**Every shot the game fires carries its ground.** Each shot is stamped with
`_gdy` (`combatHelpers.shotGroundDy`, the shooter's `playerGroundDy`):

- the bow and staff shots (monsterCombat);
- the bow volley and both staff specials (playerActions);
- the retreat shot (dodge).

The arrow sim takes `_ox, _goy` (`_goy = _oy - _gdy`) off the drawn point
wherever it asks the ground:

- the prop stop;
- the far face of a box it was let into;
- the rock between it and a monster;
- the rock between it and a duel target, whose own end is now that player's
  boots.

A scenario's hand-made arrow has no `_gdy` and keeps the old meaning, so
`mp-propshots`, `mp-propfx`, `mp-wheelbreak` and `mp-hitsweep` still test the
geometry they were written for.

**A hit is shown on the prop.** Judged at the boots, an arrow flies over the
ground at the bow grip's height, 72 to 85 px. That is shoulder height. A bench
is 46 px tall and a barrel 61, so drawn where it flew, the arrow would stand in
the air above what it hit. The point a prop hit is SHOWN at is lifted the
height the shot flew, but never more than 0.7 of the prop's picture
(`combatHelpers.propHitHeight`). That point is where the arrow stays, where
the chips fly from, where a bolt's burn and crash go and where a snap breaks.

- A building, a tree or a lamp post takes the hit where the shot flew. There
  is no jump: 85 px up the Town Hall's front.
- A low thing takes it in its upper part: 36 px up a 46 px bench, the arrow
  dipping into it on its last frame.

The Wheel's footprints carry their picture's height (`h`, wheelObjects.js), as
do the old zones' props (`worldH`). The farm's footprints carry none, so a farm
prop is hit where the shot flew.

**Another player's arrows on your screen.** A peer's shot is drawn from that
player's position, so it is now judged at that player's boots too
(visualSystems.js). Without that, the same arrow would stick in different
props on the two screens. Its mark is where it was drawn flying, held to 0.7
of a low thing's picture. This replaces the fixed 26 px (`REMOTE_SHOT_H`).

**Shots fly over low things.** Asked whether a bench, a fence or a bush right
in front of you should catch your arrow, the owner said: *"I want arrows to
fly over low things"*.

- **What is low:** what you can jump. That is `JUMP_OVER` in game/jump.js:
  fences, walls, benches, barrels, crates, rocks, bushes, stumps, troughs and
  hay bales. Those are the things 70 game px tall or less as drawn. It is asked
  of a footprint by its id, the test the jump itself makes. A shot leaves the
  bow grip 72-85 px over your boots, so it clears all of them.
- **What still stops a shot:** everything else. That means buildings, trees,
  lamp posts, boulders, carts and the farm's edge.
- **A low thing still takes a shot aimed at it.** The bow is aimed at a low
  thing when nothing else is on its line within reach: no monster, no duel
  target, nothing tall (`firstSightHit`'s `low` answer). So a bench alone in
  front of you is shot, and a slime behind the same bench is shot over it.
- **The shot carries which.** `_lp` is a ground point inside that footprint
  (`shotLowAim`), and the relay to other players carries it as `lp`.
  `shotSkip(lp)` is the skip that `sweepBlockPoint` and `attackBlocked` take:
  the low footprints except the aimed one. The prop stop, the rock-between test
  and a peer's copy all take it.
- **The staff** has no sight, so its bolts ask the same question along their
  reach when they are cast (`lowAimAlong`). Its bolts are about as high as an
  arrow, and the owner's rule is about what a shot clears.
- **Every game shot** follows the rule: the bow, the bow volley, the staff's
  bolt and its special, the retreat shot (aimed at a monster, so over
  everything low), and a peer's. A peer whose client is older sends no `lp`, so
  on your screen its shots fly over every low thing.
- **A hand-made arrow** with no `_gdy` keeps the old meaning: every prop in its
  way.

**The first arrow after a walk leaves from the bow.** The arrow sim placed a
new arrow at the bow grip's absolute position minus yours. That absolute is
rewritten only while the bow pose shows (bowGripPoint's note, v2.3.2543), so
between volleys it is where you last shot. At 60 fps the 110 ms nock refreshes
it before release. At a few frames a second the nock is one frame, and the
arrow left from where you last shot: 621 px away in `mp-bowprops`'s first run.
The sim now reads the grip's offset from you (`_bowGripDX/DY`, written on the
same line), which is always the grip's place on you.

## Not changed

- **The staff** never had a gate: it fires whether or not its line is on
  anything. Its bolts are judged at the boots now too, so a bolt cast point
  blank at a building crashes on it, and they fly over low things as arrows do.
- **The worker.** Props are your screen's alone (v2.3.2995): nothing about a
  prop goes to the worker. A monster's shots at you are still blocked by
  props on the worker's own line, which is unchanged.
- **Monsters.** Hitting a monster is still judged on its drawn body. Only the
  "is there a rock between" question moved down to the boots.

## Checked by

- `mp-bowprops` (25 checks), on a phone in the Wheel's BroTown against a real
  worker, with a real bow and the attack HELD:
  - **A (control):** aimed where nothing stands in reach, the bow waits.
  - **B:** at the Town Hall from 120 px:
    - the gate reads the hall at its face (d 120);
    - the drawn line stops there;
    - arrows go in;
    - one stays in its wall 85 px up its front, the grip's height.
  - **C:** point blank, boots 14 px off its face: the gate reads the hall and
    it takes the arrows.
  - **D:** a monster in front of the hall is the target, not the wall.
  - **I:** a bench 102 px off with the hotel 151 px off behind it, on one line
    (the game's own sweeps pick the spot):
    - the gate reads the hotel;
    - the arrows fly over the bench (0 hits on it) and the hotel takes them.
  - **K:** the staff's bolts the same: over the bench, into the hotel.
  - **J:** a monster 70 px behind a bench: the gate reads the monster, and the
    arrows fly over the bench (0 hits on it) into it.
  - **E:** the same bench with nothing else on the line, level with you:
    - it is what the bow is aimed at, so the gate reads it;
    - the arrow stays 34 px up its 46 px picture;
    - its three hits break it;
    - the bow then stops, with nothing left on the line.
  - **F:** an orchard tree's trunk from the side, level with it, takes arrows.
  - **H:** the Town Hall 460 px off to the side, past the screen's edge: the
    bow does not fire.
  - **G:** no page errors.

  Against main's build, the run as it first stood (17 checks, before I, K and
  J) failed 10: no arrow at the hall, from 120 px or point blank; none at the
  bench or the tree; the line running its full 675 px through the hall. The
  controls (A, D and H) passed there too.
- Three scenarios changed with the geometry, each saying why in its own
  comments:
  - `mp-propfx`: another player's arrow is judged from that player's boots.
    It reaches the fountain later and marks it at their chest's height
    (52 px up its face; it was 26).
  - `mp-lockaim`: from the plaza spawn, the lamp post and the fountain stand on
    the ground line of four of its five headings, and they now take the
    arrows. That is cover working, so the aim test moves to a spot the game's
    own sweep says is clear.
  - `mp-jetstream`: its "nothing on the line" read finds a heading with no
    prop on it, since a prop 656 px off now stops the line.
- Rerun on this build, all passing: `mp-bowprops`, `mp-bowgate`, `mp-propfx`,
  `mp-lockaim`, `mp-aimpath`, `mp-jetstream`, `mp-bowvolley`,
  `mp-stuckarrow`, `mp-questline` (99/99).
- These fail the same checks on main's build, run back to back on this
  machine:
  - `mp-propshots`, 2: a 300 px step at a 3x frame scale, and a snowball's
    control;
  - `mp-wheelbreak`, 1: no stone thing loaded near the arrival;
  - `mp-tapstance`, `mp-tapprop`, `mp-solospecial`, 5: a tap or a gesture
    timed on a page drawing a few frames a second;
  - `mp-shotland`: a bolt's landing measured past LAND_MAX_MS.
- `docs/shots/bowprops.md`: before and after on a phone.
