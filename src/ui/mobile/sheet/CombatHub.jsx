/* ═══ v2.3.6685: COMBAT'S HUB, FOUR DOORS (card UI2-combat, the build's step 4, PR 1) ═══
 *
 * The master specification's 4.2 and reference 03 (its structure, not its
 * finish or its numbers): three equal tiles, Sword, Bow, Staff, each its
 * level, its XP bar and its points' count; under them one wide tile, Shared
 * Attributes, with the shared count.  A weapon's tile opens its own page
 * (sheet/WeaponPage.jsx; "Return to the Combat hub to switch": the header's
 * Back); Shared opens the Shared page (sheet/SharedPage.jsx, v2.3.6686; until
 * then the Points window on its Shared column).
 *
 * What each tile shows is src/game/combatHub.js combatHubDoors' word (the
 * pools as the worker holds them, the words of a count from one rule, the
 * level and XP from src/game/progression.js); this file draws it from the
 * kit (src/ui/kit/ui2.css: a raised face for what opens something).
 *
 * THE ROOM (the master notes' part 3; v2.3.6783, the owner's "Make the weapons
 * visually dominant, enlarge the level numbers and only show available points
 * prominently when there are points to spend"): upright the weapons' row
 * takes what Shared's 44 px leaves, the picture all the words leave of it, the
 * level 24 px; sideways one row of four, each its picture beside its words. */
import React, { useEffect } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { useClock, useRoom } from './CharacterPage.jsx';
import { combatHubDoors, combatPools, combatLevel, hubArtSize, sharedAttributes } from '@/game/combatHub.js';
import { broHubOpen } from '@/game/broHub.js';
import { ui2RootClass } from '@/ui/kit/index.js';
import { Ui2LevelTile, Ui2Tile } from '@/ui/kit/index.js';   /* v2.3.6844 (card UI4 PR 5): Bro's own pieces under ?v17combat */
import { broV17Weapons } from '@/game/broV17.js';
import { v17CombatWanted, sharedDoorArt, sharedDoorArtFits, sharedDoorTaken } from '@/game/combatV17.js';
import { broStartWeapon, broDpsInputs } from './broStats.js';
import { SAY as SAY_BRO } from '@/data/say/broV17.js';
import { SAY as SAY_V17 } from '@/data/say/combatV17.js';
import { SAY } from '@/data/say/combatHub.js';
import { say } from '@/game/say.js';
import './combatPage.css';

/* v2.3.6844 (card UI4 PR 5): the hub's tiles are Bro's own pieces unless `?v17combat=0` on this device */
const V17_COMBAT = v17CombatWanted();

/* what the hand reads (sheet/BroV17.jsx's reading): the held lane and what each lane wears */
function handOfR(R) {
  const worn = { sword: false, bow: false, staff: false };
  for (const c of Object.keys(worn)) { try { worn[c] = !!broDpsInputs(R, c).wpn; } catch (e) { worn[c] = false; } }
  let held = 'sword';
  try { held = broStartWeapon(R); } catch (e) { held = 'sword'; }
  return { held, worn };
}
function handWord(h) {
  if (h === 'held') return say(SAY_BRO, 'broV17.inHand');
  if (h === 'worn') return say(SAY_BRO, 'broV17.worn');
  if (h === 'none') return say(SAY_BRO, 'broV17.notWorn');
  return null;
}

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
  const art = hubArtSize(room.h, short);   /* v2.3.6783 (card UI3-combat): the picture as large as the room leaves */
  useEffect(() => {
    try { window.__btCombatHub = { doors: doors.map((d) => ({ id: d.id, lv: d.progress ? d.progress.level : null, points: d.points })), v17: V17_COMBAT }; } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btCombatHub = null; } catch (e) { /* no window */ } }, []);
  /* v2.3.6686 (PR 2): every door opens a page of its own, Shared too (sheet/SharedPage.jsx) */
  const open = (d) => { const o = broHubOpen(d.opens); if (o && o.kind === 'page') dashboardPanelBus.go({ type: 'push', id: o.page, who: who == null ? undefined : who }); };
  const tile = (d) => {
    const w = word(d.word);
    const p = d.progress;
    const pts = poolText(d.pointsWords);
    const aria = d.cat ? say(SAY, 'combatHub.doorAria', { w, n: p ? p.level : 1, pts }) : say(SAY, 'combatHub.sharedAria', { pts });
    const px = d.cat ? art : short ? 26 : 30;   /* Shared's picture keeps its size: its words are long */
    return (
      <button key={d.id} type="button" className={'u2-raised u2-cb-door' + (d.cat ? ' is-weapon' : ' is-shared') + (d.glow ? ' is-glow' : '')}
        data-combat-door={d.id} data-combat-points={d.points == null ? '' : d.points} data-combat-lv={p ? p.level : ''}
        aria-label={aria} onClick={() => open(d)}>
        <img className="u2-cb-art" src={d.art} alt="" draggable={false} style={{ width: px + 'px', height: px + 'px' }} />
        <span className="u2-cb-words">
          <span className="u2-cb-name">{w}</span>
          {p ? <span className="u2-cb-lv" data-combat-xp={p.max ? 'max' : p.xpNow + '/' + p.xpNeed}>{say(SAY, 'combatHub.lv', { n: p.level })}</span> : null}
          {p ? <Bar p={p} /> : null}
          {d.pointsShown ? <span className="u2-cb-pts is-on">{pts}</span> : null}
        </span>
      </button>
    );
  };
  const weapons = doors.filter((d) => d.cat);
  const shared = doors.filter((d) => !d.cat);

  /* ═══ v2.3.6844 (card UI4 PR 5, `?v17combat`): the hub held to the owner's two tests ═══
     The owner, 02:10 UTC 2026-11-28: "Don't like combat menu ... Too confusing for first time player
     and doesn't use visuals first."  V17 draws no Combat hub (its prototype's Combat page: "Existing
     Combat functionality lives here ... not yet redesigned"; V17's Bro is its hub, built in PR 4), so
     within the card: the three weapons are Bro's own level tiles (the game's picture first, Lv, the bar,
     the state in words: In hand, Worn, Not worn, V17:55; the points only while there are some), and the
     Shared door SHOWS what it opens: the seven upgrades' own pictures after its name, as many as its
     width holds (src/game/combatV17.js sharedDoorArtFits; none rather than a cut row).  Whether the hub
     should stay at all beside V17's Bro is the owner's (flagged). */
  if (V17_COMBAT) {
    const hand = who == null ? handOfR(R) : { held: null, worn: {} };
    const v17w = broV17Weapons(R, chanOf(S), who == null ? null : who, hand);
    const rowH = short ? room.h : room.h - 44 - 6;
    const tileShape = short || rowH < 96 ? 'row' : 'stack';
    const lArt = tileShape === 'row' ? 28 : Math.max(24, Math.min(56, rowH - 58));
    const sevens = sharedDoorArt(sharedAttributes(R));
    const sDoor = shared[0];
    const sPts = sDoor ? poolText(sDoor.pointsWords) : '';
    const sArt = short ? 24 : 30;
    const sW = short ? (room.w - 3 * 4) / 4 : room.w;   /* sideways the door is one of four in the row */
    const nArt = sharedDoorArtFits(sW, sharedDoorTaken(sArt, !!(sDoor && sDoor.pointsShown)), sevens.length);
    const wTile = (w) => {
      const name = word(w.word);
      const lv = w.progress ? w.progress.level : 1;
      const pts = w.cue ? poolText(w.pointsWords) : null;
      const state = handWord(w.hand);
      return (
        <Ui2LevelTile key={w.id} intent="go" art={w.art} artSize={lArt} shape={tileShape}
          label={name} level={w.progress ? say(SAY, 'combatHub.lv', { n: lv }) : null}
          frac={w.progress ? w.progress.frac : 0} max={!!(w.progress && w.progress.max)}
          cue={pts} mark={state} held={w.hand === 'held'} className="u2-cv-door"
          data-combat-door={w.id} data-combat-points={w.points == null ? '' : w.points} data-combat-lv={lv} data-combat-hand={w.hand || ''}
          data-combat-xp={w.progress ? (w.progress.max ? 'max' : w.progress.xpNow + '/' + w.progress.xpNeed) : ''}
          aria-label={who == null
            ? say(SAY_BRO, 'broV17.weaponAria', { w: name, n: lv, state: state || '', pts: pts ? say(SAY_BRO, 'broV17.ptsAria', { pts }) : '' })
            : say(SAY_BRO, 'broV17.weaponOther', { w: name, n: lv })}
          onClick={() => open(w)} />
      );
    };
    const sTile = sDoor ? (
      <Ui2Tile key={sDoor.id} intent="go" size="compact" art={sDoor.art} artSize={sArt} className="u2-cv-shared"
        label={word(sDoor.word)}
        sub={(nArt > 0 || sDoor.pointsShown) ? (
          <span className="u2-cv-sevens" data-combat-sevens={nArt}>
            {sevens.slice(0, nArt).map((a) => <img key={a.key} className="u2-cv-seven" src={a.art} alt="" draggable={false} />)}
            {sDoor.pointsShown ? <span className="u2-cv-shared-pts">{sPts}</span> : null}
          </span>
        ) : undefined}
        data-combat-door={sDoor.id} data-combat-points={sDoor.points == null ? '' : sDoor.points}
        aria-label={say(SAY_V17, 'combatV17.sharedDoorAria', { pts: sDoor.pointsShown ? say(SAY_BRO, 'broV17.ptsAria', { pts: sPts }) : '' })}
        onClick={() => open(sDoor)} />
    ) : null;
    return (
      <div ref={ref} className={ui2RootClass() + ' u2-cb u2-cv-hub' + (short ? ' is-short' : '')} data-combat-hub={who == null ? 'self' : 'other'} data-cv-hub={tileShape}>
        {short ? (
          <div className="u2-cb-row is-one">{v17w.map(wTile)}{sTile}</div>
        ) : (
          <>
            <div className="u2-cb-row is-weapons">{v17w.map(wTile)}</div>
            <div className="u2-cb-row is-shared">{sTile}</div>
          </>
        )}
      </div>
    );
  }

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
