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
/* v2.3.1235: batch-3 rollout — correction-pass token remap (game.css
   :root). The v2.3.1232 literals were the superseded v2.3.1227
   palette; same roles, approved values. Four depth roles only, so
   wellSoft folds into the well, and the off-token .08/.14 hairlines
   fold into the approved .11 line (.20 borderStrong added for
   secondary buttons). Header strip adopts the #27393F header token. */
/* v2.3.1235: state-correction — locked plot tiles lose the parent
   opacity and gain a 16px ls-lock glyph + "Unlocks at Farming Lv10/25"
   in #8D9B98; empty-USABLE plots read "Empty · No seeds" when nothing
   is plantable, so empty-usable never looks like locked. Handlers
   byte-identical. */
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
export function FarmPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    setBuildingPanel = props.setBuildingPanel;
  var _rpgState$lifeSkills18, _stateRef$current7;
  /* v2.3.1235: state-correction — "do I own any plantable seed?"
     derived from the SAME ZONE_RESOURCES × rType × tier enumeration
     the Plant-seeds list below uses, so the empty-plot caption can
     never disagree with the list. Display derivation only. */
  var hasPlantableSeeds = function () {
    var inv = rpgState.inventory || {};
    var found = false;
    Object.entries(ZONE_RESOURCES).forEach(function (_refSeed) {
      var res = _slicedToArray(_refSeed, 2)[1];
      ['crystal', 'ore', 'herb'].forEach(function (rType) {
        [1, 2, 3, 4, 5].forEach(function (tier) {
          var _RESOURCE_TIERS$seed;
          var tierLabel = ((_RESOURCE_TIERS$seed = RESOURCE_TIERS[tier]) === null || _RESOURCE_TIERS$seed === void 0 ? void 0 : _RESOURCE_TIERS$seed.label) || 'Rough';
          var key = rType + '_' + (tierLabel + ' ' + res[rType]).replace(/\s+/g, '_').toLowerCase();
          if ((inv[key] || 0) > 0) found = true;
        });
      });
    });
    return found;
  }();
  return React.createElement("div", { style: LS_WRAP },
    lsHeader('farm', '🌾', "Farm", "Farming Lv" + (((_rpgState$lifeSkills18 = rpgState.lifeSkills) === null || _rpgState$lifeSkills18 === void 0 || (_rpgState$lifeSkills18 = _rpgState$lifeSkills18.farming) === null || _rpgState$lifeSkills18 === void 0 ? void 0 : _rpgState$lifeSkills18.level) || 1)),
    React.createElement("div", { style: LS_BODY },
      React.createElement("div", { style: { fontSize: 12, color: LS.txt2, marginBottom: 10, lineHeight: 1.5 } },
        "Plant seeds from zones, harvest when grown."),
      /*#__PURE__*/React.createElement("button", {
        /* v2.3.1235: batch-3 rollout — the panel's single gold primary
           adopts the shared .button-primary recipe (game.css) instead
           of a flat brass fill (the class carries the approved 10px
           radius; 11 is off the approved set). */
        className: "button-primary",
        style: {
          width: '100%',
          minHeight: 44,
          padding: '10px 12px',
          fontSize: 13,
          cursor: 'pointer',
          marginBottom: 8
        },
        onClick: function onClick() {
          var S2 = stateRef.current,
            P2 = S2.player;
          /* v2.3.1406: farm map no longer preloads at startup (per-zone
             loading) and this warp bypasses the hub-exit gate — kick the
             load now so the ground paints instead of flashing black;
             tileRenderer's cache-miss self-heal is the backstop. */
          import('@/rendering/preloadAnimations.js').then(function (m) { return m.preloadZoneAssets('farm_home'); }).catch(function () {});
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
      }, "Visit Your Farm") /* v2.3.1235: batch-3 rollout — 🏡 dropped, no emoji in chrome */,
      React.createElement("div", {
        style: { fontSize: 11, color: LS.txt3, marginBottom: 12, lineHeight: 1.5 }
      }, "Your farm has a house where you can sleep to fully restore HP, Mana, Stamina and gain a 30-min Well Rested buff (+10% XP).", ((_stateRef$current7 = stateRef.current) === null || _stateRef$current7 === void 0 || (_stateRef$current7 = _stateRef$current7.rpg) === null || _stateRef$current7 === void 0 ? void 0 : _stateRef$current7._wellRestedUntil) && Date.now() < stateRef.current.rpg._wellRestedUntil && /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#55B98A' /* v2.3.1235: batch-3 rollout — approved positive token */
        }
      }, " \xB7 Well Rested active!" /* v2.3.1235: batch-3 rollout — 😴 dropped, no emoji in chrome */)),
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
            /* v2.3.1235: batch-3 rollout — plot state moves off the
               unapproved rgba tints: quiet well cell + semantic EDGE
               (positive #55B98A ready / stamina #DFAE4E growing) so
               state is a thin edge language, never a tile fill; locked
               plots meet the .55 readability floor (was .4). */
            background: LS.wellSoft,
            border: '1px solid ' + (isReady ? '#55B98A' : isGrowing ? '#DFAE4E' : LS.wellBorder)
            /* v2.3.1235: state-correction — NO parent opacity on locked
               tiles (four-state row model): the lock glyph + plain-
               language requirement carry the state instead of a dim. */
          }
        }, !plotUnlocked ? /*#__PURE__*/React.createElement("div", {
          /* v2.3.1235: state-correction — 16px ls-lock glyph (game.css
             CSS-mask padlock, inherits currentColor) + "Unlocks at
             Farming LvN" in #8D9B98. */
          style: {
            fontSize: 11,
            color: LS.txt3,
            marginTop: 10
          }
        }, /*#__PURE__*/React.createElement("span", {
          className: "ls-lock",
          "aria-hidden": true,
          style: {
            width: 16,
            height: 16
          }
        }), /*#__PURE__*/React.createElement("div", {
          style: {
            marginTop: 2
          }
        }, "Unlocks at Farming Lv", plotIdx < 4 ? 10 : 25)) : isReady ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 18
          }
        }, plot.emoji || '🌱'), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            fontWeight: 700,
            color: '#55B98A' /* v2.3.1235: batch-3 rollout — approved positive token */
          }
        }, "Ready!"), /*#__PURE__*/React.createElement("button", {
          /* v2.3.1235: batch-3 rollout — 44px transparent hit wrapper
             around the 32px pill visual (contract hitbox floor; the
             established chipHit pattern) — the bare pill was ~26px. */
          style: {
            minHeight: 44,
            padding: 0,
            margin: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
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
        }, /*#__PURE__*/React.createElement("span", {
          /* v2.3.1235: batch-3 rollout — pill visual inside the hit
             wrapper; approved positive token replaces the rgba edge. */
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 32,
            padding: '4px 12px',
            borderRadius: 999,
            border: '1px solid #55B98A',
            fontSize: 11,
            fontWeight: 700,
            background: LS.raised,
            color: '#55B98A'
          }
        }, "Harvest"))) : isGrowing ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 14
          }
        }, plot.emoji || '🌱'), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor (was 10) */,
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
            background: '#DFAE4E' /* v2.3.1235: batch-3 rollout — approved stamina token for the growth bar */,
            borderRadius: 999
          }
        })), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor (was 10) */,
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
        }, hasPlantableSeeds ? "Empty plot" : "Empty \xB7 No seeds" /* v2.3.1235: state-correction — empty-usable reads differently from locked; no seeds states why nothing can be planted */));
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
            /* v2.3.1235: batch-3 rollout — divided list rows replace
               the per-row well cards (contract: dividers over per-row
               cards); the first row's top hairline doubles as the rule
               under the module header. Seed glyphs are game data. */
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 2px',
              minHeight: 44,
              borderTop: '1px solid ' + LS.divider
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
            /* v2.3.1235: batch-3 rollout — Plant becomes a standard
               secondary (raised + strong hairline, 10px radius) at the
               44px hitbox floor (was a 32px pill). */
            style: {
              padding: '6px 14px',
              minHeight: 44,
              borderRadius: 10,
              border: '1px solid ' + LS.borderStrong,
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
