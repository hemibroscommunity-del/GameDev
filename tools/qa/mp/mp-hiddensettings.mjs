/* ═══ v2.3.3723: THE HIDDEN SETTINGS, ON A PHONE ═══
 *
 * The owner keeps the anti-bot's numbers and the hour caps in the worker's
 * own storage, off the public code (docs/specs/hidden-settings.md,
 * server/src/hidden.js).  server/test/hidden-settings.test.mjs proves the
 * record, its validation and that no message carries a value; this proves the
 * owner can reach and change them on a phone, against the real worker, and
 * reads the real sockets for a leak:
 *   1. the Test panel opened by a real, hit-tested press on the title, the
 *      key entered, its Hidden settings section listed (every row: words,
 *      value, placeholder, range);
 *   2. a value typed and saved on the phone is in force at once (the admin
 *      route reads it back), and a value out of range is refused with the
 *      reason, nothing changed;
 *   3. Reset puts the placeholder back;
 *   4. neither the owner's phone nor a second player's ever received the
 *      saved value or a setting's name over its socket (every frame read);
 *   5. it fits the phone (no sideways scroll), and a picture
 *      (out/hiddensettings.png).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const MARK = 9.137421;   /* FLAG_AT's value for this test: a number nothing else carries */

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
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
const tapText = (P, re) => P.page.evaluate((src) => {
  const rx = new RegExp(src);
  const b = Array.from(document.querySelectorAll('button')).find((n) => rx.test((n.textContent || '').trim()));
  if (!b) return false;
  b.scrollIntoView({ block: 'center' });
  b.click();
  return true;
}, re.source);
const rowOf = (P, name) => P.page.evaluate((n) => {
  const el = document.querySelector('[data-hidden-row="' + n + '"]');
  return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null;
}, name);
const typeInRow = (P, name, v) => P.page.evaluate(([n, val]) => {
  const inp = document.querySelector('[data-hidden-row="' + n + '"] input');
  if (!inp) return false;
  inp.scrollIntoView({ block: 'center' });
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  set.call(inp, val);
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}, [name, v]);
const tapInRow = (P, name, text) => P.page.evaluate(([n, t]) => {
  const b = Array.from(document.querySelectorAll('[data-hidden-row="' + n + '"] button')).find((x) => (x.textContent || '').trim() === t);
  if (!b || b.disabled) return false;
  b.click();
  return true;
}, [name, text]);
/* every frame a page's socket receives, as text */
const tapFrames = (P) => {
  const frames = [];
  P.page.on('websocket', (ws) => ws.on('framereceived', (f) => { if (typeof f.payload === 'string') frames.push(f.payload); }));
  return frames;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const admin = async (method, path, body) => (await (await fetch('http://127.0.0.1:' + wsPort + '/api/admin' + path, {
    method,
    headers: Object.assign({ Authorization: 'Bearer ' + H.ADMIN_KEY }, body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  })).json());

  const O = await H.newPlayer(browser, { name: 'HidOwner', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const oFrames = tapFrames(O);
  await H.enterWorld(O);
  const B = await H.newPlayer(browser, { name: 'HidOther', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const bFrames = tapFrames(B);
  await H.enterWorld(B);
  let inWheel = false;
  for (let i = 0; i < 120 && !inWheel; i++) {
    inWheel = (await H.readState(O, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!inWheel) await O.page.waitForTimeout(500);
  }
  rec.ok('the phone is in the Wheel (guard)', inWheel);
  const stopO = H.keepAlive(O);
  const stopB = H.keepAlive(B);
  await O.page.waitForTimeout(2000);

  /* ── 1. the section ── */
  await holdTitle(O, 2000);
  let opened = false;
  for (let i = 0; i < 30 && !opened; i++) { opened = await panelUp(O); if (!opened) await O.page.waitForTimeout(250); }
  /* one more press if the first landed while a toast or the zone banner sat
     over the title (this box draws a few frames a second) */
  if (!opened) {
    await holdTitle(O, 2000);
    for (let i = 0; i < 30 && !opened; i++) { opened = await panelUp(O); if (!opened) await O.page.waitForTimeout(250); }
  }
  if (!opened) await O.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/hiddensettings-nopanel.png` }).catch(() => {});
  rec.ok('1. a real hit-tested press on the title opens the Test panel', opened);
  await O.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tapText(O, /^Save key on this device$/);
  await O.page.waitForTimeout(1200);
  rec.ok('1. the panel offers "Show hidden settings"', await tapText(O, /^Show hidden settings$/));
  await O.page.waitForTimeout(1500);
  const n = await O.page.evaluate(() => document.querySelectorAll('[data-hidden-row]').length);
  const view = await admin('GET', '/dev/hidden');
  rec.ok('1. every setting is a row', n > 0 && view.ok && n === view.settings.length, { rows: n, settings: view.settings && view.settings.length });
  const flagRow = await rowOf(O, 'FLAG_AT');
  const ph = view.settings.find((s) => s.name === 'FLAG_AT');
  console.log('    FLAG_AT row: ' + flagRow);
  rec.ok('1. a row says what it does, the value in force, the placeholder and the range',
    !!flagRow && /score that flags/.test(flagRow) && flagRow.includes('placeholder ' + ph.placeholder) && flagRow.includes(ph.lo + ' to ' + ph.hi), flagRow);

  /* ── 2. saved on the phone, in force at once ── */
  await typeInRow(O, 'FLAG_AT', String(MARK));
  rec.ok('2. Save is offered once a value is typed', await tapInRow(O, 'FLAG_AT', 'Save'));
  await O.page.waitForTimeout(1500);
  const after = await admin('GET', '/dev/hidden');
  const fa = after.settings.find((s) => s.name === 'FLAG_AT');
  rec.ok('2. the worker has it in force at once', fa.value === MARK && fa.stored === MARK, fa);
  const mine = await rowOf(O, 'FLAG_AT');
  rec.ok('2. ...and the row says it is yours', /\(yours\)/.test(mine || ''), mine);
  await typeInRow(O, 'HARVEST_HOUR_CAP', '10');
  await tapInRow(O, 'HARVEST_HOUR_CAP', 'Save');
  await O.page.waitForTimeout(1500);
  const said = await O.page.evaluate(() => document.body.innerText.match(/HARVEST_HOUR_CAP: [^\n]+/));
  const capNow = (await admin('GET', '/dev/hidden')).settings.find((s) => s.name === 'HARVEST_HOUR_CAP');
  rec.ok('2. a value under its range is refused with the reason, nothing changed', !!said && /must be from/.test(said[0]) && capNow.stored === null, { said, capNow });

  /* ── 4 (first half). the second player keeps playing while it is set ── */
  await B.page.waitForTimeout(3000);

  /* ── 3. Reset ── */
  rec.ok('3. Reset is offered on a stored value', await tapInRow(O, 'FLAG_AT', 'Reset'));
  await O.page.waitForTimeout(1500);
  const back = (await admin('GET', '/dev/hidden')).settings.find((s) => s.name === 'FLAG_AT');
  rec.ok('3. Reset puts the placeholder back', back.stored === null && back.value === back.placeholder, back);

  /* ── 4. nothing hidden over any socket ── */
  const all = oFrames.concat(bFrames).join('\n');
  const names = view.settings.map((s) => s.name).filter((nm) => all.includes(nm));
  rec.ok('4. both phones got frames to read', oFrames.length > 20 && bFrames.length > 20, { o: oFrames.length, b: bFrames.length });
  rec.ok('4. no frame carried the saved value', !all.includes(String(MARK)));
  rec.ok('4. ...or a setting\'s name, or the record\'s key', names.length === 0 && !all.includes('hidden_settings'), names);

  /* ── 5. on the phone ── */
  const fit = await O.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  rec.ok('5. the panel fits the phone: no sideways scroll', fit.sw <= fit.iw, fit);
  await O.page.evaluate(() => { const el = document.querySelector('[data-hidden-row="FLAG_AT"]'); if (el) el.scrollIntoView({ block: 'center' }); });
  await O.page.waitForTimeout(300);
  await O.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/hiddensettings.png` }).catch(() => {});
  rec.ok('5. a picture: tools/qa/mp/out/hiddensettings.png', true);

  stopO(); stopB();
  await B.ctx.close().catch(() => {});
  await O.ctx.close().catch(() => {});
}
