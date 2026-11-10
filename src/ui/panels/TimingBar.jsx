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
 * already restarted.  Not touchable, no number, no words, no file loaded.
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
import { RBTN, discRight, discBottom, sprintAnchor, ctlBottom } from './ShieldButton.jsx';

/* the silhouettes, 100 x 16, lying on their side, pointing right */
const SHAPE = {
  /* pommel, grip, crossguard, blade to its point */
  sword: 'M1,8a3,3 0 1,0 6,0a3,3 0 1,0 -6,0Z M7,6.5H18V2H21.5V5.5H90L99,8L90,10.5H21.5V14H18V9.5H7Z',
  /* fletching, shaft, barbed head */
  bow: 'M0,2L12,2L18,6.8H86L84,3L100,8L84,13L86,9.2H18L12,14L0,14L6,8Z',
};
const GAP = 8;           /* px clear of the buttons round it */
const SHOW_MS = 3000;    /* after an attack, it stays this long with nothing near */

/* the mounted bar (one at a time): its root, the last attack it drew, the
   cycle that attack's fill ran over, which keyframes are running */
let _bar = null;

function Sil({ cls, d }) {
  return <svg className={cls} viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true"><path d={d} /></svg>;
}

/* the box, from the controls' own numbers (ShieldButton.jsx) */
function barBox(isLandscape, fine) {
  const dW = isLandscape ? RBTN.wLand : RBTN.w;
  const w = dW, h = Math.round(dW / 6);
  if (fine) return { w, h, right: discRight(true) + Math.round(((RBTN.wLand) - w) / 2), bottom: discBottom(true) + Math.round((RBTN.wLand - h) / 2) };
  if (isLandscape) return { w, h, right: discRight(true) + dW + GAP, bottom: discBottom(true) + dW - h };
  const spr = sprintAnchor(false);
  return { w, h, right: discRight(false) + Math.round((dW - w) / 2), bottom: spr.bottomPx + spr.size + GAP };
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
  const b = barBox(isLandscape, fine);
  const d = SHAPE[weapon];
  return (
    <div ref={rootRef} key={weapon} className="bt-tbar" data-tbar={weapon} data-on="0" aria-hidden="true"
      style={{ right: b.right, bottom: ctlBottom(b.bottom), width: b.w, height: b.h }}>
      <Sil cls="bt-tbar-base" d={d} />
      <div className="bt-tbar-win bt-tbar-fill"><div className="bt-tbar-in"><Sil cls="bt-tbar-full" d={d} /></div></div>
      <div className="bt-tbar-win bt-tbar-glint"><div className="bt-tbar-in"><Sil cls="bt-tbar-shine" d={d} /></div></div>
      <div className="bt-tbar-frz"><div className="bt-tbar-win"><div className="bt-tbar-in"><Sil cls="bt-tbar-froze" d={d} /></div></div></div>
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
  } catch (e) { /* no window */ }
}
