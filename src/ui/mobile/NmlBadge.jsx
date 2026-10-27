/* ═══ v2.3.3107: NO MAN'S LAND, OVER THE MIDDLE OF THE DASHBOARD ═══
 *
 * The owner: "make the skull level (no mans land) appear above the center of
 * the dashboard (should be bottom center of playable screen area) instead of
 * the top bar. If you tap it it gives you info on what it means".
 *
 * v2.3.3058 put "☠ No man's land 1 · Lv 6–10" in the top bar's second line,
 * in red.  It moves here: a skull and the number, centred on the play area's
 * bottom edge, just above the band (the controls' own `--sheet-h`, so it rides
 * a raised sheet as they do), and the top bar names the stage again.  A tap
 * opens the game's explainer (InfoPopup) with the rules -- what the worker
 * does, server/src/nomansland.js -- and your own skull, if you carry one.
 *
 * ITS OWN CLOCK, as ElemStatusChips: it polls the game state every 250 ms and
 * re-renders only when the level or your skull's minute changes.  While it is
 * up it sets `--nml-lift` on the page, so the interact prompts above the band
 * (a dungeon's mouth stands in No man's land) step up over it.
 *
 * ═══ v2.3.3268: JUST LEFT OF THE MIDDLE, CLEAR OF THE SHIELD ═══
 * The owner: "I also want to be able to use shield for when battles happen
 * against real players in no mans land".  Centred on the middle, the badge
 * sat ON the shield button: the shield's left edge is the screen's middle by
 * construction (ShieldButton.jsx ctlColumn: the button fills the room between
 * the movement half and the attack disc, so its left edge is 50% of the width
 * wherever it is squeezed, and right of it where it is not), the badge's 44 px
 * tap row reached 46 px over the band and the shield's bottom is 21 px over
 * it, and the badge is drawn on top (z 34 over 31) -- so a tap on the
 * shield's middle opened the badge's rules, in the one place a fight needs
 * the shield.  The badge now ends left of the middle and of the shield (a
 * narrow phone squeezes the shield over the middle -- ctlColumn's 44 px floor:
 * at 375 its left edge is 6 px past it, at 360 14), 8 px clear where there is
 * room and never less than 2: still at the bottom, by the middle, never over
 * the shield, at any width, either way up.  And it is NARROWER, so it fits
 * between the shield and the notification bell (left of it, 66-110 px) on a
 * 360 px phone: the skull and the number, your own skull a small mark on its
 * corner instead of a third thing in the row (it was 81 px wide with one, and
 * at 360 and 375 the moved badge lay over the bell).  mp-nmlfoe measures it at
 * 320-430 px and sideways.
 */
import React, { useEffect, useRef, useState } from 'react';
import { nmlHere, NML_RED } from '@/game/noMansLand.js';
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3612: "tap" reads "click" on a computer */
import { infoPopupBus } from './infoPopupBus.js';
import { blockAnchor } from '@/ui/panels/ShieldButton.jsx'; /* v2.3.3268: where the shield button stands; v2.3.3608: where it WILL stand, before it shows */

/* how far the bottom-band prompts step up while the badge is shown: its 44 px
   tap row, and a little air */
export const NML_LIFT_PX = 62;   /* v2.3.3600: the badge twice the size */

/* v2.3.3268 placed the badge left of the middle, between the bell and the
   shield button, always (BADGE_W, SHIELD_AIR, BELL_END in CSS).  Since
   v2.3.3608 it is CENTRED, and steps beside the shield only while the shield
   button lies under that spot (nmlBadgePlace): SHIELD_AIR clear of the shield
   and of the bell, drawn as small as it must be there and never under
   BADGE_MIN_K of its size. */
const SHIELD_AIR = 6;
const BADGE_MIN_K = 0.6;

/** v2.3.3608: where the badge stands.  Every box in the viewport's numbers:
 *  `cb` the badge's containing block ({left, width}: the play area -- on a
 *  computer the phone-shaped frame, #root's contain:paint), `w` the badge's
 *  own width, `shield` and `bell` the shield button's and the notification
 *  bell's boxes ({left, right}) or null.  Centred on the play area, unless the
 *  shield button lies under that spot (portrait in a fight: its left edge is
 *  the middle) -- then its right edge SHIELD_AIR left of the shield, scaled to
 *  the room left of it down to BADGE_MIN_K, over the bell's end only where
 *  even that does not fit (a 320 px phone).  Returns {left, k}: `left` from
 *  the containing block's left edge, `k` the scale, `beside` whether it
 *  stepped aside. */
export function nmlBadgePlace(cb, w, shield, bell) {
  const mid = cb.left + cb.width / 2;
  const l = mid - w / 2, r = mid + w / 2;
  if (!shield || r <= shield.left - SHIELD_AIR || l >= shield.right) {
    return { left: Math.round(l - cb.left), k: 1, beside: false };
  }
  const right = shield.left - SHIELD_AIR;
  const from = bell ? bell.right + SHIELD_AIR : cb.left + 4;
  const k = Math.max(BADGE_MIN_K, Math.min(1, (right - from) / w));
  return { left: Math.round(right - w * k - cb.left), k: Math.round(k * 100) / 100, beside: true };
}

/* a skull, drawn rather than the emoji (every phone draws 💀 its own way) */
export function NmlSkull({ size = 18, color = NML_RED }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path fill={color} stroke="#1a0b0a" strokeWidth="1.4" strokeLinejoin="round"
        d="M12 2.2c-5 0-8.6 3.5-8.6 8.2 0 2.7 1.2 4.6 3 5.8v2.6c0 1 .8 1.8 1.8 1.8h7.6c1 0 1.8-.8 1.8-1.8v-2.6c1.8-1.2 3-3.1 3-5.8 0-4.7-3.6-8.2-8.6-8.2z" />
      <circle cx="8.4" cy="11" r="2.3" fill="#1a0b0a" />
      <circle cx="15.6" cy="11" r="2.3" fill="#1a0b0a" />
      <path fill="#1a0b0a" d="M12 13.6l-1.5 2.6h3z" />
      <path stroke="#1a0b0a" strokeWidth="1.2" d="M10 18.2v2.2M12 18.2v2.2M14 18.2v2.2" />
    </svg>
  );
}

/* the monsters' levels of No man's land n: the ring n + 1 of each land's
   fives (src/data/noMansLandRings.js -- 1 is Lv 6-10) */
export function nmlLevels(n) {
  return `Lv ${5 * n + 1}–${5 * n + 5}`;
}

/* your own skull, minutes of play left (applyNmlSkull keeps {red, white, at}:
   the worker's milliseconds when it said so; the clock runs only online,
   and you are online while you read this) */
export function nmlSkullLeft(S, now) {
  const o = S && S._nmlSelf;
  if (!o) return null;
  const gone = Math.max(0, now - (o.at || now));
  const red = Math.max(0, (Number(o.red) || 0) - gone), white = Math.max(0, (Number(o.white) || 0) - gone);
  if (red > 0) return { type: 'red', min: Math.ceil(red / 60000) };
  if (white > 0) return { type: 'white', min: Math.ceil(white / 60000) };
  return null;
}

function Line({ children }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>;
}

export function openNmlInfo(S, lvl) {
  const skull = nmlSkullLeft(S, Date.now());
  const n = lvl;
  const lv = (k) => `${k} level${k === 1 ? '' : 's'}`;
  infoPopupBus.open({
    title: `No man's land ${n} · ${nmlLevels(n)}`,
    body: (
      <div data-nml-info={n}>
        <div style={{ marginBottom: 8 }}>
          Other players can attack you here, and you can attack them.
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Line><b>Who:</b> players within {lv(n)} of yours, while they stand in No man's land too. The lower of your two numbers counts, and it grows the further you go from town. Your party never.</Line>
          {/* v2.3.3253: attacking is a choice (game/nmlAsk.js) */}
          {/* v2.3.3316: a swing at them asks too, as a shot through them does */}
          <Line><b>How:</b> {deskWords('tap a player, or swing or shoot at them, and choose ')}<b>Attack</b>. Until you do, your blows never hurt them.</Line>
          {/* v2.3.3316: the owner -- everything carried, the gold and the tools
              too; a red skull a monster kills keeps what it wears */}
          <Line><b>Killed by a player:</b> they get <b>everything you carry</b>: your bag, tools and ores too, your gold, and your spare weapons and armour. You keep what you wear. Diego sells a lost tool back.</Line>
          {/* v2.3.3530: the skulls come with the window's Attack (nomansland.js _handleNmlAttack) */}
          <Line><b>Attack a player:</b> a <span style={{ color: NML_RED, fontWeight: 800 }}>red skull</span> for 20 minutes of play from the moment you choose Attack, starting over with every hit. Killed by a player with it, you lose <b>everything</b>, worn gear too; killed by a monster, everything but what you wear.</Line>
          {/* v2.3.3528: hitting back goes through the window too (game/nmlAsk.js);
              v2.3.3530: white the moment they choose, whether you fight back or
              not, and one Attack answers a whole group */}
          <Line><b>Get attacked:</b> a <b>white skull</b> the moment they choose to attack you, whether you fight back or not. {deskWords('To hit back, swing, shoot or tap them and choose ')}<b>Attack</b> once: hitting back anyone who attacked you gives you no red skull, and everyone attacking you is then yours to hit.</Line>
        </ul>
        <div>Walk back toward BroTown to leave.</div>
      </div>
    ),
    note: skull
      ? (skull.type === 'red'
        ? `You carry a red skull: ${skull.min} min of play left.`
        : `You carry a white skull: ${skull.min} min of play left.`)
      : undefined,
  });
}

function setLift(on) {
  try {
    const st = document.documentElement.style;
    if (on) st.setProperty('--nml-lift', NML_LIFT_PX + 'px');
    else st.removeProperty('--nml-lift');
  } catch (e) { /* the prompts keep their slot */ }
}

export default function NmlBadge({ stateRef, isLandscape }) {
  const [lvl, setLvl] = useState(0);
  const [skull, setSkull] = useState(null);
  /* v2.3.3608: its two places (nmlBadgePlace), worked out ahead from the
     screen: a sentinel spanning the containing block, the pill's own width,
     the bell's box as drawn, and the shield button's box -- as drawn, or, while
     it is not up, where it WILL stand (blockAnchor, the button's own anchor).
     game.css picks between them the moment the button is in the page
     (`:has([data-shield])`), so the badge never waits on a poll to step aside:
     a poll's lag left it over the shield for a moment, where a tap meant for
     the shield opened the rules (mp-nmlfoe step 1) */
  const [place, setPlace] = useState(null);
  const probeRef = useRef(null), pillRef = useRef(null);
  const placeNow = useRef(() => {});
  placeNow.current = () => {
    try {
      const pr = probeRef.current, pill = pillRef.current;
      if (!pr || !pill) return;
      const cb = pr.getBoundingClientRect();
      const box = (sel) => { const n = document.querySelector(sel); const q = n && n.getBoundingClientRect(); return q && q.width > 0 && q.height > 0 ? q : null; };
      let shield = box('[data-shield]');
      if (!shield) {
        const sh = blockAnchor(!!isLandscape);
        const r = cb.left + cb.width - sh.right;
        shield = { left: r - sh.size, right: r };
      }
      const w = pill.offsetWidth + 2;
      const p = nmlBadgePlace({ left: cb.left, width: cb.width }, w, shield, box('[data-world-chat-toggle]'));
      p.centre = Math.round(cb.width / 2 - w / 2);
      setPlace((o) => (o && o.left === p.left && o.k === p.k && o.beside === p.beside && o.centre === p.centre ? o : p));
    } catch (e) { /* the badge keeps its place */ }
  };
  useEffect(() => {
    let last = '';
    const id = setInterval(() => {
      const S = stateRef && stateRef.current;
      let l = 0;
      try { l = nmlHere(S); } catch (e) { l = 0; }
      const sk = l ? nmlSkullLeft(S, Date.now()) : null;
      const sig = l + '|' + (sk ? sk.type : '');
      if (sig !== last) { last = sig; setLvl(l); setSkull(sk); setLift(l > 0); }
      if (l) placeNow.current();
    }, 250);
    return () => { clearInterval(id); setLift(false); };
  }, [stateRef]);
  /* QA handle, the house style (__btInfoPopup, __btCtlTut); `beside` true
     while it stands beside the shield button right now */
  useEffect(() => {
    try {
      window.__btNmlBadge = () => ({ lvl, skull: skull && skull.type, place,
        beside: !!(place && place.beside && document.querySelector('[data-shield]')) });
    } catch (e) { /* no window */ }
  }, [lvl, skull, place]);
  /* v2.3.3268: placed again when the screen's width changes (where the shield
     button stands moves with it, ShieldButton.jsx ctlColumn) -- only while
     the badge is up; v2.3.3608: and as it first comes up */
  useEffect(() => {
    if (!lvl) { setPlace(null); return undefined; }
    const f = () => placeNow.current();
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(f) : 0;
    try { window.addEventListener('resize', f); } catch (e) { /* no window */ }
    return () => {
      try { if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', f); } catch (e) { /* gone */ }
    };
  }, [lvl, isLandscape]);
  if (!lvl) return null;
  /* v2.3.3268 put the badge's right edge left of the middle and of the
     shield button, in the FRAME's numbers: on a computer the game is a
     phone-shaped frame (#root, contain:paint) narrower than the window, and
     the first cut worked in the window's numbers and put the badge 300 px
     left of the frame's middle there (mp-nomansland).
     ═══ v2.3.3608: CENTRED, BESIDE THE SHIELD ONLY WHILE IT IS IN THE WAY ═══
     The owner, 2026-10-26: "center the red skull on the UI so it's not
     awkwardly aligned to the left."  It stood left of the middle all the time
     so it could never cover the shield button (whose left edge is the middle,
     upright), and since v2.3.3600 made it twice the size it lay on the bell
     below a 390 px phone.  Now it is centred on the play area, and only while
     the shield button is drawn under that spot (a fight) does it step just
     left of the shield, smaller if the bell leaves less room (nmlBadgePlace).
     Lifting it over the shield instead was measured and does not fit: Bash
     and the attack disc stand right above the shield, in the middle.  Placed
     from the boxes as drawn, so every number is the frame's own; the switch
     between the two places is game.css's (.bt-nml-badge), and the badge sits
     UNDER the shield button (z 30 to its 31, over the sticks' 6): whatever
     the moment, a tap on the shield is the shield's. */
  const vars = place ? {
    '--nml-c-left': place.centre + 'px', '--nml-c-tf': 'none',
    '--nml-b-left': place.left + 'px',
    '--nml-b-k': String(place.k),
  } : null;
  const open = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openNmlInfo(stateRef && stateRef.current, lvl);
  };
  return (
    <>
    {/* v2.3.3608: spans the badge's containing block, so its box says where
        the play area is in the viewport's numbers (nmlBadgePlace) */}
    <div ref={probeRef} aria-hidden="true" style={{ position: 'fixed', left: 0, right: 0, top: 0, height: 0, visibility: 'hidden', pointerEvents: 'none' }} />
    <button type="button" data-nml-badge={lvl} data-nml-beside={place && place.beside ? '' : undefined}
      className="bt-nml-badge"
      aria-label={`No man's land ${lvl}: players can attack you here. Tap for what it means.`}
      onClick={open}
      style={{
        /* v2.3.3608: centred, beside the shield only while it is in the way
           -- `left` and `transform` are game.css's (.bt-nml-badge), from these
           variables (see above) */
        position: 'fixed', ...vars,
        bottom: 'calc(var(--sheet-h, var(--dash-h)) + 2px)', zIndex: 30,
        minHeight: 44, padding: '0 1px', background: 'transparent', border: 0,
        display: 'flex', alignItems: 'center', cursor: 'pointer',
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
      }}>
      <span ref={pillRef} style={{
        /* v2.3.3268: a little tighter (it was 4px 10px 4px 7px, gap 5) */
        position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px 5px 7px',   /* v2.3.3600: twice the size */
        borderRadius: 999, background: 'rgba(22,10,10,.86)',
        border: `2px solid ${NML_RED}`, boxShadow: '0 0 0 1px rgba(0,0,0,.5)',
        color: '#FFE3DF', fontSize: 12, fontWeight: 800, letterSpacing: '.02em', whiteSpace: 'nowrap',
      }}>
        {/* the skull and the number only (the owner's "skull level"): the
            words would run under the bell and the jump button beside it on a
            390 px phone; a tap says them */}
        <NmlSkull size={38} />
        <span data-nml-num="" style={{ fontSize: 32, color: NML_RED, fontWeight: 900, lineHeight: 1 }}>{lvl}</span>
        {/* v2.3.3268: your own skull on the pill's top corner, as a count sits
            on a bell, so the badge is no wider for it (see the header) */}
        {skull && (
          <span data-nml-own-skull={skull.type} title={`${skull.type} skull`} style={{
            position: 'absolute', top: -8, right: -8, width: 18, height: 18, borderRadius: 999,
            background: 'rgba(22,10,10,.94)', border: `1px solid ${skull.type === 'red' ? NML_RED : '#F2F2F2'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <NmlSkull size={12} color={skull.type === 'red' ? NML_RED : '#F2F2F2'} />
          </span>
        )}
      </span>
    </button>
    {/* v2.3.3600: A SLOWLY BLINKING RED LINE along the top of the band while
        you are in No man's land -- the owner: "some kind of slightly blinking
        red line" (game.css bt-nml-line; still under calm motion) */}
    <div data-nml-line="" aria-hidden="true" className="bt-nml-line" style={{
      position: 'fixed', left: 0, right: 0, height: 3, pointerEvents: 'none', zIndex: 33,
      bottom: 'calc(var(--sheet-h, var(--dash-h)) - 1px)', background: NML_RED,
      boxShadow: `0 0 8px ${NML_RED}`,
    }} />
    </>
  );
}
