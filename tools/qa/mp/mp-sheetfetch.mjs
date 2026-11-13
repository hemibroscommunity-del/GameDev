/* ═══ v2.3.5015: NO SHEET OF NUMBERS MADE AGAIN ON THE PAGE AS ARMOUR GOES ON ═══
 *
 * The stutter sweep's armour station held the page 38 to 45 ms at once as
 * armour went on: a sheet of colour numbers drawn on a canvas and read back on
 * the page (lookPalette.js make).  Two roads led there: its header changing
 * (setLookSheetBook: the whole sheet sent to the chip again), and its bytes
 * sent to the masked bake's worker (lookArmour.js lookSheetForWorker).  Now
 * only the header rows are sent (lookUnpack.js lookHeadRows), and the worker
 * is sent the file's address and makes the bytes itself (maskedBakeWorker.js
 * 'lookSheetUrl', lookUnpack.js unpackLookSheet).  docs/specs/look-armour.md.
 *
 * Two phones in the Wheel's BroTown put copper armour on and walk about:
 *   1. the default phone sends its sheets as files (none as bytes, none
 *      failed), and the worker's bytes are the page's own, sheet for sheet
 *      (window.__btSheetFetchCheck: the page reads each one too, to compare);
 *   2. the bodies under the armour are baked there (the worker's bakes,
 *      none failed: a job naming a sheet not there yet fails) -- the
 *      worker's sheets work;
 *   3. `?sheetfetch=0` sends the bytes from the page, as before, and bakes
 *      the same way;
 *   4. no sheet's bytes made again from its picture on the page in play: a
 *      pose's first bake under armour changes only its header, and only the
 *      header rows go to the chip (lookPalette.js headSends; remadeInFrame,
 *      the whole sheet made again from its picture in a frame, stays 0) --
 *      the 38 to 40 ms the stutter sweep caught at the armour station;
 *   5. no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const INIT = () => { window.__btSheetFetchCheck = true; };

async function wearAndWalk(P) {
  const on = await P.page.evaluate(() => { try { window._gameFns.setEquip('chest', 'copperplate'); window._gameFns.setEquip('legs', 'coppergreaves'); return true; } catch (e) { return false; } });
  await P.page.waitForTimeout(1500);
  /* every walking facing once: the jog's sheets, then the stand's */
  for (const keys of [['w'], ['w', 'd'], ['d'], ['s', 'd'], ['s'], ['s', 'a'], ['a'], ['w', 'a']]) {
    for (const k of keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(1200);
    for (const k of keys) await P.page.keyboard.up(k);
    await P.page.waitForTimeout(600);
  }
  return on;
}
const state = (P) => P.page.evaluate(() => {
  const lp = window.__btLookPalette && window.__btLookPalette();
  return { f: window.__btSheetFetch && window.__btSheetFetch(), bw: window.__btBakeWorker && window.__btBakeWorker(),
    lp: lp && { remade: lp.remade, remadeInFrame: lp.remadeInFrame, headSends: lp.headSends } };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'sheetfetch', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: INIT, query: 'lookpalette=1' });
  const B = await H.newPlayer(browser, { name: 'sheetbytes', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'lookpalette=1&sheetfetch=0' });
  const errs = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errs.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(A);
    await H.enterWorld(B);
    const inWheel = (Q) => H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    const okA = await inWheel(A), okB = await inWheel(B);
    rec.ok('both phones in the Wheel (guard)', !!okA && !!okB, { okA, okB });
    if (!okA || !okB) return;
    const onA = await wearAndWalk(A), onB = await wearAndWalk(B);
    rec.ok('copper armour on, on both (guard)', onA && onB, { onA, onB });
    /* the bakes caught up (this box's worker is slow: up to a minute) */
    const done = (P) => H.waitFor(P, () => window.__btBakeWorker && window.__btBakeWorker(), (v) => v && v.worker >= 3,
      { timeout: 90000, label: 'bodies under armour baked' }).catch(() => null);
    await done(A); await done(B);
    await A.page.waitForTimeout(3000);
    const a = await state(A), b = await state(B);
    console.log(`    the default phone: ${JSON.stringify(a.f && { ...a.f, checked: a.f.checked.length })}; bakes ${JSON.stringify(a.bw && { worker: a.bw.worker, failed: a.bw.failed, inline: a.bw.inline, raw: a.bw.raw })}`);
    console.log(`    ?sheetfetch=0: ${JSON.stringify(b.f && { ...b.f, checked: b.f.checked.length })}; bakes ${JSON.stringify(b.bw && { worker: b.bw.worker, failed: b.bw.failed, inline: b.bw.inline, raw: b.bw.raw })}`);
    const f = a.f || {};
    /* (a sheet goes once a worker: the counts are sends, the checks sheets; a
       sheet whose worker was restarted before it answered has no answer) */
    const answered = (f.checked || []).filter((c) => c.worker != null);
    const same = answered.filter((c) => c.same).length;
    rec.ok(`1. the default phone sends its sheets as files (${f.url} as files, ${f.bytes} as bytes, ${f.failed} failed), and the worker's bytes are the page's own (${same} of the ${answered.length} it answered for the same; ${(f.checked || []).length - answered.length} not answered, a restarted worker's)`,
      f.on === true && f.url >= 2 && f.bytes === 0 && f.failed === 0 && answered.length >= 4 && same === answered.length, f);
    /* (on this box two phones' bakes on one software chip can sit past the
       worker's 6 s stuck watch, entityRenderer.js _BAKE_STUCK_MS: it is
       restarted and the job in hand answered as failed -- the old way's phone
       the same.  A failure that is no restart's would be a sheet not there) */
    const fails = (bw) => (bw.failed || 0) - (bw.restarts || 0);
    rec.ok(`2. ...and the bodies under the armour are baked from them on the worker (${a.bw && a.bw.worker} baked; ${a.bw && a.bw.failed} failed, each a stuck worker's, ${a.bw && a.bw.restarts} restarts)`,
      !!a.bw && a.bw.worker >= 3 && fails(a.bw) <= 0, a.bw);
    const g = b.f || {};
    rec.ok(`3. ?sheetfetch=0 sends the bytes from the page, as before (${g.bytes} as bytes, ${g.url} as files), and bakes the same way (${b.bw && b.bw.worker} baked; ${b.bw && b.bw.failed} failed, ${b.bw && b.bw.restarts} restarts)`,
      g.on === false && g.url === 0 && g.bytes >= 2 && !!b.bw && b.bw.worker >= 3 && fails(b.bw) <= 0, { g, bw: b.bw });
    console.log(`    sheets sent to the chip: the default phone ${JSON.stringify(a.lp)}, ?sheetfetch=0 ${JSON.stringify(b.lp)}`);
    /* (a header changed before its sheet's first upload goes with that upload,
       not as a header send: which phone sends headers is timing) */
    rec.ok(`4. no sheet made again from its picture in play: only header rows sent (${a.lp && a.lp.headSends} + ${b.lp && b.lp.headSends} header sends; ${a.lp && a.lp.remadeInFrame} + ${b.lp && b.lp.remadeInFrame} sheets made again in a frame)`,
      !!a.lp && !!b.lp && (a.lp.headSends + b.lp.headSends) >= 1 && a.lp.remadeInFrame === 0 && b.lp.remadeInFrame === 0, { a: a.lp, b: b.lp });
    rec.ok('5. no page errors', errs.length === 0, errs.slice(0, 4));
  } finally {
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
