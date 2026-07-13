import React from 'react';
import { BT_AUDIO, GUILD_RANKS, SKILL_GUILDS, getGuildQuest, getGuildRank } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* ═══ GuildPanel — skill-guild rank/quest/title screen ═══ */
/* v2.3.857: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. Props:
   rpgState, guildSkill, setGuildSkill, setRpgState, setShowGuildPanel,
   stateRef. GUILD_RANKS / SKILL_GUILDS / getGuildQuest / getGuildRank /
   BT_AUDIO and the babel helpers are module imports. */
/* v2.3.1232: Lantern Slate restyle — panel surface + panel-guild title
   icon (legacy purple header remapped), guild selector as 32px pill
   chips (selected = accent-fill + brass label), 11/600 section headers,
   Claim Reward promoted to the brass primary at 44px, guildmaster quote
   in a recessed well. Guild/rank content colors kept as identity
   accents. All handlers (incl. the caps-gated server turn-in) untouched. */
export function GuildPanel(props) {
  var rpgState = props.rpgState,
    guildSkill = props.guildSkill,
    setGuildSkill = props.setGuildSkill,
    setRpgState = props.setRpgState,
    setShowGuildPanel = props.setShowGuildPanel,
    stateRef = props.stateRef;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowGuildPanel(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 340 fixed — fill narrow phones, never overflow */
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
      return setShowGuildPanel(false);
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
    src: "/icons/ui/panel-guild.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('🏛️'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F7F2E7'
    }
  }, "Life Skill Guilds")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: '#96A2A0',
      textAlign: 'center',
      marginBottom: 10
    }
  }, "Progress through guild ranks to earn titles and AP"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 12
    }
  }, Object.entries(SKILL_GUILDS).map(function (_ref31) {
    var _rpgState$lifeSkills;
    var _ref32 = _slicedToArray(_ref31, 2),
      key = _ref32[0],
      g = _ref32[1];
    var lvl = ((_rpgState$lifeSkills = rpgState.lifeSkills) === null || _rpgState$lifeSkills === void 0 || (_rpgState$lifeSkills = _rpgState$lifeSkills[key]) === null || _rpgState$lifeSkills === void 0 ? void 0 : _rpgState$lifeSkills.level) || 1;
    var rank = getGuildRank(lvl);
    var sel = guildSkill === key;
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      onClick: function onClick() {
        return setGuildSkill(key);
      },
      style: {
        /* v2.3.1232: 32px pill chip; selected = accent-fill + brass */
        minHeight: 32,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        border: sel ? '1px solid #D8A85F' : '1px solid rgba(238,242,235,.14)',
        background: sel ? '#3B3427' : '#2B3940',
        color: sel ? '#D8A85F' : '#B9C1BF',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }
    }, g.icon, " ", key.replace(/([A-Z])/g, ' $1').trim(), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10, // v2.3.1239: 10px font floor (was 9)
        color: rank.color
      }
    }, rank.title.charAt(0)));
  })), function (_rpgState$lifeSkills2) {
    var key = guildSkill;
    var g = SKILL_GUILDS[key];
    var skill = (_rpgState$lifeSkills2 = rpgState.lifeSkills) === null || _rpgState$lifeSkills2 === void 0 ? void 0 : _rpgState$lifeSkills2[key];
    var lvl = (skill === null || skill === void 0 ? void 0 : skill.level) || 1;
    var rank = getGuildRank(lvl);
    var nextRank = GUILD_RANKS.find(function (r) {
      return r.minLvl > lvl;
    });
    var quest = getGuildQuest(key, rpgState);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1232: nested surface; guild color stays as a thin
           identity edge, not a tile fill */
        padding: 12,
        borderRadius: 10,
        background: '#182227',
        border: '1px solid ' + g.color + '40',
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28
      }
    }, g.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: g.color
      }
    }, g.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: '#96A2A0'
      }
    }, "Guildmaster: ", g.master), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: rank.color,
        marginTop: 2
      }
    }, rank.title))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: '#F7F2E7'
      }
    }, "Lv ", lvl), nextRank && /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1232: spec bar track */
        flex: 1,
        height: 6,
        borderRadius: 999,
        background: '#0B1216',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        borderRadius: 999,
        background: g.color,
        width: Math.min(100, (lvl - rank.minLvl) / Math.max(1, nextRank.minLvl - rank.minLvl) * 100) + '%',
        transition: 'width .3s'
      }
    })), nextRank && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontVariantNumeric: 'tabular-nums',
        color: '#96A2A0'
      }
    }, "Next: ", nextRank.title, " (Lv", nextRank.minLvl, ")"), !nextRank && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#D8A85F'
      }
    }, "MAX RANK"))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        color: '#96A2A0',
        marginBottom: 6
      }
    }, "Guild Ranks"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 12
      }
    }, GUILD_RANKS.map(function (r) {
      var achieved = lvl >= r.minLvl;
      return /*#__PURE__*/React.createElement("div", {
        key: r.rank,
        style: {
          padding: '3px 8px',
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          background: achieved ? r.color + '20' : '#19252A',
          border: '1px solid ' + (achieved ? r.color + '40' : 'rgba(238,242,235,.08)'),
          color: achieved ? r.color : '#687575'
        }
      }, achieved ? '✅' : '🔒', " ", r.title, " (Lv", r.minLvl, ")", achieved && r.ap > 0 && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10, // v2.3.1239: 10px font floor (was 9)
          color: '#96A2A0',
          marginLeft: 2
        }
      }, "+", r.ap, "AP"));
    })), quest && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 10,
        borderRadius: 10,
        background: '#182227',
        border: '1px solid ' + (quest.complete ? 'rgba(89,191,145,.4)' : 'rgba(238,242,235,.14)'),
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: quest.complete ? '#59BF91' : '#F7F2E7',
        marginBottom: 2
      }
    }, quest.complete ? '✅' : '📋', " ", quest.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: '#B9C1BF'
      }
    }, quest.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontVariantNumeric: 'tabular-nums',
        color: '#96A2A0',
        marginTop: 3
      }
    }, "Progress: Lv", quest.currentLvl, "/", quest.checkLvl, " \xB7 Reward: ", quest.reward.gold, "G +", quest.reward.ap, "AP"), quest.complete && /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        var R = stateRef.current.rpg,
          S = stateRef.current;
        /* v2.3.1128: server-verified guild quests.  The worker checks
           the ladder + skill level against ITS OWN lifeSkills numbers
           and pays gold/AP authoritatively; completion visuals arrive
           via guild_quest_result (gameEvents.js).  The local mint
           below stays only for old workers. */
        if (S._serverCaps && S._serverCaps.guilds && S.channel) {
          try {
            S.channel.send({ type: 'broadcast', event: 'guild_quest_turn_in', payload: { skill: key } });
          } catch (e) {}
          return;
        }
        if (!R._guildProgress) R._guildProgress = {};
        var completed = R._guildProgress[key] || 0;
        R._guildProgress[key] = completed + 1;
        R.coins += quest.reward.gold;
        R.achievementPoints = (R.achievementPoints || 0) + quest.reward.ap;
        if (R._compStats) {
          R._compStats.totalGoldEarned += quest.reward.gold;
          R._compStats.questsCompleted++;
        }
        /* Track guild stats for achievements */
        if (!S.stats._guildRanksEarned) S.stats._guildRanksEarned = 0;
        S.stats._guildRanksEarned++;
        var newRank = getGuildRank(quest.currentLvl);
        if (newRank.rank >= 5) {
          if (!S.stats._guildMasterCount) S.stats._guildMasterCount = 0;
          S.stats._guildMasterCount++;
        }
        /* Add title */
        if (!R._titles) R._titles = [];
        var titleStr = newRank.title + ' ' + key.replace(/([A-Z])/g, ' $1').trim();
        if (!R._titles.includes(titleStr)) R._titles.push(titleStr);
        pushDmgPopup(S, S.player.x, S.player.y - 40, quest.title + ' complete!', g.color);
        pushDmgPopup(S, S.player.x, S.player.y - 25, '+' + quest.reward.gold + 'G +' + quest.reward.ap + 'AP', '#D8A94D');
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused18) {}
      },
      style: {
        /* v2.3.1232: brass primary — the panel's one primary action */
        marginTop: 8,
        width: '100%',
        minHeight: 44,
        padding: '10px 0',
        borderRadius: 11,
        fontSize: 13,
        fontWeight: 700,
        border: 'none',
        background: '#D8A85F',
        color: '#20170D',
        cursor: 'pointer'
      }
    }, "🏛️ Claim Reward")), !quest && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: '#96A2A0',
        textAlign: 'center',
        padding: 12,
        borderRadius: 10,
        background: '#19252A',
        marginBottom: 10
      }
    }, "All guild quests completed! You are a ", rank.title, " of the ", g.name, "."), /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1232: guildmaster quote in a recessed well */
        padding: 10,
        borderRadius: 8,
        background: '#121B20',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: g.masterColor,
        fontWeight: 700
      }
    }, g.master, ":"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: '#96A2A0',
        fontStyle: 'italic'
      }
    }, lvl < 10 ? "Welcome to the guild. Work hard and you'll rise." : lvl < 25 ? "You're making progress. Keep at it." : lvl < 50 ? "Impressive dedication. The guild honors your commitment." : lvl < 75 ? "Few reach this level. You are a true craftsman." : lvl < 100 ? "A master walks among us. The guild bows to your skill." : "You have transcended mortal limits. Legendary.")), (rpgState._titles || []).filter(function (t) {
      return t.toLowerCase().includes(key.toLowerCase().replace(/([A-Z])/g, ' $1').trim().split(' ')[0].toLowerCase());
    }).length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        color: '#96A2A0',
        marginBottom: 4
      }
    }, "Earned Titles"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4
      }
    }, (rpgState._titles || []).filter(function (t) {
      return t.toLowerCase().includes(key.toLowerCase().replace(/([A-Z])/g, ' $1').trim().split(' ')[0].toLowerCase());
    }).map(function (t, i) {
      return /*#__PURE__*/React.createElement("span", {
        key: i,
        style: {
          padding: '3px 8px',
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 600,
          background: g.color + '15',
          border: '1px solid ' + g.color + '30',
          color: g.color
        }
      }, t);
    }))));
  }()));
}
