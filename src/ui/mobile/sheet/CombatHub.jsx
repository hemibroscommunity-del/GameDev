/* ═══ v2.3.6685: COMBAT'S HUB, FOUR DOORS (card UI2-combat, the build's step 4, PR 1) ═══
 *
 * The master specification's 4.2 and reference 03 (its structure, not its
 * finish or its numbers): three equal tiles, Sword, Bow, Staff, each its
 * level, its XP bar and its points' count; under them one wide tile, Shared
 * Attributes, with the shared count.  A weapon's tile opens its own page
 * (sheet/WeaponPage.jsx; "Return to the Combat hub to switch": the header's
 * Back); Shared opens today's Points window on its Shared column until PR 2's
 * Shared page.
 *
 * What each tile shows is src/game/combatHub.js combatHubDoors' word (the
 * pools as the worker holds them, the words of a count from one rule, the
 * level and XP from src/game/progression.js); this file draws it from the
 * kit (src/ui/kit/ui2.css: a raised face for what opens something).
 *
 * THE ROOM (the master notes' part 3): 172 px of content upright at 390 x
 * 844 (168 at 375 x 667): the weapons' row takes what the Shared row's 44 px
 * leaves.  Sideways (63 px; 58 at 667 x 375): one row of four, each its
 * picture, word and count (its XP bar under the word). */
import React, { useEffect } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { heroSectionBus } from './heroSectionBus.js';
import { useClock, useRoom } from './CharacterPage.jsx';
import { combatHubDoors, combatPools, combatLevel } from '@/game/combatHub.js';
import { broHubOpen } from '@/game/broHub.js';
import { ui2RootClass } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/combatHub.js';
import { say } from '@/game/say.js';
import './combatPage.css';

/* the words, each key written out (say.test rule 7) */
const WORD = {
  'combatHub.sword': () => say(SAY, 'combatHub.sword'),
  'combatHub.bow': () => say(SAY, 'combatHub.bow'),
  'combatHub.staff': () => say(SAY, 'combatHub.staff'),
  'combatHub.shared': () => say(SAY, 'combatHub.shared'),
};
const word = (k) => (WORD[k] ? WORD[k]() : '');
export const poolText = (w) => (!w ? '' : w.key === 'combatHub.point' ? say(SAY, 'combatHub.point', { n: w.n }) : say(SAY, 'combatHub.points', { n: w.n }));

function chanOf(S) { return !!(S && S._serverCaps && S._serverCaps.prog3Chan); }

/* what moves the hub: the pools and the levels and XP (the page's clock reads it) */
function hubKey(S) {
  const R = (S && S.rpg) || null;
  const p = combatPools(R, chanOf(S));
  const sk = (R && R.prog3 && R.prog3.sk) || {};
  return [p.sword, p.bow, p.staff, p.shared, combatLevel(R),
    ['sword', 'bow', 'staff'].map((c) => (sk[c] ? (sk[c].level || 0) + ':' + Math.floor(sk[c].xp || 0) : '-')).join(',')].join('|');
}

function Bar({ p }) {
  const v = p && !p.max ? Math.max(0, Math.min(1, p.frac)) : 1;
  return <span className="u2-track u2-cb-track" aria-hidden="true"><span className="u2-fill" style={{ width: (v * 100).toFixed(1) + '%' }} /></span>;
}

/**
 * S     the game's state (handed by BroCard)
 * who   whose page (null: yours; step 9 sets another's)
 * live  () => the game's state now (optional; default the S handed: the page never reaches for it)
 */
export function CombatHub({ S, who, live }) {
  useClock(() => hubKey(live ? live() : S), 400);
  const [ref, room] = useRoom();
  const R = (S && S.rpg) || null;
  const doors = combatHubDoors(R, chanOf(S), who == null ? null : who);
  const short = room.short;
  useEffect(() => {
    try { window.__btCombatHub = { doors: doors.map((d) => ({ id: d.id, lv: d.progress ? d.progress.level : null, points: d.points })) }; } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btCombatHub = null; } catch (e) { /* no window */ } }, []);
  const open = (d) => {
    if (d.opens === 'points:shared') {
      /* today's Points window, on its Shared column (HeroExpanded's lane request), pushed over the hub */
      heroSectionBus.request('Build', 'shared');
      dashboardPanelBus.push('hero');
      return;
    }
    const o = broHubOpen(d.opens);
    if (o && o.kind === 'page') dashboardPanelBus.go({ type: 'push', id: o.page, who: who == null ? undefined : who });
  };
  const tile = (d) => {
    const w = word(d.word);
    const p = d.progress;
    const pts = poolText(d.pointsWords);
    const aria = d.cat
      ? say(SAY, 'combatHub.doorAria', { w, n: p ? p.level : 1, pts })
      : say(SAY, 'combatHub.sharedAria', { pts });
    return (
      <button key={d.id} type="button" className={'u2-raised u2-cb-door' + (d.cat ? ' is-weapon' : ' is-shared') + (d.glow ? ' is-glow' : '')}
        data-combat-door={d.id} data-combat-points={d.points == null ? '' : d.points} data-combat-lv={p ? p.level : ''}
        aria-label={aria} onClick={() => open(d)}>
        <img className="u2-cb-art" src={d.art} alt="" draggable={false} />
        <span className="u2-cb-words">
          <span className="u2-cb-name">{w}</span>
          {p ? <span className="u2-cb-lv" data-combat-xp={p.max ? 'max' : p.xpNow + '/' + p.xpNeed}>{say(SAY, 'combatHub.lv', { n: p.level })}</span> : null}
          {p ? <Bar p={p} /> : null}
          {pts ? <span className={'u2-cb-pts' + (d.points > 0 ? ' is-on' : '')}>{pts}</span> : null}
        </span>
      </button>
    );
  };
  const weapons = doors.filter((d) => d.cat);
  const shared = doors.filter((d) => !d.cat);
  return (
    <div ref={ref} className={ui2RootClass() + ' u2-cb' + (short ? ' is-short' : '')} data-combat-hub={who == null ? 'self' : 'other'}>
      {short ? (
        <div className="u2-cb-row is-one">{doors.map(tile)}</div>
      ) : (
        <>
          <div className="u2-cb-row is-weapons">{weapons.map(tile)}</div>
          <div className="u2-cb-row is-shared">{shared.map(tile)}</div>
        </>
      )}
    </div>
  );
}

export default CombatHub;
