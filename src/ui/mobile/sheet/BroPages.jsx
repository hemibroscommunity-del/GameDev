import React from 'react';
import { BRO_WEAPONS } from './broStats.js';
import {
  BRO_PAGES, broMarks, broShownPages, broStatGroups, broOverviewNumbers, broAchvFill,
  broDoors, broTitleOpens, BRO_TAPS,
} from '@/game/broPages.js';
import { SAY } from '@/data/say/broPages.js';
import { SAY as CARD } from '@/data/say/broCard.js';   /* the doors' words, today's */
import { say } from '@/game/say.js';
import { deskWords } from '@/game/deskWords.js';
import { NAV_KEYS } from '@/game/deskKeys.js';   /* L, worn by the Life Skills door on a computer */
import { compactCount } from '../../panels/playerProfile.js';

/* ═══ v2.3.6600: THE BRO TAB IN PAGES (card BRO, part 1) ═══
 * The owner, 2026-11-25: "I want it so that it shows "pages" where all the information needs to be
 * displayed together (instead of scrolling little by little) so all related information is shown
 * at once. The biggest improvement is that the Bro tab becomes a showcase of the player's character
 * rather than a long directory of features."  Three pages (the rules: src/game/broPages.js), drawn
 * from the four mockups in the game's Lantern-Slate look:
 *   OVERVIEW  you (portrait, name, title, "LV N"; a gold "N points" chip while points wait, where
 *             the coach's "Tap Points" arrow points), Combat overview (DPS, Damage, Defense, Gear
 *             worn of the weapon in your hand; a tap: the Combat page on it), Weapon mastery (the
 *             three combat skills, "Equipped" on the one in hand; a tap: the Combat page on that
 *             weapon; the XP flight lands on them, BroCard's xpLanding), Your progress (one row; a
 *             tap: the Progress page);
 *   COMBAT    the Sword | Bow | Staff picker, then every stat of today's card in three groups, a
 *             grid of small cells, the label over its number (a tap: the stat's explainer);
 *   PROGRESS  the three counters with the achievements bar, then today's doors as tiles two across.
 * Upright (the page under 600 px) one page at a time, a strip of three marks at its top (the open
 * one lit; on the two under the Overview its mark is the back chip, "‹ Overview").  600 px and
 * wider the three side by side, no marks.  A page under 150 px tall (a phone on its side, about
 * 80 px) is the dense cut: one-line cells, the doors without their second line.
 * Every number is the game's own (BroCard reads them as today's card did: broStats.js, the
 * profile); this file only lays them out.  Its look: game.css's `.bt-bro3`. */

const ICON_KILLS = '/icons/ui/hero/rec-kills.webp';

const stop = (fn) => (e) => { e.stopPropagation(); if (fn) fn(); };

/* the words for a page, a weapon, a group, a stat: one literal key a call (tools/guards/say.test's
   readers rule), looked up by the rules' ids */
const PAGE_WORD = { overview: () => say(SAY, 'broPages.overview'), combat: () => say(SAY, 'broPages.combat'), progress: () => say(SAY, 'broPages.progress') };
const WEAPON_WORD = { sword: () => say(SAY, 'broPages.sword'), bow: () => say(SAY, 'broPages.bow'), staff: () => say(SAY, 'broPages.staff') };
const GROUP_WORD = { offense: () => say(SAY, 'broPages.groupOffense'), survive: () => say(SAY, 'broPages.groupSurvive'), move: () => say(SAY, 'broPages.groupMove') };
const NUM_WORD = {
  dps: (d) => say(SAY, d ? 'broPages.numShortDps' : 'broPages.numDps'),
  damage: (d) => say(SAY, d ? 'broPages.numShortDamage' : 'broPages.numDamage'),
  def: (d) => say(SAY, d ? 'broPages.numShortDef' : 'broPages.numDef'),
  gear: (d) => say(SAY, d ? 'broPages.numShortGear' : 'broPages.numGear'),
};
const STAT_WORD = {
  damage: (d) => say(SAY, d ? 'broPages.shortDamage' : 'broPages.statDamage'),
  dps: (d) => say(SAY, d ? 'broPages.shortDps' : 'broPages.statDps'),
  aspd: (d) => say(SAY, d ? 'broPages.shortAspd' : 'broPages.statAspd'),
  range: (d) => say(SAY, d ? 'broPages.shortRange' : 'broPages.statRange'),
  crit: (d) => say(SAY, d ? 'broPages.shortCrit' : 'broPages.statCrit'),
  critDmg: (d) => say(SAY, d ? 'broPages.shortCritDmg' : 'broPages.statCritDmg'),
  special: (d) => say(SAY, d ? 'broPages.shortSpecial' : 'broPages.statSpecial'),
  elem: (d) => say(SAY, d ? 'broPages.shortElem' : 'broPages.statElem'),
  def: (d) => say(SAY, d ? 'broPages.shortDef' : 'broPages.statDef'),
  armor: (d) => say(SAY, d ? 'broPages.shortArmor' : 'broPages.statArmor'),
  dodge: (d) => say(SAY, d ? 'broPages.shortDodge' : 'broPages.statDodge'),
  eres: (d) => say(SAY, d ? 'broPages.shortEres' : 'broPages.statEres'),
  move: (d) => say(SAY, d ? 'broPages.shortMove' : 'broPages.statMove'),
};
const word = (map, id, dense) => (Object.prototype.hasOwnProperty.call(map, id) ? map[id](dense) : String(id));
const fmt = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US');

function Marks({ bp, wide, move }) {
  const marks = broMarks(bp, wide);
  if (!marks.length) return null;
  return (
    <div className="bt-bro3-marks" role="tablist" aria-label={say(SAY, 'broPages.marks')}>
      {marks.map((m) => (
        <button key={m.page} type="button" role="tab" aria-selected={m.on} className={'bt-bro3-mark' + (m.on ? ' is-on' : '') + (m.back ? ' is-back' : '')}
          data-bro-mark={m.page} data-bro-back={m.back ? '' : undefined} aria-label={m.back ? say(SAY, 'broPages.back') : word(PAGE_WORD, m.page)}
          onClick={stop(() => move({ to: m.page }))}>
          {m.back ? <span aria-hidden="true">{'‹ '}</span> : null}{word(PAGE_WORD, m.page)}
        </button>
      ))}
    </div>
  );
}

function Head({ k, right }) {
  return <div className="bt-bro3-head"><span>{k}</span>{right || null}</div>;
}

/* ── 1. OVERVIEW (mockup 01) ── */
function Overview({ d, n, held, statsHeld, skills, move, open, dense }) {
  const nums = broOverviewNumbers(statsHeld.rows, d.worn, d.slots);
  const sum = d.sum;
  return (
    <>
      <div className="bt-bro3-you">
        <img className="bt-bro3-face" src={d.portrait} alt="" draggable={false} />
        <span className="bt-bro3-who">
          <b className="bt-bro3-name" data-bro-name="">{d.name}</b>
          {dense ? null : (
            <button type="button" className={'bt-bro3-title' + (d.title ? '' : ' is-none')} data-bro-title={d.title ? d.title.id : 'none'}
              aria-label={d.title ? say(CARD, 'broCard.titleAria', { title: d.title.text }) : say(CARD, 'broCard.noTitleAria')}
              onClick={stop(() => open(broTitleOpens(d.apOn)))}>
              {d.title && d.title.iconSrc ? <img src={d.title.iconSrc} alt="" draggable={false} /> : null}
              <span>{d.title ? d.title.text : say(SAY, 'broPages.noTitle')}</span>
            </button>
          )}
        </span>
        <span className="bt-bro3-lvcol">
          <span className="bt-bro3-lv" data-bro-level={d.level}>{say(SAY, 'broPages.level', { level: d.level })}</span>
          {/* the Points door's light (v2.3.3004) on the page that opens first: the coach's "Tap
              Points" and the points' flight aim at data-section="Build" (guideArrow.js) */}
          {n > 0 ? (
            <button type="button" className="bt-bro3-ptchip is-live" data-section="Build" data-bro-pointschip={n} data-bro-spend={n}
              aria-label={say(SAY, 'broPages.pointsChipAria', { n })} onClick={stop(() => open(BRO_TAPS.pointsChip))}>
              <span className="bt-pts-glow" data-pts-glow="tab" aria-hidden="true" />
              <img src={d.icon.points} alt="" draggable={false} />{say(SAY, 'broPages.pointsChip', { n: fmt(n) })}
            </button>
          ) : null}
        </span>
      </div>
      <button type="button" className="bt-bro3-well bt-bro3-ov" data-bro-details="" aria-label={say(SAY, 'broPages.detailsAria')}
        onClick={stop(() => move({ to: 'combat', weapon: held }))}>
        {dense ? null : <Head k={say(SAY, 'broPages.combatOverview')} right={<em className="bt-bro3-more">{say(SAY, 'broPages.details')}<i aria-hidden="true">{' ›'}</i></em>} />}
        <span className="bt-bro3-nums">
          {nums.map((x) => (
            <span key={x.key} className="bt-bro3-num" data-bro-num={x.key} data-v={x.value}>
              <b>{x.value}</b><i>{word(NUM_WORD, x.key, dense)}</i>
            </span>
          ))}
        </span>
      </button>
      <div className="bt-bro3-well bt-bro3-mastery">
        {dense ? null : <Head k={say(SAY, 'broPages.mastery')} right={<em className="bt-bro3-hint">{deskWords(say(SAY, 'broPages.inspect'))}</em>} />}
        <div className="bt-bro3-tiles" role="group" aria-label={say(SAY, 'broPages.mastery')}>
          {skills.map(({ s: sk, k, cat, xpAttrs }) => {
            const w = BRO_WEAPONS.find((x) => x.cat === cat) || BRO_WEAPONS[0];
            const on = cat === held;
            /* "Equipped" only with a weapon in that hand's slot (broStats' has: an empty slot is
               "No sword equipped" on the Combat page, never "Equipped" here) */
            const eq = on && statsHeld.has;
            return (
              <button key={sk.key} type="button" className={'bt-bro3-tile' + (on ? ' is-on' : '')} data-bro-skill={cat} data-lvl={k.lvl}
                data-bro-held={on ? '' : undefined} data-bro-equipped={eq ? '' : undefined} aria-label={say(SAY, 'broPages.tileAria', { weapon: w.label, lvl: k.lvl })}
                {...xpAttrs} onClick={stop(() => move({ to: 'combat', weapon: cat }))}>
                <img src={sk.iconSrc} alt="" draggable={false} />
                <span className="bt-bro3-tilet">
                  <b>{word(WEAPON_WORD, cat)}</b>
                  {dense ? null : <small>{eq ? say(SAY, 'broPages.equipped') : say(SAY, 'broPages.masteryWord')}</small>}
                </span>
                <span className="bt-bro3-tilelv">{say(SAY, 'broPages.lv', { lvl: k.lvl })}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button type="button" className="bt-bro3-well bt-bro3-prow" data-bro-progress="" aria-label={say(SAY, 'broPages.progressAria')}
        onClick={stop(() => move({ to: 'progress' }))}>
        {dense ? null : <span className="bt-bro3-prowh">{say(SAY, 'broPages.yourProgress')}</span>}
        <span className="bt-bro3-pc" data-bro-pc="achv"><img src={d.icon.achv} alt="" draggable={false} /><b>{sum ? `${sum.earned}/${sum.total}` : '–'}</b></span>
        <span className="bt-bro3-pc" data-bro-pc="kills"><img src={ICON_KILLS} alt="" draggable={false} /><b>{compactCount(d.kills || 0)}</b></span>
        <span className="bt-bro3-pc" data-bro-pc="ap"><span className="bt-bro3-star" aria-hidden="true">{'★'}</span><b>{compactCount(d.ap)}</b></span>
        <i className="bt-bro3-chev" aria-hidden="true">{'›'}</i>
      </button>
    </>
  );
}

/* ── 2. COMBAT STATS (mockups 03 and 04 on ONE page) ── */
function Combat({ bp, statsPick, skills, move, explain, dense, pointsDoor }) {
  const { groups } = broStatGroups(statsPick.rows);
  const w = BRO_WEAPONS.find((x) => x.cat === statsPick.cat) || BRO_WEAPONS[0];
  const k = (skills.find((x) => x.cat === statsPick.cat) || {}).k;
  const xpWords = !k ? null : k.xp ? say(SAY, 'broPages.xp', { prog: fmt(k.xp.prog), thresh: fmt(k.xp.thresh) }) : say(SAY, 'broPages.xpMax');
  const cell = (r) => (
    <button key={r.key} type="button" className="bt-bro3-cell" data-bro-stat={r.key} data-v={r.value}
      onClick={stop(() => explain(r.info, r.value))}>
      <i>{word(STAT_WORD, r.key, dense)}</i><b>{r.value}</b>
    </button>
  );
  const group = (g, right) => (
    <div key={g.id} className="bt-bro3-group" data-bro-group={g.id} data-n={g.rows.length}>
      {dense ? null : <Head k={word(GROUP_WORD, g.id)} right={right} />}
      <div className="bt-bro3-cells">{g.rows.map(cell)}</div>
    </div>
  );
  const off = groups[0], rest = groups.slice(1);
  return (
    <>
      <div className="bt-bro3-picker" role="group" aria-label={say(SAY, 'broPages.combatStats')}>
        {skills.map(({ s: sk, cat }) => (
          <button key={cat} type="button" className={'bt-bro3-pick' + (cat === bp.weapon ? ' is-on' : '')} data-bro-pick={cat}
            aria-pressed={cat === bp.weapon} onClick={stop(() => move({ weapon: cat }))}>
            <img src={sk.iconSrc} alt="" draggable={false} /><span>{word(WEAPON_WORD, cat)}</span>
          </button>
        ))}
        {/* v2.3.6683 (card UI2-bro): under the new frame Combat is Points' road (Progress's Points door),
            its glow while points wait */}
        {pointsDoor ? (
          <button type="button" className={'bt-bro3-pick' + (pointsDoor.n > 0 ? ' is-live' : '')} data-bro-row="points" data-section="Build"
            data-bro-spend={pointsDoor.n} onClick={stop(pointsDoor.open)}
            aria-label={say(CARD, 'broCard.points') + ': ' + (pointsDoor.n > 0 ? say(CARD, 'broCard.pointsSub', { n: fmt(pointsDoor.n) }) : say(CARD, 'broCard.pointsSpent'))}>
            {pointsDoor.n > 0 ? <span className="bt-pts-glow" data-pts-glow="tab" aria-hidden="true" /> : null}
            <span>{say(CARD, 'broCard.points')}{pointsDoor.n > 0 ? ' ' + fmt(pointsDoor.n) : ''}</span>
          </button>
        ) : null}
      </div>
      {group(off, statsPick.has
        ? (xpWords ? <em className="bt-bro3-hint" data-bro-xpnum={k && k.xp ? `${Math.round(k.xp.prog)}/${Math.round(k.xp.thresh)}` : 'max'}>{xpWords}</em> : null)
        : <em className="bt-bro3-hint" data-bro-noweapon={statsPick.cat}>{say(SAY, 'broPages.noWeapon', { weapon: w.label.toLowerCase() })}</em>)}
      <div className="bt-bro3-pair">{rest.map((g) => group(g, null))}</div>
    </>
  );
}

/* ── 3. PROGRESS (mockup 02) ── */
function Progress({ d, n, open, dense }) {
  const sum = d.sum;
  const fill = sum ? broAchvFill(sum.earned, sum.total) : 0;
  const sub = {
    skills: say(CARD, 'broCard.lifeSub', { total: fmt(d.lifeTotal) }),
    titles: say(CARD, 'broCard.titlesSub', { n: sum ? sum.earned : 0 }),
    homestead: d.plots > 0 ? say(CARD, 'broCard.plotsReady', { n: d.plots }) : say(CARD, 'broCard.nothingReady'),
    pet: d.pet ? d.pet.customName : say(CARD, 'broCard.noPet'),
    clan: d.clanWords,
    points: n > 0 ? say(CARD, 'broCard.pointsSub', { n: fmt(n) }) : say(CARD, 'broCard.pointsSpent'),
    achievements: sum ? say(CARD, 'broCard.achvSub', { earned: sum.earned, total: sum.total }) : '–',
    equipment: say(CARD, 'broCard.equipSub', { worn: d.worn, slots: d.slots }),
  };
  const title = {
    skills: say(CARD, 'broCard.lifeSkills'), titles: say(CARD, 'broCard.titles'), homestead: say(CARD, 'broCard.homestead'),
    pet: say(CARD, 'broCard.pet'), clan: say(CARD, d.party ? 'broCard.party' : 'broCard.clan'), points: say(CARD, 'broCard.points'),
    achievements: say(CARD, 'broCard.achievements'), equipment: say(CARD, 'broCard.equipment'),
  };
  const icon = { skills: d.icon.life, titles: d.icon.titles, homestead: d.icon.farm, pet: d.icon.pet, clan: d.icon.clan,
    points: d.icon.points, achievements: d.icon.achv, equipment: d.icon.equip };
  const counters = (
    <>
      <span className="bt-bro3-ctr" data-bro-ctr="achv"><img src={d.icon.achv} alt="" draggable={false} /><b data-bro-achv-tile={sum ? `${sum.earned}/${sum.total}` : ''}>{sum ? `${sum.earned}/${sum.total}` : '–'}</b>{dense ? null : <i>{say(SAY, 'broPages.achievements')}</i>}</span>
      <span className="bt-bro3-ctr" data-bro-ctr="kills" data-bro-kills={d.kills || 0}><img src={ICON_KILLS} alt="" draggable={false} /><b>{compactCount(d.kills || 0)}</b>{dense ? null : <i>{say(SAY, 'broPages.kills')}</i>}</span>
      <span className="bt-bro3-ctr" data-bro-ctr="ap" data-bro-ap={d.ap}><span className="bt-bro3-star" aria-hidden="true">{'★'}</span><b>{compactCount(d.ap)}</b>{dense ? null : <i>{say(SAY, 'broPages.ap')}</i>}</span>
    </>
  );
  return (
    <>
      {d.apOn ? (
        <button type="button" className="bt-bro3-well bt-bro3-ctrs" data-bro-counters=""
          aria-label={say(SAY, 'broPages.counterAria', { achv: sum ? say(SAY, 'broPages.achvOf', { earned: sum.earned, total: sum.total }) : '–', kills: fmt(d.kills), ap: fmt(d.ap) })}
          onClick={stop(() => open(BRO_TAPS.counters))}>
          <span className="bt-bro3-ctrrow">{counters}</span>
          <span className="bt-bro3-bar" aria-hidden="true"><span style={{ width: `${Math.round(fill * 1000) / 10}%` }} /></span>
        </button>
      ) : (
        <div className="bt-bro3-well bt-bro3-ctrs" data-bro-counters=""><span className="bt-bro3-ctrrow">{counters}</span></div>
      )}
      <div className="bt-bro3-doors">
        {broDoors(d.apOn).map((door) => {
          const live = door.id === 'points' && n > 0;
          const extra = door.id === 'points' ? { 'data-section': 'Build', 'data-bro-spend': n }
            : door.id === 'skills' ? { 'data-key': NAV_KEYS.skills, 'data-key-at': 'inline' }
            : door.id === 'equipment' ? { 'data-bro-gear': '' } : null;
          const nn = door.id === 'points' ? n : door.id === 'skills' ? d.lifeTotal : door.id === 'equipment' ? d.worn
            : door.id === 'homestead' ? d.plots : (door.id === 'achievements' || door.id === 'titles') ? (sum ? sum.earned : 0) : undefined;
          return (
            <button key={door.id} type="button" className={'bt-bro3-door' + (live ? ' is-live' : '')} data-bro-row={door.id}
              data-bro-row-n={nn} aria-label={title[door.id] + (sub[door.id] ? ': ' + sub[door.id] : '')}
              onClick={stop(() => open(door.opens))} {...extra}>
              {live ? <span className="bt-pts-glow" data-pts-glow="tab" aria-hidden="true" /> : null}
              <img src={icon[door.id]} alt="" draggable={false} />
              <span className="bt-bro3-doort"><b>{title[door.id]}</b>{dense ? null : <small>{sub[door.id]}</small>}</span>
              {door.id === 'skills' && d.lifeNew ? <span className="bt-bro2-dot" data-skills-dot="" aria-hidden="true" /> : null}
              {door.opens === 'farm' ? null : <i className="bt-bro3-chev" aria-hidden="true">{'›'}</i>}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** The pages.  Props (all read by BroCard, the way today's card reads them):
 *   d          you: { portrait, name, level, title, apOn, sum, ap, kills, pet, plots, worn, slots,
 *              lifeTotal, lifeNew, party, clanWords, icon }
 *   n          the points waiting;  held  the weapon in your hand (its cat)
 *   bp         the pages' state { page, weapon } (broPages.js);  move(a)  its one transition
 *   statsHeld  broWeaponStats for the weapon in hand;  statsPick  for the picked weapon
 *   skills     [{ s, k, cat, xpAttrs }] the three combat skills (xpAttrs: the XP landing's marks)
 *   open(word) a door's `opens` word acted on;  explain(info, value)  a stat's explainer
 *   wide, dense  the shape (broPagesLayout) */
export function BroPages(props) {
  const { bp, wide, dense, move, only } = props;
  /* v2.3.6683 (card UI2-bro): `only` one page under the new frame's header (Combat's door), no marks */
  const shown = only ? [only] : broShownPages(bp, wide);
  return (
    <>
      {shown.map((page) => (
        <section key={page} className="bt-bro3-page" data-bro-pg={page} data-bro-weapon={page === 'combat' ? props.statsPick.cat : undefined}
          data-bro-has={page === 'combat' ? (props.statsPick.has ? 1 : 0) : undefined}>
          {only ? null : <Marks bp={bp} wide={wide} move={move} />}
          {page === BRO_PAGES[0] ? <Overview {...props} />
            : page === 'combat' ? <Combat {...props} />
            : <Progress {...props} />}
        </section>
      ))}
    </>
  );
}

export default BroPages;
