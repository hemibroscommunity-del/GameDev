import React, { useState, useEffect } from 'react';

/* === PartyRosterPanel — the party frame + invite popup (v2.3.1175) === */
/* Handoff item D: a party is a ROSTER, nothing more — kill credit is
   already damage-contribution server-side (GDD §7), so this panel is a
   pure renderer of the last party_state snapshot (trade2_state
   posture) and every button just sends a party_* command.  The `party`
   prop is either the incoming-invite stub ({invite:true, from,
   fromName, size}) or the server roster ({id, leader, members[],
   state:'active'}).  NOT the arena's PartyPanel (buildings/) — that
   name was taken by the Tavern tournament UI long before this system
   existed; this file is the actual player grouping. */

export function PartyRosterPanel(props) {
  const { stateRef, party, setParty } = props;
  const S = stateRef.current;
  const myId = S.myId;
  const send = (event, payload) => {
    try { S.channel.send({ type: 'broadcast', event, payload: payload || {} }); } catch (e) {}
  };

  // The roster re-renders on snapshot changes only, but member HP and
  // zones live on S.others and move every tick — a 1s repaint keeps
  // the frame honest without wiring the panel into the render loop.
  const [, setBeat] = useState(0);
  useEffect(() => {
    if (!party || party.invite || party.state !== 'active') return undefined;
    const t = setInterval(() => setBeat((b) => b + 1), 1000);
    return () => clearInterval(t);
  }, [party]);

  if (!party) return null;

  // ── Incoming invite popup ──
  if (party.invite) {
    return (
      <div className="bt-inspect" onClick={() => setParty(null)}>
        <div className="bt-inspect-card" onClick={(e) => e.stopPropagation()} style={{ width: 240 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#3dd497', marginBottom: 4 }}>
            🎉 {party.fromName} invited you to a party
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginBottom: 8 }}>
            {party.size > 1 ? party.size + ' members · ' : ''}Shared adventures — XP already splits by damage dealt.
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 10, fontWeight: 800, border: '1px solid rgba(61,212,151,.4)', background: 'rgba(61,212,151,.15)', color: '#3dd497', cursor: 'pointer' }}
              onClick={() => { send('party_accept', { from: party.from }); setParty(null); }}
            >Join party</button>
            <button
              style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 10, fontWeight: 800, border: '1px solid rgba(255,94,108,.3)', background: 'rgba(255,94,108,.08)', color: '#ff5e6c', cursor: 'pointer' }}
              onClick={() => { send('party_decline', { from: party.from }); setParty(null); }}
            >Decline</button>
          </div>
        </div>
      </div>
    );
  }

  if (party.state !== 'active' || !party.members) return null;

  // ── The roster frame — compact, non-blocking, touch-sized rows ──
  const iAmLeader = party.leader === myId;
  const myZone = S.currentZone || 'town';
  return (
    <div style={{
      position: 'fixed', left: 8, top: '34%', width: 148, zIndex: 40,
      borderRadius: 8, padding: '5px 6px',
      background: 'rgba(10,14,26,.82)', border: '1px solid rgba(61,212,151,.25)',
      backdropFilter: 'blur(4px)', pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#3dd497', flex: 1 }}>
          🎉 PARTY {party.members.length}/4
        </span>
        <button
          style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(255,94,108,.3)', background: 'rgba(255,94,108,.08)', color: '#ff5e6c', cursor: 'pointer' }}
          onClick={() => send('party_leave')}
        >Leave</button>
      </div>
      {party.members.map((m) => {
        const live = m.id === myId ? null : (S.others && S.others[m.id]);
        const hp = m.id === myId
          ? (S.rpg ? { cur: S.rpg.hp, max: S.rpg.maxHp } : null)
          : (live && live.rpgMaxHp ? { cur: live.rpgHp, max: live.rpgMaxHp } : null);
        const zone = (live && live.zone) || m.z;
        const here = m.id === myId || (zone && zone === myZone);
        return (
          <div key={m.id} style={{ marginBottom: 3, opacity: m.away ? 0.45 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 8 }}>{party.leader === m.id ? '⭐' : here ? '🟢' : '🌍'}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: m.id === myId ? '#3dd497' : '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name}
              </span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,.4)' }}>Lv{m.level}</span>
              {iAmLeader && m.id !== myId && (
                <button
                  style={{ fontSize: 8, padding: '0 3px', borderRadius: 3, border: 'none', background: 'transparent', color: 'rgba(255,94,108,.7)', cursor: 'pointer' }}
                  onClick={() => send('party_kick', { target: m.id })}
                >✕</button>
              )}
            </div>
            {m.away ? (
              <div style={{ fontSize: 7, color: '#fbbf24', paddingLeft: 14 }}>away — reconnecting…</div>
            ) : hp && hp.max > 0 ? (
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.08)', marginTop: 1, marginLeft: 14 }}>
                <div style={{
                  height: 3, borderRadius: 2, width: Math.max(0, Math.min(100, (hp.cur / hp.max) * 100)) + '%',
                  background: hp.cur / hp.max > 0.5 ? '#3dd497' : hp.cur / hp.max > 0.25 ? '#fbbf24' : '#ff5e6c',
                }} />
              </div>
            ) : !here && zone ? (
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,.3)', paddingLeft: 14 }}>{String(zone).replace(/_/g, ' ')}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
