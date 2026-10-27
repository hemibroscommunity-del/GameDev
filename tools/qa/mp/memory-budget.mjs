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
 * v2.3.3646, main's own code at the line: `heap` 33 -> 34 -- RAISED.  Two runs
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
 */
export const MEMORY_BUDGET = {
  artCache: { name: 'art loaded from files', mb: 156, measured: 147.8,
    what: 'pictures loaded from files, decoded (the asset cache, window.__btTex) -- its highest at the fight, the monsters\' looks loaded' },
  gpu: { name: 'textures on the graphics chip', mb: 105, measured: 95.0,
    what: 'textures on the graphics chip (window.__btGpuTex) -- including what was drawn in the last minute, which Pixi unloads after 60 s unused' },
  canvases: { name: 'pictures the game draws itself', mb: 96, measured: 89.9,
    what: 'pictures the game draws itself, held in 2D canvases (every one still reachable)' },
  sound: { name: 'decoded sound', mb: 30, measured: 26.0,
    what: 'sound decoded into memory (music streams from its file and is not in it, v2.3.3073)' },
  heap: { name: 'the page\'s JavaScript objects', mb: 34, measured: 33.3,   /* v2.3.3595: 32 -> 33; v2.3.3646: 33 -> 34, see the header */
    what: 'the page\'s JavaScript objects' },
  buffers: { name: 'the page\'s raw data buffers', mb: 24, measured: 20.0,
    what: 'the page\'s raw data buffers (ArrayBuffers)' },
  workers: { name: 'the background workers', mb: 36, measured: 30.5,
    what: 'the background workers (the ground builder): their objects and buffers' },
};
