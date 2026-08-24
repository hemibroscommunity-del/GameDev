import React from 'react';
import { BT_AUDIO, calcBlockReduction, calcCritChance, calcCritMult, calcDisplayDmgRange, calcMoveSpeed, getActiveWeapon, getDefenseBlockBonus, getWeaponCritDmgStat, getWeaponCritStat, weaponXpRequired, xpRequired } from '@/data/index.js';
import { prog3HasSkills, prog3SkillLevel, prog3XpRequired, PROG3 } from '@/data/prog3.js'; /* v2.3.1901, v2.3.1902 */
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

/* === StatScreenPanel — character stats / allocation === */
/* v2.3.869: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. 4
   props (rpgState, stateRef, setRpgState, setShowStatScreen). The calc
   derived-stat helpers, getActiveWeapon, getWeaponCritStat, xpRequired,
   BT_AUDIO, and babel helpers are imported (all verified real exports).
   confirm and localStorage are browser globals. */
/* v2.3.1232: Lantern Slate restyle — panel surface, 11/600 section
   headers, 44px stat rows with 32px lock targets, spec bar tracks,
   derived stats in a recessed well. Legacy teal/tailwind accents
   remapped to the semantic set (MP #4D86D5, agility→info, mind→magic).
   Handlers and all derived-stat math untouched. */
/* v2.3.1235: batch-2 rollout — correction-pass retint: v2.3.1227
   literals move onto the :root --ui-* tokens / approved bar colors,
   headers onto the locked 11/700 .14em rung, stat identity onto the
   UI-Bible stat-*.webp icons (emoji stays only as image-failure
   fallback — emoji in chrome is banned), the 💰 glyph becomes the
   gold.webp icon (InventoryPanel pattern), lock targets grow 32→44px
   (locked hitbox floor) and the locked state reads as a brass-soft
   selection instead of a filled stat-color button. Styles + static
   JSX only; every handler body is byte-identical. */
/* v2.3.1236: owner feedback — stat screen shows the six combat skills;
   Weapons menu renamed Build.  The five tier-1 stat rows (Power/
   Vitality/Agility/Mind/Endurance) were STALE presentation — the game's
   only combat skills are Melee / Bow / Magic / Defense / HP / Endurance
   (the Build panel's tabs).  Rows now read the exact data T2Panel
   derives (its sk/need): weapon skills off R.weaponSkills on the
   weaponXpRequired curve, Defense off R.defenseSkill, HP/Endurance off
   the use-trained vitality/endurance stat level + R._buildProg on the
   grid curve.  The lock buttons (live gameplay — combatHelpers reads
   R._statLocks) re-home onto their underlying stat key; handler bodies
   byte-identical. */
export function StatScreenPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    setShowStatScreen = props.setShowStatScreen;
  /* v2.3.1207: live rpg for the derived-stats footer's DMG readout --
     rpgState is a React snapshot that lags in-place S.rpg mutations
     (the v2.3.1206 InventoryPanel convention). */
  var liveRpg = (stateRef.current && stateRef.current.rpg) || rpgState || {};
  var _dmgRange = calcDisplayDmgRange(liveRpg, getActiveWeapon(liveRpg));
  /* v2.3.1236: owner feedback — combat-skill row data, the exact
     derivations T2Panel reads: weapon skills live in R.weaponSkills
     (sword/bow/staff, {level, xp}) on the weaponXpRequired curve;
     Defense in R.defenseSkill; HP/Endurance have no separate skill
     track — the STAT is the level (vitality/endurance) with _buildProg
     progress on the grid curve (max(200, floor(xpRequired(level)))).
     Read off liveRpg (the v2.3.1207 convention) so in-place S.rpg
     training is fresh when the modal opens. */
  var _wSkills = liveRpg.weaponSkills || {};
  /* ═══ v2.3.1901: UNDER PROG3, READ THE TRAINED SKILL ═══
     Owner: "all my combat skills were lvl 0, I thought they started at 1?"

     They do. The server hands a fresh character prog3.sk = {sword:1, bow:1,
     staff:1} (prog3FromLegacy: level = oldLevel + 1). What it ALSO hands
     over is a legacy `weaponSkills` map sitting right beside it at all
     zeros — and these three rows read that one. Verified on a real fresh
     character in mp-tutgrant: prog3 says 1, weaponSkills says 0, and this
     screen believed the corpse.

     Exactly the trap XpFlyOverlay hit at v2.3.1686 ("the one candidate
     chosen for never lying had quietly become the liar"): v2.3.1659 moved
     progression to prog3.sk and left the old map in place, so reading it
     fails silently rather than loudly. The hero sheet already branches on
     prog3Live (heroModel.weaponSkillProgress) — this screen was the one
     disagreeing with it.

     Defense/HP/Endurance below are NOT part of this: defenseSkill is still
     the live track under prog3 (heroModel reads it with no branch), and
     HP/Endurance are allocated body stats that legitimately start at 0. */
  /* v2.3.1902: prog3HasSkills, not prog3Live — see prog3.js.  The owner
     reported "still says lvl 0" AFTER v2.3.1901, and reported Crit Dmg and
     Defense rendering as "—" on the hero sheet, which HeroExpanded prints on
     exactly one condition: prog3Live false.  So the cap gate was off for that
     session and v2.3.1901 fell straight back through to the zeroed legacy
     map.  The LEVEL does not need the cap — it is already in the blob. */
  var _p3Live = prog3HasSkills(liveRpg);
  var _combatSk = function (cat, legacy) {
    if (!_p3Live) {
      return { level: legacy.level || 0, xp: legacy.xp || 0,
        need: weaponXpRequired(legacy.level || 0) };
    }
    var lvl = prog3SkillLevel(liveRpg, cat);
    var raw = (liveRpg.prog3.sk && liveRpg.prog3.sk[cat]) || {};
    /* At the cap there is no next level; show a full bar rather than a fill
       computed against a threshold that no longer exists. */
    if (lvl >= PROG3.LEVEL_CAP) return { level: lvl, xp: 1, need: 1 };
    var need = Math.max(1, Math.floor(prog3XpRequired(lvl)));
    return { level: lvl, need: need,
      xp: Math.max(0, Math.min(need, Math.floor(raw.xp || 0))) };
  };
  var _swSk = _combatSk('sword', _wSkills.sword || { level: 0, xp: 0 });
  var _bwSk = _combatSk('bow', _wSkills.bow || { level: 0, xp: 0 });
  var _stSk = _combatSk('staff', _wSkills.staff || { level: 0, xp: 0 });
  var _dfSk = liveRpg.defenseSkill || { level: 0, xp: 0 };
  var _bProg = liveRpg._buildProg || {};
  var _hpLvl = liveRpg.vitality || 0;
  var _enLvl = liveRpg.endurance || 0;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowStatScreen(false);
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
    /* v2.3.1235: batch-2 rollout — shared class is 28×28, below the
       44px hitbox floor; inline override on this modal only. */
    style: { width: 44, height: 44 },
    onClick: function onClick() {
      return setShowStatScreen(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: panel title row — icon + 13/700 uppercase title */
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/panel-stats.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('⚔️'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--ui-text)'
    }
  }, "Level ", rpgState.level)), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: batch-2 rollout — 💰 was emoji in chrome; the gold
       value uses the gold.webp icon + tabular brass (the established
       InventoryPanel recipe). */
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--ui-text-muted)',
      marginBottom: 10
    }
  }, "XP: ", rpgState.xp, "/", xpRequired(rpgState.level), " \xB7 ", /*#__PURE__*/React.createElement("img", {
    src: "/icons/popups/gold.webp",
    alt: "",
    draggable: false,
    style: {
      width: 14,
      height: 14,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('💰'));
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: 'var(--ui-brass)'
    }
  }, rpgState.coins)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 12
    }
  }, [/* v2.3.1235: batch-2 rollout — bar colors onto the approved
        correction-pass semantic tokens (hp/stamina/mana). */
  ['HP', rpgState.hp, rpgState.maxHp, '#E35D5B'], ['STA', Math.floor(rpgState.stamina || 0), rpgState.maxStamina || 100, '#DFAE4E'], ['MP', Math.floor(rpgState.mana || 0), rpgState.maxMana || 100, '#4F8FDE']].map(function (_ref78) {
    var _ref79 = _slicedToArray(_ref78, 4),
      l = _ref79[0],
      v = _ref79[1],
      mx = _ref79[2],
      c = _ref79[3];
    return /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        flex: 1,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      /* v2.3.1235: batch-2 rollout — 10px was below the 11px floor */
      style: {
        fontSize: 11,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        color: c,
        marginBottom: 3
      }
    }, l, " ", v, "/", mx), /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1232: spec bar track */
        /* v2.3.1235: batch-2 rollout — track onto --ui-well-deep */
        height: 6,
        background: 'var(--ui-well-deep)',
        borderRadius: 999,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.max(1, v / mx * 100) + '%',
        height: '100%',
        background: c,
        borderRadius: 999
      }
    })));
  })), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: batch-2 rollout — header onto the locked 11/700 .14em
       muted rung; unspent-points count in brass (spendable = premium). */
    style: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: 'var(--ui-text-muted)',
      marginBottom: 6,
      marginTop: 4
    }
  }, "Combat Skills" /* v2.3.1236: owner feedback — header was "Tier 1 —
     Capacity (permanent)": the five tier-1 stat rows it captioned were
     stale presentation, replaced below by the six real combat skills.
     Kept history — the brass
     "(N pts)" unspentT1 badge is GONE: it was the screen's last
     allocation affordance and the counter is unspendable dead data.
     unspentT1 is only ever SET by the old-save migration (BroTown.jsx
     ~2015) and summed into unspentPts; nothing decrements it, no client
     code sends stat_allocate (only the wsClient passthrough exists), and
     the server's _handleStatAllocate spends unspentT2 — pinned 0 since
     the T2 retirement.  Skills train by USE (addBuildProg); points are
     assigned only in the per-build channel grids (T2Panel).  The lock
     buttons below are NOT allocation and stay: addBuildProg consults
     R._statLocks (combatHelpers.js:151, :279) to burn a locked stat's
     training share — live gameplay. */), /* v2.3.1236: owner feedback — one-line pointer to the
     real point-assignment destination (12px muted, copy floor). */
  /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ui-text-muted)',
      marginBottom: 6
    }
  }, "Skills grow with use. Points are assigned per skill — see Build."), [/* v2.3.1236: owner feedback — SIX rows for the real combat skills
        (replacing the five stale tier-1 stat rows).  Row tuples are
        [id, label, lockKey, emoji-fallback, icon, color, level, xp,
        xpNeed] — level/xp/need derived above off liveRpg, identical to
        T2Panel's sk/need.  Icons are the T2Panel tab set; the v2.3.1235
        rules stay (icon-with-emoji-fallback — emoji in chrome is banned;
        approved semantic bar colors, Defense takes the mana blue).
        lockKey is the T1 stat the row's lock freezes (Melee→power,
        Bow→agility, Magic→mind, HP→vitality, Endurance→endurance);
        _statLocks has no defense key, so the Defense row renders a
        spacer instead of a lock. */
  ['melee', 'Melee', 'power', '⚔️', '/icons/ui/combat-melee.webp?v=2.3.1232', '#E35D5B', _swSk.level || 0, _swSk.xp || 0, _swSk.need], ['bow', 'Bow', 'agility', '🏹', '/icons/ui/combat-bow.webp?v=2.3.1232', '#599FE5', _bwSk.level || 0, _bwSk.xp || 0, _bwSk.need], ['magic', 'Magic', 'mind', '✨', '/icons/ui/combat-magic.webp?v=2.3.1232', '#9A78D0', _stSk.level || 0, _stSk.xp || 0, _stSk.need], ['defense', 'Defense', null, '🛡️', '/icons/ui/combat-defense.webp?v=2.3.1232', '#4F8FDE', _dfSk.level || 0, _dfSk.xp || 0, weaponXpRequired(_dfSk.level || 0)], ['hp', 'HP', 'vitality', '❤️', '/icons/ui/stat-vitality.webp?v=2.3.1232', '#55B98A', _hpLvl, _bProg.vitality || 0, Math.max(200, Math.floor(xpRequired(_hpLvl)))], ['endurance', 'Endurance', 'endurance', '⚡', '/icons/ui/stat-endurance.webp?v=2.3.1232', '#DFAE4E', _enLvl, _bProg.endurance || 0, Math.max(200, Math.floor(xpRequired(_enLvl)))]].map(function (_ref80) {
    var _ref81 = _slicedToArray(_ref80, 9),
      id = _ref81[0],
      label = _ref81[1],
      key = _ref81[2],
      icon = _ref81[3],
      iconSrc = _ref81[4],
      col = _ref81[5],
      lvl = _ref81[6],
      xp = _ref81[7],
      need = _ref81[8];
    var xpPct = need > 0 ? Math.max(0, Math.min(100, xp / need * 100)) : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        borderBottom: '1px solid var(--ui-line)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1235: batch-2 QA — was a fixed width:104, which "Endurance"
           + its value overflowed, so the flex:1 bar painted OVER the digit
           (both test widths). Natural width with a 104px floor: the longest
           row now pushes the bar right instead of colliding with it. */
        minWidth: 104,
        whiteSpace: 'nowrap',
        fontSize: 13,
        fontWeight: 600,
        color: col,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: iconSrc,
      alt: "",
      draggable: false,
      style: {
        width: 18,
        height: 18,
        objectFit: 'contain',
        flex: 'none'
      },
      onError: function onError(e) {
        e.currentTarget.replaceWith(document.createTextNode(icon));
      }
    }), label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ui-text)',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums'
      }
    }, lvl)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 6,
        background: 'var(--ui-well-deep)',
        borderRadius: 999,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1236: owner feedback — bar is skill XP toward next level
           (T2Panel's xpPct), not the old stat-value/4 fill. */
        width: xpPct + '%',
        height: '100%',
        background: col,
        borderRadius: 999,
        transition: 'width .2s'
      }
    })), key ? /*#__PURE__*/React.createElement("button", {
      title: (rpgState._statLocks && rpgState._statLocks[key]) ? 'Locked — XP that would train ' + label + ' is burned. Click to unlock.' : 'Lock ' + label + ' at ' + lvl + ' to commit to a pure build. XP that would train it will be burned.',
      style: {
        /* v2.3.1232: 32px touch target (was 18px) */
        /* v2.3.1235: batch-2 rollout — 32px was still below the locked
           44px hitbox floor; locked state reads as a brass-soft
           selection (was a filled stat-color button — colored fills
           are reserved for the single gold primary), unlocked is the
           standard raised secondary. */
        width: 44,
        height: 44,
        borderRadius: 10,
        background: (rpgState._statLocks && rpgState._statLocks[key]) ? 'var(--ui-brass-soft)' : 'var(--ui-raised)',
        border: (rpgState._statLocks && rpgState._statLocks[key]) ? '1px solid var(--ui-brass)' : '1px solid var(--ui-line-strong)',
        color: (rpgState._statLocks && rpgState._statLocks[key]) ? 'var(--ui-brass-highlight)' : 'var(--ui-text-muted)',
        fontSize: 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        padding: 0,
        flexShrink: 0
      },
      onClick: function onClick() {
        var S = stateRef.current;
        var R = S.rpg;
        if (!R._statLocks) R._statLocks = { power: false, vitality: false, endurance: false, agility: false, mind: false };
        R._statLocks[key] = !R._statLocks[key];
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.beep(R._statLocks[key] ? 500 : 700, 0.05, 0.08, 'sine');
      }
    }, (rpgState._statLocks && rpgState._statLocks[key]) ? '🔒' : '🔓') : /*#__PURE__*/React.createElement("div", {
      /* v2.3.1236: owner feedback — _statLocks has no defense key
         (power/vitality/endurance/agility/mind only — gameSystems.js
         defaults, BroTown.jsx migration), so the Defense row gets no
         lock; a 44×44 spacer keeps its bar column aligned with the
         lockable rows. */
      style: {
        width: 44,
        height: 44,
        flexShrink: 0
      }
    }));
  /* v2.3.1155: the "TIER 2 — TECHNIQUE" block (Ferocity / Elem Mastery /
     Fortification / Restoration / Influence) is GONE — the five generic
     stats were pinned 0 since v2.3.910 and are now deleted from the
     save/wire (stat_allocate rejects them server-side).  Their successors
     are the channel grids on the Builds panel. */
  }), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: derived stats readout in a recessed well */
    /* v2.3.1235: batch-2 rollout — well onto the shared .ui-well
       recipe (correction-pass tokens). */
    style: {
      fontSize: 12,
      color: 'var(--ui-text-secondary)',
      fontVariantNumeric: 'tabular-nums',
      marginTop: 12,
      lineHeight: 1.7,
      padding: 10,
      borderRadius: 8,
      background: 'linear-gradient(180deg, #132329, #111E23)',
      border: '1px solid var(--ui-line)',
      boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)'
    }
  }, "DMG: ", /* v2.3.1207: deterministic range via the shared display
     helper -- was a single RANDOM calcWeaponDmg roll off the stale
     rpgState snapshot that also OMITTED the 4th wpn arg, so quality/
     hardness (and the damage/crit channels) never moved this readout. */
  _dmgRange ? _dmgRange.text : 0, ' · ', "Crit: ", (calcCritChance(rpgState.power || 0, getWeaponCritStat(rpgState)) * 100).toFixed(1), "% (\xD7", calcCritMult(rpgState.power || 0, getWeaponCritDmgStat(rpgState)).toFixed(2), ")", ' · ', "Block: ", (calcBlockReduction(getDefenseBlockBonus(rpgState), rpgState.shield) * 100).toFixed(0), "%", ' · ', "Speed: ", calcMoveSpeed(rpgState.agility || 0, (rpgState.enduranceSpec || {}).swiftness || 0).toFixed(1), "u/s")));
}
