/* ═══ v2.3.6873: THE COUNTER'S MAKE, ONE BODY FOR EVERY BENCH (card MN step 13b) ═══
 *
 * Step 13 (v2.3.6872) built the Blacksmith's Make whole in Menus3Make.jsx;
 * the Woodworker and the Cookhouse are the same Make, so its body moved here
 * as it was and each bench is now a description of its own (its tabs, its
 * rows, what it says above them): Menus3Make.jsx the Blacksmith,
 * Menus3Wood.jsx the Woodworker, Menus3Cook.jsx the Cookhouse.
 *
 * The wireframe's Make, its order of things: the tabs on a rail, the recipes
 * (a tap SELECTS one: the card's Decided 6, no quick-tap), and the foot: the
 * chosen recipe's whole order (each cost times the number), the ONE quantity
 * picker (Menus3Qty.jsx, capped at what the materials allow) and ONE commit.
 * No Undo.  A number over one is the bench's own request sent one after
 * another (the queue, src/game/menus3Counter.js): each waits for the
 * character to change, a silence is the bench's own refusal word and stops
 * the rest.  A request that takes a count is sent in pieces of what one
 * request may hold.
 *
 * A bench: { id, skill (the life skill), skillIcon, level(lvl) its words,
 * rootProps, tabProp (today's test hook on a tab), tabs(S, R), look(tab)
 * { label, icon }, rows(tab, S, R, lvl), body(tab, S, R) (a tab that is
 * today's as it is: the Blacksmith's Salvage), above(tab, S, R, rows),
 * celebrates(row) (a level-up this page tells: the rest celebrate from their
 * own receipts), ring(row) (plays the sound when one lands), fail (the stop's word
 * when a row has none) }.
 *
 * A row: { key, icon, fallback, title, sub, badge, costs [{icon, have, need}]
 * (one make), room (an extra cap), ok (the locks today's row checks), lock
 * (its words), chips (facts), none (nothing to do), multi (takes a number),
 * per (one request holds), verb, send(count), sig(), kind, workMs(n), done,
 * fail, landed() (what today's page did when one landed) }. */
import React from 'react';
import { LIFE_SKILL_XP } from '@/data/index.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { cue } from '@/game/eventSounds.js';
import { celebrateLifeSkillLevel } from '@/game/levelCelebration.js';
import { startSmithing } from '@/game/smithing.js';
import { C, Icon, Cost, Lock } from '../panels/buildings/BenchParts.jsx';
import { SAY } from '@/data/say/menus3Counter.js';
import { say } from '@/game/say.js';
import { frameTap } from '@/ui/mobile/dash/DashHeader.jsx';
import { qtyMax, qtyClamp, qtyTimes } from '@/game/menus3Qty.js';
import { makePlan, makeIdle, makeBegin, makeSend, makeRead, makeRefused, makeCut, MAKE_WAIT_MS } from '@/game/menus3Counter.js';
import { Menus3Qty } from './Menus3Qty.jsx';
import { Ui2Action } from '../kit/Action.jsx';

/* how many a row can make now (0: greyed) */
function rowMax(r) {
  if (!r || r.none || !r.ok) return 0;
  const m = qtyMax(r.costs, r.room == null ? null : r.room);
  return r.multi ? m : Math.min(1, m);
}

/* ── the queue, one for the bench (the page's; the rule's verbs, menus3Counter.js) ── */
function useMakeQueue(S, lvl, bench) {
  const [q, setQ] = React.useState(makeIdle);
  const job = React.useRef(null);
  const timer = React.useRef(0);
  const qRef = React.useRef(q);
  /* the queue's one copy is the ref, written with the state (a check between two renders reads the latest) */
  const put = (x) => { qRef.current = x; setQ(x); };
  const lvlSeen = React.useRef(lvl);
  const popup = (text, color) => { try { const P = S.player; if (P) pushDmgPopup(S, P.x, P.y - 34, text, color || C.brass); } catch (e) { /* popup only */ } };
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = 0; } };
  const sendNext = (cur) => {
    const j = job.current;
    if (!j || !S.channel) { put(makeRefused(cur)); return; }
    const r = makeSend(cur, j.row.sig());
    if (r.count == null) { put(r.q); return; }
    try { j.row.send(r.count); } catch (e) { put(makeRefused(r.q)); return; }
    put(r.q);
    startSmithing(S, j.row.workMs(r.count), j.row.kind);
    clear();
    timer.current = setTimeout(() => {
      timer.current = 0;
      const now = qRef.current;
      if (!now.on || !now.waiting) return;
      const jj = job.current;
      if (jj && jj.row.fail) { popup(jj.row.fail, C.bad); cue('forgeFail'); }
      put(makeRefused(now));
    }, MAKE_WAIT_MS);
  };
  /* has the send in flight landed?  Asked at every new reading of the character, and while a
     send waits every 300 ms too: the panel's copy of the character can trail the game's on a slow
     phone, and the queue reads the game's own (S.rpg), only while a make is in flight */
  const check = () => {
    const cur = qRef.current;
    const j = job.current;
    if (!(cur.on && cur.waiting && j)) return;
    const r = makeRead(cur, j.row.sig());
    if (r.then === 'wait') return;
    clear();
    if (j.row.done) popup(j.row.done);
    bench.ring(j.row);   /* the bench plays its own sound (each cue named where it is played: sound-cues) */
    if (typeof j.row.landed === 'function') { try { j.row.landed(); } catch (e) { /* today's page's extra */ } }
    if (r.then === 'landed') sendNext(r.q); else put(r.q);
  };
  React.useEffect(() => {
    check();
    const j = job.current;
    if (lvl > lvlSeen.current && j && bench.celebrates(j.row)) {
      try { celebrateLifeSkillLevel(S, bench.skill, lvl, lvlSeen.current); } catch (e) { /* visual */ }
    }
    lvlSeen.current = lvl;
  });
  React.useEffect(() => {
    if (!q.waiting) return undefined;
    const t = setInterval(check, 300);
    return () => clearInterval(t);
  }, [q]);
  /* leaving the bench: nothing more is sent (the send in flight is the worker's) */
  React.useEffect(() => () => { clear(); qRef.current = makeCut(qRef.current); }, []);
  const start = (row, n) => {
    if (qRef.current.on || !S.channel) return;
    job.current = { row, n };
    sendNext(makeBegin(makePlan(n, row.per)));
  };
  return { q, start, job };
}

/* the tab each bench was last on, for the load, as today's benches remember their own */
const _tabKept = Object.create(null);
export function Menus3Bench({ R, getS, bench }) {
  const S = getS() || {};
  const Rr = R || {};
  const sk = (Rr.lifeSkills && Rr.lifeSkills[bench.skill]) || { level: 1, xp: 0 };
  const lvl = sk.level || 1;
  const tabs = bench.tabs(S, Rr);
  const [want, setWant] = React.useState(() => (Object.prototype.hasOwnProperty.call(_tabKept, bench.id) ? _tabKept[bench.id] : null));
  const tab = tabs.indexOf(want) >= 0 ? want : tabs[0];
  const [pick, setPick] = React.useState(null);
  const [n, setN] = React.useState(1);
  const { q, start, job } = useMakeQueue(S, lvl, bench);
  const special = bench.body ? bench.body(tab, S, Rr) : null;
  const rows = special ? [] : bench.rows(tab, S, Rr, lvl);
  const sel = rows.find((r) => r.key === pick) || null;
  const busy = q.on;
  const need = LIFE_SKILL_XP(lvl);
  const pct = Math.max(0, Math.min(1, (sk.xp || 0) / need));
  const go = (t) => { _tabKept[bench.id] = t; setWant(t); setPick(null); setN(1); };
  const max = rowMax(sel);
  const num = sel && sel.multi ? qtyClamp(n, max) : 1;
  const commit = () => { if (sel && max > 0 && !busy) { start(sel, num); setN(1); } };

  /* the queue's line: a run of more than one, said in plain words */
  let line = null;
  const j = job.current;
  const total = j ? j.n : 0;
  if (j && total > 1) {
    if (q.on) line = say(SAY, 'menus3Counter.working', { made: q.made, n: total });
    else if (q.stop === 'done') line = say(SAY, 'menus3Counter.made', { made: q.made, n: total });
    else if (q.stop === 'refused') line = say(SAY, 'menus3Counter.stopped', { fail: j.row.fail || bench.fail, made: q.made, n: total });
  }

  return (
    <div className="m3-page m3-make" data-menus3-make={bench.id} {...(bench.rootProps || {})}>
      <div className="m3-make-level">
        <Icon src={bench.skillIcon} size={22} />
        <span {...bench.levelProps(lvl)}>{bench.level(lvl)}</span>
        <i className="m3-make-bar"><i style={{ width: `${pct * 100}%` }} /></i>
      </div>
      {tabs.length > 1 || bench.railAlways ? (
        <div className="m3-rail" role="tablist" aria-label={say(SAY, 'menus3Counter.tabsAria')}>
          {tabs.map((t) => {
            const look = bench.look(t);
            return (
              <button key={t} type="button" role="tab" aria-selected={t === tab} className={'u2-raised u2-ctl m3-pill m3-make-tab' + (t === tab ? ' is-selected' : '')}
                {...{ [bench.tabProp]: t }} data-menus3-tab={t} data-on={t === tab ? '1' : '0'} {...frameTap(() => go(t))}>
                <Icon src={look.icon} size={20} /><span>{look.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {line ? <div className="m3-line" data-menus3-make-line={q.on ? 'working' : q.stop} aria-live="polite">{line}</div> : null}
      {special || (
        <>
          {bench.above ? bench.above(tab, S, Rr, rows) : null}
          {rows.map((r) => {
            const m = rowMax(r);
            return (
              <button key={r.key} type="button" className={'u2-raised u2-ctl m3-make-row' + (r.key === pick ? ' is-selected' : '') + (m > 0 ? '' : ' is-dim')}
                aria-pressed={r.key === pick} data-menus3-recipe={tab + ':' + r.key} data-menus3-can={m}
                {...frameTap(() => { setPick(r.key); setN(1); })}>
                <span className="m3-make-art">
                  <Icon src={r.icon} size={36} fallback={r.fallback} />
                  {r.badge ? <i className="m3-make-badge">{r.badge}</i> : null}
                </span>
                <span className="m3-make-words">
                  <span className="m3-make-name">{r.title}</span>
                  {r.sub ? <span className="m3-make-sub">{r.sub}</span> : null}
                  <span className="m3-make-chips">
                    {r.lock ? <Lock>{r.lock}</Lock> : null}
                    {r.costs.map((c, i) => <Cost key={i} icon={c.icon} have={c.have} need={c.need} />)}
                    {r.chips}
                  </span>
                </span>
              </button>
            );
          })}
          <div className="m3-foot m3-make-foot" data-menus3-make-foot={sel ? sel.key : ''}>
            {sel ? (
              <>
                <div className="m3-make-order">
                  {qtyTimes(sel.costs, num).map((c, i) => <Cost key={i} icon={c.icon} have={c.have} need={c.need} />)}
                  {!sel.multi && !sel.none ? <span className="m3-why">{say(SAY, 'menus3Counter.one')}</span> : null}
                </div>
                <div className="m3-make-go">
                  {sel.multi ? <Menus3Qty n={num} max={max} off={busy} onChange={setN} /> : null}
                  <Ui2Action intent="commit" style={{ flex: '1 1 auto', minHeight: 44 }} disabled={max <= 0} pending={busy}
                    label={sel.multi ? say(SAY, 'menus3Counter.go', { verb: sel.verb, n: num }) : sel.verb}
                    data-menus3-make-go={tab + ':' + sel.key} onClick={commit} />
                </div>
              </>
            ) : <div className="m3-why">{say(SAY, 'menus3Counter.pick')}</div>}
          </div>
        </>
      )}
    </div>
  );
}
