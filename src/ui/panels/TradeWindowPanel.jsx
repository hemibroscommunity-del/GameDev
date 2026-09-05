import React, { useState, useEffect, useRef } from 'react';
import { tradeBagBus } from '../mobile/tradeBagBus.js'; /* v2.3.2149 */
import { guardPush } from '../mobile/modalGuardBus.js'; /* v2.3.2145 */
/* v2.3.1235: batch-4 state-correction — RARITY_TIERS for staged-weapon
   row rarity (existing data; plain inventory items carry no rarity). */
import { RARITY_TIERS } from '@/data/index.js';
/* ═══ v2.3.1755: THE BAG'S OWN THUMBNAILS ═══
   Owner: "I'd also like it if you included the item thumbnails next to the
   quantities and gold icon next to the gold amount for trading."
   Imported from the inventory panel rather than given a second mapping here:
   a private copy is how the same wood log ends up as a log in your bag and a
   crate emoji in the trade window.  thumbFor returns null for a key with no
   art, and every site below falls back to the emoji glyph that was there
   before — so an unmapped item degrades to what it already looked like
   rather than to a broken image. */
import { thumbFor } from '../mobile/dash/InventoryPanel.jsx';

/* === TradeWindowPanel — the two-sided trade window (v2.3.1132) === */
/* Handoff item H: both players stage items + gold, both confirm, the
   SERVER swaps both sides atomically (server/src/trade2.js).  This
   panel is a pure renderer of server truth: the `trade2` prop is the
   last trade2_state snapshot (or the incoming-invite stub), and every
   button just sends a trade2_* command — nothing here mutates
   rpg/coins/inventory locally.  Any offer change resets BOTH confirms
   server-side (anti-switch), so what you confirmed is always what you
   saw.  Gift trades (TradePanel) remain for old workers; BroTown
   renders this window only under caps.trade2. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md §10) —
   world-card surface, recessed offer wells + item tray, brass
   confirm, gold icon amounts, magic-violet weapon lane. Styles +
   static JSX only; every trade2_* send and the staging mirror are
   unchanged. */
/* v2.3.1235: batch-4 rollout — corrected tokens per the Checkpoint-B
   IncomingTradePanel recipe: sheet #1E2E34 card at radius 14 over the
   strong trade-confirm scrim, gold-gradient confirm as the ONE primary,
   #293B41 secondaries, well #111E23 trays, chips at radius 999, ✅
   emoji dropped from lane headers (chrome). Styles + static JSX only;
   every trade2_* send and the staging mirror are byte-identical. */
/* v2.3.1235: batch-4 state-correction — WIRE-STATE MAP (verified against
   server/src/trade2.js + src/networking/gameEvents.js).  This panel may
   only DISPLAY these server-relayed states, never invent transitions:
   - trade2_invite {from, fromName}  → parked as the {invite:true} stub
     (gameEvents.js) → accept/decline card.
   - trade2_state {state:'invited', target}  → "request sent — waiting"
     card (we opened first; the other side hasn't opened back yet).
   - trade2_state {state:'open', id, a, b, aName, bName,
       offers:{pid:{itemKey:qty, _gold:n}}, confirmed:{pid:bool},
       weapons:{pid:[{seq, weapon}]}}  → the live window.  EVERY
     set/stage/unstage/confirm re-echoes this full snapshot to both
     sides — staged offers per side and per-side confirm flags are real
     wire state.
   - Confirm-reset-on-change IS server-driven: _handleTrade2Set,
     _handleTrade2StageWeapon and _handleTrade2UnstageWeapon all force
     confirmed[a]=confirmed[b]=false and re-broadcast.  There is no
     explicit "reset" flag on the wire, so the "Offer changed" notice
     below binds to the SNAPSHOT TRANSITION (a previous server echo of
     this same session had a confirm set; the new echo has both cleared
     while still 'open') — pure display of relayed state, no client
     guess, and it can never appear before the server's echo arrives.
   - Completion: trade2_state {state:'done', settled:true}.
     v2.3.1235: trade-completion receipt — gameEvents.js no longer
     clears the window on the wire 'done'; it captures a receipt from
     that final snapshot and only sets trade2 = {state:'done', receipt}
     AFTER the authoritative player_state echo has been APPLIED (or a
     1500ms fallback for a dropped/no-change echo).  This panel renders
     that receipt in the same modal shell and auto-closes ~2800ms later
     — "Trade complete" can therefore never show a pre-echo balance.
   - Cancels: trade2_state {state:'cancelled', reason} — consumed by
     gameEvents.js.  v2.3.1235: trade-completion receipt — a commit-time
     settlement failure (reason 'insufficient:*'; the server CANCELS the
     dead session, see trade2.js) becomes trade2 = {state:'failed'},
     rendered below as a brief in-modal notice (~2200ms) instead of a
     world popup; every other reason keeps the reason-mapped popup +
     immediate clear. */

const ITEM_EMOJI = {
  fish_minnow: '🐟', fish_clownfish: '🐠', fish_trout: '🎣',
  cooked_fish_minnow: '🍤', cooked_fish_clownfish: '🍣', cooked_fish_trout: '🍱',
  wood_pine: '🪵', wood_oak: '🪵', wood_birch: '🪵',
  ore_copper_ore: '🪨', ore_iron_ore: '⛏️', ore_silver_ore: '🥈',
  herb_firebloom: '🌺', herb_rock_vine: '🌿', herb_cloudpetal: '🌸',
  basic_trap: '🪤',
};
/* v2.3.2286: the owner's ladder, verbatim and in his order. Module scope so it
   is one list rather than an array literal rebuilt on every render. */
const GOLD_STEPS = [1, 5, 25, 50, 100, 500, 1000];
const emojiFor = (k) => ITEM_EMOJI[k] || (k.startsWith('skull') ? '💀' : k.startsWith('shard') ? '💠' : '📦');
const labelFor = (k) => k.replace(/^(fish|cooked_fish|wood|ore|herb)_/, '').replace(/_/g, ' ');
/* v2.3.1235: batch-4 state-correction — hoisted from the component so
   the row renderer can use it (was a local const; same expression). */
const wpnName = (w) => (w && w.weapon && w.weapon.name) || 'Weapon';

/* v2.3.1232: shared header icon (evt-trade) with emoji fallback — the
   SkillsPanel onError pattern. */
const TradeIcon = () => (
  <img src="/icons/ui/evt-trade.webp" alt="" draggable={false}
    style={{ width: 24, height: 24, objectFit: 'contain' }}
    onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🤝')); }} />
);
/* 24px because these sit in 32px wells and rows sized for a glyph; the art is
   square, so objectFit keeps the odd non-square source honest. */
const ItemThumb = ({ itemKey, size = 24, fallback }) => {
  const src = thumbFor(itemKey);
  if (!src) return <span style={{ fontSize: size * 0.75 }}>{fallback}</span>;
  return (
    <img src={src} alt="" draggable={false}
      style={{ width: size, height: size, objectFit: 'contain' }}
      onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(fallback || '')); }} />
  );
};

const GoldIcon = () => (
  <img src="/icons/popups/gold.webp" alt="" draggable={false}
    style={{ width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px' }}
    onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('💰')); }} />
);

/* ═══ v2.3.2280: ONE FRAME FOR ALL SIX TRADE STATES ═══
 *
 * Owner: "Yes bring the trade into the drawer too. And make sure it works
 * end to end."
 *
 * v2.3.2149 moved ONLY the live offer window onto the band. The other five
 * states this component can render -- the incoming invite, "waiting for them
 * to open", the CONFIRM/review screen, the completion receipt and the
 * settlement-failure notice -- each stayed a scrimmed `.bt-inspect-card`
 * centred over the world. So a single trade jumped format twice: you staged
 * items in a drawer attached to your bag, the screen went dark and a card
 * flew to the middle to ask you to accept, and then it jumped back. The
 * review screen is the one that matters most -- it is the anti-scam screen,
 * the moment the player is asked to READ -- and it was the one that moved.
 *
 * WHAT THE SCRIM WAS DOING, AND WHY LOSING IT IS FINE HERE. On a card, the
 * scrim is also the dismiss control: tap outside, panel closes. The drawer
 * has no scrim by design (v2.3.2149: the scrim covered the bag, and the bag
 * is the item source). Every state below therefore keeps an EXPLICIT control
 * where the scrim tap used to be:
 *   - invite       -> Decline (already there)
 *   - invited      -> Cancel  (already there)
 *   - review       -> the ✕, routed through requestLeave like the live window
 *   - done/failed  -> a ✕ that closes early; both also self-close on a timer
 * Nothing silently loses its way out.
 *
 * A COMPONENT, NOT A COPIED STYLE OBJECT. The five copies of `.bt-inspect` +
 * `.bt-inspect-card` this replaces had already drifted apart from each other
 * (three different widths, two different scrim alphas). One shell means the
 * next change lands on all six at once.
 */
const DRAWER_FRAME = {
  position: 'fixed', left: 6, right: 6,
  bottom: 'var(--dash-h, 243px)',
  maxHeight: 'min(52vh, 420px)',
  display: 'flex', flexDirection: 'column',
  background: 'var(--ui-sheet, #1E2E34)',
  border: '1px solid rgba(229,237,233,.14)',
  borderRadius: '10px 10px 0 0',
  borderBottom: 'none',
  color: 'var(--ui-text, #F4F0E7)',
  /* Above the world chrome and the joystick discs (30/31), below the item
     popup (100030) -- the shop drawer's own layer. */
  zIndex: 40,
  overflowY: 'auto',
  padding: 10,
  boxSizing: 'border-box',
};

/* `title` is the header line every state shares (icon + one sentence);
   `onClose` renders the ✕ and is omitted only where a state has no way to
   leave that isn't one of its own buttons. */
function TradeDrawer({ title, titleColor, onClose, children }) {
  return (
    <div
      data-trade-drawer=""
      onPointerDown={(e) => e.stopPropagation()}
      className="bt-chat-noselect"
      style={DRAWER_FRAME}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        {onClose && <button className="bt-inspect-close" onClick={onClose}>✕</button>}
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700,
            color: titleColor || '#F4F0E7', marginBottom: 8,
            /* clear the ✕ so a long partner name never runs under it */
            paddingRight: onClose ? 30 : 0,
          }}>
            <TradeIcon /> {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ═══ v2.3.2283: THE BUYER'S LANE IS A LIGHT CARD, SO ITS INK INVERTS ═══
 *
 * Owner: "Make the buyer window more notably different shade. Like a light
 * gray."
 *
 * WHY THIS IS AN OBJECT AND NOT A `light` BOOLEAN. Fourteen ink sites live on
 * nested children across THREE renderers (StagedRow, OfferRows, side), so a
 * boolean forces a ternary at every one of them and writes the light palette
 * out three times. One object means the fill and its ink cannot be changed
 * apart -- which is the actual hazard here: a light card that kept the dark
 * ramp would put its own text at 1.36:1 and its muted text at 1.87:1, i.e.
 * invisible, and CSS inheritance would hand you that silently because every
 * one of these sites sets `color` explicitly. docs/TRAPS.md carries it.
 *
 * DARK_INK is today's palette verbatim, and it is the DEFAULT PARAMETER on
 * both renderers -- so every call site that does not opt in is byte-identical
 * to v2.3.2282. Only the three buyer-lane sites pass anything. */
const DARK_INK = {
  slot: '#16262C', slotLine: '1px solid rgba(229,237,233,.08)',
  text: '#F4F0E7', name: '#B6C1BE', qty: '#B6C1BE', muted: '#8D9B98',
  gold: '#D8AA58', rarityFallback: '#8B9695', rarityByTier: null,
  divider: '1px solid rgba(229,237,233,.11)', platedThumbs: false,
};
/* Object.create(null) per CLAUDE.md rule 4: keyed by a tier string that
   arrives over the wire (w.weapon.tier), and a plain {} silently hands back
   Object.prototype for '__proto__' -- fixed three times in one day
   (duel.away v2.3.1175, party meta v2.3.1185, amulet tiers v2.3.1192). */
const LIGHT_RARITY = Object.assign(Object.create(null), {
  common:    'var(--ui-rarity-common-on-invert, #45565C)',
  elemental: 'var(--ui-rarity-elemental-on-invert, #1D4FA8)',
  fusion:    'var(--ui-rarity-fusion-on-invert, #6B21A8)',
  shift:     'var(--ui-rarity-shift-on-invert, #6E4D0F)',
});
const LIGHT_INK = {
  /* the 32px cell stays DARK on the light card -- it is the same slot
     silhouette the bag uses, and it gives item art the near-black ground it
     was authored against. A light plate is not an option: #B6C1BE on this
     fill is 1.19:1, a smudge rather than a cell. */
  slot: 'var(--ui-invert-slot, #16262C)', slotLine: '1px solid transparent',
  text: 'var(--ui-text-on-invert, #111E23)',
  name: 'var(--ui-text-on-invert-2, #293B41)',
  qty:  'var(--ui-text-on-invert-2, #293B41)',
  muted: 'var(--ui-text-on-invert-3, #45565C)',
  gold: 'var(--ui-gold-on-invert, #6E4D0F)',
  /* rarityByTier OVERRIDES the data colour rather than falling back to it:
     RARITY_TIERS ships bright values authored for dark ground (shift gold is
     1.05:1 here), and `rarityColor ||` would let every one of them through. */
  rarityFallback: 'var(--ui-rarity-common-on-invert, #45565C)',
  rarityByTier: LIGHT_RARITY,
  divider: '1px solid var(--ui-line-on-invert, rgba(11,22,27,.14))',
  platedThumbs: true,
};

/* v2.3.1235: batch-4 state-correction §4 — one staged entry as a compact
   row: 32px glyph well, name (+ rarity line when the entry carries one,
   i.e. weapons via RARITY_TIERS[tier]; plain inventory items have no
   rarity data in src/data, so their rarity line is simply absent), ×qty,
   and — on MY side only — a Remove control with a ≥44px hitbox bound to
   the EXISTING removal pathway (trade2_set without the key / the
   existing trade2_unstage_weapon send).  The other player's rows render
   the same component with no onRemove. */
/* 44px hit targets per UI-BIBLE; disabled reads as muted, never invisible —
   a + that vanishes at your stack limit looks like a broken button. */
const stepBtn = (enabled) => ({
  width: 34, height: 44, flex: 'none', borderRadius: 8, padding: 0,
  border: '1px solid rgba(229,237,233,.20)', background: enabled ? '#293B41' : '#1A272C',
  color: enabled ? '#F4F0E7' : '#667875', fontSize: 16, fontWeight: 700,
  cursor: enabled ? 'pointer' : 'not-allowed', lineHeight: 1,
});

/* ═══ v2.3.1752: A STEPPER, NOT A GUESSING GAME ═══
   Owner: "allow additional quantities of stuff to be traded (it only allowed
   me to put up one of the fire goblin remains).  It's just not a great trading
   interface neither of us understood it well."
   Staging a quantity used to be ONE control doing three jobs: tapping a bag
   tile added `floor(have / 4)` — so a stack of 3 stepped by 1, a stack of 40
   by 10 — and tapping again past your stack silently reset it to zero.  There
   was no way to ask for a specific number, no way to go down by one, and the
   only feedback was a "staged/have" figure inside the tile you were tapping.
   Now: the bag tile stages ONE (and taps up by one), and every staged row
   carries − / + with your stack size beside it, so the quantity is a thing you
   set rather than a cycle you land on. */
function StagedRow({ glyph, name, qty, have, rarityLabel, rarityColor, rarityTier, onRemove, onInc, onDec, ink = DARK_INK }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: onRemove ? 44 : 36, padding: '2px 0' }}>
      <div style={{ width: 32, height: 32, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: ink.slot, border: ink.slotLine, borderRadius: 8 }}>{glyph}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: ink.name, textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        {rarityLabel ? (
          /* v2.3.2283: the tier wins over the data colour on an inverted lane
             -- see rarityByTier. On the dark lane both are absent and this is
             the same expression it always was. */
          <div style={{ fontSize: 10, color: (ink.rarityByTier && ink.rarityByTier[rarityTier]) || rarityColor || ink.rarityFallback }}>{rarityLabel}</div>
        ) : null}
      </div>
      {qty != null && !onInc && (
        <div style={{ fontSize: 12, fontWeight: 700, color: ink.qty, fontVariantNumeric: 'tabular-nums' }}>×{qty}</div>
      )}
      {/* v2.3.2283: the stepper branch below keeps its dark colours on purpose.
          It is structurally unreachable from an inverted lane -- onInc and
          onRemove are only ever passed for YOUR offer -- so theming it would
          be dead code. If a "request this item" affordance is ever added to
          the buyer's lane, these five colours go live on a light fill all at
          once; that is the moment to thread them. */}
      {qty != null && onInc && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 'none' }}>
          <button aria-label={'One fewer ' + name} onClick={onDec} disabled={qty <= 0}
            style={stepBtn(qty > 0)}>−</button>
          <div style={{ minWidth: 40, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#F4F0E7', fontVariantNumeric: 'tabular-nums' }}>
            {qty}<span style={{ color: '#8D9B98', fontWeight: 400 }}>/{have}</span>
          </div>
          <button aria-label={'One more ' + name} onClick={onInc} disabled={have != null && qty >= have}
            style={stepBtn(have == null || qty < have)}>+</button>
        </div>
      )}
      {onRemove && (
        <button aria-label={'Remove ' + name} onClick={onRemove}
          style={{ width: 44, height: 44, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#8D9B98', fontSize: 14, cursor: 'pointer', padding: 0 }}>✕</button>
      )}
    </div>
  );
}

/* v2.3.1235: batch-4 state-correction §4 — an offer well's contents as a
   row list (was OfferChips pills).  Items + staged weapons + gold, all
   from the server snapshot (or my local staging mirror of it); if the
   list outgrows the well only IT scrolls (overflow-y auto +
   ls-scrollbody, game.css). */
/* v2.3.1235: trade-completion receipt — optional goldSuffix ("G") lets
   the receipt render its gold rows as "25G"; live-trade wells pass
   nothing and are byte-identical. */
function OfferRows({ offer, weapons, empty, onRemoveItem, onRemoveWeapon, goldSuffix, inv, onSetQty, ink = DARK_INK }) {
  const entries = Object.entries(offer || {}).filter(([k, v]) => k !== '_gold' && v > 0);
  const gold = (offer && offer._gold) || 0;
  const wpns = weapons || [];
  if (!entries.length && !gold && !wpns.length) {
    /* v2.3.2283: the EMPTY lane is the first thing a player sees when a trade
       opens, so this is not a corner case -- on the light card the old
       #8D9B98 would be 1.87:1. */
    return <div style={{ fontSize: 11, color: ink.muted, padding: '8px 0' }}>{empty}</div>;
  }
  return (
    <div className="ls-scrollbody" style={{ maxHeight: 148, overflowY: 'auto' }}>
      {entries.map(([k, v]) => (
        <StagedRow key={k} glyph={<ItemThumb itemKey={k} fallback={emojiFor(k)} />} name={labelFor(k)} qty={v}
          have={inv ? (inv[k] || 0) : null}
          onRemove={onRemoveItem ? () => onRemoveItem(k) : null}
          onInc={onSetQty ? () => onSetQty(k, v + 1) : null}
          onDec={onSetQty ? () => onSetQty(k, v - 1) : null} ink={ink} />
      ))}
      {wpns.map((w) => {
        const rt = (w.weapon && RARITY_TIERS[w.weapon.tier]) || null;
        return (
          <StagedRow key={'w' + w.seq} glyph="⚔️" name={wpnName(w)}
            rarityLabel={rt ? rt.label : null} rarityColor={rt ? rt.color : null}
            rarityTier={w.weapon && w.weapon.tier}
            onRemove={onRemoveWeapon ? () => onRemoveWeapon(w.seq) : null} ink={ink} />
        );
      })}
      {gold > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '2px 0' }}>
          <div style={{ width: 32, height: 32, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ink.slot, border: ink.slotLine, borderRadius: 8 }}><GoldIcon /></div>
          <div style={{ flex: 1, fontSize: 12, color: ink.name }}>Gold</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: ink.gold, fontVariantNumeric: 'tabular-nums' }}>{gold}{goldSuffix || ''}</div>
        </div>
      )}
    </div>
  );
}

export function TradeWindowPanel(props) {
  /* v2.3.2145: while this panel is up the transient world chrome stands down
     -- see modalGuardBus. The owner could not accept a trade at all: the chat
     composer's dismiss layer is a full-play-area tap catcher forty z-layers
     above this panel, so every tap aimed at Accept closed the chat box
     instead. */
  React.useEffect(() => guardPush(), []);

  const { rpgState, stateRef, trade2, setTrade2 } = props;
  const S = stateRef.current;
  const myId = S.myId;
  const [stage, setStage] = useState({});
  /* v2.3.1235: batch-4 state-correction §7 — leave-confirm strip (pure
     client UI, no wire message of its own) and §6 offer-changed notice
     (display of the server's confirm-reset, see wire map above). */
  const [leaveAsk, setLeaveAsk] = useState(false);
  const [offerChanged, setOfferChanged] = useState(false);
  /* ═══ v2.3.1754: THESE HOOKS LIVE UP HERE FOR A REASON ═══
     This component early-returns for the invite stub and the cancelled/receipt
     states well before the live-window body.  Declaring the review-stage hooks
     down beside the code that uses them made React see a different hook count
     between renders — the window rendered nothing at all and the harness saw
     an empty button list.  Rules of Hooks: unconditional, above every return. */
  const T2_ACCEPT_COOLDOWN_MS = 2500;
  const [nowTick, setNowTick] = useState(Date.now());
  const [goldAck, setGoldAck] = useState(false);
  const _t2ChangedAt = (trade2 && trade2.changedAt) || 0;
  useEffect(() => { setGoldAck(false); }, [_t2ChangedAt]);
  useEffect(() => {
    const h = setInterval(() => setNowTick(Date.now()), 200);
    return () => clearInterval(h);
  }, []);
  const prevConfirmRef = useRef(null);
  const send = (event, payload) => {
    try { S.channel.send({ type: 'broadcast', event, payload: payload || {} }); } catch (e) {}
  };

  // A fresh session (or a session id change) resets the local staging
  // mirror to the server's copy of MY side.
  const sessionId = trade2 && trade2.id;
  useEffect(() => {
    if (trade2 && trade2.offers && trade2.offers[myId]) setStage({ ...trade2.offers[myId] });
    else setStage({});
    /* v2.3.1235: batch-4 state-correction — a new session also clears
       the leave-confirm strip and any stale offer-changed notice. */
    setLeaveAsk(false);
    setOfferChanged(false);
    /* deps intentionally just the session id: mid-session trade2_state
       echoes must NOT clobber the local staging the player is editing
       (the server echo of our own set would bounce the cursor). */
  }, [sessionId]);

  /* v2.3.1235: batch-4 state-correction §6 — detect the SERVER's
     confirm-reset.  The wire carries no explicit reset flag (see map),
     so we compare successive server snapshots of the SAME session: if
     the previous echo had any confirm set and the new one has both
     cleared while still 'open', the server reset them (trade2_set /
     stage / unstage all do this) → show the notice.  Any later echo
     with a confirm set clears it.  This renders only server-relayed
     transitions — it cannot fire from local staging alone because
     `stage` edits don't touch `trade2`. */
  useEffect(() => {
    const cur = (trade2 && trade2.state === 'open' && trade2.confirmed)
      ? { id: trade2.id, any: Object.values(trade2.confirmed).some(Boolean) }
      : null;
    const prev = prevConfirmRef.current;
    prevConfirmRef.current = cur;
    if (!cur) { setOfferChanged(false); return; }
    if (prev && prev.id === cur.id && prev.any && !cur.any) setOfferChanged(true);
    else if (cur.any || (prev && prev.id !== cur.id)) setOfferChanged(false);
  }, [trade2]);

  /* v2.3.1235: trade-completion receipt — the receipt ('done') and the
     settlement-failure notice ('failed') are transient READ-ONLY states:
     no buttons, timed auto-close via the existing setTrade2(null)
     (~2800ms receipt / ~2200ms failure).  No after-close toast: the only
     toast mechanism in the codebase is the salvage-undo queue
     (ItemTooltip.jsx queueSalvageToast — item+undo specific), so per the
     owner spec the toast is skipped rather than re-adding the floating
     world text over the character. */
  const terminalState = trade2 && trade2.state;
  useEffect(() => {
    if (terminalState !== 'done' && terminalState !== 'failed') return undefined;
    const t = setTimeout(() => setTrade2(null), terminalState === 'done' ? 2800 : 2200);
    return () => clearTimeout(t);
  }, [terminalState]);

  /* ═══ v2.3.2149: YOUR REAL BAG IS THE ITEM SOURCE ═══
     Owner: "change the player to player trade menu to be like the shopkeeper
     trade menu where it just attaches to the player bag."

     Shopkeeper Bro's window already works this way (shopBus, v2.3.2059) and
     this is the same handshake: the band's own bag tiles become half the
     controls, so the window hands them the staging function and a copy of what
     is staged, and takes both back when it closes. A tap after the window is
     gone then reaches nothing rather than a stale closure over a finished
     trade.

     THE PROTOCOL IS UNTOUCHED. A tap runs the same addOne -> trade2_set path
     the in-window tray already used; no new wire message, no new server gate.

     ABOVE EVERY EARLY RETURN, and through a REF. This component returns early
     SIX times -- no trade, the receipt, a failure, the invite stub, 'invited',
     and a malformed state -- and a hook below any of them is a hooks-order
     violation. The first cut put these next to addOne, where they read more
     naturally, which is below all six; the second lifted them above only the
     last three. Both crashed with React error #300 the moment the trade
     COMPLETED and the receipt returned early past them, taking the whole UI
     down with it (mp-trade: no drawer, no card, not one visible button). They
     now sit above `if (!trade2) return null;`, which is the first one. The ref
     is assigned during the live render further down, which is all an effect
     needs.

     `liveTrade` is deliberately false for the receipt and failure states too,
     so the bag is handed back the instant the trade stops being editable. */
  const bagTapRef = useRef(null);
  /* ═══ v2.3.2280: THE BAG LETS GO FOR THE REVIEW SCREEN ═══
     The review screen tells the player, in its own footer, "Nothing on this
     screen can change the trade." With the bag attached that was not true:
     the band's tiles were still wired to addOne, so a tap on one staged an
     item mid-review. The server catches it -- any edit resets both readies
     and drops the pair back to the offer stage (trade2.js) -- so this was
     never a scam route, but the screen was making a promise the UI broke,
     and on a phone the bag sits directly under the drawer where a thumb
     rests. Hand it back for the review, take it again on the way out.
     Derived from trade2.a/trade2.b rather than myId/otherId because this
     sits above the early returns those are computed below; both ready is
     both ready whichever end you read it from. */
  const reviewStage = !!(trade2 && !trade2.invite && trade2.state === 'open'
    && S && S._serverCaps && S._serverCaps.trade2Review
    && trade2.ready && !!trade2.ready[trade2.a] && !!trade2.ready[trade2.b]);
  const liveTrade = !!trade2 && !trade2.invite && trade2.state === 'open' && !reviewStage;
  useEffect(() => {
    if (!liveTrade) return undefined;
    tradeBagBus.attach((k) => { if (bagTapRef.current) bagTapRef.current(k); });
    return () => tradeBagBus.detach();
  }, [liveTrade]);
  useEffect(() => { if (liveTrade) tradeBagBus.setStaged(stage); }, [liveTrade, stage]);

  if (!trade2) return null;

  /* v2.3.1232: shared Lantern Slate surfaces for this panel's cards */
  /* v2.3.1235: batch-4 rollout — decision-surface card = sheet token at
     radius 14 + strong hairline (matches the corrected incoming-trade
     banner); primary = committed gold-gradient recipe (#EAC675 edge,
     #172126 ink, radius 10); secondary = raised #293B41 + strong
     hairline. */
  /* v2.3.2280: `cardStyle` retired with the last centred card -- every state
     is a TradeDrawer now and the drawer frame carries the surface. */
  const primaryBtn = {
    minHeight: 44, borderRadius: 10, border: '1px solid #EAC675',
    background: 'linear-gradient(180deg,#E2B765,#D2A14D)', color: '#172126', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  const secondaryBtn = {
    minHeight: 44, borderRadius: 10,
    border: '1px solid rgba(229,237,233,.20)',
    background: '#293B41', color: '#F4F0E7', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  /* v2.3.1232: module header — 11/600 uppercase per spec typography */
  /* v2.3.1235: batch-4 rollout — corrected section-header ramp 11/700
     .14em; muted #8D9B98, confirmed = corrected positive #55B98A (the
     ✅ emoji was chrome — dropped). */
  /* v2.3.1235: trade-completion receipt — laneHeader + the well recipe
     hoisted above the state renders so the receipt reuses the exact
     live-window section-header and recessed-well recipes.
     v2.3.2282: the one `wellStyle` became the owner-coded pair below. */
  const laneHeader = { fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 3 };
  /* v2.3.1235: batch-4 state-correction §3 — recessed offer well */
  /* ═══ v2.3.2283: WHOSE PILE IS THIS ═══
   *
   * Owner: "shade color the trade windows differently if it's yours versus the
   * other players", then "Make the buyer window more notably different shade.
   * Like a light gray."
   *
   * v2.3.2282 answered the first ask inside the dark ladder -- yours on well,
   * theirs on well-deep, plus a 3px rule down your edge -- and the two fills
   * came out 1.08:1 apart, which is why there was a second ask. There is
   * nothing brighter left down there: raised-high is ~1.6:1 against well, and
   * raised puts the muted ink at 4.05:1, under AA. So the buyer's lane leaves
   * the ladder entirely and becomes an INVERTED surface: a light card with
   * dark ink (--ui-invert + the -on-invert ramp, game.css). ~11:1 apart now.
   *
   * THE SHADOWS ARE OPPOSITE, AND THAT IS THE POINT. A black INNER shadow on a
   * fill nine times lighter than the sheet behind it reads as dirt smeared
   * across the top, so their lane stops being a well sunk INTO the sheet and
   * becomes a card raised OFF it. That is also the truer reading: their offer
   * is the thing you inspect, yours is the tray you load. Do NOT let a later
   * tidying pass merge WELL_SHADOW and CARD_SHADOW back into one constant --
   * the two lanes need opposite recipes, and your lane is only 1.21:1 against
   * the sheet, so its hairline and its inset ARE its box. Erase them and your
   * lane becomes empty space under a bright card.
   *
   * `border` moved OUT of the shared base for the same reason: the dark
   * hairline rgba(229,237,233,.11) composites to 1.03:1 on the light fill --
   * no edge at all -- so each lane states its own.
   *
   * THE 3px RULE IS GONE. It existed to carry a distinction the fills could
   * not; the fills carry it now, and a light rule on a light card is
   * invisible anyway.
   *
   * STILL NOT THE ONLY SIGNAL: the headers name the owner in words, position
   * is fixed (yours is always the bottom one), and only your lane's rows carry
   * a stepper and a remove control. */
  const WELL_SHADOW = 'inset 0 2px 4px rgba(0,0,0,.44)';   /* yours: sunk   */
  const CARD_SHADOW = '0 1px 3px rgba(4,9,12,.42)';        /* theirs: raised */
  /* minHeight so an EMPTY light lane reads as a card rather than as a bright
     33px stripe -- the state a trade spends its first ten seconds in. Applied
     to both so the two stay symmetric. */
  const wellBase = { borderRadius: 8, padding: '2px 6px', marginBottom: 8, minHeight: 44, boxSizing: 'border-box' };
  const theirWell = { ...wellBase, background: 'var(--ui-invert, #C8D2CF)', border: '1px solid var(--ui-line-on-invert, rgba(11,22,27,.14))', boxShadow: CARD_SHADOW };
  const myWell = { ...wellBase, background: 'var(--ui-well, #111E23)', border: '1px solid rgba(229,237,233,.11)', boxShadow: WELL_SHADOW };
  /* The ink travels with the fill, never separately -- see DARK_INK/LIGHT_INK.
     A plain const, never a hook: this sits after the first early return and
     before the other five, which is exactly the reach the receipt needs, and a
     useMemo here would be the React #300 crash this file already documents
     twice. */
  const theirInk = LIGHT_INK, myInk = DARK_INK;

  /* v2.3.1235: trade-completion receipt — state==='done' renders the
     receipt INSIDE the same modal shell.  gameEvents.js only ever sets
     this state AFTER the authoritative player_state echo was applied
     (or its 1500ms dropped-echo fallback), so the Balance line below is
     always the SERVER's wallet, never a pre-echo value.  Read-only: no
     buttons, no celebration; the effect above auto-closes it (~2800ms).
     A scrim tap dismisses early (pure local close — the session is
     already settled and gone server-side, so there is nothing to send). */
  if (trade2.state === 'done' && trade2.receipt) {
    const r = trade2.receipt;
    const liveCoins = (rpgState && rpgState.coins) || 0; /* live rpg wallet = server-echoed value */
    return (
      /* v2.3.2280: the receipt stays on the band where the trade happened.
         The ✕ closes it early -- what the scrim tap used to do -- and the
         effect above still auto-closes it (~2800ms). */
      <TradeDrawer title="Trade complete ✓" titleColor="#55B98A" onClose={() => setTrade2(null)}>
          {/* v2.3.2282: RECEIVED on top, SENT on the bottom -- see the lane-order
              note on the review screen. Your own pile is the bottom one on all
              three screens now, and it is the one on the lighter well. */}
          <div style={{ ...laneHeader, color: '#8D9B98' }}>You received</div>
          <div style={theirWell}>
            <OfferRows offer={r.received} weapons={r.receivedWeapons} empty="Nothing" goldSuffix="G" ink={theirInk} />
          </div>
          <div style={{ ...laneHeader, color: '#8D9B98' }}>You sent</div>
          <div style={myWell}>
            <OfferRows offer={r.sent} weapons={r.sentWeapons} empty="Nothing" goldSuffix="G" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ ...laneHeader, marginBottom: 0, color: '#8D9B98' }}>Balance</span>
            <GoldIcon />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F4F0E7', fontVariantNumeric: 'tabular-nums' }}>{liveCoins}G</span>
          </div>
      </TradeDrawer>
    );
  }

  /* v2.3.1235: trade-completion receipt §failure — the server cancelled
     the session at commit ('insufficient:*' → the session is DEAD
     server-side, trade2.js _t2Cancel), so returning to Editing with the
     same session would be a lie.  Honest brief notice in the same modal
     shell — danger-OUTLINE treatment (never filled red) — auto-closed
     ~2200ms by the effect above.  Inventory/gold were never touched
     locally (a failed commit sends no credits and no wallet mutation).
     True retry-in-place would need a server change (session survives a
     failed commit) — out of scope. */
  if (trade2.state === 'failed') {
    return (
      <TradeDrawer title="Trade" onClose={() => setTrade2(null)}>
          <div style={{ borderRadius: 10, border: '1px solid #D8635D', background: 'transparent', color: '#D8635D', fontSize: 12, fontWeight: 700, padding: '10px 12px' }}>
            Trade failed — nothing was exchanged
          </div>
      </TradeDrawer>
    );
  }

  // ── Incoming invite stub ──
  if (trade2.invite) {
    return (
      /* v2.3.2280: no ✕ here on purpose. Decline is the answer to an
         invite, and it SENDS trade2_cancel -- the scrim tap this replaces
         did not, so a dismissed invite used to leave the other player
         waiting on a request nobody had actually refused. */
      <TradeDrawer title={`${trade2.fromName} wants to trade`}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              style={{ ...primaryBtn, flex: 1, padding: '7px 0' }}
              onClick={() => send('trade2_open', { target: trade2.from })}
            >Open trade</button>
            <button
              style={{ ...secondaryBtn, flex: 1, padding: '7px 0' }}
              onClick={() => { send('trade2_cancel'); setTrade2(null); }}
            >Decline</button>
          </div>
      </TradeDrawer>
    );
  }

  // ── Waiting for the other side to open ──
  if (trade2.state === 'invited') {
    return (
      <TradeDrawer title="Trade" onClose={() => { send('trade2_cancel'); setTrade2(null); }}>
          {/* v2.3.1235: batch-4 rollout — waiting state stays readable
              secondary text (text-2 token). */}
          <div style={{ fontSize: 12, color: '#B6C1BE' }}>Trade request sent — waiting…</div>
          <button
            style={{ ...secondaryBtn, marginTop: 10, width: '100%', padding: '6px 0' }}
            onClick={() => { send('trade2_cancel'); setTrade2(null); }}
          >Cancel</button>
      </TradeDrawer>
    );
  }

  if (trade2.state !== 'open' || !trade2.offers) return null;

  const otherId = trade2.a === myId ? trade2.b : trade2.a;
  const otherName = trade2.a === myId ? trade2.bName : trade2.aName;
  const iConfirmed = !!trade2.confirmed[myId];
  const theyConfirmed = !!trade2.confirmed[otherId];
  const inv = (rpgState && rpgState.inventory) || {};
  const coins = (rpgState && rpgState.coins) || 0;
  /* v2.3.1213: weapon lane (item E). Weapons are escrowed server-side at
     stage (they leave the stash) and swap on commit — so they ride a
     separate `trade2.weapons` snapshot, not the `offers` map, and the
     picker is gated on caps.trade2Weapons (an old worker never sees the
     stage command). Both-confirm resets on any stage/unstage. */
  const weaponLane = !!(S && S._serverCaps && S._serverCaps.trade2Weapons);
  /* ═══ v2.3.1754: THE TWO-STAGE TRADE ═══
     Owner: "once both ready up, show a second, stripped-down screen — just a
     plain text summary of 'you give / you receive' with totals.  Both must
     accept again.  This second screen is arguably the single best anti-scam
     feature ever added to a trade system."
     caps-gated (rule 19): against an OLD worker the flag is absent, the
     window keeps the single-stage Confirm it has always had, and no
     trade2_ready is sent — the worker would relay it as an unknown broadcast
     and the pair would wait on a stage that never arrives. */
  const reviewFlow = !!(S && S._serverCaps && S._serverCaps.trade2Review);
  const iReady = !!(trade2.ready && trade2.ready[myId]);
  const theyReady = !!(trade2.ready && trade2.ready[otherId]);
  /* v2.3.2280: the same fact as `reviewStage` above, kept under its old
     name here so every read below is unchanged. Asserted identical rather
     than recomputed -- two expressions for one stage is how the bag and the
     screen would drift out of agreement. */
  const onReview = reviewStage;
  /* The server refuses an accept within ACCEPT_COOLDOWN_MS of the last edit
     (trade2.js).  Mirrored here only so the button can SAY so and count down
     — the rule itself lives on the worker, because a cooldown a modified
     client can skip is decoration. */
  const coolLeft = Math.max(0, T2_ACCEPT_COOLDOWN_MS - (nowTick - (trade2.changedAt || 0)));
  /* Owner: "large currency amounts trigger an explicit confirmation to catch
     typos."  A second tap on the same button, not a separate dialog: on a
     phone an extra modal over a modal is where taps go to die. */
  const BIG_GOLD = 5000;
  const myWpn = (trade2.weapons && trade2.weapons[myId]) || [];
  const otherWpn = (trade2.weapons && trade2.weapons[otherId]) || [];
  const stash = (rpgState && rpgState.weaponStash) || [];
  const T2_WPN_MAX = 4;

  const pushStage = (next) => {
    setStage(next);
    send('trade2_set', { offer: next });
  };
  /* v2.3.1752: set an exact quantity, clamped to what you actually hold.
     0 (or less) unstages, which is what the − button does at 1. */
  const setQty = (k, qty) => {
    const have = inv[k] || 0;
    const next = { ...stage };
    const nv = Math.max(0, Math.min(Math.floor(qty) || 0, have));
    if (nv > 0) next[k] = nv; else delete next[k];
    pushStage(next);
  };
  /* Tapping a bag tile adds ONE.  It used to add a quarter of the stack and
     wrap to zero past the top — see the note on StagedRow. */
  const addOne = (k) => setQty(k, (stage[k] || 0) + 1);
  /* v2.3.2149: hand the live addOne to the bag tiles (see the ref above).
     Assigned every render, so a tap always stages onto the CURRENT offer --
     a captured one would add to a stale copy and silently undo the last
     change. */
  bagTapRef.current = addOne;
  /* v2.3.1235: batch-4 state-correction §4 — the staged-row Remove
     control.  Same pathway an item already left the stage by (delete
     the key, push the whole offer via the existing trade2_set send) —
     no new wire message. */
  const removeItem = (k) => {
    const next = { ...stage };
    delete next[k];
    pushStage(next);
  };


  /* v2.3.1235: batch-4 state-correction §3/§7 — emptiness facts for the
     empty-state copy, the disabled Confirm, and the leave-confirm guard.
     MY side reads the local staging mirror (`stage` is what trade2_set
     sent); the OTHER side reads the server snapshot — the only copy of
     their offer that exists. */
  const bagItems = Object.entries(inv).filter(([k, v]) => v > 0 && k !== 'potions');
  const bagEmpty = bagItems.length === 0;
  const myItemCount = Object.entries(stage).filter(([k, v]) => k !== '_gold' && v > 0).length;
  const myGold = stage._gold || 0;
  const theirOffer = trade2.offers[otherId] || {};
  const theirItemCount = Object.entries(theirOffer).filter(([k, v]) => k !== '_gold' && v > 0).length;
  const theirGold = theirOffer._gold || 0;
  const bothEmpty = !myItemCount && !myGold && !theirItemCount && !theirGold && !myWpn.length && !otherWpn.length;
  const confirmDisabled = bothEmpty && !iConfirmed;
  /* v2.3.1235: batch-4 state-correction §7 — before anything is staged
     (and nobody confirmed), ✕/Cancel/scrim leave immediately as they
     always did; once anything is staged or either side confirmed they
     first ask.  [Leave Trade] fires the EXISTING trade2_cancel send. */
  const guardLeave = !bothEmpty || iConfirmed || theyConfirmed;
  const requestLeave = () => {
    if (guardLeave) setLeaveAsk(true);
    else send('trade2_cancel');
  };

  /* v2.3.1232: weapon chip style — magic violet from the semantic set
     (was the off-palette #a78bfa). */
  /* v2.3.1235: trade-completion receipt — laneHeader + the well recipe moved
     up beside the shared styles (shared with the receipt render).
     v2.3.2282: that well is now the myWell / theirWell pair. */
  /* v2.3.1235: batch-4 state-correction §6 — lane headers become a
     flex row: lane title left, live status right.  Both statuses are
     direct reads of server state (`confirmed` flags from the last
     trade2_state echo). */
  const laneHeaderRow = { ...laneHeader, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 };

  /* ═══ v2.3.1754: STAGE TWO — THE REVIEW SCREEN ═══
     Owner: "show a second, stripped-down screen — just a plain text summary
     of 'you give / you receive' with totals.  Both must accept again.  This
     second screen is arguably the single best anti-scam feature ever added to
     a trade system."
     STRIPPED-DOWN IS THE POINT.  No bag tray, no gold field, no staging
     controls — nothing on this screen can change the trade, so what you read
     is necessarily what you accept.  The offer is frozen server-side too:
     any edit resets both readies and drops the pair back here-minus-one.
     A COUNT, not a "value".  The owner's spec asks for a running total value
     per side, and the game has no item price table anywhere — a total would
     be a number I invented, and an invented number on an anti-scam screen is
     worse than none, because it is exactly the figure someone would trust
     instead of reading the list.  Gold is real and is totalled; items are
     counted.  See the PR for what a real valuation would need. */
  if (onReview) {
    const mine = trade2.offers[myId] || {};
    const theirs = trade2.offers[otherId] || {};
    /* v2.3.1755: rows carry their own art now, so the summary keeps the key
       (for the thumbnail) alongside the text rather than pre-flattening to a
       string.  Staged weapons have no inventory key — they fall back to the
       crossed-swords glyph the staged rows already use for them. */
    const lines = (offer, wpns) => {
      const out = Object.entries(offer)
        .filter(([k, v]) => k !== '_gold' && v > 0)
        .map(([k, v]) => ({ key: k, text: `${labelFor(k)} x${v}` }));
      (wpns || []).forEach((w) => out.push({ key: null, text: wpnName(w), glyph: '⚔️' }));
      return out;
    };
    const myLines = lines(mine, myWpn), theirLines = lines(theirs, otherWpn);
    const myGold = mine._gold || 0, theirGold = theirs._gold || 0;
    const bigGold = Math.max(myGold, theirGold) >= BIG_GOLD;
    /* v2.3.2282: `well` joins `tone` as a per-lane argument. Both are bound to
       the lane's OWNER, and both are passed at the call site rather than
       derived from position -- see the note there for why that distinction is
       load-bearing on this particular screen. */
    /* v2.3.2283: a 24px cell under the thumb on an inverted lane. Item art is
       fixed webp authored against a near-black ground; the drawer and the
       receipt already give it one (StagedRow's 32px plate) and this is the one
       place it sat bare, which on a light card would leave every thumbnail
       floating on a ground 12:1 from the one it was drawn on. */
    const chip = (node, ink) => (ink && ink.platedThumbs)
      ? (<span style={{ width: 24, height: 24, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: ink.slot, borderRadius: 6 }}>{node}</span>)
      : node;
    const side = (title, ls, gold, tone, well, ink) => (
      <div style={{ ...well, marginBottom: 8 }}>
        <div style={{ ...laneHeader, color: tone, marginBottom: 4 }}>{title}</div>
        {ls.length === 0 && gold === 0 && (
          <div style={{ fontSize: 12, color: ink.muted }}>Nothing</div>
        )}
        {ls.map((it) => (
          <div key={it.text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: ink.text, lineHeight: 1.5, padding: '1px 0' }}>
            {chip(<ItemThumb itemKey={it.key} size={20} fallback={it.glyph || '📦'} />, ink)}
            <span>{it.text}</span>
          </div>
        ))}
        {gold > 0 && (
          /* NOTE #D8A94D, not the #D8AA58 used elsewhere -- a near-duplicate,
             so a find-and-replace on the other hex misses this line and leaves
             1.40:1 gold on the one screen whose job is to be read. */
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: ink.gold, fontWeight: 700, lineHeight: 1.5, padding: '1px 0' }}>
            {chip(<GoldIcon />, ink)}<span>{gold} gold</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: ink.muted, marginTop: 4, borderTop: ink.divider, paddingTop: 4 }}>
          <span>{ls.length} item{ls.length === 1 ? '' : 's'}</span>
          {gold > 0 && (<><span>·</span><GoldIcon /><span>{gold}</span></>)}
        </div>
      </div>
    );
    return (
      /* ═══ v2.3.2280: THE ANTI-SCAM SCREEN JOINS THE BAND ═══
         This was the last state to fly to the middle of the screen behind a
         scrim, and it is the one the player is meant to READ. Same drawer,
         same place, same seam against the bag -- the offer they staged is
         still where they staged it, one screen up.
         The ✕ still routes through requestLeave, which is what the scrim tap
         did. That used to be a DEAD CONTROL here: requestLeave sets
         `leaveAsk`, and this screen never rendered the leave-confirm strip,
         so a scrim tap mid-review did nothing at all and the player had no
         way out but Back. The strip is rendered below now. */
      <TradeDrawer title={`Confirm with ${otherName}`} onClose={requestLeave}>
          {/* ═══ v2.3.2282: YOUR OWN PILE IS ALWAYS THE BOTTOM ONE ═══
              Owner: "swap places so that your 'you give' is on bottom and 'you
              receive' is on top ... This way it's consistent across all 3 trade
              windows that the player offer is on the bottom."

              The live offer drawer has always read theirs-then-yours; this
              screen and the receipt read yours-then-theirs, so a single trade
              flipped the two piles under your thumb twice -- on the one screen
              whose entire job is to be READ carefully before you consent. All
              three agree now.

              TONE, WELL AND INK TRAVEL WITH THE LABEL, NOT WITH THE LINE.
              `side` takes all three positionally, so swapping these two lines
              while leaving the arguments in place would silently paint YOU
              GIVE green and YOU RECEIVE red -- inverting the anti-scam colour
              coding (v2.3.1754) while looking, in a diff, exactly like a
              reorder. v2.3.2283 raised the stakes: it would also put the dark
              ramp on the light card, i.e. invisible text. Read the arguments,
              not the order. */}
          {side('YOU RECEIVE', theirLines, theirGold, 'var(--ui-positive-on-invert, #1C5A40)', theirWell, theirInk)}
          {side('YOU GIVE', myLines, myGold, '#D8635D', myWell, myInk)}
          {bigGold && !goldAck && (
            /* Owner: "large currency amounts trigger an explicit confirmation
               to catch typos." */
            <div style={{ fontSize: 12, color: '#D8A94D', marginBottom: 8, lineHeight: 1.45 }}>
              That is a large amount of gold. Check the numbers, then tap Accept twice.
            </div>
          )}
          {theyConfirmed && (
            <div style={{ fontSize: 12, color: '#55B98A', marginBottom: 6 }}>{otherName} has accepted — waiting on you.</div>
          )}
          {/* v2.3.2280: the leave-confirm strip the ✕/scrim has been setting
              since v2.3.1235 without anything rendering it here. Same markup
              and the same trade2_cancel send as the offer stage -- copied
              rather than shared only because the offer stage's copy sits
              inside its own scroll body. */}
          {leaveAsk && (
            <div style={{ borderRadius: 10, border: '1px solid rgba(229,237,233,.11)', background: '#111E23', padding: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F4F0E7', marginBottom: 6 }}>Leave this trade?</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  style={{ ...secondaryBtn, flex: 1, padding: '6px 0' }}
                  onClick={() => setLeaveAsk(false)}
                >Keep Trading</button>
                <button
                  style={{ flex: 1, padding: '6px 0', minHeight: 44, borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid #D8635D', background: 'transparent', color: '#D8635D', cursor: 'pointer' }}
                  onClick={() => send('trade2_cancel')}
                >Leave Trade</button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              disabled={iConfirmed || coolLeft > 0}
              style={{
                flex: 2, padding: '8px 0', minHeight: 44, borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: (iConfirmed || coolLeft > 0) ? 'default' : 'pointer',
                border: (iConfirmed || coolLeft > 0) ? '1px solid rgba(229,237,233,.11)' : '1px solid #EAC675',
                background: (iConfirmed || coolLeft > 0) ? '#1A292F' : 'linear-gradient(180deg,#E2B765,#D2A14D)',
                color: iConfirmed ? '#55B98A' : coolLeft > 0 ? '#8D9B98' : '#172126',
              }}
              onClick={() => {
                if (iConfirmed || coolLeft > 0) return;
                if (bigGold && !goldAck) { setGoldAck(true); return; }
                send('trade2_confirm');
              }}
            >{iConfirmed ? 'Accepted ✓ — waiting'
              : coolLeft > 0 ? `Wait ${Math.ceil(coolLeft / 1000)}s…`
              : (bigGold && !goldAck) ? 'Accept (large trade)'
              : 'Accept'}</button>
            <button
              style={{ flex: 1, padding: '8px 0', minHeight: 44, borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid rgba(229,237,233,.20)', background: '#293B41', color: '#F4F0E7', cursor: 'pointer' }}
              onClick={() => send('trade2_ready', { ready: false })}
            >Back</button>
          </div>
          {/* The cooldown is the owner's "2-3 second delay ... kills
              last-second swap scams".  Saying WHY it is disabled matters: an
              unexplained dead button reads as a broken one. */}
          <div style={{ fontSize: 11, color: '#8D9B98', marginTop: 8, lineHeight: 1.45 }}>
            Nothing on this screen can change the trade. If either of you edits the offer,
            you both come back here and accept again.
          </div>
      </TradeDrawer>
    );
  }

  return (
    /* ═══ v2.3.2149: A DRAWER ON THE BAND, NOT A MODAL OVER IT ═══
       Owner: "change the player to player trade menu to be like the shopkeeper
       trade menu where it just attaches to the player bag."

       Same frame as Shopkeeper Bro's drawer, deliberately down to the numbers:
       left/right 6 so its edges line up with the bag panel's, bottom pinned to
       --dash-h so it JOINS the band rather than floating over it, and square
       bottom corners for the same reason (a radius there draws the seam the
       layout is avoiding).

       AND NO SCRIM. The scrim was the whole problem: it covered the bag, so
       the bag could not be the item source. Losing it also loses tap-outside-
       to-leave, which is why the ✕ stays exactly where it was and still routes
       through requestLeave -- the leave guard, and its trade2_cancel, are
       untouched. */
    /* v2.3.2280: the frame this state introduced is now TradeDrawer, shared
       with the other five states -- see the shell above. Same markup, same
       numbers; the ✕ still routes through requestLeave (v2.3.1235 §7). */
    <TradeDrawer title={`Trading with ${otherName}`} onClose={requestLeave}>

        {/* v2.3.1235: batch-4 state-correction §6 — "<name> confirmed ✓"
            positive check by their lane header, straight off the
            server's confirmed flag (was "· CONFIRMED" inline). */}
        <div style={{ ...laneHeaderRow, color: '#8D9B98' }}>
          <span>{otherName} offers</span>
          {/* v2.3.2280: under the two-stage flow `confirmed` is only ever set
              on the REVIEW screen, so at the offer stage this header showed
              nothing at all and a player who had readied up looked, from the
              other side, exactly like one who was still shopping. `ready` is
              server state from the same trade2_state echo (trade2.js _t2Wire)
              -- a direct read, not a guess. */}
          {theyConfirmed ? <span style={{ color: '#55B98A' }}>confirmed ✓</span>
            : theyReady ? <span style={{ color: '#55B98A' }}>ready ✓</span> : null}
        </div>
        {/* v2.3.1235: batch-4 rollout — offer wells onto the corrected well
            token #111E23 + .11 hairline (×3 below, incl. the item tray).
            v2.3.2282: the two offer wells split by OWNER -- theirs sunk to
            well-deep, mine raised to well-soft. This lane's order was already
            right (theirs on top) and is deliberately untouched: mp-trade's
            lane reader finds this header and then takes its NEXT SIBLING as
            the well, so moving a header without its well, or wrapping either
            in a new div, makes it silently read the wrong player's pile while
            every presence assertion keeps passing. */}
        <div style={theirWell}>
          {/* v2.3.2283: ink passed EXPLICITLY, not inferred from "this is the
              call site with no handlers" -- same reasoning as tone and well. */}
          <OfferRows offer={trade2.offers[otherId]} weapons={otherWpn} empty="Nothing staged yet" ink={theirInk} />
        </div>

        {/* v2.3.1235: batch-4 state-correction §6 — "Editing offer" while
            my side is editable, "Confirmed ✓" once the server echoes my
            confirm flag. */}
        <div style={{ ...laneHeaderRow, color: '#8D9B98' }}>
          <span>You offer</span>
          <span style={{ color: iConfirmed ? '#55B98A' : '#8D9B98' }}>{iConfirmed ? 'Confirmed ✓' : 'Editing offer'}</span>
        </div>
        <div style={{ ...myWell, marginBottom: 6 }}>
          {/* v2.3.1235: batch-4 state-correction §3/§4 — my rows render my
              staging mirror with Remove controls (existing trade2_set /
              trade2_unstage_weapon pathways); empty copy distinguishes an
              empty BAG ("Your bag is empty" / "You can still offer gold")
              from an unstaged one. */}
          <OfferRows offer={stage} weapons={myWpn}
            inv={inv} onSetQty={setQty}
            onRemoveItem={removeItem}
            onRemoveWeapon={(seq) => send('trade2_unstage_weapon', { seq })}
            empty={bagEmpty ? (
              <span>
                Your bag is empty
                <span style={{ display: 'block', color: '#667875', marginTop: 2 }}>You can still offer gold</span>
              </span>
            ) : 'Tap an item in Bag below to add it'} />
        </div>

        {/* ═══ v2.3.2149: THE IN-WINDOW BAG TRAY IS GONE ═══
            It was "THE item source for this trade (staging never touches the
            dashboard Bag)" -- which is exactly what the owner asked to change:
            "like the shopkeeper trade menu where it just attaches to the player
            bag". Your real bag sits right below this drawer now and its tiles
            stage straight into the offer (tradeBagBus), so a second copy of the
            same bag inside the window would be two bags on one screen
            disagreeing about which one is yours.

            Kept as a caption pointing DOWN at the real one, because a window
            that used to hold the items and now does not needs to say where they
            went. */}
        {bagItems.length > 0 && (
          <div style={{ ...laneHeader, color: '#8D9B98' }}>Tap an item in your bag below to add it</div>
        )}

        {weaponLane && stash.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ ...laneHeader, color: '#8D9B98' }}>
              Your weapons (tap to add) {myWpn.length >= T2_WPN_MAX ? '· max ' + T2_WPN_MAX : ''}
            </div>
            <div className="ls-scrollbody" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 88, overflowY: 'auto' }}>
              {stash.map((w, i) => (
                <button
                  key={i}
                  disabled={myWpn.length >= T2_WPN_MAX}
                  onClick={() => { if (myWpn.length < T2_WPN_MAX) send('trade2_stage_weapon', { stashIdx: i, expectName: w.name }); }}
                  style={{
                    padding: '3px 8px', borderRadius: 8, fontSize: 11,
                    cursor: myWpn.length >= T2_WPN_MAX ? 'not-allowed' : 'pointer',
                    border: '1px solid rgba(154,118,211,.35)',
                    background: 'rgba(154,118,211,.10)',
                    /* v2.3.1235: batch-4 rollout — corrected disabled token. */
                    color: myWpn.length >= T2_WPN_MAX ? '#667875' : '#9A76D3',
                  }}
                >⚔️ {w.name || 'Weapon'}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <GoldIcon />
          {/* v2.3.1235: batch-4 rollout — section-header ramp 11/700 .14em
              muted. */}
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8D9B98' }}>Gold</span>
          {/* v2.3.1235: batch-4 state-correction §5 — numeric mobile keypad
              (inputMode/pattern); the clamp to [0, coins] before the
              existing trade2_set send was already here (input hygiene). */}
          <input
            type="number" min="0" max={coins} inputMode="numeric" pattern="[0-9]*"
            value={stage._gold || 0}
            onChange={(e) => {
              const g = Math.max(0, Math.min(coins, Math.floor(+e.target.value || 0)));
              const next = { ...stage };
              if (g > 0) next._gold = g; else delete next._gold;
              pushStage(next);
            }}
            style={{ width: 76, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(229,237,233,.11)' /* v2.3.1235: batch-4 rollout — well trough + brass tokens */, background: '#111E23', color: '#D8AA58', fontSize: 16 /* v2.3.1233b: iOS zoom guard */, fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right', outline: 'none' }}
          />
          <span style={{ fontSize: 11, color: '#8D9B98', fontVariantNumeric: 'tabular-nums' }}>of {coins}</span>
          {/* v2.3.2286: inline, NOT under the ladder. As its own item in the
              chip row it wrapped to a second line and stretched full width --
              which read as a primary button and, worse, cost ~48px of a drawer
              that is already capped at min(52vh,420px), pushing "Ready to
              trade" below the fold. Beside the field it costs nothing: that
              row had spare width, and this is where the number it clears is. */}
          {(stage._gold || 0) > 0 && (
            <button
              aria-label="Offer no gold"
              onClick={() => { const next = { ...stage }; delete next._gold; pushStage(next); }}
              style={{
                marginLeft: 'auto', flex: '0 0 auto',
                minHeight: 30, padding: '4px 10px', borderRadius: 999,
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                border: '1px solid rgba(229,237,233,.20)',
                background: '#293B41', color: '#B6C1BE',
              }}
            >Clear</button>
          )}
        </div>

        {/* ═══ v2.3.2286: DENOMINATIONS, NOT A KEYPAD ═══
            Owner: "For gold amounts to offer have preset amounts starting at 1
            then 5 then 25, 50, then 100, 500, 1000 then a blank spot to enter."

            THEY ADD, they do not set. The ladder is chip denominations, and the
            "blank spot to enter" is the field above -- which already exists and
            is where you type an exact number. If a chip SET the amount the
            small end would be pointless (nobody offers exactly 1 gold) and 675
            would still need the keyboard; adding lets you build any figure out
            of taps, which is the thing the field is bad at on a phone.

            DISABLED, NOT CLAMPED, when you cannot afford one more. A chip that
            silently added less than it says would make the number under your
            thumb disagree with the number on the chip. Same muted treatment the
            weapon chips use at their cap, so "greyed" already means "at the
            limit" in this panel.

            The clear appears only once there is something to clear -- with
            adding chips a reset is a necessity rather than a nicety, and a
            permanently visible one would sit there saying nothing on the empty
            offer every trade starts in. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {GOLD_STEPS.map((amt) => {
            const over = (stage._gold || 0) + amt > coins;
            return (
              <button
                key={amt}
                disabled={over}
                aria-label={'Offer ' + amt + ' more gold'}
                onClick={() => {
                  if (over) return;
                  const next = { ...stage };
                  next._gold = Math.min(coins, (stage._gold || 0) + amt);
                  pushStage(next);
                }}
                style={{
                  flex: '1 1 auto', minWidth: 38, minHeight: 34,
                  padding: '3px 5px', borderRadius: 999,
                  fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                  cursor: over ? 'not-allowed' : 'pointer',
                  border: '1px solid ' + (over ? 'rgba(229,237,233,.11)' : 'rgba(216,170,88,.35)'),
                  background: over ? 'transparent' : 'rgba(216,170,88,.10)',
                  color: over ? '#667875' : '#D8AA58',
                }}
              >+{amt}</button>
            );
          })}
        </div>

        {/* v2.3.1235: batch-4 state-correction §6 — the server reset both
            confirms after an offer change (see the wire map + detection
            effect above): compact INFO notice, #599FE5, never danger.
            Renders only when that server-driven transition was actually
            relayed. */}
        {offerChanged && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1px solid rgba(89,159,229,.35)', background: 'rgba(89,159,229,.10)', color: '#599FE5', fontSize: 11, fontWeight: 600, padding: '6px 8px', marginBottom: 8 }}>
            Offer changed — review and confirm again
          </div>
        )}

        {/* v2.3.1235: batch-4 state-correction §7 — inline leave-confirm
            strip (pure client UI): [Keep Trading] just dismisses,
            [Leave Trade] is danger-OUTLINE and fires the EXISTING
            trade2_cancel send. */}
        {leaveAsk && (
          <div style={{ borderRadius: 10, border: '1px solid rgba(229,237,233,.11)', background: '#111E23', padding: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#F4F0E7', marginBottom: 6 }}>Leave this trade?</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                style={{ ...secondaryBtn, flex: 1, padding: '6px 0' }}
                onClick={() => setLeaveAsk(false)}
              >Keep Trading</button>
              <button
                style={{ flex: 1, padding: '6px 0', minHeight: 44, borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid #D8635D', background: 'transparent', color: '#D8635D', cursor: 'pointer' }}
                onClick={() => send('trade2_cancel')}
              >Leave Trade</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          {reviewFlow ? (
            /* ═══ v2.3.1754: STAGE ONE — Ready, not Confirm ═══
               Ready commits nothing.  It says "my offer is final", and when
               both sides have said it the server flips the pair to the review
               stage, which is the screen that actually asks for consent. */
            <button
              disabled={confirmDisabled}
              style={{
                flex: 2, padding: '8px 0', minHeight: 44, borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: confirmDisabled ? 'default' : 'pointer',
                border: confirmDisabled ? '1px solid rgba(229,237,233,.11)' : iReady ? '1px solid rgba(229,237,233,.20)' : '1px solid #EAC675',
                background: confirmDisabled ? '#1A292F' : iReady ? '#293B41' : 'linear-gradient(180deg,#E2B765,#D2A14D)',
                color: confirmDisabled ? '#8D9B98' : iReady ? '#55B98A' : '#172126',
              }}
              onClick={() => { if (!confirmDisabled) send('trade2_ready', { ready: !iReady }); }}
            >{confirmDisabled ? 'Add an item or gold' : iReady ? 'Ready ✓ — waiting' : 'Ready to trade'}</button>
          ) : (
          <button
            disabled={confirmDisabled /* v2.3.1235: batch-4 state-correction §3 — real disabled while BOTH sides are fully empty */}
            style={{
              /* v2.3.1232: brass confirm; secondary "waiting" look once locked */
              /* v2.3.1235: batch-4 rollout — Confirm is the surface's ONE
                 gold-gradient primary; once locked it drops to the raised
                 secondary. Cancel stays neutral secondary (never filled
                 red). */
              /* v2.3.1235: batch-4 state-correction §3/§6 — empty-empty
                 shows the approved disabled recipe (opacity 1); a locked
                 confirm reads "Confirmed ✓" in positive #55B98A (NOT
                 brass), with the waiting line moved below. */
              flex: 2, padding: '8px 0', minHeight: 44, borderRadius: 10, fontSize: 13, fontWeight: 700,
              cursor: confirmDisabled ? 'default' : 'pointer',
              border: confirmDisabled ? '1px solid rgba(229,237,233,.11)' : iConfirmed ? '1px solid rgba(229,237,233,.20)' : '1px solid #EAC675',
              background: confirmDisabled ? '#1A292F' : iConfirmed ? '#293B41' : 'linear-gradient(180deg,#E2B765,#D2A14D)',
              color: confirmDisabled ? '#8D9B98' : iConfirmed ? '#55B98A' : '#172126',
              opacity: 1,
            }}
            onClick={() => { if (!iConfirmed) send('trade2_confirm'); }}
          >{confirmDisabled ? 'Add an item or gold' : iConfirmed ? 'Confirmed ✓' : 'Confirm trade'}</button>
          )}
          <button
            style={{ flex: 1, padding: '8px 0', minHeight: 44, borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid rgba(229,237,233,.20)', background: '#293B41', color: '#F4F0E7', cursor: 'pointer' }}
            onClick={requestLeave /* v2.3.1235: batch-4 state-correction §7 — routes through the leave guard; [Leave Trade] fires the same trade2_cancel send */}
          >Cancel</button>
        </div>
        {/* v2.3.1235: batch-4 state-correction §6 — waiting line while my
            confirm is locked and theirs isn't (both read from the last
            server echo; both-confirmed never renders here — the server's
            'done' echo is consumed by gameEvents.js, see wire map). */}
        {iConfirmed && !theyConfirmed && (
          <div style={{ fontSize: 11, color: '#B6C1BE', marginTop: 6 }}>Waiting for {otherName}…</div>
        )}
        <div style={{ fontSize: 10, color: '#8D9B98', marginTop: 6 }}>
          Changing either side resets both confirmations. The server swaps both sides at once — no scams possible.
        </div>
    </TradeDrawer>
  );
}
