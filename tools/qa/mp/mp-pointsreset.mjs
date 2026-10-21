/* ═══ THE FREE POINTS RESET, ON A PHONE (v2.3.3541, docs/specs/points-reset.md) ═══
 *
 * The owner: "I value SIMPLICITY and INTELLIGIBILITY" -- the after-review
 * list's second item: one button gives every placed point back.  One real
 * player against a real worker, on a phone (390 x 844, touch):
 *   1. Melee 5 (the test lever deals its points), three points placed by the
 *      page's own spend message;
 *   2. the Points tab shows "Reset points (free)" at the foot of its grid;
 *   3. one tap arms it ("Tap again: every point comes back"), and left alone
 *      it goes back after four seconds, nothing sent;
 *   4. two taps: every point back -- nothing placed, the lane and the shared
 *      pool what the level gives -- "Points reset!" over your bro, and the
 *      button gone (nothing left to give back);
 *   5. a point placed again and reset again within the minute: refused in
 *      words ("You just reset your points"), the point still placed;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/pointsreset-{idle,armed,done}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Resetter', wsPort, webPort, viewport: PHONE, touch: true });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `pointsreset-${name}.png`) }).catch(() => {});
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  const id = await H.readState(P, (S) => S.myId);
  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.pointsreset));
  rec.ok('the worker resets points (caps.pointsreset)', caps === true, caps);

  /* ── 1. points to place ── */
  const dealt = await H.devOp(wsPort, 'combat', id, { skill: 'sword', level: 5, deal: true });
  const pts = () => H.readState(P, (S) => {
    const p3 = S.rpg && S.rpg.prog3;
    if (!p3) return null;
    const n = (o) => Object.values(o || {}).reduce((t, v) => t + (Number(v) || 0), 0);
    return { placed: n(p3.alloc) + n(p3.atk && p3.atk.sword) + n(p3.atk && p3.atk.bow) + n(p3.atk && p3.atk.staff),
      sword: p3.poolBy && p3.poolBy.sword, shared: p3.shared, hp: p3.alloc && p3.alloc.hp, luck: p3.atk && p3.atk.sword && p3.atk.sword.luck };
  });
  let before = null;
  for (let i = 0; i < 20; i++) { before = await pts(); if (before && before.sword === 12) break; await P.page.waitForTimeout(300); }
  const place = async (stat, cat) => P.page.evaluate(({ stat, cat }) => {
    const S = window._gameState.current;
    S.channel.send({ type: 'prog3_allocate', payload: cat ? { stat, cat } : { stat } });
  }, { stat, cat });
  await place('hp');
  await place('hp');
  await place('luck', 'sword');
  let placed = null;
  for (let i = 0; i < 20; i++) { placed = await pts(); if (placed && placed.placed === 3) break; await P.page.waitForTimeout(300); }
  rec.ok(`Melee 5 dealt its points (12 Melee, 12 shared), and three placed by the page's own spend message (${placed && placed.placed})`,
    !!dealt && dealt.ok === true && !!before && before.sword === 12 && before.shared === 12 && !!placed && placed.placed === 3 && placed.sword === 11 && placed.shared === 10,
    { dealt, before, placed });

  /* ── 2. the button ── */
  await P.page.locator('[aria-label="Character"]').first().click({ timeout: 6000 }).catch(() => {});
  await P.page.waitForTimeout(900);
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]').first().click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(900);
  const btn = () => P.page.evaluate(() => {
    const b = document.querySelector('[data-points-reset]');
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    return { state: b.getAttribute('data-points-reset'), text: b.textContent, h: Math.round(r.height), w: Math.round(r.width), inView: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  let b0 = null;
  for (let i = 0; i < 15; i++) { b0 = await btn(); if (b0) break; await P.page.waitForTimeout(300); }
  await P.page.waitForTimeout(300);
  await shot('idle');
  rec.ok(`the Points tab shows "${b0 && b0.text}" at the foot of its grid, a thumb's height (${b0 && b0.h} px)`,
    !!b0 && b0.state === 'idle' && /Reset points/.test(b0.text) && b0.h >= 44 && b0.inView, b0);

  /* ── 3. one tap arms it, and it goes back ── */
  const tap = () => P.page.locator('[data-points-reset]').first().click({ timeout: 4000 }).catch((e) => String(e));
  await tap();
  await P.page.waitForTimeout(250);
  const b1 = await btn();
  await shot('armed');
  await P.page.waitForTimeout(4400);
  const b2 = await btn();
  const still = await pts();
  rec.ok(`one tap arms it ("${b1 && b1.text}"), and left alone it goes back after four seconds, nothing sent`,
    !!b1 && b1.state === 'armed' && /every point comes back/.test(b1.text) && !!b2 && b2.state === 'idle' && !!still && still.placed === 3, { b1, b2, still });

  /* ── 4. two taps ── */
  await tap();
  await P.page.waitForTimeout(250);
  await tap();
  let after = null, words = [];
  for (let i = 0; i < 60; i++) {
    after = await pts();
    const w = await P.page.evaluate(() => (window._gameState.current.dmgNumbers || []).map((d) => String(d.text || '')).filter(Boolean));
    for (const x of w) if (!words.includes(x)) words.push(x);
    if (after && after.placed === 0 && words.some((x) => /Points reset!/.test(x))) break;
    await P.page.waitForTimeout(100);
  }
  await P.page.waitForTimeout(400);
  await shot('done');
  const b3 = await btn();
  rec.ok(`two taps: every point back (12 Melee, 12 shared, nothing placed), "${words.find((w) => /reset/i.test(w)) || '?'}" over your bro, and the button gone with nothing left to give back`,
    !!after && after.placed === 0 && after.sword === 12 && after.shared === 12 && words.some((w) => /Points reset!/.test(w)) && b3 === null,
    { after, words, b3 });

  /* ── 5. again within the minute ── */
  await place('hp');
  let one = null;
  for (let i = 0; i < 20; i++) { one = await pts(); if (one && one.placed === 1) break; await P.page.waitForTimeout(300); }
  for (let i = 0; i < 10 && !(await btn()); i++) await P.page.waitForTimeout(300);
  await tap();
  await P.page.waitForTimeout(250);
  await tap();
  /* the words, as they come (a line over your bro is gone in about a second) */
  let refused = [];
  for (let i = 0; i < 40 && !refused.some((w) => /You just reset/.test(w)); i++) {
    refused = await P.page.evaluate(() => (window._gameState.current.dmgNumbers || []).map((d) => String(d.text || '')).filter(Boolean));
    if (!refused.some((w) => /You just reset/.test(w))) await P.page.waitForTimeout(100);
  }
  const kept = await pts();
  rec.ok('again within the minute: refused in words ("You just reset your points"), the point still placed',
    !!kept && kept.placed === 1 && refused.some((w) => /You just reset your points/.test(w)), { kept, refused });

  const errs = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
