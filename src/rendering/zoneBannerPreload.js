/* ═══ v2.3.2596: ZONE-ENTRY BANNER — the warm half, and the cold one ═══
 *
 * CLAUDE.md's preloading LAW says every animation must be loaded before it is
 * first used and a lazy first-use load is a BUG.  This file is where that law
 * applies, and the interesting part is WHICH half of it applies.
 *
 * ── WHY THIS IS NOT IN preloadWorldAnimations() ──
 *
 * The ZONE-ASSET EXCEPTION (owner directive 2026-07-20, v2.3.1405, "per zone
 * loading instead of one long pregame loading screen").  The game was "wonky
 * with RAM" on iPhone because the pre-game gate force-loaded every zone's art,
 * so zone-specific art moved to preloadZoneAssets(zoneId) behind the per-zone
 * loading overlay, and the zone you left is freed on the way out.
 *
 * These four strips are exactly that shape: 171-319KB each, ~1.5MB decoded,
 * and a banner for Frost Ridge is worth nothing to a player standing in Flame
 * Fields.  Registering them globally would put ~1MB of fetch and ~6MB of
 * decoded bitmap onto the startup peak for three sheets that will not be used
 * — the regression the owner has personally reported.
 *
 * The law is not weakened by that, for the same reason the maps and the
 * monster variants are not: the warm below is AWAITED inside preloadZoneAssets,
 * behind the loading overlay, so the banner is ready before the overlay lifts
 * and there is no in-play first-use fetch.  It is a loading SCREEN, not a lazy
 * Assets.load.
 *
 * ── AND IF IT IS NOT WARM, THERE IS NO BANNER ──
 *
 * `zoneBannerReady()` is the gate the overlay asks before it plays, and a cold
 * strip answers false and the banner simply does not happen.  It deliberately
 * does NOT kick a load.  preloadZoneAssets is called from exactly one place —
 * the hub-exit walk-in (zoneTransitions.js) — which is the entry the owner
 * described; every other way into a zone (respawn, the dev warp, a dungeon
 * exit) reaches it without the overlay, and a banner that fetched itself on
 * those paths would be the first-use hitch the law forbids, landing on top of
 * whatever just happened to the player.  Silence is the correct answer there.
 *
 * ── Image, NOT Assets.load ──
 *
 * The banner draws in the DOM (it is screen-space chrome over the HUD, not a
 * world effect), so there is no Pixi texture to hang this off — the same
 * situation as the level-up burst, and the same answer: warm an Image, decode()
 * it, and HOLD the reference.  decode() rather than onload because onload only
 * means the bytes arrived; decode() means the browser has a bitmap it can
 * paint, and on a 2250px strip the difference is a visible stall on first
 * paint, which is the same hitch one step later.
 *
 * The held reference is not decoration either: a decoded image with no
 * reference is collectable, and a browser under memory pressure WILL drop it,
 * putting the fetch back on first use, silently.  Which is also why the free
 * below is a real free — dropping the reference is the only way to give the
 * memory back.
 */
import { bannerStripFor, ZONE_BANNER_THEME, ZONE_BANNER_STRIPS } from '../data/zoneBanner.js';
import { ZONES } from '../data/zones.js';   /* v2.3.5003: the Wheel's middle, safe edge and lands */
import { bannerLandsNear, BANNER_KEEP } from '../game/bannerReach.js';   /* v2.3.5003: which lands' banners, from where you stand */

/* theme -> the decoded Image we are holding.  Keyed by THEME rather than by
   zone so two zones that ever share one (none today, one line away) warm and
   free as a single asset instead of fetching it twice. */
const _held = new Map();
const _inflight = new Map();
/* ═══ v2.3.5003: HELD ONLY NEAR ITS LAND ═══
 * The owner, 2026-11-12 ("Yes do it", docs/specs/pictures-256.md §7): the
 * Wheel held all four strips for the whole visit, ~15.7 MB decoded in the
 * page.  Now a land's strip is held only while you are in that land or near
 * enough to walk into it (src/game/bannerReach.js says which, and why "near"
 * is where you stand, not where you face): loaded behind the Wheel's loading
 * screen for the spot you arrive at (preloadWheelBanners), then as you walk
 * (wheelBannerTick, asked from the minimap's frame by noteWheelLand, the
 * frame that watches which land you are in) -- the monster looks' way, the
 * owner's "Yes only load as you walk towards it" (wheelMonsterArt.js).  None
 * in BroTown; one out along a land; two at most, near the line between two.
 * The banner still never fetches anything itself and never shows a strip
 * that is not decoded and held (zoneBannerReady): one still on its way is
 * waited for, BANNER_WAIT_MS at most (zoneBannerOverlay.js noteWheelLand),
 * and then the land plays the plaque alone, its icon and name, as the four
 * lands with no art of the owner's always do -- never a broken picture.
 * `?banners=all` holds all four for the visit, as before.
 *
 * `_want` is the themes someone still wants: a load that lands for a theme no
 * longer in it (you walked away, or left the Wheel, while it came) is let go
 * at once rather than held for good. */
const _want = new Set();
const _failAt = new Map();     /* theme -> when its last load failed (asked again FAIL_RETRY_MS later) */
/* v2.3.5003: a load that never answers counts as a failure here (TRAPS §257:
   a stalled request would otherwise sit in _inflight for the visit and the
   land's banner never come), and a failure is asked again by the next walk
   near its land, FAIL_RETRY_MS later -- the same address, because the banner's
   CSS asks for that one (zoneBannerOverlay.js) and must find it decoded */
export const WARM_LIMIT_MS = 20000;
export const FAIL_RETRY_MS = 10000;
const TICK_MS = 250;
const _stats = { loads: 0, frees: 0, fails: 0, lastMs: 0 };

/* `?banners=all`: all four held while you are in the world, as before
   v2.3.5003 (house style, `?gearwalk=0`; it rides along through the game's
   own reloads, keepSwitches.js) */
const _all = (() => {
  try { return /(^|[?&])banners=all(&|$)/.test(window.location.search || ''); } catch (e) { return false; }
})();
export function bannersAll() { return _all; }

function warm(theme, src) {
  _want.add(theme);
  if (typeof Image === 'undefined') return Promise.resolve(null);
  if (_held.has(theme)) return Promise.resolve(_held.get(theme));
  const already = _inflight.get(theme);
  if (already) return already;
  const t0 = Date.now();
  const p = new Promise((resolve) => {
    const img = new Image();
    let over = false, limit = 0;
    /* v2.3.5003: one way out, whichever comes first -- decoded, failed, or
       the time limit.  Held only if it is still wanted (`_want`); otherwise,
       and on a failure, the element is pointed at nothing so it keeps no
       pixels (the same reason as freeZoneBanner's, below). */
    const finish = (ok) => {
      if (over) return;
      over = true;
      clearTimeout(limit);
      img.onload = null; img.onerror = null;
      if (ok && _want.has(theme)) {
        _held.set(theme, img);
        _failAt.delete(theme);
        _stats.loads++;
        _stats.lastMs = Date.now() - t0;
        resolve(img);
        return;
      }
      if (!ok) { _failAt.set(theme, Date.now()); _stats.fails++; }
      try { img.src = ''; } catch (e) { /* a strip that will not release is a leak, not a crash */ }
      resolve(null);
    };
    limit = setTimeout(() => finish(false), WARM_LIMIT_MS);
    img.decoding = 'async';
    img.onload = () => {
      if (typeof img.decode === 'function') img.decode().then(() => finish(true), () => finish(true));
      else finish(true);
    };
    /* A failed warm must never fail the zone gate — walking into the zone is
       worth more than its flourish, and zoneBannerReady() will answer false so
       the entry is silent rather than broken. */
    img.onerror = () => finish(false);
    img.src = src;
  }).then((img) => { _inflight.delete(theme); return img; });
  _inflight.set(theme, p);
  return p;
}

/* Let a held strip go: no longer wanted, the reference dropped, and the
   element pointed at nothing before letting go -- an <img> whose src still
   names a decoded resource can keep the bitmap alive in some engines even
   with no JS reference left, and a free that does not free is worse than no
   free at all, because it reports success.  A load still on its way for it
   lands let go (warm's `_want`). */
function release(theme) {
  _want.delete(theme);
  const img = _held.get(theme);
  if (!img) return false;
  _held.delete(theme);
  try { img.src = ''; } catch (e) { /* a strip that will not release is a leak, not a crash */ }
  _stats.frees++;
  return true;
}

/** Awaited by preloadZoneAssets(zoneId). Resolves immediately for the ten
 *  zones that have no banner, which is the common case. */
export function preloadZoneBanner(zoneId) {
  const strip = bannerStripFor(zoneId);
  if (!strip) return Promise.resolve(null);
  return warm(ZONE_BANNER_THEME[zoneId], strip.src);
}

/** Is this zone's banner decoded and held RIGHT NOW?  Cache-only by design —
 *  it never kicks a load (see the header). */
export function zoneBannerReady(zoneId) {
  const theme = zoneId && ZONE_BANNER_THEME[zoneId];
  return !!(theme && _held.has(theme));
}

/** v2.3.5003: is this zone's (or land's) strip on its way -- asked for, not
 *  yet decoded?  The land watch waits for it rather than playing the plaque
 *  alone (zoneBannerOverlay.js noteWheelLand). */
export function zoneBannerComing(zoneId) {
  const theme = zoneId && ZONE_BANNER_THEME[zoneId];
  return !!(theme && !_held.has(theme) && _inflight.has(theme));
}

/** The exit half, called from freeZoneAssets(from, to).
 *
 *  `toZoneId` is not optional politeness — it is the same subtraction the
 *  variant sheets take: freeing "what the zone I left used" without removing
 *  "what the zone I am entering uses" would drop a strip that is about to
 *  play.  No two zones share a theme today, so the subtraction is a no-op in
 *  practice; it is here because the day a second desert zone is added is the
 *  day it stops being one, and that day will not come with a code review of
 *  this function.
 *
 *  Returns the themes actually released, so a rig can assert the free happened
 *  rather than assume it. */
export function freeZoneBanner(fromZoneId, toZoneId) {
  const going = fromZoneId && ZONE_BANNER_THEME[fromZoneId];
  if (!going) return [];
  const keeping = toZoneId && ZONE_BANNER_THEME[toZoneId];
  if (going === keeping) return [];
  /* v2.3.5003: no longer wanted even when not held yet, so a load still on
     its way lands let go (warm) rather than held for good */
  return release(going) ? [going] : [];
}

/* ═══ v2.3.5003: THE WHEEL'S HALF -- WHERE YOU STAND SAYS WHICH ═══ */

/* The Wheel's middle, safe edge and lands (zones.js setWheelGeom: the size
   the room plays), as bannerLandsNear takes them; null before it is set. */
function wheelGeomNow() {
  const z = ZONES.wheel;
  if (!z || !z.lands || !(z.w > 0)) return null;
  const c = (z.w * 32) / 2;   /* TILE, as zones.js wheelLandAt */
  return { cx: c, cy: c, edge: z.safeR || 0, lands: z.lands };
}
/* the themes of the lands that have the owner's art, in order */
function themesOf(lands) {
  const out = [];
  for (const l of lands) { const t = ZONE_BANNER_THEME[l]; if (t && ZONE_BANNER_STRIPS[t] && !out.includes(t)) out.push(t); }
  return out;
}
/* what the last tick (or the way in) worked out, for the probe */
const _near = { want: [], keep: [], lands: [], land: null, next: null, r: null, side: null, at: 0 };
let _lastTick = 0;
function noteNear(w, k) {
  Object.assign(_near, { want: themesOf(w.lands), keep: themesOf(k.lands), lands: w.lands.slice(), land: w.land, next: w.next, r: w.r, side: w.side, at: Date.now() });
}

/** Behind the Wheel's loading screen (preloadZoneAssets('wheel')): the
 *  banners wanted where this trip lands -- the town square (none), or a
 *  dungeon's mouth or the spot a reload came back to, out in a land (its
 *  banner, ready before the screen lifts: the land watch plays it 600 ms
 *  after you arrive).  `?banners=all`: all four, as before. */
export function preloadWheelBanners(at) {
  const tasks = [];
  if (_all) {
    for (const t of Object.keys(ZONE_BANNER_STRIPS)) tasks.push(warm(t, ZONE_BANNER_STRIPS[t].src));
    return Promise.all(tasks);
  }
  const g = wheelGeomNow();
  if (!g || !at) return Promise.resolve([]);
  const w = bannerLandsNear(g, at.x, at.y, null, 0);
  noteNear(w, bannerLandsNear(g, at.x, at.y, null, BANNER_KEEP));
  for (const t of _near.want) tasks.push(warm(t, ZONE_BANNER_STRIPS[t].src));
  return Promise.all(tasks);
}

/** In the Wheel, every TICK_MS: hold the banners near where you stand, load
 *  the ones coming into reach, let go of the ones past BANNER_KEEP.  `region`
 *  is the ground worker's region under you (wheelHere), or null.  Leaving
 *  the Wheel lets every one go (preloadAnimations.js freeZoneAssets). */
export function wheelBannerTick(S, region, now = Date.now()) {
  if (_all || !S || S.currentZone !== 'wheel' || !S.player) return;
  if (now - _lastTick < TICK_MS) return;
  _lastTick = now;
  const g = wheelGeomNow();
  if (!g) return;
  const x = S.player.x, y = S.player.y;
  const w = bannerLandsNear(g, x, y, region, 0);
  const k = bannerLandsNear(g, x, y, region, BANNER_KEEP);
  noteNear(w, k);
  for (const t of _near.want) {
    _want.add(t);
    if (_held.has(t) || _inflight.has(t)) continue;
    const failed = _failAt.get(t);
    if (failed && now - failed < FAIL_RETRY_MS) continue;
    warm(t, ZONE_BANNER_STRIPS[t].src);
  }
  /* every theme past the margin: held ones let go, ones on their way to land
     let go (in the Wheel every theme is a land's: the zones that had them are
     closed, zonejudge R3) */
  for (const t of Array.from(_held.keys())) if (!_near.keep.includes(t)) release(t);
  for (const t of Array.from(_want)) if (!_near.keep.includes(t)) _want.delete(t);
}

/** For rigs: which themes are resident. */
export function zoneBannerResident() { return Array.from(_held.keys()); }

/* ═══ v2.3.5003: THE RIG HANDLE ═══
 * House style (window.__btWheelArt, the monster looks').  `held` is the
 * themes decoded and held now (frost, fire, desert, forest), `loading` on
 * their way, `want` / `keep` what the last tick worked out from where you
 * stand (the lands in `lands`, your spoke `land`, its nearer neighbour
 * `next`, `r` and `side` in world px: bannerReach.js), and the counts. */
export function bannerHold() {
  return {
    mode: _all ? 'all' : 'near',
    held: Array.from(_held.keys()).sort(),
    loading: Array.from(_inflight.keys()).sort(),
    wanted: Array.from(_want).sort(),
    want: _near.want.slice(), keep: _near.keep.slice(), lands: _near.lands.slice(),
    land: _near.land, next: _near.next, r: _near.r, side: _near.side, at: _near.at,
    ..._stats,
  };
}
try { if (typeof window !== 'undefined') window.__btBanners = bannerHold; } catch (e) { /* a debug handle must never break the page */ }

/* v2.3.3481-v2.3.3608 held the Wheel's eight lands' scenes here for their
   banners (and from v2.3.3511 for a small emblem under the minimap).  v2.3.3609
   took them out -- the owner, 2026-10-26: "I also don't like the intro graphics
   to each zone.  The older ones were better." -- and the Wheel holds the four
   strips above again (preloadAnimations.js wheelBannerLands); since v2.3.5003
   only the ones near you (above). */
