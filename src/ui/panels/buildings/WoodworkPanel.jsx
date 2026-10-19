import React from 'react';
import { BT_AUDIO, STAT_LABELS, WEAPON_STASH_MAX, WEAPON_TYPES, WOODWORKING_TIERS, addLifeSkillXp, getGearStatReq, getEquipReqLabel } from '@/data/index.js'; /* v2.3.3481: REFORGE_BONUSES, hardenChance and rollReforgeBonus went with the browser-only Reforge & Harden row */
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
import { cue } from '@/game/eventSounds.js'; /* v2.3.3343: the woodworker's results heard */
import { celebrateLifeSkillLevel } from '@/game/levelCelebration.js'; /* v2.3.2591: a crafting level gets the same celebration as a gathering one */
import { TrapsTab } from './TrapsTab.jsx'; /* v2.3.3120: box traps from logs */
import { hardenCost as hardenAttemptCost, hardenIsWood, hardenTierOf } from '@/data/hardenCosts.js'; /* v2.3.3139: hardening takes a material and a doubling gold ladder (renamed: the legacy affix section below has a local hardenCost; v2.3.3481: that section is gone, the name stays); v2.3.3481: hardenIsWood and hardenTierOf name the skill and level a bow's or a staff's hardening asks for */
import { HardenedWoodTab } from './HardenedWoodTab.jsx'; /* v2.3.3139: five logs into one hardened wood */
import { HARDENED_WOOD_RECIPES } from '@/data/hardenedWood.js'; /* v2.3.3486: a bow or a staff is made of hardened wood */
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
/* v2.3.1235: state-correction §10 — flex-column wrap (fixed header strip,
   internal overflow-y body) so the Hardening / Reforge actions at the tail
   are always reachable by scroll on short phones (390px). */
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left', display: 'flex', flexDirection: 'column', maxHeight: '100%' };
var LS_BODY = { padding: '12px 14px 12px', overflowY: 'auto', touchAction: 'pan-y', flex: '1 1 auto', minHeight: 0 };
var LS_MOD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3, margin: '0 0 6px' }; /* v2.3.1235: batch-3 rollout — section headers are 11/700 .14em muted per the locked contract */
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
/* v2.3.3481: lsGoldImg (the coin on the ready craft button) went with that
   price-tag label: the button says "Craft" now (below). */
export function WoodworkPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  var _rpgState$lifeSkills29; /* v2.3.3481: the Reforge & Harden row's three temps went with it */
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
  /* v2.3.3120: the Traps tab (TrapsTab.jsx) -- a third choice beside Bow and
     Staff, only against a worker that makes traps (caps.trapcraft, read
     straight off S._serverCaps so the caps audit sees the gate) */
  var _trapCraftOn = !!(stateRef.current && stateRef.current._serverCaps && stateRef.current._serverCaps.trapcraft);
  var _trapsMode = _trapCraftOn && stateRef.current && stateRef.current._wwType === 'traps';
  /* v2.3.3139: and the Harden tab (HardenedWoodTab.jsx) -- five logs into one
     hardened wood, a bow's or a staff's hardening material -- only against a
     worker that makes it (caps.hardenedwood, read straight off S._serverCaps) */
  var _hwOn = !!(stateRef.current && stateRef.current._serverCaps && stateRef.current._serverCaps.hardenedwood);
  var _hwMode = _hwOn && stateRef.current && stateRef.current._wwType === 'hardwood';
  var _otherMode = _trapsMode || _hwMode;
  var _makeCards = [{
    type: 'bow',
    label: 'Bow' /* v2.3.1235: batch-3 rollout — 🏹 dropped, no emoji in chrome (label only feeds the toggle button) */,
    desc: 'Ranged single-target'
  }, {
    type: 'staff',
    label: 'Staff' /* v2.3.1235: batch-3 rollout — 🪄 dropped, no emoji in chrome */,
    desc: 'Ranged AOE swipe'
  }].concat(_trapCraftOn ? [{ type: 'traps', label: 'Traps', desc: 'Box traps for pets' }] : [])
    .concat(_hwOn ? [{ type: 'hardwood', label: 'Harden', desc: 'Hardened wood' }] : []);
  /* v2.3.3481: the 2026-10-19 UI review -- ON FIRST OPENING NO CHOICE WAS
     LIT, though bows were listed: `_wwType` is unset until a choice is
     tapped, and every reader below takes that as Bow (`_wwType || 'bow'`).
     The lit card reads the same default, so it always names what is shown. */
  var _selType = (stateRef.current && stateRef.current._wwType) || 'bow';
  /* v2.3.3481: your Woodworking level, and the first wood above it -- the
     craft list's one locked row (its filter, below) */
  var _wwNow = (rpgState.lifeSkills && rpgState.lifeSkills.woodworking && rpgState.lifeSkills.woodworking.level) || 1;
  var _wwNext = Object.keys(WOODWORKING_TIERS).find(function (k) { return WOODWORKING_TIERS[k].minLvl > _wwNow; });
  return React.createElement("div", { style: LS_WRAP },
    lsHeader('woodwork', '🪚', "Woodworker", "Woodworking Lv" + (((_rpgState$lifeSkills29 = rpgState.lifeSkills) === null || _rpgState$lifeSkills29 === void 0 || (_rpgState$lifeSkills29 = _rpgState$lifeSkills29.woodworking) === null || _rpgState$lifeSkills29 === void 0 ? void 0 : _rpgState$lifeSkills29.level) || 1)),
    React.createElement("div", {
      /* v2.3.1235: state-correction §10 — internal scroll body; scrollbar
         hidden by .ls-scrollbody (game.css), reachability signalled by
         the sticky bottom fade (last child). */
      className: "ls-scrollbody",
      ref: scrollBodyRef,
      onScroll: measureFade,
      style: LS_BODY
    },
      React.createElement("div", { style: { fontSize: 12, color: LS.txt2, marginBottom: 10, lineHeight: 1.5 } },
        _trapsMode ? "Make box traps for catching pets."
          : _hwMode ? "Five logs make one hardened wood. A bow or staff is hardened with its own wood's."
          /* v2.3.3481: the 2026-10-19 UI review -- "Higher tiers unlock gem
             slots" read as none until later, but every wood has one (the
             Pine Bow's row says "1 gem slot") and from Lv31 two
             (WOODWORKING_TIERS); each row prints its own count. */
          : "Craft bows and staves from harvested wood."),
      React.createElement("div", { style: LS_MOD }, (_trapCraftOn || _hwOn) ? "Make" : "Weapon type"),
      React.createElement("div", {
        "data-ww-make": _makeCards.length,
        /* v2.3.3139: four choices go two by two (four across a phone left
           each about 75 px, its words in three lines) */
        style: _makeCards.length > 3 ? {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          marginBottom: 12
        } : {
          display: 'flex',
          gap: 6,
          marginBottom: 12
        }
      }, _makeCards.map(function (wt) {
        return /*#__PURE__*/React.createElement("button", {
          key: wt.type,
          "data-ww-type": wt.type, /* v2.3.3139: a test hook -- the old Reforge & Harden row has a "Harden (...)" button too (v2.3.3481: that row is gone; mp-hardenbars still taps these by it) */
          style: {
            flex: 1,
            padding: '8px 10px',
            minHeight: 44,
            borderRadius: 10 /* v2.3.1235: batch-3 rollout — 11 is off the approved radii set */,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            /* v2.3.3481: lit by `_selType` (above), so Bow is lit before anything is tapped */
            background: _selType === wt.type ? LS.brassFill : LS.raised,
            border: _selType === wt.type ? '1px solid ' + LS.brass : '1px solid ' + LS.border,
            color: _selType === wt.type ? LS.brass : LS.txt2
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
      _trapsMode ? React.createElement(TrapsTab, { rpgState: rpgState, stateRef: stateRef })
        : _hwMode ? React.createElement(HardenedWoodTab, { rpgState: rpgState, stateRef: stateRef })
        : React.createElement("div", { style: LS_MOD }, "Craft"),
      _otherMode ? null : Object.entries(WOODWORKING_TIERS).filter(function (_ref139) {
        var _ref140 = _slicedToArray(_ref139, 2),
          key = _ref140[0],
          wt = _ref140[1];
        /* v2.3.3481: the 2026-10-19 UI review -- what you can make now, plus
           only the NEXT wood, locked, as the goal: the Blacksmith's rule
           (SmithyPanel.jsx ForgeTab, the owner's v2.3.2826 rebuild).  The
           list ran ten Woodworking levels ahead (`minLvl <= level + 10`),
           two locked rows at Lv1. */
        return wt.minLvl <= _wwNow || key === _wwNext;
      }).map(function (_ref141) {
        var _rpgState$lifeSkills31, _rpgState$inventory3, _stateRef$current16;
        var _ref142 = _slicedToArray(_ref141, 2),
          key = _ref142[0],
          wt = _ref142[1];
        var wwLvl = ((_rpgState$lifeSkills31 = rpgState.lifeSkills) === null || _rpgState$lifeSkills31 === void 0 || (_rpgState$lifeSkills31 = _rpgState$lifeSkills31.woodworking) === null || _rpgState$lifeSkills31 === void 0 ? void 0 : _rpgState$lifeSkills31.level) || 1;
        var canCraftSkill = wwLvl >= wt.minLvl;
        /* ═══ v2.3.3486: FOUR HARDENED WOOD, AND THE GATE WEARING IT HAS ═══
           Against a worker with the tour's gear rules (caps.tourgear,
           server/src/gear.js): a wood with a hardened wood makes its bow or
           staff from four of it (the tier's `hardened`, `hardenedCost`), and
           the bench asks what WEARING the piece asks (getEquipReqLabel, the
           equip gate's own badge) -- pine and softwood nothing.  An older
           worker takes the logs and asks tierIndex x 5, as before. */
        var _tg = !!(stateRef.current && stateRef.current._serverCaps && stateRef.current._serverCaps.tourgear);
        var _hw = _tg && wt.hardened ? wt.hardened : null;
        var woodKey = _hw || ('wood_' + wt.wood);
        var woodNeed = _hw ? wt.hardenedCost : wt.woodCost;
        var woodName = _hw ? ((HARDENED_WOOD_RECIPES[_hw] || {}).name || 'Hardened wood') : (wt.wood.charAt(0).toUpperCase() + wt.wood.slice(1)).replace(/_/g, ' ');
        var hasWood = (((_rpgState$inventory3 = rpgState.inventory) === null || _rpgState$inventory3 === void 0 ? void 0 : _rpgState$inventory3[woodKey]) || 0) >= woodNeed;
        var hasGold = rpgState.coins >= wt.goldCost;
        var craftType = ((_stateRef$current16 = stateRef.current) === null || _stateRef$current16 === void 0 ? void 0 : _stateRef$current16._wwType) || 'bow';
        var wwFullIdx = Object.keys(WOODWORKING_TIERS).indexOf(key);
        /* v2.3.1661 (prog3): rpg passed — the rebuild gates on the
           trained skill at tierIndex × 5 (met carried on the req). */
        var wwStatReq = getGearStatReq(craftType, wwFullIdx, rpgState);
        if (_tg) {
          var _eq = getEquipReqLabel({ type: craftType, gearBase: 'ww_' + key, tierMult: wt.tierMult }, 'weapon', rpgState);
          wwStatReq = _eq ? { stat: _eq.stat, label: _eq.label, value: _eq.req, have: _eq.have, met: _eq.met !== false, prog3: !!_eq.prog3 }
            : { stat: craftType, label: '', value: 0, met: true, prog3: true };
        }
        var wwMeetsStat = wwStatReq.value === 0 || (wwStatReq.prog3 ? wwStatReq.met : (rpgState[wwStatReq.stat] || 0) >= wwStatReq.value);
        var canCraft = canCraftSkill && wwMeetsStat;
        var craftReady = canCraft && hasWood && hasGold; /* v2.3.3481: the button's one ready test (below) */
        return /*#__PURE__*/React.createElement("div", {
          key: key,
          /* v2.3.1235: batch-3 rollout — divided list rows replace the
             per-row well cards (contract: dividers over per-row cards);
             the first row's top hairline doubles as the rule under the
             module header; slot/wood glyphs are game data and stay. */
          /* v2.3.1235: state-correction — whole-row opacity dimming removed;
             locked state is carried by text tokens + ls-lock glyph instead. */
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 2px',
            minHeight: 44,
            borderTop: '1px solid ' + LS.divider
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
            /* v2.3.1235: state-correction — locked titles #B6C1BE (state 3);
               missing-materials rows keep full title brightness (state 2). */
            color: canCraft ? LS.txt1 : LS.txt2
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
        }, /* v2.3.1235: state-correction — state-2 rows show live have/need
              counts from the same inventory/coin reads the disable logic
              uses (met = positive green, short = danger); state-3 rows keep
              the static cost + ls-lock glyph + requirement. */
        canCraft && /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
          style: {
            color: hasWood ? '#55B98A' : '#D8635D'
          }
        }, woodName, " ", ((rpgState.inventory || {})[woodKey] || 0), "/", woodNeed), " \xB7 ", /*#__PURE__*/React.createElement("span", {
          style: {
            color: hasGold ? '#55B98A' : '#D8635D'
          }
        }, "Gold ", rpgState.coins || 0, "/", wt.goldCost)), !canCraft && /*#__PURE__*/React.createElement("span", null, woodNeed, "\xD7 ", woodName, " \xB7 ", /*#__PURE__*/React.createElement("span", {
          className: "ls-lock",
          style: {
            marginRight: 3
          }
        }), !canCraftSkill ? "Woodworking Lv".concat(wt.minLvl) : "".concat(wwStatReq.prog3 ? wwStatReq.label : STAT_LABELS[wwStatReq.stat] || wwStatReq.stat, " ").concat(wwStatReq.value)))), /*#__PURE__*/React.createElement("button", {
          /* v2.3.1235: state-correction — disabled recipe is #1A292F fill +
             #8D9B98 label + .11 hairline at full opacity; real disabled
             prop added around the untouched handler; blocked buttons carry
             the need in their label so the price pill is never the only
             explanation. */
          /* v2.3.3481: the 2026-10-19 UI review -- THE READY BUTTON READ AS A
             PRICE TAG: a coin and "8" on a slate chip, while the row above it
             already prints the cost ("Gold 2550/8").  It now says "Craft" on
             the brass primary face, the pattern of the Attempt-H button below
             and of the Blacksmith's Smelt and Forge: the class draws it, so
             the inline colours step aside.  The blocked labels are unchanged. */
          className: craftReady ? 'button-primary' : undefined,
          disabled: !craftReady,
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: craftReady ? '8px 14px' : '8px 10px',
            minHeight: 44,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            background: craftReady ? undefined : '#1A292F',
            border: craftReady ? undefined : '1px solid ' + LS.border,
            color: craftReady ? undefined : LS.txt3,
            opacity: 1,
            cursor: craftReady ? 'pointer' : 'default'
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
              /* v2.3.2077: `_serverMonsters` is FALSE in town -- it means "this
             zone has server-managed monsters", and wsClient sets it false on
             an empty monster list ("town, or a dungeon the server doesn't
             model", its own words). This send therefore never happened in
             town. Third instance of this exact flag doing it: v2.3.1702
             (ability_use), v2.3.2063 (shop_purchase). Presence on the channel
             is the only precondition.
                 Same as the blacksmith's forge above, and in the same town. */
              if (_Sww.channel) {
                try { _Sww.channel.send({ type: 'forge_weapon', payload: { weaponType: wpnType, tierKey: key, isWoodwork: true } }); } catch (e) {}
              }
            }
            R.inventory[woodKey] = (R.inventory[woodKey] || 0) - woodNeed;
            if (R.inventory[woodKey] <= 0) delete R.inventory[woodKey];
            R.coins -= wt.goldCost;
            var wpnKey = craftType === 'bow' ? 'rangedWeapon' : 'staffWeapon';
            if (R[wpnKey] && R[wpnKey].name) {
              if (!R.weaponStash) R.weaponStash = [];
              /* v2.3.2123: refuse at the cap instead of overwriting -- the
                 blacksmith's twin, same bug, same reason.  See ForgePanel. */
              if (R.weaponStash.length >= WEAPON_STASH_MAX) return;
              R.weaponStash.push(_objectSpread({}, R[wpnKey]));
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
            var _wwLvlBefore = R.lifeSkills.woodworking.level;
            /* v2.3.3486: the tier's own XP where it has one (the worker's
               `tier.xp || minLvl x 5`, gear.js) */
            var leveled = addLifeSkillXp(R.lifeSkills, 'woodworking', (_tg && wt.xp) || wt.minLvl * 5);
            if (!R._questFlags) R._questFlags = {};
            R._questFlags.craftedWoodWeapon = true;
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Crafted ' + wt.label + ' ' + WEAPON_TYPES[wpnType].label + '!', '#8B6914');
            if (wt.slots > 0) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 42, wt.slots + ' gem slot' + (wt.slots > 1 ? 's' : '') + ' ready!', '#a855f7');
            if (leveled) celebrateLifeSkillLevel(stateRef.current, 'woodworking', R.lifeSkills.woodworking.level, _wwLvlBefore); /* v2.3.2591 */
            if (leveled) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 54, 'Woodworking Lv' + R.lifeSkills.woodworking.level + '!', '#D8A94D');
            cue('woodwork');   /* v2.3.3343: the plane and the knock of the wood -- collect() is a beep(), silent (SOUND-GAPS) */
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (e) {}
          }
        }, /* v2.3.1235: state-correction — action label states: "Locked"
              for level/stat locks (state 3), the binding shortage for
              missing materials (state 2); only state 1 keeps the price
              pill (which is then not the only explanation).
              v2.3.3481: state 1 says "Craft" (the price is on the row). */
        !canCraft ? "Locked" : !hasWood ? "Need ".concat(woodNeed - ((rpgState.inventory || {})[woodKey] || 0), " ").concat(_hw ? 'hardened' : wt.wood.replace(/_/g, ' ')) : !hasGold ? "Need ".concat(wt.goldCost - (rpgState.coins || 0), "G more") : "Craft"));
      }), _otherMode ? null : function () {
        /* v2.3.1131: SS4.6c HARDENING for the active ranged/staff weapon
           (server ladder via harden_weapon -- see the ForgePanel twin;
           distinct from the legacy hardenBonus affix below -- v2.3.3481:
           that row is gone, this is the only hardening here). */
        var _Sh = stateRef.current;
        if (!(_Sh._serverCaps && _Sh._serverCaps.harden && _Sh.channel)) return null;
        var hCraft = (_Sh._wwType) || 'bow';
        var hSlot = hCraft === 'bow' ? 'rangedWeapon' : 'staffWeapon';
        var hw = rpgState[hSlot];
        if (!hw) return null;
        var hLvl = typeof hw.hardness === 'number' ? hw.hardness : 0;
        var hMaxed = hLvl >= 5;
        var hOdds = [80, 20, 5, 1, 0.5][Math.min(hLvl, 4)];
        /* v2.3.3139: the owner's ladder -- 500 x 2^H gold and H+1 of the bow's
           or staff's own wood's HARDENED WOOD (data/hardenCosts.js; made on
           the Harden tab) -- against a worker that charges it
           (caps.hardenmats with caps.hardenedwood); else the old 500 x 4^H */
        var hc = hardenAttemptCost(hw, hLvl, !!(_Sh._serverCaps && _Sh._serverCaps.hardenmats), !!(_Sh._serverCaps && _Sh._serverCaps.hardenedwood), hSlot);
        var hCost = hc.gold;
        var hTemper = hw.temper || 0;
        var hMatsHave = hc.material ? Math.floor(((rpgState.inventory || {})[hc.material]) || 0) : 0;
        var hGoldOk = (rpgState.coins || 0) >= hCost;
        var hMatsOk = !hc.material || hMatsHave >= hc.amount;
        var hAfford = hGoldOk && hMatsOk;
        /* v2.3.3481: WHICH SKILL HARDENING ASKS FOR.  The owner, asked
           whether hardening a bow or a staff should ask for the Blacksmithing
           level: "Do woodworking" (2026-10-19).  A worker that gates it so
           says caps.hardenwoodskill (server/src/hardening.js: Woodworking
           at least 5 x the weapon's tier, its own _weaponTierIndex, which
           data/hardenCosts.js hardenTierOf mirrors -- a pine bow Woodworking
           5), and then this line names Woodworking and that level.  An older
           worker, or `hardenwoodskill: false`, still gates every weapon on
           Blacksmithing, so the line keeps its old words there.  A sword
           stays on Blacksmithing (the Blacksmith's Upgrade tab).  The words
           only: as before, the worker's refusal names the level if it is
           short. */
        var hByWood = !!(_Sh._serverCaps && _Sh._serverCaps.hardenwoodskill) && hardenIsWood(hw, hSlot);
        var hSkillLvl = hByWood ? hardenTierOf(hw) * 5 : 0;
        return /*#__PURE__*/React.createElement("div", {
          style: { marginTop: 12, padding: 10, borderRadius: 10, background: LS.wellSoft, border: '1px solid ' + LS.wellBorder }
        }, /*#__PURE__*/React.createElement("div", {
          style: { fontSize: 13 /* v2.3.1235: batch-3 rollout — body 13, no half-sizes */, fontWeight: 700, color: LS.txt1, marginBottom: 3 }
        }, "Hardening: ", hw.name, " — H", hLvl, "/5") /* v2.3.1235: batch-3 rollout — ⚒️ dropped, no emoji in chrome */, /*#__PURE__*/React.createElement("div", {
          "data-harden-gate": hByWood ? 'woodworking:' + hSkillLvl : 'blacksmithing', /* v2.3.3481: mp-hardenbars reads which skill this line names */
          style: { fontSize: 11, color: LS.txt3, marginBottom: 8, lineHeight: 1.5 }
        }, hMaxed ? 'Maximum hardness reached!' : "+1.04 base dmg per level \xB7 Success " + hOdds + "% \xB7 Fail resets hardness (Temper " + hTemper + " softens it) \xB7 " + (hByWood ? "Needs Woodworking Lv" + hSkillLvl : "Gated on Blacksmithing")), !hMaxed && /*#__PURE__*/React.createElement("button", {
          /* v2.3.1235: batch-3 rollout — the surface's single gold
             primary adopts the shared .button-primary recipe (game.css)
             instead of a flat brass fill; 44px hitbox floor (was 40),
             10px radius (11 is off the approved set), 13px label.
             Unaffordable state stays readable on the well; the cost in
             the label is the requirement. */
          className: hAfford ? 'button-primary' : undefined,
          "data-harden-go": "1", /* v2.3.3139: mp-hardenbars, as the Blacksmith's */
          /* v2.3.1235: state-correction — real disabled prop + approved
             disabled recipe (#1A292F fill, #8D9B98 label, .11 hairline,
             full opacity) when coins are short; handler untouched. */
          disabled: !hAfford,
          style: {
            width: '100%', minHeight: 44, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            border: hAfford ? undefined : '1px solid ' + LS.border,
            background: hAfford ? undefined : '#1A292F',
            color: hAfford ? undefined : LS.txt3,
            opacity: 1,
            cursor: hAfford ? 'pointer' : 'not-allowed'
          },
          onClick: function onClick() {
            if (!hAfford) return;
            try { _Sh.channel.send({ type: 'broadcast', event: 'harden_weapon', payload: { slot: hSlot } }); } catch (e) {}
          }
        }, /* v2.3.1235: state-correction — short-coins label states the
              gold deficit (fee - coins, same values the hAfford guard
              reads) instead of an enabled-looking attempt label. */
        hAfford ? /*#__PURE__*/React.createElement("span", { "data-harden-cost": hc.material ? hc.material + ':' + hc.amount : 'gold' }, "Attempt H", hLvl + 1, " (", hCost, "G", hc.material ? " + " + hc.word(hc.amount) : "", " \xB7 ", hOdds, "%)")
          : !hGoldOk ? "Need ".concat(hCost - (rpgState.coins || 0), "G more")
          : "Need " + hc.word(hc.amount - hMatsHave) + " more"));
      }(), /* v2.3.3481: the 2026-10-19 UI review -- THE OLD "REFORGE & HARDEN"
         ROW IS GONE (with its "Craft a weapon first to unlock Reforge &
         Harden." line).  It spent wood and gold and rolled a reforge or
         harden bonus in the browser alone: it sent the worker nothing, the
         worker makes every weapon with neither bonus (gear.js) and never
         reads them, so the next update from it undid the roll -- a button
         that lies, which the Blacksmith's rebuild removed there (v2.3.2826:
         "a button that lies is worse than no button").  The hardening above
         (harden_weapon) is the real one, settled by the worker. */
      /*#__PURE__*/React.createElement("div", {
        /* v2.3.1235: state-correction §10 — sticky bottom fade (matches
           the #1E2E34 sheet behind it); visible only while more content
           exists below the fold, gone at scroll end via measureFade. */
        "aria-hidden": true,
        style: {
          position: 'sticky',
          bottom: 0,
          height: 24,
          marginTop: -24,
          flexShrink: 0,
          background: 'linear-gradient(180deg, rgba(30,46,52,0), #1E2E34)',
          opacity: showFade ? 1 : 0,
          transition: 'opacity 160ms ease',
          pointerEvents: 'none'
        }
      })));
}
