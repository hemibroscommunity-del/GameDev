/* ═══ v2.3.6694: A LIFE SKILL'S PAGE, AND "HOW IT WORKS" (card UI2-life, readings 4, 6 and 7) ═══
 *
 * The master specification 3.3: "A dedicated skill screen presents current level, XP progress
 * (current/required and next-level proximity), and a compact milestone roadmap"; "Meaningful
 * unlocks, not arbitrary intervals, occupy milestone nodes."
 *
 * A skill's page (ten frame pages, one a skill: src/game/lifeProfile.js LIFE_PAGE_OF; the header its
 * name): its level and XP (progression.js progressOf with the WORKER's need at every level,
 * lifeSkillProgress), then FACTS in one container (the next unlock, the latest one, the guild's line,
 * a flat door to today's Guilds page), and two raised doors: "All unlocks (n)" (LifeUnlocks.jsx, the
 * whole ladder) and "How it works" (the detail lines today's page has, sheet/SkillHow.jsx).
 *
 * THE ROOM (the master notes' part 3): 172 px upright at 390 x 844 (168 at 375 x 667): the level
 * row, then the facts beside the two doors stacked (the guild's door is 44 px: under the doors the
 * facts would need 176).  Sideways (63 px): one row, the level, the next unlock and the guild's line
 * side by side, the doors; the latest unlock is All unlocks' (a line that does not fit becomes a
 * door), the next unlock never only there.
 *
 * Another player's page (`who`, step 9: nothing opens it yet) shows levels only: no XP, no "How it
 * works". */
import React, { useEffect } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { useClock, useRoom } from './CharacterPage.jsx';
import { LifeBar, lifeKey } from './LifeSkillsPage.jsx';
import { LifeUnlocks } from './LifeUnlocks.jsx';
import { SkillHow } from './SkillHow.jsx';
import { lifeKeyOfPage, lifeSkillOf, lifeSkillProgress, lifeSkillFacts, lifeGuildLine, LIFE_UNLOCKS_PAGE, LIFE_HOW_PAGE } from '@/game/lifeProfile.js';
import { Ui2Facts, Ui2Fact, Ui2Tile, ui2RootClass } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/lifePage.js';
import { say } from '@/game/say.js';
import './lifePage.css';

const fmt = (n) => (Number(n) || 0).toLocaleString('en-US');
const rungWords = (r, more) => (more > 0 ? say(SAY, 'lifePage.unlockAtMore', { lvl: r.lvl, name: r.name, more }) : say(SAY, 'lifePage.unlockAt', { lvl: r.lvl, name: r.name }));

/**
 * S      the game's state (handed by BroCard)
 * skill  the skill (a LIFE_SKILLS key)
 * who    whose page (null: yours)
 */
export function LifeSkillPage({ S, skill, who, live }) {
  useClock(() => lifeKey(live ? live() : S, who), 600);
  const [ref, room] = useRoom();
  const sd = lifeSkillOf(skill);
  const R = (S && S.rpg) || null;
  const self = who == null;
  const p = lifeSkillProgress(R, skill, self ? null : who);
  const f = lifeSkillFacts(skill, p.level);
  const g = lifeGuildLine(skill, p.level);
  useEffect(() => {
    try { window.__btLifePage = { skill, level: p.level, xpNow: p.xpNow, xpNeed: p.xpNeed, next: f.next, n: f.n }; } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btLifePage = null; } catch (e) { /* no window */ } }, []);
  if (!sd) return null;
  const push = (id) => dashboardPanelBus.go({ type: 'push', id, sel: skill, who: self ? undefined : who });
  const short = room.short;
  const xpWords = p.xpNow == null ? '' : say(SAY, 'lifePage.xp', { now: fmt(p.xpNow), need: fmt(p.xpNeed) });
  const level = (
    <div className="u2-group u2-lsp-level" data-life-level={p.level} data-life-xp={p.xpNow == null ? '' : p.xpNow + '/' + p.xpNeed}>
      <img className="u2-lsp-art" src={sd.iconSrc} alt="" draggable={false} />
      <span className="u2-lsp-lv">{say(SAY, 'lifePage.lv', { n: p.level })}</span>
      {p.xpNow != null ? (
        <span className="u2-bar u2-lsp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.frac * 100)} aria-label={xpWords}>
          <span className="u2-bar-top"><span>{short ? '' : say(SAY, 'lifePage.xpLeft', { left: fmt(p.xpNeed - p.xpNow), next: p.level + 1 })}</span><b>{xpWords}</b></span>
          <LifeBar frac={p.frac} className="u2-lsp-track" />
        </span>
      ) : null}
    </div>
  );
  const next = !f.ladder
    ? <Ui2Fact k={say(SAY, 'lifePage.next')} v={say(SAY, 'lifePage.noLadder')} none data-life-next="" />
    : f.next
      ? <Ui2Fact k={say(SAY, 'lifePage.next')} v={rungWords(f.next, f.nextAlso)} gold data-life-next={f.next.lvl} />
      : <Ui2Fact k={say(SAY, 'lifePage.next')} v={say(SAY, 'lifePage.allReached')} none data-life-next="" />;
  const latest = f.ladder && !short
    ? (f.latest
      ? <Ui2Fact k={say(SAY, 'lifePage.latest')} v={rungWords(f.latest, f.latestAlso)} data-life-latest={f.latest.lvl} />
      : <Ui2Fact k={say(SAY, 'lifePage.latest')} v={say(SAY, 'lifePage.noneYet')} none data-life-latest="" />)
    : null;
  const guild = g
    ? <Ui2Fact k={g.guild} v={g.rank} data-life-guild={skill} aria-label={say(SAY, 'lifePage.guildAria', { guild: g.guild, rank: g.rank })}
        onClick={() => dashboardPanelBus.go({ type: 'push', id: 'guild' })} />
    : null;
  const doors = (
    <div className="u2-lsp-doors">
      <Ui2Tile size="compact" label={say(SAY, 'lifePage.allUnlocks', { n: f.n })} data-life-all={f.n} onClick={() => push(LIFE_UNLOCKS_PAGE)} />
      {self ? <Ui2Tile size="compact" label={say(SAY, 'lifePage.how')} data-life-how-door="" onClick={() => push(LIFE_HOW_PAGE)} /> : null}
    </div>
  );
  return (
    <div ref={ref} className={ui2RootClass() + ' u2-lsp' + (short ? ' is-short' : '')} data-life-skill={skill} data-life-who={self ? 'self' : 'other'}>
      {level}
      <div className="u2-lsp-body">
        <Ui2Facts dir={short ? 'row' : undefined} className="u2-lsp-facts">{next}{latest}{guild}</Ui2Facts>
        {doors}
      </div>
    </div>
  );
}

/** "How it works": today's detail lines (sheet/SkillHow.jsx), as facts; yours only. */
export function LifeHowPage({ S, skill }) {
  const sd = lifeSkillOf(skill);
  if (!sd) return null;
  const p = lifeSkillProgress((S && S.rpg) || null, skill, null);
  return (
    <div className={ui2RootClass() + ' u2-lsh'} data-life-how={skill}>
      <Ui2Facts className="u2-lsh-facts">
        <SkillHow S={S} sd={sd} lvl={p.level} row={(k, v) => <Ui2Fact key={k} k={k} v={v} className="u2-lsh-row" />}
          hint={(t) => <p className="u2-lsh-hint">{t}</p>} />
      </Ui2Facts>
    </div>
  );
}

/**
 * BroCard's one call for the life pages (src/game/broHub.js BRO_HUB_PAGES: 'life', 'lifeUnlocks',
 * 'lifeHow'): a skill's page by its id, All unlocks and How it works by the stack entry's `sel`.
 */
export function LifeDoor({ S, door, page, sel, who }) {
  const skill = door === 'life' ? lifeKeyOfPage(page) : (lifeSkillOf(sel) ? String(sel) : null);
  if (!skill) return null;
  if (door === 'lifeUnlocks') return <LifeUnlocks S={S} skill={skill} who={who == null ? null : who} />;
  if (door === 'lifeHow') return who == null ? <LifeHowPage S={S} skill={skill} /> : null;
  return <LifeSkillPage S={S} skill={skill} who={who == null ? null : who} />;
}

export default LifeSkillPage;
