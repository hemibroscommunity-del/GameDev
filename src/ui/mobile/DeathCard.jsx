import React, { useEffect, useRef, useState } from 'react';
import { deathCardView } from '@/game/deathCard.js';

/* ═══ v2.3.3817: "YOU DIED", AND WHAT KILLED YOU, FOR THE FIVE SECONDS ═══
 *
 * The card over the scene between a death and the worker's respawn
 * (game/deathCard.js has the why and the words): "You died", what killed you,
 * and "Back in BroTown in N" counting down.  It is a notice, not a window: it
 * never takes a tap or a click (pointer-events none), so nothing a dying
 * player was doing is in its way, and it has nothing to close.
 *
 * In the middle of the play area, above the controls' band (`--sheet-h`, as
 * the line over the band, NmlBadge): on a computer #root is the box a fixed
 * layer measures from (fixedBox.js, TRAPS section 232), so `inset` alone puts
 * it in the column.  z 22, with the banners (zLayers.js): over the scene and
 * the top bar's row, under every window.
 *
 * ITS OWN CLOCK, as NmlBadge: the game state read every 250 ms, a re-render
 * only when what it says changes.  Flat fills only: it is over the WebGL
 * canvas (TRAPS section 42).
 */
export default function DeathCard({ stateRef }) {
  const [view, setView] = useState(null);
  const sigRef = useRef('');
  useEffect(() => {
    const id = setInterval(() => {
      let v = null;
      try { v = deathCardView(stateRef && stateRef.current, Date.now()); } catch (e) { v = null; }
      const sig = v ? [v.by, v.note, v.secs].join('|') : '';
      if (sig !== sigRef.current) { sigRef.current = sig; setView(v); }
    }, 250);
    return () => clearInterval(id);
  }, [stateRef]);
  /* QA handle (mp-deathcard, the UI review): what the card says, or null */
  useEffect(() => {
    try { window.__btDeathCard = () => (view ? { ...view } : null); } catch (e) { /* no window */ }
  }, [view]);
  if (!view) return null;
  return (
    <div data-death-card="" aria-live="polite" style={{
      position: 'fixed', left: 0, right: 0, top: 0,
      bottom: 'var(--sheet-h, var(--dash-h, 0px))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 22,
    }}>
      <div style={{
        minWidth: 220, maxWidth: 'min(86%, 360px)', padding: '14px 20px 13px',
        background: '#1A1315', border: '1px solid rgba(217,92,84,0.55)',   /* solid: the plates under it showed through at 0.86 (the UI review) */
        borderRadius: 12, textAlign: 'center', color: '#F4F0E7',
        boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
      }}>
        <div data-death-title="" style={{ fontSize: 24, fontWeight: 900, letterSpacing: 1.5, color: '#E8665C', textTransform: 'uppercase' }}>{view.title}</div>
        {view.by && <div data-death-by="" style={{ marginTop: 6, fontSize: 15, fontWeight: 700 }}>{view.by}</div>}
        {view.note && <div data-death-note="" style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: '#D9B98A' }}>{view.note}</div>}
        <div data-death-back="" style={{ marginTop: 9, fontSize: 13, fontWeight: 700, color: '#AFC0BC' }}>{view.back}</div>
      </div>
    </div>
  );
}
