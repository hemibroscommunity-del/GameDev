/* ═══ v2.3.4550: THE TIMING BAR -- THE OWNER'S OWN DESIGN ═══
 *
 * The owner, 2026-11-10: "a sword silhouette laying horizontally that refills
 * as a bar and once the bar reaches the top it glints.  During this glinting
 * must attack to get the bonus.  Same with the bow ... It would need to be
 * north of the right joystick.  For magic I think it should be skipped for
 * now."  And: "the bar freezing in place a moment so you could see where you
 * decided to swing.  It doesn't slow down the recovery of the next attack."
 *
 * ONLY ON THE FREE-SWING TRIAL (`?manual=3`) against a worker that judges the
 * perfect strike (manualCombat.js mcBarWeapon: caps.freeSwing and
 * caps.perfectStrike, a sword or a bow in hand); `?timingbar=0` hides it.  It
 * fills over the cycle, glints for exactly the worker's window
 * (server/src/freeswing.js PERFECT_EARLY_MS / PERFECT_LATE_MS), rests full;
 * at each attack a frozen copy of where it was fades over the fill, which has
 * already restarted.  Not touchable, no number, no words.
 *
 * v2.3.4615, the owner: "I just added a sprite sheet for you to use for
 * filling up the weapons.  I'd like it to actually lay vertically in the
 * space above the left joystick and try it that way."  So the silhouettes are
 * the owner's pictures now (timingBarArt.js: the empty weapon in dark iron,
 * the full one in gold, ONE 2.4 KB file warmed on the loading screen, on the
 * trial only: rendering/timingBarPreload.js), and the bar STANDS UP over the
 * movement disc, its grip at the bottom, filling upward to the point.  The
 * machinery is the same: the weapon still lies on its side inside the bar
 * (`.bt-tbar-rot`) and every window still slides along X; the whole lies a
 * quarter turn up.  Where it stands, and why: barBox below and
 * docs/UI-DESIGN-NOTES.md "The timing bar".
 *
 * NO WORK A FRAME (CLAUDE.md, the page's thread budget): CSS animations
 * (game.css `.bt-tbar`) restarted ONCE an attack by flipping `data-k`
 * between two keyframe sets (nothing measured), their times in custom
 * properties; timingBarFrame compares one number a frame and writes only on
 * an attack, a change of hand, or showing/hiding.  React renders it only
 * when the hand changes.  Where it sits, and why: docs/UI-DESIGN-NOTES.md
 * "The timing bar" (the disc's own top edge is Sprint's upright, the
 * minimap's sideways; a computer draws no disc). */
import React, { useEffect, useRef, useState } from 'react';
import { mcBarWeapon, mcBarCycle, mcBarTimes, mcBarAttack, timingBarWanted } from '@/game/manualCombat.js';
import { leftCluster, LCTL_SLOT, ctlBottom } from './ShieldButton.jsx';
import { TB_ART, TB_SHEET, TB_HALF_X, TB_RECT } from './timingBarArt.js';

const AIR = 4;           /* v2.3.4615: px clear of Burst and Quick Eat either side */
const SHOW_MS = 3000;    /* after an attack, it stays this long with nothing near */

/* the mounted bar (one at a time): its root, the last attack it drew, the
   cycle that attack's fill ran over, which keyframes are running */
let _bar = null;

/* v2.3.4615: one layer of the owner's picture: the weapon EMPTY (dark) or
   FULL (gold), or -- `mask` -- the full one's outline in one colour (the
   glint, the frozen copy: game.css paints it), at `s` css px a pixel */
function Art({ cls, rect, s, full, mask }) {
  const x = rect.x + (full || mask ? TB_HALF_X : 0);
  const size = (TB_SHEET.w * s) + 'px ' + (TB_SHEET.h * s) + 'px';
  const pos = (-x * s) + 'px ' + (-rect.y * s) + 'px';
  const url = 'url(' + TB_ART + ')';
  const st = mask
    ? { WebkitMaskImage: url, maskImage: url, WebkitMaskSize: size, maskSize: size, WebkitMaskPosition: pos, maskPosition: pos }
    : { backgroundImage: url, backgroundSize: size, backgroundPosition: pos };
  return <i className={'bt-tbar-art ' + cls} style={st} />;
}

/* v2.3.4615: the box, from the controls' own numbers (ShieldButton.jsx).
 * "The space above the left joystick": what never moves there is the left
 * cluster -- Element Burst (slot 0, over the disc's left edge) and Quick Eat
 * (slot 1, up and to its right), both of them up in exactly the fights the
 * bar is for (an element ready; hurt with food).  Their slots are kept
 * whether or not they are drawn, so the bar stands in the gap between them
 * (24 px upright, 27 sideways), its foot level with Burst's foot: over the
 * disc's right half, clear of both by construction.  Straight over the
 * disc's centre is Burst's place; higher up, sideways, is the top bar.
 * On a computer (no disc, no Quick Eat: V eats) it stands just right of
 * Burst's slot.
 * Its size: the owner's pixels at whole DEVICE pixels -- about 2/3 of a css
 * px each on a phone (2 device px on a 3x iPhone: the sword 78 px tall, 17
 * wide; 1 on a 2x phone: 59 by 13), a step smaller where the gap is
 * narrower, never over a button; one css px each on a computer (117 tall). */
export function barBox(isLandscape, fine, rect, dpr) {
  const lc = leftCluster(isLandscape);
  const burstR = lc.leftPx(LCTL_SLOT.burst) + lc.size;
  const eatL = lc.leftPx(LCTL_SLOT.eat);
  const room = fine ? Infinity : (eatL - AIR) - (burstR + AIR);
  const r = dpr > 0 ? dpr : 1;
  /* a computer's screen is bigger than a phone's: the owner's pixels one css px each there */
  let k = fine ? Math.max(1, Math.round(r)) : Math.max(1, Math.round(r * 2 / 3));
  let s = k / r;
  while (k > 1 && rect.h * s > room) { k -= 1; s = k / r; }
  if (rect.h * s > room) s = room / rect.h;   /* a very narrow screen: a fraction, still clear */
  const thick = rect.h * s, len = rect.w * s;
  const left = fine ? burstR + AIR * 2 : Math.round(burstR + AIR + (room - thick) / 2);
  return { s, thick, len, left, bottom: lc.bottomPx(LCTL_SLOT.burst) };
}

export function TimingBar({ stateRef, isLandscape }) {
  const [weapon, setWeapon] = useState(null);
  const rootRef = useRef(null);
  useEffect(() => {
    const S = stateRef && stateRef.current;
    _bar = { root: null, at: (S && S.swingTimer) || 0, cyc: 0, k: '', weapon: null, off: !timingBarWanted(), setWeapon };
    return () => { _bar = null; };
  }, [stateRef]);
  useEffect(() => { if (_bar) _bar.root = rootRef.current; }, [weapon]);
  if (!weapon) return null;
  const fine = typeof matchMedia === 'function' && matchMedia('(pointer:fine)').matches;
  const rect = TB_RECT[weapon];
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  const b = barBox(isLandscape, fine, rect, dpr);
  const s = b.s;
  /* the weapon lies on its side inside (len x thick), turned a quarter up
     about its centre: its grip at the bottom, its point at the top */
  const rot = { width: b.len, height: b.thick, left: (b.thick - b.len) / 2, top: (b.len - b.thick) / 2 };
  return (
    <div ref={rootRef} key={weapon} className="bt-tbar" data-tbar={weapon} data-on="0" aria-hidden="true"
      style={{ left: b.left, bottom: ctlBottom(b.bottom), width: b.thick, height: b.len }}>
      <div className="bt-tbar-rot" style={rot}>
        <Art cls="bt-tbar-base" rect={rect} s={s} />
        <div className="bt-tbar-win bt-tbar-fill"><div className="bt-tbar-in"><Art cls="bt-tbar-full" rect={rect} s={s} full /></div></div>
        <div className="bt-tbar-win bt-tbar-glint"><div className="bt-tbar-in"><Art cls="bt-tbar-shine" rect={rect} s={s} mask /></div></div>
        <div className="bt-tbar-frz"><div className="bt-tbar-win"><div className="bt-tbar-in"><Art cls="bt-tbar-froze" rect={rect} s={s} mask /></div></div></div>
      </div>
    </div>
  );
}

/** BroTown's loop, once a frame (after the combat step): one compare, and a
 *  write only when something changed. */
export function timingBarFrame(S, now) {
  const b = _bar;
  if (!b || !S) return;
  const w = b.off ? null : mcBarWeapon(S);
  if (w !== b.weapon) {
    b.weapon = w; b.at = S.swingTimer || 0; b.cyc = 0; b.k = ''; b.root = null;
    try { b.setWeapon(w); } catch (e) { /* unmounting */ }
    return;
  }
  const r = b.root;
  if (!w || !r || !r.isConnected) return;
  const at = S.swingTimer || 0;
  if (at !== b.at) {
    if (at > b.at) {
      /* AN ATTACK: the frozen copy's width (once), the times, the keyframes */
      const cyc = mcBarCycle(S);
      const f = mcBarAttack(b.at, b.cyc || cyc, at);
      const t = mcBarTimes(cyc);
      const lag = Math.max(0, Math.min(t.fillMs, now - at));   /* seen a frame late: started where it should be */
      b.cyc = cyc; b.k = b.k === 'a' ? 'b' : 'a';
      r.style.setProperty('--w', String(Math.round(f.frozen * 1000) / 1000));
      r.style.setProperty('--cyc', t.fillMs + 'ms');
      r.style.setProperty('--fd', (t.fillDelayMs - lag) + 'ms');
      r.style.setProperty('--gd', (t.glintDelayMs - lag) + 'ms');
      r.style.setProperty('--gl', t.glintMs + 'ms');
      r.style.setProperty('--fz', t.freezeMs + 'ms');
      r.setAttribute('data-g', f.glint ? '1' : '0');
      r.setAttribute('data-k', b.k);
      b.last = { at, frozen: f.frozen, glint: f.glint, cyc };
    }
    b.at = at;
  }
  /* shown with a monster in reach (the sword's perimeter, a lock, the bow's
     sight on something) or for SHOW_MS after an attack: quiet otherwise */
  const near = (S._targetCands && S._targetCands.length > 0) || !!S.lockedTarget
    || !!(S._bowSight && S._bowSight.d != null) || (at > 0 && now - at < SHOW_MS);
  const on = near ? '1' : '0';
  if (r.getAttribute('data-on') !== on) r.setAttribute('data-on', on);
}

/* QA (mp-timingbar, the UI review): what the bar holds right now */
if (typeof window !== 'undefined') {
  try {
    window.__btTimingBar = function () {
      const b = _bar;
      const r = b && b.root;
      return {
        mounted: !!b, weapon: b ? b.weapon : null, off: b ? !!b.off : null,
        drawn: !!(r && r.isConnected), on: r ? r.getAttribute('data-on') : null, k: r ? r.getAttribute('data-k') : null,
        g: r ? r.getAttribute('data-g') : null, w: r ? r.style.getPropertyValue('--w') : null,
        cyc: r ? r.style.getPropertyValue('--cyc') : null, gd: r ? r.style.getPropertyValue('--gd') : null,
        last: b && b.last ? Object.assign({}, b.last) : null,
      };
    };
    /* the loop's own check, run now: mp-timingbar times two strokes on the
       page's clock in one task (this box draws a frame every few hundred ms;
       a phone every 16-33, far under the trial's 150 ms between swings) */
    window.__btTimingBar.tick = function () { const g = window._gameState; timingBarFrame(g && g.current, Date.now()); };
  } catch (e) { /* no window */ }
}
