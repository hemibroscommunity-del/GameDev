import React from 'react';
/* v2.3.1981: unmuting is a server mutation now (server/src/chatmod.js);
   setMuted keeps writing the localStorage mirror this panel reads. */
import { setMuted } from '@/game/chatMute.js';

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
/* v2.3.1235: batch-2 rollout — correction-pass compliance
   (docs/LANTERN-SLATE-SPEC.md + game.css :root). Presentation only,
   every handler byte-identical. v2.3.1232 tokens remapped onto the
   approved v2.3.1235 set (sheet #1E2E34, raised #293B41, well #111E23,
   text #F4F0E7/#B6C1BE/#8D9B98, lines rgba(229,237,233,.11/.20), brass
   #D8AA58, danger #D8635D); row actions grow to 44px hitboxes; the
   remove ✕ becomes a danger OUTLINE (filled red is reserved — never a
   routine action); "📍 TP" drops its emoji (no emoji in chrome);
   maxHeight caps at the .bt-inspect content box so the card never
   slides under the dashboard band. */
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
  /* v2.3.1235: batch-2 rollout — well + shadow from the shared .ui-well
     recipe (game.css); do not mint per-screen grays. */
  var wellStyle = {
    padding: 6,
    borderRadius: 10,
    background: '#111E23',
    boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)'
  };
  /* v2.3.1235: batch-2 rollout — section headers are 11/700 uppercase
     .14em muted per the locked contract. */
  var sectionHeadStyle = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.14em',
    color: '#8D9B98',
    marginBottom: 6
  };
  /* v2.3.1235: batch-2 rollout — empty states read 13/700 secondary
     directly on the surface (no boxes, no odd half-sizes). */
  var emptyStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: '#B6C1BE',
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
      /* v2.3.1235: batch-2 rollout — also cap at 100% of the .bt-inspect
         content box (it reserves dashboard clearance); a bare 80vh can
         exceed the box on short phones and slide under the band. */
      maxHeight: 'min(80vh, 100%)',
      overflowY: 'auto',
      /* v2.3.1235: batch-2 rollout — corrected sheet surface + strong
         hairline + shared .ui-panel shadow (floating modal card). */
      background: '#1E2E34',
      border: '1px solid rgba(229,237,233,.20)',
      borderRadius: 14,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045), 0 14px 36px rgba(3,8,10,0.30)',
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
      borderBottom: '1px solid rgba(229,237,233,.11)'
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
      color: '#F4F0E7'
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
        borderBottom: '1px solid rgba(229,237,233,.11)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: online ? '#55B98A' : '#667875',
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: f.color || '#293B41' /* v2.3.1235: batch-2 rollout — raised-token fallback, no off-token gray (player color itself is game data) */,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700 /* v2.3.1235: batch-2 rollout — 400/600/700 are the only loaded weights */,
        color: '#F4F0E7',
        flexShrink: 0
      }
    }, ((_f$name = f.name) === null || _f$name === void 0 ? void 0 : _f$name.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13 /* v2.3.1235: batch-2 rollout — body is 13, no half-sizes */,
        fontWeight: 600,
        color: f.color || '#F4F0E7',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, f.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, online ? 'Online · ' + online.zone : 'Offline')),
    /* v2.3.1744: the friends-list TP is gone with the inspect card's one
       (owner: "remove it").  This copy was the worse of the two: the row
       right above it prints the friend's ZONE, and the button wrote their
       coordinates into whatever zone YOU were standing in — so the one
       case it looked most useful for (a friend somewhere else) was the one
       case it could not do.  The rest of the time the worker's
       anti-teleport speed cap refused the jump anyway. */
    /*#__PURE__*/React.createElement("button", {
      style: {
        /* v2.3.1235: batch-2 rollout — remove-friend is a routine
           destructive action: danger OUTLINE (border+text #D8635D on
           transparent), never a filled red block; grown to the 44px
           hitbox floor */
        width: 44,
        height: 44,
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid #D8635D',
        background: 'transparent',
        color: '#D8635D',
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
      fontSize: 12 /* v2.3.1235: batch-2 rollout — descriptive copy floor is 12 */,
      color: '#8D9B98',
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
        borderBottom: '1px solid rgba(229,237,233,.11)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 13,
        color: '#B6C1BE',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, name), /*#__PURE__*/React.createElement("button", {
      style: {
        /* v2.3.1235: batch-2 rollout — 44px secondary button (raised fill
           + strong hairline, 10px button radius) per the hitbox floor */
        minHeight: 44,
        padding: '4px 12px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(229,237,233,.20)',
        background: '#293B41',
        color: '#F4F0E7',
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
      fontSize: 12 /* v2.3.1235: batch-2 rollout — descriptive copy floor is 12 */,
      color: '#8D9B98',
      marginBottom: 6
    }
  }, "Muted players' messages don't reach you. Saved to your account, so it follows you between devices. They can still interact with you."), /*#__PURE__*/React.createElement("div", {
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
        borderBottom: '1px solid rgba(229,237,233,.11)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 13,
        color: '#B6C1BE',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, name), /*#__PURE__*/React.createElement("button", {
      style: {
        /* v2.3.1235: batch-2 rollout — 44px secondary button (raised fill
           + strong hairline, 10px button radius) per the hitbox floor */
        minHeight: 44,
        padding: '4px 12px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(229,237,233,.20)',
        background: '#293B41',
        color: '#F4F0E7',
        flexShrink: 0
      },
      onClick: function onClick() {
        /* v2.3.1981: unmute goes to the WORKER (chatMute.js setMuted),
           which deletes the entry from chat_mute:<pid> and resumes fanning
           that player's chat to this socket.  A local-only unmute against
           a chatMute-capable worker would look like it worked and change
           nothing — the worker would still be dropping the lines. */
        setMutedList(setMuted(stateRef.current, mid, false));
      }
    }, "Unmute"));
  })))));
}
