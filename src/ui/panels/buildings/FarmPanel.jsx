import React from 'react';
import { BT_AUDIO, RESOURCE_TIERS, TILE, ZONES, ZONE_RESOURCES, addLifeSkillXp, generateZoneMap, updateZoneDimensions } from '@/data/index.js';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === FarmPanel — buildingPanel === 'farm' sub-panel === */
/* v2.3.877: extracted verbatim from the buildingPanel === 'farm'
   clause in BroTown.jsx (the farm plot manager: plant/harvest crops,
   regenerate the farm_home zone map). Behavior-frozen UI decomposition;
   the gate stays in BroTown. 4 props (rpgState, stateRef, setRpgState,
   setBuildingPanel). Data imports verified real exports (generateZoneMap
   and updateZoneDimensions come from gameSystems via the @/data barrel);
   spread/slice babel helpers imported; hoisted optional-chaining temps
   declared locally. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   header strip + building icon; Visit Farm is the panel's brass
   primary; plots as well cells with semantic ready/growing edges; seed
   list as 44px well rows. Style/JSX only; visit/plant/harvest handlers
   are byte-identical. LS token block duplicated per building panel to
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
export function FarmPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    setBuildingPanel = props.setBuildingPanel;
  var _rpgState$lifeSkills18, _stateRef$current7;
  return React.createElement("div", { style: LS_WRAP },
    lsHeader('farm', '🌾', "Farm", "Farming Lv" + (((_rpgState$lifeSkills18 = rpgState.lifeSkills) === null || _rpgState$lifeSkills18 === void 0 || (_rpgState$lifeSkills18 = _rpgState$lifeSkills18.farming) === null || _rpgState$lifeSkills18 === void 0 ? void 0 : _rpgState$lifeSkills18.level) || 1)),
    React.createElement("div", { style: LS_BODY },
      React.createElement("div", { style: { fontSize: 12, color: LS.txt2, marginBottom: 10, lineHeight: 1.5 } },
        "Plant seeds from zones, harvest when grown."),
      /*#__PURE__*/React.createElement("button", {
        style: {
          width: '100%',
          minHeight: 44,
          padding: '10px 12px',
          borderRadius: 11,
          border: 'none',
          background: LS.brass,
          color: LS.onBrass,
          fontWeight: 700,
          fontSize: 13,
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
          pushDmgPopup(S2, P2.x, P2.y - 40, 'Your Farm', '#59BF91');
          BT_AUDIO.beep(500, 0.08, 0.1, 'sine');
          setBuildingPanel(null);
        }
      }, "🏡 Visit Your Farm"),
      React.createElement("div", {
        style: { fontSize: 11, color: LS.txt3, marginBottom: 12, lineHeight: 1.5 }
      }, "Your farm has a house where you can sleep to fully restore HP, Mana, Stamina and gain a 30-min Well Rested buff (+10% XP).", ((_stateRef$current7 = stateRef.current) === null || _stateRef$current7 === void 0 || (_stateRef$current7 = _stateRef$current7.rpg) === null || _stateRef$current7 === void 0 ? void 0 : _stateRef$current7._wellRestedUntil) && Date.now() < stateRef.current.rpg._wellRestedUntil && /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#59BF91'
        }
      }, " \xB7 😴 Well Rested active!")),
      React.createElement("div", { style: LS_MOD }, "Plots"),
      React.createElement("div", {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gap: 6,
          marginBottom: 12
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
            background: isReady ? 'rgba(89,191,145,.10)' : LS.wellSoft,
            border: '1px solid ' + (isReady ? 'rgba(89,191,145,.45)' : isGrowing ? 'rgba(216,169,77,.35)' : LS.wellBorder),
            opacity: plotUnlocked ? 1 : 0.4
          }
        }, !plotUnlocked ? /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: LS.txt3,
            marginTop: 16
          }
        }, "🔒 Farm Lv", plotIdx < 4 ? 10 : 25) : isReady ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 18
          }
        }, plot.emoji || '🌱'), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            fontWeight: 700,
            color: '#59BF91'
          }
        }, "Ready!"), /*#__PURE__*/React.createElement("button", {
          style: {
            marginTop: 4,
            padding: '4px 12px',
            borderRadius: 999,
            border: '1px solid rgba(89,191,145,.45)',
            fontSize: 11,
            fontWeight: 700,
            background: LS.raised,
            color: '#59BF91',
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
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Harvested ' + p.name + '!', '#59BF91');
          }
        }, "Harvest")) : isGrowing ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 14
          }
        }, plot.emoji || '🌱'), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 10,
            color: LS.txt2,
            marginTop: 2
          }
        }, plot.name), /*#__PURE__*/React.createElement("div", {
          style: {
            height: 4,
            background: LS.well,
            borderRadius: 999,
            marginTop: 4,
            overflow: 'hidden'
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            width: progress * 100 + '%',
            height: '100%',
            background: '#D8A94D',
            borderRadius: 999
          }
        })), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 10,
            color: LS.txt3,
            marginTop: 2,
            fontVariantNumeric: 'tabular-nums'
          }
        }, Math.ceil((plot.plantedAt + plot.growTime - Date.now() / 1000) / 60), "m left")) : /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: LS.dis,
            marginTop: 16
          }
        }, "Empty plot"));
      })),
      React.createElement("div", { style: LS_MOD }, "Plant seeds"),
      function () {
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
            fontSize: 12,
            color: LS.txt3
          }
        }, "No seeds. Gather resources from zones!");
        return seeds.slice(0, 8).map(function (seed) {
          return /*#__PURE__*/React.createElement("div", {
            key: seed.key,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
              padding: '6px 10px',
              minHeight: 44,
              borderRadius: 8,
              background: LS.wellSoft,
              border: '1px solid ' + LS.wellBorder
            }
          }, /*#__PURE__*/React.createElement("span", {
            style: {
              fontSize: 14,
              flexShrink: 0
            }
          }, seed.emoji), /*#__PURE__*/React.createElement("span", {
            style: {
              fontSize: 12,
              flex: 1,
              color: LS.txt2,
              fontVariantNumeric: 'tabular-nums'
            }
          }, seed.name, " \xD7", seed.count), /*#__PURE__*/React.createElement("button", {
            style: {
              padding: '6px 12px',
              minHeight: 32,
              borderRadius: 999,
              border: '1px solid ' + LS.border,
              fontSize: 12,
              fontWeight: 700,
              background: LS.raised,
              color: LS.txt1,
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
                pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'No empty plots!', '#D95C54');
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
              pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Planted ' + seed.name, '#59BF91');
            }
          }, "Plant"));
        });
      }(),
      React.createElement("div", {
        style: {
          fontSize: 11,
          color: LS.txt3,
          marginTop: 10,
          lineHeight: 1.5
        }
      }, "Plots unlock at Farming Lv1 (\xD72), Lv10 (\xD74), Lv25 (\xD76). Higher tier resources grow longer but yield more. Deeper zones have rarer resources — complete dungeons to access them.")));
}
