import React from 'react';
import { EMOTES, TEXT_EMOTES } from '@/data/index.js';

/* === EmotePanel — the showEmotes quick-picker === */
/* v2.3.886: extracted verbatim from the showEmotes JSX subtree in
   BroTown.jsx (the emote / quick-chat picker). Behavior-frozen UI
   decomposition; the `showEmotes &&` gate stays in BroTown. 1 prop:
   sendEmote (a BroTown useCallback). EMOTES / TEXT_EMOTES verified real
   exports; no babel helpers or hoisted temps. */
/* v2.3.1232: Lantern Slate restyle — inline override of the legacy
   .bt-emote-bar blur/black chrome (spec hard lock: no backdrop-filter);
   text quick-chats become 32px pill chips. Handlers untouched. */
export function EmotePanel(props) {
  var sendEmote = props.sendEmote;
  return React.createElement("div", {
    className: "bt-emote-bar",
    style: {
      flexWrap: 'wrap',
      maxWidth: 320,
      background: 'rgba(17,25,29,.94)',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      border: '1px solid rgba(238,242,235,.24)',
      borderRadius: 12,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)'
    }
  }, EMOTES.map(function (e) {
    return /*#__PURE__*/React.createElement("button", {
      key: e,
      className: "bt-emote-btn",
      onTouchStart: function onTouchStart(ev) {
        ev.preventDefault();
        sendEmote(e);
      },
      onMouseDown: function onMouseDown(ev) {
        ev.preventDefault();
        sendEmote(e);
      }
    }, e);
  }), TEXT_EMOTES.map(function (t) {
    return /*#__PURE__*/React.createElement("button", {
      key: t,
      style: {
        /* v2.3.1232: 32px raised pill chip */
        minHeight: 32,
        padding: '4px 12px',
        borderRadius: 999,
        border: '1px solid rgba(238,242,235,.14)',
        background: '#2B3940',
        color: '#F7F2E7',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'Source Sans 3,sans-serif',
        letterSpacing: '.05em'
      },
      onTouchStart: function onTouchStart(ev) {
        ev.preventDefault();
        sendEmote(t);
      },
      onMouseDown: function onMouseDown(ev) {
        ev.preventDefault();
        sendEmote(t);
      }
    }, t);
  }));
}
