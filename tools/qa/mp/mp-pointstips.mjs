/* ═══ YOUR FIRST POINTS, SHOWN, ON A PHONE (v2.3.3551, docs/specs/levelup-tips.md) ═══
 *
 * The owner, 2026-10-21: "Leave tips for first natural level up.  I don't
 * want players choosing xp to train in for weapons they haven't used yet.  Go
 * with your guided level up."  Real players against a real worker, on a phone
 * (390 x 844, touch, real fingers), IN THE WORLD (`world: 'wheel'`: the old
 * map is retired):
 *
 *   A, in the Mayor's tutorial (every other coach lesson already done, so the
 *      walk reaches this one), the dashboard folded:
 *   1. a fresh character: no points, no tip;
 *   2. a first level-up (Melee 2, the test lever dealing its points): the
 *      coach rings the Character button -- it stays on the folded band, so
 *      OPEN is never needed in an upright phone -- and says how many points
 *      wait; a blow dealt puts it away until a quiet moment;
 *   3. Character (tapped on the folded band) -> its Points tab, the tab ->
 *      the grid's top row, each card saying where the points are;
 *   4. a stat's [+] and Spend, all real fingers: "✓ 1 point spent" and, under
 *      it, the free reset named; a second Spend says no more about it;
 *   5. done for good: no card while points still wait, `done.points`;
 *   B, past the Mayor's tutorial, a fresh browser (nothing seeded):
 *   6. the first level-up brings this card ALONE (the coach is closed to
 *      every other lesson), and a tap on it puts it away for good;
 *   C, a character with a point already placed:
 *   7. never a card, and the lesson marked done.
 *   8. No page errors.
 * Pictures: tools/qa/mp/out/pointstips-{fold,tab,grid,spent,after}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
/* every lesson but `points` already done in this browser, so the tutorial's
   own lessons (they come first in the walk) step aside for it */
const SEED_DONE = "try { if (!localStorage.getItem('bt_coach_v1')) localStorage.setItem('bt_coach_v1', JSON.stringify("
  + JSON.stringify({ openDash: true, move: true, equip: true, dashAfterTurnIn: true, equipAll: true, cycle: true,
    blockRanged: true, attack: true, special: true, chatTap: true, passkey: true })
  + ")); } catch (e) {}";
/* ...and A's dashboard folded (the fold is remembered per browser): the
   Character button stays on the folded band, so the way in still starts
   there; B's dashboard is open */
const SEED_FOLDED = "try { if (localStorage.getItem('bt_dash_min') === null) localStorage.setItem('bt_dash_min', '1'); } catch (e) {}";

const coach = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-coach]');
  if (!el) return null;
  const ring = el.querySelector('[data-coach-ring]');
  const rr = ring && ring.getBoundingClientRect();
  return {
    id: el.getAttribute('data-coach'),
    text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
    ring: rr ? { left: rr.left, top: rr.top, width: rr.width, height: rr.height } : null,
  };
});
const probe = (P) => P.page.evaluate(() => (window.__btCoach ? window.__btCoach() : null));
const rectOf = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}, sel);
/* does the ring sit on the control (its middle inside the ring)? */
const ringOn = (c, r) => !!(c && c.ring && r)
  && (r.left + r.width / 2) >= c.ring.left && (r.left + r.width / 2) <= c.ring.left + c.ring.width
  && (r.top + r.height / 2) >= c.ring.top && (r.top + r.height / 2) <= c.ring.top + c.ring.height;

async function waitCoach(P, want, ms = 12000) {
  const t0 = Date.now();
  let c = null;
  for (;;) {
    c = await coach(P);
    if (typeof want === 'function' ? want(c) : (want === null ? !c : (c && c.id === want))) return c;
    if (Date.now() - t0 > ms) return c;
    await P.page.waitForTimeout(200);
  }
}
/* a REAL finger on the middle of a selector */
async function finger(P, sel) {
  const box = await P.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, sel);
  if (!box) return false;
  await P.page.touchscreen.tap(box.x, box.y);
  await P.page.waitForTimeout(400);
  return true;
}
const pts = (P) => H.readState(P, (S) => {
  const p3 = S.rpg && S.rpg.prog3;
  if (!p3) return null;
  const n = (o) => Object.values(o || {}).reduce((t, v) => t + (Number(v) || 0), 0);
  return { pool: p3.pool, shared: p3.shared,
    placed: n(p3.alloc) + n(p3.atk && p3.atk.sword) + n(p3.atk && p3.atk.bow) + n(p3.atk && p3.atk.staff) };
});
async function levelUp(P, wsPort, id) {
  const dealt = await H.devOp(wsPort, 'combat', id, { skill: 'sword', level: 2, deal: true });
  let p = null;
  for (let i = 0; i < 30; i++) { p = await pts(P); if (p && (p.pool || 0) + (p.shared || 0) > 0) break; await P.page.waitForTimeout(300); }
  return { dealt, p };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });

  /* ═══ A: in the Mayor's tutorial ═══ */
  const A = await H.newPlayer(browser, { name: 'Leveler', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: SEED_DONE + SEED_FOLDED });
  const shot = (name) => A.page.screenshot({ path: join(OUT, `pointstips-${name}.png`) }).catch(() => {});
  await H.enterWorld(A);
  await A.page.waitForTimeout(1500);
  await H.pastWelcome(A);
  const aId = await H.readState(A, (S) => S.myId);

  /* ── 1. a fresh character: no points, no tip ── */
  const p0 = await pts(A);
  await A.page.waitForTimeout(3500);
  const c0 = await coach(A);
  const g0 = await probe(A);
  rec.ok('1: a fresh character has no points waiting and is shown no points tip',
    !!p0 && (p0.pool || 0) + (p0.shared || 0) === 0 && (!c0 || c0.id !== 'points') && !!g0 && g0.points && g0.points.wanted === false,
    { p0, c0, points: g0 && g0.points, gate: g0 && g0.gate });

  /* ── 2. the first level-up ── */
  const { dealt, p: p1 } = await levelUp(A, wsPort, aId);
  const total = p1 ? (p1.pool || 0) + (p1.shared || 0) : 0;
  const many = total + ' point' + (total === 1 ? '' : 's');
  rec.ok(`2: Melee 2 deals its points (${p1 && p1.pool} weapon, ${p1 && p1.shared} shared)`,
    !!dealt && dealt.ok === true && !!p1 && p1.pool > 0 && p1.shared > 0 && p1.placed === 0, { dealt, p1 });
  const folded = !!(await rectOf(A, '[data-dash-fold="min"]'));
  const zone = await H.readState(A, (S) => S.currentZone);
  rec.ok(`2: in the world (zone "${zone}"), the dashboard folded (seeded)`, zone === 'wheel' && folded === true, { zone, folded });
  const c1 = await waitCoach(A, (c) => !!c && c.id === 'points');
  await shot('fold');
  const nav1 = await rectOf(A, '[data-nav="hero"]');
  rec.ok(`2: the coach rings Character, on the folded band, and says "${c1 && c1.text}"`,
    !!c1 && c1.id === 'points' && /^×?\s*Level up!/i.test(c1.text) && c1.text.includes('You have ' + many + ' to spend. Tap Character.')
      && ringOn(c1, nav1), { c1, nav1, folded });
  /* a blow dealt: it steps aside for the fight, and comes back after */
  await A.page.evaluate(() => { const S = window._gameState.current; S._dealtAt = Date.now(); });
  const cFight = await waitCoach(A, (c) => !c || c.id !== 'points', 4000);
  const cBack = await waitCoach(A, (c) => !!c && c.id === 'points', 15000);
  rec.ok('2: a blow dealt puts it away, and a quiet moment brings it back',
    (!cFight || cFight.id !== 'points') && !!cBack && cBack.id === 'points', { cFight, cBack });

  /* ── 3. Character, tapped on the folded band, then the Points tab ── */
  await finger(A, '[data-nav="hero"]');
  let onTab = false;
  const c3 = await waitCoach(A, (c) => !!c && c.id === 'points' && (/on the Points tab/.test(c.text) || /Top row:/.test(c.text)));
  if (c3 && /on the Points tab/.test(c3.text)) {
    onTab = true;
    await shot('tab');
    const tab = await rectOf(A, '[data-section="Build"]');
    rec.ok(`3: Character open on another tab, it rings Points: "${c3.text}"`,
      c3.text.includes('Your ' + many + ' are on the Points tab.') && ringOn(c3, tab), { c3, tab });
    await finger(A, '[data-section="Build"]');
  }
  const c4 = await waitCoach(A, (c) => !!c && c.id === 'points' && /Top row:/.test(c.text));
  await shot('grid');
  const head = await rectOf(A, '[data-prog3-band="lane"] [data-prog3-lane]');
  const wantGrid = `Top row: ${p1.pool} weapon point${p1.pool === 1 ? '' : 's'} for your weapon's stats. Bottom row: ${p1.shared} shared point${p1.shared === 1 ? '' : 's'} for any stat there. Tap a stat to see what it does.`;
  rec.ok(`3: on the grid${onTab ? '' : ' (Character opened on it)'} it rings the top row and says what the rows are`,
    !!c4 && c4.text.includes(wantGrid) && ringOn(c4, head), { c4, head, wantGrid });

  /* ── 4. a stat's [+] and Spend, real fingers ── */
  const plus = '[data-prog3-band="shared"] [data-stat-info]';
  const opened = await finger(A, plus);
  let win = null;
  for (let i = 0; i < 20 && !win; i++) { win = await rectOf(A, '[data-infopopup-action]'); if (!win) await A.page.waitForTimeout(200); }
  /* the coach looks again on its own beat, and a control under a window's
     scrim is not reachable: its card goes */
  const cHidden = await waitCoach(A, (c) => !c || c.id !== 'points', 3000);
  rec.ok('4: a stat\'s [+] opens its window, and the coach steps aside for it',
    opened && !!win && (!cHidden || cHidden.id !== 'points'), { opened, win, cHidden });
  /* v2.3.3577: the window's count opens at 0 -- [+] adds the point, Spend
     spends it */
  await finger(A, '[data-infopopup-step="up"]');
  await finger(A, '[data-infopopup-action]');
  let s1 = null;
  for (let i = 0; i < 40; i++) {
    s1 = await A.page.evaluate(() => {
      const sp = document.querySelector('[data-infopopup-spent]');
      const h = document.querySelector('[data-infopopup-spent-hint]');
      return { spent: sp ? sp.textContent.trim() : null, hint: h ? h.textContent.trim() : null };
    });
    if (s1.spent && s1.hint) break;
    await A.page.waitForTimeout(150);
  }
  const placed1 = await pts(A);
  await shot('spent');
  rec.ok(`4: Spend: "${s1 && s1.spent}", and under it "${s1 && s1.hint}"`,
    !!placed1 && placed1.placed === 1 && !!s1 && /1 point spent/.test(s1.spent || '')
      && s1.hint === 'Not sure? Reset points (free), under the grid, gives them all back.', { placed1, s1 });
  /* a second Spend, from the same window: placed now holds more than it spent */
  await finger(A, '[data-infopopup-step="up"]');   /* v2.3.3577: from 0 again */
  await finger(A, '[data-infopopup-action]');
  let placed2 = null, s2 = null;
  for (let i = 0; i < 40; i++) {
    placed2 = await pts(A);
    s2 = await A.page.evaluate(() => {
      const sp = document.querySelector('[data-infopopup-spent]');
      return { spent: sp ? sp.textContent.trim() : null, hint: !!document.querySelector('[data-infopopup-spent-hint]') };
    });
    if (placed2 && placed2.placed === 2 && s2.spent) break;
    await A.page.waitForTimeout(150);
  }
  rec.ok('4: a second Spend says no more about the reset (the first spend only)',
    !!placed2 && placed2.placed === 2 && !!s2 && !!s2.spent && s2.hint === false, { placed2, s2 });

  /* ── 5. done for good ── */
  await finger(A, '[data-infopopup-x]');
  await A.page.waitForTimeout(4000);
  const c5 = await coach(A);
  const g5 = await probe(A);
  const left = await pts(A);
  await shot('after');
  rec.ok(`5: done for good: no card though ${left && (left.pool + left.shared)} points still wait, and the lesson marked done`,
    (!c5 || c5.id !== 'points') && !!g5 && g5.done && g5.done.points === true && !!left && left.pool + left.shared > 0,
    { c5, done: g5 && g5.done, left });
  const aErrs = A.logs.filter((l) => /pageerror/.test(l));
  await A.ctx.close().catch(() => {});

  /* ═══ B: past the Mayor's tutorial, nothing seeded ═══ */
  const B = await H.newPlayer(browser, { name: 'Veteran', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  await H.enterWorld(B);
  await B.page.waitForTimeout(1500);
  await H.pastWelcome(B);
  const bId = await H.readState(B, (S) => S.myId);
  const fin = await H.devOp(wsPort, 'quests', bId);
  let gB = null;
  for (let i = 0; i < 30; i++) { gB = await probe(B); if (gB && gB.gate === 'closed') break; await B.page.waitForTimeout(300); }
  await B.page.waitForTimeout(3000);
  const cB0 = await coach(B);
  rec.ok('6: past the Mayor\'s tutorial the coach is closed: no card at all before the level-up',
    !!fin && fin.ok === true && !!gB && gB.gate === 'closed' && !cB0, { fin, gate: gB && gB.gate, cB0 });
  const lvB = await levelUp(B, wsPort, bId);
  const cB1 = await waitCoach(B, (c) => !!c);
  rec.ok(`6: the first level-up brings the points card alone: "${cB1 && cB1.text}"`,
    !!lvB.p && lvB.p.pool > 0 && !!cB1 && cB1.id === 'points' && /You have \d+ points? to spend\. Tap Character\./.test(cB1.text), { cB1, p: lvB.p });
  /* a tap on the card puts it away for good */
  await finger(B, '[data-coach-card]');
  await B.page.waitForTimeout(4000);
  const cB2 = await coach(B);
  const gB2 = await probe(B);
  const pB = await pts(B);
  rec.ok('6: a tap on the card puts it away for good, the points still waiting and none placed',
    !cB2 && !!gB2 && gB2.done && gB2.done.points === true && !!pB && pB.placed === 0 && pB.pool + pB.shared > 0, { cB2, done: gB2 && gB2.done, pB });
  const bErrs = B.logs.filter((l) => /pageerror/.test(l));
  await B.ctx.close().catch(() => {});

  /* ═══ C: a point already placed ═══ */
  const C = await H.newPlayer(browser, { name: 'Spender', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: SEED_DONE });
  await H.enterWorld(C);
  await C.page.waitForTimeout(1200);
  const cId = await H.readState(C, (S) => S.myId);
  await levelUp(C, wsPort, cId);
  await C.page.evaluate(() => { window._gameState.current.channel.send({ type: 'prog3_allocate', payload: { stat: 'hp' } }); });
  let pC = null;
  for (let i = 0; i < 30; i++) { pC = await pts(C); if (pC && pC.placed === 1) break; await C.page.waitForTimeout(300); }
  await H.pastWelcome(C);
  let seenC = null;
  for (let i = 0; i < 20; i++) { const c = await coach(C); if (c && c.id === 'points') { seenC = c; break; } await C.page.waitForTimeout(300); }
  const gC = await probe(C);
  rec.ok('7: a character with a point placed is never shown the tip, and it is marked done',
    !!pC && pC.placed === 1 && pC.pool + pC.shared > 0 && !seenC && !!gC && gC.points && gC.points.done === true && gC.points.wanted === false,
    { pC, seenC, points: gC && gC.points });
  const cErrs = C.logs.filter((l) => /pageerror/.test(l));
  await C.ctx.close().catch(() => {});

  const errs = [...aErrs, ...bErrs, ...cErrs];
  rec.ok(`8: no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
}
