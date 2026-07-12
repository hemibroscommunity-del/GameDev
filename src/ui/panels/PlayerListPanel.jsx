import React from 'react';

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
  }, playerList.length === 0 && /*#__PURE__*/React.createElement("div", {
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
    }, p.avatar ? /*#__PURE__*/React.createElement("img", {
      className: "bt-plist-av",
      src: p.avatar,
      alt: ""
    }) : /*#__PURE__*/React.createElement("div", {
      className: "bt-plist-dot",
      style: {
        background: p.color
      }
    }, p.name.charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "bt-plist-name"
    }, p.name), p.bro && /*#__PURE__*/React.createElement("div", {
      className: "bt-plist-sub"
    }, "Bro #", p.bro.ID, " \xB7 Rank #", p.bro.rank)));
  }));
}
