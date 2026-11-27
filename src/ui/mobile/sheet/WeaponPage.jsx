/* ═══ v2.3.6685: A WEAPON'S PAGE (card UI2-combat, the build's step 4, PR 1) ═══
 *
 * The owner, 2026-11-25: "Dedicated weapon screen with level/XP, DPS,
 * supporting stats and six attributes ... Existing allocation preview opens
 * on selection, not a permanent panel."  The specification's 4.2: "No
 * permanent allocation preview, direct-spend plus controls, separate
 * progression-only screen or nested tab strip. Each weapon opens a dedicated
 * screen (not a persistent weapon selector). Return to the Combat hub to
 * switch."  So, in the screen's zones:
 *   identity  the level and its XP, a continuous bar, now and needed, with
 *             the one true line of what a level gives (src/game/progression.js
 *             weaponProgress, weaponRoadmap: the game's own readers);
 *   summary   DPS, the headline (the kit's stat headline: it LOOKS tappable),
 *             and beside it, subordinate, Damage, Attack speed, Crit chance
 *             and Range: the game's own strings (sheet/broStats.js
 *             broWeaponStats, the readers the Bro card has always shown).
 *             Element is NOT among them: it is no part of DPS
 *             (gameSystems.js calcDisplayDps; the audit, 14 §3);
 *   doors     "Attributes" with this weapon's points to spend (the worker's
 *             count: src/game/combatHub.js combatPools), and the six as kit
 *             tiles in two rows of three, each its points of its cap.
 * A tap on an attribute opens TODAY'S preview (sheet/statWindow.jsx, moved
 * whole from the Points window): the stepper at 0, before and after, the DPS
 * row, the replayed fight, the lane tabs with each pool's count, Spend.  With
 * no points it opens too, and reads (Spend greyed with its reason).  The pool
 * a Spend draws on is the page's own weapon (combatHub.js spendPool), named
 * on the page before the press and on the window's lane tab.
 *
 * DPS's tap opens its breakdown, one layer at a time (v2.3.6686, PR 2: the
 * stat tree, sheet/StatTree.jsx, its layer 0 a frame page pushed over this
 * one; v2.3.6685 opened the explainer, infoGlossary statInfo).
 *
 * Another player's page (`who`, step 9): no count of theirs, and the
 * preview reads only (InfoPopup's readOnly: no stepper, no Spend).
 *
 * v2.3.6783 (card UI3-combat): the page draws the ONE template
 * (sheet/attrTemplate.jsx), the same for Sword, Bow and Staff and for Shared:
 * row 1 the level; row 2 the summary strip, DPS the kit's sunk stat and the
 * four as facts in one container; row 3 the full-width line "Attributes" with
 * the count (gold while there are points) over the six, three by two, each a
 * gold "+" while points wait.  The left Attributes column is gone.
 *
 * THE ROOM (the master notes' part 3): 172 px of content at 390 x 844: 18 for
 * the level, 44 for the strip, 14 for the line, 90 for the six (two rows of
 * 44), 6 px of gaps (combatHub.js WEAPON_PAGE_BANDS).  At 375 x 667 (168) the
 * line folds onto the level row (weaponPageFold).  Sideways (63; 58): one
 * row: the level, DPS, the four where 900 px of page hold them (narrower: one
 * door, "All stats", never smaller text), and the line over the six as 44 px
 * doors. */
import React, { useEffect, useRef } from 'react';
import { infoPopupBus } from '../infoPopupBus.js';
import { useClock, useRoom } from './CharacterPage.jsx';
import { broWeaponStats } from './broStats.js';
import { statWindow } from './statWindow.jsx';
import { combatPools, pointsWords, spendPool, weaponAttributes, TREE_PAGES, treeSel, pointsTone, attrPlus, weaponPageFold } from '@/game/combatHub.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { weaponProgress, weaponRoadmap } from '@/game/progression.js';
import { prog3AtkMeta } from '../../../data/prog3.js';
import { ui2RootClass } from '@/ui/kit/index.js';
import { SummaryStrip, AttrGrid, AttrLine } from './attrTemplate.jsx';
import { SAY } from '@/data/say/combatHub.js';
import { say } from '@/game/say.js';
import './combatPage.css';

/* the supporting stats, in order: broStats.js's keys (never 'elem': no part of DPS) */
export const WEAPON_SUPPORT = Object.freeze(['damage', 'aspd', 'crit', 'range']);
const SUPPORT_WORD = {
  damage: () => say(SAY, 'combatHub.damage'),
  aspd: () => say(SAY, 'combatHub.aspd'),
  crit: () => say(SAY, 'combatHub.crit'),
  range: () => say(SAY, 'combatHub.range'),
};
const WEAPON_WORD = {
  sword: () => say(SAY, 'combatHub.sword'),
  bow: () => say(SAY, 'combatHub.bow'),
  staff: () => say(SAY, 'combatHub.staff'),
};

function chanOf(S) { return !!(S && S._serverCaps && S._serverCaps.prog3Chan); }

function pageKey(S, cat, waiting) {
  const R = (S && S.rpg) || null;
  const p = combatPools(R, chanOf(S));
  const atk = (R && R.prog3 && R.prog3.atk && R.prog3.atk[cat]) || {};
  const sk = (R && R.prog3 && R.prog3.sk && R.prog3.sk[cat]) || {};
  let dps = '';
  try { dps = broWeaponStats(R, cat).rows.find((r) => r.key === 'dps').value; } catch (e) { dps = ''; }
  return [p[cat], p.shared, sk.level || 0, Math.floor(sk.xp || 0), Object.keys(atk).map((k) => k + atk[k]).join(','), dps,
    /* a Spend that stayed waits for the worker, or for its time (statWindow's STAY_WAIT_MS): a tick a second */
    waiting ? Math.floor(Date.now() / 1000) : 0].join('|');
}

/**
 * S    the game's state (handed by BroCard)
 * cat  'sword' | 'bow' | 'staff'
 * who  whose page (null: yours)
 * live () => the game's state now (optional; default the S handed, as CharacterPage reads it)
 */
export function WeaponPage({ S, cat, who, live }) {
  const stayRef = useRef(null);
  const stayCheckRef = useRef(null);
  useClock(() => pageKey(live ? live() : S, cat, !!stayRef.current), 300);
  const [ref, room] = useRoom();
  /* the window that stays after Spend is put up again with this render's numbers (statWindow) */
  useEffect(() => {
    const f = stayCheckRef.current;
    if (f) { try { f(); } catch (e) { stayRef.current = null; } }
  });
  const self = who == null;
  const R = (S && S.rpg) || {};
  const prog = weaponProgress(R, cat);
  const road = weaponRoadmap(cat)[0];
  const stats = broWeaponStats(R, cat);
  const val = (k) => { const r = stats.rows.find((x) => x.key === k); return r ? r.value : '—'; };
  const pools = combatPools(R, chanOf(S));
  const avail = self ? pools[cat] : null;
  const attrs = weaponAttributes(R, cat);
  const ww = WEAPON_WORD[cat] ? WEAPON_WORD[cat]() : '';
  const win = statWindow({
    R, buildCat: cat, stayRef, readOnly: !self, live: live || (() => S),
    laneAvail: (c) => Number(pools[c]) || 0, sharedAvail: pools.shared,
  });
  stayCheckRef.current = self ? win.stayCheck : null;
  const metaOf = Object.create(null);
  for (const m of prog3AtkMeta()) metaOf[m.key] = m;
  const openAttr = (key) => {
    const m = metaOf[key];
    if (!m) return;
    const st = { ...m, atk: true };
    const lane = spendPool(key, cat);   /* the pool the page named: this weapon's */
    if (!lane) return;
    win.openStatInfo(st, lane, self ? win.spendFor(st, lane) : null);
  };
  useEffect(() => {
    try { window.__btWeaponPage = { cat, dps: val('dps'), points: avail, lv: prog.level, xp: prog.max ? 'max' : prog.xpNow + '/' + prog.xpNeed }; } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btWeaponPage = null; } catch (e) { /* no window */ } }, []);

  const short = room.short;
  const wideSide = short && room.w >= 900;   /* the four beside the six; narrower, one door */
  /* v2.3.6783 (card UI3-combat): under the four bands' room (375 x 667) the Attributes line folds onto
     the level row's right end: the same words, the same gold, never smaller text, never a scroll */
  const fold = !short && weaponPageFold(room.h);
  const xpWords = prog.max ? say(SAY, 'combatHub.max') : say(SAY, 'combatHub.xp', { now: prog.xpNow, need: prog.xpNeed });
  const roadWords = say(SAY, 'combatHub.levelGives', { w: ww, n: road.n });
  const pw = avail == null ? null : pointsWords(avail);   /* the one rule's count, said with the weapon's name */
  const line = {
    k: say(SAY, 'combatHub.attributes'),
    words: pw ? say(SAY, pw.key === 'combatHub.point' ? 'combatHub.lanePoint' : 'combatHub.lanePoints', { n: pw.n, w: ww }) : null,
    tone: pointsTone(avail), data: { 'data-weapon-pool': avail == null ? '' : avail },
  };

  /* row 1: the level, its XP (the road line where the row holds it: not sideways, not folded) */
  const level = (
    <div className="u2-group u2-wp-level" data-weapon-level={prog.level} data-weapon-xp={prog.max ? 'max' : prog.xpNow + '/' + prog.xpNeed}>
      <span className="u2-wp-lv">{say(SAY, 'combatHub.lv', { n: prog.level })}</span>
      <span className="u2-bar u2-wp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((prog.max ? 1 : prog.frac) * 100)} aria-label={xpWords + '. ' + roadWords}>
        <span className="u2-bar-top"><span data-weapon-road="">{short || fold ? '' : roadWords}</span><b>{xpWords}</b></span>
        <span className="u2-track"><span className="u2-fill" style={{ width: ((prog.max ? 1 : prog.frac) * 100).toFixed(1) + '%' }} /></span>
      </span>
      {fold ? <AttrLine {...line} /> : null}
    </div>
  );
  /* row 2: the strip -- DPS the stat (it opens the tree), Damage, Attack speed, Crit chance, Range facts */
  const strip = (
    <SummaryStrip wide={!short && room.w >= 560}
      stat={{ v: val('dps'), k: say(SAY, 'combatHub.dps'), aria: say(SAY, 'combatHub.dpsTreeAria', { v: val('dps') }), data: { 'data-weapon-dps': val('dps') },
        onClick: () => dashboardPanelBus.go({ type: 'push', id: TREE_PAGES[0], sel: treeSel(cat, []), who: self ? undefined : who }) }}
      facts={short && !wideSide ? null : WEAPON_SUPPORT.map((k) => ({ id: k, k: SUPPORT_WORD[k](), v: val(k), data: { 'data-weapon-stat': k } }))}
      more={{ words: say(SAY, 'combatHub.allStats'), onClick: () => infoPopupBus.open({ title: ww, body: WEAPON_SUPPORT.map((k) => SUPPORT_WORD[k]() + ': ' + val(k)).join('\n') }) }}
      data={{ 'data-weapon-support': '' }} />
  );
  /* row 3: the full-width line, then the six, three by two (sideways one row of six) */
  const attrsOf = attrs.map((a) => ({
    key: a.key, label: a.label, art: a.art, pts: a.pts,
    value: a.cap == null ? say(SAY, 'combatHub.attrPts', { n: a.pts }) : a.pts + ' / ' + a.cap,
    aria: a.cap == null ? say(SAY, 'combatHub.attrAriaFree', { stat: a.label, pts: a.pts }) : say(SAY, 'combatHub.attrAria', { stat: a.label, pts: a.pts, cap: a.cap }),
  }));
  const grid = <AttrGrid line={fold ? null : line} attrs={attrsOf} mark="weapon" plus={attrPlus(avail, self)} onOpen={openAttr} grid={short ? 'is-one' : ''} />;

  return (
    <div ref={ref} className={ui2RootClass() + ' u2-wp' + (short ? ' is-short' : '') + (fold ? ' is-fold' : '')} data-weapon-page={cat} data-weapon-whose={self ? 'self' : 'other'} data-weapon-fold={fold ? '1' : '0'}>
      {short ? <div className="u2-wp-row is-one">{level}{strip}{grid}</div> : <>{level}{strip}{grid}</>}
    </div>
  );
}

export default WeaponPage;
