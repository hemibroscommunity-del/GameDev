/* ═══ v2.3.1735: SHARED FX STRIPS (owner art) ═══
 *
 * A LEAF module: it imports pixi and nothing else in this repo, so both
 * renderers can use it without a cycle.  That is the whole reason it exists —
 * effectsRenderer already imports entityRenderer, so the strips could not
 * live in effectsRenderer and still be drawn by entityRenderer.
 *
 *   STUN_STARS   — the ring of stars over a stunned monster's head.  Drawn by
 *                  entityRenderer, in the monster's own container, REPLACING
 *                  the procedural three-star orbit that has been there since
 *                  the stun existed.  It replaces rather than joins it: two
 *                  star rings on one monster is what the first cut of this
 *                  shipped, and it read as a bug.
 *   WHIRL_VORTEX — the spiral under a Whirlwind cast.  Drawn by
 *                  effectsRenderer on the world overlay.
 *
 * PRELOADING IS LAW (CLAUDE.md, owner directive 2026-07-19): every animation
 * must be fully loaded before the intro overlay lifts, and a NEW animation
 * system must register its loader in the central manifest in the same PR.
 * `fxStripsReady()` is that registration — preloadWorldAnimations awaits it
 * (preloadAnimations.js).  These are two small global sheets, not per-zone
 * art, so they belong in the global manifest and not preloadZoneAssets.
 *
 * Both are 8 equal cells in one row, the contract EFFECT_BURSTS uses.  Owner
 * sheets are normalised to 2048x256 by tools/import_fx_sheet.mjs.
 */
import { Assets, Rectangle, Texture } from 'pixi.js';

export const STUN_STARS = { frames: [], url: '/sprites/fx/stun-stars-v1.png?v=2.3.1735' };
export const WHIRL_VORTEX = { frames: [], url: '/sprites/fx/whirl-vortex-v1.png?v=2.3.1735' };

/* ═══ v2.3.2239: THE FIRE GOBLIN'S BURNING GROUND (owner art) ═══
 * Owner art replacing the procedural discs v2.3.2238 shipped with.  Eight
 * frames of a flame guttering on a scorched plate, laid by
 * server/src/firetrail.js and drawn by effectsRenderer.
 *
 * GLOBAL, not per-zone, and that is a real decision rather than a default.
 * CLAUDE.md's ZONE-ASSET EXCEPTION exists for art you only need in the zone
 * you are standing in -- 4MB zone maps and monster variants -- and this is
 * 8 small cells that must be ready the instant a goblin starts running.  A
 * per-zone load would put a fetch in front of the first patch he drops,
 * which is exactly the first-use hitch the preloading law is about.
 *
 * PLATE_FRAC is the load-bearing number, and it is MEASURED, not chosen:
 * tools/import_fire_trail.mjs composes each cell with the scorch plate's
 * centre at the cell centre and prints the plate's width as a fraction of
 * the 256px cell (113/256).  The renderer scales by it so the plate on
 * screen is exactly the diameter the worker tests -- the "never draw a lie
 * about the radius" rule the element nova and the telegraph rings already
 * follow, and one this hazard needs MORE than they do, because it persists
 * and a player learns its edge by walking it.  Re-run the importer if the
 * art changes; do not hand-tune this. */
export const FIRE_TRAIL_FX = { frames: [], url: '/sprites/fx/fire-trail-v1.png?v=2.3.2239' };
export const FIRE_TRAIL_PLATE_FRAC = 113 / 256;
/* One full flicker cycle.  Slower than it looks like it should be on
   purpose: the eight frames are eight independently drawn flames rather than
   a smoothly tweened one, so run fast they read as a strobe.  ~14fps lets
   each frame land as a lick of flame. */
export const FIRE_TRAIL_FX_MS = 560;

/* ═══ v2.3.2070: THE PORTAL BEAM ═══
 * Owner: "Use this to indicate portal areas (where you go between zones)
 * instead of the double circles.  It should fade furthest from the zone
 * entrance."  One still, not a strip -- it is animated by the pulse the
 * portals already had, not by frames.
 *
 * It lives HERE, in the leaf module, for the reason the file exists: it is
 * drawn by tileRenderer, which imports pixi and data tables only, and adding a
 * loader to it would be the first "load on first sighting" in that file.
 * GLOBAL rather than per-zone -- every zone has exits, so there is no zone
 * whose overlay could own it (CLAUDE.md's ZONE-ASSET EXCEPTION covers art you
 * only need in one place; this is the opposite).
 *
 * Built by tools/import_portal_beam.py, which derives the alpha the owner's
 * white-background artwork does not carry and bakes the fade that the ask is
 * actually about. */
export const PORTAL_BEAM = { tex: null, url: '/sprites/fx/portal-beam.webp?v=2.3.2070' };

/* One full turn of the star ring.  Slow enough to read as a daze rather than
   a strobe; matches the 700ms period of the procedural orbit it replaces so
   the feel does not change, only the art. */
/* ═══ v2.3.2300: THE FIVE-BLOCK RESOURCE READOUT ═══
 * Owner: "instead of seeing tiny percentages and trying to do mental math each
 * time stamina or mana is used, I want just 5 blocks (with thick borders
 * between them but all connected inside a rectangle). Use this sprite sheet."
 *
 * His sheet, sliced by tools/slice_block_bars.py into two strips of SIX frames
 * each. Six, not five: an empty bar is a frame too, and the strip is ordered so
 * the INDEX IS THE NUMBER OF FILLED BLOCKS -- frames[0] is empty, frames[5] is
 * full. The sheet itself counts down; the slicer reverses it precisely so no
 * call site ever writes `5 - filled`, which is one subtraction away from
 * showing a full bar at zero stamina.
 *
 * HERE rather than in a new module because this file is already awaited by the
 * central preload manifest (fxStripsReady, preloadAnimations.js). CLAUDE.md's
 * preloading law wants every animation asset loaded before the intro overlay
 * lifts, and a resource bar is the worst possible thing to load lazily: its
 * first use is the first time you spend mana, i.e. mid-fight. GLOBAL, not
 * per-zone -- the bars follow their owner into every zone. */
export const BLOCK_BARS = {
  stamina: { frames: [], url: '/icons/ui/blocks-stam.webp?v=2.3.2300' },
  mana:    { frames: [], url: '/icons/ui/blocks-mp.webp?v=2.3.2300' },
};

export const STUN_SPIN_MS = 700;
export const WHIRL_FX_MS = 520;

const _pending = [];
_pending.push(Assets.load(PORTAL_BEAM.url).then((tex) => {
  if (tex && tex.source) PORTAL_BEAM.tex = tex;
}).catch((err) => console.warn('[fx-strips] load failed', PORTAL_BEAM.url, err)));
for (const cfg of [STUN_STARS, WHIRL_VORTEX, FIRE_TRAIL_FX]) {
  const p = Assets.load(cfg.url).then((tex) => {
    if (!tex || !tex.source) return;
    const fw = Math.floor(tex.source.width / 8);
    for (let i = 0; i < 8; i++) {
      cfg.frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * fw, 0, fw, tex.source.height),
      }));
    }
  }).catch((err) => console.warn('[fx-strips] load failed', cfg.url, err));
  _pending.push(p);
}

/* v2.3.2300: the two block strips, six frames each. Same shape as the loop
   above but a different frame count, so it is its own loop rather than a
   parameter on that one -- the 8 there is the animation cell count and means
   something different from the 6 here. */
for (const cfg of [BLOCK_BARS.stamina, BLOCK_BARS.mana]) {
  const p = Assets.load(cfg.url).then((tex) => {
    if (!tex || !tex.source) return;
    const fw = Math.floor(tex.source.width / 6);
    for (let i = 0; i < 6; i++) {
      cfg.frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * fw, 0, fw, tex.source.height),
      }));
    }
  }).catch((err) => console.warn('[fx-strips] load failed', cfg.url, err));
  _pending.push(p);
}

/* How many blocks are lit for a pool. FLOOR, and that is the contract the whole
   readout rests on: a block is a fifth of the pool and every special costs
   exactly one (v2.3.2298), so "blocks showing" IS "specials you can still
   afford". Rounding up would show five blocks at 81% and promise a cast the
   worker would refuse. */
export function blocksFor(cur, max) {
  const m = Math.max(1, max || 1);
  const v = Math.max(0, Math.min(m, cur || 0));
  return Math.max(0, Math.min(5, Math.floor((v * 5) / m)));
}

/* Awaited by the central manifest.  allSettled, not all: a missing sheet must
   degrade to the procedural fallback, never block the loading screen. */
export function fxStripsReady() { return Promise.allSettled(_pending); }
