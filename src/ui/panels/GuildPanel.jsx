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
      width: 340,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowGuildPanel(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#a855f7',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83C\uDFDB\uFE0F Life Skill Guilds"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, "Progress through guild ranks to earn titles and AP"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
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
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 7,
        fontWeight: 700,
        border: '1.5px solid ' + (sel ? g.color : 'rgba(255,255,255,.08)'),
        background: sel ? g.color + '20' : 'rgba(255,255,255,.02)',
        color: sel ? g.color : 'rgba(255,255,255,.35)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }
    }, g.icon, " ", key.replace(/([A-Z])/g, ' $1').trim(), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
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
        padding: 10,
        borderRadius: 8,
        background: g.color + '10',
        border: '1.5px solid ' + g.color + '30',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28
      }
    }, g.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: g.color
      }
    }, g.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.4)'
      }
    }, "Guildmaster: ", g.master), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: rank.color,
        marginTop: 2
      }
    }, rank.title))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#fff'
      }
    }, "Lv ", lvl), nextRank && /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        background: 'rgba(0,0,0,.3)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        borderRadius: 3,
        background: g.color,
        width: Math.min(100, (lvl - rank.minLvl) / Math.max(1, nextRank.minLvl - rank.minLvl) * 100) + '%',
        transition: 'width .3s'
      }
    })), nextRank && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Next: ", nextRank.title, " (Lv", nextRank.minLvl, ")"), !nextRank && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: '#D8A94D'
      }
    }, "MAX RANK"))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#D8A94D',
        marginBottom: 3
      }
    }, "Guild Ranks"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        marginBottom: 8
      }
    }, GUILD_RANKS.map(function (r) {
      var achieved = lvl >= r.minLvl;
      return /*#__PURE__*/React.createElement("div", {
        key: r.rank,
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          background: achieved ? r.color + '20' : 'rgba(255,255,255,.02)',
          border: '1px solid ' + (achieved ? r.color + '40' : 'rgba(255,255,255,.05)'),
          color: achieved ? r.color : 'rgba(255,255,255,.12)'
        }
      }, achieved ? '✅' : '🔒', " ", r.title, " (Lv", r.minLvl, ")", achieved && r.ap > 0 && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.3)',
          marginLeft: 2
        }
      }, "+", r.ap, "AP"));
    })), quest && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 8,
        borderRadius: 6,
        background: quest.complete ? 'rgba(89,191,145,.08)' : 'rgba(255,255,255,.03)',
        border: '1px solid ' + (quest.complete ? 'rgba(89,191,145,.2)' : 'rgba(255,255,255,.08)'),
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: quest.complete ? '#59BF91' : '#D8A94D',
        marginBottom: 2
      }
    }, quest.complete ? '✅' : '📋', " ", quest.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, quest.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        marginTop: 2
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
        marginTop: 4,
        width: '100%',
        padding: '6px 0',
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 800,
        border: '1.5px solid rgba(89,191,145,.4)',
        background: 'rgba(89,191,145,.15)',
        color: '#59BF91',
        cursor: 'pointer'
      }
    }, "\uD83C\uDFDB\uFE0F Claim Reward")), !quest && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.2)',
        fontStyle: 'italic',
        padding: 8,
        textAlign: 'center'
      }
    }, "All guild quests completed! You are a ", rank.title, " of the ", g.name, "."), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 6,
        borderRadius: 5,
        background: 'rgba(255,255,255,.02)',
        border: '1px solid rgba(255,255,255,.04)',
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: g.masterColor,
        fontWeight: 700
      }
    }, g.master, ":"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        fontStyle: 'italic'
      }
    }, lvl < 10 ? "Welcome to the guild. Work hard and you'll rise." : lvl < 25 ? "You're making progress. Keep at it." : lvl < 50 ? "Impressive dedication. The guild honors your commitment." : lvl < 75 ? "Few reach this level. You are a true craftsman." : lvl < 100 ? "A master walks among us. The guild bows to your skill." : "You have transcended mortal limits. Legendary.")), (rpgState._titles || []).filter(function (t) {
      return t.toLowerCase().includes(key.toLowerCase().replace(/([A-Z])/g, ' $1').trim().split(' ')[0].toLowerCase());
    }).length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 2
      }
    }, "Earned Titles"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2
      }
    }, (rpgState._titles || []).filter(function (t) {
      return t.toLowerCase().includes(key.toLowerCase().replace(/([A-Z])/g, ' $1').trim().split(' ')[0].toLowerCase());
    }).map(function (t, i) {
      return /*#__PURE__*/React.createElement("span", {
        key: i,
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          background: g.color + '15',
          border: '1px solid ' + g.color + '30',
          color: g.color
        }
      }, t);
    }))));
  }()));
}
