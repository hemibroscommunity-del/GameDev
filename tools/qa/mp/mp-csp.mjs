/* ═══ v2.3.5820: THE PAGE'S CONTENT-SECURITY-POLICY, PLAYED (card SEC2) ═══
 *
 * public/_headers ships a full Content-Security-Policy as REPORT-ONLY (the
 * owner's outside audit, 2026-11-17: a wrong line in an enforced policy is a
 * black screen).  This scenario is what makes switching it on safe: it reads
 * the policy out of public/_headers -- whichever header carries the
 * `default-src` line, report-only today, enforced later -- and plays the game
 * under it ENFORCED, the way a browser would once the header is renamed.
 *
 * The harness's server sends no headers, so the page is opened through a
 * small proxy in front of it that adds the policy to EVERY answer, as
 * public/_headers' `/*` rule does on Pages (the workers' scripts included).
 * Not a Playwright route: a document Playwright fulfils has no address, so
 * Chrome counts it as the public internet and its local-network check then
 * refuses the socket to the local worker (ERR_BLOCKED_BY_LOCAL_NETWORK_
 * ACCESS_CHECKS, seen 2026-11-17 with a wide-open policy too).  The local
 * worker is added to connect-src (the harness points the page at
 * ws://127.0.0.1:PORT; the real page talks to api.brotown.net, which the
 * policy names).  Google's font sheet is answered here with an empty sheet,
 * so the preload's inline onload really runs and its hash is really checked.
 *
 * Checks:
 *   1. the game reaches the world (BroTown) and the renderer runs: PixiJS 8
 *      refuses to start without 'unsafe-eval', the first thing a too-strict
 *      policy breaks;
 *   2. the font preload's inline onload ran (its link became a stylesheet):
 *      the hash in script-src matches index.html;
 *   3. a sentinel fetch to an address off the list IS refused (so the policy
 *      was live and the listener was listening: 4 cannot pass by accident);
 *   4. nothing else was refused, from the door through a walk in the world.
 *
 * The page's workers (png8Worker, bodyBakeWorker, maskedBakeWorker, the
 * ground worker) fetch only the game's own address and use no eval (census
 * 2026-11-17), so 'self' holds them; a violation inside a worker is not seen
 * by the document's listener, and this scenario does not claim to see one.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-17:
 *   - 'unsafe-eval' taken out of public/_headers   -> FAIL 1 and 4 (PixiJS)
 *   - the sha256 hash changed by one letter        -> FAIL 2 and 4
 *   - blob: taken out of img-src                   -> FAIL 4 (the bakes)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, request } from 'node:http';
import * as H from './harness.mjs';
export const lane = 'full';

/** The full policy public/_headers ships: the header line that carries
 *  default-src (the enforced frame-ancestors line does not). */
export function shippedPolicy() {
  const t = readFileSync(join(H.REPO, 'public', '_headers'), 'utf8');
  const m = /^\s+Content-Security-Policy(?:-Report-Only)?:\s*(default-src\b.+)$/m.exec(t);
  return m ? m[1].trim() : null;
}

const SENTINEL = 'https://csp-sentinel.invalid/';

export async function run({ browser, wsPort, webPort, rec }) {
  const shipped = shippedPolicy();
  rec.ok('public/_headers carries a full policy (a default-src line)', !!shipped, shipped);
  if (!shipped) return;
  const local = `ws://127.0.0.1:${wsPort} http://127.0.0.1:${wsPort}`;
  const policy = shipped.replace(/connect-src ([^;]+)/, (_, s) => `connect-src ${s} ${local}`);
  rec.ok('the local worker added to connect-src (the only change from the shipped policy)', policy !== shipped && policy.includes(local), policy);

  /* The proxy: every answer from the harness's server, with the policy on. */
  const proxy = createServer((q, s) => {
    const up = request({ host: '127.0.0.1', port: webPort, path: q.url, method: q.method, headers: q.headers }, (r) => {
      s.writeHead(r.statusCode, { ...r.headers, 'content-security-policy': policy });
      r.pipe(s);
    });
    up.on('error', () => { try { s.writeHead(502); s.end(); } catch (e) { /* gone */ } });
    q.pipe(up);
  });
  const proxyPort = await H.freePort();
  await new Promise((r) => proxy.listen(proxyPort, r));

  /* Every context newPlayer opens gets the listener before the game's first
     script, and an empty font sheet. */
  const realNew = browser.newContext;
  browser.newContext = async function (opts) {
    const ctx = await realNew.call(browser, opts);
    await ctx.addInitScript(() => {
      window.__qaCsp = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        window.__qaCsp.push({ dir: e.effectiveDirective, blocked: String(e.blockedURI || '').slice(0, 160), file: String(e.sourceFile || '').slice(-80), line: e.lineNumber, sample: String(e.sample || '').slice(0, 80) });
      });
    });
    await ctx.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '/* mp-csp: an empty sheet */' }));
    return ctx;
  };

  let P = null;
  try {
    P = await H.newPlayer(browser, { name: 'Warden', wsPort, webPort: proxyPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
    browser.newContext = realNew;
    const errs = [];
    P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
    P.page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
    if (!inW) {
      const snap = await P.page.evaluate(() => { const S = window._gameState && window._gameState.current; return S ? { z: S.currentZone, l: S._zoneLoading, me: !!S.myId } : 'no _gameState'; }).catch((e) => String(e));
      rec.ok('in the world (guard)', false, { snap, errs: errs.slice(-6) });
    }
    /* a walk: the ground worker's pictures and the monsters' looks load as you go */
    for (const k of ['w', 'd', 's', 'a']) await H.nudge(P, k, 700);
    await P.page.waitForTimeout(4000);
    /* the WebGL renderer itself: BroTown.jsx sets __pixiActive true only when
       initPixiRenderer resolves (false when it throws, as PixiJS does with no
       eval).  A canvas alone is not enough: the minimap's 2D one is there
       either way (break proof, 2026-11-17). */
    const gl = await P.page.evaluate(() => ({ active: window.__pixiActive === true, renderer: !!window._pixiRenderer }));
    rec.ok('1. in the world (BroTown) under the enforced policy, the WebGL renderer running', !!inW && gl.active && gl.renderer, { inW, gl, errs: errs.slice(-4) });

    const font = await P.page.evaluate(() => {
      const l = [...document.querySelectorAll('link')].find((x) => /fonts\.googleapis\.com\/css2/.test(x.href) && x.closest('noscript') === null);
      return l ? { rel: l.rel, as: l.getAttribute('as') } : null;
    });
    rec.ok('2. the font preload\'s inline onload ran (its link is now a stylesheet): the hash matches index.html', !!font && font.rel === 'stylesheet', font);

    const before = await P.page.evaluate(() => window.__qaCsp.length);
    await P.page.evaluate((u) => fetch(u).catch(() => 0), SENTINEL);
    await P.page.waitForTimeout(500);
    const seen = await P.page.evaluate(() => window.__qaCsp.slice());
    const sentinel = seen.slice(before).filter((v) => v.dir === 'connect-src' && v.blocked.startsWith(SENTINEL));
    rec.ok('3. a fetch off the list is refused (the policy was live, the listener listening)', sentinel.length === 1, seen.slice(before));

    const others = seen.filter((v) => !v.blocked.startsWith(SENTINEL));
    rec.ok(`4. nothing the game does was refused (${others.length} refusal(s))`, others.length === 0, others.slice(0, 8));
  } finally {
    browser.newContext = realNew;
    if (P) await P.ctx.close().catch(() => {});
    if (proxy.closeAllConnections) proxy.closeAllConnections();
    await new Promise((r) => proxy.close(r));
  }
}
