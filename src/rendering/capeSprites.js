/* ═══ THE CAPE, AS FIVE STILLS (v2.3.2023) ═══
 *
 * Owner's contest prize: a cosmetic cape, awarded by a ticket.
 *
 * WHY THIS IS NOT A GEAR SHEET.  A garment that deforms with the body — the
 * t-shirt — is 41 sheets and 512 frames, and nothing generates that
 * coherently (docs/specs/cape-and-contest.md, and TRAPS §30 for the last
 * attempt to fix ONE arm of it by rule).  A cape is five stills, one per base
 * facing, exactly like headwear.  It does not flap.  That trade is made
 * deliberately.
 *
 * WHY THERE IS NO ANCHOR MATHS HERE.  tools/import_cape_green.py registers
 * every frame against the real `stand-<dir>.png` body and writes it into a
 * FULL 256 frame at the fitted position.  So the cape's transform is the
 * BODY SPRITE'S transform — the same thing _placeGear does for a full-frame
 * armour piece — and the mirror comes free, because the body's own scale.x
 * already carries its sign for W / NW / SE.  A cape that needed a crown anchor
 * would be a hat.
 *
 * PRELOADING IS LAW (CLAUDE.md).  These are GLOBAL (a cape is not zone
 * scoped), so preloadWorldAnimations() awaits them and nothing loads on first
 * sighting.
 */
import { Assets, Texture } from 'pixi.js';
import { loadSetLater } from './loadSetLater.js';   /* v2.3.4431: a cape that failed once is asked for again */

/* The five the art ships; west / northwest / southeast are the same textures
   drawn mirrored, which is the body's own rule (resolveDirection,
   playerSprites.js).  Kept here as data rather than an if-chain so a caller
   cannot invent a sixth. */
const BASE_DIR = {
  south: 'south', southwest: 'southwest', east: 'east',
  northeast: 'northeast', north: 'north',
  west: 'east', northwest: 'northeast', southeast: 'southwest',
};

export const CAPE_IDS = ['crimson'];

const _tex = Object.create(null);      /* `${id}|${baseDir}` -> Texture */
const _hood = Object.create(null);     /* `${id}|${baseDir}` -> Texture (hood only) */
const _hoodMask = Object.create(null); /* `${id}|${baseDir}` -> Texture (hood silhouette, opening filled) */
/* v2.3.4431: one loadSetLater per list of capes preloaded (one today) */
const _sets = new Map();
const _got = Object.create(null);

/* v2.3.2186: the facings that HAVE a hood cut, i.e. the ones where the cape is
   split across the body. north/northeast are the back view -- there the cape is
   between the viewer and the character and correctly covers them, so they stay
   a single in-front sprite and get no hood frame. See tools/cape/split-cape-hood.py. */
const SPLIT_DIRS = ['south', 'southwest', 'east'];

export function capeBaseDir(dir) { return BASE_DIR[dir] || 'south'; }

/* ═══ v2.3.4431: A CAPE THAT FAILED ONCE IS ASKED FOR AGAIN ═══
   Each still was one Assets.load behind a latch kept after a failure: one
   failed or stalled request and that facing of the cape (or its hood, or the
   hood's hair clip) was missing for the visit (state-machine sweep VC-1,
   R8-5).  Now the stills are a loadSetLater set: a time limit, then
   retryLooks.js's rounds (5 s, 10, 20, 40, every minute, ten at most), asked
   only while a cape is drawn (the getters below), each round past the cache.
   The loading screen still waits for every first load and never past its
   failure.  `?caperetry=0` (or `?retrylooks=0`) is the game as it was. */
function _ensureCapes() { for (const set of _sets.values()) set.ensure(); }

/** The texture for this cape and facing, or null if it is not resident yet.
 *  Never kicks a first load: an unawaited Assets.load on first sighting is the
 *  hitch the preloading law exists to prevent (a failed preload's later
 *  round is the retry rule, docs/specs/retry-looks.md). */
export function getCapeTexture(id, dir) {
  if (!id || id === 'none') return null;
  _ensureCapes();
  return _tex[`${id}|${capeBaseDir(dir)}`] || null;
}

/** The HOOD-ONLY texture: the cape above its clasp, drawn IN FRONT of the body
 *  while getCapeTexture's full frame draws BEHIND it, so the torso occludes the
 *  panels instead of the panels covering the torso (v2.3.2186).
 *  null for north/northeast BY DESIGN — the caller reads that as "this facing
 *  is not split", not as "the art failed to load". */
export function getCapeHoodTexture(id, dir) {
  if (!id || id === 'none') return null;
  return _hood[`${id}|${capeBaseDir(dir)}`] || null;
}

/** The hood's SILHOUETTE with its face opening filled — the shape hair is
 *  clipped to so it cannot poke out past the hood (v2.3.2186). Hair already
 *  draws under the hood, so z-order was never the problem: what shows is hair
 *  reaching beyond the hood's outline, and only a clip removes that. */
export function getCapeHoodMaskTexture(id, dir) {
  if (!id || id === 'none') return null;
  return _hoodMask[`${id}|${capeBaseDir(dir)}`] || null;
}

/* where each kind of still goes once it is in (`kind` is the key's third part) */
function _tookCape(k, t) {
  /* Pixel art: never let the GPU smooth these. */
  try { t.source.scaleMode = 'nearest'; } catch (e) { /* older pixi shape */ }
  const [id, d, kind] = k.split('|');
  const into = kind === 'hood' ? _hood : kind === 'hoodmask' ? _hoodMask : _tex;
  into[`${id}|${d}`] = t;
}

/** Load every frame of every cape.  Awaited by preloadWorldAnimations(). */
export async function preloadCapes(ids = CAPE_IDS) {
  const sk = ids.join(',');
  let set = _sets.get(sk);
  if (!set) {
    const files = Object.create(null);
    for (const id of ids) {
      for (const d of ['south', 'southwest', 'east', 'northeast', 'north']) files[`${id}|${d}`] = `/sprites/traits/cape/${id}/${d}.png`;
      /* PRELOADING IS LAW (CLAUDE.md): the hood halves go up with the capes,
         in the same awaited pass. A hood that loaded on first sighting would
         pop in over a character already wearing the back half. */
      for (const d of SPLIT_DIRS) {
        files[`${id}|${d}|hood`] = `/sprites/traits/cape/${id}/hood/${d}.png`;
        files[`${id}|${d}|hoodmask`] = `/sprites/traits/cape/${id}/hood/hairmask-${d}.png`;
      }
    }
    set = loadSetLater({ files, into: _got, load: (u) => Assets.load(u), unload: (u) => Assets.unload(u),
      took: _tookCape, switchName: 'caperetry' });
    _sets.set(sk, set);
  }
  await set.start();
  return Object.keys(_tex).length;
}

/** For tests and the preload report. */
export function capeFramesResident() { return Object.keys(_tex).length; }
export function capeHoodFramesResident() { return Object.keys(_hood).length; }
export function capeHoodMasksResident() { return Object.keys(_hoodMask).length; }
export { Texture };
