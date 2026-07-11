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
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md §10) —
   world-card gradient + strong border on both cards (backdrop-filter
   removed: iOS hard lock), evt-party invite header, brass replaces
   the off-palette #fbbf24 amber, 44pt Join/Decline. Styles + static
   JSX only; every party_* send and the placement/z stack unchanged. */

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
        zIndex: 30,
        /* v2.3.1232: world card, left-aligned; blur removed */
        background: 'linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94))',
        border: '1px solid rgba(238,242,235,.24)',
        borderRadius: 12, padding: '10px 14px', textAlign: 'left', width: 240,
        boxShadow: '0 14px 30px rgba(4,7,9,.38)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#F7F2E7', marginBottom: 2 }
    }, /* v2.3.1232: UI Bible event icon with emoji fallback */
    /*#__PURE__*/React.createElement("img", {
      src: "/icons/ui/evt-party.webp", alt: "", draggable: false,
      style: { width: 24, height: 24, objectFit: 'contain' },
      onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode('🎟️')); }
    }), /*#__PURE__*/React.createElement("span", null, "Party Invite")), /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 12, color: '#B9C1BF', marginBottom: 8 }
    }, party.fromName, " invites you", party.partySize > 1 ? ' (' + party.partySize + ' in party)' : ''), /*#__PURE__*/React.createElement("div", {
      style: { display: 'flex', gap: 6 }
    }, /*#__PURE__*/React.createElement("button", {
      style: Object.assign({}, _btnBase, {
        /* v2.3.1232: brass accept, 44pt */
        flex: 1, padding: '8px 0', minHeight: 44, borderRadius: 11,
        fontSize: 13, fontWeight: 700, background: '#D8A85F', color: '#20170D'
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
        /* v2.3.1232: raised secondary decline */
        flex: 1, padding: '8px 0', minHeight: 44, borderRadius: 11,
        fontSize: 13, fontWeight: 700,
        background: '#2B3940', color: '#F7F2E7',
        border: '1px solid rgba(238,242,235,.14)'
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
      position: 'absolute', top: 92, left: 8, zIndex: 16, width: 164,
      /* v2.3.1232: world card; blur removed */
      background: 'linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94))',
      border: '1px solid rgba(238,242,235,.24)',
      borderRadius: 12, padding: '5px 6px 6px',
      boxShadow: '0 14px 30px rgba(4,7,9,.38)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: '#D8A85F', fontVariantNumeric: 'tabular-nums' }
  }, "🎟️ PARTY ", party.members.length, "/4"), /*#__PURE__*/React.createElement("button", {
    title: "Leave party",
    style: Object.assign({}, _btnBase, {
      width: 24, height: 24, fontSize: 10, lineHeight: '24px', padding: 0,
      borderRadius: 8,
      background: 'rgba(217,92,84,.12)', color: '#D95C54'
    }),
    onClick: function onClick() { send('party_leave'); }
  }, "✖")), party.members.map(function (m) {
    var frac = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
    /* v2.3.1232: mid tier remapped off-palette #fbbf24 → stamina #D8A94D */
    var barColor = frac > 0.5 ? '#59BF91' : frac > 0.25 ? '#D8A94D' : '#D95C54';
    var zoneName = m.zone && m.zone !== myZone ? ((ZONES[m.zone] && ZONES[m.zone].name) || m.zone) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: { padding: '2px 0', opacity: m.away ? 0.45 : 1 }
    }, /*#__PURE__*/React.createElement("div", {
      style: { display: 'flex', alignItems: 'center', gap: 3 }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1, fontSize: 11, fontWeight: 700, color: m.id === myId ? '#F7F2E7' : '#B9C1BF',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }
    }, m.id === party.leader ? '👑 ' : '', m.dead ? '💀 ' : '', m.name), /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 10, color: '#96A2A0', fontVariantNumeric: 'tabular-nums' }
    }, "Lv", m.level), iAmLeader && m.id !== myId && /*#__PURE__*/React.createElement("button", {
      title: "Kick",
      style: Object.assign({}, _btnBase, {
        width: 24, height: 24, fontSize: 9, lineHeight: '24px', padding: 0,
        borderRadius: 8,
        background: '#2B3940', color: '#96A2A0',
        border: '1px solid rgba(238,242,235,.14)'
      }),
      onClick: function onClick() { send('party_kick', { target: m.id }); }
    }, "✕")), /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1232: spec bar track */
        height: 4, borderRadius: 999, background: '#0B1216',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)',
        overflow: 'hidden', marginTop: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: (frac * 100) + '%', height: '100%', background: barColor,
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.20), transparent 55%)',
        borderRadius: 999,
        transition: 'width .4s ease'
      }
    })), (m.away || zoneName) && /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 10, color: '#96A2A0', marginTop: 1 }
    }, m.away ? 'away — reconnecting…' : '📍 ' + zoneName));
  }));
}
