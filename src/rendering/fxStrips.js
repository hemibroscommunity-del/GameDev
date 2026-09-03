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

/* Awaited by the central manifest.  allSettled, not all: a missing sheet must
   degrade to the procedural fallback, never block the loading screen. */
export function fxStripsReady() { return Promise.allSettled(_pending); }
