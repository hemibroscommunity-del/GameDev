import React, { useEffect, useRef } from 'react';
import { manualOn, mcFrac, mcArmed, mcDraws, mcMeleeFrom } from '@/game/manualCombat.js';
import { isPlayerDead } from '@/game/combatHelpers.js';
import { fixedBox } from '@/ui/fixedBox.js';   /* where `position: fixed` puts 0,0 (a computer's is the game's column) */

/* ═══ v2.3.4357: THE BUILD-UP YOU CAN SEE (manual combat, `?manual=1`) ═══
 * The owner: "there's some kind of visual cue of build-up happening (like a
 * bow icon on the right joystick button with a bow string that gets
 * progressively pulled back more until it lights up at full draw)".
 *
 * IT IS A READY BAR OVER THE RIGHT JOYSTICK.  Third place, and why:
 *   1. on the attack disc -- the owner: "The thumb covers the indicator and
 *      the indicator itself is too subtle.  Same for bow and staff."
 *   2. a ring round the bro -- "It's too obnoxious having it circle the
 *      player.  Maybe north of the right joystick can be a ready bar."
 *   3. so: a BAR, north of the disc, in the first clear space above it (the
 *      Dash button stands straight over the disc, so "above" is found, not
 *      assumed: the bar climbs from the disc's top, trying a little left and
 *      right, until it touches no other control).  High enough that a thumb
 *      on the disc does not reach it; off the bro and off the fight.
 *
 * THE BAR.  124 x 18 px: a dark track with a pale rim, filled left to right
 * with the build-up (game/manualCombat.js mcFrac: the draw of a bow or a
 * staff under a held thumb, the time since a sword's last swing or its last
 * too-early tap) -- cream while it builds; at FULL bright yellow, a soft band
 * breathing round it and one outline bursting off it ("lights up").  At its
 * left end the weapon's BADGE: a BOW whose string is pulled back, an arrow on
 * it; a STAFF's orb that swells; a SWORD that fills from its hilt.  At its
 * right end a small STAR while a special is ARMED.  A sword tapped TOO EARLY
 * empties the bar with a red flash: the build-up has started again.
 *
 * WHEN.  While the attack disc is on the screen for a fight (BroTown's
 * resolver raises it: a monster near, a lock held), and whenever there is
 * something to say (a draw under way, a sword building, a special armed).
 * Not over a harvest's button.  On a computer (no disc) it stands over the
 * band, right of the weapon pill, while there is something to say.
 *
 * HOW IT MOVES.  A few boxes and one small SVG, drawn in code (nothing
 * loaded, nothing kept).  Its own animation frame reads the rules and writes
 * a transform or an attribute only when its value changes; where it stands is
 * measured twice a second (the disc moves when the phone turns; the controls
 * round it come and go).  No React render after the first, no CSS filter (it
 * is over the world: TRAPS, the iPhone's grain), no touch taken; the breath,
 * the burst and the flash are opacity and transform (game.css .bt-mc-*). */
const BUILD = '#FFF4D6';         /* building: cream, on the dark track */
const FULL = '#FFE23A';          /* the dashboard's lit yellow (NavRail NAV_YELLOW) */
const LINGER_MS = 1500;          /* a ready sword's bar breathes this long, then rests lit */
const BAR_W = 124, BAR_H = 18;   /* CSS px */
const BADGE = 34;                /* the weapon's badge, on the bar's left end */
const OVER_L = 16, OVER_R = 12, OVER_Y = (BADGE - BAR_H) / 2;   /* what the badge and the star stand out by */
const PAD = 5;                   /* clear air kept round the bar */
/* the other controls a bar may not stand on (game.css's own list of the cluster) */
const CONTROLS = '[data-sprint], [data-ride], [data-quickeat], [data-jump], [data-shield], [data-special], [data-weapon-tri], [data-weapon-pill], [data-ability], .bt-burst-btn, .bt-charge-pie, [data-trap-round]';
const FIGHT_ICONS = { melee: 1, ranged: 1, staff: 1 };

/** Where the bar stands, in the layer's numbers: the first clear place north
 *  of the disc.  `disc` and each of `obs` are {left, top, right, bottom} in
 *  the window's numbers; `fb` is the layer's box (fixedBox). */
function placeBar(disc, obs, fb) {
  const cx = (disc.left + disc.right) / 2;
  const minX = fb.x + 6 + OVER_L, maxX = fb.x + fb.w - 6 - OVER_R - BAR_W;
  const hits = (x, y) => {
    const l = x - OVER_L - PAD, r = x + BAR_W + OVER_R + PAD, t = y - OVER_Y - PAD, b = y + BAR_H + OVER_Y + PAD;
    for (let i = 0; i < obs.length; i++) { const o = obs[i]; if (l < o.right && r > o.left && t < o.bottom && b > o.top) return true; }
    return false;
  };
  const first = disc.top - 10 - OVER_Y - BAR_H;
  for (let y = first; y > disc.top - 300 && y > fb.y + 60; y -= 4) {
    for (let k = 0; k < 7; k++) {
      const dx = [0, 10, -10, 20, -20, 30, -30][k];
      const x = Math.max(minX, Math.min(maxX, cx - BAR_W / 2 + dx));
      if (!hits(x, y)) return { x: Math.round(x - fb.x), y: Math.round(y - fb.y) };
    }
  }
  return { x: Math.round(Math.max(minX, Math.min(maxX, cx - BAR_W / 2)) - fb.x), y: Math.round(first - fb.y) };
}

export function ManualGauge({ stateRef }) {
  const layerRef = useRef(null);
  const boxRef = useRef(null);
  const fillRef = useRef(null);
  const haloRef = useRef(null);
  const popRef = useRef(null);
  const missRef = useRef(null);
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
    let fight = false;               /* the attack disc is up, and it is a fight's */
    const last = { vis: null, q: -1, full: null, lit: null, kind: null, armed: null, early: null, x: null, y: null };
    const set = (el, name, v) => { if (el && el.getAttribute(name) !== v) el.setAttribute(name, v); };
    const cls = (el, name, yes) => { if (el && el.classList.contains(name) !== yes) el.classList.toggle(name, yes); };
    const again = (el, name) => { if (el) { el.classList.remove(name); void el.offsetWidth; el.classList.add(name); } };   /* a one-shot, from its start */
    const frame = () => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const box = boxRef.current;
      const layer = layerRef.current;
      const S = stateRef && stateRef.current;
      if (!box || !layer || !S || !S.rpg || !S.player) { if (layer && last.vis !== false) { layer.style.display = 'none'; last.vis = false; } return; }
      const now = Date.now();
      const draws = mcDraws(S);
      const m = S._mc || {};
      const frac = mcFrac(S, now);
      const full = frac >= 1;
      const armed = mcArmed(S);
      let dead = false;
      try { dead = !!isPlayerDead(S); } catch (_e) { dead = false; }
      /* where, and whether the disc is up for a fight */
      const measure = () => {
        measuredAt = now;
        const disc = document.querySelector('.bt-rjoy-base');
        const r = disc ? disc.getBoundingClientRect() : null;
        const fb = fixedBox(layer.style.display === 'none' ? null : layer);   /* the layer's own box: a computer's is not the window's (TRAPS §232) */
        let at;
        if (r && r.width > 20) {
          const zone = disc.parentElement;
          const icon = disc.getAttribute('data-ricon');
          fight = !!zone && zone.style.opacity !== '0' && (!icon || !!FIGHT_ICONS[icon]);
          const obs = [];
          const els = document.querySelectorAll(CONTROLS);
          for (let i = 0; i < els.length; i++) { const b = els[i].getBoundingClientRect(); if (b.width > 8 && b.height > 8) obs.push(b); }
          at = placeBar(r, obs, fb);
        } else {
          /* a computer: over the band, right of the weapon pill */
          fight = false;
          const dashH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || 0;
          at = { x: Math.round(fb.w / 2 + 100), y: Math.round(fb.h - dashH - 41) };
        }
        if (at.x !== last.x || at.y !== last.y) { last.x = at.x; last.y = at.y; box.style.transform = 'translate3d(' + at.x + 'px,' + at.y + 'px,0)'; }
      };
      if (now - measuredAt > 500) measure();   /* twice a second */
      const sinceReady = now - (mcMeleeFrom(S) + (m.meleeNeed || 0));
      const say = armed || (draws ? !!m.drawAt : (!full || sinceReady < LINGER_MS));
      const vis = !dead && !S._extraction && (say || fight);
      if (vis !== last.vis) {
        layer.style.display = vis ? 'block' : 'none'; last.vis = vis;
        if (typeof window !== 'undefined') window.__btManualGauge = { vis, frac: 0, full: false, kind: null, armed: false, x: last.x || 0, y: last.y || 0, w: BAR_W, h: BAR_H, missed: 0 };
        if (vis) measure();            /* placed in its own box now that the layer has one */
        else { last.full = null; last.q = -1; last.lit = null; }
      }
      if (!vis) return;
      const q = Math.round(frac * 60);
      if (q !== last.q) {
        last.q = q;
        const f = q / 60;
        if (fillRef.current) fillRef.current.style.transform = 'scaleX(' + f.toFixed(3) + ')';
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
        if (fillRef.current) fillRef.current.style.background = full ? FULL : BUILD;
        box.setAttribute('data-mc-full', full ? '1' : '0');
        const c = full ? FULL : '#F4F0E7';
        set(stringRef.current, 'stroke', c); set(arrowRef.current, 'stroke', c);
        set(orbRef.current, 'fill', full ? FULL : '#7FB0EC');
        const b = badgeRef.current;
        if (b) { b.style.borderColor = full ? FULL : 'rgba(244, 240, 231, 0.75)'; b.style.transform = full ? 'scale(1.15)' : 'none'; }
        /* the moment it fills: one outline bursts off it, and a phone that can, ticks */
        cls(popRef.current, 'bt-mc-go', false);
        if (full && was === false) { again(popRef.current, 'bt-mc-go'); try { if (navigator.vibrate) navigator.vibrate(10); } catch (_e) { /* no buzz here */ } }
      }
      /* the soft band breathes while it is full and that is news: a held draw for as long as it is
         held, a sword for a moment after it is ready -- then the bar rests, lit and still */
      const lit = full && (draws || sinceReady < LINGER_MS);
      if (lit !== last.lit) { last.lit = lit; cls(haloRef.current, 'bt-mc-lit', lit); }
      /* a sword tapped too early: the bar has emptied (mcMeleeEarly); it flashes red */
      const early = m.early || 0;
      if (early !== last.early) { if (last.early !== null && early > last.early) again(missRef.current, 'bt-mc-go'); last.early = early; }
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
      if (g) { g.vis = true; g.frac = q / 60; g.full = full; g.kind = kind; g.armed = armed; g.x = last.x; g.y = last.y; g.missed = early; }
    };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [on, stateRef]);

  if (!on) return null;
  return (
    <div ref={layerRef} aria-hidden="true" style={{ position: 'fixed', inset: 0, display: 'none', pointerEvents: 'none', zIndex: 12 }}>
      <div ref={boxRef} data-manual-gauge="" style={{ position: 'absolute', left: 0, top: 0, width: BAR_W, height: BAR_H, pointerEvents: 'none', willChange: 'transform' }}>
        {/* the soft band that breathes at full, and the outline that bursts off the bar as it fills */}
        <div ref={haloRef} className="bt-mc-halo" />
        <div ref={popRef} className="bt-mc-pop" />
        {/* the track and its fill */}
        <div data-mc-track="" style={{ position: 'absolute', inset: 0, borderRadius: BAR_H / 2, boxSizing: 'border-box', overflow: 'hidden', background: 'rgba(11, 22, 27, 0.9)', border: '2px solid rgba(244, 240, 231, 0.8)' }}>
          <div ref={fillRef} data-mc-fill="" style={{ position: 'absolute', inset: 0, background: BUILD, transform: 'scaleX(0)', transformOrigin: '0 50%' }} />
          <div ref={missRef} className="bt-mc-miss" />
        </div>
        {/* the weapon, on the bar's left end */}
        <div ref={badgeRef} style={{
          position: 'absolute', left: -OVER_L, top: -OVER_Y, width: BADGE, height: BADGE, borderRadius: '50%', boxSizing: 'border-box',
          transition: 'transform 120ms ease-out', background: 'rgba(11, 22, 27, 0.95)', border: '2px solid rgba(244, 240, 231, 0.75)',
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
        {/* a special armed for the next attack, on the bar's right end */}
        <div ref={starRef} data-mc-star="" style={{
          position: 'absolute', right: -OVER_R, top: (BAR_H - 26) / 2, width: 26, height: 26, borderRadius: '50%', display: 'none',
          background: 'rgba(11, 22, 27, 0.95)', border: '2px solid #7FB0EC', boxSizing: 'border-box',
          color: '#BFD9FA', fontSize: 16, fontWeight: 900, lineHeight: '22px', textAlign: 'center',
        }}>✶</div>
      </div>
    </div>
  );
}

export default ManualGauge;
