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
import { Assets, Cache, Rectangle, Texture } from 'pixi.js';
import { NPC_DATA } from '../data/gameDisplay.js';
import { propSpriteSources, propSpriteSourcesIn, propAnimStrips, zoneDecorSources } from '../data/worldProps.js'; /* v2.3.1775: scenery shares this registry; v2.3.2061: + animated strips; v2.3.2651: + per-zone decor; v2.3.2792: + per-hub split */
import { loadCroppedStrip } from './gearSheets.js'; /* v2.3.2792: the NPC walk strips load cropped */
import { loadTracked, unloadBundle, bundleLoaded } from './zoneTextures.js'; /* v2.3.2651: zone decor is freed on exit like every other per-zone sheet */

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
/* v2.3.2792: the hub whose NPCs and props load and free with it (loadTownScenery) */
const TOWN = 'town';
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
  /* v2.3.2792: the world figures, the walk strips and town's props are NOT in
     this list any more -- they load and free with town (loadTownScenery,
     below).  What stays global is what can be seen away from town: the
     dialogue portraits and Ace's coin strips (DOM images, only warming the
     HTTP cache) and any resident prop that is not town's (none today). */
  /* Both the world figure AND the dialogue portrait (v2.3.1673).  The portrait
     is a DOM <img>, not a Pixi texture, so Assets.load only warms the HTTP
     cache for it — which is the point: the quest panel must not pop a blank
     square on the frame it opens. */
  const out = [];
  for (const n of NPC_DATA || []) {
    if (!n) continue;
    if (n.portrait) out.push(n.portrait);
    /* v2.3.2045: a WALKING NPC's per-direction strips. Listed from NPC_DATA
       like everything else here, so they ride the intro gate automatically --
       the whole reason this function is driven off the data table rather than
       a hand-kept list is that a second list is how an asset gets forgotten,
       and a forgotten asset is a first-sighting load, which the preloading law
       forbids.  (v2.3.2792: listed from the same table by townScenery()
       now, for the same reason.) */
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
  const town = new Set(propSpriteSourcesIn(TOWN));
  out.push(...propSpriteSources().filter((src) => !town.has(src)));
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
  /* v2.3.2792: the walk strips and the animated props used to be sliced here,
     after the same promise.  They are town's, so they moved to
     loadTownScenery with the rest of town. */
  return _done;
}

/* ═══ v2.3.2792: TOWN'S NPCs AND BUILDINGS LOAD AND FREE WITH TOWN ═══
 *
 * Owner: "Is there any other memory savings ... (Or removed from the mostly
 * costly memory?)" -- then "Yeah do that".  Measured (tex-attrib, v2.3.2791):
 * Ember held 35.4MB of town art -- sixteen NPC walk strips at 1MB each, the
 * fountain's 3.4MB strip, four 1MB buildings -- none of which any zone but
 * town can draw (S.npcs is only ever set by _spawnTownNpcs; every resident
 * prop is zone 'town').  The v2.3.1672 note on the manifest predicted it: "If
 * NPC art ever grows past a handful of figures, move it to preloadZoneAssets
 * and free it on zone exit."
 *
 * So it follows the ZONE-ASSET EXCEPTION like every per-zone sheet: loaded
 * AWAITED behind a loading overlay, freed a beat after you leave.  It is not a
 * lazy load -- the game never draws town without it (zoneTransitions'
 * syncTownScenery holds the player under the overlay until townSceneryReady()),
 * and the intro gate still loads it, because town is where you start.
 *
 * And the walk strips load CROPPED (gearSheets.loadCroppedStrip, the same
 * packer as the armour): a 1024x256 strip of four figures is 57-58% empty
 * frame, and a Texture with `orig` = the whole frame draws in the same place.
 * That part is a saving IN town too.  The fountain and the buildings fill
 * their frames, so they load whole, through loadTracked, as before.
 *
 * Freeing is three kinds of thing, all listed here as they load so nothing is
 * re-derived at free time: registry keys (_townKeys), the cropped canvases
 * (_townCrops -- not Assets-owned, so released by hand, including the Cache
 * entry Texture.from made for the canvas), and the Assets bundle. */
const TOWN_BUNDLE = 'town-scenery';
let _town = null;          /* the load in flight or done, else null */
let _townReady = false;    /* synchronous "town can be drawn": the gate reads this every frame */
let _townUnload = null;    /* a free's Assets.unload still running; a reload waits for it */
const _townKeys = [];
const _townCrops = [];
const _townAnimIds = [];

/** What town draws: every NPC's walk strips (cropped), every NPC figure that
 *  is not itself a walk strip, and town's props.  Driven off the data tables
 *  so a new NPC or prop is scoped by adding the row and nothing else. */
function townScenery() {
  const strips = [];
  const stills = [];
  const stripSrc = new Set();
  for (const n of NPC_DATA || []) {
    const w = n && n.walk;
    if (!w || !w.base || !Array.isArray(w.dirs)) continue;
    for (const d of w.dirs) {
      const src = w.base + d + '.webp';
      strips.push({ id: n.id, dir: d, src, frames: w.frames || 4 });
      stripSrc.add(src);
    }
  }
  for (const n of NPC_DATA || []) {
    if (n && n.sprite && !stripSrc.has(n.sprite)) stills.push(n.sprite);
  }
  stills.push(...propSpriteSourcesIn(TOWN));
  return { strips, stills: [...new Set(stills)] };
}

/** Load town's NPCs and props.  Idempotent; resolves when every file has
 *  settled (a missing one leaves that NPC on its emoji, as before). */
export function loadTownScenery() {
  if (_town) return _town;
  const { strips, stills } = townScenery();
  const keys = [], crops = [], animIds = [];
  const walk = Object.create(null);
  const run = Promise.resolve(_townUnload).catch(() => {}).then(() => Promise.allSettled([
    ...strips.map((s) => loadCroppedStrip(npcArtUrl(s.src), s.frames).then((frames) => {
      const src = frames && frames[0] && frames[0].source;
      if (!src) return;
      /* NEAREST, as every NPC texture (see loadNpcSprites); the cropper hands
         back a linear source because its other callers are smooth fx. */
      try { src.scaleMode = 'nearest'; } catch (e) { /* older pixi */ }
      crops.push({ src, frames });
      (walk[s.id] || (walk[s.id] = Object.create(null)))[s.dir] = frames;
    })),
    ...stills.map((src) => Promise.resolve(loadTracked(TOWN_BUNDLE, npcArtUrl(src))).then((tex) => {
      if (!tex) return;
      if (tex.source) { try { tex.source.scaleMode = 'nearest'; } catch (e) { /* older pixi */ } }
      _tex[src] = tex;
      keys.push(src);
    })),
  ])).then((r) => {
    if (_town !== run) {
      /* Freed (or superseded) while loading: nothing of this load may be
         published, and its crops go back now rather than never. */
      _releaseCrops(crops);
      return r;
    }
    for (const id in walk) _walk[id] = walk[id];
    /* A walking NPC's `sprite` is his south strip.  Point it at the first
       CROPPED south frame, so the one lookup that asks for it (entityRenderer's
       figure fallback) gets a single figure rather than nothing. */
    for (const n of NPC_DATA || []) {
      const f = n && n.sprite && _walk[n.id] && _walk[n.id].south && _walk[n.id].south[0];
      if (f && !_tex[n.sprite]) { _tex[n.sprite] = f; keys.push(n.sprite); }
    }
    /* v2.3.2061: the animated props, cut from their loaded strip as before. */
    for (const a of propAnimStrips()) {
      if (a.zone !== TOWN) continue;
      const tex = _tex[a.sprite];
      if (tex) { _propAnim[a.id] = _sliceStrip(tex, a.frames); animIds.push(a.id); }
    }
    _townKeys.push(...keys);
    _townCrops.push(...crops);
    _townAnimIds.push(...animIds);
    _townReady = true;
    return r;
  });
  _town = run;
  return run;
}

/** True once town can be drawn with its real art.  Synchronous, for the
 *  per-frame gate in zoneTransitions. */
export function townSceneryReady() { return _townReady; }

/** Is a load in flight?  The free waits for it rather than racing it. */
export function townSceneryLoading() { return !!_town && !_townReady; }

function _releaseCrops(list) {
  for (const c of list) {
    for (const t of c.frames || []) { try { t.destroy(false); } catch (e) { /* gone */ } }
    const src = c.src;
    const cv = src && src.resource;
    try { if (src && !src.destroyed) src.destroy(); } catch (e) { /* gone */ }
    /* Texture.from(canvas) parked a Texture under the canvas in Cache, and it
       is only removed when THAT texture is destroyed -- which nothing holds.
       Left, the canvas's pixels stay reachable for the life of the page. */
    try { if (cv && Cache.has(cv)) Cache.remove(cv); } catch (e) { /* older pixi */ }
    try { if (cv && 'width' in cv) { cv.width = 0; cv.height = 0; } } catch (e) { /* not a canvas */ }
  }
}

/** Release town's art.  Returns false (and does nothing) while a load is in
 *  flight, so the caller simply tries again a frame later.  The renderer must
 *  already have let go: entityRenderer destroys NPC displays that left S.npcs
 *  and resets props of another zone to Texture.EMPTY (v2.3.2651), which is why
 *  the caller runs this a beat after the zone change, not on it. */
export function freeTownScenery() {
  if (!_town) return true;
  if (!_townReady) return false;
  _town = null;
  _townReady = false;
  /* Registry first: a lookup that misses waits at Texture.EMPTY; one that
     returns a destroyed source throws inside Pixi (v2.3.2651's alphaMode). */
  for (const k of _townKeys.splice(0)) delete _tex[k];
  for (const id of Object.keys(_walk)) delete _walk[id];
  for (const id of _townAnimIds.splice(0)) {
    for (const t of _propAnim[id] || []) { try { t.destroy(false); } catch (e) { /* gone */ } }
    delete _propAnim[id];
  }
  _releaseCrops(_townCrops.splice(0));
  _townUnload = unloadBundle(TOWN_BUNDLE).catch(() => 0);
  return true;
}

/* QA probe, house style: is town's art resident, and how much of it. */
if (typeof window !== 'undefined') {
  window.__btTownScenery = function () {
    let bytes = 0, whole = 0;
    for (const c of _townCrops) {
      bytes += (c.src.pixelWidth || c.src.width || 0) * (c.src.pixelHeight || c.src.height || 0) * 4;
      const o = c.frames[0] && c.frames[0].orig;
      if (o) whole += o.width * o.height * c.frames.length * 4;
    }
    return { ready: _townReady, loading: townSceneryLoading(), keys: _townKeys.length,
      walkers: Object.keys(_walk).length, crops: _townCrops.length, cropMb: +(bytes / 1048576).toFixed(2), wholeMb: +(whole / 1048576).toFixed(2),
      bundle: bundleLoaded(TOWN_BUNDLE) };
  };
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
