/* ═══ v2.3.3891: EVERY FRAME, YOUR BODY AND YOUR LEGS, ON THE PHONE ITSELF ═══
 *
 * The owner, 2026-10-29, on their iPhone: the legs "only one frame is drawn
 * and the rest is transparent", jogging north, north-west, west and
 * south-west, after getting off the skateboard with the bow or the staff --
 * "the bow still shows as equipped ... But there is nothing equipped and I
 * cannot attack."  Earlier that day the whole body vanished in the same four
 * facings.  Neither shows on the test machine (mp-rideoff, mp-bodyfacing,
 * every frame read), so this asks the phone.
 *
 * With `?bodyframes` in the address (nothing at all otherwise: not even
 * fetched, pixiRenderer.js), the moment before each frame is drawn it notes
 * your bro's state -- the walking body (shown, its sheet and frame, the look
 * palette's row, mirrored), a stand-in drawing you instead (the bow's shot,
 * the sword's swing), the weapon (the lane in hand, the weapon's place over or
 * under the body, shown), the attack (held, aiming, pending) and the board --
 * and right after the frame is drawn it reads the pixels of the lower half of
 * the figure back off the drawing buffer and counts those in your trousers'
 * colour (its hue and near its brightness).  A frame whose count falls
 * under 15% of the usual for that very frame of the pose and facing (its
 * running middle value) is a frame the legs did not reach the screen: counted by facing, the last ones kept with the state that
 * frame had.
 *
 * On the screen, for a phone with no console: a box in the top-left corner
 * (a plain element outside the game's root, pointer-events none, written at
 * most twice a second, gone on leaving the page) with the frames, the drops by
 * facing, the state now, and the last three drops.  Play until it happens,
 * take a screenshot.  `window.__btBodyFrames()` (and `(true)` to start again)
 * for a test.
 */
import { Texture } from 'pixi.js';
import { getPants, pantsTarget } from './playerSkins.js';

export const BODY_FRAMES_ON = typeof window !== 'undefined' && /[?&]bodyframes(=|&|$)/.test((window.location && window.location.search) || '');

const DEFAULT_PANTS = [106, 122, 69];   /* the sheets' own trousers (PANTS_CATALOG 'default' swatch) */
const _bf = { frames: 0, looked: 0, drops: 0, byFacing: Object.create(null), log: [], base: Object.create(null), now: null };

const short = (s) => String(s || '').split('/').pop().split('?')[0].slice(-28);
/* the state of your bro this frame, in a few short fields */
function stateOf(d, S) {
  const sb = d._spriteBody;
  const t = sb && sb.texture;
  const look = t && t._btLook;
  const at = d._btHeadAt || {};
  const wc = d._weaponContainer;
  const rpg = (S && S.rpg) || {};
  const slot = rpg.activeSlot || 'melee';
  const inHand = slot === 'melee' ? rpg.weapon : slot === 'ranged' ? rpg.rangedWeapon : rpg.staffWeapon;
  return {
    pose: d._animPose || at.pose || null, dir: d._animDir || at.dir || null, frame: d._animFrame, mirror: !!(sb && sb.scale.x < 0),
    facing: S ? S._renderFacing || null : null,
    body: !sb ? 'none' : (!sb.visible ? 'hidden' : (!t || t === Texture.EMPTY ? 'empty' : (t.destroyed || !t.source || t.source.destroyed ? 'freed' : 'shown'))),
    sheet: look ? 'look' : (t && t.source && /\.(png|webp)/.test(String(t.source.label || (t.source.resource && t.source.resource.src) || '')) ? short(t.source.label || t.source.resource.src) : (t ? 'baked' : null)),
    ix: t ? t.__btIx : null, row: look ? look.row : null,
    standIn: S ? (S._bowShowing ? 'bow' : (S._standInBody ? 'stand-in' : null)) : null,
    slot, inHand: inHand ? inHand.type || '?' : null,
    weapon: !wc ? null : (!wc.visible ? 'hidden' : (sb && wc.parent === d && sb.parent === d ? (d.getChildIndex(wc) > d.getChildIndex(sb) ? 'over' : 'under') : 'shown')),
    auto: !!(S && S.autoAttack), aim: !!(S && S._aiming), pend: !!(S && S._atkPending),
    ride: !!(S && S._ride && S._ride.on), rideWhy: S && S._ride ? S._ride.why || null : null,
  };
}

/** Once a frame, before app.render. */
export function bodyFrameTick(entityRenderer) {
  if (!BODY_FRAMES_ON) return;
  const d = entityRenderer && entityRenderer.playerDisplay;
  const S = typeof window !== 'undefined' && window._gameState ? window._gameState.current : null;
  if (!d || d.destroyed) { _bf.now = null; readoutGone(); return; }
  _bf.frames++;
  _bf.now = stateOf(d, S);
  readout();
}

/* the trousers' colour: its hue (the channels' proportions) AND near its
   brightness, shaded either way -- a hue alone took the commons' grass for the
   default olive (the first trial: a third of all frames "missing") */
function inColour(r, g, b, t) {
  const tm = Math.max(t[0], t[1], t[2]);
  const m = Math.max(r, g, b);
  if (tm < 70) return m < 80 && m > 8;
  if (m < tm * 0.45 || m > Math.min(255, tm * 1.35)) return false;
  return Math.abs(r / m - t[0] / tm) + Math.abs(g / m - t[1] / tm) + Math.abs(b / m - t[2] / tm) < 0.18;
}

/** Right after app.render: the legs' pixels, off the drawing buffer. */
export function bodyPixelsTick(entityRenderer, renderer) {
  if (!BODY_FRAMES_ON || !_bf.now) return;
  const d = entityRenderer && entityRenderer.playerDisplay;
  const gl = renderer && renderer.gl;
  if (!d || d.destroyed || !gl || !d.visible) return;
  const sb = d._spriteBody;
  /* the figure's box: the walking body's, or the whole display's while a stand-in draws you */
  let b;
  try { b = (sb && sb.visible ? sb : d).getBounds(); } catch (e) { return; }
  const res = renderer.resolution || 1;
  const H = gl.drawingBufferHeight, W = gl.drawingBufferWidth;
  const top = b.minY + (b.maxY - b.minY) * 0.55;
  const x0 = Math.max(0, Math.floor(b.minX * res)), x1 = Math.min(W, Math.ceil(b.maxX * res));
  const y0 = Math.max(0, Math.floor(top * res)), y1 = Math.min(H, Math.ceil(b.maxY * res));
  const w = x1 - x0, h = y1 - y0;
  if (w < 2 || h < 2 || w * h > 200000) return;
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(x0, H - y1, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  const t = pantsTarget(getPants()) || DEFAULT_PANTS;
  let n = 0;
  for (let i = 0; i < buf.length; i += 4) if (inColour(buf[i], buf[i + 1], buf[i + 2], t)) n++;
  _bf.looked++;
  const s = _bf.now;
  /* by the very frame of the stride: legs crossing and legs apart show very
     different amounts of trouser, and only a loss near total is a frame the
     legs did not reach the screen */
  const key = s.pose + '|' + s.dir + '|' + (s.mirror ? 'm' : '') + '|' + (s.frame != null ? s.frame : '') + '|' + (s.standIn || '');
  const hist = _bf.base[key] || (_bf.base[key] = []);
  const mid = hist.length >= 3 ? hist.slice().sort((p, q) => p - q)[hist.length >> 1] : null;
  if (mid != null && mid >= 30 && n < mid * 0.15) {
    _bf.drops++;
    const f = s.facing || '?';
    _bf.byFacing[f] = (_bf.byFacing[f] || 0) + 1;
    _bf.log.push({ f: _bf.frames, n, usual: mid, t: Math.round(performance.now()), ...s });
    if (_bf.log.length > 40) _bf.log.shift();
  } else {
    hist.push(n);
    if (hist.length > 15) hist.shift();
  }
}

if (BODY_FRAMES_ON && typeof window !== 'undefined') {
  window.__btBodyFrames = (reset) => {
    const out = { on: true, frames: _bf.frames, looked: _bf.looked, drops: _bf.drops, byFacing: { ..._bf.byFacing }, now: _bf.now, log: _bf.log.slice() };
    if (reset) { _bf.frames = 0; _bf.looked = 0; _bf.drops = 0; _bf.byFacing = Object.create(null); _bf.log = []; _bf.base = Object.create(null); }
    return out;
  };
}

/* the box on the screen */
let _box = null, _boxAt = 0;
const line = (s) => `${s.facing} ${s.pose}${s.frame != null ? '#' + s.frame : ''}${s.mirror ? ' m' : ''} body ${s.body}${s.row != null ? ' row' + s.row : ''}`
  + `${s.standIn ? ' [' + s.standIn + ']' : ''} | ${s.slot}:${s.inHand || 'none'} wpn ${s.weapon || '-'}`
  + `${s.auto ? ' ATK' : ''}${s.aim ? ' aim' : ''}${s.pend ? ' pend' : ''}${s.ride ? ' BOARD' : (s.rideWhy ? ' off:' + s.rideWhy : '')}`;
function readout() {
  if (typeof document === 'undefined') return;
  const now = performance.now();
  if (now - _boxAt < 500) return;
  _boxAt = now;
  if (!_box) {
    _box = document.createElement('div');
    _box.setAttribute('data-bodyframes', '');
    _box.style.cssText = 'position:fixed;left:4px;top:max(4px,env(safe-area-inset-top));z-index:2147483000;pointer-events:none;touch-action:manipulation;'
      + 'font:12px/1.35 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.75);padding:4px 6px;border-radius:4px;max-width:92vw;white-space:pre-wrap;';
    document.body.appendChild(_box);
    if (typeof window !== 'undefined') window.addEventListener('pagehide', readoutGone, { once: true });
  }
  const by = Object.entries(_bf.byFacing).map(([k, v]) => k + ' ' + v).join(', ');
  const lines = [`body: ${_bf.frames} frames, legs missing ${_bf.drops}${by ? ' (' + by + ')' : ''}`];
  if (_bf.now) lines.push('now: ' + line(_bf.now) + (_bf.now.sheet ? ' ' + _bf.now.sheet + (_bf.now.ix != null ? ':' + _bf.now.ix : '') : ''));
  for (const l of _bf.log.slice(-3)) lines.push(`- ${l.n}/${l.usual}px ` + line(l) + (l.sheet ? ' ' + l.sheet + (l.ix != null ? ':' + l.ix : '') : ''));
  const text = lines.join('\n');
  if (_box.textContent !== text) _box.textContent = text;
}
function readoutGone() {
  if (!_box) return;
  try { _box.remove(); } catch (e) { /* gone */ }
  _box = null;
  _boxAt = 0;
}
