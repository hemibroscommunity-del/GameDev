import React from 'react';
import { ARCHETYPES, BT_AUDIO, DUNGEON_MONSTER_PACKS, DUNGEON_TERRAIN_PACKS, ELEMENTS, TILE, createMonster, getDungeonCreatorUnlocks, validateCustomDungeon } from '@/data/index.js';
import { _defineProperty, _objectSpread, _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* ═══ DungeonCreatorPanel — custom dungeon builder (workshop) ═══ */
/* v2.3.863: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen) — the largest panel (~1073 lines).
   createElement subtree unchanged. 8 props; the ARCHETYPES, DUNGEON
   monster/terrain packs, ELEMENTS, TILE, createMonster,
   getDungeonCreatorUnlocks, validateCustomDungeon, BT_AUDIO data symbols
   plus babel helpers are imported (all verified real exports). No hoisted
   temps. setTimeout/localStorage are browser globals. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   presentation only: every handler, conditional, and store/launch code
   path is byte-identical. Segmented 36px tabs on a #121B20 track,
   11/600 uppercase module headers, recessed wells for config groups and
   the wave-summary/free-pack notes, 44px list rows, 32px pill chips
   (brass selection; element/archetype chips keep their content color as
   edge+label), gold.webp costs in brass tabular, ONE brass primary per
   region (Play Now) with a secondary Save, destructive triplet on
   remove/delete. elem-*.webp + evt-dungeon.webp + gold.webp icons use
   the onError emoji-fallback pattern from src/ui/mobile/dash/
   SkillsPanel.jsx. */

/* v2.3.1232: Lantern Slate style tokens — local, no shared module. */
var LS_CARD = {
  background: '#202C32',
  border: '1px solid rgba(238,242,235,.14)',
  borderRadius: 14,
  boxShadow: '0 14px 30px rgba(4,7,9,.38)'
};
var LS_HEADER = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  color: '#96A2A0'
};
var LS_WELL = {
  background: '#121B20',
  borderRadius: 10,
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)'
};
/* soft well for config groups / list rows (44px min rows) */
var LS_ROW = {
  minHeight: 44,
  boxSizing: 'border-box',
  background: '#19252A',
  border: '1px solid rgba(238,242,235,.08)',
  borderRadius: 8
};
/* 32px pill chip base — selection sites layer brass or content color */
var LS_CHIP = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  minHeight: 32,
  boxSizing: 'border-box',
  padding: '4px 12px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'inherit',
  fontVariantNumeric: 'tabular-nums',
  transition: 'all 140ms cubic-bezier(.2,.8,.2,1)'
};
/* v2.3.1232: UI-Bible icon with emoji fallback (onError replaceWith
   pattern from src/ui/mobile/dash/SkillsPanel.jsx) */
var lsIcon = function lsIcon(src, emoji, size) {
  return React.createElement('img', {
    src: src,
    alt: '',
    draggable: false,
    style: { width: size || 18, height: size || 18, objectFit: 'contain', flex: 'none' },
    onError: function (e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }
  });
};

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
    style: Object.assign({}, LS_CARD, {
      width: 360,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    })
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowDungeonCreator(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 4,
      minHeight: 24
    }
  }, lsIcon('/icons/ui/evt-dungeon.webp?v=2.3.1232', '🏗️', 20), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F7F2E7'
    }
  }, "Dungeon Workshop")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#96A2A0',
      textAlign: 'center',
      marginBottom: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, "Design custom dungeons \xB7 Max monster level: ", rpgState.level), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      marginBottom: 12,
      borderRadius: 10,
      padding: 3,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)'
    }
  }, [['design', 'Design'], ['monsters', 'Monsters'], ['store', 'Store'], ['play', 'Play']].map(function (_ref70) {
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
        height: 36,
        padding: '0 2px',
        fontSize: 12,
        fontWeight: 600,
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        background: dungeonCreatorTab === id ? '#2B3940' : 'transparent',
        boxShadow: dungeonCreatorTab === id ? 'inset 0 -2px 0 #D8A85F' : 'none',
        color: dungeonCreatorTab === id ? '#F7F2E7' : '#96A2A0',
        fontFamily: 'inherit',
        transition: 'all 140ms cubic-bezier(.2,.8,.2,1)'
      }
    }, label);
  })), dungeonCreatorTab === 'design' && function () {
    var dc = dungeonCreator;
    var unlocks = getDungeonCreatorUnlocks(rpgState);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 4
      })
    }, "Dungeon Name"), /*#__PURE__*/React.createElement("input", {
      value: dc.name,
      onChange: function onChange(e) {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          name: e.target.value.slice(0, 30)
        }));
      },
      style: {
        width: '100%',
        minHeight: 44,
        boxSizing: 'border-box',
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid rgba(238,242,235,.14)',
        background: '#121B20',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)',
        color: '#F7F2E7',
        caretColor: '#F0C878',
        fontSize: 16 /* v2.3.1233b: iOS zoom guard */,
        fontFamily: 'inherit',
        marginBottom: 10,
        outline: 'none'
      },
      placeholder: "My Dungeon"
    }), /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6
      })
    }, "Terrain Theme"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 10
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
        style: Object.assign({}, LS_CHIP, {
          border: '1px solid ' + (sel ? '#D8A85F' : unlocked ? 'rgba(238,242,235,.14)' : 'rgba(238,242,235,.08)'),
          background: sel ? '#3B3427' : 'transparent',
          color: sel ? '#D8A85F' : unlocked ? '#B9C1BF' : '#687575',
          cursor: unlocked ? 'pointer' : 'not-allowed'
        })
      }, /*#__PURE__*/React.createElement("span", null, p.icon), " ", p.name, !unlocked && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 600,
          color: '#687575',
          fontVariantNumeric: 'tabular-nums'
        }
      }, "🔒", p.reqBoss ? 'Boss' : '💰' + p.cost));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        marginBottom: 8,
        padding: '8px 10px',
        background: '#19252A',
        border: '1px solid rgba(238,242,235,.08)',
        borderRadius: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 2
      })
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
        fontSize: 12,
        fontWeight: 600,
        color: '#B9C1BF',
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums'
      }
    }, dc.width, " tiles")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 2
      })
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
        fontSize: 12,
        fontWeight: 600,
        color: '#B9C1BF',
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums'
      }
    }, dc.height, " tiles"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        marginBottom: 10,
        padding: '8px 10px',
        background: '#19252A',
        border: '1px solid rgba(238,242,235,.08)',
        borderRadius: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 2
      })
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
        fontSize: 12,
        fontWeight: 600,
        color: '#B9C1BF',
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums'
      }
    }, dc.waves, " waves")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 2
      })
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
        fontSize: 12,
        fontWeight: 600,
        color: '#B9C1BF',
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums'
      }
    }, "Lv ", dc.monsterLevel))), /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6
      })
    }, "Dungeon Element (optional)"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          element: null
        }));
      },
      style: Object.assign({}, LS_CHIP, {
        border: '1px solid ' + (dc.element === null ? '#D8A85F' : 'rgba(238,242,235,.14)'),
        background: dc.element === null ? '#3B3427' : 'transparent',
        color: dc.element === null ? '#D8A85F' : '#B9C1BF',
        cursor: 'pointer'
      })
    }, "⬜ None"), Object.entries(ELEMENTS).filter(function (_ref72) {
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
        style: Object.assign({}, LS_CHIP, {
          border: '1px solid ' + (dc.element === key ? el.color : bossBeaten ? 'rgba(238,242,235,.14)' : 'rgba(238,242,235,.08)'),
          background: dc.element === key ? el.color + '25' : 'transparent',
          color: bossBeaten ? dc.element === key ? el.color : '#B9C1BF' : '#687575',
          cursor: bossBeaten ? 'pointer' : 'not-allowed'
        })
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          opacity: bossBeaten ? 1 : .35
        }
      }, lsIcon('/icons/ui/elem-' + key + '.webp?v=2.3.1232', '●', 14)), key, !bossBeaten && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10
        }
      }, "🔒"));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        return setDungeonCreator(_objectSpread(_objectSpread({}, dc), {}, {
          hasBoss: !dc.hasBoss
        }));
      },
      style: Object.assign({}, LS_CHIP, {
        border: '1px solid ' + (dc.hasBoss ? '#D95C54' : 'rgba(238,242,235,.14)'),
        background: dc.hasBoss ? 'rgba(217,92,84,.15)' : 'transparent',
        color: dc.hasBoss ? '#D95C54' : '#B9C1BF',
        cursor: 'pointer'
      })
    }, "🐉 ", dc.hasBoss ? 'Boss Enabled' : 'No Boss'), dc.hasBoss && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: '#B9C1BF',
        fontVariantNumeric: 'tabular-nums'
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
        fontSize: 12,
        color: '#96A2A0',
        marginBottom: 8
      }
    }, "Configure monsters per wave. Each wave spawns these groups."), monsters.map(function (m, i) {
      var _ARCHETYPES$m$archety, _ARCHETYPES$m$archety2;
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: Object.assign({}, LS_ROW, {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          marginBottom: 4
        })
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 18
        }
      }, ((_ARCHETYPES$m$archety = ARCHETYPES[m.archetype]) === null || _ARCHETYPES$m$archety === void 0 ? void 0 : _ARCHETYPES$m$archety.emoji) || '❓'), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          fontWeight: 700,
          color: ((_ARCHETYPES$m$archety2 = ARCHETYPES[m.archetype]) === null || _ARCHETYPES$m$archety2 === void 0 ? void 0 : _ARCHETYPES$m$archety2.color) || '#B9C1BF'
        }
      }, m.archetype), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          color: '#96A2A0'
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
          fontSize: 12,
          fontWeight: 700,
          color: '#F7F2E7',
          minWidth: 14,
          fontVariantNumeric: 'tabular-nums'
        }
      }, m.count))), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return removeMonster(i);
        },
        style: {
          width: 28,
          height: 28,
          flex: 'none',
          borderRadius: 8,
          border: '1px solid #C7655F',
          background: '#7C3431',
          color: '#FFF1EE',
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, "✕"));
    }), /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginTop: 10,
        marginBottom: 6
      })
    }, "Add Monsters"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4
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
        style: Object.assign({}, LS_CHIP, {
          border: '1px solid ' + (unlocked ? a.color + '55' : 'rgba(238,242,235,.08)'),
          background: unlocked ? '#19252A' : 'transparent',
          color: unlocked ? a.color : '#687575',
          cursor: unlocked ? 'pointer' : 'not-allowed'
        })
      }, a.emoji, " ", key, !unlocked && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10
        }
      }, "🔒"));
    })), /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_WELL, {
        marginTop: 10,
        padding: '10px 12px',
        fontSize: 12,
        color: '#B9C1BF',
        fontVariantNumeric: 'tabular-nums'
      })
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Not enough gold!', '#D95C54');
        return;
      }
      R.coins -= cost;
      if (!R._ownedPacks) R._ownedPacks = [];
      if (!R._ownedPacks.includes(packId)) R._ownedPacks.push(packId);
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Pack purchased!', '#59BF91');
      BT_AUDIO.collect();
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
    };
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: '#96A2A0',
        marginBottom: 10
      }
    }, lsIcon('/icons/popups/gold.webp?v=2.3.1232', '💰', 16), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: '#D8A85F',
        fontVariantNumeric: 'tabular-nums'
      }
    }, rpgState.coins), " \xB7 Purchase content packs for your dungeons"), /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6
      })
    }, "Terrain Packs"), DUNGEON_TERRAIN_PACKS.filter(function (p) {
      return !p.free;
    }).map(function (p) {
      var owned = ownedPacks.includes(p.id);
      var bossReq = p.reqBoss;
      var bossBeaten = bossReq ? unlocks.bossesDefeated[bossReq] : true;
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        style: Object.assign({}, LS_ROW, {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          marginBottom: 4
        })
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 18
        }
      }, p.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          fontWeight: 600,
          color: owned ? '#59BF91' : '#F7F2E7'
        }
      }, p.name, " ", owned && '✓'), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: '#96A2A0'
        }
      }, p.desc), bossReq && !bossBeaten && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: '#C7655F'
        }
      }, "🔒 Defeat ", bossReq, " zone boss first")), !owned && bossBeaten && /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return buyPack(p.id, p.cost);
        },
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          minHeight: 32,
          boxSizing: 'border-box',
          padding: '4px 10px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'inherit',
          fontVariantNumeric: 'tabular-nums',
          border: '1px solid rgba(238,242,235,.14)',
          background: '#2B3940',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
          color: '#D8A85F',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }
      }, lsIcon('/icons/popups/gold.webp?v=2.3.1232', '💰', 16), " ", p.cost), owned && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          color: '#59BF91'
        }
      }, "Owned"));
    }), /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginTop: 12,
        marginBottom: 6
      })
    }, "Monster Packs"), DUNGEON_MONSTER_PACKS.filter(function (p) {
      return !p.free;
    }).map(function (p) {
      var owned = ownedPacks.includes(p.id);
      var bossReq = p.reqBoss;
      var bossBeaten = bossReq ? unlocks.bossesDefeated[bossReq] : true;
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        style: Object.assign({}, LS_ROW, {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          marginBottom: 4
        })
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 18
        }
      }, p.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          fontWeight: 600,
          color: owned ? '#59BF91' : '#F7F2E7'
        }
      }, p.name, " ", owned && '✓'), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: '#96A2A0'
        }
      }, p.desc), bossReq && !bossBeaten && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: '#C7655F'
        }
      }, "🔒 Defeat ", bossReq, " zone boss first")), !owned && bossBeaten && /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return buyPack(p.id, p.cost);
        },
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          minHeight: 32,
          boxSizing: 'border-box',
          padding: '4px 10px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'inherit',
          fontVariantNumeric: 'tabular-nums',
          border: '1px solid rgba(238,242,235,.14)',
          background: '#2B3940',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
          color: '#D8A85F',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }
      }, lsIcon('/icons/popups/gold.webp?v=2.3.1232', '💰', 16), " ", p.cost), owned && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          color: '#59BF91'
        }
      }, "Owned"));
    }), /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_WELL, {
        marginTop: 10,
        padding: '10px 12px',
        fontSize: 11,
        color: '#96A2A0'
      })
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Max 5 saved dungeons!', '#D95C54');
        return;
      }
      R._customDungeons.push(_objectSpread(_objectSpread({}, dc), {}, {
        created: Date.now()
      }));
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Dungeon saved!', '#59BF91');
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
        pushDmgPopup(S, P.x, P.y - 30, 'Entering dungeon...', '#a070e0');
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
      pushDmgPopup(S, P.x, P.y - 50, config.name, '#a070e0');
      pushDmgPopup(S, P.x, P.y - 35, 'Wave 1/' + config.waves, 'rgba(255,255,255,.5)');
      BT_AUDIO.beep(400, 0.1, 0.12, 'sine');
      setTimeout(function () {
        return BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
      }, 100);
      setShowDungeonCreator(false);
    };
    return /*#__PURE__*/React.createElement("div", null, errors.length > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 10,
        padding: '10px 12px',
        borderRadius: 10,
        background: '#121B20',
        border: '1px solid #C7655F',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        color: '#C7655F',
        marginBottom: 4
      })
    }, "⚠️ Issues"), errors.map(function (err, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          fontSize: 12,
          color: '#C7655F',
          padding: '2px 0'
        }
      }, "• ", err);
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 10,
        padding: '10px 12px',
        borderRadius: 10,
        background: '#19252A',
        border: '1px solid rgba(89,191,145,.4)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: '#59BF91'
      }
    }, "✅ Ready to play!"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#B9C1BF',
        marginTop: 3,
        fontVariantNumeric: 'tabular-nums'
      }
    }, dc.name, " \xB7 ", dc.waves, " waves \xB7 Lv", dc.monsterLevel, dc.element && ' · ' + dc.element, " ", dc.hasBoss && ' · Boss ×' + dc.bossMultiplier)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: saveDungeon,
      style: {
        flex: 1,
        minHeight: 44,
        padding: '10px 0',
        borderRadius: 11,
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'inherit',
        border: '1px solid rgba(238,242,235,.14)',
        background: '#2B3940',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
        color: '#F7F2E7',
        cursor: 'pointer'
      }
    }, "💾 Save Design"), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        return launchDungeon(dc);
      },
      disabled: errors.length > 0,
      style: {
        flex: 1,
        minHeight: 44,
        padding: '10px 0',
        borderRadius: 11,
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'inherit',
        border: errors.length ? '1px solid rgba(238,242,235,.08)' : 'none',
        background: errors.length ? '#19252A' : '#D8A85F',
        color: errors.length ? '#687575' : '#20170D',
        cursor: errors.length ? 'not-allowed' : 'pointer'
      }
    }, "▶️ Play Now")), /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6,
        fontVariantNumeric: 'tabular-nums'
      })
    }, "Saved Dungeons (", savedDungeons.length, "/5)"), savedDungeons.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#687575',
        fontStyle: 'italic'
      }
    }, "No saved dungeons yet"), savedDungeons.map(function (sd, i) {
      var sdErrors = validateCustomDungeon(sd, rpgState);
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: Object.assign({}, LS_ROW, {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          marginBottom: 4
        })
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          fontWeight: 600,
          color: '#F7F2E7'
        }
      }, sd.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: '#96A2A0',
          fontVariantNumeric: 'tabular-nums'
        }
      }, "Lv", sd.monsterLevel, " \xB7 ", sd.waves, "w ", sd.element || 'neutral', " ", sd.hasBoss ? '🐉' : '')), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return setDungeonCreator(_objectSpread({}, sd));
        },
        style: {
          minHeight: 28,
          padding: '3px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'inherit',
          border: '1px solid rgba(238,242,235,.14)',
          background: '#2B3940',
          color: '#B9C1BF',
          cursor: 'pointer'
        }
      }, "Edit"), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return launchDungeon(sd);
        },
        disabled: sdErrors.length > 0,
        style: {
          minHeight: 28,
          padding: '3px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'inherit',
          border: '1px solid ' + (sdErrors.length ? 'rgba(238,242,235,.08)' : 'rgba(89,191,145,.3)'),
          background: sdErrors.length ? 'transparent' : '#2B3940',
          color: sdErrors.length ? '#687575' : '#59BF91',
          cursor: sdErrors.length ? 'not-allowed' : 'pointer'
        }
      }, "▶️"), /*#__PURE__*/React.createElement("button", {
        onClick: function onClick() {
          return deleteDungeon(i);
        },
        style: {
          minHeight: 28,
          padding: '3px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'inherit',
          border: '1px solid #C7655F',
          background: '#7C3431',
          color: '#FFF1EE',
          cursor: 'pointer'
        }
      }, "🗑️"));
    }));
  }()));
}
