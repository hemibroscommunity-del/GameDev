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
/* ═══ v2.3.3343: A PICKER YOU CAN REACH, THAT SENDS ONCE ═══
   Its only door was the 😀 in the bottom toolbar hidden since v14
   (MenuBar.jsx, display:none), so nobody could open it.  It opens now from
   the chat box (tap your bro, then the smiley: ChatBubble.jsx) or B on a
   keyboard (desktopControls.js), through window.__broLegacyUI.emotesOpen.
   - Every button sent on touchstart AND mousedown.  React's touchstart is
     passive, so its preventDefault did nothing and a real finger sent the
     emote twice (TRAPS §131).  A button acts on `click` now, once per tap.
   - A title row with a close button, and a tap anywhere else in the play
     area closes it (the chat box's own dismiss layer, `data-emote-dismiss`).
   - 6 emoji to a row at 44 px, the touch floor; the quick lines under them.
   props: sendEmote(emoji), onClose(). */
const BTN = 44;
export function EmotePanel(props) {
  var sendEmote = props.sendEmote;
  var onClose = props.onClose || function () {};
  var stop = function (e) { e.stopPropagation(); };
  return React.createElement(React.Fragment, null,
    React.createElement("div", {
      "data-emote-dismiss": "",
      /* stopped as well: on a computer the world takes a click as an attack */
      onPointerDown: function (e) { e.preventDefault(); e.stopPropagation(); onClose(); },
      style: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 'var(--dash-h)',
        background: 'transparent', zIndex: 33,
      }
    }),
    React.createElement("div", {
      className: "bt-emote-bar",
      "data-emote-picker": "",
      onPointerDown: stop,
      style: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
        padding: '8px 10px 10px',
        width: 'min(92vw, ' + (BTN * 6 + 6 * 5 + 20) + 'px)',
        boxSizing: 'border-box',
        background: 'rgba(17,25,29,.96)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        border: '1px solid rgba(238,242,235,.24)',
        borderRadius: 12,
        boxShadow: '0 14px 30px rgba(4,7,9,.38)',
        fontFamily: 'Source Sans 3,sans-serif',
        color: '#F4F0E7'
      }
    },
    React.createElement("div", {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }
    },
    React.createElement("span", {
      style: { fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#D6C9A8' }
    }, "Emotes"),
    React.createElement("button", {
      type: "button",
      "aria-label": "Close emotes",
      "data-emote-close": "",
      onClick: function () { onClose(); },
      style: {
        width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(229,237,233,.20)',
        background: '#293B41', color: '#B6C1BE', fontSize: 16, lineHeight: '30px', padding: 0, cursor: 'pointer'
      }
    }, "✕")),
    React.createElement("div", {
      style: { display: 'grid', gridTemplateColumns: 'repeat(6, ' + BTN + 'px)', gap: 6, justifyContent: 'center' }
    }, EMOTES.map(function (e) {
      return React.createElement("button", {
        key: e,
        type: "button",
        className: "bt-emote-btn",
        "data-emote": e,
        onClick: function () { sendEmote(e); },
        style: { width: BTN, height: BTN, fontSize: 24 }
      }, e);
    })),
    React.createElement("div", {
      style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }
    }, TEXT_EMOTES.map(function (t) {
      return React.createElement("button", {
        key: t,
        type: "button",
        "data-emote": t,
        onClick: function () { sendEmote(t); },
        style: {
          /* v2.3.1232: 32px raised pill chip; v2.3.3343: 36 -- a thumb's */
          minHeight: 36,
          padding: '4px 12px',
          borderRadius: 999,
          border: '1px solid rgba(238,242,235,.14)',
          background: '#2B3940',
          color: '#F7F2E7',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'Source Sans 3,sans-serif',
          letterSpacing: '.05em'
        }
      }, t);
    }))));
}
