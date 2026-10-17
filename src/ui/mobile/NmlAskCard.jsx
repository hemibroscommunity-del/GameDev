/* ═══ v2.3.3253: "ATTACK <NAME>?" -- THE SMALL WINDOW ═══
 *
 * Owner, 2026-10-14: "... a one time window pops up asking if you want to
 * attack the player with a red skull appearing on the window and a tiny
 * information icon next to it.  I want the window itself to be small.  The
 * window can say attack, party, or ignore. ..."
 *
 * What raises it and what each button does is game/nmlAsk.js (its header has
 * the rules); this is the window.
 *
 * AT THE TOP, OUT OF THE THUMBS' WAY.  It first sat just above No man's land's
 * badge, and on a 390 px phone that put its Attack button exactly where a left
 * thumb comes down to steer, and its Ignore over the attack disc (mp-nmlask's
 * picture) -- a window asking "do you mean to attack?" must never be answered
 * by a thumb that meant to walk.  So it sits under the Wheel's minimap, centred
 * (cardPlace: the minimap's own rect, window.__btWheelMini), or beside it in
 * the strip to its left when there is room (a phone held sideways, a
 * computer), centred on the play area (.brotown-wrap's rect).  It is
 * PORTALLED to the body, at the prompt layer the party invite card uses
 * (Z_ABOVE_DASH_PROMPT), so every number is the screen's own: inside the
 * game's wrapper a fixed child is placed in whatever frame the layout makes
 * (sideways and a computer's shell are their own containing blocks), and on a
 * computer it landed on the minimap.  A party invite card already at the top
 * (PartyHUD) keeps its place: the window goes under it (clearOfTopCards).
 *
 * It is plainly about No man's land:
 *   - the red skull (the badge's own drawing) with a tiny (i) on its corner --
 *     one button, the badge's explainer (openNmlInfo): who can attack whom,
 *     the red skull, what a death costs;
 *   - "Attack <name>?" and their level;
 *   - Attack (Lantern Slate's destructive red), Party (secondary; only
 *     against a worker with parties, as on the player card) and Ignore
 *     (quiet).
 * It never covers the screen (no scrim: it can come up in the middle of a
 * fight with the monsters) and takes only its own taps.  Its own clock, as
 * NmlBadge: every 250 ms it lets go if the player can no longer be fought
 * (either of you out of No man's land, levels apart, a party, gone), or when
 * nmlAskMs() (10 s) has passed untouched -- held while the explainer is open,
 * and 4 s more after it closes.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Z_ABOVE_DASH_PROMPT } from '@/ui/zLayers.js';
import { NML_RED, nmlHere, nmlCanAttack } from '@/game/noMansLand.js';
import { nmlAskCurrent, nmlAskSubscribe, nmlAskAnswer, nmlAskClose, nmlAskMs } from '@/game/nmlAsk.js';
import { NmlSkull, openNmlInfo } from './NmlBadge.jsx';
import { infoPopupBus } from './infoPopupBus.js';

/* the small "i" on the skull's corner */
function InfoDot({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ display: 'block' }}>
      <circle cx="8" cy="8" r="7" fill="#10181D" stroke="#B9C1BF" strokeWidth="1.6" />
      <circle cx="8" cy="4.6" r="1.25" fill="#F7F2E7" />
      <rect x="6.9" y="6.8" width="2.2" height="5.6" rx="1" fill="#F7F2E7" />
    </svg>
  );
}

/* Lantern Slate's buttons (LANTERN-SLATE-SPEC "Buttons & components"); the
   font shorthand FIRST, or it resets the size and weight after it */
const BTN = {
  font: 'inherit', flex: 1, minWidth: 0, minHeight: 40, padding: '0 6px', borderRadius: 11,
  fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap',
};
const ATTACK = { background: '#7C3431', color: '#FFF1EE', border: '1px solid #C7655F' };
const SECONDARY = { background: 'linear-gradient(180deg,#34444B,#2B3940)', color: '#F7F2E7', border: '1px solid rgba(238,242,235,.14)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' };
const QUIET = { background: 'transparent', color: '#B9C1BF', border: '1px solid rgba(238,242,235,.10)' };
export const NML_ASK_W = 264;
/* its height, for the stacking test (the window measures 92) */
const CARD_H = 96;
/* the other small cards that sit at the top of the screen: the window goes
   under one rather than over it (mp-nmlask's computer showed it over the
   party invite card the raider's Party had just raised) */
const TOP_CARDS = ['[data-party-invite]'];

/* the play area on the screen (.brotown-wrap: the whole width on a phone held
   upright, the world's own window sideways and in a computer's shell) */
function frameRect() {
  try {
    const w = document.querySelector('.brotown-wrap');
    if (w) {
      const r = w.getBoundingClientRect();
      if (r.width > 0) return { left: r.left, top: r.top, width: r.width };
    }
  } catch (e) { /* the viewport */ }
  return { left: 0, top: 0, width: (typeof window !== 'undefined' && window.innerWidth) || 390 };
}

/** Where the window goes on the screen: beside the minimap if the strip of
 *  the play area to its left holds it, else under it, centred on the play
 *  area; with no minimap, near the top. */
export function cardPlace() {
  const f = frameRect();
  const w = Math.max(200, Math.min(NML_ASK_W, Math.round(f.width) - 32));
  let m = null;
  try { m = window.__btWheelMini || null; } catch (e) { m = null; }
  if (m && typeof m.left === 'number' && typeof m.top === 'number') {
    const room = m.left - f.left;
    if (room - 16 >= w) return clearOfTopCards({ top: Math.round(m.top), left: Math.round(f.left + (room - w) / 2), w, at: 'beside' });
    return clearOfTopCards({ top: Math.round(m.top + (m.h || 132) + 8), left: Math.round(f.left + (f.width - w) / 2), w, at: 'below' });
  }
  return clearOfTopCards({ top: Math.round(f.top + 96), left: Math.round(f.left + (f.width - w) / 2), w, at: 'top' });
}
/* ...moved down under any of TOP_CARDS it would cover */
function clearOfTopCards(p) {
  let top = p.top, stacked = false;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const sel of TOP_CARDS) {
      let q = null;
      try { const n = document.querySelector(sel); q = n ? n.getBoundingClientRect() : null; } catch (e) { q = null; }
      if (!q || !(q.width > 0 && q.height > 0)) continue;
      if (!(q.right <= p.left || q.left >= p.left + p.w || q.bottom <= top || q.top >= top + CARD_H)) {
        top = Math.round(q.bottom + 8);
        moved = stacked = true;
      }
    }
    if (!moved) break;
  }
  return stacked ? Object.assign({}, p, { top, stacked: true }) : p;
}
const samePlace = (a, b) => !!a && !!b && a.top === b.top && a.left === b.left && a.w === b.w;

export default function NmlAskCard({ stateRef }) {
  const [ask, setAsk] = useState(() => nmlAskCurrent());
  const [place, setPlace] = useState(null);
  useEffect(() => nmlAskSubscribe(() => setAsk(nmlAskCurrent())), []);
  useEffect(() => {
    if (!ask) return undefined;
    let until = Date.now() + nmlAskMs();
    let at = cardPlace();
    setPlace(at);
    const t = setInterval(() => {
      const S = stateRef && stateRef.current;
      const now = Date.now();
      if (infoPopupBus.isOpen()) until = Math.max(until, now + 4000);
      let ok = false;
      try { ok = nmlCanAttack(S, ask.id); } catch (e) { ok = false; }
      /* v2.3.3316: with the game's state, so an unanswered window may ask again later */
      if (!ok || now >= until) { nmlAskClose(S); return; }
      /* the minimap or the screen moved (a turn of the phone, the band) */
      const nx = cardPlace();
      if (!samePlace(nx, at)) { at = nx; setPlace(nx); }
    }, 250);
    return () => clearInterval(t);
  }, [ask, stateRef]);
  if (!ask) return null;
  const pl = place || cardPlace();
  const S = stateRef && stateRef.current;
  const hasParty = !!(S && S._serverCaps && S._serverCaps.party);
  /* the game's own taps never reach the world from here */
  const stop = (e) => { e.stopPropagation(); };
  const answer = (choice) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    nmlAskAnswer(stateRef && stateRef.current, choice);
  };
  const info = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const St = stateRef && stateRef.current;
    let lvl = 0;
    try { lvl = nmlHere(St); } catch (er) { lvl = 0; }
    openNmlInfo(St, lvl || 1);
  };
  return createPortal(
    <div data-nml-ask={ask.why} data-nml-ask-id={ask.id} data-nml-ask-at={pl.at} data-nml-ask-stacked={pl.stacked ? '1' : undefined} role="dialog" aria-label={`Attack ${ask.name}?`}
      onPointerDown={stop} onTouchStart={stop} onMouseDown={stop} onClick={stop}
      style={{
        position: 'fixed', left: pl.left, top: pl.top, zIndex: Z_ABOVE_DASH_PROMPT,
        width: pl.w, boxSizing: 'border-box', padding: '4px 8px 8px 4px',
        borderRadius: 12, background: 'rgba(17,25,29,.94)', border: '1px solid rgba(238,242,235,.24)',
        boxShadow: '0 14px 30px rgba(4,7,9,.38)', color: '#F7F2E7', textAlign: 'left',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 36 }}>
        <button type="button" data-nml-ask-info="" onClick={info}
          aria-label="Attacking a player gives you a red skull. Tap for what No man's land means."
          style={{
            position: 'relative', flex: 'none', width: 40, height: 36, padding: 0, margin: 0,
            background: 'transparent', border: 0, cursor: 'pointer', touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <NmlSkull size={22} color={NML_RED} />
          <span style={{ position: 'absolute', right: 3, top: 2 }}><InfoDot size={13} /></span>
        </button>
        <div data-nml-ask-name="" style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Attack {ask.name}?
        </div>
        <div style={{ flex: 'none', marginLeft: 6, fontSize: 10, fontWeight: 600, color: '#B9C1BF', fontVariantNumeric: 'tabular-nums' }}>Lv {ask.lv}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 2, paddingLeft: 4 }}>
        <button type="button" data-nml-ask-attack="" onClick={answer('attack')} style={Object.assign({}, BTN, ATTACK)}>Attack</button>
        {hasParty && <button type="button" data-nml-ask-party="" onClick={answer('party')} style={Object.assign({}, BTN, SECONDARY)}>Party</button>}
        <button type="button" data-nml-ask-ignore="" onClick={answer('ignore')} style={Object.assign({}, BTN, QUIET)}>Ignore</button>
      </div>
    </div>,
    document.body
  );
}
