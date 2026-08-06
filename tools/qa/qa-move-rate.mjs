/* v2.3.1643: TWO-CLIENT POSITION-RATE CHECK
 *
 * Verifies the v2.3.1635 adaptive position rate on the REAL shipped code
 * path, against a REAL worker, with TWO real clients -- the check that was
 * missing when that change merged.
 *
 * The property under test, in the owner's terms: "does multiplayer still
 * look smooth".  Mechanically that is -- when another player shares your
 * zone, are position updates still going out at the full ~30 Hz?  If yes,
 * remote motion is sampled exactly as densely as before and nothing a
 * viewer sees has changed.  The saving is supposed to come only from the
 * case where NOBODY is in your zone to watch.
 *
 * Method: hook WebSocket.prototype.send in the page and timestamp every
 * outgoing `move`.  That measures what actually reaches the wire, not what
 * the code looks like it should do.  The player is walked with a real held
 * keypress, so the game loop produces positions the way it does in play.
 *
 * Requires: a local worker (cd server && npx wrangler dev --port 8787
 * --local) and a built client on :4173.
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const URL = process.env.QA_URL || 'http://127.0.0.1:4173/';
const WS = process.env.QA_WS_URL || 'ws://127.0.0.1:8787';
const EXE = [process.env.QA_CHROME, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']
  .filter(Boolean).find((p) => existsSync(p));

const HOOK = `
  window.__moveLog = [];
  /* Frame counter: headless Chromium on SwiftShader runs the game loop far
     below 60fps, and the loop is what PRODUCES positions -- so the send rate
     is capped by frames, not by the batch window.  Measuring both is the
     only way to tell "the gate throttled it" from "the machine was slow",
     which is exactly the confusion that made the first version of this test
     report a false failure. */
  window.__rafLog = 0;
  (function tick() { window.__rafLog++; requestAnimationFrame(tick); })();
  const _send = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    try {
      if (typeof data === 'string' && data.indexOf('"move"') !== -1) {
        const m = JSON.parse(data);
        if (m && m.type === 'broadcast' && m.event === 'move') window.__moveLog.push(performance.now());
        else if (m && m.type === 'move') window.__moveLog.push(performance.now());
      }
    } catch (e) {}
    return _send.call(this, data);
  };
`;

const browser = await chromium.launch({
  executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio', '--ignore-certificate-errors'],
});

async function newClient(name) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
  const page = await ctx.newPage();
  await page.addInitScript(`window.BROTOWN_WS_URL = ${JSON.stringify(WS)};`);
  await page.addInitScript(HOOK);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  try {
    const input = page.locator('input').first();
    await input.fill(name);
    await input.press('Enter');
  } catch (e) {}
  // Wait for the join to land server-side.
  for (let i = 0; i < 40; i++) {
    const ok = await page.evaluate(() => !!(window._gameState?.current?.player && window._gameState.current.myId)).catch(() => false);
    if (ok) break;
    await page.waitForTimeout(500);
  }
  return { ctx, page };
}

const peersInZone = (page) => page.evaluate(() => {
  const S = window._gameState.current;
  let n = 0;
  for (const id in (S.others || {})) {
    const o = S.others[id]; if (!o) continue;
    const z = o.zone || o.z;
    if (!z || z === S.currentZone) n++;
  }
  return n;
});

/* Walk with a real held key for `ms`, then report the observed send rate. */
async function measure(page, ms) {
  await page.evaluate(() => { window.__moveLog.length = 0; window.__rafLog = 0; });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(ms);
  await page.keyboard.up('KeyD');
  const log = await page.evaluate(() => window.__moveLog.slice());
  const frames = await page.evaluate(() => window.__rafLog);
  const fps = frames / (ms / 1000);
  if (log.length < 2) return { hz: 0, n: log.length, fps };
  const span = (log[log.length - 1] - log[0]) / 1000;
  const gaps = [];
  for (let i = 1; i < log.length; i++) gaps.push(log[i] - log[i - 1]);
  gaps.sort((a, b) => a - b);
  return {
    hz: +((log.length - 1) / span).toFixed(2), n: log.length,
    fps: +fps.toFixed(1),
    medianGap: +gaps[Math.floor(gaps.length / 2)].toFixed(1),
    maxGap: +gaps[gaps.length - 1].toFixed(1),
  };
}

const out = {};
console.log('client A joining…');
const A = await newClient('RateA');
console.log('client B joining (same zone)…');
const B = await newClient('RateB');

// Let presence settle both ways.
for (let i = 0; i < 30; i++) {
  if ((await peersInZone(A.page)) > 0) break;
  await new Promise((r) => setTimeout(r, 500));
}
const seenPeers = await peersInZone(A.page);
console.log(`A sees ${seenPeers} peer(s) in zone`);

console.log('measuring WITH a peer present (7s of walking)…');
out.withPeer = await measure(A.page, 7000);
console.log('  ', out.withPeer);

console.log('closing B, waiting for A to drop the peer…');
await B.ctx.close();
for (let i = 0; i < 40; i++) {
  if ((await peersInZone(A.page)) === 0) break;
  await new Promise((r) => setTimeout(r, 500));
}
const afterPeers = await peersInZone(A.page);
console.log(`A now sees ${afterPeers} peer(s)`);

console.log('measuring ALONE (7s of walking)…');
out.alone = await measure(A.page, 7000);
console.log('  ', out.alone);

await browser.close();

let fail = 0;
const check = (n, c, d) => { console.log((c ? 'PASS ' : 'FAIL ') + n, c ? '' : JSON.stringify(d)); if (!c) fail++; };

console.log('\n── verdict ──');
/* Assertions are RELATIVE TO THE MEASURED FRAME RATE, not to an absolute
   30 Hz.  The game loop produces at most one position per frame, so the
   real ceiling is min(1000/gap, fps) -- on a slow headless box that is the
   fps term, and an absolute threshold would fail a perfectly good build.
   (It did: the first version of this test called a healthy 11 Hz a
   regression, when the pre-change build measured 11.4 Hz on the same
   machine.) */
/* The frame-rate-INDEPENDENT signal is the median gap between sends.
   MOVE_GAP_SOLO_MS is 198: if the solo gate were engaged, no gap could sit
   below it.  So gap < 150 proves the gate is open, and gap >= 165 proves it
   is engaged -- true on any machine, fast or slow.
   (Raw Hz is reported for context but NOT asserted on: it is capped by the
   game loop, which on this headless box runs ~12-24 fps and swings with
   load.  Measured A/B on the same machine, WITH a peer: pre-change 11.4 and
   12.7 Hz, post-change 11.1 and 11.6 Hz -- indistinguishable, which is the
   real evidence that smoothness is untouched.) */
check('a peer was actually present for the first measurement', seenPeers > 0, seenPeers);
check('WITH a peer: gap stays far below the 198ms gate — the gate is OPEN',
  out.withPeer.medianGap < 150,
  { medianGap: out.withPeer.medianGap, hz: out.withPeer.hz, fps: out.withPeer.fps });
check('ALONE: throttled to the ~5 Hz gate, well under what the frames allowed',
  out.alone.hz <= 6.5 && out.alone.hz < out.alone.fps * 0.75,
  { measured: out.alone.hz, fps: out.alone.fps });
check('ALONE: still sending (>2 Hz — never silent; the server keeps tracking)',
  out.alone.hz > 2, out.alone);
check('ALONE gap matches MOVE_GAP_SOLO_MS (198ms) rather than the frame gap',
  out.alone.medianGap >= 165, { medianGap: out.alone.medianGap });

console.log(fail === 0 ? '\nALL CHECKS PASSED' : `\n${fail} CHECK(S) FAILED`);
process.exit(fail ? 1 : 0);
