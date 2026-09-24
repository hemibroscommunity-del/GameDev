import React, { useEffect, useState } from 'react';
import { COL, QUALITY_COLOR, QUALITY_LABEL } from './dash/common.js';

/* ═══ v2.3.2820: WHAT CAME OUT OF THE CHEST ═══
 * Owner: "I'd rather have a loot box ... instead of daily coin reward."  A
 * loot box whose prize arrives as a line of text is a receipt, not a box, so
 * the worker's answer (chest_opened, wsClient) is shown as one card in the
 * middle of the screen: what you got, in the colour of its quality when it
 * has one.  It never blocks play -- tap anywhere on it (or wait 5s) and it
 * goes -- and it shows one prize at a time, the newest.
 *
 * The bus is module-scope so wsClient (outside React) can hand it the prize,
 * the same shape as storeToastBus. */
const listeners = new Set();
let current = null;
export const chestRevealBus = {
  get() { return current; },
  show(prize) {
    current = prize ? { prize, at: Date.now() } : null;
    try { if (typeof window !== 'undefined') window.__btChestReveal = current; } catch (e) { /* probe only */ }
    for (const fn of listeners) { try { fn(current); } catch (e) { /* a dead listener must not eat the prize */ } }
  },
  clear() { this.show(null); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

const REVEAL_MS = 5000;

/* The one line that says what it is. */
export function prizeText(p) {
  if (!p) return '';
  if (p.kind === 'coins') return '+' + (p.coins || 0) + ' coins';
  if (p.kind === 'fish') return (p.count || 10) + ' Cooked Fish';
  if (p.kind === 'gem') return 'A Rare Gem';
  if (p.kind === 'armor' && p.piece) {
    const q = p.piece.quality && p.piece.quality !== 'normal' ? (QUALITY_LABEL[p.piece.quality] || p.piece.quality) + ' ' : '';
    return q + (p.piece.name || 'Armour');
  }
  return 'A prize';
}

export const ChestReveal = () => {
  const [cur, setCur] = useState(chestRevealBus.get());
  useEffect(() => chestRevealBus.subscribe(setCur), []);
  useEffect(() => {
    if (!cur) return undefined;
    const t = setTimeout(() => chestRevealBus.clear(), Math.max(0, cur.at + REVEAL_MS - Date.now()));
    return () => clearTimeout(t);
  }, [cur]);
  if (!cur) return null;
  const p = cur.prize;
  const q = p.kind === 'armor' && p.piece ? p.piece.quality : null;
  const tone = (q && QUALITY_COLOR[q]) || COL.accent;
  const glyph = p.kind === 'coins' ? '🪙' : p.kind === 'fish' ? '🐟'
    : p.kind === 'gem' ? '💎' : p.kind === 'armor' ? '🛡' : '🎁';
  return (
    <div data-chest-reveal={p.kind} onPointerUp={() => chestRevealBus.clear()} style={{
      position: 'fixed', left: '50%', top: '34%', transform: 'translate(-50%, -50%)',
      zIndex: 60, minWidth: 220, maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box',
      padding: '14px 18px', borderRadius: 12, textAlign: 'center',
      background: COL.bg, border: `2px solid ${tone}`,
      boxShadow: `0 0 0 1px rgba(0,0,0,.4), 0 8px 28px rgba(0,0,0,.55), 0 0 24px ${tone}55`,
      fontFamily: 'Source Sans 3, sans-serif', cursor: 'pointer', touchAction: 'manipulation',
      animation: 'btChestPop .28s ease-out',
    }}>
      <style>{'@keyframes btChestPop{0%{transform:translate(-50%,-50%) scale(.6);opacity:0}70%{transform:translate(-50%,-50%) scale(1.06);opacity:1}100%{transform:translate(-50%,-50%) scale(1)}}'}</style>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.text2 }}>
        Daily chest
      </div>
      <div style={{ fontSize: 34, lineHeight: 1.1, margin: '6px 0 2px' }}>{glyph}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: tone }}>{prizeText(p)}</div>
      <div style={{ fontSize: 11, color: COL.muted, marginTop: 6 }}>Tap to close</div>
    </div>
  );
};
