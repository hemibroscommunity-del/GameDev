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
 *   3. equipping the set visibly CHANGES the crop vs the bare body.
 *      v2.3.1196b (first real-CI run): a raw per-cell luminance diff
 *      drowned in idle/scene animation (bare-vs-bare noise hit 0.602;
 *      the armored diff 0.632 beat it only barely), so the GATING
 *      metric is now a COLOR-HISTOGRAM distance — position- and
 *      phase-invariant: a bobbing/animating sprite keeps its color
 *      mass, steel plate over skin/shirt shifts it.  Both states are
 *      sampled as multi-frame BURSTS: the noise floor is the MAXIMUM
 *      bare-vs-bare pair (conservative), the armor signal the MINIMUM
 *      armored-vs-bare pair (also conservative).  The old grid diff is
 *      still computed min-over-burst and reported as diagnostics only;
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
 * CI status: wired into client-ci.yml as REPORT-ONLY (continue-on-error).
 * First real-CI run: everything passed except the old pixel-diff metric
 * (replaced, see above).  Promotion criteria: flip it blocking once it
 * holds green (incl. the one workflow retry) for ~10 consecutive CI
 * runs.  If check 3 still flakes, the printed noise/armor numbers say
 * whether the scene (noise up) or the metric (armor down) moved.
 */
import { chromium } from 'playwright-core';
import { legacyLogin } from './legacy-login.mjs';
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
/* v2.3.1964: the splash has no name box — it has a login door.
   legacyLogin takes the same route a player takes (see
   tools/qa/legacy-login.mjs for what broke and when). */
try {
  await legacyLogin(page, 'GearBot');
} catch (e) { console.log('login flow issue:', e.message); }

let joined = false;
for (let i = 0; i < 60 && !joined; i++) {
  joined = await page.evaluate(() => !!(window._gameState?.current?.player?.x != null)).catch(() => false);
  if (!joined) await sleep(1000);
}
check('joined', joined);
if (!joined) { await browser.close(); process.exit(1); }
await sleep(2500);

/* Park facing south with zero motion (qa-gear-sheet / qa-camera pattern —
   client position is what the local renderer draws).  v2.3.1196b: parked
   at (768,420) — an open patch clear of the building rects (buildings.js)
   and away from the spawn point, where lingering remote sprites from the
   earlier CI harnesses (and whatever animates at the map centre) sat
   inside the crop and churned the old metric. */
const park = () => page.evaluate(() => {
  const S = window._gameState.current;
  S.player.x = 768; S.player.y = 420; S.player.vx = 0; S.player.vy = 0;
  S.stickX = 0; S.stickY = 0;
  S._facingAngle = Math.PI / 2; /* south (entityRenderer SECTORS: i*45°, +y down) */
  S._aimAngle = null; S._lastAimAngle = null;
});

/* Crop sample around the player, taken inside a rAF while the WebGL buffer
   is intact (qa-glpixels pattern; preserveDrawingBuffer is false).
   Returns a coarse luminance grid (diagnostic diff), a 64-bin RGB
   histogram (the gating metric), and a lit-pixel fraction. */
const sample = () => page.evaluate(({ w, h }) => new Promise((res) => {
  requestAnimationFrame(() => {
    try {
      const S = window._gameState.current;
      const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
      const r = cv.getBoundingClientRect();
      const sx = cv.width / r.width, sy = cv.height / r.height; // CSS px -> backing px
      const cx = (S.player.x - S.camera.x) * sx, cy = (S.player.y - S.camera.y) * sy;
      /* histogram from a mid-res crop (not the coarse grid — cell
         averaging washes colors out); grid from a downsample of it */
      const CW = 70, CH = 85;
      const c2 = document.createElement('canvas');
      c2.width = CW; c2.height = CH;
      const g = c2.getContext('2d');
      g.drawImage(cv, cx - (w / 2) * sx, cy - h * 0.6 * sy, w * sx, h * sy, 0, 0, CW, CH);
      const d = g.getImageData(0, 0, CW, CH).data;
      const hist = new Array(64).fill(0);
      let lit = 0;
      for (let i = 0; i < d.length; i += 4) {
        hist[(d[i] >> 6) * 16 + (d[i + 1] >> 6) * 4 + (d[i + 2] >> 6)]++;
        if (d[i] + d[i + 1] + d[i + 2] > 45) lit++;
      }
      const n = CW * CH;
      const c3 = document.createElement('canvas');
      c3.width = 28; c3.height = 34;
      const g3 = c3.getContext('2d');
      g3.drawImage(c2, 0, 0, 28, 34);
      const d3 = g3.getImageData(0, 0, 28, 34).data;
      const sig = [];
      for (let i = 0; i < d3.length; i += 4) {
        sig.push(Math.round(0.299 * d3[i] + 0.587 * d3[i + 1] + 0.114 * d3[i + 2]));
      }
      res({ sig, hist: hist.map((v) => v / n), lit: +(lit / n).toFixed(3) });
    } catch (e) { res({ err: String(e).slice(0, 160) }); }
  });
}), CROP);

/* Burst of frames at IRREGULAR gaps so a looping idle animation is caught
   at spread-out phases — min-pairing across bursts then compares frames
   at (near-)matched phase. */
async function sampleBurst(n = 5) {
  const frames = [];
  for (let i = 0; i < n; i++) {
    const f = await sample();
    if (f && f.hist) frames.push(f);
    await sleep(210 + i * 70);
  }
  return frames;
}

/* Total-variation distance between two normalized histograms (0..1). */
const histDist = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.hist.length; i++) s += Math.abs(a.hist[i] - b.hist[i]);
  return +(s / 2).toFixed(4);
};
/* Diagnostic per-cell luminance diff fraction. */
const gridDiff = (a, b) => {
  if (!a?.sig || !b?.sig || a.sig.length !== b.sig.length) return null;
  let n = 0;
  for (let i = 0; i < a.sig.length; i++) if (Math.abs(a.sig[i] - b.sig[i]) > 12) n++;
  return +(n / a.sig.length).toFixed(3);
};
const overPairs = (as, bs, fn, pick) => {
  let best = null;
  for (let i = 0; i < as.length; i++) {
    for (let j = 0; j < bs.length; j++) {
      if (as === bs && j <= i) continue;
      const v = fn(as[i], bs[j]);
      if (v == null) continue;
      best = best == null ? v : pick(best, v);
    }
  }
  return best;
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

/* ── 1. bare baseline burst (all slots none) → scene noise floor ── */
await setGear(Object.fromEntries(GEAR_SLOTS.map((s) => [s, 'none'])));
await park();
/* 1.2s: the camera LERPS to the parked position (BroTown camSpeed); the
   crop is computed from live player-camera offset so it stays centered
   either way, but a half-caught-up camera can push the crop past the
   canvas edge (transparent fill -> phantom diff).  qa-camera settles
   ~2.2s from map corners; from the town spawn this is plenty. */
await sleep(1400);
const bareFrames = await sampleBurst();
check('bare crop sampled and non-blank', bareFrames.length >= 3 && bareFrames[0].lit > 0.05,
  { frames: bareFrames.length, first: bareFrames[0] && { lit: bareFrames[0].lit, err: bareFrames[0].err } });

/* ── 2. full armor set on → armored burst ── */
const applied = await setGear(FULL_SET);
for (const [slot, want] of Object.entries(FULL_SET)) {
  check(`equip stuck: ${slot}=${want}`, applied[slot] === want, applied);
}
await park();
await sleep(800);
const armoredFrames = await sampleBurst();

/* ── the rendering checks ── */
for (const [slot, item] of Object.entries(FULL_SET)) {
  const hits = gearResponses.filter((r) => r.url.includes(`/sprites/gear/${slot}/${item}/`));
  check(`gear sheets fetched ok: ${slot}/${item}`, hits.some((r) => r.ok),
    { responses: hits.slice(0, 6), total: hits.length });
}
check('armored crop non-blank', armoredFrames.length >= 3 && armoredFrames[0].lit > 0.05,
  { frames: armoredFrames.length, first: armoredFrames[0] && { lit: armoredFrames[0].lit, err: armoredFrames[0].err } });

/* Conservative on both sides: noise = WORST bare-vs-bare pair, armor
   signal = BEST-case-for-the-null armored-vs-bare pair. */
const histNoise = overPairs(bareFrames, bareFrames, histDist, Math.max);
const histArmor = overPairs(bareFrames, armoredFrames, histDist, Math.min);
const gridNoise = overPairs(bareFrames, bareFrames, gridDiff, Math.min);   /* diagnostics */
const gridArmor = overPairs(bareFrames, armoredFrames, gridDiff, Math.min); /* diagnostics */
check('scene color noise floor sane (histNoise < 0.15)',
  histNoise != null && histNoise < 0.15, { histNoise });
check('armor visibly renders over the body (color mass shifted vs bare, above noise floor)',
  histArmor != null && histNoise != null && histArmor > Math.max(0.02, histNoise * 2),
  { histArmor, histNoise });

/* ── 3. jog burst: the jog gear sheets draw without crashing ── */
await page.keyboard.down('d');
await sleep(900);
await page.keyboard.up('d');
await sleep(400);
check('no uncaught page errors', pageErrors === 0, { pageErrors });

console.log(JSON.stringify({
  histNoise, histArmor, gridNoise, gridArmor,
  bareLit: bareFrames[0]?.lit, armoredLit: armoredFrames[0]?.lit,
  bareFrames: bareFrames.length, armoredFrames: armoredFrames.length,
  gearResponses: gearResponses.length,
}, null, 1));
await browser.close();
console.log(failures === 0 ? '\nALL GEAR-SMOKE CHECKS PASSED' : `\n${failures} GEAR-SMOKE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
