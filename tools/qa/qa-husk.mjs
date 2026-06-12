/* v2.3.778 QA: resume resync.  Protocol v2 only sends per-tick monster
 * deltas; a client frozen with a SURVIVING socket misses them forever
 * (invisible monsters that still deal damage).  Assert: after a >5s
 * freeze, _resumeRecover deliberately closes the surviving socket and
 * rejoins -> a NEW WebSocket connect + a NEW full state_sync arrive,
 * 'resume-resync' lands in the crash log, and NO superseded banner shows. */
import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
await page.addInitScript(`
  window.BROTOWN_WS_URL = 'ws://127.0.0.1:8787';
  (() => {
    const Orig = window.WebSocket;
    window.__qaWs = { connects: 0, syncs: 0 };
    function Spy(url, protocols) {
      const sock = protocols !== undefined ? new Orig(url, protocols) : new Orig(url);
      if (String(url).includes('/ws')) {
        window.__qaWs.connects++;
        sock.addEventListener('message', (ev) => {
          try { if (typeof ev.data === 'string' && ev.data.includes('"type":"state_sync"')) window.__qaWs.syncs++; } catch (e) {}
        });
      }
      return sock;
    }
    Spy.prototype = Orig.prototype;
    Spy.CONNECTING = Orig.CONNECTING; Spy.OPEN = Orig.OPEN;
    Spy.CLOSING = Orig.CLOSING; Spy.CLOSED = Orig.CLOSED;
    window.WebSocket = Spy;
  })();
`);
await page.goto('http://localhost:4173/?dev=1&noresume=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);
await page.locator('input').first().fill('HuskBot', { timeout: 30000 });
await page.locator('input').first().press('Enter');
await page.waitForTimeout(18000);

const st = (label) => page.evaluate(() => ({
  ...window.__qaWs,
  status: window._gameState?.current?._realtimeStatus,
  superseded: !!Array.from(document.querySelectorAll('div')).find(d => d.textContent && d.textContent.includes('connected from another window')),
  crash: JSON.parse(localStorage.getItem('bt-crashlog') || '[]').map(e => e.kind),
})).then((s) => { console.log(label, JSON.stringify(s)); return s; });

const pre = await st('pre-freeze: ');

// iOS background simulation: hidden -> frozen 12s (socket survives) -> resume
await page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
const cdp = await ctx.newCDPSession(page);
await cdp.send('Page.enable');
await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
console.log('frozen 12s...');
await new Promise(r => setTimeout(r, 12000));
await cdp.send('Page.setWebLifecycleState', { state: 'active' });
await page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await page.waitForTimeout(8000);

const post = await st('post-resume:');
const ok = pre.status === 'connected'
  && post.connects >= pre.connects + 1   // a fresh socket was opened
  && post.syncs >= pre.syncs + 1         // and a FULL state_sync re-arrived
  && post.status === 'connected'
  && post.superseded === false           // our self-close must not banner
  && post.crash.includes('resume-resync');
console.log('errors:', errs.length, errs.slice(0, 4));
console.log(ok ? 'PASS: long freeze with surviving socket -> forced rejoin -> full resync'
              : 'FAIL (crash kinds above show which branch ran)');
await browser.close();
process.exit(ok ? 0 : 1);
