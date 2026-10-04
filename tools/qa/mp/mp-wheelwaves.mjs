/* ═══ THE WHEEL'S WATER MOVES (v2.3.3019) ═══
 *
 * Owner, 2026-10-04: "Does the water move yet" -- then, offered glints and
 * slow lines of light drifting across the water, the foam lapping in and out
 * at the shore and a gentle drift down the rivers: "Yes".  On a phone
 * viewport, against a real worker, in the Wheel:
 *   1. the water's program is built behind the Wheel's loading screen, and
 *      links (WebGL2);
 *   2. at a coast the pieces with water carry fields and are drawn with the
 *      motion; the open sea's pieces share one tiny texture;
 *   3. the motion is ON THE WATER: the screen with it and without it, at one
 *      moment, differ only where water is drawn (or within a few px of it:
 *      the wash rides up to the shore's own foam line);
 *   4. the water MOVES: two moments 1.5 s apart differ over the water many
 *      times more than they do with the motion off;
 *   5. the Sweetwater River by the Mill Bridge runs: its pieces carry a flow,
 *      and the river moves between two moments; the bridge's deck does not;
 *   6. `?nowaves` keeps the water still: no fields laid, nothing drawn;
 *   7. back in town every field is let go;
 *   8. no page errors.
 * Pictures in tools/qa/mp/out/wheelwaves-*.png, and a few seconds of each
 * water as a GIF (wheelwaves-coast.gif, wheelwaves-river.gif).
 */
import * as H from './harness.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';

const PHONE = { width: 390, height: 844 };
/* sand above the Wind Dunes' first coast, the shallows and the sea north of
   it (mp-wheelwater) */
const COAST = { x: 25199, y: 15874 };
/* the Sweetwater River, by the Mill Bridge (mp-wheelwater) */
const RIVER = { x: 19177, y: 21504 };

const holdTitle = (P, ms) => P.page.evaluate(async (hold) => {
  const el = document.querySelector('.bt-zone-header__title');
  if (!el) return 'no title element';
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  await new Promise((res) => setTimeout(res, hold));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  return 'ok';
}, ms);
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);
const waitZone = async (P, want, n = 60, gap = 1000) => {
  let zone = null;
  for (let i = 0; i < n; i++) {
    zone = await H.readState(P, (S) => S.currentZone);
    if ((typeof want === 'function' ? want(zone) : zone === want) && !(await H.readState(P, (S) => !!S._zoneLoading))) return zone;
    await P.page.waitForTimeout(gap);
  }
  return zone;
};
async function wayIn(P) {
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  if (!(await panelUp(P))) { await holdTitle(P, 1500); await P.page.waitForTimeout(900); }
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1500);
  await tap(P, 'Finish all quests');
  await P.page.waitForTimeout(2000);
  await tap(P, 'Close');
  await P.page.waitForTimeout(600);
  const { TOWN_EXITS } = await import(H.REPO + '/src/data/effects.js');
  const door = TOWN_EXITS.find((e) => e.zoneId === 'worldview');
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  return waitZone(P, WHEELISH);
}
/* until every piece asked for is laid (or `ms` passes) */
const settle = async (P, ms = 20000) => {
  const t0 = Date.now();
  let s = null;
  while (Date.now() - t0 < ms) {
    s = await P.page.evaluate(() => { const st = window.__btWorldTrial.stats; return { loading: st.loading, downloading: st.downloading, short: st.short, resident: st.resident }; });
    if (s.loading === 0 && s.downloading === 0 && s.short === 0 && s.resident > 0) break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(800);
  return s;
};
const probe = (P) => P.page.evaluate(() => window.__btWaves.probe());
/* the water's clock held at `sec`, or let run (null); a few frames to draw it */
const hold = async (P, sec) => { await P.page.evaluate((s) => window.__btWaves.hold(s), sec); await P.page.waitForTimeout(260); };

/* the screen as pixels (device px), and how a device px maps to the world */
async function grab(P, file) {
  const buf = await P.page.screenshot({ path: file });
  const img = H.decodePng(buf);
  const view = await P.page.evaluate(() => {
    const S = window._gameState.current, c = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { left: r.left, top: r.top, cx: S.camera.x, cy: S.camera.y, kx: S._worldScaleX || 1, ky: S._worldScaleY || 1, dpr: window.devicePixelRatio || 1 };
  });
  return { img, view };
}
/* The water layer ALONE (window.__btWaves.extract), over the middle of the
   view: of the px it draws at all, how many lie on drawn water, how many
   within `near` game px of it (the wash rides up to the shore's own foam
   line, and the ground's own answer is a sample every 3 game px), and how
   many elsewhere.  In the page, at 0.5 px a game px. */
const audit = (P, near = 4) => P.page.evaluate(({ near }) => {
  const S = window._gameState.current;
  const vw = S._viewW || 600, vh = S._viewH || 1000;
  const x0 = Math.round(S.camera.x + vw * 0.05), y0 = Math.round(S.camera.y + vh * 0.08), w = Math.round(vw * 0.9), h = Math.round(vh * 0.55);
  const res = 0.5;
  const g = window.__btWaves.extract(x0, y0, w, h, res);
  if (!g || g.error) return { error: g && g.error };
  const T = window.__btWorldTrial;
  const wet = (x, y) => { const q = T.ground(x, y); return q ? (q.water ? 1 : 0) : -1; };
  let drawn = 0, on = 0, by = 0, off = 0, unknown = 0, water = 0;
  const offs = [];
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
    const x = x0 + (i + 0.5) / res, y = y0 + (j + 0.5) / res;
    const k = wet(x, y);
    if (k === 1) water++;
    const a = g.px[(j * g.w + i) * 4 + 3];
    if (a < 8) continue;
    drawn++;
    if (k === 1) { on++; continue; }
    if (k < 0) { unknown++; continue; }
    let close = false;
    for (let dy = -near; dy <= near && !close; dy += near / 2) for (let dx = -near; dx <= near && !close; dx += near / 2) close = wet(x + dx, y + dy) === 1;
    if (close) by++; else { off++; if (offs.length < 5) offs.push([Math.round(x), Math.round(y), a]); }
  }
  return { n: g.w * g.h, water, drawn, on, by, off, unknown, offs };
}, { near });
/* the water layer alone at two moments of its clock: of the px it covers
   whole at both, how many changed */
const moved = (P, t1, t2) => P.page.evaluate(({ t1, t2 }) => {
  const S = window._gameState.current;
  const vw = S._viewW || 600, vh = S._viewH || 1000;
  const x0 = Math.round(S.camera.x + vw * 0.05), y0 = Math.round(S.camera.y + vh * 0.08), w = Math.round(vw * 0.9), h = Math.round(vh * 0.55);
  window.__btWaves.hold(t1);
  const a = window.__btWaves.extract(x0, y0, w, h, 0.5);
  window.__btWaves.hold(t2);
  const b = window.__btWaves.extract(x0, y0, w, h, 0.5);
  if (!a || !b || a.error || b.error) return { error: (a && a.error) || (b && b.error) || 'none' };
  let whole = 0, changed = 0;
  for (let k = 0; k < a.px.length; k += 4) {
    if (a.px[k + 3] < 250 || b.px[k + 3] < 250) continue;
    whole++;
    if (Math.abs(a.px[k] - b.px[k]) > 10 || Math.abs(a.px[k + 1] - b.px[k + 1]) > 10 || Math.abs(a.px[k + 2] - b.px[k + 2]) > 10) changed++;
  }
  return { whole, changed };
}, { t1, t2 });
const strength = async (P, k) => { await P.page.evaluate((v) => window.__btWaves.strength(v), k); await P.page.waitForTimeout(260); };
const pct = (n, d) => d ? Math.round((1000 * n) / d) / 10 : 0;
/* the page's frames over `ms`: how long one takes on average, and the worst */
const frames = (P, ms = 3000) => P.page.evaluate((ms) => new Promise((res) => {
  const t0 = performance.now();
  let n = 0, last = t0, worst = 0;
  const step = (t) => {
    n++; worst = Math.max(worst, t - last); last = t;
    if (t - t0 < ms) requestAnimationFrame(step); else res({ avg: +((t - t0) / Math.max(1, n)).toFixed(1), worst: Math.round(worst), n });
  };
  requestAnimationFrame(step);
}), ms);
/* frames of the water's clock, cropped, into a GIF (Python's PIL) */
async function gif(P, file, t0, frames, dt, crop) {
  const dir = file.replace(/\.gif$/, '-frames');
  mkdirSync(dir, { recursive: true });
  for (let k = 0; k < frames; k++) {
    await hold(P, t0 + k * dt);
    await P.page.screenshot({ path: join(dir, `f${String(k).padStart(3, '0')}.png`), clip: crop });
  }
  try {
    execFileSync('python3', ['-c', `
import glob, sys
from PIL import Image
fs = sorted(glob.glob(sys.argv[1] + '/f*.png'))
ims = [Image.open(f).convert('RGB') for f in fs]
pal = ims[0].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
q = [im.quantize(palette=pal, dither=Image.Dither.NONE) for im in ims]
q[0].save(sys.argv[2], save_all=True, append_images=q[1:], duration=int(float(sys.argv[3]) * 1000), loop=0, optimize=False)
`, dir, file, String(dt)], { stdio: 'pipe' });
    return true;
  } catch (e) { return false; }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shotPath = (name) => join(OUT, `wheelwaves-${name}.png`);
  const P = await H.newPlayer(browser, { name: 'Wavewatch', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel' });
  const zone = await wayIn(P);
  await P.page.waitForTimeout(1500);

  /* ── 1. built behind the loading screen ── */
  const p0 = await probe(P);
  rec.ok('the water\'s program is built behind the Wheel\'s loading screen, and links (WebGL2)',
    WHEELISH(zone) && p0.prewarmed && p0.ok === true && p0.webgl2, p0);

  /* ── 2. a coast ── */
  await H.hopTo(P, COAST.x, COAST.y, { tries: 120 });
  await settle(P);
  const pc = await probe(P);
  rec.ok(`at a coast the pieces with water are drawn moving (${pc.meshes}: ${pc.fields} with a field of their own, ${pc.uniform} of open sea sharing one; ${(pc.fieldBytes / 1048576).toFixed(2)} MB)`,
    pc.meshes >= 3 && pc.fields >= 2 && pc.fieldBytes <= pc.fields * 134 * 134 * 4, pc);
  /* the readout says so, for a phone screenshot (the owner, on the first
     cut: "I don't see the water moving") */
  const hudAt = (Q) => Q.page.evaluate(() => { const el = document.getElementById('bt-world-trial'); return el ? el.textContent : ''; });
  const hud = await hudAt(P);
  rec.ok(`the trial readout says the water is moving ("${(hud.split('\n').find((l) => l.startsWith('water')) || '').trim()}")`,
    /water {3}moving · \d+ pieces/.test(hud), hud.split('\n'));

  /* ── 3. on the water only ── */
  await hold(P, 100);
  const au = await audit(P);
  rec.ok(`the motion is drawn on the water only: of the ${au.drawn} px its layer draws, ${au.on} on drawn water, ${au.by} at its edge, ${au.off} elsewhere`,
    !au.error && au.water > 2000 && au.drawn > 0.9 * au.water && au.off <= Math.max(3, au.drawn * 0.002), au);
  /* pictures for the owner: the same moment, still and moving */
  await grab(P, shotPath('coast'));
  await strength(P, 0);
  await grab(P, shotPath('coast-still'));
  await strength(P, 1);

  /* ── 4. it moves ── */
  const mv = await moved(P, 100, 101.5);
  await strength(P, 0);
  const mv0 = await moved(P, 100, 101.5);
  await strength(P, 1);
  rec.ok(`the water moves: of ${mv.whole} px of it, ${pct(mv.changed, mv.whole)}% change in 1.5 s with the motion, ${pct(mv0.changed, mv0.whole)}% with its strength at 0`,
    /* (a coast is mostly the deep sea's picture, dark and quiet: a px moved
       there often changes by less than the 10 levels counted.  The first cut,
       which the owner could not see moving on a phone, changed 8% of them
       here and 43% of the river's; the swell up to 3 game px, 30% and 63%) */
    !mv.error && mv.whole > 2000 && mv.changed > 0.15 * mv.whole && mv0.changed <= 0.002 * mv0.whole, { mv, mv0 });

  /* what it costs a frame here (the sandbox draws WebGL in SOFTWARE, so the
     numbers say nothing of a phone's GPU -- only that it is not a cliff) */
  await hold(P, null);
  const fOn = await frames(P);
  await P.page.evaluate(() => window.__btWaves.off());
  const fOff = await frames(P);
  await P.page.evaluate(() => window.__btWaves.on());
  rec.ok(`a frame at the coast: ${fOn.avg} ms with the motion, ${fOff.avg} ms without (software WebGL; worst ${fOn.worst} / ${fOff.worst} ms)`,
    fOn.n > 3 && fOn.avg < fOff.avg * 2.5 + 10, { fOn, fOff });
  /* a few seconds of it, for the owner */
  const crop = { x: 0, y: Math.round(PHONE.height * 0.08), width: PHONE.width, height: Math.round(PHONE.height * 0.5) };
  const gotGif = await gif(P, join(OUT, 'wheelwaves-coast.gif'), 200, 36, 0.15, crop);

  /* ── 5. the river runs ── */
  await H.hopTo(P, RIVER.x + 90, RIVER.y + 60, { tries: 120 });
  await settle(P);
  const pr = await probe(P);
  const rv = await moved(P, 50, 51.2);
  await hold(P, 50);
  const ra = await audit(P);
  await grab(P, shotPath('river'));
  rec.ok(`the Sweetwater River runs: ${pr.flowing} of its pieces carry a flow, ${pct(rv.changed, rv.whole)}% of its px change in 1.2 s, and of the ${ra.drawn} px drawn ${ra.off} lie off the water`,
    pr.flowing >= 1 && !rv.error && rv.whole > 500 && rv.changed > 0.35 * rv.whole && !ra.error && ra.off <= Math.max(3, ra.drawn * 0.002), { pr, rv, ra });
  await gif(P, join(OUT, 'wheelwaves-river.gif'), 300, 36, 0.15, crop);
  await hold(P, null);

  /* ── 7. home: every field let go ── */
  const exit = await P.page.evaluate(() => {
    const S = window._gameState.current;
    for (let y = 0; y < S.map.length; y++) { const row = S.map[y]; const x = row.indexOf(8); if (x >= 0) return { tx: x, ty: y }; }
    return null;
  });
  let back = null;
  if (exit) {
    await H.hopTo(P, exit.tx * 32 + 16 + 40, exit.ty * 32 + 16, { tries: 160 });
    back = await waitZone(P, 'town', 40, 700);
    await P.page.waitForTimeout(1500);
  }
  const ph = await probe(P);
  rec.ok('back in town every field is let go', back === 'town' && ph.meshes === 0 && ph.fields === 0 && ph.fieldBytes === 0, { back, ph });
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));
  if (!gotGif) console.log('   (no GIF: python3 PIL unavailable)');
  await P.ctx.close();

  /* ── 6. ?nowaves keeps it still ── */
  const Q = await H.newPlayer(browser, { name: 'Stillwater', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel&nowaves' });
  const zq = await wayIn(Q);
  await H.hopTo(Q, COAST.x, COAST.y, { tries: 120 });
  await settle(Q);
  const pq = await probe(Q);
  const hq = await Q.page.evaluate(() => { const el = document.getElementById('bt-world-trial'); return el ? el.textContent : ''; });
  rec.ok('with ?nowaves the water is still: no fields laid, nothing drawn, and the readout says so', WHEELISH(zq) && pq.meshes === 0 && pq.made === 0 && !pq.on
    && /water {3}still \(switched off\)/.test(hq), { pq, hud: hq.split('\n') });
  await Q.ctx.close();
}
