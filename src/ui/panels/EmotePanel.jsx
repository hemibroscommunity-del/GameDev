import React from 'react';
import { EMOTES, TEXT_EMOTES } from '@/data/index.js';
import { EMOTE_MOVES, EMOTE_MOVE_IDS } from '@/game/emoteMoves.js';   /* v2.3.3392 */
import { seasonOn } from '@/game/season.js';   /* v2.3.3395: Halloween week's Zombie Shuffle */

/* === EmotePanel — the showEmotes quick-picker === */
/* v2.3.886: extracted verbatim from the showEmotes JSX subtree in
   BroTown.jsx (the emote / quick-chat picker). Behavior-frozen UI
   decomposition; the `showEmotes &&` gate stays in BroTown. 1 prop:
   sendEmote (a BroTown useCallback). EMOTES / TEXT_EMOTES verified real
   exports; no babel helpers or hoisted temps. */
/* v2.3.1232: Lantern Slate restyle — inline override of the legacy
   .bt-emote-bar blur/black chrome (spec hard lock: no backdrop-filter);
   text quick-chats become 32px pill chips. Handlers untouched. */
/* ═══ v2.3.3391: A PICKER YOU CAN REACH, THAT SENDS ONCE ═══
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
/* ═══ v2.3.3392: AND YOUR BRO MOVES (game/emoteMoves.js) ═══
   A MOVES tab first: six moments (wave, laugh, flex, shrug, facepalm, cheer)
   and six held until you move (sit, sleep, flop, three dances), each a tile
   with its picture and its name -- the whole bro moves in code
   (rendering/emoteFx.js) and everyone near sees it.  Shown only against a
   worker that keeps poses (`movesOn`, caps.emotemoves); the emoji and the
   quick lines are the second tab.  props: + sendMove(id), movesOn. */
const BTN = 44;
const TAB_KEY = 'bt_emote_tab';
function readTab() {
  try { return localStorage.getItem(TAB_KEY) === 'emoji' ? 'emoji' : 'moves'; } catch (e) { return 'moves'; }
}
export function EmotePanel(props) {
  var sendEmote = props.sendEmote;
  var sendMove = props.sendMove;
  var movesOn = !!(props.movesOn && sendMove);
  var onClose = props.onClose || function () {};
  var stop = function (e) { e.stopPropagation(); };
  var _tab = React.useState(readTab);
  var tab = movesOn ? _tab[0] : 'emoji';
  var setTab = function (t) {
    _tab[1](t);
    try { localStorage.setItem(TAB_KEY, t); } catch (e) { /* a convenience only */ }
  };
  var tabBtn = function (id, label) {
    var on = tab === id;
    return React.createElement("button", {
      key: id,
      type: "button",
      "data-emote-tab": id,
      "aria-pressed": on ? "true" : "false",
      onClick: function () { setTab(id); },
      style: {
        flex: 1, minHeight: 36, borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
        border: '1px solid ' + (on ? 'rgba(214,201,168,.55)' : 'rgba(229,237,233,.16)'),
        background: on ? '#3A4A44' : '#22313A', color: on ? '#F4F0E7' : '#B6C1BE',
        fontSize: 13, fontWeight: 700, letterSpacing: '.05em', fontFamily: 'Source Sans 3,sans-serif'
      }
    }, label);
  };
  var moveTile = function (id) {
    var m = EMOTE_MOVES[id];
    return React.createElement("button", {
      key: id,
      type: "button",
      className: "bt-emote-btn",
      "data-emote-move": id,
      title: m.name,
      onClick: function () { sendMove(id); },
      style: {
        width: BTN, height: BTN + 14, padding: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 1
      }
    },
    React.createElement("span", { style: { fontSize: 22, lineHeight: '26px' } }, m.icon),
    React.createElement("span", {
      style: { fontSize: 9, lineHeight: '11px', fontWeight: 700, color: '#D6C9A8', whiteSpace: 'nowrap', letterSpacing: '.02em', maxWidth: BTN - 2, overflow: 'hidden' }
    }, m.dance ? m.name.replace('Bro ', '') : m.name));
  };
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
      /* v2.3.3402: Esc presses it, and on a computer it says so (game/deskKeys.js) */
      "data-esc": "", "data-key": "Esc", "data-key-at": "hang",
      onClick: function () { onClose(); },
      style: {
        position: 'relative',   /* v2.3.3402: its key cap's anchor */
        width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(229,237,233,.20)',
        background: '#293B41', color: '#B6C1BE', fontSize: 16, lineHeight: '30px', padding: 0, cursor: 'pointer'
      }
    }, "✕")),
    movesOn ? React.createElement("div", {
      style: { display: 'flex', gap: 6 }
    }, tabBtn('moves', 'Moves'), tabBtn('emoji', 'Emoji & lines')) : null,
    tab === 'moves' ? React.createElement("div", {
      "data-emote-moves": "",
      style: { display: 'grid', gridTemplateColumns: 'repeat(6, ' + BTN + 'px)', gap: 6, justifyContent: 'center' }
    }, EMOTE_MOVE_IDS.filter(function (id) { return seasonOn(EMOTE_MOVES[id].season); }).map(moveTile)) : null,   /* v2.3.3395: a season's tile only in its season */
    tab === 'moves' ? React.createElement("div", {
      style: { fontSize: 11, lineHeight: '14px', color: '#9FAEAA', textAlign: 'center' }
    }, "Sit, sleep, flop and the dances last until you move.") : null,
    tab === 'emoji' ? React.createElement("div", {
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
    })) : null,
    tab === 'emoji' ? React.createElement("div", {
      style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }
    }, TEXT_EMOTES.map(function (t) {
      return React.createElement("button", {
        key: t,
        type: "button",
        "data-emote": t,
        onClick: function () { sendEmote(t); },
        style: {
          /* v2.3.1232: 32px raised pill chip; v2.3.3391: 36 -- a thumb's */
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
    })) : null));
}
