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
/* v2.3.1235: batch-2 rollout — correction-pass compliance
   (docs/LANTERN-SLATE-SPEC.md + game.css :root). Presentation only,
   every handler and the fetch/merge/sort logic byte-identical.
   v2.3.1232 tokens remapped onto the approved set (sheet #1E2E34,
   raised #293B41, well #111E23, brass #D8AA58, brass-soft, lines
   rgba(229,237,233,.11/.20)); tab labels drop their emoji (no emoji in
   chrome) and grow to 44px hitboxes; medal emoji ranks become 16/700
   tabular key numbers with brass TEXT for top-3 only (never filled-gold
   rows); maxHeight caps at the .bt-inspect content box. */
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
      /* v2.3.1235: batch-2 rollout — also cap at 100% of the .bt-inspect
         content box (it reserves dashboard clearance); a bare 85vh can
         exceed the box on short phones and slide under the band. */
      maxHeight: 'min(85vh, 100%)',
      overflowY: 'auto',
      /* v2.3.1235: batch-2 QA — 18px bottom scroll-edge fade (same recipe
         as the destination sheets): at 390 the only cue that rank 8+
         existed was a hairline sliver. Rows crossing the fold now fade;
         at scroll end the zone holds only the card's bottom padding. */
      WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)',
      maskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)',
      padding: 16,
      textAlign: 'left',
      /* v2.3.1235: batch-2 rollout — corrected sheet surface + strong
         hairline + shared .ui-panel shadow (floating modal card). */
      background: '#1E2E34',
      border: '1px solid rgba(229,237,233,.20)',
      borderRadius: 14,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045), 0 14px 36px rgba(3,8,10,0.30)'
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
      color: '#F4F0E7'
    }
  }, "Leaderboards")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontVariantNumeric: 'tabular-nums',
      color: '#8D9B98',
      textAlign: 'center',
      marginBottom: 10
    }
  }, Object.keys(stateRef.current.others).length + 1, " players online"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: segmented tabs on a well track (wraps into two rows on
       narrow cards) */
    /* v2.3.1235: batch-2 rollout — corrected well token + shared .ui-well
       shadow recipe; tab labels drop their emoji (no emoji in chrome). */
    /* v2.3.1235: batch-2 QA — wrap made "Time" orphan onto its own
       centered row with a dead band under it (both test widths). The
       track is now ONE horizontally-scrollable row (scrollbar hidden via
       .ls-scrollbody; the 7 tabs overhang ~1 tab at 390 and fit at 430). */
    className: "ls-scrollbody",
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 12,
      borderRadius: 10,
      padding: 2,
      background: '#111E23',
      boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)',
      flexWrap: 'nowrap',
      overflowX: 'auto',
      touchAction: 'pan-x'
    }
  }, [['level', 'Level'], ['lifeskills', 'Skills'], ['ap', 'AP'], ['kills', 'Kills'], ['dungeons', 'Dungeons'], ['gold', 'Gold'], ['playtime', 'Time']].map(function (_ref40) {
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
        minHeight: 44 /* v2.3.1235: batch-2 rollout — tabs meet the ≥44px hitbox floor */,
        padding: '5px 6px',
        fontSize: 11,
        fontWeight: 600,
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        /* v2.3.1235: batch-2 rollout — corrected raised/brass/text tokens */
        background: leaderboardTab === id ? '#293B41' : 'transparent',
        boxShadow: leaderboardTab === id ? 'inset 0 -2px 0 #D8AA58' : 'none',
        color: leaderboardTab === id ? '#F4F0E7' : '#8D9B98',
        fontFamily: 'inherit',
        transition: 'all .15s',
        minWidth: 40,
        whiteSpace: 'nowrap' /* v2.3.1235: batch-2 QA — single-row track */
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
    /* v2.3.1235: batch-2 rollout — medal emoji removed: ranks render as
       16/700 tabular key numbers, brass TEXT for top-3 only (locked
       leaderboard rule; emoji is not chrome). */
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
        /* v2.3.1235: batch-2 rollout — section header 11/700 .14em muted */
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        color: '#8D9B98',
        marginBottom: 6
      }
    }, tabLabel), /*#__PURE__*/React.createElement("div", {
      /* v2.3.1232: ranking rows sit in a recessed well */
      /* v2.3.1235: batch-2 rollout — corrected well token + shared
         .ui-well shadow recipe */
      style: {
        padding: 6,
        borderRadius: 10,
        background: '#111E23',
        boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)'
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
          /* v2.3.1235: batch-2 rollout — isMe = brass-SOFT selection fill
             (never a filled-gold row); divider hairline on the rest */
          background: e.isMe ? 'rgba(216,170,88,.15)' : 'transparent',
          borderBottom: e.isMe ? '1px solid transparent' : '1px solid rgba(229,237,233,.11)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          /* v2.3.1235: batch-2 rollout — rank is a 16/700 tabular key
             number for every row; brass TEXT marks the top-3 (medal
             emoji removed — not chrome) */
          width: 24,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: i < 3 ? '#D8AA58' : '#8D9B98',
          flexShrink: 0
        }
      }, i + 1), /*#__PURE__*/React.createElement("div", {
        style: {
          width: 26,
          height: 26,
          borderRadius: 13,
          background: e.color || '#293B41' /* v2.3.1235: batch-2 rollout — raised-token fallback (gold fallback read as a rank accent) */,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700 /* v2.3.1235: batch-2 rollout — 400/600/700 only */,
          color: '#F4F0E7',
          flexShrink: 0,
          border: e.isMe ? '2px solid #EAC675' : '2px solid rgba(229,237,233,.20)'
        }
      }, (e.name || '?').charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13 /* v2.3.1235: batch-2 rollout — body 13, no half-sizes */,
          fontWeight: 600,
          color: e.isMe ? '#D8AA58' : '#F4F0E7',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, e.clanTag && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11 /* v2.3.1235: batch-2 rollout — text floor is 11 */,
          color: '#8D9B98',
          marginRight: 3
        }
      }, "[", e.clanTag, "]"), e.name, " ", e.isMe && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11 /* v2.3.1235: batch-2 rollout — text floor is 11 */,
          color: '#8D9B98'
        }
      }, "(you)")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontVariantNumeric: 'tabular-nums',
          color: '#8D9B98'
        }
      }, "Lv ", e.level)), /*#__PURE__*/React.createElement("div", {
        style: {
          /* v2.3.1235: batch-2 rollout — key number 16/700 tabular;
             brass TEXT for top-3 only */
          fontSize: 16,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: i < 3 ? '#D8AA58' : '#F4F0E7',
          textAlign: 'right',
          minWidth: 40
        }
      }, formatVal(e[sortKey], leaderboardTab)));
    }), entries.length <= 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1235: batch-2 rollout — empty state = 13/700 secondary
           directly on the surface */
        fontSize: 13,
        fontWeight: 700,
        color: '#B6C1BE',
        textAlign: 'center',
        padding: 14
      }
    }, "Connect with more players to see rankings!")));
  }()));
}
