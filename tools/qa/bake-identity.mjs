/* ═══ v2.3.2325: IS THE ARMOURED-BODY BAKE LOSSLESS? ═══
 *
 * The owner reported the character reading "soft like the textures are low
 * resolution" while zoomed in.  Part of that was mechanical and provable:
 * _maskedBodyFrame (entityRenderer) composites at 256 but is FED 128px display
 * textures, so every draw into it was an exact 2x pixel-double -- performed
 * BILINEAR, because canvas smoothing defaults on -- and the tail then
 * resampled the whole composite back down to 128.  Exact texels in, two
 * resamples, mush out.  It is the same double-resample v2.3.1412 took off the
 * body sheets and v2.3.1434 took off the gear sheets, left standing in the one
 * place between them -- which is why the ARMOURED figure alone still looked
 * soft after both of those landed.
 *
 * This proves the repair rather than asserting it.  Above the neck line the
 * bake draws the body, erases, and then redraws that band VERBATIM under a
 * clip, and the confinement pass starts at neckY -- so nothing later touches
 * those rows.  A lossless round trip therefore leaves them byte-identical to
 * the raw body frame; any resampling at all does not.  Binary, no threshold.
 *
 *   node tools/qa/bake-identity.mjs
 *
 * Boots its own vite dev server (the harness page imports source modules, so
 * a preview of dist cannot serve it) and tears it down again.  Exits non-zero
 * on a mismatch, so it can be wired into a gate later.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = Number(process.env.BAKE_PORT || 5179);

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'],
  { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
let viteOut = '';
vite.stdout.on('data', (b) => { viteOut += b; });
vite.stderr.on('data', (b) => { viteOut += b; });

const die = async (code, msg) => {
  if (msg) console.error(msg);
  try { vite.kill('SIGTERM'); } catch (e) { /* already gone */ }
  process.exit(code);
};

/* Wait for the server rather than sleeping a flat number: a cold vite on a
   loaded box takes wildly different times to be ready, and a fixed sleep is
   how a green run turns into a connection refused on someone else's machine. */
const t0 = Date.now();
let up = false;
while (Date.now() - t0 < 60000 && !up) {
  try {
    const r = await fetch(`http://localhost:${PORT}/belt-harness.html`);
    up = r.ok;
  } catch (e) { await new Promise((r) => setTimeout(r, 400)); }
}
if (!up) await die(2, `vite never came up on :${PORT}\n${viteOut}`);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });

let rows = null;
try {
  await page.goto(`http://localhost:${PORT}/belt-harness.html?measure=1`);
  await page.waitForFunction('window.__done === true', null, { timeout: 180000 });
  rows = await page.evaluate(() => window.__bandCheck);
} catch (e) {
  await browser.close().catch(() => {});
  await die(2, `the harness never finished: ${e.message}`);
}
await browser.close().catch(() => {});

let fails = 0, measured = 0;
console.log('');
console.log('  the head band above the neck line, baked vs raw body');
console.log('  ─────────────────────────────────────────────────────');
for (const r of rows || []) {
  const who = `${r.pose}-${r.dir} f${r.f} (${r.wear})`;
  if (r.err) { console.log(`  SKIP  ${who.padEnd(30)} ${r.err}`); continue; }
  measured++;
  const ok = r.bad === 0 && r.opaque > 100;
  if (!ok) fails++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${who.padEnd(30)} `
    + `rows 0..${r.band}, ${r.opaque} opaque, ${r.bad} altered   `
    + `[partial alpha ${r.partialA} raw -> ${r.partialB} baked]`);
  /* The negative control: the baked figure must not GROW past the raw one.
     Growth only, deliberately.  The first cut of this check tested distance
     in both directions and reported the leg cases as 21-29 texels "moved" --
     which they are, and correctly so: worn greaves ERASE the legs out of the
     body bake (the plate is drawn over the top as its own layer), so the
     baked body's box is supposed to end at the thigh.  A control that fires
     on the feature working is worse than no control.  What would signal a
     broken erase or confinement chain is the body reaching somewhere the raw
     art never did, so that is what this asks.  One texel of slack: a nearest
     round trip can keep an edge texel that bilinear had faded below the
     alpha floor. */
  const grew = Math.max(r.bodyBox.t - r.maskBox.t, r.maskBox.b - r.bodyBox.b,
    r.bodyBox.l - r.maskBox.l, r.maskBox.r - r.bodyBox.r);
  if (grew > 1) {
    fails++;
    console.log(`        FAIL: the baked body reaches ${grew} texels past the raw art `
      + `(body ${JSON.stringify(r.bodyBox)} vs baked ${JSON.stringify(r.maskBox)})`);
  }
}
console.log('');
if (!measured) await die(2, '  nothing was measured — the art never loaded');
console.log(fails
  ? `  ${fails} failure(s): the bake is still resampling what it was handed`
  : `  ${measured} case(s) clean: the armoured bake is a lossless round trip`);
await die(fails ? 1 : 0);
