import React from 'react';
import { getState } from '../dash/common.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { PlayerProfilePanel } from '../../panels/PlayerProfilePanel.jsx';
import { profileFromSelf } from '../../panels/playerProfile.js';
import { portraitSrc } from './portraitStore.js';
import { deriveHeroStats, weaponSkillProgress } from './heroModel.js';
import { heroStatPills, HERO_PILL_ICON } from './heroStatPills.js';
import { SKILL_ROSTER, hasUnseenLevelUps } from './skillsModel.js';
import { prog3Live, prog3CharLevel } from '../../../data/prog3.js';
import { toDisplayHp } from '../../../data/gameSystems.js';
import { POINTS_ART_DIR, POINTS_ART_V } from '../../../data/pointsHeadArt.js';
import { achvLive, achvApTotal, achvSummary } from '@/game/achievements.js';
import { achvById, ACHV_MEDAL_SRC } from '@/data/achievements.js';
import { deskWords } from '@/game/deskWords.js';
import { NAV_KEYS } from '@/game/deskKeys.js';   /* L, worn by the Life Skills row on a computer */
import { infoPopupBus } from '../infoPopupBus.js';
import { statInfo } from '../infoGlossary.js';

/* ═══ v2.3.4062: THE BRO PAGE -- YOUR OWN INSPECT CARD ═══
 * The owner, 2026-11-03: "I wanted the bro tab to be like what it looks like
 * when you inspect another player.  PFP clan, achievements, all the base
 * character stats, primary combat skills, place where you can tap to open
 * points spend window, etc".
 *
 * So the page IS the Inspect card (ui/panels/PlayerProfilePanel.jsx, the
 * screen behind another player's portrait), drawn in the dashboard
 * (`embedded`) from your own state (playerProfile.js profileFromSelf, the
 * shape it already built for your own card), with the same look, top to
 * bottom:
 *   head      your portrait, name, LV, your Achievement Points (a tap opens
 *             the Achievements page), quests completed, the leaderboard
 *   tags      the title you wear (a tap: Achievements) and your clan ("No
 *             Clan" when none; a tap opens the clan's page)
 *   combat    Melee · Bow · Magic, each level with the bar to the next
 *   equip     the six worn slots; a tap opens the Equipment window
 *   + STATS   everything about your bro in numbers: HP, stamina and mana,
 *             then the Equipment window's own stat pills (heroStatPills: one
 *             reader, so the two never disagree), each a tap to its explainer
 *   showcase  lifetime kills, your rarest achievement, the Homestead
 *   + ACHIEVEMENTS   AP, how many of the table, the latest three badges; a
 *             tap opens the page
 *   + LIFE SKILLS    one row, a tap opens the page (a dot: an unseen level)
 *   + SPEND POINTS (N)   in the command dock's place (another player's card
 *             has Party / Trade / Duel there): stuck to the card's bottom
 *             edge, so on the phone's short page it is always on screen; gold,
 *             glowing while N > 0; it opens the Points window over the card
 *             (data-section="Build": the guide arrow and the points bubbles
 *             aim at it)
 * The "+" rows are only yours (the card's `slots`); an inspect window passes
 * none of them and is unchanged.  Achievements, Life Skills, the clan and the
 * leaderboard are pages pushed under Bro (their back chip returns here).
 *
 * "The five points stats" (Power, Vitality, Endurance, Agility, Mind) are the
 * retired tier-1 stats (StatScreenPanel v2.3.1236: "STALE presentation"):
 * points buy the weapon and shared stats now, so the card shows THOSE.
 *
 * Read only: nothing here spends or sends.  HeroExpanded re-reads every
 * 400 ms (and the card every second), so this has no clock of its own. */

const fmt = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US');
const SPEND_ICON = `${POINTS_ART_DIR}character.png?v=${POINTS_ART_V}`;   /* the Points window's own "character" head */
const LIFE_ICON = '/icons/ui/nav-lifeskills.webp?v=2.3.1331';           /* the old Skills button's crest */
const CB_CATS = [['melee', 'sword'], ['bow', 'bow'], ['staff', 'staff']];

/* the level the game shows everywhere else: the best weapon's (v2.3.3538) */
function levelOf(R) {
  try { if (prog3Live(R)) return prog3CharLevel(R); } catch (e) { /* the old blob */ }
  return Math.max(1, Number(R && R.level) || 1);
}

/* your profile, as the card reads it, with the numbers the rest of the
   game shows for you: the level, the worker's AP, and the combat bars */
export function broProfile(S) {
  const R = (S && S.rpg) || {};
  const p = profileFromSelf(S);
  p.characterLevel = levelOf(R);
  p.achievementPoints = achvApTotal(S);
  const pct = {};
  for (const [k, cat] of CB_CATS) {
    let v = 100;
    try {
      const w = weaponSkillProgress(R, cat);
      if (w && w.thresh) v = Math.max(0, Math.min(100, (w.prog / w.thresh) * 100));
    } catch (e) { v = 0; }
    pct[k] = v;
  }
  p.combatPct = pct;
  return p;
}

/* the explainer a stat's pill opens (the Equipment window's own) */
function explain(key, value) {
  try {
    const info = statInfo(key);
    if (info) infoPopupBus.open({ title: info.title, body: info.body, note: info.note, stat: String(value) });
  } catch (e) { /* no explainer: nothing opens */ }
}

function StatPill({ k, icon, label, value, info }) {
  return (
    <button type="button" className="bt-bro-stat" data-bro-stat={k}
      onClick={(e) => { e.stopPropagation(); explain(info, value); }}>
      {icon ? <img src={icon} alt="" draggable={false} /> : null}
      <span className="bt-bro-statl">{label}</span>
      <b>{value}</b>
    </button>
  );
}

export const BroCard = ({ points, onPoints, onEquipment }) => {
  const S = getState();
  const R = (S && S.rpg) || {};
  const n = Math.max(0, Math.floor(Number(points) || 0));
  const apOn = achvLive(S);

  let d = {};
  try { d = deriveHeroStats(R) || {}; } catch (e) { d = {}; }
  let pills = null;
  try { pills = heroStatPills(R, d); } catch (e) { pills = null; }
  const vitals = [
    { k: 'hp', label: 'HP', info: 'Max HP', icon: HERO_PILL_ICON.hp, value: fmt(toDisplayHp(Number(R.maxHp) || 100)) },
    { k: 'stamina', label: 'Stamina', info: 'Stamina', icon: HERO_PILL_ICON.stam, value: fmt(Number(R.maxStamina) || 100) },
    { k: 'mana', label: 'Mana', info: 'Max Mana', icon: HERO_PILL_ICON.mana, value: fmt(Number(R.maxMana) || 100) },
  ];
  const offense = pills ? [pills.dps].concat(pills.offense) : [];
  /* the stamina pool is the vitals' own number; its "+N from points" pill
     would say Stamina twice */
  const defense = pills ? pills.player.filter((p) => p.key !== 'stam') : [];

  /* the latest three achievements you earned, newest first */
  const a = S && S._achv;
  let latest = [];
  let sum = null;
  if (apOn) {
    try { sum = achvSummary(S); } catch (e) { sum = null; }
    const got = (a && a.got) || {};
    latest = Object.keys(got).map((id) => ({ id, at: got[id], def: achvById(id) }))
      .filter((x) => x.def).sort((x, y) => y.at - x.at).slice(0, 3);
  }
  const ls = R.lifeSkills || {};
  let lifeTotal = 0;
  for (const s of SKILL_ROSTER) lifeTotal += Math.max(0, Number(ls[s.key] && ls[s.key].level) || 0);
  let lifeNew = false;
  try { lifeNew = hasUnseenLevelUps(R); } catch (e) { lifeNew = false; }

  const go = (id) => {
    if (id === 'encyclopedia') { dashboardPanelBus.open('encyclopedia'); return; }
    /* a page under Bro: Achievements, the leaderboard (dashboardPanelBus
       keeps Achievements and Life Skills under Bro whoever asks) */
    dashboardPanelBus.push(id);
  };

  const spend = (
    <button type="button" role="button" data-section="Build" data-bro-spend={n}
      className={'bt-bro-spend' + (n > 0 ? ' is-live' : '')}
      aria-label={`Spend points (${n})`} title={`Spend points (${n})`}
      onClick={(e) => { e.stopPropagation(); if (onPoints) onPoints(); }}>
      {/* the Points tab's glow, kept while any point waits (v2.3.3004) */}
      {n > 0 ? <span className="bt-pts-glow" data-pts-glow="tab" aria-hidden="true" /> : null}
      <img src={SPEND_ICON} alt="" draggable={false} />
      <span className="bt-bro-spendl">Spend points</span>{' '}
      <b data-bro-spend-n={n}>({n})</b>
    </button>
  );

  const stats = (
    <div className="bt-bro-stats-wrap" data-bro-stats="">
      <div className="bt-pcard-rule" aria-hidden="true" />
      <div className="bt-bro-sec">Stats</div>
      <div className="bt-bro-vitals">
        {vitals.map((v) => <StatPill key={v.k} {...v} />)}
      </div>
      {offense.length ? (
        <>
          <div className="bt-bro-sub">Offense</div>
          <div className="bt-bro-stats">
            {offense.map((p) => <StatPill key={p.key} k={p.key} icon={p.icon} label={p.label} value={p.value} info={p.info} />)}
          </div>
        </>
      ) : null}
      {defense.length ? (
        <>
          <div className="bt-bro-sub">Defense</div>
          <div className="bt-bro-stats">
            {defense.map((p) => <StatPill key={p.key} k={p.key} icon={p.icon} label={p.label} value={p.value} info={p.info} />)}
          </div>
        </>
      ) : null}
    </div>
  );

  const end = (
    <div className="bt-bro-rows">
      {apOn ? (
        <button type="button" className="bt-bro-row" data-bro-achv={sum ? sum.earned : 0}
          aria-label={`Achievements: ${fmt(achvApTotal(S))} points. Open`}
          onClick={(e) => { e.stopPropagation(); go('achievements'); }}>
          <img className="bt-bro-rowic" src={ACHV_MEDAL_SRC} alt="" draggable={false} />
          <span className="bt-bro-rowt">
            <b>Achievements</b>
            <span>Achievement Points: <em>{fmt(achvApTotal(S))}</em>{sum ? ` · ${sum.earned} of ${sum.total}` : ''}</span>
          </span>
          <span className="bt-bro-badges" aria-hidden="true">
            {latest.map((x) => (
              <img key={x.id} data-bro-latest={x.id} src={x.def.icon} alt="" draggable={false} title={x.def.name} />
            ))}
          </span>
          <span className="bt-bro-chev" aria-hidden="true">›</span>
        </button>
      ) : null}
      <button type="button" className="bt-bro-row" data-bro-life={lifeTotal}
        data-key={NAV_KEYS.skills} data-key-at="inline"
        aria-label="Life Skills. Open"
        onClick={(e) => { e.stopPropagation(); go('skills'); }}>
        <img className="bt-bro-rowic" src={LIFE_ICON} alt="" draggable={false} />
        <span className="bt-bro-rowt">
          <b>Life Skills</b>
          <span>Total level <em>{fmt(lifeTotal)}</em> {'·'} {deskWords('tap to see all')}</span>
        </span>
        {lifeNew ? <span className="bt-bro-dot" data-skills-dot="" aria-hidden="true" /> : null}
        <span className="bt-bro-chev" aria-hidden="true">›</span>
      </button>
    </div>
  );

  return (
    <PlayerProfilePanel
      embedded
      getProfile={() => broProfile(getState())}
      face={<img src={portraitSrc(S)} alt="" draggable={false} />}
      onOpen={go}
      onAp={apOn ? () => go('achievements') : null}
      onClan={() => go('clan')}
      onEquipment={onEquipment}
      slots={{ afterEquip: stats, end, dock: spend }}
      dock={null}
    />
  );
};

export default BroCard;
