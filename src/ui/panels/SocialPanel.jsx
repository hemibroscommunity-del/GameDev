import React from 'react';

/* ═══ SocialPanel — friends / muted / blocked lists ═══ */
/* v2.3.860: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged.
   Purely presentational over component state — no data-layer or babel
   imports. 8 props (the three social lists + their setters +
   setShowSocialPanel + stateRef); localStorage is the browser global. */
export function SocialPanel(props) {
  var blockedList = props.blockedList,
    friendsList = props.friendsList,
    mutedList = props.mutedList,
    setBlockedList = props.setBlockedList,
    setFriendsList = props.setFriendsList,
    setMutedList = props.setMutedList,
    setShowSocialPanel = props.setShowSocialPanel,
    stateRef = props.stateRef;
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
      width: 300,
      maxHeight: '80vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowSocialPanel(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#59BF91',
      marginBottom: 8
    }
  }, "\uD83D\uDC65 Social"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#59BF91',
      marginBottom: 4
    }
  }, "\uD83D\uDC9A Friends (", friendsList.length, ")"), friendsList.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "No friends yet. Tap a player and add them!"), friendsList.map(function (f) {
    var _stateRef$current26, _f$name;
    var online = (_stateRef$current26 = stateRef.current) === null || _stateRef$current26 === void 0 || (_stateRef$current26 = _stateRef$current26.others) === null || _stateRef$current26 === void 0 ? void 0 : _stateRef$current26[f.id];
    return /*#__PURE__*/React.createElement("div", {
      key: f.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        marginBottom: 2,
        borderRadius: 6,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: online ? '#59BF91' : '#555'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: f.color || '#888',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 800,
        color: '#fff'
      }
    }, ((_f$name = f.name) === null || _f$name === void 0 ? void 0 : _f$name.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: f.color || '#fff'
      }
    }, f.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, online ? 'Online · ' + online.zone : 'Offline')), online && /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(216,168,95,.3)',
        background: 'rgba(216,168,95,.1)',
        color: '#a78bfa'
      },
      onClick: function onClick() {
        stateRef.current.player.x = online.x + 40;
        stateRef.current.player.y = online.y + 40;
        setShowSocialPanel(false);
      }
    }, "\uD83D\uDCCD TP"), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(217,92,84,.3)',
        background: 'rgba(217,92,84,.08)',
        color: '#D95C54'
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
    }, "\u2715"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#D95C54',
      marginBottom: 4
    }
  }, "\uD83D\uDEAB Blocked (", blockedList.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)',
      marginBottom: 4
    }
  }, "Blocked players can't chat, attack, trade, or duel you."), blockedList.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Nobody blocked."), blockedList.map(function (bid) {
    var _stateRef$current27;
    var o = (_stateRef$current27 = stateRef.current) === null || _stateRef$current27 === void 0 || (_stateRef$current27 = _stateRef$current27.others) === null || _stateRef$current27 === void 0 ? void 0 : _stateRef$current27[bid];
    var name = (o === null || o === void 0 ? void 0 : o.name) || bid.slice(0, 12) + '...';
    return /*#__PURE__*/React.createElement("div", {
      key: bid,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 6px',
        marginBottom: 2,
        borderRadius: 4,
        background: 'rgba(217,92,84,.05)',
        border: '1px solid rgba(217,92,84,.1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 8,
        color: '#D95C54'
      }
    }, name), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(61,220,151,.3)',
        background: 'rgba(61,220,151,.08)',
        color: '#59BF91'
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
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#D8A94D',
      marginBottom: 4
    }
  }, "\uD83D\uDD07 Muted (", mutedList.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)',
      marginBottom: 4
    }
  }, "Muted players' chat appears as [muted]. They can still interact with you."), mutedList.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Nobody muted."), mutedList.map(function (mid) {
    var _stateRef$current28;
    var o = (_stateRef$current28 = stateRef.current) === null || _stateRef$current28 === void 0 || (_stateRef$current28 = _stateRef$current28.others) === null || _stateRef$current28 === void 0 ? void 0 : _stateRef$current28[mid];
    var name = (o === null || o === void 0 ? void 0 : o.name) || mid.slice(0, 12) + '...';
    return /*#__PURE__*/React.createElement("div", {
      key: mid,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 6px',
        marginBottom: 2,
        borderRadius: 4,
        background: 'rgba(216,169,77,.05)',
        border: '1px solid rgba(216,169,77,.1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 8,
        color: '#D8A94D'
      }
    }, name), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(61,220,151,.3)',
        background: 'rgba(61,220,151,.08)',
        color: '#59BF91'
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
  }))));
}
