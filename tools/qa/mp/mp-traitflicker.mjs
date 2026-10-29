/* ═══ THE TRAIT FLICKER: A WORN PIECE THAT PAINTS NOTHING FOR A FRAME (investigation, v2.3.3884) ═══
 *
 * The owner's one-frame "trait flicker".  P1's mp-speciesgc (claude/monkey-face)
 * saw the shirt paint 0 px for two or more frames on turning back to a facing,
 * with Pixi's collector quickened, and two misses on a first show.
 *
 * Here, a frame at a time, right after each draw: the yellow tee's pixels read
 * back off the drawing buffer inside the shirt sprite's own box (gl.readPixels,
 * before anything else draws) -- a frame where the sprite says it is drawn and
 * not one yellow pixel is there is a miss.  A computer (wide), the old path
 * (?lookpalette=0 unless TF_QUERY), a bro in a yellow tee.  The collector by
 * TF_GC:
 *   none   off (the first show of each facing, nothing let go)
 *   tex    only the textures' collection, quick (1.5 s, every 0.5 s)
 *   rend   only the renderables' collection, quick
 *   all    both, quick (P1's setting)
 *   real   the game's own (60 s), and a minute facing away (TF_AWAY_S)
 * The bro faces west, then south long enough to let west's pictures go, then
 * west again -- TF_CYCLES times -- and the misses are printed by facing.
 *
 *   TF_GC=tex node tools/qa/mp/run.mjs traitflicker
 */
import * as H from './harness.mjs';

const VIEW = { width: 1280, height: 800 };
const MODE = process.env.TF_GC || 'all';
const CYCLES = +(process.env.TF_CYCLES || 3);
const AWAY_S = +(process.env.TF_AWAY_S || (MODE === 'real' ? 65 : 3));

const INIT = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-shirt', 'tshirt');
  localStorage.setItem('bt-shirtcolor', 'yellow');
  if (${JSON.stringify(process.env.TF_LOOK || '')} === 'monkey') {
    /* P1's mp-speciesgc look: the monkey in a striped, printed tee */
    localStorage.setItem('bt-species', 'monkey');
    localStorage.setItem('bt-skin', 'monkeybrown');
    localStorage.setItem('bt-shirtpat', 'stripe-v:5');
    let art = '';
    for (let i = 0; i < 256; i++) { const x = i % 16, y = (i / 16) | 0; art += (x >= 5 && x <= 10 && y >= 4 && y <= 9) ? 'a' : '0'; }
    localStorage.setItem('bt-shirtart', art);
  }
} catch (e) {}`;

const TOOLS = (mode) => {
  if (window.__tf) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  if (!app) return false;
  const rend = app.renderer, gl = rend.gl;
  const T = window.__tf = { frames: 0, log: [], on: false, mode };
  /* right after the frame's own draw (pixiRenderer: app.render(), as
     headFrames.js headPixelsTick reads it) */
  const orig = app.render.bind(app);
  app.render = function (...a) {
    const out = orig(...a);
    if (!T.on) return out;
    try {
      const me = R.playerDisplayRaw();
      const s = me && me._gearShirt;
      const S = window._gameState.current;
      const rec = { f: T.frames++, facing: S._renderFacing, vis: !!(s && s.visible), y: -1 };
      if (s && s.visible) {
        const b = s.getBounds();
        const res = rend.resolution || 1, H0 = gl.drawingBufferHeight, W0 = gl.drawingBufferWidth;
        const x0 = Math.max(0, Math.floor(b.minX * res)), x1 = Math.min(W0, Math.ceil(b.maxX * res));
        const y0 = Math.max(0, Math.floor(b.minY * res)), y1 = Math.min(H0, Math.ceil(b.maxY * res));
        const w = x1 - x0, h = y1 - y0;
        if (w > 1 && h > 1) {
          const px = new Uint8Array(w * h * 4);
          gl.readPixels(x0, H0 - y1, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          let n = 0;
          for (let i = 0; i < px.length; i += 4) if (px[i] > 170 && px[i + 1] > 150 && px[i + 2] < 110) n++;
          rec.y = n;
        }
        const t = s.texture, src = t && t.source;
        rec.src = src ? (src.resource && src.resource.constructor ? src.resource.constructor.name : '?') + ':' + src.uid + (src._gpuData && Object.keys(src._gpuData).length ? '' : ':nogpu') : null;
      }
      T.log.push(rec);
    } catch (e) { T.err = String(e && e.message || e); }
    return out;
  };
  /* the collector: quick, and for one kind only by mode */
  const gc = rend.gc;
  if (gc && mode !== 'real') {
    gc.enabled = false;
    if (mode !== 'none') {
      gc.maxUnusedTime = 1500; gc._frequency = 500;
      const runHash = gc.runOnHash.bind(gc), runRes = gc.runOnResource.bind(gc);
      const want = (type) => mode === 'all' || (mode === 'tex' ? type !== 'renderable' : type === 'renderable');
      gc.runOnHash = (entry, now) => (want(entry.type) ? runHash(entry, now) : undefined);
      gc.runOnResource = (resource, now, wi) => {
        if (want(resource._gcData && resource._gcData.type)) return runRes(resource, now, wi);
        gc._managedResources[wi] = resource; resource._gcData.index = wi; return wi + 1;
      };
      gc.enabled = true;
    }
  }
  T.gc = gc ? { on: gc.enabled, max: gc.maxUnusedTime, freq: gc._frequency, hashes: gc._managedResourceHashes.map((h) => h.type + ':' + (h.context && h.context._name || h.hash)) } : null;
  return true;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Flickbro', wsPort, webPort, viewport: VIEW, touch: false, wide: true, world: 'wheel', init: INIT, query: process.env.TF_QUERY != null ? process.env.TF_QUERY : 'lookpalette=0' });
  const page = P.page;
  const stopAlive = H.keepAlive ? H.keepAlive(P) : null;
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 60 });
    await page.waitForTimeout(1500);
    const ok = await page.evaluate(TOOLS, MODE);
    const gcInfo = await page.evaluate(() => window.__tf.gc);
    console.log(`    mode ${MODE}: collector ${JSON.stringify(gcInfo)}`);
    rec.ok('the page tools (guard)', !!ok, gcInfo);
    const stick = (x, y) => page.evaluate(([x, y]) => { const S = window._gameState.current; S.stickX = x; S.stickY = y; }, [x, y]);
    const face = async (k, ms) => { const a = k * Math.PI / 4; await stick(Math.cos(a), Math.sin(a)); await page.waitForTimeout(350); await stick(0, 0); await page.waitForTimeout(ms); };
    await page.evaluate(() => { window.__tf.on = true; });
    /* first shows: every facing once, nothing let go yet (mode none: the collector is off) */
    for (const k of [4, 3, 5, 6, 7, 0, 1, 2]) await face(k, 700);
    for (let c = 0; c < CYCLES; c++) {
      await face(2, AWAY_S * 1000);   /* south: west's pictures go */
      await face(4, 1500);            /* west again */
      await face(3, 1200);            /* south-west */
    }
    const out = await page.evaluate(() => { const T = window.__tf; T.on = false; return { log: T.log, err: T.err || null }; });
    const by = {};
    let misses = 0, counted = 0;
    const runs = [];
    let cur = 0;
    for (const r of out.log) {
      if (!r.vis || r.y < 0) { cur = 0; continue; }
      counted++;
      const f = r.facing;
      by[f] = by[f] || { n: 0, miss: 0 };
      by[f].n++;
      if (r.y === 0) { misses++; by[f].miss++; cur++; if (cur === 1) runs.push({ at: r.f, facing: f, src: r.src, len: 1 }); else runs[runs.length - 1].len++; } else cur = 0;
    }
    console.log(`    mode ${MODE}: ${counted} frames with the shirt shown, ${misses} with no yellow; by facing ${JSON.stringify(by)}`);
    console.log(`    runs of misses: ${JSON.stringify(runs.slice(0, 20))}${out.err ? ' err ' + out.err : ''}`);
    rec.ok(`mode ${MODE}: frames the shirt said it drew and painted nothing: ${misses} of ${counted} (${runs.length} runs)`, true, { by, runs: runs.slice(0, 30) });
  } finally {
    try { stopAlive && stopAlive(); } catch (e) { /* gone */ }
    await P.ctx.close().catch(() => {});
  }
}
