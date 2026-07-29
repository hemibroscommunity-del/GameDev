import React from 'react';
import { BT_AUDIO } from '@/data/index.js';
import { verifyBro, hasWallet, broVerifySupported, onBroState, getBroState, BRO_PENDING, BRO_OK } from '@/networking/broWallet.js';

/* ═══ InfoPanel — online-count + mute/close utility popup ═══ */
/* v2.3.855: moved verbatim from BroTown.jsx's JSX tree (first UI-panel
   extraction; behavior-frozen). The createElement subtree is unchanged;
   the component reads playerCount / setPlayerCount / setShowInfo / stateRef
   via props (the same component-scope values it closed over inline).
   BT_AUDIO is a module import. */
/* v2.3.1232: Lantern Slate restyle — world-card surface, backdrop-filter
   REMOVED (spec hard lock: no blur on iOS Safari), 44px mute row, quiet
   close. Handlers untouched. */
/* v2.3.1576: verified-Hemi-Bro row.  Lives here because InfoPanel is the
   game's utility popup and proving ownership is a utility action, not part of
   play.  Deliberately conservative about when it appears: the worker must
   advertise it can settle the check (rule 19), a wallet must exist in this
   browser, and the player must actually be wearing a Bro — a control that
   cannot succeed is worse than no control. */
function BroVerifyRow(props) {
  var stateRef = props.stateRef;
  var S = stateRef.current;
  var _st = React.useState(getBroState());
  var bro = _st[0], setBro = _st[1];
  React.useEffect(function () { return onBroState(setBro); }, []);

  var wornId = S && S.myBroData && S.myBroData.ID;
  if (!broVerifySupported(S) || !wornId) return null;

  var verified = !!(S && S.rpg && S.rpg._bro) || bro.status === BRO_OK;
  var busy = bro.status === BRO_PENDING;

  var label = verified ? '\u2713 Hemi Bro #' + wornId + ' verified'
    : busy ? 'Check your wallet\u2026'
      : hasWallet() ? 'Verify Hemi Bro #' + wornId
        : 'No wallet in this browser';

  return React.createElement('div', {
    style: { marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(238,242,235,.10)' },
  },
  React.createElement('button', {
    disabled: busy || verified || !hasWallet(),
    onClick: function () { verifyBro(S, wornId); },
    style: {
      minHeight: 44, padding: '8px 12px', borderRadius: 11,
      background: verified ? '#22323A' : '#2B3940',
      border: '1px solid ' + (verified ? 'rgba(216,170,88,.55)' : 'rgba(238,242,235,.14)'),
      color: verified ? '#D8AA58' : '#F7F2E7',
      fontSize: 12, fontWeight: 700,
      cursor: (busy || verified || !hasWallet()) ? 'default' : 'pointer',
      width: '100%', opacity: hasWallet() ? 1 : 0.6,
    },
  }, label),
  /* Failures are shown in place rather than thrown away — "not owner" and
     "chain unreachable" mean very different things to the player. */
  bro.error ? React.createElement('div', {
    style: { marginTop: 6, fontSize: 10, lineHeight: 1.35, color: '#D95C54' },
  }, bro.error) : null);
}

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
      fontSize: 10, // v2.3.1239: 10px font floor (was 9)
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
  }, "Close"), /*#__PURE__*/React.createElement(BroVerifyRow, { stateRef: stateRef }));
}
