/* ═══ v2.3.1672: NPC ART (and, since v2.3.1775, world props) ═══
 *
 * One loader + one lookup for the flat world sprites: NPC figures, their
 * dialogue portraits, and the scenery in data/worldProps.js.
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
import { Assets, Rectangle, Texture } from 'pixi.js';
import { NPC_DATA } from '../data/gameDisplay.js';
import { propSpriteSources, propAnimStrips, zoneDecorSources } from '../data/worldProps.js'; /* v2.3.1775: scenery shares this registry; v2.3.2061: + animated strips; v2.3.2651: + per-zone decor */
import { loadTracked, unloadBundle } from './zoneTextures.js'; /* v2.3.2651: zone decor is freed on exit like every other per-zone sheet */

/* v2.3.2618: art an NPC's DIALOG needs warm, as opposed to art the world
   draws.  Ace's coin lands on one of these two strips the instant the server
   answers, so both ride the intro gate. */
export const NPC_DIALOG_FX = [
  '/sprites/fx/coinflip-win.webp',
  '/sprites/fx/coinflip-lose.webp',
];

/* Keys are asset paths that come from data, so Object.create(null): a plain {}
   silently no-ops on '__proto__' (CLAUDE.md — three incidents in one day). */
const _tex = Object.create(null);
let _done = null;

/* ═══ v2.3.1829: CACHE-BUST THE NPC ART ═══
 * Owner: "Mayor bro has slight gray artifact around his black top hat can you
 * remove that."  The fix repaints two shipped files at the SAME paths, and
 * nothing here carried a version — so a browser or a CDN edge holding the old
 * bytes would keep showing the grey rim, which is precisely the "it still
 * looks wrong for me" report that wastes a round trip.
 *
 * Versioned on the FETCH only; `_tex` stays keyed by the raw path so
 * getNpcTexture's callers (entityRenderer, which looks up by `npc.sprite`)
 * need no change and cannot drift out of step with the loader. */
export const NPC_ART_VERSION = '2.3.1829';
export const npcArtUrl = (src) => (src ? src + '?v=' + NPC_ART_VERSION : src);

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
    /* v2.3.2045: a WALKING NPC's per-direction strips. Listed from NPC_DATA
       like everything else here, so they ride the intro gate automatically --
       the whole reason this function is driven off the data table rather than
       a hand-kept list is that a second list is how an asset gets forgotten,
       and a forgotten asset is a first-sighting load, which the preloading law
       forbids. */
    for (const src of walkStripSources(n)) out.push(src);
  }
  /* v2.3.2618: Ace's coin-flip strips.  They are DOM <img> in his dialog,
     not Pixi textures, so like the portraits above this only warms the HTTP
     cache -- which is the whole point: the win strip is the frame a player
     stares at, and fetching it at the moment the coin lands is the first-use
     hitch CLAUDE.md's preloading law forbids.  Listed here rather than in a
     second list because a second list is how an asset gets forgotten. */
  out.push(...NPC_DIALOG_FX);
  /* v2.3.1775: world props load through the same registry and therefore the
     same intro gate.  They are static scenery, so a lazy first-sighting load
     would be exactly the hitch CLAUDE.md's preloading law forbids — and the
     alternative (a second loader) is how one of the two gets forgotten. */
  out.push(...propSpriteSources());
  return [...new Set(out)];
}

/* ═══ v2.3.2045: WALKING NPCs ═══
 *
 * Owner: "Add this as a shopkeeper who walks around in the town."
 *
 * Until now every NPC was ONE static texture -- Mayor Bro stands outside his
 * house and that is the whole of it. A figure that moves needs a frame per
 * step and a strip per facing, so `walk` on an NPC_DATA row names a strip set:
 *
 *   walk: { base: '/sprites/npc/shopkeeper-bro-walk-', frames: 4,
 *           dirs: ['south','southwest', ...] }
 *
 * Each file is one horizontal strip of `frames` cells. They are sliced into
 * Textures ONCE at load, sharing the strip's own source, rather than being
 * re-cut per frame: a Texture is a rectangle over a source, so cutting them up
 * front costs nothing at draw time and avoids allocating during the tick.
 */
function walkStripSources(n) {
  const w = n && n.walk;
  if (!w || !w.base || !Array.isArray(w.dirs)) return [];
  return w.dirs.map((d) => w.base + d + '.webp');
}

/* npcId -> dir -> [Texture]. Object.create(null) because the keys are ids and
   direction names out of a data table (CLAUDE.md rule 4). */
const _walk = Object.create(null);

function _sliceStrip(tex, frames) {
  const out = [];
  const src = tex.source;
  const fw = Math.round(tex.width / frames), fh = Math.round(tex.height);
  for (let i = 0; i < frames; i++) {
    out.push(new Texture({ source: src, frame: new Rectangle(i * fw, 0, fw, fh) }));
  }
  return out;
}

/** One frame of a walking NPC, or null when it has no walk art (or none has
 *  loaded). Callers fall back to the static `sprite`, so a missing strip is a
 *  standing NPC rather than an invisible one. */
export function getNpcWalkFrame(npcId, dir, frameIdx) {
  const byDir = _walk[npcId];
  const set = byDir && byDir[dir];
  if (!set || !set.length) return null;
  return set[((frameIdx % set.length) + set.length) % set.length];
}

/* ═══ v2.3.2061: ANIMATED PROPS ═══
 * propId -> [Texture]. Object.create(null) because the keys are ids out of a
 * data table (CLAUDE.md rule 4).
 *
 * Sliced by the SAME _sliceStrip the walking NPCs use, from the same load, on
 * the same gate. The fountain is the first prop that moves, and the cheapest
 * correct way to give it frames was to notice that a prop strip and an NPC
 * walk row are the same file shape -- one horizontal run of equal cells -- so
 * it needed a table entry and a lookup, not a second loader. */
const _propAnim = Object.create(null);

/** One frame of an animated prop, or null when it has none (or none has
 *  loaded). Callers fall back to the whole strip texture, so a missing slice
 *  is a wrong-looking prop rather than an invisible one. */
export function getPropFrame(propId, frameIdx) {
  const set = _propAnim[propId];
  if (!set || !set.length) return null;
  return set[((frameIdx % set.length) + set.length) % set.length];
}

/** How many frames a prop's animation actually has, after loading. 0 if none.
 *  The renderer needs this rather than the declared count: if the strip failed
 *  to load there is nothing to cycle, and cycling anyway would blink the prop
 *  between a texture and null. */
export function propFrameCount(propId) {
  const set = _propAnim[propId];
  return set ? set.length : 0;
}

/** Does this NPC have walk art at all? Lets the renderer decide once. */
export function hasNpcWalk(npcId) {
  const byDir = _walk[npcId];
  return !!(byDir && Object.keys(byDir).length);
}

export function loadNpcSprites() {
  if (_done) return _done;
  const srcs = npcSpriteSources();
  _done = Promise.allSettled(srcs.map((src) => Assets.load(npcArtUrl(src)).then((tex) => {
    if (!tex) return;
    /* Pixel art: NEAREST.  These are 256px frames drawn at 0.25, and a linear
       filter turns the outline into mush and makes the figure shimmer as the
       camera glides — the same reason the zone maps are nearest. */
    if (tex.source) { try { tex.source.scaleMode = 'nearest'; } catch (e) { /* older pixi */ } }
    _tex[src] = tex;
  }).catch(() => { /* a missing file leaves the emoji fallback in place */ })));
  /* Slice the walk strips once every source has settled. Deliberately AFTER
     the same promise the intro gate awaits, so a walking NPC's frames exist by
     the time the overlay lifts rather than on his first step. */
  _done = _done.then(async (r) => {
    for (const n of NPC_DATA || []) {
      const w = n && n.walk;
      if (!w || !w.base || !Array.isArray(w.dirs)) continue;
      const byDir = Object.create(null);
      for (const d of w.dirs) {
        const tex = _tex[w.base + d + '.webp'];
        if (tex) byDir[d] = _sliceStrip(tex, w.frames || 4);
      }
      if (Object.keys(byDir).length) _walk[n.id] = byDir;
    }
    /* v2.3.2061: animated props, cut in the same pass and for the same reason
       -- AFTER the promise the intro gate awaits, so a fountain has its eight
       frames before the overlay lifts rather than on first sighting. */
    for (const a of propAnimStrips()) {
      const tex = _tex[a.sprite];
      if (tex) _propAnim[a.id] = _sliceStrip(tex, a.frames);
    }
    return r;
  });
  return _done;
}

/** The loaded Texture for a sprite path, or null if it never resolved. */
export function getNpcTexture(src) {
  return (src && _tex[src]) || null;
}

/* ═══ v2.3.2651: ZONE DECOR LOADS AND UNLOADS WITH ITS ZONE ═══
 *
 * The props above ride the intro gate because they are town's, and town is
 * always one step away. Frost's six masses are not: they are ~1MB of fetch and
 * ~2.4MB of decoded RGBA that mean nothing anywhere else, which is exactly
 * what the ZONE-ASSET EXCEPTION in CLAUDE.md carves out -- and, multiplied by
 * twelve zones as other biomes get kits, exactly the resident-texture climb
 * v2.3.2272 had to go back and fix.
 *
 * THIS DOES NOT WEAKEN THE PRELOADING LAW. `preloadZoneAssets` AWAITS this
 * behind the per-zone loading overlay, so the art is warm before the overlay
 * lifts -- a deliberate loading SCREEN, not the unawaited first-sighting
 * `Assets.load` the law forbids. entityRenderer's `_updateProps` re-checks
 * `getNpcTexture` every frame while a prop's texture is EMPTY, so the sprite
 * picks its texture up the moment this resolves and nothing has to be told.
 *
 * ── ONE BUNDLE PER SPRITE, NOT PER ZONE ──
 * zoneTextures' monster bundles are per-LOADER because two variants share a
 * sheet; here the sharing is per FILE -- ART-ASSET-PHASES calls for
 * reusable-neutral pieces used by several biomes, so the day a rock cluster is
 * in both frost and hollows, a per-zone bundle would tear it out from under
 * the zone being walked INTO. Keyed by the sprite path, the subtraction below
 * is exact and that day needs no change here.
 */
function decorBundle(src) { return 'decor:' + src; }

/** Load one zone's decor into the same registry the renderer reads.
 *  Resolves to the number of sprites loaded; 0 for a zone with no decor and
 *  for the resident hubs, whose props are on the global manifest. */
export async function loadZoneDecor(zoneId) {
  const srcs = zoneDecorSources(zoneId);
  if (!srcs.length) return 0;
  await Promise.allSettled(srcs.map((src) => Promise.resolve(
    loadTracked(decorBundle(src), npcArtUrl(src)),
  ).then((tex) => {
    if (!tex) return;
    /* NEAREST, matching every other prop in this registry (see loadNpcSprites).
       These are sized so the texture lands at ~1:1 DEVICE pixels on the common
       iPhone -- 2-2.5x their world size against 2.5-2.7 device px per world px
       (docs/ART-ASSET-PHASES.md §4) -- which is the scale nearest is honest at. */
    if (tex.source) { try { tex.source.scaleMode = 'nearest'; } catch (e) { /* older pixi */ } }
    _tex[src] = tex;
  }).catch(() => { /* a missing file leaves the prop invisible, not broken */ })));
  return srcs.length;
}

/** Release the decor the departing zone used and the destination does not.
 *  Resolves to the sprite paths actually dropped, so a caller (and the
 *  texture-drift probe) can tell "freed nothing" from "was never loaded". */
export async function freeZoneDecor(fromZoneId, toZoneId) {
  if (!fromZoneId) return [];
  const going = zoneDecorSources(fromZoneId);
  if (!going.length) return [];
  /* The same subtraction freeZoneAssets does for the variant sheets, and for
     the same reason: freeing "what the old zone used" without removing "what
     the new zone uses" unloads art a prop standing in front of you is drawn
     from. No destination means nothing is kept, which is only correct when
     there is no destination. */
  const keeping = new Set(toZoneId ? zoneDecorSources(toZoneId) : []);
  const drop = going.filter((s) => !keeping.has(s));
  for (const src of drop) {
    /* Out of the registry FIRST. getNpcTexture is a plain property read on a
       per-frame path, and handing back a texture whose source has just been
       destroyed is a torn frame rather than a miss -- the miss is harmless
       (the prop waits at Texture.EMPTY), the torn texture is not. */
    delete _tex[src];
    try { await unloadBundle(decorBundle(src)); } catch (e) { /* still in use / already gone */ }
  }
  return drop;
}
