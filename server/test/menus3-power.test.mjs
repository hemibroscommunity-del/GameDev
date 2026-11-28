/* ═══ v2.3.6862: BRO · POWER'S RULES (card MN step 5; src/game/menus3Power.js) ═══
 *
 * The owner's Power draft, its rules played on the module itself.  This
 * suite imports nothing from server/src: it tests the page's own rules and
 * does not deploy.  The worker's spend it mirrors (server/src/prog3.js
 * _handleProg3Allocate) is READ, never imported: §3 plays the same cases a
 * worker would see and says what it would do.
 *
 *   1. THE LANES: four, in the owner's order; a forged lane is none; the
 *      weapon in hand's lane; what waits in each (a spare counts in all);
 *      where Power opens (the bar always the hand; else the hand unless it
 *      has nothing and another lane has);
 *   2. A STAGE: added only when the worker would take it (points, cap, a
 *      stat of that lane); a minus takes back the LAST of that stat only;
 *      the reset arrow clears; the counts;
 *   3. THE WORKER'S ORDER: a weapon point first, then a spare; a shared
 *      point first, then a spare; a weapon point never buys the body nor
 *      another weapon; a shared point never a weapon; the spare shared
 *      between lanes in the staged order; the pools left;
 *   4. THE PRUNE: a draft the game moved under keeps only what would still
 *      land, in order; an unchanged one is the same draft;
 *   5. APPLY: the game's existing payloads, one a point, in the draft's order
 *      (a weapon its cat; the body the named cat); a refused stage is never
 *      sent; the queue's steps (landed, refused, done);
 *   6. THE STEPS on a card: filled of the cap, staged after them; no cap, no
 *      false cap;
 *   7. THE ROAD: the face and the weapon bar open the built Power in the
 *      panel; the bar names the hand's lane. */
import {
  POWER_LANES, powerLane, laneOfHeld, powerPools, powerWaiting, powerStartLane, draftOf, draftReplay, draftStage,
  draftUnstage, draftClear, draftCount, draftPrune, draftDraws, draftSends, draftLeft, sendLanded, queueStep, statSteps, POWER_DRAFT_MAX,
} from '../../src/game/menus3Power.js';
import { MENUS3_BUILT, menus3Route } from '../../src/game/menus3Router.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; return; }
  failures++;
  console.log('FAIL ' + name + (detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''));
}

const ATK = ['range', 'dmg', 'aspd', 'luck', 'special', 'elem'];
const BODY = ['hp', 'def', 'mana', 'stam', 'dodge', 'move', 'eres'];
/* a character: points held per lane|stat, a cap per stat, the pools */
function C(pools, held, caps) {
  const h = held || {}, cp = caps || {};
  return {
    pools: powerPools(pools),
    pts: (l, s) => h[l + '|' + s] || 0,
    cap: (l, s) => (Object.prototype.hasOwnProperty.call(cp, s) ? cp[s] : Infinity),
    known: (l, s) => (l === 'body' ? BODY.includes(s) : ATK.includes(s)),
  };
}
const stageAll = (ctx, list) => { let d = draftClear(); const why = []; for (const [l, s] of list) { const r = draftStage(d, ctx, l, s); d = r.draft; why.push(r.no); } return { d, why }; };
const froms = (d, ctx) => draftReplay(d, ctx).map((s) => s.from);

/* ── 1. the lanes ── */
{
  check('1a four lanes, the owner\'s order', POWER_LANES.join() === 'sword,bow,staff,body');
  check('1b a lane is one of the four', powerLane('bow') === 'bow' && powerLane('Bow') === null && powerLane('__proto__') === null && powerLane(3) === null);
  check('1c the hand\'s lane', laneOfHeld('melee') === 'sword' && laneOfHeld('ranged') === 'bow' && laneOfHeld('staff') === 'staff' && laneOfHeld('bow') === 'bow' && laneOfHeld(undefined) === 'sword' && laneOfHeld('toString') === 'sword');
  const w = powerWaiting({ by: { sword: 2, bow: 0, staff: 1 }, shared: 3, spare: 1 });
  check('1d what waits: own + spare, the body shared + spare', w.sword === 3 && w.bow === 1 && w.staff === 2 && w.body === 4, w);
  const p = powerPools({ by: { sword: -3, bow: 'x', staff: 2.9 }, shared: NaN, spare: 1.5 });
  check('1e the pools read whole and never below 0', p.by.sword === 0 && p.by.bow === 0 && p.by.staff === 2 && p.shared === 0 && p.spare === 1, p);
  check('1f the bar opens the hand\'s lane, points or not', powerStartLane('ranged', { sword: 5, bow: 0 }, true) === 'bow');
  check('1g another entry: the hand while it has points', powerStartLane('ranged', { sword: 5, bow: 1 }, false) === 'bow');
  check('1h ...else the first lane with points', powerStartLane('ranged', { sword: 0, bow: 0, staff: 2, body: 4 }, false) === 'staff');
  check('1i ...the body when only it has', powerStartLane('melee', { body: 1 }, false) === 'body');
  check('1j ...and the hand when none has', powerStartLane('staff', {}, false) === 'staff' && powerStartLane('staff', null, false) === 'staff');
}

/* ── 2. a stage ── */
{
  const ctx = C({ by: { sword: 2 }, shared: 1 }, { 'sword|range': 3 }, { range: 5 });
  let r = draftStage(draftClear(), ctx, 'sword', 'range');
  check('2a a stage the worker takes is added', r.no === null && r.draft.length === 1 && r.draft[0].lane === 'sword' && r.draft[0].stat === 'range');
  r = draftStage(r.draft, ctx, 'sword', 'range');
  check('2b ...again up to its cap', r.no === null && draftCount(r.draft, 'sword', 'range') === 2);
  const r3 = draftStage(r.draft, ctx, 'sword', 'dmg');
  check('2c out of the weapon\'s points: refused with "points", the draft as it was', r3.no === 'points' && r3.draft.length === 2, r3);
  const ctx2 = C({ by: { sword: 9 } }, { 'sword|range': 3 }, { range: 5 });
  const a = stageAll(ctx2, [['sword', 'range'], ['sword', 'range'], ['sword', 'range']]);
  check('2d a stat at its cap is refused with "cap"', a.why.join() === ',,cap' && a.d.length === 2, a.why);
  check('2e a stat of another lane is refused ("stat")', draftStage(draftClear(), ctx, 'body', 'range').no === 'stat' && draftStage(draftClear(), ctx, 'sword', 'hp').no === 'stat');
  check('2f a forged lane or stat is refused', draftStage(draftClear(), ctx, 'axe', 'range').no === 'lane' && draftStage(draftClear(), ctx, 'sword', '').no === 'lane' && draftStage(draftClear(), ctx, 'sword', null).no === 'lane');
  const b = stageAll(C({ by: { sword: 5 }, shared: 5 }), [['sword', 'range'], ['body', 'hp'], ['sword', 'dmg'], ['sword', 'range'], ['body', 'hp']]).d;
  const u = draftUnstage(b, 'sword', 'range');
  check('2g the minus takes back the LAST of that stat', u.length === 4 && u.map((s) => s.stat).join() === 'range,hp,dmg,hp', u);
  check('2h ...only that lane\'s', draftUnstage(b, 'bow', 'range').length === 5);
  check('2i ...none staged: no change', draftUnstage(draftClear(), 'sword', 'range').length === 0);
  check('2j the reset arrow clears', draftClear().length === 0 && Object.isFrozen(draftClear()));
  check('2k the counts: all, a lane, a stat', draftCount(b) === 5 && draftCount(b, 'sword') === 3 && draftCount(b, 'body', 'hp') === 2 && draftCount(b, null, 'dmg') === 1);
  check('2l a draft is frozen', Object.isFrozen(b) && Object.isFrozen(b[0]));
  const forged = draftOf([{ lane: 'sword', stat: 'range' }, { lane: 'nope', stat: 'x' }, null, { lane: 'body' }, 'x']);
  check('2m a forged draft keeps only well-formed stages', forged.length === 1, forged);
  check('2n a draft has a bound', draftOf(Array.from({ length: POWER_DRAFT_MAX + 50 }, () => ({ lane: 'sword', stat: 'range' }))).length === POWER_DRAFT_MAX);
  check('2o nothing staged with no points', draftStage(draftClear(), C({}), 'sword', 'range').no === 'points' && draftStage(draftClear(), C({}), 'body', 'hp').no === 'points');
}

/* ── 3. the worker's order (server/src/prog3.js _handleProg3Allocate) ── */
{
  /* a weapon point first, then a spare */
  const c1 = C({ by: { sword: 1 }, spare: 1 });
  const d1 = stageAll(c1, [['sword', 'range'], ['sword', 'dmg']]).d;
  check('3a a weapon upgrade draws its weapon\'s point first, then a spare', froms(d1, c1).join() === 'weapon,spare', froms(d1, c1));
  /* a shared point first, then a spare */
  const c2 = C({ shared: 1, spare: 1 });
  const d2 = stageAll(c2, [['body', 'hp'], ['body', 'def']]).d;
  check('3b a body upgrade draws a shared point first, then a spare', froms(d2, c2).join() === 'shared,spare', froms(d2, c2));
  /* a weapon point never buys the body, nor another weapon */
  const c3 = C({ by: { sword: 3 } });
  check('3c a weapon\'s point never buys the body', draftStage(draftClear(), c3, 'body', 'hp').no === 'points');
  check('3d ...nor another weapon', draftStage(draftClear(), c3, 'bow', 'range').no === 'points');
  /* a shared point never buys a weapon */
  check('3e a shared point never buys a weapon', draftStage(draftClear(), C({ shared: 4 }), 'sword', 'range').no === 'points');
  /* the spare is shared between lanes, in the staged order */
  const c4 = C({ by: { sword: 0 }, shared: 0, spare: 1 });
  const a4 = stageAll(c4, [['sword', 'range'], ['body', 'hp']]);
  check('3f one spare: the first stage takes it, the second is refused', a4.why.join() === ',points' && froms(a4.d, c4).join() === 'spare', a4.why);
  const b4 = stageAll(c4, [['body', 'hp'], ['sword', 'range']]);
  check('3g ...the other order, the other way', b4.why.join() === ',points' && b4.d[0].lane === 'body', b4.why);
  /* the order matters: own points are kept for their own lane */
  const c5 = C({ by: { sword: 1 }, shared: 1, spare: 1 });
  const d5 = stageAll(c5, [['sword', 'range'], ['sword', 'range'], ['body', 'hp']]).d;
  check('3h own first, spare next, the body\'s shared untouched', froms(d5, c5).join() === 'weapon,spare,shared', froms(d5, c5));
  const L = draftLeft(d5, c5);
  check('3i the pools left after the draft', L.by.sword === 0 && L.shared === 0 && L.spare === 0, L);
  const dr = draftDraws(d5, c5);
  check('3j what each kind gives', dr.weapon.sword === 1 && dr.shared === 1 && dr.spare === 1 && dr.weapon.bow === 0, dr);
  /* a minus that frees an own point moves a later stage off the spare */
  const c6 = C({ by: { sword: 1 }, spare: 1 });
  const d6 = stageAll(c6, [['sword', 'range'], ['sword', 'dmg']]).d;
  const u6 = draftUnstage(d6, 'sword', 'range');
  check('3k unstaging replays: the later stage now draws the weapon\'s own', froms(u6, c6).join() === 'weapon', froms(u6, c6));
  /* the cap counts held + staged */
  const c7 = C({ by: { sword: 5 } }, { 'sword|luck': 4 }, { luck: 5 });
  const a7 = stageAll(c7, [['sword', 'luck'], ['sword', 'luck']]);
  check('3l the cap counts what is held and what is staged', a7.why.join() === ',cap', a7.why);
  check('3m a cap of 0 refuses', draftStage(draftClear(), C({ by: { sword: 5 } }, {}, { range: 0 }), 'sword', 'range').no === 'cap');
}

/* ── 4. the prune ── */
{
  const ctxA = C({ by: { sword: 2 }, shared: 1 });
  const d = stageAll(ctxA, [['sword', 'range'], ['body', 'hp'], ['sword', 'dmg']]).d;
  check('4a an unchanged game: the same draft', draftPrune(d, ctxA) === d);
  const ctxB = C({ by: { sword: 1 }, shared: 1 });
  const p = draftPrune(d, ctxB);
  check('4b fewer points: what would still land stays, in order', p.length === 2 && p[0].stat === 'range' && p[1].stat === 'hp', p);
  check('4c no points: empty', draftPrune(d, C({})).length === 0);
}

/* ── 5. apply ── */
{
  const ctx = C({ by: { sword: 1, bow: 1 }, shared: 1 });
  const d = stageAll(ctx, [['bow', 'luck'], ['body', 'hp'], ['sword', 'range']]).d;
  const s = draftSends(d, ctx, 'staff');
  check('5a one payload a point, in the draft\'s order', s.length === 3 && s[0].stat === 'luck' && s[0].cat === 'bow' && s[1].stat === 'hp' && s[1].cat === 'staff' && s[2].stat === 'range' && s[2].cat === 'sword', s);
  check('5b a payload is the existing request\'s two fields only', Object.keys(s[0]).sort().join() === 'cat,stat');
  check('5c a body stage names a weapon cat even when asked for junk', draftSends(d, ctx, 'body')[1].cat === 'sword');
  /* a stage the worker would refuse is never sent (a forged draft past the points) */
  const forged = draftOf([{ lane: 'sword', stat: 'range' }, { lane: 'sword', stat: 'range' }]);
  check('5d a refused stage is never sent', draftSends(forged, C({ by: { sword: 1 } }), 'sword').length === 1);
  check('5e an empty draft sends nothing', draftSends(draftClear(), ctx, 'sword').length === 0);
  check('5f landed when the stat\'s points rose', sendLanded(3, 4) && !sendLanded(3, 3) && !sendLanded(4, 3) && !sendLanded(undefined, undefined));
  check('5g the queue: next when landed', queueStep({ waiting: true, landed: true, left: 2 }) === 'send');
  check('5h ...done after the last', queueStep({ waiting: true, landed: true, left: 0 }) === 'done' && queueStep({ left: 0 }) === 'done');
  check('5i ...a refusal (no answer in the wait) stops it', queueStep({ waiting: true, landed: false, timedOut: true, left: 3 }) === 'stop');
  check('5j ...still waiting', queueStep({ waiting: true, landed: false, left: 3 }) === 'wait');
  check('5k ...nothing out: send while some are left', queueStep({ left: 1 }) === 'send');
}

/* ── 6. the steps on a card ── */
{
  const a = statSteps(3, 2, 8, 10);
  check('6a filled of the cap, staged after them', a.filled === 3 && a.staged === 2 && a.steps === 8 && a.cap === 8, a);
  const b = statSteps(0, 0, null, 10);
  check('6b no cap: no steps drawn, no false cap', b.cap === null && b.steps === 10 && b.filled === 0, b);
  const c = statSteps(50, 10, 100, 10);
  check('6c a long cap drawn in ten steps', c.steps === 10 && c.filled === 5 && c.staged === 1, c);
  const d = statSteps(8, 0, 8, 10);
  check('6d full', d.filled === 8 && d.staged === 0, d);
}

/* ── 7. the road ── */
{
  check('7a Power is built', MENUS3_BUILT.includes('power'));
  const f = menus3Route('hud.face', { built: MENUS3_BUILT, held: 'ranged' });
  check('7b the face opens the new Power in the panel', f.road === 'panel' && f.section === 'power' && f.menu === 'bro' && f.lane === undefined, f);
  const b = menus3Route('hud.weaponBar', { built: MENUS3_BUILT, held: 'ranged' });
  check('7c the weapon bar opens it on the hand\'s lane', b.road === 'panel' && b.lane === 'bow', b);
  check('7d ...a sword, a staff, unknown', menus3Route('hud.weaponBar', { built: MENUS3_BUILT, held: 'sword' }).lane === 'sword'
    && menus3Route('hud.weaponBar', { built: MENUS3_BUILT, held: 'staff' }).lane === 'staff'
    && menus3Route('hud.weaponBar', { built: MENUS3_BUILT, held: '__proto__' }).lane === 'sword');
  check('7e not built (?menus3 step 1\'s road): today\'s weapon page', menus3Route('hud.weaponBar', { held: 'ranged' }).road === 'weapon');
}

console.log(`menus3-power: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
