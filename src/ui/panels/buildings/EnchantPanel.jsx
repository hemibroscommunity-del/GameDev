import React from 'react';
import { AMULET_GEM_STATS, AMULET_TIERS, BLACKSMITH_TIERS, BT_AUDIO, ELEMENTS, RARITY_TIERS, SHIELD_GEM_STATS, WEAPON_TYPES, WOODWORKING_TIERS, addLifeSkillXp, getAmuletBonus, getShieldBonus, recalcDerived } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === EnchantPanel — buildingPanel === 'enchant' sub-panel === */
/* v2.3.874: extracted verbatim from the buildingPanel === 'enchant' clause
   in BroTown.jsx (UI decomposition; behavior-frozen). 3 props; data +
   babel imports verified real exports; hoisted babel temps declared
   locally. The gate stays in BroTown. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   header strip + building icon; the violet weapon cards became
   divider-separated modules (Melee/Ranged/Staff/Amulet/Shield); gem
   choices as raised pills keeping element color as content identity.
   Style/JSX only; slotting handlers (incl. the v2.3.1192
   amulet_forge_request path) are byte-identical. LS token block
   duplicated per building panel to keep the decomposed files
   dependency-free. */
var LS = {
  txt1: '#F7F2E7', txt2: '#B9C1BF', txt3: '#96A2A0', dis: '#687575',
  panel: '#202C32', strip: '#182227', raised: '#2B3940', well: '#121B20', wellSoft: '#19252A',
  border: 'rgba(238,242,235,.14)', divider: 'rgba(238,242,235,.10)', wellBorder: 'rgba(238,242,235,.08)',
  brass: '#D8A85F', brassFill: '#3B3427', onBrass: '#20170D'
};
/* v2.3.1232: -20 margin counters .bt-inspect-card's 20px padding so the
   panel owns its full surface (header strip flush to the card edge). */
/* v2.3.1235: state-correction §10 — flex-column wrap (fixed header strip,
   internal overflow-y body) so the Shield section at the tail is always
   reachable by scroll on short phones (390px). */
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left', display: 'flex', flexDirection: 'column', maxHeight: '100%' };
var LS_BODY = { padding: '12px 14px 12px', overflowY: 'auto', touchAction: 'pan-y', flex: '1 1 auto', minHeight: 0 };
/* v2.3.1235: state-correction §6 — approved disabled-control recipe
   (#1A292F fill, #8D9B98 label, .11 hairline, full opacity, 44px floor)
   for the explicit "No polished gems" / "No open gem slot" / "Locked"
   states, so no gem-slot instruction ever leads to blank space. */
var LS_DISBTN = { minHeight: 44, padding: '0 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: '1px solid rgba(229,237,233,.11)', background: '#1A292F', color: '#8D9B98', opacity: 1, cursor: 'default', fontFamily: 'inherit' };
var LS_MOD = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: LS.txt3, margin: '0 0 6px' };
function lsHeader(icon, emoji, title, subtitle) {
  return React.createElement("div", {
    style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border, flex: 'none' /* v2.3.1235: state-correction §10 — header strip stays fixed above the scroll body */ }
  }, /* v2.3.1224 pattern: UI Bible icon with emoji fallback */
  React.createElement("img", {
    src: '/icons/ui/bldg-' + icon + '.webp', alt: '', draggable: false,
    style: { width: 26, height: 26, objectFit: 'contain', flexShrink: 0 },
    onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }
  }), React.createElement("div", { style: { minWidth: 0 } },
    React.createElement("div", { style: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: LS.txt1 } }, title),
    subtitle ? React.createElement("div", { style: { fontSize: 11, color: LS.txt3, marginTop: 1 } }, subtitle) : null));
}
export function EnchantPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  var _ELEMENTS$rpgState$am, _ELEMENTS$rpgState$am2, _ELEMENTS$rpgState$sh, _ELEMENTS$rpgState$sh2, _rpgState$lifeSkills1;
  /* v2.3.1235: state-correction §10 — scroll-fade plumbing (pattern:
     InspectPlayerPanel ~128-139): sticky 24px bottom fade shows only
     while content remains below the fold. Display-only state. */
  var _sf = React.useState(false);
  var showFade = _sf[0],
    setShowFade = _sf[1];
  var scrollBodyRef = React.useRef(null);
  var measureFade = React.useCallback(function () {
    var el = scrollBodyRef.current;
    if (el) setShowFade(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  React.useEffect(function () {
    measureFade();
  }, [rpgState, measureFade]);
  /* v2.3.1235: state-correction §6 — one shared read of the polished-gem
     pouch (same lifeSkills.gems source every slotting pill reads) so each
     section can render an explicit control when the pickers would
     otherwise render nothing. */
  var gemsOwned = (rpgState.lifeSkills && rpgState.lifeSkills.gems) || {};
  return React.createElement("div", { style: LS_WRAP },
    lsHeader('enchant', '✨', "Enchanter", "Enchanting Lv" + (((_rpgState$lifeSkills1 = rpgState.lifeSkills) === null || _rpgState$lifeSkills1 === void 0 || (_rpgState$lifeSkills1 = _rpgState$lifeSkills1.enchanting) === null || _rpgState$lifeSkills1 === void 0 ? void 0 : _rpgState$lifeSkills1.level) || 1)),
    React.createElement("div", {
      /* v2.3.1235: state-correction §10 — internal scroll body; scrollbar
         hidden by .ls-scrollbody (game.css), reachability signalled by
         the sticky bottom fade (last child). */
      className: "ls-scrollbody",
      ref: scrollBodyRef,
      onScroll: measureFade,
      style: LS_BODY
    },
      React.createElement("div", { style: { fontSize: 12, color: LS.txt2, marginBottom: 12, lineHeight: 1.5 } },
        "Slot polished gems into gear with open gem slots."),
      [{
        label: 'Melee',
        key: 'weapon',
        wpn: rpgState.weapon
      }, {
        label: 'Ranged',
        key: 'rangedWeapon',
        wpn: rpgState.rangedWeapon
      }, {
        label: 'Staff',
        key: 'staffWeapon',
        wpn: rpgState.staffWeapon
      }].map(function (_ref84) {
        var _wpn$gearBase, _WOODWORKING_TIERS$ww, _BLACKSMITH_TIERS$wpn, _rpgState$lifeSkills10, _RARITY_TIERS$wpn$tie, _RARITY_TIERS$wpn$tie2, _ELEMENTS$wpn$element3, _ELEMENTS$wpn$element4;
        var label = _ref84.label,
          key = _ref84.key,
          wpn = _ref84.wpn;
        /* Determine available slots: crafted gear uses BLACKSMITH_TIERS/WOODWORKING_TIERS slots, dropped gear gets 2 free slots */
        var wwKey = wpn !== null && wpn !== void 0 && (_wpn$gearBase = wpn.gearBase) !== null && _wpn$gearBase !== void 0 && _wpn$gearBase.startsWith('ww_') ? wpn.gearBase.slice(3) : null;
        var maxSlots = wwKey ? ((_WOODWORKING_TIERS$ww = WOODWORKING_TIERS[wwKey]) === null || _WOODWORKING_TIERS$ww === void 0 ? void 0 : _WOODWORKING_TIERS$ww.slots) || 0 : wpn !== null && wpn !== void 0 && wpn.gearBase ? ((_BLACKSMITH_TIERS$wpn = BLACKSMITH_TIERS[wpn.gearBase]) === null || _BLACKSMITH_TIERS$wpn === void 0 ? void 0 : _BLACKSMITH_TIERS$wpn.slots) || 0 : wpn ? 2 : 0;
        var usedSlots = (wpn !== null && wpn !== void 0 && wpn.element1 ? 1 : 0) + (wpn !== null && wpn !== void 0 && wpn.element2 ? 1 : 0);
        var openSlots = Math.max(0, maxSlots - usedSlots);
        /* Fusion requires enchanting Lv20+, fusion-compatible gear base for volatile */
        var enchLvl = ((_rpgState$lifeSkills10 = rpgState.lifeSkills) === null || _rpgState$lifeSkills10 === void 0 || (_rpgState$lifeSkills10 = _rpgState$lifeSkills10.enchanting) === null || _rpgState$lifeSkills10 === void 0 ? void 0 : _rpgState$lifeSkills10.level) || 1;
        var canAddSecond = enchLvl >= 20 && maxSlots >= 2;
        var isFusionReady = (wpn === null || wpn === void 0 ? void 0 : wpn.gearBase) === 'worldbreaker' || (wpn === null || wpn === void 0 ? void 0 : wpn.gearBase) === 'ww_worldbreaker';
        /* v2.3.1235: state-correction §6 — derived display state only:
           hasAnyPolished mirrors the picker's own polCount>0 filter
           (minus the already-slotted element), slotPickable is the
           picker's exact render condition. Every section ends in exactly
           one explicit control — picker / "No polished gems" /
           "No open gem slot" / "Locked" (2nd slot behind Ench Lv20). */
        var hasAnyPolished = Object.keys(ELEMENTS).some(function (e) {
          return e !== (wpn === null || wpn === void 0 ? void 0 : wpn.element1) && (gemsOwned['polished_' + e] || 0) > 0;
        });
        var slotPickable = !!(wpn && openSlots > 0 && (!wpn.element1 || wpn.element1 && !wpn.element2 && canAddSecond));
        return /*#__PURE__*/React.createElement("div", {
          key: label,
          style: {
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: '1px solid ' + LS.divider
          }
        }, /*#__PURE__*/React.createElement("div", { style: LS_MOD }, label), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13.5,
            fontWeight: 600,
            color: (wpn === null || wpn === void 0 ? void 0 : wpn.name) ? LS.txt1 : LS.dis,
            marginBottom: 4
          }
        }, (wpn === null || wpn === void 0 ? void 0 : wpn.name) || 'None'), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 12,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 4
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            color: ((_RARITY_TIERS$wpn$tie = RARITY_TIERS[wpn === null || wpn === void 0 ? void 0 : wpn.tier]) === null || _RARITY_TIERS$wpn$tie === void 0 ? void 0 : _RARITY_TIERS$wpn$tie.color) || LS.txt3
          }
        }, ((_RARITY_TIERS$wpn$tie2 = RARITY_TIERS[wpn === null || wpn === void 0 ? void 0 : wpn.tier]) === null || _RARITY_TIERS$wpn$tie2 === void 0 ? void 0 : _RARITY_TIERS$wpn$tie2.label) || 'Common', " (", (wpn === null || wpn === void 0 ? void 0 : wpn.tierMult) || 1, "\xD7)"), (wpn === null || wpn === void 0 ? void 0 : wpn.element1) && /*#__PURE__*/React.createElement("span", {
          style: {
            color: (_ELEMENTS$wpn$element3 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element3 === void 0 ? void 0 : _ELEMENTS$wpn$element3.color
          }
        }, "◆ ", wpn.element1), (wpn === null || wpn === void 0 ? void 0 : wpn.element2) && /*#__PURE__*/React.createElement("span", {
          style: {
            color: (_ELEMENTS$wpn$element4 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element4 === void 0 ? void 0 : _ELEMENTS$wpn$element4.color
          }
        }, "◆ ", wpn.element2), (wpn === null || wpn === void 0 ? void 0 : wpn.isVolatile) && /*#__PURE__*/React.createElement("span", {
          style: {
            color: '#D95C54',
            fontSize: 10,
            fontWeight: 700
          }
        }, "⚡VOLATILE")), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: LS.txt3,
            marginBottom: 6
          }
        }, "Gem slots: ", usedSlots, "/", maxSlots, " used", maxSlots === 0 && ' · Craft slotted gear at the Blacksmith or Woodworker first', (wpn === null || wpn === void 0 ? void 0 : wpn.element1) && !(wpn !== null && wpn !== void 0 && wpn.element2) && maxSlots >= 2 && !canAddSecond && ' · Req Enchanting Lv20 for 2nd slot'), /* v2.3.1235: state-correction §6 — the "Choose…" instructions only
           render when the picker below them will actually show pills; an
           instruction must never lead to blank space. */
        hasAnyPolished && wpn && openSlots > 0 && !wpn.element1 && /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: LS.txt2,
            marginBottom: 6
          }
        }, "Choose a polished gem for Slot 1:"), hasAnyPolished && wpn && wpn.element1 && !wpn.element2 && openSlots > 0 && canAddSecond && /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: LS.txt2,
            marginBottom: 6
          }
        }, "Choose a polished gem for Slot 2 (Fusion):"), hasAnyPolished && wpn && openSlots > 0 && (!wpn.element1 || wpn.element1 && !wpn.element2 && canAddSecond) && /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap'
          }
        }, Object.entries(ELEMENTS).filter(function (_ref85) {
          var _ref86 = _slicedToArray(_ref85, 1),
            e = _ref86[0];
          return e !== (wpn === null || wpn === void 0 ? void 0 : wpn.element1);
        }).map(function (_ref87) {
          var _rpgState$lifeSkills11;
          var _ref88 = _slicedToArray(_ref87, 2),
            elem = _ref88[0],
            edef = _ref88[1];
          var gems = ((_rpgState$lifeSkills11 = rpgState.lifeSkills) === null || _rpgState$lifeSkills11 === void 0 ? void 0 : _rpgState$lifeSkills11.gems) || {};
          var polKey = 'polished_' + elem;
          var polCount = gems[polKey] || 0;
          if (polCount <= 0) return null;
          /* Check volatile compatibility — only allowed on fusionReady gear */
          var wouldBeVolatile = (wpn === null || wpn === void 0 ? void 0 : wpn.element1) && function () {
            var volPairs = [['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'], ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame']];
            return volPairs.some(function (_ref89) {
              var _ref90 = _slicedToArray(_ref89, 2),
                a = _ref90[0],
                b = _ref90[1];
              return wpn.element1 === a && elem === b || wpn.element1 === b && elem === a;
            });
          }();
          var blockedVolatile = wouldBeVolatile && !isFusionReady;
          return /*#__PURE__*/React.createElement("button", {
            key: elem,
            style: {
              padding: '6px 10px',
              minHeight: 32,
              borderRadius: 999,
              border: '1px solid ' + (blockedVolatile ? 'rgba(217,92,84,.4)' : edef.color + '40'),
              background: blockedVolatile ? 'rgba(217,92,84,.12)' : LS.raised,
              color: blockedVolatile ? LS.dis : edef.color,
              fontSize: 12,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              cursor: 'pointer'
            },
            title: blockedVolatile ? 'Volatile combo requires Fusion-Compatible gear base' : '',
            onClick: function onClick() {
              if (blockedVolatile) {
                pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Needs Fusion-Compatible gear!', '#D95C54');
                return;
              }
              var R = stateRef.current.rpg;
              var sk = R.lifeSkills;
              sk.gems[polKey]--;
              if (sk.gems[polKey] <= 0) delete sk.gems[polKey];
              var w = R[key];
              if (!w.element1) {
                w.element1 = elem;
                w.tier = 'elemental';
                w.tierMult = 1.5;
                w.name = elem.charAt(0).toUpperCase() + elem.slice(1) + ' ' + WEAPON_TYPES[w.type].label;
              } else if (!w.element2) {
                w.element2 = elem;
                w.tier = 'fusion';
                w.tierMult = 2.25;
                var volPairs = [['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'], ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame']];
                w.isVolatile = volPairs.some(function (_ref91) {
                  var _ref92 = _slicedToArray(_ref91, 2),
                    a = _ref92[0],
                    b = _ref92[1];
                  return w.element1 === a && w.element2 === b || w.element1 === b && w.element2 === a;
                });
                var e1n = w.element1.charAt(0).toUpperCase() + w.element1.slice(1);
                var e2n = elem.charAt(0).toUpperCase() + elem.slice(1);
                w.name = e1n + e2n.toLowerCase() + ' ' + WEAPON_TYPES[w.type].label;
              }
              var leveled = addLifeSkillXp(sk, 'enchanting', w.tier === 'fusion' ? 50 : 25);
              if (!R._questFlags) R._questFlags = {};
              R._questFlags.enchantedWeapon = true;
              R._questFlags.slottedGem = true;
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, elem + ' enchanted!', edef.color);
              if (leveled) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 50, 'Enchanting Lv' + sk.enchanting.level + '!', '#D8A94D');
              BT_AUDIO.collect();
              setRpgState(_objectSpread({}, R));
              try {
                localStorage.setItem('bt_rpg', JSON.stringify(R));
              } catch (e) {}
            }
          }, blockedVolatile ? '⚡' : '◆', " ", elem, " (", polCount, ")");
        })), /* v2.3.1235: state-correction §6 — explicit controls for the
           states where the picker renders nothing: open slot but empty gem
           pouch → disabled "No polished gems"; 2nd slot gated behind
           Enchanting Lv20 (the slots line above names the requirement) →
           disabled "Locked"; no item / no slots / all slots filled →
           disabled "No open gem slot". */
        slotPickable && !hasAnyPolished && /*#__PURE__*/React.createElement("button", {
          disabled: true,
          style: LS_DISBTN
        }, "No polished gems"), !slotPickable && /*#__PURE__*/React.createElement("button", {
          disabled: true,
          style: LS_DISBTN
        }, wpn && openSlots > 0 ? "Locked" : "No open gem slot"));
      }), rpgState.amulet && /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 12,
          paddingBottom: 12,
          borderBottom: '1px solid ' + LS.divider
        }
      }, /*#__PURE__*/React.createElement("div", { style: LS_MOD }, "Amulet"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          fontWeight: 600,
          color: LS.txt1,
          marginBottom: 4
        }
      }, "📿 ", rpgState.amulet.name, rpgState.amulet.gem && function (_ELEMENTS$rpgState$am) {
        var bonus = getAmuletBonus(rpgState.amulet);
        return bonus ? /*#__PURE__*/React.createElement("span", {
          style: {
            fontWeight: 400,
            fontSize: 12,
            color: (_ELEMENTS$rpgState$am = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am === void 0 ? void 0 : _ELEMENTS$rpgState$am.color
          }
        }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit) : null;
      }()), rpgState.amulet.gem ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: LS.txt3,
          marginBottom: 6
        }
      }, "Slotted: ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: (_ELEMENTS$rpgState$am2 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am2 === void 0 ? void 0 : _ELEMENTS$rpgState$am2.color
        }
      }, rpgState.amulet.gem, " gem"), ". Slot a new gem to replace (old gem lost).") : /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: LS.txt3,
          marginBottom: 6
        }
      }, "Slot a polished gem to activate the amulet."), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap'
        }
      }, Object.entries(ELEMENTS).map(function (_ref93) {
        var _rpgState$lifeSkills12;
        var _ref94 = _slicedToArray(_ref93, 2),
          elem = _ref94[0],
          edef = _ref94[1];
        var gems = ((_rpgState$lifeSkills12 = rpgState.lifeSkills) === null || _rpgState$lifeSkills12 === void 0 ? void 0 : _rpgState$lifeSkills12.gems) || {};
        var polKey = 'polished_' + elem;
        var polCount = gems[polKey] || 0;
        if (polCount <= 0) return null;
        var gemStat = AMULET_GEM_STATS[elem];
        if (!gemStat) return null;
        var tierData = AMULET_TIERS[rpgState.amulet.tier];
        var previewVal = Math.round((gemStat.base + gemStat.perPower * ((tierData === null || tierData === void 0 ? void 0 : tierData.basePower) || 1)) * 10) / 10;
        return /*#__PURE__*/React.createElement("button", {
          key: elem,
          style: {
            padding: '6px 10px',
            minHeight: 32,
            borderRadius: 999,
            border: '1px solid ' + edef.color + '40',
            background: LS.raised,
            color: edef.color,
            fontSize: 11.5,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            cursor: 'pointer'
          },
          onClick: function onClick() {
            var _AMULET_TIERS$R$amule;
            var R = stateRef.current.rpg;
            var sk = R.lifeSkills;
            if (!sk.gems) sk.gems = {};
            if ((sk.gems[polKey] || 0) < 1) return;
            /* v2.3.1192: server-authoritative gem slot (amulet_forge_request
               op 'gem', server/src/amulet.js) -- the worker consumes one
               polished gem from ITS lifeSkills.gems copy and sets
               ps.amulet.gem, which is what feeds the authoritative flame
               elemDmg roll (_computeAttackDamage) and what survives
               reconnect.  Local mutation below stays as prediction; old
               workers without caps.amuletForge keep the legacy local-only
               slot. */
            {
              var _Sag = stateRef.current;
              if (_Sag._serverCaps && _Sag._serverCaps.amuletForge && _Sag.channel) {
                try { _Sag.channel.send({ type: 'amulet_forge_request', payload: { op: 'gem', gem: elem } }); } catch (e) {}
              }
            }
            sk.gems[polKey]--;
            R.amulet.gem = elem;
            R.amulet.name = (((_AMULET_TIERS$R$amule = AMULET_TIERS[R.amulet.tier]) === null || _AMULET_TIERS$R$amule === void 0 ? void 0 : _AMULET_TIERS$R$amule.label) || 'Simple') + ' ' + elem.charAt(0).toUpperCase() + elem.slice(1) + ' Amulet';
            if (!R._questFlags) R._questFlags = {};
            R._questFlags.slottedGem = true;
            addLifeSkillXp(sk, 'enchanting', 20);
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, gemStat.label + ' +' + previewVal + gemStat.unit, edef.color);
            BT_AUDIO.collect();
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (e) {}
          }
        }, "💎", elem, " (", polCount, ") +", previewVal, gemStat.unit);
      })), /* v2.3.1235: state-correction §6 — explicit control when the
         amulet pill picker would render nothing (empty polished-gem
         pouch for the amulet-slottable elements). */
      !Object.keys(ELEMENTS).some(function (e) {
        return AMULET_GEM_STATS[e] && (gemsOwned['polished_' + e] || 0) > 0;
      }) && /*#__PURE__*/React.createElement("button", {
        disabled: true,
        style: LS_DISBTN
      }, "No polished gems")), !rpgState.amulet && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: LS.txt3,
          marginBottom: 12
        }
      }, "📿 Craft an amulet at the Blacksmith to slot gems here."), rpgState.shield && /*#__PURE__*/React.createElement("div", null,
      /*#__PURE__*/React.createElement("div", { style: LS_MOD }, "Shield"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          fontWeight: 600,
          color: LS.txt1,
          marginBottom: 4
        }
      }, "🛡️ ", rpgState.shield.name, rpgState.shield.gem && function (_ELEMENTS$rpgState$sh) {
        var bonus = getShieldBonus(rpgState.shield);
        return bonus ? /*#__PURE__*/React.createElement("span", {
          style: {
            fontWeight: 400,
            fontSize: 12,
            color: (_ELEMENTS$rpgState$sh = ELEMENTS[rpgState.shield.gem]) === null || _ELEMENTS$rpgState$sh === void 0 ? void 0 : _ELEMENTS$rpgState$sh.color
          }
        }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit) : null;
      }()), rpgState.shield.gem ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: LS.txt3,
          marginBottom: 6
        }
      }, "Slotted: ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: (_ELEMENTS$rpgState$sh2 = ELEMENTS[rpgState.shield.gem]) === null || _ELEMENTS$rpgState$sh2 === void 0 ? void 0 : _ELEMENTS$rpgState$sh2.color
        }
      }, rpgState.shield.gem, " gem"), ". Slot new gem to replace.") : /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: LS.txt3,
          marginBottom: 6
        }
      }, "Slot a polished gem for defensive power."), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap'
        }
      }, Object.entries(ELEMENTS).map(function (_ref95) {
        var _rpgState$lifeSkills13;
        var _ref96 = _slicedToArray(_ref95, 2),
          elem = _ref96[0],
          edef = _ref96[1];
        var gems = ((_rpgState$lifeSkills13 = rpgState.lifeSkills) === null || _rpgState$lifeSkills13 === void 0 ? void 0 : _rpgState$lifeSkills13.gems) || {};
        var polKey = 'polished_' + elem;
        var polCount = gems[polKey] || 0;
        if (polCount <= 0) return null;
        var gemStat = SHIELD_GEM_STATS[elem];
        if (!gemStat) return null;
        var bt = BLACKSMITH_TIERS[rpgState.shield.gearBase];
        var previewVal = Math.round((gemStat.base + gemStat.perPower * ((bt === null || bt === void 0 ? void 0 : bt.tierMult) || 1)) * 10) / 10;
        return /*#__PURE__*/React.createElement("button", {
          key: elem,
          style: {
            padding: '6px 10px',
            minHeight: 32,
            borderRadius: 999,
            border: '1px solid ' + edef.color + '40',
            background: LS.raised,
            color: edef.color,
            fontSize: 11.5,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            cursor: 'pointer'
          },
          onClick: function onClick() {
            var _BLACKSMITH_TIERS$R$s;
            var R = stateRef.current.rpg;
            var sk = R.lifeSkills;
            if (!sk.gems) sk.gems = {};
            if ((sk.gems[polKey] || 0) < 1) return;
            sk.gems[polKey]--;
            R.shield.gem = elem;
            R.shield.name = (((_BLACKSMITH_TIERS$R$s = BLACKSMITH_TIERS[R.shield.gearBase]) === null || _BLACKSMITH_TIERS$R$s === void 0 ? void 0 : _BLACKSMITH_TIERS$R$s.label) || 'Basic') + ' ' + elem.charAt(0).toUpperCase() + elem.slice(1) + ' Shield';
            recalcDerived(R);
            addLifeSkillXp(sk, 'enchanting', 20);
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, gemStat.label + ' +' + previewVal + gemStat.unit, edef.color);
            BT_AUDIO.collect();
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (e) {}
          }
        }, "💎", elem, " (", polCount, ") +", previewVal, gemStat.unit);
      })), /* v2.3.1235: state-correction §6 — explicit control when the
         shield pill picker would render nothing (empty polished-gem
         pouch for the shield-slottable elements). */
      !Object.keys(ELEMENTS).some(function (e) {
        return SHIELD_GEM_STATS[e] && (gemsOwned['polished_' + e] || 0) > 0;
      }) && /*#__PURE__*/React.createElement("button", {
        disabled: true,
        style: LS_DISBTN
      }, "No polished gems")), !rpgState.shield && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: LS.txt3
        }
      }, "🛡️ Forge a shield at the Blacksmith to slot defensive gems here."), /*#__PURE__*/React.createElement("div", {
        /* v2.3.1235: state-correction §10 — sticky bottom fade (matches
           this panel's #202C32 sheet, not the shared #1E2E34); visible
           only while more content exists below the fold, gone at scroll
           end via measureFade. */
        "aria-hidden": true,
        style: {
          position: 'sticky',
          bottom: 0,
          height: 24,
          marginTop: -24,
          flexShrink: 0,
          background: 'linear-gradient(180deg, rgba(32,44,50,0), #202C32)',
          opacity: showFade ? 1 : 0,
          transition: 'opacity 160ms ease',
          pointerEvents: 'none'
        }
      })));
}
