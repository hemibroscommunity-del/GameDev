import React, { useEffect, useState } from 'react';
import { shopBus } from '../mobile/shopBus.js';
/* v2.3.2052 (owner: "show his inventory similar to how my inventory is shown
   with the actual item thumbnail"). The SAME resolver the bag uses, so a slime
   in his pile is the picture you already know from your own bag -- and so a
   thumbnail added for a new material appears in both places at once instead of
   only in the one somebody remembered to update. */
import { thumbFor, iconFor } from '../mobile/dash/InventoryPanel.jsx';

/* ═══ v2.3.2050: TRADING WITH SHOPKEEPER BRO ═══
 *
 * Owner: "Make it so you can buy and sell things from him. His inventory is
 * public so other players who sell monster remains (etc) can see it and buy
 * from him. The more quantity he has of a thing the cheaper he's willing to
 * buy from you."
 *
 * ── ONE LIST, NOT TWO TABS ──
 * A buy tab and a sell tab would be the obvious shape and it hides the thing
 * that makes this shop interesting: his stock IS the price. Seeing "42 held,
 * he pays 4" on the same row as "he charges 18" is what explains why your
 * slimes are suddenly worth less than they were yesterday. Split across two
 * screens, that connection is invisible and the rule looks like a bug.
 *
 * So: one row per item, both prices on it, and your own count beside his --
 * the row is the whole decision.
 *
 * ── THE CLIENT NEVER DOES ARITHMETIC ──
 * Every number here arrives in a shop_state event. Nothing is computed
 * locally and nothing updates optimistically after a tap: the panel asks, and
 * redraws when the server says what happened. That is deliberate rather than
 * lazy -- an optimistic update that disagrees with settlement is how a player
 * ends up believing they were paid something they were not.
 *
 * ── ITEMS HE HAS NONE OF ──
 * A pile that is empty of a thing has no row, so the panel also lists what YOU
 * are carrying that he would take. Without it, the first person to find a new
 * material could never sell it: there would be nothing on screen to tap.
 */

/* Turn an inventory key into something a person would say. The keys are
   machine-shaped ('slime-remnants', 'wood_pine_log', 'shard_ember') and
   showing them raw makes a shop look like a database. */
function prettyKey(k) {
  return String(k || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\bremnants\b/i, 'remains')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const send = (type, payload) => {
  try {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type, payload });
  } catch (e) { /* offline: the panel simply will not update */ }
};

export function ShopkeeperPanel() {
  const [, force] = useState(0);
  useEffect(() => shopBus.subscribe(() => force((n) => n + 1)), []);
  /* Ask once on open. The server broadcasts every later change, so there is
     no polling here -- a shop window that re-asked on a timer would be a
     message per second per player for a list that rarely moves. */
  useEffect(() => { if (shopBus.open) send('shop_list', {}); }, [shopBus.open]);

  if (!shopBus.open) return null;

  const S = (typeof window !== 'undefined' && window._gameState && window._gameState.current) || null;
  const inv = (S && S.rpg && S.rpg.inventory) || {};
  const coins = (S && S.rpg && S.rpg.coins) || 0;

  /* His pile, plus anything in your bag he does not yet hold -- see the note
     above on why the second half matters. */
  const rows = shopBus.stock.slice();
  const held = new Set(rows.map((r) => r.key));
  for (const k in inv) {
    if ((inv[k] || 0) > 0 && !held.has(k)) rows.push({ key: k, qty: 0, buy: null, sell: null, mine: true });
  }

  const close = () => shopBus.setOpen(false);
  const act = (type, key) => {
    if (shopBus.busy) return;
    shopBus.setBusy(true);
    send(type, { key, qty: 1 });
  };

  return (
    <div
      data-shop-panel=""
      onPointerDown={(e) => e.stopPropagation()}
      className="bt-chat-noselect"
      style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        bottom: 'calc(var(--dash-h, 135px) + 12px)',
        width: 'min(94vw, 460px)', maxHeight: '58vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--ui-sheet, #1E2E34)',
        border: '1px solid var(--ui-line-strong, rgba(229,237,233,.20))',
        borderRadius: 12, boxShadow: '0 14px 30px rgba(4,7,9,.38)',
        color: 'var(--ui-text, #F4F0E7)', fontFamily: 'Source Sans 3, sans-serif',
        zIndex: 40, overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 8px' }}>
        <img src="/sprites/npc/shopkeeper-bro-head.webp" alt="" draggable={false}
          style={{ width: 30, height: 30, objectFit: 'contain', flex: 'none' }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Shopkeeper Bro</div>
          <div style={{ fontSize: 11, color: 'var(--ui-text-muted, #8FA3A0)' }}>
            The more he holds, the less he pays
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#EAC675', fontVariantNumeric: 'tabular-nums' }}>
          {coins}g
        </div>
        <button type="button" onClick={close} aria-label="Close" className="bt-cc-btn"
          style={{ width: 32, height: 32, borderRadius: 8, padding: 0, flex: 'none' }}>✕</button>
      </div>

      {shopBus.note ? (
        <div data-shop-note="" style={{
          margin: '0 12px 8px', padding: '6px 9px', borderRadius: 8, fontSize: 12,
          background: shopBus.noteOk ? 'rgba(85,185,138,.14)' : 'rgba(224,106,94,.16)',
          color: shopBus.noteOk ? '#7FD3AC' : '#E9A79E',
        }}>{shopBus.note}</div>
      ) : null}

      <div data-shop-rows={rows.length} style={{ overflowY: 'auto', padding: '0 12px 12px' }}>
        {rows.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ui-text-secondary, #B6C1BE)', padding: '10px 2px' }}>
            His bag is empty and so is yours. Bring him something.
          </div>
        ) : rows.map((r) => {
          const mine = Math.floor(inv[r.key] || 0);
          return (
            <div key={r.key} data-shop-row={r.key} style={{
              display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
              padding: '6px 0', borderTop: '1px solid var(--ui-line, rgba(229,237,233,.10))',
            }}>
              {/* The item, as an object you recognise, not a word. Same tile
                  recipe as the bag: square, dark, hairline, count badge at the
                  bottom right -- his stock reads like an inventory because it
                  IS one. */}
              <div style={{
                position: 'relative', width: 38, height: 38, flex: 'none',
                background: '#111E23',
                border: '1px solid rgba(229,237,233,.14)',
                borderRadius: 6, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>
                {thumbFor(r.key)
                  ? <img src={thumbFor(r.key)} alt="" draggable={false}
                      style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                  : <span>{iconFor(r.key)}</span>}
                {/* HIS count on the tile, where your bag puts yours -- it is
                    his inventory being shown, and it is also the number that
                    sets the price. A staple has none: he makes those. */}
                {!r.staple && r.qty > 1 ? <span className="bt-item-qty">{r.qty}</span> : null}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis' }}>{prettyKey(r.key)}</div>
                <div style={{ fontSize: 11, color: 'var(--ui-text-muted, #8FA3A0)',
                  fontVariantNumeric: 'tabular-nums' }}>
                  {/* His count first: it is the number that sets the price.
                      A STAPLE has no count -- he makes those, so there is no
                      pile for the decay to read and a number would be a lie
                      that never changes. */}
                  {r.staple ? 'always in stock' : `he holds ${r.qty}`}
                  {mine ? ` · you have ${mine}` : ''}
                </div>
              </div>
              <button
                type="button" data-shop-sell={r.key}
                disabled={!mine || shopBus.busy}
                onClick={() => act('shop_sell', r.key)}
                className="button-secondary"
                style={{ minHeight: 40, minWidth: 78, padding: '0 8px', fontSize: 12,
                  opacity: (!mine || shopBus.busy) ? 0.45 : 1 }}
              >
                {/* What he PAYS, on the button that takes his money. */}
                Sell {r.buy != null ? `${r.buy}g` : ''}
              </button>
              <button
                type="button" data-shop-buy={r.key}
                disabled={(!r.staple && !r.qty) || shopBus.busy || (r.sell != null && coins < r.sell)}
                onClick={() => act('shop_buy', r.key)}
                className="button-secondary"
                style={{ minHeight: 40, minWidth: 78, padding: '0 8px', fontSize: 12,
                  opacity: ((!r.staple && !r.qty) || shopBus.busy || (r.sell != null && coins < r.sell)) ? 0.45 : 1 }}
              >
                Buy {r.sell != null ? `${r.sell}g` : ''}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
