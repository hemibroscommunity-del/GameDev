/* WHAT A COLD FIRST LOAD ACTUALLY COSTS (v2.3.2328)
 *
 * docs/OPTIMIZATION-ROADMAP.md closes with the lesson from the interest-
 * management work: "measure bytes AND cycles — this repo's harness measured
 * only cycles for a year, and the answer was in the bytes."  That lesson was
 * applied to the SERVER's egress and never to the CLIENT's download.  Nobody
 * had ever counted what a new player pulls before they can move.
 *
 * The answer, at v2.3.2327, on a phone viewport: **33.30 MB across 790
 * requests**, 28 s to playable — and that is over localhost with no network
 * latency and no cellular bandwidth limit, so a real phone is strictly worse.
 * The first three things it found were all invisible to reasoning:
 *   - 1.21 MB / 26 requests feeding a Canvas 2D path Rollup had already
 *     tree-shaken out of the bundle (fixed, v2.3.2328);
 *   - 64 sheets fetched TWICE, once as .png and once as .webp, by two loaders
 *     that did not know about each other;
 *   - 49 .webp probes 404ing into the SPA fallback because the twin was never
 *     generated.
 *
 * WHY CDP AND NOT page.on('response'): only Network.loadingFinished carries
 * `encodedDataLength`, the bytes that actually crossed the wire.  The
 * Playwright response event does not, and a harness that measures decoded
 * size instead would have reported the compressed assets as far larger than
 * they are and the JS as far smaller.
 *
 * Run it directly (it stands up its own worker and static server):
 *   node tools/qa/mp/mp-coldload.mjs
 *   node tools/qa/mp/mp-coldload.mjs --json /tmp/before.json
 * Then compare two runs with --json to attribute a change to a specific
 * request family rather than to a noisy total: the welcome screen's
 * bg-loop.mp4 (1.07 MB) races the door and lands in only some runs, so the
 * grand total moves by a megabyte between identical builds.  Trust the
 * per-family lines, not the headline.
 *
 * v2.3.2332, two traps the first reader of a --json file fell into:
 *   - each request's `t` is CDP's `timestamp`, in SECONDS on a monotonic
 *     clock -- subtract the first request's `t` and multiply by 1000 before
 *     reading gaps, or a 7.8 s span reads as 7.8 ms and the field looks dead;
 *   - harness.mjs resolves REPO from ITS OWN file location, so this script
 *     serves the dist/ that sits beside it.  Measuring a git worktree means
 *     running the copy INSIDE that worktree (its tools/qa/mp/), never the
 *     canonical one -- that would photograph the main checkout's build and
 *     report your change as having no effect.
 */
import * as H from './harness.mjs';
import { writeFileSync } from 'node:fs';

const jsonIdx = process.argv.indexOf('--json');
const jsonOut = jsonIdx > 0 ? process.argv[jsonIdx + 1] : null;

const cat = (url) => {
  const p = url.split('?')[0];
  if (/\.png$/i.test(p)) return 'png';
  if (/\.webp$/i.test(p)) return 'webp';
  if (/\.jpe?g$/i.test(p)) return 'jpg';
  if (/\.(mp3|m4a|wav|ogg)$/i.test(p)) return 'audio';
  if (/\.(mp4|webm)$/i.test(p)) return 'video';
  if (/\.js$/i.test(p)) return 'js';
  if (/\.map$/i.test(p)) return 'sourcemap';
  if (/\.css$/i.test(p)) return 'css';
  if (/(\.json|webmanifest)$/i.test(p)) return 'json';
  if (/\.(woff2?|ttf|otf)$/i.test(p)) return 'font';
  if (/\.html$/i.test(p) || p.endsWith('/')) return 'html';
  return 'other';
};
const dir = (url) => {
  const seg = url.split('?')[0].replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean);
  return seg.length > 2 ? '/' + seg.slice(0, 2).join('/') : '/' + (seg[0] || '');
};
const mb = (b) => (b / 1048576).toFixed(2);

const WS = await H.freePort(), WEB = await H.freePort();
const srv = await H.serveDist(WEB);
const worker = await H.startWorker(WS);
const browser = await H.launch();

const P = await H.newPlayer(browser, {
  name: 'Meter', wsPort: WS, webPort: WEB,
  viewport: { width: 390, height: 844 }, touch: true, dpr: 3,
});

const cdp = await P.page.context().newCDPSession(P.page);
await cdp.send('Network.enable');
const open = new Map();
const reqs = [];
cdp.on('Network.requestWillBeSent', (e) => open.set(e.requestId, { url: e.request.url, t: e.timestamp }));
cdp.on('Network.responseReceived', (e) => { const r = open.get(e.requestId); if (r) r.status = e.response.status; });
cdp.on('Network.loadingFinished', (e) => {
  const r = open.get(e.requestId); if (!r) return;
  r.bytes = e.encodedDataLength; reqs.push(r); open.delete(e.requestId);
});
cdp.on('Network.loadingFailed', (e) => open.delete(e.requestId));

/* Reload so the recording starts at navigation, not after newPlayer's goto. */
const t0 = Date.now();
await P.page.reload({ waitUntil: 'domcontentloaded' });
const marks = { domcontentloaded: Date.now() - t0 };
const info = await H.enterWorld(P, 180000);
marks.playable = Date.now() - t0;
await P.page.waitForTimeout(3000);          /* let trailing fetches settle */
marks.settled = Date.now() - t0;

const total = reqs.reduce((s, r) => s + (r.bytes || 0), 0);
const byCat = {}, byDir = {};
for (const r of reqs) {
  const c = cat(r.url); (byCat[c] = byCat[c] || { n: 0, b: 0 }).n++; byCat[c].b += r.bytes || 0;
  const d = dir(r.url); (byDir[d] = byDir[d] || { n: 0, b: 0 }).n++; byDir[d].b += r.bytes || 0;
}

console.log('\n════ COLD LOAD, phone viewport 390x844 dpr3 ════');
console.log(`zone ${info.zone} · ${reqs.length} requests · ${mb(total)} MB transferred`);
console.log(`domcontentloaded ${marks.domcontentloaded}ms · playable ${marks.playable}ms`);

console.log('\n── by type ──');
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1].b - a[1].b))
  console.log(String(k).padEnd(10), String(v.n).padStart(5), mb(v.b).padStart(9), 'MB');

console.log('\n── by directory ──');
for (const [k, v] of Object.entries(byDir).sort((a, b) => b[1].b - a[1].b).slice(0, 16))
  console.log(String(k).padEnd(24), String(v.n).padStart(5), mb(v.b).padStart(9), 'MB');

console.log('\n── 15 heaviest single requests ──');
for (const r of reqs.slice().sort((a, b) => (b.bytes || 0) - (a.bytes || 0)).slice(0, 15))
  console.log(mb(r.bytes || 0).padStart(8), 'MB ', r.url.replace(/^https?:\/\/[^/]+/, ''));

/* Exact-URL duplicates: the same bytes pulled twice because two callers raced
   before either landed in the HTTP cache. Always a bug, never a trade-off. */
const seen = {};
for (const r of reqs) seen[r.url] = (seen[r.url] || 0) + 1;
const dups = Object.entries(seen).filter(([, n]) => n > 1)
  .map(([u, n]) => [(reqs.find((r) => r.url === u).bytes || 0) * (n - 1), n, u])
  .sort((a, b) => b[0] - a[0]);
if (dups.length) {
  console.log(`\n── ${dups.reduce((s, d) => s + d[1] - 1, 0)} duplicate fetches, `
    + `${mb(dups.reduce((s, d) => s + d[0], 0))} MB wasted ──`);
  for (const [b, n, u] of dups.slice(0, 10))
    console.log(mb(b).padStart(8), 'MB  x' + n, u.replace(/^https?:\/\/[^/]+/, ''));
}

/* A .webp request whose file is absent costs a round trip and an SPA-fallback
   body before loadWebpOrPng() falls back to the .png. */
const probes = reqs.filter((r) => cat(r.url) === 'webp' && r.status === 404);
if (probes.length) console.log(`\n${probes.length} .webp probes 404'd (missing twin) — `
  + `${mb(probes.reduce((s, r) => s + (r.bytes || 0), 0))} MB of fallback bodies`);

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({
    marks, total, reqs: reqs.map((r) => ({ u: r.url.replace(/^https?:\/\/[^/]+/, ''), b: r.bytes, s: r.status, t: r.t })),
  }, null, 1));
  console.log(`\nfull request log -> ${jsonOut}`);
}

await P.ctx.close().catch(() => {});
await browser.close();
await H.stopWorker(worker);
srv.close();
process.exit(0);
