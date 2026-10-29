import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { deathCardView } from '@/game/deathCard.js';
import { Z_ABOVE_DASH_PROMPT } from '@/ui/zLayers.js';
import { cardPlace } from './NmlAskCard.jsx';

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
      /* v2.3.3841: its place, read while it shows (a turned phone, a resized window) */
      if (v) {
        let p = null;
        try { p = cardPlace(); } catch (e) { p = null; }
        const q = placeRef.current;
        if (p && (!q || q.top !== p.top || q.left !== p.left || q.w !== p.w)) { placeRef.current = p; setPlace(p); }
      }
      const sig = v ? [v.by, v.note, v.secs].join('|') : '';
      if (sig !== sigRef.current) { sigRef.current = sig; setView(v); }
    }, 250);
    return () => clearInterval(id);
  }, [stateRef]);
  /* v2.3.3841: the quick entrance -- drawn once at its start, then let go */
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
  const pl = place || placeRef.current || { top: 96, left: 0, w: 264, at: 'top' };
  return createPortal(
    <div data-death-card="" data-death-at={pl.at || ''} aria-live="polite" style={{
      position: 'fixed', left: pl.left, top: pl.top, width: pl.w, boxSizing: 'border-box',
      pointerEvents: 'none', zIndex: Z_ABOVE_DASH_PROMPT,
      padding: '10px 16px 10px',
      background: '#1A1315', border: '1px solid rgba(217,92,84,0.55)',   /* solid: the plates under it showed through at 0.86 (the UI review) */
      borderRadius: 12, textAlign: 'center', color: '#F4F0E7',
      boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
      opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(-8px) scale(0.96)',
      transition: 'opacity 150ms ease-out, transform 150ms ease-out',
    }}>
      <div data-death-title="" style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1.5, color: '#E8665C', textTransform: 'uppercase', lineHeight: 1.15 }}>{view.title}</div>
      {view.by && <div data-death-by="" style={{ marginTop: 4, fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{view.by}</div>}
      {view.note && <div data-death-note="" style={{ marginTop: 3, fontSize: 13, fontWeight: 600, color: '#D9B98A' }}>{view.note}</div>}
      <div data-death-back="" style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: '#AFC0BC' }}>{view.back}</div>
    </div>,
    document.body,
  );
}
