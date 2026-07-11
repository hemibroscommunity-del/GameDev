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
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md §10) —
   world-card surface with the danger border (#C7655F), evt-threat
   header icon, well countdown track, destructive Call-Guards +
   secondary Ignore at 44pt. Styles + static JSX only; the countdown
   math and both threat_response sends are unchanged. */
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
      /* v2.3.1232: floating world card; danger gets the #C7655F border */
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 300 fixed — fill narrow phones, never overflow */
      background: 'linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94))',
      border: '1px solid #C7655F',
      borderRadius: 12,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '.10em',
      color: '#D95C54',
      marginBottom: 4
    }
  }, /* v2.3.1232: UI Bible event icon with emoji fallback */
  /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/evt-threat.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('💀'));
    }
  }), /*#__PURE__*/React.createElement("span", null, "KILL THREAT")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#B9C1BF',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#F7F2E7'
    }
  }, threatIncoming.fromName), " (Lv", threatIncoming.fromLevel, ") threatens to kill you!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
      marginBottom: 8
    }
  }, "Anyone can attack them without penalty (red 💀 above their head)."), function () {
    var elapsed = Date.now() - threatIncoming.ts;
    var remaining = Math.max(0, threatIncoming.countdown - elapsed);
    var pct = remaining / threatIncoming.countdown * 100;
    var secs = Math.ceil(remaining / 1000);
    var mins = Math.floor(secs / 60);
    var secR = secs % 60;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1232: large value 18/700 tabular */
        fontSize: 18,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: '#D8A94D',
        marginBottom: 4
      }
    }, mins, ":", secR.toString().padStart(2, '0')), /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1232: spec bar track (well + inner shadow, pill radius) */
        height: 6,
        background: '#0B1216',
        borderRadius: 999,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)',
        overflow: 'hidden',
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        borderRadius: 999,
        /* v2.3.1232: stamina→HP semantic fill (old #ea580c mid-stop was
           off-palette) + spec vertical light overlay */
        background: pct > 50 ? '#D8A94D' : '#D95C54',
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.20), transparent 55%)',
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
      /* v2.3.1232: raised secondary */
      flex: 1,
      padding: '8px',
      minHeight: 44,
      borderRadius: 11,
      border: '1px solid rgba(238,242,235,.14)',
      background: '#2B3940',
      color: '#F7F2E7',
      fontWeight: 700,
      fontSize: 13,
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
      pushDmgPopup(S2, S2.player.x, S2.player.y - 30, 'Threat ignored. They can still be attacked.', '#B9C1BF');
    }
  }, "Ignore"), /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1232: destructive confirm — spec #7C3431 / #FFF1EE / #C7655F */
      flex: 1,
      padding: '8px',
      minHeight: 44,
      borderRadius: 11,
      border: '1px solid #C7655F',
      background: '#7C3431',
      color: '#FFF1EE',
      fontWeight: 700,
      fontSize: 13,
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
      pushDmgPopup(S2, S2.player.x, S2.player.y - 30, 'Guards dispatched!', '#59BF91');
      BT_AUDIO.beep(500, 0.1, 0.12, 'sine');
    }
  }, "Call Guards")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#96A2A0',
      marginTop: 6
    }
  }, "If you ignore, their skull turns white — anyone can attack them freely but you keep equipped items. If you call guards, they lose 10% gold and gear is locked for 30 minutes.")));
}
