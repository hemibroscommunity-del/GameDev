import React from 'react';

/* ═══ SocialPanel — friends / muted / blocked lists ═══ */
/* v2.3.860: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged.
   Purely presentational over component state — no data-layer or babel
   imports. 8 props (the three social lists + their setters +
   setShowSocialPanel + stateRef); localStorage is the browser global. */
/* v2.3.1232: Lantern Slate restyle — panel surface, nav-friends title
   icon, 11/600 uppercase section headers, recessed well per list, 44px
   rows with 32px secondary/destructive actions, real empty states.
   Handlers untouched. */
export function SocialPanel(props) {
  var blockedList = props.blockedList,
    friendsList = props.friendsList,
    mutedList = props.mutedList,
    setBlockedList = props.setBlockedList,
    setFriendsList = props.setFriendsList,
    setMutedList = props.setMutedList,
    setShowSocialPanel = props.setShowSocialPanel,
    stateRef = props.stateRef;
  /* v2.3.1232: shared well style for the three lists */
  var wellStyle = {
    padding: 6,
    borderRadius: 10,
    background: '#121B20',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)'
  };
  var sectionHeadStyle = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '.12em',
    color: '#96A2A0',
    marginBottom: 6
  };
  var emptyStyle = {
    fontSize: 12.5,
    color: '#96A2A0',
    textAlign: 'center',
    padding: '12px 8px'
  };
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowSocialPanel(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 300 fixed — fill narrow phones, never overflow */
      maxHeight: '80vh',
      overflowY: 'auto',
      /* v2.3.1232: override legacy navy card with Lantern panel surface */
      background: '#202C32',
      border: '1px solid rgba(238,242,235,.14)',
      borderRadius: 14,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowSocialPanel(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: panel title row — icon + 13/700 uppercase title */
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      paddingBottom: 8,
      borderBottom: '1px solid rgba(238,242,235,.10)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/nav-friends.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('👥'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F7F2E7'
    }
  }, "Social")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: sectionHeadStyle
  }, "Friends (", friendsList.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: wellStyle
  }, friendsList.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: emptyStyle
  }, "No friends yet. Tap a player and add them!"), friendsList.map(function (f) {
    var _stateRef$current26, _f$name;
    var online = (_stateRef$current26 = stateRef.current) === null || _stateRef$current26 === void 0 || (_stateRef$current26 = _stateRef$current26.others) === null || _stateRef$current26 === void 0 ? void 0 : _stateRef$current26[f.id];
    return /*#__PURE__*/React.createElement("div", {
      key: f.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 6px',
        minHeight: 44,
        borderBottom: '1px solid rgba(238,242,235,.10)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: online ? '#59BF91' : '#687575',
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: f.color || '#888',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 800,
        color: '#F7F2E7',
        flexShrink: 0
      }
    }, ((_f$name = f.name) === null || _f$name === void 0 ? void 0 : _f$name.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: f.color || '#F7F2E7',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, f.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#96A2A0'
      }
    }, online ? 'Online · ' + online.zone : 'Offline')), online && /*#__PURE__*/React.createElement("button", {
      style: {
        /* v2.3.1232: secondary raised chip */
        minHeight: 32,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(238,242,235,.14)',
        background: '#2B3940',
        color: '#F7F2E7',
        flexShrink: 0
      },
      onClick: function onClick() {
        stateRef.current.player.x = online.x + 40;
        stateRef.current.player.y = online.y + 40;
        setShowSocialPanel(false);
      }
    }, "📍 TP"), /*#__PURE__*/React.createElement("button", {
      style: {
        /* v2.3.1232: destructive remove */
        width: 32,
        height: 32,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid #C7655F',
        background: '#7C3431',
        color: '#FFF1EE',
        flexShrink: 0,
        padding: 0
      },
      onClick: function onClick() {
        var updated = friendsList.filter(function (fr) {
          return fr.id !== f.id;
        });
        setFriendsList(updated);
        try {
          localStorage.setItem('bt_friends', JSON.stringify(updated));
        } catch (e) {}
      }
    }, "✕"));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: sectionHeadStyle
  }, "Blocked (", blockedList.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
      marginBottom: 6
    }
  }, "Blocked players can't chat, attack, trade, or duel you."), /*#__PURE__*/React.createElement("div", {
    style: wellStyle
  }, blockedList.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: emptyStyle
  }, "Nobody blocked."), blockedList.map(function (bid) {
    var _stateRef$current27;
    var o = (_stateRef$current27 = stateRef.current) === null || _stateRef$current27 === void 0 || (_stateRef$current27 = _stateRef$current27.others) === null || _stateRef$current27 === void 0 ? void 0 : _stateRef$current27[bid];
    var name = (o === null || o === void 0 ? void 0 : o.name) || bid.slice(0, 12) + '...';
    return /*#__PURE__*/React.createElement("div", {
      key: bid,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 6px',
        minHeight: 44,
        borderBottom: '1px solid rgba(238,242,235,.10)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 13,
        color: '#B9C1BF',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, name), /*#__PURE__*/React.createElement("button", {
      style: {
        minHeight: 32,
        padding: '4px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(238,242,235,.14)',
        background: '#2B3940',
        color: '#F7F2E7',
        flexShrink: 0
      },
      onClick: function onClick() {
        var updated = blockedList.filter(function (b) {
          return b !== bid;
        });
        setBlockedList(updated);
        try {
          localStorage.setItem('bt_blocked', JSON.stringify(updated));
        } catch (e) {}
      }
    }, "Unblock"));
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: sectionHeadStyle
  }, "Muted (", mutedList.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
      marginBottom: 6
    }
  }, "Muted players' chat appears as [muted]. They can still interact with you."), /*#__PURE__*/React.createElement("div", {
    style: wellStyle
  }, mutedList.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: emptyStyle
  }, "Nobody muted."), mutedList.map(function (mid) {
    var _stateRef$current28;
    var o = (_stateRef$current28 = stateRef.current) === null || _stateRef$current28 === void 0 || (_stateRef$current28 = _stateRef$current28.others) === null || _stateRef$current28 === void 0 ? void 0 : _stateRef$current28[mid];
    var name = (o === null || o === void 0 ? void 0 : o.name) || mid.slice(0, 12) + '...';
    return /*#__PURE__*/React.createElement("div", {
      key: mid,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 6px',
        minHeight: 44,
        borderBottom: '1px solid rgba(238,242,235,.10)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 13,
        color: '#B9C1BF',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, name), /*#__PURE__*/React.createElement("button", {
      style: {
        minHeight: 32,
        padding: '4px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(238,242,235,.14)',
        background: '#2B3940',
        color: '#F7F2E7',
        flexShrink: 0
      },
      onClick: function onClick() {
        var updated = mutedList.filter(function (m) {
          return m !== mid;
        });
        setMutedList(updated);
        try {
          localStorage.setItem('bt_muted', JSON.stringify(updated));
        } catch (e) {}
      }
    }, "Unmute"));
  })))));
}
