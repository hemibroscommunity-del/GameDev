import React from 'react';
import { AMULET_TIERS, BLACKSMITH_TIERS, BT_AUDIO, COLLISION_TABLE, ELEMENTS, MAX_PET_SLOTS, NUGGETS_PER_BAR, PET_LOOT_RADIUS, RARITY_TIERS, WEAPON_STASH_MAX, WEAPON_TYPES, calcDisplayDmgRange, calcDisplayDps, calcDisplayHeal, canEquipItem, discoveredCollisions, getAmuletBonus, getEquipReqLabel, getShieldBonus } from '@/data/index.js';
import { _objectSpread, _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === InventoryPanel — the showInventory modal === */
/* v2.3.883: extracted verbatim from the showInventory && rpgState JSX
   subtree in BroTown.jsx (the full inventory / equipment screen: equip
   and compare gear, weapon stash, amulet/shield slots, pet slots, item
   actions). Behavior-frozen UI decomposition; the
   `showInventory && rpgState &&` gate stays in BroTown. 6 props:
   rpgState, stateRef, setRpgState, setShowInventory, plus the two
   BroTown-local bindings the subtree reads — gearWorn (a useState
   value) and toggleGearSlot (a useCallback). All 18 data/helper imports
   verified real exports; spread/slice/spread-array babel helpers
   imported; the hoisted optional-chaining temp set declared locally. */
/* v2.3.1232: Lantern Slate restyle — panel surface override on the
   legacy navy card, 11/600 uppercase module headers, occupied slots get
   the radial mist over #243137 (empty = #19252A + .08 hairline),
   recessed #121B20 tray behind the pet grid, 44px stash action rows
   (Equip = the brass primary, Sell = raised secondary), gold values as
   gold.webp + tabular #D8A85F. Styles/structure only; every handler
   body is byte-identical. */
/* v2.3.1235: batch-2 rollout — correction-pass compliance: (1) all
   v2.3.1227 literals move onto the :root --ui-* tokens / approved bar
   + semantic colors; (2) decorative emoji leave the chrome (section
   headers, Equip label, eat-chip prefix — item/pet emoji stay, they
   ARE the game data); (3) the per-row brass Equip primaries demote to
   neutral secondaries — the locked contract allows at most ONE gold
   primary per surface and stash rows repeat; (4) the red/green worn-
   armor toggles and green eat chips become neutral secondaries
   (reversible actions are never colored fills); (5) the 6-10px
   metadata sizes lift to the 11px floor (12 for sentences); (6) eat
   chips + worn toggles reach the 44px hitbox floor; (7) inline
   maxHeight 80vh → 100% so the .bt-inspect wrapper's HUD/dashboard
   clearance always wins. Styles + static JSX only; every handler body
   is byte-identical. */
export function InventoryPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    setShowInventory = props.setShowInventory,
    gearWorn = props.gearWorn,
    toggleGearSlot = props.toggleGearSlot;
  var _AMULET_TIERS$rpgStat, _BLACKSMITH_TIERS$rpg, _BLACKSMITH_TIERS$rpg2, _ELEMENTS$pet, _ELEMENTS$pet$element2, _ELEMENTS$rpgState, _ELEMENTS$rpgState$am3, _ELEMENTS$rpgState$am4, _ELEMENTS$rpgState$am5, _ELEMENTS$rpgState$am6, _ELEMENTS$rpgState$sh3, _ELEMENTS$sw, _ELEMENTS$sw$element, _ELEMENTS$sw$element2, _ELEMENTS$sw$element3, _ELEMENTS$sw$element4, _ELEMENTS$sw$element5, _ELEMENTS$sw$element6, _ELEMENTS$wpn, _ELEMENTS$wpn$element0, _ELEMENTS$wpn$element1, _ELEMENTS$wpn$element10, _ELEMENTS$wpn$element5, _ELEMENTS$wpn$element6, _ELEMENTS$wpn$element7, _ELEMENTS$wpn$element8, _ELEMENTS$wpn$element9, _RARITY_TIERS$rpgStat, _WEAPON_TYPES$current, _WEAPON_TYPES$sold, _WEAPON_TYPES$sold$ty2, _WEAPON_TYPES$sw, _WEAPON_TYPES$sw$type2, _rpgState$armor2, _rpgState$armor3, _rpgState$armor4, _rpgState$lifeSkills37, _rpgState$lifeSkills38, _rpgState$lifeSkills39, _rpgState$lifeSkills40, _rpgState$lifeSkills41, _rpgState$lifeSkills42;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowInventory(false);
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
    /* v2.3.1235: batch-2 rollout \u2014 shared class is 28\u00d728, below the
       44px hitbox floor; inline override on this modal only. */
    style: { width: 44, height: 44 },
    onClick: function onClick() {
      return setShowInventory(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: panel title row \u2014 icon + 13/700 uppercase title */
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/nav-inventory.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('\uD83C\uDF92'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: 'var(--ui-text)'
    }
  }, "Equipment")), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: caption row; gold value = gold.webp + tabular brass */
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      color: 'var(--ui-text-muted)',
      marginBottom: 8
    }
  }, "Active: ", rpgState.activeSlot === 'ranged' ? 'Ranged' : 'Melee', " \xB7 ", /*#__PURE__*/React.createElement("img", {
    src: "/icons/popups/gold.webp",
    alt: "",
    draggable: false,
    style: {
      width: 14,
      height: 14,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('\uD83D\uDCB0'));
    }
  }), /*#__PURE__*/React.createElement("span", {
    /* v2.3.1235: batch-2 rollout — brass #D8A85F → --ui-brass */
    style: {
      fontSize: 12,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--ui-brass)'
    }
  }, rpgState.coins, "g")), [{
    label: 'Melee Weapon',
    wpn: rpgState.weapon,
    slot: 'melee'
  }, {
    label: 'Ranged Weapon',
    wpn: rpgState.rangedWeapon,
    slot: 'ranged'
  }].map(function (_ref159) {
    var _ELEMENTS$wpn$element5, _ELEMENTS$wpn$element6, _ELEMENTS$wpn$element7, _ELEMENTS$wpn$element8, _ELEMENTS$wpn$element9, _ELEMENTS$wpn$element0, _ELEMENTS$wpn$element1, _ELEMENTS$wpn$element10;
    var label = _ref159.label,
      wpn = _ref159.wpn,
      slot = _ref159.slot;
    if (!wpn) return null;
    var wt = WEAPON_TYPES[wpn.type];
    var rt = RARITY_TIERS[wpn.tier];
    var isActive = rpgState.activeSlot === slot || slot === 'melee' && rpgState.activeSlot !== 'ranged';
    /* v2.3.1207: deterministic DMG range via the shared display helper
       — this was a single RANDOM calcWeaponDmg roll (a different number
       every render) off the STALE rpgState snapshot.  Live state via
       stateRef, the v2.3.1206 stash-compare convention below. */
    var dmgRange = calcDisplayDmgRange((stateRef.current && stateRef.current.rpg) || rpgState || {}, wpn);
    var dmg = dmgRange ? dmgRange.text : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: slot,
      style: {
        marginBottom: 8,
        padding: 10,
        borderRadius: 10,
        /* v2.3.1232: active weapon = brass accent-fill + brass edge (selection);
           idle = quiet cell + hairline */
        /* v2.3.1235: batch-2 rollout — the solid #3B3427 accent-fill is
           retired: selection is now the translucent brass-soft tint
           over the card base (correction-pass rule), idle cards sit on
           --ui-card with the standard line. */
        background: isActive ? 'linear-gradient(rgba(216,170,88,.15), rgba(216,170,88,.15)), #24363C' : 'var(--ui-card)',
        border: "1.5px solid ".concat(isActive ? '#D8AA58' : 'rgba(229,237,233,.11)'),
        position: 'relative'
      }
    }, isActive && /*#__PURE__*/React.createElement("div", {
      /* v2.3.1235: batch-2 rollout — badge to the 11px floor; focus
         gold #F0C878 → --ui-brass-highlight */
      style: {
        position: 'absolute',
        top: 4,
        right: 8,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.08em',
        color: 'var(--ui-brass-highlight)'
      }
    }, "ACTIVE"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 22
      }
    }, (wt === null || wt === void 0 ? void 0 : wt.emoji) || '⚔️'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: (rt === null || rt === void 0 ? void 0 : rt.color) || 'var(--ui-text-muted)'
      }
    }, wpn.name), /*#__PURE__*/React.createElement("div", {
      /* v2.3.1235: batch-2 rollout — 8px metadata was far below the
         11px floor */
      style: {
        fontSize: 11,
        color: 'var(--ui-text-muted)'
      }
    }, rt === null || rt === void 0 ? void 0 : rt.label, " ", wt === null || wt === void 0 ? void 0 : wt.label, " \xB7 ", wpn.tierMult, "\xD7 mult", wpn.quality && wpn.quality !== 'normal' ? ' \xB7 ' + wpn.quality.toUpperCase() + (wpn.quality === 'godly' ? ' \u2728' : wpn.quality === 'elite' ? ' \u2B50' : '') : '', wpn.hardness ? ' \xB7 H' + wpn.hardness : ''))), /*#__PURE__*/React.createElement("div", {
      /* v2.3.1235: batch-2 rollout — stat strip to the 11px floor */
      style: {
        display: 'flex',
        gap: 8,
        fontSize: 11,
        color: 'var(--ui-text-muted)',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", null, "DMG: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--ui-text)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, dmg)), /*#__PURE__*/React.createElement("span", null, "SPD: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--ui-text)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, (wt === null || wt === void 0 ? void 0 : wt.speed) || 1)), /*#__PURE__*/React.createElement("span", null, "RNG: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--ui-text)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, (wt === null || wt === void 0 ? void 0 : wt.range) || 0))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        alignItems: 'center'
      }
    }, wpn.element1 && /*#__PURE__*/React.createElement("span", {
      /* v2.3.1235: batch-2 rollout — element chips to the 11px floor
         (element tints are game data and stay) */
      style: {
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 4,
        background: ((_ELEMENTS$wpn$element5 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element5 === void 0 ? void 0 : _ELEMENTS$wpn$element5.color) + '22',
        color: (_ELEMENTS$wpn$element6 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element6 === void 0 ? void 0 : _ELEMENTS$wpn$element6.color,
        border: '1px solid ' + ((_ELEMENTS$wpn$element7 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element7 === void 0 ? void 0 : _ELEMENTS$wpn$element7.color) + '44'
      }
    }, "E1: ", wpn.element1, " (", (_ELEMENTS$wpn$element8 = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element8 === void 0 ? void 0 : _ELEMENTS$wpn$element8.status, ")"), wpn.element2 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 4,
        background: ((_ELEMENTS$wpn$element9 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element9 === void 0 ? void 0 : _ELEMENTS$wpn$element9.color) + '22',
        color: (_ELEMENTS$wpn$element0 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element0 === void 0 ? void 0 : _ELEMENTS$wpn$element0.color,
        border: '1px solid ' + ((_ELEMENTS$wpn$element1 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element1 === void 0 ? void 0 : _ELEMENTS$wpn$element1.color) + '44'
      }
    }, "E2: ", wpn.element2, " (", (_ELEMENTS$wpn$element10 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element10 === void 0 ? void 0 : _ELEMENTS$wpn$element10.status, ")"), wpn.isVolatile && /*#__PURE__*/React.createElement("span", {
      /* v2.3.1235: batch-2 rollout \u2014 badge to the 11px floor, danger
         tint onto the approved --ui-danger; the \u26A1 prefix was
         decorative emoji in chrome. */
      style: {
        fontSize: 11,
        padding: '1px 4px',
        borderRadius: 3,
        background: 'rgba(216,99,93,.15)',
        color: 'var(--ui-danger)',
        border: '1px solid rgba(216,99,93,.3)'
      }
    }, "VOLATILE +30%"), !wpn.element1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--ui-text-muted)'
      }
    }, "No elements")));
  }), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: module header — 11/600 uppercase .12em */
    /* v2.3.1235: batch-2 rollout — headers onto the locked 11/700
       .14em muted rung */
    style: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: 'var(--ui-text-muted)',
      margin: '10px 0 6px'
    }
  }, "WORN ARMOR"), /*#__PURE__*/React.createElement("div", {
    style: { display: 'flex', gap: 8, marginBottom: 8 }
  }, [
    { slot: 'chest', name: 'Steel Plate', sub: 'Chest', icon: '/sprites/gear/icons/steelplate.webp' },
    { slot: 'legs', name: 'Steel Greaves', sub: 'Legs', icon: '/sprites/gear/icons/steelgreaves.webp' },
    /* v2.3.756: the t-shirt layer -- worn UNDER the chest armour (both can
       be on at once; armour always renders on top). */
    { slot: 'shirt', name: 'T-Shirt', sub: 'Chest \u00b7 under armor', icon: '/sprites/gear/icons/tshirt.webp' }
  ].map(function (it) {
    var on = gearWorn[it.slot];
    return /*#__PURE__*/React.createElement("div", {
      key: 'wornarmor-' + it.slot,
      style: {
        flex: 1,
        padding: 8,
        borderRadius: 8,
        /* v2.3.1232: worn = occupied-slot mist over #243137; off = empty cell */
        /* v2.3.1235: batch-2 rollout — slot base onto --ui-card /
           --ui-well; the green worn-state border was a decorative
           colored edge (edges are for rarity only) — worn now reads
           as occupied (mist + strong line), off as an empty well cell. */
        background: on ? 'radial-gradient(circle at 48% 42%, rgba(238,240,225,.16) 0%, rgba(238,240,225,.05) 48%, transparent 76%) #24363C' : 'var(--ui-well)',
        border: "1.5px solid ".concat(on ? 'rgba(229,237,233,.20)' : 'rgba(229,237,233,.11)'),
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: it.icon,
      alt: it.name,
      draggable: false,
      style: {
        width: 40,
        height: 40,
        imageRendering: 'pixelated',
        filter: on ? 'none' : 'grayscale(1) brightness(.6)',
        userSelect: 'none'
      }
    }), /*#__PURE__*/React.createElement("div", {
      /* v2.3.1235: batch-2 rollout — 10px name to the 11px floor; the
         green worn-name is the one semantic state cue kept (positive
         token), off-cells read secondary. */
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: on ? '#55B98A' : 'var(--ui-text-secondary)'
      }
    }, it.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ui-text-muted)',
        marginBottom: 5
      }
    }, it.sub), /*#__PURE__*/React.createElement("button", {
      type: 'button',
      onClick: function onClick() { toggleGearSlot(it.slot); },
      style: {
        width: '100%',
        padding: '4px 0',
        /* v2.3.1232: readable per-cell toggle — bigger touch target + hairline */
        /* v2.3.1235: batch-2 rollout — 36px was below the 44px hitbox
           floor, and the red/green fills broke the locked button rule
           (Equip/Unequip are reversible — NEUTRAL secondaries, never
           colored fills; the cell + name already show worn state). */
        minHeight: 44,
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 10,
        border: '1px solid var(--ui-line-strong)',
        background: 'var(--ui-raised)',
        color: 'var(--ui-text)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }
    }, on ? 'Unequip' : 'Equip'));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      padding: 10,
      borderRadius: 10,
      /* v2.3.1235: batch-2 rollout — quiet cell onto --ui-well + line */
      background: 'var(--ui-well)',
      border: '1px solid var(--ui-line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: ((_RARITY_TIERS$rpgStat = RARITY_TIERS[(_rpgState$armor2 = rpgState.armor) === null || _rpgState$armor2 === void 0 ? void 0 : _rpgState$armor2.tier]) === null || _RARITY_TIERS$rpgStat === void 0 ? void 0 : _RARITY_TIERS$rpgStat.color) || 'var(--ui-text-muted)'
    }
  }, ((_rpgState$armor3 = rpgState.armor) === null || _rpgState$armor3 === void 0 ? void 0 : _rpgState$armor3.name) || 'No Armor'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ui-text-muted)'
    }
  }, (_rpgState$armor4 = rpgState.armor) !== null && _rpgState$armor4 !== void 0 && _rpgState$armor4.attunement ? "Attuned: ".concat(rpgState.armor.attunement) : 'No attunement')))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      padding: 10,
      borderRadius: 10,
      /* v2.3.1232: occupied slot = mist over #243137 + .18 hairline; empty = quiet cell */
      /* v2.3.1235: batch-2 rollout — occupied base onto --ui-card +
         strong line; empty onto --ui-well + line */
      background: rpgState.amulet ? 'radial-gradient(circle at 48% 42%, rgba(238,240,225,.16) 0%, rgba(238,240,225,.05) 48%, transparent 76%) #24363C' : 'var(--ui-well)',
      border: rpgState.amulet ? '1px solid var(--ui-line-strong)' : '1px solid var(--ui-line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "\uD83D\uDCFF"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, rpgState.amulet ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--ui-text)'
    }
  }, rpgState.amulet.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ui-text-muted)'
    }
  }, ((_AMULET_TIERS$rpgStat = AMULET_TIERS[rpgState.amulet.tier]) === null || _AMULET_TIERS$rpgStat === void 0 ? void 0 : _AMULET_TIERS$rpgStat.label) || 'Simple', " Amulet", rpgState.amulet.gem && function (_ELEMENTS$rpgState$am3) {
    var bonus = getAmuletBonus(rpgState.amulet);
    if (!bonus) return null;
    return /*#__PURE__*/React.createElement("span", {
      style: {
        color: ((_ELEMENTS$rpgState$am3 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am3 === void 0 ? void 0 : _ELEMENTS$rpgState$am3.color) || '#F7F2E7'
      }
    }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit);
  }()), rpgState.amulet.gem && /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: batch-2 rollout — 7px was far below the 11px floor */
    style: {
      fontSize: 11,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '1px 4px',
      borderRadius: 3,
      background: ((_ELEMENTS$rpgState$am4 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am4 === void 0 ? void 0 : _ELEMENTS$rpgState$am4.color) + '22',
      color: (_ELEMENTS$rpgState$am5 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am5 === void 0 ? void 0 : _ELEMENTS$rpgState$am5.color,
      border: '1px solid ' + ((_ELEMENTS$rpgState$am6 = ELEMENTS[rpgState.amulet.gem]) === null || _ELEMENTS$rpgState$am6 === void 0 ? void 0 : _ELEMENTS$rpgState$am6.color) + '44'
    }
  }, rpgState.amulet.gem, " gem")), !rpgState.amulet.gem && /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: batch-2 rollout \u2014 descriptive copy to the 12px floor */
    style: {
      fontSize: 12,
      color: 'var(--ui-text-muted)',
      marginTop: 2
    }
  }, "No gem \u2014 visit the Enchanter to slot one")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--ui-text-muted)'
    }
  }, "No Amulet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ui-text-muted)'
    }
  }, "Craft at Blacksmith from gold bars (nuggets: ", rpgState.goldNuggets || 0, "/", NUGGETS_PER_BAR, ", bars: ", rpgState.goldBars || 0, ")"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      padding: 10,
      borderRadius: 10,
      /* v2.3.1232: occupied slot = mist over #243137 + .18 hairline; empty = quiet cell */
      /* v2.3.1235: batch-2 rollout — occupied base onto --ui-card +
         strong line; empty onto --ui-well + line */
      background: rpgState.shield ? 'radial-gradient(circle at 48% 42%, rgba(238,240,225,.16) 0%, rgba(238,240,225,.05) 48%, transparent 76%) #24363C' : 'var(--ui-well)',
      border: rpgState.shield ? '1px solid var(--ui-line-strong)' : '1px solid var(--ui-line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, rpgState.shield ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--ui-text)'
    }
  }, rpgState.shield.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ui-text-muted)'
    }
  }, ((_BLACKSMITH_TIERS$rpg = BLACKSMITH_TIERS[rpgState.shield.gearBase]) === null || _BLACKSMITH_TIERS$rpg === void 0 ? void 0 : _BLACKSMITH_TIERS$rpg.label) || 'Basic', " \xB7 ", ((_BLACKSMITH_TIERS$rpg2 = BLACKSMITH_TIERS[rpgState.shield.gearBase]) === null || _BLACKSMITH_TIERS$rpg2 === void 0 ? void 0 : _BLACKSMITH_TIERS$rpg2.tierMult) || 1, "\xD7", rpgState.shield.gem && function (_ELEMENTS$rpgState$sh3) {
    var bonus = getShieldBonus(rpgState.shield);
    return bonus ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: (_ELEMENTS$rpgState$sh3 = ELEMENTS[rpgState.shield.gem]) === null || _ELEMENTS$rpgState$sh3 === void 0 ? void 0 : _ELEMENTS$rpgState$sh3.color
      }
    }, " \xB7 ", bonus.label, " +", bonus.value, bonus.unit) : null;
  }()), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: batch-2 rollout — 7px was far below the 11px floor */
    style: {
      fontSize: 11,
      color: 'var(--ui-text-muted)'
    }
  }, rpgState.shield.reforgeBonus ? rpgState.shield.reforgeBonus.label + ' +' + rpgState.shield.reforgeBonus.value + rpgState.shield.reforgeBonus.unit : '', rpgState.shield.hardenBonus ? ' · ' + rpgState.shield.hardenBonus.label + ' +' + rpgState.shield.hardenBonus.value + rpgState.shield.hardenBonus.unit : '', !rpgState.shield.reforgeBonus && !rpgState.shield.gem && 'No bonuses yet')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--ui-text-muted)'
    }
  }, "No Shield"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ui-text-muted)'
    }
  }, "Craft at the Blacksmith from ore"))))), function () {
    var inv = rpgState.inventory || {};
    var cookedFish = Object.entries(inv).filter(function (_ref160) {
      var _ref161 = _slicedToArray(_ref160, 2),
        k = _ref161[0],
        v = _ref161[1];
      return v > 0 && k.startsWith('cooked_');
    });
    if (cookedFish.length === 0) return null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      /* v2.3.1232: module header \u2014 11/600 uppercase .12em */
      /* v2.3.1235: batch-2 rollout \u2014 locked 11/700 .14em muted rung;
         the \uD83C\uDF7D\uFE0F prefix was decorative emoji in chrome */
      style: {
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        color: 'var(--ui-text-muted)',
        fontVariantNumeric: 'tabular-nums',
        marginTop: 4,
        marginBottom: 4
      }
    }, "Food (", cookedFish.reduce(function (s, e) {
      return s + e[1];
    }, 0), ")"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3,
        flexWrap: 'wrap',
        marginBottom: 6
      }
    }, cookedFish.map(function (_ref162) {
      var _ref163 = _slicedToArray(_ref162, 2),
        key = _ref163[0],
        qty = _ref163[1];
      var fishName = key.replace('cooked_', '').replace(/_/g, ' ');
      /* v2.3.1207: calcDisplayHeal — folds the HP-grid Recovery mult the
         way the server's _handleEatRequest does, so the button label,
         the optimistic heal, and the popup all match the authoritative
         heal in the player_state echo.  Live rpg via stateRef (Recovery
         points can be spent without a setRpgState). */
      var healAmt = calcDisplayHeal((stateRef.current && stateRef.current.rpg) || rpgState, key);
      var atFull = rpgState.hp >= rpgState.maxHp;
      return /*#__PURE__*/React.createElement("button", {
        key: key,
        /* v2.3.1232: 32px eat chips (pill radius); at-full = quiet cell +
           disabled ink, else the spec positive green */
        style: {
          padding: '0 10px',
          minHeight: 32,
          borderRadius: 999,
          fontSize: 11,
          cursor: 'pointer',
          background: atFull ? '#19252A' : 'rgba(89,191,145,.12)',
          border: atFull ? '1px solid rgba(238,242,235,.08)' : '1px solid rgba(89,191,145,.3)',
          color: atFull ? '#687575' : '#59BF91',
          fontWeight: 700,
          textTransform: 'capitalize',
          fontVariantNumeric: 'tabular-nums'
        },
        onClick: function onClick() {
          if (atFull) return;
          var R = stateRef.current.rpg;
          if (!R.inventory[key] || R.inventory[key] < 1) return;
          R.inventory[key]--;
          if (R.inventory[key] <= 0) delete R.inventory[key];
          var healed = Math.min(healAmt, R.maxHp - R.hp);
          R.hp = Math.min(R.maxHp, R.hp + healAmt);
          setRpgState(_objectSpread({}, R));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R));
          } catch (e) {}
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, '+' + healed + ' HP', '#59BF91');
          /* (Eat handler patched to send eat_request -- see block above.) */
          if (stateRef.current._serverMonsters && stateRef.current.channel) {
            try { stateRef.current.channel.send({ type: 'eat_request', payload: { invKey: key } }); } catch (e) {}
          }
          BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
        }
      }, "\uD83D\uDC1F ", fishName, " \xD7", qty, " (+", healAmt, "HP)");
    })));
  }(), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: module header \u2014 11/600 uppercase .12em */
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      fontVariantNumeric: 'tabular-nums',
      marginTop: 4,
      marginBottom: 4
    }
  }, "\uD83D\uDCE6 Weapon Stash (", (rpgState.weaponStash || []).length, "/", WEAPON_STASH_MAX, ")"), (rpgState.weaponStash || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#96A2A0',
      marginBottom: 6
    }
  }, "Empty. Weapon drops are auto-stashed here for comparison."), (rpgState.weaponStash || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      marginBottom: 8
    }
  }, (rpgState.weaponStash || []).map(function (sw, si) {
    var _WEAPON_TYPES$current, _ELEMENTS$sw$element, _ELEMENTS$sw$element2, _ELEMENTS$sw$element3, _ELEMENTS$sw$element4, _ELEMENTS$sw$element5, _ELEMENTS$sw$element6, _WEAPON_TYPES$sw$type2;
    var swt = WEAPON_TYPES[sw.type];
    var srt = RARITY_TIERS[sw.tier];
    var isRanged = (swt === null || swt === void 0 ? void 0 : swt.type) === 'ranged';
    var current = isRanged ? rpgState.rangedWeapon : rpgState.weapon;
    /* v2.3.1206: read LIVE state for the compare numbers — rpgState is a
       React snapshot that lags in-place S.rpg mutations (SpendPointConfirm
       deliberately skips setRpgState; documented pattern, do not "fix"),
       so a fresh channel spend moved combat but not this panel until the
       next unrelated setRpgState.  stateRef.current.rpg is the same live
       object the game loop reads. */
    var liveRpg = (stateRef.current && stateRef.current.rpg) || rpgState || {};
    /* v2.3.1207: deterministic band midpoints from the shared display
       helper — these were single RANDOM calcWeaponDmg rolls, so the
       compare (and its ▲/▼ diff) jittered between renders and could
       flip sign on identical weapons. */
    var stashRange = calcDisplayDmgRange(liveRpg, sw);
    var curRange = current ? calcDisplayDmgRange(liveRpg, current) : null;
    var stashDmg = stashRange ? Math.round((stashRange.min + stashRange.max) / 2) : 0;
    var curDmg = curRange ? Math.round((curRange.min + curRange.max) / 2) : 0;
    var dmgDiff = stashDmg - curDmg;
    var stashSpd = (swt === null || swt === void 0 ? void 0 : swt.speed) || 1;
    var curSpd = current ? ((_WEAPON_TYPES$current = WEAPON_TYPES[current.type]) === null || _WEAPON_TYPES$current === void 0 ? void 0 : _WEAPON_TYPES$current.speed) || 1 : 1;
    var spdDiff = stashSpd - curSpd;
    /* v2.3.1206: DPS via the shared calcDisplayDps (the dashboard's
       formula: real attack period + crit-channel fold) instead of
       dmg × the coarse WEAPON_TYPES.speed scalar, which ignored crit
       entirely — crit-channel points now move BOTH sides of the stash
       compare.  SPD keeps the legacy scalar as a feel label. */
    var stashDps = Math.round(calcDisplayDps(liveRpg, sw));
    var curDps = current ? Math.round(calcDisplayDps(liveRpg, current)) : 0;
    var dpsDiff = stashDps - curDps;
    return /*#__PURE__*/React.createElement("div", {
      key: si,
      style: {
        padding: 8,
        borderRadius: 8,
        background: '#19252A',
        border: '1px solid rgba(238,242,235,.08)',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, (swt === null || swt === void 0 ? void 0 : swt.emoji) || '⚔️'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: (srt === null || srt === void 0 ? void 0 : srt.color) || '#96A2A0'
      }
    }, sw.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: '#96A2A0'
      }
    }, srt === null || srt === void 0 ? void 0 : srt.label, " ", swt === null || swt === void 0 ? void 0 : swt.label, " \xB7 ", sw.tierMult, "\xD7 \xB7 ", isRanged ? 'Ranged' : 'Melee'))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        fontSize: 8,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#96A2A0'
      }
    }, "DMG: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#F7F2E7',
        fontVariantNumeric: 'tabular-nums'
      }
    }, stashDmg), dmgDiff !== 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: dmgDiff > 0 ? '#59BF91' : '#D95C54',
        marginLeft: 2,
        fontSize: 7
      }
    }, dmgDiff > 0 ? '▲' : '▼', Math.abs(dmgDiff))), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#96A2A0'
      }
    }, "SPD: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#F7F2E7',
        fontVariantNumeric: 'tabular-nums'
      }
    }, stashSpd), spdDiff !== 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: spdDiff > 0 ? '#59BF91' : '#D95C54',
        marginLeft: 2,
        fontSize: 7
      }
    }, spdDiff > 0 ? '▲' : '▼', Math.abs(spdDiff).toFixed(1))), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#96A2A0'
      }
    }, "DPS: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: '#F7F2E7',
        fontVariantNumeric: 'tabular-nums'
      }
    }, stashDps), dpsDiff !== 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: dpsDiff > 0 ? '#59BF91' : '#D95C54',
        marginLeft: 2,
        fontSize: 7
      }
    }, dpsDiff > 0 ? '▲' : '▼', Math.abs(dpsDiff)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        marginBottom: 4
      }
    }, sw.element1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        padding: '1px 4px',
        borderRadius: 3,
        background: ((_ELEMENTS$sw$element = ELEMENTS[sw.element1]) === null || _ELEMENTS$sw$element === void 0 ? void 0 : _ELEMENTS$sw$element.color) + '22',
        color: (_ELEMENTS$sw$element2 = ELEMENTS[sw.element1]) === null || _ELEMENTS$sw$element2 === void 0 ? void 0 : _ELEMENTS$sw$element2.color,
        border: '1px solid ' + ((_ELEMENTS$sw$element3 = ELEMENTS[sw.element1]) === null || _ELEMENTS$sw$element3 === void 0 ? void 0 : _ELEMENTS$sw$element3.color) + '44'
      }
    }, sw.element1), sw.element2 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        padding: '1px 4px',
        borderRadius: 3,
        background: ((_ELEMENTS$sw$element4 = ELEMENTS[sw.element2]) === null || _ELEMENTS$sw$element4 === void 0 ? void 0 : _ELEMENTS$sw$element4.color) + '22',
        color: (_ELEMENTS$sw$element5 = ELEMENTS[sw.element2]) === null || _ELEMENTS$sw$element5 === void 0 ? void 0 : _ELEMENTS$sw$element5.color,
        border: '1px solid ' + ((_ELEMENTS$sw$element6 = ELEMENTS[sw.element2]) === null || _ELEMENTS$sw$element6 === void 0 ? void 0 : _ELEMENTS$sw$element6.color) + '44'
      }
    }, sw.element2), sw.isVolatile && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: '#D95C54'
      }
    }, "\u26A1VOL"), !sw.element1 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: '#96A2A0'
      }
    }, "No elements"), function () {
      var req = getEquipReqLabel(sw, sw.type);
      if (!req) return null;
      var met = (rpgState[req.stat] || 0) >= req.req;
      return /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: met ? '#59BF91' : '#D95C54',
          marginLeft: 4
        }
      }, req.label, " ", rpgState[req.stat] || 0, "/", req.req, " ", met ? '✓' : '✗');
    }()), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      /* v2.3.1232: 44px action row — Equip is the one brass primary */
      style: {
        flex: 1,
        padding: '3px 0',
        minHeight: 44,
        borderRadius: 11,
        border: 'none',
        background: '#D8A85F',
        color: '#20170D',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (!R.weaponStash) return;
        var swapWpn = R.weaponStash[si];
        /* Check stat requirement */
        if (!canEquipItem(R, swapWpn, swapWpn.type)) {
          var req = getEquipReqLabel(swapWpn, swapWpn.type);
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Need ' + req.req + ' ' + req.label + ' (have ' + (R[req.stat] || 0) + ')', '#D95C54');
          return;
        }
        var wDef = WEAPON_TYPES[swapWpn.type];
        var swIsRanged = (wDef === null || wDef === void 0 ? void 0 : wDef.type) === 'ranged';
        var old = swIsRanged ? R.rangedWeapon : R.weapon;
        /* Equip from stash, put old weapon in stash */
        if (swIsRanged) R.rangedWeapon = swapWpn;else R.weapon = swapWpn;
        R.weaponStash[si] = old;
        /* Server-authoritative equipment in MP: tell the worker to
           perform the same swap so its view stays in sync.  The
           swap above is local prediction; player_state arrives
           shortly with the worker's authoritative weapon + stash. */
        {
          var _Seq = stateRef.current;
          if (_Seq._serverMonsters && _Seq.channel) {
            try { _Seq.channel.send({ type: 'equip_request', payload: { stashIdx: si, slot: swIsRanged ? 'rangedWeapon' : 'weapon' } }); } catch (e) {}
          }
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.collect();
      }
    }, "\u2694\uFE0F Equip"), /*#__PURE__*/React.createElement("button", {
      /* v2.3.1232: 44px action row — Sell is the raised secondary */
      style: {
        flex: 1,
        padding: '3px 0',
        minHeight: 44,
        borderRadius: 11,
        border: '1px solid rgba(238,242,235,.14)',
        background: '#2B3940',
        color: '#F7F2E7',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontVariantNumeric: 'tabular-nums'
      },
      onClick: function onClick() {
        var _WEAPON_TYPES$sold$ty2;
        var R = stateRef.current.rpg;
        if (!R.weaponStash) return;
        var sold = R.weaponStash[si];
        var sellVal = Math.ceil((sold.tierMult || 1) * (((_WEAPON_TYPES$sold$ty2 = WEAPON_TYPES[sold.type]) === null || _WEAPON_TYPES$sold$ty2 === void 0 ? void 0 : _WEAPON_TYPES$sold$ty2.base) || 30) * 0.5);
        /* Server-authoritative stash sell in MP: worker validates the
           stash entry exists, computes the same sell value, credits
           coins, splices the stash.  Local mutation stays as snappy
           visual prediction; player_state arrives shortly with the
           authoritative stash + coins. */
        {
          var _Ssw = stateRef.current;
          if (_Ssw._serverMonsters && _Ssw.channel) {
            try { _Ssw.channel.send({ type: 'sell_weapon', payload: { stashIdx: si } }); } catch (e) {}
          }
        }
        R.coins += sellVal;
        if (R._compStats) R._compStats.totalGoldEarned += sellVal;
        R.weaponStash.splice(si, 1);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        var S = stateRef.current;
        pushDmgPopup(S, S.player.x, S.player.y - 30, '+' + sellVal + 'G', '#D8A94D');
        BT_AUDIO.beep(400, 0.05, 0.08, 'sine');
      }
    }, /*#__PURE__*/React.createElement("img", {
      /* v2.3.1232: gold value icon (emoji fallback) */
      src: "/icons/popups/gold.webp",
      alt: "",
      draggable: false,
      style: {
        width: 14,
        height: 14,
        objectFit: 'contain',
        verticalAlign: -2,
        marginRight: 3
      },
      onError: function onError(e) {
        e.currentTarget.replaceWith(document.createTextNode('\uD83D\uDCB0'));
      }
    }), "Sell (", Math.ceil((sw.tierMult || 1) * (((_WEAPON_TYPES$sw$type2 = WEAPON_TYPES[sw.type]) === null || _WEAPON_TYPES$sw$type2 === void 0 ? void 0 : _WEAPON_TYPES$sw$type2.base) || 30) * 0.5), "g)")));
  })), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: module header \u2014 11/600 uppercase .12em */
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      fontVariantNumeric: 'tabular-nums',
      marginTop: 4,
      marginBottom: 4
    }
  }, "\uD83D\uDCD6 Codex: ", discoveredCollisions.size, " collisions discovered"), discoveredCollisions.size > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      flexWrap: 'wrap',
      marginBottom: 6
    }
  }, _toConsumableArray(discoveredCollisions).slice(0, 20).map(function (cid) {
    var coll = Object.values(COLLISION_TABLE).find(function (c) {
      return c.id === cid;
    });
    return coll ? /*#__PURE__*/React.createElement("span", {
      key: cid,
      /* v2.3.1232: off-palette teal → spec info blue */
      style: {
        fontSize: 9,
        padding: '2px 6px',
        borderRadius: 4,
        background: 'rgba(93,147,210,.12)',
        color: '#5D93D2',
        border: '1px solid rgba(93,147,210,.3)'
      }
    }, coll.name) : null;
  })), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: module header \u2014 11/600 uppercase .12em */
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      fontVariantNumeric: 'tabular-nums',
      marginTop: 8,
      marginBottom: 4
    }
  }, "\uD83E\uDEA4 Pets: ", ((_rpgState$lifeSkills37 = rpgState.lifeSkills) === null || _rpgState$lifeSkills37 === void 0 || (_rpgState$lifeSkills37 = _rpgState$lifeSkills37.pets) === null || _rpgState$lifeSkills37 === void 0 ? void 0 : _rpgState$lifeSkills37.length) || 0, "/", MAX_PET_SLOTS, ((_rpgState$lifeSkills38 = rpgState.lifeSkills) === null || _rpgState$lifeSkills38 === void 0 ? void 0 : _rpgState$lifeSkills38.trapping) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: '#96A2A0'
    }
  }, " \xB7 Trapping Lv", rpgState.lifeSkills.trapping.level)), (((_rpgState$lifeSkills39 = rpgState.lifeSkills) === null || _rpgState$lifeSkills39 === void 0 ? void 0 : _rpgState$lifeSkills39.pets) || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#96A2A0',
      marginBottom: 4
    }
  }, "No pets. Weaken a monster to <20% HP then tap \uD83E\uDEA4 to capture!"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: recessed #121B20 tray behind the pet grid (well shadow) */
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 4,
      background: '#121B20',
      borderRadius: 10,
      padding: 4,
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
      marginBottom: 6
    }
  }, (((_rpgState$lifeSkills40 = rpgState.lifeSkills) === null || _rpgState$lifeSkills40 === void 0 ? void 0 : _rpgState$lifeSkills40.pets) || []).map(function (pet, pi) {
    var _rpgState$lifeSkills41, _ELEMENTS$pet$element2;
    var isActive = ((_rpgState$lifeSkills41 = rpgState.lifeSkills) === null || _rpgState$lifeSkills41 === void 0 ? void 0 : _rpgState$lifeSkills41.activePet) === pi;
    return /*#__PURE__*/React.createElement("div", {
      key: pet.id,
      style: {
        padding: 6,
        borderRadius: 8,
        textAlign: 'center',
        /* v2.3.1232: occupied-slot mist; active pet = accent-fill + brass edge */
        background: isActive ? 'radial-gradient(circle at 48% 42%, rgba(238,240,225,.16) 0%, rgba(238,240,225,.05) 48%, transparent 76%) #3B3427' : 'radial-gradient(circle at 48% 42%, rgba(238,240,225,.16) 0%, rgba(238,240,225,.05) 48%, transparent 76%) #243137',
        border: "1px solid ".concat(isActive ? '#D8A85F' : 'rgba(238,242,235,.08)'),
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        R.lifeSkills.activePet = isActive ? null : pi;
        stateRef.current._petX = null; /* reset pet position */
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18
      }
    }, pet.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: pet.color
      }
    }, pet.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: '#96A2A0'
      }
    }, "Lv", pet.level, " ", pet.archetype), pet.element && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 6,
        color: ((_ELEMENTS$pet$element2 = ELEMENTS[pet.element]) === null || _ELEMENTS$pet$element2 === void 0 ? void 0 : _ELEMENTS$pet$element2.color) || '#96A2A0'
      }
    }, pet.element), isActive && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '.08em',
        color: '#F0C878'
      }
    }, "ACTIVE"));
  })), (((_rpgState$lifeSkills42 = rpgState.lifeSkills) === null || _rpgState$lifeSkills42 === void 0 ? void 0 : _rpgState$lifeSkills42.pets) || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: caption size floor */
    style: {
      fontSize: 10,
      color: '#96A2A0'
    }
  }, "Tap a pet to set active. Active pet follows you and auto-collects loot within ", PET_LOOT_RADIUS, "px.")));
}
