import React from 'react';
import { BT_AUDIO, PVP_THREAT_BASE_COUNTDOWN, PVP_THREAT_COOLDOWN, REPUTATION, ZONES } from '@/data/index.js';
import { _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

/* === InspectPlayerPanel — the inspectPlayer modal === */
/* v2.3.887: extracted verbatim from the inspectPlayer JSX subtree in
   BroTown.jsx (the player-inspect / social-actions popup: view another
   player's gear and reputation, friend / mute / block them, or open a
   trade). Behavior-frozen UI decomposition; the `inspectPlayer &&` gate
   stays in BroTown. 13 props: stateRef, inspectPlayer/blockedList/
   clanData/friendsList/mutedList (state) and setBlockedList/
   setFriendsList/setInspectPlayer/setMutedList/setShowTrade/
   setTradeOffer/setTradeTarget (setters). Data imports verified real
   exports; slice/spread-array babel helpers imported; the hoisted
   optional-chaining temp set declared locally. */
export function InspectPlayerPanel(props) {
  var stateRef = props.stateRef,
    inspectPlayer = props.inspectPlayer,
    blockedList = props.blockedList,
    clanData = props.clanData,
    friendsList = props.friendsList,
    mutedList = props.mutedList,
    setBlockedList = props.setBlockedList,
    setFriendsList = props.setFriendsList,
    setInspectPlayer = props.setInspectPlayer,
    setMutedList = props.setMutedList,
    setShowTrade = props.setShowTrade,
    setTradeOffer = props.setTradeOffer,
    setTradeTarget = props.setTradeTarget;
  var _REPUTATION$inspectPl, _REPUTATION$inspectPl2, _S$rpg26, _ZONES$stateRef$curre, _inspectPlayer$bro$di, _inspectPlayer$rpgDat, _stateRef$current39;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setInspectPlayer(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 300,
      maxHeight: '85vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setInspectPlayer(null);
    }
  }, "\u2715"), inspectPlayer.avatar ? /*#__PURE__*/React.createElement("img", {
    className: "bt-inspect-av",
    src: inspectPlayer.avatar,
    alt: "",
    style: {
      borderColor: inspectPlayer.color
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: '50%',
      background: inspectPlayer.color,
      margin: '0 auto 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 24,
      fontWeight: 800,
      color: '#fff',
      border: '2.5px solid ' + inspectPlayer.color
    }
  }, inspectPlayer.name.charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-name",
    style: {
      color: inspectPlayer.color
    }
  }, inspectPlayer.clanTag && /*#__PURE__*/React.createElement("span", {
    style: {
      color: inspectPlayer.clanColor1 || '#a78bfa'
    }
  }, "[", inspectPlayer.clanTag, "] "), inspectPlayer.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, inspectPlayer.rpgLv && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#f5c542'
    }
  }, "Lv ", inspectPlayer.rpgLv), inspectPlayer.rep && inspectPlayer.rep !== 'neutral' && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: ((_REPUTATION$inspectPl = REPUTATION[inspectPlayer.rep]) === null || _REPUTATION$inspectPl === void 0 ? void 0 : _REPUTATION$inspectPl.color) || '#888'
    }
  }, ((_REPUTATION$inspectPl2 = REPUTATION[inspectPlayer.rep]) === null || _REPUTATION$inspectPl2 === void 0 ? void 0 : _REPUTATION$inspectPl2.label) || inspectPlayer.rep), inspectPlayer.pet && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14
    }
  }, inspectPlayer.pet)), inspectPlayer.rpgData && function () {
    var d = inspectPlayer.rpgData;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 8,
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.08)',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#8890b8',
        marginBottom: 4
      }
    }, "Equipment"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2px 8px',
        fontSize: 8,
        color: 'rgba(255,255,255,.5)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "\u2694\uFE0F Weapon"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#fff',
        textAlign: 'right'
      }
    }, d.weapon), /*#__PURE__*/React.createElement("span", null, "\uD83D\uDEE1\uFE0F Armor"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#fff',
        textAlign: 'right'
      }
    }, d.armor), d.shield && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDEE1\uFE0F Shield"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#5b52ff',
        textAlign: 'right'
      }
    }, d.shield)), d.amulet && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCFF Amulet"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#f5c542',
        textAlign: 'right'
      }
    }, d.amulet)))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 8,
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.08)',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#8890b8',
        marginBottom: 4
      }
    }, "Tier 1 Stats"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        justifyContent: 'center',
        flexWrap: 'wrap'
      }
    }, [['POW', d.power, '#ff5e6c'], ['VIT', d.vitality, '#3dd497'], ['END', d.endurance, '#f5c542'], ['AGI', d.agility, '#38bdf8'], ['MND', d.mind, '#a78bfa']].map(function (_ref194) {
      var _ref195 = _slicedToArray(_ref194, 3),
        l = _ref195[0],
        v = _ref195[1],
        c = _ref195[2];
      return /*#__PURE__*/React.createElement("div", {
        key: l,
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          background: c + '15',
          border: '1px solid ' + c + '30',
          textAlign: 'center',
          minWidth: 40
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: c,
          fontWeight: 700
        }
      }, l), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 800,
          color: '#fff'
        }
      }, v));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 8,
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.08)',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#8890b8',
        marginBottom: 4
      }
    }, "Record"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 4,
        textAlign: 'center'
      }
    }, [['💀', d.kills, 'Kills'], ['⚔️', d.pvpKills, 'PvP Kills'], ['☠️', d.deaths, 'Deaths'], ['🏆', d.quests, 'Quests'], ['⭐', d.ap, 'AP'], ['⏱️', d.playtime + 'm', 'Played']].map(function (_ref196) {
      var _ref197 = _slicedToArray(_ref196, 3),
        icon = _ref197[0],
        val = _ref197[1],
        label = _ref197[2];
      return /*#__PURE__*/React.createElement("div", {
        key: label,
        style: {
          padding: '3px 0'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12
        }
      }, icon), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: '#fff'
        }
      }, val), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.35)'
        }
      }, label));
    }))), d.clanName && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 6,
        borderRadius: 6,
        background: 'rgba(167,139,250,.08)',
        border: '1px solid rgba(167,139,250,.2)',
        marginBottom: 6,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#a78bfa'
      }
    }, "\uD83C\uDFF0 [", d.clanTag, "] ", d.clanName)));
  }(), inspectPlayer.bro && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-pill"
  }, "Bro #", inspectPlayer.bro.ID), /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-pill",
    style: {
      color: 'var(--teal)'
    }
  }, "DI ", (_inspectPlayer$bro$di = inspectPlayer.bro.diScore) !== null && _inspectPlayer$bro$di !== void 0 && _inspectPlayer$bro$di.toFixed ? inspectPlayer.bro.diScore.toFixed(1) : inspectPlayer.bro.diScore), /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-pill",
    style: {
      color: 'var(--pop)'
    }
  }, "Rank #", inspectPlayer.bro.rank)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1
    },
    onClick: function onClick() {
      var S = stateRef.current;
      S.player.x = inspectPlayer.x + 40;
      S.player.y = inspectPlayer.y + 40;
      setInspectPlayer(null);
    }
  }, "\uD83D\uDCCD TP"), /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      background: '#3dd497'
    },
    onClick: function onClick() {
      /* v2.3.1132: two-sided trade window when the worker supports it
         (trade2_open handshake; both stage, both confirm, server swaps
         atomically).  The one-directional gift panel stays for old
         workers. */
      var _St2 = stateRef.current;
      if (_St2._serverCaps && _St2._serverCaps.trade2 && _St2.channel) {
        try {
          _St2.channel.send({ type: 'broadcast', event: 'trade2_open', payload: { target: inspectPlayer.id } });
        } catch (e) {}
        setInspectPlayer(null);
        return;
      }
      setTradeTarget({
        id: inspectPlayer.id,
        name: inspectPlayer.name
      });
      setTradeOffer({});
      setShowTrade(true);
      setInspectPlayer(null);
    }
  }, "\uD83E\uDD1D Trade"), /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      background: '#a78bfa'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'duel_wager_request',
        payload: {
          target: inspectPlayer.id,
          from: S.myId,
          fromName: S.myName,
          wager: 0
        }
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Duel sent',
        color: '#a78bfa',
        ts: Date.now()
      });
      setInspectPlayer(null);
    }
  }, "\u2694\uFE0F Duel"), /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      background: '#ff5e6c'
    },
    onClick: function onClick() {
      var _S$rpg26;
      var S = stateRef.current;
      if (S._pvpThreatCdUntil && Date.now() < S._pvpThreatCdUntil) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Threat on cooldown',
          color: '#ff5e6c',
          ts: Date.now()
        });
        setInspectPlayer(null);
        return;
      }
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'pvp_threat',
        payload: {
          target: inspectPlayer.id,
          from: S.myId,
          fromName: S.myName,
          fromLevel: ((_S$rpg26 = S.rpg) === null || _S$rpg26 === void 0 ? void 0 : _S$rpg26.level) || 1
        }
      });
      S._pvpSkullType = 'red';
      S._pvpSkullUntil = Date.now() + PVP_THREAT_BASE_COUNTDOWN;
      S._pvpThreatCdUntil = Date.now() + PVP_THREAT_COOLDOWN;
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Threat issued!',
        color: '#ff5e6c',
        ts: Date.now()
      });
      BT_AUDIO.beep(150, 0.15, 0.2, 'sawtooth');
      setInspectPlayer(null);
    }
  }, "\uD83D\uDC80 Threat")), clanData && !((_inspectPlayer$rpgDat = inspectPlayer.rpgData) !== null && _inspectPlayer$rpgDat !== void 0 && _inspectPlayer$rpgDat.clanTag) && /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      marginTop: 6,
      padding: '6px',
      borderRadius: 6,
      border: '1px solid rgba(167,139,250,.3)',
      background: 'rgba(167,139,250,.1)',
      color: '#a78bfa',
      fontSize: 9,
      fontWeight: 700,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'clan_invite',
        payload: {
          target: inspectPlayer.id,
          from: S.myId,
          fromName: S.myName,
          clanName: clanData.name,
          clanTag: clanData.tag
        }
      });
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Clan invite sent',
        color: '#a78bfa',
        ts: Date.now()
      });
      setInspectPlayer(null);
    }
  }, "\uD83C\uDFF0 Invite to [", clanData.tag, "]"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginTop: 6
    }
  }, function () {
    var isFriend = friendsList.some(function (f) {
      return f.id === inspectPlayer.id;
    });
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '5px',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer',
        border: isFriend ? '1px solid rgba(61,220,151,.3)' : '1px solid rgba(255,255,255,.15)',
        background: isFriend ? 'rgba(61,220,151,.1)' : 'rgba(255,255,255,.04)',
        color: isFriend ? '#3dd497' : 'rgba(255,255,255,.5)'
      },
      onClick: function onClick() {
        if (isFriend) {
          var updated = friendsList.filter(function (f) {
            return f.id !== inspectPlayer.id;
          });
          setFriendsList(updated);
          try {
            localStorage.setItem('bt_friends', JSON.stringify(updated));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Removed friend',
            color: '#ff5e6c',
            ts: Date.now()
          });
        } else {
          var _updated = [].concat(_toConsumableArray(friendsList), [{
            id: inspectPlayer.id,
            name: inspectPlayer.name,
            color: inspectPlayer.color,
            addedAt: Date.now()
          }]);
          setFriendsList(_updated);
          try {
            localStorage.setItem('bt_friends', JSON.stringify(_updated));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Added friend!',
            color: '#3dd497',
            ts: Date.now()
          });
          BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
        }
      }
    }, isFriend ? '💚 Friend' : '➕ Add Friend');
  }(), function () {
    var isMuted = mutedList.includes(inspectPlayer.id);
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 0.7,
        padding: '5px',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,.1)',
        background: isMuted ? 'rgba(245,197,66,.1)' : 'rgba(255,255,255,.04)',
        color: isMuted ? '#f5c542' : 'rgba(255,255,255,.4)'
      },
      onClick: function onClick() {
        if (isMuted) {
          var updated = mutedList.filter(function (m) {
            return m !== inspectPlayer.id;
          });
          setMutedList(updated);
          try {
            localStorage.setItem('bt_muted', JSON.stringify(updated));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Unmuted',
            color: '#f5c542',
            ts: Date.now()
          });
        } else {
          var _updated2 = [].concat(_toConsumableArray(mutedList), [inspectPlayer.id]);
          setMutedList(_updated2);
          try {
            localStorage.setItem('bt_muted', JSON.stringify(_updated2));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Muted',
            color: '#f5c542',
            ts: Date.now()
          });
        }
      }
    }, isMuted ? '🔇 Muted' : '🔇 Mute');
  }(), function (_ZONES$stateRef$curre, _stateRef$current39) {
    var isBlocked = blockedList.includes(inspectPlayer.id);
    var isLawless = (_ZONES$stateRef$curre = ZONES[(_stateRef$current39 = stateRef.current) === null || _stateRef$current39 === void 0 ? void 0 : _stateRef$current39.currentZone]) === null || _ZONES$stateRef$curre === void 0 ? void 0 : _ZONES$stateRef$curre.lawless;
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 0.7,
        padding: '5px',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(255,94,108,.2)',
        background: isBlocked ? 'rgba(255,94,108,.15)' : 'rgba(255,255,255,.04)',
        color: isBlocked ? '#ff5e6c' : 'rgba(255,255,255,.4)',
        opacity: !isBlocked && isLawless ? 0.3 : 1
      },
      onClick: function onClick() {
        if (isBlocked) {
          var updated = blockedList.filter(function (b) {
            return b !== inspectPlayer.id;
          });
          setBlockedList(updated);
          try {
            localStorage.setItem('bt_blocked', JSON.stringify(updated));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Unblocked',
            color: '#3dd497',
            ts: Date.now()
          });
        } else {
          if (isLawless) {
            stateRef.current.dmgNumbers.push({
              x: stateRef.current.player.x,
              y: stateRef.current.player.y - 30,
              text: 'Can\'t block in lawless zone!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return;
          }
          var _updated3 = [].concat(_toConsumableArray(blockedList), [inspectPlayer.id]);
          setBlockedList(_updated3);
          try {
            localStorage.setItem('bt_blocked', JSON.stringify(_updated3));
          } catch (e) {}
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Blocked - no interactions',
            color: '#ff5e6c',
            ts: Date.now()
          });
        }
      }
    }, isBlocked ? '🚫 Blocked' : '🚫 Block');
  }())));
}
