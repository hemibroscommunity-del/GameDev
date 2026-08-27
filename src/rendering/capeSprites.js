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
const _loading = Object.create(null);

export function capeBaseDir(dir) { return BASE_DIR[dir] || 'south'; }

/** The texture for this cape and facing, or null if it is not resident yet.
 *  Never kicks a load: an unawaited Assets.load on first sighting is the
 *  hitch the preloading law exists to prevent. */
export function getCapeTexture(id, dir) {
  if (!id || id === 'none') return null;
  return _tex[`${id}|${capeBaseDir(dir)}`] || null;
}

/** Load every frame of every cape.  Awaited by preloadWorldAnimations(). */
export async function preloadCapes(ids = CAPE_IDS) {
  const jobs = [];
  for (const id of ids) {
    for (const d of ['south', 'southwest', 'east', 'northeast', 'north']) {
      const key = `${id}|${d}`;
      if (_tex[key] || _loading[key]) continue;
      const url = `/sprites/traits/cape/${id}/${d}.png`;
      _loading[key] = Assets.load(url).then((t) => {
        if (t) {
          /* Pixel art: never let the GPU smooth these. */
          try { t.source.scaleMode = 'nearest'; } catch (e) { /* older pixi shape */ }
          _tex[key] = t;
        }
      }).catch(() => { /* a missing cape must not fail the whole preload */ });
      jobs.push(_loading[key]);
    }
  }
  await Promise.all(jobs);
  return Object.keys(_tex).length;
}

/** For tests and the preload report. */
export function capeFramesResident() { return Object.keys(_tex).length; }
export { Texture };
