/* ═══ v2.3.3343: A CHARACTER'S KEY WORKS ON THE DEVICES IT IS PLAYED ON, ON A PHONE ═══
 *
 * A character's Login Key works only on the devices it has been played on
 * (server/src/devicelock.js, docs/specs/device-lock.md).  On an iPhone-sized
 * page, against the harness's worker, with nothing in the pages stubbed (a
 * browser context is a device: it makes its own `bt_device` token):
 *   1. a character made on its own phone plays as ever;
 *   2. its key on a NEW phone: the character's row is tapped and the join is
 *      refused -- the screen "This character is played on another device"
 *      with the character's code, covering the game with no horizontal
 *      scroll; the key kept (no new identity), one socket and no tries of its
 *      own; and the phone at home still playing;
 *   3. the owner lets one new device in (the Test panel's Player logins), the
 *      new phone's Try again plays the character;
 *   4. the pass is spent: a third phone with the key is refused;
 *   5. the owner's own Test panel, on the owner's phone (a real press on the
 *      zone title, the key entered): Forget all its devices, two taps, for a
 *      character someone else got into -- whoever plays it is put out with
 *      the same screen and LEAVES the world (the owner stops seeing it), its
 *      Try again is refused; then Let one new device in, and its Try again
 *      plays it.
 * A picture of the screen: tools/qa/mp/out/devicelock.png.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const screenState = (page) => page.evaluate(() => {
  const el = document.getElementById('bt-device');
  const mid = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  const S = window._gameState && window._gameState.current;
  return {
    probe: window.__btDeviceScreen || null,
    open: !!el,
    title: el ? (el.querySelector('h2') || {}).textContent : '',
    code: el ? (el.querySelector('.bt-dv-code') || {}).textContent : '',
    retry: !!(el && el.querySelector('.bt-dv-retry')),
    covers: !!(el && mid && el.contains(mid)),
    status: S ? S._realtimeStatus : null,
    phrase: localStorage.getItem('bt_passphrase'),
    prev: localStorage.getItem('bt_passphrase_prev'),
    scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
  };
}).catch(() => null);

/* who a page is playing, once the worker's state_sync is in */
const playing = (page, id, timeout = 90000) => page.waitForFunction((pid) => {
  const S = window._gameState && window._gameState.current;
  return !!(S && S.myId === pid && S.currentZone && S._serverCaps && Object.keys(S._serverCaps).length > 0 && !S._netHold
    && S._realtimeStatus === 'connected');
}, id, { timeout, polling: 500 }).then(() => true).catch(() => false);

const screenUp = (page, timeout = 45000) => page.waitForFunction(
  () => !!(window.__btDeviceScreen && window.__btDeviceScreen.open), null, { timeout, polling: 250 },
).then(() => true).catch(() => false);

/* The Test panel, as the owner opens it (mp-botflags): a held press on the
   zone title, the admin key entered and saved. */
async function openOwnersPanel(P) {
  const at = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-zone-header__title');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (!at) return false;
  await P.page.mouse.move(at.x, at.y);
  await P.page.mouse.down();
  await P.page.waitForTimeout(2000);
  await P.page.mouse.up();
  const open = await P.page.waitForFunction(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'),
    null, { timeout: 8000, polling: 250 }).then(() => true).catch(() => false);
  if (!open) return false;
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    const save = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').trim() === 'Save key on this device');
    if (save) save.click();
  }, H.ADMIN_KEY);
  return P.page.waitForSelector('[data-devlock-code]', { timeout: 8000 }).then(() => true).catch(() => false);
}

/* a Player logins button, pressed as a thumb presses it (scrolled into view,
   hit-tested by the browser) */
async function pressPanel(P, sel) {
  const b = await P.page.$(sel);
  if (!b) return false;
  await b.scrollIntoViewIfNeeded().catch(() => {});
  await b.click().catch(() => {});
  await P.page.waitForTimeout(600);
  return true;
}

const panelSays = (P, re, timeout = 8000) => P.page.waitForFunction((src) => new RegExp(src).test((document.body && document.body.innerText) || ''),
  re.source, { timeout, polling: 250 }).then(() => true).catch(() => false);

/* A phone holding the key lands on the door (v2.3.2447) and takes the road a
   player takes: Continue, then the character's row. */
async function tapItsRow(P) {
  await P.page.waitForFunction(() => !!document.querySelector('[data-tut="login-key"], [data-tut="char-picker"]'),
    null, { timeout: 30000, polling: 250 }).catch(() => {});
  if (!(await H.openPicker(P.page))) return false;
  const row = await P.page.waitForSelector('[data-tut="char-row"][data-char-active="1"]', { timeout: 15000 }).catch(() => null);
  if (!row) return false;
  await row.click();
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. its own phone ── */
  const A = await H.newPlayer(browser, { name: 'Homebody', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(A);
  const a = await A.page.evaluate(() => ({
    id: window._gameState.current.myId,
    key: localStorage.getItem('bt_passphrase'),
    device: localStorage.getItem('bt_device'),
  }));
  rec.ok('1. a character plays on the phone it was made on (guard)',
    !!(a.id && a.key && a.device) && await playing(A.page, a.id), a);

  /* ── 2. its key on a new phone ── */
  const B = await H.newPlayer(browser, { name: 'Homebody', wsPort, webPort, viewport: PHONE, touch: true, phrase: a.key, device: 'fresh' });
  const sockets = [];
  B.page.on('websocket', (w) => sockets.push(w.url()));
  const bDevice = await B.page.evaluate(() => localStorage.getItem('bt_device')).catch(() => null);
  rec.ok('2. the new phone holds the key, and a device token of its own (guard)', bDevice !== a.device, { a: a.device, b: bDevice });
  const tapped = await tapItsRow(B);
  rec.ok('2. the character list shows the character, and its row is tapped (guard)', tapped);
  const up = await screenUp(B.page);
  const s1 = await screenState(B.page);
  rec.ok('2. the join is refused: "This character is played on another device", the status \'device\'',
    up && s1 && s1.open && s1.title === 'This character is played on another device' && s1.status === 'device', s1);
  rec.ok('2. ...with the character\'s code to give the owner, and a Try again', !!s1 && s1.code === a.id && s1.retry, { code: s1 && s1.code, id: a.id });
  rec.ok('2. ...covering the game, with no horizontal scroll', !!s1 && s1.covers && s1.scrollW <= s1.innerW, s1);
  await B.page.waitForTimeout(8000);
  const s2 = await screenState(B.page);
  rec.ok('2. no tries of its own: one socket in eight seconds, still refused',
    sockets.length === 1 && !!s2 && s2.status === 'device' && s2.probe && s2.probe.shown === 1, { sockets: sockets.length, status: s2 && s2.status, shown: s2 && s2.probe && s2.probe.shown });
  rec.ok('2. ...and the key kept: no new identity made, none put aside', !!s2 && s2.phrase === a.key && !s2.prev, { phrase: s2 && s2.phrase, prev: s2 && s2.prev });
  rec.ok('2. ...while the phone at home plays on', await playing(A.page, a.id, 5000));
  const out = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(out, { recursive: true });
  await B.page.screenshot({ path: join(out, 'devicelock.png') });
  rec.ok('2. a picture: tools/qa/mp/out/devicelock.png', true);
  await A.ctx.close().catch(() => {});

  /* ── 3. the owner lets one new device in ── */
  const pass = await H.letDeviceIn(wsPort, a.id).catch((e) => ({ error: String(e) }));
  rec.ok('3. the owner lets one new device in (guard)', !!(pass && pass.ok), pass);
  await Promise.all([
    B.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
    B.page.click('#bt-device .bt-dv-retry'),
  ]);
  rec.ok('3. Try again: the new phone plays the character', await playing(B.page, a.id));

  /* ── 4. the pass let in one ── */
  const C = await H.newPlayer(browser, { name: 'Homebody', wsPort, webPort, viewport: PHONE, touch: true, phrase: a.key, device: 'fresh' });
  await tapItsRow(C);
  const cUp = await screenUp(C.page);
  const c1 = await screenState(C.page);
  rec.ok('4. the pass is spent: a third phone with the key is refused', cUp && !!c1 && c1.status === 'device' && c1.code === a.id, c1);
  await C.ctx.close().catch(() => {});

  /* ── 5. the owner's own Test panel: forget all its devices, then let one in ── */
  const O = await H.newPlayer(browser, { name: 'Owner', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(O);
  const seen = await O.page.waitForFunction((pid) => {
    const S = window._gameState && window._gameState.current;
    return !!(S && S.others && S.others[pid]);
  }, a.id, { timeout: 30000, polling: 500 }).then(() => true).catch(() => false);
  rec.ok('5. the owner sees the character in the world (guard)', seen);
  rec.ok('5. the owner\'s Test panel opens on the phone, with Player logins (guard)', await openOwnersPanel(O));
  await O.page.fill('[data-devlock-code]', a.id);
  await pressPanel(O, '[data-devlock-forget]');
  const armed = await O.page.$eval('[data-devlock-forget]', (b) => (b.textContent || '').trim()).catch(() => '');
  rec.ok('5. Forget asks first: "Sure? Forget all its devices"', armed === 'Sure? Forget all its devices', armed);
  await pressPanel(O, '[data-devlock-forget]');
  rec.ok('5. the second tap forgets both its devices and puts its player out',
    await panelSays(O, new RegExp('Forgot 2 devices for ' + a.id + ' and put its player out')));
  const bUp = await screenUp(B.page, 15000);
  const b1 = await screenState(B.page);
  rec.ok('5. ...whoever plays it is put out, with the same screen', bUp && !!b1 && b1.status === 'device' && b1.code === a.id, b1);
  const gone = await O.page.waitForFunction((pid) => {
    const S = window._gameState && window._gameState.current;
    return !!(S && S.others && !S.others[pid]);
  }, a.id, { timeout: 20000, polling: 500 }).then(() => true).catch(() => false);
  rec.ok('5. ...and leaves the world: the owner no longer sees it', gone);
  await Promise.all([
    B.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
    B.page.click('#bt-device .bt-dv-retry'),
  ]);
  const again = await screenUp(B.page);
  const b2 = await screenState(B.page);
  rec.ok('5. its Try again is refused: no device of its own is known now', again && !!b2 && b2.status === 'device', b2);
  await pressPanel(O, '[data-devlock-pass]');
  rec.ok('5. the panel\'s Let one new device in says until when, and what to tell the player',
    await panelSays(O, new RegExp('One new device can join ' + a.id + ' until .+ Ask its player to tap Try again')));
  await Promise.all([
    B.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
    B.page.click('#bt-device .bt-dv-retry'),
  ]);
  rec.ok('5. ...and its Try again plays the character', await playing(B.page, a.id));
  await O.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
