import React from 'react';
import { BT_AUDIO } from '@/data/index.js';

/* ═══ InfoPanel — online-count + mute/close utility popup ═══ */
/* v2.3.855: moved verbatim from BroTown.jsx's JSX tree (first UI-panel
   extraction; behavior-frozen). The createElement subtree is unchanged;
   the component reads playerCount / setPlayerCount / setShowInfo / stateRef
   via props (the same component-scope values it closed over inline).
   BT_AUDIO is a module import. */
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
      padding: '10px 16px',
      borderRadius: 10,
      background: 'rgba(16,24,29,.95)',
      border: '1px solid rgba(255,255,255,.12)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      minWidth: 120
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "bt-player-dot"
  }), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#59BF91'
    }
  }, playerCount, " online"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: stateRef.current._realtimeStatus === 'connected' ? '#59BF91' : '#ef4444',
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
      padding: '6px 12px',
      borderRadius: 6,
      background: 'rgba(255,255,255,.08)',
      border: '1px solid rgba(255,255,255,.12)',
      color: '#fff',
      fontSize: 11,
      cursor: 'pointer',
      width: '100%'
    }
  }, BT_AUDIO.muted ? '🔇 Unmute' : '🔊 Mute'), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      return setShowInfo(false);
    },
    style: {
      marginTop: 6,
      padding: '4px 10px',
      borderRadius: 5,
      background: 'rgba(255,255,255,.04)',
      border: 'none',
      color: 'rgba(255,255,255,.4)',
      fontSize: 9,
      cursor: 'pointer',
      width: '100%'
    }
  }, "Close"));
}
