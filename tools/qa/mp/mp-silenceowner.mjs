/* ═══ v2.3.5605: SILENCE FROM A CHAT REPORT (card OPS PR 6) ═══
 *
 * src/ui/panels/SilenceButtons.jsx, under each chat report in the Test
 * panel, beside its Freeze: Silence 1 min / 1 h / 1 day / until lifted, and
 * Lift (card MOD's #1897 route, the admin key), never a terminal.  Either
 * side may ship first, so this plays both:
 *
 *   1. Alpha reports Bravo; Alpha's Test panel, Show chat reports: the report
 *      has its silence buttons, four, beside the Freeze;
 *   2. 1 h: the first tap asks (nothing sent), the second acts: with the
 *      route on this worker, "Silenced Bravo until ..." and the row reads
 *      Silenced with its Lift; without it, "this server can't silence anyone
 *      yet";
 *   3. (with the route) Lift asks, then lifts: "Lifted Bravo's silence", the
 *      four buttons back;
 *   4. no page error.
 *
 *   node tools/qa/mp/run.mjs silenceowner
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

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
async function running(wsPort) {
  const res = await fetch(`http://127.0.0.1:${wsPort}/api/admin/silence`, { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } });
  if (res.status !== 200) return null;
  const j = await res.json().catch(() => ({}));
  return (j && j.silenced) || [];
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const init = 'try { localStorage.setItem("bt_dev_key", ' + JSON.stringify(H.ADMIN_KEY) + '); } catch (e) {}';
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Alpha', nameB: 'Bravo', init, world: 'wheel' });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const bId = await H.readState(B, (S) => S.myId);
  try {
    /* ── 1. a report, and its buttons ── */
    /* as a player's card sends it (chatMute.js reportPlayer) */
    await H.sendEvent(A, 'chat_report', { target: bId, reason: 'harass' });
    await A.page.waitForTimeout(1500);
    const opened = await openPanel(A);
    await until(A, () => A.page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => /^(Show|Reload) chat reports$/.test(x.textContent));
      if (b && !b.disabled) { b.scrollIntoView({ block: 'center' }); b.click(); }
      return !!b && !b.disabled;
    }));
    const sel = '[data-silence="' + bId + '"]';
    const choices = await until(A, () => A.page.evaluate((s) => {
      const box = document.querySelector(s);
      return box ? Array.from(box.querySelectorAll('[data-silence-act]')).map((b) => b.getAttribute('data-silence-act')) : null;
    }, sel), 12000);
    await A.page.evaluate((s) => { const b = document.querySelector(s); if (b) b.scrollIntoView({ block: 'center' }); }, sel);
    await A.page.screenshot({ path: join(OUT, 'silenceowner-report.png') });
    rec.ok(`1. Alpha reports Bravo; the report has its silence buttons (${(choices || []).join(', ')})`,
      opened && Array.isArray(choices) && choices.join() === '1m,1h,1d,lift', { opened, choices });

    /* ── 2. an hour ── */
    const one = sel + ' [data-silence-act="1h"]';
    await until(A, () => clickSel(A, one));
    const asked = await until(A, () => message(A, /^Silence Bravo for an hour\?/));
    const r0 = await running(wsPort);
    rec.ok('2. the first tap asks, nothing sent', !!asked && (r0 === null || !r0.some((s) => s.playerId === bId)), { asked, r0 });
    await until(A, () => clickSel(A, one));
    const said = await until(A, () => message(A, /^Silenced Bravo until|can't silence anyone yet/), 10000);
    const routeHere = /^Silenced Bravo/.test(said || '');
    const r1 = await running(wsPort);
    const shown = routeHere ? await until(A, () => A.page.evaluate((s) => { const n = document.querySelector(s + ' [data-silence-state]'); return n ? n.textContent : null; }, sel)) : null;
    await A.page.screenshot({ path: join(OUT, 'silenceowner-silenced.png') });
    rec.ok(routeHere
      ? `2. the second silences: "${said}"; the worker holds it, and the row reads "${shown}" with its Lift`
      : `2. the second says "${said}" (no route on this worker: #1897)`,
      routeHere ? (Array.isArray(r1) && r1.some((s) => s.playerId === bId) && /^Silenced until \d\d:\d\d UTC|^Silenced until [A-Z][a-z]{2} \d+/.test(shown || '')) : !!said, { said, r1, shown });

    /* ── 3. lift ── */
    if (routeHere) {
      const lift = sel + ' [data-silence-act="unsilence"]';
      await until(A, () => clickSel(A, lift));
      const lAsked = await until(A, () => message(A, /^Lift Bravo's silence\?/));
      await until(A, () => clickSel(A, lift));
      const lSaid = await until(A, () => message(A, /^Lifted Bravo's silence/), 10000);
      const r2 = await running(wsPort);
      const back = await until(A, () => A.page.evaluate((s) => document.querySelectorAll(s + ' [data-silence-act]').length === 4, sel));
      rec.ok('3. Lift asks, then lifts: the worker holds none, the four buttons back', !!lAsked && !!lSaid && Array.isArray(r2) && !r2.some((s) => s.playerId === bId) && back, { lAsked, lSaid, r2, back });
    }
    rec.ok('4. no page error', errors.length === 0, errors);
  } finally {
    await fetch(`http://127.0.0.1:${wsPort}/api/admin/silence?id=${encodeURIComponent(bId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } }).catch(() => {});
  }
}
