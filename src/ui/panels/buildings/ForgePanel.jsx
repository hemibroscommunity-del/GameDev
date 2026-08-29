import React from 'react';
import { AMULET_TIERS, BLACKSMITH_TIERS, BT_AUDIO, EQUIP_STAT_MAP, NUGGETS_PER_BAR, REFORGE_BONUSES, SHIELD_EQUIP_STAT, STAT_LABELS, WEAPON_STASH_MAX, WEAPON_TYPES, WOODWORKING_TIERS, addLifeSkillXp, gemExtractCost, getAmuletSalvageReturns, getGearStatReq, getSalvageReturns, hardenChance, recalcDerived, rollReforgeBonus } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === ForgePanel — blacksmith forge (weapon/armor craft, reforge, harden, salvage) === */
/* v2.3.872: first buildingPanel sub-panel extracted (REBUILD-PLAN UI
   decomposition). Moved verbatim from the buildingPanel === 'forge'
   clause in BroTown.jsx; behavior-frozen. 3 props (rpgState, stateRef,
   setRpgState). Data + babel imports verified real exports.
   _rpgState$lifeSkills21 babel temp hoisted to BroTown top; declared
   locally. setTimeout/localStorage are browser globals. */
export function ForgePanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  var _rpgState$lifeSkills21;
  /* v2.3.1235: state-correction §10 — scroll-fade plumbing (pattern:
     InspectPlayerPanel ~128-139): the panel body scrolls internally and
     a sticky 24px bottom fade shows only while content remains below
     the fold, so the Hardening/Amulet/Salvage actions are never
     silently unreachable on short phones. Display-only state. */
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
  /* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) \u2014
     the color remap left the old dense layout behind.  Now: #202C32
     panel surface + icon header, segmented weapon-type tabs on a
     #121B20 track, 44px craft rows inside recessed wells with 11/600
     uppercase group headers, nested #182227 module cards, secondary
     #2B3940 row actions, destructive #7C3431 salvage.  Shared style
     fragments below are styles only \u2014 every handler (forge/harden/
     reforge/amulet/salvage sends + local predictions) is byte-identical. */
  /* v2.3.1235: batch-3 rollout — correction-pass compliance
     (docs/LANTERN-SLATE-SPEC.md + game.css :root). Presentation only,
     every handler byte-identical. v2.3.1232 tokens remapped onto the
     approved set (sheet #1E2E34, well #111E23, raised #293B41, card
     #24363C, text #F4F0E7/#B6C1BE/#8D9B98/#667875, lines
     rgba(229,237,233,.11/.20), brass #D8AA58 / gradient primary on
     #172126 ink, magic #9A78D0, stamina #DFAE4E); the nested #182227
     module CARDS become divider-separated flat sections (contract: one
     outer surface + one nested level max — their inner wells stay);
     salvage/shield sub-groups and stash rows drop per-row card fills
     for hairline dividers; ONE gold primary per surface (the Hardening
     attempt keeps it, Smelt demotes to secondary); salvage becomes a
     danger OUTLINE (filled red retired); chrome emoji dropped from
     headers/buttons/tabs (💠/🔨/📿/🛡️ row glyphs are item identity and
     stay); all row actions hit the 44px hitbox floor; locked rows lift
     to the .55 readability floor. */
  var LS_HEAD = {
    fontSize: 11,
    fontWeight: 700 /* v2.3.1235: batch-3 rollout — headers are 11/700 .14em muted */,
    textTransform: 'uppercase',
    letterSpacing: '.14em',
    color: '#8D9B98',
    marginBottom: 4
  };
  var LS_WELL = {
    background: '#111E23' /* v2.3.1235: batch-3 rollout — approved well token */,
    borderRadius: 10,
    padding: 4,
    boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)' /* v2.3.1235: shared .ui-well recipe */,
    marginBottom: 10
  };
  var LS_DIV = '1px solid rgba(229,237,233,.11)'; /* v2.3.1235: batch-3 rollout — hairline token */
  /* v2.3.1235: batch-3 rollout — the old nested #182227 card is now a
     flat divider-separated section (one outer surface + one nested
     level max); the name is kept so every consumer flips in one move. */
  var LS_CARD = {
    marginTop: 12,
    paddingTop: 10,
    borderTop: '1px solid rgba(229,237,233,.11)'
  };
  return React.createElement("div", {
    style: {
      margin: -20,
      /* v2.3.1235: state-correction §10 — flex-column root (fixed header
         row + internal overflow-y body below); the root padding moved
         onto header/body so the scroll region owns the full width. */
      background: '#1E2E34',
      borderRadius: 14,
      textAlign: 'left',
      fontFamily: "'Source Sans 3',sans-serif",
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
      /* v2.3.1235: state-correction §10 — header row is the fixed
         (flex:none) part; absorbs the old root 16/14 padding. */
      flex: 'none',
      padding: '16px 38px 0 14px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/bldg-forge.webp",
    alt: "",
    draggable: false,
    style: {
      width: 26,
      height: 26,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('\uD83D\uDD28'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F4F0E7'
    }
  }, "Blacksmith")), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: state-correction §10 — internal scroll body: everything
       below the header row scrolls; sticky bottom fade is its last child.
       Scrollbar hidden by .ls-scrollbody (game.css). */
    className: "ls-scrollbody",
    ref: scrollBodyRef,
    onScroll: measureFade,
    style: {
      overflowY: 'auto',
      touchAction: 'pan-y',
      flex: '1 1 auto',
      minHeight: 0,
      padding: '0 14px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
      marginBottom: 12
    }
  }, "Blacksmithing Lv", ((_rpgState$lifeSkills21 = rpgState.lifeSkills) === null || _rpgState$lifeSkills21 === void 0 || (_rpgState$lifeSkills21 = _rpgState$lifeSkills21.blacksmithing) === null || _rpgState$lifeSkills21 === void 0 ? void 0 : _rpgState$lifeSkills21.level) || 1, " \xB7 Forge melee weapons from ore. Higher levels unlock gem slots."), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: batch-3 rollout — well token + shared .ui-well recipe;
       tab-label emoji dropped (no emoji in tab chrome). */
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 10,
      padding: 2,
      borderRadius: 8,
      background: '#111E23',
      boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)'
    }
  }, [{
    type: 'greatsword',
    label: 'Greatsword',
    desc: 'Slow, heavy hitter'
  }, {
    type: 'sword',
    label: 'Sword',
    desc: 'Fast, status pressure'
  }, {
    type: 'shield',
    label: 'Shield',
    desc: 'Defensive gear'
  }].map(function (wt) {
    var _stateRef$current8, _stateRef$current9, _stateRef$current0;
    return /*#__PURE__*/React.createElement("button", {
      key: wt.type,
      /* v2.3.1232: active segment #2B3940 + 2px brass bottom edge */
      style: {
        flex: 1,
        minHeight: 44,
        padding: '4px 4px',
        border: 'none',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        /* v2.3.1235: batch-3 rollout — raised/brass/text tokens */
        background: (((_stateRef$current8 = stateRef.current) === null || _stateRef$current8 === void 0 ? void 0 : _stateRef$current8._bsType) || 'greatsword') === wt.type ? '#293B41' : 'transparent',
        boxShadow: (((_stateRef$current9 = stateRef.current) === null || _stateRef$current9 === void 0 ? void 0 : _stateRef$current9._bsType) || 'greatsword') === wt.type ? 'inset 0 -2px 0 #D8AA58' : 'none',
        color: (((_stateRef$current0 = stateRef.current) === null || _stateRef$current0 === void 0 ? void 0 : _stateRef$current0._bsType) || 'greatsword') === wt.type ? '#F4F0E7' : '#8D9B98'
      },
      onClick: function onClick() {
        stateRef.current._bsType = wt.type;
        setRpgState(_objectSpread({}, stateRef.current.rpg));
      }
    }, wt.label, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor */,
        fontWeight: 400,
        color: '#8D9B98'
      }
    }, wt.desc));
  })), /*#__PURE__*/React.createElement("div", {
    style: LS_HEAD
  }, "Forge Weapons"), /*#__PURE__*/React.createElement("div", {
    style: LS_WELL
  }, Object.entries(BLACKSMITH_TIERS).filter(function (_ref129) {
    var _rpgState$lifeSkills22;
    var _ref130 = _slicedToArray(_ref129, 2),
      key = _ref130[0],
      bt = _ref130[1];
    var bsLvl = ((_rpgState$lifeSkills22 = rpgState.lifeSkills) === null || _rpgState$lifeSkills22 === void 0 || (_rpgState$lifeSkills22 = _rpgState$lifeSkills22.blacksmithing) === null || _rpgState$lifeSkills22 === void 0 ? void 0 : _rpgState$lifeSkills22.level) || 1;
    /* Show tiers within 10 levels of player skill, plus next locked one */
    return bt.minLvl <= bsLvl + 10;
  }).map(function (_ref131, _fi) {
    var _rpgState$lifeSkills23, _rpgState$inventory, _stateRef$current1, _stateRef$current10, _stateRef$current12;
    var _ref132 = _slicedToArray(_ref131, 2),
      key = _ref132[0],
      bt = _ref132[1];
    var bsLvl = ((_rpgState$lifeSkills23 = rpgState.lifeSkills) === null || _rpgState$lifeSkills23 === void 0 || (_rpgState$lifeSkills23 = _rpgState$lifeSkills23.blacksmithing) === null || _rpgState$lifeSkills23 === void 0 ? void 0 : _rpgState$lifeSkills23.level) || 1;
    var canForgeSkill = bsLvl >= bt.minLvl;
    var oreKey = (bt.wood ? 'wood_' + bt.wood : 'ore_' + bt.oreName + '_ore');
    var hasOre = (((_rpgState$inventory = rpgState.inventory) === null || _rpgState$inventory === void 0 ? void 0 : _rpgState$inventory[oreKey]) || 0) >= bt.oreCost;
    var hasGold = rpgState.coins >= bt.goldCost;
    var bsMelee = ((_stateRef$current1 = stateRef.current) === null || _stateRef$current1 === void 0 ? void 0 : _stateRef$current1._bsType) || 'greatsword';
    var gearType = bsMelee === 'shield' ? 'shield' : bsMelee;
    var fullIdx = Object.keys(BLACKSMITH_TIERS).indexOf(key);
    /* v2.3.1661 (prog3): rpg passed — under the rebuild the gate is the
       trained skill at tierIndex × 5 (met carried on the req). */
    var statReq = getGearStatReq(gearType, fullIdx, rpgState);
    var meetsStat = statReq.value === 0 || (statReq.prog3 ? statReq.met : (rpgState[statReq.stat] || 0) >= statReq.value);
    var canForge = canForgeSkill && meetsStat;
    var bsType = ((_stateRef$current10 = stateRef.current) === null || _stateRef$current10 === void 0 ? void 0 : _stateRef$current10._bsType) || 'greatsword';
    var reqStat = EQUIP_STAT_MAP[bsType] || 'power';
    var playerStat = rpgState[reqStat] || 0;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      /* v2.3.1232: 44px well row, hairline divider between rows */
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        padding: '6px 8px',
        borderTop: _fi > 0 ? LS_DIV : 'none'
        /* v2.3.1235: state-correction — whole-row opacity dimming removed;
           locked state is carried by text tokens + ls-lock glyph instead. */
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18
      }
    }, bt.slots > 0 ? '💠' : '🔨'),/*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        /* v2.3.1235: state-correction — locked titles use #B6C1BE (state 3);
           missing-materials rows keep full title brightness (state 2). */
        color: canForge && meetsStat ? '#F4F0E7' : '#B6C1BE'
      }
    }, bt.label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, "Lv", bt.minLvl, "+ \xB7 ", bt.tierMult, "\xD7")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, bt.desc, " ", bt.slots > 0 ? "\xB7 ".concat(bt.slots, " gem slot").concat(bt.slots > 1 ? 's' : '') : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, /* v2.3.1235: state-correction — state-2 rows show live have/need
          counts from the same inventory/coin reads the disable logic uses
          (met = positive green, short = danger); state-3 rows keep the
          static cost and carry the requirement next to an ls-lock glyph. */
    (canForge && meetsStat) && /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: hasOre ? '#55B98A' : '#D8635D'
      }
    }, bt.oreName.charAt(0).toUpperCase() + bt.oreName.slice(1), " ", ((rpgState.inventory || {})[oreKey] || 0), "/", bt.oreCost), " \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: hasGold ? '#55B98A' : '#D8635D'
      }
    }, "Gold ", rpgState.coins || 0, "/", bt.goldCost)), !(canForge && meetsStat) && /*#__PURE__*/React.createElement("span", null, bt.oreCost, "\xD7 ", bt.oreName, " ore + ", bt.goldCost, "g \xB7 ", /*#__PURE__*/React.createElement("span", {
      className: "ls-lock",
      style: {
        marginRight: 3
      }
    }), !canForgeSkill ? "Blacksmith Lv".concat(bt.minLvl).concat(statReq.value > 0 ? " \xB7 " + statReq.label + " " + statReq.value : "") : "".concat(statReq.label, " ").concat(statReq.value)), statReq.value > 0 && /*#__PURE__*/React.createElement("span", {
      /* v2.3.1661 (prog3): the requirement line reads the SAME req
         object as the gate — Melee/Bow/Magic level (or the legacy
         stat) instead of re-deriving from bt.statReq. */
      style: {
        /* v2.3.1235: batch-3 rollout — positive/danger tokens */
        color: meetsStat ? '#55B98A' : '#D8635D'
      }
    }, " \xB7 ", statReq.value, " ", statReq.label, " ", meetsStat ? '✓' : '✗'))), /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: state-correction — disabled recipe is #1A292F fill +
         #8D9B98 label + .11 hairline at full opacity (was #24363C/#667875);
         real disabled prop added around the untouched handler. */
      disabled: !(canForge && hasOre && hasGold && meetsStat),
      style: {
        minHeight: 44,
        padding: '0 12px',
        borderRadius: 10,
        border: canForge && hasOre && hasGold && meetsStat ? '1px solid rgba(229,237,233,.20)' : '1px solid rgba(229,237,233,.11)',
        fontSize: 12,
        fontWeight: 700,
        background: canForge && hasOre && hasGold && meetsStat ? '#293B41' : '#1A292F',
        color: canForge && hasOre && hasGold && meetsStat ? '#F4F0E7' : '#8D9B98',
        opacity: 1,
        cursor: canForge && hasOre && hasGold && meetsStat ? 'pointer' : 'default',
        fontFamily: 'inherit',
        flexShrink: 0
      },
      onClick: function onClick() {
        if (!canForge || !hasOre || !hasGold || !meetsStat) return;
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        var bsMelee = stateRef.current._bsType || 'greatsword';
        /* Server-authoritative forge in MP: worker mirrors
           BLACKSMITH_TIERS, validates skill + stat + ore + coins,
           consumes + mints + swaps to stash + applies XP.  Local
           mutation stays as snappy visual prediction; player_state
           arrives with authoritative weapon + stash + coins + inv. */
        {
          var _Sfw = stateRef.current;
          /* v2.3.2077: `_serverMonsters` is FALSE in town -- it means "this
             zone has server-managed monsters", and wsClient sets it false on
             an empty monster list ("town, or a dungeon the server doesn't
             model", its own words). This send therefore never happened in
             town. Third instance of this exact flag doing it: v2.3.1702
             (ability_use), v2.3.2063 (shop_purchase). Presence on the channel
             is the only precondition.
             AND THE FORGE STANDS IN TOWN, so forging has never reached the
             worker at all: the client spent the ore and the coins and minted
             the weapon locally, and the server's blob -- which owns all
             three -- reconciled every bit of it away. */
          if (_Sfw.channel) {
            try { _Sfw.channel.send({ type: 'forge_weapon', payload: { weaponType: bsMelee, tierKey: key, isWoodwork: false } }); } catch (e) {}
          }
        }
        R.inventory[oreKey] = (R.inventory[oreKey] || 0) - bt.oreCost;
        if (R.inventory[oreKey] <= 0) delete R.inventory[oreKey];
        R.coins -= bt.goldCost;
        var wpnKey = 'weapon';
        var wpnType = bsMelee;
        if (R[wpnKey] && R[wpnKey].name) {
          if (!R.weaponStash) R.weaponStash = [];
          /* v2.3.2123: the old weapon has to have somewhere to GO.  This push
             was guarded and the assignment below it was not, so at eight
             weapons the one being replaced was dropped on the floor -- and the
             worker refuses this forge outright at the cap
             (gear.js _handleForgeWeapon), so the client was destroying an item
             to complete an action that was never going to happen.  See
             mp-weaponloss, and Alix's "just lost my magic stick". */
          if (R.weaponStash.length >= WEAPON_STASH_MAX) return;
          R.weaponStash.push(_objectSpread({}, R[wpnKey]));
        }
        R[wpnKey] = {
          type: wpnType,
          tier: 'common',
          tierMult: bt.tierMult,
          element1: null,
          element2: null,
          isVolatile: false,
          name: bt.label + ' ' + WEAPON_TYPES[wpnType].label,
          gearBase: key,
          reforgeBonus: null,
          hardenBonus: null
        };
        var leveled = addLifeSkillXp(R.lifeSkills, 'blacksmithing', bt.minLvl * 5);
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.forgedWeapon = true;
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Forged ' + bt.label + ' ' + WEAPON_TYPES[wpnType].label + '!', '#b0b0b0');
        if (bt.slots > 0) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 42, bt.slots + ' gem slot' + (bt.slots > 1 ? 's' : '') + ' ready!', '#a855f7');
        if (leveled) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 54, 'Blacksmithing Lv' + R.lifeSkills.blacksmithing.level + '!', '#D8A94D');
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, /* v2.3.1235: state-correction — action label states: locked rows say
          "Locked"; missing-materials rows name the binding shortage from the
          same reads the guard uses; only state 1 keeps the Forge label. */
    !(canForge && meetsStat) ? "Locked" : !hasOre ? "Need ".concat(bt.oreCost - ((rpgState.inventory || {})[oreKey] || 0), " ").concat(bt.oreName) : !hasGold ? "Need ".concat(bt.goldCost - (rpgState.coins || 0), "G more") : /*#__PURE__*/React.createElement("span", null, "Forge (", ((_stateRef$current12 = stateRef.current) === null || _stateRef$current12 === void 0 ? void 0 : _stateRef$current12._bsType) === 'sword' ? 'Sword' : 'Greatsword', ")")));
  })), function () {
    /* v2.3.1131: SS4.6c HARDENING -- the server-rolled H0->H5 ladder
       (harden_weapon -> hardening.js).  DISTINCT from the legacy
       "Harden" affix button below (weapon.hardenBonus): this one is
       the numeric damage layer (weapon.hardness), gold-only cost,
       odds fixed by ladder rung (skill gates ACCESS, never odds).
       Result popups arrive via harden_result (gameEvents.js); the
       weapon state itself rides the authoritative player_state echo. */
    var _Sh = stateRef.current;
    if (!(_Sh._serverCaps && _Sh._serverCaps.harden && _Sh.channel)) return null;
    var hw = rpgState.weapon;
    if (!hw) return null;
    var hLvl = typeof hw.hardness === 'number' ? hw.hardness : 0;
    var hMaxed = hLvl >= 5;
    var hOdds = [80, 20, 5, 1, 0.5][Math.min(hLvl, 4)];
    var hCost = 500 * Math.pow(4, hLvl);
    var hTemper = hw.temper || 0;
    var hAfford = (rpgState.coins || 0) >= hCost;
    /* v2.3.1235: batch-3 rollout \u2014 flat divider-separated section (was a
       nested card; one nested level max); the attempt button is THE gold
       primary of this surface (gradient recipe on #172126 ink); chrome
       emoji dropped from the item line. */
    return /*#__PURE__*/React.createElement("div", {
      style: LS_CARD
    }, /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: '#8D9B98', marginBottom: 4 }
    }, "Hardening"), /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 13, fontWeight: 600, color: '#F4F0E7', marginBottom: 2 }
    }, hw.name, " \u2014 H", hLvl, "/5"), /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 11, color: '#8D9B98', marginBottom: 8 }
    }, hMaxed ? 'Maximum hardness reached!' : "+1.04 base dmg per level \xB7 Success " + hOdds + "% \xB7 Fail resets hardness (Temper " + hTemper + " softens it)"), !hMaxed && /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: state-correction — real disabled prop + approved
         disabled recipe (#1A292F fill, #8D9B98 label, .11 hairline, full
         opacity) when coins are short; handler untouched. */
      disabled: !hAfford,
      style: {
        width: '100%', minHeight: 44, padding: '0 12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
        border: hAfford ? '1px solid #EAC675' : '1px solid rgba(229,237,233,.11)',
        background: hAfford ? 'linear-gradient(180deg,#E2B765,#D2A14D)' : '#1A292F',
        color: hAfford ? '#172126' : '#8D9B98',
        opacity: 1,
        cursor: hAfford ? 'pointer' : 'not-allowed',
        fontFamily: 'inherit'
      },
      onClick: function onClick() {
        if (!hAfford) return;
        try { _Sh.channel.send({ type: 'broadcast', event: 'harden_weapon', payload: { slot: 'weapon' } }); } catch (e) {}
      }
    }, /* v2.3.1235: state-correction — short-coins label states the gold
          deficit (fee - coins, same values the hAfford guard reads)
          instead of an enabled-looking attempt label. */
    hAfford ? /*#__PURE__*/React.createElement("span", null, "Attempt H", hLvl + 1, " (", hCost, "G \xB7 ", hOdds, "%)") : "Need ".concat(hCost - (rpgState.coins || 0), "G more")));
  }(), function (_rpgState$lifeSkills24) {
    var wpn = rpgState.weapon;
    if (!(wpn !== null && wpn !== void 0 && wpn.gearBase)) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#8D9B98',
        fontStyle: 'italic',
        marginTop: 8
      }
    }, "Forge a weapon first to unlock Reforge & Harden.");
    var bt = BLACKSMITH_TIERS[wpn.gearBase];
    if (!bt) return null;
    var reforgeCost = Math.ceil(bt.oreCost * 0.5);
    var reforgeOreKey = (bt.wood ? 'wood_' + bt.wood : 'ore_' + bt.oreName + '_ore');
    var reforgeGold = Math.ceil(bt.goldCost * 0.3);
    var hardenCost = bt.oreCost;
    var hardenGold = Math.ceil(bt.goldCost * 0.5);
    var hChance = hardenChance(bt.tierMult, ((_rpgState$lifeSkills24 = rpgState.lifeSkills) === null || _rpgState$lifeSkills24 === void 0 || (_rpgState$lifeSkills24 = _rpgState$lifeSkills24.blacksmithing) === null || _rpgState$lifeSkills24 === void 0 ? void 0 : _rpgState$lifeSkills24.level) || 1);
    return /*#__PURE__*/React.createElement("div", {
      /* v2.3.1235: batch-3 rollout \u2014 flat divider-separated section (was
         a nested card); header 11/700 .14em; chrome emoji dropped. */
      style: LS_CARD
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        color: '#8D9B98',
        marginBottom: 4
      }
    }, "Reforge & Harden"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: '#F4F0E7',
        marginBottom: 2
      }
    }, wpn.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        marginBottom: 8
      }
    }, "Current: ", wpn.reforgeBonus ? "".concat(wpn.reforgeBonus.label, " +").concat(wpn.reforgeBonus.value).concat(wpn.reforgeBonus.unit) : 'No bonus', wpn.hardenBonus ? " \xB7 ".concat(wpn.hardenBonus.label, " +").concat(wpn.hardenBonus.value).concat(wpn.hardenBonus.unit) : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: batch-3 rollout — 44px hitbox floor; secondary =
         raised + strong hairline; button-label emoji dropped. */
      style: {
        flex: 1,
        minHeight: 44,
        padding: '0 6px',
        borderRadius: 10,
        border: '1px solid rgba(229,237,233,.20)',
        background: '#293B41',
        color: '#F4F0E7',
        fontSize: 11.5,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeOreKey] || 0) < reforgeCost || R.coins < reforgeGold) {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Need ' + reforgeCost + 'x ore + ' + reforgeGold + 'g', '#D95C54');
          return;
        }
        R.inventory[reforgeOreKey] -= reforgeCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= reforgeGold;
        var bonus = rollReforgeBonus(bt.tierMult);
        R.weapon.reforgeBonus = bonus;
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', Math.ceil(bt.minLvl * 2));
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Reforged! ' + bonus.label + ' +' + bonus.value + bonus.unit, '#a78bfa');
        BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
        setTimeout(function () {
          return BT_AUDIO.beep(800, 0.06, 0.08, 'sine');
        }, 80);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Reforge (", reforgeCost, " ore + ", reforgeGold, "g)"), /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: batch-3 rollout \u2014 44px hitbox floor; muted-once-
         hardened = quiet card fill; button-label emoji dropped. */
      style: {
        flex: 1,
        minHeight: 44,
        padding: '0 6px',
        borderRadius: 10,
        border: wpn.hardenBonus ? '1px solid rgba(229,237,233,.11)' : '1px solid rgba(229,237,233,.20)',
        background: wpn.hardenBonus ? '#24363C' : '#293B41',
        color: wpn.hardenBonus ? '#667875' : '#F4F0E7',
        fontSize: 11.5,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (R.weapon.hardenBonus) {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Already hardened!', '#D95C54');
          return;
        }
        if (!R.weapon.reforgeBonus) {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Reforge first!', '#D95C54');
          return;
        }
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeOreKey] || 0) < hardenCost || R.coins < hardenGold) {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Need ' + hardenCost + 'x ore + ' + hardenGold + 'g', '#D95C54');
          return;
        }
        R.inventory[reforgeOreKey] -= hardenCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= hardenGold;
        if (Math.random() < hChance) {
          /* SUCCESS — add second bonus */
          var bonus = rollReforgeBonus(bt.tierMult);
          /* Ensure different from first */
          if (bonus.id === R.weapon.reforgeBonus.id) bonus.id = REFORGE_BONUSES[(REFORGE_BONUSES.findIndex(function (b) {
            return b.id === bonus.id;
          }) + 1) % REFORGE_BONUSES.length].id;
          R.weapon.hardenBonus = bonus;
          addLifeSkillXp(R.lifeSkills, 'blacksmithing', Math.ceil(bt.minLvl * 4));
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'HARDENED! +' + bonus.label + ' +' + bonus.value + bonus.unit, '#D8A94D');
          stateRef.current.screenShake = 4;
          BT_AUDIO.collect();
          setTimeout(function () {
            return BT_AUDIO.beep(784, 0.1, 0.08, 'sine');
          }, 100);
        } else {
          /* FAILED — weapon breaks, reset to base */
          var oldName = R.weapon.name;
          R.weapon.reforgeBonus = null;
          R.weapon.hardenBonus = null;
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'BROKE! ' + oldName + ' lost all bonuses', '#D95C54');
          stateRef.current.screenShake = 6;
          BT_AUDIO.beep(120, 0.15, 0.2, 'sawtooth');
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Harden (", Math.round(hChance * 100), "% \xB7 ", hardenCost, " ore + ", hardenGold, "g)")));
  }(), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: nested module card */
    style: LS_CARD
  }, /*#__PURE__*/React.createElement("div", {
    style: LS_HEAD
    /* v2.3.1235: batch-3 rollout \u2014 header emoji dropped (chrome) */
  }, "Amulet Crafting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#B6C1BE',
      fontVariantNumeric: 'tabular-nums',
      marginBottom: 6
    }
  }, "Gold Nuggets: ", rpgState.goldNuggets || 0, " \xB7 Gold Bars: ", rpgState.goldBars || 0, (rpgState.goldNuggets || 0) >= NUGGETS_PER_BAR && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#DFAE4E' /* v2.3.1235: batch-3 rollout — stamina-gold token */
    }
  }, " \xB7 Can smelt!")), /*#__PURE__*/React.createElement("button", {
    /* v2.3.1235: batch-3 rollout — demoted from gold to SECONDARY: one
       primary per surface, and the Hardening attempt above holds it;
       button-label emoji dropped; 44px hitbox floor. */
    style: {
      width: '100%',
      minHeight: 44,
      padding: '0 12px',
      borderRadius: 10,
      marginBottom: 8,
      border: (rpgState.goldNuggets || 0) >= NUGGETS_PER_BAR ? '1px solid rgba(229,237,233,.20)' : '1px solid rgba(229,237,233,.11)',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'inherit',
      background: (rpgState.goldNuggets || 0) >= NUGGETS_PER_BAR ? '#293B41' : '#24363C',
      color: (rpgState.goldNuggets || 0) >= NUGGETS_PER_BAR ? '#F4F0E7' : '#667875'
    },
    onClick: function onClick() {
      var R = stateRef.current.rpg;
      if ((R.goldNuggets || 0) < NUGGETS_PER_BAR) return;
      /* v2.3.1192: server-authoritative amulet forge -- the worker owns
         the nugget/bar ledger under caps.amuletForge (server/src/
         amulet.js); this send is the real mutation and the local
         -=/+= below stays as prediction (the player_state echo
         overwrites, rule-20 style).  Old workers without the cap keep
         the legacy local-only path. */
      {
        var _Sas = stateRef.current;
        if (_Sas._serverCaps && _Sas._serverCaps.amuletForge && _Sas.channel) {
          try { _Sas.channel.send({ type: 'amulet_forge_request', payload: { op: 'smelt' } }); } catch (e) {}
        }
      }
      R.goldNuggets -= NUGGETS_PER_BAR;
      R.goldBars = (R.goldBars || 0) + 1;
      pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Smelted Gold Bar!', '#D8A94D');
      BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
      setTimeout(function () {
        return BT_AUDIO.beep(800, 0.06, 0.08, 'sine');
      }, 100);
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
    }
  }, "Smelt ", NUGGETS_PER_BAR, " Nuggets \u2192 1 Gold Bar"), /*#__PURE__*/React.createElement("div", {
    style: _objectSpread(_objectSpread({}, LS_WELL), {}, {
      marginBottom: 0
    })
  }, Object.entries(AMULET_TIERS).map(function (_ref133, _ai) {
    var _rpgState$lifeSkills25;
    var _ref134 = _slicedToArray(_ref133, 2),
      key = _ref134[0],
      at = _ref134[1];
    var bsLvl = ((_rpgState$lifeSkills25 = rpgState.lifeSkills) === null || _rpgState$lifeSkills25 === void 0 || (_rpgState$lifeSkills25 = _rpgState$lifeSkills25.blacksmithing) === null || _rpgState$lifeSkills25 === void 0 ? void 0 : _rpgState$lifeSkills25.level) || 1;
    var canCraft = bsLvl >= at.minLvl;
    var hasBars = (rpgState.goldBars || 0) >= at.bars;
    var hasGold = rpgState.coins >= at.goldCost;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      /* v2.3.1232: 44px well row, hairline divider between rows */
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        padding: '6px 8px',
        borderTop: _ai > 0 ? LS_DIV : 'none'
        /* v2.3.1235: state-correction — whole-row opacity dimming removed;
           locked state is carried by text tokens + ls-lock glyph instead. */
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18
      }
    }, "\uD83D\uDCFF"),/*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        /* v2.3.1235: state-correction — locked titles #B6C1BE (state 3);
           missing-materials rows keep full title brightness (state 2). */
        color: canCraft ? '#F4F0E7' : '#B6C1BE'
      }
    }, at.label, " Amulet ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, "Lv", at.minLvl, "+ \xB7 ", at.basePower, "\xD7 gem power")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, at.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, /* v2.3.1235: state-correction — state-2 rows show live have/need
          counts from the same goldBars/coin reads the disable logic uses;
          state-3 rows keep the static cost + ls-lock glyph + requirement. */
    canCraft && /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: hasBars ? '#55B98A' : '#D8635D'
      }
    }, "Bars ", rpgState.goldBars || 0, "/", at.bars), " \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: hasGold ? '#55B98A' : '#D8635D'
      }
    }, "Gold ", rpgState.coins || 0, "/", at.goldCost)), !canCraft && /*#__PURE__*/React.createElement("span", null, at.bars, " bar", at.bars > 1 ? 's' : '', " + ", at.goldCost, "g \xB7 ", /*#__PURE__*/React.createElement("span", {
      className: "ls-lock",
      style: {
        marginRight: 3
      }
    }), "Blacksmith Lv".concat(at.minLvl)))), /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: state-correction — disabled recipe is #1A292F fill +
         #8D9B98 label + .11 hairline at full opacity (was #24363C/#667875);
         real disabled prop added around the untouched handler. */
      disabled: !(canCraft && hasBars && hasGold),
      style: {
        minHeight: 44,
        padding: '0 14px',
        borderRadius: 10,
        border: canCraft && hasBars && hasGold ? '1px solid rgba(229,237,233,.20)' : '1px solid rgba(229,237,233,.11)',
        fontSize: 12,
        fontWeight: 700,
        background: canCraft && hasBars && hasGold ? '#293B41' : '#1A292F',
        color: canCraft && hasBars && hasGold ? '#F4F0E7' : '#8D9B98',
        opacity: 1,
        cursor: canCraft && hasBars && hasGold ? 'pointer' : 'default',
        fontFamily: 'inherit',
        flexShrink: 0
      },
      onClick: function onClick() {
        if (!canCraft || !hasBars || !hasGold) return;
        var R = stateRef.current.rpg;
        /* v2.3.1192: server-authoritative amulet craft (mirrors the
           forge_weapon shape above) -- the worker re-validates
           blacksmithing level + bars + gold from ITS OWN state,
           consumes, and mints ps.amulet (server/src/amulet.js).  The
           local mutation below stays as snappy prediction; the
           player_state echo carries the authoritative amulet + coins
           + goldBars.  Old workers without caps.amuletForge keep the
           legacy local-only craft. */
        {
          var _Sac = stateRef.current;
          if (_Sac._serverCaps && _Sac._serverCaps.amuletForge && _Sac.channel) {
            try { _Sac.channel.send({ type: 'amulet_forge_request', payload: { op: 'craft', tierKey: key } }); } catch (e) {}
          }
        }
        R.goldBars -= at.bars;
        R.coins -= at.goldCost;
        R.amulet = {
          tier: key,
          gem: null,
          name: at.label + ' Gold Amulet'
        };
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', at.minLvl * 3);
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Crafted ' + at.label + ' Amulet!', '#D8A94D');
        BT_AUDIO.collect();
        setTimeout(function () {
          return BT_AUDIO.beep(784, 0.1, 0.08, 'sine');
        }, 100);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, /* v2.3.1235: state-correction — action label states: "Locked" for
          skill locks, the binding shortage for missing materials. */
    !canCraft ? "Locked" : !hasBars ? "Need ".concat(at.bars - (rpgState.goldBars || 0), " bar").concat(at.bars - (rpgState.goldBars || 0) > 1 ? 's' : '') : !hasGold ? "Need ".concat(at.goldCost - (rpgState.coins || 0), "G more") : "Craft"));
  }))), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: nested module card */
    style: LS_CARD
  }, /*#__PURE__*/React.createElement("div", {
    style: LS_HEAD
    /* v2.3.1235: batch-3 rollout \u2014 header emoji dropped (chrome) */
  }, "Shield Crafting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
      marginBottom: 6
    }
  }, "Forge a shield from ore. Same tiers as melee weapons. Slot a gem at the Enchanter for defensive bonuses.", rpgState.shield && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#D8AA58' /* v2.3.1235: batch-3 rollout — brass token */
    }
  }, " \xB7 Equipped: ", rpgState.shield.name)), /*#__PURE__*/React.createElement("div", {
    style: _objectSpread(_objectSpread({}, LS_WELL), {}, {
      marginBottom: 0
    })
  }, Object.entries(BLACKSMITH_TIERS).filter(function (_ref135) {
    var _rpgState$lifeSkills26;
    var _ref136 = _slicedToArray(_ref135, 2),
      key = _ref136[0],
      bt = _ref136[1];
    var bsLvl = ((_rpgState$lifeSkills26 = rpgState.lifeSkills) === null || _rpgState$lifeSkills26 === void 0 || (_rpgState$lifeSkills26 = _rpgState$lifeSkills26.blacksmithing) === null || _rpgState$lifeSkills26 === void 0 ? void 0 : _rpgState$lifeSkills26.level) || 1;
    return bt.minLvl <= bsLvl + 10;
  }).slice(0, 8).map(function (_ref137, _fi2) {
    var _rpgState$lifeSkills27, _rpgState$inventory2;
    var _ref138 = _slicedToArray(_ref137, 2),
      key = _ref138[0],
      bt = _ref138[1];
    var bsLvl = ((_rpgState$lifeSkills27 = rpgState.lifeSkills) === null || _rpgState$lifeSkills27 === void 0 || (_rpgState$lifeSkills27 = _rpgState$lifeSkills27.blacksmithing) === null || _rpgState$lifeSkills27 === void 0 ? void 0 : _rpgState$lifeSkills27.level) || 1;
    var canForge = bsLvl >= bt.minLvl;
    var oreKey = (bt.wood ? 'wood_' + bt.wood : 'ore_' + bt.oreName + '_ore');
    var hasOre = (((_rpgState$inventory2 = rpgState.inventory) === null || _rpgState$inventory2 === void 0 ? void 0 : _rpgState$inventory2[oreKey]) || 0) >= bt.oreCost;
    var hasGold = rpgState.coins >= bt.goldCost;
    /* v2.3.1661 (prog3): shields gate on DEFENSE POINTS under the
       rebuild (armor-class gear, §6); the req object carries both
       worlds so the strings below stay honest. */
    var shReq = getGearStatReq('shield', Object.keys(BLACKSMITH_TIERS).indexOf(key), rpgState);
    var shieldStatVal = shReq.prog3 ? (shReq.have || 0) : rpgState[SHIELD_EQUIP_STAT] || 0;
    var shieldMeetsStat = shReq.value === 0 || (shReq.prog3 ? shReq.met : shieldStatVal >= bt.statReq);
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      /* v2.3.1232: 44px well row, hairline divider between rows */
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        padding: '6px 8px',
        borderTop: _fi2 > 0 ? LS_DIV : 'none'
        /* v2.3.1235: state-correction — whole-row opacity dimming removed;
           locked state is carried by text tokens + ls-lock glyph instead. */
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18
      }
    }, "\uD83D\uDEE1\uFE0F"),/*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        /* v2.3.1235: state-correction — locked titles #B6C1BE (state 3);
           missing-materials rows keep full title brightness (state 2). */
        color: canForge && shieldMeetsStat ? '#F4F0E7' : '#B6C1BE'
      }
    }, bt.label, " Shield ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, "Lv", bt.minLvl, "+ \xB7 ", bt.tierMult, "\xD7")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, /* v2.3.1235: state-correction — state-2 rows show live have/need
          counts from the same inventory/coin reads the disable logic uses
          (met = positive green, short = danger); state-3 rows keep the
          static cost and carry the requirement next to an ls-lock glyph. */
    (canForge && shieldMeetsStat) && /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: hasOre ? '#55B98A' : '#D8635D'
      }
    }, bt.oreName.charAt(0).toUpperCase() + bt.oreName.slice(1), " ", ((rpgState.inventory || {})[oreKey] || 0), "/", bt.oreCost), " \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: hasGold ? '#55B98A' : '#D8635D'
      }
    }, "Gold ", rpgState.coins || 0, "/", bt.goldCost), bt.statReq > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        /* v2.3.1235: batch-3 rollout — muted/danger tokens */
        color: shieldMeetsStat ? '#8D9B98' : '#D8635D'
      }
    }, " \xB7 ", shReq.label, " ", shReq.value, shieldMeetsStat ? '✓' : '')), !(canForge && shieldMeetsStat) && /*#__PURE__*/React.createElement("span", null, bt.oreCost, "\xD7 ", bt.oreName, " ore + ", bt.goldCost, "g \xB7 ", /*#__PURE__*/React.createElement("span", {
      className: "ls-lock",
      style: {
        marginRight: 3
      }
    }), (!canForge ? "Blacksmith Lv" + bt.minLvl : "") + (!canForge && !shieldMeetsStat ? " \xB7 " : "") + (!shieldMeetsStat ? shReq.label + " " + shReq.value : "")))), /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: state-correction — disabled recipe is #1A292F fill +
         #8D9B98 label + .11 hairline at full opacity (was #24363C/#667875);
         real disabled prop added around the untouched handler. */
      disabled: !(canForge && hasOre && hasGold && shieldMeetsStat),
      style: {
        minHeight: 44,
        padding: '0 14px',
        borderRadius: 10,
        border: canForge && hasOre && hasGold && shieldMeetsStat ? '1px solid rgba(229,237,233,.20)' : '1px solid rgba(229,237,233,.11)',
        fontSize: 12,
        fontWeight: 700,
        background: canForge && hasOre && hasGold && shieldMeetsStat ? '#293B41' : '#1A292F',
        color: canForge && hasOre && hasGold && shieldMeetsStat ? '#F4F0E7' : '#8D9B98',
        opacity: 1,
        cursor: canForge && hasOre && hasGold && shieldMeetsStat ? 'pointer' : 'default',
        fontFamily: 'inherit',
        flexShrink: 0
      },
      onClick: function onClick() {
        if (!canForge || !hasOre || !hasGold || !shieldMeetsStat) return;
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        R.inventory[oreKey] = (R.inventory[oreKey] || 0) - bt.oreCost;
        if (R.inventory[oreKey] <= 0) delete R.inventory[oreKey];
        R.coins -= bt.goldCost;
        R.shield = {
          gearBase: key,
          gem: null,
          name: bt.label + ' Shield',
          reforgeBonus: null,
          hardenBonus: null
        };
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', bt.minLvl * 3);
        recalcDerived(R);
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Forged ' + bt.label + ' Shield!', '#D8A85F');
        BT_AUDIO.collect();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, /* v2.3.1235: state-correction — action label states: "Locked" for
          level/stat locks, the binding shortage for missing materials. */
    !(canForge && shieldMeetsStat) ? "Locked" : !hasOre ? "Need ".concat(bt.oreCost - ((rpgState.inventory || {})[oreKey] || 0), " ").concat(bt.oreName) : !hasGold ? "Need ".concat(bt.goldCost - (rpgState.coins || 0), "G more") : "Forge"));
  })), function (_rpgState$lifeSkills28) {
    var sh = rpgState.shield;
    if (!(sh !== null && sh !== void 0 && sh.gearBase)) return null;
    var bt = BLACKSMITH_TIERS[sh.gearBase];
    if (!bt) return null;
    var reforgeCost = Math.ceil(bt.oreCost * 0.5);
    var reforgeOreKey = (bt.wood ? 'wood_' + bt.wood : 'ore_' + bt.oreName + '_ore');
    var reforgeGold = Math.ceil(bt.goldCost * 0.3);
    var hardenCost = bt.oreCost;
    var hardenGold = Math.ceil(bt.goldCost * 0.5);
    var hChance = hardenChance(bt.tierMult, ((_rpgState$lifeSkills28 = rpgState.lifeSkills) === null || _rpgState$lifeSkills28 === void 0 || (_rpgState$lifeSkills28 = _rpgState$lifeSkills28.blacksmithing) === null || _rpgState$lifeSkills28 === void 0 ? void 0 : _rpgState$lifeSkills28.level) || 1);
    return /*#__PURE__*/React.createElement("div", {
      /* v2.3.1235: batch-3 rollout \u2014 the well-soft sub-card becomes a
         hairline-divided group (dividers over cards; well-soft retired);
         chrome emoji dropped from the item line. */
      style: {
        marginTop: 8,
        paddingTop: 8,
        borderTop: LS_DIV
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: '#F4F0E7',
        marginBottom: 2
      }
    }, sh.name),/*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        marginBottom: 3
      }
    }, sh.reforgeBonus ? "".concat(sh.reforgeBonus.label, " +").concat(sh.reforgeBonus.value).concat(sh.reforgeBonus.unit) : 'No bonus', sh.hardenBonus ? " \xB7 ".concat(sh.hardenBonus.label, " +").concat(sh.hardenBonus.value).concat(sh.hardenBonus.unit) : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: batch-3 rollout — 44px hitbox floor; secondary =
         raised + strong hairline; button-label emoji dropped. */
      style: {
        flex: 1,
        minHeight: 44,
        padding: '0 6px',
        borderRadius: 10,
        border: '1px solid rgba(229,237,233,.20)',
        background: '#293B41',
        color: '#F4F0E7',
        fontSize: 11.5,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeOreKey] || 0) < reforgeCost || R.coins < reforgeGold) {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Need materials', '#D95C54');
          return;
        }
        R.inventory[reforgeOreKey] -= reforgeCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= reforgeGold;
        R.shield.reforgeBonus = rollReforgeBonus(bt.tierMult);
        addLifeSkillXp(R.lifeSkills, 'blacksmithing', Math.ceil(bt.minLvl * 2));
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, R.shield.reforgeBonus.label + ' +' + R.shield.reforgeBonus.value + R.shield.reforgeBonus.unit, '#a78bfa');
        BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Reforge"), /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: batch-3 rollout \u2014 44px hitbox floor; muted-once-
         hardened = quiet card fill; button-label emoji dropped. */
      style: {
        flex: 1,
        minHeight: 44,
        padding: '0 6px',
        borderRadius: 10,
        border: sh.hardenBonus ? '1px solid rgba(229,237,233,.11)' : '1px solid rgba(229,237,233,.20)',
        background: sh.hardenBonus ? '#24363C' : '#293B41',
        color: sh.hardenBonus ? '#667875' : '#F4F0E7',
        fontSize: 11.5,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (R.shield.hardenBonus || !R.shield.reforgeBonus) return;
        if (!R.inventory) R.inventory = {};
        if ((R.inventory[reforgeOreKey] || 0) < hardenCost || R.coins < hardenGold) return;
        R.inventory[reforgeOreKey] -= hardenCost;
        if (R.inventory[reforgeOreKey] <= 0) delete R.inventory[reforgeOreKey];
        R.coins -= hardenGold;
        if (Math.random() < hChance) {
          var bonus = rollReforgeBonus(bt.tierMult);
          if (bonus.id === R.shield.reforgeBonus.id) bonus.id = REFORGE_BONUSES[(REFORGE_BONUSES.findIndex(function (b) {
            return b.id === bonus.id;
          }) + 1) % REFORGE_BONUSES.length].id;
          R.shield.hardenBonus = bonus;
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'HARDENED! +' + bonus.label, '#D8A94D');
          BT_AUDIO.collect();
        } else {
          R.shield.reforgeBonus = null;
          R.shield.hardenBonus = null;
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Shield bonuses lost!', '#D95C54');
          BT_AUDIO.beep(120, 0.15, 0.2, 'sawtooth');
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Harden (", Math.round(hChance * 100), "%)")));
  }()), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: nested module card */
    style: LS_CARD
  }, /*#__PURE__*/React.createElement("div", {
    style: LS_HEAD
    /* v2.3.1235: batch-3 rollout \u2014 header emoji dropped (chrome) */
  }, "Salvage Station"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
      marginBottom: 8
    }
  }, "Extract gems first, then salvage items for ~60% materials back. Reforge bonuses are lost."), [{
    label: 'Melee Weapon',
    key: 'weapon',
    item: rpgState.weapon,
    gemField: 'element1'
  }, {
    label: 'Ranged Weapon',
    key: 'rangedWeapon',
    item: rpgState.rangedWeapon,
    gemField: 'element1'
  }, {
    label: 'Staff',
    key: 'staffWeapon',
    item: rpgState.staffWeapon,
    gemField: 'element1'
  }, {
    label: 'Shield',
    key: 'shield',
    item: rpgState.shield,
    gemField: 'gem'
  }, {
    label: 'Amulet',
    key: 'amulet',
    item: rpgState.amulet,
    gemField: 'gem'
  }].filter(function (s) {
    return s.item && s.item.gearBase;
  }).map(function (s) {
    var hasGem = s.key === 'amulet' ? !!s.item.gem : s.key === 'shield' ? !!s.item.gem : !!(s.item.element1 || s.item.element2);
    var isAmulet = s.key === 'amulet';
    var salvReturns = isAmulet ? getAmuletSalvageReturns(s.item) : getSalvageReturns(s.item);
    var canSalvage = !hasGem && salvReturns;
    var extractCost = hasGem ? gemExtractCost(s.item) : 0;
    var canAffordExtract = rpgState.coins >= extractCost;
    return /*#__PURE__*/React.createElement("div", {
      key: s.key,
      /* v2.3.1235: batch-3 rollout — well-soft item cards become
         hairline-divided groups (dividers over cards). */
      style: {
        padding: '8px 0 6px',
        borderTop: LS_DIV
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: '#F4F0E7',
        marginBottom: 6
      }
    }, s.label, ": ", s.item.name || 'Unknown', hasGem && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 400,
        color: '#9A78D0' /* v2.3.1235: batch-3 rollout — magic token */
      }
    }, " \xB7 Has gem(s)")), hasGem && /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: batch-3 rollout — 44px hitbox floor; secondary with
         the approved magic-token label; button-label emoji dropped. */
      style: {
        width: '100%',
        minHeight: 44,
        padding: '0 10px',
        borderRadius: 10,
        marginBottom: 4,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        border: canAffordExtract ? '1px solid rgba(229,237,233,.20)' : '1px solid rgba(229,237,233,.11)',
        background: canAffordExtract ? '#293B41' : '#24363C',
        color: canAffordExtract ? '#9A78D0' : '#667875'
      },
      onClick: function onClick() {
        var _R$amulet, _R$shield;
        var R = stateRef.current.rpg;
        if (R.coins < extractCost) return;
        /* v2.3.1209: server-settled gem extraction under caps.gemExtract
           (server/src/amulet.js, op:'extract').  This send is the real
           mutation; the local strip below stays as prediction (the
           player_state echo overwrites, rule-20 style).  Old workers
           without the cap keep the legacy local-only path. */
        {
          var _Sex = stateRef.current;
          if (_Sex._serverCaps && _Sex._serverCaps.gemExtract && _Sex.channel) {
            try { _Sex.channel.send({ type: 'amulet_forge_request', payload: { op: 'extract', target: s.key } }); } catch (e) {}
          }
        }
        R.coins -= extractCost;
        if (!R.lifeSkills.gems) R.lifeSkills.gems = {};
        if (s.key === 'amulet' && (_R$amulet = R.amulet) !== null && _R$amulet !== void 0 && _R$amulet.gem) {
          var _AMULET_TIERS$R$amule2;
          var polKey = 'polished_' + R.amulet.gem;
          R.lifeSkills.gems[polKey] = (R.lifeSkills.gems[polKey] || 0) + 1;
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Extracted ' + R.amulet.gem + ' gem', '#a78bfa');
          R.amulet.gem = null;
          R.amulet.name = (((_AMULET_TIERS$R$amule2 = AMULET_TIERS[R.amulet.tier]) === null || _AMULET_TIERS$R$amule2 === void 0 ? void 0 : _AMULET_TIERS$R$amule2.label) || 'Simple') + ' Gold Amulet';
        } else if (s.key === 'shield' && (_R$shield = R.shield) !== null && _R$shield !== void 0 && _R$shield.gem) {
          var _polKey = 'polished_' + R.shield.gem;
          R.lifeSkills.gems[_polKey] = (R.lifeSkills.gems[_polKey] || 0) + 1;
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Extracted ' + R.shield.gem + ' gem', '#a78bfa');
          R.shield.gem = null;
          var bt = BLACKSMITH_TIERS[R.shield.gearBase];
          R.shield.name = ((bt === null || bt === void 0 ? void 0 : bt.label) || 'Basic') + ' Shield';
        } else if (R[s.key]) {
          var _wpn$gearBase2;
          /* Weapon — extract elements as polished gems */
          var wpn = R[s.key];
          if (wpn.element1) {
            var pk = 'polished_' + wpn.element1;
            R.lifeSkills.gems[pk] = (R.lifeSkills.gems[pk] || 0) + 1;
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Extracted ' + wpn.element1 + ' gem', '#a78bfa');
          }
          if (wpn.element2) {
            var _pk = 'polished_' + wpn.element2;
            R.lifeSkills.gems[_pk] = (R.lifeSkills.gems[_pk] || 0) + 1;
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 45, 'Extracted ' + wpn.element2 + ' gem', '#a78bfa');
          }
          wpn.element1 = null;
          wpn.element2 = null;
          wpn.isVolatile = false;
          wpn.tier = 'common';
          /* Rebuild name without elements */
          var isWW = (_wpn$gearBase2 = wpn.gearBase) === null || _wpn$gearBase2 === void 0 ? void 0 : _wpn$gearBase2.startsWith('ww_');
          var tk = isWW ? wpn.gearBase.slice(3) : wpn.gearBase;
          var tt = isWW ? WOODWORKING_TIERS[tk] : BLACKSMITH_TIERS[tk];
          wpn.name = ((tt === null || tt === void 0 ? void 0 : tt.label) || 'Basic') + ' ' + WEAPON_TYPES[wpn.type].label;
        }
        recalcDerived(R);
        BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Extract Gem (", extractCost, "g)"), canSalvage && /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: batch-3 rollout — danger is OUTLINE only (filled red
         retired); 44px hitbox floor; button-label emoji dropped. */
      style: {
        width: '100%',
        minHeight: 44,
        padding: '0 10px',
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        border: '1px solid #D8635D',
        background: 'transparent',
        color: '#D8635D'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        /* Apply salvage returns */
        salvReturns.forEach(function (ret) {
          if (ret.type === 'gold') R.coins += ret.qty;else if (ret.type === 'goldBars') R.goldBars = (R.goldBars || 0) + ret.qty;else R.inventory[ret.key] = (R.inventory[ret.key] || 0) + ret.qty;
        });
        var returnText = salvReturns.map(function (r) {
          return r.qty + '× ' + r.label;
        }).join(', ');
        /* Destroy the item */
        if (s.key === 'amulet') R.amulet = null;else if (s.key === 'shield') R.shield = null;else if (s.key === 'weapon') R.weapon = {
          type: 'greatsword',
          tier: 'common',
          tierMult: 1.0,
          element1: null,
          element2: null,
          name: 'Fists',
          isVolatile: false
        };else if (s.key === 'rangedWeapon') R.rangedWeapon = null;else if (s.key === 'staffWeapon') R.staffWeapon = null;
        recalcDerived(R);
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Salvaged! ' + returnText, '#D95C54');
        BT_AUDIO.beep(200, 0.1, 0.15, 'sawtooth');
        setTimeout(function () {
          return BT_AUDIO.beep(400, 0.06, 0.08, 'sine');
        }, 100);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Salvage \u2192 ", salvReturns.map(function (r) {
      return r.qty + '× ' + r.label;
    }).join(' + ')), !hasGem && !canSalvage && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        fontStyle: 'italic'
      }
    }, "Cannot salvage (no crafting base)"));
  }), (rpgState.weaponStash || []).filter(function (w) {
    return w.gearBase;
  }).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700 /* v2.3.1235: batch-3 rollout — 11/700 .14em muted headers */,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: '#8D9B98',
      marginBottom: 4
    }
  }, "Stashed weapons"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: batch-3 rollout — stash rows move off per-row cards
       into one recessed well with hairline dividers (contract:
       dividers over row cards); handlers untouched. */
    style: LS_WELL
  }, (rpgState.weaponStash || []).map(function (sw, si) {
    if (!sw.gearBase) return null;
    var hasGem = !!(sw.element1 || sw.element2);
    var salvReturns = !hasGem ? getSalvageReturns(sw) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: si,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minHeight: 44,
        padding: '4px 8px',
        borderTop: si > 0 ? LS_DIV : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 12,
        color: '#B6C1BE',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, sw.name), hasGem && /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: batch-3 rollout — 44px hitbox floor; secondary with
         the approved magic-token label; button-label emoji dropped. */
      style: {
        minHeight: 44,
        padding: '0 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        flexShrink: 0,
        border: '1px solid rgba(229,237,233,.20)',
        background: '#293B41',
        color: '#9A78D0'
      },
      onClick: function onClick() {
        var _sw$gearBase;
        var R = stateRef.current.rpg;
        var cost = gemExtractCost(sw);
        if (R.coins < cost) return;
        /* v2.3.1209: server-settled stash-weapon extraction under
           caps.gemExtract (op:'extract', target:'stash', stashIdx=si).
           The local strip below stays as prediction; old workers keep
           the legacy local-only path. */
        {
          var _Sst = stateRef.current;
          if (_Sst._serverCaps && _Sst._serverCaps.gemExtract && _Sst.channel) {
            try { _Sst.channel.send({ type: 'amulet_forge_request', payload: { op: 'extract', target: 'stash', stashIdx: si } }); } catch (e) {}
          }
        }
        R.coins -= cost;
        if (!R.lifeSkills.gems) R.lifeSkills.gems = {};
        if (sw.element1) {
          R.lifeSkills.gems['polished_' + sw.element1] = (R.lifeSkills.gems['polished_' + sw.element1] || 0) + 1;
        }
        if (sw.element2) {
          R.lifeSkills.gems['polished_' + sw.element2] = (R.lifeSkills.gems['polished_' + sw.element2] || 0) + 1;
        }
        sw.element1 = null;
        sw.element2 = null;
        sw.isVolatile = false;
        sw.tier = 'common';
        var isWW = (_sw$gearBase = sw.gearBase) === null || _sw$gearBase === void 0 ? void 0 : _sw$gearBase.startsWith('ww_');
        var tk = isWW ? sw.gearBase.slice(3) : sw.gearBase;
        var tt = isWW ? WOODWORKING_TIERS[tk] : BLACKSMITH_TIERS[tk];
        sw.name = ((tt === null || tt === void 0 ? void 0 : tt.label) || 'Basic') + ' ' + WEAPON_TYPES[sw.type].label;
        BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Extract (", gemExtractCost(sw), "g)"), salvReturns && /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: batch-3 rollout — danger OUTLINE (filled red
         retired); 44px hitbox floor. */
      style: {
        minHeight: 44,
        padding: '0 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        flexShrink: 0,
        border: '1px solid #D8635D',
        background: 'transparent',
        color: '#D8635D'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.inventory) R.inventory = {};
        salvReturns.forEach(function (ret) {
          if (ret.type === 'gold') R.coins += ret.qty;else if (ret.type === 'goldBars') R.goldBars = (R.goldBars || 0) + ret.qty;else R.inventory[ret.key] = (R.inventory[ret.key] || 0) + ret.qty;
        });
        R.weaponStash.splice(si, 1);
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Salvaged stash item', '#D95C54');
        BT_AUDIO.beep(200, 0.1, 0.12, 'sawtooth');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, "Salvage"), !hasGem && !salvReturns && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11 /* v2.3.1235: batch-3 rollout \u2014 11px text floor */,
        color: '#667875'
      }
    }, "No base"));
  })) /* v2.3.1235: batch-3 rollout \u2014 closes the stash list well */)), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: state-correction \u00a710 \u2014 sticky bottom fade (matches the
       #1E2E34 sheet behind it); visible only while more content exists
       below the fold, gone at scroll end via measureFade. */
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
