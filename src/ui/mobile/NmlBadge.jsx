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
 */
import React, { useEffect, useState } from 'react';
import { nmlHere, NML_RED } from '@/game/noMansLand.js';
import { infoPopupBus } from './infoPopupBus.js';

/* how far the bottom-band prompts step up while the badge is shown: its 44 px
   tap row, and a little air */
export const NML_LIFT_PX = 48;

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

export default function NmlBadge({ stateRef }) {
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
  if (!lvl) return null;
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
        position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        bottom: 'calc(var(--sheet-h, var(--dash-h)) + 2px)', zIndex: 34,
        minHeight: 44, padding: '0 4px', background: 'transparent', border: 0,
        display: 'flex', alignItems: 'center', cursor: 'pointer',
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
      }}>
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px 4px 7px',
        borderRadius: 999, background: 'rgba(22,10,10,.86)',
        border: `1.5px solid ${NML_RED}`, boxShadow: '0 0 0 1px rgba(0,0,0,.5)',
        color: '#FFE3DF', fontSize: 12, fontWeight: 800, letterSpacing: '.02em', whiteSpace: 'nowrap',
      }}>
        {/* the skull and the number only (the owner's "skull level"): the
            words would run under the bell and the jump button beside it on a
            390 px phone; a tap says them */}
        <NmlSkull size={20} />
        <span data-nml-num="" style={{ fontSize: 16, color: NML_RED, fontWeight: 900, lineHeight: 1 }}>{lvl}</span>
        {skull && (
          <span data-nml-own-skull={skull.type} title={`${skull.type} skull`} style={{ marginLeft: 1 }}>
            <NmlSkull size={14} color={skull.type === 'red' ? NML_RED : '#F2F2F2'} />
          </span>
        )}
      </span>
    </button>
  );
}
