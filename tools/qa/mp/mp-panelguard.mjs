/* ═══ A WINDOW THAT THROWS TAKES ONLY ITSELF DOWN (v2.3.5593) ═══
 *
 * The red team (2026-11-14, RT-3 S3, docs/security/rt3-findings.md): the page
 * had no error boundary, and React unmounts the WHOLE root on an error nothing
 * catches -- one feedback ticket whose name was an object (anyone on the
 * internet could post one) blanked every screen of the game for whoever opened
 * Feedback.  src/ui/lazyPanel.js's PanelGuard now catches a window that
 * throws, and the Feedback panel prints every field as a string.  A phone in
 * BroTown:
 *   1. the Feedback window's script answered with one whose window THROWS:
 *      the card says "This window hit a problem", with Reload and Close; the
 *      game plays on under it (frames, a step, its screens still drawn); the
 *      error is counted (window.__btLazyCode.cards.caught); Close takes the
 *      card away;
 *      opened again, the window is drawn afresh (here it throws again: the
 *      card again, a second catch);
 *   2. a second phone, the real script, and the board answered as an OLDER
 *      worker might (a ticket whose name, topic and text are objects):
 *      Feedback's Browse shows the rows, no card, and the game is still there.
 *
 *   node tools/qa/mp/run.mjs panelguard
 */
import * as H from './harness.mjs';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Guard', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  let asked = 0;
  /* both Feedback windows' scripts (the dashboard's and the old one) are FeedbackPanel-<hash>.js */
  await P.page.route(/\/assets\/FeedbackPanel-[^/]+\.js/, (route) => {
    asked++;
    return route.fulfill({ status: 200, contentType: 'text/javascript',
      body: "export function FeedbackPanel() { throw new Error('qa: a window that throws'); }" });
  });
  try {
    await phoneOne(P, rec, () => asked);
  } finally {
    await P.ctx.close().catch(() => {});
  }
  const Q = await H.newPlayer(browser, { name: 'Board', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  /* the board as an older worker might serve it: a name, a topic and a text that are objects */
  await Q.page.route(/\/api\/feedback\/list/, (route) => route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: true, total: 2, tickets: [
      { id: 'qa-bad', playerName: { a: 1 }, category: 'bug', topic: { b: 2 }, text: { c: 3 }, up: 0, down: 0, ts: Date.now() },
      { id: 'qa-good', playerName: 'Scribe', category: 'praise', topic: 'ui', text: 'nice game', up: 1, down: 0, ts: Date.now() - 1000 },
    ] }) }));
  try {
    await phoneTwo(Q, rec);
  } finally {
    await Q.ctx.close().catch(() => {});
  }
}

async function inWorld(P, rec, label) {
  await H.enterWorld(P);
  const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
    { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
  rec.ok(`in the Wheel (${label})`, ok);
  return ok;
}
async function openFeedback(P) {
  await H.unfoldBand(P).catch(() => {});
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; b.open('more'); });
  const t = P.page.locator('[data-more-tile="feedback"]').first();
  await t.waitFor({ state: 'visible', timeout: 8000 });
  await t.click({ force: true });
}
const cards = (P) => P.page.locator('[data-lazy-cantopen]').count();
/* the game's screens still drawn: an error nothing catches unmounts React's whole root, #root then empty */
const drawn = (P) => P.page.evaluate(() => { const r = document.getElementById('root'); return !!r && r.querySelectorAll('*').length > 50; });

async function phoneOne(P, rec, asked) {
  {
    if (!(await inWorld(P, rec, 'the throwing window'))) return;
    /* 1. a window that throws */
    await openFeedback(P);
    const card = await P.page.locator('[data-lazy-cantopen="threw"]').first().waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
    const words = card ? await P.page.locator('[data-lazy-cantopen]').first().innerText() : '';
    const caught = await P.page.evaluate(() => window.__btLazyCode.cards.caught);
    rec.ok(`a window that throws: the card says so in plain words, with Reload and Close (${asked()} asks, ${caught} caught): "${words.replace(/\s+/g, ' ').trim()}"`,
      card && /This window hit a problem/.test(words) && /Reload/.test(words) && /Close/.test(words) && caught >= 1, { asked: asked(), caught, words });
    const frames = await P.page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now();
      const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
    const p0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    await H.glideTo(P, p0.x + 60, p0.y, { timeoutMs: 15000 });
    const p1 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, zone: S.currentZone }));
    const bar = await drawn(P);
    rec.ok(`...and the game plays on under it: ${frames} frames in 2 s, a step taken (${Math.round(p1.x - p0.x)} px), still in the world, the game's screens still drawn`,
      frames > 0 && p1.zone === 'wheel' && p1.x - p0.x > 30 && bar, { frames, p0, p1, bar });
    const btn = P.page.locator('[data-lazy-cantopen] button[data-esc]').first();
    const bb = await btn.boundingBox();
    if (bb) await P.page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await P.page.waitForTimeout(600);
    rec.ok('a tap on Close takes the card away', (await cards(P)) === 0, { bb });
    /* opened again: drawn afresh (it throws again here: the card again, a second catch) */
    await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) { /* closed */ } });
    await P.page.waitForTimeout(400);
    await openFeedback(P);
    const again = await P.page.locator('[data-lazy-cantopen="threw"]').first().waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
    const caught2 = await P.page.evaluate(() => window.__btLazyCode.cards.caught);
    rec.ok(`opened again, the window is drawn afresh: the card again, ${caught2} caught in all`, again && caught2 >= 2 && (await drawn(P)), { again, caught2 });
  }
}

async function phoneTwo(P, rec) {
  {
    if (!(await inWorld(P, rec, 'the board from an older worker'))) return;
    /* 2. the real window, a board with objects in it */
    await openFeedback(P);
    const browse = P.page.locator('[data-fb-tab="browse"]').first();
    const hasBrowse = await browse.waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
    if (hasBrowse) await browse.click({ force: true });
    const rows = await P.page.locator('[data-fb-row]').first().waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
    const nRows = await P.page.locator('[data-fb-row]').count();
    const bad = rows ? await P.page.locator('[data-fb-row="qa-bad"]').first().innerText().catch(() => '') : '';
    const errs = (P.logs || []).filter((e) => /^pageerror/.test(e) && !/qa: a window that throws/.test(e));
    rec.ok(`a board served with objects for a name, topic and text: the rows show (${nRows}), no card, no page error, the game still there ("${bad.replace(/\s+/g, ' ').trim().slice(0, 60)}")`,
      hasBrowse && rows && nRows === 2 && (await cards(P)) === 0 && errs.length === 0 && (await drawn(P)), { hasBrowse, rows, nRows, errs: errs.slice(0, 5) });
  }
}
