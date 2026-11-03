/* ═══ mp-swaphint (v2.3.4130): THE SWAP LESSON, THE GUIDE ARROW AT THE PILL ═══
 *
 * The owner, 2026-11-03: "Weapon swap instruction from tutorial should only
 * become relevant after receiving new weapons from turning in first quest.
 * Instructions will need to change to accommodate the new pill design. I like
 * the big arrows to teach where things are on screen."  (ui/guideArrow.js's
 * `swap` lesson; it replaced v2.3.3877's SwapHint callout, which this
 * scenario tested until now.)  A fresh character in the world:
 *   phone upright: holding a second weapon BEFORE Mayor Bro's first quest is
 *     handed in, no swap lesson; handed in (a real turn-in), the big arrow
 *     points at the weapon pill with "Tap a weapon to switch"; a tap on a grey
 *     well ends it; after a reload it never comes again;
 *   computer (wide): the same moment says "Click a weapon or press 1 2 3",
 *     and a key press ends it.
 * The weapon and points lessons are marked done for these characters first,
 * so the swap lesson is the one on show.  Pictures:
 * tools/qa/mp/out/swaphint-{phone,desk}.png.
 */
import * as H from './harness.mjs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const OUT = join(H.REPO, 'tools/qa/mp/out');

const look = (P) => P.page.evaluate(() => {
  const q = window.__btGuideArrow || {};
  const a = document.querySelector('[data-guide-arrow]');
  const ar = a ? a.getBoundingClientRect() : null;
  const pill = document.querySelector('[data-weapon-pill]');
  const pr = pill ? pill.getBoundingClientRect() : null;
  const S = window._gameState.current;
  return {
    lesson: q.lesson || null, sel: q.sel || null, side: q.side || null, n: q.n || 0, done: Object.assign({}, q.done || {}),
    words: a ? a.textContent : null,
    arrow: ar ? { l: Math.round(ar.left), t: Math.round(ar.top), r: Math.round(ar.right), b: Math.round(ar.bottom) } : null,
    pill: pr ? { l: Math.round(pr.left), t: Math.round(pr.top), r: Math.round(pr.right), b: Math.round(pr.bottom) } : null,
    slot: S.rpg && (S.rpg.activeSlot || 'melee'), tut1: S.rpg && S.rpg._quests && S.rpg._quests.tut_1,
  };
});

async function inWorld(P) {
  await H.enterWorld(P);
  return H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading, a: !!S.__introLiftedAt }), (v) => v.z === 'wheel' && !v.l && v.a, { timeout: 150000, label: 'in the world' }).catch(() => null);
}

/* the first quest taken, the other two lessons marked done (so the swap
   lesson is the one on show), the page reloaded so the arrow reads the marks */
async function prepare(P) {
  const id = await H.readState(P, (S) => S.myId);
  await P.page.evaluate(() => { const S = window._gameState.current; if (S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
  await H.waitFor(P, (S) => (S.rpg && S.rpg._quests && S.rpg._quests.tut_1) || null, (v) => v === 'active', { timeout: 10000, label: 'tut_1 taken' }).catch(() => null);
  await P.page.evaluate((who) => { try { localStorage.setItem('bt_guideArrow:' + who, JSON.stringify({ weapon: 1, points: 1 })); } catch (e) { /* none */ } }, id);
  await P.page.reload();
  await inWorld(P);
  return id;
}

/* the real hand-in: the quest's items granted, then quest_turn_in (xpCat is
   required: every character is on the prog3 track) */
async function handIn(P, wsPort, id) {
  await H.grant(wsPort, id, 'item', { invKey: 'slime-remnants', count: 4 });   /* tut_1's objective (data.js) */
  await P.page.waitForTimeout(900);
  await P.page.evaluate(() => { const S = window._gameState.current; if (S.channel) S.channel.send({ type: 'quest_turn_in', payload: { questId: 'tut_1', xpCat: 'sword' } }); });
  return H.waitFor(P, (S) => (S.rpg && S.rpg._quests && S.rpg._quests.tut_1) || null, (v) => v === 'turnedIn', { timeout: 15000, label: 'tut_1 handed in' }).catch(() => null);
}

async function waitLesson(P, want, ms) {
  let v = await look(P);
  for (const t0 = Date.now(); (want ? v.lesson !== 'swap' : v.lesson === 'swap') && Date.now() - t0 < ms;) { await P.page.waitForTimeout(250); v = await look(P); }
  return v;
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  /* ── the phone ── */
  const A = await H.newPlayer(browser, { name: 'PhoneSwap', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2, query: 'tapms=4000' });
  try {
    rec.ok('phone: in the world (guard)', !!(await inWorld(A)));
    const id = await prepare(A);
    const armed = await H.armWorker(A, wsPort, id, ['bow']);
    rec.ok(`phone: a bow in hand before the hand-in (guard: ${armed.join()})`, armed.includes('bow'), armed);
    await A.page.waitForTimeout(4000);
    const before = await look(A);
    rec.ok(`phone: two weapons, the first quest not handed in (${before.tut1}): no swap lesson (lesson ${before.lesson}, done ${JSON.stringify(before.done)})`,
      before.tut1 === 'active' && before.lesson !== 'swap' && !before.done.swap, before);
    const t = await handIn(A, wsPort, id);
    rec.ok('phone: the first quest handed in for real (guard)', t === 'turnedIn', t);
    const on = await waitLesson(A, true, 10000);
    await A.page.screenshot({ path: join(OUT, 'swaphint-phone.png') }).catch(() => {});
    const overPill = !!on.arrow && !!on.pill && on.arrow.b <= on.pill.t && on.arrow.l < on.pill.r && on.arrow.r > on.pill.l;
    rec.ok(`phone: right after the hand-in the big arrow points at the weapon pill (${on.sel}, ${on.side}) saying "${on.words}"`,
      on.lesson === 'swap' && on.sel === '[data-weapon-pill]' && overPill && /Tap a weapon to switch/.test(on.words || ''), on);
    /* a tap on the other weapon's grey well */
    const other = on.slot === 'ranged' ? 'melee' : 'ranged';
    const box = await A.page.evaluate((s) => { const b = document.querySelector('[data-wpill-slot="' + s + '"]'); const r = b && b.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, other);
    if (box) await A.page.touchscreen.tap(box.x, box.y);
    const off = await waitLesson(A, false, 6000);
    rec.ok(`phone: a tap on the ${other} well switches (${off.slot}) and the lesson ends (lesson ${off.lesson}, done ${JSON.stringify(off.done)})`,
      off.slot === other && off.lesson !== 'swap' && off.done.swap === 1, off);
    await A.page.reload();
    await inWorld(A);
    await A.page.waitForTimeout(5000);
    const again = await look(A);
    rec.ok(`phone: after a reload it never comes again (lesson ${again.lesson}, done ${JSON.stringify(again.done)})`, again.lesson !== 'swap' && again.done.swap === 1, again);
  } finally { await A.ctx.close().catch(() => {}); }

  /* ── the computer ── */
  const B = await H.newPlayer(browser, { name: 'DeskSwap', wsPort, webPort, world: 'wheel', viewport: { width: 1440, height: 900 }, wide: true });
  try {
    rec.ok('desk: in the world (guard)', !!(await inWorld(B)));
    const id = await prepare(B);
    await H.armWorker(B, wsPort, id, ['bow']);
    await B.page.waitForTimeout(2000);
    const before = await look(B);
    rec.ok(`desk: no swap lesson before the hand-in (lesson ${before.lesson})`, before.lesson !== 'swap', before);
    const t = await handIn(B, wsPort, id);
    rec.ok('desk: the first quest handed in for real (guard)', t === 'turnedIn', t);
    const on = await waitLesson(B, true, 10000);
    await B.page.screenshot({ path: join(OUT, 'swaphint-desk.png') }).catch(() => {});
    rec.ok(`desk: the big arrow at the weapon pill says "${on.words}"`, on.lesson === 'swap' && on.sel === '[data-weapon-pill]' && /Click a weapon or press 1 2 3/.test(on.words || ''), on);
    await B.page.keyboard.press(on.slot === 'ranged' ? '1' : '2');
    const off = await waitLesson(B, false, 6000);
    rec.ok(`desk: a key switches (${off.slot}) and the lesson ends for good (done ${JSON.stringify(off.done)})`, off.lesson !== 'swap' && off.done.swap === 1, off);
  } finally { await B.ctx.close().catch(() => {}); }
}
