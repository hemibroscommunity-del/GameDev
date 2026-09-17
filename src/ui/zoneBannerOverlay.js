/* ═══ v2.3.2596: THE ZONE-ENTRY BANNER ═══
 *
 * Owner: "I also want to add new zone animations for where you enter a new
 * zone.  Maybe play this briefly across the upper center of the screen then
 * dock where it tells you what location you're in (where top bar it tells you
 * name of map)."
 *
 * So: on entry to one of the four zones the owner drew art for, a themed
 * plaque animates in across the upper centre, the ornaments build through the
 * owner's nine beats, the zone's name fades in, and then the whole thing flies
 * up into the header rail's title and hands off.
 *
 * ── BODY-INJECTED DOM, NOT REACT ──
 *
 * Same shape as the per-zone loading overlay it follows (zoneTransitions.js's
 * bt-zone-loading): appended straight to document.body, outside the React tree.
 * The trigger is a zone CHANGE observed in the render loop, which is not a
 * React event and does not belong to any component's lifecycle — routing it
 * through state would mean a component that re-renders the world chrome in
 * order to start an animation that is not part of it.  It also means a React
 * teardown mid-flight cannot strip the element out from under the timeline.
 *
 * ── IT CANNOT TAKE A TOUCH ──
 *
 * pointer-events:none on the root and inherited by every child, asserted in
 * the CSS next to the rule.  This lands over the upper third of the screen,
 * which on a phone in portrait is world the player is walking through, and a
 * flourish that eats a tap is worse than no flourish.  The game loop is never
 * paused either: a player who already knows where they are just keeps going.
 *
 * ── THE DOCK ──
 *
 * The header title is ~150px of 15px text; the banner is ~340px wide with art
 * hanging off both ends.  A literal scale-down of the whole assembly to that
 * width shrinks the ornaments to specks in the last 80ms, which reads as the
 * banner falling down a hole rather than becoming the label.
 *
 * What ships instead is a SPLIT dock, because the two halves of the banner
 * have different jobs at the end of it:
 *   - the ORNAMENTS are the flourish.  They are finished once the name is
 *     readable, so they fall away where they stand — a short slide outward and
 *     out, never following the plaque.  Nothing shrinks to a speck.
 *   - the PLAQUE carries the name, which is the thing the header is about to
 *     be holding, so it alone flies: translate to the title's measured centre,
 *     scale to the title's measured width, fade as it arrives.
 * The header title then runs a 420ms arrive pulse under it, so the handoff has
 * a receiving end and not just a departing one.
 *
 * Measured at dock time rather than assumed: the title's box moves with the
 * safe-area inset, with the purse's digit count, and in landscape with
 * --world-x (the rail belongs to the world's width, not the screen's).  A typed
 * offset would be right on one phone.
 *
 * ── NO CSS FILTERS ──
 *
 * This is position:fixed directly over the live WebGL canvas, which is the
 * compositing arrangement TRAPS §42 records as the iOS grain hazard (the
 * v2.3.948 charge pie, the v2.3.1236 joystick bases, the v2.3.2320 purse).
 * Everything here is transform and opacity only.
 */
import {
  bannerStripFor, ZONE_BANNER_FRAMES, ZONE_BANNER_BEAT_MS, ZONE_BANNER_PLAY_MS,
  ZONE_BANNER_IN_MS, ZONE_BANNER_NAME_AT, ZONE_BANNER_NAME_MS,
  ZONE_BANNER_DOCK_MS, ZONE_BANNER_REPEAT_MS,
} from '../data/zoneBanner.js';
import { zoneBannerReady, zoneBannerResident } from '../rendering/zoneBannerPreload.js';
import { zoneTitle } from './mobile/zoneTitle.js';
import { prefersReducedMotion } from './mobile/sheet/motion.js';

/* ONE element, ever.  This is what makes stacked banners impossible rather
   than merely unlikely: a second entry reuses it and cancels whatever the
   first timeline was doing, from any state. */
let _el = null;
let _timers = [];
let _playing = null;      /* zoneId currently on screen, or null */
const _lastShown = new Map();  /* zoneId -> Date.now() of its last banner */
/* ═══ v2.3.2596: WHICH BEATS ACTUALLY RAN, AND WHEN ═══
 * A short ring of every beat this overlay has scheduled.  It records the
 * TIMELINE rather than the paint, and that distinction is the whole reason it
 * exists: a rig that samples the DOM can only see the beats the compositor got
 * round to drawing, so on a slow device — the headless QA box paints at ~10fps
 * under swiftshader — four of the nine 55ms beats are simply never on screen
 * when anyone looks, and "did all nine run?" becomes unanswerable by
 * observation.  It is also the first thing to read when a banner looks stuck:
 * a log that stops at 0 is a broken timeline, a log that runs 0..8 with a
 * banner that never moved is a broken step (which is how the source-pixel
 * background-position bug would have presented). */
const _beatLog = [];

function clearTimers() {
  for (const t of _timers) clearTimeout(t);
  _timers = [];
}
function at(ms, fn) { _timers.push(setTimeout(fn, ms)); }

function build() {
  const root = document.createElement('div');
  root.className = 'bt-zone-banner';
  root.setAttribute('aria-hidden', 'true');
  const plaque = document.createElement('div');
  plaque.className = 'bt-zone-banner__plaque';
  const name = document.createElement('div');
  name.className = 'bt-zone-banner__name';
  plaque.appendChild(name);
  const left = document.createElement('div');
  left.className = 'bt-zone-banner__orn bt-zone-banner__orn--l';
  const right = document.createElement('div');
  right.className = 'bt-zone-banner__orn bt-zone-banner__orn--r';
  /* Plaque first so the ornaments paint OVER its ends, which is how the owner's
     contact sheets show the assembled banner. */
  root.appendChild(plaque);
  root.appendChild(left);
  root.appendChild(right);
  document.body.appendChild(root);
  return root;
}

/** The dock target's live box, or null if the header is not on screen. */
function titleRect() {
  try {
    const t = document.querySelector('[data-zone-title]');
    if (!t) return null;
    const r = t.getBoundingClientRect();
    if (!r || r.width < 8 || r.height < 4) return null;
    return r;
  } catch (e) { return null; }
}

function pulseTitle() {
  try {
    const t = document.querySelector('[data-zone-title]');
    if (!t) return;
    t.classList.remove('is-arriving');
    /* Force a reflow so the class re-add restarts the animation rather than
       being coalesced into a no-op — the same trick BottomDashboard's pickup
       pulse gets for free from React's remount key, which this has no access
       to from outside the tree. */
    void t.offsetWidth;
    t.classList.add('is-arriving');
    setTimeout(() => { try { t.classList.remove('is-arriving'); } catch (e) {} }, 520);
  } catch (e) {}
}

function hide() {
  clearTimers();
  _playing = null;
  if (!_el) return;
  try { _el.remove(); } catch (e) {}
  _el = null;
}

/**
 * Play the banner for a zone.  Silently does nothing — which is the path ten
 * of the fourteen zones take on every single entry, and therefore the one that
 * has to be boring — when:
 *   - the zone has no art (bannerStripFor is null), or
 *   - the art is not warm (see zoneBannerPreload: never a lazy first-use load), or
 *   - this zone already showed its banner within ZONE_BANNER_REPEAT_MS, or
 *   - there is no header rail to dock into (pre-game, or a torn-down tree).
 */
export function playZoneBanner(zoneId, S) {
  const strip = bannerStripFor(zoneId);
  if (!strip) { hide(); return false; }
  if (!zoneBannerReady(zoneId)) { hide(); return false; }
  if (typeof document === 'undefined') return false;
  if (!titleRect()) { hide(); return false; }

  const now = Date.now();
  const last = _lastShown.get(zoneId) || 0;
  if (now - last < ZONE_BANNER_REPEAT_MS) { hide(); return false; }
  _lastShown.set(zoneId, now);

  /* Cancel whatever was on screen.  A rebuild rather than a reuse-in-place so
     no half-applied inline transform from the previous dock survives. */
  hide();
  _el = build();
  _playing = zoneId;

  const reduced = prefersReducedMotion();
  const plaque = _el.querySelector('.bt-zone-banner__plaque');
  const nameEl = _el.querySelector('.bt-zone-banner__name');
  const orns = _el.querySelectorAll('.bt-zone-banner__orn');
  nameEl.textContent = zoneTitle(S);

  /* The ornament boxes are sized in CSS px from the strip's own cell, scaled by
     --bt-zb-scale so one number moves the whole assembly per breakpoint.  The
     left cell is flush left in its cell and the right cell flush right, which
     is why their background-positions differ. */
  _el.style.setProperty('--zb-cell-w', strip.cellW + 'px');
  _el.style.setProperty('--zb-cell-h', strip.cellH + 'px');
  _el.style.setProperty('--zb-strip-w', strip.stripW + 'px');
  _el.style.setProperty('--zb-strip-h', strip.stripH + 'px');
  /* The CSS transitions read their durations from here rather than carrying
     their own copies.  zoneBanner.js is where the timing is argued about, and a
     140 typed in both files is a number that agrees until the day someone tunes
     one of them. */
  _el.style.setProperty('--zb-in-ms', ZONE_BANNER_IN_MS + 'ms');
  _el.style.setProperty('--zb-name-ms', ZONE_BANNER_NAME_MS + 'ms');
  _el.style.setProperty('--zb-dock-ms', ZONE_BANNER_DOCK_MS + 'ms');
  for (const o of orns) o.style.backgroundImage = `url("${strip.src}")`;

  /* ═══ STEP IN DISPLAY PIXELS, NOT SOURCE PIXELS ═══
     background-size scales the whole strip by (ornament width / cell width),
     so a step of one SOURCE cell overshoots by exactly that factor — the first
     cut wrote `-i * strip.cellW` and every beat past the first landed in the
     gap between cells, which on screen is a banner whose right-hand ornament
     is simply absent.
     calc() against the element's own custom properties rather than a measured
     px number so the step stays correct through an orientation change or a
     resize mid-animation, where a number captured at play() time would not. */
  const setBeat = (i) => {
    orns[0].style.backgroundPosition = `calc(var(--zb-orn-w) * ${-i}) 0`;
    orns[1].style.backgroundPosition = `calc(var(--zb-orn-w) * ${-i}) calc(var(--zb-orn-h) * -1)`;
    _beatLog.push({ i, t: Date.now() });
    if (_beatLog.length > 64) _beatLog.shift();
  };
  setBeat(0);

  /* ═══ REDUCED MOTION ═══
     The OS setting asks for less movement, not for less information, so the
     banner still appears and still says where you are — it simply does not
     build, fly or pulse.  Dropping it entirely was the first cut and it is the
     wrong trade: the zone name is the CONTENT here, and the header rail is
     where it ends up either way. */
  if (reduced) {
    setBeat(ZONE_BANNER_FRAMES - 1);
    _el.classList.add('is-static');
    _el.classList.add('is-in');
    at(900, () => { if (_playing === zoneId) { _el.classList.add('is-out'); } });
    at(900 + 260, () => { if (_playing === zoneId) { pulseTitle(); hide(); } });
    return true;
  }

  /* Beat 1 is the owner's "empty bar": the plaque is already there, so the
     entrance belongs to the plaque and not to the art. */
  requestAnimationFrame(() => { if (_el) _el.classList.add('is-in'); });

  let t = 0;
  for (let i = 0; i < ZONE_BANNER_FRAMES; i++) {
    const beat = i;
    at(t, () => { if (_playing === zoneId) setBeat(beat); });
    t += ZONE_BANNER_BEAT_MS[i] || 60;
  }
  at(ZONE_BANNER_NAME_AT, () => { if (_playing === zoneId) _el.classList.add('is-named'); });

  at(ZONE_BANNER_PLAY_MS, () => {
    if (_playing !== zoneId || !_el) return;
    const r = titleRect();
    const br = plaque.getBoundingClientRect();
    if (!r || !br.width) { hide(); return; }
    /* The plaque flies to the title; the ornaments do not follow it (see the
       header).  Both are transform-only. */
    const dx = (r.left + r.width / 2) - (br.left + br.width / 2);
    const dy = (r.top + r.height / 2) - (br.top + br.height / 2);
    const s = Math.max(0.28, Math.min(1, r.width / br.width));
    plaque.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    _el.classList.add('is-docking');
    pulseTitle();
  });
  at(ZONE_BANNER_PLAY_MS + ZONE_BANNER_DOCK_MS, () => {
    if (_playing === zoneId) hide();
  });
  return true;
}

/* ═══ THE ONE CALL THE RENDERER MAKES ═══
 *
 * pixiRenderer's onZoneChange is the single place in the client that sees
 * EVERY zone change, whatever set it — the hub walk-in, a respawn, the dev
 * warp, a dungeon exit — because it watches S.currentZone rather than trusting
 * any one of the nine sites that assign it.
 *
 * It also fires when only the MAP object changes for the same zone (a regen),
 * which is not an entry, so the zone id is tracked here rather than inferred
 * from the fact that it was called.  `_lastZone` starts undefined so the first
 * observation after boot counts as an entry: a player who resumes straight into
 * a banner zone has genuinely just arrived there.
 */
let _lastZone;
export function noteZoneEntered(zoneId, S) {
  const prev = _lastZone;
  _lastZone = zoneId;
  if (prev === zoneId) return false;
  if (_playing && _playing !== zoneId) hide(); /* left mid-flight: it is stale now */
  return playZoneBanner(zoneId, S);
}

/** For rigs and teardown. */
export function hideZoneBanner() { hide(); }
export function zoneBannerPlaying() { return _playing; }
export function resetZoneBannerHistory() { _lastShown.clear(); _lastZone = undefined; }

/* ═══ v2.3.2596: THE RIG HANDLE ═══
 * House style (cf. window.__btRoster, window.__btProbe): one read-only handle
 * so tools/qa/qa-zone-banner.mjs can assert what actually happened rather than
 * infer it from a screenshot.
 *
 * `resident` is the one that matters and the one a screenshot cannot show: the
 * ZONE-ASSET EXCEPTION is only honoured if the strip is FREED on the way out,
 * and a leak looks exactly like a success from the outside. */
try {
  if (typeof window !== 'undefined') {
    window.__btZoneBanner = {
      resident: zoneBannerResident,
      ready: zoneBannerReady,
      playing: () => _playing,
      shownAt: (z) => _lastShown.get(z) || 0,
      beatLog: () => _beatLog.slice(),
      reset: resetZoneBannerHistory,
    };
  }
} catch (e) { /* a debug handle must never be the thing that breaks the page */ }
