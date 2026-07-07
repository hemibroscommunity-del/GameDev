import React from 'react';
import { ARCHETYPES, BT_AUDIO, DUNGEON_MONSTER_PACKS, DUNGEON_TERRAIN_PACKS, ELEMENTS, TILE, createMonster, getDungeonCreatorUnlocks, validateCustomDungeon } from '@/data/index.js';
import { _defineProperty, _objectSpread, _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

/* ═══ DungeonCreatorPanel — custom dungeon builder (workshop) ═══ */
/* v2.3.863: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen) — the largest panel (~1073 lines).
   createElement subtree unchanged. 8 props; the ARCHETYPES, DUNGEON
   monster/terrain packs, ELEMENTS, TILE, createMonster,
   getDungeonCreatorUnlocks, validateCustomDungeon, BT_AUDIO data symbols
   plus babel helpers are imported (all verified real exports). No hoisted
   temps. setTimeout/localStorage are browser globals. */
export function DungeonCreatorPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    dungeonCreator = props.dungeonCreator,
    setDungeonCreator = props.setDungeonCreator,
    dungeonCreatorTab = props.dungeonCreatorTab,
    setDungeonCreatorTab = props.setDungeonCreatorTab,
    setRpgState = props.setRpgState,
    setShowDungeonCreator = props.setShowDungeonCreator;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowDungeonCreator(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 360,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowDungeonCreator(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#8050d0',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83C\uDFD7\uFE0F Dungeon Workshop"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, "Design custom dungeons \xB7 Max monster level: ", rpgState.level), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 10,
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)'
    }
  }, [['design', '🎨 Design'], ['monsters', '🐉 Monsters'], ['store', '🛒 Store'], ['play', '▶️ Play']].map(function (_ref70) {
    var _ref71 = _slicedToArray(_ref70, 2),
      id = _ref71[0],
      label = _ref71[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setDungeonCreatorTab(id);
      },
      style: {
        flex: 1,
        padding: '6px 2px',
        fontSize: 9,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: dungeonCreatorTab === id ? 'rgba(130,80,220,.2)' : 'rgba(255,255,255,.03)',
        color: dungeonCreatorTab === id ? '#a070e0' : 'rgba(255,255,255,.4)',
        fontFamily: 'inherit',
        transition: 'all .15s'
      }
    }, label);
  })), dungeonCreatorTab === 'design' && function () {
    var dc = dungeonCreator;
    var unlocks = getDungeonCreatorUnlocks(rpgState);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "Dungeon Name"), /*#__PURE__*/React.createElement("input", {
      value: dc.name,
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          name: e.target.value.slice(0, 30)
        }));
      },
      style: {
        width: '100%',
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.05)',
        color: '#fff',
        fontSize: 12,
        fontFamily: 'inherit',
        marginBottom: 8,
        outline: 'none'
      },
      placeholder: "My Dungeon"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "Terrain Theme"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
        marginBottom: 8
      }
    }, DUNGEON_TERRAIN_PACKS.map(function (p) {
      var unlocked = unlocks.terrains.includes(p.id);
      var sel = dc.terrain === p.id;
      return /*#__PURE__*/React.createElement("button", {
        key: p.id,
        onClick: function onClick() {
          return unlocked && setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
            terrain: p.id
          }));
        },
        style: {
          padding: '4px 7px',
          borderRadius: 5,
          fontSize: 8,
          fontWeight: 700,
          border: '1.5px solid ' + (sel ? '#a070e0' : unlocked ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)'),
          background: sel ? 'rgba(130,80,220,.2)' : unlocked ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.01)',
          color: sel ? '#c0a0f0' : unlocked ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.15)',
          cursor: unlocked ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: 3
        }
      }, /*#__PURE__*/React.createElement("span", null, p.icon), " ", p.name, !unlocked && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.2)'
        }
      }, "\uD83D\uDD12", p.reqBoss ? 'Boss' : '💰' + p.cost));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 2
      }
    }, "Width"), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: 20,
      max: 40,
      value: dc.width,
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          width: +e.target.value
        }));
      },
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        textAlign: 'center'
      }
    }, dc.width, " tiles")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 2
      }
    }, "Height"), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: 15,
      max: 35,
      value: dc.height,
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          height: +e.target.value
        }));
      },
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        textAlign: 'center'
      }
    }, dc.height, " tiles"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 2
      }
    }, "Waves (max ", unlocks.maxWaves, ")"), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: 1,
      max: unlocks.maxWaves,
      value: Math.min(dc.waves, unlocks.maxWaves),
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          waves: +e.target.value
        }));
      },
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        textAlign: 'center'
      }
    }, dc.waves, " waves")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 2
      }
    }, "Monster Level (max ", unlocks.maxLevel, ")"), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: 1,
      max: unlocks.maxLevel,
      value: Math.min(dc.monsterLevel, unlocks.maxLevel),
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          monsterLevel: +e.target.value
        }));
      },
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        textAlign: 'center'
      }
    }, "Lv ", dc.monsterLevel))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "Dungeon Element (optional)"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          element: null
        }));
      },
      style: {
        padding: '3px 8px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        border: '1.5px solid ' + (dc.element === null ? '#a070e0' : 'rgba(255,255,255,.1)'),
        background: dc.element === null ? 'rgba(130,80,220,.15)' : 'rgba(255,255,255,.03)',
        color: dc.element === null ? '#c0a0f0' : 'rgba(255,255,255,.5)',
        cursor: 'pointer'
      }
    }, "\u2B1C None"), Object.entries(ELEMENTS).filter(function (_ref72) {
      var _ref73 = _slicedToArray(_ref72, 2),
        k = _ref73[0],
        e = _ref73[1];
      return e.type !== 'endgame';
    }).map(function (_ref74) {
      var _ref75 = _slicedToArray(_ref74, 2),
        key = _ref75[0],
        el = _ref75[1];
      var bossReq = {
        flame: 'ember',
        frost: 'frost',
        venom: 'mist',
        storm: 'thunder',
        stone: 'hollows',
        wind: 'sky',
        water: 'tidal'
      }[key];
      var bossBeaten = unlocks.bossesDefeated[bossReq];
      return /*#__PURE__*/React.createElement("button", {
        key: key,
        onClick: function onClick() {
          return bossBeaten && setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
            element: key
          }));
        },
        style: {
          padding: '3px 8px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1.5px solid ' + (dc.element === key ? el.color : 'rgba(255,255,255,.1)'),
          background: dc.element === key ? el.color + '25' : 'rgba(255,255,255,.03)',
          color: bossBeaten ? dc.element === key ? el.color : 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.15)',
          cursor: bossBeaten ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 6,
          height: 6,
          borderRadius: 3,
          background: bossBeaten ? el.color : 'rgba(255,255,255,.1)',
          display: 'inline-block'
        }
      }), key, !bossBeaten && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6
        }
      }, "\uD83D\uDD12"));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          hasBoss: !dc.hasBoss
        }));
      },
      style: {
        padding: '4px 10px',
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 700,
        border: '1.5px solid ' + (dc.hasBoss ? '#ff5e6c' : 'rgba(255,255,255,.1)'),
        background: dc.hasBoss ? 'rgba(255,94,108,.15)' : 'rgba(255,255,255,.03)',
        color: dc.hasBoss ? '#ff5e6c' : 'rgba(255,255,255,.5)',
        cursor: 'pointer'
      }
    }, "\uD83D\uDC09 ", dc.hasBoss ? 'Boss Enabled' : 'No Boss'), dc.hasBoss && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "HP \xD7", dc.bossMultiplier), dc.hasBoss && /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: 2,
      max: 10,
      value: dc.bossMultiplier,
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          bossMultiplier: +e.target.value
        }));
      },
      style: {
        flex: 1
      }
    })));
  }(), dungeonCreatorTab === 'monsters' && function () {
    var dc = dungeonCreator;
    var unlocks = getDungeonCreatorUnlocks(rpgState);
    var monsters = dc.monsters || [];
    var addMonster = function addMonster(arch) {
      var updated = [].concat(_toConsumableArray(monsters), [{
        archetype: arch,
        count: 3,
        element: dc.element
      }]);
      setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
        monsters: updated
      }));
    };
    var removeMonster = function removeMonster(idx) {
      var updated = monsters.filter(function (_, i) {
        return i !== idx;
      });
      setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
        monsters: updated
      }));
    };
    var updateMonster = function updateMonster(idx, field, val) {
      var updated = monsters.map(function (m, i) {
        return i === idx ? _objectSpread(_objectSpread({}, m), {}, _defineProperty({}, field, val)) : m;
      });
      setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
        monsters: updated
      }));
    };
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 6
      }
    }, "Configure monsters per wave. Each wave spawns these groups."), monsters.map(function (m, i) {
      var _ARCHETYPES$m$archety, _ARCHETYPES$m$archety2;
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 6px',
          borderRadius: 5,
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.06)',
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14
        }
      }, ((_ARCHETYPES$m$archety = ARCHETYPES[m.archetype]) === null || _ARCHETYPES$m$archety === void 0 ? void 0 : _ARCHETYPES$m$archety.emoji) || '❓'), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: ((_ARCHETYPES$m$archety2 = ARCHETYPES[m.archetype]) === null || _ARCHETYPES$m$archety2 === void 0 ? void 0 : _ARCHETYPES$m$archety2.color) || '#aaa'
        }
      }, m.archetype), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, "Count:"), /*#__PURE__*/React.createElement("input", {
        type: "range",
        min: 1,
        max: 8,
        value: m.count,
        onChange: function onChange(e) {
          return updateMonster(i, 'count', +e.target.value);
        },
        style: {
          width: 60,
          height: 8
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: 'rgba(255,255,255,.5)',
          minWidth: 12
        }
      }, m.count))), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return removeMonster(i);
        },
        style: {
          width: 20,
          height: 20,
          borderRadius: 4,
          border: 'none',
          background: 'rgba(255,94,108,.2)',
          color: '#ff5e6c',
          fontSize: 10,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, "\u2715"));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginTop: 6,
        marginBottom: 3
      }
    }, "Add Monsters"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3
      }
    }, Object.entries(ARCHETYPES).map(function (_ref76) {
      var _ref77 = _slicedToArray(_ref76, 2),
        key = _ref77[0],
        a = _ref77[1];
      var pack = DUNGEON_MONSTER_PACKS.find(function (p) {
        var _p$archetypes2;
        return (_p$archetypes2 = p.archetypes) === null || _p$archetypes2 === void 0 ? void 0 : _p$archetypes2.includes(key);
      });
      var unlocked = pack && unlocks.monsters.includes(pack.id);
      return /*#__PURE__*/React.createElement("button", {
        key: key,
        onClick: function onClick() {
          return unlocked && addMonster(key);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1px solid ' + (unlocked ? a.color + '60' : 'rgba(255,255,255,.04)'),
          background: unlocked ? a.color + '10' : 'rgba(255,255,255,.01)',
          color: unlocked ? a.color : 'rgba(255,255,255,.12)',
          cursor: unlocked ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }
      }, a.emoji, " ", key, !unlocked && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6
        }
      }, "\uD83D\uDD12"));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: 6,
        borderRadius: 5,
        background: 'rgba(130,80,220,.08)',
        border: '1px solid rgba(130,80,220,.15)',
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, "Total per wave: ", monsters.reduce(function (s, m) {
      return s + m.count;
    }, 0), " monsters \xB7 ", dc.waves, " waves", dc.hasBoss && ' + Boss', " \xB7 Lv ", dc.monsterLevel));
  }(), dungeonCreatorTab === 'store' && function () {
    var unlocks = getDungeonCreatorUnlocks(rpgState);
    var ownedPacks = rpgState._ownedPacks || [];
    var buyPack = function buyPack(packId, cost) {
      var S = stateRef.current,
        R = S.rpg;
      if (!R || R.coins < cost) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Not enough gold!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      R.coins -= cost;
      if (!R._ownedPacks) R._ownedPacks = [];
      if (!R._ownedPacks.includes(packId)) R._ownedPacks.push(packId);
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Pack purchased!',
        color: '#3dd497',
        ts: Date.now()
      });
      BT_AUDIO.collect();
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
    };
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 6
      }
    }, "\uD83D\uDCB0 Gold: ", rpgState.coins, " \xB7 Purchase content packs for your dungeons"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#a070e0',
        marginBottom: 4
      }
    }, "\uD83D\uDDFA\uFE0F Terrain Packs"), DUNGEON_TERRAIN_PACKS.filter(function (p) {
      return !p.free;
    }).map(function (p) {
      var owned = ownedPacks.includes(p.id);
      var bossReq = p.reqBoss;
      var bossBeaten = bossReq ? unlocks.bossesDefeated[bossReq] : true;
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 6px',
          borderRadius: 5,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.06)',
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 16
        }
      }, p.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: owned ? '#3dd497' : '#fff'
        }
      }, p.name, " ", owned && '✓'), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, p.desc), bossReq && !bossBeaten && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: '#ff5e6c'
        }
      }, "\uD83D\uDD12 Defeat ", bossReq, " zone boss first")), !owned && bossBeaten && /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return buyPack(p.id, p.cost);
        },
        style: {
          padding: '3px 8px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1px solid rgba(245,197,66,.3)',
          background: 'rgba(245,197,66,.1)',
          color: '#f5c542',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }
      }, "\uD83D\uDCB0 ", p.cost, "G"), owned && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 8,
          color: '#3dd497',
          fontWeight: 700
        }
      }, "Owned"));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#a070e0',
        marginTop: 8,
        marginBottom: 4
      }
    }, "\uD83D\uDC09 Monster Packs"), DUNGEON_MONSTER_PACKS.filter(function (p) {
      return !p.free;
    }).map(function (p) {
      var owned = ownedPacks.includes(p.id);
      var bossReq = p.reqBoss;
      var bossBeaten = bossReq ? unlocks.bossesDefeated[bossReq] : true;
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 6px',
          borderRadius: 5,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.06)',
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 16
        }
      }, p.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: owned ? '#3dd497' : '#fff'
        }
      }, p.name, " ", owned && '✓'), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, p.desc), bossReq && !bossBeaten && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: '#ff5e6c'
        }
      }, "\uD83D\uDD12 Defeat ", bossReq, " zone boss first")), !owned && bossBeaten && /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return buyPack(p.id, p.cost);
        },
        style: {
          padding: '3px 8px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1px solid rgba(245,197,66,.3)',
          background: 'rgba(245,197,66,.1)',
          color: '#f5c542',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }
      }, "\uD83D\uDCB0 ", p.cost, "G"), owned && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 8,
          color: '#3dd497',
          fontWeight: 700
        }
      }, "Owned"));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: 6,
        borderRadius: 5,
        background: 'rgba(61,212,151,.05)',
        border: '1px solid rgba(61,212,151,.1)',
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, "Free packs included: Stone Halls terrain, Basic Beasts, Heavy Hitters, Dark Arts, Volatile Pack"));
  }(), dungeonCreatorTab === 'play' && function () {
    var dc = dungeonCreator;
    var errors = validateCustomDungeon(dc, rpgState);
    var savedDungeons = rpgState._customDungeons || [];
    var saveDungeon = function saveDungeon() {
      var S = stateRef.current,
        R = S.rpg;
      if (!R) return;
      if (!R._customDungeons) R._customDungeons = [];
      if (R._customDungeons.length >= 5) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Max 5 saved dungeons!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      R._customDungeons.push(_objectSpread(_objectSpread({}, dc), {}, {
        created: Date.now()
      }));
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Dungeon saved!',
        color: '#3dd497',
        ts: Date.now()
      });
      BT_AUDIO.collect();
    };
    var deleteDungeon = function deleteDungeon(idx) {
      var S = stateRef.current,
        R = S.rpg;
      if (!R || !R._customDungeons) return;
      R._customDungeons.splice(idx, 1);
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
    };
    var launchDungeon = function launchDungeon(config) {
      var launchErrors = validateCustomDungeon(config, rpgState);
      if (launchErrors.length > 0) return;
      var S = stateRef.current,
        P = S.player;
      /* v2.3.1127: server-authoritative dungeons.  When the worker
         advertises caps.dungeon, the run is requested from the server
         (it re-validates the config, spawns the waves into a private
         instance zone, and settles the completion rewards) -- the
         arena visuals are built when dungeon_started comes back
         (gameEvents.js).  The local spawn below stays as the fallback
         for old workers, per the deploy-order safety rule. */
      if (S._serverCaps && S._serverCaps.dungeon && S.channel) {
        try {
          S.channel.send({ type: 'broadcast', event: 'dungeon_start', payload: { config: config } });
        } catch (e) {}
        S.dmgNumbers.push({
          x: P.x,
          y: P.y - 30,
          text: 'Entering dungeon...',
          color: '#a070e0',
          ts: Date.now()
        });
        setShowDungeonCreator(false);
        return;
      }
      var terrain = DUNGEON_TERRAIN_PACKS.find(function (t) {
        return t.id === config.terrain;
      }) || DUNGEON_TERRAIN_PACKS[0];
      /* Generate custom dungeon arena */
      var dW = config.width,
        dH = config.height;
      S._preDungeonMap = S.map;
      S._preDungeonMonsters = S.monsters;
      S._preDungeonNodes = S.gatherNodes;
      S._preDungeonPos = {
        x: P.x,
        y: P.y
      };
      var dMap = Array.from({
        length: dH
      }, function () {
        return Array(dW).fill(0);
      });
      for (var x = 0; x < dW; x++) {
        dMap[0][x] = 7;
        dMap[dH - 1][x] = 7;
      }
      for (var y = 0; y < dH; y++) {
        dMap[y][0] = 7;
        dMap[y][dW - 1] = 7;
      }
      var dMX = Math.floor(dW / 2),
        dMY = Math.floor(dH / 2);
      for (var _x18 = 1; _x18 < dW - 1; _x18++) dMap[dMY][_x18] = 1;
      for (var _y16 = 1; _y16 < dH - 1; _y16++) dMap[_y16][dMX] = 1;
      /* Scattered path tiles for visual variety */
      for (var i = 0; i < Math.floor(dW * dH * 0.08); i++) {
        var rx = 2 + Math.floor(Math.random() * (dW - 4));
        var ry = 2 + Math.floor(Math.random() * (dH - 4));
        dMap[ry][rx] = 1;
      }
      dMap[dH - 1][dMX] = 9;
      dMap[dH - 1][dMX + 1] = 9;
      S.map = dMap;
      globalThis.TOWN_W = dW * TILE;
      globalThis.TOWN_H = dH * TILE;
      globalThis.COLS = dW;
      globalThis.ROWS = dH;
      /* Set up custom dungeon state */
      S._inDungeon = true;
      S._inCustomDungeon = true;
      S._customDungeonConfig = config;
      S._customDungeonTerrain = terrain;
      S._dungeonZone = S.currentZone;
      S._dungeonDepth = 'shallow';
      S._dungeonWave = 0;
      S._dungeonMaxWaves = config.waves;
      S._dungeonBossSpawned = false;
      S._dungeonComplete = false;
      /* Spawn first wave from config */
      S.monsters = [];
      var waveArchs = config.monsters || [{
        archetype: 'fodder',
        count: 4,
        element: null
      }];
      waveArchs.forEach(function (mg, gi) {
        for (var wi = 0; wi < mg.count; wi++) {
          var mx = (3 + Math.random() * (dW - 6)) * TILE;
          var my = (2 + Math.random() * (dH / 2 - 2)) * TILE;
          var m = createMonster('cdw-0-' + gi + '-' + wi, mg.archetype, config.monsterLevel + Math.floor(Math.random() * 3), mx, my, config.element || mg.element);
          m.curHp = m.hp;
          m.type = mg.archetype;
          S.monsters.push(m);
        }
      });
      S.gatherNodes = [];
      S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
      S.hitParticles = [];
      S.deathExplosions = [];
      S.arrows = [];
      S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */
      P.x = dMX * TILE;
      P.y = (dH - 3) * TILE;
      S._zoneWipe = Date.now();
      S.dmgNumbers.push({
        x: P.x,
        y: P.y - 50,
        text: config.name,
        color: '#a070e0',
        ts: Date.now()
      });
      S.dmgNumbers.push({
        x: P.x,
        y: P.y - 35,
        text: 'Wave 1/' + config.waves,
        color: 'rgba(255,255,255,.5)',
        ts: Date.now()
      });
      BT_AUDIO.beep(400, 0.1, 0.12, 'sine');
      setTimeout(function () {
        return BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
      }, 100);
      setShowDungeonCreator(false);
    };
    return /*#__PURE__*/React.createElement("div", null, errors.length > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#ff5e6c',
        marginBottom: 3
      }
    }, "\u26A0\uFE0F Issues"), errors.map(function (err, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          fontSize: 8,
          color: '#ff5e6c',
          padding: '2px 0'
        }
      }, "\u2022 ", err);
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8,
        padding: 6,
        borderRadius: 5,
        background: 'rgba(61,212,151,.08)',
        border: '1px solid rgba(61,212,151,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#3dd497'
      }
    }, "\u2705 Ready to play!"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)',
        marginTop: 2
      }
    }, dc.name, " \xB7 ", dc.waves, " waves \xB7 Lv", dc.monsterLevel, dc.element && ' · ' + dc.element, " ", dc.hasBoss && ' · Boss ×' + dc.bossMultiplier)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: saveDungeon,
      style: {
        flex: 1,
        padding: '8px 0',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        border: '1px solid rgba(245,197,66,.3)',
        background: 'rgba(245,197,66,.1)',
        color: '#f5c542',
        cursor: 'pointer'
      }
    }, "\uD83D\uDCBE Save Design"), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        return launchDungeon(dc);
      },
      disabled: errors.length > 0,
      style: {
        flex: 1,
        padding: '8px 0',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        border: '1px solid ' + (errors.length ? 'rgba(255,255,255,.06)' : 'rgba(61,212,151,.4)'),
        background: errors.length ? 'rgba(255,255,255,.02)' : 'rgba(61,212,151,.15)',
        color: errors.length ? 'rgba(255,255,255,.15)' : '#3dd497',
        cursor: errors.length ? 'not-allowed' : 'pointer'
      }
    }, "\u25B6\uFE0F Play Now")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#a070e0',
        marginBottom: 4
      }
    }, "\uD83D\uDCBE Saved Dungeons (", savedDungeons.length, "/5)"), savedDungeons.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.2)',
        fontStyle: 'italic'
      }
    }, "No saved dungeons yet"), savedDungeons.map(function (sd, i) {
      var sdErrors = validateCustomDungeon(sd, rpgState);
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 6px',
          borderRadius: 5,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.06)',
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: '#fff'
        }
      }, sd.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.3)'
        }
      }, "Lv", sd.monsterLevel, " \xB7 ", sd.waves, "w ", sd.element || 'neutral', " ", sd.hasBoss ? '🐉' : '')), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return setDungeonCreator(_objectSpread({}, sd));
        },
        style: {
          padding: '3px 6px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid rgba(255,255,255,.1)',
          background: 'rgba(255,255,255,.04)',
          color: 'rgba(255,255,255,.5)',
          cursor: 'pointer'
        }
      }, "Edit"), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return launchDungeon(sd);
        },
        disabled: sdErrors.length > 0,
        style: {
          padding: '3px 6px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid ' + (sdErrors.length ? 'rgba(255,255,255,.06)' : 'rgba(61,212,151,.3)'),
          background: sdErrors.length ? 'rgba(255,255,255,.02)' : 'rgba(61,212,151,.1)',
          color: sdErrors.length ? 'rgba(255,255,255,.15)' : '#3dd497',
          cursor: sdErrors.length ? 'not-allowed' : 'pointer'
        }
      }, "\u25B6\uFE0F"), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return deleteDungeon(i);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid rgba(255,94,108,.2)',
          background: 'rgba(255,94,108,.08)',
          color: '#ff5e6c',
          cursor: 'pointer'
        }
      }, "\uD83D\uDDD1\uFE0F"));
    }));
  }()));
}
