/* ═══ v2.3.2989: THE WHEEL'S MONSTERS' LOOKS, LOADED AS YOU WALK TOWARD THEM ═══
 *
 * Owner, 2026-10-02: "Yes only load as you walk towards it." -- the answer to
 * the question v2.3.2978 left open.  The Wheel ('wheel', the zone with
 * `homes`) holds all eight lands' monsters, and their looks -- 60 MB decoded
 * -- loaded together behind its overlay, putting the Wheel at ~241 MB of
 * textures on arrival, at iPhone Safari's edge.
 *
 * Now a look loads when the worker first tells this phone of a monster near
 * enough to want it: the worker tells a v2 phone only of the monsters within
 * 2,400 px (server tick.js, `_wheelInterest`), and a monster comes on screen
 * within ~500 px, so there are some 1,900 px of walking -- several seconds --
 * to load it in the background.  From Brotown's square none is that near:
 * the Wheel arrives with no monster looks at all.  A look none of whose
 * monsters has been within FREE_R for FREE_AFTER is let go again.
 *
 * THE PRELOADING LAW, where it matters: no monster is ever DRAWN without its
 * own look.  Until its look is ready -- a slow phone, or a monster met before
 * its look, say on a reconnect inside the Wheel -- a monster is not drawn at
 * all (entityRenderer: `wheelArtReady`), never in a stand-in body, and in the
 * Wheel nothing else may start loading a look (setVariantKicks: the lazy
 * first-sighting kick in monsterVariantSprites.js is off while this runs).
 * Leaving the Wheel lets every look go, as before (freeZoneAssets).
 *
 * A look, here, is what one monster type is drawn from: a variant's sheets
 * (MONSTER_VARIANTS / VARIANT_SPRITES) with any recolour it asks for, the
 * mummy's with the skeleton it turns into, or the snowman's own sheets and
 * his snowball's burst.  A type with neither (the slime, the generic bodies)
 * is drawn from global art: nothing to load, always ready.
 */
import { MONSTER_VARIANTS, variantsForZone } from '../data/monsterVariants.js';
import { zoneHomes, wheelLandAt } from '../data/zones.js';   /* v2.3.3017: + which land you are on */
import { VARIANT_SPRITES, unloadVariantSprites, setVariantKicks } from './monsterVariantSprites.js';
import { loadMonsterRecolor, recolorFamilyOf, freeMonsterRecolor } from './monsterRecolor.js';
import { loadSnowmanSprites, unloadSnowmanSprites } from './snowmanSprites.js';
/* (the snowball's burst lives in effectsRenderer, which imports
   entityRenderer, which imports this: a static import here would run
   effectsRenderer before entityRenderer has finished loading, so it is
   fetched when first wanted -- by then everything has loaded) */
const fx = () => import('./systems/effectsRenderer.js');

/* a monster this near (world px) has its look loaded -- a little past the
   2,400 px the worker tells a phone of, for a v1 phone told of every one */
export const LOAD_R = 2600;
/* ...and a look none of whose monsters has been this near for FREE_AFTER ms
   is let go (the gap between the two keeps a look from coming and going as
   you walk along a land's edge) */
export const FREE_R = 3600;
export const FREE_AFTER = 10000;
/* ═══ v2.3.3017: YOUR OWN LAND'S LOOKS, AND ANOTHER'S ONLY WHEN IT IS CLOSE ═══
   Owner, 2026-10-04: "I was fighting fire goblins and my screen went black."
   Measured on a phone-sized page (mp-wheelmem): the spokes' inner ends are
   ~1,630 px from their neighbours' across the water, so at the Flame Fields'
   LOAD_R reached into Frost Ridge and the Wind Dunes and four looks were
   held -- the fire goblin's, the mummy's, the skeleton's and the snowman's,
   ~57 MB of the asset cache's 239 -- within a few MB of the ~250 MB at which
   iPhone Safari kills a tab (docs/WORLD-MAP-PIPELINE.md), for monsters that
   cannot reach you: the open sea is a wall, and none chases that far.
   So a monster of the land you are on (zones.js wheelLandAt: your direction
   from the Wheel's middle) still has its look loaded within LOAD_R, as you
   walk toward it; another land's only inside foreignBox -- the screen's own
   box round you, each half grown by NEAR_LEAD of walking (NEAR_MIN at least):
   a phone held upright sees far up and down and little sideways, and the
   neighbouring lands lie to the sides (the half-diagonal, its first cut, was
   1,589 px on the test phone against their ~1,630) -- which is as
   near as you get without walking into that land, where it is yours.  Kept
   to KEEP_EXTRA further, for FREE_AFTER, so a look does not come and go
   along a land's edge. */
export const NEAR_MIN = 1000;
export const NEAR_LEAD = 700;
const KEEP_EXTRA = 600;

/* where another land's monster must be for its look to load: within this
   many world px of you across and up-and-down -- the screen's half-width and
   half-height (S._viewW/_viewH, the world px the renderer shows) plus a walk */
export function foreignBox(S) {
  const w = S && S._viewW, h = S && S._viewH;
  const hw = w > 0 ? w / 2 : 400, hh = h > 0 ? h / 2 : 800;
  const k = (v) => Math.min(LOAD_R, Math.max(NEAR_MIN, v + NEAR_LEAD));
  return [k(hw), k(hh)];
}
const TICK_MS = 250;

export const wheelArtStats = {
  ready: 0,        /* looks loaded now */
  loading: 0,      /* looks on their way */
  loads: 0,        /* looks loaded since entering the Wheel */
  frees: 0,        /* ...and let go behind you */
  lastMs: 0,       /* the last look's load, ms */
  maxMs: 0,
  waiting: 0,      /* monsters in view not drawn yet, their look not ready (the renderer's count) */
  waitedMs: 0,     /* the longest any such wait has lasted (ms) */
  land: null,      /* v2.3.3017: the land you are on (wheelLandAt) */
  near: null,      /* ...and how near another land's monster must be, [across, up-and-down] (foreignBox) */
};

let _zone = null;       /* the zone this is running for, or null */
let _curZone = null;    /* the zone the player is in now, wherever that is */
let _gen = 0;           /* bumped on every reset: a load from before it is stale */
let _lastTick = 0;
let _waitSince = 0;
/* look id -> { state: 'loading' | 'ready' | 'failed', gen, t0, lastNear } */
const _looks = new Map();

/* The looks one monster type is drawn from: [] for global art. */
function looksOf(arch) {
  if (arch === 'snowman') return ['snowman'];
  if (!arch || !MONSTER_VARIANTS[arch]) return [];
  /* the mummy turns into a skeleton mid-fight (MONSTER_VARIANTS.mummy) */
  return arch === 'mummy' ? ['mummy', 'skeleton'] : [arch];
}

/* Is this running here: a zone of other zones' monsters (the Wheel)? */
export function wheelArtOn(zoneId) { return !!zoneHomes(zoneId); }

/* May a monster of this type be drawn?  Always, outside the Wheel. */
export function wheelArtReady(arch) {
  if (_zone == null) return true;
  for (const k of looksOf(arch)) {
    const e = _looks.get(k);
    if (!e || e.state !== 'ready') return false;
  }
  return true;
}

function loadLook(k) {
  if (k === 'snowman') return Promise.all([loadSnowmanSprites(), fx().then((m) => m.ensureSnowballBurstTex())]);
  const tasks = [];
  const v = VARIANT_SPRITES[k];
  if (v && v.load) tasks.push(v.load());
  const mv = MONSTER_VARIANTS[k];
  const fam = mv ? recolorFamilyOf(mv) : null;
  if (fam) tasks.push(loadMonsterRecolor(fam, mv.recolor));
  return Promise.all(tasks);
}

/* Let a look go -- but never a sprite module or a recolour another look
   still kept here draws from (thornShambler and rockmonster share one
   module, as do bogLurker and fishman: unloadVariantSprites dedupes by
   loader, so freeing one by key would tear the other's art out). */
function freeLook(k, keep) {
  if (k === 'snowman') {
    try { unloadSnowmanSprites(); } catch (e) { /* a leak, not a crash */ }
    fx().then((m) => m.freeFrostImpactTex()).catch(() => {});
    return;
  }
  const v = VARIANT_SPRITES[k];
  const shared = (q) => q !== k && keep.has(q) && _looks.has(q);
  if (v && v.unload && ![..._looks.keys()].some((q) => shared(q) && VARIANT_SPRITES[q] && VARIANT_SPRITES[q].unload === v.unload)) {
    Promise.resolve(unloadVariantSprites([k])).catch(() => []);
  }
  const mv = MONSTER_VARIANTS[k];
  const fam = mv ? recolorFamilyOf(mv) : null;
  if (fam && ![..._looks.keys()].some((q) => shared(q) && MONSTER_VARIANTS[q] && recolorFamilyOf(MONSTER_VARIANTS[q]) === fam && String(MONSTER_VARIANTS[q].recolor) === String(mv.recolor))) {
    try { freeMonsterRecolor(mv); } catch (e) { /* a leak, not a crash */ }
  }
}

function want(k, now) {
  const had = _looks.get(k);
  if (had && had.state !== 'failed') { had.lastNear = now; return; }
  if (had && now - had.t0 < 5000) return;   /* a failed load is tried again, at most every 5 s */
  const e = { state: 'loading', gen: _gen, t0: now, lastNear: now };
  _looks.set(k, e);
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  Promise.resolve().then(() => loadLook(k)).then(() => {
    if (e.gen !== _gen || _looks.get(k) !== e) { lateFree(k); return; }
    e.state = 'ready';
    const ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    wheelArtStats.loads++;
    wheelArtStats.lastMs = ms;
    wheelArtStats.maxMs = Math.max(wheelArtStats.maxMs, ms);
  }, () => {
    if (e.gen === _gen && _looks.get(k) === e) e.state = 'failed';
  });
}

/* A load that came in after you left the Wheel -- possibly after
   freeZoneAssets let the Wheel's looks go -- would stay for good: let it go,
   unless where you are now draws from it (or you are back in a Wheel, whose
   own wanting decides). */
function lateFree(k) {
  if (wheelArtOn(_curZone)) return;
  const used = variantsForZone(_curZone);
  if (used.has('mummy')) used.add('skeleton');   /* co-loaded, as preloadZoneAssets does */
  if (k === 'snowman' ? _curZone === 'frost' : used.has(k)) return;
  freeLook(k, new Set());
}

/* ═══ v2.3.3016: A WHEEL DUNGEON'S MONSTERS, LOADED BEFORE YOU STEP IN ═══
   A dungeon behind one of the Wheel's mouths is that land's own monsters
   (server/src/wheeldungeon.js), every one of them within a screen of you the
   moment you arrive -- no walk to load them on.  So, as the law has it for any
   zone but the Wheel itself, every look the land's monsters wear is loaded
   behind the dungeon's loading screen first (gameEvents.js dungeon_started).
   Inside, the arena's synthetic zone has the land as its `homes`, so this
   module keeps them there as in the Wheel, and freeZoneAssets lets them go on
   the way out. */
export function loadLandLooks(home) {
  const ks = new Set();
  for (const k of variantsForZone(home)) for (const q of looksOf(k)) ks.add(q);
  if (home === 'frost') ks.add('snowman');
  return Promise.all([...ks].map((k) => Promise.resolve().then(() => loadLook(k)).catch(() => null)))
    .then(() => [...ks]);
}

/* Leaving the Wheel: forget what was loaded here (freeZoneAssets lets all
   of it go, a beat later, as for any zone) and let the lazy kick back on. */
export function wheelArtReset() {
  _gen++;
  _looks.clear();
  _zone = null;
  _waitSince = 0;
  setVariantKicks(true);
  wheelArtStats.ready = 0; wheelArtStats.loading = 0; wheelArtStats.waiting = 0;
}

/* Called by the renderer once a frame, before it draws the monsters: which
   looks are wanted near the player, loaded and let go. */
export function wheelArtTick(S, monsters, now) {
  const zone = S && S.currentZone;
  _curZone = zone || null;
  if (!wheelArtOn(zone)) { if (_zone != null) wheelArtReset(); return; }
  if (_zone !== zone) {
    wheelArtReset();
    _zone = zone;
    setVariantKicks(false);
    wheelArtStats.loads = 0; wheelArtStats.frees = 0; wheelArtStats.maxMs = 0; wheelArtStats.waitedMs = 0;
    _lastTick = 0;
  }
  if (now - _lastTick < TICK_MS) return;
  _lastTick = now;
  const p = S.player;
  if (!p) return;
  /* v2.3.3017: your land's within LOAD_R, another's only near (see NEAR_MIN);
     a zone that is not the Wheel (a dungeon's arena) has no lands: all its own */
  const mine = wheelLandAt(zone, p.x, p.y);
  const [bx, by] = foreignBox(S);
  const near = new Set(), keep = new Set();
  for (const m of monsters || []) {
    if (!m) continue;
    const ks = looksOf(m.archetype || m.type);
    if (!ks.length) continue;
    const dx = m.x - p.x, dy = m.y - p.y;
    if (!mine || !m.home || m.home === mine) {
      const d2 = dx * dx + dy * dy;
      if (d2 < LOAD_R * LOAD_R) for (const k of ks) near.add(k);
      if (d2 < FREE_R * FREE_R) for (const k of ks) keep.add(k);
    } else {
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax < bx && ay < by) for (const k of ks) near.add(k);
      if (ax < bx + KEEP_EXTRA && ay < by + KEEP_EXTRA) for (const k of ks) keep.add(k);
    }
  }
  wheelArtStats.land = mine;
  wheelArtStats.near = [Math.round(bx), Math.round(by)];
  for (const k of near) want(k, now);
  for (const [k, e] of _looks) {
    if (keep.has(k)) { e.lastNear = now; continue; }
    if (e.state !== 'ready' || now - e.lastNear < FREE_AFTER) continue;
    freeLook(k, keep);
    _looks.delete(k);
    wheelArtStats.frees++;
  }
  let ready = 0, loading = 0;
  for (const e of _looks.values()) { if (e.state === 'ready') ready++; else if (e.state === 'loading') loading++; }
  wheelArtStats.ready = ready;
  wheelArtStats.loading = loading;
}

/* The renderer's count of monsters in view it did not draw, their look not
   ready: how long the longest such wait has lasted is the number that says
   whether loads keep ahead of the walking. */
export function wheelArtWaiting(n, now) {
  wheelArtStats.waiting = n;
  if (n > 0) {
    if (!_waitSince) _waitSince = now;
    wheelArtStats.waitedMs = Math.max(wheelArtStats.waitedMs, Math.round(now - _waitSince));
  } else _waitSince = 0;
}

/* QA probe, house style: the looks held now, and the numbers */
export function wheelArtState() {
  const looks = {};
  for (const [k, e] of _looks) looks[k] = e.state;
  return { zone: _zone, looks, ...wheelArtStats };
}
if (typeof window !== 'undefined') window.__btWheelArt = wheelArtState;
