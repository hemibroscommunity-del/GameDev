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
import { bannerStripFor, ZONE_BANNER_THEME } from '../data/zoneBanner.js';

/* theme -> the decoded Image we are holding.  Keyed by THEME rather than by
   zone so two zones that ever share one (none today, one line away) warm and
   free as a single asset instead of fetching it twice. */
const _held = new Map();
const _inflight = new Map();

function warm(theme, src) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  if (_held.has(theme)) return Promise.resolve(_held.get(theme));
  const already = _inflight.get(theme);
  if (already) return already;
  const p = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => { _held.set(theme, img); resolve(img); };
      if (typeof img.decode === 'function') img.decode().then(done, done);
      else done();
    };
    /* A failed warm must never fail the zone gate — walking into the zone is
       worth more than its flourish, and zoneBannerReady() will answer false so
       the entry is silent rather than broken. */
    img.onerror = () => resolve(null);
    img.src = src;
  }).then((img) => { _inflight.delete(theme); return img; });
  _inflight.set(theme, p);
  return p;
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
  if (!_held.has(going)) return [];
  const img = _held.get(going);
  _held.delete(going);
  /* Point the element at nothing before letting go: an <img> whose src still
     names a decoded resource can keep the bitmap alive in some engines even
     with no JS reference left, and a free that does not free is worse than no
     free at all, because it reports success. */
  try { img.src = ''; } catch (e) { /* a strip that will not release is a leak, not a crash */ }
  return [going];
}

/** For rigs: which themes are resident. */
export function zoneBannerResident() { return Array.from(_held.keys()); }
