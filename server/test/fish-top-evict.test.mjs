/* A FISHING OVERLAY PUSHED OUT IS LET GO OF FOR GOOD -- v2.3.4157
 * (the state-machine sweep of 2026-11-03, V17b R1-8; TRAPS §139).
 *
 * An angler in a shirt, a plate or greaves is drawn with an overlay on top
 * (the head, the rod and the hand on it), made on a canvas for each frame of
 * the cast and kept in a cache of 64 (entityRenderer _fishTopFrame).  Three
 * anglers in different outfits on one screen want 96, so the cache turns over
 * every frame -- and each overlay it pushed out was destroyed with its source
 * but left its canvas in Pixi's Cache, which Texture.from(canvas) keys by the
 * canvas: about 4 MB a second, until an iPhone tab dies.  The rule
 * (src/rendering/fishTopEvict.js, no imports) runs here in node, with
 * stand-ins for Pixi:
 *   1. stored past the cap, the least recently drawn is let go of, once; one
 *      still held never is;
 *   2. let go of: a sprite still showing it is pointed at Texture.EMPTY and
 *      hidden BEFORE its source is freed, the copy the cache held is destroyed
 *      without its source, and the source handed over with its canvas; a
 *      sprite showing another overlay is left alone; a destroyed one leaves
 *      the list;
 *   3. replayed: three anglers fishing for a minute, the renderer's OWN store
 *      statement (cut from entityRenderer.js) run against a stand-in of Pixi's
 *      Cache with the real releaseCanvasSource: before this version every
 *      canvas pushed out stayed in the Cache; now only the 64 held do, and an
 *      angler skipped by the renderer is not left drawing a freed overlay;
 *   4. the wiring. */
import { readFileSync } from 'fs';
import { storeFishTop, holdFishTop, releaseFishTop } from '../../src/rendering/fishTopEvict.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const ROOT = new URL('../../', import.meta.url).pathname;
const ER = readFileSync(ROOT + 'src/rendering/systems/entityRenderer.js', 'utf8');

/* ── stand-ins for Pixi 8, as far as this path reads them ──
   Texture.from(canvas) parks a texture in the Cache keyed by the canvas, and
   that entry leaves only when THAT texture is destroyed (pixi textureFrom.mjs
   resourceToTexture; TRAPS §139).  A source destroyed drops its resource. */
function fakeCache() {
  const m = new Map();
  return { has: (k) => m.has(k), get: (k) => m.get(k), set: (k, v) => { m.set(k, v); }, remove: (k) => { m.delete(k); }, keys: () => m.keys(), get size() { return m.size; } };
}
let canvases = 0;
function fakeCanvas(w = 128, h = 128) { canvases++; return { width: w, height: h, getContext: () => ({}) }; }
class FakeSource {
  constructor(resource) { this.resource = resource; this.destroyed = false; this.destroys = 0; }
  destroy() { this.destroys++; this.destroyed = true; this.resource = null; }
}
class FakeTexture {
  constructor(o = {}) { this._source = o.source || null; this.destroyed = false; this.destroyCalls = []; this._onDestroy = []; this.uid = FakeTexture.next++; }
  get source() { return this._source; }
  on(ev, fn) { if (ev === 'destroy') this._onDestroy.push(fn); }
  destroy(destroySource = false) {
    this.destroyCalls.push(destroySource);
    if (this._source && destroySource) { this._source.destroy(); this._source = null; }
    this.destroyed = true;
    for (const fn of this._onDestroy) fn(this);
  }
}
FakeTexture.next = 1;
const EMPTY = new FakeTexture({ source: new FakeSource(null) });
EMPTY.label = 'EMPTY';
function textureFrom(Cache, cv) {
  if (Cache.has(cv)) return Cache.get(cv);
  const t = new FakeTexture({ source: new FakeSource(cv) });
  t.on('destroy', () => { if (Cache.has(cv)) Cache.remove(cv); });
  Cache.set(cv, t);
  return t;
}
/* the overlay as _fishTopFrame makes it: `new Texture({ source: Texture.from(cv).source })` */
const bake = (Cache) => new FakeTexture({ source: textureFrom(Cache, fakeCanvas()).source });
function fakeSprite() { return { texture: EMPTY, visible: false, destroyed: false }; }

/* the REAL releaseCanvasSource (src/rendering/releaseCanvasTexture.js), its
   one import -- Pixi's Cache -- handed in as the stand-in */
const RCT = readFileSync(ROOT + 'src/rendering/releaseCanvasTexture.js', 'utf8');
const RCT_IMPORT = "import { Cache } from 'pixi.js';";
check('0. releaseCanvasTexture.js imports Pixi\'s Cache and nothing else (this suite hands it in)',
  RCT.includes(RCT_IMPORT) && (RCT.match(/^import /gm) || []).length === 1);
const realReleaseFor = new Function('Cache', '"use strict";\n'
  + RCT.replace(RCT_IMPORT, '').replace(/^export function /gm, 'function ')
  + '\nreturn releaseCanvasSource;');

/* ── 1. store and trim ── */
{
  const cache = new Map(), released = [];
  const tex = Array.from({ length: 70 }, (_, i) => ({ id: i }));
  for (let i = 0; i < 64; i++) storeFishTop(cache, 'k' + i, tex[i], 64, (t) => released.push(t));
  check('1a. up to the cap nothing is let go of', released.length === 0 && cache.size === 64);
  storeFishTop(cache, 'k64', tex[64], 64, (t) => released.push(t));
  check('1b. one past the cap: the least recently drawn goes, out of the cache, handed over once',
    released.length === 1 && released[0] === tex[0] && !cache.has('k0') && cache.size === 64, released.map((t) => t.id));
  /* a hit moves its key to the back, as _fishTopFrame's does */
  const hit = (k) => { const v = cache.get(k); cache.delete(k); cache.set(k, v); return v; };
  hit('k1');
  storeFishTop(cache, 'k65', tex[65], 64, (t) => released.push(t));
  check('1c. one drawn since is kept: the next least recently drawn goes instead',
    released.length === 2 && released[1] === tex[2] && cache.has('k1'), released.map((t) => t.id));
  const r = storeFishTop(cache, 'k66', tex[66], 64, (t) => released.push(t));
  check('1d. the one just stored is returned and held', r === tex[66] && cache.get('k66') === tex[66]);
  const held = new Set(cache.values());
  check('1e. nothing still held was ever handed over', released.every((t) => !held.has(t)));
  /* a key stored again lets go of the overlay it held (never the same one twice) */
  const before = released.length;
  storeFishTop(cache, 'k66', tex[67], 64, (t) => released.push(t));
  check('1f. a key stored again: its old overlay is let go of once, the new one held',
    released.length === before + 1 && released[before] === tex[66] && cache.get('k66') === tex[67] && cache.size === 64);
  storeFishTop(cache, 'k66', tex[67], 64, (t) => released.push(t));
  check('1g. the same overlay stored again under its key is not let go of', released.length === before + 1 && cache.get('k66') === tex[67]);
  /* a release that throws still leaves the cache at its cap */
  storeFishTop(cache, 'k68', tex[68], 64, () => { throw new Error('older pixi'); });
  check('1h. a release that throws: the overlay is still out of the cache, the cap kept', cache.size === 64 && cache.get('k68') === tex[68]);
  const one = new Map(), rel1 = [];
  storeFishTop(one, 'a', tex[0], 0, (t) => rel1.push(t));
  check('1i. a cap below one is one: the overlay just stored is never let go of', one.get('a') === tex[0] && rel1.length === 0);
}

/* ── 2. letting go of one ── */
{
  const Cache = fakeCache();
  const ot = bake(Cache), other = bake(Cache);
  const cv = ot.source.resource;
  const showing = fakeSprite(), showingOther = fakeSprite(), gone = fakeSprite(), bare = fakeSprite();
  const shown = new Set();
  showing.texture = ot; showing.visible = true; holdFishTop(shown, showing);
  showingOther.texture = other; showingOther.visible = true; holdFishTop(shown, showingOther);
  gone.texture = ot; holdFishTop(shown, gone);
  holdFishTop(shown, bare);
  check('2a. every sprite given an overlay is on the list once', shown.size === 4 && (holdFishTop(shown, showing), shown.size === 4));
  gone.destroyed = true;   /* its display went (destroy({ children: true })) */
  const seen = [];
  releaseFishTop(ot, shown, EMPTY, (src) => {
    seen.push({ src, res: src.resource, srcDestroyed: src.destroyed, sprite: showing.texture, visible: showing.visible, wrapper: ot.destroyed, calls: ot.destroyCalls.slice() });
  });
  const s0 = seen[0] || {};
  check('2b. the source is handed over once, with its canvas (not already destroyed)', seen.length === 1 && s0.res === cv && !s0.srcDestroyed, { n: seen.length });
  check('2c. the sprite showing it points at Texture.EMPTY, hidden, BEFORE the source is let go of', s0.sprite === EMPTY && s0.visible === false);
  check('2d. the copy the cache held is destroyed without its source, before the source goes', s0.wrapper === true && s0.calls.length === 1 && s0.calls[0] === false, s0.calls);
  check('2e. a sprite showing another overlay is left as it is', showingOther.texture === other && showingOther.visible === true && shown.has(showingOther));
  check('2f. a destroyed sprite, and the one pointed away, leave the list; the live ones stay', !shown.has(gone) && !shown.has(showing) && shown.has(bare) && shown.has(showingOther), shown.size);
  /* the sweep when a new sprite is put on the list */
  const later = fakeSprite();
  bare.destroyed = true;
  holdFishTop(shown, later);
  check('2g. putting a new sprite on the list drops any destroyed since', !shown.has(bare) && shown.has(later) && shown.has(showingOther) && shown.size === 2);
  /* the real releaseCanvasSource on that source: the Cache entry and the canvas go */
  const Cache2 = fakeCache(), real = realReleaseFor(Cache2);
  const t2 = bake(Cache2), cv2 = t2.source.resource;
  releaseFishTop(t2, new Set(), EMPTY, real);
  check('2h. with the real releaseCanvasSource: the source destroyed, the canvas out of the Cache and zeroed',
    t2.destroyed && Cache2.size === 0 && !Cache2.has(cv2) && cv2.width === 0 && cv2.height === 0);
  releaseFishTop(null, new Set(), EMPTY, () => { throw new Error('never'); });
  check('2i. nothing to let go of: nothing done', true);
}

/* ── 3. replayed: three anglers fishing for a minute, the renderer's own store ── */
/* The statement(s) between the bake and `return tex;` in _fishTopFrame, run
   as the renderer runs them; the names it may use handed in. */
const FT = ER.indexOf('function _fishTopFrame(');
const FT_END = FT > 0 ? ER.indexOf('\nfunction ', FT + 10) : -1;
const BAKE = 'const tex = new Texture({ source: Texture.from(cv).source });';
const at0 = ER.indexOf(BAKE, FT), at1 = ER.indexOf('return tex;', at0);
const storeSrc = (FT > 0 && at0 > FT && at1 > at0 && at1 < FT_END) ? ER.slice(at0 + BAKE.length, at1) : '';
check('3a. _fishTopFrame still makes the overlay as this suite models it, and stores it before it is returned', storeSrc.length > 0);
const capM = /const FISH_TOP_CAP = (\d+);/.exec(ER);

function pond(anglers, seconds, opt = {}) {
  const Cache = fakeCache(), real = realReleaseFor(Cache);
  const _fishTopCache = new Map(), shown = new Set();
  const handedOver = new Map();
  const _releaseFishTop = (t) => { handedOver.set(t, (handedOver.get(t) || 0) + 1); releaseFishTop(t, shown, EMPTY, real); };
  const store = new Function('_fishTopCache', 'key', 'tex', 'storeFishTop', 'FISH_TOP_CAP', '_releaseFishTop', storeSrc);
  const sprites = Array.from({ length: anglers }, fakeSprite);
  let made = 0, freedShown = 0;
  const stale = opt.stale ? fakeSprite() : null;
  const draw = (who, frame) => {
    const key = 'outfit' + who + '/f' + frame + '|fishtop';
    let t = _fishTopCache.get(key);
    if (t) { _fishTopCache.delete(key); _fishTopCache.set(key, t); }
    else { t = bake(Cache); made++; store(_fishTopCache, key, t, storeFishTop, capM ? +capM[1] : 64, _releaseFishTop); }
    return t;
  };
  if (stale) {
    /* a display the renderer skips after one frame (no body frame this frame,
       far-culled), its head sprite left showing its overlay */
    stale.texture = draw('S', 0); stale.visible = true; holdFishTop(shown, stale);
  }
  /* the cast's 32 frames at 24 a second, every angler a frame on */
  for (let step = 0; step < seconds * 24; step++) {
    for (let a = 0; a < anglers; a++) {
      const t = draw(a, (step + a * 7) % 32);
      const hd = sprites[a];
      if (hd.texture !== t) { hd.texture = t; holdFishTop(shown, hd); }
      hd.visible = true;
    }
    /* what the frame draws: no visible sprite on a freed overlay (TRAPS §49) */
    for (const hd of stale ? [...sprites, stale] : sprites) {
      if (hd.visible && hd.texture !== EMPTY && (hd.texture.destroyed || !hd.texture.source || hd.texture.source.destroyed)) freedShown++;
    }
  }
  const live = new Set(_fishTopCache.values());
  let kept = 0, keptBytes = 0;
  for (const cv of Cache.keys()) { kept++; keptBytes += cv.width * cv.height * 4; }
  return {
    made, cached: _fishTopCache.size, kept, keptMB: +(keptBytes / 1048576).toFixed(1), freedShown,
    twice: [...handedOver.values()].filter((n) => n !== 1).length,
    liveFreed: [...live].filter((t) => handedOver.has(t) || t.destroyed).length,
    outNotFreed: made - live.size - [...handedOver.keys()].filter((t) => t.destroyed).length,
    stale: stale ? { empty: stale.texture === EMPTY, visible: stale.visible } : null,
  };
}
if (storeSrc) {
  const two = pond(2, 60);
  check(`3b. two anglers (64 frames): every frame held, nothing let go of after the first lap (${two.made} made)`, two.made === 64 && two.kept === 64, two);
  const three = pond(3, 60);
  check(`3c. three anglers in different outfits: the cache turns over every frame (${three.made} made in a minute)`, three.made > 4000, three);
  check(`3d. ...and Pixi's Cache keeps only the overlays still held: ${three.kept} canvases, ${three.keptMB} MB (before v2.3.4157 every one pushed out stayed)`,
    three.kept === three.cached && three.kept <= 64, three);
  check('3e. every overlay pushed out is let go of exactly once, and none still held', three.twice === 0 && three.liveFreed === 0 && three.outNotFreed === 0, three);
  check('3f. no frame draws a sprite on a freed overlay', three.freedShown === 0, three);
  const four = pond(4, 30, { stale: true });
  check('3g. a display the renderer skipped, its overlay pushed out: its sprite points at Texture.EMPTY, hidden, never on the freed one',
    four.stale && four.stale.empty && !four.stale.visible && four.freedShown === 0 && four.kept === four.cached, four);
}

/* ── 4. the wiring ── */
{
  check('4a. the renderer takes the rule from fishTopEvict.js, and releaseCanvasSource',
    /^import \{ storeFishTop, holdFishTop, releaseFishTop \} from '\.\.\/fishTopEvict\.js';/m.test(ER)
    && /^import \{ releaseCanvasSource \} from '\.\.\/releaseCanvasTexture\.js';/m.test(ER));
  check('4b. one pushed out is let go of with Texture.EMPTY and releaseCanvasSource, off the list of sprites shown',
    /const _fishTopShown = new Set\(\);/.test(ER)
    && /const _releaseFishTop = \(t\) => releaseFishTop\(t, _fishTopShown, Texture\.EMPTY, releaseCanvasSource\);/.test(ER));
  check('4c. _fishTopFrame stores through the rule, at the cap of 64 (the turnover is a design question, not this fix)',
    /storeFishTop\(_fishTopCache, key, tex, FISH_TOP_CAP, _releaseFishTop\);/.test(storeSrc) && capM && capM[1] === '64');
  check('4d. no overlay is destroyed in place any more (it left its canvas in Pixi\'s Cache)',
    !/ot\.destroy\(true\)/.test(ER) && !/_fishTopCache\.size > 64/.test(ER));
  const PF = ER.indexOf('function _placeFishHead(');
  const pf = PF > 0 ? ER.slice(PF, ER.indexOf('\n}', PF)) : '';
  check('4e. _placeFishHead puts its sprite on the list where it gives it an overlay',
    /if \(hd\.texture !== t\) \{ hd\.texture = t; holdFishTop\(_fishTopShown, hd\); \}/.test(pf));
}

if (failures) { console.log(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nfish-top-evict: all pass');
