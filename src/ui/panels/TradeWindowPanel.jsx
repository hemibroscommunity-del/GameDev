import React, { useState, useEffect } from 'react';

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

function OfferChips({ offer, empty }) {
  const entries = Object.entries(offer || {}).filter(([k, v]) => k !== '_gold' && v > 0);
  const gold = (offer && offer._gold) || 0;
  if (!entries.length && !gold) {
    return <div style={{ fontSize: 11, color: '#8D9B98', padding: '6px 0' }}>{empty}</div>;
  }
  /* v2.3.1235: batch-4 rollout — offer chips onto the Checkpoint-B
     IncomingTradePanel chip recipe (raised #293B41 pill at radius 999,
     .11 hairline, 12px text; gold amount 14/700 tabular brass). */
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '4px 0' }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ fontSize: 12, color: '#B6C1BE', padding: '2px 8px', borderRadius: 999, background: '#293B41', border: '1px solid rgba(229,237,233,.11)', fontVariantNumeric: 'tabular-nums' }}>
          {emojiFor(k)} {labelFor(k)} ×{v}
        </span>
      ))}
      {gold > 0 && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: '#293B41', border: '1px solid rgba(229,237,233,.11)', color: '#D8AA58', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          <GoldIcon /> {gold}
        </span>
      )}
    </div>
  );
}

export function TradeWindowPanel(props) {
  const { rpgState, stateRef, trade2, setTrade2 } = props;
  const S = stateRef.current;
  const myId = S.myId;
  const [stage, setStage] = useState({});
  const send = (event, payload) => {
    try { S.channel.send({ type: 'broadcast', event, payload: payload || {} }); } catch (e) {}
  };

  // A fresh session (or a session id change) resets the local staging
  // mirror to the server's copy of MY side.
  const sessionId = trade2 && trade2.id;
  useEffect(() => {
    if (trade2 && trade2.offers && trade2.offers[myId]) setStage({ ...trade2.offers[myId] });
    else setStage({});
    /* deps intentionally just the session id: mid-session trade2_state
       echoes must NOT clobber the local staging the player is editing
       (the server echo of our own set would bounce the cursor). */
  }, [sessionId]);

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
  const wpnName = (w) => (w && w.weapon && w.weapon.name) || 'Weapon';

  const pushStage = (next) => {
    setStage(next);
    send('trade2_set', { offer: next });
  };
  const cycleItem = (k, have) => {
    const cur = stage[k] || 0;
    const next = { ...stage };
    const nv = cur >= have ? 0 : cur + Math.max(1, Math.floor(have / 4));
    if (nv > 0) next[k] = Math.min(nv, have); else delete next[k];
    pushStage(next);
  };

  /* v2.3.1232: weapon chip style — magic violet from the semantic set
     (was the off-palette #a78bfa). */
  const wpnChip = { fontSize: 11, padding: '2px 6px', borderRadius: 8, background: 'rgba(154,118,211,.12)', border: '1px solid rgba(154,118,211,.35)', color: '#9A76D3' };
  /* v2.3.1232: module header — 11/600 uppercase per spec typography */
  /* v2.3.1235: batch-4 rollout — corrected section-header ramp 11/700
     .14em; muted #8D9B98, confirmed = corrected positive #55B98A (the
     ✅ emoji was chrome — dropped). */
  const laneHeader = { fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 3 };

  return (
    <div className="bt-inspect" style={{ background: 'rgba(4,9,12,0.52)' /* v2.3.1235: batch-4 rollout — trade-confirm strong scrim */ }} onClick={() => send('trade2_cancel')}>
      <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 320 }}>
        <button className="bt-inspect-close" onClick={() => send('trade2_cancel')}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#F4F0E7', marginBottom: 8 }}>
          <TradeIcon /> Trading with {otherName}
        </div>

        <div style={{ ...laneHeader, color: theyConfirmed ? '#55B98A' : '#8D9B98' }}>
          {otherName} offers {theyConfirmed ? '· CONFIRMED' : ''}
        </div>
        {/* v2.3.1235: batch-4 rollout — offer wells onto the corrected well
            token #111E23 + .11 hairline (×3 below, incl. the item tray). */}
        <div style={{ borderRadius: 8, background: '#111E23', border: '1px solid rgba(229,237,233,.11)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)', padding: '2px 6px', marginBottom: 8 }}>
          <OfferChips offer={trade2.offers[otherId]} empty={otherWpn.length ? '' : 'Nothing staged yet'} />
          {otherWpn.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '0 0 4px' }}>
              {otherWpn.map((w) => (
                <span key={w.seq} style={wpnChip}>⚔️ {wpnName(w)}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...laneHeader, color: iConfirmed ? '#55B98A' : '#8D9B98' }}>
          You offer {iConfirmed ? '· CONFIRMED' : '· tap items to stage'}
        </div>
        <div style={{ borderRadius: 8, background: '#111E23', border: '1px solid rgba(229,237,233,.11)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)', padding: '2px 6px', marginBottom: 6 }}>
          <OfferChips offer={stage} empty={myWpn.length ? '' : 'Nothing staged — tap items below'} />
          {myWpn.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '0 0 4px' }}>
              {myWpn.map((w) => (
                <span key={w.seq} onClick={() => send('trade2_unstage_weapon', { seq: w.seq })} title="Remove from trade" style={{ ...wpnChip, cursor: 'pointer' }}>⚔️ {wpnName(w)} ✕</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 6, maxHeight: 120, overflowY: 'auto', background: '#111E23', borderRadius: 8, padding: 4, boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)' }}>
          {Object.entries(inv).filter(([k, v]) => v > 0 && k !== 'potions').map(([k, v]) => (
            <button
              key={k}
              onClick={() => cycleItem(k, v)}
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 88, overflowY: 'auto' }}>
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
          <input
            type="number" min="0" max={coins}
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

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            style={{
              /* v2.3.1232: brass confirm; secondary "waiting" look once locked */
              /* v2.3.1235: batch-4 rollout — Confirm is the surface's ONE
                 gold-gradient primary; once locked it drops to the raised
                 secondary with readable text-2 "waiting" label. Cancel
                 stays neutral secondary (never filled red). */
              flex: 2, padding: '8px 0', minHeight: 44, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: iConfirmed ? '1px solid rgba(229,237,233,.20)' : '1px solid #EAC675',
              background: iConfirmed ? '#293B41' : 'linear-gradient(180deg,#E2B765,#D2A14D)',
              color: iConfirmed ? '#B6C1BE' : '#172126',
            }}
            onClick={() => { if (!iConfirmed) send('trade2_confirm'); }}
          >{iConfirmed ? (theyConfirmed ? 'Swapping…' : 'Waiting for ' + otherName + '…') : 'Confirm trade'}</button>
          <button
            style={{ flex: 1, padding: '8px 0', minHeight: 44, borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid rgba(229,237,233,.20)', background: '#293B41', color: '#F4F0E7', cursor: 'pointer' }}
            onClick={() => send('trade2_cancel')}
          >Cancel</button>
        </div>
        <div style={{ fontSize: 10, color: '#8D9B98', marginTop: 6 }}>
          Changing either side resets both confirmations. The server swaps both sides at once — no scams possible.
        </div>
      </div>
    </div>
  );
}
