# Another player's look, baked off the page (v2.3.4930)

The crowd tour (`docs/specs/held-sweep.md`, "The crowd tour") found the page
held longest by one job: **a body sheet recoloured on the page for one look**
(`body-bake` in `tools/qa/mp/held-budget.mjs`):

- a player with a tattoo, a trouser print or an eye style: each pose and
  facing they show for the first time, 114 to 720 ms a sheet, a dozen in
  their first 20 s beside you (station a-ink);
- any player of a look not yet seen who fishes in a shirt or armour: the
  32-frame fish sheet, 92 to 198 ms (b-fish);
- an armoured player: the head sheet their knight's figure shows
  (`<pose>-<dir>-head`), 28 to 164 ms a sheet as they circle you (c-armour).

The look palette (`docs/specs/look-palette.md`) draws most looks from shared
colour numbers with no bake at all, but not these: a drawing's ink is shaded
by the body under it and made more opaque where it would vanish on that skin
(`playerDecal.js` `INK_TUNE`), and an eye style's erase takes the colour of the
face round each eye. Both are in the look's own colours, so a row of colours
over shared numbers cannot carry them.

## What it does now

The bake is the same bake, run on **another core**:

- `src/rendering/bodyRecolor.js`: the recolour (`recolorBodyToCanvas` and every
  rule it uses), moved out of `playerSkins.js` **verbatim**, so it imports
  nothing that needs a page. With it, one function for each sheet's steps,
  used by the page and the worker alike: `bakeBodyFull` (the recolour, the
  drawings, the eye style, the rod's pine) and `bakeHeadFull` (a head sheet:
  the recolour, the face drawing, the halving).
- `src/rendering/trimPack.js`: `gearSheets.js packTrimmed`'s steps, moved
  verbatim (packTrimmed calls it and adds the page's witness).
- `src/rendering/spriteScale.js` now holds `stripDetachedComponents` (moved
  from `playerSprites.js`, which re-exports it).
- `src/rendering/bodyBakeWorker.js`: loads the sheet's file (the one the page
  would load: the `.webp` twin first, `webpImage.js spriteUrls`), runs the
  steps above, packs the frames, and hands back a PNG of the packed sheet and
  its cells. Its canvases are CPU `OffscreenCanvas`es (`workerCanvas.js`).
- `src/rendering/bodyBake.js`: the page's side. The image is decoded off the
  page's thread (`img.decode()`); the page only makes the texture
  (`playerSkins.js` `_sheetFromImage` and the head's twin). That image is what
  the page's own bake ended as anyway (`keepAsImage.js`: a packed sheet is kept
  as a PNG of itself), so what is drawn, and what survives a black screen's
  rebuild, is the same.

`buildBodySheet` and `_buildPickupHeadSheet` choose: the worker, or the page's
bake exactly as before (`_buildBodySheetPage`, `_buildPickupHeadSheetPage`).
The keys, the `'loading'` mark (the plain frame drawn meanwhile), the retries
and the later rounds are unchanged.

### When the page still bakes

- **Behind a loading screen** (`loadingGate.js worldReady`): the bakes the
  loading screen waits for (your own look, the townsfolk's) are done soonest
  on the page. Measured: baked on the worker while this box's one page also
  started the world, 53 of 62 sheets were still waiting when the loading screen
  went. In play (another player walks up), the worker.
- `?bodyworker=0` (one tab, to compare).
- An address that asks for one of the bake's old ways (`?garmentspecks=0`,
  `?pickwood=0`, `?toolsolid=0`, `?bakeread=0`): those switches are read where
  there is a window, and the worker has none.
- A QA probe that reads the page's bake (`__btGridProbe`, `__btInkProbe`,
  `__btTrimVerify`).
- A job the worker could not do: no worker, any error, or no answer in 20 s
  (`WORKER_MS`). A file that did not load goes on to the page's own second try
  after its backoff, as a failed first download always did.

## How it was proven

`mp-bodyworker` (`node tools/qa/mp/run.mjs bodyworker`), on a phone in the
Wheel's BroTown:

- **The same picture.** Sampled per CLAUDE.md §6, one sheet a pose family
  (stand, jog, the jog-northeast clean-up, hit, roll, mine, fish, pickup) in
  three looks (tattoos on the chest, face, arms, back and the back of the head,
  drawn and patterned trousers, patterned boots, an eye colour, an eye style
  that erases, mirrored and not; and the plain look), and the five head-sheet
  families (jog east and south, hit, mine, pickup) in the same three: the
  page's bake against the worker's, **39 sheets, every byte the same**, the
  same size and the same packed cells.
- **Off the page in play.** Behind the loading screen the page bakes (as
  before); a drawing changed in the world bakes its sheets again on the
  worker, none fails, and the page's part of each (the texture made from the
  decoded image) is 0.1 to 0.9 ms.

The crowd tour, before and after: see the PR and `held-budget.mjs`'s
`body-bake` line.

## What it costs

- The worker: one module worker, about 35 KB of script, started at the first
  bake in play. Its canvases are let go of after each job.
- Memory on the chip: unchanged (the same sheets, the same sizes; a look baked
  is kept as before).
- A sheet arrives later than a page bake did on this box (the worker shares
  four cores with the page and its software graphics chip), so the plain frame
  shows a little longer the first time a drawn player strikes a new pose: the
  same plain frame the page's bake always showed while it loaded.

## Not here (next)

- The stand-ins of a peer with drawings (their sword, bow and block bodies:
  `effectsRenderer.js` `_remoteBodyFramesFor` and its neighbours) are still
  recoloured on the page, inside the frame, when they first swing (the crowd
  tour: up to 122 ms in a-ink).
- The look palette for the fish in a shirt and the head sheets (a memory
  saving, not a hold: those bakes are off the page now).
