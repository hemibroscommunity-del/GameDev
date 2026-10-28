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
| `sound` | decoded sound effects | 27 | **24** (M1) | ~10 | **M1** (v2.3.3714, landed): decoded only while needed, a capped cache, the fight's sounds pinned |
| `heap` | the page's JavaScript objects | 33 | 33 | ~28 | **M4** (v2.3.3717): trim what the page keeps without needing it |
| `buffers` | raw buffers and the script's text | 20 | 21 | ~15 | **M4**: rarely opened parts of the game loaded when opened |
| `workers` | the ground builder | 30 | 28.5 | ~15 | **M4**: its caches sized to what a walk needs |
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
| ground or object art in the world | colour numbers (one byte a pixel) plus one palette row; 64 colours a swatch or object (the art law) | `paletteTex.js`, `paletteLoad.js` | w x h bytes on the chip | `gpu` |
| monster | its strips as files on 256 colours or fewer; loaded as you walk in the Wheel, freed when none of its kind is near; CPU readers (hit chips, stuck arrows) read the numbers | `wheelMonsterArt.js`, `heldNumbers.js`; M2's `picnumbers` puts the chip's copy on numbers too | today 4 x w x h on the chip plus w x h in the page; after M2, w x h on the chip | `gpu`, `buffers` |
| effect strip, icon drawn in the world, townsperson's strip | a file; after M2, held once on the chip, the page's copy let go once uploaded (`onecopy`); colour numbers only where the file is already on 256 colours or fewer, never reduced to fit (v2.3.3719: the effect strips measure 21,936-106,377 colours, the townsfolk 6,677-209,759, so most stay at their own colours, held once) | M2's `onecopy` and `picnumbers` | after M2, 4 x w x h bytes once (w x h where it is colour numbers) | `gpu` |
| picture the game draws on a canvas | nothing reads it back: `keepOnGpuOnly`; read but never drawn into again: `keepAsImage`; a monster strip: colour numbers | `gpuOnly.js`, `keepAsImage.js`, `heldNumbers.js` | its size once | `gpu` or `canvases` |
| UI icon (a window, a button) | a file in the page (DOM), small; freed with its window if it is big | | its decoded size while shown | outside the seven: keep each under ~50 KB decoded |
| zone, dungeon, land or **the arena's area** | its art loads behind its overlay (`preloadZoneAssets`) and is freed on exit, the textures dropped, not just hidden; while you are there, the town's art is let go (the farm's way, v2.3.3705) | `preloadAnimations.js`, `farmTrip.js` | what it loads, minus what it lets go | every line: the zone fits in what it frees |

**The palette atlas is a budget too.** Every colour-numbers picture takes one
row of one shared 256 x 256 atlas (`paletteTex.js`, `ATLAS_ROWS`). When it is
full, a new picture silently falls back to four bytes a pixel
(`makePaletteSource` returns null, and `__btPalette()`'s `rowsFull` counts
it). A feature that adds many colour-numbers pictures (looks, monsters,
effects) reads `rowsFull` on its test and keeps it at 0. If rows run short,
pictures that share colours share a row: that is a slot to add here first,
before anything else is made to fit.

### Characters: players, townsfolk and stand-ins

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
| armour piece | its own sheet, once, drawn over the body's | today's gear sheets |
| head piece (trait) | its own sheet, once; a recoloured one through its role map | today's trait sheets |
| townsperson | creator ids, as a player's (the Mayor's suspenders are the shirt pattern `stripe-v:2`, `tools/qa/npc-looks.mjs`); so a townsperson costs what a player costs: once looks are colours, a few bytes | the looks bake (`npc-looks.mjs`, `npc_looks_bake.py`) |
| player on screen | a look's few colours; the crowd cap holds the count | ~2.5 MB each |

### Sound

| a new... | form | module | one more costs | line |
|---|---|---|---|---|
| sound effect | `SFX_MANIFEST`; after M1, its compressed file is kept, it is decoded on first play into a capped cache, and pinned (decoded for good) only if a fight, a walk or a tap plays it quickly and often | `gameDisplay.js` BT_AUDIO; M1's `sfxCache.js` | today, its decoded size for good (a second of mono at 48 kHz is ~190 KB); after M1, a few per cent of that until played | `sound` |
| music, or any long sound | streamed by the music deck, never decoded whole | `gameDisplay.js`, the music deck | nearly nothing | none |
| a voice or loop | as a sound effect; decoded at 24 kHz where the cue already is | `soundFold.js` keeps a stereo file whose sides are one as one channel | | `sound` |

### Code, tables and text

| a new... | form | line |
|---|---|---|
| panel opened rarely (a tool, a page few players open) | its code in its own piece, loaded when it is first opened (the Sound Studio's way; after M4, the Test panel, the codex and others). Never a fight's code: a fight never waits for a load | `buffers` |
| big table | with the code that needs it; nothing kept that can be worked out when asked | `heap` |
| cache of anything | a cap, and a pool gives back what a spike made (the memory law) | its line |
| on-screen words (Pixi Text) | destroyed when gone, never hidden (TRAPS §192); a style derived with `.clone()` (TRAPS §254); numbers that change often as a bitmap font | `gpu`, `heap` |
| words in the game's script | ASCII, so the script is kept at one byte a letter (TRAPS §258) | `buffers` |

### The ground builder

The ground worker holds swatch pictures, downloaded files, calmed water and
blocks of the world. Its caches are sized to what a walk across the lands
uses (M4's `groundlean`). A new kind of ground slots into the swatches: it
is 64 colours, like every swatch, and is counted in the cache, not on top of
it.

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
