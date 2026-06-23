/* Weapon icon sprite loader for the Pixi renderer.
 *
 * Mirrors the Canvas 2D path in BroTown.jsx ~1346:
 *   sword / greatsword → /sprites/weapons/swords/Sword1.png
 *   bow                → /sprites/weapons/bows/Bow2.png
 *   staff              → /sprites/weapons/staffs/Wizard%20Staff2.png
 *
 * Each PNG is a single-frame icon (not a strip).  Loaded as a Pixi
 * Texture and reused by all weapon sprites in the renderer.
 */

import { Assets } from 'pixi.js';

/* Bump on every weapon-art change so URL-keyed browser/CDN caches
   refetch instead of serving the previous PNG. */
const SPRITE_VERSION = '2.3.1043b';

/* v2.3.172: per-gearBase variants. Keys are `${type}:${gearBase}`;
   the bare type key is the fallback for any unmapped gearBase. wood-
   tier swords pick the Bamboo art; higher tiers fall through to
   Sword1.png. Same pattern can be extended per BLACKSMITH_TIERS.
   v2.3.942: the greatsword has per-FACING held art (owner-drawn, grip
   pinned via handles.json greatsword-<dir>).  Keys `greatsword-<dir>`
   for the 5 canonical facings; the other 3 mirror in entityRenderer. */
const SHEETS = {
  sword:        { url: `/sprites/weapons/swords/Sword1.png?v=${SPRITE_VERSION}`,          tex: null },
  'sword:wood': { url: `/sprites/weapons/swords/Bamboo.png?v=${SPRITE_VERSION}`,          tex: null },
  greatsword:   { url: `/sprites/weapons/swords/Sword1.png?v=${SPRITE_VERSION}`,          tex: null },
  'greatsword-south':     { url: `/sprites/weapons/swords/greatsword-south.png?v=${SPRITE_VERSION}`,     tex: null },
  'greatsword-southwest': { url: `/sprites/weapons/swords/greatsword-southwest.png?v=${SPRITE_VERSION}`, tex: null },
  'greatsword-east':      { url: `/sprites/weapons/swords/greatsword-east.png?v=${SPRITE_VERSION}`,      tex: null },
  'greatsword-northeast': { url: `/sprites/weapons/swords/greatsword-northeast.png?v=${SPRITE_VERSION}`, tex: null },
  'greatsword-north':     { url: `/sprites/weapons/swords/greatsword-north.png?v=${SPRITE_VERSION}`,     tex: null },
  bow:          { url: `/sprites/weapons/bows/Bow2.png?v=${SPRITE_VERSION}`,              tex: null },
  'bow-south':     { url: `/sprites/weapons/bows/bow-south.png?v=${SPRITE_VERSION}`,     tex: null },
  'bow-southwest': { url: `/sprites/weapons/bows/bow-southwest.png?v=${SPRITE_VERSION}`, tex: null },
  'bow-east':      { url: `/sprites/weapons/bows/bow-east.png?v=${SPRITE_VERSION}`,      tex: null },
  'bow-northeast': { url: `/sprites/weapons/bows/bow-northeast.png?v=${SPRITE_VERSION}`, tex: null },
  'bow-north':     { url: `/sprites/weapons/bows/bow-north.png?v=${SPRITE_VERSION}`,     tex: null },
  staff:        { url: `/sprites/weapons/staffs/Wizard%20Staff2.png?v=${SPRITE_VERSION}`, tex: null },
};

function keyFor(type, gearBase) {
  if (gearBase && SHEETS[`${type}:${gearBase}`]) return `${type}:${gearBase}`;
  return type;
}

let loadPromise = null;

async function loadIcon(type) {
  const entry = SHEETS[type];
  if (!entry || entry.tex) return;
  try {
    const tex = await Assets.load(entry.url);
    if (tex) entry.tex = tex;
  } catch {
    /* Missing — caller falls back to procedural Graphics. */
  }
}

export function loadWeaponSprites() {
  if (loadPromise) return loadPromise;
  /* sword + greatsword share the same URL — Pixi v8 Assets dedupes
     by URL so requesting both is cheap. */
  const seen = new Set();
  const tasks = [];
  for (const type of Object.keys(SHEETS)) {
    if (seen.has(SHEETS[type].url)) continue;
    seen.add(SHEETS[type].url);
    tasks.push(loadIcon(type));
  }
  /* After the first batch resolves, dedupe types pointing at the same
     URL get filled in by re-checking each entry. */
  loadPromise = Promise.all(tasks).then(() => {
    for (const type of Object.keys(SHEETS)) {
      if (SHEETS[type].tex) continue;
      for (const other of Object.keys(SHEETS)) {
        if (SHEETS[other].url === SHEETS[type].url && SHEETS[other].tex) {
          SHEETS[type].tex = SHEETS[other].tex;
          break;
        }
      }
    }
  });
  return loadPromise;
}

/** Return the loaded texture for a weapon type (+ optional gearBase),
 *  or null if not yet loaded.  Caller falls back to procedural drawing
 *  when null.  Passing gearBase picks a tier-specific variant when one
 *  is registered (e.g. sword:wood -> Bamboo); otherwise falls back to
 *  the bare-type entry. */
export function getWeaponTexture(type, gearBase, dir) {
  /* v2.3.942/944: per-facing held art keyed `${type}-${dir}` (greatsword, bow). */
  if (dir && SHEETS[`${type}-${dir}`] && SHEETS[`${type}-${dir}`].tex) {
    return SHEETS[`${type}-${dir}`].tex;
  }
  const entry = SHEETS[keyFor(type, gearBase)];
  return (entry && entry.tex) || null;
}

export function hasWeapon(type, gearBase, dir) {
  if (dir && SHEETS[`${type}-${dir}`]) {
    return !!SHEETS[`${type}-${dir}`].tex;
  }
  const k = keyFor(type, gearBase);
  return !!(SHEETS[k] && SHEETS[k].tex);
}
