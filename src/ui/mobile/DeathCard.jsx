import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { deathCardView, deathStripWords, deathStripOneLine } from '@/game/deathCard.js';
import { Z_ABOVE_DASH_PROMPT } from '@/ui/zLayers.js';
import { deathStripPlace } from './deathStripPlace.js';   /* v2.3.3972: under the top bar, across the play column */

/* ═══ v2.3.3817: "YOU DIED", AND WHAT KILLED YOU, FOR THE FIVE SECONDS ═══
 *
 * The card over the scene between a death and the worker's respawn
 * (game/deathCard.js has the why and the words): "You died", what killed you,
 * and "Back in BroTown in N" counting down.  It is a notice, not a window: it
 * never takes a tap or a click (pointer-events none), so nothing a dying
 * player was doing is in its way, and it has nothing to close.
 *
 * (v2.3.3817 put it in the middle of the play area, z 22 with the banners;
 * v2.3.3841 moved it to the top, below.)
 *
 * ITS OWN CLOCK, as NmlBadge: the game state read every 250 ms, a re-render
 * only when what it says changes.  Flat fills only: it is over the WebGL
 * canvas (TRAPS section 42).
 *
 * ═══ v2.3.3841: AT THE TOP, NEVER OVER YOU ═══
 * The owner: "The 'you got killed by' placard needs to be positioned in a
 * different spot (maybe towards the top) because I totally missed my
 * exploding skeleton death."  In the middle of the play area it sat exactly
 * where the bro falls apart into bones (the body's death burst is drawn at
 * your feet, and the camera keeps you in the middle).  So it takes the place
 * No man's land's "Attack?" window takes (NmlAskCard.jsx cardPlace): beside
 * the minimap when the strip to its left holds it (a computer, a phone held
 * sideways; slid off the middle where you stand when it would come down
 * that low), else under it, centred (an upright phone) -- clear of the top
 * bar, the minimap, the badge and a party invite, and far above your head.
 * Every number there is the screen's own, so it is PORTALLED to the body at
 * the same layer (Z_ABOVE_DASH_PROMPT), still never taking a tap.  It comes
 * in quickly (150 ms, fading and settling down) so the eye goes to it.
  *
 * ═══ v2.3.3972: A STRIP ACROSS THE TOP, NOT A STAMP ═══
 * The owner: "The you died by snowman message should span the entire top strip
 * of the game screen.  It looks a bit silly as a stamp-like screen near the
 * top."  The 264 px rounded card beside or under the minimap is now a band
 * right under the top bar, across the whole play column (deathStripPlace):
 * "YOU DIED · killed by a Snowman · back in BroTown in 5" on one line, two on
 * a narrow phone (game/deathCard.js deathStripWords), a dark red flat fill with
 * a thin lighter edge, sliding down in 150 ms.  Still never over you (the
 * band ends far above your head: about 40-60 px under the top bar), still no
 * taps, still flat fills over the canvas.
 */
export default function DeathCard({ stateRef }) {
  const [view, setView] = useState(null);
  const [place, setPlace] = useState(null);
  const [shown, setShown] = useState(false);
  const sigRef = useRef('');
  const placeRef = useRef(null);
  useEffect(() => {
    const id = setInterval(() => {
      let v = null;
      try { v = deathCardView(stateRef && stateRef.current, Date.now()); } catch (e) { v = null; }
      /* its place, read while it shows (a turned phone, a resized window) */
      if (v) {
        let p = null;
        try { p = deathStripPlace(); } catch (e) { p = null; }
        const q = placeRef.current;
        if (p && (!q || q.top !== p.top || q.left !== p.left || q.w !== p.w)) { placeRef.current = p; setPlace(p); }
      }
      const sig = v ? [v.by, v.note, v.secs].join('|') : '';
      if (sig !== sigRef.current) { sigRef.current = sig; setView(v); }
    }, 250);
    return () => clearInterval(id);
  }, [stateRef]);
  /* the quick entrance -- drawn once at its start, then let go */
  const up = !!view;
  useEffect(() => {
    if (!up) { setShown(false); return undefined; }
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(r);
  }, [up]);
  /* QA handle (mp-deathcard, the UI review): what the card says, or null */
  useEffect(() => {
    try { window.__btDeathCard = () => (view ? { ...view } : null); } catch (e) { /* no window */ }
  }, [view]);
  if (!view || typeof document === 'undefined') return null;
  const pl = place || placeRef.current || { top: 50, left: 0, w: (typeof window !== 'undefined' && window.innerWidth) || 390, at: 'window' };
  const words = deathStripWords(view);
  const one = deathStripOneLine(words, pl.w);
  const SEP = ' \u00b7 ';
  /* two lines: the head and who, then the rest */
  const line2 = one ? null : words.parts.slice(1).join(SEP);
  return createPortal(
    <div data-death-card="" data-death-strip="" data-death-at={pl.at || ''} data-death-lines={one ? '1' : '2'} aria-live="polite" style={{
      position: 'fixed', left: pl.left, top: pl.top, width: pl.w, boxSizing: 'border-box',
      pointerEvents: 'none', zIndex: Z_ABOVE_DASH_PROMPT, overflow: 'hidden',
      padding: one ? '9px 16px' : '7px 12px',
      /* a dark red band, its lower edge a thin lighter line; flat fills only
         (over the WebGL canvas: TRAPS section 42) */
      background: '#4A1517', borderBottom: '1px solid #C85A50', borderTop: '1px solid rgba(232,102,92,0.35)',
      textAlign: 'center', color: '#F4F0E7', fontSize: 15, fontWeight: 700, lineHeight: 1.3,
      whiteSpace: one ? 'nowrap' : 'normal',
      opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(-40%)',   /* slides down out of the bar's edge */
      transition: 'opacity 150ms ease-out, transform 150ms ease-out',
    }}>
      {one ? (
        <span data-death-line="">
          <span data-death-title="" style={{ fontWeight: 900, letterSpacing: 1.5, color: '#FF8A7E' }}>{words.head}</span>
          {words.parts.map((t, i) => <span key={i} data-death-part={i}>{SEP}{t}</span>)}
        </span>
      ) : (
        <>
          <div data-death-line="1">
            <span data-death-title="" style={{ fontWeight: 900, letterSpacing: 1.5, color: '#FF8A7E' }}>{words.head}</span>
            {words.parts.length ? <span data-death-part="0">{SEP}{words.parts[0]}</span> : null}
          </div>
          {line2 ? <div data-death-line="2" style={{ fontSize: 13, color: '#E6CFC6' }}>{line2}</div> : null}
        </>
      )}
    </div>,
    document.body,
  );
}
