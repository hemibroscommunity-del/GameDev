import React from 'react';
import { BT_AUDIO, COOKING_RECIPES, addLifeSkillXp, calcDisplayHeal, createDefaultCompStats, getCookingSweetSpot, getFishTierLevel } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === CookPanel — buildingPanel === 'cook' sub-panel === */
/* v2.3.879: extracted verbatim from the buildingPanel === 'cook'
   clause in BroTown.jsx (the cooking station: pick a fish, hit the
   sweet-spot timing, brew a heal dish). Behavior-frozen UI
   decomposition; the gate stays in BroTown. 5 props (rpgState,
   stateRef, setRpgState, cookMinigame, setCookMinigame). Data imports
   verified real exports (createDefaultCompStats from items via the
   @/data barrel); spread/slice babel helpers imported; the hoisted
   optional-chaining temp set declared locally. setTimeout is a browser
   global. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) — the
   color remap left the old dense layout behind.  Now: #202C32 panel
   surface, 11/600 uppercase section headers, 44px rows inside recessed
   #121B20 wells, secondary #2B3940 row actions; brass is reserved for
   the in-zone COOK moment (the one primary action of the minigame).
   Styles + JSX grouping only — every handler is byte-identical. */
/* v2.3.1235: batch-3 rollout — correction-pass compliance
   (docs/LANTERN-SLATE-SPEC.md + game.css :root). Presentation only,
   every handler byte-identical. v2.3.1232 tokens remapped onto the
   approved v2.3.1235 set (sheet #1E2E34, well #111E23, well-deep
   #0B161B for the bar track, card #24363C, raised #293B41, text
   #F4F0E7/#B6C1BE/#8D9B98/#667875, lines rgba(229,237,233,.11/.20),
   brass gradient primary on #172126 ink); section headers 11/700
   uppercase .14em; chrome emoji dropped (🔥/🍳/✅ — the 🐟/🍽️/🍲 item
   and recipe glyphs are game data and stay); row buttons hit the 44px
   hitbox floor; locked recipe rows lift to the .55 readability floor;
   needle glow shadow dropped (not in the approved shadow kit). */
export function CookPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    cookMinigame = props.cookMinigame,
    setCookMinigame = props.setCookMinigame;
  var _rpgState$lifeSkills14, _rpgState$lifeSkills15, _rpgState$lifeSkills16, _rpgState$lifeSkills17;
  /* v2.3.1232: shared Lantern Slate style fragments (styles only). */
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
  return React.createElement("div", {
    style: {
      margin: -20,
      /* v2.3.1235: batch-3 rollout — sheet token, 14px panel radius, and
         the Checkpoint-B 16px scroll tail so the last row never ends
         flush against the modal edge. */
      padding: '16px 14px 32px',
      background: '#1E2E34',
      borderRadius: 14,
      textAlign: 'left',
      fontFamily: "'Source Sans 3',sans-serif"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
      paddingRight: 24
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/bldg-cook.webp",
    alt: "",
    draggable: false,
    style: {
      width: 26,
      height: 26,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('🍳'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F4F0E7'
    }
  }, "Kitchen")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
      marginBottom: 12
    }
  }, "Cooking Lv", ((_rpgState$lifeSkills14 = rpgState.lifeSkills) === null || _rpgState$lifeSkills14 === void 0 || (_rpgState$lifeSkills14 = _rpgState$lifeSkills14.cooking) === null || _rpgState$lifeSkills14 === void 0 ? void 0 : _rpgState$lifeSkills14.level) || 1, " \xB7 Cook fish for healing. Prepare herb recipes for combat buffs."), /*#__PURE__*/React.createElement("div", {
    style: LS_HEAD
  }, "Cook Fish — Healing"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
      marginBottom: 8
    }
  }, "Raw fish → Cook (timing minigame) → Cooked fish you can eat to heal."), cookMinigame && !cookMinigame.result && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 10,
      /* v2.3.1235: batch-3 rollout — card token + hairline; chrome
         emoji dropped from the banner title. */
      background: '#24363C',
      border: '1px solid rgba(229,237,233,.11)',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: '#F4F0E7',
      marginBottom: 4
    }
  }, "Cooking: ", cookMinigame.fishName, " (Heals ", cookMinigame.healAmt, " HP)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
      marginBottom: 8
    }
  }, "Tap COOK when the marker is in the green zone!"), function () {
    var spot = cookMinigame.sweetSpot;
    var barW = 260;
    var greenLeft = (spot.center - spot.width / 2) * barW;
    var greenW = spot.width * barW;
    /* Indicator position oscillates based on time */
    var elapsed = (Date.now() - cookMinigame.started) / 1000;
    var speed = 1.2 + cookMinigame.tier * 0.015; /* faster for harder fish */
    var pos = (Math.sin(elapsed * speed * Math.PI) + 1) / 2; /* 0-1 oscillating */
    var indX = pos * barW;
    var inZone = indX >= greenLeft && indX <= greenLeft + greenW;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: barW,
        height: 26,
        /* v2.3.1235: batch-3 rollout — bar tracks sit on well-deep with
           the shared well recess (no per-screen shadow recipes). */
        background: '#0B161B',
        boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)',
        borderRadius: 8,
        overflow: 'hidden',
        margin: '0 auto 8px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: greenLeft,
        top: 0,
        width: greenW,
        height: '100%',
        /* v2.3.1235: batch-3 rollout — positive token (#55B98A) tint */
        background: 'rgba(85,185,138,.25)',
        borderLeft: '2px solid #55B98A',
        borderRight: '2px solid #55B98A'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: indX - 2,
        top: 0,
        width: 4,
        height: '100%',
        /* v2.3.1235: batch-3 rollout — positive/danger tokens; pill
           radius (2px is off the approved radius set) and the glow
           dropped (not in the approved shadow kit). */
        background: inZone ? '#55B98A' : '#D8635D',
        borderRadius: 999,
        transition: 'left 0.05s linear'
      }
    })), /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        minHeight: 44,
        padding: '0 12px',
        borderRadius: 10,
        /* v2.3.1235: batch-3 rollout — the surface's ONE primary uses
           the committed gold-gradient recipe (#EAC675 edge, #172126
           ink); out-of-zone falls back to the secondary recipe. */
        border: inZone ? '1px solid #EAC675' : '1px solid rgba(229,237,233,.20)',
        fontSize: 13,
        fontWeight: 700,
        background: inZone ? 'linear-gradient(180deg,#E2B765,#D2A14D)' : '#293B41',
        color: inZone ? '#172126' : '#B6C1BE',
        cursor: 'pointer',
        fontFamily: 'inherit',
        letterSpacing: '.05em'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        if (inZone) {
          /* SUCCESS — cooked! */
          if (!R.inventory) R.inventory = {};
          var cookedKey = 'cooked_' + cookMinigame.fishKey.replace('fish_', '');
          R.inventory[cookedKey] = (R.inventory[cookedKey] || 0) + 1;
          var leveled = addLifeSkillXp(sk, 'cooking', Math.ceil(cookMinigame.tier * 3));
          if (!R._questFlags) R._questFlags = {};
          R._questFlags.cookedRecipe = true;
          if (!R._compStats) R._compStats = createDefaultCompStats();
          R._compStats.cookSuccess++;
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Cooked ' + cookMinigame.fishName + '!', '#59BF91');
          if (leveled) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 45, 'Cooking Lv' + sk.cooking.level + '!', '#D8A94D');
          BT_AUDIO.collect();
          setCookMinigame(_objectSpread(_objectSpread({}, cookMinigame), {}, {
            result: 'success'
          }));
        } else {
          /* FAIL — burnt! Fish consumed, nothing gained */
          addLifeSkillXp(sk, 'cooking', 1);
          if (!R._compStats) R._compStats = createDefaultCompStats();
          R._compStats.cookBurns++;
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Burnt! Fish wasted.', '#D95C54');
          BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
          setCookMinigame(_objectSpread(_objectSpread({}, cookMinigame), {}, {
            result: 'burnt'
          }));
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        /* Auto-clear result after 1.5s */
        setTimeout(function () {
          return setCookMinigame(null);
        }, 1500);
      }
    }, "COOK!"));
  }()), (cookMinigame === null || cookMinigame === void 0 ? void 0 : cookMinigame.result) && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 10,
      marginBottom: 10,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: 700,
      /* v2.3.1235: batch-3 rollout — positive/danger token tints; chrome
         emoji dropped from the status strings. */
      background: cookMinigame.result === 'success' ? 'rgba(85,185,138,.15)' : 'rgba(216,99,93,.15)',
      border: cookMinigame.result === 'success' ? '1px solid rgba(85,185,138,.3)' : '1px solid rgba(216,99,93,.3)',
      color: cookMinigame.result === 'success' ? '#55B98A' : '#D8635D'
    }
  }, cookMinigame.result === 'success' ? 'Perfectly cooked!' : 'Burnt to a crisp!'), !cookMinigame && function () {
    var inv = rpgState.inventory || {};
    var rawFish = Object.entries(inv).filter(function (_ref97) {
      var _ref98 = _slicedToArray(_ref97, 2),
        k = _ref98[0],
        v = _ref98[1];
      return v > 0 && k.startsWith('fish_');
    });
    if (rawFish.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#8D9B98',
        fontStyle: 'italic',
        padding: '4px 0',
        marginBottom: 10
      }
    }, "No raw fish. Catch some at fishing spots in combat zones!");
    /* v2.3.1232: rows live in one recessed well, divided by hairlines. */
    return /*#__PURE__*/React.createElement("div", {
      style: LS_WELL
    }, rawFish.map(function (_ref99, _ri) {
      var _rpgState$lifeSkills15;
      var _ref100 = _slicedToArray(_ref99, 2),
        key = _ref100[0],
        qty = _ref100[1];
      var fishName = key.replace('fish_', '').replace(/_/g, ' ');
      /* v2.3.1207: calcDisplayHeal — folds the HP-grid Recovery mult
         the way the server's _handleEatRequest does, so every "Heals X
         HP" label (raw preview, minigame banner, cooked list) and the
         optimistic eat prediction match the authoritative heal in the
         player_state echo.  Live rpg via stateRef (Recovery points can
         be spent without a setRpgState). */
      var healAmt = calcDisplayHeal((stateRef.current && stateRef.current.rpg) || rpgState, key);
      var tierLvl = getFishTierLevel(key);
      var cookLvl = ((_rpgState$lifeSkills15 = rpgState.lifeSkills) === null || _rpgState$lifeSkills15 === void 0 || (_rpgState$lifeSkills15 = _rpgState$lifeSkills15.cooking) === null || _rpgState$lifeSkills15 === void 0 ? void 0 : _rpgState$lifeSkills15.level) || 1;
      var spot = getCookingSweetSpot(cookLvl, tierLvl);
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '4px 8px',
          borderTop: _ri > 0 ? LS_DIV : 'none'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 18
        }
      }, "🐟"), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: '#F4F0E7',
          textTransform: 'capitalize'
        }
      }, fishName, " ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#8D9B98',
          fontVariantNumeric: 'tabular-nums'
        }
      }, "\xD7", qty)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: '#8D9B98'
        }
      }, "Heals ", healAmt, " HP \xB7 Sweet spot: ", Math.round(spot.width * 100), "%")), /*#__PURE__*/React.createElement("button", {
        style: {
          /* v2.3.1235: batch-3 rollout — 44px hitbox floor; secondary =
             raised + strong hairline, 10px button radius. */
          minHeight: 44,
          padding: '0 14px',
          borderRadius: 10,
          border: '1px solid rgba(229,237,233,.20)',
          fontSize: 13,
          fontWeight: 700,
          background: '#293B41',
          color: '#F4F0E7',
          cursor: 'pointer',
          fontFamily: 'inherit',
          flexShrink: 0
        },
        onClick: function onClick() {
          var _rpgState$lifeSkills16;
          var R = stateRef.current.rpg;
          if (!R.inventory[key] || R.inventory[key] < 1) return;
          R.inventory[key]--;
          if (R.inventory[key] <= 0) delete R.inventory[key];
          setRpgState(_objectSpread({}, R));
          /* Start minigame — fish is consumed whether you succeed or fail */
          setCookMinigame({
            fishKey: key,
            fishName: fishName,
            healAmt: healAmt,
            tier: tierLvl,
            sweetSpot: getCookingSweetSpot(((_rpgState$lifeSkills16 = rpgState.lifeSkills) === null || _rpgState$lifeSkills16 === void 0 || (_rpgState$lifeSkills16 = _rpgState$lifeSkills16.cooking) === null || _rpgState$lifeSkills16 === void 0 ? void 0 : _rpgState$lifeSkills16.level) || 1, tierLvl),
            started: Date.now(),
            result: null
          });
          BT_AUDIO.beep(400, 0.06, 0.08, 'sine');
        }
      }, "Cook"));
    }));
  }(), !cookMinigame && function () {
    var inv = rpgState.inventory || {};
    var cookedFish = Object.entries(inv).filter(function (_ref101) {
      var _ref102 = _slicedToArray(_ref101, 2),
        k = _ref102[0],
        v = _ref102[1];
      return v > 0 && k.startsWith('cooked_');
    });
    if (cookedFish.length === 0) return null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: _objectSpread(_objectSpread({}, LS_HEAD), {}, {
        marginTop: 4
      })
    }, "Cooked — Ready to Eat"), /*#__PURE__*/React.createElement("div", {
      style: LS_WELL
    }, cookedFish.map(function (_ref103, _ri) {
      var _ref104 = _slicedToArray(_ref103, 2),
        key = _ref104[0],
        qty = _ref104[1];
      var fishName = key.replace('cooked_', '').replace(/_/g, ' ');
      /* v2.3.1207: recovery-folded display heal — see the raw-fish list
         note above. */
      var healAmt = calcDisplayHeal((stateRef.current && stateRef.current.rpg) || rpgState, key);
      var atFull = rpgState.hp >= rpgState.maxHp; /* v2.3.1235: batch-3 rollout — style consumers below retinted only */
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '4px 8px',
          borderTop: _ri > 0 ? LS_DIV : 'none'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 18
        }
      }, "🍽️"), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: '#F4F0E7',
          textTransform: 'capitalize'
        }
      }, fishName, " ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#8D9B98',
          fontVariantNumeric: 'tabular-nums'
        }
      }, "\xD7", qty)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: '#8D9B98'
        }
      }, "Heals ", healAmt, " HP")), /*#__PURE__*/React.createElement("button", {
        style: {
          /* v2.3.1235: batch-3 rollout — 44px hitbox floor; disabled =
             quiet card fill + faint text (well-soft is retired). */
          minHeight: 44,
          padding: '0 14px',
          borderRadius: 10,
          border: atFull ? '1px solid rgba(229,237,233,.11)' : '1px solid rgba(229,237,233,.20)',
          fontSize: 13,
          fontWeight: 700,
          background: atFull ? '#24363C' : '#293B41',
          color: atFull ? '#667875' : '#F4F0E7',
          cursor: 'pointer',
          fontFamily: 'inherit',
          flexShrink: 0
        },
        onClick: function onClick() {
          if (atFull) return;
          var R = stateRef.current.rpg;
          if (!R.inventory[key] || R.inventory[key] < 1) return;
          var S = stateRef.current;
          /* Server-authoritative inventory + HP in MP: send eat_request
             and let the worker validate ownership + apply the heal +
             decrement.  Predict locally for snappy bar + popup feel;
             player_state arrives shortly and reconciles. */
          R.inventory[key]--;
          if (R.inventory[key] <= 0) delete R.inventory[key];
          var healed = Math.min(healAmt, R.maxHp - R.hp);
          R.hp = Math.min(R.maxHp, R.hp + healAmt);
          if (S._serverMonsters && S.channel) {
            try { S.channel.send({ type: 'eat_request', payload: { invKey: key } }); } catch (e) {}
          }
          setRpgState(_objectSpread({}, R));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R));
          } catch (e) {}
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, '+' + healed + ' HP', '#59BF91');
          BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
        }
      }, "Eat"));
    })));
  }(), /*#__PURE__*/React.createElement("div", {
    style: _objectSpread(_objectSpread({}, LS_HEAD), {}, {
      marginTop: 6
    })
  }, "Buff Recipes — Herbs"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
      marginBottom: 8
    }
  }, "Combine farmed herbs into combat buff meals. No timing needed — just ingredients."), /*#__PURE__*/React.createElement("div", {
    style: LS_WELL
  }, COOKING_RECIPES.map(function (recipe, ri) {
    var _rpgState$lifeSkills17;
    var cookLvl = ((_rpgState$lifeSkills17 = rpgState.lifeSkills) === null || _rpgState$lifeSkills17 === void 0 || (_rpgState$lifeSkills17 = _rpgState$lifeSkills17.cooking) === null || _rpgState$lifeSkills17 === void 0 ? void 0 : _rpgState$lifeSkills17.level) || 1;
    var canCook = cookLvl >= recipe.cookLvl;
    var inv = rpgState.inventory || {};
    var hasIngredients = Object.entries(recipe.ingredients).every(function (_ref105) {
      var _ref106 = _slicedToArray(_ref105, 2),
        type = _ref106[0],
        count = _ref106[1];
      var total = Object.entries(inv).filter(function (_ref107) {
        var _ref108 = _slicedToArray(_ref107, 2),
          k = _ref108[0],
          v = _ref108[1];
        return k.includes(type) && v > 0;
      }).reduce(function (sum, _ref109) {
        var _ref110 = _slicedToArray(_ref109, 2),
          k = _ref110[0],
          v = _ref110[1];
        return sum + v;
      }, 0);
      return total >= count;
    });
    var buffDesc = recipe.desc || (recipe.buff === 'heal' ? "Heals ".concat(recipe.power, " HP") : recipe.buff === 'all' ? "+".concat(Math.round(recipe.power * 100), "% all stats") : recipe.buff === 'regen' ? "+".concat(Math.round(recipe.power * 100), "% regen") : recipe.buff === 'resist' ? "+".concat(Math.round(recipe.power * 100), "% resist") : "+".concat(Math.round(recipe.power * 100), "% ").concat(recipe.buff));
    return /*#__PURE__*/React.createElement("div", {
      key: ri,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        padding: '6px 8px',
        borderTop: ri > 0 ? LS_DIV : 'none',
        /* v2.3.1235: batch-3 rollout — locked rows must stay readable
           (contract floor .55; the Lv requirement is stated in-row). */
        opacity: canCook ? 1 : 0.55
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18
      }
    }, "🍲"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: canCook ? '#F4F0E7' : '#667875'
      }
    }, recipe.name, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor */,
        fontWeight: 600,
        color: '#8D9B98'
      }
    }, "T", recipe.tier)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, buffDesc, recipe.duration ? " \xB7 ".concat(Math.round(recipe.duration / 60), "min") : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, "Needs: ", Object.entries(recipe.ingredients).map(function (_ref111) {
      var _ref112 = _slicedToArray(_ref111, 2),
        t = _ref112[0],
        c = _ref112[1];
      return c + '× ' + t.replace(/_/g, ' ');
    }).join(', '), !canCook && " \xB7 Req Cooking Lv".concat(recipe.cookLvl))), /*#__PURE__*/React.createElement("button", {
      style: {
        /* v2.3.1235: batch-3 rollout — 44px hitbox floor; secondary vs
           quiet-card disabled treatment on the approved tokens. */
        minHeight: 44,
        padding: '0 14px',
        borderRadius: 10,
        border: canCook && hasIngredients ? '1px solid rgba(229,237,233,.20)' : '1px solid rgba(229,237,233,.11)',
        fontSize: 13,
        fontWeight: 700,
        background: canCook && hasIngredients ? '#293B41' : '#24363C',
        color: canCook && hasIngredients ? '#F4F0E7' : '#667875',
        cursor: 'pointer',
        fontFamily: 'inherit',
        flexShrink: 0
      },
      onClick: function onClick() {
        if (!canCook || !hasIngredients) return;
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        var S = stateRef.current;
        /* Server-authoritative cooking recipes in MP: worker mirrors
           COOKING_RECIPES + validates ingredient ownership + applies
           buff/heal to ps + ps._buffs.  Local consume + buff timer
           stay as snappy visual prediction; player_state arrives
           shortly with the authoritative inventory + buff state. */
        if (S._serverMonsters && S.channel) {
          try { S.channel.send({ type: 'cook_recipe', payload: { recipeIdx: ri } }); } catch (e) {}
        }
        /* Consume ingredients */
        Object.entries(recipe.ingredients).forEach(function (_ref113) {
          var _ref114 = _slicedToArray(_ref113, 2),
            type = _ref114[0],
            count = _ref114[1];
          var remaining = count;
          Object.keys(R.inventory || {}).forEach(function (k) {
            if (remaining <= 0 || !k.includes(type)) return;
            var take = Math.min(R.inventory[k], remaining);
            R.inventory[k] -= take;
            remaining -= take;
            if (R.inventory[k] <= 0) delete R.inventory[k];
          });
        });
        /* Apply food buff */
        var dur = (recipe.duration || 0) * 1000;
        if (recipe.buff === 'heal') {
          R.hp = Math.min(R.maxHp, R.hp + recipe.power);
        }
        if (recipe.buff === 'regen') S._regenBuff = Date.now() + dur;
        if (recipe.buff === 'resist') S._resistBuff = Date.now() + dur;
        if (recipe.buff === 'damage') S._dmgBuff = Date.now() + dur;
        if (recipe.buff === 'all') {
          S._dmgBuff = Date.now() + dur;
          S._spdBuff = Date.now() + dur;
          S._hpBuff = Date.now() + dur;
          S._manaBuff = Date.now() + dur;
        }
        /* Cooking XP */
        var leveled = addLifeSkillXp(sk, 'cooking', recipe.tier * 25);
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.cookedRecipe = true;
        pushDmgPopup(S, S.player.x, S.player.y - 30, recipe.name + '!', '#ea580c');
        if (leveled) pushDmgPopup(S, S.player.x, S.player.y - 50, 'Cooking Lv' + sk.cooking.level + '!', '#D8A94D');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.collect();
      }
    }, "Cook"));
  })));
}
