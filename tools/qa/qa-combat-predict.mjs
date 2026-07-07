/* ═══ QA: two-session combat-prediction reconciliation (v2.3.1190) ═══
 *
 * The biggest untested desync class: the LOCAL damage popup is a client
 * prediction (calcWeaponDmg roll in monsterCombat.js — server-computed
 * combat sends only INTENT via `monster_damage` {slot, special,
 * element}), while the server rolls its own damage and answers with the
 * authoritative `monster_hit` {dmg, hpPct}.  If the client's formula
 * mirror drifts from server/src/data.js (the v2.3.1147 sky-spawn class
 * of bug, but for damage), players see numbers that disagree with the
 * HP bar and with what spectators see.  This harness fights one real
 * monster and asserts the three reconciliation surfaces:
 *
 *   1. INTENT→ECHO: A's swings drain the monster's server HP (curHp is
 *      only ever written from monster_hit hpPct in server zones).
 *   2. SPECTATOR TRUTH: B (same zone) renders the SERVER's numbers —
 *      its peer floaters for the target must sum to the same HP drop A
 *      observed (both sides derive from the same authoritative events).
 *   3. PREDICTION BAND: A's predicted total must sit within a wide
 *      sanity band of the server total.  Crit/variance are rolled
 *      independently on each side, so per-hit equality is NOT expected;
 *      the band catches gross formula drift (a rescale landing on one
 *      side only), not roll noise.
 *
 * Route: town spawn → south exit (24,44) → worldview hub → ember
 * trailhead (27,9) → nearest fodder.  Ember is the low-band starter
 * combat zone reachable at level 1 (meadow is not wired into
 * WORLDVIEW_EXITS).  Attack = canvas left-click toward the target
 * (BroTown onMouseDown aims by angle from the screen-centered player).
 *
 * Prereqs (same as qa-facing.mjs): built client at :4173, worker at
 * :8787 (QA_WS_URL=ws://127.0.0.1:8787).  Exits non-zero on any failed
 * check (run-all.mjs fail-fast compatible).
 *
 * CI status (v2.3.1196): wired into client-ci.yml next to qa-facing but
 * REPORT-ONLY (continue-on-error) — still no stabilization run (npm is
 * policy-blocked in the authoring sandboxes, so no vite build /
 * wrangler).  v2.3.1196 also fixed the known flake sources statically:
 * the peer sampler now filters by floater COLOR (the monster's
 * counterattack pushes '-N' popups over A — #ff5e6c, no iconKey —
 * inside the old 160px radius, inflating peerSum) and the prediction
 * band gained small-sample crit-skew margin.  Promotion criteria: flip
 * it blocking once it holds green (incl. the one workflow retry) for
 * ~10 consecutive CI runs; if it flakes, suspect the walk route (town →
 * worldview → ember) before the reconciliation math.
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const SHELL = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
/* v2.3.1196: same fallback order as qa-gear-smoke — QA_CHROME > /tmp
   shell > sandbox-preinstalled chromium > playwright-managed (CI). */
const PWCHROME = '/opt/pw-browsers/chromium';
const EXE = process.env.QA_CHROME || (existsSync(SHELL) ? SHELL : (existsSync(PWCHROME) ? PWCHROME : undefined));
const URL = 'http://localhost:4173/';
const VIEW = { width: 844, height: 390 };

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
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: VIEW });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(label, 'PAGEERROR', e.message.slice(0, 140)));
  if (process.env.QA_WS_URL) {
    await page.addInitScript(`window.BROTOWN_WS_URL = ${JSON.stringify(process.env.QA_WS_URL)};`);
  }
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  const input = page.locator('input').first();
  await input.fill(label, { timeout: 60000 });
  await input.press('Enter');
  for (let i = 0; i < 60; i++) {
    const joined = await page.evaluate(() => window._gameState?.current?.player?.x != null).catch(() => false);
    if (joined) return page;
    await sleep(1000);
  }
  console.log(label, 'FAILED TO JOIN');
  process.exit(1);
}

const snap = (page) => page.evaluate(() => {
  const S = window._gameState.current;
  return { x: S.player.x, y: S.player.y, zone: S.currentZone, hp: S.rpg?.hp ?? null };
});

/* Drive with WASD toward a world-space target until arrival or zone
 * change.  Short bursts + re-read each loop so zone warps (which
 * teleport the player) are picked up immediately. */
async function walkTo(page, tx, ty, { zoneExpect = null, timeoutMs = 45000, arriveDist = 24 } = {}) {
  const t0 = Date.now();
  const held = new Set();
  const setKeys = async (want) => {
    for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
  };
  try {
    while (Date.now() - t0 < timeoutMs) {
      const s = await snap(page);
      if (zoneExpect && s.zone === zoneExpect) return s;
      const dx = tx - s.x, dy = ty - s.y;
      if (!zoneExpect && Math.hypot(dx, dy) < arriveDist) return s;
      const want = new Set();
      if (Math.abs(dx) > 12) want.add(dx > 0 ? 'd' : 'a');
      if (Math.abs(dy) > 12) want.add(dy > 0 ? 's' : 'w');
      if (!want.size) want.add('s'); /* on the spot but wrong zone: nudge */
      await setKeys(want);
      await sleep(220);
    }
    return null;
  } finally {
    await setKeys(new Set());
  }
}

const TILE = 32;
const px = (t) => t * TILE + TILE / 2;

const A = await startSession('PredBotA');
const B = await startSession('PredBotB');

/* ── travel: town → worldview → ember, both sessions ── */
for (const [label, page] of [['A', A], ['B', B]]) {
  const s1 = await walkTo(page, px(24), px(44), { zoneExpect: 'worldview' });
  check(label + ' reached worldview', !!s1, await snap(page));
  if (!s1) { await browser.close(); process.exit(1); }
  const s2 = await walkTo(page, px(27), px(9), { zoneExpect: 'ember' });
  check(label + ' reached ember', !!s2, await snap(page));
  if (!s2) { await browser.close(); process.exit(1); }
}

const serverAuth = await A.evaluate(() => !!window._gameState.current._serverMonsters);
check('ember combat is server-authoritative (_serverMonsters)', serverAuth);
if (!serverAuth) { await browser.close(); process.exit(1); }

/* ── pick A's nearest live fodder ── */
const target = await A.evaluate(() => {
  const S = window._gameState.current;
  const P = S.player;
  const live = (S.monsters || []).filter((m) => m.alive && m.curHp > 0);
  live.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y));
  const m = live[0];
  return m ? { id: m.id, x: m.x, y: m.y, maxHp: m.maxHp, curHp: m.curHp, level: m.level } : null;
});
check('A found a live monster', !!target, target);
if (!target) { await browser.close(); process.exit(1); }
console.log('target', JSON.stringify(target));

const monsterOn = (page) => page.evaluate((id) => {
  const m = (window._gameState.current.monsters || []).find((x) => x.id === id);
  return m ? { x: m.x, y: m.y, curHp: m.curHp, maxHp: m.maxHp, alive: m.alive } : null;
}, target.id);

/* ── floater samplers ──
 * Popups TTL out of S.dmgNumbers in ~1.2s, so sample fast and dedupe by
 * (ts,text,x,y).  A's own melee predictions carry iconKey 'sword'
 * (monsterCombat.js own-hit site); B's peer floaters are the smoothed
 * '-N' entries near the target (gameEvents monster_hit → peer queue). */
function startSampler(page, kind, near) {
  const seen = new Set();
  const out = [];
  let stop = false;
  const loop = (async () => {
    while (!stop) {
      const rows = await page.evaluate(() => (window._gameState.current.dmgNumbers || [])
        .map((d) => ({ x: d.x, y: d.y, text: String(d.text), ts: d.ts, iconKey: d.iconKey || null, color: d.color || null }))).catch(() => []);
      for (const d of rows) {
        const key = d.ts + '|' + d.text + '|' + Math.round(d.x) + '|' + Math.round(d.y);
        if (seen.has(key)) continue;
        seen.add(key);
        if (kind === 'own' && d.iconKey === 'sword' && /^(ZAP )?\d+$/.test(d.text)) {
          out.push({ ...d, dmg: parseInt(d.text.replace(/\D+/g, ''), 10) });
        } else if (kind === 'peer' && /^-\d+$/.test(d.text) && d.iconKey === null
                   && (d.color === '#ff8888' || d.color === '#fbbf24')
                   && Math.hypot(d.x - near.x, d.y - near.y) < 160) {
          /* iconKey null excludes B's OWN damage-taken popups (those
             carry iconKey 'heart'); peer-queue floaters carry none.
             v2.3.1196 stabilization: ALSO filter by the peer-queue
             colors (#ff8888 hit / #fbbf24 crit, gameEvents monster_hit)
             — when the monster fights back, B floats '-N' over A too
             (monster_attack remote-hit feedback, #ff5e6c), and A stands
             within swing range of the target, i.e. inside this radius;
             those inflated peerSum past the ±1/hit tolerance. */
          out.push({ ...d, dmg: parseInt(d.text.slice(1), 10) });
        }
      }
      await sleep(120);
    }
  })();
  return { out, stop: async () => { stop = true; await loop; } };
}

const ownSampler = startSampler(A, 'own');
const peerSampler = startSampler(B, 'peer', target);

/* ── the fight: approach + click-swing until the target is low ──
 * Stop above zero so the server's overkill clamp doesn't skew the
 * totals comparison; a fodder kill mid-fight is tolerated (sums still
 * reconcile because B's floaters mirror the clamped server events). */
let swings = 0;
const t0 = Date.now();
while (Date.now() - t0 < 30000 && swings < 8) {
  const m = await monsterOn(A);
  if (!m || !m.alive || m.curHp <= Math.max(3, m.maxHp * 0.3)) break;
  const s = await snap(A);
  if (s.hp !== null && s.hp <= 0) { console.log('A died mid-fight'); break; }
  const dist = Math.hypot(m.x - s.x, m.y - s.y);
  if (dist > 42) {
    await walkTo(A, m.x, m.y - 8, { timeoutMs: 4000, arriveDist: 36 });
    continue;
  }
  /* aim-click: player renders screen-centered; click a point along the
   * player→monster direction so onMouseDown's angle points at it */
  const ang = Math.atan2(m.y - s.y, m.x - s.x);
  await A.mouse.click(VIEW.width / 2 + Math.cos(ang) * 100, VIEW.height / 2 + Math.sin(ang) * 100);
  swings++;
  await sleep(720); /* SWING_COOLDOWN 600ms + margin */
}

await sleep(2500); /* let monster_hit echoes + B's peer smoothing queue drain */
await ownSampler.stop();
await peerSampler.stop();

const endA = await monsterOn(A);
const endB = await monsterOn(B);
const predicted = ownSampler.out.reduce((t, d) => t + d.dmg, 0);
const peerSum = peerSampler.out.reduce((t, d) => t + d.dmg, 0);
const dropA = endA ? Math.round(target.curHp - Math.max(0, endA.curHp)) : target.curHp;

console.log(JSON.stringify({
  swings,
  predictions: ownSampler.out.map((d) => d.dmg),
  peerFloaters: peerSampler.out.map((d) => d.dmg),
  start: { curHp: target.curHp, maxHp: target.maxHp },
  endA, endB,
}, null, 1));

/* ── the reconciliation checks ── */
check('A landed predicted hits (>=3 sword popups)', ownSampler.out.length >= 3,
  { swings, popups: ownSampler.out.length });
check('server accepted the intent (target HP dropped on A)', dropA > 0,
  { start: target.curHp, endA });
check('A and B agree on the target HP (same authoritative hpPct)',
  !!endA && !!endB && Math.abs(endA.curHp - endB.curHp) <= 1, { endA, endB });
check('B\'s peer floaters sum to the HP drop (±1 per hit rounding)',
  peerSampler.out.length > 0 && Math.abs(peerSum - dropA) <= Math.max(2, peerSampler.out.length),
  { peerSum, dropA, floaters: peerSampler.out.length });
/* v2.3.1196: band widened 0.35–3.0 → 0.30–3.5.  With as few as 3 hits,
   both sides rolling crits + variance independently can legitimately
   graze 3.0 (all-crit high rolls on one side vs crit-less low rolls on
   the other); the band exists to catch a formula RESCALE landing on one
   side only (4x+ / 0.25x-), and this margin keeps roll noise out of it. */
check('prediction within sanity band of server total (0.30x–3.5x)',
  predicted > 0 && dropA > 0 && predicted / dropA >= 0.30 && predicted / dropA <= 3.5,
  { predicted, serverDrop: dropA, ratio: dropA ? +(predicted / dropA).toFixed(2) : null });

await browser.close();
console.log(failures === 0 ? '\nALL COMBAT-PREDICT CHECKS PASSED' : `\n${failures} COMBAT-PREDICT CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
