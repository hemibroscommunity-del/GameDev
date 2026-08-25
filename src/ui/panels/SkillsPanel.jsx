import React from 'react';
import { LIFE_SKILL_XP, QUEST_CHAINS, QUEST_STATUS, ZONE_RESOURCES, createDefaultCompStats, questObjectiveDone } from '@/data/index.js';
import { _slicedToArray } from '@/lib/babelHelpers.js';

/* ═══ SkillsPanel — life-skill levels / resources / quest progress ═══ */
/* v2.3.865: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. 3
   props (rpgState, stateRef, setShowSkills — display-only, no setRpgState).
   LIFE_SKILL_XP/QUEST_CHAINS/QUEST_STATUS/ZONE_RESOURCES/
   createDefaultCompStats + babel imported (real exports verified).
   `_rpgState$lifeSkills46` hoisted babel temp declared locally. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   presentation only: every state read, handler, and conditional is
   unchanged. Skill identity now uses the UI-Bible skill-*.webp icons
   with the emoji-fallback pattern from src/ui/mobile/dash/SkillsPanel.jsx;
   XP bars use the spec track/fill/overlay; sections are grouped with
   11/600 uppercase headers + dividers instead of colored mini-labels. */

/* v2.3.1232: Lantern Slate style tokens — local so this legacy panel needs
   no new shared module (parallel-session safety). */
/* v2.3.1235: batch-2 rollout — correction-pass retint: the v2.3.1227
   literals (#202C32 / #121B20 / rgba(238,242,235,…)) are off the
   owner-approved token list; surfaces now read the :root --ui-* vars
   (game.css) so this panel shifts with any future palette pass, and
   the card/well copy the shared .ui-panel/.ui-well shadow recipes
   instead of the retired v2.3.1227 ones.  Headers move to the locked
   11/700 .14em ladder (were 11/600 .12em). */
var LS_CARD = {
  background: 'var(--ui-sheet)',
  border: '1px solid var(--ui-line-strong)',
  borderRadius: 14,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045), 0 14px 36px rgba(3,8,10,0.30)',
  textAlign: 'left'
};
var LS_HEADER = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.14em',
  color: 'var(--ui-text-muted)'
};
var LS_WELL = {
  background: 'linear-gradient(180deg, #132329, #111E23)',
  border: '1px solid var(--ui-line)',
  borderRadius: 10,
  boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)'
};
var LS_DIVIDER = '1px solid var(--ui-line)';
var LS_SECTION = { borderTop: LS_DIVIDER, paddingTop: 12, marginTop: 12 };

/* v2.3.1232: UI-Bible icon with emoji fallback (onError replaceWith
   pattern from src/ui/mobile/dash/SkillsPanel.jsx) */
var lsIcon = function lsIcon(src, emoji, size) {
  return React.createElement('img', {
    src: src,
    alt: '',
    draggable: false,
    style: { width: size || 18, height: size || 18, objectFit: 'contain', flex: 'none' },
    onError: function (e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }
  });
};

/* v2.3.1232: spec XP bar — well-deep track (radius 999, inner shadow) +
   flat XP-green fill under a white .20→transparent 55% vertical overlay. */
/* v2.3.1235: batch-2 rollout — track #0B1216→well-deep #0B161B and
   fill #61B06B→#58B97B (--ui-xp): the old pair pre-dates the approved
   correction-pass tokens. */
var lsXpBar = function lsXpBar(pct) {
  return React.createElement('div', {
    style: {
      height: 6,
      background: 'var(--ui-well-deep)',
      borderRadius: 999,
      overflow: 'hidden',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)'
    }
  }, React.createElement('div', {
    style: {
      width: pct + '%',
      height: '100%',
      borderRadius: 999,
      background: 'linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,0) 55%) #58B97B',
      transition: 'width 180ms cubic-bezier(.2,.8,.2,1)'
    }
  }));
};

/* v2.3.1232: one 44px skill row — icon / name / Lv value, bar, caption. */
var lsSkillRow = function lsSkillRow(sk, skill, xpNeeded, xpPct) {
  return React.createElement('div', {
    key: sk.key,
    style: { minHeight: 44, marginBottom: 10 }
  }, React.createElement('div', {
    style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }
  }, sk.iconSrc ? lsIcon(sk.iconSrc, sk.icon, 20) : React.createElement('span', { style: { fontSize: 16 } }, sk.icon), React.createElement('span', {
    style: { flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--ui-text)' }
  }, sk.name), React.createElement('span', {
    style: { fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ui-text)' }
  }, 'Lv ', skill.level)), lsXpBar(xpPct), React.createElement('div', {
    /* v2.3.1235: batch-2 rollout — 10px caption was below the locked
       11px text floor. */
    style: { fontSize: 11, fontWeight: 600, color: 'var(--ui-text-muted)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }
  }, skill.xp, '/', xpNeeded, ' XP \xB7 ', sk.desc));
};

/* v2.3.1232: quiet empty-state well (shared look across sections) */
var lsEmpty = function lsEmpty(text) {
  return React.createElement('div', {
    style: Object.assign({}, LS_WELL, {
      fontSize: 12,
      color: 'var(--ui-text-muted)',
      textAlign: 'center',
      padding: '14px 10px',
      lineHeight: 1.4
    })
  }, text);
};

export function SkillsPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setShowSkills = props.setShowSkills;
  var _rpgState$lifeSkills46;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowSkills(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: Object.assign({}, LS_CARD, {
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 320 fixed — fill narrow phones, never overflow */
      /* v2.3.1235: batch-2 rollout — 80vh could exceed the .bt-inspect
         content box (which reserves the HUD strip + dashboard band);
         100% defers to the wrapper's clearance so nothing scrolls
         beneath the band. */
      maxHeight: '100%',
      overflowY: 'auto',
      padding: 16
    })
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    /* v2.3.1235: batch-2 rollout — the shared class is 28×28, below the
       locked 44px hitbox floor; inline override on this modal only
       (game.css is shared with concurrent sessions). */
    style: { width: 44, height: 44 },
    onClick: function onClick() {
      return setShowSkills(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      minHeight: 24
    }
  }, lsIcon('/icons/ui/panel-skills.webp?v=2.3.1232', '📊', 20), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: 'var(--ui-text)'
    }
  }, "Life Skills")), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 8
    })
  }, "Harvesting"), [{
    name: 'Woodcutting',
    key: 'woodcutting',
    icon: '🪓',
    iconSrc: '/icons/ui/skill-woodcutting.webp?v=2.3.1232',
    desc: 'Chop trees for wood + zone gems'
  }, {
    name: 'Fishing',
    key: 'fishing',
    icon: '🎣',
    iconSrc: '/icons/ui/skill-fishing.webp?v=2.3.1232',
    desc: 'Catch fish for cooking + zone gems'
  }, {
    name: 'Mining',
    key: 'mining',
    icon: '⛏️',
    iconSrc: '/icons/ui/skill-mining.webp?v=2.3.1232',
    desc: 'Mine ore (iron Lv1-5, steel Lv6-10) + zone gems'
  }].map(function (sk) {
    var _rpgState$lifeSkills43;
    var skill = ((_rpgState$lifeSkills43 = rpgState.lifeSkills) === null || _rpgState$lifeSkills43 === void 0 ? void 0 : _rpgState$lifeSkills43[sk.key]) || {
      level: 1,
      xp: 0
    };
    var xpNeeded = LIFE_SKILL_XP(skill.level);
    var xpPct = Math.min(100, skill.xp / xpNeeded * 100);
    return lsSkillRow(sk, skill, xpNeeded, xpPct);
  }), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginTop: 12,
      marginBottom: 8
    })
  }, "Crafting"), [{
    name: 'Cooking',
    key: 'cooking',
    icon: '🍳',
    iconSrc: '/icons/ui/skill-cooking.webp?v=2.3.1232',
    desc: 'Cook fish + ingredients for healing food'
  }, {
    name: 'Blacksmithing',
    key: 'blacksmithing',
    icon: '🔨',
    iconSrc: '/icons/ui/skill-blacksmithing.webp?v=2.3.1232',
    desc: 'Forge melee gear bases with gem slots'
  }, {
    name: 'Woodworking',
    key: 'woodworking',
    icon: '🪚',
    iconSrc: '/icons/ui/skill-woodworking.webp?v=2.3.1232',
    desc: 'Craft bows & staves with gem slots'
  }, {
    name: 'Gem Cutting',
    key: 'gemCutting',
    icon: '💎',
    iconSrc: '/icons/ui/skill-gemcutting.webp?v=2.3.1232',
    desc: 'Cut raw gems into polished slottable gems'
  }, {
    name: 'Enchanting',
    key: 'enchanting',
    icon: '✨',
    iconSrc: '/icons/ui/skill-enchanting.webp?v=2.3.1232',
    desc: 'Slot gems into gear for elemental power'
  }].map(function (sk) {
    var _rpgState$lifeSkills44;
    var skill = ((_rpgState$lifeSkills44 = rpgState.lifeSkills) === null || _rpgState$lifeSkills44 === void 0 ? void 0 : _rpgState$lifeSkills44[sk.key]) || {
      level: 1,
      xp: 0
    };
    var xpNeeded = LIFE_SKILL_XP(skill.level);
    var xpPct = Math.min(100, skill.xp / xpNeeded * 100);
    return lsSkillRow(sk, skill, xpNeeded, xpPct);
  }), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginTop: 12,
      marginBottom: 8
    })
  }, "Utility"), [{
    name: 'Farming',
    key: 'farming',
    icon: '🌾',
    iconSrc: '/icons/ui/skill-farming.webp?v=2.3.1232',
    desc: 'Grow ingredients at the farm'
  }, {
    name: 'Trapping',
    key: 'trapping',
    icon: '🪤',
    iconSrc: '/icons/ui/skill-trapping.webp?v=2.3.1232',
    desc: 'Capture weakened monsters as pets'
  }].map(function (sk) {
    var _rpgState$lifeSkills45;
    var skill = ((_rpgState$lifeSkills45 = rpgState.lifeSkills) === null || _rpgState$lifeSkills45 === void 0 ? void 0 : _rpgState$lifeSkills45[sk.key]) || {
      level: 1,
      xp: 0
    };
    var xpNeeded = LIFE_SKILL_XP(skill.level);
    var xpPct = Math.min(100, skill.xp / xpNeeded * 100);
    return lsSkillRow(sk, skill, xpNeeded, xpPct);
  }), /*#__PURE__*/React.createElement("div", {
    style: LS_SECTION
  }, /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 8
    })
  }, "Gems"), function (_rpgState$lifeSkills46) {
    var gems = ((_rpgState$lifeSkills46 = rpgState.lifeSkills) === null || _rpgState$lifeSkills46 === void 0 ? void 0 : _rpgState$lifeSkills46.gems) || {};
    var entries = Object.entries(gems).filter(function (_ref164) {
      var _ref165 = _slicedToArray(_ref164, 2),
        k = _ref165[0],
        v = _ref165[1];
      return v > 0;
    });
    if (entries.length === 0) return lsEmpty("No gems yet. Harvest resources or kill monsters in elemental zones!");
    return /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_WELL, {
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        padding: 8
      })
    }, entries.map(function (_ref166) {
      var _ZONE_RESOURCES$elem3, _ZONE_RESOURCES$elem4;
      var _ref167 = _slicedToArray(_ref166, 2),
        k = _ref167[0],
        v = _ref167[1];
      var parts = k.split('_'); /* raw_flame, polished_frost, etc */
      var qual = parts[0];
      var elem = parts[1];
      var gc = ((_ZONE_RESOURCES$elem3 = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem3 === void 0 ? void 0 : _ZONE_RESOURCES$elem3.gemColor) || '#9A78D0'; /* v2.3.1235: batch-2 rollout — fallback onto the approved magic token */
      return /*#__PURE__*/React.createElement("span", {
        key: k,
        style: {
          fontSize: 11,
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          minHeight: 28,
          boxSizing: 'border-box',
          padding: '3px 10px',
          borderRadius: 999,
          /* v2.3.1235: batch-2 rollout — chip base #19252A (retired
             well-soft) → card token: occupied cells sit on --ui-card
             per the correction pass; gem tint border is game data. */
          background: 'var(--ui-card)',
          color: gc,
          border: '1px solid ' + gc + '30',
          fontVariantNumeric: 'tabular-nums'
        }
      }, qual === 'raw' ? '◇' : '◆', " ", ((_ZONE_RESOURCES$elem4 = ZONE_RESOURCES[elem]) === null || _ZONE_RESOURCES$elem4 === void 0 ? void 0 : _ZONE_RESOURCES$elem4.gem) || elem + ' Gem', " \xD7", v);
    }));
  }()), /*#__PURE__*/React.createElement("div", {
    style: LS_SECTION
  }, /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 8
    })
  }, "Active Quests"), function () {
    var active = Object.entries(rpgState._quests || {}).filter(function (_ref168) {
      var _ref169 = _slicedToArray(_ref168, 2),
        qid = _ref169[0],
        st = _ref169[1];
      return st === QUEST_STATUS.active;
    }).map(function (_ref170) {
      var _ref171 = _slicedToArray(_ref170, 1),
        qid = _ref171[0];
      return QUEST_CHAINS[qid];
    }).filter(Boolean);
    if (active.length === 0) return lsEmpty("No active quests. Talk to NPCs with ❗ markers!");
    return /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_WELL, {
        padding: 4
      })
    }, active.map(function (q, _qi) {
      /* v2.3.1914: live rpg, not the snapshot — one answer everywhere. */
      var done = questObjectiveDone(q, stateRef.current, rpgState);
      return /*#__PURE__*/React.createElement("div", {
        key: q.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '6px 8px',
          borderBottom: _qi < active.length - 1 ? LS_DIVIDER : 'none'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14,
          width: 18,
          textAlign: 'center',
          flex: 'none',
          /* v2.3.1235: batch-2 rollout — positive #59BF91 → #55B98A
             (approved correction-pass token). */
          color: done ? '#55B98A' : 'var(--ui-text-muted)'
        }
      }, done ? '✓' : '○'), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--ui-text)'
        }
      }, q.title), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: 'var(--ui-text-muted)',
          lineHeight: 1.35
        }
      }, q.desc)), /*#__PURE__*/React.createElement("span", {
        /* v2.3.1235: batch-2 rollout — 10px was below the 11px floor */
        style: {
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--ui-text-muted)',
          flex: 'none'
        }
      }, q.npc));
    }));
  }()), /*#__PURE__*/React.createElement("div", {
    style: LS_SECTION
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 28,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: LS_HEADER
  }, "Achievement Points"), /*#__PURE__*/React.createElement("span", {
    /* v2.3.1235: batch-2 rollout — the section's one key number moves
       onto the locked 16-18/700 tabular rung (was 14). */
    style: {
      fontSize: 16,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--ui-text)'
    }
  }, rpgState.achievementPoints || 0)), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 8
    })
  }, "Player Stats"), function () {
    var cs = rpgState._compStats || createDefaultCompStats();
    /* Update playtime */
    var playmins = Math.floor(((cs.playtimeSeconds || 0) + (Date.now() - (cs._sessionStart || Date.now())) / 1000) / 60);
    /* v2.3.1235: batch-2 rollout — the per-section accent colors
       (v2.3.1232) were decorative: the locked contract pins section
       headers to 11/700 uppercase .14em muted, and semantic colors are
       reserved for bars/state, so the color field is gone. */
    var sections = [{
      label: 'Combat',
      stats: [['Monsters Killed', cs.monstersKilled], ['Deaths', cs.deaths], ['Grand Slams', cs.grandSlams], ['Bosses Killed', cs.bossesKilled], ['Highest Kill Lv', cs.highestMonsterKill], ['Crits Landed', cs.critLanded], ['Collisions', cs.collisionsTriggered]]
    }, {
      label: 'PvP',
      stats: [['PvP Kills', cs.pvpKills], ['PvP Deaths', cs.pvpDeaths], ['Duels Won', cs.duelsWon], ['Duels Lost', cs.duelsLost]]
    }, {
      label: 'Life Skills',
      stats: [['Fish Caught', cs.fishCaught], ['Trees Felled', cs.treesFelled], ['Ores Mined', cs.oresMined], ['Items Crafted', cs.itemsCrafted], ['Items Salvaged', cs.itemsSalvaged], ['Cook Success', cs.cookSuccess], ['Cook Burns', cs.cookBurns], ['Reforges', cs.reforgeAttempts], ['Harden OK', cs.hardenSuccess], ['Harden Fail', cs.hardenFails]]
    }, {
      label: 'Economy',
      stats: [['Gold Earned', cs.totalGoldEarned], ['Gold Spent', cs.totalGoldSpent], ['Gold Lost (death)', cs.goldLostToDeath], ['Total Gambled', cs.totalGambled], ['Gamble Won', cs.totalGambleWon], ['Gamble Lost', cs.totalGambleLost]]
    }, {
      label: 'Progress',
      stats: [['Quests Done', cs.questsCompleted], ['Rare Drops', cs.rareDropsFound], ['Zones Explored', cs.zonesExplored], ['Dungeons Cleared', cs.dungeonsCleared], ['Pets Captured', cs.petsCapured], ['Playtime', playmins + 'min']]
    }];
    return sections.map(function (sec) {
      return /*#__PURE__*/React.createElement("div", {
        key: sec.label,
        style: {
          marginBottom: 10
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: Object.assign({}, LS_HEADER, {
          marginBottom: 4
        })
      }, sec.label), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3px 12px',
          fontSize: 12,
          color: 'var(--ui-text-muted)'
        }
      }, sec.stats.map(function (_ref172) {
        var _ref173 = _slicedToArray(_ref172, 2),
          k = _ref173[0],
          v = _ref173[1];
        return /*#__PURE__*/React.createElement(React.Fragment, {
          key: k
        }, /*#__PURE__*/React.createElement("span", null, k), /*#__PURE__*/React.createElement("span", {
          style: {
            textAlign: 'right',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--ui-text)'
          }
        }, v || 0));
      })));
    });
  }()), /*#__PURE__*/React.createElement("div", {
    style: LS_SECTION
  }, /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 8
    })
  }, "Resources"), function () {
    var inv = rpgState.inventory || {};
    var items = Object.entries(inv).filter(function (_ref174) {
      var _ref175 = _slicedToArray(_ref174, 2),
        k = _ref175[0],
        v = _ref175[1];
      return v > 0;
    });
    if (items.length === 0) return lsEmpty("No resources. Harvest nodes in combat zones!");
    /* Categorize */
    var fish = items.filter(function (_ref176) {
      var _ref177 = _slicedToArray(_ref176, 1),
        k = _ref177[0];
      return k.startsWith('fish_');
    });
    var wood = items.filter(function (_ref178) {
      var _ref179 = _slicedToArray(_ref178, 1),
        k = _ref179[0];
      return k.startsWith('wood_');
    });
    var ore = items.filter(function (_ref180) {
      var _ref181 = _slicedToArray(_ref180, 1),
        k = _ref181[0];
      return k.startsWith('ore_');
    });
    var herbs = items.filter(function (_ref182) {
      var _ref183 = _slicedToArray(_ref182, 1),
        k = _ref183[0];
      return k.startsWith('herb_');
    });
    var gear = items.filter(function (_ref184) {
      var _ref185 = _slicedToArray(_ref184, 1),
        k = _ref185[0];
      return k.startsWith('gear_');
    });
    var other = items.filter(function (_ref186) {
      var _ref187 = _slicedToArray(_ref186, 1),
        k = _ref187[0];
      return !k.startsWith('fish_') && !k.startsWith('wood_') && !k.startsWith('ore_') && !k.startsWith('herb_') && !k.startsWith('gear_');
    });
    /* v2.3.1235: batch-2 rollout — group headers lose their emoji
       prefixes (decorative emoji in chrome are banned by the locked
       contract; the now-unused emoji/color args are dropped with them)
       and move onto the shared LS_HEADER rung; chips retint from the
       retired #19252A/rgba(238,242,235,…) pair to the approved
       card + line tokens. */
    var renderGroup = function renderGroup(label, arr) {
      if (arr.length === 0) return null;
      return React.createElement('div', {
        key: label,
        style: {
          marginBottom: 10
        }
      }, React.createElement('div', {
        style: Object.assign({}, LS_HEADER, {
          marginBottom: 4
        })
      }, label), React.createElement('div', {
        style: {
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap'
        }
      }, arr.map(function (_ref188) {
        var _ref189 = _slicedToArray(_ref188, 2),
          k = _ref189[0],
          v = _ref189[1];
        return React.createElement('span', {
          key: k,
          style: {
            fontSize: 11,
            fontWeight: 600,
            minHeight: 28,
            boxSizing: 'border-box',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: 999,
            background: 'var(--ui-card)',
            color: 'var(--ui-text-secondary)',
            border: '1px solid var(--ui-line)',
            fontVariantNumeric: 'tabular-nums'
          }
        }, k.replace(/^(fish|wood|ore|herb|gear)_/, '').replace(/_/g, ' ') + ' ×' + v);
      })));
    };
    return React.createElement(React.Fragment, null, renderGroup('Fish', fish), renderGroup('Wood', wood), renderGroup('Ore', ore), renderGroup('Herbs', herbs), renderGroup('Gear', gear), other.length > 0 && renderGroup('Other', other));
  }())));
}
