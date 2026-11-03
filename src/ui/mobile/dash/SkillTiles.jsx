import React from 'react';
import { COL } from './common.js';

/* ═══ v2.3.4162: THE THREE COMBAT SKILLS' TILES, IN ONE PLACE ═══
 * Melee, Bow and Magic (combatSkill.js WEAPON_SKILLS), each its big picture
 * and "Lv N".  They were born on the Gear tab's card (v2.3.4151, the owner:
 * "Melee bow magic each need just their large icons and levels similar to
 * old bag layout with the 3 combat skills.  If you tap on it it should turn
 * into the xp bar").  Then, on #1386: "Move the 3 primary combat skills out
 * of the gear menu and put them into the bro menu."  So the tile lives here,
 * and two pages draw it:
 *   - the Bro page's middle panel (sheet/BroCard.jsx): the three tiles ARE
 *     the weapon picker over "Combat Stats" (the old Sword | Bow | Staff
 *     buttons are gone).  "Lv N" sits ABOVE the picture (`lvAbove`), so a
 *     tile does not read as a weapon lying in the bag; the weapon whose stats
 *     show wears the gold edge (`selected`, the pressed look of the Bro
 *     page); a tap there turns THAT tile into its XP bar (`xp`) for
 *     SKILL_XP_HOLD_MS, then back to the picture;
 *   - the Gear tab's card (dash/GearTab.jsx), exactly as v2.3.4151 drew it:
 *     the picture over "Lv N", and a tap opens the row-wide bar
 *     (SkillXpWide).  A pure move: the same elements, the same styles, the
 *     same data-* hooks (mp-geartab, mp-gearshots and mp-xpfly read them).
 *     Lane A takes the tiles off the Gear tab in its own PR.
 * The XP flight (xpLanding: the number that jumps from a kill into its
 * skill) still lands on the Gear tab's tiles: only the Gear tab passes the
 * registerXpCard ref and the data-xpbar hooks (in `attrs`).  The Bro tiles
 * read the live XP, never xpLanding's held value (displayXp writes its
 * state as it reads; one reader is enough).
 *
 * Inline styles, as the Gear tab draws everything; touch-action:
 * manipulation on every tile (TRAPS §229); a mouse clicks it the same. */

/** How long a Bro tile shows its XP bar after a tap (the Gear tab's own
 *  4 s, gearTabBus XP_HOLD_MS). */
export const SKILL_XP_HOLD_MS = 4000;

const FONT_MIN = 11;   /* the owner's floor for anything in the card */
const GOLD = '#E2B866';   /* the Bro page's pressed edge (the old selector's) */
const XP_FILL = '#8AA9F9';

/** The XP words: "68 / 455 XP" ("12.3K / 20.7K XP" past 9,999, so a narrow
 *  tile wraps the line at a space, never mid-number). */
function xpWords(prog, thresh, compact) {
  const f = (n) => (compact && n >= 10000
    ? (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'K'
    : Number(n).toLocaleString('en-US'));
  return `${f(prog)} / ${f(thresh)} XP`;
}

/**
 * One skill's tile.
 *   s, k       the skill (WEAPON_SKILLS) and its state (combatSkillState)
 *   short      the Gear tab's one-row band: a small picture beside "Lv N"
 *   attrs      the page's own hooks (data-*, aria-label, a ref)
 *   onTap      the tap (its propagation stopped: the band's own tap is not it)
 *   lvAbove    "Lv N" over the picture (the Bro page)
 *   selected   the gold edge (aria-pressed)
 *   iconPx     the picture's size (40, the Gear tab's)
 *   xp         { prog, thresh } | 'max': the tile IS its XP bar right now
 *   style      the page's own box (merged last)
 */
export function SkillTile({ s, k, short = false, attrs, onTap, lvAbove = false, selected = false, iconPx = 40, xp = null, style }) {
  const lv = (
    <span style={{
      flex: 'none', fontSize: 12, fontWeight: 900, color: selected ? '#F6D58A' : COL.text,
      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
      ...(lvAbove ? { fontSize: 13, lineHeight: 1.1 } : null),
    }}>Lv {k.lvl}</span>
  );
  let middle;
  if (xp) {
    const pct = xp === 'max' || !(xp.thresh > 0) ? 100 : Math.min(100, (xp.prog / xp.thresh) * 100);
    middle = (
      <span data-skill-xp="" style={{ flex: '1 1 0', minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 4px', boxSizing: 'border-box' }}>
        <span aria-hidden="true" style={{ display: 'block', width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', background: COL.wellDeep, boxShadow: `inset 0 0 0 1px ${COL.borderStrong}` }}>
          <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: XP_FILL }} />
        </span>
        <span data-skill-xpnum="" style={{ maxWidth: '100%', fontSize: FONT_MIN, fontWeight: 800, lineHeight: 1.15, color: COL.text, textAlign: 'center', fontVariantNumeric: 'tabular-nums', overflowWrap: 'normal' }}>
          {xp === 'max' ? 'Fully levelled' : xpWords(xp.prog, xp.thresh, true)}
        </span>
      </span>
    );
  } else if (short) {
    middle = <img src={s.iconSrc} alt="" draggable={false} style={{ width: 16, height: 16, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />;
  } else {
    middle = (
      <span style={{ flex: '1 1 0', minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={s.iconSrc} alt="" draggable={false} style={{ maxWidth: '100%', maxHeight: '100%', width: iconPx, height: iconPx, objectFit: 'contain', pointerEvents: 'none' }} />
      </span>
    );
  }
  return (
    <button type="button" {...(attrs || null)}
      {...(lvAbove ? { 'aria-pressed': !!selected } : null)}
      onClick={(e) => { e.stopPropagation(); if (onTap) onTap(); }}
      style={{
        flex: '1 1 0', minWidth: 0, minHeight: 0, boxSizing: 'border-box', padding: short ? '0 3px' : '3px 2px', borderRadius: short ? 6 : 8,
        display: 'flex', flexDirection: short ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: short ? 4 : 2,
        border: `1px solid ${COL.borderStrong}`, background: COL.wellSoft, color: COL.text, fontFamily: 'inherit',
        cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
        ...(selected ? {
          border: `1px solid ${GOLD}`,
          background: `linear-gradient(0deg, rgba(216,170,88,.18), rgba(216,170,88,.18)), ${COL.wellSoft}`,
          boxShadow: 'inset 0 0 0 1px rgba(255,214,128,.18)',
        } : null),
        ...(style || null),
      }}>
      {lvAbove && !short ? <>{lv}{middle}</> : <>{middle}{lv}</>}
    </button>
  );
}

/**
 * The Gear tab's open tile: the row-wide XP bar (v2.3.4151, moved unchanged)
 * -- the picture, the skill's name and "Lv N", the bar, "68 / 455 XP".
 *   prog, thresh  the numbers to show (the Gear tab's: xpLanding's held value)
 */
export function SkillXpWide({ s, k, short = false, prog, thresh, attrs, onTap }) {
  return (
    <button type="button" {...(attrs || null)}
      onClick={(e) => { e.stopPropagation(); if (onTap) onTap(); }}
      style={{
        flex: '1 1 0', minWidth: 0, minHeight: 0, boxSizing: 'border-box', padding: short ? '0 6px' : '4px 8px', borderRadius: short ? 6 : 8,
        display: 'flex', flexDirection: short ? 'row' : 'column', alignItems: short ? 'center' : undefined, justifyContent: 'center', gap: short ? 5 : 4,
        border: `1px solid ${COL.borderStrong}`, background: COL.wellSoft, color: COL.text, fontFamily: 'inherit', textAlign: 'left',
        cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
      }}>
      {short ? (
        <img src={s.iconSrc} alt="" draggable={false} style={{ width: 16, height: 16, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', minWidth: 0 }}>
          <img src={s.iconSrc} alt="" draggable={false} style={{ width: 20, height: 20, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
          <span style={{ flex: 'none', fontSize: 12, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>Lv {k.lvl}</span>
        </span>
      )}
      <span aria-hidden="true" data-xpbar={k.p3cat || undefined} data-xpprog={k.xp ? prog : undefined} data-xpthresh={k.xp ? thresh : undefined}
        style={{ display: 'block', width: short ? 'auto' : '100%', flex: short ? '1 1 0' : undefined, minWidth: 0, height: 7, borderRadius: 4, overflow: 'hidden', background: COL.wellDeep }}>
        <span style={{ display: 'block', height: '100%', width: `${k.xp && thresh > 0 ? Math.min(100, (prog / thresh) * 100) : 100}%`, background: XP_FILL }} />
      </span>
      <span data-gear-xpnum="" style={{ fontSize: FONT_MIN, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {k.xp ? (short ? `${prog.toLocaleString()}/${thresh.toLocaleString()}` : `${prog.toLocaleString()} / ${thresh.toLocaleString()} XP`) : 'Fully levelled'}
      </span>
    </button>
  );
}
