/* ═══ v2.3.3355: NEW LOGIN KEYS, MADE BY THE WORKER, ON A PHONE ═══
 *
 * Step 2 of the owner's login plan (server/src/loginkeys.js,
 * docs/specs/login-keys.md): eight words the worker hands a phone that comes
 * in with the old key on one of its own devices, kept on the worker only as a
 * fingerprint, and good from ANY device.  On iPhone-sized pages against the
 * harness's worker, nothing in the game stubbed (a browser context is a
 * device; an older phone is stood in for by an init script that takes the
 * join's `kv` off, as mp-rosterink stands in for an older join):
 *   1. a character an older phone made, played again on its own device by
 *      this build: handed a new key -- the device now holds eight words, the
 *      Account card shows them, numbered, and the old key is kept beside it
 *      until a join with the new one gets in (the reload: then it is gone);
 *   2. the new key typed at the door of a NEW phone: it plays, no pass from
 *      the owner -- while the OLD key on another new phone is still the
 *      device lock's (the device screen);
 *   3. a NEW character made by this build: handed a key at its first join;
 *      once that key is used, the key its phone made for itself is retired
 *      (the door says "keychanged" for it);
 *   4. the owner's "Give it a new key" in the Test panel, on the owner's
 *      phone: whoever plays the character is put out with "This Login Key no
 *      longer works", its Use a Login Key button opens the door's key form,
 *      and the key the panel showed plays the character there.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const NEW_KEY = /^[a-z]{3,5}(?:-[a-z]{3,5}){7}$/;

/* An OLDER phone's join: no `kv`, so the worker hands it no key.  Installed
   only on the page standing in for one. */
const OLD_PHONE_JOIN = () => {
  const send = WebSocket.prototype.send;
  WebSocket.prototype.send = function (d) {
    try {
      const m = typeof d === 'string' ? JSON.parse(d) : null;
      if (m && m.type === 'join') { delete m.kv; d = JSON.stringify(m); }
    } catch (e) { /* not ours to reshape */ }
    return send.call(this, d);
  };
};

const ls = (P) => P.page.evaluate(() => ({
  key: localStorage.getItem('bt_passphrase'),
  old: localStorage.getItem('bt_passphrase_old'),
  device: localStorage.getItem('bt_device'),
  id: window._gameState && window._gameState.current && window._gameState.current.myId,
})).catch(() => ({}));

const playing = (page, id, timeout = 90000) => page.waitForFunction((pid) => {
  const S = window._gameState && window._gameState.current;
  return !!(S && S.myId === pid && S.currentZone && S._serverCaps && Object.keys(S._serverCaps).length > 0 && !S._netHold
    && S._realtimeStatus === 'connected');
}, id, { timeout, polling: 500 }).then(() => true).catch(() => false);

/* the door's key form, the way a player opens it: Continue, then USE LOGIN KEY */
async function typeKeyAtDoor(P, key) {
  await P.page.waitForFunction(() => !!document.querySelector('[data-tut="login-key"], [data-tut="char-picker"]'),
    null, { timeout: 30000, polling: 250 }).catch(() => {});
  await H.openPicker(P.page);
  const use = await P.page.waitForSelector('[data-tut="char-usekey"]', { timeout: 10000 }).catch(() => null);
  if (use) { await use.click(); await P.page.waitForTimeout(400); }
  const box = await P.page.waitForSelector('input[placeholder*="Login Key"]', { timeout: 10000 }).catch(() => null);
  if (!box) return false;
  await box.fill(key);
  await Promise.all([
    P.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null),
    P.page.getByRole('button', { name: 'Log in', exact: true }).click(),
  ]);
  return true;
}

/* the owner's Test panel, as mp-devicelock opens it */
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

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. a character an older phone made, on its own device, this build ── */
  const E = await H.newPlayer(browser, { name: 'Oldtimer', wsPort, webPort, viewport: PHONE, touch: true, init: OLD_PHONE_JOIN });
  await H.enterWorld(E);
  const e0 = await ls(E);
  rec.ok('1. a character made by an older phone: in, its key the old kind, no new key handed (guard)',
    !!e0.id && !!e0.key && !NEW_KEY.test(e0.key) && await playing(E.page, e0.id), e0);
  await E.ctx.close().catch(() => {});
  /* the same device (its token), this build's page.  The key is seeded only
     while the page has none: the harness's `phrase` writes it on EVERY load,
     so the reload below would come in with the old key again, as no phone
     does. */
  const A = await H.newPlayer(browser, { name: 'Oldtimer', wsPort, webPort, viewport: PHONE, touch: true, device: e0.device,
    init: `try { if (!localStorage.getItem('bt_passphrase')) localStorage.setItem('bt_passphrase', ${JSON.stringify(e0.key)}); } catch (e) {}` });
  A.seeded = true;   /* a returning player: the door, Continue, its row (as `phrase` marks one) */
  await H.enterWorld(A);
  await A.page.waitForFunction(() => /^[a-z]{3,5}(?:-[a-z]{3,5}){7}$/.test(localStorage.getItem('bt_passphrase') || ''),
    null, { timeout: 20000, polling: 300 }).catch(() => {});
  const a1 = await ls(A);
  rec.ok('1. played again on its own device by this build: handed a new key -- eight words', NEW_KEY.test(a1.key || ''), a1);
  rec.ok('1. ...the same character (the id did not change)', a1.id === e0.id, { before: e0.id, after: a1.id });
  rec.ok('1. ...and the old key kept beside it until a join with the new one gets in', a1.old === e0.key, { old: a1.old });
  /* the Account card, the way a player opens it (mp-loginkey's walk): the
     nav rail's More, then its Login Key tile */
  await A.page.waitForSelector('[data-nav="more"]', { timeout: 10000 }).catch(() => {});
  await A.page.click('[data-nav="more"]').catch(() => {});
  await A.page.waitForTimeout(700);
  await A.page.evaluate(() => {
    const t = document.querySelector('[data-more-tile="account"]');
    if (t) t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  const words = await A.page.evaluate(async () => {
    const find = () => Array.from(document.querySelectorAll('[data-bt="account-keycard-words"] li')).map((li) => (li.textContent || '').replace(/^\d+/, '').trim());
    for (let i = 0; i < 24 && !find().length; i++) await new Promise((r) => setTimeout(r, 250));
    return find();
  }).catch(() => []);
  rec.ok('1. the Account card shows the eight words, numbered, in order', words.length === 8 && words.join('-') === a1.key, { words });
  const note = await A.page.evaluate(() => {
    const el = document.querySelector('[data-bt="account-keycard-device"]');
    return el ? { newkey: el.getAttribute('data-newkey'), text: (el.textContent || '').trim() } : null;
  }).catch(() => null);
  rec.ok('1. ...and says the key works on any phone or computer', !!note && note.newkey === '1' && /any phone or computer/.test(note.text), note);
  await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/newkey-card.png` }).catch(() => {});
  /* the reload: a join with the new key gets in, and the old key goes */
  await A.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(A);
  const inAgain = await playing(A.page, e0.id);
  const a2 = await ls(A);
  rec.ok('1. the reload joins with the new key, and the old one kept beside it is let go', inAgain && a2.key === a1.key && !a2.old, a2);

  /* ── 2. the new key on a new phone; the old key on another ── */
  const B = await H.newPlayer(browser, { name: 'Oldtimer', wsPort, webPort, viewport: PHONE, touch: true, device: 'fresh' });
  const typed = await typeKeyAtDoor(B, a1.key.toUpperCase().replace(/-/g, ' '));
  rec.ok('2. the new key typed at a new phone\'s door (capitals and spaces) (guard)', typed);
  await H.enterWorld(B).catch(() => {});
  rec.ok('2. ...plays the character there, with no pass from the owner', await playing(B.page, e0.id));
  const b1 = await ls(B);
  rec.ok('2. ...the new phone keeps the key in its one spelling', b1.key === a1.key, b1);
  await B.ctx.close().catch(() => {});
  await A.ctx.close().catch(() => {});
  const C = await H.newPlayer(browser, { name: 'Oldtimer', wsPort, webPort, viewport: PHONE, touch: true, device: 'fresh' });
  await typeKeyAtDoor(C, e0.key);
  const cSays = await C.page.evaluate(() => (document.body && document.body.innerText) || '').catch(() => '');
  rec.ok('2. the OLD key on another new phone is still the device lock\'s: refused at the door, with the code',
    /played on a device it was played on before/.test(cSays) && cSays.includes(e0.id), { said: cSays.slice(0, 300) });
  await C.ctx.close().catch(() => {});

  /* ── 3. a new character made by this build ── */
  const N = await H.newPlayer(browser, { name: 'Newbro', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(N);
  await N.page.waitForFunction(() => /^[a-z]{3,5}(?:-[a-z]{3,5}){7}$/.test(localStorage.getItem('bt_passphrase') || ''),
    null, { timeout: 20000, polling: 300 }).catch(() => {});
  const n1 = await ls(N);
  rec.ok('3. a new character: handed a new key at its first join', NEW_KEY.test(n1.key || '') && !!n1.old, n1);
  await N.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(N);
  rec.ok('3. ...the reload plays it with the new key', await playing(N.page, n1.id));
  const door = await fetch(`http://127.0.0.1:${wsPort}/api/account/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phrase: n1.old, device: n1.device }),
  }).then((r) => r.json()).catch(() => null);
  rec.ok('3. ...and the key its phone made for itself is retired (the door: "keychanged")', !!door && door.reason === 'keychanged', door);

  /* ── 4. the owner's "Give it a new key" ── */
  const O = await H.newPlayer(browser, { name: 'Owner', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(O);
  rec.ok('4. the owner\'s Test panel opens on the phone, with Player logins (guard)', await openOwnersPanel(O));
  await O.page.fill('[data-devlock-code]', n1.id);
  const press = async (sel) => { const b = await O.page.$(sel); if (b) { await b.scrollIntoViewIfNeeded().catch(() => {}); await b.click().catch(() => {}); } await O.page.waitForTimeout(700); };
  await press('[data-devlock-newkey]');
  const armed = await O.page.$eval('[data-devlock-newkey]', (b) => (b.textContent || '').trim()).catch(() => '');
  rec.ok('4. "Give it a new key" asks first', armed === 'Sure? Give it a new key', armed);
  await press('[data-devlock-newkey]');
  const given = await O.page.waitForFunction(() => {
    const el = document.querySelector('[data-devlock-newkey-value]');
    return el && el.value ? el.value : null;
  }, null, { timeout: 10000, polling: 250 }).then((h) => h.jsonValue()).catch(() => null);
  rec.ok('4. ...the second tap shows the new key, once', NEW_KEY.test(given || ''), given);
  const up = await N.page.waitForFunction(() => !!(window.__btDeviceScreen && window.__btDeviceScreen.open), null, { timeout: 15000, polling: 250 }).then(() => true).catch(() => false);
  const nScr = await N.page.evaluate(() => {
    const el = document.getElementById('bt-device');
    return {
      mode: el && el.getAttribute('data-mode'),
      title: el ? (el.querySelector('h2') || {}).textContent : '',
      door: !!(el && el.querySelector('.bt-dv-door') && el.querySelector('.bt-dv-door').style.display !== 'none'),
      status: window._gameState && window._gameState.current && window._gameState.current._realtimeStatus,
    };
  }).catch(() => null);
  rec.ok('4. whoever played it is put out: "This Login Key no longer works", with Use a Login Key',
    up && !!nScr && nScr.mode === 'key' && nScr.title === 'This Login Key no longer works' && nScr.door && nScr.status === 'key', nScr);
  await Promise.all([
    N.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null),
    N.page.click('#bt-device .bt-dv-door'),
  ]);
  await typeKeyAtDoor(N, given || '');
  await H.enterWorld(N).catch(() => {});
  rec.ok('4. ...and the key the panel showed plays the character at that door', await playing(N.page, n1.id));
  await O.ctx.close().catch(() => {});
  await N.ctx.close().catch(() => {});
}
