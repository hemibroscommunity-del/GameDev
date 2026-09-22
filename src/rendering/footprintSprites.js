/* ═══ v2.3.2654: SNOW FOOTPRINTS — the game's first grounding cue ═══
 *
 * Owner supplied a four-frame footprint-pair fade.  It lands in a game that
 * has NO grounding cue at all: the shared contact-shadow ellipse was removed
 * at v2.3.2632 because it looked worse than nothing, and DEPTH-ROADMAP §7
 * explains why that was structural rather than a tuning miss -- a symmetric
 * blob is a shadow for a scene lit from directly overhead, and BroTown's maps
 * are painted with their own light.
 *
 * TERRAIN REACTION IS THE PATH THAT AVOIDS THAT TRAP.  A print pressed into
 * snow commits to no light direction at all; it is a hole, and a hole reads
 * the same whatever the sun is doing.  That is the whole reason this is the
 * grounding cue that ships first.
 *
 * ── SNOW ONLY, AND THAT IS THE HONEST SCOPE ──
 * The art is snow.  Dirt, grass and sand prints are different art that does
 * not exist, and tinting a snow print brown would look like a snow print that
 * is brown.  So this is PER-ZONE art on the frost budget rather than global
 * art on the intro gate -- it follows the ZONE-ASSET EXCEPTION exactly, and
 * the day another biome gets its own strip it joins FOOTPRINT_ART with its
 * own file instead of reusing this one.
 *
 * At 380x96 the whole strip is 0.139MB decoded, against frost's 6.00MB cap
 * (docs/ART-ASSET-PHASES.md §2) -- rounding error, which is what a grounding
 * cue should cost.
 */
import { Rectangle, Texture } from 'pixi.js';
import { loadTracked, unloadBundle } from './zoneTextures.js';

/* zone -> its ground-reaction strip.  A Map-shaped lookup guarded by
   hasOwnProperty because zone ids come from state (CLAUDE.md rule 4). */
const FOOTPRINT_ART = Object.create(null);
FOOTPRINT_ART.frost = { url: '/sprites/fx/snow-footprints.webp', frames: 4 };

/** Does this zone leave prints? Read by the spawner so a zone with no art
 *  costs nothing per frame rather than spawning invisible decals. */
export function zoneLeavesPrints(zoneId) {
  return !!(zoneId && Object.prototype.hasOwnProperty.call(FOOTPRINT_ART, zoneId));
}

/* zone -> [Texture] once sliced. */
const _frames = Object.create(null);
const bundleOf = (zoneId) => 'footprints:' + zoneId;

/** The sliced frames for a zone, or null while unloaded. */
export function footprintFrames(zoneId) {
  if (!zoneId) return null;
  return (Object.prototype.hasOwnProperty.call(_frames, zoneId) && _frames[zoneId]) || null;
}

/** Load and slice one zone's prints.  Awaited by preloadZoneAssets behind the
 *  per-zone overlay, so the first step a player takes already has its art. */
export async function loadFootprints(zoneId) {
  if (!zoneLeavesPrints(zoneId)) return 0;
  if (_frames[zoneId]) return _frames[zoneId].length;
  const art = FOOTPRINT_ART[zoneId];
  try {
    const tex = await loadTracked(bundleOf(zoneId), art.url);
    if (!tex) return 0;
    /* LINEAR, unlike the props next door.  A print is drawn at ~40 world px
       from a 95px frame -- a 2.4x MINIFICATION -- and nearest sampling at that
       ratio makes the soft snow rim crawl as the camera glides.  The props are
       sized to land near 1:1 on the common iPhone (ART-ASSET-PHASES §4) where
       nearest is honest; this one is not, so it does not pretend to be. */
    if (tex.source) { try { tex.source.scaleMode = 'linear'; } catch (e) { /* older pixi */ } }
    const n = art.frames || 1;
    const fw = Math.round(tex.width / n), fh = Math.round(tex.height);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(new Texture({ source: tex.source, frame: new Rectangle(i * fw, 0, fw, fh) }));
    }
    _frames[zoneId] = out;
    return out.length;
  } catch (e) {
    return 0;   /* missing art leaves no prints; it does not break the walk */
  }
}

/** Release a departing zone's prints, keeping anything the destination uses.
 *  Same subtraction as the decor and the variant sheets. */
export async function freeFootprints(fromZoneId, toZoneId) {
  if (!fromZoneId || !zoneLeavesPrints(fromZoneId)) return false;
  if (toZoneId && FOOTPRINT_ART[toZoneId] && FOOTPRINT_ART[toZoneId].url === FOOTPRINT_ART[fromZoneId].url) return false;
  /* Drop the slices BEFORE the unload: the renderer reads footprintFrames on a
     per-frame path, and handing back a Texture whose source has just been
     destroyed is a torn frame rather than a miss (v2.3.2651's lesson, which
     CLAUDE.md's ZONE-ASSET EXCEPTION now states as a rule). */
  delete _frames[fromZoneId];
  try { await unloadBundle(bundleOf(fromZoneId)); } catch (e) { /* still in use / already gone */ }
  return true;
}

/* Dev probe, house style: which zones currently hold print art. */
if (typeof window !== 'undefined') {
  window.__btFootprints = () => Object.keys(_frames).filter((z) => _frames[z]);
}
