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
      width: 320,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowLeaderboard(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83C\uDFC6 Leaderboards"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, Object.keys(stateRef.current.others).length + 1, " players online"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 1,
      marginBottom: 10,
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)',
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
        padding: '5px 4px',
        fontSize: 8,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: leaderboardTab === id ? 'rgba(245,197,66,.2)' : 'rgba(255,255,255,.03)',
        color: leaderboardTab === id ? '#f5c542' : 'rgba(255,255,255,.4)',
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
        fontSize: 9,
        fontWeight: 700,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 4
      }
    }, tabLabel), entries.map(function (e, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: e.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          borderRadius: 6,
          marginBottom: 2,
          background: e.isMe ? 'rgba(245,197,66,.08)' : 'rgba(255,255,255,.02)',
          border: '1px solid ' + (e.isMe ? 'rgba(245,197,66,.2)' : 'rgba(255,255,255,.04)')
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 20,
          textAlign: 'center',
          fontSize: i < 3 ? 14 : 10,
          fontWeight: 800,
          color: i < 3 ? '#f5c542' : 'rgba(255,255,255,.3)'
        }
      }, i < 3 ? medals[i] : i + 1), /*#__PURE__*/React.createElement("div", {
        style: {
          width: 24,
          height: 24,
          borderRadius: 12,
          background: e.color || '#5b52ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          color: '#fff',
          flexShrink: 0,
          border: e.isMe ? '2px solid #f5c542' : '2px solid rgba(255,255,255,.1)'
        }
      }, (e.name || '?').charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: e.isMe ? '#f5c542' : '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, e.clanTag && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)',
          marginRight: 3
        }
      }, "[", e.clanTag, "]"), e.name, " ", e.isMe && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, "(you)")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)'
        }
      }, "Lv ", e.level)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          fontWeight: 900,
          color: i === 0 ? '#f5c542' : i < 3 ? '#c0a0e0' : 'rgba(255,255,255,.6)',
          textAlign: 'right',
          minWidth: 40
        }
      }, formatVal(e[sortKey], leaderboardTab)));
    }), entries.length <= 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.2)',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 12
      }
    }, "Connect with more players to see rankings!"));
  }()));
}
