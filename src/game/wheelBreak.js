/* ═══ v2.3.2995: THE WHEEL'S OBJECTS TAKE HITS, BREAK, AND ARE MENDED ═══
 *
 * Owner, 2026-10-03: "Also destructive props would be cool.  Maybe after too
 * many shots it shatters into pieces using code ... I also think it would be
 * cool if on the client side you could destroy buildings before having them
 * repaired in a few minutes."
 *
 * ON YOUR SCREEN ONLY, as asked.  The worker knows nothing of the Wheel's
 * objects (server/src/props.js covers the old zones' props, never these), so
 * nothing here changes a fight, a monster's path or another player's world.
 * Another player's shots that hit an object on YOUR screen count too (their
 * copy runs in visualSystems.js), so two players shooting the same barrel
 * both see it go.
 *
 *   A HIT       sounds like the material (BT_AUDIO.propHit; v2.3.3001: a
 *               tree's crown answering its trunk), throws its
 *               pieces (S._debrisBursts, cut from the object's own picture
 *               where it is drawn: hitMaterialFx.js), shakes it (the
 *               renderer reads `events`), and counts: an arrow, a bolt or a
 *               sword blow is 1, a special 3 (data/wheelMaterials.js `hp`).
 *               Left alone for HEAL_MS, the count is forgotten.
 *   A BREAK     when the count reaches its hp: the picture shatters into
 *               pieces drawn in code (rendering/wheelShatter.js), its sound
 *               plays (propBreak), and its footprint is gone -- you walk
 *               through, shots fly through -- for REPAIR_MS.
 *   THE MENDING when that is up and you are not standing where it stands:
 *               the rubble fades and the object fades back in, whole.
 *
 * No pixi: this is the state and the rules; src/rendering/wheelObjects.js
 * draws them, and drains `events` once a frame.
 */
import { BT_AUDIO } from '@/data/index.js';
import { cueAt } from '@/game/eventSounds.js'; /* v2.3.3343: a mended object heard */
import { wheelInfo } from './wheelTrial.js';
import { wheelMaterialOf, materialInfo } from '@/data/wheelMaterials.js';

const qs = (() => { try { return new URLSearchParams(window.location.search); } catch (e) { return null; } })();
const qnum = (k, d) => { const v = qs && qs.get(k); const n = v != null ? Number(v) : NaN; return Number.isFinite(n) && n >= 0 ? n : d; };

/* How long a broken object stays broken: a few minutes (owner).  `?repairms=`
   for the tests, which cannot wait three. */
export const REPAIR_MS = qnum('repairms', 180000);
/* hits forgotten after this long without one.  v2.3.3230: exported, and
   `?healms=` for the tests -- a burning building's fire dies down toward it
   and is out when it comes (rendering/buildingFire.js) */
export const HEAL_MS = qnum('healms', 30000);
const MAX_BROKEN = 24;          /* past this many at once, the oldest mends now */
const CLEAR_PX = 16;            /* the mending waits until you are this far out of its footprint */
const FEET_DY = 52;             /* your boots, below your position (BroTown propFeetBlocked) */

const _dmg = new Map();         /* object index -> { d, last } */
const _broken = new Map();      /* object index -> { at, until, id, mat, x, y } */
const _events = [];             /* { type: 'hit'|'break'|'repair'|'heal', oi, ... } for the renderer */
let _src = null;                /* the worker answer the indices belong to */
let _catKind = null;            /* catalog id -> 'building' | 'prop' | 'nature', from its manifest */

export const wheelBreakStats = { hits: 0, breaks: 0, repairs: 0, waited: 0 };

/* Told AT ONCE of a break or a mending, (type, oi): the renderer drops a
   broken object's footprint from the walk test in the same call, so the next
   arrow of a volley flies through where it stood instead of meeting a box
   that is no longer drawn. */
const _listeners = new Set();
export function onWheelBreak(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
function tell(type, oi) {
  for (const fn of _listeners) { try { fn(type, oi); } catch (e) { /* a listener's trouble is its own */ } }
}

function sameWorld() {
  const info = wheelInfo();
  const o = info && info.objects;
  if (o !== _src) {
    _dmg.clear(); _broken.clear(); _events.length = 0; _src = o || null;
    _catKind = Object.create(null);
    for (const e of (o && o.manifest && o.manifest.objects) || []) if (e && typeof e.id === 'string') _catKind[e.id] = e.kind;
  }
  return o;
}

function push(ev) {
  _events.push(ev);
  if (_events.length > 64) _events.splice(0, _events.length - 64);
}

/** Is object `oi` broken now (its footprint gone, its picture rubble)? */
export function isWheelBroken(oi) {
  return oi != null && _broken.has(oi);
}

/** The renderer's share: every hit, break and mending since it last asked. */
export function drainWheelEvents() {
  if (!_events.length) return null;
  const out = _events.slice();
  _events.length = 0;
  return out;
}

/** The object's catalog id and what it is made of. */
export function wheelObjectKind(oi) {
  const o = sameWorld();
  if (!o || oi == null || oi < 0 || oi >= o.n) return null;
  const id = o.kinds[o.kind[oi]];
  return { id, ...wheelMaterialOf(id) };
}

/**
 * A hit on Wheel object `hit.oi`.  `hit`: { oi, x, y (where it landed, as
 * drawn), gy (the ground under that point), ang (the way the pieces leave),
 * weapon ('arrow'|'bolt'|'sword'), special, vol (the sound's, 0.32 for your
 * arrow), peer }.  Returns { mat, broke } or null.
 */
export function strikeWheelObject(S, hit) {
  if (!S || !hit || hit.oi == null) return null;
  const o = sameWorld();
  if (!o) return null;
  const oi = hit.oi;
  if (_broken.has(oi)) return null;
  const k = wheelObjectKind(oi);
  if (!k) return null;
  const info = materialInfo(k.mat);
  const now = Date.now();
  wheelBreakStats.hits++;
  /* the pieces: cut from the picture where the shot went in (the renderer
     fills that in from `oi` and the point -- effectsRenderer) */
  if (Number.isFinite(hit.x) && Number.isFinite(hit.y) && Number.isFinite(hit.gy)) {
    if (!S._debrisBursts) S._debrisBursts = [];
    if (S._debrisBursts.length < 24) {
      S._debrisBursts.push({
        monsterId: 'wobj:' + oi, kind: info.fx, tint: info.tint,
        x: hit.x, y: hit.y, gy: hit.gy, h: Math.max(4, hit.gy - hit.y),
        ang: Number.isFinite(hit.ang) ? hit.ang : -Math.PI / 2,
        t0: now, weapon: hit.weapon || null, big: !!hit.special,
        hitX: hit.x, hitY: hit.y, prop: true, oi, mat: k.mat,
        /* v2.3.3471: a building shows every hit (hitMaterialFx, A BUILDING
           SHOWS EVERY HIT) */
        bld: isBuilding(k.id),
      });
      /* a tree's crown lets go of what it holds: leaves, snow, char, slime */
      if (k.canopy && S._debrisBursts.length < 24) {
        S._debrisBursts.push({
          monsterId: 'wobj:' + oi + ':c', kind: 'canopy', canopy: k.canopy, tint: info.tint,
          x: o.x[oi], y: o.y[oi], gy: o.y[oi], h: 4, ang: hit.ang, t0: now,
          weapon: hit.weapon || null, big: !!hit.special, prop: true, oi, mat: k.mat, crown: true,
        });
      }
    }
  }
  const big = !!k.big;
  /* v2.3.3001: + its crown -- a hit on a tree's trunk shakes the leaves, snow,
     char or slime in it, and that is heard just after the knock
     (BT_AUDIO.CROWN_SOUNDS), the way its pieces are seen falling */
  /* v2.3.3343: a peer's blow arrives with its `vol` already scaled by how far
     off it is (and `k` the same share for the break below); one too far off
     to hear plays nothing */
  if (!(hit.vol != null && hit.vol < 0.005)) { try { BT_AUDIO.propHit(k.mat, { vol: hit.vol != null ? hit.vol : 0.32, big, crown: k.canopy || null }); } catch (e) { /* audio is best-effort */ } }
  /* the count (v2.3.3679: a slime's blast says how many hits it is, `blast`) */
  let d = _dmg.get(oi);
  if (!d || now - d.last > HEAL_MS) d = { d: 0, last: now };
  d.d += Number.isFinite(hit.blast) && hit.blast > 0 ? hit.blast : hit.special ? 3 : 1;
  d.last = now;
  _dmg.set(oi, d);
  const broke = d.d >= (k.hp || 8);
  push({ type: 'hit', oi, x: hit.x, y: hit.y, ang: hit.ang, weapon: hit.weapon || null, frac: Math.min(1, d.d / (k.hp || 8)), at: now });
  if (broke) {
    _dmg.delete(oi);
    _broken.set(oi, { at: now, until: now + REPAIR_MS, id: k.id, mat: k.mat });
    wheelBreakStats.breaks++;
    const as = isBuilding(k.id) ? 'building' : k.canopy ? 'tree' : big ? 'big' : 'small';
    var _brkK = hit.peer && typeof hit.k === 'number' ? Math.max(0, Math.min(1, hit.k)) : 1;
    if (_brkK > 0.02) { try { BT_AUDIO.propBreak(k.mat, as, { vol: (hit.peer ? 0.5 : 0.7) * _brkK }); } catch (e) { /* audio is best-effort */ } }
    push({ type: 'break', oi, x: hit.x, y: hit.y, ang: hit.ang, weapon: hit.weapon || null, as, at: now });
    tell('break', oi);
    /* too many broken at once: the oldest mends now, rubble and all */
    if (_broken.size > MAX_BROKEN) {
      let old = null, oldAt = Infinity;
      for (const [j, b] of _broken) if (b.at < oldAt) { oldAt = b.at; old = j; }
      if (old != null && old !== oi) repair(old, now);
    }
  }
  return { mat: k.mat, broke };
}

/* ═══ v2.3.3679: A SLIME'S BLAST BREAKS WHAT STANDS IN IT ═══
   The owner, 2026-10-27: "It would be fun to make the slime explosions
   destroy any nearby props (trees)".  Every object whose footprint (the
   ground it stops you on, the thing a shot hits) lies within the blast's
   radius of its middle -- the radius the worker hurt players with -- takes
   the blast as hits: enough to break it (its `hp`), or for a building
   BLAST_BUILDING_HITS, a quarter of its 24, which sets it smouldering where
   the blast met it (rendering/buildingFire.js catches at 25%).  Nearest first,
   at most BLAST_MAX; only the BLAST_SOUNDS nearest heard (at the blast's own
   share of your ear, `k`), so ten trees going at once is not a roar.  On your
   screen alone, as every break is: the worker sends the blast to every phone
   near it, and each breaks its own copy of the same trees. */
export const BLAST_BUILDING_HITS = 6;
const BLAST_MAX = 40, BLAST_SOUNDS = 3;
export function blastWheelObjects(S, x, y, r, opts) {
  const o = sameWorld();
  if (!S || !o || !o.boxOf || !o.boxes || !o.x || !o.y || !Number.isFinite(x) || !Number.isFinite(y) || !(r > 0)) return null;
  const k = opts && typeof opts.k === 'number' ? Math.max(0, Math.min(1, opts.k)) : 1;
  const reach = r + 600;   /* an object's footprint is never this far from its foot */
  const found = [];
  for (let i = 0; i < o.n; i++) {
    if (Math.abs(o.x[i] - x) > reach || Math.abs(o.y[i] - y) > reach) continue;
    const b0 = o.boxOf[i], b1 = o.boxOf[i + 1];
    if (!(b1 > b0) || _broken.has(i)) continue;   /* no footprint: nothing a shot could hit either */
    let best = Infinity, nx = 0, ny = 0;
    for (let b = b0; b < b1; b++) {
      const q = 4 * b;
      const cx = Math.max(o.boxes[q], Math.min(x, o.boxes[q + 2]));
      const cy = Math.max(o.boxes[q + 1], Math.min(y, o.boxes[q + 3]));
      const dd = Math.hypot(cx - x, cy - y);
      if (dd < best) { best = dd; nx = cx; ny = cy; }
    }
    if (best <= r) found.push({ oi: i, d: best, nx, ny });
  }
  found.sort((a, b) => a.d - b.d);
  let hit = 0, broke = 0;
  for (let j = 0; j < found.length && j < BLAST_MAX; j++) {
    const f = found[j];
    const kind = wheelObjectKind(f.oi);
    if (!kind) continue;
    const bld = isBuilding(kind.id);
    const heard = j < BLAST_SOUNDS ? k : 0;
    const res = strikeWheelObject(S, {
      oi: f.oi,
      /* where its pieces come from: a building where the blast met its wall,
         anything else just above its foot */
      x: bld ? f.nx : o.x[f.oi], y: bld ? f.ny - 24 : o.y[f.oi] - 18, gy: bld ? f.ny : o.y[f.oi],
      ang: Math.atan2(o.y[f.oi] - y, o.x[f.oi] - x), weapon: 'blast', special: true,
      blast: bld ? BLAST_BUILDING_HITS : (kind.hp || 8), vol: 0.32 * heard, peer: true, k: heard,
    });
    if (res) { hit++; if (res.broke) broke++; }
  }
  wheelBreakStats.blasts = (wheelBreakStats.blasts || 0) + 1;
  wheelBreakStats.blastBroke = (wheelBreakStats.blastBroke || 0) + broke;
  return { found: found.length, hit, broke };
}

/** Is catalog id `id` one of Brotown's buildings (its manifest says so)? */
export function isBuilding(id) {
  return !!(_catKind && id && _catKind[id] === 'building');
}

function repair(oi, now) {
  if (!_broken.delete(oi)) return;
  wheelBreakStats.repairs++;
  push({ type: 'repair', oi, at: now });
  tell('repair', oi);
}

/** Once a frame from the renderer: mend what is due, if you are clear of it. */
export function tickWheelBreak(S, now) {
  const o = sameWorld();
  if (!o) return;
  const t = now || Date.now();
  /* ═══ v2.3.3230: A COUNT FORGOTTEN IS SAID SO ═══
     A count left alone for HEAL_MS was only ever reset by the next hit, so
     nothing could tell it was gone.  A burning building's fire must go out
     when it is (rendering/buildingFire.js): its 'heal' says so.  The next
     hit's own reset stays, for a page that sleeps through this. */
  if (_dmg.size) {
    for (const [oi, d] of _dmg) {
      if (t - d.last <= HEAL_MS) continue;
      _dmg.delete(oi);
      push({ type: 'heal', oi, at: t });
    }
  }
  if (!_broken.size) return;
  const P = S && S.player;
  for (const [oi, b] of _broken) {
    if (t < b.until) continue;
    if (P && standsIn(o, oi, P.x, P.y)) { if (!b.waited) { b.waited = true; wheelBreakStats.waited++; } continue; }
    /* v2.3.3343: a broken thing mended is heard, a soft knock of wood by
       distance (it came back in silence; SOUND-GAPS) */
    if (o.x && o.y) cueAt(S, 'mended', o.x[oi], o.y[oi]);
    repair(oi, t);
  }
}

/* Is the player -- waist or boots -- within CLEAR_PX of object oi's footprint? */
function standsIn(o, oi, x, y) {
  if (!o.boxOf || !o.boxes) return false;
  for (let b = o.boxOf[oi]; b < o.boxOf[oi + 1]; b++) {
    const x0 = o.boxes[b * 4] - CLEAR_PX, y0 = o.boxes[b * 4 + 1] - CLEAR_PX;
    const x1 = o.boxes[b * 4 + 2] + CLEAR_PX, y1 = o.boxes[b * 4 + 3] + CLEAR_PX;
    if (x >= x0 && x <= x1 && ((y >= y0 && y <= y1) || (y + FEET_DY >= y0 && y + FEET_DY <= y1))) return true;
  }
  return false;
}

/** Leaving the Wheel: everything whole again. */
export function resetWheelBreak() {
  _dmg.clear(); _broken.clear(); _events.length = 0; _src = null;
}

/* QA probe, house style. */
if (typeof window !== 'undefined') {
  window.__btWheelBreak = {
    stats: wheelBreakStats,
    repairMs: REPAIR_MS,
    broken: () => [..._broken.entries()].map(([oi, b]) => ({ oi, id: b.id, mat: b.mat, left: Math.max(0, b.until - Date.now()), waited: !!b.waited })),
    damage: (oi) => { const d = _dmg.get(oi); return d ? d.d : 0; },
    healMs: HEAL_MS,   /* v2.3.3230 */
    kind: (oi) => wheelObjectKind(oi),
    /* v2.3.3698: a blast at (x, y) of radius r, as a slime's (mp-battlemem
       breaks the props round a fight with it) */
    blast: (x, y, r) => blastWheelObjects(window._gameState && window._gameState.current, x, y, r),
  };
}
