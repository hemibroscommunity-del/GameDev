import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://localhost:4173/';
const SPY = `(() => {
  const Orig = window.WebSocket;
  let n = 0;
  window.WebSocket = function (url, protos) {
    const ws = protos ? new Orig(url, protos) : new Orig(url);
    const tag = 'WS#' + (++n);
    console.warn('[spy] ' + tag + ' OPEN_REQ ' + url.slice(0, 90));
    ws.addEventListener('open', () => console.warn('[spy] ' + tag + ' OPEN'));
    ws.addEventListener('close', (e) => console.warn('[spy] ' + tag + ' CLOSE code=' + e.code + ' reason=' + (e.reason || '(none)')));
    return ws;
  };
  window.WebSocket.prototype = Orig.prototype;
  Object.assign(window.WebSocket, Orig);
})()`;
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio', '--ignore-certificate-errors'] });

async function startSession(label, context) {
  const page = await context.newPage();
  const events = [];
  page.on('console', (m) => {
    const t = m.text();
    if (t.includes('[spy]') || m.type() === 'error' || t.includes('superseded') || t.includes('bt-crash'))
      events.push(label + ' ' + t.slice(0, 160));
  });
  page.on('pageerror', (e) => console.log(label, 'PAGEERR-EARLY', e.message.slice(0, 200)));
  page.on('pageerror', (e) => events.push(label + ' PAGEERROR ' + e.message.slice(0, 140)));
  await page.addInitScript(SPY);
  await page.addInitScript(() => { window.BROTOWN_WS_URL = 'ws://127.0.0.1:8787'; });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: '/tmp/qa2s-' + label + '.png' });
  console.log(label, 'body:', (await page.evaluate(() => document.body.innerText.slice(0, 120)).catch(() => 'EVALFAIL')));
  const input = page.locator('input').first();
  await input.fill(label, { timeout: 60000 });
  await input.press('Enter');
  return { page, events };
}

const ctxA = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 844, height: 390 } });
let A;
try { A = await startSession('BotA', ctxA); }
catch (e) { console.log('A failed:', e.message); process.exit(1); }
await A.page.waitForTimeout(20000);   // A fully in game
const stateOf = (p) => p.evaluate(() => ({
  zone: window._gameState?.current?.currentZone,
  hasMap: !!window._gameState?.current?.map,
  status: window._gameState?.current?._realtimeStatus,
  others: Object.keys(window._gameState?.current?.others || {}).length,
})).catch(() => null);
console.log('A pre:', JSON.stringify(await stateOf(A.page)));

// second session, SEPARATE context (= the user's "two browsers")
const ctxB = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 844, height: 390 } });
const B = await startSession('BotB', ctxB);
await B.page.waitForTimeout(25000);
console.log('A post-B-join:', JSON.stringify(await stateOf(A.page)));
console.log('B state:', JSON.stringify(await stateOf(B.page)));
await A.page.waitForTimeout(20000);
console.log('A late:', JSON.stringify(await stateOf(A.page)));
console.log('B late:', JSON.stringify(await stateOf(B.page)));
console.log('--- events A ---'); A.events.slice(-25).forEach(e => console.log(e));
console.log('--- events B ---'); B.events.slice(-25).forEach(e => console.log(e));
await browser.close();
