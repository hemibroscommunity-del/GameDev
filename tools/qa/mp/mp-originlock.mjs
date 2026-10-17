/* ═══ v2.3.3312: ONLY THE GAME'S OWN SITE MAY OPEN A GAME SOCKET, ON A PHONE ═══
 *
 * The worker lets in only the game's own sites (brotown.net, its Pages
 * previews) and a machine's own pages; any other site is told to play at
 * brotown.net and never reaches a room (server/src/origin.js).  A copy of the
 * game on another site sees ui/OriginScreen.js.
 *
 * Two pages, the same build, the same worker (the harness's, ORIGIN_LOCK on as
 * wrangler.toml ships it):
 *   - one at localhost -- a machine's own page -- plays as ever;
 *   - one at http://clone.example: a second browser is launched to find that
 *     name at 127.0.0.1 (--host-resolver-rules), so the page really IS another
 *     site to the browser, and its socket carries `Origin: http://clone.example`
 *     -- the browser's own word, nothing in the page stubbed.
 * What it proves:
 *   1. the local page is let in (the lock leaves the game's own pages alone);
 *   2. the copy is refused: the screen up, "This isn't the official BroTown",
 *      a button to https://brotown.net, the page's own address in the small
 *      print, the socket's status 'origin';
 *   3. it never tries again: one socket in ten seconds, no new identity minted
 *      (the auth path's) and the copy never joined the room (the local player
 *      never sees it);
 *   4. the screen covers the game on an iPhone, with no horizontal scroll;
 *      a picture of it (out/originlock.png).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

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

const screenState = (page) => page.evaluate(() => {
  const el = document.getElementById('bt-origin');
  const go = el && el.querySelector('.bt-og-go');
  const mid = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  const S = window._gameState && window._gameState.current;
  return {
    probe: window.__btOriginScreen || null,
    open: !!el,
    title: el ? (el.querySelector('h2') || {}).textContent : '',
    text: el ? (el.querySelector('.bt-og-text') || {}).textContent : '',
    href: go ? go.getAttribute('href') : '',
    button: go ? go.textContent : '',
    here: el ? (el.querySelector('.bt-og-here') || {}).textContent : '',
    covers: !!(el && mid && el.contains(mid)),
    status: S ? S._realtimeStatus : null,
    phrase: localStorage.getItem('bt_passphrase'),
    prev: localStorage.getItem('bt_passphrase_prev'),
    scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. a machine's own page plays ── */
  const A = await H.newPlayer(browser, { name: 'Homebro', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(A);
  const aStatus = await A.page.evaluate(() => window._gameState.current._realtimeStatus);
  rec.ok('1. a page at localhost is let in: the socket connected, the world up', aStatus === 'connected' && !(await A.page.$('#bt-origin')), aStatus);

  /* ── 2. a copy on another site ── */
  const clone = await H.launch(['--host-resolver-rules=MAP clone.example 127.0.0.1']);
  try {
    const B = await H.newPlayer(clone, { name: 'Copybro', wsPort, webPort, viewport: PHONE, touch: true, host: 'clone.example' });
    const sockets = [];
    B.page.on('websocket', (w) => sockets.push(w.url()));
    const origin = await B.page.evaluate(() => location.origin);
    await pressPlay(B, 'Copybro');
    await B.page.waitForFunction(() => window.__btOriginScreen && window.__btOriginScreen.open, null, { timeout: 45000, polling: 250 });
    const s1 = await screenState(B.page);
    rec.ok('2. the page really is another site to the browser', origin === `http://clone.example:${webPort}`, origin);
    rec.ok("2. the copy is refused: the screen up, \"This isn't the official BroTown\", the status 'origin'",
      s1.open && s1.title === "This isn't the official BroTown" && s1.status === 'origin', s1);
    rec.ok('2. ...a button to the real game, https://brotown.net', s1.href === 'https://brotown.net' && s1.button === 'Play at brotown.net' && /brotown\.net/.test(s1.text), s1);
    rec.ok("2. ...and the small print names the page's own address", s1.here === `This page is at clone.example:${webPort}.`, s1.here);

    /* ── 3. never again ── */
    await B.page.waitForTimeout(10000);
    const s2 = await screenState(B.page);
    rec.ok('3. it never tries again: one socket in ten seconds, still refused', sockets.length === 1 && s2.status === 'origin' && s2.probe.shown === 1, { sockets, status: s2.status, shown: s2.probe && s2.probe.shown });
    rec.ok('3. ...no new identity minted (the key kept, none put aside)', !!s1.phrase && s2.phrase === s1.phrase && !s2.prev, { before: s1.phrase, after: s2.phrase, prev: s2.prev });
    const seen = await A.page.evaluate(() => Object.values(window._gameState.current.others || {}).map((o) => o && o.name));
    rec.ok('3. ...and it never joined the room: the player at home never sees it', !seen.includes('Copybro'), seen);

    /* ── 4. on the phone ── */
    rec.ok('4. the screen covers the game, with no horizontal scroll', s2.covers && s2.scrollW <= s2.innerW, { covers: s2.covers, scrollW: s2.scrollW, innerW: s2.innerW });
    const out = join(H.REPO, 'tools/qa/mp/out');
    mkdirSync(out, { recursive: true });
    await B.page.screenshot({ path: join(out, 'originlock.png') });
    rec.ok('4. a picture: tools/qa/mp/out/originlock.png', true);
    await B.ctx.close();
  } finally {
    await clone.close();
    await A.ctx.close();
  }
}
