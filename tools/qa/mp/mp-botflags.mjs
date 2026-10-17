/* ═══ v2.3.3323: BOT FLAGS IN THE OWNER'S TEST PANEL, ON A PHONE ═══
 *
 * The anti-bot review's fix 9 (docs/specs/antibot-review.md §3: "Nobody sees
 * the flags").  botfp.js has written flags since v2.3.1146; the only way to
 * read them was a curl command with the key in a header no other admin
 * command used.  The Test panel's Bot flags section lists them now.
 *
 * Two players on one worker (the harness's, ADMIN_KEY set): the owner, on a
 * phone, and a second player who is flagged.  What it proves:
 *   1. the section is reachable on the phone (the panel opened by a real,
 *      hit-tested press on the zone title, the key entered) and, with nobody
 *      flagged, it SAYS so -- a blank area reads like a failed request;
 *   2. a flagged player is listed: their name, "online", the flag in words
 *      (the panel's own test flag, planted through the admin route), their
 *      id to kick or freeze by;
 *   3. the same list answers a computer's Bearer key on /api/botstat (the
 *      header OPERATIONS.md teaches; it was x-admin-key only);
 *   4. it fits the phone: no sideways scroll, and a picture
 *      (out/botflags.png).
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
const rows = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-botflag]')).map((el) => ({
  id: el.getAttribute('data-botflag'),
  name: ((el.querySelector('[data-botflag-name]') || {}).textContent || '').trim(),
  why: ((el.querySelector('[data-botflag-why]') || {}).textContent || '').trim(),
  text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
})));

export async function run({ browser, wsPort, webPort, rec }) {
  const admin = async (path, body) => (await (await fetch('http://127.0.0.1:' + wsPort + '/api/admin' + path, {
    method: body ? 'POST' : 'GET',
    headers: Object.assign({ Authorization: 'Bearer ' + H.ADMIN_KEY }, body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  })).json());

  const O = await H.newPlayer(browser, { name: 'FlagOwner', wsPort, webPort, touch: true, viewport: PHONE });
  await H.enterWorld(O);
  const B = await H.newPlayer(browser, { name: 'Botbro', wsPort, webPort, touch: true, viewport: PHONE });
  await H.enterWorld(B);
  const bId = await H.readState(B, (S) => S.myId);
  await O.page.waitForTimeout(2000);

  /* ── 1. the panel, on the phone ── */
  await holdTitle(O, 2000);
  const opened = await waitPanel(O);
  rec.ok('1. a real hit-tested press on the zone title opens the Test panel', opened === true);
  await O.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(O, 'Save key on this device');
  await O.page.waitForTimeout(1200);
  rec.ok('1. the panel offers "Show flagged players"', await tap(O, 'Show flagged players'));
  await O.page.waitForTimeout(1500);
  const empty = await O.page.evaluate(() => {
    const el = document.querySelector('[data-botflags-empty]');
    return el ? (el.textContent || '').trim() : null;
  });
  rec.ok('1. with nobody flagged it says so in words (and that a flag changes nothing)',
    !!empty && /No player is flagged/.test(empty) && /changes nothing/.test(empty), empty);
  rec.ok('1. ...and lists no rows', (await rows(O)).length === 0, await rows(O));

  /* ── 2. a flagged player ── */
  const planted = await admin('/dev/botflag', { playerId: bId });
  rec.ok('2. setup: a test flag planted on the second player (the admin route)', planted.ok === true && planted.flags === 1, planted);
  rec.ok('2. the button now reloads', await tap(O, 'Reload flagged players'));
  await O.page.waitForTimeout(1500);
  const r = await rows(O);
  console.log('    rows: ' + JSON.stringify(r));
  const row = r.find((x) => x.id === bId);
  rec.ok('2. the flagged player is listed by name', !!row && row.name === 'Botbro', r);
  rec.ok('2. ...as online, the flag said in words', !!row && /online/.test(row.text) && /A test flag/.test(row.why), row);
  rec.ok('2. ...with their id to kick or freeze by', !!row && row.text.indexOf(bId) >= 0, row);
  rec.ok('2. ...and nobody else (the owner is not flagged)', r.length === 1, r.map((x) => x.id));

  /* ── 3. the computer's way ── */
  const viaBearer = await fetch('http://127.0.0.1:' + wsPort + '/api/botstat?flagged=1', { headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } });
  const jb = viaBearer.status === 200 ? await viaBearer.json() : null;
  rec.ok('3. /api/botstat?flagged=1 answers the Bearer key OPERATIONS.md teaches', !!jb && Array.isArray(jb.flagged) && jb.flagged.some((x) => x.id === bId),
    { status: viaBearer.status, jb });
  const noKey = await fetch('http://127.0.0.1:' + wsPort + '/api/botstat?flagged=1');
  rec.ok('3. ...and is a 404 to anyone without it', noKey.status === 404, noKey.status);

  /* ── 4. on the phone ── */
  const fit = await O.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  rec.ok('4. the panel fits the phone: no sideways scroll', fit.sw <= fit.iw, fit);
  await O.page.evaluate(() => { const el = document.querySelector('[data-botflag]'); if (el) el.scrollIntoView({ block: 'center' }); });
  await O.page.waitForTimeout(300);
  await O.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/botflags.png` }).catch(() => {});
  rec.ok('4. a picture: tools/qa/mp/out/botflags.png', true);

  await B.ctx.close().catch(() => {});
  await O.ctx.close().catch(() => {});
}
