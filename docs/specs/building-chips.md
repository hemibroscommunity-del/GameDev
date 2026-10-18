# A building shows every hit (v2.3.3466)

> The owner, 2026-10-18: "add wood chip effect when you attack buildings so you
> get instant feedback that the building is getting damaged (not just when you
> attack for a while and start to see flames)"

## What was wrong

Every hit on a Wheel object already throws pieces of what it is made of
(v2.3.2995, `wheelBreak.js` `strikeWheelObject` -> `hitMaterialFx.js`). But a
building's hit was a prop's:

* **Under half the pieces.** A prop's burst is thrown subtly on purpose
  (`b.prop`: x0.45 pieces, slower and lower), because a rock is hit far more
  often than it is news. An arrow into the saloon threw about two small
  splinters.
* **Thrown into the wall.** A shot hands a prop its heading reversed and a
  sword its own way, and the pieces flew the weapon's way: for a wall, much of
  it INTO the building. A piece north of the hit's ground line is drawn behind
  the entities (the depth split), so the building's own picture hid most of
  what little flew.
* **A shake you could not see.** A hit building shook 0.8 game px for 220 ms:
  under half a pixel on a computer, where the world is drawn about 0.57 to the
  game px, and rounded away.

So nothing showed a building was being hurt until its fire caught, at 25% of
its hits (v2.3.3230).

## The fix

* `strikeWheelObject` marks a building's burst `bld` (`isBuilding`).
* `hitMaterialFx._burst`: a building's burst is NOT damped like a prop's. It
  throws half as many pieces again as a plain hit of its material, a little
  faster and higher, and bigger ones (the sizes a crit gets).
* `wallAng`: every piece of a building's burst leaves the face that was hit,
  back toward the attacker, and always toward the camera, so it is drawn over
  the building. "Toward the attacker" is the heading itself for a shot (yours
  or another player's) and the way back for a sword.
* The material is the building's own (`data/wheelMaterials.js`): the wooden
  buildings throw splinters and sawdust (the "wood chips"), the stone and
  brick ones (the Town Hall, the forge, the Gem Works, the Sheriff's, the
  bank, the store, the auction house) chips and dust.
* `wheelObjects.js`: a hit building shakes 1.6 game px (was 0.8), about a
  CSS pixel on a computer.
* Props (barrels, crates, fences, rocks, trees) are unchanged.

## Measured (`mp-buildingchips`, a computer, 1280 x 800)

| | before | after |
|---|---|---|
| an arrow into a wooden building | about 2 splinters, mostly hidden behind it | RESULT_WOOD |
| a sword's swing at it | | RESULT_SWORD |
| an arrow into a stone building | | RESULT_STONE |
| an arrow into a barrel (a prop) | 1-4 splinters | RESULT_BARREL (unchanged) |

## Tests

* `mp-buildingchips` (new): the four rows above.
* `mp-wheelbreak`, `mp-buildingfire`: unchanged, still green.
