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
 * THE ROOM (the master notes' part 3): 172 px of content at 390 x 844: the
 * headline 44 px, the seven two rows of 44 (four and three), the words over
 * them.  Sideways (63; 58): one row, the headline and the seven beside it. */
import React, { useEffect, useRef } from 'react';
import { infoPopupBus } from '../infoPopupBus.js';
import { statInfo } from '../infoGlossary.js';
import { useClock, useRoom } from './CharacterPage.jsx';
import { broStartWeapon, broWeaponStats } from './broStats.js';
import { statWindow } from './statWindow.jsx';
import { combatPools, pointsWords, spendPool, sharedAttributes } from '@/game/combatHub.js';
import { prog3BodyMeta } from '../../../data/prog3.js';
import { toDisplayHp } from '../../../data/gameSystems.js';
import { Ui2Stat, ui2RootClass } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/combatHub.js';
import { say } from '@/game/say.js';
import './combatPage.css';

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
    laneAvail: (c) => Number(pools[c]) || 0, sharedAvail: pools.shared,
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
  useEffect(() => {
    try { window.__btSharedPage = { hp: head.hp, def: head.def, points: avail, attrs: attrs.map((a) => a.key) }; } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btSharedPage = null; } catch (e) { /* no window */ } }, []);

  const short = room.short;
  const hp = (
    <Ui2Stat v={head.hp} k={say(SAY, 'combatHub.maxHp')} className="u2-raised u2-stat u2-sp-hp" data-shared-hp={head.hp}
      aria-label={say(SAY, 'combatHub.maxHpAria', { v: head.hp })} onClick={() => explain(metaOf.hp ? metaOf.hp.label : '', head.hp)} />
  );
  const def = (
    <div className="u2-group u2-sp-def" data-shared-def={head.def}>
      <span className="u2-group-v">{head.def}</span>
      <span className="u2-group-k">{say(SAY, 'combatHub.defense')}</span>
    </div>
  );
  const pw = avail == null ? null : pointsWords(avail);
  const words = (
    <span className="u2-wp-attrhead" data-shared-pool={avail == null ? '' : avail}>
      <span className="u2-wp-attrk">{say(SAY, 'combatHub.attributes')}</span>
      {pw ? <b className={avail > 0 ? 'is-on' : ''}>{say(SAY, pw.key === 'combatHub.point' ? 'combatHub.sharedPoint' : 'combatHub.sharedPoints', { n: pw.n })}</b> : null}
    </span>
  );
  const tiles = attrs.map((a) => {
    const label = TILE_WORD[a.key] ? TILE_WORD[a.key]() : a.label;
    return (
      <button key={a.key} type="button" className="u2-raised u2-wp-attr" data-shared-attr={a.key} data-shared-attr-pts={a.pts}
        aria-label={a.cap == null ? say(SAY, 'combatHub.attrAriaFree', { stat: label, pts: a.pts }) : say(SAY, 'combatHub.attrAria', { stat: label, pts: a.pts, cap: a.cap })} onClick={() => openAttr(a.key)}>
        <img className="u2-wp-attr-art" src={a.art} alt="" draggable={false} />
        <span className="u2-wp-attr-words"><span className="u2-wp-attr-k">{label}</span><span className="u2-wp-attr-v">{a.cap == null ? say(SAY, 'combatHub.attrPts', { n: a.pts }) : a.pts + ' / ' + a.cap}</span></span>
      </button>
    );
  });

  return (
    <div ref={ref} className={ui2RootClass() + ' u2-wp u2-sp' + (short ? ' is-short' : '')} data-shared-page="" data-shared-whose={self ? 'self' : 'other'}>
      {short ? (
        <div className="u2-wp-row is-one">
          {hp}{def}
          <span className="u2-wp-side">{words}<span className="u2-wp-tiles is-one is-seven">{tiles}</span></span>
        </div>
      ) : (
        <>
          <div className="u2-wp-row is-sum">{hp}{def}</div>
          <div className="u2-wp-row is-attrs is-stack">{words}<span className={'u2-wp-tiles is-seven' + (room.w > 0 && room.w < 520 ? ' is-noart' : '')}>{tiles}</span></div>
        </>
      )}
    </div>
  );
}

export default SharedPage;
