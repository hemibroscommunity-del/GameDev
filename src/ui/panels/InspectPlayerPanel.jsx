import React from 'react';
import { BT_AUDIO, PVP_THREAT_BASE_COUNTDOWN, PVP_THREAT_COOLDOWN, REPUTATION, ZONES } from '@/data/index.js';
import { _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
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
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   presentation only: every social/trade/duel/threat handler and every
   caps gate is unchanged. Equipment/stats/record become header+well
   groups instead of outlined boxes; Trade is the region's single brass
   primary; Threat/Block speak the destructive language; the old indigo
   (#a78bfa) and amber (#fbbf24) accents map to the spec magic/stamina
   colors. Player/clan/reputation colors stay — they are content color. */

/* v2.3.1232: Lantern Slate style tokens — local, no shared module. */
var LS_HEADER = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  color: '#96A2A0'
};
var LS_DIVIDER = '1px solid rgba(238,242,235,.10)';
/* full-width secondary action button */
var LS_SECONDARY = {
  minHeight: 44,
  padding: '0 12px',
  borderRadius: 11,
  border: '1px solid rgba(238,242,235,.14)',
  background: 'linear-gradient(180deg, #304047 0%, #2B3940 100%)',
  color: '#F7F2E7',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer'
};

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
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 300 fixed — fill narrow phones, never overflow */
      maxHeight: '85vh',
      overflowY: 'auto',
      background: '#202C32',
      border: '1px solid rgba(238,242,235,.14)',
      borderRadius: 14,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setInspectPlayer(null);
    }
  }, "✕"), inspectPlayer.avatar ? /*#__PURE__*/React.createElement("img", {
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
      fontWeight: 700,
      color: '#F7F2E7',
      border: '2.5px solid ' + inspectPlayer.color
    }
  }, inspectPlayer.name.charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-name",
    style: {
      color: inspectPlayer.color
    }
  }, inspectPlayer.clanTag && /*#__PURE__*/React.createElement("span", {
    style: {
      color: inspectPlayer.clanColor1 || '#9A76D3'
    }
  }, "[", inspectPlayer.clanTag, "] "), inspectPlayer.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10
    }
  }, inspectPlayer.rpgLv && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: '#D8A94D'
    }
  }, "Lv ", inspectPlayer.rpgLv), inspectPlayer.rep && inspectPlayer.rep !== 'neutral' && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: ((_REPUTATION$inspectPl = REPUTATION[inspectPlayer.rep]) === null || _REPUTATION$inspectPl === void 0 ? void 0 : _REPUTATION$inspectPl.color) || '#96A2A0'
    }
  }, ((_REPUTATION$inspectPl2 = REPUTATION[inspectPlayer.rep]) === null || _REPUTATION$inspectPl2 === void 0 ? void 0 : _REPUTATION$inspectPl2.label) || inspectPlayer.rep), inspectPlayer.pet && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14
    }
  }, inspectPlayer.pet)), inspectPlayer.rpgData && function () {
    var d = inspectPlayer.rpgData;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'left',
        borderTop: LS_DIVIDER,
        paddingTop: 10,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6
      })
    }, "Equipment"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '5px 10px',
        fontSize: 12,
        color: '#96A2A0'
      }
    }, /*#__PURE__*/React.createElement("span", null, "⚔️ Weapon"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#F7F2E7',
        fontWeight: 600,
        textAlign: 'right'
      }
    }, d.weapon), /*#__PURE__*/React.createElement("span", null, "🛡️ Armor"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#F7F2E7',
        fontWeight: 600,
        textAlign: 'right'
      }
    }, d.armor), d.shield && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "🛡️ Shield"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#F7F2E7',
        fontWeight: 600,
        textAlign: 'right'
      }
    }, d.shield)), d.amulet && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "📿 Amulet"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#F7F2E7',
        fontWeight: 600,
        textAlign: 'right'
      }
    }, d.amulet)))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'left',
        borderTop: LS_DIVIDER,
        paddingTop: 10,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6
      })
    }, "Tier 1 Stats"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        justifyContent: 'center',
        flexWrap: 'wrap'
      }
    }, /* v2.3.1232: stat accents mapped onto the semantic set (info
         replaces the old sky, magic replaces indigo) */
    [['POW', d.power, '#D95C54'], ['VIT', d.vitality, '#59BF91'], ['END', d.endurance, '#D8A94D'], ['AGI', d.agility, '#5D93D2'], ['MND', d.mind, '#9A76D3']].map(function (_ref194) {
      var _ref195 = _slicedToArray(_ref194, 3),
        l = _ref195[0],
        v = _ref195[1],
        c = _ref195[2];
      return /*#__PURE__*/React.createElement("div", {
        key: l,
        style: {
          padding: '5px 6px',
          borderRadius: 8,
          background: '#19252A',
          border: '1px solid rgba(238,242,235,.08)',
          textAlign: 'center',
          minWidth: 44
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: c,
          fontWeight: 600,
          letterSpacing: '.08em'
        }
      }, l), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: '#F7F2E7'
        }
      }, v));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'left',
        borderTop: LS_DIVIDER,
        paddingTop: 10,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6
      })
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
          padding: '6px 0',
          borderRadius: 8,
          background: '#19252A'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13
        }
      }, icon), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: '#F7F2E7'
        }
      }, val), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 600,
          color: '#96A2A0'
        }
      }, label));
    }))), d.clanName && /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: 32,
        boxSizing: 'border-box',
        padding: '6px 10px',
        borderRadius: 999,
        background: '#19252A',
        border: '1px solid rgba(238,242,235,.08)',
        marginBottom: 10,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: '#9A76D3'
      }
    }, "🏰 [", d.clanTag, "] ", d.clanName)));
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
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      marginTop: 0,
      minHeight: 44,
      padding: '0 4px',
      borderRadius: 11,
      fontSize: 12,
      fontWeight: 700,
      border: '1px solid rgba(238,242,235,.14)',
      background: 'linear-gradient(180deg, #304047 0%, #2B3940 100%)',
      color: '#F7F2E7'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      S.player.x = inspectPlayer.x + 40;
      S.player.y = inspectPlayer.y + 40;
      setInspectPlayer(null);
    }
  }, "📍 TP"), /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      marginTop: 0,
      minHeight: 44,
      padding: '0 4px',
      borderRadius: 11,
      fontSize: 12,
      fontWeight: 700,
      border: 'none',
      background: '#D8A85F',
      color: '#20170D'
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
  }, "🤝 Trade"), /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      marginTop: 0,
      minHeight: 44,
      padding: '0 4px',
      borderRadius: 11,
      fontSize: 12,
      fontWeight: 700,
      border: '1px solid rgba(238,242,235,.14)',
      background: 'linear-gradient(180deg, #304047 0%, #2B3940 100%)',
      color: '#9A76D3'
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Duel sent', '#a78bfa');
      setInspectPlayer(null);
    }
  }, "⚔️ Duel"), /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      marginTop: 0,
      minHeight: 44,
      padding: '0 4px',
      borderRadius: 11,
      fontSize: 12,
      fontWeight: 700,
      border: '1px solid #C7655F',
      background: '#7C3431',
      color: '#FFF1EE'
    },
    onClick: function onClick() {
      var _S$rpg26;
      var S = stateRef.current;
      if (S._pvpThreatCdUntil && Date.now() < S._pvpThreatCdUntil) {
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Threat on cooldown', '#D95C54');
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
      /* v2.3.1193: no longer orphaned — entityRenderer draws my own red
         skull from these anchors.  This write is OPTIMISTIC (base
         countdown, instant feedback); the relayed pvp_threat echo
         replaces it with the server's authoritative level-scaled
         countdown, or — if the server drops the threat (cooldown/
         forged) — nothing arrives and the base window just ages out. */
      S._pvpSkullType = 'red';
      S._pvpSkullUntil = Date.now() + PVP_THREAT_BASE_COUNTDOWN;
      S._pvpThreatCdUntil = Date.now() + PVP_THREAT_COOLDOWN;
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Threat issued!', '#D95C54');
      BT_AUDIO.beep(150, 0.15, 0.2, 'sawtooth');
      setInspectPlayer(null);
    }
  }, "💀 Threat")), /* v2.3.1185: party invite -- caps-gated (an old worker would
     rebroadcast party_invite as an unknown type instead of validating
     it).  Server answers with party_invited to the target and
     party_state echoes once they accept (see PartyHUD.jsx). */
  stateRef.current && stateRef.current._serverCaps && stateRef.current._serverCaps.party && /*#__PURE__*/React.createElement("button", {
    style: Object.assign({}, LS_SECONDARY, {
      width: '100%',
      marginTop: 6,
      color: '#D8A94D'
    }),
    onClick: function onClick() {
      var S = stateRef.current;
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'party_invite',
        payload: {
          target: inspectPlayer.id
        }
      });
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Party invite sent', '#fbbf24');
      setInspectPlayer(null);
    }
  }, "🎟️ Invite to Party"), clanData && !((_inspectPlayer$rpgDat = inspectPlayer.rpgData) !== null && _inspectPlayer$rpgDat !== void 0 && _inspectPlayer$rpgDat.clanTag) && /*#__PURE__*/React.createElement("button", {
    style: Object.assign({}, LS_SECONDARY, {
      width: '100%',
      marginTop: 6,
      color: '#9A76D3'
    }),
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Clan invite sent', '#a78bfa');
      setInspectPlayer(null);
    }
  }, "🏰 Invite to [", clanData.tag, "]"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 6
    }
  }, function () {
    var isFriend = friendsList.some(function (f) {
      return f.id === inspectPlayer.id;
    });
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        minHeight: 44,
        padding: '0 4px',
        borderRadius: 11,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(238,242,235,.14)',
        background: 'linear-gradient(180deg, #304047 0%, #2B3940 100%)',
        color: isFriend ? '#59BF91' : '#B9C1BF'
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
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Removed friend', '#D95C54');
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
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Added friend!', '#59BF91');
          BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
        }
      }
    }, isFriend ? '💚 Friend' : '➕ Add Friend');
  }(), function () {
    var isMuted = mutedList.includes(inspectPlayer.id);
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 0.7,
        minHeight: 44,
        padding: '0 4px',
        borderRadius: 11,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(238,242,235,.14)',
        background: 'linear-gradient(180deg, #304047 0%, #2B3940 100%)',
        color: isMuted ? '#D8A94D' : '#B9C1BF'
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
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Unmuted', '#D8A94D');
        } else {
          var _updated2 = [].concat(_toConsumableArray(mutedList), [inspectPlayer.id]);
          setMutedList(_updated2);
          try {
            localStorage.setItem('bt_muted', JSON.stringify(_updated2));
          } catch (e) {}
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Muted', '#D8A94D');
        }
      }
    }, isMuted ? '🔇 Muted' : '🔇 Mute');
  }(), function (_ZONES$stateRef$curre, _stateRef$current39) {
    var isBlocked = blockedList.includes(inspectPlayer.id);
    var isLawless = (_ZONES$stateRef$curre = ZONES[(_stateRef$current39 = stateRef.current) === null || _stateRef$current39 === void 0 ? void 0 : _stateRef$current39.currentZone]) === null || _ZONES$stateRef$curre === void 0 ? void 0 : _ZONES$stateRef$curre.lawless;
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 0.7,
        minHeight: 44,
        padding: '0 4px',
        borderRadius: 11,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid ' + (isBlocked ? '#C7655F' : 'rgba(238,242,235,.14)'),
        background: isBlocked ? '#7C3431' : 'linear-gradient(180deg, #304047 0%, #2B3940 100%)',
        color: isBlocked ? '#FFF1EE' : '#B9C1BF',
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
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Unblocked', '#59BF91');
        } else {
          if (isLawless) {
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Can\'t block in lawless zone!', '#D95C54');
            return;
          }
          var _updated3 = [].concat(_toConsumableArray(blockedList), [inspectPlayer.id]);
          setBlockedList(_updated3);
          try {
            localStorage.setItem('bt_blocked', JSON.stringify(_updated3));
          } catch (e) {}
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Blocked - no interactions', '#D95C54');
        }
      }
    }, isBlocked ? '🚫 Blocked' : '🚫 Block');
  }())));
}
