/* ═══ v2.3.4343: THE FIRST-TIME TEACHING, DRAWN (the half that touches the page) ═══
 * What the owner saw a new player miss on a computer (2026-11-05), one thing
 * each below.  The sums and the remembered counts are game/deskTeachState.js
 * (node tests them); the big arrow's own lessons (CLOSE, the harvest pad, the
 * phone's special / shield) are ui/guideArrow.js.  Each element is built like
 * the arrow: on the body, outside .brotown-wrap (TRAPS §20), pointer-events
 * none, no CSS filter, removed (not hidden) when it is not wanted.
 *   1. HARVEST (computer): when the window opens, a big pulsing E key and
 *      "Press E to collect!" right over the character; if the window passes or
 *      the player walks off without it, a toast "Almost! Press E (or drag) when
 *      the bar empties to collect."  The first HARVEST_TIMES harvests.
 *   2. RESOURCE (any layout): while a quest's road leads to a resource node, a
 *      soft pulsing ring on each matching node on the screen, an arrow on the
 *      screen's edge toward the nearest when it is off screen, and the node's
 *      minimap marks pulse larger (S._teachNode, read by wheelMinimap.js).
 *   3. ATTACK (computer): a sword cursor over a monster; the first
 *      ATTACK_TIMES times one comes near, "Click the monster to attack".
 *   4. TIPS (computer): after the first kill, once, a card: Right-click =
 *      special attack, Q = shield up/down (the phone's is the big arrow).
 * `?guidearrow=0` turns all of it off for one tab.  QA: window.__btDeskTeach. */
import { onComputer } from '../game/deskWords.js';
import { worldReady } from './loadingGate.js';
import { questRoutePoint } from '../game/questRoute.js';
import { HARVEST_TIMES, ATTACK_TIMES, loadTeach, saveTeach, harvestCoachWanted, gestureWanted, killedAny, edgeArrowSpot, overAny } from '../game/deskTeachState.js';

const TICK_MS = 200;
const NEAR_PX = 280;       /* a monster "comes near": this close in game px */
const LABEL_MS = 7000;
const TOAST_MS = 4200;
const TIPS_MS = 15000;
const GOLD = '#F5CE3C', EDGE = '#3A2606';
const SWORD = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M5 27 L8 24 L4 20 L7 17 L11 21 L14 18 L10 14 L24 3 L29 3 L29 8 L18 22 L14 18' fill='%23F4F1E4' stroke='%23222' stroke-width='1.6' stroke-linejoin='round'/><path d='M8 24 L4 28' stroke='%23C9973F' stroke-width='3' stroke-linecap='round'/></svg>\") 4 28, crosshair";

let _timer = null, _getS = null, _who = null, _t = {};
let _keyEl = null, _toastEl = null, _tipsEl = null, _labelEl = null, _edgeEl = null;
let _rings = [];
let _armed = null;            /* { ex, at }: the harvest window seen open */
let _toastUntil = 0, _tipsUntil = 0, _encUntil = 0, _nextEnc = 0, _lastMouse = null, _cursorOn = false;
const qa = { key: false, toast: '', tips: false, label: '', rings: 0, edge: false, cursor: false, harvest: 0, attack: 0, node: null };

function offByUrl() {
  try { return new URLSearchParams(window.location.search).get('guidearrow') === '0'; } catch (e) { return false; }
}
function calm() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}
function box(css) {
  const el = document.createElement('div');
  el.setAttribute('data-desk-teach', '');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:9040;' + css;
  document.body.appendChild(el);
  return el;
}
function gone(el) { if (el) { try { el.remove(); } catch (e) { /* gone */ } } return null; }
function pulse(el, from, to, ms) {
  if (calm() || !el.animate) return;
  try { el.animate([{ transform: from }, { transform: to }, { transform: from }], { duration: ms, iterations: Infinity, easing: 'ease-in-out' }); } catch (e) { /* still */ }
}
function cap(label, size) {
  return '<span style="display:inline-block;min-width:' + size + 'px;height:' + size + 'px;line-height:' + (size - 4) + 'px;padding:0 8px;box-sizing:border-box;text-align:center;'
    + 'font:800 ' + Math.round(size * 0.5) + 'px/' + (size - 4) + 'px system-ui,sans-serif;color:#FFF6D6;background:#1B2A33;border:2px solid ' + GOLD + ';border-bottom-width:4px;border-radius:9px;box-shadow:0 0 12px rgba(245,206,60,.55)">' + label + '</span>';
}
/* a world point on the page (CSS px): the same sum as mayorScreen.js */
function toScreen(S, wx, wy) {
  const cam = S && S.camera;
  const c = typeof document !== 'undefined' ? (document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas')) : null;
  if (!cam || !c || !isFinite(wx) || !isFinite(wy)) return null;
  const cr = c.getBoundingClientRect(), sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
  return { x: cr.left + (wx - cam.x) * sx, y: cr.top + (wy - cam.y) * sy, sx, sy };
}
const px = (o) => (typeof o.renderX === 'number' && isFinite(o.renderX)) ? o.renderX : o.x;
const py = (o) => (typeof o.renderY === 'number' && isFinite(o.renderY)) ? o.renderY : o.y;
function liveMonsters(S) {
  const out = [];
  for (const m of (S && S.monsters) || []) if (m && m.alive !== false && !(m.hp != null && m.hp <= 0) && isFinite(m.x)) out.push(m);
  return out;
}
function monsterRects(S) {
  const out = [];
  for (const m of liveMonsters(S)) {
    const p = toScreen(S, px(m), py(m) - 14);
    if (p) out.push({ x: p.x, y: p.y, r: 38 * Math.max(0.6, p.sx), m });
  }
  return out;
}

/* ── 1. the harvest ── */
function harvestTick(S, now, who) {
  const ex = S._extraction;
  const open = gestureWanted(S);
  if (open && !_armed) _armed = { ex, at: now };
  if (_armed && (!open || S._extraction !== _armed.ex)) {
    /* the window ended: done (the worker's reward ran) or missed */
    const ok = (S._lastHarvestOkAt || 0) >= _armed.at - 50;
    _armed = null;
    if (ok) { _t.harvest = (Number(_t.harvest) || 0) + 1; saveTeach(who, _t); }
    else if ((Number(_t.miss) || 0) < 6 && harvestCoachWanted(who)) {
      _t.miss = (Number(_t.miss) || 0) + 1; saveTeach(who, _t);
      toast('Almost! Press E (or drag) when the bar empties to collect.', now);
    }
  }
  const want = open && harvestCoachWanted(who) && onComputer();
  if (!want) { _keyEl = gone(_keyEl); qa.key = false; return; }
  const p = toScreen(S, S.player.x, S.player.y);
  if (!p) { _keyEl = gone(_keyEl); qa.key = false; return; }
  if (!_keyEl) {
    _keyEl = box('display:flex;flex-direction:column;align-items:center;gap:6px;');
    _keyEl.innerHTML = '<div data-desk-teach-key="">' + cap('E', 56) + '</div><div style="font:800 15px/1.2 system-ui,sans-serif;color:#FFF6D6;background:rgba(17,25,29,.94);border:1.5px solid ' + GOLD + ';border-radius:9px;padding:4px 10px;white-space:nowrap">Press E to collect!</div>';
    pulse(_keyEl.firstChild, 'scale(1)', 'scale(1.18)', 700);
  }
  const w = _keyEl.offsetWidth || 150, h = _keyEl.offsetHeight || 90;
  const vw = window.innerWidth || 0;
  _keyEl.style.left = Math.round(Math.max(4, Math.min(vw - w - 4, p.x - w / 2))) + 'px';
  _keyEl.style.top = Math.round(Math.max(4, p.y - 70 * p.sy - h)) + 'px';
  qa.key = true;
}
function toast(words, now) {
  _toastEl = gone(_toastEl);
  _toastEl = box('left:50%;top:22%;transform:translateX(-50%);max-width:88vw;font:800 15px/1.3 system-ui,sans-serif;color:#FFF6D6;background:rgba(17,25,29,.96);border:2px solid ' + GOLD + ';border-radius:12px;padding:9px 16px;text-align:center;box-shadow:0 4px 18px rgba(0,0,0,.5)');
  _toastEl.textContent = words;
  _toastUntil = now + TOAST_MS;
  qa.toast = words;
}

/* ── 2. the resource a quest wants ── */
function resourceTick(S) {
  let pt = null;
  try { pt = questRoutePoint(S.currentZone, S.rpg || null, S); } catch (e) { pt = null; }
  let kind = null;
  if (pt && pt.way === 'node') {
    for (const n of S.gatherNodes || []) { if (n && n.alive && Math.abs(n.x - pt.x) < 2 && Math.abs(n.y - pt.y) < 2) { kind = n.nodeType; break; } }
  }
  S._teachNode = kind || null;
  qa.node = kind || null;
  const vw = window.innerWidth || 0, vh = window.innerHeight || 0;
  let used = 0;
  if (kind) {
    for (const n of S.gatherNodes || []) {
      if (!n || !n.alive || n.nodeType !== kind) continue;
      const p = toScreen(S, n.x, n.y);
      if (!p || p.x < -20 || p.y < -20 || p.x > vw + 20 || p.y > vh + 20) continue;
      let r = _rings[used];
      if (!r) {
        r = box('width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;border:3px solid ' + GOLD + ';box-shadow:0 0 14px 3px rgba(245,206,60,.55),inset 0 0 12px rgba(245,206,60,.35);z-index:9030');
        pulse(r, 'scale(.82)', 'scale(1.12)', 1100);
        _rings.push(r);
      }
      r.style.left = Math.round(p.x) + 'px'; r.style.top = Math.round(p.y - 18 * p.sy) + 'px';
      used++;
    }
  }
  while (_rings.length > used) gone(_rings.pop());
  qa.rings = used;
  /* the edge arrow: toward the nearest one, only while none of them is on the screen */
  let edge = null;
  if (kind && used === 0 && pt) { const p = toScreen(S, pt.x, pt.y); if (p) edge = edgeArrowSpot(vw, vh, p.x, p.y, 30); }
  if (!edge) { _edgeEl = gone(_edgeEl); qa.edge = false; return; }
  if (!_edgeEl) {
    _edgeEl = box('width:44px;height:44px;margin:-22px 0 0 -22px;z-index:9035');
    _edgeEl.innerHTML = '<svg viewBox="0 0 56 56" width="44" height="44" aria-hidden="true"><path d="M3 18 V38 H26 V51 L53 28 L26 5 V18 Z" fill="' + GOLD + '" stroke="' + EDGE + '" stroke-width="3" stroke-linejoin="round"/></svg>';
    pulse(_edgeEl.firstChild, 'scale(1)', 'scale(1.2)', 800);
  }
  _edgeEl.style.left = Math.round(edge.x) + 'px'; _edgeEl.style.top = Math.round(edge.y) + 'px';
  _edgeEl.style.rotate = edge.angle + 'rad';
  qa.edge = true;
}

/* ── 3. click to attack ── */
function setCursor(on) {
  if (on === _cursorOn) return;
  _cursorOn = on; qa.cursor = on;
  const c = document.querySelector('canvas.brotown-canvas');
  if (c) c.style.cursor = on ? SWORD : '';
}
function onMove(e) {
  _lastMouse = { x: e.clientX, y: e.clientY };
  const S = _getS && _getS();
  if (!S || !onComputer() || offByUrl() || !worldReady(Date.now())) { setCursor(false); return; }
  const t = e.target;
  const onWorld = !!(t && t.closest && t.closest('canvas.brotown-canvas'));
  setCursor(onWorld && !!overAny(e.clientX, e.clientY, monsterRects(S)));
}
function attackTick(S, now, who) {
  if (!onComputer() || !((Number(_t.attack) || 0) < ATTACK_TIMES || now < _encUntil)) { _labelEl = gone(_labelEl); qa.label = ''; return; }
  let near = null, nd = Infinity;
  for (const m of liveMonsters(S)) {
    const d = Math.hypot(m.x - S.player.x, m.y - S.player.y);
    if (d < NEAR_PX && d < nd) { nd = d; near = m; }
  }
  if (!near) { if (now > _encUntil + 8000) _nextEnc = 0; _labelEl = gone(_labelEl); qa.label = ''; return; }
  if (now >= _nextEnc && now >= _encUntil && (Number(_t.attack) || 0) < ATTACK_TIMES) {
    _encUntil = now + LABEL_MS; _nextEnc = Infinity;
    _t.attack = (Number(_t.attack) || 0) + 1; saveTeach(who, _t); qa.attack = _t.attack;
  }
  if (now >= _encUntil) { _labelEl = gone(_labelEl); qa.label = ''; return; }
  const p = toScreen(S, px(near), py(near) - 64);
  if (!p) { _labelEl = gone(_labelEl); qa.label = ''; return; }
  if (!_labelEl) {
    _labelEl = box('font:800 14px/1.2 system-ui,sans-serif;color:#FFF6D6;background:rgba(17,25,29,.94);border:1.5px solid ' + GOLD + ';border-radius:9px;padding:4px 10px;white-space:nowrap');
    _labelEl.textContent = 'Click the monster to attack';
  }
  const w = _labelEl.offsetWidth || 190, vw = window.innerWidth || 0;
  _labelEl.style.left = Math.round(Math.max(4, Math.min(vw - w - 4, p.x - w / 2))) + 'px';
  _labelEl.style.top = Math.round(Math.max(4, p.y - 30 * p.sy)) + 'px';
  qa.label = 'Click the monster to attack';
}

/* ── 4. the combat tips card after the first kill ── */
function tipsTick(S, now, who) {
  if (_tipsEl && now >= _tipsUntil) { _tipsEl = gone(_tipsEl); qa.tips = false; }
  if (_tipsEl || _t.tips || !onComputer() || !killedAny(S.rpg)) return;
  _t.tips = 1; saveTeach(who, _t);
  _tipsUntil = now + TIPS_MS;
  _tipsEl = box('left:50%;top:84px;transform:translateX(-50%);max-width:92vw;background:rgba(17,25,29,.96);border:2px solid ' + GOLD + ';border-radius:14px;padding:12px 18px;box-shadow:0 6px 22px rgba(0,0,0,.55);text-align:center;font:700 15px/1.3 system-ui,sans-serif;color:#FFF6D6');
  _tipsEl.setAttribute('data-desk-teach-tips', '');
  _tipsEl.innerHTML = '<div style="font-weight:900;font-size:13px;letter-spacing:.08em;color:' + GOLD + ';margin-bottom:8px">COMBAT TIPS</div>'
    + '<div style="display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap">'
    + '<span style="display:inline-flex;gap:8px;align-items:center">' + cap('Right-click', 36) + ' Special attack</span>'
    + '<span style="display:inline-flex;gap:8px;align-items:center">' + cap('Q', 36) + ' Shield up / down</span></div>';
  qa.tips = true;
}
function onTipsUse(e) {
  if (!_tipsEl) return;
  if (e.type === 'contextmenu' || (e.type === 'keydown' && (e.key === 'q' || e.key === 'Q'))) { _tipsEl = gone(_tipsEl); qa.tips = false; }
}

function clearAll() {
  _keyEl = gone(_keyEl); _toastEl = gone(_toastEl); _tipsEl = gone(_tipsEl); _labelEl = gone(_labelEl); _edgeEl = gone(_edgeEl);
  while (_rings.length) gone(_rings.pop());
  setCursor(false);
  qa.key = false; qa.rings = 0; qa.edge = false; qa.tips = false; qa.label = '';
}

function tick() {
  const now = Date.now();
  if (offByUrl()) { clearAll(); return; }
  let S = null;
  try { S = _getS && _getS(); } catch (e) { S = null; }
  if (!S || !S.rpg || !S.player || !S.__introLiftedAt || S._zoneLoading || !worldReady(now) || !S.myId) { clearAll(); return; }
  if (S.myId !== _who) { _who = S.myId; _t = loadTeach(_who); _armed = null; qa.harvest = Number(_t.harvest) || 0; qa.attack = Number(_t.attack) || 0; }
  if (_toastEl && now >= _toastUntil) { _toastEl = gone(_toastEl); qa.toast = ''; }
  try { harvestTick(S, now, _who); } catch (e) { /* a teaching never breaks the game */ }
  try { resourceTick(S); } catch (e) { /* as above */ }
  try { attackTick(S, now, _who); } catch (e) { /* as above */ }
  try { tipsTick(S, now, _who); } catch (e) { /* as above */ }
  qa.harvest = Number(_t.harvest) || 0;
}

/** Start the teaching (QuestCoach mounts it once, beside the big arrow); returns the stop. */
export function startDeskTeach(getS) {
  _getS = getS;
  if (_timer || typeof document === 'undefined') return stopDeskTeach;
  _timer = setInterval(tick, TICK_MS);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('contextmenu', onTipsUse, true);
  window.addEventListener('keydown', onTipsUse, true);
  tick();
  return stopDeskTeach;
}
export function stopDeskTeach() {
  if (_timer) { clearInterval(_timer); _timer = null; }
  try { window.removeEventListener('pointermove', onMove); window.removeEventListener('contextmenu', onTipsUse, true); window.removeEventListener('keydown', onTipsUse, true); } catch (e) { /* none */ }
  clearAll();
}

try {
  if (typeof window !== 'undefined') {
    qa.forget = () => { if (_who) saveTeach(_who, {}); _t = {}; _nextEnc = 0; _encUntil = 0; };
    window.__btDeskTeach = qa;
  }
} catch (e) { /* no page */ }
