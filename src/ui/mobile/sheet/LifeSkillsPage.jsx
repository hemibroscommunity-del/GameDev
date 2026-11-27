/* ═══ v2.3.6694: LIFE SKILLS, THE LANDING (card UI2-life, the build's step 6) ═══
 *
 * The owner, 2026-11-25, the master specification 4.4: "Sum of life skill levels as headline
 * statistic, encouraging growth across skills"; "Each skill destination includes a compact XP
 * progress bar so players can see proximity to the next level without opening every skill."  And
 * 2026-11-26, after playing the new dashboard (docs/design/UI_FEEDBACK_2026-11-26.md part 4): "Life
 * Skills. Enlarge the icons and cards to occupy the unused vertical space. Put level indicators
 * inside the cards instead of having badges protrude from them. Match the rest of the game's
 * typography."
 *
 * "Total level", the STAT (recessed, its number large: it opens nothing), the sum of the ten numbers
 * on screen (src/game/lifeProfile.js lifeTotal); under it the ten as equal doors (raised), in the
 * roster's display order, the gather row over the craft row, never resorted: each its picture (the
 * largest the tile holds: it takes what the words leave), its name at the size every navigation
 * tile wears (the kit's `u2-tile-label`), "Lv N" INSIDE the face among its words, a thin XP bar
 * inside it, and the brass dot of a level-up not yet looked at inside its edge (read BEFORE the page
 * marks them seen).  The tiles FILL the room's height: upright five across and two down under the
 * headline; sideways one row of eleven, the headline the first cell.  No radar, no label of what
 * kind of player you are, no "highest" badge (the specification's 4.1: the owner's to define).
 *
 * The page id stays `skills` (every road in lands here); under `?ui2=0` today's page
 * (dash/SkillsPanel.jsx) is drawn instead: SkillsPanel.jsx LifeSkillsDoor, BottomDashboard's PANELS.skills.
 * `who`: another player's page (step 9: nothing opens it yet) shows levels only. */
import React, { useEffect, useState } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashNavView } from '@/game/dashNav.js';
import { useClock, useRoom } from './CharacterPage.jsx';
import { unseenSkillKeys, markSkillsSeen } from './skillsModel.js';
import { lifeTiles, lifeTotal } from '@/game/lifeProfile.js';
import { LIFE_SKILLS } from '../../../data/lifeSkills.js';
import { Ui2Stat, ui2RootClass } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/lifePage.js';
import { say } from '@/game/say.js';
import './lifePage.css';

/* what moves the landing: the ten levels and their XP (the page's clock reads it) */
export function lifeKey(S, who) {
  const ls = who != null ? ((who && who.lifeSkills) || {}) : ((S && S.rpg && S.rpg.lifeSkills) || {});
  return LIFE_SKILLS.map((k) => (ls[k] ? (ls[k].level || 0) + ':' + (who != null ? '' : Math.floor(ls[k].xp || 0)) : '-')).join(',');
}

/** The thin XP bar inside a tile or a page (null frac: another player's, no bar). */
export function LifeBar({ frac, className }) {
  const v = Math.max(0, Math.min(1, Number(frac) || 0));
  return <span className={'u2-track u2-life-track' + (className ? ' ' + className : '')} aria-hidden="true"><span className="u2-fill" style={{ width: (v * 100).toFixed(1) + '%' }} /></span>;
}

/* a name may break only at its joint, and only where the tile is too narrow (a <wbr>: the name's
   text is unchanged, so a reader that matches "Fishing" still does).  Five across, "Woodworking" at
   the navigation size is 91 px and a tile 72 to 83 (sideways at 667 x 375, 57): Wood|working,
   Wood|cutting, Gem Cutting (its space), Trap|ping, Smith|ing ... */
export function nameJoints(name) {
  const n = String(name || '');
  if (/^Wood[a-z]/.test(n)) return ['Wood', n.slice(4)];   /* the compound's joint */
  if (/\s/.test(n)) return [n];                            /* its space */
  const m = /^(.*?([a-z]))(\2ing)$/.exec(n) || /^(.{3,})(ing)$/.exec(n);   /* Trap|ping; Fish|ing */
  return m ? [m[1], m[m.length - 1]] : [n];
}
function breakable(name) {
  return nameJoints(name).map((p, i) => <React.Fragment key={i}>{i ? <wbr /> : null}{p}</React.Fragment>);
}

/** whose page a frame page is: the stack entry's `who` (dashNav.js keeps it on a push) */
export function entryOf(id) {
  try {
    const t = dashNavView(dashboardPanelBus.nav()).top;
    return t && t.id === String(id) ? t : null;
  } catch (e) { return null; }
}

/**
 * getS  () => the game's state (handed by the choice: the page never reaches for it)
 * who   whose page (null: yours)
 */
export function LifeSkillsPage({ getS, who }) {
  const live = () => (typeof getS === 'function' ? getS() : null);
  useClock(() => lifeKey(live(), who), 600);
  const [ref, room] = useRoom();
  /* a level-up not yet looked at: read as the page opens, BEFORE opening it marks them seen (below),
     so each tile wears the dot for this visit (v2.3.3522's rule, kept) */
  const [fresh] = useState(() => { if (who != null) return []; const S1 = live(); return unseenSkillKeys((S1 && S1.rpg) || {}); });
  useEffect(() => { if (who == null) { const S1 = live(); markSkillsSeen((S1 && S1.rpg) || {}); } }, []);
  const S = live();
  const R = (S && S.rpg) || null;
  const tiles = lifeTiles(R, who == null ? null : who, fresh);
  const total = lifeTotal(R, who == null ? null : who);
  const open = (t) => dashboardPanelBus.go({ type: 'push', id: t.page, who: who == null ? undefined : who });
  const tile = (t) => (
    <button key={t.key} type="button" className="u2-raised u2-life-tile" data-life-door={t.key} data-life-lv={t.level}
      data-life-xp={t.frac == null ? '' : t.frac.toFixed(4)}
      aria-label={t.dot ? say(SAY, 'lifePage.tileAriaNew', { name: t.name, n: t.level }) : say(SAY, 'lifePage.tileAria', { name: t.name, n: t.level })}
      onClick={() => open(t)}>
      <span className="u2-life-pic"><img className="u2-life-art" src={t.art} alt="" draggable={false} /></span>
      <span className="u2-life-words">
        <span className="u2-tile-label u2-life-name">{breakable(t.name)}</span>
        <span className="u2-life-meta">
          <span className="u2-life-lv">{say(SAY, 'lifePage.lv', { n: t.level })}</span>
          {t.frac != null ? <LifeBar frac={t.frac} /> : null}
        </span>
      </span>
      {t.dot ? <span className="u2-dot u2-life-dot" data-skill-new="1" aria-hidden="true" /> : null}
    </button>
  );
  return (
    <div ref={ref} className={ui2RootClass() + ' u2-life' + (room.short ? ' is-short' : '')} data-life-page={who == null ? 'self' : 'other'}>
      <Ui2Stat className="u2-life-total" v={total} k={say(SAY, 'lifePage.total')} data-life-total={total}
        aria-label={say(SAY, 'lifePage.totalAria', { n: total })} />
      {tiles.map(tile)}
    </div>
  );
}

export default LifeSkillsPage;
