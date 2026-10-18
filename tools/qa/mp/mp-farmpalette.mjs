/* ═══ THE FARM'S PICTURES AS COLOUR NUMBERS (v2.3.3440) ═══
 *
 * The owner, 2026-10-18, offered "the farm's 22 MB ground picture uses only
 * 246 colours ... could be stored the smaller way BroTown's ground is":
 * "Yes do the separate PR".  rendering/paletteLoad.js reads the farm's ground
 * (its palette twin, /maps/farm_v2.png), its 76 pictures and its copies of
 * the six sheets' pages as colour numbers, the way BroTown's are kept since
 * v2.3.3190 (paletteTex.js, mp-palette).
 *
 * Two phones (390 x 844, dpr 3) on the farm: A as the game is, B with
 * `?nopalette` (four bytes a pixel, as before).  Asserted:
 *   1. A reads the ground, every picture and every page as numbers, none
 *      falling back to a picture; B reads none so;
 *   2. at the same spot A's GPU holds 20 MB or more less than B's;
 *   3. THE SAME PICTURE: both phones stand on the same spot with the camera
 *      at rest, and the world is rendered at the phone's own pixels with only
 *      the ground, the beds' soil, the farm's things and crops and their
 *      shadows showing (the people and the screen are not pictures this
 *      reads) -- A's frame against B's, every pixel; and A against itself a
 *      moment later, the floor of the measure (0);
 *   4. the dashboard's Map panel draws the farm on A, which has no <img> of
 *      the ground to draw (paletteDraw.js paletteThumb), close to B's;
 *   5. leaving the farm lets A's go: none of the farm's numbers left, their
 *      rows of colours given back, the reader gone;
 *   6. no page errors on either;
 *   and the farm's loading screen lifts with everything in, both ways (its
 *   12 s cap never reached), the two loads timed side by side.
 * And it measures what drawing costs (the whole frame drawn and finished,
 * both ways) on this box's software chip -- information, not a phone's.
 * Pictures: out/farmpalette-{numbers,colours,diff,map-*}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodePNG } from '../../world/png.mjs';

const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
/* between the barn and the beds: the barn, the yard, the beds, the trees */
const SPOT = { x: 560, y: 690 };

const INIT = () => {
  const raf = window.requestAnimationFrame.bind(window);
  let held = [];
  window.__fpHold = false;
  window.requestAnimationFrame = (cb) => { if (window.__fpHold) { held.push(cb); return 0; } return raf(cb); };
  window.__fpRelease = () => { window.__fpHold = false; const q = held; held = []; for (const cb of q) raf(cb); return q.length; };
  const world = () => {
    const R = window._pixiRenderer, app = R && R.app;
    let ent = null;
    const find = (c, d) => { if (ent || !c || d > 5) return; if (c.label === 'entities') { ent = c; return; } for (const k of (c.children || [])) find(k, d + 1); };
    find(app && app.stage, 0);
    return { app, W: ent && ent.parent };
  };
  window.__fpFrame = (cam, only) => {
    const { app, W } = world();
    const r = app && app.renderer;
    if (!r || !W) return { err: 'no world' };
    const hidden = [];
    const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
    for (let n = W; n && n.parent; n = n.parent) for (const s of n.parent.children) if (s !== n) hide(s);
    /* `only`: one layer, to find which differs */
    const KEEP = new Set(only ? [only] : ['tiles', 'groundDetails', 'shadows', 'entities']);
    const farmPic = (t) => { const l = t && t.source && t.source.label; return !!(l && /\/world\/farm\/|\/world\/objects\//.test(l)); };
    const groundPic = (t) => { const l = t && t.source && t.source.label; return !!(l && /\/maps\/farm_/.test(l)); };
    for (const L of W.children) {
      if (!KEEP.has(L.label)) { hide(L); continue; }
      if (L.label === 'tiles') {
        /* the ground's picture alone: the layer also draws the gate's pulsing
           glow and the portal beams, which move between two grabs */
        for (const k of L.children) {
          if (k.label !== 'tileSprites') { hide(k); continue; }
          for (const s of k.children) if (!groundPic(s.texture)) hide(s);
        }
      } else if (L.label === 'shadows') {
        const walk = (c) => { for (const k of (c.children || [])) { if (k.texture !== undefined) { if (!farmPic(k.texture)) hide(k); } else walk(k); } };
        walk(L);
      } else if (L.label === 'groundDetails') {
        for (const k of L.children) if (k.label !== 'farmBedSoil') hide(k);
      } else if (L.label === 'entities') {
        for (const k of L.children) if (k.label !== 'farmThing' && k.label !== 'farmCrop') hide(k);
      }
    }
    const was = { x: W.x, y: W.y, sx: W.scale.x, sy: W.scale.y };
    if (cam) { W.x = cam.x; W.y = cam.y; W.scale.set(cam.sx, cam.sy); }
    /* the shadow layer's lock to its pixel grid for that camera (mp-palette) */
    let shL = null, shU = null, shWas = null;
    for (const L of W.children) if (L.label === 'shadows') shL = L;
    const shF = shL && shL.filters && shL.filters[0];
    const shu = shF && shF.resources && shF.resources.shadowUniforms && shF.resources.shadowUniforms.uniforms;
    if (cam && shL && shu && shu.uShift) {
      const res = typeof shF.resolution === 'number' && shF.resolution > 0 ? shF.resolution : 1;
      const fx = cam.x - Math.floor(cam.x * res) / res, fy = cam.y - Math.floor(cam.y * res) / res;
      shWas = { x: shL.x, y: shL.y, u0: shu.uShift[0], u1: shu.uShift[1] }; shU = shu;
      shL.position.set(-fx / (cam.sx || 1), -fy / (cam.sy || 1));
      shu.uShift[0] = fx; shu.uShift[1] = fy;
    }
    let out = null, err = null;
    try {
      const sw = app.screen.width, sh = app.screen.height;
      const frame = new (app.screen.constructor)(0, 0, sw, sh);
      const px = r.extract.pixels({ target: app.stage, frame, resolution: r.resolution });
      const u8 = new Uint8Array(px.pixels.buffer, px.pixels.byteOffset, px.pixels.byteLength);
      let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      out = { w: px.width, h: px.height, b64: btoa(s) };
    } catch (e) { err = String((e && e.message) || e); }
    W.x = was.x; W.y = was.y; W.scale.set(was.sx, was.sy);
    if (shWas) { shL.position.set(shWas.x, shWas.y); shU.uShift[0] = shWas.u0; shU.uShift[1] = shWas.u1; }
    for (const o of hidden) o.visible = true;
    return out || { err };
  };
  window.__fpCam = () => { const { W } = world(); return W ? { x: W.x, y: W.y, sx: W.scale.x, sy: W.scale.y } : null; };
  /* the whole frame drawn and finished, `n` times (mp-palette's __palCost) */
  window.__fpCost = (cam, n) => {
    const { app, W } = world();
    const r = app && app.renderer, gl = r && r.gl;
    if (!gl || !W) return { err: 'no renderer' };
    const was = { x: W.x, y: W.y, sx: W.scale.x, sy: W.scale.y };
    if (cam) { W.x = cam.x; W.y = cam.y; W.scale.set(cam.sx, cam.sy); }
    const one = new Uint8Array(4);
    const draw = () => { r.render({ container: app.stage }); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one); };
    const out = { ms: [] };
    try {
      for (let i = 0; i < 3; i++) draw();
      for (let i = 0; i < n; i++) { const t0 = performance.now(); draw(); out.ms.push(performance.now() - t0); }
    } catch (e) { out.err = String((e && e.message) || e); }
    W.x = was.x; W.y = was.y; W.scale.set(was.sx, was.sy);
    return out;
  };
  /* the dashboard's Map panel's picture: how much of it is the farm */
  window.__fpMap = () => {
    const c = Array.from(document.querySelectorAll('canvas')).find((k) => k.width === 110 && k.height === 110);
    if (!c) return null;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x11) + Math.abs(d[i + 1] - 0x1E) + Math.abs(d[i + 2] - 0x23) > 24) lit++;
    return { lit, px: d.length / 4, url: c.toDataURL('image/png') };
  };
};

async function toFarm(P, wsPort) {
  await H.enterWorld(P);
  const wa = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
    (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
  if (!wa) return { err: 'not in the Wheel' };
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id);
  await P.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
  let visit = null;
  for (let t0 = Date.now(); Date.now() - t0 < 10000 && !visit;) {
    visit = await P.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (!visit) await P.page.waitForTimeout(200);
  }
  if (!visit) return { err: 'no Visit Your Farm' };
  const t0 = Date.now();
  await P.page.touchscreen.tap(visit.x, visit.y);
  const v = await H.waitFor(P, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') }),
    (v) => v.zone === 'farm_home' && !v.hold && !v.veil, { timeout: 40000, label: 'onto the farm' }).catch(() => ({ err: 'not on the farm' }));
  /* how long the loading screen stood, and whether everything was in when it
     lifted (farmTrip.js lifts it after 12 s whatever is in) */
  const holds = await P.page.evaluate(() => window.__btFarmHolds || []);
  return { ...v, ms: Date.now() - t0, holds };
}
/* on the spot, still, the camera at rest */
async function standAt(P, x, y) {
  await H.hopTo(P, x, y, { step: 80, gap: 220, tries: 60 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; }, { x, y });
    await P.page.waitForTimeout(700);
  }
  await P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState.current;
    let last = '', same = 0, n = 0;
    const tick = () => {
      const k = Math.round(S.camera.x * 10) + ',' + Math.round(S.camera.y * 10);
      same = k === last ? same + 1 : 0;
      last = k;
      if (same >= 5 || ++n > 400) { res(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
}
const memory = (P) => P.page.evaluate(() => {
  const g = window.__btGpuTex ? window.__btGpuTex(400) : null;
  const t = window.__btTex ? window.__btTex() : null;
  return { gpuMB: g ? g.mb : null, byKind: g ? g.byKind : null, cacheMB: t ? t.mb : null,
    pal: window.__btPalette ? window.__btPalette() : null, load: window.__btPaletteLoad ? window.__btPaletteLoad() : null };
});
const grab = async (P, cam, only) => {
  const f = await P.page.evaluate(([c, o]) => window.__fpFrame(c, o), [cam || null, only || null]);
  if (!f || f.err) return { err: f ? f.err : 'nothing' };
  return { w: f.w, h: f.h, px: Buffer.from(f.b64, 'base64') };
};
/* every pixel of two frames (mp-palette's compare) */
function compare(a, b) {
  if (!a.px || !b.px || a.w !== b.w || a.h !== b.h) return { err: `sizes ${a.w}x${a.h} vs ${b.w}x${b.h}` };
  const n = a.w * a.h, diff = Buffer.alloc(n * 4);
  let drawn = 0, differ = 0, worst = 0;
  const hist = { 1: 0, 2: 0, '3-8': 0, '9+': 0 };
  for (let i = 0, o = 0; i < n; i++, o += 4) {
    const pa = a.px, pb = b.px;
    if (pa[o + 3] || pb[o + 3]) drawn++;
    const d = Math.max(Math.abs(pa[o] - pb[o]), Math.abs(pa[o + 1] - pb[o + 1]), Math.abs(pa[o + 2] - pb[o + 2]), Math.abs(pa[o + 3] - pb[o + 3]));
    const g = (pa[o] + pa[o + 1] + pa[o + 2]) / 9 | 0;
    diff[o] = g; diff[o + 1] = g; diff[o + 2] = g; diff[o + 3] = 255;
    if (!d) continue;
    differ++;
    if (d > worst) worst = d;
    if (d === 1) hist[1]++; else if (d === 2) hist[2]++; else if (d <= 8) hist['3-8']++; else hist['9+']++;
    diff[o] = Math.min(255, 140 + d * 40); diff[o + 1] = 0; diff[o + 2] = 0;
  }
  return { w: a.w, h: a.h, drawn, differ, share: +(differ / Math.max(1, drawn) * 100).toFixed(4), worst, hist, diff };
}
function save(name, f) {
  try { writeFileSync(join(OUT, name), encodePNG(f.w, f.h, f.px || f.diff)); } catch (e) { console.log('    (could not save ' + name + ': ' + e.message + ')'); }
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Numbers', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: INIT });
  const B = await H.newPlayer(browser, { name: 'Colours', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'nopalette', init: INIT });
  let stopAlive = false;
  for (const P of [A, B]) {
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }
  try {
    const [fa, fb] = await Promise.all([toFarm(A, wsPort), toFarm(B, wsPort)]);
    rec.ok('both phones on the farm, its pictures loaded (guard)', fa && fa.zone === 'farm_home' && fb && fb.zone === 'farm_home', { fa, fb });
    if (!fa || fa.zone !== 'farm_home' || !fb || fb.zone !== 'farm_home') return;
    /* both phones load at once, sharing this box's four cores: the times are
       for comparing the two ways, not a phone's */
    const allIn = (f) => f.holds.length > 0 && f.holds.every((h) => h.ready);
    rec.ok(`the farm's loading screen lifts with everything in on both: ${(fa.ms / 1000).toFixed(1)} s reading colour numbers, ${(fb.ms / 1000).toFixed(1)} s reading pictures (its cap 12 s)`,
      allIn(fa) && allIn(fb), { a: { ms: fa.ms, holds: fa.holds }, b: { ms: fb.ms, holds: fb.holds } });
    await Promise.all([standAt(A, SPOT.x, SPOT.y), standAt(B, SPOT.x, SPOT.y)]);

    /* ── 1-2: what each keeps ── */
    const ma = await memory(A), mb = await memory(B);
    console.log(`    numbers: ${JSON.stringify(ma)}`);
    console.log(`    colours: ${JSON.stringify(mb)}`);
    const la = ma.load || {}, pa = ma.pal || {}, pb = mb.pal || {};
    rec.ok(`A reads the farm as colour numbers: the ground ${la.ground}, ${la.pictures} pictures and ${la.pages} sheet pages (${pa.liveFarm} live, ${pa.liveFarmMB} MB), none as a picture (${la.asPictures}), in ${la.ms} ms of reading`,
      pa.on === true && la.ground === 1 && la.pictures >= 70 && la.pages >= 6 && la.asPictures === 0 && pa.liveFarm >= 77, { la, pa });
    rec.ok(`B (?nopalette) reads none so: ${pb.live} R8 sources`, pb.on === false && !pb.live && !(mb.load && mb.load.ground), { pb, load: mb.load });
    rec.ok(`at the same spot A's GPU holds ${ma.gpuMB} MB of textures to B's ${mb.gpuMB} (${(mb.gpuMB - ma.gpuMB).toFixed(1)} MB less)`,
      ma.gpuMB > 0 && ma.gpuMB < mb.gpuMB - 20, { a: ma.gpuMB, b: mb.gpuMB });
    await A.page.screenshot({ path: join(OUT, 'farmpalette-screen-numbers.png') });
    await B.page.screenshot({ path: join(OUT, 'farmpalette-screen-colours.png') });

    /* ── 3: the same picture ── */
    const cam = await A.page.evaluate(() => window.__fpCam());
    const camB = await B.page.evaluate(() => window.__fpCam());
    console.log(`    camera: A ${JSON.stringify(cam)}  B ${JSON.stringify(camB)}`);
    const f1 = await grab(A, cam), f2 = await grab(A, cam), g1 = await grab(B, cam);
    const self = compare(f1, f2), same = compare(f1, g1);
    if (!same.err) { save('farmpalette-numbers.png', f1); save('farmpalette-colours.png', g1); save('farmpalette-diff.png', same); }
    if (!self.err && self.differ) save('farmpalette-self-diff.png', self);
    console.log(`    the farm: ${JSON.stringify({ ...same, diff: undefined })}  (A against itself: ${self.differ} px)`);
    if (self.differ || same.worst > 2) {
      /* which layer moves, or differs */
      for (const only of ['tiles', 'groundDetails', 'entities', 'shadows']) {
        const x1 = await grab(A, cam, only), x2 = await grab(A, cam, only), y1 = await grab(B, cam, only);
        const s = compare(x1, x2), d = compare(x1, y1);
        if (!d.err) save(`farmpalette-${only}-diff.png`, d);
        console.log(`      ${only} alone: A against itself ${s.differ} px; A against B ${JSON.stringify({ ...d, diff: undefined })}`);
      }
    }
    rec.ok(`the floor of the measure: A's frame against itself a moment later, ${self.differ} px differ`, !self.err && self.differ === 0, { ...self, diff: undefined });
    rec.ok(`the farm, the same picture: ${same.differ} of ${same.drawn} drawn px (${same.share}%) differ, by at most ${same.worst} of 255 (${JSON.stringify(same.hist)})`,
      !same.err && same.drawn > 0.5 * same.w * same.h && same.worst <= 2 && same.share < 2, { ...same, diff: undefined });

    /* ── what drawing costs here (information) ── */
    const ms = { A: [], B: [] };
    for (let round = 0; round < 3; round++) {
      for (const [nm, P, O] of [['A', A, B], ['B', B, A]]) {
        await O.page.evaluate(() => { window.__fpHold = true; });
        await P.page.waitForTimeout(2500);
        const c = await P.page.evaluate(([c, n]) => window.__fpCost(c, n), [cam, 5]);
        await O.page.evaluate(() => window.__fpRelease());
        if (c && !c.err) ms[nm].push(...c.ms);
      }
    }
    const mid = (v) => { const s = v.slice().sort((x, y) => x - y); return s.length ? +s[s.length >> 1].toFixed(1) : null; };
    rec.ok(`what it costs to draw the farm on this box's software chip: ${mid(ms.A)} ms a frame with numbers, ${mid(ms.B)} ms with colours (the whole frame, drawn and finished; not a phone's) (guard)`,
      ms.A.length > 0 && ms.B.length > 0, { A: ms.A.map((v) => +v.toFixed(1)), B: ms.B.map((v) => +v.toFixed(1)) });

    /* ── 4: the dashboard's Map panel ── */
    for (const P of [A, B]) await P.page.evaluate(() => { try { window.__broDashPanelBus.open('map'); } catch (e) { /* the check says */ } });
    await A.page.waitForTimeout(1200);
    const mapA = await A.page.evaluate(() => window.__fpMap && window.__fpMap());
    const mapB = await B.page.evaluate(() => window.__fpMap && window.__fpMap());
    for (const [nm, m] of [['numbers', mapA], ['colours', mapB]]) {
      if (m && m.url) { try { writeFileSync(join(OUT, `farmpalette-map-${nm}.png`), Buffer.from(m.url.split(',')[1], 'base64')); } catch (e) { /* ignore */ } }
    }
    rec.ok(`the dashboard's Map panel draws the farm from its numbers on A (${mapA && mapA.lit} of ${mapA && mapA.px} px lit; B's from its picture ${mapB && mapB.lit})`,
      !!mapA && !!mapB && mapA.lit > 0.4 * mapA.px && Math.abs(mapA.lit - mapB.lit) < 0.05 * mapA.px, { a: mapA && mapA.lit, b: mapB && mapB.lit });
    for (const P of [A, B]) await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar ? window.__broDashPanelBus.toBar() : null; } catch (e) { /* fine */ } });

    /* ── 5: leaving lets it all go ── */
    const before = await A.page.evaluate(() => window.__btPalette());
    const { FARM_GATE } = await import(H.REPO + '/src/data/farmLayout.js');
    /* onto the gate (mp-farmwalk's way out: its boots at y 1376) */
    await H.hopTo(A, FARM_GATE.x, 1376 - 52, { step: 80, gap: 220, tries: 60 }).catch(() => {});
    const out = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 60000, label: 'back in the Wheel' }).catch(() => null);
    await A.page.waitForTimeout(5000);
    const after = await A.page.evaluate(() => ({ pal: window.__btPalette(), load: window.__btPaletteLoad() }));
    console.log(`    leaving: before ${JSON.stringify(before)} after ${JSON.stringify(after)}`);
    rec.ok(`leaving the farm lets its numbers go: ${after.pal.liveFarm} of the farm's left (${before.liveFarm} on it), ${before.rowsUsed - after.pal.rowsUsed} rows of colours back at least, the reader ${after.load.reader ? 'still up' : 'gone'}`,
      !!out && out.zone === 'wheel' && after.pal.liveFarm === 0 && !after.load.reader, { out, before, after });

    const errs = [...A.logs, ...B.logs].filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', errs.length === 0, errs.slice(0, 4));
  } finally {
    stopAlive = true;
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
