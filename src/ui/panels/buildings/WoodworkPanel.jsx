import React from 'react';
import { BT_AUDIO, REFORGE_BONUSES, STAT_LABELS, WEAPON_STASH_MAX, WEAPON_TYPES, WOODWORKING_TIERS, addLifeSkillXp, getGearStatReq, hardenChance, rollReforgeBonus } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === WoodworkPanel — buildingPanel === 'woodwork' sub-panel === */
/* v2.3.873: extracted verbatim from the buildingPanel === 'woodwork' clause
   in BroTown.jsx (UI decomposition; behavior-frozen). 3 props; data +
   babel imports verified real exports; hoisted babel temps declared
   locally. The gate stays in BroTown. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   header strip + building icon; bow/staff toggle as brass-fill
   selection chips; craft tiers as 44px well rows with gold-icon price
   buttons; hardening attempt is that region's brass primary.
   Style/JSX only; forge_weapon / harden_weapon / reforge handlers are
   byte-identical. LS token block duplicated per building panel to keep
   the decomposed files dependency-free. */
/* v2.3.1235: batch-3 rollout — correction-pass token remap (game.css
   :root). The v2.3.1232 literals were the superseded v2.3.1227
   palette; same roles, approved values. Four depth roles only, so
   wellSoft folds into the well, and the off-token .08/.14 hairlines
   fold into the approved .11 line (.20 borderStrong added for
   secondary buttons). Header strip adopts the #27393F header token. */
var LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98', dis: '#667875',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23', wellSoft: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)', divider: 'rgba(229,237,233,.11)', wellBorder: 'rgba(229,237,233,.11)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)', onBrass: '#172126'
};
/* v2.3.1232: -20 margin counters .bt-inspect-card's 20px padding so the
   panel owns its full surface (header strip flush to the card edge). */
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
var LS_BODY = { padding: '12px 14px 14px' };
var LS_MOD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3, margin: '0 0 6px' }; /* v2.3.1235: batch-3 rollout — section headers are 11/700 .14em muted per the locked contract */
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
function lsGoldImg(dim) {
  return React.createElement("img", {
    src: '/icons/popups/gold.webp', alt: '', draggable: false,
    style: { width: 16, height: 16, objectFit: 'contain', opacity: dim ? 0.55 : 1 /* v2.3.1235: batch-3 rollout — unaffordable rows stay readable, .55 opacity floor */ },
    onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode('🪙')); }
  });
}
export function WoodworkPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  var _rpgState$lifeSkills29, _rpgState$lifeSkills32, _stateRef$current17, _wpn$gearBase3;
  return React.createElement("div", { style: LS_WRAP },
    lsHeader('woodwork', '🪚', "Woodworker", "Woodworking Lv" + (((_rpgState$lifeSkills29 = rpgState.lifeSkills) === null || _rpgState$lifeSkills29 === void 0 || (_rpgState$lifeSkills29 = _rpgState$lifeSkills29.woodworking) === null || _rpgState$lifeSkills29 === void 0 ? void 0 : _rpgState$lifeSkills29.level) || 1)),
    React.createElement("div", { style: LS_BODY },
      React.createElement("div", { style: { fontSize: 12, color: LS.txt2, marginBottom: 10, lineHeight: 1.5 } },
        "Craft bows and staves from harvested wood. Higher tiers unlock gem slots."),
      React.createElement("div", { style: LS_MOD }, "Weapon type"),
      React.createElement("div", {
        style: {
          display: 'flex',
          gap: 6,
          marginBottom: 12
        }
      }, [{
        type: 'bow',
        label: 'Bow' /* v2.3.1235: batch-3 rollout — 🏹 dropped, no emoji in chrome (label only feeds the toggle button) */,
        desc: 'Ranged single-target'
      }, {
        type: 'staff',
        label: 'Staff' /* v2.3.1235: batch-3 rollout — 🪄 dropped, no emoji in chrome */,
        desc: 'Ranged AOE swipe'
      }].map(function (wt) {
        var _stateRef$current13, _stateRef$current14, _stateRef$current15;
        return /*#__PURE__*/React.createElement("button", {
          key: wt.type,
          style: {
            flex: 1,
            padding: '8px 10px',
            minHeight: 44,
            borderRadius: 10 /* v2.3.1235: batch-3 rollout — 11 is off the approved radii set */,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: ((_stateRef$current13 = stateRef.current) === null || _stateRef$current13 === void 0 ? void 0 : _stateRef$current13._wwType) === wt.type ? LS.brassFill : LS.raised,
            border: ((_stateRef$current14 = stateRef.current) === null || _stateRef$current14 === void 0 ? void 0 : _stateRef$current14._wwType) === wt.type ? '1px solid ' + LS.brass : '1px solid ' + LS.border,
            color: ((_stateRef$current15 = stateRef.current) === null || _stateRef$current15 === void 0 ? void 0 : _stateRef$current15._wwType) === wt.type ? LS.brass : LS.txt2
          },
          onClick: function onClick() {
            stateRef.current._wwType = wt.type;
            setRpgState(_objectSpread({}, stateRef.current.rpg));
          }
        }, wt.label, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor (was 10) */,
            fontWeight: 400,
            color: LS.txt3,
            marginTop: 2
          }
        }, wt.desc));
      })),
      React.createElement("div", { style: LS_MOD }, "Craft"),
      Object.entries(WOODWORKING_TIERS).filter(function (_ref139) {
        var _rpgState$lifeSkills30;
        var _ref140 = _slicedToArray(_ref139, 2),
          key = _ref140[0],
          wt = _ref140[1];
        var wwLvl = ((_rpgState$lifeSkills30 = rpgState.lifeSkills) === null || _rpgState$lifeSkills30 === void 0 || (_rpgState$lifeSkills30 = _rpgState$lifeSkills30.woodworking) === null || _rpgState$lifeSkills30 === void 0 ? void 0 : _rpgState$lifeSkills30.level) || 1;
        return wt.minLvl <= wwLvl + 10;
      }).map(function (_ref141) {
        var _rpgState$lifeSkills31, _rpgState$inventory3, _stateRef$current16;
        var _ref142 = _slicedToArray(_ref141, 2),
          key = _ref142[0],
          wt = _ref142[1];
        var wwLvl = ((_rpgState$lifeSkills31 = rpgState.lifeSkills) === null || _rpgState$lifeSkills31 === void 0 || (_rpgState$lifeSkills31 = _rpgState$lifeSkills31.woodworking) === null || _rpgState$lifeSkills31 === void 0 ? void 0 : _rpgState$lifeSkills31.level) || 1;
        var canCraftSkill = wwLvl >= wt.minLvl;
        var woodKey = 'wood_' + wt.wood;
        var hasWood = (((_rpgState$inventory3 = rpgState.inventory) === null || _rpgState$inventory3 === void 0 ? void 0 : _rpgState$inventory3[woodKey]) || 0) >= wt.woodCost;
        var hasGold = rpgState.coins >= wt.goldCost;
        var craftType = ((_stateRef$current16 = stateRef.current) === null || _stateRef$current16 === void 0 ? void 0 : _stateRef$current16._wwType) || 'bow';
        var wwFullIdx = Object.keys(WOODWORKING_TIERS).indexOf(key);
        var wwStatReq = getGearStatReq(craftType, wwFullIdx);
        var wwMeetsStat = wwStatReq.value === 0 || (rpgState[wwStatReq.stat] || 0) >= wwStatReq.value;
        var canCraft = canCraftSkill && wwMeetsStat;
        return /*#__PURE__*/React.createElement("div", {
          key: key,
          /* v2.3.1235: batch-3 rollout — divided list rows replace the
             per-row well cards (contract: dividers over per-row cards);
             the first row's top hairline doubles as the rule under the
             module header. Locked rows meet the .55 readability floor
             (was .45); slot/wood glyphs are game data and stay. */
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 2px',
            minHeight: 44,
            borderTop: '1px solid ' + LS.divider,
            opacity: canCraft ? 1 : 0.55
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 16,
            flexShrink: 0
          }
        }, wt.slots > 0 ? '💠' : '🪵'), /*#__PURE__*/React.createElement("div", {
          style: {
            flex: 1,
            minWidth: 0
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13,
            fontWeight: 600,
            color: canCraft ? LS.txt1 : LS.dis
          }
        }, wt.label, " ", craftType === 'bow' ? 'Bow' : 'Staff', " ", /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor (was 10) */,
            fontWeight: 400,
            color: LS.txt3
          }
        }, "Lv", wt.minLvl, "+ \xB7 ", wt.tierMult, "\xD7")), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor (was 10.5) */,
            color: LS.txt3
          }
        }, wt.desc, " ", wt.slots > 0 ? "\xB7 ".concat(wt.slots, " gem slot").concat(wt.slots > 1 ? 's' : '') : ''), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor (was 10.5) */,
            color: LS.txt3,
            fontVariantNumeric: 'tabular-nums'
          }
        }, wt.woodCost, "\xD7 ", wt.wood.replace(/_/g, ' '), !canCraftSkill && " \xB7 Locked \xB7 Req WW Lv".concat(wt.minLvl), canCraftSkill && !wwMeetsStat && " \xB7 Locked \xB7 Req ".concat(STAT_LABELS[wwStatReq.stat] || wwStatReq.stat, " ").concat(wwStatReq.value)) /* v2.3.1235: batch-3 rollout — explicit text lock indication next to the requirement */), /*#__PURE__*/React.createElement("button", {
          /* v2.3.1235: batch-3 rollout — secondary recipe (raised +
             strong hairline, 10px radius — 11 is off the approved set)
             at the 44px hitbox floor (was 36); 13px button label (no
             half-sizes). Blocked state stays readable: quiet outline +
             disabled text; cost and the row's Locked/Req line carry
             the requirement. */
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '8px 10px',
            minHeight: 44,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            background: canCraft && hasWood && hasGold ? LS.raised : 'transparent',
            border: '1px solid ' + (canCraft && hasWood && hasGold ? LS.borderStrong : LS.border),
            color: canCraft && hasWood && hasGold ? LS.brass : LS.dis,
            cursor: 'pointer'
          },
          onClick: function onClick() {
            if (!canCraft || !hasWood || !hasGold) return;
            var R = stateRef.current.rpg;
            if (!R.inventory) R.inventory = {};
            var wpnType = craftType === 'bow' ? 'bow' : 'staff';
            /* Server-authoritative forge in MP -- mirrors WOODWORKING_TIERS.
               See blacksmith forge (~line 22273) for the predict + sync flow. */
            {
              var _Sww = stateRef.current;
              if (_Sww._serverMonsters && _Sww.channel) {
                try { _Sww.channel.send({ type: 'forge_weapon', payload: { weaponType: wpnType, tierKey: key, isWoodwork: true } }); } catch (e) {}
              }
            }
            R.inventory[woodKey] = (R.inventory[woodKey] || 0) - wt.woodCost;
            if (R.inventory[woodKey] <= 0) delete R.inventory[woodKey];
            R.coins -= wt.goldCost;
            var wpnKey = craftType === 'bow' ? 'rangedWeapon' : 'staffWeapon';
            if (R[wpnKey] && R[wpnKey].name) {
              if (!R.weaponStash) R.weaponStash = [];
              if (R.weaponStash.length < WEAPON_STASH_MAX) R.weaponStash.push(_objectSpread({}, R[wpnKey]));
            }
            R[wpnKey] = {
              type: wpnType,
              tier: 'common',
              tierMult: wt.tierMult,
              element1: null,
              element2: null,
              isVolatile: false,
              name: wt.label + ' ' + WEAPON_TYPES[wpnType].label,
              gearBase: 'ww_' + key,
              reforgeBonus: null,
              hardenBonus: null
            };
            var leveled = addLifeSkillXp(R.lifeSkills, 'woodworking', wt.minLvl * 5);
            if (!R._questFlags) R._questFlags = {};
            R._questFlags.craftedWoodWeapon = true;
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Crafted ' + wt.label + ' ' + WEAPON_TYPES[wpnType].label + '!', '#8B6914');
            if (wt.slots > 0) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 42, wt.slots + ' gem slot' + (wt.slots > 1 ? 's' : '') + ' ready!', '#a855f7');
            if (leveled) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 54, 'Woodworking Lv' + R.lifeSkills.woodworking.level + '!', '#D8A94D');
            BT_AUDIO.collect();
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (e) {}
          }
        }, lsGoldImg(!(canCraft && hasWood && hasGold)), wt.goldCost));
      }), function () {
        /* v2.3.1131: SS4.6c HARDENING for the active ranged/staff weapon
           (server ladder via harden_weapon -- see the ForgePanel twin;
           distinct from the legacy hardenBonus affix below). */
        var _Sh = stateRef.current;
        if (!(_Sh._serverCaps && _Sh._serverCaps.harden && _Sh.channel)) return null;
        var hCraft = (_Sh._wwType) || 'bow';
        var hSlot = hCraft === 'bow' ? 'rangedWeapon' : 'staffWeapon';
        var hw = rpgState[hSlot];
        if (!hw) return null;
        var hLvl = typeof hw.hardness === 'number' ? hw.hardness : 0;
        var hMaxed = hLvl >= 5;
        var hOdds = [80, 20, 5, 1, 0.5][Math.min(hLvl, 4)];
        var hCost = 500 * Math.pow(4, hLvl);
        var hTemper = hw.temper || 0;
        var hAfford = (rpgState.coins || 0) >= hCost;
        return /*#__PURE__*/React.createElement("div", {
          style: { marginTop: 12, padding: 10, borderRadius: 10, background: LS.wellSoft, border: '1px solid ' + LS.wellBorder }
        }, /*#__PURE__*/React.createElement("div", {
          style: { fontSize: 13 /* v2.3.1235: batch-3 rollout — body 13, no half-sizes */, fontWeight: 700, color: LS.txt1, marginBottom: 3 }
        }, "Hardening: ", hw.name, " — H", hLvl, "/5") /* v2.3.1235: batch-3 rollout — ⚒️ dropped, no emoji in chrome */, /*#__PURE__*/React.createElement("div", {
          style: { fontSize: 11, color: LS.txt3, marginBottom: 8, lineHeight: 1.5 }
        }, hMaxed ? 'Maximum hardness reached!' : "+1.04 base dmg per level \xB7 Success " + hOdds + "% \xB7 Fail resets hardness (Temper " + hTemper + " softens it) \xB7 Gated on Blacksmithing"), !hMaxed && /*#__PURE__*/React.createElement("button", {
          /* v2.3.1235: batch-3 rollout — the surface's single gold
             primary adopts the shared .button-primary recipe (game.css)
             instead of a flat brass fill; 44px hitbox floor (was 40),
             10px radius (11 is off the approved set), 13px label.
             Unaffordable state stays readable on the well; the cost in
             the label is the requirement. */
          className: hAfford ? 'button-primary' : undefined,
          style: {
            width: '100%', minHeight: 44, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            border: hAfford ? undefined : '1px solid ' + LS.border,
            background: hAfford ? undefined : LS.well,
            color: hAfford ? undefined : LS.dis,
            cursor: hAfford ? 'pointer' : 'not-allowed'
          },
          onClick: function onClick() {
            if (!hAfford) return;
            try { _Sh.channel.send({ type: 'broadcast', event: 'harden_weapon', payload: { slot: hSlot } }); } catch (e) {}
          }
        }, "Attempt H", hLvl + 1, " (", hCost, "G \xB7 ", hOdds, "%)"));
      }(), function (_stateRef$current17, _wpn$gearBase3, _rpgState$lifeSkills32) {
        var craftType = ((_stateRef$current17 = stateRef.current) === null || _stateRef$current17 === void 0 ? void 0 : _stateRef$current17._wwType) || 'bow';
        var wpnKey = craftType === 'bow' ? 'rangedWeapon' : 'staffWeapon';
        var wpn = rpgState[wpnKey];
        if (!(wpn !== null && wpn !== void 0 && (_wpn$gearBase3 = wpn.gearBase) !== null && _wpn$gearBase3 !== void 0 && _wpn$gearBase3.startsWith('ww_'))) return /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: LS.txt3,
            marginTop: 10
          }
        }, "Craft a weapon first to unlock Reforge & Harden.");
        var wwKey = wpn.gearBase.slice(3);
        var wt = WOODWORKING_TIERS[wwKey];
        if (!wt) return null;
        var reforgeCost = Math.ceil(wt.woodCost * 0.5);
        var reforgeWoodKey = 'wood_' + wt.wood;
        var reforgeGold = Math.ceil(wt.goldCost * 0.3);
        var hardenCost = wt.woodCost;
        var hardenGold = Math.ceil(wt.goldCost * 0.5);
        var hChance = hardenChance(wt.tierMult, ((_rpgState$lifeSkills32 = rpgState.lifeSkills) === null || _rpgState$lifeSkills32 === void 0 || (_rpgState$lifeSkills32 = _rpgState$lifeSkills32.woodworking) === null || _rpgState$lifeSkills32 === void 0 ? void 0 : _rpgState$lifeSkills32.level) || 1);
        return /*#__PURE__*/React.createElement("div", {
          style: {
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            background: LS.wellSoft,
            border: '1px solid ' + LS.wellBorder
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13 /* v2.3.1235: batch-3 rollout — body 13, no half-sizes */,
            fontWeight: 700,
            color: LS.txt1,
            marginBottom: 4
          }
        }, "Reforge & Harden: ", wpn.name) /* v2.3.1235: batch-3 rollout — 🔧 dropped, no emoji in chrome */, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: LS.txt3,
            marginBottom: 8
          }
        }, "Current: ", wpn.reforgeBonus ? "".concat(wpn.reforgeBonus.label, " +").concat(wpn.reforgeBonus.value).concat(wpn.reforgeBonus.unit) : 'No bonus', wpn.hardenBonus ? " \xB7 ".concat(wpn.hardenBonus.label, " +").concat(wpn.hardenBonus.value).concat(wpn.hardenBonus.unit) : ''), /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            gap: 6
          }
        }, /*#__PURE__*/React.createElement("button", {
          /* v2.3.1235: batch-3 rollout — secondary recipe (raised +
             strong hairline, 10px radius — 11 is off the approved set)
             at the 44px hitbox floor (was 40). */
          style: {
            flex: 1,
            minHeight: 44,
            padding: '6px 4px',
            borderRadius: 10,
            border: '1px solid ' + LS.borderStrong,
            background: LS.raised,
            color: LS.txt1,
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            cursor: 'pointer'
          },
          onClick: function onClick() {
            var R = stateRef.current.rpg;
            if (!R.inventory) R.inventory = {};
            if ((R.inventory[reforgeWoodKey] || 0) < reforgeCost || R.coins < reforgeGold) {
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Need ' + reforgeCost + 'x wood + ' + reforgeGold + 'g', '#D95C54');
              return;
            }
            R.inventory[reforgeWoodKey] -= reforgeCost;
            if (R.inventory[reforgeWoodKey] <= 0) delete R.inventory[reforgeWoodKey];
            R.coins -= reforgeGold;
            var bonus = rollReforgeBonus(wt.tierMult);
            R[wpnKey].reforgeBonus = bonus;
            addLifeSkillXp(R.lifeSkills, 'woodworking', Math.ceil(wt.minLvl * 2));
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Reforged! ' + bonus.label + ' +' + bonus.value + bonus.unit, '#d4a020');
            BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (e) {}
          }
        }, "Reforge (" /* v2.3.1235: batch-3 rollout — 🔧 dropped, no emoji in chrome */, reforgeCost, " wood + ", /*#__PURE__*/React.createElement("span", {
          style: { color: LS.brass }
        }, reforgeGold, "g"), ")"), /*#__PURE__*/React.createElement("button", {
          /* v2.3.1235: batch-3 rollout — secondary recipe (raised +
             strong hairline, 10px radius — 11 is off the approved set)
             at the 44px hitbox floor (was 40); the already-hardened
             state keeps a readable quiet outline + disabled text. */
          style: {
            flex: 1,
            minHeight: 44,
            padding: '6px 4px',
            borderRadius: 10,
            border: wpn.hardenBonus ? '1px solid ' + LS.border : '1px solid ' + LS.borderStrong,
            background: wpn.hardenBonus ? LS.well : LS.raised,
            color: wpn.hardenBonus ? LS.dis : LS.txt1,
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            cursor: 'pointer'
          },
          onClick: function onClick() {
            var R = stateRef.current.rpg;
            if (R[wpnKey].hardenBonus) {
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Already hardened!', '#D95C54');
              return;
            }
            if (!R[wpnKey].reforgeBonus) {
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Reforge first!', '#D95C54');
              return;
            }
            if (!R.inventory) R.inventory = {};
            if ((R.inventory[reforgeWoodKey] || 0) < hardenCost || R.coins < hardenGold) {
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Need ' + hardenCost + 'x wood + ' + hardenGold + 'g', '#D95C54');
              return;
            }
            R.inventory[reforgeWoodKey] -= hardenCost;
            if (R.inventory[reforgeWoodKey] <= 0) delete R.inventory[reforgeWoodKey];
            R.coins -= hardenGold;
            if (Math.random() < hChance) {
              var bonus = rollReforgeBonus(wt.tierMult);
              if (bonus.id === R[wpnKey].reforgeBonus.id) bonus.id = REFORGE_BONUSES[(REFORGE_BONUSES.findIndex(function (b) {
                return b.id === bonus.id;
              }) + 1) % REFORGE_BONUSES.length].id;
              R[wpnKey].hardenBonus = bonus;
              addLifeSkillXp(R.lifeSkills, 'woodworking', Math.ceil(wt.minLvl * 4));
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'HARDENED! +' + bonus.label + ' +' + bonus.value + bonus.unit, '#D8A94D');
              stateRef.current.screenShake = 4;
              BT_AUDIO.collect();
            } else {
              var oldName = R[wpnKey].name;
              R[wpnKey].reforgeBonus = null;
              R[wpnKey].hardenBonus = null;
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'BROKE! ' + oldName + ' lost all bonuses', '#D95C54');
              stateRef.current.screenShake = 6;
              BT_AUDIO.beep(120, 0.15, 0.2, 'sawtooth');
            }
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (e) {}
          }
        }, "Harden (" /* v2.3.1235: batch-3 rollout — ⚒️ dropped, no emoji in chrome */, Math.round(hChance * 100), "% \xB7 ", hardenCost, " wood + ", /*#__PURE__*/React.createElement("span", {
          style: { color: wpn.hardenBonus ? LS.dis : LS.brass }
        }, hardenGold, "g"), ")")));
      }()));
}
