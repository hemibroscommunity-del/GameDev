/* ═══ v2.3.3275: THE ACCOUNT CHECK ON A PHONE ═══
 *
 * A new character proves a person is there: the room refuses the first join
 * of an id it has no record of (join_rejected 'verify', close 4014), the page
 * shows the gate with Cloudflare Turnstile's widget, and the widget's token
 * rides the next join, which the room verifies before the identity is made
 * (server/src/verify.js, src/networking/wsClient.js showVerifyGate).
 *
 * TESTED WITHOUT CLOUDFLARE.  This box has no internet, so:
 *   - a worker of our own is started with the check ON and the verifier's
 *     address pointed at a stand-in on this machine (TURNSTILE_VERIFY_URL,
 *     the one test seam in verify.js), which answers success for the token
 *     'good' and failure for anything else, and records every call;
 *   - the widget is a stand-in too: `window.turnstile` defined before the
 *     page runs (newPlayer's init script), which is the global Cloudflare's
 *     api.js defines -- the gate uses whatever is there before loading
 *     anything, so the page's own code runs unchanged.
 * What it proves:
 *   1. a new character is asked ONCE: the gate shown, the widget rendered
 *      with the room's site key, the token sent to the verifier with the
 *      secret, the gate gone and the player in the world;
 *   2. the same character coming back is never asked: no gate, no widget,
 *      no call;
 *   3. a token the verifier refuses brings the gate back, saying so, with
 *      the player kept out -- and a good one then gets them in;
 *   4. the gate fits an iPhone without a horizontal scroll.
 */
import http from 'node:http';
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* the stand-in widget: one token fired on the first render, then whatever
   the scenario hands `pass` */
const stub = (token) => `
  window.__btTurnstileStub = { renders: [], token: ${JSON.stringify(token)}, pending: null,
    pass: function (t) { var p = this.pending; this.pending = null; if (p) p(t); } };
  window.turnstile = {
    render: function (el, opts) {
      var S = window.__btTurnstileStub;
      S.renders.push({ sitekey: opts.sitekey, theme: opts.theme });
      var n = document.createElement('div'); n.id = 'bt-turnstile-stub'; n.textContent = 'stand-in widget'; el.appendChild(n);
      S.pending = opts.callback;
      if (S.token) { var t = S.token; S.token = null; setTimeout(function () { S.pass(t); }, 300); }
      return 'w' + S.renders.length;
    },
    reset: function () {}, remove: function () {},
  };`;

async function pressPlay(P, name) {
  const { page } = P;
  await page.waitForFunction(() => !!(document.querySelector('input.bt-cc-name') || document.querySelector('[data-tut="login-create"]')),
    null, { timeout: 30000, polling: 250 });
  await H.uncoverDoor(page);
  if (await page.$('[data-tut="login-create"]')) {
    await page.click('[data-tut="login-create"]');
    await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  }
  await page.fill('input.bt-cc-name', name);
  await page.click('button.bt-cc-play');
}
/* admitted = the socket's status says so (wsClient.js _realtimeStatus): the
   page sets its own id and zone before the room has answered, so those two
   alone say nothing about the door */
const inWorld = (P) => P.page.evaluate(() => { const S = window._gameState && window._gameState.current; return !!(S && S._realtimeStatus === 'connected' && S.myId && S.currentZone); });
const gateState = (P) => P.page.evaluate(() => ({
  gate: window.__btVerifyGate || null,
  renders: (window.__btTurnstileStub || {}).renders || [],
  open: !!document.getElementById('bt-verify-gate'),
  text: (document.getElementById('bt-verify-text') || {}).textContent || '',
  scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
}));

export async function run({ browser, webPort, rec }) {
  /* ── the stand-in verifier ── */
  const calls = [];
  const verifier = http.createServer((req, res) => {
    let data = '';
    req.on('data', (d) => { data += d; });
    req.on('end', () => {
      const body = new URLSearchParams(data);
      calls.push({ url: req.url, secret: body.get('secret'), response: body.get('response'), remoteip: body.get('remoteip') });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: body.get('response') === 'good' }));
    });
  });
  const vp = await H.freePort();
  await new Promise((r) => verifier.listen(vp, '127.0.0.1', r));

  /* ── a worker of our own, the check on ── */
  process.env.BT_WRANGLER_VARS = `TURNSTILE_SECRET=test-secret,TURNSTILE_SITEKEY=test-sitekey,TURNSTILE_VERIFY_URL=http://127.0.0.1:${vp}/siteverify`;
  let w;
  try { w = await H.startWorker(await H.freePort()); } finally { delete process.env.BT_WRANGLER_VARS; }
  const wsPort = w.port;
  try {
    /* ── 1. a new character ── */
    const A = await H.newPlayer(browser, { name: 'Newbro', wsPort, webPort, init: stub('good'), viewport: PHONE, touch: true });
    await H.enterWorld(A);
    const gA = await gateState(A);
    rec.ok('a new character is asked once: the gate shown, the stand-in widget rendered with the room\'s site key, dark',
      gA.gate && gA.gate.shown === 1 && gA.gate.tokens === 1 && gA.renders.length === 1 && gA.renders[0].sitekey === 'test-sitekey' && gA.renders[0].theme === 'dark', gA);
    rec.ok('...the token went to the verifier with the secret, once', calls.length === 1 && calls[0].url === '/siteverify' && calls[0].secret === 'test-secret' && calls[0].response === 'good', calls);
    rec.ok('...the gate is gone and the player is in the world', !gA.open && (await inWorld(A)), gA);
    const phrase = await A.page.evaluate(() => localStorage.getItem('bt_passphrase'));
    const myId = await A.page.evaluate(() => window._gameState.current.myId);
    await A.ctx.close();

    /* ── 2. the same character, coming back ── */
    const A2 = await H.newPlayer(browser, { name: 'Newbro', wsPort, webPort, phrase, init: stub('good'), viewport: PHONE, touch: true });
    await H.enterWorld(A2);
    const gA2 = await gateState(A2);
    const id2 = await A2.page.evaluate(() => window._gameState.current.myId);
    rec.ok('the same character coming back is never asked: no gate, no widget, no call', !gA2.gate && gA2.renders.length === 0 && calls.length === 1 && id2 === myId, { gA2, calls: calls.length, id2, myId });
    await A2.ctx.close();

    /* ── 3. a token the verifier refuses ── */
    const B = await H.newPlayer(browser, { name: 'Badbro', wsPort, webPort, init: stub('bad'), viewport: PHONE, touch: true });
    await pressPlay(B, 'Badbro');
    await B.page.waitForFunction(() => window.__btVerifyGate && window.__btVerifyGate.shown >= 2, null, { timeout: 45000, polling: 250 });
    const gB = await gateState(B);
    rec.ok('a refused token brings the gate back, saying so, the widget rendered again',
      gB.gate.shown === 2 && gB.open && /didn't go through/.test(gB.text) && gB.renders.length === 2, gB);
    rec.ok('...the verifier saw the bad token and said no', calls.some((c) => c.response === 'bad') && calls.length === 2, calls);
    rec.ok('...and the player is held at the door, not in the world', !(await inWorld(B)) && (await B.page.evaluate(() => window._gameState.current._realtimeStatus)) === 'verify');
    rec.ok('the gate fits the phone with no horizontal scroll', gB.scrollW <= gB.innerW, { scrollW: gB.scrollW, innerW: gB.innerW });
    /* a good token now */
    await B.page.evaluate(() => window.__btTurnstileStub.pass('good'));
    await B.page.waitForFunction(() => { const S = window._gameState && window._gameState.current; return !!(S && S._realtimeStatus === 'connected' && S.myId && S.currentZone); }, null, { timeout: 90000, polling: 500 });
    const gB2 = await gateState(B);
    rec.ok('...and a good one gets them in, the gate gone', !gB2.open && gB2.gate.tokens === 2 && calls.length === 3 && calls[2].response === 'good', { gB2, calls });
    await B.ctx.close();
  } finally {
    await H.stopWorker(w);
    verifier.close();
  }
}
