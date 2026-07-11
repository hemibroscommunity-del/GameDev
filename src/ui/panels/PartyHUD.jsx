import React from 'react';
import { ZONES } from '@/data/index.js';

/* === PartyHUD — the party roster overlay (v2.3.1185, handoff item D) ===

   Pure renderer of server truth: the `party` prop is either the last
   party_state snapshot ({id, leader, members:[...]}) or the
   incoming-invite stub ({invite:true, from, fromName, partySize}); every
   button just sends a party_* command and the next party_state echo
   moves the UI (same posture as TradeWindowPanel).  The server re-echoes
   the roster ~every 2s, which is what keeps member HP bars and zone tags
   live even when they're in another zone.

   NOT the tavern's PartyPanel (panels/buildings/PartyPanel.jsx) — that
   name was already taken by the arena spectator-betting UI; ironically
   the tavern building's own label ("Form parties") is the promise THIS
   component finally keeps.

   Placement: compact strip pinned top-left BELOW the status-effect
   readout (top 44) and quest tracker (top 56) — WarBanner owns
   top-center, the well-rested badge owns top-right, chat bubbles and
   touch controls own the bottom.  iPhone-Safari-first: every tap
   target ≥24px. */

var _btnBase = {
  border: 'none', borderRadius: 6, fontWeight: 800, cursor: 'pointer',
  fontFamily: 'inherit'
};

export function PartyHUD(props) {
  var party = props.party,
    setParty = props.setParty,
    stateRef = props.stateRef;
  var S = stateRef.current;
  if (!party || !S) return null;
  function send(event, payload) {
    try {
      if (S.channel) S.channel.send({ type: 'broadcast', event: event, payload: payload || {} });
    } catch (e) {}
  }

  /* ── incoming invite card ── */
  if (party.invite) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute', top: 90, left: '50%', transform: 'translateX(-50%)',
        zIndex: 30, background: 'rgba(16,24,29,.92)', border: '1.5px solid rgba(251,191,36,.4)',
        borderRadius: 12, padding: '10px 14px', textAlign: 'center', minWidth: 200,
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,.4)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 12, fontWeight: 800, color: '#fbbf24', marginBottom: 2 }
    }, "🎟️ Party Invite"), /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 10, color: 'rgba(255,255,255,.85)', marginBottom: 8 }
    }, party.fromName, " invites you", party.partySize > 1 ? ' (' + party.partySize + ' in party)' : ''), /*#__PURE__*/React.createElement("div", {
      style: { display: 'flex', gap: 6 }
    }, /*#__PURE__*/React.createElement("button", {
      style: Object.assign({}, _btnBase, {
        flex: 1, padding: '8px 0', fontSize: 11, background: '#59BF91', color: '#08130d'
      }),
      onClick: function onClick() {
        send('party_accept', { target: party.from });
        /* the server's party_state echo re-opens the HUD; if the invite
           expired server-side nothing comes back and the card is gone
           either way. */
        setParty(null);
      }
    }, "Join"), /*#__PURE__*/React.createElement("button", {
      style: Object.assign({}, _btnBase, {
        flex: 1, padding: '8px 0', fontSize: 11,
        background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.7)',
        border: '1px solid rgba(255,255,255,.15)'
      }),
      onClick: function onClick() {
        send('party_decline', { target: party.from });
        setParty(null);
      }
    }, "Decline")));
  }

  if (!party.members || !party.members.length) return null;
  var myId = S.myId;
  var iAmLeader = party.leader === myId;
  var myZone = S.currentZone;

  /* ── roster strip ── */
  /* top 92: the left column already stacks the status-effect readout
     (top 44) and the quest tracker (top 56, ~34px tall) — this slots
     under both and stays clear of the bottom-anchored touch controls. */
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute', top: 92, left: 8, zIndex: 16, width: 150,
      background: 'rgba(16,24,29,.78)', border: '1px solid rgba(251,191,36,.25)',
      borderRadius: 10, padding: '5px 6px 6px',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 8, fontWeight: 800, letterSpacing: '.08em', color: '#fbbf24' }
  }, "🎟️ PARTY ", party.members.length, "/4"), /*#__PURE__*/React.createElement("button", {
    title: "Leave party",
    style: Object.assign({}, _btnBase, {
      width: 24, height: 20, fontSize: 9, lineHeight: '20px', padding: 0,
      background: 'rgba(217,92,84,.12)', color: '#D95C54'
    }),
    onClick: function onClick() { send('party_leave'); }
  }, "✖")), party.members.map(function (m) {
    var frac = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
    var barColor = frac > 0.5 ? '#59BF91' : frac > 0.25 ? '#fbbf24' : '#D95C54';
    var zoneName = m.zone && m.zone !== myZone ? ((ZONES[m.zone] && ZONES[m.zone].name) || m.zone) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: { padding: '2px 0', opacity: m.away ? 0.45 : 1 }
    }, /*#__PURE__*/React.createElement("div", {
      style: { display: 'flex', alignItems: 'center', gap: 3 }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1, fontSize: 9, fontWeight: 700, color: m.id === myId ? '#fff' : 'rgba(255,255,255,.85)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }
    }, m.id === party.leader ? '👑 ' : '', m.dead ? '💀 ' : '', m.name), /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 8, color: 'rgba(255,255,255,.5)' }
    }, "Lv", m.level), iAmLeader && m.id !== myId && /*#__PURE__*/React.createElement("button", {
      title: "Kick",
      style: Object.assign({}, _btnBase, {
        width: 20, height: 18, fontSize: 8, lineHeight: '18px', padding: 0,
        background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.45)'
      }),
      onClick: function onClick() { send('party_kick', { target: m.id }); }
    }, "✕")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4, borderRadius: 2, background: 'rgba(255,255,255,.12)',
        overflow: 'hidden', marginTop: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: (frac * 100) + '%', height: '100%', background: barColor,
        transition: 'width .4s ease'
      }
    })), (m.away || zoneName) && /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 7, color: 'rgba(255,255,255,.45)', marginTop: 1 }
    }, m.away ? 'away — reconnecting…' : '📍 ' + zoneName));
  }));
}
