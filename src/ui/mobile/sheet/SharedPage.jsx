/* ═══ v2.3.6686: THE SHARED PAGE (card UI2-combat, the build's step 4, PR 2) ═══
 *
 * The owner, 2026-11-25: "Combat: Three independent weapon channels plus
 * shared attributes ... Shared points/EHP belong to shared screen."  The
 * same shape as a weapon's page (sheet/WeaponPage.jsx), in the screen's zones:
 *   summary   Max HP, the headline, with Defense beside it: numbers the game
 *             has (Max HP as the health bar shows it, toDisplayHp; Defense the
 *             Bro card's own row, broStats.js).  NO effective-health number
 *             ships: none exists in the game, and the specification calls it
 *             "an approved summary concept, not a finalized formula" (the
 *             master notes' F1: the owner's to define).  The headline's place
 *             is built so that number can take it on the owner's word;
 *   doors     "Attributes" with the shared points to spend (the worker's
 *             count: src/game/combatHub.js combatPools' `shared`, the shared
 *             pool and the free remainder), and the seven as kit tiles.
 * A tap on an attribute opens TODAY'S preview (sheet/statWindow.jsx), as a
 * weapon's page does: the pool a Spend draws on is the shared one
 * (combatHub.js spendPool), named here before the press and on the window's
 * Shared tab.  THE POINTS RULE IS THE WORKER'S (server/src/prog3.js
 * 1420-1426, v2.3.2592): a shared stat draws the shared pool or the free
 * remainder, never a weapon's points, so nothing here offers or says so.
 *
 * Another player's page (`who`, step 9): no count of theirs, the preview
 * reads only.
 *
 * v2.3.6783 (card UI3-combat): the weapon page's ONE template
 * (sheet/attrTemplate.jsx): Max HP the strip's sunk stat, Defense a fact in
 * its container (no box of its own), the full-width line over the seven.
 *
 * THE ROOM (the master notes' part 3): 172 px of content at 390 x 844: the
 * strip 44 px, the line 14, the seven two rows of 44 (four and three).
 * Sideways (63; 58): one row, the strip and the line over the seven. */
import React, { useEffect, useRef } from 'react';
import { infoPopupBus } from '../infoPopupBus.js';
import { statInfo } from '../infoGlossary.js';
import { useClock, useRoom } from './CharacterPage.jsx';
import { broStartWeapon, broWeaponStats } from './broStats.js';
import { statWindow } from './statWindow.jsx';
import { combatPools, pointsWords, spendPool, sharedAttributes, pointsTone, attrPlus } from '@/game/combatHub.js';
import { prog3BodyMeta } from '../../../data/prog3.js';
import { toDisplayHp } from '../../../data/gameSystems.js';
import { ui2RootClass } from '@/ui/kit/index.js';
import { SummaryStrip, AttrGrid } from './attrTemplate.jsx';
import { UpgradeGrid } from './attrTemplate.jsx';   /* v2.3.6844 (card UI4 PR 5): V17's order */
import { v17CombatWanted, v17Shape, v17TileArt, v17RuleInRow, sharedPointsRule } from '@/game/combatV17.js';
import { SAY as SAY_V17 } from '@/data/say/combatV17.js';
import { isOneLevelEnabled } from '../../../data/oneFormula.js';
import { SAY } from '@/data/say/combatHub.js';
import { say } from '@/game/say.js';
import './combatPage.css';

/* v2.3.6844 (card UI4 PR 5): V17's order (the upgrades first) unless `?v17combat=0` on this device */
const V17_COMBAT = v17CombatWanted();

/* the shared Speed is the walk's: "Move speed" where a page could also say "Attack speed" (the card's reading 8) */
const TILE_WORD = { move: () => say(SAY, 'combatHub.moveSpeed') };

function chanOf(S) { return !!(S && S._serverCaps && S._serverCaps.prog3Chan); }

/** The headline's two numbers, the game's own: { hp, def }. */
export function sharedHeadline(R) {
  const r = R || {};
  let hp = '—';
  try { hp = String(toDisplayHp(Number(r.maxHp) || 100)); } catch (e) { hp = '—'; }
  let def = '—';
  try { def = broWeaponStats(r, broStartWeapon(r)).rows.find((x) => x.key === 'def').value; } catch (e) { def = '—'; }
  return { hp, def };
}

function pageKey(S, waiting) {
  const R = (S && S.rpg) || null;
  const p = combatPools(R, chanOf(S));
  const alloc = (R && R.prog3 && R.prog3.alloc) || {};
  const h = sharedHeadline(R);
  return [p.shared, h.hp, h.def, Object.keys(alloc).map((k) => k + alloc[k]).join(','),
    waiting ? Math.floor(Date.now() / 1000) : 0].join('|');
}

function explain(key, value) {
  try {
    const info = statInfo(key);
    if (info) infoPopupBus.open({ title: info.title, body: info.body, note: info.note, stat: String(value) });
  } catch (e) { /* no explainer: nothing opens */ }
}

/**
 * S    the game's state (handed by BroCard)
 * who  whose page (null: yours)
 * live () => the game's state now (optional; default the S handed)
 */
export function SharedPage({ S, who, live }) {
  const stayRef = useRef(null);
  const stayCheckRef = useRef(null);
  useClock(() => pageKey(live ? live() : S, !!stayRef.current), 300);
  const [ref, room] = useRoom();
  useEffect(() => {
    const f = stayCheckRef.current;
    if (f) { try { f(); } catch (e) { stayRef.current = null; } }
  });
  const self = who == null;
  const R = (S && S.rpg) || {};
  const head = sharedHeadline(R);
  const pools = combatPools(R, chanOf(S));
  const avail = self ? pools.shared : null;
  const attrs = sharedAttributes(R);
  const win = statWindow({
    R, buildCat: broStartWeapon(R), stayRef, readOnly: !self, live: live || (() => S),
    laneAvail: (c) => Number(pools[c]) || 0, sharedAvail: pools.shared, commitRole: V17_COMBAT,
  });
  stayCheckRef.current = self ? win.stayCheck : null;
  const metaOf = Object.create(null);
  for (const m of prog3BodyMeta()) metaOf[m.key] = m;
  const openAttr = (key) => {
    const m = metaOf[key];
    if (!m) return;
    const st = { ...m };
    const lane = spendPool(key, null);   /* the pool the page named: the shared one */
    if (lane !== 'shared') return;
    win.openStatInfo(st, lane, self ? win.spendFor(st, lane) : null);
  };
  /* v2.3.6844 (card UI4 PR 5): what V17's order drew (its shape, the pictures' size, the rule's words) */
  let v17Probe = null;
  useEffect(() => {
    try { window.__btSharedPage = { hp: head.hp, def: head.def, points: avail, attrs: attrs.map((a) => a.key), v17: v17Probe }; } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btSharedPage = null; } catch (e) { /* no window */ } }, []);

  const short = room.short;
  /* v2.3.6783 (card UI3-combat): the weapon page's ONE template (sheet/attrTemplate.jsx): the strip
     (Max HP the stat, Defense a fact in its one container), the full-width line, the seven */
  const pw = avail == null ? null : pointsWords(avail);
  const line = {
    k: say(SAY, 'combatHub.attributes'),
    words: pw ? say(SAY, pw.key === 'combatHub.point' ? 'combatHub.sharedPoint' : 'combatHub.sharedPoints', { n: pw.n }) : null,
    tone: pointsTone(avail), data: { 'data-shared-pool': avail == null ? '' : avail },
  };
  /* v2.3.6844 (card UI4 PR 5): under `?v17combat` the same ONE strip sits after the seven, and where its row
     holds it the game's rule for shared points beside Defense (combatV17.js sharedPointsRule; flag Q1) */
  const v17Shape0 = V17_COMBAT ? v17Shape(short) : null;
  const v17RuleIn = V17_COMBAT && self && v17RuleInRow(v17Shape0, room.w);
  let oneLevel = true;
  try { oneLevel = isOneLevelEnabled(); } catch (e) { oneLevel = true; }
  const rule = sharedPointsRule(oneLevel);
  const ruleWords = say(SAY_V17, rule.key === 'combatV17.ruleEvery' ? 'combatV17.ruleEvery' : 'combatV17.ruleBest', { n: rule.n });
  const strip = (
    <SummaryStrip
      stat={{ v: head.hp, k: say(SAY, 'combatHub.maxHp'), aria: say(SAY, 'combatHub.maxHpAria', { v: head.hp }), data: { 'data-shared-hp': head.hp },
        onClick: () => explain(metaOf.hp ? metaOf.hp.label : '', head.hp) }}
      facts={[{ id: 'def', k: say(SAY, 'combatHub.defense'), v: head.def, data: { 'data-shared-def': head.def } }].concat(v17RuleIn ? [{ id: 'rule', k: say(SAY_V17, 'combatV17.ruleK'), v: ruleWords, data: { 'data-shared-rule': rule.key } }] : [])}
      wide={v17RuleIn || undefined} />
  );
  const attrsOf = attrs.map((a) => {
    const label = TILE_WORD[a.key] ? TILE_WORD[a.key]() : a.label;
    return {
      key: a.key, label, art: a.art, pts: a.pts,
      value: a.cap == null ? say(SAY, 'combatHub.attrPts', { n: a.pts }) : a.pts + ' / ' + a.cap,
      aria: a.cap == null ? say(SAY, 'combatHub.attrAriaFree', { stat: label, pts: a.pts }) : say(SAY, 'combatHub.attrAria', { stat: label, pts: a.pts, cap: a.cap }),
    };
  });
  const noart = !short && room.w > 0 && room.w < 520;   /* upright under 520 px of page the pictures go, never the words */
  const grid = <AttrGrid line={line} attrs={attrsOf} mark="shared" plus={attrPlus(avail, self)} onOpen={openAttr} grid={'is-seven' + (short ? ' is-one' : '') + (noart ? ' is-noart' : '')} />;

  /* ═══ v2.3.6844 (card UI4 PR 5, `?v17combat`): V17:55's order on the one template ═══
     "Shared ...: upgrade choices and available points first, supporting current strength below in
     portrait or to the right in landscape."  The seven FIRST, each the game's picture over its name
     (sheet/attrTemplate.jsx UpgradeGrid: never the pictureless tiles of a narrow page, which cut
     "Max Mana" and "Move speed" at 320 and 360 wide: mp-v17fit), then Max HP (the stat: its tap
     explains it) and Defense, and, where the row holds it, where shared points come from in the GAME
     (src/game/combatV17.js sharedPointsRule: the best weapon's level; flag Q1). */
  if (V17_COMBAT) {
    const shape = v17Shape0;
    const art = v17TileArt(room.h, shape === 'side');
    v17Probe = { shape, art, ruleIn: v17RuleIn, rule: rule.key, ruleWords, w: room.w, h: room.h, order: 'upgrades,strength' };
    const ups = <UpgradeGrid line={line} attrs={attrsOf} mark="shared" plus={attrPlus(avail, self)} onOpen={openAttr} art={art} grid={'is-seven' + (shape === 'side' ? ' is-one' : '')} />;
    return (
      <div ref={ref} className={ui2RootClass() + ' u2-wp u2-sp u2-cv is-' + shape + (short ? ' is-short' : '')} data-shared-page="" data-shared-whose={self ? 'self' : 'other'} data-cv-order="upgrades,strength" data-shared-rule-words={self ? ruleWords : ''}>
        {shape === 'side' ? <div className="u2-wp-row is-one">{ups}{strip}</div> : <>{ups}<div className="u2-cv-foot">{strip}</div></>}
      </div>
    );
  }

  return (
    <div ref={ref} className={ui2RootClass() + ' u2-wp u2-sp' + (short ? ' is-short' : '')} data-shared-page="" data-shared-whose={self ? 'self' : 'other'}>
      {short ? <div className="u2-wp-row is-one">{strip}{grid}</div> : <>{strip}{grid}</>}
    </div>
  );
}

export default SharedPage;
