/* ═══ v2.3.5611: RENAME FROM THE TEST PANEL (card OPS PR 12) ═══
 *
 * src/ui/panels/RenameRow.jsx: under each chat report, after its Silence, and
 * in the Character section for the owner's own ("Rename my character", with
 * the Staff word chip that sends `force`), through card MOD's #1907 route
 * (POST /api/admin/rename, the admin key), never a terminal.  Either side may
 * ship first, so this plays both:
 *
 *   1. Alpha reports Bravo; the report has its Rename, and the Character
 *      section has Rename my character;
 *   2. Bravo's Rename, "Bobby": the first tap asks (nothing sent), the second
 *      acts: with the route, "Renamed Bravo to Bobby. They see it now.", and
 *      Alpha's page shows Bravo as Bobby; without it, "this server can't
 *      rename anyone yet";
 *   3. (with the route) a name with an emoji is refused in the rule's words;
 *   4. (with the route) Alpha's own, "Owner" with the Staff word: renamed;
 *   5. no page error.
 *
 *   node tools/qa/mp/run.mjs renameowner
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

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const init = 'try { localStorage.setItem("bt_dev_key", ' + JSON.stringify(H.ADMIN_KEY) + '); } catch (e) {}';
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Alpha', nameB: 'Bravo', init, world: 'wheel' });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const bId = await H.readState(B, (S) => S.myId);
  const aId = await H.readState(A, (S) => S.myId);
  const othersName = (id) => A.page.evaluate((i) => { const S = window._gameState && window._gameState.current; return S && S.others && S.others[i] ? S.others[i].name : null; }, id);
  const typeName = (sel, text) => A.page.evaluate(([s, t]) => {
    const inp = document.querySelector(s);
    if (!inp) return false;
    inp.scrollIntoView({ block: 'center' });
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, t);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, [sel, text]);

  /* ── 1. the rows ── */
  await H.sendEvent(A, 'chat_report', { target: bId, reason: 'harass' });
  await A.page.waitForTimeout(1500);
  const opened = await openPanel(A);
  await until(A, () => A.page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /^(Show|Reload) chat reports$/.test(x.textContent));
    if (b && !b.disabled) { b.scrollIntoView({ block: 'center' }); b.click(); }
    return !!b && !b.disabled;
  }));
  const rowB = '[data-rename="' + bId + '"]';
  const rowA = '[data-rename="' + aId + '"]';
  const hasB = await until(A, () => A.page.evaluate((s) => !!document.querySelector(s + ' [data-rename-open]'), rowB), 12000);
  const hasA = await until(A, () => A.page.evaluate((s) => { const b = document.querySelector(s + ' [data-rename-open]'); return b ? b.textContent : null; }, rowA));
  rec.ok(`1. the report has its Rename, and the Character section "${hasA}"`, opened && !!hasB && hasA === 'Rename my character', { opened, hasB, hasA });

  /* ── 2. Bravo -> Bobby ── */
  await until(A, () => clickSel(A, rowB + ' [data-rename-open]'));
  await until(A, () => typeName(rowB + ' [data-rename-name]', 'Bobby'));
  await until(A, () => clickSel(A, rowB + ' [data-rename-go]'));
  const asked = await until(A, () => message(A, /^Rename Bravo to "Bobby"\?/));
  await A.page.screenshot({ path: join(OUT, 'renameowner-ask.png') });
  const sentEarly = await othersName(bId);
  rec.ok('2. the first tap asks, nothing sent', !!asked && sentEarly !== 'Bobby', { asked, sentEarly });
  await until(A, () => clickSel(A, rowB + ' [data-rename-go]'));
  const said = await until(A, () => message(A, /^Renamed Bravo to Bobby|can't rename anyone yet/), 10000);
  const routeHere = /^Renamed Bravo to Bobby/.test(said || '');
  const seen = routeHere ? await until(A, async () => ((await othersName(bId)) === 'Bobby' ? 'Bobby' : null), 10000) : null;
  await A.page.screenshot({ path: join(OUT, 'renameowner-renamed.png') });
  rec.ok(routeHere
    ? `2. the second renames: "${said}"; Alpha sees Bravo as ${seen}`
    : `2. the second says "${said}" (no route on this worker: #1907)`,
    routeHere ? (/They see it now\./.test(said) && seen === 'Bobby') : !!said, { said, seen });

  if (routeHere) {
    /* ── 3. an emoji, refused in words ── */
    const fresh = await A.page.evaluate((s) => !!document.querySelector(s + ' [data-rename-open]'), rowB);
    if (fresh) await until(A, () => clickSel(A, rowB + ' [data-rename-open]'));
    await until(A, () => typeName(rowB + ' [data-rename-name]', 'Bob\u{1F600}'));
    await until(A, () => clickSel(A, rowB + ' [data-rename-go]'));
    await until(A, () => message(A, /^Rename Bobby to|^Rename Bravo to/));
    await until(A, () => clickSel(A, rowB + ' [data-rename-go]'));
    const refused = await until(A, () => message(A, /no emoji or symbols/), 10000);
    rec.ok(`3. a name with an emoji is refused in the rule's words ("${refused}")`, !!refused, refused);
    await clickSel(A, rowB + ' [data-rename-close]');

    /* ── 4. the owner's own, a staff word ── */
    await until(A, () => clickSel(A, rowA + ' [data-rename-open]'));
    await until(A, () => typeName(rowA + ' [data-rename-name]', 'Owner'));
    await until(A, () => clickSel(A, rowA + ' [data-rename-force]'));
    await until(A, () => clickSel(A, rowA + ' [data-rename-go]'));
    const ask4 = await until(A, () => message(A, /A staff word is allowed/));
    await until(A, () => clickSel(A, rowA + ' [data-rename-go]'));
    const own = await until(A, () => message(A, /^Renamed Alpha to Owner/), 10000);
    rec.ok(`4. Alpha's own, "Owner" with the Staff word: "${own}"`, !!ask4 && !!own, { ask4, own });
  }
  rec.ok('5. no page error', errors.length === 0, errors);
}
