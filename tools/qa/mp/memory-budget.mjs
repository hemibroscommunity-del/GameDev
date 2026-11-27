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
/* v2.3.5252, the backlog's `fx-sheets-supplied`: the effects cut from the
 * owner's sheets read from their twins (p256.js, `?fxsheets=0` the
 * pictures), the whirlwind's too: its pack declined, gearSheets.js kept its
 * twin a picture (2 MB at the fight) and now reads it as numbers whole.
 * Three runs: `artCache` 33.8 -> 31.8 and its line 97.1 -> 95.1, LOWERED by
 * the 2.0 MB saved; `buffers` 23.0-23.3 -> 23.4-23.5 and its line 23.7 ->
 * 24.2, RAISED by exactly the whirlwind's numbers that took its picture's
 * place (0.50 MB, 2048 x 256 at a byte a pixel): the page's two lines
 * 1.5 MB less.  The six on the chip at a byte a pixel: 1.51 MB (`gpu`
 * 75.0-77.2, its line unchanged).  By the census's own ruler, the chip's
 * share counted (the gatekeeper's sitting 9), the family is 2.00 -> 1.51 MB
 * at the fight: 0.49 MB less. */
/* v2.3.5256, the backlog's `monster-slime`: the slimes' four strips a look
 * of the walking loader (wheelMonsterArt.js), loaded through the strip door
 * as one comes near and let go when none is (`?slimewalk=0`: loaded behind
 * the first loading screen, as before).  They were pictures in the asset
 * cache from the start, at the Flame Fields' fight too, where no slime
 * lives.  Three runs: `artCache` at the fight 31.9 -> 27.4 and its line
 * 95.1 -> 90.6, LOWERED by the 4.5 MB saved; `buffers` 21.0-21.9 at the
 * fight and 23.7 at its highest, at home (line 24.2, unchanged); every
 * other line unchanged.  By the census, monster-slime 4.56 -> 0 MB at the
 * fight; the splat and the orb (monster-slime-stills, 0.13 MB) are kept.
 * With sitting 16's mends and main's frame pack (three runs at fe3eb60b3):
 * `artCache` 27.5 at the fight, the hit's first frame kept as a still for
 * the stat window's films (slimeSprites.js `getHitStill`, 0.06 MB); its
 * line stays 90.6 (never raised); `buffers` 19.4-21.3 at the fight, 23.5
 * at its highest, at home; the census monster-slime 4.56 -> 0.06 MB. */
/* v2.3.5257, the backlog's `monster-fire-goblin`: a monster strip's colour
 * numbers kept deflated a frame at a time once the chip has drawn it
 * (framePack.js, `?framepack=0` the numbers whole).  Three runs at
 * f9ca7c07c, and two with `?framepack=0` at 92a4f166e (with the pack off
 * the two run the same code): `buffers` at the Flame Fields' fight
 * 21.2-21.4 -> 19.3-20.4 MB, but its highest is at home either way (23.1-23.4
 * off, 23.0-23.6 on: the town's own numbers, as v2.3.3699 found it), so its
 * line stays 24.2: the saving is at the fight, where the line never reads
 * it.  `workers` at the fight 20.6 -> up to 21.9 (the strip reader's worker
 * deflating the pieces), within its line.  Every other line unchanged.  By
 * the census's own ruler, chip and page counted, the fire goblin is 8.10 ->
 * 6.65 MB at the fight (its numbers 5.54 -> 4.09): its strips not yet drawn
 * keep their numbers whole. */
/* v2.3.5258, the backlog's `icons-elements`: the eight element marks drawn
 * after a hit's number read from their 256-colour twins as colour numbers
 * (p256.js ELEM_ICONS, `?elemicons=0` the pictures), sent to the chip at a
 * byte a pixel and kept packed in the page.  Three runs: `artCache` at the
 * fight 31.9 -> 29.9 and its line 95.1 -> 93.1, LOWERED by the 2.0 MB saved;
 * `buffers` 21.1-22.2 at the fight and 23.8 at its highest, at home (the
 * twins' numbers, 0.5 MB, held there until the pack: its line 24.2 holds
 * them); `gpu` 72.1-78.1 (0.50 MB of marks on the chip; its line 115).  By
 * the census's own ruler the family is 2.16 -> 0.64 MB at the fight (the
 * 64 px plate icons, 0.14, are loaded their own way).  With main (sitting
 * 17, the slimes' walk) merged in, three runs at 31a8e6120: `artCache` 25.5
 * at the fight (27.5 on main), its line 90.6 -> 88.6; `buffers` 19.5-20.9
 * at the fight, 23.6-23.8 at its highest, at home; `gpu` 78.0-80.0; atlas
 * 125-144 rows, never full. */
/* v2.3.5562, the backlog's `traits-hairmasks`: the hats' hair masks (the
 * white silhouettes the hair is clipped to under a hat, loaded for every
 * clipping hat drawn and kept) read from their exact 256-colour twins as
 * colour numbers (p256.js HAIRMASKS, `?hairmasks=0` the pictures), all on
 * one row of the colour atlas.  Three runs on main at 07ffcfc2e: `artCache`
 * at the fight 27.5 -> 25.6; three with #1853 at be959897b: 25.5 -> 23.6,
 * so its line 88.6 -> 86.7, LOWERED by the 1.9 MB saved; `buffers` 19.3-20.6
 * at the fight, 23.6-23.8 at its highest, at home (line 24.2); `gpu` at its
 * highest 78.5-80.5; atlas 135-146 rows, never full (the masks one row, where
 * a row each took up to 30).  By the census, traits-hairmasks 2.13 -> 0.60 MB
 * at the fight. */
/* v2.3.5563, the backlog's `pets`: the pet sheet every pet is drawn from
 * (petSprites.js, loaded behind the loading screen for everyone and kept)
 * read from its 256-colour twin as colour numbers (p256.js PET_SHEET_P,
 * `?petsheet=0` the picture; 79k colours cut to 256, moved 0.021 OKLab).
 * Three runs stacked on #1906 at 5657c1c77: `artCache` at the fight
 * 23.6 -> 22.1, so its line 86.7 -> 85.2, LOWERED by the 1.5 MB saved;
 * `buffers` 19.6-20.9 at the fight, 23.5-23.8 at its highest, at home (line
 * 24.2); `gpu` at its highest 78.3-82.0; atlas 130-147 rows, never full.
 * By the census, pets 1.50 -> 0.38 MB at the fight. */
/* v2.3.5564, the backlog's `cape-hood`: the crimson cape's hood's hair masks
 * (capeSprites.js, behind the loading screen with the capes, for everyone,
 * and kept; the silhouettes the hair is clipped to under a hood) read from
 * their exact 256-colour twins as colour numbers, on the hats' masks' row
 * (p256.js CAPE_HOOD, `?capehood=0` the pictures).  Not the hood's halves
 * (sitting 20, answer (a)): a cape is drawn crisp, which colour numbers are
 * not.  Three runs on the pets' line with sitting 20's mends at 3916af40b:
 * `artCache` at the fight 22.1 -> 21.4, so its line 85.2 -> 84.5, LOWERED
 * by the 0.7 MB saved (the first runs, halves too, set 83.7: 1.5 MB);
 * `buffers` 19.5-20.3 at the fight, 23.8-24.0 at its highest, at home (line
 * 24.2); `gpu` at its highest 77.8-77.9; atlas 143-150 rows, never full.
 * By the census, cape-hood 1.50 -> 0.93 MB at the fight (the masks 0.18 on
 * the chip, the halves 0.75 in the page). */
/* v2.3.5565, the backlog's `world-fish-spot`: the pond under a fishing spot
 * (effectsRenderer.js NODE_SPRITE_SOURCES; the picture a spot is drawn from, loaded for the world
 * and kept) read from its 256-colour twin as colour numbers (p256.js,
 * `?fishspot=0` the picture; the twin padded to 628 px by one see-through
 * column).  Three runs on main (b2d763a93): `artCache` at the fight
 * 21.4 -> 19.9, so its line 84.5 -> 83.0, LOWERED by the 1.5 MB saved;
 * `buffers` 23.8-23.9 at its highest (line 24.2); `gpu` at its highest
 * 77.0-80.5; atlas 135-148 rows, never full.  By the census, world-fish-spot
 * 1.50 -> 0.38 MB at the fight. */
/* v2.3.5566, the backlog's `hud-bars`: the bars over heads (the HP, mana and
 * stamina pills, the health bar and the harvest bar; entityRenderer.js
 * _HUD_BAR_FILES, loaded for everyone and kept) read from their 256-colour
 * twins as colour numbers (p256.js, `?hudbars=0` the pictures; the health
 * bar's three padded to 364 px by one see-through column).  Three runs
 * stacked on the fish spot's (main f692b93a): `artCache` at the fight
 * 19.9 -> 18.8, so its line 83.0 -> 81.9, LOWERED by the 1.1 MB saved;
 * `buffers` 23.9-24.0 at its highest (line 24.2); `gpu` at its highest
 * 79.4-82.7; atlas 135-153 rows, never full.  By the census, hud-bars
 * 1.43 -> 0.39 MB at the fight. */
/* v2.3.5567, the backlog's `player-death`: the death strip (drawn when the
 * bones' explosion has no corpse; playerDeathSprites.js, loaded for everyone
 * and kept) read from its 256-colour twin as colour numbers (p256.js,
 * `?deathstrip=0` the picture).  Three runs stacked on the bars' (main
 * 8149d61e): `artCache` at the fight 18.8 -> 17.4, so its line 81.9 -> 80.5,
 * LOWERED by the 1.4 MB saved; `buffers` 24.0-24.2 at its highest (at its
 * line 24.2, not over); `gpu` at its highest 75.5-79.8; atlas 142-155 rows,
 * never full.  By the census, player-death 1.31 -> 0.33 MB at the fight. */
/* v2.3.5569, the backlog's `icons-from-uploads-world`: the five-block stamina
 * and mana strips and the verified Bro badge over a name (fxStrips.js,
 * entityRenderer.js; loaded for everyone and kept) read from their 256-colour
 * twins as colour numbers (p256.js, `?uploadicons=0` the pictures; the
 * stamina strip padded to 1640 px past its last frame).  Three runs stacked
 * on the death strip's (main 8149d61e): `artCache` at the fight 17.4 -> 16.2,
 * so its line 80.5 -> 79.3, LOWERED by the 1.2 MB saved; `buffers` 24.1-24.2
 * at its highest (at its line 24.2, not over); `gpu` at its highest
 * 77.0-82.3; atlas 150-158 rows, never full.  By the census,
 * icons-from-uploads-world 1.25 -> 0.31 MB at the fight. */
/* v2.3.5981 (card P2's backlog, docs/plan/census/P2-memory.md row 5): the
 * tee's standing and jogging sheets are no longer sent to the chip at the
 * loading screen where a phone draws them from the colour numbers
 * (lookShirtFrame.js, `?teechip=0` sends them).  Three runs stacked on the
 * census (fcd1ae9): the tee's stand and jog rows on the chip at the fight
 * 1.59 -> 0.01-0.86 MB (a jog sheet drawn from its RGBA on a later trip still
 * goes up at that draw), so `gpu` 115 -> 114.3, LOWERED by the 0.73 MB saved
 * at the highest; `gpu` at its highest 77.8-78.8 (main 78.9-82.1).  `buffers`
 * read 23.9, 24.0 and 24.3 against its 24.2: main read 24.2 at it all three
 * times (the census), and nothing here adds to the page's buffers. */
/* v2.3.5982 (card P2's backlog, census row 10): the monsters' thrown goo
 * and fire atlases (monsterShotFx.js, 1024 x 376 and 1024 x 49) kept as
 * images of themselves (keepAsImage.js, `?shotimage=0` the canvases), their
 * canvases let go of.  Three runs stacked on 5981: `canvases` at its highest
 * 15.4 -> 13.7, so its line 56 -> 54.3, LOWERED by the 1.7 MB saved;
 * `artCache` 16.2 -> 14.5 too (Pixi's Cache held the canvas), its line left
 * at 79.3 (the frame pacer's quality line: the planning session).  `heap`
 * read 38.9, 38.4 and 38.4 against its 38.5 (main 38.1-38.5: the line at
 * its edge on main; nothing here keeps more than two <img>s); `buffers`
 * 24.2, 24.1, 24.0. */
/* v2.3.6222 (card FX PR 3; card P2's census row 9, its Found): the five
 * ore rocks read as colour numbers, the trees' way (paletteLoad.js,
 * `?treenumbers=0` the pictures), and the three projectile sheets (the
 * staff's bolt and special, the sword's slash) from their 256-colour twins
 * (p256.js PROJ_SHEETS, `?p256=0` the pictures).  Three runs stacked on
 * #2194 (main's code, moved): `artCache` at its highest 13.4 -> 11.2 (main
 * read 13.4 in three runs), 2.2 MB saved (the census said 2.1); its line
 * left at 79.3, as v2.3.5982 left it: the frame pacer steps quality on a
 * copy of it (framePacer.js MEM_LINES, frame-pacer.test 23a), a change in
 * play that waits for the planning session's word; `buffers` 24.2-24.3 (main, three runs) ->
 * 24.7, 24.8, 24.7, so its line 24.2 -> 24.8, RAISED by the numbers kept in
 * the page (0.5 MB; the highest read 24.8) as artCache fell 2.2 (net 1.7
 * less in the page; the planning session's yes, 2026-11-18, "raise buffers only if the
 * net saving is clearly larger").  `gpu` 78.5-81.3 (main 79.2-80.9), its
 * line unchanged; `heap` 38.5-38.6 (main 38.3-39.2: the line at its edge on
 * main, as v2.3.5982 found). */
/* v2.3.6202 (card EN PR 3; P2's census row 2): the townsfolk whose looks the
 * shared numbers refuse are drawn from sheets baked behind the loading screen
 * (35 at the check's town), each sent to the chip at its first draw and, before
 * this, kept there all visit.  Now their chip copies are let go of once every
 * townsperson is 2000 px past the view for 10 s (TextureSource.unload; the
 * baked pictures stay, so nothing is baked again: entityRenderer.js
 * _folkSheetsStep, `?folksheets=0` keeps them).  Three runs: the `blob:`
 * sheets on the chip at the fight 13.1-14.3 -> 2.1-7.4 MB, the fight's `gpu`
 * 75.6-77.8 -> 64.4-73.5; at its highest (home again, where they are drawn
 * and sent up again) 71.3, 80.1, 76.4 against 81.6 and 78.0 with the switch
 * thrown on the same build (and main's 78.0-82.1), so `gpu` 114.3 -> 109.3,
 * LOWERED by the 5.0 MB saved at the highest.  `heap` read 38.7, 38.6, 38.5
 * against its 38.5, and 38.8, 38.5 with the switch thrown: the line at its
 * edge on main (P2's census), not this change.  `artCache` 13.4 as main. */
/* v2.3.6306 (card RR; the planning session's yes through the gatekeeper,
 * sitting 53, 2026-11-19), main's own code at the line again: `heap`
 * 38.5 -> 40.0 -- RAISED, +1.5 MB.  After sitting 52's merges every PR
 * failed `memory-budget` on the heap alone, test-only ones included (card
 * RR's #2258 and #2260: 38.8, 39.0 and 39.2 on CI; HB2's #2266 39.2).  The gatekeeper's A/B named no
 * change: GitHub's runs on heads with no game change of their own read old
 * main 1cd3fced 37.4, 37.5, 37.6, 37.8, 38.0, 38.4, 38.5, 38.6, 38.6 and new
 * main c0a0791c 38.8, 39.0, 39.2; mp-membudget alone on the gatekeeper's box read
 * c0a0791c 38.9, 38.6, 38.6, with EN's keep queue off (`?keepimage=0`) 38.6,
 * 38.6 (no change), and 1cd3fced 38.6, 38.6, 38.8, 38.6 (`?groundsend` is
 * never ridden on the tour): every run of either main over 38.5 on that box.
 * So main reads 37.4 to 39.2 run to run, and the line at 38.5 stood
 * inside that, as v2.3.4483 found at 37.5: any PR failed it by the luck of
 * the run.  40.0 is the highest seen, 39.2, plus 0.8 of room (39.5, the
 * first proposal, would have left 0.3 and failed again: the gatekeeper).  NOT a saving given up: the heap has crept about 1 MB since v2.3.5007's
 * trim (measured 36.4); where it went is the next trim's question
 * (docs/specs/heap-trim-2026-11-13.md has the method), and the line lowered
 * again when it is found. */
/* v2.3.6501 (card PH PR 2; the shape review's item 17): the frame pacer no
 * longer copies `artCache` and `gpu` (framePacer.js MEM_LINES, which
 * v2.3.5982 and v2.3.6222 left the art's line at 79.3 for): its memory
 * alarm is a number of its own on the game's total (MEM_ALARM, read in a
 * crowded fight: docs/plan/census/PH-phone.md).  These lines are the
 * memory check's alone again, free to fall to what the game reads (card
 * PH's PR 3). */
/* v2.3.6502 (card PH PR 3; the shape review's item 18): THE CHECK GATES
 * WHAT A PHONE HOLDS.  The seven lines summed to 365.7 MB where the readings
 * summed to about 206 and an iPhone's page dies near 250: four lines had
 * 3 to 7 times their reading of room (art 79.3 against 11.2), so a change
 * could add tens of MB and stay green.  Each line is now the highest of three
 * runs on main's code on the test box (part 1's three on 0aec6482 and three
 * with card PH's PR 2, which adds nothing a line reads, 2026-11-23:
 * docs/plan/census/PH-phone.md) plus the larger of their scatter and 1.0 MB
 * (the planning session's answer, 2026-11-23: a line inside main's own
 * run-to-run noise fails every PR by luck, and a line that fails by luck
 * gets waved through):
 *   artCache 79.3 -> 12.2 (11.2 + 1.0)    gpu 109.3 -> 94.0 (83.8 + 10.2)
 *   canvases 54.3 -> 14.7 (13.7 + 1.0)    sound 22 -> 19.9 (CI's 18.9 + 1.0)
 *   workers 36 -> 24.3 (21.2 + 3.1)       total new, 216.0 (207.8 + 8.2)
 * `heap` (40.0) and `buffers` (24.8) UNCHANGED, and no line rises: the six
 * runs read heap 38.2-39.9 and buffers 24.4-24.9, so main's own code sits AT
 * both lines on this box (buffers 0.1 over in two of six): the line where
 * the next trim is owed, not room to give away.  The margin is held against
 * the higher of this box's reads and CI's (the PR's own memory-budget run).
 * The TOTAL is the seven read at the same stop and summed (mp-membudget
 * READ.total): 199.6-207.8 MB, against the ~250 an iPhone's page dies at,
 * where the seven lines summed to 365.7 before this.
 *   The PR's own CI run (ee22311e, 2026-11-24) read artCache 11.2, gpu 77.3,
 * canvases 13.7, sound 18.9, heap 37.2, buffers 24.3, workers 19.4, total
 * 198.2: `sound` read 0.8 MB above this box's highest, so its line is CI's
 * 18.9 + 1.0 = 19.9 (still 2.1 under main's 22).  `buffers` read 24.3 there,
 * 0.5 MB of room: CI's read + 1.0 would be 25.3, over main's 24.8, and no
 * line rises, so it stays at 24.8 (the next trim is owed there).
 *
 * v2.3.6503 (card PH PR 4), `heap` 40.0 -> 42.5 -- RAISED, +2.5 MB, the ONE
 * line that rises (decided for the owner while away by the orchestrator, part
 * 9, 2026-11-24; the TOTAL stays 216.0 and every other line stays).  The
 * owner's 1.5 sharpness on a phone ("1.5 looks fine nothing below that",
 * 2026-11-24) owns about 2 MB of the page's heap: compiled code +1.00, arrays
 * +0.27, objects +0.12, because the 1.5 page swings 24 times at the check's
 * fight where the 1.0 one swings 10 (docs/plan/census/PH-phone.md, "PR 4's
 * heap at 1.5"): more code run, no holder.  The reads: 39.4 (#2318) and 40.2
 * (#2323) on GitHub's runner, 41.5 on the test box, 39.3 on the test box with
 * `?phoneres=0` (the switch that undoes the cause).  The line is the highest
 * read, 41.5, plus 1.0 MB (the margin the 6501/6502 lines carry), rounded up
 * to 42.5.  tools/dev/heap-trend.mjs HEAP_LINE rises to 42.5 with it (the
 * guard still holds the line at that number; it is not weakened). */
export const MEMORY_BUDGET = {
  artCache: { name: 'art loaded from files', mb: 12.2, measured: 11.2,   /* v2.3.3702: 156 -> 112; v2.3.5246: 112 -> 109.1, LOWERED by the portraits let go of (2.9 MB); v2.3.5247: 109.1 -> 107.0, Ace's coin strips (2.1 MB); v2.3.5248: 107.0 -> 101.4, the trees as numbers (5.6 MB); v2.3.5249: 101.4 -> 98.3, the made effects as numbers (3.1 MB); v2.3.5250: 98.3 -> 97.1, the world's icons (1.2 MB); v2.3.5252: 97.1 -> 95.1, the whirlwind as numbers (2.0 MB); v2.3.5256: 95.1 -> 90.6, the slimes' strips loaded as you walk (4.5 MB), see the header; v2.3.5258: 90.6 -> 88.6, the element marks as numbers (2.0 MB, measured on its own at 95.1 -> 93.1), see the header; v2.3.5562: 88.6 -> 86.7, the hats' hair masks as numbers (1.9 MB), see the header; v2.3.5563: 86.7 -> 85.2, the pet sheet as numbers (1.5 MB), see the header; v2.3.5564: 85.2 -> 84.5, the hood's hair masks as numbers (0.7 MB), see the header; v2.3.5565: 84.5 -> 83.0, the fishing spot's pond as numbers (1.5 MB), see the header; v2.3.5566: 83.0 -> 81.9, the bars over heads as numbers (1.1 MB), see the header; v2.3.5567: 81.9 -> 80.5, the death strip as numbers (1.4 MB), see the header; v2.3.5569: 80.5 -> 79.3, the block strips and the Bro badge as numbers (1.2 MB), see the header; v2.3.6222: left at 79.3 though the ore rocks and the projectile sheets as numbers saved 2.2 MB (the frame pacer's copy, framePacer.js MEM_LINES), see the header; v2.3.6501: no longer copied (framePacer.js MEM_ALARM), see the header ; v2.3.6502: 79.3 -> 12.2, LOWERED to the highest of six reads (11.2) + 1.0 MB, see the header (v2.3.6502) */
    what: 'pictures loaded from files, decoded (the asset cache, window.__btTex) -- its highest at the fight, the monsters\' looks loaded' },
  gpu: { name: 'textures on the graphics chip', mb: 94.0, measured: 83.8,   /* v2.3.4058: 105 -> 115, approved by the owner 2026-11-03, see the header; v2.3.5981: 115 -> 114.3, the tee's stand and jog sheets not sent (0.73 MB), see the header; v2.3.6202: 114.3 -> 109.3, the townsfolk's baked sheets off the chip far from town (5.0 MB), see the header ; v2.3.6502: 109.3 -> 94.0, LOWERED to the highest of six reads (83.8) + their scatter (10.2), see the header (v2.3.6502) */
    what: 'textures on the graphics chip (window.__btGpuTex) -- including what was drawn in the last minute, which Pixi unloads after 60 s unused' },
  canvases: { name: 'pictures the game draws itself', mb: 14.7, measured: 13.7,   /* v2.3.3699: 96 -> 88; v2.3.3702: 88 -> 56, see the header; v2.3.5982: 56 -> 54.3, the goo atlas kept as images (1.7 MB) ; v2.3.6502: 54.3 -> 14.7, LOWERED to the highest of six reads (13.7) + 1.0 MB, see the header (v2.3.6502) */
    what: 'pictures the game draws itself, held in 2D canvases (every one still reachable)' },
  sound: { name: 'decoded sound', mb: 19.9, measured: 18.9,   /* v2.3.3664: 30 -> 32; v2.3.3706: 32 -> 29; v2.3.5006: 29 -> 22, LOWERED to lock in the four sounds decoded ahead instead of pinned (main read 23.0-23.2, this 18.1), see the header ; v2.3.6502: 22 -> 19.9, LOWERED to CI's read (18.9, over this box's six reads' 18.1) + 1.0 MB, see the header (v2.3.6502) */
    what: 'sound decoded into memory (music streams from its file and is not in it, v2.3.3073)' },
  heap: { name: 'the page\'s JavaScript objects', mb: 42.5, measured: 36.4,   /* v2.3.3595: 32 -> 33; v2.3.3657: 33 -> 34; v2.3.3807: 34 -> 36; v2.3.4005: 36 -> 38; v2.3.4080: 38 -> 37.5; v2.3.4483: 37.5 -> 38.5; v2.3.5007: unchanged, measured 37.7 -> 36.4 by the heap trim, see the header; v2.3.6306: 38.5 -> 40.0, main read 37.4-39.2 run to run, see the header; v2.3.6502: unchanged, its scatter in three runs narrower than main's run to run, see the header (v2.3.6502); v2.3.6503: 40.0 -> 42.5, RAISED +2.5 MB by the owner's 1.5 sharpness (the highest read 41.5 + 1.0), see the header (v2.3.6503) */
    what: 'the page\'s JavaScript objects' },
  buffers: { name: 'the page\'s raw data buffers', mb: 25.2, measured: 23.5,   /* v2.3.6691 (card UI2-quests): the same 25.2 holds the Quests pages too (15.9 KB more of the game's script, 4,588,449 -> 4,604,322 bytes, which this reading counts; 25.1 at trip 2 twice on eb90c6fd, the test box), measured with KEEP's icons merged (the mend of sitting 71, see docs/plan/status/UI2.md); v2.3.6743: 25.0 -> 25.2, RAISED 0.2 MB: the page's version table took the icons (card KEEP PR 3b: 97 -> 679 rows, 4.2 -> 30.1 KB of script, which this reading counts as text); the base (claude/plan-keep-3-sfx 87b08b1) read 25.0 at the line, the change 25.1 in two runs, on the test box; v2.3.6549: 24.8 -> 25.0, RAISED 0.2 MB: the base (claude/plan-ct-9-hold's head 3c86a24e) read 24.2, 24.5, 24.7 home again over its three trips, 0.1 under the line and rising; card CT part 16 read 24.9 (its added script about 12 KB, the reading counts the page's script text; the rest that rise from trip to trip); v2.3.3703: 24 -> 22, see the header; v2.3.5248: 22 -> 23.4, RAISED by the trees' colour numbers moved here (1.40 MB) as artCache fell 5.6 (net 4.2 less); v2.3.5250: 23.4 -> 23.7, the world's icons' numbers (0.30 MB) as artCache fell 1.2 (net 0.9 less); v2.3.5252: 23.7 -> 24.2, the whirlwind's numbers (0.50 MB) as artCache fell 2.0 (net 1.5 less), see the header; v2.3.6222: 24.2 -> 24.8, the rocks' and the projectile sheets' numbers (0.5 MB) as artCache fell 2.2 (net 1.7 less), see the header; v2.3.6502: unchanged, its scatter in three runs narrower than main's run to run, see the header (v2.3.6502); v2.3.6503: 40.0 -> 42.5, RAISED +2.5 MB by the owner's 1.5 sharpness (the highest read 41.5 + 1.0), see the header (v2.3.6503) */
    what: 'the page\'s raw data buffers (ArrayBuffers), and the text of its scripts, which the same reading counts (v2.3.3703)' },
  workers: { name: 'the background workers', mb: 24.3, measured: 21.2,   /* v2.3.6502: 36 -> 24.3, LOWERED to the highest of six reads (21.2) + their scatter (3.1), see the header (v2.3.6502) */
    what: 'the background workers (the ground builder): their objects and buffers' },
  /* v2.3.6502 (card PH PR 3): THE TOTAL -- the seven read at the same stop, summed (mp-membudget READ.total): what the
     phone holds at once, against the ~250 MB an iPhone's page dies at.  The seven lines summed were 365.7 MB before
     this PR: no single line could say the page was near its end. */
  total: { name: 'everything the page holds at once', mb: 216.0, measured: 207.8,   /* v2.3.6502: new, the highest of three reads (207.8) + their scatter (8.2), see the header (v2.3.6502) */
    what: 'the seven above, read at the same stop and summed -- its highest anywhere on the trip' },
};

/* v2.3.6506 (card PH, the sitting-59 mend): THE JUDGE, here beside its lines.  Sitting 59 raised the heap line
   INSIDE mp-membudget's judge (`top.v <= line.mb` with a few MB more for `heap`) and heap-trend.test stayed green:
   it read MEMORY_BUDGET alone, never the comparison, which lived in a scenario no suite can play (a browser).  The
   comparison is made here, from the stops the scenario read and its readers (`read`: a key to a stop's MB), and
   heap-trend.test drives it (a heap a tenth over its line red, at its line green, a stop unread red); the scenario
   hands each row to its `rec.ok` as it is.  Returns { peaks, rows }: each key's highest stop, and a row a key,
   { name, ok, detail }. */
export function judgeLines(stops, read, whatToDo) {
  const peaks = {}, rows = [];
  const all = Array.isArray(stops) ? stops : [];
  for (const k of Object.keys(read)) {
    const vals = all.map((s) => ({ v: read[k](s), at: s.label }));
    const bad = vals.filter((x) => typeof x.v !== 'number' || !Number.isFinite(x.v));
    const top = vals.filter((x) => typeof x.v === 'number').sort((a, b) => b.v - a.v)[0] || null;
    peaks[k] = top;
    const line = MEMORY_BUDGET[k];
    if (!line || bad.length || !top) {
      rows.push({ name: `${k}: read at every stop${line ? '' : ' (and a line of its own)'}`, ok: false, detail: { unread: bad.map((x) => x.at), line: !!line } });
      continue;
    }
    rows.push({ name: `${k} (${line.name}): at most ${top.v} MB (${top.at}), budget ${line.mb} MB`, ok: top.v <= line.mb,
      detail: { line: k, read: top.v, at: top.at, budget: line.mb, over: +(top.v - line.mb).toFixed(1), whatToDo } });
  }
  return { peaks, rows };
}
