import React from 'react';
import { BT_AUDIO } from '@/data/index.js';

/* ═══ InfoPanel — online-count + mute/close utility popup ═══ */
/* v2.3.855: moved verbatim from BroTown.jsx's JSX tree (first UI-panel
   extraction; behavior-frozen). The createElement subtree is unchanged;
   the component reads playerCount / setPlayerCount / setShowInfo / stateRef
   via props (the same component-scope values it closed over inline).
   BT_AUDIO is a module import. */
/* v2.3.1232: Lantern Slate restyle — world-card surface, backdrop-filter
   REMOVED (spec hard lock: no blur on iOS Safari), 44px mute row, quiet
   close. Handlers untouched. */
export function InfoPanel(props) {
  var playerCount = props.playerCount,
    setPlayerCount = props.setPlayerCount,
    setShowInfo = props.setShowInfo,
    stateRef = props.stateRef;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 'calc(var(--dash-h) + 70px)',
      right: 10,
      zIndex: 40,
      padding: '12px 14px',
      borderRadius: 12,
      background: 'rgba(17,25,29,.94)',
      border: '1px solid rgba(238,242,235,.24)',
      boxShadow: '0 14px 30px rgba(4,7,9,.38)',
      minWidth: 140
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
      paddingBottom: 8,
      borderBottom: '1px solid rgba(238,242,235,.10)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "bt-player-dot"
  }), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: '#F7F2E7'
    }
  }, playerCount, " online"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: stateRef.current._realtimeStatus === 'connected' ? '#59BF91' : '#D95C54',
      marginLeft: 4
    }
  }, stateRef.current._realtimeStatus === 'connected' ? '●' : '○')), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      BT_AUDIO.muted = !BT_AUDIO.muted;
      setPlayerCount(function (c) {
        return c;
      });
    },
    style: {
      /* v2.3.1232: secondary raised button, 44px touch target */
      minHeight: 44,
      padding: '8px 12px',
      borderRadius: 11,
      background: '#2B3940',
      border: '1px solid rgba(238,242,235,.14)',
      color: '#F7F2E7',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
      width: '100%'
    }
  }, BT_AUDIO.muted ? '🔇 Unmute' : '🔊 Mute'), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      return setShowInfo(false);
    },
    style: {
      /* v2.3.1232: quiet button */
      marginTop: 6,
      padding: '8px 10px',
      borderRadius: 8,
      background: 'transparent',
      border: 'none',
      color: '#96A2A0',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      width: '100%'
    }
  }, "Close"));
}
