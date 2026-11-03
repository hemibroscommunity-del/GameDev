/* ═══ v2.3.3925: A BIG ARROW SHOWS WHERE TO GO, THE FIRST TIME ═══
 *
 * The owner, 2026-11-02: "The first time you get handed a weapon put an arrow
 * pointing to either the bag dashboard button or the weapon if the dashboard
 * is already open. The flashing light isn't obvious enough. Also the first
 * time you level up and have enough points to allocate between your weapon
 * and the character should have that same big arrow to guide you where to
 * go."  And: "Then I noticed the flashing inventory button and gold star but
 * it took a few beats."
 *
 * Two lessons, each ONCE a character:
 *   weapon  the first time a weapon is handed to you (Mayor Bro's first quest
 *           gives the sword and the shield as you take it): the arrow points
 *           where the glow is (gearFlash.js gearFlashSelectors: the fold
 *           handle while the band is folded, the Gear button while the bag is
 *           off the screen, else the weapon's tile) and follows it as it
 *           changes, until the weapon is worn or WEAPON_MS have passed;
 *   points  the first time you level up with points to spend (pointsTips.js
 *           pointsTipWanted: a quiet moment, none ever placed): the Character
 *           ("Bro") button, then the Points section once that page is open,
 *           until a point is spent, or POINTS_MS of showing (a player keeping
 *           their points for later is not followed for ever).
 * Only the STABLE hooks are aimed at (data-nav, data-dash-fold, data-land-fold,
 * data-gear, data-section="Build"): the band's contents and buttons move under
 * other work, so the target is looked up again on every tick (TICK_MS) and the
 * arrow goes to wherever it is now; nothing on the screen, no arrow.
 *
 * Built like starCue.js: one body-level element, outside .brotown-wrap (TRAPS
 * §20), pointer-events none, no CSS filter (the iOS grain rule: the dark edge
 * is the SVG's own stroke), no transform on its target (it never touches the
 * target at all), bobbing toward the target by the browser's own animation
 * (Web Animations; still under prefers-reduced-motion).  The words beside it
 * say "click" on a computer (deskWords).  Remembered per character in
 * localStorage (inside try/catch), forgotten when the character starts again
 * (guideOwedAgain: the first quest never taken, no point ever earned).  `?guidearrow=0` turns it off for one tab.  QA:
 * window.__btGuideArrow.
 *
 * Mounted by QuestCoach.jsx (startGuideArrow), beside the coach it helps.
 */
import { gearFlashWants, gearFlashSelectors } from './mobile/gearFlash.js';
import { pointsTipWanted, pointsTipDone } from '../game/pointsTips.js';
import { deskWords } from '../game/deskWords.js';

const TICK_MS = 250;
export const WEAPON_MS = 60000;
export const POINTS_MS = 180000;
const SIZE = 56;                /* the arrow, CSS px */
const GAP = 6;                  /* between its point and the target's edge */
const GOLD = '#F5CE3C', EDGE = '#3A2606';
const LS_PREFIX = 'bt_guideArrow:';

/* the arrow drawn pointing DOWN, its point at the bottom middle */
const ARROW_SVG = '<svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">'
  + '<path d="M18 3 H38 V26 H51 L28 53 L5 26 H18 Z" fill="' + GOLD + '" stroke="' + EDGE + '" stroke-width="3" stroke-linejoin="round"/>'
  + '<path d="M22 7 H34 V29 H43" fill="none" stroke="#FFF3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/></svg>';

function offByUrl() {
  try { return new URLSearchParams(window.location.search).get('guidearrow') === '0'; } catch (e) { return false; }
}
function calm() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}
/* on the screen, not merely in the page (gearFlash's rule: the band keeps the
   other orientation's chips mounted and hidden) */
function shownRect(el) {
  if (!el || !el.getBoundingClientRect) return null;
  const r = el.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) return null;
  const vw = window.innerWidth || 0, vh = window.innerHeight || 0;
  if (r.bottom <= 0 || r.right <= 0 || r.top >= vh || r.left >= vw) return null;
  try { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) return null; } catch (e) { /* drawn */ }
  return r;
}
function firstShown(sels) {
  for (const sel of sels) {
    let list = [];
    try { list = Array.from(document.querySelectorAll(sel)); } catch (e) { list = []; }
    for (const el of list) { const r = shownRect(el); if (r) return { sel, el, r }; }
  }
  return null;
}

/* ── which lesson, and where (pure: server/test/guide-arrow.test.mjs) ── */

/** The weapon lesson's wants: the first quest's sword and shield only (the
 *  bow and the staff come later; their glow is enough). */
export function weaponWants(rpg) {
  const w = gearFlashWants(rpg);
  return { melee: w.melee, shield: w.shield, bow: false, staff: false };
}

/** The selectors the arrow tries, most specific first, for lesson `id`, given
 *  `shown(sel)` (is anything for it on the screen?).  [] for none. */
export function guideTargets(id, rpg, shown) {
  if (id === 'weapon') {
    const w = weaponWants(rpg);
    const folded = shown('[data-dash-fold="min"]') || shown('[data-land-fold="min"]');
    const tiles = gearFlashSelectors(w, false, true);
    const tileOnScreen = tiles.some(shown);
    return gearFlashSelectors(w, folded, tileOnScreen);
  }
  if (id === 'points') {
    /* v2.3.4082: inside the Points window (over the Bro card) there is
       nowhere left to go: no arrow (the coach's words say what the rows are) */
    if (shown('[data-bro-popup="Build"]')) return [];
    return ['[data-section="Build"]', '[data-nav="hero"]', '[data-dash-fold="min"]', '[data-land-fold="min"]'];
  }
  return [];
}

/** The words beside the arrow, for what it points at (said "click" on a computer). */
export function guideWords(id, sel, computer) {
  let s = 'Tap here';
  if (/data-dash-fold|data-land-fold/.test(sel)) s = 'Tap to open';
  else if (/data-nav="dashboard"/.test(sel)) s = 'Tap Gear';
  else if (/data-gear/.test(sel)) s = 'Tap to equip';
  else if (/data-nav="hero"/.test(sel)) s = 'Tap Bro: points to spend';
  else if (/data-section="Build"/.test(sel)) s = 'Tap Spend points';   /* v2.3.4082: the Bro card's button */
  return deskWords(s, computer);
}

/** Is lesson `id` wanted now, and is it finished?  `seen` the ms it has shown. */
export function guideState(id, rpg, S, seen, now) {
  if (id === 'weapon') {
    const w = weaponWants(rpg);
    const want = w.melee || w.shield;
    return { want, done: seen > 0 && (!want || seen >= WEAPON_MS) };
  }
  if (id === 'points') {
    const placed = pointsTipDone(rpg);
    return { want: !placed && pointsTipWanted(rpg, S, now), done: seen > 0 && (placed || seen >= POINTS_MS) };
  }
  return { want: false, done: true };
}

/** Lessons a character that started again is owed once more: the weapon
 *  lesson while the Mayor's first quest was never taken, the points lesson
 *  while no point was ever earned or placed.  (A lesson can only have been
 *  marked done past those, so a mark is never cleared and set in turn.) */
export function guideOwedAgain(rpg) {
  const out = [];
  if (!rpg) return out;
  const q = rpg._quests && typeof rpg._quests === 'object' ? rpg._quests : {};
  if (!q.tut_1) out.push('weapon');
  const p3 = rpg.prog3;
  if (p3 && typeof p3 === 'object' && !pointsTipDone(rpg) && !(Number(p3.pool) > 0) && !(Number(p3.shared) > 0)) out.push('points');
  return out;
}

/* ── remembered per character ── */
function loadDone(id) {
  try { const v = JSON.parse(localStorage.getItem(LS_PREFIX + id) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
function saveDone(id, v) {
  try { if (v && Object.keys(v).length) localStorage.setItem(LS_PREFIX + id, JSON.stringify(v)); else localStorage.removeItem(LS_PREFIX + id); } catch (e) { /* private window: shown again next time */ }
}

/* ── the arrow ── */
let _timer = null, _el = null, _bob = null, _label = null, _side = null;
const _seen = { weapon: 0, points: 0 };
let _lastTick = 0, _who = null, _done = {};
const qa = { lesson: null, sel: null, side: null, rect: null, target: null, n: 0, off: false, done: {} };

/* never two: any arrow on the page that is not this one goes (a stale copy
   was seen left at the fold handle's spot once in mp-guidearrow's runs) */
function sweepStrays() {
  try { document.querySelectorAll('[data-guide-arrow]').forEach((e) => { if (e !== _el) e.remove(); }); } catch (e) { /* none */ }
}
function ensureEl() {
  sweepStrays();
  if (_el && _el.parentNode) return _el;
  const el = document.createElement('div');
  el.setAttribute('data-guide-arrow', '');
  el.setAttribute('aria-hidden', 'true');
  const s = el.style;
  s.position = 'fixed'; s.left = '0px'; s.top = '0px'; s.width = SIZE + 'px'; s.height = SIZE + 'px';
  s.pointerEvents = 'none'; s.zIndex = '9050';
  /* no glide yet: it comes up where it points (place() turns the glide on
     after its first spot, so it never flies in from the corner) */
  const bob = document.createElement('div');
  bob.style.width = SIZE + 'px'; bob.style.height = SIZE + 'px';
  bob.innerHTML = ARROW_SVG;
  el.appendChild(bob);
  const label = document.createElement('div');
  const ls = label.style;
  ls.position = 'absolute'; ls.left = '0px'; ls.whiteSpace = 'nowrap';
  ls.font = '700 13px/1.2 system-ui, -apple-system, sans-serif'; ls.color = '#FFF6D6';
  ls.background = 'rgba(17,25,29,.92)'; ls.border = '1.5px solid ' + GOLD; ls.borderRadius = '8px'; ls.padding = '3px 8px';
  el.appendChild(label);
  document.body.appendChild(el);
  _el = el; _bob = bob; _label = label; _side = null;
  return el;
}
function hide() {
  if (_el) { try { _el.remove(); } catch (e) { /* gone */ } }
  _el = null; _bob = null; _label = null; _side = null;
  sweepStrays();
  qa.lesson = null; qa.sel = null; qa.side = null; qa.rect = null; qa.target = null;
}
/* point at rect r from above (down), or from below (up) when there is no room above */
function place(r, words) {
  ensureEl();
  const side = r.top >= SIZE + GAP + 4 ? 'above' : 'below';
  const cx = r.left + r.width / 2;
  const vw = window.innerWidth || 0;
  const left = Math.max(2, Math.min(vw - SIZE - 2, Math.round(cx - SIZE / 2)));
  const top = side === 'above' ? Math.round(r.top - GAP - SIZE) : Math.round(r.bottom + GAP);
  const first = !_el.style.transition;
  _el.style.left = left + 'px'; _el.style.top = top + 'px';
  if (first) { void _el.offsetWidth; _el.style.transition = 'left .2s ease-out, top .2s ease-out'; }
  if (_side !== side) {
    _side = side;
    _bob.style.transform = side === 'below' ? 'rotate(180deg)' : '';
    const ls = _label.style;
    if (side === 'above') { ls.top = ''; ls.bottom = (SIZE + 2) + 'px'; } else { ls.bottom = ''; ls.top = (SIZE + 2) + 'px'; }
    try { if (_bob.getAnimations) _bob.getAnimations().forEach((a) => a.cancel()); } catch (e) { /* none */ }
    if (!calm()) {
      const d = side === 'above' ? 10 : -10, rot = side === 'below' ? ' rotate(180deg)' : '';
      try { _bob.animate([{ transform: 'translateY(0)' + rot }, { transform: `translateY(${d}px)` + rot }, { transform: 'translateY(0)' + rot }], { duration: 900, iterations: Infinity, easing: 'ease-in-out' }); } catch (e) { /* still */ }
    }
  }
  if (_label.textContent !== words) _label.textContent = words;
  /* the words over the arrow's middle, but kept 4 px inside the screen (an
     arrow at the band's left end would put half of them off it) */
  const lw = _label.offsetWidth || 0;
  const want = left + SIZE / 2 - lw / 2;
  const at = Math.max(4, Math.min(vw - 4 - lw, want));
  _label.style.left = Math.round(at - left) + 'px';
  qa.side = side;
  qa.rect = { left, top, w: SIZE, h: SIZE };
  qa.target = { x: Math.round(cx), y: Math.round(side === 'above' ? r.top : r.bottom), left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
}

function tick(getS) {
  const now = Date.now();
  const dt = _lastTick ? Math.min(1000, now - _lastTick) : 0;
  _lastTick = now;
  if (offByUrl()) { qa.off = true; hide(); return; }
  let S = null;
  try { S = getS && getS(); } catch (e) { S = null; }
  const rpg = S && S.rpg;
  if (!S || !rpg || !S.__introLiftedAt || S._zoneLoading) { hide(); return; }
  const who = S.myId || null;
  if (!who) { hide(); return; }
  if (who !== _who) { _who = who; _done = loadDone(who); _seen.weapon = 0; _seen.points = 0; }
  for (const id of guideOwedAgain(rpg)) if (_done[id]) { delete _done[id]; _seen[id] = 0; saveDone(who, _done); }
  qa.done = Object.assign({}, _done);
  for (const id of ['weapon', 'points']) {
    if (_done[id]) continue;
    const st = guideState(id, rpg, S, _seen[id], now);
    if (st.done) { _done[id] = 1; saveDone(who, _done); qa.done = Object.assign({}, _done); continue; }
    if (!st.want) continue;
    const shown = (sel) => { try { return Array.from(document.querySelectorAll(sel)).some((el) => !!shownRect(el)); } catch (e) { return false; } };
    const hit = firstShown(guideTargets(id, rpg, shown));
    if (!hit) continue;
    if (_seen[id] === 0) qa.n++;
    _seen[id] += Math.max(1, dt);
    qa.lesson = id; qa.sel = hit.sel;
    place(hit.r, guideWords(id, hit.sel));
    return;
  }
  hide();
}

/** Start the arrow (QuestCoach mounts it once); returns the stop. */
export function startGuideArrow(getS) {
  if (_timer || typeof document === 'undefined') return stopGuideArrow;
  _timer = setInterval(() => tick(getS), TICK_MS);
  tick(getS);
  return stopGuideArrow;
}
export function stopGuideArrow() {
  if (_timer) { clearInterval(_timer); _timer = null; }
  _lastTick = 0;
  hide();
}

/* QA (mp-questcoach, mp-pointstips, the UI review's guide-arrow): what it
   shows and where, and a way to forget this character's lessons */
try {
  if (typeof window !== 'undefined') {
    qa.forget = () => { if (_who) saveDone(_who, {}); _done = {}; _seen.weapon = 0; _seen.points = 0; };
    window.__btGuideArrow = qa;
  }
} catch (e) { /* no page */ }
