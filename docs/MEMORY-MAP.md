# The memory map: where every kind of thing lives, in what form, and its budget (v2.3.3718)

The owner, 2026-10-28:

- *"Instead of building things in pieces that each cost memory, you need to
  take a holistic approach to see how future additions can 'slot in' to a
  premade plan."*
- *"The game needs to be extremely memory efficient."*

This is that plan. Every kind of thing the game holds has ONE slot here:

- the form it is kept in;
- the module that keeps it that way;
- what one more of it costs;
- the memory check's line it counts against.

A new feature finds its slot and uses that form, so it costs what the slot
says and no more. If it fits no slot, it adds one here in the same PR, and
the owner reads it there.

`docs/MEMORY-PLAN.md` is the record of what was measured and fixed, and when.
This page is the map going forward.

## The ceiling and the ruler

- **The ceiling.** iPhone Safari kills the page at about 250 MB. That is
  everything Safari counts: the page's art and sound, its code, the graphics
  chip's share, and the browser's own overhead, which no test here can see.
- **The ruler.** The ruler is `mp-membudget`. It plays a phone (390 x 844,
  dpr 3) from BroTown to a fight at the Flame Fields and home again, three
  times. Seven lines hold it (`tools/qa/mp/memory-budget.mjs`), and it runs on
  every PR.
- **Today's readings.** Each line's highest reading on main (2026-10-28) adds
  up to about 358 MB. The seven don't peak at the same moment. Even so, that
  is far too close to the ceiling once Safari's own share is added, and a big
  battle goes past it: the owner's black screens.
- **The aim.** Bring the seven lines to about 150 MB in all, so a phone at a
  fight with a full screen of players has room to spare. Every line keeps its
  look and sound: same pixels, same sound (MEMORY-PLAN's rules).

| line | what it is | before | now, measured | aim | how (lane) |
|---|---|---|---|---|---|
| `artCache` | pictures loaded from files, decoded in the page | 102 | **66** (M2) | ~10 | **M2** (v2.3.3715, landed): a picture held once, on the chip; only those read back on the CPU keep a page copy, as colour numbers |
| `gpu` | textures on the graphics chip | 95 | **75-83** (M2) | ~55 | **M2**: colour numbers on the chip (a quarter of each picture); **M3** and its phase 2: characters from shared sheets |
| `canvases` | pictures the game draws itself | 50 | **27** (M2) | ~15 | **M3** and phase 2: a look is a palette row, not a copy of every sheet |
| `sound` | decoded sound effects | 27 | **24** (M1); ~17.5 expected (v2.3.5006, to measure) | ~10 | **M1** (v2.3.3714, landed): decoded only while needed, a capped cache, the fight's sounds pinned; v2.3.4997 and v2.3.5006: noise at 24 kHz, four slow decodes decoded ahead instead of pinned, silent tails cut (`docs/specs/sfx-cache.md`) |
| `heap` | the page's JavaScript objects | 33 | 33 | ~28 | **M4** (v2.3.3717): trim what the page keeps without needing it |
| `buffers` | raw buffers and the script's text | 20 | 21 | ~15 | **M4**: rarely opened parts of the game loaded when opened |
| `workers` | the ground builder | 30 | 28.5 | ~15 | **M4**: its caches sized to what a walk needs; v2.3.5005: each unpacked swatch squeezed 3 s after a piece last used it (~8 MB to ~2.5 standing, `?groundidle=0` off; `docs/specs/worker-code-diet.md` §1b) |
| | **all seven** | **~358** | **~282** | **~150** | |

The aims are the plan's estimates. Each lane measures its own and writes the
reading into its spec, and this table takes the measured number once the lane
lands.

**The measured column (v2.3.3761)** is each line's highest reading in
`mp-membudget`, with M1's and M2's savers on (their default): M2's from
`docs/specs/pictures-once.md` §5, M1's from `docs/specs/sfx-cache.md`. Two
cautions:

- **Part of the artCache drop is the ruler, not memory.** 21.6 MB of the old
  102 were canvases already emptied on the chip, counted at full size by a
  measuring mistake that M2 fixed. With the ruler fixed and both savers off,
  the line reads 79, so M2's real saving there is about 13 MB, plus about 13
  MB of canvases and 9 MB on the chip (the fight's averages).
- **The `gpu` line moves 2-3 MB from run to run** on this box. 75 is the
  fight's average and 83 its highest.

M4's and M3's rows are filled in when their PRs land (#1216, #1212).

## The slots

### Pictures

Every picture is held ONCE: on the graphics chip, or, only if something reads
it back on the CPU, as colour numbers in the page. Never both as full colour.

| a new... | form | module | one more costs | line |
|---|---|---|---|---|
| ground or object art in the world | colour numbers (one byte a pixel) plus one palette row; 64 colours a swatch or object (the art law). The woods' five trees too (v2.3.5248, `?treenumbers=0` the pictures: 5.6 MB less `artCache` at the memory check's fight, 1.4 MB more `buffers`, five rows of the atlas). A picture kept as numbers counts nothing in `artCache`: its numbers are `buffers`' (`cacheBytes.js`, v2.3.5248) | `paletteTex.js`, `paletteLoad.js` | w x h bytes on the chip, and w x h in the page while it is loaded from a file | `gpu`, `buffers` |
| monster | its strips as files on 256 colours or fewer; loaded as you walk in the Wheel, freed when none of its kind is near; CPU readers (hit chips, stuck arrows) read the numbers | `wheelMonsterArt.js`, `heldNumbers.js`; M2's `picnumbers` puts the chip's copy on numbers too | today 4 x w x h on the chip plus w x h in the page; after M2, w x h on the chip | `gpu`, `buffers` |
| effect strip, icon drawn in the world, townsperson's strip | a file; after M2, held once on the chip, the page's copy let go once uploaded (`onecopy`); colour numbers only where the file is already on 256 colours or fewer, never reduced to fit (v2.3.3719: the effect strips measure 21,936-106,377 colours, the townsfolk 6,677-209,759, so most stay at their own colours, held once). v2.3.5249 (card P's backlog; the owner: the effects' 256-colour twins on, a family a PR): the effects the game's tools made (`fx-made`: the fire trail, the portal's beam, the anvil, the footprints, the arrow's blast, the jet stream; not the snowball's burst, which loads in play: v2.3.5249, the gatekeeper's sitting 8) are drawn from their twins as colour numbers, sent to the chip at a byte a pixel and kept packed in the page (`p256.js`, `?fxmade=0` the pictures): 3.1 MB less `artCache` at the memory check's fight, 1.05 MB on the chip, seven rows of the atlas | M2's `onecopy` and `picnumbers`; `p256.js` | after M2, 4 x w x h bytes once (w x h where it is colour numbers) | `gpu` |
| picture the game draws on a canvas | nothing reads it back: `keepOnGpuOnly`; read but never drawn into again: `keepAsImage`; a monster strip: colour numbers | `gpuOnly.js`, `keepAsImage.js`, `heldNumbers.js` | its size once | `gpu` or `canvases` |
| UI icon (a window, a button) | a file in the page (DOM), small; freed with its window if it is big. Never kept in the asset cache as well: a picture only an `<img>` shows is warmed into the HTTP cache and let go of (v2.3.5246, the townsfolk's dialogue portraits, `npcSprites.js`, `?npcheads=0`: 2.9 MB less `artCache` at the memory check's fight; v2.3.5247, Ace's two coin strips, a CSS background, `?coinflip=0`: 2.1 MB less, and his window asks for the address the loading screen warmed) | | its decoded size while shown | outside the seven: keep each under ~50 KB decoded |
| **the skateboard (Ride)** (v2.3.3776) | three files of 32 colours (`public/sprites/ride/skateboard-{top,angled,side}.png`, cut by `tools/art/cut-skateboard.mjs`), loaded behind the loading screen (`rideFx.js` preloadRideArt) and held for the game's life; one small Sprite a rider, added when they get on and destroyed when they get off; the button wears the top view | `rideFx.js` | 62x104, 124x92 and 176x47 px: ~105 KB on the chip as RGBA, once | `gpu` |
| **the weapon feel's placeholders** (v2.3.4800) | three soft white pictures minted on a canvas once a renderer (a 32 x 32 dot, a 64 x 12 streak, a 64 x 64 ring), tinted per use, kept on the chip only (`keepOnGpuOnly`); nothing fetched. (The timing bar's sheet, `public/sprites/timingbar/weapons.png`, v2.3.4625, loads no more since v2.3.4800: the bar is gone; the owner's file stays on disk) | `rendering/systems/weaponFeelFx.js` | ~22 KB on the chip, the canvases emptied | inside the seven: the GPU's textures |
| **a portrait (a Hemi Bro)** (v2.3.3999) | the collection's trait layers as ONE palette PNG of 256 colours (`public/portrait/hemi-bros-atlas.png`, 6 KB, made by `tools/portrait/make-hemi-atlas.mjs`), loaded behind the loading screen, read as its colour numbers (`png8Decode.js`) and never drawn: the page keeps the 59 layers it needs; each portrait is made on a 192 px canvas let go at once and kept as a PNG data URL (about 3 KB), the last 24 at most | `hemiBust.js` | a new trait: 4 KB in the page; a portrait shown: 147 KB decoded while its picture is on screen | `heap` (layers), outside the seven (shown pictures) |
| **the level-up burst** (v2.3.5004) | its eight frames as colour numbers on 256 colours (`public/sprites/fx/levelup-burst-v1-f0..f7.p256.png`, made by `tools/art/levelup-numbers.mjs`), fetched behind the loading screen and held PACKED between bursts (the eight files as Blobs, outside the page's heap) with frames 0-1 open as numbers; frames 2-7 opened on the reader's worker (`stripRead.js` `readPaletteBlob`) as a burst starts and let go after it; a frame turned into colours on a small canvas as it comes up (the page's own overlay at z 70, over the HUD, so not on the chip), the canvas emptied when the burst ends; `?burstnumbers=0` the strip held decoded, as before (`docs/specs/pictures-256.md` §7a) | `rendering/levelUpBurstNumbers.js`, `levelUpBurstPreload.js` | between bursts 0.40 MB of files (Blobs) and 0.09 MB of numbers (`buffers`); the strip decoded was 6.29 MB. While a burst plays: 0.80 MB more numbers and 1.9 MB of canvas and ImageData | `buffers` (the open frames) |
| zone, dungeon, land or **the arena's area** | its art loads behind its overlay (`preloadZoneAssets`) and is freed on exit, the textures dropped, not just hidden; while you are there, the town's art is let go (the farm's way, v2.3.3705). A land of the world has no overlay of its own: its art loads as you walk toward it and goes as you walk away, never drawn before it is ready (the monsters' looks, `wheelMonsterArt.js`; since v2.3.5003 its banner strip too, held only near its land, none in BroTown, `?banners=all` all four: `zoneBannerPreload.js`, `src/game/bannerReach.js`, `docs/specs/pictures-256.md` §7) | `preloadAnimations.js`, `farmTrip.js`, `zoneBannerPreload.js` | what it loads, minus what it lets go | every line: the zone fits in what it frees |

**The palette atlas is a budget too.** Every colour-numbers picture takes one
row of one shared 256 x 256 atlas (`paletteTex.js`, `ATLAS_ROWS`). When it is
full, a new picture silently falls back to four bytes a pixel
(`makePaletteSource` returns null, and `__btPalette()`'s `rowsFull` counts
it). A feature that adds many colour-numbers pictures (looks, monsters,
effects) reads `rowsFull` on its test and keeps it at 0. If rows run short,
pictures that share colours share a row: that is a slot to add here first,
before anything else is made to fit.

### Characters: players, townsfolk and stand-ins

(v2.3.4961: the armoured figure's head sheets are a look set too, `bodyheads`:
1.42 MB once on the chip for every skin, where each skin's were a copy of
about 1.4 MB on the chip and 1.4 MB of decoded picture; look-palette.md.)

Today every look (skin, trousers, boots, shirt, armour) gets its own recoloured
copy of the sheets it wears, so memory grows with every different look on
screen: about 2.5 MB for each other player (`mp-peermem`), and a phone draws
the 50 nearest in full (the crowd cap, `crowdCap.js`).

The plan (M3, v2.3.3716, then its phase 2):

- **The sheets.** Each sheet is kept once, as drawn, shared by every look.
  Beside it is a one-byte ROLE map: which part each pixel is (skin, trousers,
  boots, tool wood, or kept as drawn). The map is decided offline
  (`tools/art/role-bake.mjs`) by the game's own classification, exactly as
  today's recolour decides it.
- **The looks.** A look is its handful of colours (`lookPalette.js`). The
  graphics chip colours each role pixel as it draws, keeping the pixel's own
  brightness: today's `_retint` arithmetic (`playerSkins.js`), done there.
- **The cost.** A character then costs its few colours and its sprites, not a
  copy of every sheet. The sheets cost once (4 bytes a pixel, plus 1 for the
  map), whoever wears them.
- **Why not a 256-colour row (v2.3.3719).** The character art is not 256-colour
  art. Measured 2026-10-28: a body sheet has about 8,000 distinct colours
  (median; 39,367 at most), clothes and armour about 1,650 (62,799 at most).
  The recolour keeps every pixel's own brightness, so a 256-entry row could
  only hold them by reducing colours. The role map is exact instead, and no
  picture's colours are reduced without the owner's yes
  (`docs/PERFORMANCE-IDEAS.md`, part 3). M3's spec, `docs/specs/look-palette.md`,
  records the design it built.
- **The owner's yes, the same evening (v2.3.3761).** After the previews: *"You
  can go ahead and reduce it. I won't notice at all from anything at 256"*.
  So phase 2 bakes each sheet's role map at 256 entries (8-bit) wherever that
  saves memory. The quantizer is part of M3's P0; each lane's oracle records
  its worst shade difference. A sheet already on 256 or fewer stays exact.

| a new... | form, once the character lane's phase covering it lands | until then |
|---|---|---|
| body pose (an animation) | its sheets, as drawn, plus their role maps from `role-bake.mjs`, loaded behind the loading screen (the preloading law) | today's bake, `preloadWorldAnimations` |
| shirt or print | its own role map, coloured by the look's colours; a print rides on the map too | `gearSheets.js`, `keepAsImage` |
| armour piece | its own sheet, once, drawn over the body's; a combat or work pose's armour (swing, bow, chop, cook, fire, the farmer's three) is a sheet of the `gear` look set (v2.3.4998, `lookSets/gear.js`, `gearLookFrame.js`, `?gearlook=0` off): colour numbers on the 8-bit atlas page, its own 255 colours within the 16-level bar, copper and iron a sprite tint, the shine drawn by the look program (`docs/specs/pictures-256.md` §8); the walking armour (stand, jog, hit, roll, mine, fish, pickup, the full set's figure) is the `gearwalk` set (v2.3.4999, `gearWalkFrame.js`, `?gearwalk=0` off), not sent to the chip (§9), and since v2.3.5000 not loaded at all: the masked bakes and the fishing grip read its pixels from the numbers (`gearNumbers.js`; §10) | the chain belt's jog sheets (RGBA, CPU only, 1 MB) |
| **the armour bake's sheets, on its worker** (v2.3.5043; `?bakeurl=0` off) | a frame of a sheet the page holds as an image goes to the masked bake's worker as its address and rectangle; the worker decodes the sheet itself and keeps at most 4 sheets and 4 MB (`maskedBakeWorker.js` `sheetOf`), the least lately used closed, every way out of a job lets its sheets go (`jobDone`), and all are let go 15 s after the last job (`sheetsIdleSoon`, after the gatekeeper's sitting 4); while a job runs it holds its sheets whole (a body sheet about 0.8 MB) where the page used to cut and send each frame | not seen by `mp-membudget` (it counts a worker's heap and buffers, not its bitmaps): `__btBakeWorker().byUrl.keptMB` and `keptMaxMB` say what the worker holds |
| weapon | the sword's swing blade and the bow's draw are sheets of the `weapons` look set (v2.3.5002, `lookSets/weapons.js`, `weaponLookFrame.js`, `?weaponlook=0` off): colour numbers, a texture a sheet, read as the game reads the strips (the swing's half-size files blown up to their frame), cut by the game's own cells, no mip chain, copper and iron a sprite tint (`weaponTint`), the steel's shine drawn by the look program; their RGBA strips are never fetched where the numbers are drawn (`docs/specs/pictures-256.md` §11) | the held weapons (`weaponSprites.js`, their soft bakes) and the projectiles, as RGBA files and canvases |
| head piece (trait) | its own sheet, once; a recoloured one through its role map | today's trait sheets |
| **the look atlas** (v2.3.4993; `?lookatlas=0` off) | the body's, the head pieces' and the tee's sheets of colour numbers laid out in three PAGES on the chip, one a form (8 bits at one or two texels a display texel, 16 bits), each sheet sent to its page as its own rectangle; a directory of where each sheet starts (8 KB). The stand-ins' and the bodies' heads stay a texture a sheet (`src/rendering/lookPalette.js`, "THE LOOK ATLAS") | 5.3 MB of pages for the 4.3 MB of sheets they hold: about 1 MB of gaps on the chip, for any batch of look pieces fitting the look program's 4 texture slots (`window.__btLookPalette().atlas`) |
| townsperson | creator ids, as a player's (the Mayor's suspenders are the shirt pattern `stripe-v:2`, `tools/qa/npc-looks.mjs`); so a townsperson costs what a player costs: once looks are colours, a few bytes | the looks bake (`npc-looks.mjs`, `npc_looks_bake.py`) |
| player on screen | a look's few colours; the crowd cap holds the count | ~2.5 MB each |
| **a standing player drawn as one picture** (v2.3.4885, stage 1; on by default since v2.3.4990, `?onepic=0` off) | a slot of ONE shared picture on the chip (`bt-onepic`, a RenderTexture nothing reads back), `ONE_PIC.SLOTS` (24) slots of 96 x 140 CSS px at the device's pixel ratio, made the first frame more than 10 calm players are drawn and given back 30 s after its last picture went (`ONE_PIC.IDLE_FREE_MS`); the figure itself is kept, not drawn (`src/rendering/peerImpostor.js`, `src/game/onePic.js`) | fixed, not per player, and only while a crowd stands: about 13 MB at 3x (2016 x 1680), about 6 MB at 2x (1920 x 840) (`window.__btOnePic().bytes`, 0 with no picture); a player alone or with a few friends holds none, so `mp-membudget`'s lines are unchanged |

### Sound

| a new... | form | module | one more costs | line |
|---|---|---|---|---|
| sound effect | `SFX_MANIFEST`; after M1, its compressed file is kept, it is decoded on first play into a capped cache, and pinned (decoded for good) only if a fight, a walk or a tap plays it quickly and often. A slow decode is no reason to pin: decode it ahead where its play is seen coming (v2.3.5006, `sfxCache.js` `AHEAD_WHEN`, `BT_AUDIO.sfxAhead`). Its file ends where its sound does: a silent tail is cut at an mp3 frame (`tools/trim_mp3_tail.mjs`, lossless) | `gameDisplay.js` BT_AUDIO; M1's `sfxCache.js` | today, its decoded size for good (a second of mono at 48 kHz is ~190 KB); after M1, a few per cent of that until played | `sound` |
| music, or any long sound | streamed by the music deck, never decoded whole | `gameDisplay.js`, the music deck | nearly nothing | none |
| a voice or loop | as a sound effect; decoded at 24 kHz where the cue already is, and any effect whose file has nothing above 12 kHz, measured from its own samples (`LOW_RATE_SFX`: the owner's 24 kHz cuts, `FILE_24K_NOISE` v2.3.4997, `BAND_12K_NOISE` v2.3.5006) | `soundFold.js` keeps a stereo file whose sides are one as one channel | | `sound` |

### Code, tables and text

| a new... | form | line |
|---|---|---|
| panel opened rarely (a tool, a page few players open) | its code in its own piece, loaded when it is first opened (the Sound Studio's way; after M4, the Test panel, the codex and others). Never a fight's code: a fight never waits for a load | `buffers` |
| big table | with the code that needs it; nothing kept that can be worked out when asked | `heap` |
| cache of anything | a cap, and a pool gives back what a spike made (the memory law) | its line |
| on-screen words (Pixi Text) | destroyed when gone, never hidden (TRAPS §192); a style derived with `.clone()` (TRAPS §254); numbers that change often as a bitmap font (the damage font: digits at 128 on three 512 pages, words at 80 on one 1024 page, 9.3 MB on the chip; v2.3.5008, damage-number-size.md) | `gpu`, `heap` |
| words in the game's script | ASCII, so the script is kept at one byte a letter (TRAPS §258) | `buffers` |

### The ground builder

The ground worker holds swatch pictures, downloaded files, calmed water and
blocks of the world. Its caches are sized to what a walk across the lands
uses (M4's `groundlean`). A new kind of ground slots into the swatches: it
is 64 colours, like every swatch, and is counted in the cache, not on top of
it. v2.3.5005: a swatch is held unpacked (1 MB) only while pieces are laid
with it; 3 s after the last, it is squeezed (~0.31 MB) and thawed by the next
piece that needs it (`?groundidle=0` off). A new cache in this worker does the
same, an entry at a time: what nothing uses is held in its smallest form.

## The order the conversion lands in

Each part is its own PR and lands **ON by default** (v2.3.3761; the owner,
2026-10-28: *"I think including the new memory change work by default would
be better. I can always revert the change if I don't like it or it doesn't
work well."*). Each part keeps its switch in the address: `?name=0` turns it
off for one phone and gives the game exactly as it was. A live switch for
every phone, from the Test panel and with no deploy, is lane D's v2.3.3755.

1. **Phase 1 (2026-10-28):**
   - M1, sound (`?sfxcache`, `?voicecap`): landed, on;
   - M2, pictures once (`?onecopy`, `?picnumbers`): landed, on;
   - M3, the characters' foundation (`?lookpalette`, the body standing and
     walking): #1212, on by default;
   - M4, the worker and the code (`?groundlean`, `?heaplean`, `?codelazy`):
     #1216, on by default.
2. **Phase 2, running since the same evening** (the owner: *"Make it so phase
   2 finishes in a few hours. By sampling etc"*): every other body pose;
   shirts and prints; armour and the body under it; head pieces; other
   players and townsfolk. `docs/specs/look-palette.md` (M3) lists each part
   and what it needs.
3. **The owner's calls, not in the plan until asked:**
   - words drawn at 2x, not 3x (~8 MB);
   - every sound at 24 kHz (~10 MB, a duller top end);
   - the screen at 2x (~15 MB, the pixel art a little softer);
   - loading animations on first use instead of behind the loading screen.
     That one conflicts with the preloading law (CLAUDE.md §7), so only the
     owner can change it.
4. **The owner's standing decisions (2026-10-28, v2.3.3719):**
   - *"I definitely don't want combat to feel slow"*: every swing, dodge, jump,
     block, special, hit taken, death, walk and run, and everything another
     player does, stays loaded behind the loading screen. None of it is ever
     loaded when first wanted.
   - Loading the other animations (fishing, mining, crafting, emotes, weapons
     not in your three slots) when first wanted is held off: *"I'll wait to
     see how the memory work goes."* Revisit after phase 2, measured.
   - The ideas for after the showing (an automatic lighter mode, the game
     counting its own memory, preparing what's coming, and more):
     `docs/PERFORMANCE-IDEAS.md`.

## How a session uses this map

1. Find your new thing's slot above, and build it in that slot's form, with
   that slot's module.
2. Run `mp-membudget` (CI runs it on every PR). If a line rises, raise that
   line in `memory-budget.mjs` in the same PR, with the MB and why in the PR
   body (CLAUDE.md §7: never silently).
3. If your thing fits no slot, add a slot here in the same PR: its form, its
   module, what one more costs, its line.
4. When a lane above lands, it updates its row here: the measured number
   replaces the aim, and "after M1/M2/M3" becomes "today".
