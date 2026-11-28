/* ═══ v2.3.6862: BRO · POWER IN THE NEW PANEL -- THE LANES, THE DRAFT, THE STATS (card MN step 5) ═══
 *
 * The owner's Power (docs/design/menus3/SPEC.md "You", the card's "Decided"
 * 5, the wireframe v4.4's Power): four lanes (Sword, Bow, Staff, Body), each
 * weapon's level and XP on its lane, the overall level and XP at the top;
 * the lane's upgrades as cards two across (its name, its points of its cap,
 * a + on the card that STAGES a point and a minus beside it that takes one
 * back); a footer with the lane's headline number (the collapsed stats line:
 * it opens the lane's real numbers), the reset arrow that clears the draft,
 * and ONE "Apply N points".
 *
 * THE DRAFT IS THE WORKER'S ARITHMETIC (src/game/menus3Power.js): every stage
 * is replayed in order, so a card says which kind of point it draws (the
 * weapon's, the shared, or a spare that buys anything) exactly as the worker
 * would spend it, and a stage it would refuse is never added.  Nothing is
 * sent before Apply.  Apply sends the game's EXISTING request, one
 * `prog3_allocate` a point through the action door, ONE AT A TIME: the next
 * goes when the last has landed (the stat's points rose); one the worker
 * refuses (or leaves unanswered past today's wait, statWindow.jsx
 * STAY_WAIT_MS) stops the queue and is said in plain words, and what landed
 * stays.  v2.3.6866: the queue is the rule module's (queueBegin ...
 * queueEnd: the node suite plays the very one); a point that lands AFTER the
 * wait counts as landed when the character says so, and its stage is held
 * meanwhile so a second Apply never sends it twice.  Leaving the page with a draft drops it, said in one quiet line over
 * the bro (no dialog).  No Undo after Apply: the worker's free Reset is the
 * way back, a quiet two-tap button at the top, as today's Points window had.
 *
 * NOTHING NEW IS INVENTED.  Every number is the game's own reader: the
 * levels (progression.js weaponProgress, combatHub.js combatLevel), the
 * upgrades and their caps (combatHub.js weaponAttributes, sharedAttributes),
 * the pools (data/prog3.js), the stats (sheet/broStats.js broWeaponStats, in
 * broPages.js's groups), the preview (sheet/statPreview.js), the DPS
 * breakdown (sheet/StatTree.jsx, today's, drawn in the panel), a number's
 * explainer and an upgrade's window with its replayed fight (today's,
 * read-only here: the draft is where points are placed).  No picture loads:
 * the lanes' icons are drawn. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { act } from '@/game/actions.js';
import {
  POWER_LANES, POWER_WEAPONS, powerPools, powerWaiting, powerStartLane, draftOf, draftReplay, draftStage,
  draftUnstage, draftClear, draftCount, draftPrune, draftSends, draftLeft, statSteps,
  queueFresh, queueBegin, queueSend, queueRead, queueEnd, queueCut, queueSendable, queueHeld,
} from '@/game/menus3Power.js';
import { weaponProgress } from '@/game/progression.js';
import { combatLevel, weaponAttributes, sharedAttributes } from '@/game/combatHub.js';
import { BRO_STAT_GROUPS } from '@/game/broPages.js';
import { showPointsReset, requestPointsReset, POINTS_RESET_CONFIRM_MS } from '@/game/pointsReset.js';
import {
  prog3PoolBy, prog3PoolAny, prog3Pool, prog3Shared, isProg3SharedEnabled, prog3AtkPts, prog3Pts, prog3StatCap,
  prog3SharedSpendCat, prog3ActiveCat, prog3AtkMeta, prog3BodyMeta,
} from '@/data/prog3.js';
import { isOneLevelEnabled } from '@/data/oneFormula.js';
import { calcDisplayDps, weaponForCat, toDisplayHp } from '@/data/gameSystems.js';
import { broWeaponStats, broStartWeapon } from '@/ui/mobile/sheet/broStats.js';
import { previewStatPoint, withPoints } from '@/ui/mobile/sheet/statPreview.js';
import { statWindow, STAY_WAIT_MS } from '@/ui/mobile/sheet/statWindow.jsx';
import { StatTree } from '@/ui/mobile/sheet/StatTree.jsx';
import { statInfo } from '@/ui/mobile/infoGlossary.js';
import { infoPopupBus } from '@/ui/mobile/infoPopupBus.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { menus3Bus } from './menus3Wire.js';
import { SAY } from '@/data/say/menus3.js';
import { SAY as SAY_H } from '@/data/say/combatHub.js';
import { say } from '@/game/say.js';
import { deskWords } from '@/game/deskWords.js';   /* "tap" reads "click" on a computer */

/* ── the words, each key written out (the say guard reads them) ── */
const LANE_WORD = {
  sword: () => say(SAY, 'menus3.laneSword'), bow: () => say(SAY, 'menus3.laneBow'),
  staff: () => say(SAY, 'menus3.laneStaff'), body: () => say(SAY, 'menus3.laneBody'),
};
const laneWord = (l) => (LANE_WORD[l] ? LANE_WORD[l]() : '');
const STAT_WORD = { move: () => say(SAY_H, 'combatHub.moveSpeed') };   /* the Shared page's own (TILE_WORD) */

/* ── the lanes' icons, drawn (CLAUDE.md: no text glyph, no picture to load) ── */
function LaneIcon({ lane }) {
  const p = { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="m3-lane-ic">
      {lane === 'sword' ? <><path d="M3 13 L12 4 L13.5 2.5 L13 4.5 L4 13.5" {...p} /><path d="M2.5 10.5 L5.5 13.5" {...p} /></> : null}
      {lane === 'bow' ? <><path d="M4 2.5 C11 4 11 12 4 13.5" {...p} /><path d="M4 2.5 L4 13.5" {...p} /><path d="M2 8 L12.5 8 M10.5 6 L12.5 8 L10.5 10" {...p} /></> : null}
      {lane === 'staff' ? <><path d="M4 14 L10.5 5.5" {...p} /><circle cx="11.8" cy="4" r="2.2" {...p} /></> : null}
      {lane === 'body' ? <path d="M8 13.5 C2 9.5 1.5 6 3.5 4 C5.2 2.5 7 3.3 8 5 C9 3.3 10.8 2.5 12.5 4 C14.5 6 14 9.5 8 13.5 Z" {...p} /> : null}
    </svg>
  );
}
function PlusIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3 L8 13 M3 8 L13 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>;
}
function MinusIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8 L13 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>;
}
function ClearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M4 9 A5 5 0 1 0 6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M3.5 2.5 L6 5 L3 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
function Chev() {
  return <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.5 L7 5 L3 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
}

/* ── the game's readings ── */
function chanOf(S) { return !!(S && S._serverCaps && S._serverCaps.prog3Chan); }
/** The pools as the worker holds them (see menus3Power.js): with the channels a
    weapon's own, the shared, and the spare; against a worker without them every
    lane point is a spare (it spends any of them), as today's hub counts. */
export function powerPoolsOf(R, S) {
  if (!R) return powerPools(null);
  if (!chanOf(S)) return powerPools({ shared: isProg3SharedEnabled() ? prog3Shared(R) : 0, spare: prog3Pool(R) });
  return powerPools({
    by: { sword: prog3PoolBy(R, 'sword'), bow: prog3PoolBy(R, 'bow'), staff: prog3PoolBy(R, 'staff') },
    shared: isProg3SharedEnabled() ? prog3Shared(R) : 0,
    spare: prog3PoolAny(R),
  });
}
/** Power's dot (the panel's tab): a lane has a point waiting. */
export function powerDot(R, S) {
  const w = powerWaiting(powerPoolsOf(R, S));
  return POWER_LANES.some((l) => w[l] > 0);
}
const statPts = (R, lane, stat) => (lane === 'body' ? prog3Pts(R, stat) : prog3AtkPts(R, lane, stat));
function ctxOf(R, S) {
  const atk = Object.create(null), body = Object.create(null);
  for (const m of prog3AtkMeta()) atk[m.key] = 1;
  for (const m of prog3BodyMeta()) body[m.key] = 1;
  return {
    pools: powerPoolsOf(R, S),
    pts: (lane, stat) => statPts(R || {}, lane, stat),
    cap: (lane, stat) => prog3StatCap(R || {}, stat),
    known: (lane, stat) => (lane === 'body' ? !!body[stat] : !!atk[stat]),
  };
}
function upgradesOf(R, lane) {
  const rows = lane === 'body' ? sharedAttributes(R) : weaponAttributes(R, lane);
  return rows.map((r) => ({ ...r, label: STAT_WORD[r.key] ? STAT_WORD[r.key]() : r.label }));
}

/* ═══ THE DRAFT AND ITS QUEUE: the page's one copy (module state: a redraw keeps it; leaving drops it) ═══ */
let _draft = draftOf([]);
let _note = null;            /* { kind: 'why' | 'applied' | 'refused' | 'offline', text } */
let _focus = null;           /* { lane, stat }: the card last touched (the preview line) */
/* v2.3.6866: the queue's state is the rule module's (one copy the suite plays);
   the page keeps only the clock, the reader and the redraw.  `bump` null: the
   page is gone, and a run's end says nothing (no note outlives its page). */
let Q = queueFresh();
const QH = { timer: 0, getS: null, bump: null };
function ptsNow() {
  const S = QH.getS ? QH.getS() : null;
  const R = (S && S.rpg) || {};
  return (lane, stat) => statPts(R, lane, stat);
}
function clearWait() { if (QH.timer) { clearTimeout(QH.timer); QH.timer = 0; } }
function queueSay(note) {
  if (!QH.bump) return;
  if (note) _note = note;
  QH.bump();
}
function statWord(lane, stat) {
  const S = QH.getS ? QH.getS() : null;
  return (upgradesOf((S && S.rpg) || {}, lane).find((u) => u.key === stat) || {}).label || stat;
}
function queueNext() {
  const S = QH.getS ? QH.getS() : null;
  const R = S && S.rpg;
  const ch = S && S.channel;
  if (Q.on && !Q.out && Q.i < Q.items.length && (!R || !ch || (typeof ch.isLive === 'function' && !ch.isLive()))) {
    try { if (ch && ch.reconnectNow) ch.reconnectNow(); } catch (e) { /* best effort */ }
    clearWait();
    Q = queueEnd(Q).q;
    queueSay({ kind: 'offline', text: say(SAY, 'menus3.offline', { n: Q.placed }) });
    return;
  }
  const r = queueSend(Q, ptsNow());
  Q = r.q;
  if (r.step === 'done') { clearWait(); queueSay({ kind: 'applied', text: say(SAY, 'menus3.applied', { n: Q.placed }) }); return; }
  if (r.step !== 'send') return;
  act('prog3_allocate', r.send);   /* the game's existing request, through the action door */
  clearWait();
  QH.timer = setTimeout(() => { QH.timer = 0; queueCheck(true); }, STAY_WAIT_MS);
  queueSay(null);
}
/** Called on every new reading of the character (and at the wait's end). */
function queueCheck(timedOut) {
  const r = queueRead(Q, _draft, ptsNow());
  Q = r.q;
  if (r.draft !== _draft) _draft = r.draft;
  /* a point the wait gave up on landed after all: its refused note says so */
  const late = r.landed.find((x) => x.late);
  if (late && _note && _note.kind === 'refused') queueSay({ kind: 'applied', text: say(SAY, 'menus3.lateLanded', { stat: statWord(late.lane, late.stat), n: Q.placed }) });
  if (r.step === 'done') { clearWait(); queueSay({ kind: 'applied', text: say(SAY, 'menus3.applied', { n: Q.placed }) }); return; }
  if (r.step === 'send') { clearWait(); queueNext(); return; }
  if (timedOut && Q.on && Q.out) {
    const e = queueEnd(Q);
    Q = e.q;
    queueSay({ kind: 'refused', text: say(SAY, 'menus3.refused', { stat: statWord(e.held.lane, e.held.stat), n: Q.placed }) });
    return;
  }
  if (r.landed.length) queueSay(null);
}
function queueStart(getS, items) {
  if (Q.on || !items.length) return;
  QH.getS = getS;
  Q = queueBegin(Q, items);
  _note = null;
  queueNext();
}

/* the quiet line over the bro (the points reset's own way of saying, pointsReset.js) */
function quietLine(S, text) {
  try { if (S && S.player) pushDmgPopup(S, S.player.x, S.player.y - 44, text, '#e9d27a'); } catch (e) { /* a line only */ }
}

/* a number's explainer (today's: BroCard.jsx / SharedPage.jsx explain) */
function explain(key, value) {
  try {
    const info = statInfo(key);
    if (info) infoPopupBus.open({ title: info.title, body: info.body, note: info.note, stat: String(value) });
  } catch (e) { /* no explainer: nothing opens */ }
}

/* ── the lane's real numbers (today's "All stats": broWeaponStats' thirteen, in broPages.js's groups) ── */
function laneStats(R, lane) {
  if (lane === 'body') {
    const rows = broWeaponStats(R, broStartWeapon(R)).rows;
    const keys = BRO_STAT_GROUPS.filter((g) => g.id !== 'offense').reduce((a, g) => a.concat(g.keys), []);
    let hp = '—';
    try { hp = String(toDisplayHp(Number(R.maxHp) || 100)); } catch (e) { hp = '—'; }
    return [{ key: 'maxhp', label: say(SAY, 'menus3.statsHp'), info: say(SAY, 'menus3.statsHp'), value: hp }]
      .concat(keys.map((k) => rows.find((r) => r.key === k)).filter(Boolean));
  }
  const rows = broWeaponStats(R, lane).rows;
  const off = (BRO_STAT_GROUPS.find((g) => g.id === 'offense') || { keys: [] }).keys;
  return off.map((k) => rows.find((r) => r.key === k)).filter(Boolean);
}
/* the footer's headline: the lane's DPS (a weapon) or Max HP (the body), now and after the draft */
function headline(R, lane, draft) {
  const staged = Object.create(null);
  for (const s of draft) if (s.lane === lane) staged[s.stat] = (staged[s.stat] || 0) + 1;
  const keys = Object.keys(staged);
  if (lane === 'body') {
    let now = '—';
    try { now = String(toDisplayHp(Number(R.maxHp) || 100)); } catch (e) { now = '—'; }
    let after = null;
    if (staged.hp) { const pv = previewStatPoint(R, 'hp', 'sword', staged.hp); if (pv && pv.pool) after = String(Math.round(pv.statAfter)); }
    return { word: say(SAY, 'menus3.statsHp'), now, after };
  }
  const wpn = weaponForCat(R, lane);
  if (!wpn) return { word: say(SAY, 'menus3.statsDps'), now: '—', after: null };
  const fmt = (v) => (typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : '—');
  let now = '—', after = null;
  try { now = fmt(calcDisplayDps(R, wpn)); } catch (e) { now = '—'; }
  if (keys.length) {
    try {
      let c = R;
      for (const k of keys) c = withPoints(c, k, lane, staged[k]) || c;   /* every staged upgrade of the lane, at once */
      after = fmt(calcDisplayDps(c, wpn));
    } catch (e) { after = null; }
  }
  return { word: say(SAY, 'menus3.statsDps'), now, after: after === now ? null : after };
}

/* ═══ THE PAGE ═══ */
export function Menus3Power({ R, getS, top, root }) {
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => (t + 1) % 1000000);
  QH.bump = bump;
  QH.getS = getS;
  const S = getS ? getS() : null;
  const RR = R || (S && S.rpg) || {};
  const ctx = ctxOf(RR, S);
  const page = top ? top.page : 'root';

  /* the lane: the root page's rail (kept for Back), else where the entry opens it (menus3Power.js) */
  const waitingNow = powerWaiting(ctx.pools);
  const held = prog3ActiveCat(RR);
  const lane = (root && root.rail && POWER_LANES.indexOf(root.rail) >= 0) ? root.rail : powerStartLane(held, waitingNow, false);
  useEffect(() => { if (page === 'root' && !(root && root.rail)) { menus3Bus.keep({ rail: lane }); menus3Bus.bump(); } });

  /* a new reading of the character: the queue looks for its point; the draft keeps what the worker would still take */
  useEffect(() => {
    if (Q.on || Q.late.length) queueCheck(false);   /* v2.3.6866: a late point is the character's to settle */
    if (Q.on) return;
    const d = draftPrune(_draft, ctx);
    if (d !== _draft) { _draft = d; bump(); }
  }, [R]);
  /* leaving the page with a draft: dropped, said in one quiet line (no dialog); a queue stops after its point in flight */
  const getSRef = useRef(getS);
  getSRef.current = getS;
  useEffect(() => () => {
    const S2 = getSRef.current ? getSRef.current() : null;
    const cut = Q.on && Q.items.length > Q.i + 1;
    Q = queueCut(Q);   /* the point in flight finishes; nothing more is sent */
    if ((_draft.length && !Q.on) || cut) quietLine(S2, say(SAY, 'menus3.dropped'));
    _draft = draftOf([]); _note = null; _focus = null;
    QH.bump = null;
  }, []);

  const replay = draftReplay(_draft, ctx);
  const left = draftLeft(_draft, ctx);
  const waitLeft = powerWaiting(left);
  /* v2.3.6866: a stage held for a point still unanswered is never sent twice */
  const sendable = queueSendable(_draft, Q);
  const heldN = queueHeld(_draft, Q);
  const total = draftReplay(sendable, ctx).filter((s) => s.from).length;

  /* the QA probe (tools/qa/mp/mp-menus3power.mjs) */
  useEffect(() => {
    try {
      /* read now, not the render's: a queue may have moved the draft in an effect above this one */
      const rNow = draftReplay(_draft, ctx);
      window.__btMenus3Power = {
        lane, page, draft: rNow.map((s) => ({ lane: s.lane, stat: s.stat, from: s.from })), total: draftReplay(queueSendable(_draft, Q), ctx).filter((s) => s.from).length,
        waiting: { ...waitingNow }, left: { by: { ...left.by }, shared: left.shared, spare: left.spare },
        queue: { on: Q.on, i: Q.i, n: Q.items.length, placed: Q.placed, late: Q.late.length }, held: queueHeld(_draft, Q), note: _note ? { ..._note } : null,
      };
    } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btMenus3Power = null; } catch (e) { /* no window */ } }, []);

  if (page === 'stats') return <PowerStats R={RR} lane={lane} />;
  if (page === 'tree') {
    const path = typeof top.arg === 'string' && top.arg ? top.arg.split('/') : [];
    return (
      <div className="m3-power-tree" data-m3-tree={lane}>
        <StatTree S={S || { rpg: RR }} live={getS} at={{ cat: lane, path, onOpen: (p) => menus3Bus.push('tree', p.join('/')) }} />
      </div>
    );
  }

  const busy = Q.on;
  const setLane = (l) => { if (l === lane) return; menus3Bus.keep({ rail: l }); _focus = null; menus3Bus.bump(); };
  const stage = (stat) => {
    if (busy) return;
    const r = draftStage(_draft, ctx, lane, stat);
    _focus = { lane, stat };
    if (r.no) {
      const word = (upgradesOf(RR, lane).find((u) => u.key === stat) || {}).label || stat;
      _note = r.no === 'cap' ? { kind: 'why', text: say(SAY, 'menus3.whyCap', { stat: word }) }
        : { kind: 'why', text: say(SAY, 'menus3.whyPoints', { stat: word, kind: lane === 'body' ? say(SAY, 'menus3.kindShared') : say(SAY, 'menus3.kindWeapon', { w: laneWord(lane) }) }) };
    } else { _draft = r.draft; _note = null; }
    bump();
  };
  const unstage = (stat) => { if (busy) return; _draft = draftUnstage(_draft, lane, stat); _focus = { lane, stat }; _note = null; bump(); };
  const clear = () => { if (busy) return; _draft = draftClear(); _note = null; bump(); };
  const apply = () => {
    if (busy || !total) return;
    const sends = draftSends(sendable, ctx, prog3SharedSpendCat(RR));
    const stagesOk = draftReplay(sendable, ctx).filter((s) => s.from);
    queueStart(getS, sends.map((x, i) => ({ ...x, lane: stagesOk[i].lane })));
  };

  /* the top: the overall level and XP (the character's level is the best weapon's while `onelevel` is on: its XP is that weapon's) */
  const lvl = combatLevel(RR);
  let best = null;
  if (isOneLevelEnabled()) for (const c of POWER_WEAPONS) { const p = weaponProgress(RR, c); if (!best || p.level > best.level) best = p; }
  const ups = upgradesOf(RR, lane);
  const fromOf = Object.create(null);
  for (const s of replay) if (s.lane === lane && s.from) (fromOf[s.stat] = fromOf[s.stat] || []).push(s.from);
  const focus = _focus && _focus.lane === lane ? ups.find((u) => u.key === _focus.stat) : null;
  const head = headline(RR, lane, _draft);
  const kindLine = pointsLine(lane, ctx.pools, left);

  return (
    <div className="m3-page m3-power" data-m3-power={lane}>
      <div className="m3-power-top">
        <div className="m3-power-lvl" data-m3-level={lvl}>
          <b>{say(SAY, 'menus3.level', { n: lvl })}</b>
          {best ? <XpBar p={best} /> : null}
        </div>
        <ResetButton S={S} />
      </div>
      <div className="m3-lanes" role="tablist">
        {POWER_LANES.map((l) => {
          const p = l === 'body' ? null : weaponProgress(RR, l);
          const w = waitLeft[l];
          return (
            <button key={l} type="button" role="tab" aria-selected={l === lane} className={'u2-raised u2-ctl m3-lane' + (l === lane ? ' is-selected' : '')}
              data-m3-lane={l} data-m3-lane-pts={waitingNow[l]} aria-label={say(SAY, 'menus3.laneAria', { w: laneWord(l), pts: waitingNow[l] })}
              onClick={() => setLane(l)}>
              <span className="m3-lane-name"><LaneIcon lane={l} />{laneWord(l)}{waitingNow[l] > 0 ? <i className="m3-dot" data-m3-lane-dot="" aria-hidden="true" /> : null}</span>
              <span className="m3-lane-sub">
                {p ? say(SAY, 'menus3.laneLv', { n: p.level }) : say(SAY, 'menus3.laneShared')}
                {waitingNow[l] > 0 ? ' · ' + say(SAY, 'menus3.laneLeft', { n: w }) : ''}
              </span>
              {p ? <span className="m3-lane-xp" aria-hidden="true"><i style={{ width: Math.round((p.max ? 1 : p.frac) * 100) + '%' }} /></span> : null}
            </button>
          );
        })}
      </div>
      <div className="m3-power-kinds" data-m3-points="">{kindLine.length ? kindLine.map((k) => (
        <span key={k.kind} className={'m3-kind is-' + k.kind + (k.after != null ? ' is-drawn' : '')} data-m3-kind={k.kind} data-m3-kind-n={k.after != null ? k.after : k.n}>{k.text}</span>
      )) : <span className="m3-kind is-none">{say(SAY, 'menus3.ptsNone')}</span>}</div>
      <div className="m3-cards">
        {ups.map((u) => {
          const staged = draftCount(_draft, lane, u.key);
          const steps = statSteps(u.pts, staged, u.cap, 10);
          const froms = fromOf[u.key] || [];
          const spare = froms.filter((f) => f === 'spare').length;
          return (
            <div key={u.key} className={'m3-card' + (staged ? ' is-staged' : '')} data-m3-stat={u.key} data-m3-staged={staged}>
              <button type="button" className="u2-raised u2-ctl m3-card-add" data-m3-stage={u.key} disabled={busy}
                aria-label={say(SAY, 'menus3.stageAria', { stat: u.label })} onClick={() => stage(u.key)}>
                <span className="m3-card-words">
                  <b className="m3-card-name">{u.label}</b>
                  <span className="m3-card-num" data-m3-num="">
                    {staged ? u.pts + ' → ' + (u.pts + staged) : String(u.pts)}
                    {u.cap != null ? ' / ' + u.cap : ''}
                    {spare ? <em className="m3-card-from" data-m3-from="spare"> {say(SAY, 'menus3.fromSpare')}</em> : null}
                  </span>
                  {steps.steps > 0 ? (
                    <span className="m3-steps" aria-hidden="true">
                      {Array.from({ length: steps.steps }, (_, i) => <i key={i} className={i < steps.filled ? 'is-on' : i < steps.filled + steps.staged ? 'is-staged' : ''} />)}
                    </span>
                  ) : u.cap == null ? <span className="m3-card-cap">{say(SAY, 'menus3.noCap')}</span> : null}
                </span>
                <span className="m3-card-plus"><PlusIcon /></span>
              </button>
              <button type="button" className="u2-raised u2-ctl m3-card-sub" data-m3-unstage={u.key} disabled={busy || !staged}
                aria-label={say(SAY, 'menus3.unstageAria', { stat: u.label })} onClick={() => unstage(u.key)}>
                <MinusIcon />
              </button>
            </div>
          );
        })}
      </div>
      {focus ? <FocusLine R={RR} lane={lane} u={focus} staged={draftCount(_draft, lane, focus.key)} getS={getS} pools={ctx.pools} /> : null}
      {_note ? <p className={'m3-line m3-note is-' + _note.kind} data-m3-note={_note.kind} role="status">{_note.text}</p>
        : heldN ? <p className="m3-line m3-note is-why" data-m3-held={heldN} role="status">{say(SAY, 'menus3.held', { n: heldN })}</p> : null}
      <div className="m3-foot m3-power-foot">
        <button type="button" className="u2-raised u2-ctl m3-statsline" data-m3-statsline={lane} onClick={() => menus3Bus.push('stats', lane)}>
          <span className="m3-statsline-word">{say(SAY, 'menus3.stats')} {'·'} {head.word}</span>
          <b className="m3-statsline-num" data-m3-head={head.now}>{head.now}{head.after != null ? ' → ' + head.after : ''}</b>
          <Chev />
        </button>
        <button type="button" className="u2-raised u2-ctl m3-clear" data-m3-clear="" disabled={busy || !_draft.length}
          aria-label={say(SAY, 'menus3.clearAria')} onClick={clear}>
          <ClearIcon />
        </button>
        <button type="button" className={'u2-raised u2-ctl m3-apply' + (total ? ' is-ready' : '')} data-m3-apply={total} disabled={busy || !total} onClick={apply}>
          {busy ? say(SAY, 'menus3.applying', { i: Math.min(Q.items.length, Q.i + 1), n: Q.items.length })
            : total === 1 ? say(SAY, 'menus3.applyOne') : total > 1 ? say(SAY, 'menus3.applyN', { n: total }) : deskWords(say(SAY, 'menus3.tapToAdd'))}
        </button>
      </div>
    </div>
  );
}

/* the kinds of point told apart: the lane's own kind and the spares, now, and after the draft */
function pointsLine(lane, pools, left) {
  const out = [];
  const push = (kind, n, m, text) => { if (n > 0) out.push({ kind, n, after: m !== n ? m : null, text }); };
  if (lane === 'body') {
    const n = pools.shared, m = left.shared;
    push('shared', n, m, m !== n ? say(SAY, 'menus3.ptsSharedAfter', { n, m }) : say(SAY, 'menus3.ptsShared', { n }));
  } else {
    const n = pools.by[lane], m = left.by[lane], w = laneWord(lane);
    push('weapon', n, m, m !== n ? say(SAY, 'menus3.ptsAfter', { w, n, m }) : say(SAY, 'menus3.ptsWeapon', { w, n }));
  }
  const n = pools.spare, m = left.spare;
  push('spare', n, m, m !== n ? say(SAY, 'menus3.ptsSpareAfter', { n, m }) : say(SAY, 'menus3.ptsSpare', { n }));
  return out;
}

function XpBar({ p }) {
  return (
    <span className="m3-xp" data-m3-xp={p.max ? 'max' : p.xpNow + '/' + p.xpNeed}>
      <span className="m3-xp-track" aria-hidden="true"><i style={{ width: Math.round((p.max ? 1 : p.frac) * 100) + '%' }} /></span>
      <span className="m3-xp-words">{p.max ? say(SAY, 'menus3.xpMax') : say(SAY, 'menus3.xp', { now: p.xpNow, need: p.xpNeed })}</span>
    </span>
  );
}

/* the card last touched: its number now and after the draft (statPreview.js, today's preview), and
   today's window for it, read-only (the glossary, the rows, the replayed fight) */
function FocusLine({ R, lane, u, staged, getS, pools }) {
  const cat = lane === 'body' ? prog3ActiveCat(R) : lane;
  const pv = staged ? previewStatPoint(R, u.key, cat, staged) : previewStatPoint(R, u.key, cat, 1);
  const st = (lane === 'body' ? prog3BodyMeta() : prog3AtkMeta()).find((m) => m.key === u.key);
  const n1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const fmt = (v) => (pv && pv.pool ? String(Math.round(v)) : st && st.pct ? n1(v * 100) + '%' : n1(v));
  const words = pv ? (staged ? say(SAY, 'menus3.focus', { stat: u.label, now: fmt(pv.statNow), after: fmt(pv.statAfter) }) : say(SAY, 'menus3.focusNow', { stat: u.label, now: fmt(pv.statNow) })) : u.label;
  const open = () => {
    if (!st) return;
    const w = pools || powerPools(null);
    const win = statWindow({
      R, buildCat: cat, stayRef: { current: null }, readOnly: true, live: getS || (() => null),
      laneAvail: (c) => (w.by[c] || 0) + w.spare, sharedAvail: w.shared + w.spare,
    });
    win.openStatInfo({ ...st, atk: lane !== 'body' }, cat, null);
  };
  return (
    <div className="m3-focus" data-m3-focus={u.key}>
      <span className="m3-focus-words">{words}</span>
      <button type="button" className="u2-raised u2-ctl m3-focus-about" data-m3-about={u.key} onClick={open}>{say(SAY, 'menus3.about')}</button>
    </div>
  );
}

/* the worker's free Reset, a quiet button (two taps: the first arms it and says what it does, the
   second within 4 s asks; today's Points window's, pointsReset.js) */
function ResetButton({ S }) {
  const [ask, setAsk] = useState(0);
  if (!showPointsReset(S)) return null;
  const armed = ask > 0 && Date.now() - ask < POINTS_RESET_CONFIRM_MS;
  const press = () => {
    if (Q.on) return;
    if (!armed) {
      const t0 = Date.now();
      setAsk(t0);
      setTimeout(() => setAsk((t) => (t === t0 ? 0 : t)), POINTS_RESET_CONFIRM_MS + 50);
      return;
    }
    setAsk(0);
    _draft = draftOf([]);   /* the draft was made against the points before the reset */
    requestPointsReset(S);
  };
  return (
    <button type="button" className={'u2-ctl m3-reset' + (armed ? ' is-armed' : '')} data-m3-reset={armed ? 'armed' : 'idle'} onClick={press}>
      {deskWords(say(SAY, armed ? 'menus3.resetArmed' : 'menus3.resetPoints'))}
    </button>
  );
}

/* the lane's real numbers: a number opens its breakdown (DPS: today's tree) or its explainer */
function PowerStats({ R, lane }) {
  const rows = laneStats(R, lane);
  const noWpn = lane !== 'body' && !weaponForCat(R, lane);
  return (
    <div className="m3-page m3-stats" data-m3-stats={lane}>
      {noWpn ? <p className="m3-line">{say(SAY, 'menus3.noWeapon', { w: laneWord(lane) })}</p> : null}
      {rows.map((r) => {
        const tree = r.key === 'dps' && !noWpn;
        return (
          <button key={r.key} type="button" className="u2-raised u2-ctl m3-row m3-statrow" data-m3-statrow={r.key} data-m3-opens={tree ? 'tree' : 'explain'}
            onClick={() => { if (tree) menus3Bus.push('tree', ''); else explain(r.info || r.label, r.value); }}>
            <span className="m3-row-name">{r.label}</span>
            <b className="m3-statrow-v">{r.value}</b>
            <Chev />
          </button>
        );
      })}
    </div>
  );
}
