import React from 'react';
import { BT_AUDIO } from '@/data/index.js';
import { _objectSpread } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === ThreatIncomingPanel — the PvP threat / call-guards modal === */
/* v2.3.891: extracted verbatim from the threatIncoming JSX subtree in
   BroTown.jsx (the incoming-PvP-threat popup: ignore -> become
   flaggable, or call guards). Behavior-frozen UI decomposition; the
   `threatIncoming && !threatIncoming.responded &&` gate stays in
   BroTown. 3 props: stateRef, threatIncoming (state), setThreatIncoming
   (setter). BT_AUDIO verified real export; _objectSpread babel helper
   imported; no hoisted temps. */
export function ThreatIncomingPanel(props) {
  var stateRef = props.stateRef,
    threatIncoming = props.threatIncoming,
    setThreatIncoming = props.setThreatIncoming;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {}
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 300,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 30,
      marginBottom: 4
    }
  }, "\uD83D\uDC80"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "KILL THREAT"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(255,255,255,.7)',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("b", null, threatIncoming.fromName), " (Lv", threatIncoming.fromLevel, ") threatens to kill you!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, "Anyone can attack them without penalty (red \uD83D\uDC80 above their head)."), function () {
    var elapsed = Date.now() - threatIncoming.ts;
    var remaining = Math.max(0, threatIncoming.countdown - elapsed);
    var pct = remaining / threatIncoming.countdown * 100;
    var secs = Math.ceil(remaining / 1000);
    var mins = Math.floor(secs / 60);
    var secR = secs % 60;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: '#f5c542',
        marginBottom: 4
      }
    }, mins, ":", secR.toString().padStart(2, '0')), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        borderRadius: 3,
        background: pct > 50 ? '#f5c542' : pct > 20 ? '#ea580c' : '#ff5e6c',
        width: pct + '%',
        transition: 'width 1s linear'
      }
    })));
  }(), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: 'rgba(255,255,255,.1)',
      color: '#8890b8',
      fontWeight: 700,
      fontSize: 11,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* IGNORE — threatener gets white skull (still attackable, but victim keeps equipped items on death) */
      var S2 = stateRef.current;
      if (S2.channel) S2.channel.send({
        type: 'broadcast',
        event: 'threat_response',
        payload: {
          target: threatIncoming.fromId,
          from: S2.myId,
          action: 'ignored'
        }
      });
      setThreatIncoming(_objectSpread(_objectSpread({}, threatIncoming), {}, {
        responded: true
      }));
      pushDmgPopup(S2, S2.player.x, S2.player.y - 30, 'Threat ignored. They can still be attacked.', '#8890b8');
    }
  }, "\uD83D\uDEB6 Ignore"), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: '8px',
      borderRadius: 8,
      border: 'none',
      background: '#ff5e6c',
      color: '#fff',
      fontWeight: 700,
      fontSize: 11,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* CALL GUARDS — threatener loses 10% gold + gear locked 30min */
      var S2 = stateRef.current;
      if (S2.channel) S2.channel.send({
        type: 'broadcast',
        event: 'threat_response',
        payload: {
          target: threatIncoming.fromId,
          from: S2.myId,
          action: 'guards'
        }
      });
      setThreatIncoming(_objectSpread(_objectSpread({}, threatIncoming), {}, {
        responded: true
      }));
      pushDmgPopup(S2, S2.player.x, S2.player.y - 30, 'Guards dispatched!', '#3dd497');
      BT_AUDIO.beep(500, 0.1, 0.12, 'sine');
    }
  }, "\u2694\uFE0F Call Guards")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)',
      marginTop: 6
    }
  }, "If you ignore, their skull turns white \u2014 anyone can attack them freely but you keep equipped items. If you call guards, they lose 10% gold and gear is locked for 30 minutes.")));
}
