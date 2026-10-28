# A monster hidden behind a thing is seen as its silhouette (v2.3.3707)

The owner: *"have a monster shadows silhouette appear behind props if they're
hiding behind them."*

## What it looks like

A monster that walks behind a building, a tree or a rock is drawn under it, as
before: the depth pass draws whatever stands further north first
(`src/rendering/depthSort.js`). A goblin behind the Town Hall's porch, or a
snowman behind a pine, could be hidden completely.

Now, wherever the thing covers it, the monster's own frame is drawn over the
thing as a dark see-through shape: near black (`0x0b0d14`) at half strength.
It moves and animates with the monster. The part of the monster that is not
covered is drawn as it always was, so a monster half out from behind a wall
shows its free half in colour and its hidden half as the dark shape.

Pictures from the test (tools/qa/mp/out/): `silhouette-behind-off.png` (the
slime hidden on the Town Hall's steps, the silhouettes off),
`silhouette-behind-on.png` (its shape on the steps), `silhouette-half.png`
(half out past the building's corner).

## How it works

`src/rendering/monsterSilhouette.js`, called once a frame by
`pixiRenderer.js` after everything has moved and before the depth pass, in the
world only (where the Wheel's objects are):

- **Which monster, which thing.** Every monster drawn this frame, nearest you
  first, is tested against the things drawn near the view: the Wheel's objects
  (`wheelObjects.js forEachDrawn`) and the resources' trees and rocks (their
  `_pixiSprite`). A thing hides a monster when its foot is south of the
  monster's (so it is drawn after it) and its picture's box covers at least
  about a third of the monster's box (`COVER_MIN` 0.35): one less covered is
  seen well enough as it is. The thing that covers the most wins.
- **Drawn on the thing.** The silhouette is a Container that RIDES on the
  thing (depthSort's `_ridesOn`, as a building's fire and the lands' specks
  do): in the thing's layer, a quarter step after it. So it is over the thing
  and under anything standing in front of the thing, the player included.
- **Only where the thing is.** Inside it, the monster's sprite again (its
  texture and its transform this frame) is drawn through a STENCIL mask made
  of a copy of the thing's own picture. The copy is drawn into the stencil
  only, by a program that throws away every texel less than half there
  (`hairClip.js`: `_btClipAlpha` routes the copy to `ALPHA_CLIP_BATCHER`, or to
  `PAL_CLIP_BATCHER` in `paletteTex.js` when the thing's picture is kept as
  colour numbers). The dark shape therefore shows only where the thing's
  picture is opaque, which is exactly where the monster is hidden.
- **Nothing new loaded.** Both sprites draw textures already on the graphics
  chip; no texture, canvas or filter is made. A stencil mask is drawn in the
  frame's own pass (never a filter: TRAPS §221). Each silhouette costs three
  small draws.
- **Bounded.** At most 4 at once (`MAX`), the monsters nearest you. Each
  costs the frame a batch and a switch of drawing program (its mask's own;
  mp-onebatch's fight, among the Flame Fields' rocks, counted 8 more of each
  with 8 at once, which took the one-program draw's switches from 8 to 16), so
  4. One not wanted for 1.5 s (`KEEP_MS`) is destroyed, as is one whose thing
  is gone (a page freed, a building broken), and all of them on a zone change.
  So nothing piles up (CLAUDE.md, "Memory is budgeted").
- **No garbage a frame.** The candidates and things are kept in reused records.
  The probe's list is filled only on QA pages (`__btProbe`).
- **Built behind the loading screen.** `warmSilhouettes` draws both stencil
  programs once, nearly see-through, so the first silhouette compiles nothing
  mid-fight.
- **Cast no shadow.** The shadow system lists its casters by name
  (`lightfx/casters.js`), and the silhouettes are not among them.

## Switches

- `?nosilhouette` is the game as it was.
- `window.__btSilhouettes()` is the probe: what the last frame drew, each one
  held (its layer, and whether it is drawn after its thing), and the counts.
  `.set(on)` switches them live; `.monster(id)` says where a monster is drawn.
- Off where the stencil clip is not installed (`?alphaclip`, or WebGL1), as the
  hair clip is.

## Tested

`mp-silhouette` (a phone, in BroTown; a slime of the page's own put by the
Town Hall):

1. Setup: in the world, the silhouettes on, the Town Hall's picture drawn
   (551 x 548) and the slime drawn.
2. Behind the building, its feet 40 px north of the building's: one
   silhouette, of the slime, on the building (cover 0.95), riding in its layer
   (`entities`) and drawn after it.
3. And it is seen: 1,762 px of the slime's box darker with the silhouettes on
   than off, in every one of six pictures.
4. Half out past the building's right edge: darker over the building (692 px)
   and not one pixel past the edge of its picture (0).
5. In front of the building: no silhouette, and the one held let go.
6. Beside the building, behind its line but clear of its picture: no
   silhouette.
7. No page errors.

Run twice: with the Wheel's pictures as colour numbers (the default: the mask
drawn by `PAL_CLIP_BATCHER`) and with `BT_QA_QUERY=nopalette` (as plain
pictures: `ALPHA_CLIP_BATCHER`); 7/7 both ways.

Also on the same build:

- `mp-hairstencil` 13/13 (the hair clip's batcher shares the routing).
- `mp-onebatch`: with the silhouettes on, its fight (among the Flame Fields'
  rocks) counted a silhouette's mask in the draw list: 3 at once took the
  one-program draw's program switches from 6 to 12 (the three programs' 30 to
  36), and its rule "a third of the three programs' switches" holds for 3 but
  not for 4. The test weighs the one program against the three, so it now runs
  with `nosilhouette`.
- `mp-palette` fails on this box with and without the silhouettes: its
  colour-numbers phone's ground worker was told "colours" before its renderer
  was made, a race of its own, fixed in v2.3.3709 (docs/specs/ground-waits.md).
- `mp-membudget` 11/11, every line where main's is (the GPU at most 86.7 MB,
  canvases 91.7, the third trip settled).

## Not done

- Other players, the townsfolk and your pet are not shown behind things. The
  owner asked for monsters.
- A monster behind ANOTHER monster, or behind a figure, is not shown.
- The old map's props (`_propGround`) are not tested against. The world is the
  Wheel.
