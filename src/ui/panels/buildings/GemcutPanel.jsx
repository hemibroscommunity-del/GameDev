import React from 'react';
import { BT_AUDIO, ELEMENTS, GEM_CUT_TIERS, ZONE_RESOURCES, addLifeSkillXp } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === GemcutPanel — buildingPanel === 'gemcut' sub-panel === */
/* v2.3.875: extracted verbatim from the buildingPanel === 'gemcut' clause
   in BroTown.jsx (UI decomposition; behavior-frozen). 3 props; data +
   babel imports verified real exports; hoisted babel temps declared
   locally. The gate stays in BroTown. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   header strip + building icon, gems as 44px well rows (element color
   kept as content identity on the name only). Style/JSX only; the cut
   handler is byte-identical (v2.3.1198 server-settled gem_cut_request
   path preserved). LS token block duplicated per building panel to
   keep the decomposed files dependency-free. */
var LS = {
  txt1: '#F7F2E7', txt2: '#B9C1BF', txt3: '#96A2A0', dis: '#687575',
  panel: '#202C32', strip: '#182227', raised: '#2B3940', well: '#121B20', wellSoft: '#19252A',
  border: 'rgba(238,242,235,.14)', divider: 'rgba(238,242,235,.10)', wellBorder: 'rgba(238,242,235,.08)',
  brass: '#D8A85F', brassFill: '#3B3427', onBrass: '#20170D'
};
/* v2.3.1232: -20 margin counters .bt-inspect-card's 20px padding so the
   panel owns its full surface (header strip flush to the card edge). */
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
var LS_BODY = { padding: '12px 14px 14px' };
var LS_MOD = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: LS.txt3, margin: '0 0 6px' };
function lsHeader(icon, emoji, title, subtitle) {
  return React.createElement("div", {
    style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border }
  }, /* v2.3.1224 pattern: UI Bible icon with emoji fallback */
  React.createElement("img", {
    src: '/icons/ui/bldg-' + icon + '.webp', alt: '', draggable: false,
    style: { width: 26, height: 26, objectFit: 'contain', flexShrink: 0 },
    onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }
  }), React.createElement("div", { style: { minWidth: 0 } },
    React.createElement("div", { style: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: LS.txt1 } }, title),
    subtitle ? React.createElement("div", { style: { fontSize: 11, color: LS.txt3, marginTop: 1 } }, subtitle) : null));
}
export function GemcutPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  var _rpgState$lifeSkills33, _rpgState$lifeSkills36;
  return React.createElement("div", { style: LS_WRAP },
    lsHeader('gemcut', '💎', "Gem Cutter", "Gem Cutting Lv" + (((_rpgState$lifeSkills33 = rpgState.lifeSkills) === null || _rpgState$lifeSkills33 === void 0 || (_rpgState$lifeSkills33 = _rpgState$lifeSkills33.gemCutting) === null || _rpgState$lifeSkills33 === void 0 ? void 0 : _rpgState$lifeSkills33.level) || 1)),
    React.createElement("div", { style: LS_BODY },
      React.createElement("div", { style: { fontSize: 12, color: LS.txt2, marginBottom: 12, lineHeight: 1.5 } },
        "Cut raw gems into polished slottable gems. Higher skill = better success rate."),
      React.createElement("div", { style: LS_MOD }, "Your gems"),
      Object.entries(ELEMENTS).map(function (_ref143) {
        var _rpgState$lifeSkills34, _rpgState$lifeSkills35, _ZONE_RESOURCES$elem, _ZONE_RESOURCES$elem2;
        var _ref144 = _slicedToArray(_ref143, 2),
          elem = _ref144[0],
          edef = _ref144[1];
        var gems = ((_rpgState$lifeSkills34 = rpgState.lifeSkills) === null || _rpgState$lifeSkills34 === void 0 ? void 0 : _rpgState$lifeSkills34.gems) || {};
        var rawKey = 'raw_' + elem;
        var polKey = 'polished_' + elem;
        var rawCount = gems[rawKey] || 0;
        var polCount = gems[polKey] || 0;
        if (rawCount <= 0 && polCount <= 0) return null;
        var gcLvl = ((_rpgState$lifeSkills35 = rpgState.lifeSkills) === null || _rpgState$lifeSkills35 === void 0 || (_rpgState$lifeSkills35 = _rpgState$lifeSkills35.gemCutting) === null || _rpgState$lifeSkills35 === void 0 ? void 0 : _rpgState$lifeSkills35.level) || 1;
        /* Success rate from GEM_CUT_TIERS */
        var successRate = 0.6;
        var tierKeys = Object.keys(GEM_CUT_TIERS);
        for (var i = tierKeys.length - 1; i >= 0; i--) {
          if (gcLvl >= GEM_CUT_TIERS[tierKeys[i]].minLvl) {
            successRate = GEM_CUT_TIERS[tierKeys[i]].successRate;
            break;
          }
        }
        var gemName = ((_ZONE_RESOURCES$elem = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem === void 0 ? void 0 : _ZONE_RESOURCES$elem.gem) || elem + ' Gem';
        var gemCol = ((_ZONE_RESOURCES$elem2 = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem2 === void 0 ? void 0 : _ZONE_RESOURCES$elem2.gemColor) || edef.color;
        return /*#__PURE__*/React.createElement("div", {
          key: elem,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6,
            padding: '8px 10px',
            minHeight: 44,
            borderRadius: 8,
            background: LS.wellSoft,
            border: '1px solid ' + LS.wellBorder
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            flex: 1,
            minWidth: 0
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13,
            fontWeight: 600,
            color: gemCol
          }
        }, gemName), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: LS.txt2,
            marginTop: 1,
            fontVariantNumeric: 'tabular-nums'
          }
        }, "◇ Raw: ", rawCount, " \xB7 ◆ Polished: ", polCount), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 10.5,
            color: LS.txt3,
            fontVariantNumeric: 'tabular-nums'
          }
        }, "Success: ", Math.round(successRate * 100), "%")), /*#__PURE__*/React.createElement("button", {
          style: {
            padding: '8px 14px',
            minHeight: 36,
            borderRadius: 11,
            fontSize: 13,
            fontWeight: 700,
            background: rawCount > 0 ? LS.raised : LS.well,
            border: '1px solid ' + (rawCount > 0 ? LS.border : LS.wellBorder),
            color: rawCount > 0 ? LS.txt1 : LS.dis,
            cursor: 'pointer'
          },
          onClick: function onClick() {
            if (rawCount <= 0) return;
            var R = stateRef.current.rpg;
            var sk = R.lifeSkills;
            if (!sk.gems) sk.gems = {};
            /* v2.3.1198: server-settled gem cutting (gem_cut_request,
               server/src/amulet.js _handleGemCut) -- the worker consumes
               one raw gem from ITS lifeSkills.gems copy and rolls success
               from ITS gemCutting level, which is what makes the polished
               gem consumable at the server amulet forge (the v2.3.1192
               gem op's deny-by-default consume).  Only the raw-gem
               consume stays as local prediction here; the outcome popups
               wait for the private gem_cut_result event (server-owned
               RNG, unpredictable locally) and the authoritative counts +
               XP ride the player_state echo.  Old workers without
               caps.gems keep the legacy local-only roll below. */
            {
              var _Sgc = stateRef.current;
              if (_Sgc._serverCaps && _Sgc._serverCaps.gems && _Sgc.channel) {
                try { _Sgc.channel.send({ type: 'gem_cut_request', payload: { gem: elem } }); } catch (e) {}
                sk.gems[rawKey] = (sk.gems[rawKey] || 1) - 1;
                if (sk.gems[rawKey] <= 0) delete sk.gems[rawKey];
                setRpgState(_objectSpread({}, R));
                try {
                  localStorage.setItem('bt_rpg', JSON.stringify(R));
                } catch (e) {}
                return;
              }
            }
            sk.gems[rawKey] = (sk.gems[rawKey] || 1) - 1;
            if (sk.gems[rawKey] <= 0) delete sk.gems[rawKey];
            /* Roll for success */
            if (Math.random() < successRate) {
              sk.gems[polKey] = (sk.gems[polKey] || 0) + 1;
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Polished ' + gemName + '!', gemCol);
              BT_AUDIO.collect();
            } else {
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Gem shattered!', '#D95C54');
              BT_AUDIO.beep(200, 0.06, 0.1, 'square');
            }
            var leveled = addLifeSkillXp(sk, 'gemCutting', 15);
            if (leveled) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 50, 'Gem Cutting Lv' + sk.gemCutting.level + '!', '#D8A94D');
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (e) {}
          }
        }, "Cut"));
      }), Object.entries(((_rpgState$lifeSkills36 = rpgState.lifeSkills) === null || _rpgState$lifeSkills36 === void 0 ? void 0 : _rpgState$lifeSkills36.gems) || {}).every(function (_ref145) {
        var _ref146 = _slicedToArray(_ref145, 2),
          k = _ref146[0],
          v = _ref146[1];
        return v <= 0;
      }) && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: LS.txt3,
          textAlign: 'center',
          padding: '14px 10px',
          borderRadius: 8,
          background: LS.wellSoft,
          border: '1px solid ' + LS.wellBorder,
          lineHeight: 1.5
        }
      }, "No gems yet. Harvest resources in elemental zones to collect raw gems!")));
}
