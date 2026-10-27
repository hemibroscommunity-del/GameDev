# A slime's blast breaks the trees near it and leaves soot (v2.3.3679)

The owner, 2026-10-27:

> It would be fun to make the slime explosions destroy any nearby props (trees).

> It would also be funny if the slime explosions left black soot explosion mark
> on the ground for a while

## What a player sees

When a blue slime goes off (its death burst), or the Goo Grotto's giant slime
splits:

- **The trees and props in the blast break.** Every object in the world whose
  ground (the footprint that stops you and stops a shot) lies within the
  blast's radius shatters into pieces of its own picture, as it does after
  enough hits, and is mended 3 minutes later as usual. Only the three nearest
  are heard breaking, so ten trees going at once is not a roar.
- **A building in reach does not fall.** It takes the blast as six hits, a
  quarter of what it can take, so it starts to smoulder where the blast met
  its wall (the building fire of v2.3.3230).
- **Soot on the ground.** A black scorch, ragged at its edge, with streaks
  thrown out from its middle and flecks of char beyond them, lies flat where
  the blast went off: 2.3 times the blast's radius across. It stays a minute
  and fades over its last 15 seconds. Up to ten lie at once; an eleventh
  takes the oldest's place.

It is the radius the worker hurt players with (110 for a blue slime; the giant
slime's splits 180, 115 and 110).

## Not a warning ring

v2.3.2226 took away a flat disc the size of the blast, at the owner's word:
"remove code drawn impact areas for slime death". The soot is the opposite on
purpose: the mess the blast left, drawn ragged and lying under every figure,
tree and building, not a circle saying where it could hurt.

## How

- `src/game/slimeBlast.js` `slimeBlastAftermath`, called by both blasts the
  worker sends (`networking/gameEvents.js`: the burst's `execute`, the split's
  `execute`).
- `src/game/wheelBreak.js` `blastWheelObjects`: the objects whose footprint is
  within the radius, nearest first (40 at most), each struck with `blast`
  hits; in the world only (a dungeon's arena has its own things).
- `src/rendering/sootMarks.js`: one picture drawn in code behind the loading
  screen (192 px, 144 KB decoded, kept as an image of itself), each mark that
  picture squashed to lie on the ground and turned so no two look alike, on the
  `groundDetails` layer. A mark appears and goes by `visible` alone, its fade
  only an alpha (TRAPS §218).
- On your screen only, as every break is: the worker sends the blast to every
  phone near it, and each breaks its own copy of the same trees.
- `?sootms=` shortens the soot's minute (the tests).

## Checked

`mp-slimeblast`, on a phone in the world: **7 of 7**.

1. On BroTown's open ground a blast leaves its soot at the blast, 2.3 radii
   across and lying flat, at full strength, and the ground there goes from
   luminance 178 to 39 on the screen.
2. Out in the Verdant Wilds, the tree it went off beside breaks, one well
   outside the radius stands, and its soot lies there too (under the ferns and
   bushes, which stand over the ground).
3. After its time the soot is gone.
4. No page errors.

Pictures: `tools/qa/mp/out/slimeblast-town-after.png`, `slimeblast-after.png`.
