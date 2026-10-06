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
 */
export const MEMORY_BUDGET = {
  artCache: { name: 'art loaded from files', mb: 178, measured: 169.4,
    what: 'pictures loaded from files, decoded (the asset cache, window.__btTex) -- its highest at the fight, the monsters\' looks loaded' },
  gpu: { name: 'textures on the graphics chip', mb: 145, measured: 135.4,
    what: 'textures on the graphics chip (window.__btGpuTex) -- including what was drawn in the last minute, which Pixi unloads after 60 s unused' },
  canvases: { name: 'pictures the game draws itself', mb: 96, measured: 89.9,
    what: 'pictures the game draws itself, held in 2D canvases (every one still reachable)' },
  sound: { name: 'decoded sound', mb: 30, measured: 26.0,
    what: 'sound decoded into memory (music streams from its file and is not in it, v2.3.3073)' },
  heap: { name: 'the page\'s JavaScript objects', mb: 32, measured: 27.5,
    what: 'the page\'s JavaScript objects' },
  buffers: { name: 'the page\'s raw data buffers', mb: 16, measured: 12.8,
    what: 'the page\'s raw data buffers (ArrayBuffers)' },
  workers: { name: 'the background workers', mb: 36, measured: 30.5,
    what: 'the background workers (the ground builder): their objects and buffers' },
};
