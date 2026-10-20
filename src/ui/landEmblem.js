/* ═══ v2.3.3511: A LAND'S EMBLEM, SMALL, UNDER THE MINIMAP ═══
 *
 * The owner, after a playtest (2026-10-19): "new land emblems look bad
 * enlarged (revert or show below minimap)".  Since v2.3.3481 crossing into one
 * of the Wheel's lands stood the land's scene from the owner's sheet (pick
 * "1b") over the banner's plaque, half the banner wide: ~191 CSS px on a 390
 * phone, so a picture ~192 px across was drawn three times over on a 3x
 * screen -- soft, its pixels smeared, the painted plate's gold scroll ends
 * showing at its foot.  Of the two ways offered, this is the second: the
 * banner is the plain plaque again (the land's icon and name, as four of the
 * lands always had), and the scene is shown SMALL, under the minimap, at its
 * own pixels:
 *
 *   - SIZE: one picture px a device px -- its own width over the screen's
 *     devicePixelRatio (~64 CSS px on a 3x phone, ~96 on a 2x), and never
 *     wider than EMBLEM_MAX_W (a computer at 1x draws it a little smaller
 *     than its pixels, never bigger): so never blown up (emblemSize);
 *   - PLACE: centred under the minimap's box, EMBLEM_GAP below it, on whole
 *     device px; where that is not clear -- sideways the attack disc's top is
 *     34 px under the box -- beside the box, at its top;
 *     where neither is clear of every control (any button, the sticks, the
 *     quest card, a No man's land or party card, a prompt) it is not shown:
 *     the plate already names the land (emblemPlace);
 *   - WHEN: as the banner's plaque docks into the minimap's plate, for
 *     EMBLEM_HOLD_MS, then it fades -- the owner keeps the ground round the
 *     minimap clear ("It'll free up more room around the minimap", v2.3.3009;
 *     the plate made by shrinking the map "rather than enlargen it further",
 *     v2.3.3108), so it is a greeting, not a fixture; a control that comes up
 *     under it while it shows sends it away at once;
 *   - nothing new to load: the eight scenes are held decoded behind the
 *     Wheel's loading screen and let go on leaving it, as before
 *     (zoneBannerPreload.js preloadLandScenes); a scene that is not held is no
 *     emblem, never a load.
 *
 * Body-injected DOM, like the banner (zoneBannerOverlay.js): transform and
 * opacity only over the WebGL canvas (TRAPS §42), and it takes no touch.
 */
import { landSceneHeld } from '../rendering/zoneBannerPreload.js';

export const EMBLEM_HOLD_MS = 3600;
export const EMBLEM_OUT_MS = 600;
export const EMBLEM_GAP = 8;        /* CSS px from the minimap's box (EMBLEM_CLEAR and 2 more: the map's own button lies exactly over the box) */
export const EMBLEM_MAX_W = 112;    /* CSS px at the most: inside the minimap's frame */
export const EMBLEM_CLEAR = 6;      /* CSS px kept from any control (its soft halo reaches 6-9 px out) */
/* what it never covers: whatever takes a tap, the sticks, the cards near the
   top (sizes from 4 to a fraction of the screen: a full-screen scrim or the
   sticks' touch layers are not "a control under it") */
const KEEP_CLEAR = 'button, [role="button"], a[href], input, select, textarea, [data-disc], [data-sprint], [data-quest-hud], '
  + '[data-nml-ask], [data-party-invite], [data-coach-card], [data-world-map-open], .bt-interact-prompt';

/** The size the emblem is drawn at, CSS px, for a picture `nw` x `nh` on a
 *  screen of `dpr` device px a CSS px: one picture px a device px, never
 *  wider than EMBLEM_MAX_W.  `devPerArt` is device px a picture px (1, or
 *  less where it is held to the cap: never more). */
export function emblemSize(nw, nh, dpr) {
  const d = dpr > 0 ? dpr : 1;
  const w = Math.min(EMBLEM_MAX_W, nw / d);
  return { w, h: (w * nh) / nw, devPerArt: (w * d) / nw };
}

/* the play area on the screen: the world's own window (.brotown-wrap: the
   whole width upright, the world's column sideways and on a computer) */
function frameRect() {
  try {
    const n = document.querySelector('.brotown-wrap');
    const r = n && n.getBoundingClientRect();
    if (r && r.width > 0 && r.height > 0) return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  } catch (e) { /* the window */ }
  const w = (typeof window !== 'undefined' && window.innerWidth) || 390, h = (typeof window !== 'undefined' && window.innerHeight) || 844;
  return { left: 0, top: 0, right: w, bottom: h };
}

/* every control on the screen it must keep clear of */
function controls(skip) {
  const out = [];
  const f = frameRect(), big = 0.4 * (f.right - f.left) * (f.bottom - f.top);
  let list = [];
  try { list = document.querySelectorAll(KEEP_CLEAR); } catch (e) { list = []; }
  for (const n of list) {
    if (skip && skip.contains(n)) continue;
    const r = n.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0) || r.width * r.height > big) continue;
    let shown = true;
    try {
      if (typeof n.checkVisibility === 'function') shown = n.checkVisibility({ opacityProperty: true, visibilityProperty: true });
      else { const cs = getComputedStyle(n); shown = cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; }
    } catch (e) { shown = true; }
    if (shown) out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, what: n.getAttribute('data-disc') != null ? 'disc' : (n.tagName || '').toLowerCase() });
  }
  return out;
}
const hits = (a, b, m) => a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m;

/** Where an emblem `w` x `h` goes, or null: under the minimap's box, else
 *  beside it at its top, each on whole device px, inside the play area and
 *  clear of every control.  `mini` is the box ({left, top, w, h}). */
export function emblemPlace(mini, w, h, dpr, skip) {
  if (!mini || typeof mini.left !== 'number') return { place: null, why: 'no minimap' };
  const d = dpr > 0 ? dpr : 1;
  const snap = (v) => Math.round(v * d) / d;
  const f = frameRect();
  const ctl = controls(skip);
  const tried = [];
  for (const c of [
    { at: 'below', left: mini.left + (mini.w - w) / 2, top: mini.top + mini.h + EMBLEM_GAP },
    { at: 'beside', left: mini.left - EMBLEM_GAP - w, top: mini.top + 8 },
  ]) {
    const r = { at: c.at, left: snap(c.left), top: snap(c.top), w, h };
    r.right = r.left + w; r.bottom = r.top + h;
    const inside = r.left >= f.left && r.top >= f.top && r.right <= f.right && r.bottom <= f.bottom;
    const on = ctl.find((q) => hits(r, q, EMBLEM_CLEAR));
    if (inside && !on) return { place: r, tried };
    tried.push({ at: c.at, why: !inside ? 'off the play area' : 'on a ' + on.what });
  }
  return { place: null, why: tried.map((t) => `${t.at}: ${t.why}`).join('; '), tried };
}

/* ── the one emblem ── */
let _el = null, _img = null, _timers = [], _watch = null, _shown = null;
const _log = [];
function note(o) { _log.push(Object.assign({ t: Date.now() }, o)); if (_log.length > 24) _log.shift(); }
function at(ms, fn) { _timers.push(setTimeout(fn, ms)); }

/** Take it away (now, or `fade` ms of fading). */
export function hideLandEmblem(fade = 0) {
  for (const t of _timers) clearTimeout(t);
  _timers = [];
  if (_watch) { clearInterval(_watch); _watch = null; }
  const el = _el;
  _el = null; _img = null; _shown = null;
  if (!el) return;
  if (fade > 0) {
    el.classList.add('is-out');
    setTimeout(() => { try { el.remove(); } catch (e) { /* gone */ } }, fade);
  } else {
    try { el.remove(); } catch (e) { /* gone */ }
  }
}

/** Show land `land`'s emblem under the minimap after `delay` ms (as the
 *  banner's plaque docks), for EMBLEM_HOLD_MS.  False when its scene is not
 *  held. */
export function showLandEmblem(land, { delay = 0 } = {}) {
  if (typeof document === 'undefined') return false;
  hideLandEmblem();
  const scene = landSceneHeld(land);
  if (!scene) { note({ land, shown: false, why: 'scene not held' }); return false; }
  at(delay, () => {
    let mini = null;
    try { mini = window.__btWheelMini || null; } catch (e) { mini = null; }
    const nw = scene.naturalWidth || scene.width || 0, nh = scene.naturalHeight || scene.height || 0;
    if (!nw || !nh) { note({ land, shown: false, why: 'scene has no size' }); return; }
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const sz = emblemSize(nw, nh, dpr);
    const { place, why } = emblemPlace(mini, sz.w, sz.h, dpr, null);
    if (!place) { note({ land, shown: false, why }); return; }
    const el = document.createElement('div');
    el.className = 'bt-land-emblem';
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-land-emblem', land);
    el.setAttribute('data-at', place.at);
    el.style.left = place.left + 'px'; el.style.top = place.top + 'px';
    el.style.width = sz.w + 'px'; el.style.height = sz.h + 'px';
    const img = document.createElement('img');
    img.alt = ''; img.draggable = false;
    img.width = nw; img.height = nh;
    img.style.width = sz.w + 'px'; img.style.height = sz.h + 'px';
    img.src = scene.src;   /* the held, decoded picture's own address: it paints at once */
    el.appendChild(img);
    document.body.appendChild(el);
    _el = el; _img = img;
    const miniKey = `${mini.left}|${mini.top}|${mini.w}|${mini.h}`;
    _shown = { land, at: place.at, left: place.left, top: place.top, w: sz.w, h: sz.h, nw, nh, dpr, devPerArt: sz.devPerArt, since: Date.now(), mini: { ...mini } };
    note({ land, shown: true, at: place.at });
    requestAnimationFrame(() => { if (_el === el) el.classList.add('is-in'); });
    /* gone early when a control comes up under it, or the minimap moves (a
       turn of the phone, the dashboard's side) or goes (out of the Wheel) */
    _watch = setInterval(() => {
      if (_el !== el) return;
      let m = null;
      try { m = window.__btWheelMini || null; } catch (e) { m = null; }
      const r = el.getBoundingClientRect();
      const box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      const on = controls(el).find((q) => hits(box, q, 0));
      if (!m || `${m.left}|${m.top}|${m.w}|${m.h}` !== miniKey || on) {
        note({ land, gone: !m ? 'minimap gone' : on ? 'a ' + on.what + ' came up under it' : 'the minimap moved' });
        hideLandEmblem(m ? 200 : 0);
      }
    }, 300);
    at(EMBLEM_HOLD_MS, () => { if (_el === el) hideLandEmblem(EMBLEM_OUT_MS); });
  });
  return true;
}

/* QA probe (mp-wheelmap): what is on screen, and the last few answers */
try {
  if (typeof window !== 'undefined') {
    window.__btLandEmblem = {
      onScreen: () => {
        if (!_el || !_img || !_shown) return null;
        const r = _img.getBoundingClientRect();
        let op = 1;
        try { op = Number(getComputedStyle(_el).opacity); } catch (e) { op = 1; }
        return { ..._shown, box: { l: r.left, t: r.top, w: r.width, h: r.height }, src: _img.getAttribute('src'),
          drawn: !!(_img.complete && _img.naturalWidth > 0), opacity: op, devW: r.width * _shown.dpr };
      },
      log: () => _log.slice(),
      hide: () => hideLandEmblem(),
      /* a land's emblem now (or in `delay` ms), as a crossing would -- for a
         test that turns the phone and asks where it goes */
      show: (land, delay = 0) => showLandEmblem(land, { delay }),
      sizeFor: emblemSize,
    };
  }
} catch (e) { /* a debug handle must never be the thing that breaks the page */ }
