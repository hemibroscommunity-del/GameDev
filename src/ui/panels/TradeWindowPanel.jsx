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
    return <div style={{ fontSize: 11, color: '#96A2A0', padding: '6px 0' }}>{empty}</div>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '4px 0' }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ fontSize: 11, color: '#B9C1BF', padding: '2px 6px', borderRadius: 8, background: '#19252A', border: '1px solid rgba(238,242,235,.08)' }}>
          {emojiFor(k)} {labelFor(k)} ×{v}
        </span>
      ))}
      {gold > 0 && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 8, background: '#19252A', border: '1px solid rgba(238,242,235,.08)', color: '#D8A85F', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
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
  const cardStyle = {
    background: 'linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94))',
    border: '1px solid rgba(238,242,235,.24)',
    borderRadius: 12,
    boxShadow: '0 14px 30px rgba(4,7,9,.38)',
    textAlign: 'left',
  };
  const primaryBtn = {
    minHeight: 44, borderRadius: 11, border: 'none',
    background: '#D8A85F', color: '#20170D', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  const secondaryBtn = {
    minHeight: 44, borderRadius: 11,
    border: '1px solid rgba(238,242,235,.14)',
    background: '#2B3940', color: '#F7F2E7', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };

  // ── Incoming invite stub ──
  if (trade2.invite) {
    return (
      <div className="bt-inspect" onClick={() => setTrade2(null)}>
        <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 286 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#F7F2E7', marginBottom: 10 }}>
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
          <div style={{ fontSize: 12, color: '#B9C1BF' }}>Trade request sent — waiting…</div>
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
  const laneHeader = { fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 3 };

  return (
    <div className="bt-inspect" onClick={() => send('trade2_cancel')}>
      <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 320 }}>
        <button className="bt-inspect-close" onClick={() => send('trade2_cancel')}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#F7F2E7', marginBottom: 8 }}>
          <TradeIcon /> Trading with {otherName}
        </div>

        <div style={{ ...laneHeader, color: theyConfirmed ? '#59BF91' : '#96A2A0' }}>
          {otherName} offers {theyConfirmed ? '· ✅ CONFIRMED' : ''}
        </div>
        <div style={{ borderRadius: 8, background: '#121B20', border: '1px solid rgba(238,242,235,.08)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)', padding: '2px 6px', marginBottom: 8 }}>
          <OfferChips offer={trade2.offers[otherId]} empty={otherWpn.length ? '' : 'Nothing staged yet'} />
          {otherWpn.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '0 0 4px' }}>
              {otherWpn.map((w) => (
                <span key={w.seq} style={wpnChip}>⚔️ {wpnName(w)}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...laneHeader, color: iConfirmed ? '#59BF91' : '#96A2A0' }}>
          You offer {iConfirmed ? '· ✅ CONFIRMED' : '· tap items to stage'}
        </div>
        <div style={{ borderRadius: 8, background: '#121B20', border: '1px solid rgba(238,242,235,.08)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)', padding: '2px 6px', marginBottom: 6 }}>
          <OfferChips offer={stage} empty={myWpn.length ? '' : 'Nothing staged — tap items below'} />
          {myWpn.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '0 0 4px' }}>
              {myWpn.map((w) => (
                <span key={w.seq} onClick={() => send('trade2_unstage_weapon', { seq: w.seq })} title="Remove from trade" style={{ ...wpnChip, cursor: 'pointer' }}>⚔️ {wpnName(w)} ✕</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 6, maxHeight: 120, overflowY: 'auto', background: '#121B20', borderRadius: 8, padding: 4, boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)' }}>
          {Object.entries(inv).filter(([k, v]) => v > 0 && k !== 'potions').map(([k, v]) => (
            <button
              key={k}
              onClick={() => cycleItem(k, v)}
              style={{
                padding: '4px 2px', borderRadius: 8, fontSize: 10, cursor: 'pointer',
                fontVariantNumeric: 'tabular-nums',
                /* v2.3.1232: well-soft cell; brass = staged selection */
                border: stage[k] ? '2px solid #D8A85F' : '1px solid rgba(238,242,235,.08)',
                background: stage[k] ? '#243137' : '#19252A',
                color: stage[k] ? '#F7F2E7' : '#96A2A0',
              }}
            >
              <div style={{ fontSize: 13 }}>{emojiFor(k)}</div>
              <div>{stage[k] ? (stage[k] + '/' + v) : v}</div>
            </button>
          ))}
        </div>

        {weaponLane && stash.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ ...laneHeader, color: '#96A2A0' }}>
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
                    color: myWpn.length >= T2_WPN_MAX ? '#687575' : '#9A76D3',
                  }}
                >⚔️ {w.name || 'Weapon'}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <GoldIcon />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#B9C1BF' }}>Gold</span>
          <input
            type="number" min="0" max={coins}
            value={stage._gold || 0}
            onChange={(e) => {
              const g = Math.max(0, Math.min(coins, Math.floor(+e.target.value || 0)));
              const next = { ...stage };
              if (g > 0) next._gold = g; else delete next._gold;
              pushStage(next);
            }}
            style={{ width: 76, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(238,242,235,.14)', background: '#121B20', color: '#D8A85F', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right', outline: 'none' }}
          />
          <span style={{ fontSize: 11, color: '#96A2A0', fontVariantNumeric: 'tabular-nums' }}>of {coins}</span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            style={{
              /* v2.3.1232: brass confirm; secondary "waiting" look once locked */
              flex: 2, padding: '8px 0', minHeight: 44, borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: iConfirmed ? '1px solid rgba(238,242,235,.14)' : 'none',
              background: iConfirmed ? '#2B3940' : '#D8A85F',
              color: iConfirmed ? '#B9C1BF' : '#20170D',
            }}
            onClick={() => { if (!iConfirmed) send('trade2_confirm'); }}
          >{iConfirmed ? (theyConfirmed ? 'Swapping…' : 'Waiting for ' + otherName + '…') : 'Confirm trade'}</button>
          <button
            style={{ flex: 1, padding: '8px 0', minHeight: 44, borderRadius: 11, fontSize: 13, fontWeight: 700, border: '1px solid rgba(238,242,235,.14)', background: '#2B3940', color: '#F7F2E7', cursor: 'pointer' }}
            onClick={() => send('trade2_cancel')}
          >Cancel</button>
        </div>
        <div style={{ fontSize: 10, color: '#96A2A0', marginTop: 6 }}>
          Changing either side resets both confirmations. The server swaps both sides at once — no scams possible.
        </div>
      </div>
    </div>
  );
}
