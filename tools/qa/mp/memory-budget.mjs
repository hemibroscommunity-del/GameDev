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
export const MEMORY_BUDGET = {
  artCache: { name: 'art loaded from files', mb: 112, measured: 102.2,   /* v2.3.3702: 156 -> 112, see the header */
    what: 'pictures loaded from files, decoded (the asset cache, window.__btTex) -- its highest at the fight, the monsters\' looks loaded' },
  gpu: { name: 'textures on the graphics chip', mb: 105, measured: 95.0,
    what: 'textures on the graphics chip (window.__btGpuTex) -- including what was drawn in the last minute, which Pixi unloads after 60 s unused' },
  canvases: { name: 'pictures the game draws itself', mb: 56, measured: 49.7,   /* v2.3.3699: 96 -> 88; v2.3.3702: 88 -> 56, see the header */
    what: 'pictures the game draws itself, held in 2D canvases (every one still reachable)' },
  sound: { name: 'decoded sound', mb: 29, measured: 27.0,   /* v2.3.3664: 30 -> 32; v2.3.3706: 32 -> 29, see the header */
    what: 'sound decoded into memory (music streams from its file and is not in it, v2.3.3073)' },
  heap: { name: 'the page\'s JavaScript objects', mb: 34, measured: 33.3,   /* v2.3.3595: 32 -> 33; v2.3.3657: 33 -> 34, see the header */
    what: 'the page\'s JavaScript objects' },
  buffers: { name: 'the page\'s raw data buffers', mb: 22, measured: 20.4,   /* v2.3.3703: 24 -> 22, see the header */
    what: 'the page\'s raw data buffers (ArrayBuffers), and the text of its scripts, which the same reading counts (v2.3.3703)' },
  workers: { name: 'the background workers', mb: 36, measured: 30.5,
    what: 'the background workers (the ground builder): their objects and buffers' },
};
