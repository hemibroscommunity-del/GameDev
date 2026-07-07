/* ═══ QA: armored-sprite rendering smoke (v2.3.1196) ═══
 *
 * Protects hand-authored armor art changes: equips a FULL armor set via
 * the same debug/equip path the in-game console uses
 * (window.debug.runCmd('gear <slot> <id>') → gearCatalog.setEquip; the
 * renderer lazy-loads the sheets on the next frame — the exact contract
 * qa-gear-sheet.mjs drives) and asserts the armored player actually
 * RENDERS:
 *
 *   1. every equipped slot's gear sheet fetch succeeded (a renamed /
 *      deleted sprite file 404s BOTH the .webp and the .png fallback and
 *      the renderer silently hides the slot — invisible in any DOM/state
 *      check, so we watch the network);
 *   2. the pixel crop around the player is non-blank (renderer alive,
 *      not a dark canvas — qa-glpixels' drawImage-in-rAF sampling);
 *   3. equipping the set visibly CHANGES the crop vs the bare body,
 *      measured against a bare-vs-bare noise floor (fountain/ambient
 *      motion) so idle scene noise can't fake a pass;
 *   4. no uncaught page errors across equip + a jog burst (a crashed
 *      gear draw path shows up here).
 *
 * The gear set is derived from GEAR_CATALOG (first non-variant item per
 * slot — same convention as qa-gear-sheet's full-set config), so new
 * catalog pieces are covered automatically.
 *
 * Prereqs (same as qa-smoke.mjs): built client at :4173, worker at
 * :8787 (QA_WS_URL=ws://127.0.0.1:8787).  Exits non-zero on any failed
 * check (run-all.mjs fail-fast compatible).
 *
 * CI status: wired into client-ci.yml as REPORT-ONLY (continue-on-error)
 * — authored in a sandbox where npm is policy-blocked (no vite build /
 * wrangler), so it has had no stabilization run against the real client.
 * Promotion criteria: flip it blocking once it holds green (incl. the
 * one workflow retry) for ~10 consecutive CI runs.  The pixel-diff check
 * (3) is the likely flake if any; loosen it before loosening (1)/(2).
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { GEAR_CATALOG, GEAR_SLOTS } from '../../src/rendering/gearCatalog.js';

const SHELL = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const PWCHROME = '/opt/pw-browsers/chromium';
const EXE = process.env.QA_CHROME || (existsSync(SHELL) ? SHELL : (existsSync(PWCHROME) ? PWCHROME : undefined));
const URL = process.env.QA_URL || 'http://localhost:4173/';
const VIEW = { width: 844, height: 390 };
const CROP = { w: 140, h: 170 }; // around the player; heads/weapons extend up more than feet down

let failures = 0;
const check = (name, cond, detail) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (cond ? '' : '  ' + JSON.stringify(detail)));
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Full set: first non-variant item per slot (qa-gear-sheet convention —
   item.variant/item.variantOf marks a recolor; base pieces carry neither). */
const FULL_SET = {};
for (const slot of GEAR_SLOTS) {
  const item = (GEAR_CATALOG[slot] || []).find((c) => c.id !== 'none' && !c.variant && !c.variantOf);
  if (item) FULL_SET[slot] = item.id;
}
console.log('full set:', JSON.stringify(FULL_SET));
if (!Object.keys(FULL_SET).length) { console.error('GEAR_CATALOG has no equippable items'); process.exit(1); }

const browser = await chromium.launch({
  executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio', '--ignore-certificate-errors'],
});
const page = await browser.newPage({ viewport: VIEW });
let pageErrors = 0;
page.on('pageerror', (e) => { pageErrors++; console.log('PAGEERROR', String(e.message).slice(0, 160)); });
/* Watch every gear-sheet fetch: loadWebpOrPng tries .webp then falls back
   to .png, so a slot only truly failed when NO ok response exists for it. */
const gearResponses = [];
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('/sprites/gear/')) gearResponses.push({ url: u.replace(/^.*\/sprites\//, '/sprites/'), ok: r.ok() });
});
if (process.env.QA_WS_URL) {
  await page.addInitScript(`window.BROTOWN_WS_URL = ${JSON.stringify(process.env.QA_WS_URL)};`);
}
/* noresume=1: fresh character straight into town; nodebug=1 keeps the
   floating debug button out of the crop (window.debug stays exposed). */
await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'noresume=1&nodebug=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(6000);
try {
  const input = page.locator('input').first();
  await input.fill('GearBot', { timeout: 60000 });
  await input.press('Enter');
} catch (e) { console.log('login flow issue:', e.message); }

let joined = false;
for (let i = 0; i < 60 && !joined; i++) {
  joined = await page.evaluate(() => !!(window._gameState?.current?.player?.x != null)).catch(() => false);
  if (!joined) await sleep(1000);
}
check('joined', joined);
if (!joined) { await browser.close(); process.exit(1); }
await sleep(2500);

/* Park at the town centre facing south and zero motion (qa-gear-sheet /
   qa-camera pattern — client position is what the local renderer draws). */
const park = () => page.evaluate(() => {
  const S = window._gameState.current;
  S.player.x = 768; S.player.y = 768; S.player.vx = 0; S.player.vy = 0;
  S.stickX = 0; S.stickY = 0;
  S._facingAngle = Math.PI / 2; /* south (entityRenderer SECTORS: i*45°, +y down) */
  S._aimAngle = null; S._lastAimAngle = null;
});

/* Crop sample around the player, taken inside a rAF while the WebGL buffer
   is intact (qa-glpixels pattern; preserveDrawingBuffer is false).  Returns
   a coarse luminance signature (for diffing) + a lit-pixel fraction. */
const sample = () => page.evaluate(({ w, h }) => new Promise((res) => {
  requestAnimationFrame(() => {
    try {
      const S = window._gameState.current;
      const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
      const r = cv.getBoundingClientRect();
      const sx = cv.width / r.width, sy = cv.height / r.height; // CSS px -> backing px
      const cx = (S.player.x - S.camera.x) * sx, cy = (S.player.y - S.camera.y) * sy;
      const GW = 28, GH = 34; // coarse grid: tolerant of subpixel shimmer
      const c2 = document.createElement('canvas');
      c2.width = GW; c2.height = GH;
      const g = c2.getContext('2d');
      g.drawImage(cv, cx - (w / 2) * sx, cy - h * 0.6 * sy, w * sx, h * sy, 0, 0, GW, GH);
      const d = g.getImageData(0, 0, GW, GH).data;
      const sig = [];
      let lit = 0;
      for (let i = 0; i < d.length; i += 4) {
        const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        sig.push(lum);
        if (lum > 15) lit++;
      }
      res({ sig, lit: +(lit / (GW * GH)).toFixed(3) });
    } catch (e) { res({ err: String(e).slice(0, 160) }); }
  });
}), CROP);

const diffFrac = (a, b) => {
  if (!a?.sig || !b?.sig || a.sig.length !== b.sig.length) return null;
  let n = 0;
  for (let i = 0; i < a.sig.length; i++) if (Math.abs(a.sig[i] - b.sig[i]) > 12) n++;
  return +(n / a.sig.length).toFixed(3);
};

/* Equip via the debug console command (the qa-gear-sheet contract) and
   verify the per-slot store took it. */
const setGear = async (equips) => {
  const applied = await page.evaluate((eq) => {
    for (const [slot, id] of Object.entries(eq)) window.debug.runCmd('gear ' + slot + ' ' + id);
    const out = {};
    for (const slot of Object.keys(eq)) out[slot] = localStorage.getItem('bt-gear-v2-' + slot);
    return out;
  }, equips);
  await sleep(1800); // lazy gear-sheet fetches + first armored draw
  return applied;
};

/* ── 1. bare baseline (all slots none) + scene noise floor ── */
await setGear(Object.fromEntries(GEAR_SLOTS.map((s) => [s, 'none'])));
await park();
/* 1.2s: the camera LERPS to the parked position (BroTown camSpeed); the
   crop is computed from live player-camera offset so it stays centered
   either way, but a half-caught-up camera can push the crop past the
   canvas edge (transparent fill -> phantom diff).  qa-camera settles
   ~2.2s from map corners; from the town spawn this is plenty. */
await sleep(1200);
const bare1 = await sample();
await sleep(700);
const bare2 = await sample();
const noise = diffFrac(bare1, bare2);
check('bare crop sampled and non-blank', bare1.lit != null && bare1.lit > 0.05, bare1);

/* ── 2. full armor set on ── */
const applied = await setGear(FULL_SET);
for (const [slot, want] of Object.entries(FULL_SET)) {
  check(`equip stuck: ${slot}=${want}`, applied[slot] === want, applied);
}
await park();
await sleep(600);
const armored = await sample();

/* ── the rendering checks ── */
for (const [slot, item] of Object.entries(FULL_SET)) {
  const hits = gearResponses.filter((r) => r.url.includes(`/sprites/gear/${slot}/${item}/`));
  check(`gear sheets fetched ok: ${slot}/${item}`, hits.some((r) => r.ok),
    { responses: hits.slice(0, 6), total: hits.length });
}
check('armored crop non-blank', armored.lit != null && armored.lit > 0.05, armored);
const armorDiff = diffFrac(bare1, armored);
check('armor visibly renders over the body (crop changed vs bare, above noise floor)',
  armorDiff != null && noise != null && armorDiff > Math.max(0.015, noise * 3),
  { armorDiff, noise });

/* ── 3. jog burst: the jog gear sheets draw without crashing ── */
await page.keyboard.down('d');
await sleep(900);
await page.keyboard.up('d');
await sleep(400);
check('no uncaught page errors', pageErrors === 0, { pageErrors });

console.log(JSON.stringify({ noise, armorDiff, bareLit: bare1.lit, armoredLit: armored.lit, gearResponses: gearResponses.length }, null, 1));
await browser.close();
console.log(failures === 0 ? '\nALL GEAR-SMOKE CHECKS PASSED' : `\n${failures} GEAR-SMOKE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
