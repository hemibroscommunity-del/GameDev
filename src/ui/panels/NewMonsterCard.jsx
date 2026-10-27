import React from 'react';
import { createPortal } from 'react-dom';
import { codexEntry } from '@/data/monsterCodex.js';
import { codexAnnouncement, codexAnnounceDone, codexOpenPage, ANNOUNCE_MS } from '@/game/monsterCodex.js';
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';
import { PetPortrait } from '@/ui/petPortrait.jsx';
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3612: "tap" reads "click" on a computer */

/* ═══ v2.3.3336: NEW MONSTER -- AN ANNOUNCEMENT YOU CAN TAP ═══
 * Owner, playtesting: "Make the new codex entry for monsters as a 'new
 * monster' announcement instead of a new codex entry and have it jump to the
 * codex area."
 *
 * The kill that opens a monster's codex page (game/monsterCodex.js
 * onCodexKill: the first of its kind the worker counted) used to float "New
 * in the Codex: <name>" over your head -- words in the world, nothing to tap.
 * Now this card: NEW MONSTER, its picture and name, and "Tap to see it in the
 * Codex".  A tap opens the dashboard's Codex on THAT monster's page
 * (codexOpenPage, taken by EncyclopediaPanel); left alone it goes after
 * ANNOUNCE_MS.  It never stops a fight: no scrim, only the card takes taps.
 *
 * WHERE: centred just under the minimap's box upright (top max(22%, 192px):
 * the box and its name plate end ~180px down on a phone), near the top on a
 * sideways phone, where the box is far to the right.  A body portal at z 59,
 * as a portal is the only way above the minimap's own open button (z 45,
 * WorldMapOverlay.jsx -- the update card's lesson, v2.3.3336) and just under
 * a new pet's card (z 60), which wants its Done tapped.
 * Its own clock, like the trap card.  Keyed by the announcement's time, so a
 * second new monster within the six seconds is a new card, its fade-in and
 * fade-out its own. */
const POLL_MS = 200;

export function NewMonsterCard({ stateRef }) {
  const [, setTick] = React.useState(0);
  const seenRef = React.useRef(null);
  /* v2.3.3565: the bottom of the dungeon's clear card while it is up (0 when
     it is not).  That card grew a row for the boss's chest, and this card,
     placed just under the minimap, sat over it; it steps down under it */
  const clearRef = React.useRef(0);
  React.useEffect(() => {
    const id = setInterval(() => {
      const S = stateRef && stateRef.current;
      const a = S ? codexAnnouncement(S) : null;
      const k = a ? a.at : null;
      if (k !== seenRef.current) { seenRef.current = k; setTick((x) => (x + 1) % 1000000); }
      let below = 0;
      if (a) {
        try {
          const c = document.querySelector('[data-dungeon-clear]');
          const q = c && c.getBoundingClientRect();
          if (q && q.height > 0) below = Math.round(q.bottom + 8);
        } catch (err) { below = 0; }
      }
      if (below !== clearRef.current) { clearRef.current = below; setTick((x) => (x + 1) % 1000000); }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [stateRef]);

  const S = stateRef && stateRef.current;
  const a = S ? codexAnnouncement(S) : null;
  if (!a || typeof document === 'undefined') return null;
  const e = codexEntry(a.kind);
  const name = e ? e.name : 'A new monster';
  const sideways = typeof window !== 'undefined' && window.innerHeight < 460;
  const open = () => {
    codexOpenPage(S, a.kind);
    codexAnnounceDone(S, a.at);
    seenRef.current = null;
    setTick((x) => (x + 1) % 1000000);
    dashboardPanelBus.open('encyclopedia');
  };
  const stop = (ev) => ev.stopPropagation();
  return createPortal(
    <div key={a.at} role="button" tabIndex={0} aria-label={'New monster: ' + name + '. Open it in the Codex'}
      data-new-monster={a.kind}
      onPointerDown={stop} onTouchStart={stop} onClick={(ev) => { ev.stopPropagation(); open(); }}
      onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } }}
      style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: 59,
        top: (() => {
          const base = sideways ? 'calc(env(safe-area-inset-top, 0px) + 52px)' : 'max(22%, calc(env(safe-area-inset-top, 0px) + 192px))';
          return clearRef.current ? 'max(' + base + ', ' + clearRef.current + 'px)' : base;
        })(),
        width: 'min(300px, calc(100vw - 32px))', boxSizing: 'border-box', minHeight: 64,
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 8px 8px', borderRadius: 14,
        background: '#1E2E34', border: '1px solid #EAC675', boxShadow: '0 10px 28px rgba(0,0,0,.5)',
        color: '#F4F0E7', fontFamily: "'Source Sans 3',sans-serif", cursor: 'pointer', touchAction: 'manipulation',
        animation: 'bt-new-monster ' + ANNOUNCE_MS + 'ms linear both' }}>
      <div style={{ flex: '0 0 auto', width: 48, height: 48, borderRadius: 10, background: '#111E23',
        display: 'grid', placeItems: 'center', border: '1px solid rgba(234,198,117,.45)' }}>
        <PetPortrait pet={{ kind: a.kind, stage: 1 }} size={44} />
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#EAC675' }}>New monster</div>
        <div data-new-monster-name="1" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.15 }}>{name}</div>
        <div style={{ fontSize: 12, color: '#B8C4C0', lineHeight: 1.25, marginTop: 1 }}>{deskWords('Tap to see it in the Codex ›')}</div>
      </div>
    </div>,
    document.body,
  );
}

export default NewMonsterCard;
