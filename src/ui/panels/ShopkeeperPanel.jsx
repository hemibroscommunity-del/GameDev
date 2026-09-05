import React, { useEffect, useRef, useState } from 'react';
import { shopBus } from '../mobile/shopBus.js';
import { useModalGuard } from '../mobile/modalGuardBus.js'; /* v2.3.2276 */
import { thumbFor, iconFor, ITEM_NAMES } from '../mobile/dash/InventoryPanel.jsx';

/* ═══ v2.3.2059: THE MERCHANT DRAWER ═══
 *
 * Owner, replacing the v2.3.2057 popup: "Your existing bag should become one
 * half of the shop interface. Don't open another inventory or cover it. ... a
 * merchant drawer attach[es] directly to the top edge of your existing bag
 * panel ... The important part is that your bag does not change position at
 * all. The shop simply grows upward from it. ... I wouldn't make it a floating
 * rounded popup like your current version."
 *
 * ── WHAT THAT MEANS STRUCTURALLY ──
 * This component is HALF a window. The other half is the band that is already
 * on screen -- its gold row, its filter chips, its inventory grid, its weapon
 * panel -- and none of that moves, is covered, or is redrawn here. The bag's
 * own tiles gain a per-slot quote and become the sell control (see ItemTile in
 * dash/InventoryPanel.jsx). What is left for this file is the three things the
 * band does not already show: who you are trading with, what he has, and the
 * one deal you are currently looking at.
 *
 * ── WHY IT IS ANCHORED, NOT CENTRED ──
 * bottom: var(--dash-h) is the whole trick. --dash-h is the band's height and
 * the one number every bottom-anchored element in the game reads (zLayers.js
 * rule 2), so the drawer's bottom edge IS the band's top edge at every
 * viewport, with no gap to fall out of sync. The bottom corners are square and
 * there is no shadow under them: it has to look joined to the band, not
 * floating over it. Left and right sit at the columns row's own frame padding,
 * so the drawer's edges line up with the bag panel's left edge and the combat
 * panel's right edge -- "it looks like your bag just gained a merchant
 * extension".
 *
 * ── NO BUY/SELL TOGGLE ──
 * Owner: "Tap my inventory -> sell it. Tap his inventory -> buy it." The side
 * you tapped from IS the verb, so there is one action button and it is never
 * ambiguous. The selection lives in shopBus because the two grids live in two
 * different components (his shelf here, your bag in the band).
 *
 * ── THE TOTAL COMES FROM HIM, NOT FROM MULTIPLICATION ──
 * A stack is NOT unit price times N: his offer decays as his pile grows. The
 * client holds no price table on purpose, so every total on screen is a
 * `shop_quote` answer. Multiplying locally would put a number on the button
 * that settlement then disagrees with, which is the one thing a shop must
 * never do. The quote is debounced so holding "+" does not send a message per
 * frame.
 */

/* Owner: "~220-280 px tall". Fixed rather than content-sized so the world
   above it does not jump as his shelf fills up, and so the shelf has a known
   height to scroll inside. */
const DRAWER_H = 226;
/* Owner: "If he has more than five things, horizontally swipe his shelf." So
   FIVE is the width unit, not a cap: the slot is a fifth of the shelf and a
   sixth item simply scrolls into view. Sized as a percentage rather than a px
   number so it stays five-across on every phone width -- and because a
   percentage basis inside an overflow-x row resolves against the row, the
   sixth slot keeps that same size instead of squeezing the other five. */
const SHELF_MIN = 5;
const SLOT_W = `calc((100% - ${(SHELF_MIN - 1) * 6}px) / ${SHELF_MIN})`;

function prettyKey(k) {
  if (ITEM_NAMES[k]) return ITEM_NAMES[k];
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

/* One shelf slot. Deliberately the same recipe as the bag tile it sits above
   -- square, dark well, hairline, count badge bottom-right -- because the
   owner's rule is that his stock reads in "the same exact slot language as
   your existing inventory". The price sits UNDER the slot rather than inside
   it: on his side it is what you pay, which is a commitment, not a hint. */
function ShelfSlot({ itemKey, count, price, selected, onTap, size }) {
  if (!itemKey) {
    return (
      <div aria-hidden="true" style={{ width: size, flex: 'none' }}>
        <div style={{
          width: '100%', aspectRatio: '1 / 1', borderRadius: 6,
          background: 'rgba(17,30,35,.45)',
          border: '1px dashed rgba(229,237,233,.10)',
        }} />
        <div style={{ height: 15 }} />
      </div>
    );
  }
  const thumb = thumbFor(itemKey);
  return (
    <div style={{ width: size, flex: 'none' }}>
      <button
        type="button" onClick={onTap} data-shop-bro={itemKey}
        title={prettyKey(itemKey)}
        style={{
          position: 'relative', width: '100%', aspectRatio: '1 / 1', padding: 0,
          background: selected ? 'rgba(234,198,117,.16)' : '#111E23',
          border: selected ? '1px solid #EAC675' : '1px solid rgba(229,237,233,.14)',
          borderRadius: 6, cursor: 'pointer', touchAction: 'manipulation',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: 'var(--ui-text, #F4F0E7)',
        }}
      >
        {thumb
          ? <img src={thumb} alt="" draggable={false}
              style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
          : <span>{iconFor(itemKey)}</span>}
        {count > 1 ? <span className="bt-item-qty">{count}</span> : null}
      </button>
      <div style={{
        height: 15, textAlign: 'center', fontSize: 10.5, fontWeight: 700,
        lineHeight: '15px', color: '#EAC675', fontVariantNumeric: 'tabular-nums',
      }}>{price > 0 ? price + 'g' : ''}</div>
    </div>
  );
}

export function ShopkeeperPanel() {
  /* v2.3.2276: Diego's drawer was in NEITHER guard -- not modalGuardBus and
     not _anyPanelOpen's uiBusyBus -- so the chat composer's dismiss layer sat
     live over the shop window exactly as it once did over the trade one.
     Gated on shopBus.open, NOT on mount: this component is mounted for the
     whole session (GameApp renders it unconditionally and it returns null at
     the bottom while the shop is shut), so a bare push pins the guard forever
     and the chat box can never open again.  That is not hypothetical -- it is
     what the first cut of this did, and mp-chatlayer caught it. */
  useModalGuard(React, shopBus.open);
  const [, force] = useState(0);
  const [qty, setQty] = useState(1);
  const [quote, setQuote] = useState(null);    /* { key, qty, mode, total } */
  const quoteTimer = useRef(null);

  useEffect(() => shopBus.subscribe(() => {
    force((n) => n + 1);
    if (shopBus.quote) setQuote(shopBus.quote);
    else setQuote(null);
  }), []);

  /* After a settled trade the bag has changed, so the per-slot quotes have to
     be asked for again -- you may now be carrying a key you were not before,
     or have emptied one out. Keyed on the RESULT, not on shop_state: a
     shop_list answer arrives AS a shop_state, so re-asking on that would
     answer itself forever. shop_result is sent once, to the one player who
     acted. */
  const settleCount = shopBus.settled;
  useEffect(() => {
    if (!shopBus.open || !settleCount) return;
    /* Clearing the signature rather than sending directly: a sale can change
       a COUNT without changing the set of keys, which the poll above would
       correctly skip, so this is the one case that has to force the ask. */
    askedRef.current = null;
  }, [settleCount]);

  const sel = shopBus.sel;
  const selKey = sel && sel.key;
  const selSide = sel && sel.side;
  /* Re-selecting the SAME item is still a selection, and it has to re-ask for
     the price -- see shopBus.selSeq. */
  const selSeq = shopBus.selSeq;

  /* ═══ ASK WHENEVER THE BAG'S SHAPE CHANGES, NOT JUST ON OPEN ═══
   * The list has to name every key you are carrying, because that is what
   * makes the band's own slots show his price. Asking once at open was wrong
   * twice over:
   *   - the drawer OPENS BY ITSELF when you walk up to him (BroTown.jsx), so
   *     "open" can happen before an item is in your bag at all -- which is
   *     how this arrived: a mail grant landing a moment after the drawer
   *     opened left every slot permanently unpriced, and only on the runs
   *     where the player spawned near him. mp-shopkeeper caught it as a
   *     flake, which is exactly what a position-dependent race looks like.
   *   - picking anything up mid-shop had the same hole.
   * Polled rather than event-driven because inventory has no change event the
   * UI can subscribe to; the signature check means the message only goes when
   * the set of keys really moved, so a player standing still sends nothing. */
  /* null means NEVER ASKED, and the distinction is load-bearing. This started
     as '' -- which is also the signature of an empty bag, so a player carrying
     nothing matched the "already asked" guard on the very first pass and never
     sent shop_list at all: Bro's shelf was permanently bare for them, and the
     staples he can never run out of were invisible. Caught by mp-potions,
     because its player starts empty; mp-shopkeeper grants items first and so
     never saw it. */
  const askedRef = useRef(null);
  useEffect(() => {
    if (!shopBus.open) { setQty(1); setQuote(null); askedRef.current = null; return undefined; }
    const ask = () => {
      let keys = [];
      try {
        const S0 = window._gameState && window._gameState.current;
        const inv = (S0 && S0.rpg && S0.rpg.inventory) || {};
        keys = Object.keys(inv).filter((k) => (inv[k] || 0) > 0).sort();
      } catch (e) { keys = []; }
      const sig = keys.join('|');
      if (askedRef.current !== null && sig === askedRef.current) return;
      askedRef.current = sig;
      send('shop_list', { keys });
    };
    ask();
    const id = setInterval(ask, 700);
    return () => clearInterval(id);
  }, [shopBus.open]);

  /* A new selection always starts at one. */
  useEffect(() => { setQty(1); }, [selSeq]);

  /* Debounced: holding '+' must not send a message per frame. */
  useEffect(() => {
    if (!selKey) return undefined;
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(() => {
      send('shop_quote', { key: selKey, qty, mode: selSide === 'bro' ? 'buy' : 'sell' });
    }, 140);
    return () => { if (quoteTimer.current) clearTimeout(quoteTimer.current); };
  }, [selKey, selSide, selSeq, qty]);

  if (!shopBus.open) return null;

  const S = (typeof window !== 'undefined' && window._gameState && window._gameState.current) || null;
  const inv = (S && S.rpg && S.rpg.inventory) || {};
  const coins = (S && S.rpg && S.rpg.coins) || 0;

  /* v2.3.2063: staples have no count (qty null) and must NOT be filtered out
     by `qty > 0` -- they are the things he always has. The pile keeps its
     filter: an item he holds none of is not on the shelf. */
  const shelf = shopBus.stock.filter((i) => i.staple || i.qty > 0);
  const broHas = (k) => (shopBus.quoteFor(k) || {}).qty || 0;
  const youHave = (k) => Math.floor(inv[k] || 0);

  const selEntry = selKey ? shopBus.quoteFor(selKey) : null;
  const selStaple = !!(selEntry && selEntry.staple && selSide === 'bro');
  /* A staple is always exactly one: what you buy is an effect, and only one
     effect runs at a time. */
  const selMax = selKey
    ? (selSide === 'bro' ? (selStaple ? 1 : broHas(selKey)) : youHave(selKey))
    : 0;
  const clamped = Math.max(1, Math.min(qty, Math.max(1, selMax)));
  const liveQuote = (quote && selKey && quote.key === selKey && quote.qty === clamped
    && quote.mode === (selSide === 'bro' ? 'buy' : 'sell')) ? quote : null;
  const tooPoor = selSide === 'bro' && liveQuote && coins < liveQuote.total;
  const canAct = !!liveQuote && selMax >= 1 && !tooPoor && !shopBus.busy;

  const act = () => {
    if (!canAct) return;
    shopBus.setBusy(true);
    send(selSide === 'bro' ? 'shop_buy' : 'shop_sell', { key: selKey, qty: clamped });
    setQty(1);
  };

  const stepBtn = {
    width: 34, height: 34, borderRadius: 8, padding: 0, flex: 'none',
    background: '#293B41', border: '1px solid rgba(229,237,233,.20)',
    color: 'var(--ui-text, #F4F0E7)', fontSize: 18, cursor: 'pointer',
    touchAction: 'manipulation', fontFamily: 'inherit',
  };
  const rule = '1px solid rgba(229,237,233,.11)';

  const cells = shelf.slice();
  while (cells.length < SHELF_MIN) cells.push(null);

  return (
    <div
      data-shop-panel=""
      onPointerDown={(e) => e.stopPropagation()}
      className="bt-chat-noselect"
      style={{
        position: 'fixed',
        /* The band's own frame padding, so the drawer's edges line up with
           the bag panel's left edge and the combat panel's right edge. */
        left: 6, right: 6,
        bottom: 'var(--dash-h, 243px)',
        height: DRAWER_H,
        display: 'flex', flexDirection: 'column',
        background: 'var(--ui-sheet, #1E2E34)',
        border: rule,
        /* Square at the bottom: it is JOINED to the band, not floating over
           it. A radius here would draw the seam the whole layout is avoiding. */
        borderRadius: '10px 10px 0 0',
        borderBottom: 'none',
        color: 'var(--ui-text, #F4F0E7)', fontFamily: 'Source Sans 3, sans-serif',
        zIndex: 40, overflow: 'hidden',
      }}
    >
      {/* ── WHO ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 8px', flex: 'none', borderBottom: rule,
        background: '#27393F',
      }}>
        <img src="/sprites/npc/shopkeeper-bro-head.webp" alt="" draggable={false}
          style={{ width: 26, height: 26, objectFit: 'contain', flex: 'none' }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.15 }}>Diego</div>
          <div style={{
            fontSize: 10, color: 'var(--ui-text-muted, #8FA3A0)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>“The more I have, the less I pay.”</div>
        </div>
        {/* v2.3.2060 (owner: "show gold coin symbol next to his gold count").
            The game's own coin, the same file the band's gold row and the
            vendor's price buttons use, with the 🪙 glyph as the fallback for
            anywhere the image cannot resolve -- the established pattern in
            VendorPanel.jsx. The trailing 'g' goes with it: the coin already
            says what the number is, and keeping both reads as "172g" beside a
            picture of a coin. */}
        <div data-shop-coins={coins} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 13, fontWeight: 700, color: '#EAC675',
          fontVariantNumeric: 'tabular-nums', flex: 'none',
        }}>
          <img src="/icons/popups/gold.webp" alt="" draggable={false}
            style={{ width: 15, height: 15, objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🪙')); }} />
          {coins}
        </div>
        <button type="button" onClick={() => shopBus.setOpen(false)} aria-label="Close"
          data-shop-close=""
          style={{
            width: 30, height: 30, borderRadius: 8, padding: 0, flex: 'none',
            background: '#293B41', border: '1px solid rgba(229,237,233,.20)',
            color: 'var(--ui-text, #F4F0E7)', fontSize: 14, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>✕</button>
      </div>

      {/* ── HIS SHELF ── one row, swiped sideways when he has more than five */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        /* centred, so the row sits in the middle of whatever height is left
           rather than clinging to the label with a pool of dead panel under
           it -- the drawer is a fixed height and his shelf is one row. */
        justifyContent: 'center', padding: '6px 8px 4px',
      }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em',
          textTransform: 'uppercase', color: 'var(--ui-text-muted, #8FA3A0)',
          marginBottom: 4, flex: 'none',
        }}>His shelf</div>
        {shelf.length === 0 ? (
          <div data-shop-empty="" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: 'var(--ui-text-secondary, #B6C1BE)', textAlign: 'center',
          }}>His shelf is bare. Sell him something.</div>
        ) : (
          <div data-shop-shelf="" style={{
            display: 'flex', gap: 6, overflowX: 'auto', overflowY: 'hidden',
            touchAction: 'pan-x', WebkitOverflowScrolling: 'touch',
            flex: 'none', paddingBottom: 2,
          }}>
            {cells.map((e, i) => (
              <ShelfSlot key={e ? e.key : 'e' + i} size={SLOT_W}
                itemKey={e && e.key} count={e && e.qty} price={e && e.sell}
                selected={!!e && selSide === 'bro' && e.key === selKey}
                onTap={() => e && shopBus.setSel(e.key, 'bro')} />
            ))}
          </div>
        )}
        {shopBus.note ? (
          <div data-shop-note="" style={{
            marginTop: 4, padding: '3px 7px', borderRadius: 6, fontSize: 11,
            flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            background: shopBus.noteOk ? 'rgba(85,185,138,.14)' : 'rgba(224,106,94,.16)',
            color: shopBus.noteOk ? '#7FD3AC' : '#E9A79E',
          }}>{shopBus.note}</div>
        ) : null}
      </div>

      {/* ── THE DEAL ── the only transaction UI, and it sits precisely between
             his shelf and your existing bag, which is the row directly below
             this drawer's bottom edge. */}
      <div data-shop-deal={selKey || ''} style={{
        flex: 'none', borderTop: rule, background: '#111E23',
        padding: '6px 8px',
        display: 'flex', alignItems: 'center', gap: 8, minHeight: 58,
      }}>
        {!selKey ? (
          <div style={{
            flex: 1, textAlign: 'center', fontSize: 12,
            color: 'var(--ui-text-secondary, #B6C1BE)',
          }}>Tap his shelf to buy · tap your bag below to sell</div>
        ) : (
          <>
            {thumbFor(selKey)
              ? <img src={thumbFor(selKey)} alt="" draggable={false}
                  style={{ width: 30, height: 30, objectFit: 'contain', flex: 'none' }} />
              : <span style={{ fontSize: 20, flex: 'none' }}>{iconFor(selKey)}</span>}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 700, lineHeight: 1.15,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{prettyKey(selKey)}</div>
              {/* His count first: it is what sets the price. */}
              <div style={{
                fontSize: 10, color: 'var(--ui-text-muted, #8FA3A0)',
                fontVariantNumeric: 'tabular-nums',
                /* One line. It wrapped to two at 390 with a long item name,
                   which pushed the row taller than the strip it lives in. */
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {/* v2.3.2063: "Bro has 0" is not a fact about a staple -- he
                    cannot run out of them. What matters instead is that
                    drinking it replaces whatever you are running. */}
                {selStaple
                  ? <span data-shop-staple="">Always in stock · replaces any effect</span>
                  : <>
                      <span data-shop-brohas={broHas(selKey)}>Bro has {broHas(selKey)}</span>
                      {' · '}
                      <span data-shop-youhave={youHave(selKey)}>you have {youHave(selKey)}</span>
                    </>}
              </div>
            </div>

            {/* v2.3.2063: no stepper on a staple. A quantity there could only
                mean "charge me five times and give me one effect", since
                effects do not stack -- so the control is removed rather than
                disabled, and the row gets its width back for the name. */}
            {selStaple ? null : (
              <>
                <button type="button" style={stepBtn} aria-label="One fewer"
                  data-shop-minus="" onClick={() => setQty((n) => Math.max(1, n - 1))}>−</button>
                <div data-shop-qty={clamped} style={{
                  minWidth: 20, textAlign: 'center', fontSize: 15, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums', flex: 'none',
                }}>{clamped}</div>
                <button type="button" style={stepBtn} aria-label="One more"
                  data-shop-plus=""
                  onClick={() => setQty((n) => Math.min(Math.max(1, selMax), n + 1))}>+</button>
              </>
            )}

            <button
              type="button" data-shop-act={selSide}
              data-shop-total={liveQuote ? liveQuote.total : ''}
              disabled={!canAct} onClick={act}
              style={{
                flex: 'none', minWidth: 96, minHeight: 40, borderRadius: 9,
                padding: '0 10px', fontSize: 12.5, fontWeight: 800,
                fontFamily: 'inherit', cursor: canAct ? 'pointer' : 'default',
                fontVariantNumeric: 'tabular-nums',
                background: 'linear-gradient(180deg,#E2B765,#D2A14D)',
                border: '1px solid #EAC675', color: '#172126',
                opacity: canAct ? 1 : 0.45,
              }}
            >
              {/* The total is his answer for THIS stack, so it already accounts
                  for the decay across the units -- it is not qty x unit. */}
              {tooPoor ? 'Not enough gold'
                : (selSide === 'bro' ? 'BUY ' : 'SELL ')
                  + (liveQuote ? liveQuote.total + 'g' : '…')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
