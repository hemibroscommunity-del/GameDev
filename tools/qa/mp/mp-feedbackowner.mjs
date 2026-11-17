/* ═══ v2.3.5603: THE TEST PANEL LOOKS AFTER THE FEEDBACK BOARD (card OPS PR 4) ═══
 *
 * src/ui/panels/FeedbackOwnerRows.jsx, under the Test panel's Set a switch
 * row: the owner takes a feedback post down and sweeps the board from the
 * phone, never a terminal (red team RT-3's #1878 routes, behind the admin
 * key).  Either side may ship first, so this plays both:
 *
 *   1. a post on the board (the public submit), then "Show the newest
 *      posts": it is listed, who and what;
 *   2. its Take down asks once (the post still on the board), then acts:
 *      with the route on this worker the post is gone from the board and the
 *      list; without it, the row says this server can't yet (and the post
 *      stays);
 *   3. Sweep asks once, then acts: its numbers in words, or "can't yet";
 *   4. no page error.
 *
 *   node tools/qa/mp/run.mjs feedbackowner
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const holdTitle = async (P, ms) => {
  const at = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-zone-header__title');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (!at) return false;
  await P.page.mouse.move(at.x, at.y);
  await P.page.mouse.down();
  await P.page.waitForTimeout(ms);
  await P.page.mouse.up();
  return true;
};
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
async function openPanel(P) {
  for (let i = 0; i < 3; i++) {
    if (await panelUp(P)) return true;
    await holdTitle(P, 2200);
    for (const t0 = Date.now(); Date.now() - t0 < 8000;) {
      if (await panelUp(P)) return true;
      await P.page.waitForTimeout(250);
    }
  }
  return panelUp(P);
}
const clickSel = (P, sel) => P.page.evaluate((s) => {
  const b = document.querySelector(s);
  if (!b || b.disabled) return false;
  b.scrollIntoView({ block: 'center' });
  b.click();
  return true;
}, sel);
const message = (P, re) => P.page.evaluate((src) => {
  const r = new RegExp(src);
  const hit = Array.from(document.querySelectorAll('div, span')).filter((n) => n.children.length === 0 && r.test(n.textContent || ''));
  return hit.length ? hit[hit.length - 1].textContent : null;
}, re.source);
/* this box draws a few frames a second (TRAPS §200): wait for the page, never a fixed time */
async function until(P, fn, ms = 8000) {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    const v = await fn();
    if (v) return v;
    await P.page.waitForTimeout(200);
  }
  return fn();
}
async function board(wsPort) {
  const res = await fetch(`http://127.0.0.1:${wsPort}/api/feedback/list?sort=new&limit=50`);
  const j = await res.json().catch(() => ({}));
  return (j && j.tickets) || [];
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  /* a post on the board, the public way a phone sends one */
  const stamp = 'owner-row-' + Date.now().toString(36);
  const sub = await fetch(`http://127.0.0.1:${wsPort}/api/feedback/submit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: 'bp_fbowner_' + Date.now().toString(36), playerName: 'Poster', category: 'bug', topic: 'Tests', text: 'A post to take down ' + stamp }),
  }).then((r) => r.json()).catch(() => ({}));
  const posted = (await board(wsPort)).find((t) => (t.text || '').includes(stamp));
  const P = await H.newPlayer(browser, {
    name: 'Boardkeeper', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel',
    init: 'try { localStorage.setItem("bt_dev_key", ' + JSON.stringify(H.ADMIN_KEY) + '); } catch (e) {}',
  });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  for (let i = 0; i < 120; i++) {
    if ((await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(1500);

  /* ── 1. the list ── */
  const opened = await openPanel(P);
  await until(P, () => clickSel(P, '[data-fb-show]'));
  const listed = await until(P, () => P.page.evaluate((id) => {
    const row = document.querySelector('[data-fb-post="' + id + '"]');
    return row ? row.textContent : null;
  }, posted && posted.id));
  await P.page.screenshot({ path: join(OUT, 'feedbackowner-list.png') });
  rec.ok(`1. a post on the board, then Show the newest posts: it is listed ("${(listed || '').slice(0, 60)}")`,
    sub.ok === true && !!posted && opened && !!listed && /Poster on Tests: A post to take down/.test(listed), { sub, posted: !!posted, opened, listed });

  /* ── 2. take it down ── */
  const sel = '[data-fb-down="' + (posted && posted.id) + '"]';
  await until(P, () => clickSel(P, sel));
  const asked = await until(P, () => message(P, /^Take down this post\?/));
  const still = (await board(wsPort)).some((t) => t.id === (posted && posted.id));
  rec.ok('2. the first Take down asks, and the post is still on the board', !!asked && still, { asked, still });
  await until(P, () => clickSel(P, sel));
  const said = await until(P, () => message(P, /Took down Poster's post|can't take a post down yet/), 10000);
  const gone = !(await board(wsPort)).some((t) => t.id === (posted && posted.id));
  const routeHere = /Took down/.test(said || '');
  await P.page.screenshot({ path: join(OUT, 'feedbackowner-down.png') });
  rec.ok(routeHere
    ? '2. the second takes it down: gone from the board and the list (the route is on this worker)'
    : '2. the second says this server can\'t take a post down yet, and the post stays (no route on this worker: #1878)',
    routeHere ? (gone && !(await P.page.$(sel))) : (!!said && !gone), { said, gone });

  /* ── 3. sweep ── */
  await until(P, () => clickSel(P, '[data-fb-sweep]'));
  const sAsked = await until(P, () => message(P, /^Sweep the feedback board\?/));
  await until(P, () => clickSel(P, '[data-fb-sweep]'));
  const sSaid = await until(P, () => message(P, /^Swept the feedback board|can't sweep the board yet/), 10000);
  rec.ok(`3. Sweep asks once, then acts: "${sSaid}"`, !!sAsked && !!sSaid, { sAsked, sSaid });

  rec.ok('4. no page error', errors.length === 0, errors);
}
