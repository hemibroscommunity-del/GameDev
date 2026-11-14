/* ═══ THE MEMORY BUDGET (v2.3.3101) ═══
 *
 * Owner, 2026-10-06, after the memory work (docs/MEMORY-PLAN.md) had halved
 * what the page holds: "if I add new features going forward how do I know I
 * won't ruin the memory saving system?" -- then "Yes all 3".  This file is the
 * budget; mp-membudget checks it on every PR (.github/workflows/memory.yml,
 * the `memory-budget` check); CLAUDE.md, Conventions, "Memory is budgeted", is
 * the rule.
 *
 * Each line is the MOST that kind of memory may reach anywhere on the check's
 * trip -- a phone (390 x 844, dpr 3) in the Wheel's BroTown, at a fight at the
 * Flame Fields' inner end (where the owner's screen went black), and home
 * again, three times -- in MB, read the tour's way (memprobe.mjs, after forced
 * garbage collections).  `measured` is the highest of six runs on main with
 * all twelve memory PRs in (2026-10-06); the budget leaves room for the
 * readings' own noise and little more, so a change that holds ~5-10 MB more
 * than it should goes red.  (`buffers` swings by ~2 MB at a fight -- a ground
 * piece on its way from the worker -- so its room is that much wider.)
 *
 * RAISING A LINE is allowed, and expected when a feature really needs the
 * memory (new art costs memory): raise THAT line, in the same PR, by what the
 * check measured plus a little, and say in the PR body, in plain words, how
 * many MB the feature costs and why it is worth it -- the owner reads it
 * there.  NEVER raise a line silently, or to turn a red check green without
 * saying so: that is the creep this file exists to stop.  LOWERING a line
 * after a saving is welcome -- it locks the saving in.
 *
 * v2.3.3190, the Wheel's ground and objects kept as colour numbers
 * (rendering/paletteTex.js), three runs: `artCache` 178 -> 156 and `gpu` 145
 * -> 105 (the saving: at most 172.4 -> 147.8 and 132.5 -> 95.0 MB on the
 * trip), and `buffers` 16 -> 24 -- RAISED, by the object sheets' colour
 * numbers, one byte a pixel, which the page keeps (~8 MB at the fight's
 * end): they are what puts a sheet back on the chip after Pixi takes an idle
 * one off it or a black screen's rebuild, and what the game's own reads of a
 * picture use.  The old way kept the same sheets as their colours, four
 * bytes a pixel, in `artCache`, so the 8 MB replaces ~31.
 *
 * v2.3.3595, the sword's targeting ring twice as wide (the owner: "the
 * melee ring ... twice as large"): `heap` 32 -> 33 -- RAISED.  At the check's
 * Flame Fields fight the bro now locks on and swings from twice as far, so
 * the fight is longer (7 swings on that run, where main's runs swing 0-4),
 * and a longer fight holds more of the page's JavaScript objects at its peak:
 * 32.5 MB against main's 31.9 that day (#1106's run, Playwright 1.64.1), its
 * line already 0.1 MB away.  Nothing is kept after it: the third trip ends
 * where the second did.
 *
 * v2.3.3657, main's own code at the line: `heap` 33 -> 34 -- RAISED.  Two runs
 * of the check on 2026-10-27, both main with a change that never runs on its
 * trip (#1142's walking waist, #1141's fishing grip), read 32.8 and 33.3 MB at
 * the third trip's fight: the same code on either side of the line, so every
 * pull request's check passed or failed by luck, and a failed first attempt
 * left its retry too little of the job's 20 minutes (#1141's was cancelled).
 * The heap at the fight has grown by about 1 MB since the line was set at 33
 * (31.9 on main that day): the systems merged since then (the drops' lines of
 * words, the elements' wind-ups and stronger hits, the mummy's roar, the
 * owner's music and sounds, the ghost audit's fixes) and their tables.  It is
 * the live heap (collected twice before each reading).  Nothing is kept: the
 * third trip still ends where the second did (+1.3 MB at most, its line 3).
 * Whether the page's heap should grow over a long session at all is the
 * soak's question (docs/specs/long-play-soak.md: 7-14 MB an hour of play).
 *
 * v2.3.4483, main's own code at the line again: `heap` 37.5 -> 38.5 -- RAISED.
 * The Town Bluff's redraw (a change to how the ground WORKER paints: nothing
 * of it is on the page's heap) failed this line at 37.7 MB once main's
 * v2.3.4482 was merged into it, having passed the run before.  Three more
 * readings that day, 2026-11-10, on this box: main alone (081eebff) 37.7 --
 * over its own line; the Bluff's branch 37.1; and CI's 37.7.  So main reads
 * 37.1 to 37.7 run to run and the line stood inside that: any PR failed it
 * by the luck of the run.  The line was set at 37.5 on 2026-11-03 with main
 * at 35.8: about 1.5 MB has come since, a little with each of ~400 changes
 * (no one of them measured here).  38.5 is main's highest reading and 0.8.
 * NOT a saving given up for the Bluff: what should be looked at is where
 * that 1.5 MB went (docs/specs/heap-trim-2026-11-03.md has the method), and
 * the line lowered again when it is found.
 *
 * v2.3.4080, the trim v2.3.4005 promised: `heap` 38 -> 37.5 -- LOWERED, the
 * saving locked in (docs/specs/heap-trim-2026-11-03.md).  What grew it: the
 * 13 merges of ~02:40 UTC added ~0.4 MB on arrival (bisected, three readings
 * a build: the element icons on the plates with the quest order +0.2, the
 * armour glow with the death zones and "too far" +0.2) and what their code
 * compiles as it runs at the fight -- dozens of small new functions, all on
 * the trip (heap snapshots of names-kept builds: no table, no leak).  What
 * was trimmed is older and bigger: the Wheel minimap's roads, river and
 * railway kept Pixi's three building lists for the whole Wheel (~1.0 MB:
 * rendering/gfxLean.js lets them go once drawn, `?gfxlean=0` keeps them),
 * and the old minimap's 18 glyphs and its dot never destroyed the Graphics
 * they were photographed from (~0.3 MB).  On this box (4 vCPUs), main
 * (0b55e2ae, the Hemi Bros portrait in) against it with the trim: arrival
 * 31.3 / 31.8 / 31.3 -> 29.8 / 29.5 / 30.0 (about -1.5); the highest on
 * the trip 35.3 and 36.6 -> 34.2 and 34.5; the buffers and the chip
 * unchanged.  36 leaves ~1.5 MB over this box's readings; CI's runner
 * read main ~0.7-1 MB above them (36.3 on main at 9d5cc37b, where this box
 * read 35.0-35.6).  The line was to be 36; but by the push main had moved
 * on (another ~25 merges after 0b55e2ae), and the branch with main merged
 * in read 35.0 and 35.8 at its highest on this box (two runs, the trim
 * in): ~36.5-36.8 on CI's runner, so 36 would fail every pull request on
 * main's own code again.  37.5 is that plus ~1 MB of room: 0.5 MB of the
 * owner's 2 won back for good, the ~1.3 MB trim holding the rest of the
 * room the later merges spent.
 *
 * v2.3.4005, the owner's choice of 2026-11-03: `heap` 36 -> 38 -- RAISED,
 * with a trim to follow.  After the 13 pull requests merged at ~02:42 UTC on
 * 2026-11-03 (the quest journal, the guide arrow, the monster death zones,
 * the town board on the noticeboard, the element icons on the name plates,
 * the armour glow, the weapon triangle and the rest of that evening's
 * lanes), main's own heap at the third trip's fight read 36.3 MB, twice,
 * on two pull requests whose code never runs on the trip (#1368, a pop-up's
 * removal; #1388): the same main on either side of the line, so every check
 * failed by main and not by itself.  The owner, asked: "Raise to 38 MB +
 * trim" -- 2 MB is under 1% of an iPhone's ~250 MB.  A trim lane bisects
 * those merges for the biggest holder and lowers the line again when it is
 * won back; until then 38 leaves ~1.7 MB of room.
 *
 * v2.3.3807, main's own code at the line again: `heap` 34 -> 36 -- RAISED.
 * On 2026-10-29, between 00:20 and 00:55 UTC, pull requests whose code never
 * runs on the check's trip read the heap at the third trip's fight at 34.0
 * (#1257, a rename), 34.3 (#1253), 34.7 (#1261, a coach card's place) and
 * 34.7 / 34.8 (#1230, its built-in retry too), against the line of 34: the
 * same main on either side of it, so every check passed or failed by luck,
 * as on 2026-10-27 (v2.3.3657).  What grew it since that day: the evening's
 * merges (the skateboard and its board button, the Town Hall board and its
 * pins, the party chip, the world map's marker pictures, the loot pile's
 * shine, No man's land's steps and its pill, the look palette's shared sheets
 * and their tables) -- about 0.7-1 MB of the page's objects at the fight.
 * 36 leaves ~1.3 MB of room.  Nothing is kept: the third trip still ends
 * where the second did.  Which of them holds the most is a bisect for after
 * the showing (lane P1 offered); lower the line again when it is trimmed.
 *
 * v2.3.3699, the monsters' strips held as their colour numbers once drawn
 * (rendering/heldNumbers.js): `canvases` 96 -> 88 -- LOWERED, the saving
 * locked in.  Two runs each way on one build (`QA_MB_QUERY=held=0` the game
 * before): at the Flame Fields' fight the canvases 90.2-91.7 MB -> 79.9-82.2,
 * the buffers 17.0-17.7 -> 19.5-21.2 (the goblins' numbers, a byte a pixel;
 * their highest is still at home, 23.8 either way, as the numbers go with the
 * land's art), the chip and everything else the same.
 *
 * v2.3.3664, the owner's recordings of 2026-10-27 (the farm's hoe, can, clay
 * and harvest, the forge's hammer, the Woodworker's knife, a door, a fire
 * lit, coins, the bag, Lil Bro's voice): `sound` 30 -> 32 -- RAISED.  They
 * decode to 0.94 MB, measured file by file in a page (the coins and the hoe at
 * the page's own rate, the rest at 24 kHz).  Like every sound in SFX_MANIFEST
 * they are decoded on the loading screen, so they are held wherever you are.
 * The second MB is room the line did not have: main's own code read 28.9 and
 * 30.0 MB of sound on two runs of the check the same day (#1148), the higher
 * one already at the old line.
 *
 * v2.3.3702, the armour, body and effect sheets kept as images of themselves
 * (docs/specs/packed-as-images.md): `canvases` 96 -> 56 and `artCache` 156 ->
 * 112 -- LOWERED, to lock the saving in.  Every strip gearSheets.js packs (the
 * walking armour, belt and shirt sheets, the body sheets, the effect and
 * townsfolk strips) is a PNG of itself in an <img> now, its canvas let go of:
 * at the fight 90.2-93.2 -> 48.1-49.7 MB of canvases on the same day's runs.
 * `artCache` falls by the same ~42 MB because Pixi kept every texture made
 * from a canvas in the cache this line reads, keyed by the canvas -- the
 * canvases were counted twice.  What the browser keeps of those images' decoded
 * pixels is its to drop under memory pressure, and is in no line.
 *
 * v2.3.3703, the game's script built all ASCII (docs/specs/ascii-script.md):
 * `buffers` 24 -> 22 -- LOWERED, to lock the saving in.  The reading counts the
 * text of the page's scripts as well as its buffers, and the main script held
 * 1,589 characters past Latin-1 ("—", "·", "→", emoji), so all 3.8 million of
 * its characters were kept at two bytes each.  Written in ASCII they are one
 * byte each: home again 23.5-24.0 -> 20.0-20.4 MB, arriving 21.9 -> 18.2, with
 * every open pull request in.  Main itself had read 23.9-24.2 at its line of
 * 24, so every pull request's check passed or failed by luck.
 *
 * v2.3.3706, a stereo sound whose two sides are one kept as one channel
 * (data/soundFold.js): `sound` 32 -> 29 -- LOWERED, to keep the saving.  Six
 * of the stereo files carry one signal on both sides, 3.2 MB of the sound
 * held decoded; the check read at most 27.0 MB where main reads 30.1, the
 * other lines where main's are.  (memprobe.mjs now counts the buffers the
 * page makes as well as the ones it decodes: counting decodes alone, the
 * six one-channel copies went missing and the line read 23.8.)
 *
 * v2.3.3715, `artCache` read right (docs/specs/pictures-once.md): the line
 * counted a canvas in the asset cache at its texture's size, and a canvas
 * emptied once its copy is on the chip (gpuOnly.js, heldNumbers.js) holds
 * nothing -- 21.6-23.3 MB of the line at the fight was pictures already let
 * go of.  Counted by what each canvas holds, the code before the spec's two
 * switches reads 78.9 MB at the fight (102.2 before) and 65.6 at home (79.5).
 * No line is changed here: the room it opens is the owner's to lock in or
 * spend.  The two switches (`?onecopy`, `?picnumbers`) are ON by default (the
 * owner, 2026-10-28; `=0` turns each off); with both on the fight reads art
 * 65.8, chip 75.2, canvases 26.7, buffers 19.6 (both off: 78.9, 83.8, 39.8,
 * 16.8; QA_MB_QUERY=onecopy=0&picnumbers=0).
 * (v2.3.3728: this note corrected: it said "off by default".)
 */
/* v2.3.5007, the heap trim (docs/specs/heap-trim-2026-11-13.md): `heap`
 * line UNCHANGED at 38.5, its room won back.  Main's own code read 36.5-38.0
 * on CI, so any pull request failed or passed by luck.  Snapshots of the trip
 * found half the heap is compiled code (kept for good) and the rest spread
 * thin; four trims of what was kept with no use (`?heaptrim=0` all off): the
 * head pieces' notes, the look palette's frames made when first drawn, Pixi's
 * batches' id tables emptied, and Pixi's small geometry keeping whole numbers
 * unboxed.  Back to back on this box: main 37.6 / 37.8 at its highest, the
 * branch 36.4 / 36.0; arrival 32.3 / 32.1 -> 31.3 / 31.3.  QA_MB_SNAP writes
 * heap snapshots at chosen stops (mp-membudget.mjs) for the next trim. */
/* v2.3.5006, `sound` 29 -> 22 -- LOWERED.  Four sounds no fight plays
 * (river-water, level-up, flip-win, fish-reel: 4.5 MB) are decoded ahead of
 * their moment instead of pinned for the session, seven held sounds lost their
 * silent tails (0.9 MB) and the four growls decode at 24 kHz (0.36 MB): main's
 * own code read 23.0-23.2, this branch 18.1.  22 keeps ~4 MB of room for the
 * river or a flip played on the check's walk, and catches the four pinned again.
 */
/* v2.3.4058, the townsfolk walk around and work (docs/specs/living-town.md):
 * `gpu` 105 -> 115 -- RAISED, approved by the owner, 2026-11-03 ("Approve
 * walking").  (The heap line's 38 is main's own, the owner's
 * choice of 2026-11-03, which this walk's reading fits).  The same build, the check's
 * trip, walking off (`QA_MB_QUERY=folkwalk=0`, the town as on main) against
 * on, two and four runs: the chip's highest (trip 2, home again) 106.2 / 104.2
 * off -- main's own reading already at its line of 105 -- against 113.9,
 * 110.4, 112.7 on (110.2 / 111.4 with their work poses off, `folkwork=0`: the
 * work is not it); at trip 3's home 91 off, 96-101 on.  The heap's highest
 * (the third fight) 36.2 / 35.8 off, 37.3 / 37.4 on: about 1 MB, the walkers
 * bringing more townsfolk's figures near the screen (each some 45 display
 * objects, v2.3.3809).  In the town alone, 100 s at four places, the chip held
 * 0-2 MB more walking (what was drawn in the last minute: every facing of
 * the shared head pieces and tees).  Nothing new is loaded: the walk is the
 * jog and the work the player's own sheets (folkPose.js).  Lower the line
 * again if it is trimmed. */
/* v2.3.5246, card P's backlog (the asset door, docs/plan/census/assets.md):
 * `artCache` 112 -> 109.1 -- LOWERED by what it saved, to lock it in.  The
 * townsfolk's dialogue portraits (21 of 192 x 192) were warmed with
 * Assets.load and kept decoded in the asset cache, though only an <img> ever
 * shows them: now each is let go of the moment it lands (npcSprites.js,
 * `?npcheads=0` the old way).  Three runs of this check: its highest 48.7 ->
 * 45.8 (2.9 MB, the census's 2.96), `buffers` unchanged (21.1-21.3). */
/* v2.3.5247, the backlog's next (fx-coinflip): `artCache` 109.1 -> 107.0,
 * LOWERED by what it saved.  Ace's two coin strips (1408 x 192) were kept
 * decoded the same way, though his window draws them as a CSS background:
 * let go of as they land (npcSprites.js, `?coinflip=0` the old way).  Three
 * runs: its highest 45.8 -> 43.7 (2.1 MB, the census's 2.06), `buffers`
 * 21.1-21.4, unchanged. */
/* v2.3.5248, the backlog's `tree-tiers` (card P): the woods' five trees
 * (public/sprites/trees/wood-*.png, on 256 colours) read as colour numbers
 * (paletteLoad.js, `?treenumbers=0` the pictures, as before), and __btTex
 * mended to count a numbers picture at nothing (cacheBytes.js: its page
 * copy is its numbers, an ArrayBuffer, `buffers`' already; counted here as
 * well, the trees read 5.6 MB of `artCache` that held nothing; the
 * planning session's yes, 2026-11-14).  Three runs: `artCache` at its
 * highest 43.7 -> 38.1 and its line 107.0 -> 101.4, LOWERED by the 5.6 MB
 * saved; `buffers` 21.1-21.4 -> 22.5-22.6 and its line 22 -> 23.4, RAISED by
 * exactly what moved there, the trees' numbers (1.40 MB: 171 x 318 + 381 x
 * 424 + 570 x 530 + 345 x 636 + 855 x 847 at a byte a pixel, rows padded):
 * the planning session's rule for a numbers PR.  Net: 4.2 MB less.  The
 * chip counts a tree as numbers at a byte a pixel (r8unorm), when drawn. */
/* v2.3.5249, the backlog's `fx-made` (card P; the owner: the effects'
 * 256-colour twins on, a family a PR): the seven effects the game's tools
 * made drawn from their twins as colour numbers (p256.js, `?fxmade=0` the
 * pictures).  Three runs: `artCache` at its highest 38.1 -> 35.0 and its line
 * 101.4 -> 98.3, LOWERED by the 3.1 MB saved.  The effects go to the chip
 * up front at a byte a pixel (1.05 MB; `gpu` read 71.2-76.2, its line
 * unchanged) and their numbers are kept packed in the page (`buffers`
 * 22.9-23.1, within its line). */
/* v2.3.5250, the backlog's `icons-items-world`: the icons drawn in the
 * world (the ore and the trap's box, the nine shards, the heart and sword
 * popups) read from 256-colour twins as colour numbers (p256.js,
 * `?worldicons=0` the pictures).  Three runs: `artCache` at its highest
 * 35.0 -> 33.8 and its line 98.3 -> 97.1, LOWERED by the 1.2 MB saved;
 * `buffers` 22.9-23.1 -> 23.0-23.3 and its line 23.4 -> 23.7, RAISED by
 * exactly the icons' numbers moved there (0.30 MB: thirteen of 128 x 128,
 * 256 x 256 and 180 x 189 at a byte a pixel), the planning session's rule
 * for a numbers PR; net 0.9 MB less.  The chip holds them at a byte a
 * pixel (0.35 MB).  (The gatekeeper's sitting 9: not the trap's box, whose
 * pieces are cut from its pixels after the pack; it stays a picture, 0.06
 * MB of the 1.2, so the line is 0.06 tighter than the saving, never looser.) */
export const MEMORY_BUDGET = {
  artCache: { name: 'art loaded from files', mb: 97.1, measured: 33.8,   /* v2.3.3702: 156 -> 112; v2.3.5246: 112 -> 109.1, LOWERED by the portraits let go of (2.9 MB); v2.3.5247: 109.1 -> 107.0, Ace's coin strips (2.1 MB); v2.3.5248: 107.0 -> 101.4, the trees as numbers (5.6 MB); v2.3.5249: 101.4 -> 98.3, the made effects as numbers (3.1 MB); v2.3.5250: 98.3 -> 97.1, the world's icons (1.2 MB), see the header */
    what: 'pictures loaded from files, decoded (the asset cache, window.__btTex) -- its highest at the fight, the monsters\' looks loaded' },
  gpu: { name: 'textures on the graphics chip', mb: 115, measured: 95.0,   /* v2.3.4058: 105 -> 115, approved by the owner 2026-11-03, see the header */
    what: 'textures on the graphics chip (window.__btGpuTex) -- including what was drawn in the last minute, which Pixi unloads after 60 s unused' },
  canvases: { name: 'pictures the game draws itself', mb: 56, measured: 49.7,   /* v2.3.3699: 96 -> 88; v2.3.3702: 88 -> 56, see the header */
    what: 'pictures the game draws itself, held in 2D canvases (every one still reachable)' },
  sound: { name: 'decoded sound', mb: 22, measured: 18.1,   /* v2.3.3664: 30 -> 32; v2.3.3706: 32 -> 29; v2.3.5006: 29 -> 22, LOWERED to lock in the four sounds decoded ahead instead of pinned (main read 23.0-23.2, this 18.1), see the header */
    what: 'sound decoded into memory (music streams from its file and is not in it, v2.3.3073)' },
  heap: { name: 'the page\'s JavaScript objects', mb: 38.5, measured: 36.4,   /* v2.3.3595: 32 -> 33; v2.3.3657: 33 -> 34; v2.3.3807: 34 -> 36; v2.3.4005: 36 -> 38; v2.3.4080: 38 -> 37.5; v2.3.4483: 37.5 -> 38.5; v2.3.5007: unchanged, measured 37.7 -> 36.4 by the heap trim, see the header */
    what: 'the page\'s JavaScript objects' },
  buffers: { name: 'the page\'s raw data buffers', mb: 23.7, measured: 23.3,   /* v2.3.3703: 24 -> 22, see the header; v2.3.5248: 22 -> 23.4, RAISED by the trees' colour numbers moved here (1.40 MB) as artCache fell 5.6 (net 4.2 less); v2.3.5250: 23.4 -> 23.7, the world's icons' numbers (0.30 MB) as artCache fell 1.2 (net 0.9 less), see the header */
    what: 'the page\'s raw data buffers (ArrayBuffers), and the text of its scripts, which the same reading counts (v2.3.3703)' },
  workers: { name: 'the background workers', mb: 36, measured: 30.5,
    what: 'the background workers (the ground builder): their objects and buffers' },
};
