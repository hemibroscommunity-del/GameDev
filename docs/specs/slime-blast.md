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

## v2.3.3747: the blast blows you back

The owner, 2026-10-28: "if you take damage from a slime explosion I want the
character to be blown back a bit (moved back)".

- **What a player sees.** A blast that hurts you throws you 90 px straight
  away from where it went off, over 0.3 s, with the wind's streaks round you.
  "A bit": between a mummy's swing (48 px) and its roar (130). The blue
  slime's death burst and the Goo Grotto's giant slime splitting both do it
  (they are the same blast, `kind: 'burst'`).
- **No shove when nothing landed**: a shield facing it (blocked), a roll
  through it, the safe ground, a blast that took no HP, or one that killed you.
- **How.** The worker decides it (telegraph.js `_telegraphHitPlayer` ->
  `_blastShove`): the shove's length is the gust's own (`_gustShove`, with the
  monster's `_gustPx` 90 for that one blow, as the roar sets its 130), the room
  granted the gust's way (monsterstatus.js `_grantShove`), so the move check
  never snaps you back. The hit's `monster_attack` carries `kb` (the shove)
  and `kbMs` (300) with no gust `st`; the phone carries it out as a blow's
  shove (elemHits.js `applyHitShove`) and draws the gust's streaks. A wind
  slime's own gust already shoves, so its blast's gust is simply the 90 px
  one, never two shoves.
- **Deploy order.** A phone from before this ignores a `kb` without a gust's
  `st` on a monster's hit: it is not shoved, and the worker's granted room
  simply goes unused. A new phone on an old worker gets no `kb`. No cap needed.
- **Kill switch**: `slimeshove: false` in the live flags: the blast hurts as
  before and shoves no one.
- **Checked**: `slime-shove` suite (16: the length and direction, north and
  east, the room granted, one outside nothing, a shield blocks it, a wind
  slime once, the boss's split, a slam shoves nothing, the switch);
  `mp-slimeshove` on a phone in the Verdant Wilds: a real blue slime killed
  beside you, its blast's hit says 90 px away from it, your place moved 90 px
  that way, and the worker agrees where you landed (0 px apart).
