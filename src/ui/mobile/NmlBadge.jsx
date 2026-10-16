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
import React, { useEffect, useState } from 'react';
import { nmlHere, NML_RED } from '@/game/noMansLand.js';
import { infoPopupBus } from './infoPopupBus.js';
import { blockAnchor } from '@/ui/panels/ShieldButton.jsx'; /* v2.3.3268: where the shield button stands, to keep clear of it */

/* how far the bottom-band prompts step up while the badge is shown: its 44 px
   tap row, and a little air */
export const NML_LIFT_PX = 48;

/* v2.3.3268: the badge's width (the button round its pill: skull, number),
   for placing it between the bell and the shield (mp-nmlfoe reads the real
   one); how far it keeps from the shield, 2 px at the least; and where the
   notification bell ends, in the frame's own numbers (WorldChatFeed.jsx: its
   shell's `left`, and the shut bell 36 px wide) */
const BADGE_W = 50;
const SHIELD_AIR = 8;
const BELL_END = 'var(--world-x, 0px) + var(--land-fold-w, 0px) + var(--bt-wpn-slot, 0px) + 44px';

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
          <Line><b>How:</b> tap a player and choose <b>Attack</b>. A stray shot never hurts anyone.</Line>
          <Line><b>Killed by a player:</b> what's in your bag drops for them, with your spare weapons and armour. You keep what you wear, your tools, quest items and gold.</Line>
          <Line><b>Attack a player:</b> a <span style={{ color: NML_RED, fontWeight: 800 }}>red skull</span> for 20 minutes of play, starting over with every hit. Die with it and you lose <b>everything</b>, worn gear and gold too.</Line>
          <Line><b>Get attacked:</b> a <b>white skull</b>. Hitting back the player who hit you gives you no red one.</Line>
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
  useEffect(() => {
    let last = '';
    const id = setInterval(() => {
      const S = stateRef && stateRef.current;
      let l = 0;
      try { l = nmlHere(S); } catch (e) { l = 0; }
      const sk = l ? nmlSkullLeft(S, Date.now()) : null;
      const sig = l + '|' + (sk ? sk.type : '');
      if (sig !== last) { last = sig; setLvl(l); setSkull(sk); setLift(l > 0); }
    }, 250);
    return () => { clearInterval(id); setLift(false); };
  }, [stateRef]);
  /* QA handle, the house style (__btInfoPopup, __btCtlTut) */
  useEffect(() => {
    try { window.__btNmlBadge = () => ({ lvl, skull: skull && skull.type }); } catch (e) { /* no window */ }
  }, [lvl, skull]);
  /* v2.3.3268: drawn again when the screen's width changes (where the shield
     button stands moves with it, ShieldButton.jsx ctlColumn) -- only while
     the badge is up */
  const [, setVw] = useState(0);
  useEffect(() => {
    if (!lvl) return undefined;
    const f = () => setVw(typeof window !== 'undefined' ? window.innerWidth : 0);
    try { window.addEventListener('resize', f); } catch (e) { /* no window */ }
    return () => { try { window.removeEventListener('resize', f); } catch (e) { /* gone */ } };
  }, [lvl]);
  if (!lvl) return null;
  /* v2.3.3268: the badge's right edge, from the frame's right: left of the
     middle and of the shield button (blockAnchor: its right and its size),
     SHIELD_AIR clear of them where the bell to its left leaves room, and 2 px
     at the least.  In CSS, so every number is the FRAME's: on a computer the
     game is a phone-shaped frame (#root, contain:paint) narrower than the
     window, and the shield, the bell and this badge are all placed in it --
     the first cut worked in the window's numbers and put the badge 300 px
     left of the frame's middle there (mp-nomansland). */
  let right = 'calc(50% + 2px)';
  try {
    const sh = blockAnchor(!!isLandscape);
    const lim = `max(50%, ${Math.ceil(sh.right + sh.size)}px)`;
    right = `max(calc(${lim} + 2px), min(calc(${lim} + ${SHIELD_AIR}px), calc(100% - (${BELL_END}) - ${2 + BADGE_W}px)))`;
  } catch (e) { /* centred-left, as the first cut */ }
  const open = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openNmlInfo(stateRef && stateRef.current, lvl);
  };
  return (
    <button type="button" data-nml-badge={lvl}
      aria-label={`No man's land ${lvl}: players can attack you here. Tap for what it means.`}
      onClick={open}
      style={{
        /* v2.3.3268: left of the middle and of the shield button (see the
           header); centred on the middle before */
        position: 'fixed', right,
        bottom: 'calc(var(--sheet-h, var(--dash-h)) + 2px)', zIndex: 34,
        minHeight: 44, padding: '0 1px', background: 'transparent', border: 0,
        display: 'flex', alignItems: 'center', cursor: 'pointer',
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
      }}>
      <span style={{
        /* v2.3.3268: a little tighter (it was 4px 10px 4px 7px, gap 5) */
        position: 'relative', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px 4px 5px',
        borderRadius: 999, background: 'rgba(22,10,10,.86)',
        border: `1.5px solid ${NML_RED}`, boxShadow: '0 0 0 1px rgba(0,0,0,.5)',
        color: '#FFE3DF', fontSize: 12, fontWeight: 800, letterSpacing: '.02em', whiteSpace: 'nowrap',
      }}>
        {/* the skull and the number only (the owner's "skull level"): the
            words would run under the bell and the jump button beside it on a
            390 px phone; a tap says them */}
        <NmlSkull size={19} />
        <span data-nml-num="" style={{ fontSize: 16, color: NML_RED, fontWeight: 900, lineHeight: 1 }}>{lvl}</span>
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
  );
}
