/* ═══ v2.3.6860: THE NEW MENUS' WIRING ON THE PAGE (card MN step 1, the shell) ═══
 *
 * The rules are node's (src/game/menus3Panel.js the shape, menus3Router.js
 * every entry and where it opens, menus3Close.js the close rules); this file
 * only hands them the page's events and runs the road they name.  Under
 * `?menus3=0` (menus3Switch.js) startMenus3 returns at once: no listener, no
 * class, no change to the band's remembered fold -- yesterday's game.
 *
 * What it does when on:
 *   - THE REST.  The band rests on its slim row, which is the dock now (Bro,
 *     World, People: dash/DashHeader.jsx) -- folded for this load only, the
 *     fold never written (dashMinBus.quiet), so `?menus3=0` finds the band as
 *     the player left it;
 *   - THE ROADS.  A dock button or a shortcut opens what the router says:
 *     step 1 rebuilt no section, so every road is today's screen in today's
 *     window (the band's page, Gear's root, the world map, the chat box);
 *   - THE CONTROLS.  Upright, while a menu is open (today's band, or the new
 *     panel), the fight controls step aside: `html.bt-menus3-hide-ctl`, the
 *     same hidden-and-untouchable block the sideways band uses (game.css).
 *     Sideways and on a computer they stay (the sideways band's own rule
 *     still hides them over ITS open page, as today);
 *   - THE CLOSES.  A tap on the world, a swipe down on the open header, Esc
 *     (the X's data-esc, as every window), the X, and a hit taken outside a
 *     safe place close whichever menu is open.
 *
 * The new panel (Menus3Panel.jsx) is mounted and placed by its rule, but no
 * section opens it yet: only the QA probe (`__btMenus3.panel(menu)`) does,
 * so its shape and its closes are tested before step 4 fills it. */
import { menus3On } from './menus3Switch.js';
import { menus3Route, MENUS3_BUILT, MENUS3_TODAY } from '../../game/menus3Router.js';
import { menus3Shape, menus3CamOffset } from '../../game/menus3Panel.js';
import { navStart, navPush, navBack, navKeep, navPrune, navTop } from '../../game/menus3Nav.js';   /* v2.3.6861: the one Back (card MN step 4) */
import { menus3CloseWhy } from '../../game/menus3Close.js';
import { dashboardPanelBus } from '../mobile/dashboardPanelBus.js';
import { dashMinBus } from '../mobile/dashMinBus.js';
import { bandSideways } from '../mobile/bandSideways.js';
import { winVw, winVh } from '../mobile/playViewport.js';
import { fineInput } from '../../game/deviceProfile.js';

/* ── the new panel's one state ──
   v2.3.6861 (card MN step 4): + `nav`, the one Back's history (src/game/menus3Nav.js): every
   open and every header tab starts it again at its section's own page (the owner's rule 1);
   a page opened inside the panel (an item, a slot, a pet) is pushed on it, the page under it
   keeping its rail and scroll for Back. */
const _subs = new Set();
const SHUT = Object.freeze({ open: false, menu: null, section: null, nav: null });
let _panel = SHUT;
const isBuilt = (s) => MENUS3_BUILT.indexOf(s) >= 0;
export const menus3Bus = {
  get state() { return _panel; },
  /* v2.3.6862: `rail` the section's own page's place to open on (Power's lane, from the weapon bar) */
  open(menu, section, rail) {
    const sec = section || null;
    _panel = Object.freeze({ open: true, menu: menu || 'bro', section: sec, nav: navStart(sec, rail == null ? null : rail) });
    stamp(); emit();
  },
  /* a header tab: a built section starts its own page; one not built yet goes
     today's road (its screen in today's band), the panel shut behind it */
  section(s) {
    if (!_panel.open) return;
    if (isBuilt(s)) { _panel = Object.freeze({ ..._panel, section: s, nav: navStart(s) }); emit(); return; }
    menus3Bus.close();
    goToday(s);
  },
  push(page, arg, keep) {
    if (!_panel.open || !_panel.nav) return;
    const n = navPush(_panel.nav, page, arg, keep);
    if (n !== _panel.nav) { _panel = Object.freeze({ ..._panel, nav: n }); emit(); }
  },
  back() {
    if (!_panel.open || !_panel.nav) return false;
    const n = navBack(_panel.nav);
    if (n === _panel.nav) return false;
    _panel = Object.freeze({ ..._panel, nav: n }); emit();
    return true;
  },
  /* the page showing keeps its rail or scroll (no redraw: it is the page's own) */
  keep(k) { if (_panel.open && _panel.nav) _panel = Object.freeze({ ..._panel, nav: navKeep(_panel.nav, k) }); },
  /* pages over a thing that is gone (eaten, dropped) leave the history */
  prune(alive) {
    if (!_panel.open || !_panel.nav) return;
    const n = navPrune(_panel.nav, alive);
    if (n !== _panel.nav) { _panel = Object.freeze({ ..._panel, nav: n }); emit(); }
  },
  top() { return _panel.nav ? navTop(_panel.nav) : null; },
  bump() { if (_panel.open) emit(); },
  close() { if (!_panel.open) return; _panel = SHUT; stamp(); emit(); },
  subscribe(fn) { _subs.add(fn); return () => _subs.delete(fn); },
};
/* a section not built yet: today's screen in today's band (step 1's roads) */
function goToday(s) {
  const t = Object.prototype.hasOwnProperty.call(MENUS3_TODAY, s) ? MENUS3_TODAY[s] : null;
  if (!t) return;
  try {
    if (t.road === 'page') dashboardPanelBus.open(t.page);
    else if (t.road === 'gear') dashboardPanelBus.go({ type: 'gear' });
  } catch (e) { /* no band */ }
}
function emit() { for (const fn of _subs) { try { fn(_panel); } catch (e) { /* one listener */ } } }

let _on = false;
let _lastWhy = null;
let _lastRoute = null;

/** The shape now ('upright' or 'drawer'): the device profile's mouse, the
    window's kept size (playViewport.js winVw: no measuring here). */
export function menus3ShapeNow() {
  if (bandSideways()) return 'drawer';
  return menus3Shape(winVw(), winVh(), fineInput());
}

function bandShown() {
  try { const n = dashboardPanelBus.nav(); return !!(n && n.shown); } catch (e) { return false; }
}
/** Is a menu open: the new panel, or today's band a road opened. */
export function menus3Open() {
  return _panel.open || bandShown();
}

/** Close whichever menu is open, saying why (the QA probe reads it). */
export function menus3Close(why) {
  if (!_on || !menus3Open()) return false;
  _lastWhy = why || null;
  if (_panel.open) menus3Bus.close();
  if (bandShown()) { try { dashboardPanelBus.go({ type: 'close' }); } catch (e) { /* no band */ } }
  return true;
}

/** Run an entry's road (a dock button, a shortcut).  True when it went. */
export function menus3Go(entry, ctx) {
  /* v2.3.6861: the built sections open the new panel (the Bag first).
     v2.3.6863: `ctx.quest` -- the HUD's quest line names its quest (QuestCard.jsx openQuestPage) */
  const r = menus3Route(entry, Object.assign({ built: MENUS3_BUILT }, ctx || {}));
  _lastRoute = r;
  if (!r) return false;
  _ticket = null;   /* v2.3.6863: another road: a deep link's way back is dropped */
  _chatTicket = null;   /* v2.3.6864: and the chat box's */
  /* one menu at a time: today's band goes when the panel opens, the panel when a road opens the band */
  if (r.road === 'panel') {
    if (_panel.open && _panel.menu === r.menu && entry.indexOf('dock.') === 0) { menus3Close('dock'); return true; }
    if (bandShown()) { try { dashboardPanelBus.go({ type: 'close' }); } catch (e) { /* no band */ } }
  } else if (_panel.open) {
    menus3Bus.close();
  }
  try {
    switch (r.road) {
      case 'gear': dashboardPanelBus.go({ type: 'gear' }); return true;
      case 'page': dashboardPanelBus.open(r.page); return true;
      case 'weapon':
        dashboardPanelBus.open('hero');
        dashboardPanelBus.push('broCombat');
        dashboardPanelBus.push(r.page);
        return true;
      /* the map's own opener, from BroTown's chunk (already loaded: the
         minimap is on screen), so the page's first script does not grow */
      case 'map': import('../WorldMapOverlay.jsx').then((m) => m.openWorldMap()).catch(() => {}); return true;
      case 'chat': {
        const ui = typeof window !== 'undefined' ? window.__broLegacyUI : null;
        if (ui && typeof ui.chatOpen === 'function') { ui.chatOpen(); return true; }
        return false;
      }
      case 'panel':
        menus3Bus.open(r.menu, r.section, r.lane != null ? r.lane : (r.seg || null));   /* v2.3.6862: Power's lane from the weapon bar; v2.3.6864: the Roster's segment an entry names */
        /* v2.3.6863: the quest line opens THAT quest's page, its Back the Quests' own page */
        if (r.section === 'quests' && ctx && typeof ctx.quest === 'string' && ctx.quest) menus3Bus.push('quest', ctx.quest);
        return true;
      default: return false;
    }
  } catch (e) { return false; }
}

/* ═══ v2.3.6863: A DEEP LINK TO TODAY'S PAGE, AND THE WAY BACK (card MN step 7, World · Quests) ═══
   A quest's link (a monster's Codex page, an item's page) opens TODAY's page
   in today's band until the new Codex is built (card MN step 8).  The panel
   shuts (one menu at a time) and its history is kept as a TICKET; the page
   opened is an arrival (src/game/dashNav.js: its Back closes the band).  When
   the band shuts, the ticket says how: its Back took the arrival off the
   stack, so the panel opens again where it was (the quest, its rail and
   scroll); a Close (the X, the world, Esc) keeps the arrival on the stack and
   the panel stays shut.  Only one ticket; any other road drops it. */
let _ticket = null;
let _ticketOff = null;
function arrivalKey() {
  try {
    const n = dashboardPanelBus.nav();
    const st = n && n.ws && Array.isArray(n[n.ws]) ? n[n.ws] : null;
    const t = st && st.length ? st[st.length - 1] : null;
    return t && t.key != null ? { ws: n.ws, key: t.key } : null;
  } catch (e) { return null; }
}
function onBandChange() {
  const tk = _ticket;
  if (!tk || bandShown()) return;
  _ticket = null;
  if (_ticketOff) { try { _ticketOff(); } catch (e) { /* gone */ } _ticketOff = null; }
  let still = false;
  try { const n = dashboardPanelBus.nav(); still = !!(n && Array.isArray(n[tk.at.ws]) && n[tk.at.ws].some((e) => e && e.key === tk.at.key)); } catch (e) { still = false; }
  if (still) return;   /* a Close: the panel stays shut */
  _panel = Object.freeze({ open: true, menu: tk.menu, section: tk.section, nav: tk.nav });
  stamp(); emit();
}
export function menus3Away(go) {
  if (!_panel.open || typeof go !== 'function') return false;
  const keep = { menu: _panel.menu, section: _panel.section, nav: _panel.nav };
  menus3Bus.close();
  try { go(); } catch (e) { return false; }
  const at = arrivalKey();
  if (!at || !bandShown()) return true;   /* nothing arrived in the band (the old dashboard): no way back to keep */
  _ticket = Object.assign(keep, { at });
  if (!_ticketOff) { try { _ticketOff = dashboardPanelBus.subscribe(onBandChange); } catch (e) { _ticketOff = null; } }
  return true;
}

/* ═══ v2.3.6864: THE PLAYER PAGE'S "MESSAGE", AND THE WAY BACK (card MN step 10, People · Roster) ═══
   "Message" opens TODAY's chat box with the whisper aimed at the player (the
   new Chat is card MN step 11).  The chat box is no page of the band, so its
   way back is its own: the panel shuts (one menu at a time) and its history
   is kept; when the chat box shuts (its close, Esc, or a line sent: the box
   shuts itself as it always did) the panel opens again where it was, on the
   player's page.  BroTown tells it (menus3ChatShut, its chatOpen's effect).
   Any other road drops it (menus3Go). */
let _chatTicket = null;
export function menus3AwayChat(go) {
  if (!_panel.open || typeof go !== 'function') return false;
  const keep = { menu: _panel.menu, section: _panel.section, nav: _panel.nav };
  menus3Bus.close();
  try { if (go() === false) { _panel = Object.freeze(Object.assign({ open: true }, keep)); stamp(); emit(); return false; } } catch (e) { return false; }
  _chatTicket = keep;
  return true;
}
/** BroTown: the chat box shut (its `chatOpen` went false). */
export function menus3ChatShut() {
  const tk = _chatTicket;
  if (!tk) return;
  _chatTicket = null;
  if (_panel.open) return;
  _panel = Object.freeze({ open: true, menu: tk.menu, section: tk.section, nav: tk.nav });
  stamp(); emit();
}

/* the one class block game.css reads */
function stamp() {
  if (typeof document === 'undefined') return;
  const de = document.documentElement;
  try {
    const open = _on && menus3Open();
    const shape = _on ? menus3ShapeNow() : 'upright';
    de.classList.toggle('bt-menus3-hide-ctl', open && shape === 'upright');
    de.classList.toggle('bt-menus3-drawer', _on && shape === 'drawer');
    /* v2.3.6861: the new panel open as the right drawer: the right-hand fight controls stand left of it (game.css) */
    de.classList.toggle('bt-menus3-drawer-open', _on && _panel.open && shape === 'drawer');
  } catch (e) { /* no page */ }
}

/* ── the world's tap and the header's swipe ── */
function onWorld(t) {
  /* v2.3.6863: the world map's own canvas is no tap on the world (a quest's Show on map opens it OVER the panel) */
  return !!(t && t.tagName === 'CANVAS' && !(t.closest && t.closest('[data-band-box],[data-menus3-panel],[data-world-map]')));
}
function onHeader(t) {
  if (!t || !t.closest) return false;
  if (t.closest('[data-menus3-head]')) return true;
  const f = t.closest('[data-dash-frame]');
  return !!f && f.getAttribute('data-dash-frame') !== 'closed';
}
let _press = null;
let _touch = null;
/* ═══ v2.3.6861: THE PRESS THAT CLOSES A MENU IS SWALLOWED (card MN step 4; step 1's flaw) ═══
   While a menu is open, a press that starts on the world is the menu's, whole:
   its pointer events, the touch and mouse twins of it, and the click after it
   never reach the world's own listeners (window, capture: first of all), so it
   neither walks, swings nor talks.  A tap (moved under 10 px) closes the menu;
   a drag only goes nowhere.  The next press is the world's again. */
let _eat = false;      /* the press being swallowed */
let _eatClick = 0;     /* the click that follows it, until this time */
function swallow(e) {
  try { e.stopPropagation(); e.stopImmediatePropagation(); } catch (x) { /* an old event */ }
  try { if (e.cancelable) e.preventDefault(); } catch (x) { /* passive */ }
}
function down(e) {
  _press = null;
  _eat = false;
  if (!menus3Open() || !onWorld(e.target)) return;
  _press = { x: e.clientX, y: e.clientY };
  _eat = true;
  swallow(e);
}
function up(e) {
  const p = _press;
  _press = null;
  if (_eat) { swallow(e); _eat = false; _eatClick = Date.now() + 600; }
  if (!p) return;
  const why = menus3CloseWhy({ kind: 'world', dx: e.clientX - p.x, dy: e.clientY - p.y });
  if (why) menus3Close(why);
}
function eatTwin(e) {
  if (_eat || (e.type === 'click' && Date.now() < _eatClick && onWorld(e.target))) {
    if (e.type === 'click') _eatClick = 0;
    swallow(e);
  }
}
function tStart(e) {
  _touch = null;
  if (!menus3Open() || !onHeader(e.target)) return;
  const t = e.touches && e.touches[0];
  if (t) _touch = { x: t.clientX, y: t.clientY };
}
function tEnd(e) {
  const s = _touch;
  _touch = null;
  if (!s) return;
  const t = e.changedTouches && e.changedTouches[0];
  if (!t) return;
  const why = menus3CloseWhy({ kind: 'swipe', dx: t.clientX - s.x, dy: t.clientY - s.y, shape: menus3ShapeNow() });
  if (why) menus3Close(why);
}

let _started = false;
/** main.jsx, after startBandSideways(): before the first render. */
export function startMenus3() {
  if (_started || typeof window === 'undefined') return;
  _started = true;
  _on = menus3On();
  try { document.documentElement.classList.toggle('bt-menus3', _on); } catch (e) { /* no page */ }
  if (!_on) return;
  /* the rest is the dock: folded for this load, never written */
  dashMinBus.quiet = true;
  dashMinBus.set(true);
  window.addEventListener('pointerdown', down, true);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', () => { _press = null; _eat = false; }, true);
  /* v2.3.6861: the swallowed press's twins (passive: false, so a touch's walk is stopped too) */
  for (const t of ['pointermove', 'mousedown', 'mousemove', 'mouseup', 'click', 'contextmenu']) window.addEventListener(t, eatTwin, true);
  for (const t of ['touchstart', 'touchmove', 'touchend']) window.addEventListener(t, eatTwin, { capture: true, passive: false });
  window.addEventListener('touchstart', tStart, { capture: true, passive: true });
  window.addEventListener('touchend', tEnd, { capture: true, passive: true });
  window.addEventListener('touchcancel', () => { _touch = null; }, { capture: true, passive: true });
  try { dashMinBus.subscribe(stamp); } catch (e) { /* no fold bus */ }
  try { dashboardPanelBus.subscribe && dashboardPanelBus.subscribe(stamp); } catch (e) { /* no bus */ }
  window.addEventListener('resize', stamp);
  stamp();
  /* QA: the shell's probe (tools/qa/mp/mp-menus3shell.mjs) */
  window.__btMenus3 = {
    on: () => _on,
    open: () => menus3Open(),
    shape: () => menus3ShapeNow(),
    panel: (menu, section) => menus3Bus.open(menu, section),
    panelState: () => _panel,
    back: () => menus3Bus.back(),
    top: () => menus3Bus.top(),
    go: (entry, ctx) => menus3Go(entry, ctx),   /* v2.3.6863: + ctx (the quest line's quest) */
    route: () => _lastRoute,
    why: () => _lastWhy,
  };
}

export function menus3Active() { return _on; }

/** v2.3.6861 (card MN step 4): the camera's shift while the new panel is open
    upright, in the world's px for a world `H` tall (src/game/menus3Panel.js
    menus3CamOffset): the bro stays in view above the panel.  0 otherwise. */
export function menus3CamShift(H) {
  if (!_on || !_panel.open) return 0;
  return menus3CamOffset(true, menus3ShapeNow(), H);
}
