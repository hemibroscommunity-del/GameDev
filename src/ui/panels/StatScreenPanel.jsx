import React from 'react';
import { BT_AUDIO, calcBlockReduction, calcCritChance, calcCritMult, calcMoveSpeed, calcWeaponDmg, getActiveWeapon, getDefenseBlockBonus, getWeaponCritStat, xpRequired } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

/* === StatScreenPanel — character stats / allocation === */
/* v2.3.869: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. 4
   props (rpgState, stateRef, setRpgState, setShowStatScreen). The calc
   derived-stat helpers, getActiveWeapon, getWeaponCritStat, xpRequired,
   BT_AUDIO, and babel helpers are imported (all verified real exports).
   confirm and localStorage are browser globals. */
export function StatScreenPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    setShowStatScreen = props.setShowStatScreen;
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
      width: 300,
      maxHeight: '80vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowStatScreen(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 2
    }
  }, "\u2694\uFE0F Level ", rpgState.level), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "XP: ", rpgState.xp, "/", xpRequired(rpgState.level), " \xB7 \uD83D\uDCB0 ", rpgState.coins), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 8
    }
  }, [['HP', rpgState.hp, rpgState.maxHp, '#ff5e6c'], ['STA', Math.floor(rpgState.stamina || 0), rpgState.maxStamina || 100, '#f5c542'], ['MP', Math.floor(rpgState.mana || 0), rpgState.maxMana || 100, '#3b82f6']].map(function (_ref78) {
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
        fontSize: 7,
        fontWeight: 700,
        color: c,
        marginBottom: 1
      }
    }, l, " ", v, "/", mx), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 2,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.max(1, v / mx * 100) + '%',
        height: '100%',
        background: c,
        borderRadius: 2
      }
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#00d4b8',
      marginBottom: 3,
      marginTop: 4
    }
  }, "TIER 1 \u2014 CAPACITY ", rpgState.unspentT1 > 0 ? "(".concat(rpgState.unspentT1, " pts)") : '', " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)'
    }
  }, "permanent")), [['Power', 'power', '⚔️', 'Base damage', '#ff5e6c'], ['Vitality', 'vitality', '❤️', 'Health pool', '#3dd497'], ['Endurance', 'endurance', '🛡️', 'Stamina pool', '#f5c542'], ['Agility', 'agility', '💨', 'Speed & dodge', '#60a5fa'], ['Mind', 'mind', '💎', 'Mana pool', '#a78bfa']].map(function (_ref80) {
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
        gap: 4,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 65,
        fontSize: 9,
        fontWeight: 700,
        color: col
      }
    }, icon, " ", label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#fff'
      }
    }, rpgState[key] || 0)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 5,
        background: 'rgba(255,255,255,.08)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.min(100, (rpgState[key] || 0) / 4) + '%',
        height: '100%',
        background: col,
        borderRadius: 3,
        transition: 'width .2s'
      }
    })), /*#__PURE__*/React.createElement("button", {
      title: (rpgState._statLocks && rpgState._statLocks[key]) ? 'Locked — XP that would train ' + label + ' is burned. Click to unlock.' : 'Lock ' + label + ' at ' + (rpgState[key] || 0) + ' to commit to a pure build. XP that would train it will be burned.',
      style: {
        width: 18,
        height: 18,
        borderRadius: 4,
        background: (rpgState._statLocks && rpgState._statLocks[key]) ? col : 'rgba(255,255,255,.08)',
        border: (rpgState._statLocks && rpgState._statLocks[key]) ? 'none' : '1px solid rgba(255,255,255,.18)',
        color: (rpgState._statLocks && rpgState._statLocks[key]) ? '#fff' : 'rgba(255,255,255,.5)',
        fontSize: 10,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        padding: 0
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
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#5b52ff',
      marginBottom: 3,
      marginTop: 8
    }
  }, "TIER 2 \u2014 TECHNIQUE ", rpgState.unspentT2 > 0 ? "(".concat(rpgState.unspentT2, " pts)") : '', " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)'
    }
  }, "respecable")), [['Ferocity', 'ferocity', '🔥', 'Crit chance & dmg', '#ff5e6c'], ['Elem Mastery', 'elementalMastery', '✨', 'Status & collision dmg', '#00d4b8'], ['Fortification', 'fortification', '🏰', 'Block & Thorns', '#60a5fa'], ['Restoration', 'restoration', '💚', 'Regen & healing', '#3dd497'], ['Influence', 'influence', '👁️', 'CC duration & debuffs', '#a78bfa']].map(function (_ref82) {
    var _ref83 = _slicedToArray(_ref82, 5),
      label = _ref83[0],
      key = _ref83[1],
      icon = _ref83[2],
      desc = _ref83[3],
      col = _ref83[4];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 75,
        fontSize: 9,
        fontWeight: 700,
        color: col
      }
    }, icon, " ", label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#fff'
      }
    }, rpgState[key] || 0)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 5,
        background: 'rgba(255,255,255,.08)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.min(100, (rpgState[key] || 0) / 4) + '%',
        height: '100%',
        background: col,
        borderRadius: 3,
        transition: 'width .2s'
      }
    })), rpgState.unspentT2 > 0 && /*#__PURE__*/React.createElement("button", {
      style: {
        width: 18,
        height: 18,
        borderRadius: 4,
        background: col,
        border: 'none',
        color: '#fff',
        fontSize: 11,
        fontWeight: 900,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1
      },
      onClick: function onClick() {
        var S = stateRef.current;
        var R = S.rpg;
        if (!R.unspentT2 || R.unspentT2 <= 0) return;
        if (!confirm('Spend 1 Tier 2 point on ' + label + '? (' + R.unspentT2 + ' remaining)')) return;
        /* Server-validated allocation: send the request, let the worker
           validate ps.unspentT2 + apply, then mirror via stat_allocated
           event.  No local mutation here so a modified client can't
           bypass the unspentT2 gate. */
        if (S.channel) {
          try { S.channel.send({ type: 'stat_allocate', payload: { stat: key } }); } catch (e) {}
        }
        BT_AUDIO.beep(700, 0.06, 0.1, 'sine');
      }
    }, "+"));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.35)',
      marginTop: 8,
      lineHeight: 1.6
    }
  }, "DMG: ", Math.round(calcWeaponDmg(getActiveWeapon(rpgState).type, rpgState || {}, getActiveWeapon(rpgState).tierMult)), ' · ', "Crit: ", (calcCritChance(rpgState.power || 0, getWeaponCritStat(rpgState)) * 100).toFixed(1), "% (\xD7", calcCritMult(rpgState.power || 0, getWeaponCritStat(rpgState)).toFixed(2), ")", ' · ', "Block: ", (calcBlockReduction(getDefenseBlockBonus(rpgState), rpgState.shield) * 100).toFixed(0), "%", ' · ', "Speed: ", calcMoveSpeed(rpgState.agility || 0).toFixed(1), "u/s")));
}
