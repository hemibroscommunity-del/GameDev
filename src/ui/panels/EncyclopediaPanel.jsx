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
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   presentation only: same tabs, same discovery reads, same conditionals.
   Segmented 36px tabs, 11/600 uppercase section headers, recessed wells
   for the collision/recipe lists, pill chips for discovery tags; the old
   teal accent maps to the semantic positive green, data-driven content
   colors (elements/tiers/archetypes) are kept as content color. */

/* v2.3.1235: batch-2 rollout — correction-pass compliance
   (docs/LANTERN-SLATE-SPEC.md + game.css :root). Presentation only,
   every handler byte-identical. v2.3.1232 tokens remapped onto the
   approved v2.3.1235 set (sheet #1E2E34, raised #293B41, well #111E23,
   text #F4F0E7/#B6C1BE/#8D9B98, faint #667875, lines
   rgba(229,237,233,.11/.20)); section headers drop their emoji (no
   emoji in chrome — the creature/material glyphs INSIDE chips are codex
   game data and stay); tabs grow to 44px hitboxes; 10px captions rise
   to the 11px text floor; maxHeight caps at the .bt-inspect content
   box so the card never slides under the dashboard band. */

/* v2.3.1232: Lantern Slate style tokens — local, no shared module. */
/* v2.3.1235: batch-2 rollout — sheet surface, strong hairline and the
   shared .ui-panel shadow recipe for the floating modal card. */
var LS_CARD = {
  background: '#1E2E34',
  border: '1px solid rgba(229,237,233,.20)',
  borderRadius: 14,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045), 0 14px 36px rgba(3,8,10,0.30)'
};
/* v2.3.1235: batch-2 rollout — section headers are 11/700 uppercase
   .14em muted per the locked contract. */
var LS_HEADER = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.14em',
  color: '#8D9B98'
};
/* v2.3.1235: batch-2 rollout — corrected well token + shared .ui-well
   shadow recipe; do not mint per-screen grays. */
var LS_WELL = {
  background: '#111E23',
  borderRadius: 10,
  boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)'
};
var LS_DIVIDER = '1px solid rgba(229,237,233,.11)'; /* v2.3.1235: batch-2 rollout — hairline token */
/* discovery pill chips: found = quiet raised tag w/ content color, unfound = ghost */
/* v2.3.1235: batch-2 rollout — found chips sit on the raised token; the
   content-color border (data-driven element/tier tint) is game data and
   stays; ghost chips use the line + faint tokens. */
var lsChip = function lsChip(found, color) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    minHeight: 28,
    boxSizing: 'border-box',
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    background: found ? '#293B41' : 'transparent',
    border: '1px solid ' + (found ? color + '45' : 'rgba(229,237,233,.11)'),
    color: found ? color : '#667875'
  };
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
    style: Object.assign({}, LS_CARD, {
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 340 fixed — fill narrow phones, never overflow */
      /* v2.3.1235: batch-2 rollout — also cap at 100% of the .bt-inspect
         content box (it reserves dashboard clearance); a bare 85vh can
         exceed the box on short phones and slide under the band. */
      maxHeight: 'min(85vh, 100%)',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    })
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowEncyclopedia(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
      minHeight: 24
    }
  }, lsIcon('/icons/ui/panel-encyclopedia.webp?v=2.3.1232', '📖', 20), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F4F0E7'
    }
  }, "Encyclopedia")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#8D9B98',
      marginBottom: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, discoveredMonsters.size, " creatures \xB7 ", discoveredCollisions.size, " collisions \xB7 ", discoveredMaterials.size, " materials \xB7 ", visitedZones.size, " zones"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: batch-2 rollout — corrected well token + shared .ui-well
       shadow recipe on the segmented track. */
    style: {
      display: 'flex',
      gap: 3,
      marginBottom: 14,
      borderRadius: 10,
      padding: 3,
      background: '#111E23',
      boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)'
    }
  }, [['bestiary', 'Bestiary'], ['codex', 'Codex'], ['materials', 'Materials'], ['zones', 'Zones']].map(function (_ref44) {
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
        minHeight: 44 /* v2.3.1235: batch-2 rollout — tabs meet the ≥44px hitbox floor (was 36) */,
        padding: '0 2px',
        fontSize: 12,
        fontWeight: 600,
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        /* v2.3.1235: batch-2 rollout — corrected raised/brass/text tokens */
        background: encyclopediaTab === id ? '#293B41' : 'transparent',
        boxShadow: encyclopediaTab === id ? 'inset 0 -2px 0 #D8AA58' : 'none',
        color: encyclopediaTab === id ? '#F4F0E7' : '#8D9B98',
        fontFamily: 'inherit',
        transition: 'all 140ms cubic-bezier(.2,.8,.2,1)'
      }
    }, label);
  })), encyclopediaTab === 'bestiary' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#8D9B98',
      marginBottom: 10,
      fontVariantNumeric: 'tabular-nums'
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
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, "Archetypes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 14
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
      style: lsChip(anyDiscovered, a.color)
    }, anyDiscovered ? a.emoji : '❓', " ", anyDiscovered ? key : '???', anyDiscovered && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        marginLeft: 2
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
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minHeight: 24,
        marginBottom: 6
      }
    }, zone.element && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 4,
        background: (_ELEMENTS$zone$elemen = ELEMENTS[zone.element]) === null || _ELEMENTS$zone$elemen === void 0 ? void 0 : _ELEMENTS$zone$elemen.color,
        display: 'inline-block',
        flex: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: zone.element ? ELEMENTS[zone.element].color : '#F4F0E7'
      }
    }, zone.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: '#8D9B98'
      }
    }, "Lv", zone.level[0], "-", zone.level[1]), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: '#8D9B98',
        marginLeft: 'auto',
        fontVariantNumeric: 'tabular-nums'
      }
    }, zoneDiscovered.length, "/", zone.spawns.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4
      }
    }, zone.spawns.map(function (s, i) {
      var found = discoveredMonsters.has(s.arch + ':' + zone.id);
      var arch = ARCHETYPES[s.arch];
      var emoji = zoneEmojis[s.arch] || (arch === null || arch === void 0 ? void 0 : arch.emoji) || '❓';
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: lsChip(found, (arch === null || arch === void 0 ? void 0 : arch.color) || '#B6C1BE')
      }, found ? emoji : '❓', " ", found ? s.arch : '???', found && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          color: '#8D9B98',
          marginLeft: 2
        }
      }, "\xD7", s.count));
    })));
  })), encyclopediaTab === 'codex' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, "Elements"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 14
    }
  }, Object.entries(ELEMENTS).map(function (_ref48) {
    var _ref49 = _slicedToArray(_ref48, 2),
      key = _ref49[0],
      el = _ref49[1];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: lsChip(true, el.color)
    }, /* v2.3.1232: elem-*.webp icon replaces the bare color dot; the '●'
         fallback inherits the chip's element color */
    lsIcon('/icons/ui/elem-' + key + '.webp?v=2.3.1232', '●', 14), key, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, "→", el.status));
  })), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, "Effectiveness Circle"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 14,
      fontSize: 11,
      fontWeight: 600,
      color: '#B6C1BE'
    }
  }, EFFECTIVENESS.map(function (_ref50, i) {
    var _ELEMENTS$a, _ELEMENTS$b;
    var _ref51 = _slicedToArray(_ref50, 2),
      a = _ref51[0],
      b = _ref51[1];
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 28,
        boxSizing: 'border-box',
        padding: '3px 10px',
        borderRadius: 999,
        background: '#293B41',
        border: '1px solid rgba(229,237,233,.11)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$a = ELEMENTS[a]) === null || _ELEMENTS$a === void 0 ? void 0 : _ELEMENTS$a.color
      }
    }, a), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#8D9B98'
      }
    }, " → "), /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$b = ELEMENTS[b]) === null || _ELEMENTS$b === void 0 ? void 0 : _ELEMENTS$b.color
      }
    }, b));
  })), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 4
    })
  }, "Collisions (", discoveredCollisions.size, "/", Object.keys(COLLISION_TABLE).length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#8D9B98',
      marginBottom: 8,
      lineHeight: 1.4
    }
  }, "Apply two different elements to trigger a collision reaction"), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_WELL, {
      display: 'flex',
      flexDirection: 'column',
      padding: 4
    })
  }, Object.entries(COLLISION_TABLE).map(function (_ref52, _ci) {
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
        gap: 6,
        minHeight: 44,
        padding: '4px 8px',
        borderBottom: _ci < Object.keys(COLLISION_TABLE).length - 1 ? LS_DIVIDER : 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 4,
        background: found ? ((_ELEMENTS$e = ELEMENTS[e1]) === null || _ELEMENTS$e === void 0 ? void 0 : _ELEMENTS$e.color) || '#667875' : 'rgba(229,237,233,.11)',
        display: 'inline-block',
        flex: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: found ? '#B6C1BE' : '#667875',
        minWidth: 34
      }
    }, found ? e1 : '??'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, "+"), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 4,
        background: found ? ((_ELEMENTS$e2 = ELEMENTS[e2]) === null || _ELEMENTS$e2 === void 0 ? void 0 : _ELEMENTS$e2.color) || '#667875' : 'rgba(229,237,233,.11)',
        display: 'inline-block',
        flex: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: found ? '#B6C1BE' : '#667875',
        minWidth: 34
      }
    }, found ? e2 : '??'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        margin: '0 2px'
      }
    }, "="), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: found ? '#55B98A' : '#667875',
        flex: 1
      }
    }, found ? coll.name : '???'), found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: '#8D9B98'
      }
    }, coll.type));
  }))), encyclopediaTab === 'materials' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, "Mining Ores"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 14
    }
  }, MINING_TIERS.map(function (t, i) {
    var found = discoveredMaterials.has('mining:' + t.name);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: lsChip(found, t.streakColor)
    }, found ? '⛏️' : '❓', " ", found ? t.name : '???', found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        marginLeft: 2
      }
    }, "Lv", t.lvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, "Woodcutting"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 14
    }
  }, WOODCUTTING_TIERS.map(function (t, i) {
    var found = discoveredMaterials.has('woodcutting:' + t.name);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: lsChip(found, t.canopyColor)
    }, found ? '🪓' : '❓', " ", found ? t.name : '???', found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        marginLeft: 2
      }
    }, "Lv", t.lvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, "Fishing"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 14
    }
  }, FISHING_TIERS.map(function (t, i) {
    var found = discoveredMaterials.has('fishing:' + t.name);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: lsChip(found, '#599FE5')
    }, found ? '🎣' : '❓', " ", found ? t.name : '???', found && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        marginLeft: 2
      }
    }, "Lv", t.lvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, "Blacksmith Metals"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 14
    }
  }, Object.entries(BLACKSMITH_TIERS).map(function (_ref54) {
    var _ref55 = _slicedToArray(_ref54, 2),
      key = _ref55[0],
      t = _ref55[1];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: lsChip(true, t.color)
    }, t.label, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        marginLeft: 2
      }
    }, "Lv", t.minLvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, "Woodworking"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 14
    }
  }, Object.entries(WOODWORKING_TIERS).map(function (_ref56) {
    var _ref57 = _slicedToArray(_ref56, 2),
      key = _ref57[0],
      t = _ref57[1];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: lsChip(true, t.color)
    }, t.label, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        marginLeft: 2
      }
    }, "Lv", t.minLvl));
  })), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, "Cooking Recipes"), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_WELL, {
      display: 'flex',
      flexDirection: 'column',
      padding: 4
    })
  }, COOKING_RECIPES.map(function (r, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minHeight: 44,
        padding: '4px 8px',
        borderBottom: i < COOKING_RECIPES.length - 1 ? LS_DIVIDER : 'none',
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: '#F4F0E7',
        minWidth: 90
      }
    }, r.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: '#8D9B98'
      }
    }, "Lv", r.cookLvl), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#B6C1BE',
        marginLeft: 'auto',
        fontVariantNumeric: 'tabular-nums'
      }
    }, r.buff === 'heal' ? '❤️ +' + r.power + ' HP' : r.buff === 'regen' ? '💚 Regen' : r.buff === 'resist' ? '🛡️ Resist' : r.buff === 'damage' ? '⚔️ DMG' : r.buff === 'all' ? '✨ All' : '🍖', r.duration ? ' (' + r.duration + 's)' : ''));
  }))), encyclopediaTab === 'zones' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#8D9B98',
      marginBottom: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, "Visited ", visitedZones.size, "/", Object.values(ZONES).filter(function (z) {
    /* v2.3.1127: hide transient server-dungeon instance entries */
    return !z._instance;
  }).length, " zones"), Object.values(ZONES).filter(function (z) {
    return !z._instance;
  }).map(function (zone) {
    var visited = visitedZones.has(zone.id) || zone.id === 'town';
    var elem = zone.element ? ELEMENTS[zone.element] : null;
    var sec = zone.secondary ? ELEMENTS[zone.secondary] : null;
    return /*#__PURE__*/React.createElement("div", {
      key: zone.id,
      style: {
        minHeight: 44,
        padding: '8px 0',
        borderBottom: LS_DIVIDER
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
      }
    }, elem && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 4,
        background: elem.color,
        display: 'inline-block',
        flex: 'none',
        opacity: visited ? 1 : 0.35
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: visited ? (elem === null || elem === void 0 ? void 0 : elem.color) || '#F4F0E7' : '#667875'
      }
    }, visited ? zone.name : '???'), visited && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: '#8D9B98',
        marginLeft: 'auto',
        fontVariantNumeric: 'tabular-nums'
      }
    }, "Lv", zone.level[0], "-", zone.level[1])), visited && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        fontSize: 11,
        fontWeight: 600
      }
    }, zone.element && /*#__PURE__*/React.createElement("span", {
      style: {
        color: elem === null || elem === void 0 ? void 0 : elem.color,
        padding: '2px 8px',
        borderRadius: 999,
        background: '#293B41'
      }
    }, zone.element), zone.secondary && /*#__PURE__*/React.createElement("span", {
      style: {
        color: sec === null || sec === void 0 ? void 0 : sec.color,
        padding: '2px 8px',
        borderRadius: 999,
        background: '#293B41'
      }
    }, "+", zone.secondary), zone.safe && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#55B98A',
        padding: '2px 8px',
        borderRadius: 999,
        background: '#293B41'
      }
    }, "Safe"), zone.lawless && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#D8635D',
        padding: '2px 8px',
        borderRadius: 999,
        background: '#293B41'
      }
    }, "PvP"), zone.endgame && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#DFAE4E',
        padding: '2px 8px',
        borderRadius: 999,
        background: '#293B41'
      }
    }, "Endgame"), zone.personal && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#55B98A',
        padding: '2px 8px',
        borderRadius: 999,
        background: '#293B41'
      }
    }, "Personal"), zone.spawns && zone.spawns.length > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#8D9B98',
        padding: '2px 0',
        fontVariantNumeric: 'tabular-nums'
      }
    }, zone.spawns.length, " enemy types")), !visited && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#667875',
        fontStyle: 'italic'
      }
    }, "Travel here to discover"));
  }))));
}
