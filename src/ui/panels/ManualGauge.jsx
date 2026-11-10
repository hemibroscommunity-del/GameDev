import React, { useEffect, useRef } from 'react';
import { manualOn, mcFrac, mcArmed, mcDraws } from '@/game/manualCombat.js';
import { isPlayerDead } from '@/game/combatHelpers.js';

/* ═══ v2.3.4357: THE BUILD-UP YOU CAN SEE (manual combat, `?manual=1`) ═══
 * The owner: "there's some kind of visual cue of build-up happening (like a
 * bow icon on the right joystick button with a bow string that gets
 * progressively pulled back more until it lights up at full draw)", and of
 * melee, "the sword will be an icon on the button and need to build up before
 * you tap the button to attack."
 *
 * ONE small picture, drawn in code (an SVG: nothing loaded, nothing kept):
 *   a RING that fills clockwise with the build-up (game/manualCombat.js
 *   mcFrac: the draw of a bow or a staff under a held thumb, the time since
 *   a sword's last swing), brass while it builds and bright gold with a soft
 *   second ring round it once it is FULL -- "lights up";
 *   and in its middle the weapon:
 *     a BOW whose string is pulled back as the ring fills, an arrow on it;
 *     a STAFF's orb that swells;
 *     a SWORD that fills from its hilt to its point.
 *   A small star rides the ring's shoulder while a special is ARMED for the
 *   next attack.
 *
 * WHERE.  On a phone it is ON the right button: the ring round the disc
 * (.bt-rjoy-base, measured twice a second -- the disc moves when the phone
 * turns), the weapon badge on the disc's upper left shoulder, clear of the
 * disc's own picture and of the thumb.  On a computer (no disc) it stands by
 * itself just over the band, right of the weapon pill.  It takes no touch
 * (pointer-events: none).  The BADGE is there whenever you can attack; the
 * RING only while there is something to say: a draw under way, a sword not
 * yet ready or a moment after it is, a special armed.
 *
 * HOW IT MOVES.  Its own animation frame, which reads the rules and writes an
 * attribute only when its value changes (the fill in sixtieths, the lit state,
 * the weapon); no React render after the first, no CSS filter (it is over the
 * world: TRAPS, the iPhone's grain), no transform on anything but itself. */
const RING_R = 46;               /* of a 100-unit box */
const CIRC = 2 * Math.PI * RING_R;
const BRASS = '#D8AA58';
const FULL = '#FFE23A';          /* the dashboard's lit yellow (NavRail NAV_YELLOW) */
const LINGER_MS = 900;           /* a sword's ring stays this long once it is ready */

export function ManualGauge({ stateRef }) {
  const boxRef = useRef(null);
  const ringRef = useRef(null);
  const ringBoxRef = useRef(null);
  const haloRef = useRef(null);
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
    const last = { vis: null, ring: null, q: -1, full: null, kind: null, armed: null, x: null, y: null, w: null };
    const set = (el, name, v) => { if (el && el.getAttribute(name) !== v) el.setAttribute(name, v); };
    const frame = () => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const box = boxRef.current;
      const S = stateRef && stateRef.current;
      if (!box || !S || !S.rpg || !S.player) { if (box && last.vis !== false) { box.style.display = 'none'; last.vis = false; } return; }
      const now = Date.now();
      const draws = mcDraws(S);
      const m = S._mc || {};
      const frac = mcFrac(S, now);
      const full = frac >= 1;
      const armed = mcArmed(S);
      let dead = false;
      try { dead = !!isPlayerDead(S); } catch (_e) { dead = false; }
      /* the weapon's badge is ON the button for as long as you can attack (the
         owner: "a bow icon on the right joystick button", "the sword will be an
         icon on the button"); the RING only while there is something to say */
      const vis = !dead && !S._extraction;
      if (vis !== last.vis) { box.style.display = vis ? 'block' : 'none'; last.vis = vis; if (typeof window !== 'undefined') window.__btManualGauge = { vis, ring: false, frac: 0, full: false, kind: null, armed: false }; }
      if (!vis) return;
      const ring = armed || (draws ? !!m.drawAt : (!full || now - ((S.swingTimer || 0) + (m.meleeNeed || 0)) < LINGER_MS));
      if (ring !== last.ring) { last.ring = ring; if (ringBoxRef.current) ringBoxRef.current.style.display = ring ? 'block' : 'none'; box.setAttribute('data-mc-ring', ring ? '1' : '0'); }
      /* where: round the right disc on a phone, by itself on a computer */
      if (now - measuredAt > 500) {
        measuredAt = now;
        let x, y, w;
        /* the disc where there is one on screen (a computer's is display:none:
           its box is empty), whatever the device says it is */
        const disc = document.querySelector('.bt-rjoy-base');
        const r = disc ? disc.getBoundingClientRect() : null;
        if (r && r.width > 20) { w = Math.round(r.width + 14); x = Math.round(r.left + r.width / 2 - w / 2); y = Math.round(r.top + r.height / 2 - w / 2); }
        else {
          const dashH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || 0;
          w = 64; x = Math.round(window.innerWidth / 2 + 132); y = Math.round(window.innerHeight - dashH - 84);
        }
        if (x !== last.x || y !== last.y || w !== last.w) {
          box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; box.style.height = w + 'px';
          last.x = x; last.y = y; last.w = w;
          /* the badge: on the disc's shoulder on a phone, the ring's middle on a computer */
          const b = badgeRef.current;
          if (b) {
            const solo = !(r && r.width > 20);
            last.solo = solo; last.full = null;   /* the rim is drawn again below */
            b.style.width = (solo ? 40 : 34) + 'px'; b.style.height = b.style.width;
            b.style.left = solo ? '12px' : '-6px'; b.style.top = solo ? '12px' : '-6px';
            b.style.background = 'rgba(11, 22, 27, 0.88)';
            b.style.border = solo ? 'none' : '1px solid rgba(216, 170, 88, 0.55)';
          }
        }
      }
      const q = Math.round(frac * 60);
      if (q !== last.q) {
        last.q = q;
        const f = q / 60;
        set(ringRef.current, 'stroke-dasharray', (CIRC * f).toFixed(1) + ' 999');
        /* the bow's string: its nock walks back from the limb as the draw fills */
        const nx = (20 - 10 * f).toFixed(1);
        set(stringRef.current, 'points', '22,5 ' + nx + ',20 22,35');
        set(arrowRef.current, 'x1', nx);
        set(orbRef.current, 'r', (4 + 7 * f).toFixed(1));
        /* the sword fills from the hilt (the bottom) up */
        const h = (30 * f).toFixed(1);
        set(swordFillRef.current, 'y', (35 - 30 * f).toFixed(1));
        set(swordFillRef.current, 'height', h);
      }
      if (full !== last.full) {
        last.full = full;
        set(ringRef.current, 'stroke', full ? FULL : BRASS);
        set(haloRef.current, 'opacity', full ? '0.45' : '0');
        box.setAttribute('data-mc-full', full ? '1' : '0');
        const c = full ? FULL : '#F4F0E7';
        set(stringRef.current, 'stroke', c); set(arrowRef.current, 'stroke', c);
        set(orbRef.current, 'fill', full ? FULL : '#7FB0EC');
        /* the badge's own rim lights with it: the cue that stays when the ring has gone */
        if (badgeRef.current && last.solo === false) badgeRef.current.style.border = '1px solid ' + (full ? FULL : 'rgba(216, 170, 88, 0.55)');
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
      /* QA: what the gauge shows (mp-manualcombat) */
      const g = typeof window !== 'undefined' ? window.__btManualGauge : null;
      if (g) { g.vis = true; g.ring = ring; g.frac = q / 60; g.full = full; g.kind = kind; g.armed = armed; }
    };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [on, stateRef]);

  if (!on) return null;
  return (
    <div ref={boxRef} data-manual-gauge="" aria-hidden="true" style={{
      position: 'fixed', left: 0, top: 0, width: 64, height: 64, display: 'none', pointerEvents: 'none', zIndex: 12,
    }}>
      <svg ref={ringBoxRef} viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'absolute', inset: 0, display: 'none', transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(11, 22, 27, 0.55)" strokeWidth="6" />
        <circle ref={haloRef} cx="50" cy="50" r={RING_R} fill="none" stroke={FULL} strokeWidth="13" opacity="0" />
        <circle ref={ringRef} cx="50" cy="50" r={RING_R} fill="none" stroke={BRASS} strokeWidth="6" strokeLinecap="round" strokeDasharray="0 999" />
      </svg>
      <div ref={badgeRef} style={{ position: 'absolute', left: -6, top: -6, width: 34, height: 34, borderRadius: '50%', boxSizing: 'border-box', background: 'rgba(11, 22, 27, 0.88)', border: '1px solid rgba(216, 170, 88, 0.55)' }}>
        <svg viewBox="0 0 40 40" width="100%" height="100%" style={{ display: 'block' }}>
          {/* the bow: a limb, its string drawn back, an arrow on the string */}
          <g ref={bowRef} style={{ display: 'none' }}>
            <path d="M22 5 Q36 20 22 35" fill="none" stroke="#C58B4E" strokeWidth="3.2" strokeLinecap="round" />
            <polyline ref={stringRef} points="22,5 20,20 22,35" fill="none" stroke="#F4F0E7" strokeWidth="1.5" strokeLinejoin="round" />
            <line ref={arrowRef} x1="20" y1="20" x2="35" y2="20" stroke="#F4F0E7" strokeWidth="1.8" strokeLinecap="round" />
          </g>
          {/* the staff's orb */}
          <circle ref={orbRef} cx="20" cy="20" r="4" fill="#7FB0EC" stroke="#172126" strokeWidth="1" style={{ display: 'none' }} />
          {/* the sword: its outline, filled from the hilt up */}
          <g ref={swordRef} style={{ display: 'none' }}>
            <clipPath id="bt-mc-sword"><path d="M20 4 L24 10 L24 27 L28 27 L28 30 L22 30 L22 36 L18 36 L18 30 L12 30 L12 27 L16 27 L16 10 Z" /></clipPath>
            <path d="M20 4 L24 10 L24 27 L28 27 L28 30 L22 30 L22 36 L18 36 L18 30 L12 30 L12 27 L16 27 L16 10 Z" fill="rgba(244, 240, 231, 0.18)" stroke="#F4F0E7" strokeWidth="1.2" strokeLinejoin="round" />
            <rect ref={swordFillRef} x="10" y="35" width="20" height="0" fill={FULL} clipPath="url(#bt-mc-sword)" />
          </g>
        </svg>
      </div>
      {/* a special armed for the next attack */}
      <div ref={starRef} data-mc-star="" style={{
        position: 'absolute', right: -4, top: -6, width: 22, height: 22, borderRadius: '50%', display: 'none',
        background: 'rgba(11, 22, 27, 0.9)', border: '1px solid #7FB0EC', boxSizing: 'border-box',
        color: '#9DC4F5', fontSize: 14, fontWeight: 900, lineHeight: '20px', textAlign: 'center',
      }}>✶</div>
    </div>
  );
}

export default ManualGauge;
