import React from 'react';
import { subscribeFishWeigh, fishWeighCard, closeFishWeighCard, wantFishBoard } from '@/game/fishWeigh.js';
import { fishKeyInfo, fishKg } from '@/data/fishVariants.js';
import { thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';

/* ═══ v2.3.3987: THE WEIGH-IN CARD ═══
 * The bag's Inspect on a fish (game/fishWeigh.js) asks the worker to weigh
 * one catch (server fishlog.js); this card says the answer: "This Trout
 * weighs 2.4 kg", your best of the kind, a place on its board when it took
 * one, and how many more of that fish you have to weigh -- or "You've
 * weighed all your Trout." for a fish with no catch left (a bought one).
 * "Records" opens More -> Ranks on the Biggest fish tab, on this species.
 *
 * WHERE: the achievement banner's spot (game.css .bt-fish-card: centred on
 * the WORLD's width, under the minimap upright, near the top sideways),
 * drawn outside the world's wrap beside it (BroTown), a `position: fixed;
 * inset: 0` layer that passes every touch but the card's own.  It stays until
 * its ✕ (Esc on a computer: data-esc), Records, or STAY_MS -- a weigh-in is
 * glanced at, never something to dismiss in a fight.  Transform and opacity
 * only, no filter on the card itself (TRAPS §42: it is over the canvas), so
 * the albino's pale wash is NOT drawn here: its name says it.
 * UI-DESIGN-NOTES "Weigh-in card"; states.mjs `fish-weigh`. */
const STAY_MS = 9000;
const SLATE = '#1E2E34';

export function FishWeighCard() {
  const [, setTick] = React.useState(0);
  React.useEffect(() => subscribeFishWeigh(() => setTick((x) => (x + 1) % 1000000)), []);
  const card = fishWeighCard();
  const at = card ? card.at : 0;
  React.useEffect(() => {
    if (!at) return undefined;
    const id = setTimeout(() => { const c = fishWeighCard(); if (c && c.at === at) closeFishWeighCard(); }, STAY_MS);
    return () => clearTimeout(id);
  }, [at]);
  if (!card) return null;
  const info = fishKeyInfo(card.key) || { name: 'Fish', sp: 'minnow' };
  const pic = thumbFor(card.key);
  const weighed = !card.pending && card.g > 0;
  const records = () => {
    wantFishBoard(info.sp);
    closeFishWeighCard();
    try { dashboardPanelBus.open('more'); dashboardPanelBus.push('leaderboard'); } catch (_e) { /* the page is a tap away */ }
  };
  return (
    <div data-fish-weigh-layer="" style={{ position: 'fixed', inset: 0, zIndex: 58, pointerEvents: 'none', overflow: 'hidden' }}>
      <div className="bt-fish-card" data-fish-weigh={card.pending ? 'pending' : (weighed ? 'weighed' : (card.none ? 'none' : 'other'))}
        data-fish-key={card.key} role="status" aria-live="polite" style={{ background: SLATE, border: '1.5px solid #D8AA58' }}>
        <div style={{ flex: '0 0 auto', width: 48, height: 48, borderRadius: 10, background: '#111E23',
          display: 'grid', placeItems: 'center', border: '1px solid rgba(234,198,117,.45)', position: 'relative' }}>
          {pic ? <img src={pic} alt="" draggable={false} width={40} height={40} style={{ width: 40, height: 40, objectFit: 'contain' }} /> : <span aria-hidden="true" style={{ fontSize: 24 }}>🐟</span>}
          {info.v === 'large' && <span className="bt-fish-large">L</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', lineHeight: 1.3, color: '#D8AA58' }}>Weigh-in</div>
          <div data-fish-weigh-words="" style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2, overflowWrap: 'anywhere' }}>
            {card.pending ? 'Weighing your ' + (info.v ? info.v + ' ' : '') + info.name + '…' : card.words}
          </div>
          {weighed && (
            <div data-fish-weigh-best="" style={{ fontSize: 12, fontWeight: 700, color: '#B9C4C0', lineHeight: 1.3, marginTop: 1 }}>
              {card.newBest ? 'Your heaviest ' + info.name + ' yet!' : 'Your best: ' + fishKg(card.best)}
              {card.rank > 0 ? <span data-fish-weigh-rank={card.rank} style={{ color: '#F2C14E' }}>{' · #' + card.rank + ' on the board'}</span> : null}
              {card.left > 0 ? ' · ' + card.left + ' more to weigh' : ''}
            </div>
          )}
        </div>
        {/* 44 px targets (the Lantern Slate floor): the ✕ top-right, Records under it */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: '0 0 auto', margin: '-6px -8px -6px 0' }}>
          <button type="button" aria-label="Close" data-esc="" data-fish-weigh-close="" onClick={closeFishWeighCard}
            style={{ width: 44, height: 40, border: 'none', background: 'transparent', color: '#B9C4C0', fontSize: 18, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation', padding: 0 }}>✕</button>
          {!card.pending && !card.off && (
            <button type="button" data-fish-records="" onClick={records}
              style={{ minHeight: 44, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', touchAction: 'manipulation', display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 10px', borderRadius: 999, border: '1px solid #D8AA58', background: '#3B3427', color: '#F2C14E',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>Records</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FishWeighCard;
