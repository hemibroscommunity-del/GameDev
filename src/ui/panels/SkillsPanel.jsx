import React from 'react';
import { LIFE_SKILL_XP, QUEST_CHAINS, QUEST_STATUS, ZONE_RESOURCES, createDefaultCompStats } from '@/data/index.js';
import { _slicedToArray } from '@/lib/babelHelpers.js';

/* ═══ SkillsPanel — life-skill levels / resources / quest progress ═══ */
/* v2.3.865: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. 3
   props (rpgState, stateRef, setShowSkills — display-only, no setRpgState).
   LIFE_SKILL_XP/QUEST_CHAINS/QUEST_STATUS/ZONE_RESOURCES/
   createDefaultCompStats + babel imported (real exports verified).
   `_rpgState$lifeSkills46` hoisted babel temp declared locally. */
export function SkillsPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setShowSkills = props.setShowSkills;
  var _rpgState$lifeSkills46;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowSkills(false);
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
      return setShowSkills(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 8
    }
  }, "\uD83D\uDCCA Life Skills"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      letterSpacing: '.05em',
      marginBottom: 4
    }
  }, "HARVESTING"), [{
    name: 'Woodcutting',
    key: 'woodcutting',
    icon: '🪓',
    color: '#8B6914',
    desc: 'Chop trees for wood + zone gems'
  }, {
    name: 'Fishing',
    key: 'fishing',
    icon: '🎣',
    color: '#3498DB',
    desc: 'Catch fish for cooking + zone gems'
  }, {
    name: 'Mining',
    key: 'mining',
    icon: '⛏️',
    color: '#8a8a8a',
    desc: 'Mine ore (iron Lv1-5, steel Lv6-10) + zone gems'
  }].map(function (sk) {
    var _rpgState$lifeSkills43;
    var skill = ((_rpgState$lifeSkills43 = rpgState.lifeSkills) === null || _rpgState$lifeSkills43 === void 0 ? void 0 : _rpgState$lifeSkills43[sk.key]) || {
      level: 1,
      xp: 0
    };
    var xpNeeded = LIFE_SKILL_XP(skill.level);
    var xpPct = Math.min(100, skill.xp / xpNeeded * 100);
    return /*#__PURE__*/React.createElement("div", {
      key: sk.key,
      style: {
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: sk.color
      }
    }, sk.icon, " ", sk.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'rgba(255,255,255,.5)'
      }
    }, "Lv ", skill.level)), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 5,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: xpPct + '%',
        height: '100%',
        background: sk.color,
        borderRadius: 3,
        transition: 'width .3s'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)',
        marginTop: 1
      }
    }, skill.xp, "/", xpNeeded, " XP \xB7 ", sk.desc));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      letterSpacing: '.05em',
      marginTop: 6,
      marginBottom: 4
    }
  }, "CRAFTING"), [{
    name: 'Cooking',
    key: 'cooking',
    icon: '🍳',
    color: '#ea580c',
    desc: 'Cook fish + ingredients for healing food'
  }, {
    name: 'Blacksmithing',
    key: 'blacksmithing',
    icon: '🔨',
    color: '#b0b0b0',
    desc: 'Forge melee gear bases with gem slots'
  }, {
    name: 'Woodworking',
    key: 'woodworking',
    icon: '🪚',
    color: '#8B6914',
    desc: 'Craft bows & staves with gem slots'
  }, {
    name: 'Gem Cutting',
    key: 'gemCutting',
    icon: '💎',
    color: '#a855f7',
    desc: 'Cut raw gems into polished slottable gems'
  }, {
    name: 'Enchanting',
    key: 'enchanting',
    icon: '✨',
    color: '#a78bfa',
    desc: 'Slot gems into gear for elemental power'
  }].map(function (sk) {
    var _rpgState$lifeSkills44;
    var skill = ((_rpgState$lifeSkills44 = rpgState.lifeSkills) === null || _rpgState$lifeSkills44 === void 0 ? void 0 : _rpgState$lifeSkills44[sk.key]) || {
      level: 1,
      xp: 0
    };
    var xpNeeded = LIFE_SKILL_XP(skill.level);
    var xpPct = Math.min(100, skill.xp / xpNeeded * 100);
    return /*#__PURE__*/React.createElement("div", {
      key: sk.key,
      style: {
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: sk.color
      }
    }, sk.icon, " ", sk.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'rgba(255,255,255,.5)'
      }
    }, "Lv ", skill.level)), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 5,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: xpPct + '%',
        height: '100%',
        background: sk.color,
        borderRadius: 3,
        transition: 'width .3s'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)',
        marginTop: 1
      }
    }, skill.xp, "/", xpNeeded, " XP \xB7 ", sk.desc));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      letterSpacing: '.05em',
      marginTop: 6,
      marginBottom: 4
    }
  }, "UTILITY"), [{
    name: 'Farming',
    key: 'farming',
    icon: '🌾',
    color: '#3dd497',
    desc: 'Grow ingredients at the farm'
  }, {
    name: 'Trapping',
    key: 'trapping',
    icon: '🪤',
    color: '#f5c542',
    desc: 'Capture weakened monsters as pets'
  }].map(function (sk) {
    var _rpgState$lifeSkills45;
    var skill = ((_rpgState$lifeSkills45 = rpgState.lifeSkills) === null || _rpgState$lifeSkills45 === void 0 ? void 0 : _rpgState$lifeSkills45[sk.key]) || {
      level: 1,
      xp: 0
    };
    var xpNeeded = LIFE_SKILL_XP(skill.level);
    var xpPct = Math.min(100, skill.xp / xpNeeded * 100);
    return /*#__PURE__*/React.createElement("div", {
      key: sk.key,
      style: {
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: sk.color
      }
    }, sk.icon, " ", sk.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'rgba(255,255,255,.5)'
      }
    }, "Lv ", skill.level)), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 5,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: xpPct + '%',
        height: '100%',
        background: sk.color,
        borderRadius: 3,
        transition: 'width .3s'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)',
        marginTop: 1
      }
    }, skill.xp, "/", xpNeeded, " XP \xB7 ", sk.desc));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(255,255,255,.1)',
      paddingTop: 8,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#a855f7',
      marginBottom: 4
    }
  }, "\uD83D\uDC8E Gems"), function (_rpgState$lifeSkills46) {
    var gems = ((_rpgState$lifeSkills46 = rpgState.lifeSkills) === null || _rpgState$lifeSkills46 === void 0 ? void 0 : _rpgState$lifeSkills46.gems) || {};
    var entries = Object.entries(gems).filter(function (_ref164) {
      var _ref165 = _slicedToArray(_ref164, 2),
        k = _ref165[0],
        v = _ref165[1];
      return v > 0;
    });
    if (entries.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "No gems yet. Harvest resources or kill monsters in elemental zones!");
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3,
        flexWrap: 'wrap'
      }
    }, entries.map(function (_ref166) {
      var _ZONE_RESOURCES$elem3, _ZONE_RESOURCES$elem4;
      var _ref167 = _slicedToArray(_ref166, 2),
        k = _ref167[0],
        v = _ref167[1];
      var parts = k.split('_'); /* raw_flame, polished_frost, etc */
      var qual = parts[0];
      var elem = parts[1];
      var gc = ((_ZONE_RESOURCES$elem3 = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem3 === void 0 ? void 0 : _ZONE_RESOURCES$elem3.gemColor) || '#a855f7';
      return /*#__PURE__*/React.createElement("span", {
        key: k,
        style: {
          fontSize: 7,
          padding: '2px 5px',
          borderRadius: 3,
          background: gc + '15',
          color: gc,
          border: '1px solid ' + gc + '30'
        }
      }, qual === 'raw' ? '◇' : '◆', " ", ((_ZONE_RESOURCES$elem4 = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem4 === void 0 ? void 0 : _ZONE_RESOURCES$elem4.gem) || elem + ' Gem', " \xD7", v);
    }));
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(255,255,255,.1)',
      paddingTop: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#5b52ff',
      marginBottom: 4
    }
  }, "\uD83D\uDCDC Active Quests"), function () {
    var active = Object.entries(rpgState._quests || {}).filter(function (_ref168) {
      var _ref169 = _slicedToArray(_ref168, 2),
        qid = _ref169[0],
        st = _ref169[1];
      return st === QUEST_STATUS.active;
    }).map(function (_ref170) {
      var _ref171 = _slicedToArray(_ref170, 1),
        qid = _ref171[0];
      return QUEST_CHAINS[qid];
    }).filter(Boolean);
    if (active.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "No active quests. Talk to NPCs with \u2757 markers!");
    return active.map(function (q) {
      var done = q.check(rpgState, stateRef.current);
      return /*#__PURE__*/React.createElement("div", {
        key: q.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 3,
          padding: '3px 6px',
          borderRadius: 4,
          background: 'rgba(255,255,255,.03)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          color: done ? '#3dd497' : '#f5c542'
        }
      }, done ? '✓' : '○'), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 600,
          color: '#fff'
        }
      }, q.title), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.4)'
        }
      }, q.desc)), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, q.npc));
    });
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(255,255,255,.1)',
      paddingTop: 8,
      marginTop: 4,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\u2B50 Achievement Points: ", rpgState.achievementPoints || 0), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#8890b8',
      marginBottom: 4
    }
  }, "\uD83D\uDCCA Player Stats"), function () {
    var cs = rpgState._compStats || createDefaultCompStats();
    /* Update playtime */
    var playmins = Math.floor(((cs.playtimeSeconds || 0) + (Date.now() - (cs._sessionStart || Date.now())) / 1000) / 60);
    var sections = [{
      label: 'Combat',
      color: '#ff5e6c',
      stats: [['Monsters Killed', cs.monstersKilled], ['Deaths', cs.deaths], ['Grand Slams', cs.grandSlams], ['Bosses Killed', cs.bossesKilled], ['Highest Kill Lv', cs.highestMonsterKill], ['Crits Landed', cs.critLanded], ['Collisions', cs.collisionsTriggered]]
    }, {
      label: 'PvP',
      color: '#a78bfa',
      stats: [['PvP Kills', cs.pvpKills], ['PvP Deaths', cs.pvpDeaths], ['Duels Won', cs.duelsWon], ['Duels Lost', cs.duelsLost]]
    }, {
      label: 'Life Skills',
      color: '#3dd497',
      stats: [['Fish Caught', cs.fishCaught], ['Trees Felled', cs.treesFelled], ['Ores Mined', cs.oresMined], ['Items Crafted', cs.itemsCrafted], ['Items Salvaged', cs.itemsSalvaged], ['Cook Success', cs.cookSuccess], ['Cook Burns', cs.cookBurns], ['Reforges', cs.reforgeAttempts], ['Harden OK', cs.hardenSuccess], ['Harden Fail', cs.hardenFails]]
    }, {
      label: 'Economy',
      color: '#f5c542',
      stats: [['Gold Earned', cs.totalGoldEarned], ['Gold Spent', cs.totalGoldSpent], ['Gold Lost (death)', cs.goldLostToDeath], ['Total Gambled', cs.totalGambled], ['Gamble Won', cs.totalGambleWon], ['Gamble Lost', cs.totalGambleLost]]
    }, {
      label: 'Progress',
      color: '#5b52ff',
      stats: [['Quests Done', cs.questsCompleted], ['Rare Drops', cs.rareDropsFound], ['Zones Explored', cs.zonesExplored], ['Dungeons Cleared', cs.dungeonsCleared], ['Pets Captured', cs.petsCapured], ['Playtime', playmins + 'min']]
    }];
    return sections.map(function (sec) {
      return /*#__PURE__*/React.createElement("div", {
        key: sec.label,
        style: {
          marginBottom: 4
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: sec.color,
          marginBottom: 2
        }
      }, sec.label), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1px 8px',
          fontSize: 7,
          color: 'rgba(255,255,255,.5)'
        }
      }, sec.stats.map(function (_ref172) {
        var _ref173 = _slicedToArray(_ref172, 2),
          k = _ref173[0],
          v = _ref173[1];
        return /*#__PURE__*/React.createElement(React.Fragment, {
          key: k
        }, /*#__PURE__*/React.createElement("span", null, k), /*#__PURE__*/React.createElement("span", {
          style: {
            textAlign: 'right',
            color: '#fff'
          }
        }, v || 0));
      })));
    });
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(255,255,255,.1)',
      paddingTop: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#00d4b8',
      marginBottom: 4
    }
  }, "\uD83D\uDCE6 Resources"), function () {
    var inv = rpgState.inventory || {};
    var items = Object.entries(inv).filter(function (_ref174) {
      var _ref175 = _slicedToArray(_ref174, 2),
        k = _ref175[0],
        v = _ref175[1];
      return v > 0;
    });
    if (items.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "No resources. Harvest nodes in combat zones!");
    /* Categorize */
    var fish = items.filter(function (_ref176) {
      var _ref177 = _slicedToArray(_ref176, 1),
        k = _ref177[0];
      return k.startsWith('fish_');
    });
    var wood = items.filter(function (_ref178) {
      var _ref179 = _slicedToArray(_ref178, 1),
        k = _ref179[0];
      return k.startsWith('wood_');
    });
    var ore = items.filter(function (_ref180) {
      var _ref181 = _slicedToArray(_ref180, 1),
        k = _ref181[0];
      return k.startsWith('ore_');
    });
    var herbs = items.filter(function (_ref182) {
      var _ref183 = _slicedToArray(_ref182, 1),
        k = _ref183[0];
      return k.startsWith('herb_');
    });
    var gear = items.filter(function (_ref184) {
      var _ref185 = _slicedToArray(_ref184, 1),
        k = _ref185[0];
      return k.startsWith('gear_');
    });
    var other = items.filter(function (_ref186) {
      var _ref187 = _slicedToArray(_ref186, 1),
        k = _ref187[0];
      return !k.startsWith('fish_') && !k.startsWith('wood_') && !k.startsWith('ore_') && !k.startsWith('herb_') && !k.startsWith('gear_');
    });
    var renderGroup = function renderGroup(label, emoji, color, arr) {
      if (arr.length === 0) return null;
      return React.createElement('div', {
        key: label,
        style: {
          marginBottom: 4
        }
      }, React.createElement('div', {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: color,
          marginBottom: 2
        }
      }, emoji + ' ' + label), React.createElement('div', {
        style: {
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap'
        }
      }, arr.map(function (_ref188) {
        var _ref189 = _slicedToArray(_ref188, 2),
          k = _ref189[0],
          v = _ref189[1];
        return React.createElement('span', {
          key: k,
          style: {
            fontSize: 7,
            padding: '1px 4px',
            borderRadius: 3,
            background: color + '15',
            color: color,
            border: '1px solid ' + color + '25'
          }
        }, k.replace(/^(fish|wood|ore|herb|gear)_/, '').replace(/_/g, ' ') + ' ×' + v);
      })));
    };
    return React.createElement(React.Fragment, null, renderGroup('Fish', '🎣', '#3498DB', fish), renderGroup('Wood', '🪓', '#8B6914', wood), renderGroup('Ore', '⛏️', '#8a8a8a', ore), renderGroup('Herbs', '🌿', '#3dd497', herbs), renderGroup('Gear', '🔨', '#b0b0b0', gear), other.length > 0 && renderGroup('Other', '📦', '#00d4b8', other));
  }())));
}
