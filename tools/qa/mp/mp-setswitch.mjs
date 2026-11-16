/* ═══ v2.3.5602: THE TEST PANEL SETS A SWITCH (card OPS PR 3) ═══
 *
 * src/ui/panels/SetSwitchRow.jsx, in the Test panel's Live flags section:
 * the owner sets any live switch to a value from the phone, never a terminal
 * (CLAUDE.md §1; OPERATIONS "Rolling back": `newersave` off after a
 * rollback).  On a phone, the owner's admin key saved as they save it:
 *
 *   1. the panel opens with the row: the usual switches as chips;
 *   2. newersave, off, Set: the first tap only says what it will do (the
 *      worker's flags unchanged); the second sets it (the worker reads
 *      `newersave: false`), and the list above shows it;
 *   3. its Clear puts it back (the worker has no `newersave`);
 *   4. max_players, 2, Set twice: the worker holds 2; a number out of range
 *      (500) is refused in words and nothing is sent;
 *   5. a typed name the server's rule refuses (with a dash) is refused in
 *      words, nothing sent;
 *   6. no page error.
 *
 *   node tools/qa/mp/run.mjs setswitch
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
/* the panel's message line: the newest text that names a switch or says what went wrong */
const message = (P, re) => P.page.evaluate((src) => {
  const r = new RegExp(src);
  const hit = Array.from(document.querySelectorAll('div, span')).filter((n) => n.children.length === 0 && r.test(n.textContent || ''));
  return hit.length ? hit[hit.length - 1].textContent : null;
}, re.source);
const typeInto = (P, sel, text) => P.page.fill(sel, text, { timeout: 8000 });
/* this box draws a few frames a second (TRAPS §200): wait for the page, never a fixed time */
async function until(P, fn, ms = 8000) {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    const v = await fn();
    if (v) return v;
    await P.page.waitForTimeout(200);
  }
  return fn();
}
const named = (P) => P.page.evaluate(() => { const i = document.querySelector('[data-setswitch-name]'); return i ? i.value : null; });
async function pick(P, name) {
  return until(P, async () => { await clickSel(P, '[data-setswitch-pick="' + name + '"]'); return (await named(P)) === name; });
}
async function workerFlags(wsPort) {
  const res = await fetch(`http://127.0.0.1:${wsPort}/api/admin/flags`, { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } });
  const j = await res.json().catch(() => ({}));
  return (j && j.flags) || {};
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, {
    name: 'Switcher', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel',
    /* the admin key, as the owner saved it on their phone (DevPanel's KEY_LS) */
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
  try {
    /* ── 1. the row ── */
    const opened = await openPanel(P);
    await P.page.evaluate(() => { const b = document.querySelector('[data-setswitch]'); if (b) b.scrollIntoView({ block: 'center' }); });
    await P.page.waitForTimeout(300);
    const chips = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-setswitch-pick]')).map((b) => b.getAttribute('data-setswitch-pick')));
    rec.ok(`1. the Test panel opens with the Set a switch row: ${chips.join(', ')}`,
      opened && ['newersave', 'max_players', 'ip_sockets', 'ip_joins_min', 'roomrewind'].every((n) => chips.includes(n)), { opened, chips });

    /* ── 2. newersave off: the first tap says, the second sets ── */
    await pick(P, 'newersave');
    await until(P, () => clickSel(P, '[data-setswitch-value="off"]'));
    await until(P, () => clickSel(P, '[data-setswitch-set]'));
    const asked = await until(P, () => message(P, /Set newersave to off\?/));
    const f1 = await workerFlags(wsPort);
    await P.page.screenshot({ path: join(OUT, 'setswitch-confirm.png') });
    rec.ok(`2. the first tap says what it will do ("${(asked || '').slice(0, 90)}...") and sends nothing`,
      !!asked && /let in/.test(asked) && !('newersave' in f1), { asked, f1 });
    await clickSel(P, '[data-setswitch-set]');
    let f2 = {};
    for (const t0 = Date.now(); Date.now() - t0 < 6000;) { f2 = await workerFlags(wsPort); if (f2.newersave === false) break; await P.page.waitForTimeout(250); }
    const listed = await until(P, () => P.page.evaluate(() => Array.from(document.querySelectorAll('span')).some((n) => n.textContent === 'newersave')));
    const done = await until(P, () => message(P, /^Set newersave to off\./));
    await P.page.screenshot({ path: join(OUT, 'setswitch-set.png') });
    rec.ok('2. the second tap sets it: the worker reads newersave: false, and the list above shows it', f2.newersave === false && listed && !!done, { f2, listed, done });

    /* ── 3. Clear puts it back ── */
    const cleared = await P.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('span')).filter((n) => n.textContent === 'newersave');
      const row = rows.length ? rows[0].parentElement : null;
      const b = row ? Array.from(row.querySelectorAll('button')).find((x) => x.textContent === 'Clear') : null;
      if (b) b.click();
      return !!b;
    });
    let f3 = {};
    for (const t0 = Date.now(); Date.now() - t0 < 6000;) { f3 = await workerFlags(wsPort); if (!('newersave' in f3)) break; await P.page.waitForTimeout(250); }
    rec.ok('3. its Clear puts it back: the worker has no newersave', cleared && !('newersave' in f3), { cleared, f3 });

    /* ── 4. a number: max_players 2; 500 refused ── */
    await pick(P, 'max_players');
    await typeInto(P, '[data-setswitch-value-text]', '500');
    await until(P, () => clickSel(P, '[data-setswitch-set]'));
    const range = await until(P, () => message(P, /max_players goes from/));
    const f4a = await workerFlags(wsPort);
    rec.ok(`4. max_players 500 is refused in words ("${range}"), nothing sent`, !!range && !('max_players' in f4a), { range, f4a });
    await typeInto(P, '[data-setswitch-value-text]', '2');
    await until(P, () => clickSel(P, '[data-setswitch-set]'));
    await until(P, () => message(P, /Set max_players to 2\?/));
    await until(P, () => clickSel(P, '[data-setswitch-set]'));
    let f4 = {};
    for (const t0 = Date.now(); Date.now() - t0 < 6000;) { f4 = await workerFlags(wsPort); if (f4.max_players === 2) break; await P.page.waitForTimeout(250); }
    rec.ok('4. max_players 2, Set twice: the worker holds 2', f4.max_players === 2, f4);
    await H.liveFlag(wsPort, 'max_players', null);

    /* ── 5. a name the server's rule refuses ── */
    await typeInto(P, '[data-setswitch-name]', 'bad-name');
    await typeInto(P, '[data-setswitch-value-text]', 'on');
    await until(P, () => clickSel(P, '[data-setswitch-set]'));
    const refused = await until(P, () => message(P, /small letters, digits and _ only/));
    const f5 = await workerFlags(wsPort);
    rec.ok('5. a name with a dash is refused in words, nothing sent', !!refused && !('bad-name' in f5), { refused, f5 });

    rec.ok('6. no page error', errors.length === 0, errors);
  } finally {
    await H.liveFlag(wsPort, 'newersave', null).catch(() => {});
    await H.liveFlag(wsPort, 'max_players', null).catch(() => {});
  }
}
