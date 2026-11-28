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
import { menus3Route } from '../../game/menus3Router.js';
import { menus3Shape } from '../../game/menus3Panel.js';
import { menus3CloseWhy } from '../../game/menus3Close.js';
import { dashboardPanelBus } from '../mobile/dashboardPanelBus.js';
import { dashMinBus } from '../mobile/dashMinBus.js';
import { bandSideways } from '../mobile/bandSideways.js';
import { winVw, winVh } from '../mobile/playViewport.js';
import { fineInput } from '../../game/deviceProfile.js';

/* ── the new panel's one state (step 1: the QA probe opens it) ── */
const _subs = new Set();
let _panel = Object.freeze({ open: false, menu: null, section: null });
export const menus3Bus = {
  get state() { return _panel; },
  open(menu, section) {
    _panel = Object.freeze({ open: true, menu: menu || 'bro', section: section || null });
    stamp(); emit();
  },
  section(s) { if (_panel.open) { _panel = Object.freeze({ ..._panel, section: s }); emit(); } },
  close() { if (!_panel.open) return; _panel = Object.freeze({ open: false, menu: null, section: null }); stamp(); emit(); },
  subscribe(fn) { _subs.add(fn); return () => _subs.delete(fn); },
};
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
  const r = menus3Route(entry, ctx);
  _lastRoute = r;
  if (!r) return false;
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
      case 'panel': menus3Bus.open(r.menu, r.section); return true;
      default: return false;
    }
  } catch (e) { return false; }
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
  } catch (e) { /* no page */ }
}

/* ── the world's tap and the header's swipe ── */
function onWorld(t) {
  return !!(t && t.tagName === 'CANVAS' && !(t.closest && t.closest('[data-band-box],[data-menus3-panel]')));
}
function onHeader(t) {
  if (!t || !t.closest) return false;
  if (t.closest('[data-menus3-head]')) return true;
  const f = t.closest('[data-dash-frame]');
  return !!f && f.getAttribute('data-dash-frame') !== 'closed';
}
let _press = null;
let _touch = null;
function down(e) {
  _press = null;
  if (!menus3Open() || !onWorld(e.target)) return;
  _press = { x: e.clientX, y: e.clientY };
}
function up(e) {
  const p = _press;
  _press = null;
  if (!p) return;
  const why = menus3CloseWhy({ kind: 'world', dx: e.clientX - p.x, dy: e.clientY - p.y });
  if (why) menus3Close(why);
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
  window.addEventListener('pointercancel', () => { _press = null; }, true);
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
    go: (entry) => menus3Go(entry),
    route: () => _lastRoute,
    why: () => _lastWhy,
  };
}

export function menus3Active() { return _on; }
