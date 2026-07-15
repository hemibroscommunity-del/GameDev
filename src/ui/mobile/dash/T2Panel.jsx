import React, { useEffect, useState } from 'react';
/* v2.3.1235: batch-1 rollout — rowStyle dropped from the import: the
   channel cards it styled became divider rows (see the channel map). */
import { COL, panelStyle } from './common.js';
import { spendConfirmBus } from './spendConfirmBus.js';
import {
  WEAPON_CATEGORIES,
  WEAPON_CATEGORY_META,
  WEAPON_CHANNELS,
  WEAPON_CHANNEL_CAP,
  WEAPON_LEVEL_CAP,
  weaponXpRequired,
  xpRequired,
  activeWeaponCategory,
  recalcDerived,
  DEFENSE_CHANNELS,
  DEFENSE_CHANNEL_CAP,
  HP_CHANNELS,
  ENDURANCE_CHANNELS,
  GRID_CHANNEL_CAP,
  combatBuildTotal,
  COMBAT_BUILD_CEILING,
} from '../../../data/gameSystems.js';

/* v2.3.911: lets the dashboard open this panel jumped to a specific tab.
   The dashboard calls requestT2Category(cat) then pushes the 't2' panel;
   the component consumes the pending value on its next render. */
let _pendingCat = null;
export function requestT2Category(cat) { _pendingCat = cat; }

/* v2.3.693: Defense is a 4th tab.  Its data lives in rpg.defenseSkill /
   defenseSpec / defenseUnspent (not the weapon maps) and it trains by
   blocking / mitigating rather than dealing damage, but the panel shape is
   identical so it shares the tab strip + channel rows below. */
const DEF_TAB = 'defense';
const DEF_META = { label: 'Defense', emoji: '\u{1F6E1}' };

/* v2.3.1154: HP + Endurance grid tabs.  Unlike the weapon/defense skills
   these have no separate skill track — the STAT is the level (vitality /
   endurance, use-trained via addBuildProg) and each stat level grants
   +1 point into the matching pool.  Spending is gated on the worker's
   caps.hpEndGrids (deploy-order safety): against an old worker the
   channels render as "Soon" so points can't be spent into multipliers
   the worker would stomp. */
/* v2.3.1311 (owner canonical taxonomy): the tabs carry the PARENT
   names — Vitality (HP-related abilities) and Stamina (energy-related
   abilities).  Storage keys ('hp' tab id, rpg.enduranceSpec, ...) are
   unchanged — renaming persisted fields breaks saves (rule 1). */
const GRID_TABS = {
  hp: {
    stat: 'vitality', label: 'Vitality', emoji: '❤️',
    channels: HP_CHANNELS, specKey: 'hpSpec', poolKey: 'hpUnspent',
  },
  endurance: {
    stat: 'endurance', label: 'Stamina', emoji: '⚡',
    channels: ENDURANCE_CHANNELS, specKey: 'enduranceSpec', poolKey: 'enduranceUnspent',
  },
};

/* v2.3.1232: Lantern Slate structure pass — category identity is the
   UI-Bible icon (emoji stays as the onError fallback, the SkillsPanel
   replaceWith pattern).  Keyed by tab id: weapon categories + defense +
   the HP/Endurance grid tabs. */
/* v2.3.1311: owner's hero-stat icon set — the same six parent icons the
   Hero menu uses, so the spend screen and the dashboard agree. */
const T2_TAB_ICONS = {
  sword:     '/icons/ui/hero/melee.webp?v=2.3.1311',
  bow:       '/icons/ui/hero/bow.webp?v=2.3.1311',
  staff:     '/icons/ui/hero/magic.webp?v=2.3.1311',
  defense:   '/icons/ui/hero/defense.webp?v=2.3.1311',
  hp:        '/icons/ui/hero/vitality.webp?v=2.3.1311',
  endurance: '/icons/ui/hero/endurance.webp?v=2.3.1311',
};

function persist(R) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bt_rpg', JSON.stringify(R));
    }
  } catch (e) {}
}

/* Per-weapon-CATEGORY build allocation.  Replaces the retired generic
   "Specs" (Ferocity/Elemental Mastery/…).  Each category levels its own
   skill by dealing damage with a weapon of that category; each level
   grants +1 point spent into that category's channels (was +5 before
   v2.3.910's build-skill restructure).  Channels flagged "Soon" are
   allocatable-but-inert until their combat wiring ships. */
export const T2Panel = () => {
  const [, force] = useState(0);
  const [cat, setCat] = useState(null);
  useEffect(() => {
    /* Light polling; the panel is tiny and only mounts when open. */
    const id = setInterval(() => force((v) => v + 1), 250);
    return () => clearInterval(id);
  }, []);
  /* v2.3.911: if the dashboard asked us to open on a specific tab, adopt it
     (runs after every render; consumes the pending value once). */
  useEffect(() => {
    if (_pendingCat) { setCat(_pendingCat); _pendingCat = null; }
  });

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  const R = (S && S.rpg) || null;
  if (!R) {
    return (
      <div style={panelStyle}>
        {/* v2.3.1235: batch-1 rollout — empty state per the locked sheet:
            13/700 secondary, directly on the sheet, no container. */}
        <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2, textAlign: 'center', padding: '14px 0' }}>
          No character loaded.
        </div>
      </div>
    );
  }

  /* Default the selected tab to whatever's equipped right now. */
  const activeCat = cat || activeWeaponCategory(R);
  const isDef = activeCat === DEF_TAB;
  const gridTab = GRID_TABS[activeCat] || null;
  const skills = R.weaponSkills || {};
  const specs = R.weaponSpecs || {};
  const pools = R.weaponUnspent || {};

  /* v2.3.1154: grid spending is caps-gated (see GRID_TABS comment).
     Offline / pre-worker sessions stay live (legacy client-local play). */
  const gridsLive = !S.channel || !!(S._serverCaps && S._serverCaps.hpEndGrids);
  /* v2.3.1156: uniform 100-pt caps are ALSO caps-gated — an old worker
     clamps weapon specs at 99 and defense/grid specs at 50, so spending
     past the legacy caps against it would be truncated on echo. */
  const t2uniform = !S.channel || !!(S._serverCaps && S._serverCaps.t2uniform);
  const LEGACY_WEAPON_CAP = 99, LEGACY_GRID_CAP = 50;
  /* v2.3.1157: the 1000-point combat ceiling — total allocation across
     all six grids.  Server enforces (_clampBuildTotal); the panel shows
     the meter and refuses spends at the line. */
  const buildTotal = combatBuildTotal(R);
  const atCeiling = t2uniform && buildTotal >= COMBAT_BUILD_CEILING;

  /* Source the selected tab's skill / spec / pool / channels from the
     Defense fields, a grid tab, or the weapon maps. */
  const sk = gridTab
    ? { level: R[gridTab.stat] || 0, xp: (R._buildProg && R._buildProg[gridTab.stat]) || 0 }
    : isDef ? (R.defenseSkill || { level: 0, xp: 0 }) : (skills[activeCat] || { level: 0, xp: 0 });
  const catSpecs = gridTab ? (R[gridTab.specKey] || {}) : isDef ? (R.defenseSpec || {}) : (specs[activeCat] || {});
  const unspent = gridTab ? (R[gridTab.poolKey] || 0) : isDef ? (R.defenseUnspent || 0) : (pools[activeCat] || 0);
  let channels = gridTab
    ? (gridsLive ? gridTab.channels : gridTab.channels.map((ch) => ({ ...ch, active: false })))
    : isDef ? DEFENSE_CHANNELS : (WEAPON_CHANNELS[activeCat] || []);
  /* v2.3.1311 (owner canon: every parent owns exactly FIVE categories):
     Vitality's data model ships 4 (vigor/recovery/lifeblood/resilience)
     — one short.  A UI-ONLY locked slot keeps the 5-per-parent shape
     visible until the owner names the real 5th ability; nothing is
     added to the data model or the wire (spending into it is
     impossible: active:false reuses the SOON row treatment). */
  if (activeCat === 'hp' && channels.length === 4) {
    channels = [...channels, {
      key: '_slot5', label: '???', active: false,
      blurb: 'A fifth Vitality ability — coming soon.',
      derive: () => '',
    }];
  }
  const channelCap = t2uniform
    ? (gridTab ? GRID_CHANNEL_CAP : isDef ? DEFENSE_CHANNEL_CAP : WEAPON_CHANNEL_CAP)
    : (gridTab || isDef ? LEGACY_GRID_CAP : LEGACY_WEAPON_CAP);
  /* Grid tabs level via the STAT's own training curve (addBuildProg
     threshold); weapon/defense tabs keep their damage-driven curve. */
  const need = gridTab
    ? Math.max(200, Math.floor(xpRequired(sk.level || 0)))
    : weaponXpRequired(sk.level || 0);
  const xpPct = need > 0 ? Math.max(0, Math.min(100, ((sk.xp || 0) / need) * 100)) : 0;

  /* v2.3.911: spending now goes through a confirmation window.  Keep the
     guards here, then hand the channel context to spendConfirmBus; the
     SpendPointConfirm overlay applies the point (recalcDerived + persist)
     after the player confirms. */
  const addPoint = (key, active) => {
    if (!active) return;
    if (atCeiling) return; /* v2.3.1157: build complete at 1000 */
    if (unspent <= 0) return;
    if ((catSpecs[key] || 0) >= channelCap) return;
    const ch = channels.find((c) => c.key === key);
    if (!ch) return;
    spendConfirmBus.open({
      isDef,
      /* v2.3.1154: grid tabs hand the confirm popup their field names so
         it can apply the point generically. */
      gridSpecKey: gridTab ? gridTab.specKey : null,
      gridPoolKey: gridTab ? gridTab.poolKey : null,
      cat: activeCat,
      key,
      channel: ch,
      current: (catSpecs[key] || 0),
      skillLabel: gridTab ? gridTab.label : isDef ? DEF_META.label : ((WEAPON_CATEGORY_META[activeCat] || {}).label || activeCat),
    });
  };

  return (
    /* v2.3.1236: owner feedback — the Weapons sheet was "cumbersome":
       every tab has 4-5 channels but the old layout (68px Builds header,
       ~67px three-line channel cards) always scrolled.  The REAL body
       under the 56vh sheet at 390×844 is ~360px, not ~430: 472.6 (56vh)
       − 44 (sheet header) − 68 (persistent toolbar) − 1 (band border).
       No-scroll budget: 6 top pad + 52 tabs (48px + 4) + 28 skill bar +
       pool (24px + 4) + 19 hint/meter line (15px + 4) + 5×45 channel
       rows + 4 tail = 334px ≤ 360, ending 25px above the fold so
       panelStyle's 18px scroll-fade never dims a live row.  To get
       there: the Builds header block is GONE (the sheet header already
       says BUILD — the Weapons menu was renamed Build on this same
       v2.3.1236 pass; the 1000-pt meter moves onto the hint line), the
       training copy compresses to one 12px line, CHANNELS header +
       standalone grid notice + per-row Max line fold into the hint line
       / row badges, and channel rows become fixed two-line rows (label +
       SOON/MAX badge, then derive · blurb inline-truncated at 11px)
       sized by their 44×44 + button.  All four row states kept
       (affordable / no-points / MAX / SOON at .55 opacity); tab and +
       hitboxes stay at the 44px floor; every handler body is
       byte-identical. */
    <div style={{ ...panelStyle, padding: '6px 12px 4px' }}>
      {/* Category tabs — weapon categories + Defense (v2.3.693) + the
          HP/Endurance grids (v2.3.1154). */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {[...WEAPON_CATEGORIES, DEF_TAB, ...Object.keys(GRID_TABS)].map((c) => {
          const cIsDef = c === DEF_TAB;
          const cGrid = GRID_TABS[c] || null;
          const meta = cGrid ? cGrid : cIsDef ? DEF_META : (WEAPON_CATEGORY_META[c] || { label: c, emoji: '' });
          const lvl = cGrid ? (R[cGrid.stat] || 0) : cIsDef ? ((R.defenseSkill && R.defenseSkill.level) || 0) : ((skills[c] && skills[c].level) || 0);
          const p = cGrid ? (R[cGrid.poolKey] || 0) : cIsDef ? (R.defenseUnspent || 0) : (pools[c] || 0);
          const sel = c === activeCat;
          /* v2.3.1232: Lantern Slate segmented-tab language — active tab is
             the raised surface with a 2px brass bottom edge (no indigo
             fill); identity is the icon with the emoji as onError
             fallback; unspent badge text sits on brass in #20170D. */
          const iconSrc = T2_TAB_ICONS[c];
          return (
            <button
              key={c}
              onPointerUp={(e) => { e.stopPropagation(); setCat(c); }}
              style={{
                /* v2.3.1235: batch-1 rollout — COL.tile/#16262C is not on
                   the locked token sheet; unselected tabs now sit flat on
                   the sheet with a standard 1px line, selected keeps the
                   raised surface + brass bottom edge.  Lv/badge text
                   raised to the 11px readability floor.  Pointer
                   handler byte-identical. */
                /* v2.3.1236: owner feedback — tab compressed to 48px for
                   the no-scroll budget (icon 18→16, 3px pad, lineHeight-1
                   text): 3+16+1+11+1+11+3+2px border = 48, still over the
                   44px hitbox floor.  Pointer handler byte-identical. */
                flex: 1,
                position: 'relative',
                minHeight: 38, /* v2.3.1311e: no-scroll under the drill sheet */
                background: sel ? COL.raised : 'transparent',
                border: '1px solid ' + (sel ? COL.borderStrong : COL.border),
                boxShadow: sel ? 'inset 0 -2px 0 ' + COL.accent : 'none',
                borderRadius: 8,
                padding: '3px 2px',
                color: sel ? COL.text : COL.text2,
                fontFamily: 'inherit',
                cursor: 'pointer',
                touchAction: 'manipulation',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}
            >
              {iconSrc
                ? <img src={iconSrc} alt="" draggable={false}
                    style={{ width: 16, height: 16, objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(meta.emoji)); }} />
                : <span style={{ fontSize: 15, lineHeight: 1 }}>{meta.emoji}</span>}
              <span style={{ fontSize: 10.5, fontWeight: 600, lineHeight: 1 }}>{meta.label}</span>
              {/* v2.3.1311e: the per-tab Lv line is gone — the selected
                  category's level already reads on the skill bar below,
                  and the 5 channel rows need the vertical room. */}
              {p > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -4,
                  background: COL.accent, color: COL.onAccent,
                  fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                  borderRadius: 999, padding: '1px 5px', lineHeight: 1.3,
                }}>{p}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected category skill bar + pool */}
      {/* v2.3.1236: owner feedback — compressed to one 24px row (11px
          lineHeight-1 label, 4px bar, pool chip padding 5→3px). */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 4,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, lineHeight: 1, color: COL.muted, marginBottom: 3, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {(gridTab || (isDef ? DEF_META : (WEAPON_CATEGORY_META[activeCat] || {}))).label} skill · Lv {sk.level || 0}
            {/* v2.3.1207: cap is WEAPON_LEVEL_CAP (100 since v2.3.1156) — the stale 99 literal showed "(Max)" one level early. */}
            {(sk.level || 0) >= WEAPON_LEVEL_CAP ? ' (Max)' : ` · ${Math.round(xpPct)}% to next`}
          </div>
          {/* v2.3.1232: Lantern Slate bar — pill radius, XP-green fill with
              the standard vertical light overlay (was indigo). */}
          {/* v2.3.1235: batch-1 rollout — track literal #0B1216 was a typo
              off the locked token sheet; well-deep #0B161B is the track. */}
          <div style={{ height: 4, background: COL.wellDeep, borderRadius: 999, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)' }}>
            <div style={{ width: xpPct + '%', height: '100%', background: COL.xp, backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.20), transparent 55%)', transition: 'width .15s linear' }} />
          </div>
        </div>
        {/* v2.3.1232: pool readout is a recessed well; value 14/700 tabular,
            brass only while there are points to spend. */}
        <div style={{
          fontSize: 14, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          color: unspent > 0 ? COL.accent : COL.muted,
          background: COL.well,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
          padding: '4px 8px', borderRadius: 8,
          border: '1px solid ' + COL.divider,
          whiteSpace: 'nowrap',
        }}>
          {unspent} pts
        </div>
      </div>

      {/* v2.3.1236: owner feedback — ONE 12px line replaces the header
          block's training copy, the standalone old-worker grid notice
          (v2.3.1154: grid channels render as "Soon" until the worker
          advertises caps.hpEndGrids — that notice takes the line over in
          gold when it applies) and the CHANNELS section header.  The
          v2.3.1157 1000-pt combat build meter sits right-aligned on the
          same line (was in the Builds header). */}
      {/* v2.3.1311e: the hint/meter line renders only when it says
          something actionable — the old-worker gold notice or the
          build-ceiling state.  The evergreen "deal damage to train"
          copy cost 19px of the 5-row no-scroll budget. */}
      {((gridTab && !gridsLive) || atCeiling) && (
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 8, marginBottom: 4,
      }}>
        {gridTab && !gridsLive ? (
          <span style={{ fontSize: 12, lineHeight: 1.25, color: COL.gold, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Unlocks with next server update — points safe.
          </span>
        ) : (
          <span style={{ fontSize: 12, lineHeight: 1.25, color: COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {/* v2.3.1133: label caught up with v2.3.910's 1-pt-per-level change */}
            {gridTab
              ? (gridTab.stat === 'vitality'
                ? 'Combat trains Vitality · +1 pt per level'
                : 'Sprint, block & roll to train · +1 pt per level')
              : isDef
                ? 'Block & mitigate to train · +1 pt per level'
                : 'Deal damage to train · +1 pt per level'}
          </span>
        )}
        {t2uniform && (
          <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: atCeiling ? COL.gold : COL.muted }}>
            {buildTotal}/{COMBAT_BUILD_CEILING}{atCeiling ? ' · complete' : ''}
          </span>
        )}
      </div>
      )}
      {channels.map((ch) => {
        const v = catSpecs[ch.key] || 0;
        const atCap = v >= channelCap;
        const canAdd = ch.active && unspent > 0 && !atCap;
        /* v2.3.1235: batch-1 rollout — divider-separated rows directly on
           the sheet (no COL.tile cards); the stepper is the standard
           secondary button with a brass + glyph when affordable (brass as
           accent, not fill — one-gold-action rule) and COL.disabled when
           not.  Locked rows keep opacity .55.  Pointer handler
           byte-identical. */
        /* v2.3.1236: owner feedback — fixed two-line 45px row so all 4-5
           channels fit the sheet without scrolling: line 1 = label +
           SOON/MAX badge (the v2.3.1235 "Max (100)." line becomes the MAX
           badge), line 2 = live derive · blurb inline at 11px, nowrap +
           ellipsis (the blurb dropped from 12px WITH the owner's explicit
           sign-off on this pass — density beats the 12px copy floor
           here).  Row height = the 44×44 + button + 1px divider; the
           two-line text column (~32px) centers beside it. */
        return (
          <div key={ch.key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 38, /* v2.3.1311e: 5 rows must clear the fold */
            borderBottom: '1px solid ' + COL.divider,
            opacity: ch.active ? 1 : 0.55,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.label}</span>
                {!ch.active && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: COL.gold, letterSpacing: '0.08em' }}>SOON</span>
                )}
                {atCap && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: COL.gold, letterSpacing: '0.08em' }}>MAX</span>
                )}
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.25, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ch.active && (
                  <span style={{ color: COL.text, fontVariantNumeric: 'tabular-nums' }}>{ch.derive(v)}{' · '}</span>
                )}
                <span style={{ color: COL.muted }}>{ch.blurb}</span>
              </div>
            </div>
            <span style={{
              fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: v > 0 ? COL.text : COL.text2,
              minWidth: 26, textAlign: 'right', flexShrink: 0,
            }}>{v}</span>
            <button
              onPointerUp={(e) => { e.stopPropagation(); if (canAdd) addPoint(ch.key, ch.active); }}
              disabled={!canAdd}
              style={{
                width: 38, height: 38, /* v2.3.1311e */
                flexShrink: 0,
                background: COL.raised,
                color: canAdd ? COL.accent : COL.disabled,
                border: '1px solid ' + (canAdd ? COL.borderStrong : COL.border),
                borderRadius: 10,
                fontSize: 18, fontWeight: 700,
                cursor: canAdd ? 'pointer' : 'default',
                touchAction: 'manipulation',
                padding: 0,
                lineHeight: 1,
              }}
            >+</button>
          </div>
        );
      })}
    </div>
  );
};
