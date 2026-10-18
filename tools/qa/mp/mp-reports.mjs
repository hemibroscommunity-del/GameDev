/* ═══ v2.3.3344: CHAT REPORTS IN THE OWNER'S TEST PANEL, ON A PHONE ═══
 *
 * Phase 0 of the fun & social plan (docs/FUN-SOCIAL-PLAN.md): players have
 * filed chat reports since v2.3.1981, and the owner could read them -- and
 * kick or freeze from them -- only with curl.  The Test panel's Chat reports
 * section lists them now and acts on them.
 *
 * Three players on one worker (the harness's, ADMIN_KEY set): the owner on a
 * phone, a reporter and the reported player.  What it proves:
 *   1. with no reports the section says so;
 *   2. a report filed from the player's card (Report, then Spam) is listed:
 *      the reported player's name, online, "Spam · reported by <reporter>",
 *      and what they said -- the server's own copy;
 *   3. Kick says they were kicked and can come back;
 *   4. Freeze takes two taps ("Sure? Freeze"), then the row says frozen and
 *      the worker refuses them; Unfreeze lets them back;
 *   5. Dismiss takes the report away;
 *   6. it fits the phone (no sideways scroll), with a picture.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const holdTitle = async (P, ms) => {
  const at = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-zone-header__title');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (!at) return 'no title element';
  await P.page.mouse.move(at.x, at.y);
  await P.page.mouse.down();
  await P.page.waitForTimeout(ms);
  await P.page.mouse.up();
  return 'ok';
};
const waitPanel = async (P, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'))) return true;
    await P.page.waitForTimeout(250);
  }
  return false;
};
const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').trim() === t);
  if (!b) return false;
  b.scrollIntoView({ block: 'center' });
  b.click();
  return true;
}, text);
const tapAct = (P, key, act) => P.page.evaluate(({ key, act }) => {
  const row = Array.from(document.querySelectorAll('[data-report]')).find((n) => n.getAttribute('data-report') === key);
  const b = row && row.querySelector('[data-report-act="' + act + '"]');
  if (!b) return null;
  b.scrollIntoView({ block: 'center' });
  b.click();
  return (b.textContent || '').trim();
}, { key, act });
const rows = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-report]')).map((el) => ({
  key: el.getAttribute('data-report'),
  name: ((el.querySelector('[data-report-name]') || {}).textContent || '').trim(),
  state: ((el.querySelector('[data-report-state]') || {}).textContent || '').trim(),
  why: ((el.querySelector('[data-report-why]') || {}).textContent || '').trim(),
  lines: Array.from(el.querySelectorAll('[data-report-line]')).map((n) => (n.textContent || '').trim()),
  freezeLabel: ((el.querySelector('[data-report-act="freeze"]') || {}).textContent || '').trim(),
})));
const panelMsg = (P) => P.page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('div')).find((n) => /^(Kicked|Froze|Unfroze|Dismissed|.* was not online)/.test((n.textContent || '').trim()) && n.children.length === 0);
  return el ? el.textContent.trim() : null;
});
/* the panel between requests: no "Working…", so its buttons are live again
   (each is disabled while one is in flight -- a tap then does nothing) */
async function idle(P, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const busy = await P.page.evaluate(() => Array.from(document.querySelectorAll('div')).some((n) => (n.textContent || '').trim() === 'Working…' && n.children.length === 0));
    if (!busy) return true;
    await P.page.waitForTimeout(200);
  }
  return false;
}
/* wait for the report's row to read `pred` */
async function rowUntil(P, key, pred, ms = 15000) {
  const t0 = Date.now();
  let row = null;
  while (Date.now() - t0 < ms) {
    row = (await rows(P)).find((x) => x.key === key) || null;
    if (pred(row)) return row;
    await P.page.waitForTimeout(250);
  }
  return row;
}
async function say(P, text) {
  await P.page.evaluate(() => window.__broChatBubbleBus.setOpen(true));
  await P.page.waitForSelector('[data-chat-input]', { timeout: 10000 });
  await P.page.locator('[data-chat-input]').first().fill(text);
  await P.page.locator('[data-chat-input]').first().press('Enter');
  await P.page.waitForTimeout(600);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const O = await H.newPlayer(browser, { name: 'TheOwner', wsPort, webPort, touch: true, viewport: PHONE });
  await H.enterWorld(O);
  const R = await H.newPlayer(browser, { name: 'Reporter', wsPort, webPort, touch: true, viewport: PHONE });
  await H.enterWorld(R);
  const T = await H.newPlayer(browser, { name: 'Spammer', wsPort, webPort, touch: true, viewport: PHONE });
  await H.enterWorld(T);
  await H.waitMutualSight(R, T);
  const tId = await H.readState(T, (S) => S.myId);
  await O.page.waitForTimeout(1500);

  /* ── 1. the panel, with nothing reported ── */
  await holdTitle(O, 2000);
  rec.ok('1. a real hit-tested press on the zone title opens the Test panel', (await waitPanel(O)) === true);
  await O.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(O, 'Save key on this device');
  await O.page.waitForTimeout(1200);
  rec.ok('1. the panel offers "Show chat reports"', await tap(O, 'Show chat reports'));
  await O.page.waitForTimeout(1500);
  const empty = await O.page.evaluate(() => {
    const el = document.querySelector('[data-reports-empty]');
    return el ? (el.textContent || '').trim() : null;
  });
  rec.ok('1. with nothing reported it says so in words', !!empty && /No reports/.test(empty), empty);

  /* ── 2. a report from the player's card ── */
  await say(T, 'buy cheap gold at my site');
  await H.openInspect(R, tId);
  await H.clickAct(R, 'report');
  await R.page.waitForTimeout(400);
  await H.clickAct(R, 'report-spam');
  const acked = await H.waitFor(R, (S) => S._lastReportAck || null, (a) => !!(a && a.ok), { timeout: 12000, label: 'report ack' })
    .then(() => true).catch(() => false);
  rec.ok('2. setup: the report reaches the worker (its ack)', acked);
  rec.ok('2. the button now reloads', await tap(O, 'Reload chat reports'));
  await O.page.waitForTimeout(1500);
  let r = await rows(O);
  console.log('    rows: ' + JSON.stringify(r));
  let row = r.find((x) => x.name === 'Spammer');
  rec.ok('2. the report is listed by the reported player\'s name', !!row, r);
  rec.ok('2. ...online, "Spam · reported by Reporter"', !!row && row.state === 'online' && /^Spam · reported by Reporter/.test(row.why), row);
  rec.ok('2. ...and what they said, the server\'s own copy', !!row && row.lines.some((l) => /buy cheap gold at my site/.test(l)), row);
  const key = row && row.key;

  /* ── 3. Kick ── */
  await idle(O);
  const k = await tapAct(O, key, 'kick');
  await idle(O);
  const kickMsg = await panelMsg(O);
  rec.ok('3. Kick kicks them, and says they can come straight back', k === 'Kick' && !!kickMsg && /^Kicked Spammer\. They can join again/.test(kickMsg), { k, kickMsg });

  /* ── 4. Freeze, two taps; Unfreeze ── */
  await idle(O);
  await tapAct(O, key, 'freeze');
  let row4 = await rowUntil(O, key, (x) => !!x && x.freezeLabel === 'Sure? Freeze', 5000);
  rec.ok('4. the first tap on Freeze only asks "Sure? Freeze"', !!row4 && row4.freezeLabel === 'Sure? Freeze' && row4.state !== 'frozen', row4);
  await tapAct(O, key, 'freeze');
  await idle(O);
  row4 = await rowUntil(O, key, (x) => !!x && x.state === 'frozen');
  rec.ok('4. the second freezes them: the row says frozen', !!row4 && row4.state === 'frozen', row4);
  const froze = await fetch('http://127.0.0.1:' + wsPort + '/api/admin/reports?limit=10', { headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } }).then((x) => x.json());
  rec.ok('4. ...the worker\'s own word too (frozen, not online)', (froze.reports || []).some((x) => x.target === tId && x.frozen === true && x.onlineNow === false), froze.reports);
  await O.page.evaluate((key) => { const el = Array.from(document.querySelectorAll('[data-report]')).find((n) => n.getAttribute('data-report') === key); if (el) el.scrollIntoView({ block: 'center' }); }, key);
  await O.page.waitForTimeout(300);
  await O.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/reports.png` }).catch(() => {});
  await tapAct(O, key, 'unfreeze');
  await idle(O);
  row4 = await rowUntil(O, key, (x) => !!x && x.state !== 'frozen');
  rec.ok('4. Unfreeze lets them back: the row no longer says frozen', !!row4 && row4.state !== 'frozen', row4);

  /* ── 5. Dismiss ── */
  await idle(O);
  await tapAct(O, key, 'dismiss');
  await idle(O);
  await rowUntil(O, key, (x) => !x, 5000);
  rec.ok('5. Dismiss takes the report away', !(await rows(O)).some((x) => x.key === key));
  const after = await fetch('http://127.0.0.1:' + wsPort + '/api/admin/reports?limit=10', { headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } }).then((x) => x.json());
  rec.ok('5. ...on the worker too', !(after.reports || []).some((x) => x.key === key), after.reports);

  /* ── 6. on the phone ── */
  const fit = await O.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  rec.ok('6. the panel fits the phone: no sideways scroll', fit.sw <= fit.iw, fit);

  await T.ctx.close().catch(() => {});
  await R.ctx.close().catch(() => {});
  await O.ctx.close().catch(() => {});
}
