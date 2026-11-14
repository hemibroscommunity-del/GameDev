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
- A job the worker could not do: no worker, or any error; or a worker that
  answered nothing for 20 s while it had work (`WORKER_MS`: let go of, its
  jobs the page's; v2.3.5040: 20 s the page was there to see, and started
  again when the page next comes back: "The worker's restart" below). A job
  has no time limit of its own: the first tour with
  one worker and a limit a job sent b-fish's jobs, queued behind a-ink's, back
  to the page (344 ms holds). Two workers where the device has the cores. A file that did not load goes on to the page's own second try
  after its backoff, as a failed first download always did.
- **v2.3.5013: one job at a time, and a beat.** The crowd tour's h-eight still
  held the page 208 to 288 ms, 7 times in 20 s, after eight armoured players
  had cast (c-armour8): their 32-frame fish sheets, baked on the page because
  the watch had let BOTH workers go (`__btBodyWorker()`: stalled 2, dead). They
  were not stuck. Each job ran as its own async run, so the four fish sheets
  a worker was given all loaded, then all recoloured (4 to 5.6 s each on this
  box), then all packed, and the first answer came only when nearly all were
  done: 18.7 to 24.6 s after the ask (measured, the worker's own step times).
  Now a worker runs its jobs in turn (an answer every few seconds, the first
  asked the first back, one job's canvases alive at once) and posts
  `{ beat: 1 }` between a job's steps (loaded, recoloured, packed), which the
  watch counts as an answer. `WORKER_MS` is unchanged: what it lets go of now is
  one step silent for 20 s, a worker that is truly stuck.

## How it was proven

`mp-bodyworker` (`node tools/qa/mp/run.mjs bodyworker`), on a phone in the
Wheel's BroTown:

- **The same picture.** Sampled per CLAUDE.md §6, one sheet a pose family
  (stand, jog, the jog-northeast clean-up, hit, roll, mine, fish, pickup) in
  three looks (tattoos on the chest, face, arms, back and the back of the head,
  drawn and patterned trousers, patterned boots, an eye colour, an eye style
  that erases, mirrored and not; and the plain look), and the five head-sheet
  families (jog east and south, hit, mine, pickup) in the same three: the
  page's bake against the worker's, and a peer's stand-ins (a sword body, a
  bow torso strip, the jog legs) in the same three: **48 sheets, every byte
  the same**, the same size and the same packed cells.
- **Off the page in play.** Behind the loading screen the page bakes (as
  before); a drawing changed in the world bakes its sheets again on the
  worker, none fails, and the page's part of each (the texture made from the
  decoded image) is 0.1 to 0.9 ms.

- **The crowd tour** (`BT_CS_STATIONS=a-ink,b-fish,c-armour8`), before
  (`BT_CS_QUERY=bodyworker=0`) and after:

  | station | `body-bake` before: longest hold | after | the longest hold of anything, after |
  |---|---|---|---|
  | a-ink (drawn players) | 546 ms outside the frame; 122 ms inside it (a stand-in) | none | 10.5 ms |
  | b-fish (fishing in shirts) | 179 ms | none | 7.7 ms |
  | c-armour8 (eight armoured) | 202 ms | none | 36.1 ms (the garbage collector) |
  | in all | 53 holds, 6.2 s | none | |

  What the graphics chip held after c-armour8: 130.6 MB before, 96.3 MB after.
  `held-budget.mjs` locks those three stations' `body-bake` lines at the
  general line (12 ms).
- **The memory check** (`mp-membudget`): every line within its budget.
- The role bakes (`role-bake.mjs --check`, the body, `standin`,
  `standinlegs`): the numbers on disk are a fresh bake of the moved code.

## What it costs

- The worker: one module worker, about 35 KB of script, started at the first
  bake in play. Its canvases are let go of after each job.
- Memory on the chip: unchanged (the same sheets, the same sizes; a look baked
  is kept as before).
- A sheet arrives later than a page bake did on this box (the worker shares
  four cores with the page and its software graphics chip), so the plain frame
  shows a little longer the first time a drawn player strikes a new pose: the
  same plain frame the page's bake always showed while it loaded.

### A peer's stand-ins

A peer with drawings has their sword and bow bodies, torso strips and jog legs
recoloured for them (`effectsRenderer.js` `_remoteBodyFramesFor`,
`_remoteSheetFramesFor`). That ran INSIDE the frame the first time they swung
(up to 564 ms in the first tour after the body sheets moved). In play it is
the worker's job `'standin'` now (`_peerOnWorker`): the strip is null until it
lands, which both callers already draw as they do while the image loads.

### A drawn shirt (v2.3.5014)

A player in a drawn shirt (a print, a pattern, a colour) has their shirt sheet
dressed for them (`gearSheets.js` `getShirtLookFrame` > `composeShirt`) the
first time each pose is drawn. The stand and jog are drawn from colour numbers
(`lookShirtFrame.js`); the rest (a hit, a roll, mining, fishing, the pickup)
were dressed ON THE PAGE: 121 to 192 ms each, 8 to 13 times in the crowd tour's
d-prints. In play it is the worker's job `'shirt'` now. The steps are the
page's own, moved verbatim to `gearBake.js` (`gearSheetCanvas`: the sheet
restored to its frame; `dressShirtSheet`: colour, pattern, print) so the page
and the worker run one copy, then `packTrimmedCore` where the page packs
(`TRIM_SLOTS`, `TRIM_POSES`). The shirt stays the plain tinted shirt until the
dressed one lands, as it always did while it baked. `mp-bodyworker` 5 compares
one sheet a pose family (stand, jog, jog-northeast, hit, roll, mine, fish,
pickup, the swing's upscaled and unpacked sheet) in two looks: byte for byte
the same, the same size and cells. Off as the rest is off, plus
`?shirtworker=0` for this alone. The stand-ins' shirt strips (the swing, the
bow, the cook, the chop, the farmer: `effectsRenderer.js` `_dressedShirtFrame`)
go the same way (`_dressedOnWorker`, `dressShirtStrip`).

**The line is kept on the page (v2.3.5014).** Ten players in ten drawings and
eight drawings kept (`MAX_ART_KEYS`): a sheet still waiting for the worker was
let go of and asked for again as its player came back on screen, 40 sheets
asked 230 times in 25 s, every ask a job posted. Now `bodyBake.js` hands each
worker one job at a time and the rest wait in a line on the page; a job whose
caller says how to tell it is still wanted (`wanted`) and is not, when its
turn comes, is dropped unbaked (`{ dropped }`), and a shirt sheet asked for
again waits for its job already on its way. d-prints: 60 asks, 8 dropped.

**What it costs.** The page holds nothing; the dressed shirt arrives later.
On this box a worker dresses a sheet in 0.8 to 1.5 s when it is quiet (the
page did it in 0.2 to 0.5 s, holding the page), and about 3 s a sheet with ten
players and the page drawing in software beside it: in d-prints' 25 s, 6 of
the 60 were dressed and the rest drew the plain tinted shirt meanwhile, as a
shirt always did while it baked. A phone has two more cores and a graphics
chip of its own.

## The worker's restart (v2.3.5040)

Found by the grand plan's review (`docs/GRAND-PLAN.md` step 3.1) and first on
card H.

**What was wrong.** The watch compared the wall's clock with a worker's last
sign (`now - slot.sign > WORKER_MS`). A phone behind its lock screen runs
nothing, and its workers sleep with the page. Back after 20 s or more with a
job waiting, the watch's first tick read every worker as silent that long and
let them all go; and a worker let go was never started again (`_dead`). From
then on every sheet was baked on the page (114 to 720 ms each, the `body-bake`
family of `held-budget.mjs`) **for the rest of the sitting**.

**What it does now** (`bodyBake.js`, the page's side only; the worker's file
is unchanged):

- **The watch counts only time the page was there.** A worker's silence is
  counted by the watch's own ticks (`slot.quiet`; a message or a beat sets it
  to 0). A tick adds the time since the last tick only while the page is
  visible, and never more than two ticks' worth (4 s). So a lock screen, a
  tab behind another, a laptop's lid, and a freeze the browser sent no
  visibility event for (an iPhone does not always send one: `mp-comeback` 5)
  add nothing or one tick. `WORKER_MS` is unchanged (20 s): one step of one
  job silent for 20 s the page was there to see.
- **A worker let go is started again once each time the page comes back**
  (`_back`: `visibilitychange` to visible, or `pageshow` out of Safari's
  parked-page cache). Each empty slot gets its one start back, and the next
  bake that needs a worker starts it, as the first was. A worker that is
  truly broken costs one start a return, never a loop. Until a return, a slot
  let go bakes on the page, as before.

`window.__btBodyWorker()` now also says `restarts` (the returns that gave a
start back).

**How it was proven**: `mp-bodyworker` 6
(`BT_BW_PARTS=restart node tools/qa/mp/run.mjs bodyworker`, about 4 minutes;
the whole test runs it last).

- 6a. With a job in a worker's hands and more in line, the page **and its
  workers** are frozen for 25 s: the browser's page process is stopped
  (`SIGSTOP`), because a thread held in a loop (`mp-tabsleep`'s way) leaves the
  worker running beside it, and it answers. Twice: hidden first, as a lock
  screen is, and with no visibility event at all.
- 6b. A worker that IS stuck (a job of a kind it does not know is never
  answered) for 25 s hidden and running, then shown; then the page's return;
  then stuck again with no return.

| | before (main at v2.3.5020) | after |
|---|---|---|
| frozen 25 s, hidden first (2 in hand, 3 in line) | 1 of 2 workers let go at the wake (the other's beat was heard first), 1 sheet left to the page | none let go, 10 of 10 sheets the worker's |
| frozen 25 s, no visibility event | the last worker let go, 5 of 5 sheets left to the page | none let go, 10 of 10 the worker's |
| after that, the page hidden and shown twice | no worker at work, every later sheet the page's | (not needed) |
| a stuck worker, the page hidden and running 25 s | (let go) | kept; let go 20 s after the page is shown |
| a stuck worker, the page there | (let go at 20 s) | let go at 20.1 and 21.0 s |
| the page's return after a let-go | nothing | started again, the next 5 sheets the worker's; twice |
| stuck again, no return | | stays gone, the page bakes |

**Its break proofs** (part 5's rule 8: the one-line change that turns it red):

- the watch counting the wall's clock again (`slot.quiet += now - _watchAt`,
  no cap): 6a red, both ways (the "before" column);
- the watch counting hidden time (`_pageShown` always true): 6b's "hidden
  and running" red, 2 of 2 let go behind the hidden tab (run once, by hand);
- no `_back`: 6b's "started again" red (the "before" column).

**What it costs, and what it does not do.**

- A stuck worker behind a hidden tab keeps its job until the page has been
  shown for 20 s. Nothing is drawn meanwhile, so nothing waits for it.
- Not a phone's own lock: an iPhone cannot be driven from here. The freeze is
  this box's Chromium stopped whole, which is what a suspended page is to its
  script (no timer, no message, the wall's clock going on).
- `stripRead.js` (the monsters' strips) has a 20 s clock of its own
  (`READ_MS`, a timer a read). It is not this fault's size and is not fixed
  here: card H's status file has it under Found.

## Not here (next)

- The look palette for the fish in a shirt (a memory saving, not a hold:
  that bake is off the page now). The head sheets are colour numbers since
  v2.3.4961 (look-palette.md, "The head sheets").
