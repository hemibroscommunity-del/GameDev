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
export function CookPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    cookMinigame = props.cookMinigame,
    setCookMinigame = props.setCookMinigame;
  var _rpgState$lifeSkills14, _rpgState$lifeSkills15, _rpgState$lifeSkills16, _rpgState$lifeSkills17;
  return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#ea580c',
      marginBottom: 4
    }
  }, "\uD83C\uDF73 Kitchen"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
    }
  }, "Cooking Lv", ((_rpgState$lifeSkills14 = rpgState.lifeSkills) === null || _rpgState$lifeSkills14 === void 0 || (_rpgState$lifeSkills14 = _rpgState$lifeSkills14.cooking) === null || _rpgState$lifeSkills14 === void 0 ? void 0 : _rpgState$lifeSkills14.level) || 1, " \xB7 Cook fish for healing. Prepare herb recipes for combat buffs."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#3498DB',
      marginBottom: 4
    }
  }, "\uD83D\uDC1F Cook Fish (Healing)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 4
    }
  }, "Raw fish \u2192 Cook (timing minigame) \u2192 Cooked fish you can eat to heal."), cookMinigame && !cookMinigame.result && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      background: 'rgba(234,88,12,.1)',
      border: '1px solid rgba(234,88,12,.3)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#ea580c',
      marginBottom: 4
    }
  }, "\uD83D\uDD25 Cooking: ", cookMinigame.fishName, " (Heals ", cookMinigame.healAmt, " HP)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
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
        height: 24,
        background: 'rgba(255,255,255,.08)',
        borderRadius: 4,
        overflow: 'hidden',
        margin: '0 auto 6px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: greenLeft,
        top: 0,
        width: greenW,
        height: '100%',
        background: 'rgba(61,220,151,.25)',
        borderLeft: '2px solid #3dd497',
        borderRight: '2px solid #3dd497'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: indX - 2,
        top: 0,
        width: 4,
        height: '100%',
        background: inZone ? '#3dd497' : '#ff5e6c',
        borderRadius: 2,
        boxShadow: inZone ? '0 0 8px #3dd497' : '0 0 8px #ff5e6c',
        transition: 'left 0.05s linear'
      }
    })), /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        padding: '6px 0',
        borderRadius: 6,
        border: 'none',
        fontSize: 11,
        fontWeight: 800,
        background: inZone ? '#3dd497' : '#ea580c',
        color: '#fff',
        cursor: 'pointer',
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
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Cooked ' + cookMinigame.fishName + '!', '#3dd497');
          if (leveled) pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 45, 'Cooking Lv' + sk.cooking.level + '!', '#f5c542');
          BT_AUDIO.collect();
          setCookMinigame(_objectSpread(_objectSpread({}, cookMinigame), {}, {
            result: 'success'
          }));
        } else {
          /* FAIL — burnt! Fish consumed, nothing gained */
          addLifeSkillXp(sk, 'cooking', 1);
          if (!R._compStats) R._compStats = createDefaultCompStats();
          R._compStats.cookBurns++;
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Burnt! Fish wasted.', '#ff5e6c');
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
    }, "\uD83C\uDF73 COOK!"));
  }()), (cookMinigame === null || cookMinigame === void 0 ? void 0 : cookMinigame.result) && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      marginBottom: 8,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: 800,
      background: cookMinigame.result === 'success' ? 'rgba(61,220,151,.15)' : 'rgba(255,94,108,.15)',
      border: cookMinigame.result === 'success' ? '1px solid rgba(61,220,151,.3)' : '1px solid rgba(255,94,108,.3)',
      color: cookMinigame.result === 'success' ? '#3dd497' : '#ff5e6c'
    }
  }, cookMinigame.result === 'success' ? '✅ Perfectly cooked!' : '🔥 Burnt to a crisp!'), !cookMinigame && function () {
    var inv = rpgState.inventory || {};
    var rawFish = Object.entries(inv).filter(function (_ref97) {
      var _ref98 = _slicedToArray(_ref97, 2),
        k = _ref98[0],
        v = _ref98[1];
      return v > 0 && k.startsWith('fish_');
    });
    if (rawFish.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.25)',
        marginBottom: 8
      }
    }, "No raw fish. Catch some at fishing spots in combat zones!");
    return rawFish.map(function (_ref99) {
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
          gap: 6,
          marginBottom: 4,
          padding: '4px 6px',
          borderRadius: 6,
          background: 'rgba(52,152,219,.06)',
          border: '1px solid rgba(52,152,219,.15)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14
        }
      }, "\uD83D\uDC1F"), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: '#3498DB',
          textTransform: 'capitalize'
        }
      }, fishName, " ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(255,255,255,.3)'
        }
      }, "\xD7", qty)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.4)'
        }
      }, "Heals ", healAmt, " HP \xB7 Sweet spot: ", Math.round(spot.width * 100), "%")), /*#__PURE__*/React.createElement("button", {
        style: {
          padding: '3px 8px',
          borderRadius: 5,
          border: 'none',
          fontSize: 8,
          fontWeight: 700,
          background: '#ea580c',
          color: '#fff',
          cursor: 'pointer'
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
    });
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
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#3dd497',
        marginTop: 6,
        marginBottom: 4
      }
    }, "\uD83C\uDF7D\uFE0F Cooked Fish (Ready to Eat)"), cookedFish.map(function (_ref103) {
      var _ref104 = _slicedToArray(_ref103, 2),
        key = _ref104[0],
        qty = _ref104[1];
      var fishName = key.replace('cooked_', '').replace(/_/g, ' ');
      /* v2.3.1207: recovery-folded display heal — see the raw-fish list
         note above. */
      var healAmt = calcDisplayHeal((stateRef.current && stateRef.current.rpg) || rpgState, key);
      var atFull = rpgState.hp >= rpgState.maxHp;
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
          padding: '4px 6px',
          borderRadius: 6,
          background: 'rgba(61,220,151,.06)',
          border: '1px solid rgba(61,220,151,.15)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14
        }
      }, "\uD83C\uDF7D\uFE0F"), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: '#3dd497',
          textTransform: 'capitalize'
        }
      }, fishName, " ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(255,255,255,.3)'
        }
      }, "\xD7", qty)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.4)'
        }
      }, "Heals ", healAmt, " HP")), /*#__PURE__*/React.createElement("button", {
        style: {
          padding: '3px 8px',
          borderRadius: 5,
          border: 'none',
          fontSize: 8,
          fontWeight: 700,
          background: atFull ? 'rgba(255,255,255,.08)' : '#3dd497',
          color: atFull ? 'rgba(255,255,255,.3)' : '#000',
          cursor: 'pointer'
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
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, '+' + healed + ' HP', '#3dd497');
          BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
        }
      }, "Eat"));
    }));
  }(), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#ea580c',
      marginTop: 10,
      marginBottom: 4
    }
  }, "\uD83C\uDF3F Buff Recipes (Herbs)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 4
    }
  }, "Combine farmed herbs into combat buff meals. No timing needed \u2014 just ingredients."), COOKING_RECIPES.map(function (recipe, ri) {
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
        gap: 6,
        marginBottom: 5,
        padding: '6px 8px',
        borderRadius: 8,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)',
        opacity: canCook ? 1 : 0.5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, "\uD83C\uDF72"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: canCook ? '#fff' : '#666'
      }
    }, recipe.name, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "T", recipe.tier)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.4)'
      }
    }, buffDesc, recipe.duration ? " \xB7 ".concat(Math.round(recipe.duration / 60), "min") : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)'
      }
    }, "Needs: ", Object.entries(recipe.ingredients).map(function (_ref111) {
      var _ref112 = _slicedToArray(_ref111, 2),
        t = _ref112[0],
        c = _ref112[1];
      return c + '× ' + t.replace(/_/g, ' ');
    }).join(', '), !canCook && " \xB7 Req Cooking Lv".concat(recipe.cookLvl))), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: canCook && hasIngredients ? '#ea580c' : 'rgba(255,255,255,.08)',
        color: canCook && hasIngredients ? '#fff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
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
        if (leveled) pushDmgPopup(S, S.player.x, S.player.y - 50, 'Cooking Lv' + sk.cooking.level + '!', '#f5c542');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.collect();
      }
    }, "Cook"));
  }));
}
