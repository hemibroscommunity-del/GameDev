import React from 'react';
import { ARCHETYPES, BLACKSMITH_TIERS, COLLISION_TABLE, COOKING_RECIPES, EFFECTIVENESS, ELEMENTS, FISHING_TIERS, MINING_TIERS, WOODCUTTING_TIERS, WOODWORKING_TIERS, ZONES, discoveredCollisions, discoveredMaterials, discoveredMonsters, visitedZones } from '@/data/index.js';
import { _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

/* ═══ EncyclopediaPanel — discovery compendium (monsters/materials/etc.) ═══ */
/* v2.3.864: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged.
   Notably reads NO rpgState/stateRef — discovery state comes from the
   imported discoveredCollisions/discoveredMaterials/discoveredMonsters/
   visitedZones selectors. 3 props (encyclopediaTab + setter +
   setShowEncyclopedia). Data + babel imports verified real exports.
   `_key$split2` babel temp hoisted to BroTown top; declared locally. */
export function EncyclopediaPanel(props) {
  var encyclopediaTab = props.encyclopediaTab,
    setEncyclopediaTab = props.setEncyclopediaTab,
    setShowEncyclopedia = props.setShowEncyclopedia;
  var _key$split2;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowEncyclopedia(false);
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
      return setShowEncyclopedia(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#00d4b8',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83D\uDCD6 Encyclopedia"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, discoveredMonsters.size, " creatures \xB7 ", discoveredCollisions.size, " collisions \xB7 ", discoveredMaterials.size, " materials \xB7 ", visitedZones.size, " zones"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 10,
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)'
    }
  }, [['bestiary', '🐉 Bestiary'], ['codex', '⚗️ Codex'], ['materials', '⛏️ Materials'], ['zones', '🗺️ Zones']].map(function (_ref44) {
    var _ref45 = _slicedToArray(_ref44, 2),
      id = _ref45[0],
      label = _ref45[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setEncyclopediaTab(id);
      },
      style: {
        flex: 1,
        padding: '6px 2px',
        fontSize: 9,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: encyclopediaTab === id ? 'rgba(0,212,184,.2)' : 'rgba(255,255,255,.03)',
        color: encyclopediaTab === id ? '#00d4b8' : 'rgba(255,255,255,.4)',
        fontFamily: 'inherit',
        transition: 'all .15s'
      }
    }, label);
  })), encyclopediaTab === 'bestiary' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Kill monsters to discover entries. ", discoveredMonsters.size, "/", function () {
    var t = 0;
    Object.values(ZONES).forEach(function (z) {
      if (z.spawns && z.spawns.length) z.spawns.forEach(function (s) {
        return t++;
      });
    });
    return t;
  }()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "Archetypes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 3,
      marginBottom: 8
    }
  }, Object.entries(ARCHETYPES).map(function (_ref46) {
    var _ref47 = _slicedToArray(_ref46, 2),
      key = _ref47[0],
      a = _ref47[1];
    var anyDiscovered = _toConsumableArray(discoveredMonsters).some(function (k) {
      return k.startsWith(key + ':');
    });
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        background: anyDiscovered ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.02)',
        border: '1px solid ' + (anyDiscovered ? a.color + '60' : 'rgba(255,255,255,.06)'),
        color: anyDiscovered ? a.color : 'rgba(255,255,255,.15)'
      }
    }, anyDiscovered ? a.emoji : '❓', " ", anyDiscovered ? key : '???', anyDiscovered && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        marginLeft: 3
      }
    }, "HP\xD7", a.hpMult, " DMG\xD7", a.dmgMult, " SPD\xD7", a.spdMult));
  })), Object.values(ZONES).filter(function (z) {
    return z.spawns && z.spawns.length > 0;
  }).map(function (zone) {
    var _ELEMENTS$zone$elemen;
    var zoneDiscovered = zone.spawns.filter(function (s) {
      return discoveredMonsters.has(s.arch + ':' + zone.id);
    });
    var zoneEmojis = zone.enemyEmoji || {};
    return /*#__PURE__*/React.createElement("div", {
      key: zone.id,
      style: {
        marginBottom: 8,
        padding: 6,
        borderRadius: 6,
        background: 'rgba(255,255,255,.02)',
        border: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4
      }
    }, zone.element && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 4,
        background: (_ELEMENTS$zone$elemen = ELEMENTS[zone.element]) === null || _ELEMENTS$zone$elemen === void 0 ? void 0 : _ELEMENTS$zone$elemen.color,
        display: 'inline-block'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: zone.element ? ELEMENTS[zone.element].color : '#fff'
      }
    }, zone.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)'
      }
    }, "Lv", zone.level[0], "-", zone.level[1]), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 'auto'
      }
    }, zoneDiscovered.length, "/", zone.spawns.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3
      }
    }, zone.spawns.map(function (s, i) {
      var found = discoveredMonsters.has(s.arch + ':' + zone.id);
      var arch = ARCHETYPES[s.arch];
      var emoji = zoneEmojis[s.arch] || (arch === null || arch === void 0 ? void 0 : arch.emoji) || '❓';
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 8,
          background: found ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.01)',
          border: '1px solid ' + (found ? ((arch === null || arch === void 0 ? void 0 : arch.color) || '#666') + '40' : 'rgba(255,255,255,.04)'),
          color: found ? (arch === null || arch === void 0 ? void 0 : arch.color) || '#aaa' : 'rgba(255,255,255,.12)'
        }
      }, found ? emoji : '❓', " ", found ? s.arch : '???', found && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)',
          marginLeft: 2
        }
      }, "\xD7", s.count));
    })));
  })), encyclopediaTab === 'codex' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "Elements"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 3,
      marginBottom: 10
    }
  }, Object.entries(ELEMENTS).map(function (_ref48) {
    var _ref49 = _slicedToArray(_ref48, 2),
      key = _ref49[0],
      el = _ref49[1];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        padding: '3px 7px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        background: el.color + '18',
        border: '1px solid ' + el.color + '40',
        color: el.color,
        display: 'flex',
        alignItems: 'center',
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: 3,
        background: el.color,
        display: 'inline-block'
      }
    }), key, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "\u2192", el.status));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "Effectiveness Circle"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 10,
      fontSize: 8,
      color: 'rgba(255,255,255,.5)'
    }
  }, EFFECTIVENESS.map(function (_ref50, i) {
    var _ELEMENTS$a, _ELEMENTS$b;
    var _ref51 = _slicedToArray(_ref50, 2),
      a = _ref51[0],
      b = _ref51[1];
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        padding: '1px 4px',
        borderRadius: 3,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$a = ELEMENTS[a]) === null || _ELEMENTS$a === void 0 ? void 0 : _ELEMENTS$a.color
      }
    }, a), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.2)'
      }
    }, " \u2192 "), /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$b = ELEMENTS[b]) === null || _ELEMENTS$b === void 0 ? void 0 : _ELEMENTS$b.color
      }
    }, b));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "Collisions (", discoveredCollisions.size, "/", Object.keys(COLLISION_TABLE).length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Apply two different elements to trigger a collision reaction"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, Object.entries(COLLISION_TABLE).map(function (_ref52) {
    var _ELEMENTS$e, _ELEMENTS$e2;
    var _ref53 = _slicedToArray(_ref52, 2),
      key = _ref53[0],
      coll = _ref53[1];
    var found = discoveredCollisions.has(coll.id);
    var _key$split = key.split('|'),
      _key$split2 = _slicedToArray(_key$split, 2),
      e1 = _key$split2[0],
      e2 = _key$split2[1];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 6px',
        borderRadius: 4,
        background: found ? 'rgba(0,212,184,.06)' : 'rgba(255,255,255,.01)',
        border: '1px solid ' + (found ? 'rgba(0,212,184,.15)' : 'rgba(255,255,255,.04)')
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: 3,
        background: found ? ((_ELEMENTS$e = ELEMENTS[e1]) === null || _ELEMENTS$e === void 0 ? void 0 : _ELEMENTS$e.color) || '#666' : 'rgba(255,255,255,.1)',
        display: 'inline-block'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: found ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.1)',
        minWidth: 28
      }
    }, found ? e1 : '??'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.15)'
      }
    }, "+"), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: 3,
        background: found ? ((_ELEMENTS$e2 = ELEMENTS[e2]) === null || _ELEMENTS$e2 === void 0 ? void 0 : _ELEMENTS$e2.color) || '#666' : 'rgba(255,255,255,.1)',
        display: 'inline-block'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: found ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.1)',
        minWidth: 28
      }
    }, found ? e2 : '??'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.15)',
        margin: '0 2px'
      }
    }, "="), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: found ? '#00d4b8' : 'rgba(255,255,255,.1)',
        flex: 1
      }
    }, found ? coll.name : '???'), found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)'
      }
    }, coll.type));
  }))), encyclopediaTab === 'materials' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#795548',
      marginBottom: 4
    }
  }, "\u26CF\uFE0F Mining Ores"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, MINING_TIERS.map(function (t, i) {
    var found = discoveredMaterials.has('mining:' + t.name);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: found ? t.streakColor + '18' : 'rgba(255,255,255,.02)',
        border: '1px solid ' + (found ? t.streakColor + '40' : 'rgba(255,255,255,.05)'),
        color: found ? t.streakColor : 'rgba(255,255,255,.12)'
      }
    }, found ? '⛏️' : '❓', " ", found ? t.name : '???', found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 2
      }
    }, "Lv", t.lvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#6b4226',
      marginBottom: 4
    }
  }, "\uD83E\uDE93 Woodcutting"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, WOODCUTTING_TIERS.map(function (t, i) {
    var found = discoveredMaterials.has('woodcutting:' + t.name);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: found ? t.canopyColor + '18' : 'rgba(255,255,255,.02)',
        border: '1px solid ' + (found ? t.canopyColor + '40' : 'rgba(255,255,255,.05)'),
        color: found ? t.canopyColor : 'rgba(255,255,255,.12)'
      }
    }, found ? '🪓' : '❓', " ", found ? t.name : '???', found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 2
      }
    }, "Lv", t.lvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#3498DB',
      marginBottom: 4
    }
  }, "\uD83C\uDFA3 Fishing"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, FISHING_TIERS.map(function (t, i) {
    var found = discoveredMaterials.has('fishing:' + t.name);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: found ? 'rgba(52,152,219,.15)' : 'rgba(255,255,255,.02)',
        border: '1px solid ' + (found ? 'rgba(52,152,219,.3)' : 'rgba(255,255,255,.05)'),
        color: found ? '#3498DB' : 'rgba(255,255,255,.12)'
      }
    }, found ? '🎣' : '❓', " ", found ? t.name : '???', found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 2
      }
    }, "Lv", t.lvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#c0c0c8',
      marginBottom: 4
    }
  }, "\uD83D\uDD28 Blacksmith Metals"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, Object.entries(BLACKSMITH_TIERS).map(function (_ref54) {
    var _ref55 = _slicedToArray(_ref54, 2),
      key = _ref55[0],
      t = _ref55[1];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: t.color + '18',
        border: '1px solid ' + t.color + '40',
        color: t.color
      }
    }, t.label, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 2
      }
    }, "Lv", t.minLvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#a08050',
      marginBottom: 4
    }
  }, "\uD83E\uDEB5 Woodworking"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, Object.entries(WOODWORKING_TIERS).map(function (_ref56) {
    var _ref57 = _slicedToArray(_ref56, 2),
      key = _ref57[0],
      t = _ref57[1];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: t.color + '18',
        border: '1px solid ' + t.color + '40',
        color: t.color
      }
    }, t.label, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 2
      }
    }, "Lv", t.minLvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#ea580c',
      marginBottom: 4
    }
  }, "\uD83D\uDD25 Cooking Recipes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, COOKING_RECIPES.map(function (r, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        borderRadius: 3,
        background: 'rgba(234,88,12,.05)',
        border: '1px solid rgba(234,88,12,.15)',
        fontSize: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: '#ea580c',
        minWidth: 70
      }
    }, r.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Lv", r.cookLvl), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)',
        marginLeft: 'auto'
      }
    }, r.buff === 'heal' ? '❤️ +' + r.power + ' HP' : r.buff === 'regen' ? '💚 Regen' : r.buff === 'resist' ? '🛡️ Resist' : r.buff === 'damage' ? '⚔️ DMG' : r.buff === 'all' ? '✨ All' : '🍖', r.duration ? ' (' + r.duration + 's)' : ''));
  }))), encyclopediaTab === 'zones' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Visited ", visitedZones.size, "/", Object.keys(ZONES).length, " zones"), Object.values(ZONES).map(function (zone) {
    var visited = visitedZones.has(zone.id) || zone.id === 'town';
    var elem = zone.element ? ELEMENTS[zone.element] : null;
    var sec = zone.secondary ? ELEMENTS[zone.secondary] : null;
    return /*#__PURE__*/React.createElement("div", {
      key: zone.id,
      style: {
        padding: 8,
        borderRadius: 6,
        marginBottom: 4,
        background: visited ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.01)',
        border: '1px solid ' + (visited ? ((elem === null || elem === void 0 ? void 0 : elem.color) || '#5b52ff') + '30' : 'rgba(255,255,255,.04)')
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2
      }
    }, elem && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 4,
        background: elem.color,
        display: 'inline-block'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: visited ? (elem === null || elem === void 0 ? void 0 : elem.color) || '#fff' : 'rgba(255,255,255,.12)'
      }
    }, visited ? zone.name : '???'), visited && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        marginLeft: 'auto'
      }
    }, "Lv", zone.level[0], "-", zone.level[1])), visited && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        fontSize: 7
      }
    }, zone.element && /*#__PURE__*/React.createElement("span", {
      style: {
        color: elem === null || elem === void 0 ? void 0 : elem.color,
        padding: '1px 4px',
        borderRadius: 2,
        background: (elem === null || elem === void 0 ? void 0 : elem.color) + '15'
      }
    }, zone.element), zone.secondary && /*#__PURE__*/React.createElement("span", {
      style: {
        color: sec === null || sec === void 0 ? void 0 : sec.color,
        padding: '1px 4px',
        borderRadius: 2,
        background: (sec === null || sec === void 0 ? void 0 : sec.color) + '15'
      }
    }, "+", zone.secondary), zone.safe && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#3dd497',
        padding: '1px 4px',
        borderRadius: 2,
        background: 'rgba(61,212,151,.1)'
      }
    }, "Safe"), zone.lawless && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#ff5e6c',
        padding: '1px 4px',
        borderRadius: 2,
        background: 'rgba(255,94,108,.1)'
      }
    }, "PvP"), zone.endgame && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#f5c542',
        padding: '1px 4px',
        borderRadius: 2,
        background: 'rgba(245,197,66,.1)'
      }
    }, "Endgame"), zone.personal && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#3dd497',
        padding: '1px 4px',
        borderRadius: 2,
        background: 'rgba(61,212,151,.1)'
      }
    }, "Personal"), zone.spawns && zone.spawns.length > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.2)'
      }
    }, zone.spawns.length, " enemy types")), !visited && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.1)',
        fontStyle: 'italic'
      }
    }, "Travel here to discover"));
  }))));
}
