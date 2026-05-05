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

const SHEETS = {
  sword:      { url: '/sprites/weapons/swords/Sword1.png',          tex: null },
  greatsword: { url: '/sprites/weapons/swords/Sword1.png',          tex: null },
  bow:        { url: '/sprites/weapons/bows/Bow2.png',              tex: null },
  staff:      { url: '/sprites/weapons/staffs/Wizard%20Staff2.png', tex: null },
};

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

/** Return the loaded texture for a weapon type, or null if not yet
 *  loaded.  Caller falls back to procedural drawing when null. */
export function getWeaponTexture(type) {
  const entry = SHEETS[type];
  return (entry && entry.tex) || null;
}

export function hasWeapon(type) {
  return !!(SHEETS[type] && SHEETS[type].tex);
}
