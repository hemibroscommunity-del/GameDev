import React from 'react';
import { BT_AUDIO, RESOURCE_TIERS, TILE, ZONES, ZONE_RESOURCES, addLifeSkillXp, generateZoneMap, updateZoneDimensions } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

/* === FarmPanel — buildingPanel === 'farm' sub-panel === */
/* v2.3.877: extracted verbatim from the buildingPanel === 'farm'
   clause in BroTown.jsx (the farm plot manager: plant/harvest crops,
   regenerate the farm_home zone map). Behavior-frozen UI decomposition;
   the gate stays in BroTown. 4 props (rpgState, stateRef, setRpgState,
   setBuildingPanel). Data imports verified real exports (generateZoneMap
   and updateZoneDimensions come from gameSystems via the @/data barrel);
   spread/slice babel helpers imported; hoisted optional-chaining temps
   declared locally. */
export function FarmPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    setBuildingPanel = props.setBuildingPanel;
  var _rpgState$lifeSkills18, _stateRef$current7;
  return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#3dd497',
      marginBottom: 4
    }
  }, "\uD83C\uDF3E Farm"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Farming Lv", ((_rpgState$lifeSkills18 = rpgState.lifeSkills) === null || _rpgState$lifeSkills18 === void 0 || (_rpgState$lifeSkills18 = _rpgState$lifeSkills18.farming) === null || _rpgState$lifeSkills18 === void 0 ? void 0 : _rpgState$lifeSkills18.level) || 1, " \xB7 Plant seeds from zones, harvest when grown."), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '8px',
      borderRadius: 8,
      border: '1px solid rgba(61,220,151,.3)',
      background: 'rgba(61,220,151,.1)',
      color: '#3dd497',
      fontWeight: 700,
      fontSize: 11,
      cursor: 'pointer',
      marginBottom: 8
    },
    onClick: function onClick() {
      var S2 = stateRef.current,
        P2 = S2.player;
      S2.currentZone = 'farm_home';
      updateZoneDimensions('farm_home');
      S2.map = generateZoneMap('farm_home');
      S2.monsters = [];
      S2.gatherNodes = [];
      S2.npcs = null;
      var fz = ZONES.farm_home;
      P2.x = Math.floor(fz.w / 2) * TILE;
      P2.y = (fz.h - 4) * TILE;
      S2.groundLoot = [];
      S2.hitParticles = [];
      S2.deathExplosions = [];
      S2.arrows = [];
      S2._ambientParticles = [];
      S2._zoneWipe = Date.now();
      S2.dmgNumbers.push({
        x: P2.x,
        y: P2.y - 40,
        text: 'Your Farm',
        color: '#3dd497',
        ts: Date.now()
      });
      BT_AUDIO.beep(500, 0.08, 0.1, 'sine');
      setBuildingPanel(null);
    }
  }, "\uD83C\uDFE1 Visit Your Farm"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Your farm has a house where you can sleep to fully restore HP, Mana, Stamina and gain a 30-min Well Rested buff (+10% XP).", ((_stateRef$current7 = stateRef.current) === null || _stateRef$current7 === void 0 || (_stateRef$current7 = _stateRef$current7.rpg) === null || _stateRef$current7 === void 0 ? void 0 : _stateRef$current7._wellRestedUntil) && Date.now() < stateRef.current.rpg._wellRestedUntil && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#3dd497'
    }
  }, " \xB7 \uD83D\uDE34 Well Rested active!")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 6,
      marginBottom: 8
    }
  }, [0, 1, 2, 3, 4, 5].map(function (plotIdx) {
    var _rpgState$lifeSkills19, _rpgState$lifeSkills20;
    var plot = (_rpgState$lifeSkills19 = rpgState.lifeSkills) === null || _rpgState$lifeSkills19 === void 0 || (_rpgState$lifeSkills19 = _rpgState$lifeSkills19.farmPlots) === null || _rpgState$lifeSkills19 === void 0 ? void 0 : _rpgState$lifeSkills19[plotIdx];
    var isGrowing = plot && plot.plantedAt && Date.now() / 1000 < plot.plantedAt + plot.growTime;
    var isReady = plot && plot.plantedAt && Date.now() / 1000 >= plot.plantedAt + plot.growTime;
    var progress = plot ? Math.min(1, (Date.now() / 1000 - plot.plantedAt) / plot.growTime) : 0;
    var farmLvl = ((_rpgState$lifeSkills20 = rpgState.lifeSkills) === null || _rpgState$lifeSkills20 === void 0 || (_rpgState$lifeSkills20 = _rpgState$lifeSkills20.farming) === null || _rpgState$lifeSkills20 === void 0 ? void 0 : _rpgState$lifeSkills20.level) || 1;
    var plotUnlocked = plotIdx < 2 || plotIdx < 4 && farmLvl >= 10 || farmLvl >= 25;
    return /*#__PURE__*/React.createElement("div", {
      key: plotIdx,
      style: {
        padding: 8,
        borderRadius: 8,
        textAlign: 'center',
        minHeight: 70,
        background: isReady ? 'rgba(61,220,151,.1)' : isGrowing ? 'rgba(245,197,66,.06)' : 'rgba(255,255,255,.03)',
        border: "1px solid ".concat(isReady ? 'rgba(61,220,151,.3)' : isGrowing ? 'rgba(245,197,66,.2)' : 'rgba(255,255,255,.08)'),
        opacity: plotUnlocked ? 1 : 0.4
      }
    }, !plotUnlocked ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        marginTop: 16
      }
    }, "\uD83D\uDD12 Farm Lv", plotIdx < 4 ? 10 : 25) : isReady ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18
      }
    }, plot.emoji || '🌱'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: '#3dd497'
      }
    }, "Ready!"), /*#__PURE__*/React.createElement("button", {
      style: {
        marginTop: 4,
        padding: '2px 8px',
        borderRadius: 4,
        border: 'none',
        fontSize: 8,
        fontWeight: 700,
        background: '#3dd497',
        color: '#000',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        var sk = R.lifeSkills;
        var p = sk.farmPlots[plotIdx];
        var invKey = (p.rType || 'herb') + '_' + p.name.replace(/\s+/g, '_').toLowerCase();
        if (!R.inventory) R.inventory = {};
        R.inventory[invKey] = (R.inventory[invKey] || 0) + (1 + Math.floor(Math.random() * p.tier));
        addLifeSkillXp(sk, 'farming', p.tier * 20);
        delete sk.farmPlots[plotIdx];
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.harvestedCrop = true;
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.collect();
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Harvested ' + p.name + '!',
          color: '#3dd497',
          ts: Date.now()
        });
      }
    }, "Harvest")) : isGrowing ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14
      }
    }, plot.emoji || '🌱'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: '#f5c542',
        marginTop: 2
      }
    }, plot.name), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 3,
        background: 'rgba(255,255,255,.1)',
        borderRadius: 2,
        marginTop: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: progress * 100 + '%',
        height: '100%',
        background: '#f5c542',
        borderRadius: 2
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.3)',
        marginTop: 2
      }
    }, Math.ceil((plot.plantedAt + plot.growTime - Date.now() / 1000) / 60), "m left")) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        marginTop: 16
      }
    }, "Empty plot"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 4
    }
  }, "Plant seeds:"), function () {
    var seeds = [];
    var inv = rpgState.inventory || {};
    Object.entries(ZONE_RESOURCES).forEach(function (_ref115) {
      var _ref116 = _slicedToArray(_ref115, 2),
        elem = _ref116[0],
        res = _ref116[1];
      ['crystal', 'ore', 'herb'].forEach(function (rType) {
        [1, 2, 3, 4, 5].forEach(function (tier) {
          var _RESOURCE_TIERS$tier;
          var tierLabel = ((_RESOURCE_TIERS$tier = RESOURCE_TIERS[tier]) === null || _RESOURCE_TIERS$tier === void 0 ? void 0 : _RESOURCE_TIERS$tier.label) || 'Rough';
          var name = tierLabel + ' ' + res[rType];
          var key = rType + '_' + name.replace(/\s+/g, '_').toLowerCase();
          if ((inv[key] || 0) > 0) {
            seeds.push({
              key: key,
              name: name,
              emoji: rType === 'crystal' ? '💎' : rType === 'ore' ? '⛏️' : '🌿',
              count: inv[key],
              tier: tier,
              elem: elem,
              rType: rType
            });
          }
        });
      });
    });
    if (seeds.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "No seeds. Gather resources from zones!");
    return seeds.slice(0, 8).map(function (seed) {
      return /*#__PURE__*/React.createElement("div", {
        key: seed.key,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 3,
          padding: '3px 6px',
          borderRadius: 4,
          background: 'rgba(255,255,255,.03)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12
        }
      }, seed.emoji), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 8,
          flex: 1,
          color: 'rgba(255,255,255,.6)'
        }
      }, seed.name, " \xD7", seed.count), /*#__PURE__*/React.createElement("button", {
        style: {
          padding: '1px 6px',
          borderRadius: 3,
          border: 'none',
          fontSize: 7,
          fontWeight: 700,
          background: '#3dd497',
          color: '#000',
          cursor: 'pointer'
        },
        onClick: function onClick() {
          var R = stateRef.current.rpg;
          var sk = R.lifeSkills;
          if (!sk.farmPlots) sk.farmPlots = {};
          /* Find empty plot */
          var emptyIdx = [0, 1, 2, 3, 4, 5].find(function (i) {
            var _sk$farming, _sk$farming2;
            return !sk.farmPlots[i] && (i < 2 || i < 4 && ((_sk$farming = sk.farming) === null || _sk$farming === void 0 ? void 0 : _sk$farming.level) >= 10 || ((_sk$farming2 = sk.farming) === null || _sk$farming2 === void 0 ? void 0 : _sk$farming2.level) >= 25);
          });
          if (emptyIdx === undefined) {
            stateRef.current.dmgNumbers.push({
              x: stateRef.current.player.x,
              y: stateRef.current.player.y - 30,
              text: 'No empty plots!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return;
          }
          if (!R.inventory) R.inventory = {};
          if ((R.inventory[seed.key] || 0) < 1) return;
          R.inventory[seed.key]--;
          if (R.inventory[seed.key] <= 0) delete R.inventory[seed.key];
          /* Plant! Growth time: tier 1=1min, tier 2=5min, tier 3=15min, tier 4=30min, tier 5=60min */
          var growTimes = [0, 60, 300, 900, 1800, 3600];
          sk.farmPlots[emptyIdx] = {
            name: seed.name,
            emoji: seed.emoji,
            tier: seed.tier,
            element: seed.elem,
            rType: seed.rType,
            plantedAt: Math.floor(Date.now() / 1000),
            growTime: growTimes[seed.tier] || 60
          };
          setRpgState(_objectSpread({}, R));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R));
          } catch (e) {}
          BT_AUDIO.beep(400, 0.06, 0.1, 'sine');
          stateRef.current.dmgNumbers.push({
            x: stateRef.current.player.x,
            y: stateRef.current.player.y - 30,
            text: 'Planted ' + seed.name,
            color: '#3dd497',
            ts: Date.now()
          });
        }
      }, "Plant"));
    });
  }(), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)',
      marginTop: 8,
      lineHeight: 1.5
    }
  }, "Plots unlock at Farming Lv1 (\xD72), Lv10 (\xD74), Lv25 (\xD76). Higher tier resources grow longer but yield more. Deeper zones have rarer resources \u2014 complete dungeons to access them."));
}
