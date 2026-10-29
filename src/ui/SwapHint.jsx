import React from 'react';
import { createPortal } from 'react-dom';
import { ownedWeaponSlots } from '@/game/weaponSlots.js';
import { deskWords } from '@/game/deskWords.js';
import { deskWideActive } from './deskWide.js';

/* ═══ v2.3.3877: "SWAP WEAPONS", SAID ONCE ═══
 *
 * The owner, playtesting: "it might be good somehow to bring more attention to
 * how to swap weapons because I completely forgot about it and nothing said
 * anything to me about swapping weapons".
 *
 * The first time a character holds more than one weapon (Mayor Bro's first
 * hand-in gives the bow and the staff), a short gold callout, in the minimap
 * star cue's family (ui/starCue.js), pulses over the weapon buttons: on a
 * computer "Swap weapons: 1 Melee, 2 Bow, 3 Staff" over the three weapons at
 * the dashboard's foot (the keys deskKeyList.js lists), on a phone "Tap a
 * weapon to swap" over the weapon chip (WeaponSwapButton.jsx).  It waits while
 * a dialogue or a building's window is up; it goes on the first swap or after
 * SHOW_MS, and never comes again for that character (the browser's store, by
 * its id).  Off for one tab: `?swaphint=0`.  It takes no taps.
 * QA: window.__btSwapHint. */
const SHOW_MS = 8000;
const POLL_MS = 250;
const KEY = 'bt_swaphint_';
const GOLD = '#F5CE3C';
const INK = 'rgba(13,21,26,.94)';

const _told = Object.create(null);   /* the page remembers even with no store */
export function swapHintTold(id) {
  if (!id) return true;
  if (_told[id]) return true;
  try { if (localStorage.getItem(KEY + id) === '1') { _told[id] = true; return true; } } catch (e) { /* no store */ }
  return false;
}
function markTold(id) {
  if (!id) return;
  _told[id] = true;
  try { localStorage.setItem(KEY + id, '1'); } catch (e) { /* no store */ }
}
function offByUrl() {
  try { return new URLSearchParams(window.location.search).get('swaphint') === '0'; } catch (e) { return false; }
}
/* what it points at: the first of these on the screen */
function anchorRect(desk) {
  /* a computer: the weapons at the foot of a page, or the dashboard's own row of them */
  const sels = desk ? ['[data-desk-foot] [data-rail-weapon]', '[data-dash-desk-combat]', '[data-rail-weapon]'] : ['[data-weapon-chip]'];
  for (const sel of sels) {
    const els = [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
    if (els.length) {
      const l = Math.min(...els.map((r) => r.left)), r = Math.max(...els.map((q) => q.right)), t = Math.min(...els.map((q) => q.top));
      return { left: l, right: r, top: t };
    }
  }
  return null;
}

const qa = { shown: 0, gone: null, why: null, text: null };

export default function SwapHint({ stateRef }) {
  const [view, setView] = React.useState(null);   /* { text, x, y } */
  const elRef = React.useRef(null);
  React.useEffect(() => {
    let since = 0, slot = null, id = null;
    try { window.__btSwapHint = qa; } catch (e) { /* no page */ }
    const end = (why) => {
      markTold(id);
      qa.gone = Date.now(); qa.why = why;
      since = 0;
      setView(null);
    };
    const t = setInterval(() => {
      const S = stateRef && stateRef.current;
      const R = S && S.rpg;
      if (!S || !R || !S.myId || S._zoneLoading || S.currentZone !== 'wheel') { if (since) setView(null); return; }
      if (since) {
        if (R.activeSlot !== slot) { end('swap'); return; }
        if (Date.now() - since >= SHOW_MS) { end('time'); return; }
      } else {
        if (swapHintTold(S.myId) || offByUrl()) return;
        if (ownedWeaponSlots(R).length < 2) return;
      }
      /* not over a talk or a building's window: it waits for them */
      let busy = false;
      try { busy = !!document.querySelector('.bt-npcdlg-scrim, .bt-inspect, [data-quest-offer]'); } catch (e) { busy = false; }
      if (busy) { if (since) setView(null); return; }
      const desk = deskWideActive();
      const a = anchorRect(desk);
      if (!a) return;
      if (!since) { since = Date.now(); slot = R.activeSlot; id = S.myId; qa.shown++; }
      const text = desk ? 'Swap weapons: 1 Melee, 2 Bow, 3 Staff' : deskWords('Tap a weapon to swap');
      qa.text = text;
      const x = Math.round((a.left + a.right) / 2), y = Math.round(a.top - 10);
      setView((o) => (o && o.text === text && o.x === x && o.y === y ? o : { text, x, y }));
    }, POLL_MS);
    return () => clearInterval(t);
  }, [stateRef]);
  /* the pulse: the star cue's gold, breathing */
  React.useEffect(() => {
    const el = elRef.current;
    if (!view || !el || !el.animate) return undefined;
    let a = null;
    try {
      a = el.animate([
        { transform: 'translate(-50%, -100%) scale(1)', boxShadow: '0 0 0 rgba(245,206,60,0)' },
        { transform: 'translate(-50%, -100%) scale(1.06)', boxShadow: '0 0 18px rgba(245,206,60,.75)' },
        { transform: 'translate(-50%, -100%) scale(1)', boxShadow: '0 0 0 rgba(245,206,60,0)' },
      ], { duration: 1100, iterations: Infinity, easing: 'ease-in-out' });
    } catch (e) { a = null; }
    return () => { if (a) a.cancel(); };
  }, [view && view.text, !!view]);
  if (!view || typeof document === 'undefined') return null;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const x = Math.max(110, Math.min(vw - 110, view.x));
  return createPortal(
    <div ref={elRef} data-swap-hint="" role="status" style={{
      position: 'fixed', left: x, top: view.y, transform: 'translate(-50%, -100%)', zIndex: 9050, pointerEvents: 'none',
      maxWidth: 340, width: 'max-content', boxSizing: 'border-box', padding: '8px 12px',
      background: INK, border: `2px solid ${GOLD}`, borderRadius: 12, color: '#F7F2E7',
      fontFamily: 'Source Sans 3,sans-serif', fontSize: 14, fontWeight: 800, textAlign: 'center', lineHeight: 1.25,
    }}>
      <span style={{ color: GOLD, marginRight: 6 }}>&#9733;</span>{view.text}
      <span aria-hidden="true" style={{ position: 'absolute', left: Math.round(view.x - x) + 'px', marginLeft: '50%', bottom: -8, transform: 'translateX(-50%)',
        width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: `8px solid ${GOLD}` }} />
    </div>,
    document.body
  );
}
