/* ═══ v2.3.4606: WHICH CHARACTER A TAB PLAYS -- TWO TABS, ONE BROWSER ═══
 *
 * The 2026-11-03 sweep's V5 (src/game/tabIdentity.js).  Two tabs of one
 * browser share one Login Key slot.  Tab 1 plays A; tab 2 presses Create (or
 * types B's key); tab 1's next join -- here a dropped line -- read the slot
 * afresh: with an older key it was refused 'auth' and made a brand-new
 * level-1 A (a wipe to the eye); with a new key it became B and put tab 2 out.
 * Two pages of ONE browser context (one localStorage, one device), iPhone
 * sized, in the world, against the harness's worker; each page's own sockets
 * and joins are watched (a WebSocket that records them, as mp-tabsleep counts
 * its sockets), and a dropped line is the page's own socket closed:
 *   1. an older key (A made by an older phone, as mp-newkey stands one in):
 *      tab 2 presses Create and waits in the creator; tab 1's line drops ->
 *      the takeover's banner, every join tab 1 sent named A with A's key,
 *      no new key, no new id; tab 2's ENTER makes B; tab 1's Play here
 *      plays A again and gives A the slot back; tab 2's next drop -> its
 *      banner, still B;
 *   2. new keys: B made on another phone, its key typed at tab 2's door;
 *      tab 1's line drops -> the banner, never B's id, and tab 2 still
 *      playing B; tab 1's Play here plays A.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const NEW_KEY = /^[a-z]{3,5}(?:-[a-z]{3,5}){7}$/;

/* the page's sockets and the joins it sends, recorded; `old` stands the page
   in for an older phone (no `kv`: the worker hands it no new key) */
const SPY = (old) => `(${function (oldPhone) {
  const W = window.WebSocket;
  window.__qaSocks = [];
  window.__qaJoins = [];
  window.WebSocket = class extends W {
    constructor(...a) { super(...a); window.__qaSocks.push(this); }
    send(d) {
      try {
        const m = typeof d === 'string' ? JSON.parse(d) : null;
        if (m && m.type === 'join') {
          window.__qaJoins.push({ id: m.id, key: m.phrase || null });
          if (oldPhone) { delete m.kv; d = JSON.stringify(m); }
        }
      } catch (e) { /* not ours to read */ }
      return super.send(d);
    }
  };
}})(${old ? 'true' : 'false'});`;

const state = (page) => page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  const b = document.getElementById('bt-resume-banner');
  return {
    id: S && S.myId, status: S && S._realtimeStatus, tabKey: S && S._tabKey,
    slot: localStorage.getItem('bt_passphrase'), prev: localStorage.getItem('bt_passphrase_prev'),
    banner: b ? (b.textContent || '').trim() : null, moved: window.__btTabMoved || 0,
    socks: (window.__qaSocks || []).map((x) => x.readyState + ':' + String(x.url).replace(/^.*\/\//, '').slice(0, 40)),
    vis: document.visibilityState,
    joins: (window.__qaJoins || []).slice(),
  };
}).catch(() => ({}));

const playing = (page, id, timeout = 60000) => page.waitForFunction((pid) => {
  const S = window._gameState && window._gameState.current;
  return !!(S && S.myId === pid && S.currentZone && S._serverCaps && Object.keys(S._serverCaps).length > 0 && !S._netHold
    && S._realtimeStatus === 'connected');
}, id, { timeout, polling: 500 }).then(() => true).catch(() => false);

/* a dropped line: the page's live socket closes under it.  A close the
   local worker does not answer leaves the socket CLOSING for good (seen here:
   30 s and more), so after 1.5 s the page is told what a phone's browser
   tells it when the network goes: an abnormal close, 1006 */
const dropLine = async (page) => {
  /* a page between lines (a reconnect of its own under way) gets 10 s to
     open one; what it holds is kept, to say why when there is none */
  const r = await page.evaluate(async () => {
    const open = () => (window.__qaSocks || []).filter((x) => x.readyState === 1).pop();
    let s = open();
    for (let i = 0; !s && i < 40; i++) { await new Promise((q) => setTimeout(q, 250)); s = open(); }
    const S = window._gameState && window._gameState.current;
    const why = { socks: (window.__qaSocks || []).map((x) => x.readyState), status: S && S._realtimeStatus,
      banner: (document.getElementById('bt-resume-banner') || {}).textContent || null, vis: document.visibilityState };
    if (!s) return { ok: false, why };
    s.close();
    await new Promise((q) => setTimeout(q, 1500));
    if (s.readyState !== 3 && typeof s.onclose === 'function') {
      s.onclose(new CloseEvent('close', { code: 1006, reason: '', wasClean: false }));
    }
    return { ok: true, why };
  }).catch((e) => ({ ok: false, why: String(e).slice(0, 160) }));
  page.__qaDropWhy = r.why;
  /* a page that had already started a reconnect of its own and met the
     takeover's banner has dropped its line too: the checks after say so */
  return r.ok || !!(r.why && /connected from another window/.test(r.why.banner || ''));
};

/* what a tab does after its line drops (the reconnect waits 1-10 s): the
   banner, or a join sent after the drop (`n0` joins before it) */
const settle = (page, n0) => page.waitForFunction((n) => {
  return !!document.getElementById('bt-resume-banner') || (window.__qaJoins || []).length > n;
}, n0, { timeout: 30000, polling: 300 }).then(() => true).catch(() => false);
const joinsNow = async (page) => ((await state(page)).joins || []).length;

const pressPlayHere = (page) => page.evaluate(() => {
  const b = document.querySelector('#bt-resume-banner button');
  if (b) b.click();
  return !!b;
}).catch(() => false);

/* a second tab of the same browser: the harness's page set-up, by hand */
async function secondTab(P, { wsPort, webPort, old }) {
  const page = await P.ctx.newPage();
  await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
  await page.addInitScript(() => {
    window.__btProbe = true; window.__btNoChestOffer = true; window.__btNoNmlOnce = true;
    window.__btTod = 'day'; window.__btAmbienceOff = true; window.__btCoachGapMs = 2600;
  });
  await page.addInitScript(SPY(old));
  await page.goto(`http://localhost:${webPort}/?loginspin=0&manual=0`, { waitUntil: 'domcontentloaded' });
  return { ctx: P.ctx, page, logs: [], name: P.name + '-tab2', seeded: true, touch: true };
}

/* the door's key form, the way a player opens it (mp-newkey's walk) */
async function typeKeyAtDoor(page, key) {
  await page.waitForFunction(() => !!document.querySelector('[data-tut="login-key"], [data-tut="char-picker"]'),
    null, { timeout: 30000, polling: 250 }).catch(() => {});
  await H.openPicker(page);
  const use = await page.waitForSelector('[data-tut="char-usekey"]', { timeout: 10000 }).catch(() => null);
  if (use) { await use.click(); await page.waitForTimeout(400); }
  const box = await page.waitForSelector('input[placeholder*="Login Key"]', { timeout: 10000 }).catch(() => null);
  if (!box) return false;
  await box.fill(key);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null),
    page.getByRole('button', { name: 'Log in', exact: true }).click(),
  ]);
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. an older key: tab 2 presses Create ── */
  const A = await H.newPlayer(browser, { name: 'Annie', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: SPY(true) });
  await H.enterWorld(A);
  await A.page.waitForTimeout(2500);   /* no key_new comes to an older phone: give it the time one would take */
  const a0 = await state(A.page);
  rec.ok('1. tab 1 plays A, on an older key (guard)', !!a0.id && !!a0.slot && !NEW_KEY.test(a0.slot) && a0.tabKey === a0.slot && await playing(A.page, a0.id), a0);

  const T2 = await secondTab(A, { wsPort, webPort, old: true });
  await T2.page.waitForSelector('[data-tut="login-create"], [data-tut="char-picker"]', { timeout: 30000 }).catch(() => {});
  await H.uncoverDoor(T2.page);
  await Promise.all([
    T2.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null),
    T2.page.click('[data-tut="login-create"]').catch(() => {}),
  ]);
  await T2.page.waitForSelector('input.bt-cc-name', { timeout: 30000 }).catch(() => {});
  const kNew = await T2.page.evaluate(() => localStorage.getItem('bt_passphrase')).catch(() => null);
  rec.ok('1. tab 2 pressed Create: a fresh key in the slot, tab 2 in the creator (guard)', !!kNew && kNew !== a0.slot
    && !!(await T2.page.$('input.bt-cc-name')), { kNew: !!kNew, same: kNew === a0.slot });

  const na = await joinsNow(A.page);
  rec.ok('1. tab 1\'s line drops (guard)', await dropLine(A.page), A.page.__qaDropWhy);
  await settle(A.page, na);
  await A.page.waitForTimeout(3000);   /* a mint's second join would come within this */
  const a1 = await state(A.page);
  rec.ok('1. tab 1 shows the takeover\'s banner, "This account connected from another window", Play here instead',
    !!a1.banner && /connected from another window/.test(a1.banner) && /Play here instead/.test(a1.banner) && a1.status === 'superseded' && a1.moved >= 1, a1);
  rec.ok('1. ...every join tab 1 sent named A with A\'s own key: no other key, no new id (no level-1 copy)',
    a1.joins.length >= 1 && a1.joins.every((j) => j.id === a0.id && j.key === a0.slot), a1.joins.map((j) => ({ id: j.id, own: j.key === a0.slot })));
  rec.ok('1. ...tab 1 is still A, and the slot still tab 2\'s new key (nothing minted, nothing stashed)',
    a1.id === a0.id && a1.slot === kNew && a1.tabKey === a0.slot && a1.prev !== kNew, { id: a1.id === a0.id, slot: a1.slot === kNew, prevIsCreates: a1.prev === a0.slot });

  await T2.page.fill('input.bt-cc-name', 'Bobby');
  await T2.page.click('button.bt-cc-play');
  await T2.page.waitForFunction(() => { const S = window._gameState && window._gameState.current; return !!(S && S.myId && S.currentZone); }, null, { timeout: 90000, polling: 500 }).catch(() => {});
  const b0 = await state(T2.page);
  rec.ok('1. tab 2\'s ENTER makes B and plays it (guard)', !!b0.id && b0.id !== a0.id && await playing(T2.page, b0.id), { id: b0.id });

  rec.ok('1. tab 1\'s Play here (guard)', await pressPlayHere(A.page));
  const back = await playing(A.page, a0.id);
  const a2 = await state(A.page);
  rec.ok('1. ...plays A again, with A\'s key, and A has the slot back', back && a2.id === a0.id && a2.slot === a0.slot && !a2.banner
    && a2.joins.every((j) => j.id === a0.id && j.key === a0.slot), { back, id: a2.id === a0.id, slot: a2.slot === a0.slot });

  const nb = await joinsNow(T2.page);
  rec.ok('1. tab 2\'s line drops (guard)', await dropLine(T2.page), T2.page.__qaDropWhy);
  await settle(T2.page, nb);
  await T2.page.waitForTimeout(2000);
  const b1 = await state(T2.page);
  rec.ok('1. ...tab 2 shows the banner, still B: it never became A, never made a character',
    !!b1.banner && b1.id === b0.id && b1.joins.every((j) => j.id === b0.id && j.key === kNew), { banner: b1.banner, id: b1.id === b0.id, joins: b1.joins.length });
  await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/tabidentity-1.png` }).catch(() => {});
  await A.ctx.close().catch(() => {});

  /* ── 2. new keys: B's key typed at tab 2's door ── */
  const B = await H.newPlayer(browser, { name: 'Cara', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: SPY(false) });
  await H.enterWorld(B);
  /* a new character's key comes a moment after its join is in, which on a
     loaded box can be well after the world is up: a minute's grace */
  await B.page.waitForFunction((re) => new RegExp(re).test(localStorage.getItem('bt_passphrase') || ''), NEW_KEY.source, { timeout: 60000, polling: 300 }).catch(() => {});
  const c0 = await state(B.page);
  rec.ok('2. B made on another phone, handed a new key (guard)', NEW_KEY.test(c0.slot || '') && !!c0.id, { id: c0.id });
  await B.ctx.close().catch(() => {});

  const D = await H.newPlayer(browser, { name: 'Dina', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: SPY(false) });
  await H.enterWorld(D);
  /* its own new key, usually: but this road is about B's NEW key in the slot,
     whatever tab 1's own is -- a key_new lost with a line replaced on a slow
     box is not re-made for this device for a while (loginkeys.js REMINT_MS),
     and waiting long for it would log tab 1 out for idling */
  await D.page.waitForFunction((re) => new RegExp(re).test(localStorage.getItem('bt_passphrase') || ''), NEW_KEY.source, { timeout: 20000, polling: 300 }).catch(() => {});
  const d0 = await state(D.page);
  const dIn = await playing(D.page, d0.id);
  const dNow = await state(D.page);
  rec.ok('2. tab 1 plays A, on the key it holds (guard)', !!d0.slot && d0.tabKey === d0.slot && dIn,
    { id: d0.id, newKey: NEW_KEY.test(d0.slot || ''), tabIsSlot: d0.tabKey === d0.slot, playing: dIn, status: dNow.status, socks: dNow.socks, banner: dNow.banner });

  const U2 = await secondTab(D, { wsPort, webPort, old: false });
  rec.ok('2. B\'s key typed at tab 2\'s door (guard)', await typeKeyAtDoor(U2.page, c0.slot));
  await H.enterWorld(U2).catch(() => {});
  rec.ok('2. ...tab 2 plays B (guard)', await playing(U2.page, c0.id));

  const d00 = await state(D.page);
  const n0 = d00.joins.length;   /* its first join came on the key its phone made */
  rec.ok('2. tab 1\'s line drops (guard)', await dropLine(D.page), D.page.__qaDropWhy);
  await settle(D.page, n0);
  await D.page.waitForTimeout(3000);
  const d1 = await state(D.page);
  const u1 = await state(U2.page);
  rec.ok('2. tab 1 shows the takeover\'s banner and never joined as B', !!d1.banner && /connected from another window/.test(d1.banner) && d1.id === d0.id
    && d1.joins.every((j) => j.id === d0.id) && d1.joins.slice(n0).every((j) => j.key === d0.slot),
    { banner: d1.banner, ids: d1.joins.map((j) => j.id === d0.id), after: d1.joins.length - n0, status: d1.status, moved: d1.moved, socks: d1.socks, vis: d1.vis, socks0: d00.socks });
  rec.ok('2. ...and tab 2 is still playing B (not put out)', u1.status === 'connected' && !u1.banner && u1.id === c0.id, { status: u1.status, banner: u1.banner });

  const nd = (await state(D.page)).joins.length;
  rec.ok('2. tab 1\'s Play here (guard)', await pressPlayHere(D.page));
  rec.ok('2. ...plays A again', await playing(D.page, d0.id) && (await state(D.page)).joins.length > nd);
  const d2 = await state(D.page);
  rec.ok('2. ...with A\'s own key, A has the slot back', d2.slot === d0.slot && d2.joins.every((j) => j.id === d0.id), { slot: d2.slot === d0.slot });
  await D.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/tabidentity-2.png` }).catch(() => {});
  await D.ctx.close().catch(() => {});
}
