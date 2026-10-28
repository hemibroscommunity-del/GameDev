import { COIN_ONE } from '@/game/coinArt.js';   /* v2.3.3734: the owner's coin piles */
import React from 'react';
import { BUFF_ICON } from '@/data/smallIcons.js'; /* v2.3.3524: the XP pill's "XP" star */

/* ═══ v2.3.3667: THE BENCHES' PARTS, SHARED ═══
 * The owner: "I also want the woodworking menu rehauled and modeled after the
 * blacksmith menu."  These are the Blacksmith's own pieces (SmithyPanel.jsx,
 * the v2.3.2826 rebuild: "Pictures and numbers, not sentences"), moved here
 * unchanged so the Woodworker's window (WoodworkPanel.jsx) is drawn from the
 * very same ones, not a copy that drifts:
 *   C     the colours (Lantern Slate);
 *   Icon  a picture with a fallback;
 *   Cost  an icon and HAVE/NEED, green when you have it, red when not;
 *   Chip  a plain fact (XP paid, odds);
 *   Lock  the one thing missing ("Smithing 6");
 *   Btn   the bench's button, brass when it is the row's action;
 *   Row   a recipe: picture (and badge), name, chips, its button. */

export const C = {
  sheet: '#1E2E34', well: '#111E23', raised: '#293B41', card: '#24363C',
  text: '#F4F0E7', sub: '#B6C1BE', mute: '#8D9B98', faint: '#667875',
  brass: '#D8AA58', good: '#55B98A', bad: '#D8635D', line: 'rgba(229,237,233,.11)',
};
export const ITEMS_V = '?v=2.3.1774';
export const COIN = COIN_ONE;   /* v2.3.3734: the owner's one coin, a unit beside a price */
/* v2.3.3524: the owner's "XP" star (the buff badge's), not the plain gold
   sparkle -- "Make the xp pill for smith items a different icon (one that's
   more obviously 'xp')".  Warmed on the loading screen with the buff badges
   (smallIcons.js smallIconDomUrls). */
export const XP = BUFF_ICON.xp;

export const Icon = ({ src, size = 18, fallback }) => (
  <img src={src} alt="" draggable={false} style={{ width: size, height: size, objectFit: 'contain', flex: 'none' }}
    onError={(e) => { if (fallback && e.currentTarget.src.indexOf(fallback) < 0) e.currentTarget.src = fallback; else e.currentTarget.style.visibility = 'hidden'; }} />
);

/* A cost: icon + have/need, green or red. */
export function Cost({ icon, have, need, fallback }) {
  const ok = have >= need;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px 2px 4px', borderRadius: 999,
      background: C.well, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: ok ? C.good : C.bad }}>
      <Icon src={icon} size={16} fallback={fallback} />{Math.floor(have)}/{need}
    </span>
  );
}
/* A plain fact chip (XP paid, odds). */
export function Chip({ icon, children, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px 2px 4px', borderRadius: 999,
      background: C.well, fontSize: 12, fontWeight: 700, color: color || C.sub }}>
      {icon ? <Icon src={icon} size={16} /> : null}{children}
    </span>
  );
}
export function Lock({ children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 999,
      background: 'rgba(216,99,93,.14)', fontSize: 12, fontWeight: 700, color: '#E59A94' }}>
      <span className="ls-lock" />{children}
    </span>
  );
}
export function Btn({ on, onClick, children, primary, ...rest }) {
  return (
    <button disabled={!on} onClick={() => { if (on) onClick(); }} {...rest}
      style={{ minHeight: 44, minWidth: 84, padding: '0 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
        fontFamily: 'inherit', flex: 'none', cursor: on ? 'pointer' : 'default',
        border: on ? (primary ? '1px solid #EAC675' : '1px solid rgba(229,237,233,.20)') : `1px solid ${C.line}`,
        background: on ? (primary ? 'linear-gradient(180deg,#E2B765,#D2A14D)' : C.raised) : '#1A292F',
        color: on ? (primary ? '#172126' : C.text) : C.mute }}>
      {children}
    </button>
  );
}
export function Row({ icon, iconFallback, title, badge, children, action, ...rest }) {
  return (
    <div {...rest} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', background: C.card,
      borderRadius: 12, marginBottom: 8 }}>
      <div style={{ width: 48, height: 48, borderRadius: 10, background: C.well, display: 'grid', placeItems: 'center', flex: 'none', position: 'relative' }}>
        <Icon src={icon} size={40} fallback={iconFallback} />
        {badge ? <span style={{ position: 'absolute', right: -4, bottom: -4, padding: '0 5px', borderRadius: 8, background: C.raised,
          border: `1px solid ${C.line}`, fontSize: 11, fontWeight: 800, color: C.text }}>{badge}</span> : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{children}</div>
      </div>
      {action}
    </div>
  );
}
