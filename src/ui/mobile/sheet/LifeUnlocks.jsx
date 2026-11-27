/* ═══ v2.3.6694: A LIFE SKILL'S WHOLE ROADMAP, "ALL UNLOCKS" (card UI2-life, reading 5) ═══
 *
 * The master specification 3.3: "Reveal all skill unlocks in the complete roadmap, including future
 * rewards"; "Categorize or drill down for large roadmaps while maintaining the dashboard height."
 *
 * Every rung of the skill's real ladder (src/game/lifeProfile.js lifeRoadmap: skillsModel.js's
 * tiers; farming's crops by the level each asks), one row each: its level, its name, and got / next
 * / later by a WORD and a mark, never colour alone.  The one page of Life Skills that may scroll
 * (the long list); it opens with the next rung in view.  Trapping and enchanting unlock nothing by
 * level: the kit's empty state, with the skill's own way to earn.  Nothing is invented. */
import React, { useEffect, useRef } from 'react';
import { deskWords } from '@/game/deskWords.js';
import { lifeRoadmap, lifeSkillOf, lifeSkillProgress, lifeShared } from '@/game/lifeProfile.js';
import { Ui2Facts, Ui2Fact, Ui2Empty, ui2RootClass } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/lifePage.js';
import { say } from '@/game/say.js';
import './lifePage.css';

/* a rung's state, a word and a mark (the words each key written out: say.test rule 7) */
function stateWords(st) {
  if (st === 'got') return { mark: '✓', word: say(SAY, 'lifePage.got') };
  if (st === 'next') return { mark: '▸', word: say(SAY, 'lifePage.nextState') };
  return { mark: '·', word: say(SAY, 'lifePage.later') };
}

export function LifeUnlocks({ S, skill, who }) {
  const ref = useRef(null);
  const sd = lifeSkillOf(skill);
  const p = lifeSkillProgress((S && S.rpg) || null, skill, who == null ? null : who);
  const road = sd ? lifeRoadmap(skill, p.level) : null;
  /* the next rung in view as the page opens (a scroll of the list's own box, once) */
  useEffect(() => {
    try {
      const el = ref.current && ref.current.querySelector('[data-life-rung-state="next"]');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    } catch (e) { /* no scroll */ }
  }, [skill]);
  /* v2.3.6694 (the mend of sitting 72): another player whose levels the worker did not send has none here
     (lifeProfile.js lifeShared): never yours, never 1 each */
  if (!lifeShared(who)) return <div className={ui2RootClass() + ' u2-lsu'} data-life-unshared=""><Ui2Empty title={say(SAY, 'lifePage.notShared')} /></div>;
  if (!sd) return null;
  return (
    <div ref={ref} className={ui2RootClass() + ' u2-lsu'} data-life-unlocks={skill} data-life-rungs={road ? road.length : 0}>
      {road ? (
        <Ui2Facts className="u2-lsu-list">
          {road.map((r, i) => {
            const w = stateWords(r.state);
            return (
              <Ui2Fact key={r.lvl + ':' + i} k={say(SAY, 'lifePage.rungLv', { n: r.lvl })} className={'u2-lsu-rung is-' + r.state}
                data-life-rung={r.lvl} data-life-rung-state={r.state} data-life-rung-name={r.name}
                v={<><span className="u2-lsu-name">{r.name}</span><span className={'u2-lsu-state is-' + r.state}><span aria-hidden="true">{w.mark}</span>{' '}{w.word}</span></>} />
            );
          })}
        </Ui2Facts>
      ) : (
        <Ui2Empty title={say(SAY, 'lifePage.noLadder')} why={deskWords(sd.earnHint)} art={sd.iconSrc} />
      )}
    </div>
  );
}

export default LifeUnlocks;
