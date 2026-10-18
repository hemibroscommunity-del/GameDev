/* ═══ PICTURES KEPT AS COLOUR NUMBERS, COLOURED ON THE GPU (v2.3.3190) ═══
 *
 * Owner, 2026-10-12, asked whether every asset could be "recreated byte for
 * byte using pure code": no -- a picture made by code costs the graphics chip
 * what a loaded one does -- but the Wheel's ground and its objects are on 256
 * colours or fewer each, so each pixel can be kept as one byte (its colour's
 * number) and a few lines on the graphics chip look the colour up as it
 * draws.  The same picture, a quarter of the memory ("Yes").
 * rendering/paletteTex.js.
 *
 * Two phones (390 x 844, dpr 3) in the Wheel: A as the game is, B with
 * `?nopalette` (the old way, four bytes a pixel), both `?nolife` (the
 * buildings' smoke and lamps move; they are not pictures from a sheet).
 * Asserted:
 *   1. on A the ground's pieces and the objects' pages are colour numbers on
 *      the GPU (R8 textures, their colours in the atlas), none sent as
 *      colours or turned back into them; on B none are;
 *   2. A's GPU textures and asset cache are smaller than B's, at the same spot;
 *   3. THE SAME PICTURE: at BroTown's arrival and at a fishing spot on the
 *      commons (water, trees), both phones stand on the same pixel with the
 *      water's clock held, and the world is rendered at the phone's own pixels
 *      with only the ground, the objects and the objects' shadows showing (the
 *      people, monsters and screen are things this does not draw) -- A's frame
 *      against B's, every pixel: how many differ at all and by how much.  And
 *      A against itself a moment later, the floor of the measure (0);
 *   4. what reads a sheet's picture on the CPU reads the same: each drawn
 *      object's shadow base, read off its art (propGround.readArtBottoms via
 *      __btWheelObjects.caster), is the same on A as on B;
 *   5. after a black screen's rebuild A's ground and objects come back as
 *      numbers, and its frame is the same picture again;
 *   6. no page errors on either.
 * Pictures: out/palette-{town,water}-{numbers,colours,diff}.png, and the two
 * phones' screens, out/palette-screen-{numbers,colours}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodePNG } from '../../world/png.mjs';

const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const WATER_T = 12.5;

/* In both pages: the world rendered at device pixels with only the ground,
   the objects and the objects' own shadows showing, the camera where it is
   told to be (so both phones draw from the same point), everything restored
   before the next frame (this all runs inside one task). */
const INIT = () => {
  /* this page's frames held while the OTHER page's drawing is timed: both
     share the one software chip, so a frame of this one queued in front of
     the other's timed frames doubled some of them (__palCost, below) */
  const raf = window.requestAnimationFrame.bind(window);
  let held = [];
  window.__palHold = false;
  window.requestAnimationFrame = (cb) => { if (window.__palHold) { held.push(cb); return 0; } return raf(cb); };
  window.__palRelease = () => { window.__palHold = false; const q = held; held = []; for (const cb of q) raf(cb); return q.length; };
  /* what each worker is told when it starts */
  window.__initMsgs = [];
  const pm = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (m) {
    try { if (m && m.type === 'init') window.__initMsgs.push({ moving: m.moving, palette: m.palette, t: Math.round(performance.now()) }); } catch (e) { /* ignore */ }
    return pm.apply(this, arguments);
  };
  window.__palFrame = (cam, only) => {
    const R = window._pixiRenderer, app = R && R.app, r = app && app.renderer;
    if (!r) return { err: 'no renderer' };
    let ent = null;
    const find = (c, d) => { if (ent || !c || d > 5) return; if (c.label === 'entities') { ent = c; return; } for (const k of (c.children || [])) find(k, d + 1); };
    find(app.stage, 0);
    if (!ent) return { err: 'no entities layer' };
    const W = ent.parent;
    const hidden = [];
    const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
    /* everything off the path from the stage to the world */
    for (let n = W; n && n.parent; n = n.parent) for (const s of n.parent.children) if (s !== n) hide(s);
    const KEEP = new Set(['tiles', 'shadows', 'entities', 'gatherNodesFront']);
    const objPage = (t) => { const l = t && t.source && t.source.label; return !!(l && /world\/objects\//.test(l)); };
    /* `only`: one of 'ground', 'shadows', 'objects' (to find which differs) */
    const ONLY = { ground: ['tiles'], shadows: ['shadows'], objects: ['entities', 'gatherNodesFront'] }[only] || null;
    for (const L of W.children) {
      if (!KEEP.has(L.label) || (ONLY && ONLY.indexOf(L.label) < 0)) { hide(L); continue; }
      if (L.label === 'shadows') {
        /* the shadow pieces cast by the objects' pictures, only -- v2.3.3408:
           in their own container when they are drawn before the frame
           (shadows.js), the layer then holding only the shade's quad */
        const walk = (c) => { for (const k of (c.children || [])) { if (k.label === 'shadowShade') continue; if (k.texture !== undefined) { if (!objPage(k.texture)) hide(k); } else walk(k); } };
        walk(L);
        const SPX = window.__btShadowPrepass;
        if (SPX && SPX.casts) for (const C of SPX.casts()) walk(C);
      } else if (L.label !== 'tiles') {
        for (const k of L.children) if (k.label !== 'wheelObject') hide(k);
      }
    }
    /* the ground's pieces in one order, by where they lie: where two overlap
       (half a game px each side) the one on top is otherwise whichever was
       laid later, which is the order they happened to come in */
    let pieces = null, order = null;
    const findP = (c, d) => { if (pieces || !c || d > 8) return; if (c.label === 'wheelGroundPieces') { pieces = c; return; } for (const k of (c.children || [])) findP(k, d + 1); };
    findP(W, 0);
    if (pieces) {
      order = pieces.children.slice();
      const sorted = order.slice().sort((p, q) => (p.width > 4000 ? -1 : q.width > 4000 ? 1 : (p.y - q.y) || (p.x - q.x)));
      pieces.removeChildren();
      for (const k of sorted) pieces.addChild(k);
    }
    const was = { x: W.x, y: W.y, sx: W.scale.x, sy: W.scale.y };
    if (cam) { W.x = cam.x; W.y = cam.y; W.scale.set(cam.sx, cam.sy); }
    /* ...and the shadow layer's lock to its pixel grid worked out for that
       camera (shadows.js lockToWorldGrid), not the last frame's: the camera
       eases a few px after the player stops, and the lock moves the layer by
       whole CSS px */
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
    /* v2.3.3408: drawn before the frame, the pieces' picture is drawn again
       for this camera and these pieces (the lock is worked out in it) */
    const SPR = window.__btShadowPrepass;
    if (!shF && SPR && SPR.redraw) SPR.redraw();
    let out = null, err = null;
    try {
      const sw = app.screen.width, sh = app.screen.height;
      const frame = new (app.screen.constructor)(0, 0, sw, sh);   /* a Rectangle, the screen's own class */
      const px = r.extract.pixels({ target: app.stage, frame, resolution: r.resolution });
      const u8 = new Uint8Array(px.pixels.buffer, px.pixels.byteOffset, px.pixels.byteLength);
      let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      out = { w: px.width, h: px.height, b64: btoa(s) };
    } catch (e) { err = String((e && e.message) || e); }
    W.x = was.x; W.y = was.y; W.scale.set(was.sx, was.sy);
    if (shWas) { shL.position.set(shWas.x, shWas.y); shU.uShift[0] = shWas.u0; shU.uShift[1] = shWas.u1; }
    if (pieces && order) { pieces.removeChildren(); for (const k of order) pieces.addChild(k); }
    for (const o of hidden) o.visible = true;
    if (!shF && SPR && SPR.redraw) SPR.redraw();   /* v2.3.3408: and back as it was */
    return out ? { ...out, cam: { x: cam ? cam.x : was.x, y: cam ? cam.y : was.y, sx: cam ? cam.sx : was.sx, sy: cam ? cam.sy : was.sy } } : { err };
  };
  /* what drawing costs: the whole frame, the camera held, rendered `n` times
     and each time FINISHED (a one-pixel read waits for the chip -- here the
     software one, so the colouring's arithmetic is in the time), and the
     draw calls one frame makes */
  window.__palCost = (cam, n) => {
    const R = window._pixiRenderer, app = R && R.app, r = app && app.renderer, gl = r && r.gl;
    if (!gl) return { err: 'no renderer' };
    let ent = null;
    const find = (c, d) => { if (ent || !c || d > 5) return; if (c.label === 'entities') { ent = c; return; } for (const k of (c.children || [])) find(k, d + 1); };
    find(app.stage, 0);
    const W = ent && ent.parent;
    if (!W) return { err: 'no world' };
    const was = { x: W.x, y: W.y, sx: W.scale.x, sy: W.scale.y };
    if (cam) { W.x = cam.x; W.y = cam.y; W.scale.set(cam.sx, cam.sy); }
    const one = new Uint8Array(4);
    const draw = () => { r.render({ container: app.stage }); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one); };
    const out = { ms: [], draws: 0 };
    try {
      for (let i = 0; i < 3; i++) draw();
      const names = ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced'];
      const orig = names.map((k) => gl[k]);
      names.forEach((k, i) => { if (orig[i]) gl[k] = function () { out.draws++; return orig[i].apply(this, arguments); }; });
      try { draw(); } finally { names.forEach((k, i) => { if (orig[i]) gl[k] = orig[i]; }); }
      for (let i = 0; i < n; i++) { const t0 = performance.now(); draw(); out.ms.push(performance.now() - t0); }
    } catch (e) { out.err = String((e && e.message) || e); }
    W.x = was.x; W.y = was.y; W.scale.set(was.sx, was.sy);
    return out;
  };
  /* the world container's camera now */
  window.__palCam = () => {
    const R = window._pixiRenderer, app = R && R.app;
    let ent = null;
    const find = (c, d) => { if (ent || !c || d > 5) return; if (c.label === 'entities') { ent = c; return; } for (const k of (c.children || [])) find(k, d + 1); };
    find(app && app.stage, 0);
    const W = ent && ent.parent;
    return W ? { x: W.x, y: W.y, sx: W.scale.x, sy: W.scale.y } : null;
  };
};

async function inWheel(P) {
  await H.enterWorld(P);
  return H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
}
/* nothing in flight: the ground laid, the pages in, every drawn object's
   base read off its art */
async function settle(P) {
  const ok = await P.page.waitForFunction(() => {
    const t = window.__btWorldTrial && window.__btWorldTrial.stats;
    const o = window.__btWheelObjects && window.__btWheelObjects.stats;
    return t && t.resident > 0 && t.loading === 0 && t.short === 0 && o && o.loading === 0;
  }, null, { timeout: 90000 }).then(() => true, () => false);
  await P.page.waitForTimeout(3000);
  /* still so after the wait: nothing laid again, no page coming */
  const again = await P.page.evaluate(() => {
    const t = window.__btWorldTrial.stats, o = window.__btWheelObjects.stats;
    return { short: t.short, loading: t.loading, objLoading: o.loading, resident: t.resident };
  });
  return ok && !again.short && !again.loading && !again.objLoading ? true : again;
}
/* stand exactly on (x, y), still, and let the camera come to rest there */
async function standAt(P, x, y) {
  await H.hopTo(P, x, y, { tries: 220, step: 140, gap: 200 });
  for (let i = 0; i < 3; i++) {
    await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; }, { x, y });
    await P.page.waitForTimeout(700);
  }
}
const memory = (P) => P.page.evaluate(() => {
  const g = window.__btGpuTex ? window.__btGpuTex(400) : null;
  const t = window.__btTex ? window.__btTex() : null;
  const fmt = {};
  if (g && g.list) for (const r of g.list) { const k = r.format || '?'; fmt[k] = +((fmt[k] || 0) + r.mb).toFixed(1); }
  const o = window.__btWheelObjects ? window.__btWheelObjects.stats : null;
  return { gpuMB: g ? g.mb : null, byFormat: fmt, cacheMB: t ? t.mb : null, pal: window.__btPalette ? window.__btPalette() : null,
    objects: o ? { pages: o.pages, mb: o.mb, drawn: o.drawn } : null };
});
const casters = (P) => P.page.evaluate(() => {
  const W = window.__btWheelObjects, S = window._gameState.current;
  const out = {};
  for (const n of W.near(S.player.x, S.player.y, 900)) {
    if (!W.drawn(n.i)) continue;
    const c = W.caster(n.i);
    if (c && c.model === 'cols') out[n.i] = { id: n.id, lowest: c.lowest, columns: c.columns, solid: c.solid, bottoms: c.bottoms };
  }
  return out;
});
const grab = async (P, cam, only) => {
  const f = await P.page.evaluate(([c, o]) => window.__palFrame(c, o), [cam || null, only || null]);
  if (!f || f.err) return { err: f ? f.err : 'nothing' };
  return { w: f.w, h: f.h, px: Buffer.from(f.b64, 'base64'), cam: f.cam };
};
/* every pixel of two frames: how many differ, by how much (the biggest
   channel), and a picture of where (red, brighter for more) */
function compare(a, b) {
  if (!a.px || !b.px || a.w !== b.w || a.h !== b.h) return { err: `sizes ${a.w}x${a.h} vs ${b.w}x${b.h}` };
  const n = a.w * a.h, diff = Buffer.alloc(n * 4);
  let drawn = 0, differ = 0, worst = 0;
  const hist = { 1: 0, 2: 0, '3-8': 0, '9+': 0 };
  for (let i = 0, o = 0; i < n; i++, o += 4) {
    const pa = a.px, pb = b.px;
    if (pa[o + 3] || pb[o + 3]) drawn++;
    const d = Math.max(Math.abs(pa[o] - pb[o]), Math.abs(pa[o + 1] - pb[o + 1]), Math.abs(pa[o + 2] - pb[o + 2]), Math.abs(pa[o + 3] - pb[o + 3]));
    /* the difference picture: the frame faded, the differing pixels red */
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
  const A = await H.newPlayer(browser, { name: 'numbers', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'nolife', init: INIT });
  const B = await H.newPlayer(browser, { name: 'colours', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'nolife&nopalette', init: INIT });
  /* the whole frame drawn and finished, A and B in turn three times, the
     other page's frames held meanwhile (it shares the one software chip),
     and the draw calls a frame makes: what colouring numbers costs.  On this
     box the chip is software (headless Chromium, --disable-gpu), so the time
     is not a phone's, only the two ways against each other */
  const costs = [];
  const cost = async (label, at) => {
    const ms = { A: [], B: [] }, draws = { A: null, B: null }, errs = [];
    for (let round = 0; round < 3; round++) {
      for (const [nm, P, O] of [['A', A, B], ['B', B, A]]) {
        await O.page.evaluate(() => { window.__palHold = true; });
        await P.page.waitForTimeout(3000);   /* the other's last frame finished */
        const c = await P.page.evaluate(([c, n]) => window.__palCost(c, n), [at, 6]);
        await O.page.evaluate(() => window.__palRelease());
        if (c && !c.err) { ms[nm].push(...c.ms); draws[nm] = c.draws; } else errs.push(c && c.err);
      }
    }
    const mid = (v) => { const s = v.slice().sort((x, y) => x - y); return s.length ? +s[s.length >> 1].toFixed(1) : null; };
    const r = { label, A: { ms: mid(ms.A), draws: draws.A }, B: { ms: mid(ms.B), draws: draws.B }, errs };
    console.log(`    cost at ${label}: the frame drawn and finished in ${r.A.ms} ms with numbers, ${r.B.ms} ms with colours; draw calls ${r.A.draws} and ${r.B.draws}`);
    return r;
  };
  try {
    const [oa, ob] = await Promise.all([inWheel(A), inWheel(B)]);
    rec.ok('both phones in the Wheel (guard)', !!oa && !!ob, { oa, ob });
    if (!oa || !ob) return;
    for (const P of [A, B]) {
      const id = await H.readState(P, (S) => S.myId);
      await P.page.evaluate(() => { const S = window._gameState.current; const R = S.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; });
      await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 15 }).catch(() => null);
    }
    const home = await H.readState(A, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
    await Promise.all([standAt(A, home.x, home.y), standAt(B, home.x, home.y)]);
    await Promise.all([settle(A), settle(B)]);
    for (const P of [A, B]) await P.page.evaluate((t) => { if (window.__btWaves) window.__btWaves.hold(t); }, WATER_T);
    await A.page.waitForTimeout(500);

    /* ── 1-2: what each keeps ── */
    const ma = await memory(A), mb = await memory(B);
    console.log(`    numbers: ${JSON.stringify(ma)}`);
    console.log(`    colours: ${JSON.stringify(mb)}`);
    const pa = ma.pal || {}, pb = mb.pal || {};
    rec.ok(`A draws the Wheel's pictures as colour numbers: ${pa.livePieces} ground pieces and ${pa.livePages} object pages are R8 (${pa.liveMB} MB), none sent as colours (${pa.piecesRgba}) or turned back (${pa.expanded}), most colours a piece had ${pa.pieceColoursMax}`,
      pa.on === true && pa.livePieces >= 20 && pa.livePages >= 5 && !pa.piecesRgba && !pa.expanded && !pa.pagesRgba && !pa.rowsFull, pa);
    rec.ok(`B (?nopalette) draws none so: ${pb.live} R8 sources`, pb.on === false && !pb.live, pb);
    rec.ok(`at the same spot A's GPU holds ${ma.gpuMB} MB of textures to B's ${mb.gpuMB} (${(mb.gpuMB - ma.gpuMB).toFixed(1)} MB less), and its asset cache ${ma.cacheMB} to ${mb.cacheMB}`,
      ma.gpuMB < mb.gpuMB - 15 && ma.cacheMB < mb.cacheMB - 10, { ma, mb });
    await A.page.screenshot({ path: join(OUT, 'palette-screen-numbers.png') });
    await B.page.screenshot({ path: join(OUT, 'palette-screen-colours.png') });

    /* ── 3: the same picture, at BroTown's arrival ── */
    const cam = await A.page.evaluate(() => window.__palCam());
    const camB = await B.page.evaluate(() => window.__palCam());
    console.log(`    camera: A ${JSON.stringify(cam)}  B ${JSON.stringify(camB)}`);
    const fa = await grab(A, cam), fa2 = await grab(A, cam), fb = await grab(B, cam);
    const self = compare(fa, fa2), town = compare(fa, fb);
    if (!town.err) { save('palette-town-numbers.png', fa); save('palette-town-colours.png', fb); save('palette-town-diff.png', town); }
    console.log(`    town: ${JSON.stringify({ ...town, diff: undefined })}  (A against itself: ${self.differ} px)`);
    rec.ok(`the floor of the measure: A's frame against itself a moment later, ${self.differ} px differ`, !self.err && self.differ === 0, { ...self, diff: undefined });
    rec.ok(`BroTown's arrival, the same picture: ${town.differ} of ${town.drawn} drawn px (${town.share}%) differ, by at most ${town.worst} of 255 (${JSON.stringify(town.hist)})`,
      !town.err && town.drawn > 0.5 * town.w * town.h && town.worst <= 2 && town.share < 2, { ...town, diff: undefined });

    /* ── what drawing costs, at the arrival ── */
    costs.push(await cost('town', cam));

    /* ── 4: a shadow's base read off each object's art ── */
    const ca = await casters(A), cb = await casters(B);
    const ids = Object.keys(ca).filter((k) => cb[k]);
    const off = ids.filter((k) => JSON.stringify(ca[k]) !== JSON.stringify(cb[k]));
    rec.ok(`a shadow's base read off the art the same: ${ids.length - off.length} of ${ids.length} drawn objects' bases match, column for column`,
      ids.length >= 5 && off.length === 0, { off: off.slice(0, 6).map((k) => [ca[k], cb[k]]) });

    /* ── 3 again: water and trees, at the nearest fishing spot ── */
    const { WHEEL_NODES } = await import(H.REPO + '/server/src/wheelspawns.js');
    /* the commons' fishing spots (WHEEL_NODES: [kind, x, y, tier], 'f' a spot) */
    const spots = (WHEEL_NODES.commons || []).filter((n) => n[0] === 'f').map((n) => ({ x: n[1], y: n[2] }));
    spots.sort((p, q) => Math.hypot(p.x - home.x, p.y - home.y) - Math.hypot(q.x - home.x, q.y - home.y));
    const spot = spots[0];
    rec.ok('a fishing spot near town to stand at (guard)', !!spot, { n: spots.length });
    if (spot) {
      /* (the spot is the angler's seat, on the bank; its water lies west) */
      const at = { x: Math.round(spot.x), y: Math.round(spot.y) };
      await Promise.all([standAt(A, at.x, at.y), standAt(B, at.x, at.y)]);
      const st = await Promise.all([settle(A), settle(B)]);
      rec.ok('both phones settled at the water: the ground laid and every page in (guard)', st[0] === true && st[1] === true, st);
      for (const P of [A, B]) await P.page.evaluate((t) => { if (window.__btWaves) window.__btWaves.hold(t); }, WATER_T);
      const wcam = await A.page.evaluate(() => window.__palCam());
      const wcamB = await B.page.evaluate(() => window.__palCam());
      console.log(`    camera at the water: A ${JSON.stringify(wcam)}  B ${JSON.stringify(wcamB)}`);
      /* both ground workers draw the water moving, so both take the pictures'
         frozen web of light out (ground.js CALM WATER) -- a worker started
         before the renderer was made would keep it, and the two ponds would
         differ for a reason this is not about */
      const calmOf = (P) => P.page.evaluate(() => ({ calm: window.__btWorldTrial.stats.calm, inits: window.__initMsgs }));
      const [ka, kb] = [await calmOf(A), await calmOf(B)];
      rec.ok('both phones draw the water moving and took the web of light out of its pictures (guard)', !!(ka.calm && kb.calm), { A: ka, B: kb });
      const wca = await casters(A), wcb = await casters(B);
      const wids = Object.keys(wca).filter((k) => wcb[k]);
      const woff = wids.filter((k) => JSON.stringify(wca[k]) !== JSON.stringify(wcb[k]));
      const colDiff = (x, y) => { const out = []; if (x.bottoms && y.bottoms) x.bottoms.forEach((v, i) => { if (v !== y.bottoms[i]) out.push([i, v, y.bottoms[i]]); }); return out; };
      rec.ok(`...and there too a shadow's base is read off the art the same: ${wids.length - woff.length} of ${wids.length} drawn objects' bases match, column for column`,
        wids.length >= 5 && woff.length === 0, woff.slice(0, 4).map((k) => [wca[k].id, colDiff(wca[k], wcb[k]).slice(0, 6)]));
      const wa = await grab(A, wcam), wb = await grab(B, wcam);
      const water = compare(wa, wb);
      if (!water.err) { save('palette-water-numbers.png', wa); save('palette-water-colours.png', wb); save('palette-water-diff.png', water); }
      const wv = await A.page.evaluate(() => (window.__btWaves ? window.__btWaves.probe() : null));
      console.log(`    water: ${JSON.stringify({ ...water, diff: undefined })}  waves ${JSON.stringify(wv && { meshes: wv.meshes, ok: wv.ok })}`);
      const waterOk = !water.err && wv && wv.meshes > 0 && water.worst <= 2 && water.share < 2;
      if (!waterOk) {
        /* which of the three differs (the ground with its water, the
           objects' shadows, the objects) */
        for (const only of ['ground', 'shadows', 'objects']) {
          const la = await grab(A, wcam, only), lb = await grab(B, wcam, only);
          const c = compare(la, lb);
          if (!c.err) { save(`palette-water-${only}-diff.png`, c); save(`palette-water-${only}-numbers.png`, la); save(`palette-water-${only}-colours.png`, lb); }
          console.log(`      ${only} alone: ${JSON.stringify({ ...c, diff: undefined })}`);
        }
      }
      rec.ok(`at the water (${wv ? wv.meshes : 0} moving-water quads), the same picture: ${water.differ} of ${water.drawn} px (${water.share}%) differ, by at most ${water.worst} (${JSON.stringify(water.hist)})`,
        waterOk, { ...water, diff: undefined });

      costs.push(await cost('water', wcam));

      /* ── 5: a black screen's rebuild, on both phones ── */
      const marks = [A.logs.length, B.logs.length];
      await Promise.all([A, B].map((P) => P.page.evaluate(() => window._rebuildRenderer && window._rebuildRenderer('mp-palette'))));
      await A.page.waitForTimeout(6000);
      await Promise.all([settle(A), settle(B)]);
      for (const P of [A, B]) await P.page.evaluate((t) => { if (window.__btWaves) window.__btWaves.hold(t); }, WATER_T);
      for (const [nm, P, mk] of [['A', A, marks[0]], ['B', B, marks[1]]]) {
        const pl = await P.page.evaluate(() => ({ pages: window.__btWheelObjects.stats.pages, loading: window.__btWheelObjects.stats.loading,
          ms: window.__btWheelObjects.pageLog().slice(-8).map((e) => e.ms) }));
        console.log(`      ${nm} after the rebuild: pages ${pl.pages}, loading ${pl.loading}, the last pages took ${JSON.stringify(pl.ms)} ms; ${JSON.stringify(P.logs.slice(mk).filter((l) => /error/i.test(l)).slice(-4))}`);
      }
      const m2 = await memory(A);
      const ra = await grab(A, wcam), rb = await grab(B, wcam);
      const again = compare(ra, rb);
      if (!again.err) { save('palette-rebuilt-numbers.png', ra); save('palette-rebuilt-colours.png', rb); save('palette-rebuilt-diff.png', again); }
      console.log(`    after a rebuild: ${JSON.stringify({ pal: m2.pal, gpuMB: m2.gpuMB })} ${JSON.stringify({ ...again, diff: undefined })}`);
      rec.ok(`after a black screen's rebuild the pictures are colour numbers again (${m2.pal && m2.pal.livePieces} pieces, ${m2.pal && m2.pal.livePages} pages) and the same picture as ?nopalette's rebuilt: ${again.differ} px differ, by at most ${again.worst}`,
        !!(m2.pal && m2.pal.on && m2.pal.livePieces >= 20 && m2.pal.livePages >= 1) && !again.err && again.worst <= 2 && again.share < 2, { pal: m2.pal, ...again, diff: undefined });
    }

    try { writeFileSync(join(OUT, 'palette-cost.json'), JSON.stringify(costs, null, 1)); } catch (e) { /* ignore */ }
    rec.ok(`what it costs to draw, measured: ${costs.map((c) => `${c.label} ${c.A.ms} ms / ${c.B.ms} ms, ${c.A.draws} / ${c.B.draws} draw calls`).join('; ')} (with numbers / with colours, the whole frame on this box's software chip) (guard)`,
      costs.length >= 1 && costs.every((c) => c.A.ms > 0 && c.B.ms > 0 && c.A.draws > 0 && c.B.draws > 0), costs);
    const errs = [...A.logs, ...B.logs].filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', errs.length === 0, errs.slice(0, 4));
  } finally {
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
