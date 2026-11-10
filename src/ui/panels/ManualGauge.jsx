import React, { useEffect, useRef } from 'react';
import { manualOn, mcFrac, mcArmed, mcDraws } from '@/game/manualCombat.js';
import { isPlayerDead } from '@/game/combatHelpers.js';
import { fixedBox } from '@/ui/fixedBox.js';   /* where `position: fixed` puts 0,0 (a computer's is the game's column) */

/* ═══ v2.3.4357: THE BUILD-UP YOU CAN SEE (manual combat, `?manual=1`) ═══
 * The owner: "there's some kind of visual cue of build-up happening (like a
 * bow icon on the right joystick button with a bow string that gets
 * progressively pulled back more until it lights up at full draw)".
 *
 * IT IS ROUND THE CHARACTER, NOT ON THE BUTTON.  The first cut put it on the
 * attack disc, and the owner, the same night: "Needs improvement.  The thumb
 * covers the indicator and the indicator itself is too subtle.  Same for bow
 * and staff."  A thumb is on the disc for the whole of a draw, so nothing on
 * or near the disc can be the cue; and the eyes are on the bro and what he is
 * fighting.  So:
 *
 *   a RING round the bro, 112 px across, that fills clockwise with the
 *   build-up (game/manualCombat.js mcFrac): a thick cream band on a wider
 *   dark one (read on sand, grass and snow alike) while it builds; at FULL it
 *   turns the dashboard's lit yellow, a wide soft band pulses behind it, and
 *   one ring bursts outward -- "lights up";
 *   a BADGE under his feet, 44 px, the weapon: a BOW whose string is pulled
 *   back, an arrow on it; a STAFF's orb that swells; a SWORD that fills from
 *   its hilt.  It grows a little and takes a gold rim at full;
 *   a small STAR beside the badge while a special is ARMED.
 *
 * It is drawn only while there is something to say: a draw under way, a sword
 * not yet ready and a moment after it is, a special armed.  The same on a
 * phone and on a computer.  A phone that can buzz (Android) ticks once at
 * full; an iPhone cannot (Safari has no vibrate).
 *
 * HOW IT MOVES.  One small SVG drawn in code (nothing loaded, nothing kept).
 * Its own animation frame reads the rules and the bro's place on the screen
 * (XpFlyOverlay playerScreenPoint's arithmetic; the canvas's box measured
 * twice a second) and writes one transform on its own box, and an attribute
 * only when its value changes.  No React render after the first, no CSS
 * filter (it is over the world: TRAPS, the iPhone's grain), no touch taken;
 * the pulse and the burst are opacity and transform (game.css .bt-mc-*). */
const RING_R = 44;               /* of a 100-unit box */
const CIRC = 2 * Math.PI * RING_R;
const BUILD = '#FFF4D6';         /* building: cream, on the dark band */
const FULL = '#FFE23A';          /* the dashboard's lit yellow (NavRail NAV_YELLOW) */
const DARK = 'rgba(11, 22, 27, 0.78)';
const LINGER_MS = 1500;          /* a sword's ring stays this long once it is ready */
const SIZE = 112;                /* the ring's box, CSS px */
const BODY_DROP = 4;             /* the bro's middle is this far under S.player.y, CSS px (measured: his sprite is drawn about it) */

export function ManualGauge({ stateRef }) {
  const layerRef = useRef(null);
  const boxRef = useRef(null);
  const ringRef = useRef(null);
  const haloRef = useRef(null);
  const popRef = useRef(null);
  const badgeRef = useRef(null);
  const bowRef = useRef(null);
  const stringRef = useRef(null);
  const arrowRef = useRef(null);
  const orbRef = useRef(null);
  const swordRef = useRef(null);
  const swordFillRef = useRef(null);
  const starRef = useRef(null);
  const on = manualOn();

  useEffect(() => {
    if (!on) return undefined;
    let raf = 0;
    let alive = true;
    let measuredAt = 0;
    let cv = null, ox = 0, oy = 0;   /* the canvas's corner less the layer's (fixedBox) */
    const last = { vis: null, q: -1, full: null, kind: null, armed: null, x: null, y: null };
    const set = (el, name, v) => { if (el && el.getAttribute(name) !== v) el.setAttribute(name, v); };
    const frame = () => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const box = boxRef.current;
      const layer = layerRef.current;
      const S = stateRef && stateRef.current;
      if (!box || !layer || !S || !S.rpg || !S.player || !S.camera) { if (layer && last.vis !== false) { layer.style.display = 'none'; last.vis = false; } return; }
      const now = Date.now();
      const draws = mcDraws(S);
      const m = S._mc || {};
      const frac = mcFrac(S, now);
      const full = frac >= 1;
      const armed = mcArmed(S);
      let dead = false;
      try { dead = !!isPlayerDead(S); } catch (_e) { dead = false; }
      /* something to say? */
      const vis = !dead && !S._extraction && (armed || (draws ? !!m.drawAt : (!full || now - ((S.swingTimer || 0) + (m.meleeNeed || 0)) < LINGER_MS)));
      if (vis !== last.vis) {
        layer.style.display = vis ? 'block' : 'none'; last.vis = vis;
        if (typeof window !== 'undefined') window.__btManualGauge = { vis, frac: 0, full: false, kind: null, armed: false, x: 0, y: 0, size: SIZE };
        if (!vis) { last.full = null; last.q = -1; }   /* drawn afresh the next time (the burst too) */
      }
      if (!vis) return;
      /* where: round the bro.  The canvas's box twice a second; his place every frame */
      if (!cv || now - measuredAt > 500) {
        measuredAt = now;
        cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
        const r = cv ? cv.getBoundingClientRect() : null;
        const fb = fixedBox(layer);   /* the layer's own box: a computer's is not the window's (TRAPS §232) */
        ox = (r ? r.left : 0) - fb.x; oy = (r ? r.top : 0) - fb.y;
      }
      const x = Math.round(ox + (S.player.x - S.camera.x) * (S._worldScaleX || 1) - SIZE / 2);
      const y = Math.round(oy + (S.player.y - S.camera.y) * (S._worldScaleY || 1) + BODY_DROP - SIZE / 2);
      if (x !== last.x || y !== last.y) { last.x = x; last.y = y; box.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; }
      const q = Math.round(frac * 60);
      if (q !== last.q) {
        last.q = q;
        const f = q / 60;
        set(ringRef.current, 'stroke-dasharray', (CIRC * f).toFixed(1) + ' 999');
        /* the bow's string: its nock walks back from the limb as the draw fills */
        const nx = (20 - 11 * f).toFixed(1);
        set(stringRef.current, 'points', '22,4 ' + nx + ',20 22,36');
        set(arrowRef.current, 'x1', nx);
        set(orbRef.current, 'r', (5 + 9 * f).toFixed(1));
        /* the sword fills from the hilt (the bottom) up */
        set(swordFillRef.current, 'y', (36 - 32 * f).toFixed(1));
        set(swordFillRef.current, 'height', (32 * f).toFixed(1));
      }
      if (full !== last.full) {
        const was = last.full;
        last.full = full;
        set(ringRef.current, 'stroke', full ? FULL : BUILD);
        if (haloRef.current) haloRef.current.setAttribute('class', full ? 'bt-mc-halo bt-mc-lit' : 'bt-mc-halo');
        box.setAttribute('data-mc-full', full ? '1' : '0');
        const c = full ? FULL : '#F4F0E7';
        set(stringRef.current, 'stroke', c); set(arrowRef.current, 'stroke', c);
        set(orbRef.current, 'fill', full ? FULL : '#7FB0EC');
        const b = badgeRef.current;
        if (b) { b.style.borderColor = full ? FULL : 'rgba(244, 240, 231, 0.7)'; b.style.transform = full ? 'translateX(-50%) scale(1.18)' : 'translateX(-50%)'; }
        /* the moment it fills: one ring bursts outward, and a phone that can, ticks */
        const p = popRef.current;
        if (p) {
          p.classList.remove('bt-mc-go');
          if (full && was === false) { void p.offsetWidth; p.classList.add('bt-mc-go'); try { if (navigator.vibrate) navigator.vibrate(10); } catch (_e) { /* no buzz here */ } }
        }
      }
      const kind = draws ? ((S.rpg.activeSlot === 'staff') ? 'staff' : 'bow') : 'sword';
      if (kind !== last.kind) {
        last.kind = kind;
        box.setAttribute('data-mc-kind', kind);
        if (bowRef.current) bowRef.current.style.display = kind === 'bow' ? 'block' : 'none';
        if (orbRef.current) orbRef.current.style.display = kind === 'staff' ? 'block' : 'none';
        if (swordRef.current) swordRef.current.style.display = kind === 'sword' ? 'block' : 'none';
      }
      if (armed !== last.armed) {
        last.armed = armed;
        if (starRef.current) starRef.current.style.display = armed ? 'block' : 'none';
        box.setAttribute('data-mc-armed', armed ? '1' : '0');
      }
      /* QA: what the gauge shows, and where (mp-manualcombat) */
      const g = typeof window !== 'undefined' ? window.__btManualGauge : null;
      if (g) { g.vis = true; g.frac = q / 60; g.full = full; g.kind = kind; g.armed = armed; g.x = x; g.y = y; }
    };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [on, stateRef]);

  if (!on) return null;
  return (
    <div ref={layerRef} aria-hidden="true" style={{ position: 'fixed', inset: 0, display: 'none', pointerEvents: 'none', zIndex: 12 }}>
    <div ref={boxRef} data-manual-gauge="" style={{
      position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE, pointerEvents: 'none', willChange: 'transform',
    }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle ref={haloRef} className="bt-mc-halo" cx="50" cy="50" r={RING_R} fill="none" stroke={FULL} strokeWidth="22" />
        <circle cx="50" cy="50" r={RING_R} fill="none" stroke={DARK} strokeWidth="12" />
        <circle ref={ringRef} cx="50" cy="50" r={RING_R} fill="none" stroke={BUILD} strokeWidth="7.5" strokeLinecap="round" strokeDasharray="0 999" />
      </svg>
      {/* the burst at the moment it fills */}
      <div ref={popRef} className="bt-mc-pop" />
      <div ref={badgeRef} style={{
        position: 'absolute', left: '50%', bottom: -18, width: 44, height: 44, borderRadius: '50%', boxSizing: 'border-box',
        transform: 'translateX(-50%)', transition: 'transform 120ms ease-out',
        background: 'rgba(11, 22, 27, 0.92)', border: '2px solid rgba(244, 240, 231, 0.7)',
      }}>
        <svg viewBox="0 0 40 40" width="100%" height="100%" style={{ display: 'block' }}>
          {/* the bow: a limb, its string drawn back, an arrow on the string */}
          <g ref={bowRef} style={{ display: 'none' }}>
            <path d="M22 4 Q37 20 22 36" fill="none" stroke="#D99A55" strokeWidth="3.6" strokeLinecap="round" />
            <polyline ref={stringRef} points="22,4 20,20 22,36" fill="none" stroke="#F4F0E7" strokeWidth="1.8" strokeLinejoin="round" />
            <line ref={arrowRef} x1="20" y1="20" x2="35" y2="20" stroke="#F4F0E7" strokeWidth="2.2" strokeLinecap="round" />
          </g>
          {/* the staff's orb */}
          <circle ref={orbRef} cx="20" cy="20" r="5" fill="#7FB0EC" stroke="#F4F0E7" strokeWidth="1.2" style={{ display: 'none' }} />
          {/* the sword: its outline, filled from the hilt up */}
          <g ref={swordRef} style={{ display: 'none' }}>
            <clipPath id="bt-mc-sword"><path d="M20 4 L24.5 10 L24.5 26 L29 26 L29 30 L22.5 30 L22.5 36 L17.5 36 L17.5 30 L11 30 L11 26 L15.5 26 L15.5 10 Z" /></clipPath>
            <path d="M20 4 L24.5 10 L24.5 26 L29 26 L29 30 L22.5 30 L22.5 36 L17.5 36 L17.5 30 L11 30 L11 26 L15.5 26 L15.5 10 Z" fill="rgba(244, 240, 231, 0.2)" stroke="#F4F0E7" strokeWidth="1.4" strokeLinejoin="round" />
            <rect ref={swordFillRef} x="9" y="36" width="22" height="0" fill={FULL} clipPath="url(#bt-mc-sword)" />
          </g>
        </svg>
      </div>
      {/* a special armed for the next attack */}
      <div ref={starRef} data-mc-star="" style={{
        position: 'absolute', left: 'calc(50% + 20px)', bottom: -14, width: 26, height: 26, borderRadius: '50%', display: 'none',
        background: 'rgba(11, 22, 27, 0.92)', border: '2px solid #7FB0EC', boxSizing: 'border-box',
        color: '#BFD9FA', fontSize: 16, fontWeight: 900, lineHeight: '22px', textAlign: 'center',
      }}>✶</div>
    </div>
    </div>
  );
}

export default ManualGauge;
