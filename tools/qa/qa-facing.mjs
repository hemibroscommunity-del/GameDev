/* ═══ QA: two-session facing/broadcast regression (v2.3.1109) ═══
 *
 * Permanent regression check for the multiplayer facing bug class fixed in
 * v2.3.1107 (PR #168): session A moves / stops / changes direction / idles,
 * session B asserts its VIEW of A converges — facing matches A's own
 * rendered facing, the stop rest-packet zeroes velocity (no coast-past
 * backwards-facing flip), and the 1 Hz idle keepalive keeps A's entry
 * fresh while standing still.
 *
 * Prereqs (same as qa-smoke.mjs): built client at :4173, worker at :8787
 * (set QA_WS_URL=ws://127.0.0.1:8787 to point the client at it).
 * Browser: QA_CHROME env > /tmp headless shell > playwright-managed.
 * Exits non-zero on any failed check (run-all.mjs fail-fast compatible).
 *
 * Deliberately NOT covered here: swing/dodge angle reconciliation (needs
 * an attack input + a target; the reconcile path is exercised implicitly
 * by any real fight) and touch-joystick turn-in-place (no synthetic touch
 * gestures in this harness — the idle keepalive check covers the wire
 * side of standing facing delivery).
 */
import { chromium } from 'playwright-core';
import { legacyLogin } from './legacy-login.mjs';
import { existsSync } from 'node:fs';

const SHELL = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const EXE = process.env.QA_CHROME || (existsSync(SHELL) ? SHELL : undefined);
const URL = 'http://localhost:4173/';

let failures = 0;
const check = (name, cond, detail) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (cond ? '' : '  ' + JSON.stringify(detail)));
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio', '--ignore-certificate-errors'],
});

async function startSession(label) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(label, 'PAGEERROR', e.message.slice(0, 140)));
  if (process.env.QA_WS_URL) {
    await page.addInitScript(`window.BROTOWN_WS_URL = ${JSON.stringify(process.env.QA_WS_URL)};`);
  }
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  /* v2.3.1964: the splash has no name box — it has a login door.
     legacyLogin takes the same route a player takes (see
     tools/qa/legacy-login.mjs for what broke and when). */
  await legacyLogin(page, label);
  // wait for join (server-populated player position)
  for (let i = 0; i < 60; i++) {
    const joined = await page.evaluate(() => window._gameState?.current?.player?.x != null).catch(() => false);
    if (joined) return page;
    await sleep(1000);
  }
  console.log(label, 'FAILED TO JOIN');
  process.exit(1);
}

/* poll until fn() is truthy or timeout; returns last value */
async function pollUntil(fn, timeoutMs, intervalMs = 100) {
  const t0 = Date.now();
  let v;
  while (Date.now() - t0 < timeoutMs) {
    v = await fn();
    if (v) return v;
    await sleep(intervalMs);
  }
  return v;
}

const A = await startSession('FaceBotA');
const B = await startSession('FaceBotB');

const aId = await A.evaluate(() => window._gameState.current.myId);
console.log('A joined as', aId);

/* B must see A appear in others */
const seen = await pollUntil(
  () => B.evaluate((id) => !!window._gameState.current.others[id], aId).catch(() => false),
  20000, 250,
);
check('B sees A in others', !!seen);
if (!seen) { await browser.close(); process.exit(1); }

const aOwn = () => A.evaluate(() => ({
  x: window._gameState.current.player.x,
  y: window._gameState.current.player.y,
  f: window._gameState.current._renderFacing || null,
}));
const bViewOfA = () => B.evaluate((id) => {
  const o = window._gameState.current.others[id] || {};
  return {
    x: o.x, y: o.y, vx: o._vx, vy: o._vy,
    f: o._renderFacing || null,
    ageMs: o._lastUpdate ? Date.now() - o._lastUpdate : null,
  };
}, aId);

/* ── 1. run east: B's facing matches A's own rendered facing ── */
await A.keyboard.down('d');
await sleep(1500);
const midRunA = await aOwn();
const midRunB = await pollUntil(async () => {
  const v = await bViewOfA();
  return v.f === midRunA.f ? v : null;
}, 3000);
check('run: B facing matches A (' + midRunA.f + ')', !!midRunB, { aOwn: midRunA, bView: await bViewOfA() });
await A.keyboard.up('d');

/* ── 2. abrupt stop: rest packet zeroes velocity, no backwards flip,
       position converges (the pre-v2.3.1107 coast-past bug) ── */
await sleep(400); // rest packet + a tick or two
const stopA = await aOwn();
const stopB = await pollUntil(async () => {
  const v = await bViewOfA();
  const vZero = Math.abs(v.vx || 0) < 0.5 && Math.abs(v.vy || 0) < 0.5;
  const near = Math.abs(v.x - stopA.x) < 40 && Math.abs(v.y - stopA.y) < 40;
  return vZero && near ? v : null;
}, 2500);
check('stop: rest packet delivered (v≈0, position converged)', !!stopB, { stopA, bView: await bViewOfA() });
const postStop = await bViewOfA();
check('stop: facing preserved, not flipped (' + stopA.f + ')', postStop.f === stopA.f, { aOwn: stopA, bView: postStop });

/* ── 3. direction change: run north, stop — facing follows ── */
await A.keyboard.down('w');
await sleep(1200);
await A.keyboard.up('w');
await sleep(400);
const northA = await aOwn();
const northB = await pollUntil(async () => {
  const v = await bViewOfA();
  return v.f === northA.f ? v : null;
}, 2500);
check('turn: B facing follows A to ' + northA.f, !!northB, { aOwn: northA, bView: await bViewOfA() });

/* ── 4. idle keepalive: A stands still 2.5s, B's entry stays fresh
       (pre-v2.3.1107: total silence while idle => permanently stale) ── */
await sleep(2500);
const idleView = await bViewOfA();
check('idle: keepalive keeps A fresh in B (age ' + idleView.ageMs + 'ms < 1500)',
  idleView.ageMs !== null && idleView.ageMs < 1500, idleView);

console.log(JSON.stringify({ aId, final: { aOwn: await aOwn(), bView: await bViewOfA() } }, null, 1));
await browser.close();
console.log(failures === 0 ? '\nALL FACING CHECKS PASSED' : `\n${failures} FACING CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
