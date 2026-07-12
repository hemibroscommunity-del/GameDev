import React from 'react';
import { LIFE_SKILLS } from '@/data/index.js';
import { BT_API_BASE } from '@/networking/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

/* ═══ LeaderboardPanel — top-50 rankings per category ═══ */
/* v2.3.856: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). The createElement subtree — including
   the render-time IIFE that fetches /api/leaderboard on tab change,
   merges in nearby players, sorts, and renders rows — is unchanged. The
   five values it closed over inline (stateRef, leaderboardTab,
   setLeaderboardTab, setRpgState, setShowLeaderboard) are now props;
   LIFE_SKILLS / BT_API_BASE / babel helpers are module imports; fetch is
   the browser global. */
/* v2.3.1232: Lantern Slate restyle — panel surface, segmented tabs on a
   #121B20 track with brass bottom edge, rows in a recessed well at 44px
   with tabular values, isMe row = accent-fill selection. The fetch/merge/
   sort IIFE is byte-identical; styles + row markup only. */
export function LeaderboardPanel(props) {
  var stateRef = props.stateRef,
    leaderboardTab = props.leaderboardTab,
    setLeaderboardTab = props.setLeaderboardTab,
    setRpgState = props.setRpgState,
    setShowLeaderboard = props.setShowLeaderboard;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowLeaderboard(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 320 fixed — fill narrow phones, never overflow */
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left',
      /* v2.3.1232: override legacy navy card with Lantern panel surface */
      background: '#202C32',
      border: '1px solid rgba(238,242,235,.14)',
      borderRadius: 14,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowLeaderboard(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: panel title row — icon + 13/700 uppercase title */
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/panel-leaderboard.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('🏆'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F7F2E7'
    }
  }, "Leaderboards")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontVariantNumeric: 'tabular-nums',
      color: '#96A2A0',
      textAlign: 'center',
      marginBottom: 10
    }
  }, Object.keys(stateRef.current.others).length + 1, " players online"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: segmented tabs on a well track (wraps into two rows on
       narrow cards) */
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 12,
      borderRadius: 10,
      padding: 2,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
      flexWrap: 'wrap'
    }
  }, [['level', '⚔️ Level'], ['lifeskills', '⛏️ Skills'], ['ap', '🏆 AP'], ['kills', '💀 Kills'], ['dungeons', '🐉 Dungeons'], ['gold', '💰 Gold'], ['playtime', '⏱️ Time']].map(function (_ref40) {
    var _ref41 = _slicedToArray(_ref40, 2),
      id = _ref41[0],
      label = _ref41[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setLeaderboardTab(id);
      },
      style: {
        flex: '1 0 auto',
        minHeight: 36,
        padding: '5px 6px',
        fontSize: 11,
        fontWeight: 600,
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        background: leaderboardTab === id ? '#2B3940' : 'transparent',
        boxShadow: leaderboardTab === id ? 'inset 0 -2px 0 #D8A85F' : 'none',
        color: leaderboardTab === id ? '#F7F2E7' : '#96A2A0',
        fontFamily: 'inherit',
        transition: 'all .15s',
        minWidth: 40
      }
    }, label);
  })), function () {
    var S = stateRef.current;
    var myRpg = S.rpg;

    /* Fetch from server on tab change */
    if (S._lbLastTab !== leaderboardTab) {
      S._lbLastTab = leaderboardTab;
      S._lbServerData = null;
      fetch(BT_API_BASE + '/api/leaderboard/top?category=' + leaderboardTab + '&limit=50').then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok) {
          S._lbServerData = d.results;
          setRpgState(function (prev) {
            return _objectSpread({}, prev);
          }); /* force re-render */
        }
      }).catch(function () {});
    }

    /* Build entries: prefer server data, fallback to local S.others */
    var entries = [];
    if (S._lbServerData && S._lbServerData.length > 0) {
      entries = S._lbServerData.map(function (p) {
        return _objectSpread(_objectSpread({}, p), {}, {
          isMe: p.id === S.myId,
          gold: p.goldEarned || 0
        });
      });
      /* Ensure self is in the list */
      if (!entries.find(function (e) {
        return e.isMe;
      })) {
        var _S$_clanData5;
        var cs = (myRpg === null || myRpg === void 0 ? void 0 : myRpg._compStats) || {};
        var myLifeTotal = myRpg !== null && myRpg !== void 0 && myRpg.lifeSkills ? LIFE_SKILLS.reduce(function (s, k) {
          var _myRpg$lifeSkills$k;
          return (((_myRpg$lifeSkills$k = myRpg.lifeSkills[k]) === null || _myRpg$lifeSkills$k === void 0 ? void 0 : _myRpg$lifeSkills$k.level) || 0) + s;
        }, 0) : 0;
        entries.push({
          id: S.myId,
          name: S.myName || 'You',
          color: S.myColor,
          isMe: true,
          level: (myRpg === null || myRpg === void 0 ? void 0 : myRpg.level) || 1,
          lifeTotal: myLifeTotal,
          ap: (myRpg === null || myRpg === void 0 ? void 0 : myRpg.achievementPoints) || 0,
          kills: cs.monstersKilled || 0,
          dungeons: cs.dungeonsCleared || 0,
          gold: cs.totalGoldEarned || 0,
          playtime: Math.floor((cs.playtimeSeconds || 0) / 60),
          clanTag: ((_S$_clanData5 = S._clanData) === null || _S$_clanData5 === void 0 ? void 0 : _S$_clanData5.tag) || null
        });
      }
    } else {
      var _S$_clanData6;
      /* Fallback: local data from connected players */
      var _cs = (myRpg === null || myRpg === void 0 ? void 0 : myRpg._compStats) || {};
      var _myLifeTotal = myRpg !== null && myRpg !== void 0 && myRpg.lifeSkills ? LIFE_SKILLS.reduce(function (s, k) {
        var _myRpg$lifeSkills$k2;
        return (((_myRpg$lifeSkills$k2 = myRpg.lifeSkills[k]) === null || _myRpg$lifeSkills$k2 === void 0 ? void 0 : _myRpg$lifeSkills$k2.level) || 0) + s;
      }, 0) : 0;
      entries.push({
        id: S.myId,
        name: S.myName || 'You',
        color: S.myColor,
        isMe: true,
        level: (myRpg === null || myRpg === void 0 ? void 0 : myRpg.level) || 1,
        lifeTotal: _myLifeTotal,
        ap: (myRpg === null || myRpg === void 0 ? void 0 : myRpg.achievementPoints) || 0,
        kills: _cs.monstersKilled || 0,
        dungeons: _cs.dungeonsCleared || 0,
        gold: _cs.totalGoldEarned || 0,
        playtime: Math.floor((_cs.playtimeSeconds || 0) / 60),
        clanTag: ((_S$_clanData6 = S._clanData) === null || _S$_clanData6 === void 0 ? void 0 : _S$_clanData6.tag) || null
      });
      Object.entries(S.others).forEach(function (_ref42) {
        var _ref43 = _slicedToArray(_ref42, 2),
          id = _ref43[0],
          o = _ref43[1];
        var d = o.rpgData || {};
        entries.push({
          id: id,
          name: o.name || '???',
          color: o.color,
          isMe: false,
          level: o.rpgLv || 1,
          lifeTotal: d.lifeTotal || 0,
          ap: d.ap || 0,
          kills: d.kills || 0,
          dungeons: d.dungeons || 0,
          gold: d.goldEarned || 0,
          playtime: d.playtime || 0,
          clanTag: d.clanTag || null
        });
      });
    }

    /* Sort by selected tab */
    var sortKey = {
      level: 'level',
      lifeskills: 'lifeTotal',
      ap: 'ap',
      kills: 'kills',
      dungeons: 'dungeons',
      gold: 'gold',
      playtime: 'playtime'
    }[leaderboardTab] || 'level';
    entries.sort(function (a, b) {
      return b[sortKey] - a[sortKey];
    });
    var medals = ['🥇', '🥈', '🥉'];
    var formatVal = function formatVal(val, tab) {
      if (tab === 'playtime') return val >= 60 ? Math.floor(val / 60) + 'h ' + val % 60 + 'm' : val + 'm';
      if (tab === 'gold') return val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val;
      return val;
    };
    var tabLabel = {
      level: 'Level',
      lifeskills: 'Skill Total',
      ap: 'Achievement Pts',
      kills: 'Monsters Killed',
      dungeons: 'Dungeons Cleared',
      gold: 'Gold Earned',
      playtime: 'Playtime'
    }[leaderboardTab];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        color: '#96A2A0',
        marginBottom: 6
      }
    }, tabLabel), /*#__PURE__*/React.createElement("div", {
      /* v2.3.1232: ranking rows sit in a recessed well */
      style: {
        padding: 6,
        borderRadius: 10,
        background: '#121B20',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)'
      }
    }, entries.map(function (e, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: e.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          minHeight: 44,
          borderRadius: 8,
          marginBottom: 2,
          /* v2.3.1232: isMe = brass accent-fill selection; others flat */
          background: e.isMe ? '#3B3427' : 'transparent',
          borderBottom: e.isMe ? '1px solid transparent' : '1px solid rgba(238,242,235,.10)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 22,
          textAlign: 'center',
          fontSize: i < 3 ? 15 : 12,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: i < 3 ? '#D8A85F' : '#96A2A0',
          flexShrink: 0
        }
      }, i < 3 ? medals[i] : i + 1), /*#__PURE__*/React.createElement("div", {
        style: {
          width: 26,
          height: 26,
          borderRadius: 13,
          background: e.color || '#D8A85F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          color: '#F7F2E7',
          flexShrink: 0,
          border: e.isMe ? '2px solid #F0C878' : '2px solid rgba(238,242,235,.14)'
        }
      }, (e.name || '?').charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          fontWeight: 600,
          color: e.isMe ? '#D8A85F' : '#F7F2E7',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, e.clanTag && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          color: '#96A2A0',
          marginRight: 3
        }
      }, "[", e.clanTag, "]"), e.name, " ", e.isMe && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          color: '#96A2A0'
        }
      }, "(you)")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontVariantNumeric: 'tabular-nums',
          color: '#96A2A0'
        }
      }, "Lv ", e.level)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: i === 0 ? '#D8A85F' : i < 3 ? '#F7F2E7' : '#B9C1BF',
          textAlign: 'right',
          minWidth: 40
        }
      }, formatVal(e[sortKey], leaderboardTab)));
    }), entries.length <= 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: '#96A2A0',
        textAlign: 'center',
        padding: 14
      }
    }, "Connect with more players to see rankings!")));
  }()));
}
