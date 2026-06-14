import React from 'react';
import { EMOTES, TEXT_EMOTES } from '@/data/index.js';

/* === EmotePanel — the showEmotes quick-picker === */
/* v2.3.886: extracted verbatim from the showEmotes JSX subtree in
   BroTown.jsx (the emote / quick-chat picker). Behavior-frozen UI
   decomposition; the `showEmotes &&` gate stays in BroTown. 1 prop:
   sendEmote (a BroTown useCallback). EMOTES / TEXT_EMOTES verified real
   exports; no babel helpers or hoisted temps. */
export function EmotePanel(props) {
  var sendEmote = props.sendEmote;
  return React.createElement("div", {
    className: "bt-emote-bar",
    style: {
      flexWrap: 'wrap',
      maxWidth: 320
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
        padding: '4px 8px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.08)',
        color: '#fff',
        fontSize: 10,
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
