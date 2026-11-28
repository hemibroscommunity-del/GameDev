/* ═══ v2.3.6843: BRO, THE THREE WEAPONS FIRST (card UI4 PR 4, the owner's V17) ═══
 *
 * The owner's V17 (docs/design/v17/MASTER-IMPLEMENTATION.md line 55): "Bro
 * presents recognizable Sword/Bow/Staff artwork, levels/progress and
 * available points first, then Character stats and Pets, with active weapon
 * damage and health afterward. Distinguish equipped weapon from in-hand
 * weapon."  What each piece shows is src/game/broV17.js's word; this file
 * draws it from the kit and acts on a tap with today's own roads:
 *   - Sword, Bow, Staff: the kit's level tile (Ui2LevelTile, the go role),
 *     each the game's picture, `Lv n`, its XP bar, its state in words (In
 *     hand, framed; Worn; Not worn) and its points ONLY while there are some;
 *     a tap pushes that weapon's page (one tap; its Back returns here);
 *   - the Shared page's door (V17's "Character stats"; the game's word,
 *     "Shared Attributes", until the owner says: flag Q13) with its points,
 *     and Pets (locked without the worker's `petbook` cap, saying why);
 *   - quieter: the held weapon's DPS (the weapon page's own headline,
 *     broStats.js) and Max HP (the Shared page's, toDisplayHp): flat facts,
 *     nothing to press (V17:38), never an "effective health";
 *   - ONE quiet strip (the kit's Ui2Strip): Equipment, Life Skills, Feats,
 *     Journey (the doors that left Bro's first row), then AP, Quests, Clan,
 *     Guilds (BroStrip's own entries, the same piece); whole entries only, a
 *     "more" control where they do not all fit.
 * No portrait, name or combat level (the HUD has them).  `?v17bro=0` gives
 * sheet/BroLanding.jsx, untouched.
 *
 * The game's state comes from the parent (open-hand.test): BroCard hands S,
 * the caps, whose page, Equipment's road and the strip's reader.  Its root is
 * `[data-bro-landing]` too, so Bro's 11 px smallest word holds (ui2Tokens.js
 * UI2_V17_SMALL11: at 12 its labels clip). */
import React, { useEffect, useState } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { infoPopupBus } from '../infoPopupBus.js';
import { frameTap } from '../dash/DashHeader.jsx';
import { doorWord } from '../dash/MenuGrid.jsx';
import { useClock, useRoom } from './CharacterPage.jsx';
import { broStartWeapon, broDpsInputs, broWeaponStats } from './broStats.js';
import { sharedHeadline } from './SharedPage.jsx';
import { poolText } from './CombatHub.jsx';
import { BroStripFact, stripEntries, stripEntriesKey } from './BroStrip.jsx';
import { broHubDoors, broHubMarks, broHubOpen } from '@/game/broHub.js';
import { broV17Weapons, broV17Doors, broV17Strip, broV17Shape, broV17FactsInRow, broV17PetsInRow, broV17StripPages, broV17StripPage, BRO_V17_ROOM } from '@/game/broV17.js';
import { combatPools } from '@/game/combatHub.js';
import { ui2RootClass, Ui2LevelTile, Ui2Strip, Ui2Tile, Ui2Facts, Ui2Fact } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/broV17.js';
import { SAY as SAY_CH } from '@/data/say/combatHub.js';
import { SAY as SAY_DF } from '@/data/say/dashFrame.js';
import { say } from '@/game/say.js';
import './broV17.css';

/* the words, each key written out (say.test rule 7) */
function chWord(k) {
  switch (k) {
    case 'combatHub.sword': return say(SAY_CH, 'combatHub.sword');
    case 'combatHub.bow': return say(SAY_CH, 'combatHub.bow');
    case 'combatHub.staff': return say(SAY_CH, 'combatHub.staff');
    case 'combatHub.shared': return say(SAY_CH, 'combatHub.shared');
    default: return '';
  }
}
function handWord(h) {
  if (h === 'held') return say(SAY, 'broV17.inHand');
  if (h === 'worn') return say(SAY, 'broV17.worn');
  if (h === 'none') return say(SAY, 'broV17.notWorn');
  return null;
}
const catWord = (cat) => chWord('combatHub.' + cat);

function chanOf(S) { return !!(S && S._serverCaps && S._serverCaps.prog3Chan); }

/* what the hand reads: the held lane (rpg.activeSlot) and what each lane wears */
function handOfS(R) {
  const worn = { sword: false, bow: false, staff: false };
  for (const c of Object.keys(worn)) { try { worn[c] = !!broDpsInputs(R, c).wpn; } catch (e) { worn[c] = false; } }
  let held = 'sword';
  try { held = broStartWeapon(R); } catch (e) { held = 'sword'; }
  return { held, worn };
}

/* the quieter facts: the held weapon's DPS and Max HP (the game's own numbers) */
function factsOf(R, held) {
  let dps = '—';
  try { dps = broWeaponStats(R, held).rows.find((r) => r.key === 'dps').value; } catch (e) { dps = '—'; }
  let hp = '—';
  try { hp = sharedHeadline(R).hp; } catch (e) { hp = '—'; }
  return { dps: { k: say(SAY, 'broV17.heldDps', { w: catWord(held) }), v: dps }, hp: { k: say(SAY_CH, 'combatHub.maxHp'), v: hp } };
}

/* what moves the page: the pools, the levels and XP, the hand, the two numbers (the page's clock reads it) */
function pageKey(S) {
  const R = (S && S.rpg) || null;
  const p = combatPools(R, chanOf(S));
  const sk = (R && R.prog3 && R.prog3.sk) || {};
  const h = handOfS(R);
  const f = factsOf(R, h.held);
  return [p.sword, p.bow, p.staff, p.shared, h.held, h.worn.sword, h.worn.bow, h.worn.staff, f.dps.v, f.hp.v,
    ['sword', 'bow', 'staff'].map((c) => (sk[c] ? (sk[c].level || 0) + ':' + Math.floor(sk[c].xp || 0) : '-')).join(',')].join('|');
}

/**
 * S       the game's state (handed by BroCard)
 * caps    the worker's caps (S._serverCaps; null: not known yet)
 * who     whose page (null: yours)
 * lifeNew a life skill's level-up not seen yet (Life Skills' dot)
 * onGear  Equipment's road (BroCard openGear: unused while Equipment opens its showcase)
 * read    the strip's readings, () => readPassport(S) (BroCard)
 */
export function BroV17({ S, caps, who, lifeNew, onGear, read }) {
  const self = who == null;
  useClock(() => pageKey(S) + '#' + stripEntriesKey(read, self ? null : who), 500);
  const [ref, room] = useRoom();
  const [sref, sroom] = useRoom();
  const [page, setPage] = useState(0);
  const R = (S && S.rpg) || null;
  const chan = chanOf(S);
  const hand = handOfS(R);
  const weapons = broV17Weapons(R, chan, self ? null : who, hand);
  const doors = broV17Doors(R, chan, caps, self ? null : who);
  const facts = factsOf(R, hand.held);
  const shape = broV17Shape(room.w, room.h, room.short);
  const factsInRow = broV17FactsInRow(shape, room.w);
  const petsInRow = broV17PetsInRow(shape, room.w);
  const entries = broV17Strip(!factsInRow, !petsInRow);
  const rowDoors = petsInRow ? doors : doors.filter((d) => d.id !== 'pets');
  const sideNarrow = shape === 'side' && room.w > 0 && room.w < 760;
  const pages = broV17StripPages(entries.length, sroom.w);
  const shown = broV17StripPage(entries, pages.per || entries.length, page);
  const have = Object.create(null);
  for (const s of stripEntries(read, self ? null : who)) have[s.id] = s;
  const hub = Object.create(null);
  for (const d of broHubDoors(caps)) hub[d.id] = d;
  const marks = broHubMarks(0, lifeNew, self ? null : who);

  /* the art: as large as the weapons' row leaves (upright: the row under it is the doors' and the strip's) */
  const R0 = BRO_V17_ROOM;
  /* a computer's row no taller than an upright phone's (V17:31: more entries, never larger tiles) */
  const rowH = shape === 'side' ? room.h : shape === 'wide' ? Math.min(R0.WIDE_ROW, room.h - R0.ROW - R0.GAP) : room.h - 2 * R0.ROW - 2 * R0.GAP;
  const tileShape = shape === 'side' || rowH < R0.WEAPON_MIN + 24 ? 'row' : 'stack';
  const art = tileShape === 'row' ? 28 : Math.max(24, Math.min(44, rowH - 50));

  useEffect(() => {
    try {
      window.__btBroV17 = {
        shape, factsInRow, petsInRow, tileShape, art, page: shown.page, pages: shown.pages, per: pages.per,
        weapons: weapons.map((w) => ({ cat: w.cat, lv: w.progress ? w.progress.level : null, points: w.points, cue: w.cue, hand: w.hand })),
        doors: doors.map((d) => ({ id: d.id, points: d.points, cue: d.cue, locked: d.locked })),
        facts: { dps: facts.dps.v, hp: facts.hp.v, held: hand.held },
        strip: shown.entries.map((e) => e.id),
      };
    } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btBroV17 = null; } catch (e) { /* no window */ } }, []);
  /* the strip's page starts again at the first where its width changes how many a page holds */
  useEffect(() => { setPage(0); }, [pages.per]);

  const push = (id) => dashboardPanelBus.go({ type: 'push', id, who: self ? undefined : who });
  const openWord = (opens) => { const o = broHubOpen(opens); if (!o) return; if (o.kind === 'gear') { if (onGear) onGear(); return; } push(o.page); };
  const locked = (word) => { try { infoPopupBus.open({ title: word, body: say(SAY_DF, 'dashFrame.notOffered') }); } catch (e) { /* no popup: the tile is greyed */ } };

  const weaponTile = (w) => {
    const name = catWord(w.cat);
    const lv = w.progress ? w.progress.level : 1;
    const pts = w.cue ? poolText(w.pointsWords) : null;
    const state = handWord(w.hand);
    const aria = self
      ? say(SAY, 'broV17.weaponAria', { w: name, n: lv, state: state || '', pts: pts ? say(SAY, 'broV17.ptsAria', { pts }) : '' })
      : say(SAY, 'broV17.weaponOther', { w: name, n: lv });
    return (
      <Ui2LevelTile key={w.id} intent="go" art={w.art} artSize={art} shape={tileShape}
        label={name} level={w.progress ? say(SAY_CH, 'combatHub.lv', { n: lv }) : null}
        frac={w.progress ? w.progress.frac : 0} max={!!(w.progress && w.progress.max)}
        cue={pts} mark={state} held={w.hand === 'held'}
        data-bro-weapon={w.cat} data-bro-hand={w.hand || ''} data-bro-points={w.points == null ? '' : w.points} data-bro-lv={lv}
        data-bro-xp={w.progress ? (w.progress.max ? 'max' : w.progress.xpNow + '/' + w.progress.xpNeed) : ''}
        aria-label={aria} {...frameTap(() => openWord(w.opens))} />
    );
  };
  const doorTile = (d, style) => {
    const word = d.id === 'shared' ? chWord(d.word) : doorWord(d.word);
    const pts = d.cue ? poolText(d.pointsWords) : null;
    const aria = d.id === 'shared' ? say(SAY, 'broV17.sharedAria', { pts: pts ? say(SAY, 'broV17.ptsAria', { pts }) : '' }) : word;
    return (
      <Ui2Tile key={d.id} intent={d.locked ? 'disabled' : 'go'} size="compact" art={d.art || undefined} artSize={shape === 'side' ? 24 : 28}
        label={word} sub={pts ? <span className="u2-bv-pts">{pts}</span> : undefined}
        locked={d.locked || undefined} data-locked={d.locked ? '' : undefined}
        className={'u2-bv-door is-' + d.id} style={style} data-bro-door={d.id} data-dest={d.id} data-bro-points={d.points == null ? '' : d.points}
        aria-label={aria} {...frameTap(() => (d.locked ? locked(word) : openWord(d.opens)))} />
    );
  };
  const fact = (id, style) => (
    <Ui2Fact key={'f-' + id} intent="info" k={facts[id].k} v={facts[id].v} style={style}
      data-bro-quiet={id} aria-label={say(SAY, 'broV17.factAria', { k: facts[id].k, v: facts[id].v })} />
  );
  const factsBox = factsInRow ? (
    <Ui2Facts className="u2-bv-facts" data-bro-facts="row">{fact('dps')}{fact('hp')}</Ui2Facts>
  ) : null;
  const ew = pages.entryW ? { flex: '0 0 ' + pages.entryW + 'px', width: pages.entryW, minWidth: 0 } : { flex: '1 1 0', minWidth: 0 };
  const stripEntry = (e) => {
    if (e.kind === 'fact') return fact(e.id, ew);
    if (e.kind === 'pets') { const d = doors.find((x) => x.id === 'pets'); return d ? doorTile(d, ew) : null; }
    if (e.kind === 'have') return have[e.id] ? <BroStripFact key={'h-' + e.id} s={have[e.id]} who={who} narrow={false} style={ew} /> : null;
    const d = hub[e.id];
    if (!d) return null;
    const word = doorWord(d.word);
    const m = marks[d.id] || {};
    return (
      <Ui2Tile key={'d-' + d.id} intent={d.locked ? 'disabled' : 'go'} size="compact" art={d.art || undefined} artSize={20}
        label={word} dot={m.dot} locked={d.locked || undefined} data-locked={d.locked ? '' : undefined}
        className="u2-bv-entry" style={ew} data-dest={d.id} data-key={d.key || undefined} data-bro-entry={d.id}
        {...frameTap(() => (d.locked ? locked(word) : openWord(d.opens)))} />
    );
  };
  const strip = (
    <div ref={sref} className="u2-bv-stripbox">
      <Ui2Strip className="u2-bv-strip" data-bro-strip={self ? 'self' : 'other'} role="group" aria-label={say(SAY_DF, 'dashFrame.bro')}
        page={shown.page} pages={pages.pages} onPage={setPage}
        more={say(SAY, 'broV17.more', { i: shown.page + 1, n: shown.pages })} count={say(SAY, 'broV17.pageN', { i: shown.page + 1, n: shown.pages })}>
        {sroom.w > 0 ? shown.entries.map(stripEntry) : null}
      </Ui2Strip>
    </div>
  );

  return (
    <div ref={ref} className={ui2RootClass() + ' u2-bv is-' + shape + (sideNarrow ? ' is-narrow' : '')} data-bro-landing={self ? 'self' : 'other'} data-bro-v17={shape}>
      {shape === 'side' ? (
        <div className="u2-bv-row is-one">
          {weapons.map(weaponTile)}
          {rowDoors.map((d) => doorTile(d))}
          {factsBox}
          {strip}
        </div>
      ) : shape === 'wide' ? (
        <>
          <div className="u2-bv-row is-top">
            {weapons.map(weaponTile)}
            <div className="u2-bv-col">{rowDoors.map((d) => doorTile(d))}</div>
            {factsBox}
          </div>
          {strip}
        </>
      ) : (
        <>
          <div className="u2-bv-row is-weapons">{weapons.map(weaponTile)}</div>
          <div className="u2-bv-row is-doors">{rowDoors.map((d) => doorTile(d))}{factsBox}</div>
          {strip}
        </>
      )}
    </div>
  );
}

export default BroV17;
