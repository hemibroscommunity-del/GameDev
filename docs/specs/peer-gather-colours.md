# Another player gathers in their own colours (v2.3.3302)

> The owner, 2026-10-17: *"Other players cooking showed wrong skin color and
> maybe other stuff too. Needs fixed."*

When another player cooked, lit a fire or chopped a tree near you, your screen
drew them in somebody else's colours. Now it draws them in theirs, and
`mp-peercolours` checks it on two screens.

| Another player is... | What your screen drew before | Now |
|---|---|---|
| cooking | **your** skin, **your** trousers and **your** boots, under their own shirt, armour and head | their skin, trousers and boots |
| lighting a fire | the same: yours | theirs |
| chopping, with no tattoos | the unpainted lumberjack: the artist's orange skin, olive trousers and grey boots | theirs |
| chopping, with tattoos | theirs (since v2.3.2855) | theirs |
| mining or fishing | theirs | unchanged |

Their shirt, armour, hair, hat, cape, build and tattoos were already theirs.
So the "other stuff" was the trousers and boots, and the woodcutter.

## Why it happened

Cooking, lighting a fire and chopping hide the walking body and draw a whole
painted figure in its place: the cook, the fire-lighter and the lumberjack
(`public/sprites/skills/*-strip.webp`). Your colours are baked onto that
painting.

- **Each phone bakes one cook and one fire-lighter, in its owner's colours.**
  Every other player's cook and fire-lighter was drawn from that same picture,
  to save memory. The code said so in a note from v2.3.1713 (the `SPEC` table
  in `effectsRenderer._updateRemoteExtraction`), and v2.3.3146 made it worse:
  your trousers and boots joined your skin in the bake.
- **Another player's lumberjack** was drawn from the unpainted art unless they
  had tattoos (only then was one baked for them, v2.3.2855).

Measured on the current game by `mp-peercolours`, with the watcher in ebony
skin, red trousers and blue boots and the other player in pale skin, teal
trousers and white boots:

| Figure | Pixels the bake recoloured, per frame | in the other player's colours | in the watcher's |
|---|---|---|---|
| Cook | ~14,300 | 0 | all |
| Fire-lighter | ~25,000-28,000 | 0 | all |
| Lumberjack | 0 (unpainted art) | 0 | 0 |

## What changed

### Each figure is baked in its wearer's colours

`effectsRenderer._peerFigure` picks the picture for each gathering player, every
frame:

1. **Your own figure, when they wear your colours.** It counts only once yours
   is made, and the lumberjack only while neither of you has tattoos on it (his
   tattoos are baked into the figure).
2. **Otherwise a figure baked for their colours.**
   - The cook and the fire-lighter come from `_peerFigFrames`. They use the
     same recipe their own phone uses: skin, trousers and boots, with the
     artist's tan for the default skin.
   - The lumberjack comes from `_peerChopFrames`, which now bakes for everyone.
     It used to bake only for players with tattoos.
   - A figure is kept per set of colours, not per player, so two players
     dressed alike share one.
3. **While theirs bakes**, their walking body stays on screen.
   - `entityRenderer` asks the same question (`standIns.js`
     `peerStandInReady`) before it hides the body. Both renderers get one
     answer in one frame, so no frame shows neither picture, and none shows
     both. `mp-peercolours` counts every frame to check this.
   - In greaves, while the legless strip is still baking, the player is drawn
     in the strip with legs under the greaves for a moment. A legless figure is
     never drawn without greaves over it.
   - While another player's greaves are still loading, the stand-in waits
     (at most 3 s) instead of baking the bare-legged figure first.

Their tattoos ride as before: the cook's and the fire-lighter's on their own
layer (`_peerStandInInk`), the lumberjack's in his bake.

### Your own figure is made only for you

Before, another player cooking or lighting a fire near you made **your** cook
or fire-lighter, because theirs was drawn from it. That cost 9 MB for the cook
(both strips) and 6.3 MB for the fire-lighter, kept for the whole visit. Now
only you make yours: when you light a campfire, stand at one, carry a log, or
start a harvest (`_standInTriggers`). The lumberjack is the exception: another
player chopping still makes yours, because every player's lumberjack is cut
from its crops.

## What it costs

The figures are kept on the graphics chip only (`_gpuOnly`). One baked figure:

| Figure | Size |
|---|---|
| Cook (either strip; he fills his frames, so nothing is cropped) | 4.5 MB |
| Fire-lighter (its glow fills the frame) | 6.3 MB |
| Lumberjack | 2.0 MB |

- **When it exists.** A figure is baked only while a player in those colours
  is gathering in view, and let go of 15 s after nobody draws it
  (`PEER_FIG_IDLE_MS`, `PEER_CHOP_IDLE_MS`).
- **One allowance for all of them, 16 MB** (`PEER_FIG_BUDGET`, checked by
  `_peerFigRoom` before every bake, counting the bakes under way). That is
  about eight lumberjacks, three cooks or two fire-lighters at once, or any
  mix. A first cut gave each kind its own count (two cooks, one fire-lighter,
  three lumberjacks: about 21 MB at most). The review found a crowd chopping
  by BroTown would leave the fourth woodcutter in their walking body while
  most of the memory sat unused, so the counts became one shared allowance.
- **When it is full.** Room is made by letting go of a figure nobody drew in
  the last second, the longest unused first, of any kind. If every figure was
  drawn this second, one more player in new colours stays in their walking
  body until one is free. Two players never take turns being rebaked.
- **Common case.** Someone in other colours cooks near you and you don't cook.
  It was 9 MB (your cook) kept for the visit. Now it is 4.5 MB, gone 15 s after
  they stop.
- **Worst case.** 16 MB, all of it let go once they stop.
- **When a bake fails.** If a strip does not load within 15 s
  (`PEER_FIG_LOAD_MS`), or a phone short of memory refuses the canvas, that
  kind is not tried again for 15 s (`PEER_FIG_RETRY_MS`). Retried every frame,
  it would fetch and bake sixty times a second. Meanwhile their walking body
  is drawn.
- **Greaves.** While another player's greaves are still loading, the cook and
  the lumberjack wait for them, at most 3 s (`PEER_GREAVES_WAIT_MS`), rather
  than bake the strip with legs first. A request that never answers then
  gets the strip with legs, as before.
- **Bake time.** Each bake runs once per set of colours, off the frame. On the
  test machine, which draws several times slower than a phone, the figure came
  0.7 to 3 s after the other player started. On the current game, the same
  test's cook came at 3.2 s.
- **The memory check.** `mp-membudget` plays alone, so its numbers do not move.

## Known limits

- **The first fire-light can show late.** Lighting a fire is one short
  animation, about half a second. For a player in colours nobody near you
  has baked yet, the figure takes a moment (1.7 s on the test machine, less
  on a phone), so you see their walking body first, then the whole light from
  its first frame. A light within 15 s of their last starts at once, as the
  figure is still held.
- **While their figure bakes, their walking body has no slung shield.** The
  walking body already takes the shield off while its owner gathers.
- **Someone who keeps changing colours makes your phone bake again.** At most
  one bake of each kind runs at a time, a failed one waits 15 s, and all of
  them stay within the 16 MB allowance, so it costs a little work, never more
  memory.
- **Follow-up, not done here:** each phone still keeps a copy of the
  unpainted lumberjack (about 4 MB on the graphics chip) that only stands in
  for your own figure until it is baked. It could be let go of.

## How it is checked

`node tools/qa/mp/run.mjs peercolours` (two screens, about 3 minutes). For each
of the cook, the fire-lighter and the lumberjack it reads every distinct frame
the watcher's renderer draws, straight off its texture. It compares each frame
with the same frame of the shipped strip, as the recipe recolours it
(`playerSkins._retint`: the target colour times the art's own brightness over
the region's reference, 149 for skin, 112 for trousers, 75 for boots). The
axe's colour key is skipped, and so are pixels too dark to tell the two outfits
apart.

| Check | With the fix | On the current game |
|---|---|---|
| The other player's own screen (the yardstick) | all their colours | all their colours |
| The cook on the watcher's screen | all theirs, none of the watcher's | all the watcher's |
| The cook in greaves | the legless strip, all theirs | the watcher's |
| The fire-lighter | all theirs | all the watcher's |
| The lumberjack | all theirs | not painted at all |
| Walking body or figure on every frame, never neither, never both | yes | yes |
| The watcher made no cook of its own for them | yes | no (made and kept) |
| In matching colours, drawn from the watcher's own figure, with no second bake | yes | no figure probe |
| Every baked figure let go 15 s after they stop | yes | no probe |
| All of them within 16 MB; a figure drawn in the last second never pushed out; a cook and a fire-lighter share the allowance | yes | no probe |

On the fixed game all 45 checks pass. Against the current game's build
(`QA_DIST`), the colour checks fail as the table above says.

The existing scenarios for these figures still pass: `mp-cookink`,
`mp-fireink`, `mp-chopink` (tattoos), `mp-cookpeer`, `mp-firepeer` (armour and
size), `mp-remoteanim` (the fire plays once, from its first frame),
`mp-gatherspot` (where the figure stands), `mp-gatherlook`, `mp-standinskin`,
`mp-gatherposes` and `mp-gpuonly`.

QA probes: `remoteSkillProbe(id).shared` (your figure or theirs) and `.legless`;
`peerFigBakes()` (figures held per kind, and `bytes`, the allowance in use);
`peerFigTry(kind, n, ageMs)` (bakes a cook or fire-lighter for a made-up skin,
to fill the allowance without a crowd) and `peerFigBaking()`;
`window.__btSetSkin`, `__btSetPants` and `__btSetShoes` (the character menu's
setters).
