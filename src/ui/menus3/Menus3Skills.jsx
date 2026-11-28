/* ═══ v2.3.6865: BRO · SKILLS IN THE NEW PANEL (card MN step 6) ═══
 *
 * The owner's Skills (docs/design/menus3/SPEC.md "You": "10 life skills
 * (level, XP, unlocks, how it works): Bro · Skills -> skill"; "Skill guilds
 * (rank, next reward, quests): inline on that skill's page"), the third of
 * Bro's sections: after this step the Bag, Power and Skills are all the
 * panel's.  The rules are src/game/menus3Skills.js's; this draws them.
 *
 *   - THE TEN (the section's own page): "Total level" (today's landing's
 *     headline) over the ten as tiles in the roster's order, the gather row
 *     over the craft row (the wireframe draws six: its sample), each its
 *     picture, name, "Lv N" and a thin XP bar, and the brass dot of a
 *     level-up not yet looked at (read as the page opens, then marked seen,
 *     as today's page does: the Skills tab's dot is the same reading);
 *   - A SKILL'S PAGE (Back in the header): its level and XP to the next,
 *     the next and the latest unlock, "All unlocks (n)" (the whole ladder,
 *     a page of its own with Back), today's "How it works" lines
 *     (sheet/SkillHow.jsx, the one piece), and its GUILD inline, as today's
 *     guild window tells it: the guild and its master, the rank and the way
 *     to the next, the guild's quest with its reward and its ONE Claim
 *     (today's request, `guild_quest_turn_in`, through act(); without the
 *     worker's caps.guilds today's "Not open yet"), the ranks with their AP,
 *     the guildmaster's line, the titles earned.
 *
 * Nothing loads because the page opened beyond what today's skills pages
 * load: the skill pictures are today's (/icons/ui/skill-*.webp, an <img> as
 * every skills page draws them; not preloaded today either: a flag).  The
 * marks (reached, not yet) are drawn, never a text glyph. */
import React, { useEffect, useState } from 'react';
import { act } from '@/game/actions.js';
import { skillsGrid, skillPage, skillLadder, skillGuild, guildClaim, guildStep, skillsKey, isLifeSkill } from '@/game/menus3Skills.js';
import { lifeSkillOf } from '@/game/lifeProfile.js';
import { unseenSkillKeys, markSkillsSeen, hasUnseenLevelUps } from '@/ui/mobile/sheet/skillsModel.js';
import { SkillHow } from '@/ui/mobile/sheet/SkillHow.jsx';
import { useClock } from '@/ui/mobile/sheet/CharacterPage.jsx';
import { menus3Bus } from './menus3Wire.js';
import { SAY } from '@/data/say/menus3Skills.js';
import { SAY as SAY_L } from '@/data/say/lifePage.js';
import { say } from '@/game/say.js';

/* the guildmaster's line, each key written out (the say guard reads them) */
const QUOTE = {
  q10: () => say(SAY, 'menus3Skills.q10'), q25: () => say(SAY, 'menus3Skills.q25'), q50: () => say(SAY, 'menus3Skills.q50'),
  q75: () => say(SAY, 'menus3Skills.q75'), q100: () => say(SAY, 'menus3Skills.q100'), qMax: () => say(SAY, 'menus3Skills.qMax'),
};
const quoteOf = (k) => (Object.prototype.hasOwnProperty.call(QUOTE, k) ? QUOTE[k]() : '');
const DOT = ' \u00B7 ';
const OFFLINE = 'offline';   /* the claim's note when the request could not leave (guildClaim's own word) */
const fmt = (n) => (Number(n) || 0).toLocaleString('en-US');
const rungWords = (r, more) => (more > 0 ? say(SAY_L, 'lifePage.unlockAtMore', { lvl: r.lvl, name: r.name, more }) : say(SAY_L, 'lifePage.unlockAt', { lvl: r.lvl, name: r.name }));

/** The Skills tab's dot (the panel's header): today's reading, a level-up not yet looked at. */
export function skillsDot(R) {
  try { return hasUnseenLevelUps(R || {}); } catch (e) { return false; }
}

/** The header's title over a skill's pages: the skill's name. */
export function skillsTitle(top) {
  if (!top || !isLifeSkill(top.arg)) return '';
  if (top.page === 'unlocks') return say(SAY_L, 'lifePage.allUnlocks', { n: (skillLadder(null, top.arg) || []).length });
  return lifeSkillOf(top.arg).name;
}

/* the guilds whose quest is done and waits for its Claim, in the roster's order */
function readyOf(R) {
  return skillsGrid(R, null).tiles.map((t) => t.key).filter((k) => { const g = skillGuild(R, k); return !!(g && g.quest && g.quest.complete); });
}

/* the marks, drawn */
function Tick() {
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
}
function Lock() {
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="3" y="6.5" width="8" height="6" rx="1.2" fill="currentColor" /><path d="M4.8 6.5 V4.6 a2.2 2.2 0 0 1 4.4 0 V6.5" stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>;
}
function Chev() {
  return <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.5 L7 5 L3 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
}
function Bar({ frac, k }) {
  const v = Math.max(0, Math.min(1, Number(frac) || 0));
  return <span className="m3-xp-track m3-skill-bar" aria-hidden="true" data-m3-bar={k || ''}><i style={{ width: (v * 100).toFixed(1) + '%' }} /></span>;
}

/* the QA probe (tools/qa/mp/mp-menus3skills.mjs) */
function probe(o) { try { window.__btMenus3Skills = o; } catch (e) { /* no window */ } }

export function Menus3Skills({ R, getS, top }) {
  const live = () => { const S = typeof getS === 'function' ? getS() : null; return (S && S.rpg) || R || null; };
  useClock(() => skillsKey(live()), 600);
  /* a level-up not yet looked at: read as the section opens, BEFORE it marks them seen (today's rule) */
  const [fresh] = useState(() => { try { return unseenSkillKeys(live() || {}); } catch (e) { return []; } });
  useEffect(() => { try { markSkillsSeen(live() || {}); } catch (e) { /* no storage */ } }, []);
  useEffect(() => () => probe(null), []);
  const Rn = live();
  const page = top ? top.page : 'root';
  if (page === 'skill' && isLifeSkill(top.arg)) return <SkillPage R={Rn} getS={getS} skill={top.arg} />;
  if (page === 'unlocks' && isLifeSkill(top.arg)) return <SkillUnlocks R={Rn} skill={top.arg} />;
  const g = skillsGrid(Rn, fresh);
  probe({ page: 'root', tiles: g.tiles.map((t) => ({ key: t.key, level: t.level, dot: t.dot })), total: g.total, ready: readyOf(Rn) });
  return (
    <div className="m3-page m3-skills" data-m3-skills="">
      <div className="m3-skills-total" data-m3-skills-total={g.total} aria-label={say(SAY_L, 'lifePage.totalAria', { n: g.total })}>
        <span className="m3-skills-total-k">{say(SAY_L, 'lifePage.total')}</span>
        <b className="m3-skills-total-v">{g.total}</b>
      </div>
      {readyOf(Rn).map((k) => <ReadyRow key={k} R={Rn} getS={getS} skill={k} />)}
      <div className="m3-skillgrid" data-m3-skillgrid="">
        {g.tiles.map((t) => (
          <button key={t.key} type="button" className="u2-raised u2-ctl m3-skilltile" data-m3-skill={t.key} data-m3-skill-lv={t.level}
            aria-label={t.dot ? say(SAY_L, 'lifePage.tileAriaNew', { name: t.name, n: t.level }) : say(SAY_L, 'lifePage.tileAria', { name: t.name, n: t.level })}
            onClick={() => menus3Bus.push('skill', t.key)}>
            <img className="m3-skilltile-art" src={t.art} alt="" draggable={false} />
            <span className="m3-skilltile-name">{t.name}</span>
            <span className="m3-skilltile-lv">{say(SAY_L, 'lifePage.lv', { n: t.level })}</span>
            <Bar frac={t.frac} />
            {t.dot ? <i className="m3-dot m3-skilltile-dot" data-m3-skill-dot={t.key} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── the guild quest's ONE claim (today's request), shared by the ready row and the skill's page:
   sent once, its button quiet until the worker's answer moves the guild's step (6 s at most: a
   refusal is the worker's quiet state) ── */
function useClaim(getS, R, skill) {
  const [sent, setSent] = useState(null);   /* the step it was sent on */
  const [note, setNote] = useState(null);
  const step = guildStep(R, skill);
  const waiting = sent !== null && sent === step;
  useEffect(() => { if (sent !== null && sent !== step) { setSent(null); setNote(null); } }, [step]);
  useEffect(() => { if (sent === null) return undefined; const t = setTimeout(() => setSent(null), 6000); return () => clearTimeout(t); }, [sent]);
  const S = typeof getS === 'function' ? getS() : null;
  const press = () => {
    const w = guildClaim(typeof getS === 'function' ? getS() : null, skill);
    if (w !== 'send') { setNote(w === 'notReady' ? null : w); return; }   /* 'closed' or 'offline': said under it */
    if (waiting) return;
    let ok = false;
    try { ok = act('guild_quest_turn_in', { skill }) !== false; } catch (e) { ok = false; }
    if (!ok) { setNote(OFFLINE); return; }
    setNote(null);
    setSent(step);
  };
  return { now: guildClaim(S, skill), waiting, note, press, skill };
}
function ClaimButton({ c, className }) {
  return (
    <button type="button" className={'u2-raised u2-ctl ' + (className || '') + (c.waiting ? '' : ' is-ready')} data-m3-claim={c.waiting ? 'sent' : c.now}
      data-m3-claim-skill={c.skill} disabled={c.waiting} onClick={c.press}>
      {c.waiting ? say(SAY, 'menus3Skills.claiming') : say(SAY, 'menus3Skills.claim')}
    </button>
  );
}
function ClaimNote({ c }) {
  if (!c.note) return null;
  return (
    <p className={'m3-why m3-note is-' + (c.note === 'closed' ? 'refused' : 'offline')} data-m3-claim-note={c.note} role="status">
      {c.note === 'closed' ? say(SAY, 'menus3Skills.notOpen') : say(SAY, 'menus3Skills.offline')}</p>
  );
}

/* ── the wireframe's row over the grid: a guild with its reward waiting (its quest done), its Claim;
   the guild's name opens its skill ── */
function ReadyRow({ R, getS, skill }) {
  const g = skillGuild(R, skill);
  const c = useClaim(getS, R, skill);
  if (!g) return null;
  return (
    <div className="m3-ready" data-m3-ready={skill}>
      <div className="m3-ready-row">
        <button type="button" className="m3-ready-name" onClick={() => menus3Bus.push('skill', skill)}>
          <i className="m3-chip-dot" aria-hidden="true" />
          <span>{say(SAY, 'menus3Skills.readyRow', { guild: g.name })}</span>
        </button>
        <ClaimButton c={c} className="m3-ready-claim" />
      </div>
      <ClaimNote c={c} />
    </div>
  );
}

/* ── a skill's page ── */
function SkillPage({ R, getS, skill }) {
  const p = skillPage(R, skill);
  const g = skillGuild(R, skill);
  const S = typeof getS === 'function' ? getS() : null;
  const sd = lifeSkillOf(skill);
  const c = useClaim(getS, R, skill);
  if (!p || !sd) return null;
  const pr = p.progress;
  const f = p.facts;
  probe({
    page: 'skill', skill, level: pr.level, xpNow: pr.xpNow, xpNeed: pr.xpNeed, next: f.next, n: f.n,
    guild: g ? { name: g.name, rank: g.rank.title, next: g.next, quest: g.quest, titles: g.titles.length } : null,
    claim: c.now, waiting: c.waiting, note: c.note,
  });
  const next = !f.ladder ? say(SAY_L, 'lifePage.noLadder') : f.next ? rungWords(f.next, f.nextAlso) : say(SAY_L, 'lifePage.allReached');
  const latest = !f.ladder ? null : f.latest ? rungWords(f.latest, f.latestAlso) : say(SAY_L, 'lifePage.noneYet');
  const row = (k, v) => <div key={k} className="m3-skill-fact"><span className="m3-skill-fact-k">{k}</span><span className="m3-skill-fact-v">{v}</span></div>;
  return (
    <div className="m3-page m3-skill" data-m3-skillpage={skill}>
      <div className="m3-skill-head" data-m3-skill-level={pr.level} data-m3-skill-xp={pr.xpNow + '/' + pr.xpNeed}>
        <img className="m3-skill-art" src={sd.iconSrc} alt="" draggable={false} />
        <div className="m3-skill-headwords">
          <b className="m3-skill-lv">{say(SAY_L, 'lifePage.lv', { n: pr.level })}</b>
          <Bar frac={pr.frac} k="xp" />
          <span className="m3-xp-words">{say(SAY_L, 'lifePage.xp', { now: fmt(pr.xpNow), need: fmt(pr.xpNeed) })}{DOT}{say(SAY_L, 'lifePage.xpLeft', { left: fmt(Math.max(0, pr.xpNeed - pr.xpNow)), next: pr.level + 1 })}</span>
        </div>
      </div>
      <div className="m3-skill-block" data-m3-skill-unlocks="">
        {row(say(SAY_L, 'lifePage.next'), next)}
        {latest ? row(say(SAY_L, 'lifePage.latest'), latest) : null}
        {f.ladder ? (
          <button type="button" className="u2-raised u2-ctl m3-skill-door" data-m3-skill-all={f.n} onClick={() => menus3Bus.push('unlocks', skill)}>
            <span>{say(SAY_L, 'lifePage.allUnlocks', { n: f.n })}</span><Chev />
          </button>
        ) : null}
      </div>
      {g ? (
        <div className="m3-skill-block m3-guild" data-m3-guild={skill}>
          <div className="m3-guild-head">
            <b className="m3-guild-name">{g.name}</b>
            <span className="m3-guild-sub">{g.master}</span>
          </div>
          <div className="m3-guild-rank" data-m3-guild-rank={g.rank.title}>
            <b>{g.rank.title}</b>
            <Bar frac={g.frac} k="rank" />
            <span className="m3-xp-words" data-m3-guild-next={g.next ? g.next.title : ''}>{g.next ? say(SAY, 'menus3Skills.nextRank', { title: g.next.title, lvl: g.next.minLvl }) : say(SAY, 'menus3Skills.maxRank')}{g.next && g.next.ap > 0 ? DOT + say(SAY, 'menus3Skills.rankAp', { ap: g.next.ap }) : ''}</span>
          </div>
          {g.quest ? (
            <div className={'m3-guild-quest' + (g.quest.complete ? ' is-ready' : '')} data-m3-guild-quest={g.quest.complete ? 'ready' : 'open'}>
              <div className="m3-guild-qhead"><span className="m3-guild-k">{say(SAY, 'menus3Skills.quest')}</span>{g.quest.complete ? <span className="m3-guild-ready"><i className="m3-chip-dot" aria-hidden="true" />{say(SAY, 'menus3Skills.questReady')}</span> : null}</div>
              <b className="m3-guild-qtitle">{g.quest.title}</b>
              <span className="m3-guild-qdesc">{g.quest.desc}</span>
              <span className="m3-xp-words">{say(SAY, 'menus3Skills.questProgress', { now: g.quest.now, need: g.quest.need })}{DOT}{say(SAY, 'menus3Skills.questReward', { gold: fmt(g.quest.gold), ap: g.quest.ap })}</span>
              {g.quest.complete ? <ClaimButton c={c} className="m3-guild-claim" /> : null}
              <ClaimNote c={c} />
            </div>
          ) : (
            <p className="m3-line" data-m3-guild-done="">{say(SAY, 'menus3Skills.allDone', { rank: g.rank.title, guild: g.name })}</p>
          )}
          <div className="m3-guild-k">{say(SAY, 'menus3Skills.ranks')}</div>
          <div className="m3-guild-ranks">
            {g.ranks.map((r) => (
              <div key={r.title} className={'m3-guild-rung' + (r.got ? ' is-got' : '')} data-m3-rank={r.title} data-m3-rank-got={r.got ? '1' : '0'}>
                <span className="m3-guild-mark" aria-label={r.got ? say(SAY, 'menus3Skills.got') : say(SAY, 'menus3Skills.locked')}>{r.got ? <Tick /> : <Lock />}</span>
                <span className="m3-guild-rungname">{say(SAY, 'menus3Skills.rankRow', { title: r.title, lvl: r.minLvl })}</span>
                {r.got && r.ap > 0 ? <span className="m3-guild-ap">{say(SAY, 'menus3Skills.rankAp', { ap: r.ap })}</span> : null}
              </div>
            ))}
          </div>
          <blockquote className="m3-guild-quote" data-m3-guild-quote={g.quote}>
            <span className="m3-guild-k">{g.master}</span>
            <span>{quoteOf(g.quote)}</span>
          </blockquote>
          {g.titles.length ? (
            <div className="m3-guild-titles" data-m3-guild-titles={g.titles.length}>
              <span className="m3-guild-k">{say(SAY, 'menus3Skills.titles')}</span>
              <span className="m3-guild-titlelist">{g.titles.map((t) => <span key={t} className="m3-kind">{t}</span>)}</span>
            </div>
          ) : null}
          <p className="m3-why">{say(SAY, 'menus3Skills.guildLine')}</p>
        </div>
      ) : null}
      <div className="m3-skill-block m3-skill-how" data-m3-skill-how={skill}>
        <div className="m3-guild-k">{say(SAY_L, 'lifePage.how')}</div>
        <SkillHow S={S} sd={sd} lvl={pr.level} row={row} hint={(t) => <p className="m3-why">{t}</p>} />
      </div>
    </div>
  );
}

/* ── its whole ladder ── */
function SkillUnlocks({ R, skill }) {
  const road = skillLadder(R, skill);
  probe({ page: 'unlocks', skill, rungs: road ? road.length : 0 });
  if (!road) return <p className="m3-line" data-m3-skill-noladder="">{say(SAY_L, 'lifePage.noLadder')}</p>;
  const word = (st) => (st === 'got' ? say(SAY_L, 'lifePage.got') : st === 'next' ? say(SAY_L, 'lifePage.nextState') : say(SAY_L, 'lifePage.later'));
  return (
    <div className="m3-page m3-ladder" data-m3-ladder={skill}>
      {road.map((r, i) => (
        <div key={r.lvl + ':' + i} className={'m3-guild-rung is-' + r.state} data-m3-rung={r.lvl} data-m3-rung-state={r.state}>
          <span className="m3-guild-mark" aria-hidden="true">{r.state === 'got' ? <Tick /> : <Lock />}</span>
          <span className="m3-guild-rungname">{say(SAY_L, 'lifePage.rungLv', { n: r.lvl })}{DOT}{r.name}</span>
          <span className={'m3-ladder-state is-' + r.state}>{word(r.state)}</span>
        </div>
      ))}
    </div>
  );
}

export default Menus3Skills;
