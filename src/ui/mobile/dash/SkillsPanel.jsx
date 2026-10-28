import React, { useEffect, useState } from 'react';
import { deskWideActive } from '../../deskWide.js';   /* v2.3.3687 */
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3615: "tap" reads "click" on a computer */
import { COL, panelStyle, getState } from './common.js';
import { skillXpRequired } from '../../../data/items.js';
import { gatherHitOddsText } from '../../../data/lifeSkills.js'; /* v2.3.3229: the hit ladder's odds */
import { SKILL_GATHER, SKILL_CRAFT, SKILL_ROSTER, skillUnlocks, markSkillsSeen, skillXpFade, xpShareText, unseenSkillKeys /* v2.3.3522 */ } from '../sheet/skillsModel.js';
import { xpDecayOn } from '../../../data/xpDecay.js'; /* v2.3.3251: the XP fade's lines */
import { skillDetailBus } from '../sheet/skillDetailBus.js';
import { panelVw } from '../playViewport.js'; /* v2.3.2173: the sheet's width, not the shell's */

/* v2.3.1224: roster corrected to the canonical 10 LIFE_SKILLS (owner
   directive).  v2.3.1286 (nav-system): 3-column card grid on the shared
   roster; XP CURVE FIX — progress uses skillXpRequired (items.js,
   500·1.08^(level-1); 1000·1.08^(level-1) since v2.3.3090), the exact award
   curve.
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

/* v2.3.1337 (owner): the GATHERING/CRAFTING section labels are gone —
   they cost two grid rows that pushed the last skills under the fold.
   Order is unchanged (gathering five, then crafting five), so the
   grouping survives spatially without the headings. */

export const SkillsPanel = () => {
  const [, force] = useState(0);
  const [detailKey, setDetailKey] = useState(() => skillDetailBus.consumeOpen());
  /* v2.3.3522: the skills with a level-up not yet looked at, read as the page
     opens -- before opening it marks them seen (below) -- so each tile can
     wear the dashboard's dot for this visit */
  const [fresh] = useState(() => { const S0 = getState(); return unseenSkillKeys((S0 && S0.rpg) || {}); });
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
    const sk = ls[sd.key] || { level: 1, xp: 0 };
    const lvl = sk.level || 1;   /* v2.3.3041: a skill is never level 0 (the worker reads 0 as 1) */
    const need = Math.max(1, skillXpRequired(lvl));
    const xp = Math.floor(sk.xp || 0);
    const pct = Math.min(100, (xp / need) * 100);
    const un = skillUnlocks(sd, lvl);
    /* v2.3.3229: THE HIT LADDER.  A harvest or a cook is a run of hits the
       worker rolls (caps.gatherhits), each one a ten-sided die read down from
       this skill's level -- so print what one hit can be now and at the next
       level, the owner's "10% chance of hitting 1 number higher" per level.
       The odds are the ones THIS worker rolls: the ladder's with
       caps.hitladder, the even 1..level without it (an older worker, or the
       kill switch). */
    const hitsOn = !!(sd.hits && S && S._serverCaps && S._serverCaps.gatherhits);
    const fade = xpDecayOn(S) ? skillXpFade(sd, lvl) : null;   /* v2.3.3251 */
    const ladder = !!(S && S._serverCaps && S._serverCaps.hitladder);
    const row = (label, value) => (
      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0', borderBottom: `1px solid ${COL.divider}`, minWidth: 0 }}>
        <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: COL.muted }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: COL.text, textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
    );
    return (
      <div style={{ ...panelStyle, overflowY: 'auto' }}>
        {/* Back to the roster — in-panel, no sheet-height change. */}
        {/* v2.3.3481: the 2026-10-19 UI review -- the only way back was a
            53 x 25 target.  game.css .bt-back-link gives it an invisible
            ring (~95 x 39) into the empty row beside it and the top of the
            header under it; the words and the look are unchanged. */}
        <button className="bt-back-link"
          onPointerUp={(e) => { e.stopPropagation(); setDetailKey(null); }}
          style={{
            position: 'relative',
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
        {hitsOn && <div data-hit-odds={lvl} style={{ display: 'contents' }}>
          {row('Each hit', gatherHitOddsText(lvl, ladder))}
          {row(`At Lv ${lvl + 1}`, gatherHitOddsText(lvl + 1, ladder))}
        </div>}
        {/* v2.3.3251: which resources pay full XP at this level, and the
            nearest that pay less (xpDecay.js) -- only against a worker that
            fades it (caps.xpdecay) */}
        {fade && <div data-xp-fade={lvl} style={{ display: 'contents' }}>
          {row('Full XP', fade.full.length ? fade.full.join(', ') : 'Nothing at your level')}
          {fade.less.length > 0 && row('Less XP', fade.less.slice(0, 2).map(x => `${x.name} ${xpShareText(x.share)}`).join(' · ') + (fade.less.length > 2 ? ' …' : ''))}
        </div>}
        {un && un.current.length > 0 && row('Unlocked', un.current.join(', '))}
        {un && un.next && row('Next unlock', `${un.next.name} at Lv ${un.next.lvl}`)}
        {un && un.later && row('Later', `${un.later.name} at Lv ${un.later.lvl}`)}
        {sd.passive && row('Benefit', sd.passive(lvl))}
        {sd.timerPassive && !hitsOn && row('Benefit', sd.timerPassive(lvl))}
        {sd.where && row('Found at', sd.where)}
        <div style={{ fontSize: 11.5, color: COL.text2, lineHeight: 1.4, paddingTop: 6 }}>
          {deskWords(sd.earnHint)}
        </div>
        {!un && (
          <div style={{ fontSize: 11, color: COL.muted, lineHeight: 1.4, paddingTop: 4 }}>
            Higher levels improve results and unlock new content as it's added.
          </div>
        )}
      </div>
    );
  }

  /* ═══ v2.3.3522: A HOME SCREEN OF SKILLS, NOT A LIST OF PILLS ═══
     The owner, playtesting: "Make the lifeskills menu look more like iPhone
     apps instead of elongated pills."  This reverses the owner's own
     v2.3.1312b ask ("make the expanded view pill shaped so they all fit
     without scrolling") -- its other half, all ten on one screen with no
     scroll, stays.
     Five across, two rows -- the roster's own order, the five gathering
     skills over the five crafting ones (META's "Five columns, gathering row
     then crafting row"), never re-sorted.  Each skill is an app: a
     rounded-square tile (22% corners) on a dark ground tinted by the skill's
     own accent, its painted icon big in it, its name under it in one line
     (an ellipsis if a phone is too narrow, as a home screen does), its level
     on a chip at the tile's top right, its XP a thin green bar along the
     tile's bottom edge, and the dashboard's brass dot at its top left while a
     level-up waits to be seen.  A press shrinks the tile (game.css
     .bt-skill-app, transform only).  Sideways (the column under 260 px) three
     across, scrolling, as that column has height to spare and no width.
     `data-skill` stays on each button: the scenarios tap skills by it. */
  const sideways = panelVw() < 260;
  /* v2.3.3687: on a computer playing wide the column is the window's height
     (deskWide.js): three across, bigger tiles, the rows spread down it --
     the owner, "Every menu needs to look like it fits the space" */
  const desk = deskWideActive();
  const tilePx = desk ? 92 : SKILL_TILE_PX;
  const tile = (sd) => {
    const sk = ls[sd.key] || { level: 0, xp: 0 };
    const lvl = sk.level || 1;   /* v2.3.3041: a skill is never level 0 */
    const need = Math.max(1, skillXpRequired(lvl));   /* v2.3.3041: the worker's price */
    const pct = Math.min(100, ((sk.xp || 0) / need) * 100);
    const acc = sd.accent || '#8B9695';
    const iconPx = desk ? Math.min(76, Math.round(66 * (sd.iconScale || 1))) : Math.min(44, Math.round(38 * (sd.iconScale || 1)));
    return (
      <button key={sd.key} data-skill={sd.key} className="bt-skill-app"
        aria-label={`${sd.name}, level ${lvl}`}
        onPointerUp={(e) => {
          e.stopPropagation();
          skillDetailBus.select(sd.key);
          setDetailKey(sd.key);
        }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          minWidth: 0, padding: 0, margin: 0, border: 0, background: 'transparent',
          cursor: 'pointer', touchAction: 'manipulation',
          fontFamily: 'Source Sans 3, sans-serif', color: COL.text,
        }}>
        <span className="bt-skill-app-tile" data-skill-tile={sd.key} style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: tilePx, height: tilePx, borderRadius: '22%', boxSizing: 'border-box',
          /* the skill's accent, laid thin over the dark slate: a tint, never a
             bright fill (Lantern Slate: content colour ~10%) */
          background: `linear-gradient(160deg, ${hexA(acc, 0.42)} 0%, ${hexA(acc, 0.16)} 55%, rgba(0,0,0,0) 100%), #182227`,
          border: `1px solid ${hexA(acc, 0.55)}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.10), 0 2px 4px rgba(0,0,0,.35)',
        }}>
          {sd.iconSrc
            ? <img src={sd.iconSrc} alt="" draggable={false}
                style={{ width: iconPx, height: iconPx, objectFit: 'contain', pointerEvents: 'none' }}
                onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sd.icon)); }} />
            : <span style={{ fontSize: 26 }}>{sd.icon}</span>}
          {/* the level, on a chip at the tile's corner */}
          <span data-skill-level={lvl} style={{
            position: 'absolute', top: -5, right: -6,
            minWidth: 18, padding: '0 4px', boxSizing: 'border-box',
            fontSize: 11, fontWeight: 800, lineHeight: '15px', textAlign: 'center',
            color: COL.text, background: '#121B20',
            border: `1px solid ${hexA(acc, 0.75)}`, borderRadius: 8,
            fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
          }}>{`Lv ${lvl}`}</span>
          {/* a level-up not yet looked at: the dashboard's brass dot */}
          {fresh.indexOf(sd.key) >= 0 && <span data-skill-new="1" aria-hidden="true" style={{
            position: 'absolute', top: -3, left: -3, width: 9, height: 9, borderRadius: '50%',
            background: '#D8AA58', border: '1px solid rgba(0,0,0,.5)', pointerEvents: 'none',
          }} />}
          {/* the XP, a thin bar along the tile's bottom edge: green is
              progress, dark is none (the old pill's signals) */}
          <span style={{
            position: 'absolute', left: 7, right: 7, bottom: 4,
            height: 3, borderRadius: 999, overflow: 'hidden',
            background: 'rgba(10,19,24,.85)', pointerEvents: 'none',
          }}>
            {pct > 0 && <span style={{ display: 'block', width: pct + '%', height: '100%', borderRadius: 999, background: COL.xp }} />}
          </span>
        </span>
        {/* v2.3.3555: a name of eleven letters or more one px smaller --
            sideways the column holds three tiles of ~75 px, and "Woodworking"
            at 11 px came out "Woodworki…" (mp-landdash) */}
        <span style={{
          display: 'block', maxWidth: '100%', fontSize: String(sd.name || '').length >= 11 ? 10 : 11, fontWeight: 700, lineHeight: '13px',
          color: COL.text, textAlign: 'center',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{sd.name}</span>
        {/* v2.3.3769: on a computer, the XP to the next level in numbers
            (the detail's own: the worker's price, skillXpRequired) */}
        {desk ? (
          <span data-skill-xp="" style={{
            display: 'block', fontSize: 10.5, fontWeight: 600, lineHeight: '12px', color: COL.text2,
            fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
          }}>{`${Math.floor(sk.xp || 0)} / ${need} XP`}</span>
        ) : null}
      </button>
    );
  };

  return (
    <div style={{ ...panelStyle, overflowY: 'auto', WebkitMaskImage: 'none', maskImage: 'none' }}>
      <div data-skill-grid={desk ? 'desk' : sideways ? 'side' : 'home'} style={{
        display: 'grid',
        gridTemplateColumns: sideways || desk ? 'repeat(3, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))',
        columnGap: 4, rowGap: 8,
        /* v2.3.3769: packed at the top, not spread down the column.  Spread
           (v2.3.3687, the owner's "Every menu needs to look like it fits the
           space"), the four rows of a tall window stood ~180 px apart with
           wide empty bands between them, which read as gaps, not as fit
           (the 2026-10-28 desktop review; the owner: "As you find
           improvements you can make to the empty space on the desktop
           version go ahead").  Each tile carries its XP to the next level
           in numbers now, and the column ends in the weapons row
           (BottomDashboard's DeskFoot). */
        ...(desk ? { alignContent: 'start', rowGap: 16, boxSizing: 'border-box' } : null),
        /* room above the first row for the level chips and the dots, which
           hang a few px outside their tiles */
        padding: '6px 2px 4px',
      }}>
        {SKILL_GATHER.map(tile)}
        {SKILL_CRAFT.map(tile)}
      </div>
    </div>
  );
};

/* v2.3.3522: a skill's tile, CSS px a side (the home screen's app) */
const SKILL_TILE_PX = 52;
/* #RRGGBB at alpha `a`, for the tiles' accent tint and edge */
function hexA(hex, a) {
  const v = parseInt(String(hex).replace('#', ''), 16);
  if (!Number.isFinite(v)) return `rgba(139,150,149,${a})`;
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}
