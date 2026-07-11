import React from 'react';
import { BT_AUDIO, calcBlockReduction, calcCritChance, calcCritMult, calcDisplayDmgRange, calcMoveSpeed, getActiveWeapon, getDefenseBlockBonus, getWeaponCritDmgStat, getWeaponCritStat, xpRequired } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

/* === StatScreenPanel — character stats / allocation === */
/* v2.3.869: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. 4
   props (rpgState, stateRef, setRpgState, setShowStatScreen). The calc
   derived-stat helpers, getActiveWeapon, getWeaponCritStat, xpRequired,
   BT_AUDIO, and babel helpers are imported (all verified real exports).
   confirm and localStorage are browser globals. */
/* v2.3.1232: Lantern Slate restyle — panel surface, 11/600 section
   headers, 44px stat rows with 32px lock targets, spec bar tracks,
   derived stats in a recessed well. Legacy teal/tailwind accents
   remapped to the semantic set (MP #4D86D5, agility→info, mind→magic).
   Handlers and all derived-stat math untouched. */
export function StatScreenPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    setShowStatScreen = props.setShowStatScreen;
  /* v2.3.1207: live rpg for the derived-stats footer's DMG readout --
     rpgState is a React snapshot that lags in-place S.rpg mutations
     (the v2.3.1206 InventoryPanel convention). */
  var liveRpg = (stateRef.current && stateRef.current.rpg) || rpgState || {};
  var _dmgRange = calcDisplayDmgRange(liveRpg, getActiveWeapon(liveRpg));
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowStatScreen(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 300 fixed — fill narrow phones, never overflow */
      maxHeight: '80vh',
      overflowY: 'auto',
      /* v2.3.1232: override legacy navy card with Lantern panel surface */
      background: '#202C32',
      border: '1px solid rgba(238,242,235,.14)',
      borderRadius: 14,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowStatScreen(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: panel title row — icon + 13/700 uppercase title */
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/panel-stats.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('⚔️'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      fontVariantNumeric: 'tabular-nums',
      color: '#F7F2E7'
    }
  }, "Level ", rpgState.level)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      color: '#96A2A0',
      marginBottom: 10
    }
  }, "XP: ", rpgState.xp, "/", xpRequired(rpgState.level), " \xB7 💰 ", rpgState.coins), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 12
    }
  }, [['HP', rpgState.hp, rpgState.maxHp, '#D95C54'], ['STA', Math.floor(rpgState.stamina || 0), rpgState.maxStamina || 100, '#D8A94D'], ['MP', Math.floor(rpgState.mana || 0), rpgState.maxMana || 100, '#4D86D5']].map(function (_ref78) {
    var _ref79 = _slicedToArray(_ref78, 4),
      l = _ref79[0],
      v = _ref79[1],
      mx = _ref79[2],
      c = _ref79[3];
    return /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        flex: 1,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        color: c,
        marginBottom: 3
      }
    }, l, " ", v, "/", mx), /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1232: spec bar track */
        height: 6,
        background: '#0B1216',
        borderRadius: 999,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.max(1, v / mx * 100) + '%',
        height: '100%',
        background: c,
        borderRadius: 999
      }
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      marginBottom: 6,
      marginTop: 4
    }
  }, "Tier 1 — Capacity ", rpgState.unspentT1 > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#D8A85F'
    }
  }, "(".concat(rpgState.unspentT1, " pts)")) : '', " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '.04em',
      textTransform: 'none',
      color: '#687575'
    }
  }, "permanent")), [['Power', 'power', '⚔️', 'Base damage', '#D95C54'], ['Vitality', 'vitality', '❤️', 'Health pool', '#59BF91'], ['Endurance', 'endurance', '🛡️', 'Stamina pool', '#D8A94D'], ['Agility', 'agility', '💨', 'Speed & dodge', '#5D93D2'], ['Mind', 'mind', '💎', 'Mana pool', '#9A76D3']].map(function (_ref80) {
    var _ref81 = _slicedToArray(_ref80, 5),
      label = _ref81[0],
      key = _ref81[1],
      icon = _ref81[2],
      desc = _ref81[3],
      col = _ref81[4];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        borderBottom: '1px solid rgba(238,242,235,.10)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 92,
        fontSize: 12,
        fontWeight: 600,
        color: col
      }
    }, icon, " ", label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#F7F2E7',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums'
      }
    }, rpgState[key] || 0)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 6,
        background: '#0B1216',
        borderRadius: 999,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.min(100, (rpgState[key] || 0) / 4) + '%',
        height: '100%',
        background: col,
        borderRadius: 999,
        transition: 'width .2s'
      }
    })), /*#__PURE__*/React.createElement("button", {
      title: (rpgState._statLocks && rpgState._statLocks[key]) ? 'Locked — XP that would train ' + label + ' is burned. Click to unlock.' : 'Lock ' + label + ' at ' + (rpgState[key] || 0) + ' to commit to a pure build. XP that would train it will be burned.',
      style: {
        /* v2.3.1232: 32px touch target (was 18px) */
        width: 32,
        height: 32,
        borderRadius: 8,
        background: (rpgState._statLocks && rpgState._statLocks[key]) ? col : '#2B3940',
        border: (rpgState._statLocks && rpgState._statLocks[key]) ? 'none' : '1px solid rgba(238,242,235,.14)',
        color: (rpgState._statLocks && rpgState._statLocks[key]) ? '#F7F2E7' : '#96A2A0',
        fontSize: 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        padding: 0,
        flexShrink: 0
      },
      onClick: function onClick() {
        var S = stateRef.current;
        var R = S.rpg;
        if (!R._statLocks) R._statLocks = { power: false, vitality: false, endurance: false, agility: false, mind: false };
        R._statLocks[key] = !R._statLocks[key];
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.beep(R._statLocks[key] ? 500 : 700, 0.05, 0.08, 'sine');
      }
    }, (rpgState._statLocks && rpgState._statLocks[key]) ? '🔒' : '🔓'));
  /* v2.3.1155: the "TIER 2 — TECHNIQUE" block (Ferocity / Elem Mastery /
     Fortification / Restoration / Influence) is GONE — the five generic
     stats were pinned 0 since v2.3.910 and are now deleted from the
     save/wire (stat_allocate rejects them server-side).  Their successors
     are the channel grids on the Builds panel. */
  }), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: derived stats readout in a recessed well */
    style: {
      fontSize: 12,
      color: '#B9C1BF',
      fontVariantNumeric: 'tabular-nums',
      marginTop: 12,
      lineHeight: 1.7,
      padding: 10,
      borderRadius: 8,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)'
    }
  }, "DMG: ", /* v2.3.1207: deterministic range via the shared display
     helper -- was a single RANDOM calcWeaponDmg roll off the stale
     rpgState snapshot that also OMITTED the 4th wpn arg, so quality/
     hardness (and the damage/crit channels) never moved this readout. */
  _dmgRange ? _dmgRange.text : 0, ' · ', "Crit: ", (calcCritChance(rpgState.power || 0, getWeaponCritStat(rpgState)) * 100).toFixed(1), "% (\xD7", calcCritMult(rpgState.power || 0, getWeaponCritDmgStat(rpgState)).toFixed(2), ")", ' · ', "Block: ", (calcBlockReduction(getDefenseBlockBonus(rpgState), rpgState.shield) * 100).toFixed(0), "%", ' · ', "Speed: ", calcMoveSpeed(rpgState.agility || 0, (rpgState.enduranceSpec || {}).swiftness || 0).toFixed(1), "u/s")));
}
