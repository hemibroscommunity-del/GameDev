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
/* v2.3.1235: batch-2 rollout — correction-pass retint: v2.3.1227
   literals move onto the :root --ui-* tokens / approved bar colors,
   headers onto the locked 11/700 .14em rung, stat identity onto the
   UI-Bible stat-*.webp icons (emoji stays only as image-failure
   fallback — emoji in chrome is banned), the 💰 glyph becomes the
   gold.webp icon (InventoryPanel pattern), lock targets grow 32→44px
   (locked hitbox floor) and the locked state reads as a brass-soft
   selection instead of a filled stat-color button. Styles + static
   JSX only; every handler body is byte-identical. */
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
      /* v2.3.1235: batch-2 rollout — 80vh could exceed the .bt-inspect
         content box (which reserves the HUD strip + dashboard band);
         100% defers to the wrapper's clearance. */
      maxHeight: '100%',
      overflowY: 'auto',
      /* v2.3.1232: override legacy navy card with Lantern panel surface */
      /* v2.3.1235: batch-2 rollout — surface onto the correction-pass
         tokens + the shared .ui-panel shadow recipe. */
      background: 'var(--ui-sheet)',
      border: '1px solid var(--ui-line-strong)',
      borderRadius: 14,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045), 0 14px 36px rgba(3,8,10,0.30)',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    /* v2.3.1235: batch-2 rollout — shared class is 28×28, below the
       44px hitbox floor; inline override on this modal only. */
    style: { width: 44, height: 44 },
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
      color: 'var(--ui-text)'
    }
  }, "Level ", rpgState.level)), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: batch-2 rollout — 💰 was emoji in chrome; the gold
       value uses the gold.webp icon + tabular brass (the established
       InventoryPanel recipe). */
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--ui-text-muted)',
      marginBottom: 10
    }
  }, "XP: ", rpgState.xp, "/", xpRequired(rpgState.level), " \xB7 ", /*#__PURE__*/React.createElement("img", {
    src: "/icons/popups/gold.webp",
    alt: "",
    draggable: false,
    style: {
      width: 14,
      height: 14,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('💰'));
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: 'var(--ui-brass)'
    }
  }, rpgState.coins)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 12
    }
  }, [/* v2.3.1235: batch-2 rollout — bar colors onto the approved
        correction-pass semantic tokens (hp/stamina/mana). */
  ['HP', rpgState.hp, rpgState.maxHp, '#E35D5B'], ['STA', Math.floor(rpgState.stamina || 0), rpgState.maxStamina || 100, '#DFAE4E'], ['MP', Math.floor(rpgState.mana || 0), rpgState.maxMana || 100, '#4F8FDE']].map(function (_ref78) {
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
      /* v2.3.1235: batch-2 rollout — 10px was below the 11px floor */
      style: {
        fontSize: 11,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        color: c,
        marginBottom: 3
      }
    }, l, " ", v, "/", mx), /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1232: spec bar track */
        /* v2.3.1235: batch-2 rollout — track onto --ui-well-deep */
        height: 6,
        background: 'var(--ui-well-deep)',
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
    /* v2.3.1235: batch-2 rollout — header onto the locked 11/700 .14em
       muted rung; unspent-points count in brass (spendable = premium). */
    style: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: 'var(--ui-text-muted)',
      marginBottom: 6,
      marginTop: 4
    }
  }, "Tier 1 — Capacity ", rpgState.unspentT1 > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ui-brass)'
    }
  }, "(".concat(rpgState.unspentT1, " pts)")) : '', " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '.04em',
      textTransform: 'none',
      color: 'var(--ui-text-disabled)'
    }
  }, "permanent")), [/* v2.3.1235: batch-2 rollout — stat identity via the UI-Bible
        stat-*.webp icons (emoji in chrome is banned; the old emoji stays
        only as the image-failure fallback), row colors onto the approved
        semantic tokens (hp/positive/stamina/info/magic). */
  ['Power', 'power', '⚔️', '/icons/ui/stat-power.webp', 'Base damage', '#E35D5B'], ['Vitality', 'vitality', '❤️', '/icons/ui/stat-vitality.webp', 'Health pool', '#55B98A'], ['Endurance', 'endurance', '🛡️', '/icons/ui/stat-endurance.webp', 'Stamina pool', '#DFAE4E'], ['Agility', 'agility', '💨', '/icons/ui/stat-agility.webp', 'Speed & dodge', '#599FE5'], ['Mind', 'mind', '💎', '/icons/ui/stat-mind.webp', 'Mana pool', '#9A78D0']].map(function (_ref80) {
    var _ref81 = _slicedToArray(_ref80, 6),
      label = _ref81[0],
      key = _ref81[1],
      icon = _ref81[2],
      iconSrc = _ref81[3],
      desc = _ref81[4],
      col = _ref81[5];
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        borderBottom: '1px solid var(--ui-line)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1235: batch-2 QA — was a fixed width:104, which "Endurance"
           + its value overflowed, so the flex:1 bar painted OVER the digit
           (both test widths). Natural width with a 104px floor: the longest
           row now pushes the bar right instead of colliding with it. */
        minWidth: 104,
        whiteSpace: 'nowrap',
        fontSize: 13,
        fontWeight: 600,
        color: col,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: iconSrc,
      alt: "",
      draggable: false,
      style: {
        width: 18,
        height: 18,
        objectFit: 'contain',
        flex: 'none'
      },
      onError: function onError(e) {
        e.currentTarget.replaceWith(document.createTextNode(icon));
      }
    }), label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ui-text)',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums'
      }
    }, rpgState[key] || 0)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 6,
        background: 'var(--ui-well-deep)',
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
        /* v2.3.1235: batch-2 rollout — 32px was still below the locked
           44px hitbox floor; locked state reads as a brass-soft
           selection (was a filled stat-color button — colored fills
           are reserved for the single gold primary), unlocked is the
           standard raised secondary. */
        width: 44,
        height: 44,
        borderRadius: 10,
        background: (rpgState._statLocks && rpgState._statLocks[key]) ? 'var(--ui-brass-soft)' : 'var(--ui-raised)',
        border: (rpgState._statLocks && rpgState._statLocks[key]) ? '1px solid var(--ui-brass)' : '1px solid var(--ui-line-strong)',
        color: (rpgState._statLocks && rpgState._statLocks[key]) ? 'var(--ui-brass-highlight)' : 'var(--ui-text-muted)',
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
    /* v2.3.1235: batch-2 rollout — well onto the shared .ui-well
       recipe (correction-pass tokens). */
    style: {
      fontSize: 12,
      color: 'var(--ui-text-secondary)',
      fontVariantNumeric: 'tabular-nums',
      marginTop: 12,
      lineHeight: 1.7,
      padding: 10,
      borderRadius: 8,
      background: 'linear-gradient(180deg, #132329, #111E23)',
      border: '1px solid var(--ui-line)',
      boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)'
    }
  }, "DMG: ", /* v2.3.1207: deterministic range via the shared display
     helper -- was a single RANDOM calcWeaponDmg roll off the stale
     rpgState snapshot that also OMITTED the 4th wpn arg, so quality/
     hardness (and the damage/crit channels) never moved this readout. */
  _dmgRange ? _dmgRange.text : 0, ' · ', "Crit: ", (calcCritChance(rpgState.power || 0, getWeaponCritStat(rpgState)) * 100).toFixed(1), "% (\xD7", calcCritMult(rpgState.power || 0, getWeaponCritDmgStat(rpgState)).toFixed(2), ")", ' · ', "Block: ", (calcBlockReduction(getDefenseBlockBonus(rpgState), rpgState.shield) * 100).toFixed(0), "%", ' · ', "Speed: ", calcMoveSpeed(rpgState.agility || 0, (rpgState.enduranceSpec || {}).swiftness || 0).toFixed(1), "u/s")));
}
