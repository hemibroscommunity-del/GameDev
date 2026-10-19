import React from 'react';
import { PlayerIcon } from '@/ui/PlayerIcon.jsx';   /* v2.3.2620 */
import { broCountOf } from '@/networking/broWallet.js';   /* v2.3.3255 */

/* === PlayerListPanel — the showPlayerList modal === */
/* v2.3.886: extracted verbatim from the showPlayerList JSX subtree in
   BroTown.jsx (the online-players list: tap a player to inspect them).
   Behavior-frozen UI decomposition; the `showPlayerList &&` gate stays
   in BroTown. 3 props: playerList (state), setInspectPlayer,
   setShowPlayerList (setters). No data/babel imports; no hoisted
   temps. */
/* v2.3.1232: Lantern Slate touch-up — empty state onto the spec caption
   ink (the bt-plist* chrome itself lives in game.css and already rides
   the v2.3.1230 token flip).  Style only; handlers byte-identical. */
export function PlayerListPanel(props) {
  var playerList = props.playerList,
    setInspectPlayer = props.setInspectPlayer,
    setShowPlayerList = props.setShowPlayerList;
  return React.createElement("div", {
    className: "bt-plist"
  }, /* v2.3.3479: the 2026-10-19 UI review -- the list had NO way to close.
       Only picking a row shut it, so "Find a party" or "Duel a player" with
       nobody near left "No other players nearby" up until a reload, and
       while it was up the game counted a window as open (BroTown `_uiBusy`),
       which kept Mayor Bro's dialogue from opening.  The game's usual ✕
       (its 44 px ring, and Esc on a computer) closes it the way a pick does. */
  /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    "aria-label": "Close",
    "data-esc": "",
    onClick: function onClick() {
      setShowPlayerList(false);
    }
  }, "✕"), playerList.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 10px',
      textAlign: 'center',
      fontSize: 12,
      color: '#96A2A0'
    }
  }, "No other players nearby"), playerList.map(function (p) {
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: "bt-plist-item",
      onTouchStart: function onTouchStart(e) {
        e.preventDefault();
        setInspectPlayer(p);
        setShowPlayerList(false);
      },
      onMouseDown: function onMouseDown(e) {
        e.preventDefault();
        setInspectPlayer(p);
        setShowPlayerList(false);
      }
    }, /* v2.3.2620: was two inline branches (an img.bt-plist-av, or a
         div.bt-plist-dot with the initial).  The marketplace needed the same
         icon and a second copy of the rule is how the two would drift, so the
         rule moved to PlayerIcon and this is now its first caller.  28px and
         24px were the two CSS sizes here; the component draws one disc at the
         avatar's 28 so a row's height no longer depends on whether the player
         owns a Hemi Bro. */
    /*#__PURE__*/React.createElement(PlayerIcon, {
      name: p.name, color: p.color, avatar: p.avatar, size: 28
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "bt-plist-name"
    }, p.name), broCountOf(p.brn) > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bt-plist-sub"
    }, "✓ ", broCountOf(p.brn), " Hemi Bro", broCountOf(p.brn) === 1 ? '' : 's')));
  }));
}
/* v2.3.3255: the sub-line was "Bro #<ID> · Rank #<rank>", reading `p.bro` as
   the Hemi Bro catalogue's object -- which no peer ever had (the join relay
   drops a client's `bro`: server join.js JOIN_COSMETIC_KEYS), so it never
   showed.  The worker's `bro` is the verified worn Bro's NUMBER, and with it
   arriving at last (wsClient.js, the tick's `bro`/`brn`) that line would read
   "Bro #undefined".  It is now the worker's own count: "✓ 3 Hemi Bros". */
