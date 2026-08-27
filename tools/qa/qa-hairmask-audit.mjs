/* ═══ v2.3.2016: BARE SCALP ON EVERY HAT, NOT THE SIX THAT WERE REPORTED ═══
 *
 * Owner, on mickey-ears: "East hair doesn't work well with Mickey hat it's
 * erasing too much.  CHECK THE OTHERS."
 *
 * That instruction has been answered three times by hand and each time only
 * over the hats someone had already complained about.  It is how devil-horns
 * southwest sat at 18.27% bare scalp — the worst in the game — through four
 * sessions of hair-mask work without anyone noticing: nobody had reported it,
 * so nothing measured it.  `mp-hairmask` covers six hats.  There are 39.
 *
 * This sweeps ALL of them, on every facing, and prints a ranked table.  It is
 * an AUDIT, not a gate: it asserts only that the measurement itself is sound
 * (the classifier finds hair, and a bald head finds none), then reports.  A
 * threshold belongs in `mp-hairmask`, where a number that moves has a named
 * owner report behind it; the job here is to find the ones nobody reported.
 *
 * THE METRIC is the one from mp-hairmask, which is a difference of four real
 * renders of the same figure and involves no colour judgement about scalp:
 *
 *     D  bald, bare-headed          the control
 *     B  haired, bare-headed        B != D  is exactly the hair
 *     C  bald, hatted               C != D  is exactly the hat
 *     A  haired, hatted             the thing under test
 *
 *     visible hair = (B!=D) & ~(C!=D)     hair with nothing drawn in front
 *     BALD         = visible hair where A==D and D is opaque
 *                    — the hair is gone AND the character's own head shows
 *                      through, which is the defect in every owner report
 *
 * Why it renders through drawCharacterPortrait rather than reading the mask
 * PNGs: a mask that is a perfect statement of the rule and is never applied
 * passes every pixel check in check-hairmask-rule.mjs and looks to a player
 * exactly like no rule at all.  precheck pins the PNGs; this pins the head.
 *
 *   node tools/qa/qa-hairmask-audit.mjs [--hair afro] [--dirs south,east]
 *
 * Needs: npm install (vite + playwright-core) and a chromium at
 * /opt/pw-browsers/chromium, or QA_CHROME=<path>.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXE = process.env.QA_CHROME
  || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const HAIR = arg('--hair', 'afro');
const DIRS = arg('--dirs', 'south,east,northeast,north,southwest').split(',');

/* Every hat on disk, so adding one to the game adds it to the audit. */
const HEAD = path.join(REPO, 'public/sprites/traits/headwear');
const HATS = readdirSync(HEAD).filter((h) => existsSync(path.join(HEAD, h, 'meta.json')));
const META = Object.create(null);
for (const h of HATS) META[h] = JSON.parse(readFileSync(path.join(HEAD, h, 'meta.json'), 'utf8'));

let failures = 0;
const check = (name, cond, detail) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (cond ? '' : '\n      ' + JSON.stringify(detail)));
  if (!cond) failures++;
};

const freePort = () => new Promise((r) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); });
});

const PORT = await freePort();
const vite = spawn('npx', ['vite', '--port', String(PORT), '--host', '127.0.0.1', '--no-open'],
  { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
let viteLog = '';
vite.stdout.on('data', (d) => { viteLog += d; });
vite.stderr.on('data', (d) => { viteLog += d; });
const BASE = `http://127.0.0.1:${PORT}`;
let up = false;
for (let i = 0; i < 80 && !up; i++) {
  try { up = (await fetch(BASE + '/index.html')).ok; } catch { /* still booting */ }
  if (!up) await new Promise((r) => setTimeout(r, 500));
}
if (!up) { console.log('FAIL  vite dev server never came up\n' + viteLog.slice(-800)); vite.kill('SIGKILL'); process.exit(1); }

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  PAGEERROR', e.message.slice(0, 160)));
await page.route('**/__audit.html', (r) => r.fulfill({
  status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>hairmask audit</title>',
}));
await page.goto(BASE + '/__audit.html');

const M = await page.evaluate(async ({ hats, dirs, hair }) => {
  const cp = await import('/rendering/characterPortrait.js');
  const F = 256;
  const draw = async (o) => {
    const cv = document.createElement('canvas'); cv.width = F; cv.height = F;
    await cp.drawCharacterPortrait(cv, Object.assign(
      { skin: 'tan', facialHair: 'none', shirt: 'none' }, o));
    return cv.getContext('2d').getImageData(0, 0, F, F).data;
  };
  /* Pixel-identity, not a colour classifier — TRAPS #21: a loose filter
     "confirms" defects that are not on screen. */
  const differs = (p, q) => {
    const s = new Uint8Array(F * F);
    for (let i = 0; i < F * F; i++)
      for (let k = 0; k < 4; k++) if (p[i * 4 + k] !== q[i * 4 + k]) { s[i] = 1; break; }
    return s;
  };
  const out = { rows: [], guard: {} };
  for (const dir of dirs) {
    const D = await draw({ dir, hair: 'none', headwear: 'none' });
    const B = await draw({ dir, hair, headwear: 'none' });
    const isHair = differs(B, D);
    let hairTotal = 0; for (let i = 0; i < F * F; i++) hairTotal += isHair[i];
    out.guard[dir] = hairTotal;
    for (const H of hats) {
      const C = await draw({ dir, hair: 'none', headwear: H });
      const A = await draw({ dir, hair, headwear: H });
      const isHat = differs(C, D);
      let vis = 0, bald = 0;
      for (let i = 0; i < F * F; i++) {
        if (!isHair[i] || isHat[i]) continue;      /* hair the hat covers is not visible hair */
        vis++;
        if (D[i * 4 + 3] <= 128) continue;         /* the head must actually be there to be bare */
        let same = true;
        for (let k = 0; k < 4; k++) if (A[i * 4 + k] !== D[i * 4 + k]) { same = false; break; }
        if (same) bald++;                          /* hair gone AND the head showing through */
      }
      out.rows.push({ hat: H, dir, vis, bald, share: vis ? +(100 * bald / vis).toFixed(2) : 0 });
    }
  }
  return out;
}, { hats: HATS, dirs: DIRS, hair: HAIR });

/* ── the guards, without which every number below is trivially zero ── */
for (const d of DIRS)
  check(`${d}: the ${HAIR} renders hair at all (guard)`, M.guard[d] > 400, { px: M.guard[d] });
const measured = M.rows.filter((r) => r.vis > 200);
check(`every hat/facing rendered hair the hat is not standing in front of (guard)`,
  measured.length === M.rows.length,
  { thin: M.rows.filter((r) => r.vis <= 200).map((r) => `${r.hat}/${r.dir}=${r.vis}`).slice(0, 12) });

const ranked = [...M.rows].sort((a, b) => b.share - a.share);
console.log(`\n═══ BARE SCALP, ${HATS.length} hats x ${DIRS.length} facings, hair=${HAIR} ═══`);
console.log('  share   bald/visible   hat / facing            flags');
for (const r of ranked.slice(0, 30)) {
  const m = META[r.hat] || {};
  const fl = [m.enclosed && 'enclosed', m.openTop && 'openTop', m.clipsHair && 'clipsHair']
    .filter(Boolean).join(',');
  console.log(`  ${String(r.share).padStart(6)}%  ${String(r.bald).padStart(5)}/${String(r.vis).padEnd(6)}  ${(r.hat + ' / ' + r.dir).padEnd(24)}${fl}`);
}
const over = ranked.filter((r) => r.share >= 1);
console.log(`\n  ${over.length} of ${M.rows.length} hat/facing pairs are at or above 1% bare scalp.`);
console.log(`  worst clean-looking cutoff: ${ranked.length > 30 ? ranked[30].share + '%' : 'n/a'} and below is the tail.`);

await browser.close();
vite.kill('SIGKILL');
console.log(failures ? `\n${failures} GUARD FAILED — the table above is not trustworthy` : '\nhairmask-audit: guards pass, table above is the result');
process.exit(failures ? 1 : 0);
