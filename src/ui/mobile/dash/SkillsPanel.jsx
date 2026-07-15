import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { skillXpRequired } from '../../../data/items.js';
import { SKILL_GATHER, SKILL_CRAFT, SKILL_ROSTER, skillUnlocks, markSkillsSeen } from '../sheet/skillsModel.js';
import { skillDetailBus } from '../sheet/skillDetailBus.js';

/* v2.3.1224: roster corrected to the canonical 10 LIFE_SKILLS (owner
   directive).  v2.3.1286 (nav-system): 3-column card grid on the shared
   roster; XP CURVE FIX — progress uses skillXpRequired (items.js,
   500·1.08^(level-1)), the exact award curve.
   v2.3.1312 (owner lifeskills spec):
   - The roster sits under two subtle section labels — GATHERING
     (Woodcutting, Fishing, Mining, Farming, Trapping) and CRAFTING
     (Cooking, Smithing, Woodworking, Gem Cutting, Enchanting) — order
     permanent, never resorted (muscle memory).
   - Cards: icon +15%, XP text brightened (the old muted 112/463 was
     'unnecessarily faint').
   - Tapping a card opens an IN-PANEL detail view at the SAME sheet
     height (the pushed 'skillDetail' drill is retired): level + XP,
     XP remaining to next level, next unlock (real ladders — the four
     crafting tables are wired in as of v2.3.1312), passive benefit
     and locations where real data exists, and the earn hint.  No
     Track / Find Trainer / View Recipes actions: verified nothing in
     the game backs them yet (no trainers exist, no mobile recipe
     view, no resource tracking) and placeholders must not masquerade
     as features.
   - Compact tiles land HERE with the detail already open
     (skillDetailBus.open/consumeOpen).
   Opening this panel marks level-ups seen (clears the toolbar dot). */

const SECTION = (label) => (
  <div key={label} style={{
    gridColumn: '1 / -1',
    fontSize: 10, fontWeight: 700, letterSpacing: '.10em',
    textTransform: 'uppercase', color: COL.muted,
    padding: '2px 2px 0',
  }}>{label}</div>
);

export const SkillsPanel = () => {
  const [, force] = useState(0);
  const [detailKey, setDetailKey] = useState(() => skillDetailBus.consumeOpen());
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 600);
    return () => clearInterval(id);
  }, []);
  /* Level-up badge lifecycle: viewing the expanded panel = seen. */
  useEffect(() => {
    const S = getState();
    markSkillsSeen((S && S.rpg) || {});
  }, []);
  /* Compact-tile taps while already mounted: open that detail live. */
  useEffect(() => skillDetailBus.subscribe(() => {
    const k = skillDetailBus.consumeOpen();
    if (k) setDetailKey(k);
  }), []);

  const S = getState();
  const ls = (S && S.rpg && S.rpg.lifeSkills) || {};

  /* ── In-panel detail view (same sheet height, back chip returns) ── */
  if (detailKey) {
    const sd = SKILL_ROSTER.find(s => s.key === detailKey) || SKILL_ROSTER[0];
    const sk = ls[sd.key] || { level: 0, xp: 0 };
    const lvl = sk.level || 0;
    const need = Math.max(1, skillXpRequired(lvl));
    const xp = Math.floor(sk.xp || 0);
    const pct = Math.min(100, (xp / need) * 100);
    const un = skillUnlocks(sd, lvl);
    const row = (label, value) => (
      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0', borderBottom: `1px solid ${COL.divider}`, minWidth: 0 }}>
        <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: COL.muted }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: COL.text, textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
    );
    return (
      <div style={{ ...panelStyle, overflowY: 'auto' }}>
        {/* Back to the roster — in-panel, no sheet-height change. */}
        <button
          onPointerUp={(e) => { e.stopPropagation(); setDetailKey(null); }}
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'transparent', border: 'none',
            color: COL.text2, fontSize: 12, fontWeight: 700,
            fontFamily: 'inherit', cursor: 'pointer', padding: '2px 4px 6px 0',
            touchAction: 'manipulation',
          }}>‹ All skills</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          {sd.iconSrc
            ? <img src={sd.iconSrc} alt="" draggable={false}
                style={{ width: Math.round(38 * (sd.iconScale || 1)), height: Math.round(38 * (sd.iconScale || 1)), objectFit: 'contain' }}
                onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sd.icon)); }} />
            : <span style={{ fontSize: 30 }}>{sd.icon}</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: COL.text }}>{sd.name}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>Level {lvl}</div>
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: '#0A1318', border: '1px solid rgba(229,237,233,.10)', overflow: 'hidden', marginBottom: 3 }}>
          <div style={{ width: pct + '%', height: '100%', background: COL.xp }} />
        </div>
        <div style={{ fontSize: 11, color: COL.text2, fontVariantNumeric: 'tabular-nums', marginBottom: 6 }}>
          {xp} / {need} XP · {Math.max(0, need - xp)} XP to Lv {lvl + 1}
        </div>
        {un && un.current.length > 0 && row('Unlocked', un.current.join(', '))}
        {un && un.next && row('Next unlock', `${un.next.name} at Lv ${un.next.lvl}`)}
        {un && un.later && row('Later', `${un.later.name} at Lv ${un.later.lvl}`)}
        {sd.passive && row('Benefit', sd.passive(lvl))}
        {sd.where && row('Found at', sd.where)}
        <div style={{ fontSize: 11.5, color: COL.text2, lineHeight: 1.4, paddingTop: 6 }}>
          {sd.earnHint}
        </div>
        {!un && (
          <div style={{ fontSize: 11, color: COL.muted, lineHeight: 1.4, paddingTop: 4 }}>
            Higher levels improve results and unlock new content as it's added.
          </div>
        )}
      </div>
    );
  }

  /* ── Roster: two labeled sections of PILLS (v2.3.1312b, owner: "make
     the expanded view pill shaped so they all fit without scrolling").
     Horizontal pills, two per row — icon, name, Lv, and the thin XP
     line along the pill's bottom edge.  Exact XP moved into the detail
     view (one tap away); all ten skills + both labels clear the fold. */
  const pill = (sd) => {
    const sk = ls[sd.key] || { level: 0, xp: 0 };
    const need = Math.max(1, skillXpRequired(sk.level));
    const pct = Math.min(100, ((sk.xp || 0) / need) * 100);
    return (
      <button key={sd.key} data-skill={sd.key}
        onPointerUp={(e) => {
          e.stopPropagation();
          skillDetailBus.select(sd.key);
          setDetailKey(sd.key);
        }}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 6,
          height: 32,
          padding: '0 11px 0 7px',
          background: COL.wellSoft,
          border: `1px solid ${COL.tileBor}`,
          borderRadius: 999,
          minWidth: 0,
          cursor: 'pointer',
          touchAction: 'manipulation',
          fontFamily: 'Source Sans 3, sans-serif',
          color: COL.text,
          overflow: 'hidden',
        }}>
        {sd.iconSrc
          ? <img src={sd.iconSrc} alt="" draggable={false}
              style={{ width: Math.round(21 * (sd.iconScale || 1)), height: Math.round(21 * (sd.iconScale || 1)), objectFit: 'contain', flex: 'none' }}
              onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sd.icon)); }} />
          : <span style={{ fontSize: 16, flex: 'none' }}>{sd.icon}</span>}
        <span style={{
          flex: 1, fontSize: 11.5, fontWeight: 700, color: COL.text, textAlign: 'left',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
        }}>{sd.name}</span>
        <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
          Lv {sk.level || 0}
        </span>
        {/* thin XP line along the pill's bottom edge: green = progress,
            dark = zero (same signals as the compact tiles). */}
        <div style={{
          position: 'absolute', left: 12, right: 12, bottom: 3,
          height: 2.5, borderRadius: 999, overflow: 'hidden',
          background: '#0A1318', pointerEvents: 'none',
        }}>
          {pct > 0 && <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: COL.xp }} />}
        </div>
      </button>
    );
  };

  return (
    <div style={{ ...panelStyle, overflowY: 'auto', WebkitMaskImage: 'none', maskImage: 'none' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 5,
        paddingBottom: 6,
      }}>
        {SECTION('Gathering')}
        {SKILL_GATHER.map(pill)}
        {SECTION('Crafting')}
        {SKILL_CRAFT.map(pill)}
      </div>
    </div>
  );
};
