/* SIDE-BY-SIDE BEFORE/AFTER PLATES FOR AN ART PR (v2.3.2507).
 *
 * docs/TRAPS.md §21 is the standing rule that art in this repo is signed off on
 * a RENDER and never by eye or by a number alone, and the owner's own rule for
 * lane A is that every art PR ships 20x renders of the touched frames, before
 * and after.  Two separate PNGs in a folder is not that: the owner has to open
 * them in turn and hold one in their head, which is exactly the comparison a
 * human is worst at.  One plate, labelled, is.
 *
 * Reads pairs out of tools/qa/mp/out/ (written by the mp-* scenarios with
 * BT_SHOT_TAG=before and BT_SHOT_TAG=after) and writes one labelled plate per
 * pair into docs/triage-2026-09-14/lane-a/.
 *
 * Chromium because it is the only image codec in this sandbox -- no PIL, no
 * sharp (CLAUDE.md).  Same pattern as tools/fix_bow_eye.mjs: a tiny local
 * server, a headless Chromium, and the bytes POSTed back.
 *
 *   node tools/qa/art/compare-shots.mjs
 */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const IN = `${ROOT}/tools/qa/mp/out`;
const OUT = `${ROOT}/docs/triage-2026-09-14/lane-a`;
const CHROME = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/* [output name, left file, left label, right file, right label] */
const PLATES = [
  ['cape-roll', 'arules-before-roll.png', 'BEFORE — cape rides the roll', 'arules-after-roll.png', 'AFTER — cape hidden on the roll'],
  ['cape-loot-bend', 'arules-before-loot-bend.png', 'BEFORE — cape on the loot bend', 'arules-after-loot-bend.png', 'AFTER — cape hidden on the loot bend'],
  ['cape-jog-still-on', 'arules-before-jog-south-cape-on.png', 'BEFORE — ordinary jog', 'arules-after-jog-south-cape-on.png', 'AFTER — ordinary jog, unchanged'],
  ['cape-south-block', 'arules-before-south-block-moving.png', 'BEFORE — no cape while blocking south', 'arules-after-south-block-moving.png', 'AFTER — cape stays on'],
  ['greatsword-carry-southwest', 'arules-before-greatsword-carry-southwest.png', 'BEFORE — blade across the body (SW)', 'arules-after-greatsword-carry-southwest.png', 'AFTER — body occludes the blade (SW)'],
  ['greatsword-carry-southeast', 'arules-before-greatsword-carry-southeast.png', 'BEFORE — SE (control)', 'arules-after-greatsword-carry-southeast.png', 'AFTER — SE unchanged'],
  ['greatsword-carry-east', 'arules-before-greatsword-carry-east.png', 'BEFORE — E (control)', 'arules-after-greatsword-carry-east.png', 'AFTER — E unchanged'],
  ['greatsword-swing-southwest', 'arules-before-greatsword-swing-southwest.png', 'BEFORE — swing at SW', 'arules-after-greatsword-swing-southwest.png', 'AFTER — swing at SW, blade behind'],
  ['standin-cape-bow-east', 'arules-before-standin-cape-bow-east.png', 'BEFORE — panels under the body', 'arules-after-standin-cape-bow-east.png', 'AFTER — panels drape over the waist'],
  ['standin-cape-bow-south', 'arules-before-standin-cape-bow-south.png', 'BEFORE — south bow (control)', 'arules-after-standin-cape-bow-south.png', 'AFTER — south bow, unchanged'],
  ['standin-cape-sword-east', 'arules-before-standin-cape-sword-east.png', 'BEFORE — east swing (control)', 'arules-after-standin-cape-sword-east.png', 'AFTER — east swing, unchanged'],
  ['portrait-cape', 'arules-before-portrait.png', 'BEFORE — no cape in the preview', 'arules-after-portrait.png', 'AFTER — cape in the preview'],
  ['face-tattoo-jog-east', 'facebow-before-jog-east.png', 'BEFORE — ink stops at the cheekbones', 'facebow-after-jog-east.png', 'AFTER — ink reaches the jaw'],
  ['face-tattoo-jog-south', 'facebow-before-jog-south.png', 'BEFORE — south bow shot', 'facebow-after-jog-south.png', 'AFTER — south bow shot'],
  ['face-tattoo-control-idle', 'facebow-before-control-idle-south.png', 'BEFORE — standing (control)', 'facebow-after-control-idle-south.png', 'AFTER — standing, unchanged'],
  ['tee-shoulder-shield-or-not', 'teeshield-now-no-shield-worst.png', 'NO SHIELD — shoulder still bare', 'teeshield-now-with-shield-worst.png', 'WITH SHIELD — same defect, no worse'],
  /* v2.3.2508 (the rebakes) */
  ['bow-south-eye', 'boweye-before-f2.png', 'BEFORE — left eye a black socket', 'boweye-after-f2.png', 'AFTER — rebuilt from the right eye'],
  ['copper-feet-body-layer', 'copperfeet-now-layer-body.png', 'the BODY layer, boot band', 'copperfeet-now-layer-legs.png', 'the COPPER ARMOUR layer, same frame'],
];

const want = PLATES.filter((p) => existsSync(`${IN}/${p[1]}`) && existsSync(`${IN}/${p[3]}`));
const missing = PLATES.filter((p) => !want.includes(p));
for (const m of missing) console.warn('skipped (source missing):', m[0]);
if (!want.length) { console.error('nothing to compose — run the mp-* scenarios first'); process.exit(1); }

let result = null; let done = false;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(page()); }
  else if (u.pathname === '/img') {
    const f = u.searchParams.get('f');
    if (!/^[A-Za-z0-9._-]+$/.test(f)) { res.writeHead(400); res.end(); return; }
    res.writeHead(200, { 'content-type': 'image/png' }); res.end(await readFile(`${IN}/${f}`));
  } else if (u.pathname === '/r' && req.method === 'POST') {
    const c = []; for await (const x of req) c.push(x);
    result = JSON.parse(Buffer.concat(c).toString()); done = true; res.writeHead(200); res.end('ok');
  } else { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
  `--user-data-dir=/tmp/cmp-${port}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
const t0 = Date.now();
await new Promise((res, rej) => {
  const iv = setInterval(() => {
    if (done) { clearInterval(iv); res(); }
    else if (Date.now() - t0 > 120000) { clearInterval(iv); rej(new Error('timeout')); }
  }, 200);
});
chrome.kill(); server.close();

await mkdir(OUT, { recursive: true });
for (const p of result.plates) {
  await writeFile(`${OUT}/${p.name}.png`, Buffer.from(p.png, 'base64'));
  console.log('wrote', `docs/triage-2026-09-14/lane-a/${p.name}.png`, `(${p.w}x${p.h})`);
}
process.exit(0);

function page() {
  return `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script>
const PLATES = ${JSON.stringify(want)};
const load = (f) => new Promise((res) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = '/img?f=' + f;
});
(async () => {
  const out = [];
  for (const [name, lf, ll, rf, rl] of PLATES) {
    const [a, b] = await Promise.all([load(lf), load(rf)]);
    if (!a || !b) continue;
    /* Both halves are drawn at the SAME scale and the same box, so a size
       difference between the two source crops cannot read as the change. */
    const PAD = 16, LABEL = 34, GAP = 16;
    const cw = Math.max(a.width, b.width), ch = Math.max(a.height, b.height);
    /* Cap the plate so a wide strip does not become a 20MB PNG -- and FLOOR it,
       because a 256px portrait rendered at 1:1 leaves the two labels wider than
       the halves they sit over and they collide.  The upscale is an integer so
       pixel art stays pixel art. */
    let k = 1;
    if (cw > 900) k = 900 / cw;
    else if (cw < 460) k = Math.max(1, Math.round(460 / cw));
    const w = Math.round(cw * k), h = Math.round(ch * k);
    const cv = document.createElement('canvas');
    cv.width = PAD * 2 + w * 2 + GAP;
    cv.height = PAD * 2 + LABEL + h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#10161c'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '600 20px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffd27f'; g.fillText(ll, PAD, PAD + LABEL / 2);
    g.fillStyle = '#9fe8b0'; g.fillText(rl, PAD + w + GAP, PAD + LABEL / 2);
    const y = PAD + LABEL;
    g.drawImage(a, PAD, y, Math.round(a.width * k), Math.round(a.height * k));
    g.drawImage(b, PAD + w + GAP, y, Math.round(b.width * k), Math.round(b.height * k));
    g.strokeStyle = '#2a3541'; g.lineWidth = 2;
    g.strokeRect(PAD - 1, y - 1, w + 2, h + 2);
    g.strokeRect(PAD + w + GAP - 1, y - 1, w + 2, h + 2);
    out.push({ name, w: cv.width, h: cv.height, png: cv.toDataURL('image/png').split(',')[1] });
  }
  await fetch('/r', { method: 'POST', body: JSON.stringify({ plates: out }) });
})();
</script></body>`;
}
