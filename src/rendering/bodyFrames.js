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
 * your bro's state -- the walking body (shown, hidden, an empty or freed
 * picture; its sheet and frame, the look palette's row, mirrored), the
 * stand-ins drawing you instead (the sword's, the bow's, and the bow body's
 * cached strip for this facing), the weapon (the lane in hand, over or under
 * the body, shown), the attack (held, aiming, pending), the board, and where
 * the facing came from -- and counts by facing the frames the walking body is
 * not drawn with no stand-in drawing you.  A reading of the legs' pixels off
 * the drawing buffer was tried and left out: on the test machine it counted
 * legs missing on frames whose photograph shows them drawn, and a counter that
 * cries wolf is worse than none.  The state is what a screenshot needs.
 *
 * On the screen, for a phone with no console: a box in the top-left corner
 * (a plain element outside the game's root, pointer-events none, written at
 * most twice a second, gone on leaving the page) with the frames, the frames
 * not drawn by facing, the state now, and the last three of those frames.  Play until it happens,
 * take a screenshot.  `window.__btBodyFrames()` (and `(true)` to start again)
 * for a test.
 */
import { Texture } from 'pixi.js';

export const BODY_FRAMES_ON = typeof window !== 'undefined' && /[?&]bodyframes(=|&|$)/.test((window.location && window.location.search) || '');

const _bf = { frames: 0, drops: 0, byFacing: Object.create(null), log: [], now: null };

const short = (s) => String(s || '').split('/').pop().split('?')[0].slice(-28);
/* the state of your bro this frame, in a few short fields */
function stateOf(d, S, fx) {
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
    /* where the facing came from (stick, aim, moving, ...) and the aim's angle */
    src: S ? S._facingSrc || null : null, aimAng: S && S._aimAngle != null ? Math.round(S._aimAngle * 57.3) : null,
    /* the stand-ins (effectsRenderer): shown, and the bow body's cached strip
       for this facing's sheet (its frame count) */
    swordSI: !!(fx && fx.swordSprite && fx.swordSprite.visible), bowSI: !!(fx && fx.bowSprite && fx.bowSprite.visible),
    bowStrip: (() => { try { const f = fx && fx._bowBodyFrames && d._animDir ? fx._bowBodyFrames[d._animDir] : null; return Array.isArray(f) ? f.length : (f ? 'lazy' : null); } catch (e) { return null; } })(),
  };
}

/** Once a frame, before app.render. */
export function bodyFrameTick(entityRenderer, effectsRenderer) {
  if (!BODY_FRAMES_ON) return;
  const d = entityRenderer && entityRenderer.playerDisplay;
  const S = typeof window !== 'undefined' && window._gameState ? window._gameState.current : null;
  if (!d || d.destroyed) { _bf.now = null; readoutGone(); return; }
  _bf.frames++;
  const st = stateOf(d, S, effectsRenderer);
  _bf.now = st;
  /* the walking body not drawn, and no stand-in drawing you */
  if (st.body !== 'shown' && !st.swordSI && !st.bowSI && st.pose !== 'dodge') {
    _bf.drops++;
    const f = st.facing || '?';
    _bf.byFacing[f] = (_bf.byFacing[f] || 0) + 1;
    _bf.log.push({ f: _bf.frames, t: Math.round(performance.now()), ...st });
    if (_bf.log.length > 40) _bf.log.shift();
  }
  readout();
}

if (BODY_FRAMES_ON && typeof window !== 'undefined') {
  window.__btBodyFrames = (reset) => {
    const out = { on: true, frames: _bf.frames, drops: _bf.drops, byFacing: { ..._bf.byFacing }, now: _bf.now, log: _bf.log.slice() };
    if (reset) { _bf.frames = 0; _bf.drops = 0; _bf.byFacing = Object.create(null); _bf.log = []; }
    return out;
  };
}

/* the box on the screen */
let _box = null, _boxAt = 0;
const line = (s) => `${s.facing} ${s.pose}${s.frame != null ? '#' + s.frame : ''}${s.mirror ? ' m' : ''} body ${s.body}${s.row != null ? ' row' + s.row : ''}`
  + `${s.standIn ? ' [' + s.standIn + ']' : ''} | ${s.slot}:${s.inHand || 'none'} wpn ${s.weapon || '-'}`
  + `${s.auto ? ' ATK' : ''}${s.aim ? ' aim' : ''}${s.pend ? ' pend' : ''}${s.ride ? ' BOARD' : (s.rideWhy ? ' off:' + s.rideWhy : '')}`
  + ` | face:${s.src || '-'}${s.aimAng != null ? ' aim' + s.aimAng : ''}${s.swordSI ? ' SWORD-SI' : ''}${s.bowSI ? ' BOW-SI' : ''}${s.bowStrip != null ? ' bowstrip' + s.bowStrip : ''}`;
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
  const lines = [`body: ${_bf.frames} frames, not drawn ${_bf.drops}${by ? ' (' + by + ')' : ''}`];
  if (_bf.now) lines.push('now: ' + line(_bf.now) + (_bf.now.sheet ? ' ' + _bf.now.sheet + (_bf.now.ix != null ? ':' + _bf.now.ix : '') : ''));
  for (const l of _bf.log.slice(-3)) lines.push('- ' + line(l) + (l.sheet ? ' ' + l.sheet + (l.ix != null ? ':' + l.ix : '') : ''));
  const text = lines.join('\n');
  if (_box.textContent !== text) _box.textContent = text;
}
function readoutGone() {
  if (!_box) return;
  try { _box.remove(); } catch (e) { /* gone */ }
  _box = null;
  _boxAt = 0;
}
