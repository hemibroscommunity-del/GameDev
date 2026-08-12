/* ═══ v2.3.1672: NPC ART ═══
 *
 * One loader + one lookup for NPC figure sprites (today: Mayor Bro).
 *
 * WHY A REGISTRY RATHER THAN Assets.cache.get().  The first version of this
 * read the texture straight out of Pixi's cache by URL and got
 * "[Assets] Asset id /sprites/npc/mayor-bro.webp was not found in the Cache"
 * on every frame — Pixi v8 keys the cache by its own RESOLVED id, which is not
 * reliably the URL you passed to `load`.  tileRenderer hits the same wall with
 * the zone maps and papers over it by re-issuing Assets.load on a miss; that
 * works for a map, but for an NPC it would be precisely the lazy first-use
 * load that CLAUDE.md forbids.  So this module keeps the Texture object the
 * loader resolved.  No key guessing, and the renderer's lookup is a plain
 * property read that cannot miss once the loading screen has finished.
 *
 * The manifest (preloadAnimations.js) calls loadNpcSprites() behind the intro
 * gate; the renderer calls getNpcTexture().  Deliberately no load-on-demand
 * path: if art is missing the NPC falls back to its emoji, which is a visible
 * bug rather than a mid-play hitch.
 */
import { Assets } from 'pixi.js';
import { NPC_DATA } from '../data/gameDisplay.js';

/* Keys are asset paths that come from data, so Object.create(null): a plain {}
   silently no-ops on '__proto__' (CLAUDE.md — three incidents in one day). */
const _tex = Object.create(null);
let _done = null;

/** Every distinct sprite named by NPC_DATA.  Driven off the data table so a
 *  new NPC sprite is registered by adding the field and nothing else — a
 *  second hand-maintained list is how an asset gets forgotten. */
export function npcSpriteSources() {
  /* Both the world figure AND the dialogue portrait (v2.3.1673).  The portrait
     is a DOM <img>, not a Pixi texture, so Assets.load only warms the HTTP
     cache for it — which is the point: the quest panel must not pop a blank
     square on the frame it opens. */
  const out = [];
  for (const n of NPC_DATA || []) {
    if (!n) continue;
    if (n.sprite) out.push(n.sprite);
    if (n.portrait) out.push(n.portrait);
  }
  return [...new Set(out)];
}

export function loadNpcSprites() {
  if (_done) return _done;
  const srcs = npcSpriteSources();
  _done = Promise.allSettled(srcs.map((src) => Assets.load(src).then((tex) => {
    if (!tex) return;
    /* Pixel art: NEAREST.  These are 256px frames drawn at 0.25, and a linear
       filter turns the outline into mush and makes the figure shimmer as the
       camera glides — the same reason the zone maps are nearest. */
    if (tex.source) { try { tex.source.scaleMode = 'nearest'; } catch (e) { /* older pixi */ } }
    _tex[src] = tex;
  }).catch(() => { /* a missing file leaves the emoji fallback in place */ })));
  return _done;
}

/** The loaded Texture for a sprite path, or null if it never resolved. */
export function getNpcTexture(src) {
  return (src && _tex[src]) || null;
}
