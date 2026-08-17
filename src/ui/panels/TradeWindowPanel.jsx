import React, { useState, useEffect, useRef } from 'react';
/* v2.3.1235: batch-4 state-correction — RARITY_TIERS for staged-weapon
   row rarity (existing data; plain inventory items carry no rarity). */
import { RARITY_TIERS } from '@/data/index.js';

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
const GoldIcon = () => (
  <img src="/icons/popups/gold.webp" alt="" draggable={false}
    style={{ width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px' }}
    onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('💰')); }} />
);

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
function StagedRow({ glyph, name, qty, have, rarityLabel, rarityColor, onRemove, onInc, onDec }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: onRemove ? 44 : 36, padding: '2px 0' }}>
      <div style={{ width: 32, height: 32, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: '#16262C', border: '1px solid rgba(229,237,233,.08)', borderRadius: 8 }}>{glyph}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#B6C1BE', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        {rarityLabel ? (
          <div style={{ fontSize: 10, color: rarityColor || '#8B9695' }}>{rarityLabel}</div>
        ) : null}
      </div>
      {qty != null && !onInc && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#B6C1BE', fontVariantNumeric: 'tabular-nums' }}>×{qty}</div>
      )}
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
function OfferRows({ offer, weapons, empty, onRemoveItem, onRemoveWeapon, goldSuffix, inv, onSetQty }) {
  const entries = Object.entries(offer || {}).filter(([k, v]) => k !== '_gold' && v > 0);
  const gold = (offer && offer._gold) || 0;
  const wpns = weapons || [];
  if (!entries.length && !gold && !wpns.length) {
    return <div style={{ fontSize: 11, color: '#8D9B98', padding: '8px 0' }}>{empty}</div>;
  }
  return (
    <div className="ls-scrollbody" style={{ maxHeight: 148, overflowY: 'auto' }}>
      {entries.map(([k, v]) => (
        <StagedRow key={k} glyph={emojiFor(k)} name={labelFor(k)} qty={v}
          have={inv ? (inv[k] || 0) : null}
          onRemove={onRemoveItem ? () => onRemoveItem(k) : null}
          onInc={onSetQty ? () => onSetQty(k, v + 1) : null}
          onDec={onSetQty ? () => onSetQty(k, v - 1) : null} />
      ))}
      {wpns.map((w) => {
        const rt = (w.weapon && RARITY_TIERS[w.weapon.tier]) || null;
        return (
          <StagedRow key={'w' + w.seq} glyph="⚔️" name={wpnName(w)}
            rarityLabel={rt ? rt.label : null} rarityColor={rt ? rt.color : null}
            onRemove={onRemoveWeapon ? () => onRemoveWeapon(w.seq) : null} />
        );
      })}
      {gold > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '2px 0' }}>
          <div style={{ width: 32, height: 32, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#16262C', border: '1px solid rgba(229,237,233,.08)', borderRadius: 8 }}><GoldIcon /></div>
          <div style={{ flex: 1, fontSize: 12, color: '#B6C1BE' }}>Gold</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#D8AA58', fontVariantNumeric: 'tabular-nums' }}>{gold}{goldSuffix || ''}</div>
        </div>
      )}
    </div>
  );
}

export function TradeWindowPanel(props) {
  const { rpgState, stateRef, trade2, setTrade2 } = props;
  const S = stateRef.current;
  const myId = S.myId;
  const [stage, setStage] = useState({});
  /* v2.3.1235: batch-4 state-correction §7 — leave-confirm strip (pure
     client UI, no wire message of its own) and §6 offer-changed notice
     (display of the server's confirm-reset, see wire map above). */
  const [leaveAsk, setLeaveAsk] = useState(false);
  const [offerChanged, setOfferChanged] = useState(false);
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

  if (!trade2) return null;

  /* v2.3.1232: shared Lantern Slate surfaces for this panel's cards */
  /* v2.3.1235: batch-4 rollout — decision-surface card = sheet token at
     radius 14 + strong hairline (matches the corrected incoming-trade
     banner); primary = committed gold-gradient recipe (#EAC675 edge,
     #172126 ink, radius 10); secondary = raised #293B41 + strong
     hairline. */
  const cardStyle = {
    background: '#1E2E34',
    border: '1px solid rgba(229,237,233,.20)',
    borderRadius: 14,
    boxShadow: '0 14px 30px rgba(4,7,9,.38)',
    textAlign: 'left',
  };
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
  /* v2.3.1235: trade-completion receipt — laneHeader + wellStyle hoisted
     above the state renders (values unchanged) so the receipt reuses the
     exact live-window section-header and recessed-well recipes. */
  const laneHeader = { fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 3 };
  /* v2.3.1235: batch-4 state-correction §3 — recessed offer well */
  const wellStyle = { borderRadius: 8, background: '#111E23', border: '1px solid rgba(229,237,233,.11)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)', padding: '2px 6px', marginBottom: 8 };

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
      <div className="bt-inspect" style={{ background: 'rgba(4,9,12,0.52)' }} onClick={() => setTrade2(null)}>
        <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#55B98A', marginBottom: 8 }}>
            <TradeIcon /> Trade complete ✓
          </div>
          <div style={{ ...laneHeader, color: '#8D9B98' }}>You sent</div>
          <div style={wellStyle}>
            <OfferRows offer={r.sent} weapons={r.sentWeapons} empty="Nothing" goldSuffix="G" />
          </div>
          <div style={{ ...laneHeader, color: '#8D9B98' }}>You received</div>
          <div style={wellStyle}>
            <OfferRows offer={r.received} weapons={r.receivedWeapons} empty="Nothing" goldSuffix="G" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ ...laneHeader, marginBottom: 0, color: '#8D9B98' }}>Balance</span>
            <GoldIcon />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F4F0E7', fontVariantNumeric: 'tabular-nums' }}>{liveCoins}G</span>
          </div>
        </div>
      </div>
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
      <div className="bt-inspect" style={{ background: 'rgba(4,9,12,0.52)' }} onClick={() => setTrade2(null)}>
        <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#F4F0E7', marginBottom: 8 }}>
            <TradeIcon /> Trade
          </div>
          <div style={{ borderRadius: 10, border: '1px solid #D8635D', background: 'transparent', color: '#D8635D', fontSize: 12, fontWeight: 700, padding: '10px 12px' }}>
            Trade failed — nothing was exchanged
          </div>
        </div>
      </div>
    );
  }

  // ── Incoming invite stub ──
  if (trade2.invite) {
    return (
      <div className="bt-inspect" style={{ background: 'rgba(4,9,12,0.52)' /* v2.3.1235: batch-4 rollout — trade decisions take the strong confirm scrim */ }} onClick={() => setTrade2(null)}>
        <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 'min(360px, calc(100vw - 24px))' /* v2.3.1234: was 286 fixed — fill narrow phones, never overflow */ }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#F4F0E7', marginBottom: 10 }}>
            <TradeIcon /> {trade2.fromName} wants to trade
          </div>
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
        </div>
      </div>
    );
  }

  // ── Waiting for the other side to open ──
  if (trade2.state === 'invited') {
    return (
      <div className="bt-inspect" onClick={() => { send('trade2_cancel'); setTrade2(null); }}>
        <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 240 }}>
          {/* v2.3.1235: batch-4 rollout — waiting state stays readable
              secondary text (text-2 token). */}
          <div style={{ fontSize: 12, color: '#B6C1BE' }}>Trade request sent — waiting…</div>
          <button
            style={{ ...secondaryBtn, marginTop: 10, width: '100%', padding: '6px 0' }}
            onClick={() => { send('trade2_cancel'); setTrade2(null); }}
          >Cancel</button>
        </div>
      </div>
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
  /* v2.3.1235: trade-completion receipt — laneHeader + wellStyle moved
     up beside cardStyle (shared with the receipt render); values are
     unchanged. */
  /* v2.3.1235: batch-4 state-correction §6 — lane headers become a
     flex row: lane title left, live status right.  Both statuses are
     direct reads of server state (`confirmed` flags from the last
     trade2_state echo). */
  const laneHeaderRow = { ...laneHeader, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 };

  return (
    <div className="bt-inspect" style={{ background: 'rgba(4,9,12,0.52)' /* v2.3.1235: batch-4 rollout — trade-confirm strong scrim */ }} onClick={requestLeave /* v2.3.1235: batch-4 state-correction §7 — scrim taps route through the leave guard (same trade2_cancel send when nothing is staged) */}>
      <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 320 }}>
        <button className="bt-inspect-close" onClick={requestLeave /* v2.3.1235: batch-4 state-correction §7 */}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#F4F0E7', marginBottom: 8 }}>
          <TradeIcon /> Trading with {otherName}
        </div>

        {/* v2.3.1235: batch-4 state-correction §6 — "<name> confirmed ✓"
            positive check by their lane header, straight off the
            server's confirmed flag (was "· CONFIRMED" inline). */}
        <div style={{ ...laneHeaderRow, color: '#8D9B98' }}>
          <span>{otherName} offers</span>
          {theyConfirmed && <span style={{ color: '#55B98A' }}>confirmed ✓</span>}
        </div>
        {/* v2.3.1235: batch-4 rollout — offer wells onto the corrected well
            token #111E23 + .11 hairline (×3 below, incl. the item tray). */}
        <div style={wellStyle}>
          <OfferRows offer={trade2.offers[otherId]} weapons={otherWpn} empty="Nothing staged yet" />
        </div>

        {/* v2.3.1235: batch-4 state-correction §6 — "Editing offer" while
            my side is editable, "Confirmed ✓" once the server echoes my
            confirm flag. */}
        <div style={{ ...laneHeaderRow, color: '#8D9B98' }}>
          <span>You offer</span>
          <span style={{ color: iConfirmed ? '#55B98A' : '#8D9B98' }}>{iConfirmed ? 'Confirmed ✓' : 'Editing offer'}</span>
        </div>
        <div style={{ ...wellStyle, marginBottom: 6 }}>
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

        {/* v2.3.1235: batch-4 state-correction §3 — the in-modal Bag tray
            is THE item source for this trade (staging never touches the
            dashboard Bag), so it gets a small header and the restrained
            brass source outline. */}
        {bagItems.length > 0 && (
          <div style={{ ...laneHeader, color: '#8D9B98' }}>Bag · tap an item to add</div>
        )}
        <div className="ls-scrollbody" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 6, maxHeight: 120, overflowY: 'auto', background: '#111E23', borderRadius: 8, padding: 4, boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)', border: '1px solid rgba(216,170,88,.42)' /* v2.3.1235: batch-4 state-correction §3 — brass item-source outline */ }}>
          {bagItems.map(([k, v]) => (
            <button
              key={k}
              onClick={() => addOne(k)}
              style={{
                padding: '4px 2px', borderRadius: 8, fontSize: 10, cursor: 'pointer',
                fontVariantNumeric: 'tabular-nums',
                /* v2.3.1232: well-soft cell; brass = staged selection */
                /* v2.3.1235: batch-4 rollout — corrected cell tokens: brass
                   #D8AA58 selection edge on card #24363C; resting cell =
                   corrected well-soft #16262C (INV.tileFill) + .08 tile
                   hairline. */
                border: stage[k] ? '2px solid #D8AA58' : '1px solid rgba(229,237,233,.08)',
                background: stage[k] ? '#24363C' : '#16262C',
                color: stage[k] ? '#F4F0E7' : '#8D9B98',
              }}
            >
              <div style={{ fontSize: 13 }}>{emojiFor(k)}</div>
              <div>{stage[k] ? (stage[k] + '/' + v) : v}</div>
            </button>
          ))}
        </div>

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
      </div>
    </div>
  );
}
