import React from 'react';
import { createPortal } from 'react-dom';   /* v2.3.1966 */
import { ZONES } from '@/data/index.js';
import { Z_ABOVE_DASH_PROMPT } from '@/ui/zLayers.js';   /* v2.3.1966 */
import { SMALL_ICON } from '../../data/smallIcons.js';   /* v2.3.3279: the owner's party pictures */
import { partyRows, memberOffline, seenAgo } from '../../game/partyRows.js';   /* v2.3.3284: a party that lasts shows six */
import { allyTagShown } from '@/game/alliance.js';   /* v2.3.3313: an alliance's tag in the strip's head */
/* v2.3.3279: the window's marks were emoji (🎟️ 👑 💀 📍), drawn differently on
   every phone; the owner drew them (tools/ui/cut-small-icons.py). */
function partyMark(src, size, title) {
  return React.createElement('img', {
    src: src, alt: title || '', title: title || undefined, draggable: false, width: size, height: size,
    'data-party-mark': title || '',
    style: { display: 'inline-block', width: size, height: size, verticalAlign: '-3px', marginRight: 3, pointerEvents: 'none', objectFit: 'contain' },
  });
}

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

/* v2.3.3284: how long the first tap on ✖ waits for the second */
var LEAVE_ARM_MS = 3000;

var _btnBase = {
  border: 'none', borderRadius: 6, fontWeight: 800, cursor: 'pointer',
  fontFamily: 'inherit'
};

export function PartyHUD(props) {
  var party = props.party,
    setParty = props.setParty,
    stateRef = props.stateRef;
  var S = stateRef.current;
  /* v2.3.3284: you stay in a party until you leave it now, so leaving is two
     taps -- the first turns the ✖ into "Leave?" for LEAVE_ARM_MS */
  var _arm = React.useState(0);
  var leaveArmedAt = _arm[0], setLeaveArmedAt = _arm[1];
  React.useEffect(function () {
    if (!leaveArmedAt) return undefined;
    var t = setTimeout(function () { setLeaveArmedAt(0); }, LEAVE_ARM_MS);
    return function () { clearTimeout(t); };
  }, [leaveArmedAt]);
  if (!party || !S) return null;
  function send(event, payload) {
    try {
      if (S.channel) S.channel.send({ type: 'broadcast', event: event, payload: payload || {} });
    } catch (e) {}
  }

  /* ── incoming invite card ── */
  if (party.invite) {
    /* ═══ v2.3.1966: PORTALED, AND AT 40 ═══
       A party invite that arrived while your dashboard was open was drawn
       BEHIND it, and the Join button was not merely hidden but untappable —
       a real pointer landed on the tray.  Measured at 844x390 (the primary
       platform, iPhone landscape): the tray owns y 125..390 and the card sat
       at y 90..190, so all you got was a 35px sliver of the words "Party
       Invite" above the tray edge and no way to accept.

       src/ui/zLayers.js rule 1, verbatim: "Anything the player must be able
       to READ or TAP while the dashboard is visible goes ABOVE Z_DASHBOARD
       (30). Player-decision prompts must never render under chrome."  An
       invite is the textbook case, and it was sitting ON 30 — a tie, which
       DOM order then loses.  Z_ABOVE_DASH_PROMPT (34) is the registry's named
       rung for exactly this, above the tray and below the contextual
       .bt-interact-prompt at 35.

       RAISING THE Z ALONE DOES NOT FIX IT, and that is the other half of the
       lesson: tried 34's equivalent in place first and the click was still
       intercepted by the tray.  DuelRequestPanel hit the same wall in
       v2.3.1235 and its comment says why — the wrap is its own stacking
       context, so a child's z-index is only meaningful among its siblings.
       The fix it settled on, and the one used here, is to portal to
       document.body so the number means what it says.

       Found by qa-party-smoke, which had been failing on exactly this click,
       unwatched, since the smoke job left the PR path on 2026-07-16. */
    return createPortal(/*#__PURE__*/React.createElement("div", {
      /* v2.3.3253: found by No man's land's "Attack <name>?" window, which
         stacks under it rather than over it (NmlAskCard.jsx cardPlace) */
      'data-party-invite': '',
      style: {
        position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)',
        zIndex: Z_ABOVE_DASH_PROMPT,
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
    }, "Decline"))), document.body);
  }

  if (!party.members || !party.members.length) return null;
  var myId = S.myId;
  var iAmLeader = party.leader === myId;
  var myZone = S.currentZone;
  /* v2.3.3284: at most six rows -- you, the members online nearest you, the
     rest online, then the offline ones most recently seen (partyRows.js) */
  var others = S.others || null;
  var view = partyRows(party.members, myId, S.player ? { x: S.player.x, y: S.player.y, zone: myZone } : null, function (id) {
    var o = others && Object.prototype.hasOwnProperty.call(others, id) ? others[id] : null;
    return o && !o._away && typeof o.x === 'number' ? { x: o.x, y: o.y } : null;
  });
  var maxN = party.max > 0 ? party.max : 4;
  /* v2.3.3313: an alliance says so -- its tag, or ALLIANCE before it has one
     (server alliance.js; party_state's `ally` is the worker's word) */
  /* v2.3.3321: ...and a former clan wears its tag below 20 too (clanparty.js) */
  var _allyA = party.ally && (party.ally.on || (party.ally.clan && allyTagShown(party.ally.tag))) ? party.ally : null;
  var _allyHead = _allyA ? (allyTagShown(_allyA.tag) ? '[' + allyTagShown(_allyA.tag) + ']' : 'ALLIANCE') : null;

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
  }, partyMark(SMALL_ICON.partyMember, 16, 'party'), /*#__PURE__*/React.createElement("span", { 'data-party-head': _allyHead ? (_allyA.on ? 'alliance' : 'clan') : 'party' }, _allyHead || "PARTY", " "), party.members.length, "/", maxN), /*#__PURE__*/React.createElement("button", {
    title: "Leave party",
    'data-party-leave': leaveArmedAt ? 'armed' : '',
    style: Object.assign({}, _btnBase, {
      width: leaveArmedAt ? 'auto' : 24, height: 24, fontSize: 11, lineHeight: '24px', padding: leaveArmedAt ? '0 8px' : 0,
      borderRadius: 8,
      background: leaveArmedAt ? '#D95C54' : 'rgba(217,92,84,.12)', color: leaveArmedAt ? '#20170D' : '#D95C54'
    }),
    onClick: function onClick() {
      /* v2.3.3284: an older worker's party ends at a logout anyway: one tap */
      if (!party.max || leaveArmedAt) { setLeaveArmedAt(0); send('party_leave'); return; }
      setLeaveArmedAt(Date.now());
    }
  }, leaveArmedAt ? "Leave?" : "✖")), view.rows.map(function (m) {
    var offline = memberOffline(m);
    var frac = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
    /* v2.3.1232: mid tier remapped off-palette #fbbf24 → stamina #D8A94D */
    var barColor = frac > 0.5 ? '#59BF91' : frac > 0.25 ? '#D8A94D' : '#D95C54';
    var zoneName = m.zone && m.zone !== myZone ? ((ZONES[m.zone] && ZONES[m.zone].name) || m.zone) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      'data-party-row': offline ? 'off' : 'on',
      style: { padding: '2px 0', opacity: offline ? 0.45 : 1 }
    }, /*#__PURE__*/React.createElement("div", {
      style: { display: 'flex', alignItems: 'center', gap: 3 }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1, fontSize: 11, fontWeight: 700, color: m.id === myId ? '#F7F2E7' : '#B9C1BF',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }
    }, m.id === party.leader ? partyMark(SMALL_ICON.partyLeader, 15, 'leader') : null,
      m.dead ? partyMark(SMALL_ICON.partyDown, 15, 'down') : null, m.name), /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 11, color: '#96A2A0', fontVariantNumeric: 'tabular-nums' }
    }, "Lv", m.level), iAmLeader && m.id !== myId && /*#__PURE__*/React.createElement("button", {
      title: "Kick",
      style: Object.assign({}, _btnBase, {
        width: 24, height: 24, fontSize: 11, lineHeight: '24px', padding: 0, // v2.3.1239: 10px font floor (was 9)
        borderRadius: 8,
        background: '#2B3940', color: '#96A2A0',
        border: '1px solid rgba(238,242,235,.14)'
      }),
      onClick: function onClick() { send('party_kick', { target: m.id }); }
    }, "✕")), /* v2.3.3284: an offline member has no health to show */ !m.off && /*#__PURE__*/React.createElement("div", {
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
    })), (offline || zoneName) && /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 11, color: '#96A2A0', marginTop: 1 }
    }, m.off ? ('offline' + (seenAgo(m.seen) ? ' · ' + seenAgo(m.seen) : '')) : m.away ? 'away — reconnecting…' : React.createElement(React.Fragment, null, partyMark(SMALL_ICON.partyAway, 13, 'elsewhere'), zoneName)));
  }), view.more > 0 && /*#__PURE__*/React.createElement("div", {
    'data-party-more': view.more,
    style: { fontSize: 11, color: '#96A2A0', marginTop: 3, fontVariantNumeric: 'tabular-nums' }
  }, "+", view.more, " more · ", view.online, " online"));
}

