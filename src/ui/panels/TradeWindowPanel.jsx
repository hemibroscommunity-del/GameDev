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

function OfferChips({ offer, empty }) {
  const entries = Object.entries(offer || {}).filter(([k, v]) => k !== '_gold' && v > 0);
  const gold = (offer && offer._gold) || 0;
  if (!entries.length && !gold) {
    return <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', padding: '6px 0' }}>{empty}</div>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '4px 0' }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
          {emojiFor(k)} {labelFor(k)} ×{v}
        </span>
      ))}
      {gold > 0 && (
        <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: 'rgba(245,197,66,.1)', border: '1px solid rgba(245,197,66,.25)', color: '#f5c542' }}>
          💰 {gold}G
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

  // ── Incoming invite stub ──
  if (trade2.invite) {
    return (
      <div className="bt-inspect" onClick={() => setTrade2(null)}>
        <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ width: 240 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#3dd497', marginBottom: 6 }}>
            🤝 {trade2.fromName} wants to trade
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 10, fontWeight: 800, border: '1px solid rgba(61,212,151,.4)', background: 'rgba(61,212,151,.15)', color: '#3dd497', cursor: 'pointer' }}
              onClick={() => send('trade2_open', { target: trade2.from })}
            >Open trade</button>
            <button
              style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 10, fontWeight: 800, border: '1px solid rgba(255,94,108,.3)', background: 'rgba(255,94,108,.08)', color: '#ff5e6c', cursor: 'pointer' }}
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
        <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ width: 220 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Trade request sent — waiting…</div>
          <button
            style={{ marginTop: 8, width: '100%', padding: '6px 0', borderRadius: 6, fontSize: 10, fontWeight: 700, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.6)', cursor: 'pointer' }}
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

  return (
    <div className="bt-inspect" onClick={() => send('trade2_cancel')}>
      <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ width: 320 }}>
        <button className="bt-inspect-close" onClick={() => send('trade2_cancel')}>✕</button>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#3dd497', marginBottom: 6 }}>
          🤝 Trading with {otherName}
        </div>

        <div style={{ fontSize: 9, fontWeight: 700, color: theyConfirmed ? '#3dd497' : 'rgba(255,255,255,.4)', marginBottom: 2 }}>
          {otherName} offers {theyConfirmed ? '· ✅ CONFIRMED' : ''}
        </div>
        <div style={{ borderRadius: 6, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', padding: '2px 6px', marginBottom: 8 }}>
          <OfferChips offer={trade2.offers[otherId]} empty={otherWpn.length ? '' : 'Nothing staged yet'} />
          {otherWpn.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '0 0 4px' }}>
              {otherWpn.map((w) => (
                <span key={w.seq} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: 'rgba(167,139,250,.12)', border: '1px solid rgba(167,139,250,.3)', color: '#a78bfa' }}>⚔️ {wpnName(w)}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: 9, fontWeight: 700, color: iConfirmed ? '#3dd497' : 'rgba(255,255,255,.4)', marginBottom: 2 }}>
          You offer {iConfirmed ? '· ✅ CONFIRMED' : '· tap items to stage'}
        </div>
        <div style={{ borderRadius: 6, background: 'rgba(61,212,151,.04)', border: '1px solid rgba(61,212,151,.15)', padding: '2px 6px', marginBottom: 6 }}>
          <OfferChips offer={stage} empty={myWpn.length ? '' : 'Nothing staged — tap items below'} />
          {myWpn.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '0 0 4px' }}>
              {myWpn.map((w) => (
                <span key={w.seq} onClick={() => send('trade2_unstage_weapon', { seq: w.seq })} title="Remove from trade" style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: 'rgba(167,139,250,.12)', border: '1px solid rgba(167,139,250,.3)', color: '#a78bfa', cursor: 'pointer' }}>⚔️ {wpnName(w)} ✕</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 6, maxHeight: 120, overflowY: 'auto' }}>
          {Object.entries(inv).filter(([k, v]) => v > 0 && k !== 'potions').map(([k, v]) => (
            <button
              key={k}
              onClick={() => cycleItem(k, v)}
              style={{
                padding: '4px 2px', borderRadius: 5, fontSize: 9, cursor: 'pointer',
                border: '1px solid ' + (stage[k] ? 'rgba(61,212,151,.5)' : 'rgba(255,255,255,.08)'),
                background: stage[k] ? 'rgba(61,212,151,.12)' : 'rgba(255,255,255,.03)',
                color: stage[k] ? '#3dd497' : 'rgba(255,255,255,.6)',
              }}
            >
              <div style={{ fontSize: 13 }}>{emojiFor(k)}</div>
              <div>{stage[k] ? (stage[k] + '/' + v) : v}</div>
            </button>
          ))}
        </div>

        {weaponLane && stash.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.4)', marginBottom: 3 }}>
              Your weapons (tap to add) {myWpn.length >= T2_WPN_MAX ? '· max ' + T2_WPN_MAX : ''}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 88, overflowY: 'auto' }}>
              {stash.map((w, i) => (
                <button
                  key={i}
                  disabled={myWpn.length >= T2_WPN_MAX}
                  onClick={() => { if (myWpn.length < T2_WPN_MAX) send('trade2_stage_weapon', { stashIdx: i, expectName: w.name }); }}
                  style={{
                    padding: '3px 6px', borderRadius: 5, fontSize: 9,
                    cursor: myWpn.length >= T2_WPN_MAX ? 'not-allowed' : 'pointer',
                    border: '1px solid rgba(167,139,250,.3)',
                    background: 'rgba(167,139,250,.08)',
                    color: myWpn.length >= T2_WPN_MAX ? 'rgba(255,255,255,.25)' : '#a78bfa',
                  }}
                >⚔️ {w.name || 'Weapon'}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#f5c542' }}>💰 Gold:</span>
          <input
            type="number" min="0" max={coins}
            value={stage._gold || 0}
            onChange={(e) => {
              const g = Math.max(0, Math.min(coins, Math.floor(+e.target.value || 0)));
              const next = { ...stage };
              if (g > 0) next._gold = g; else delete next._gold;
              pushStage(next);
            }}
            style={{ width: 70, padding: '3px 5px', borderRadius: 4, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)', color: '#f5c542', fontSize: 10, fontWeight: 800, textAlign: 'right', outline: 'none' }}
          />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,.3)' }}>of {coins}G</span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            style={{
              flex: 2, padding: '8px 0', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer',
              border: '1px solid ' + (iConfirmed ? 'rgba(255,255,255,.15)' : 'rgba(61,212,151,.5)'),
              background: iConfirmed ? 'rgba(255,255,255,.05)' : 'rgba(61,212,151,.18)',
              color: iConfirmed ? 'rgba(255,255,255,.4)' : '#3dd497',
            }}
            onClick={() => { if (!iConfirmed) send('trade2_confirm'); }}
          >{iConfirmed ? (theyConfirmed ? 'Swapping…' : 'Waiting for ' + otherName + '…') : '✅ Confirm trade'}</button>
          <button
            style={{ flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 10, fontWeight: 700, border: '1px solid rgba(255,94,108,.3)', background: 'rgba(255,94,108,.08)', color: '#ff5e6c', cursor: 'pointer' }}
            onClick={() => send('trade2_cancel')}
          >Cancel</button>
        </div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.25)', marginTop: 5 }}>
          Changing either side resets both confirmations. The server swaps both sides at once — no scams possible.
        </div>
      </div>
    </div>
  );
}
