/* ═══ EVERY PICTURE FROM A FILE, HELD ONCE (v2.3.3715) ═══
 *
 * docs/specs/pictures-once.md.  A phone (390 x 844, dpr 3) in the Wheel's
 * BroTown walks to the Flame Fields' goblins, fights, and there lists every
 * picture in Pixi's asset cache (window.__btTex's), one row each: its size,
 * whether it is on the graphics chip, what it is kept as in the page (an
 * <img>, colour numbers, nothing), how many colours it is drawn on, what
 * draws it (a sprite, a figure's piece, a mesh...) and whether anything read
 * it back on the CPU (a 2D canvas's drawImage / createPattern of its <img>,
 * caught by an init script, with the reader's place in the code).
 *
 * The census is the spec's table; the same run checks the two switches, on by
 * default (BT_QA_QUERY=onecopy=0 / picnumbers=0 turns either off): with them on, the page's copies
 * let go of and the chip's copies kept, every picture still drawn, nothing
 * read back after its copy went, and no page errors.
 *
 * Results: tools/qa/mp/out/picsonce.json.  QA_PO_COLOURS=0 skips counting
 * colours (it draws every picture on a canvas once, in the page).
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const FIGHT_MS = 9000;
const LOOKS_MS = 45000;
const COLOURS = process.env.QA_PO_COLOURS !== '0';

/* every <img> drawn onto a 2D canvas (or made a pattern of), with who did it */
const READS_INIT = () => {
  const note = (img, how) => {
    try {
      /* a picture whose page copy was let go of, read anyway: the bug ?onecopy must never have */
      if (img && img.__btReleased) { window.__poReleasedReads = (window.__poReleasedReads || 0) + 1; return; }
      if (!img || !(img instanceof HTMLImageElement) || window.__poQuiet) return;
      const st = String(new Error().stack || '').split('\n').slice(2, 6)
        .map((l) => l.trim().replace(/^at\s+/, '').replace(/https?:\/\/[^/]+/g, '').replace(/\?[^:)]*/g, ''))
        .filter((l) => !/READS_INIT|<anonymous>/.test(l)).slice(0, 2).join(' < ');
      const r = img.__btReads || (img.__btReads = []);
      if (r.length < 6) r.push({ how, t: Math.round(performance.now()), who: st });
      else r[5].n = (r[5].n || 1) + 1;
      window.__poReadN = (window.__poReadN || 0) + 1;
    } catch (e) { /* QA only */ }
  };
  for (const C of [window.CanvasRenderingContext2D, window.OffscreenCanvasRenderingContext2D].filter(Boolean)) {
    const di = C.prototype.drawImage;
    C.prototype.drawImage = function (img) { note(img, 'drawImage'); return di.apply(this, arguments); };
    const cp = C.prototype.createPattern;
    if (cp) C.prototype.createPattern = function (img) { note(img, 'pattern'); return cp.apply(this, arguments); };
  }
  if (window.createImageBitmap) {
    const cib = window.createImageBitmap;
    window.createImageBitmap = function (img) { note(img, 'bitmap'); return cib.apply(this, arguments); };
  }
};

/* the census, in the page */
const CENSUS = (withColours) => {
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  const out = [];
  const seen = new Set();
  const cached = new Set(window.__btCacheSources ? window.__btCacheSources() : []);
  const srcs = [...cached];
  try { for (const s of (R.texture.managedTextures || [])) if (s && !cached.has(s)) srcs.push(s); } catch (e) { /* none */ }
  /* what draws each source: the stage's nodes by their texture */
  const drawers = new Map();
  const walk = (n, depth) => {
    if (!n || depth > 40) return;
    const t = n.texture || n._texture;
    const s = t && t.source;
    if (s) {
      let kind = (n.constructor && n.constructor.name) || '?';
      const p = n.parent, g = p && p.parent;
      const sharp = !n._noSharp && (n._sharp || !!n._vShade || (p && p._vShadeKids) || (g && g._vShadeKids && p !== g._uiLayer));
      if (sharp) kind += ':figure';
      const set = drawers.get(s) || new Set();
      set.add(kind);
      drawers.set(s, set);
    }
    if (n.mask && n.mask.texture && n.mask.texture.source) {
      const set = drawers.get(n.mask.texture.source) || new Set();
      set.add('mask');
      drawers.set(n.mask.texture.source, set);
    }
    for (const k of (n.children || [])) walk(k, depth + 1);
  };
  try { walk(R.stage, 0); } catch (e) { /* half a stage */ }
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  for (const src of srcs) {
    if (!src || src.destroyed || seen.has(src.uid)) continue;
    seen.add(src.uid);
    const res = src.resource;
    const w = src.pixelWidth || 0, h = src.pixelHeight || 0;
    const as = src.__btOnce && src.__btOnce.released ? 'released'
      : (src._btPal ? 'numbers' : (res instanceof HTMLImageElement ? 'img'
        : (res instanceof HTMLCanvasElement ? 'canvas' : (ArrayBuffer.isView(res) ? 'buffer' : (res ? 'other' : 'none')))));
    const onGpu = !!(R && src._gpuData && src._gpuData[R.uid]);
    let colours = null;
    const img = res instanceof HTMLImageElement ? res : null;
    const drawable = img || (res instanceof HTMLCanvasElement && res.width > 0) || (typeof ImageBitmap !== 'undefined' && res instanceof ImageBitmap);
    if (withColours && drawable && w * h <= 4096 * 4096 && (res.width | 0) === w) {
      try {
        cv.width = w; cv.height = h;
        ctx.clearRect(0, 0, w, h);
        window.__poQuiet = true;
        ctx.drawImage(res, 0, 0);
        const d = new Uint32Array(ctx.getImageData(0, 0, w, h).data.buffer);
        const set = new Set();
        for (let i = 0; i < d.length; i++) { set.add(d[i]); if (set.size > 256) break; }
        colours = set.size > 256 ? '>256' : set.size;
      } catch (e) { colours = 'err'; }
    }
    if (src._btPal) colours = (src._btPal.rgba ? '<=256' : colours);
    if (colours == null && src._btNumbers && src._btNumbers.pal) colours = src._btNumbers.pal.length;
    const reads = (img && img.__btReads) || (src.__btOnce && src.__btOnce.reads) || [];
    out.push({
      label: String(src.label || '').replace(/^https?:\/\/[^/]+/, ''), uid: src.uid, w, h, inCache: cached.has(src),
      fmt: src.format, held: !!src._btNumbers, pal: !!src._btPal,
      mb: +((w * h * 4) / 1048576).toFixed(2), as, onGpu,
      res: res ? [(res.constructor && res.constructor.name) || typeof res, res.width | 0, res.height | 0] : null, upload: src.uploadMethodId,
      scale: (src.style && src.style.scaleMode) || src.scaleMode, gc: src.autoGarbageCollect, colours,
      drawnBy: drawers.has(src) ? [...drawers.get(src)] : [],
      reads: reads.filter((r) => !/mp-picsonce|CENSUS/.test(r.who)).map((r) => `${r.how}@${r.t} ${r.who}${r.n ? ' x' + r.n : ''}`),
    });
  }
  window.__poQuiet = false;
  cv.width = 0; cv.height = 0;
  out.sort((a, b) => b.mb - a.mb);
  return out;
};

/* ?picnumbers: each monster strip kept as colour numbers drawn by the chip
   twice -- as it is, and from a canvas of the same pixels (the old way) -- at
   three scales, a cell at a time, and compared pixel by pixel */
const COMPARE = (maxStrips) => {
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  const srcs = (window.__btPicNumSources ? window.__btPicNumSources() : []).slice(0, maxStrips);
  if (!R || !srcs.length) return { strips: 0 };
  let sp = null;
  const find = (n, d) => { if (sp || !n || d > 30) return; if (n.texture && n.anchor && n.constructor && n.constructor.from) { sp = n; return; } for (const k of (n.children || [])) find(k, d + 1); };
  find(window._pixiRenderer.app.stage, 0);
  if (!sp) return { strips: 0, error: 'no sprite to borrow the classes of' };
  const Sprite = sp.constructor, Texture = sp.texture.constructor, Rect = sp.texture.frame.constructor;
  const out = { strips: 0, cells: 0, px: 0, over1: 0, maxDiff: 0, worst: null };
  for (const src of srcs) {
    const P = src._btPal, N = src._btNumbers;
    /* (an effect's numbers may be packed by now, p256.js: its canvas kept for
       the test is what it is compared against) */
    if (!P || (!N && !src.__btOrigCanvas)) continue;
    /* the packed canvas itself (kept for the test: __btPicNumVerify), or one
       made from the numbers */
    let cv = src.__btOrigCanvas && src.__btOrigCanvas.width === P.w ? src.__btOrigCanvas : null;
    if (cv) out.originals = (out.originals || 0) + 1;
    else {
      cv = document.createElement('canvas');
      cv.width = P.w; cv.height = P.h;
      const id = new ImageData(P.w, P.h);
      const o32 = new Uint32Array(id.data.buffer);
      for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) o32[y * P.w + x] = N.pal[N.idx[y * P.stride + x]];
      cv.getContext('2d').putImageData(id, 0, 0);
    }
    const ctex = Texture.from(cv);
    out.strips++;
    for (const sc of [1, 0.61, 1.37]) {
      for (let x0 = 0; x0 < P.w; x0 += 240) {
        const fw = Math.min(240, P.w - x0);
        const a = new Sprite(new Texture({ source: src, frame: new Rect(x0, 0, fw, P.h) }));
        const b = new Sprite(new Texture({ source: ctex.source, frame: new Rect(x0, 0, fw, P.h) }));
        for (const s of [a, b]) { s.scale.set(sc); s.x = 0.3; s.y = 0.2; }
        let pa = null, pb = null;
        try { pa = R.extract.pixels({ target: a, resolution: 1 }); pb = R.extract.pixels({ target: b, resolution: 1 }); } catch (e) { out.error = String(e && e.message || e); }
        a.destroy(); b.destroy();
        if (!pa || !pb || pa.width !== pb.width || pa.height !== pb.height) { out.sizeMismatch = (out.sizeMismatch || 0) + 1; continue; }
        out.cells++;
        const A = pa.pixels, B = pb.pixels;
        for (let i = 0; i < A.length; i += 4) {
          let d = 0;
          for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(A[i + c] - B[i + c]));
          out.px++;
          if (d > 1) out.over1++;
          if (d > out.maxDiff) { out.maxDiff = d; out.worst = { label: String(src.label || '').slice(-50), sc, x0, i: i / 4, a: [...A.slice(i, i + 4)], b: [...B.slice(i, i + 4)] }; }
        }
      }
    }
    try { ctex.destroy(true); } catch (e) { /* QA */ }
    cv.width = 0; cv.height = 0;
  }
  return out;
};

/* Pixi's collector run as if every picture not drawn in the last 2 s had
   waited a minute (mp-membudget's settledGpu) */
const FORCE_GC = () => {
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  if (!R || !R.gc || !R.gc.run) return false;
  const now = R.gc.now != null ? R.gc.now : performance.now();
  for (const src of R.texture.managedTextures || []) {
    if (src && !src.destroyed && src._gcLastUsed >= 0 && now - src._gcLastUsed > 2000) src._gcLastUsed = now - 61000;
  }
  R.gc.run();
  return true;
};

const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S || !S.player) return null;
  let m = null, d = Infinity;
  for (const x of S.monsters || []) {
    if (!x || x.alive === false || x.dead) continue;
    const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y);
    if (dd < d) { d = dd; m = { x: x.x, y: x.y, d: dd }; }
  }
  return { px: S.player.x, py: S.player.y, m };
});
const tapSel = (P, sel, id, fx = 0.5, fy = 0.5) => P.page.evaluate(({ sel, id, fx, fy }) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const b = el.getBoundingClientRect(), x = b.left + b.width * fx, y = b.top + b.height * fy;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart'));
  el.dispatchEvent(mk('touchend'));
  return true;
}, { sel, id, fx, fy });
async function stepToward(P, dx, dy, ms) {
  const keys = [];
  if (dy < -12) keys.push('w'); else if (dy > 12) keys.push('s');
  if (dx < -12) keys.push('a'); else if (dx > 12) keys.push('d');
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  for (const k of keys) await P.page.keyboard.up(k);
}
async function fight(P, ms) {
  const t0 = Date.now();
  let swings = 0;
  while (Date.now() - t0 < ms) {
    const s = await near(P).catch(() => null);
    if (!s || !s.m || s.m.d > 900) { await P.page.waitForTimeout(400); continue; }
    if (s.m.d > 70) await stepToward(P, s.m.x - s.px, s.m.y - s.py, Math.min(450, 60 + s.m.d * 1.2));
    else {
      if (await tapSel(P, '[data-joyzone="R"]', 52, 0.5, 0.4)) swings++;
      await P.page.waitForTimeout(220);
    }
  }
  return swings;
}
async function waitLooks(P, ok, ms) {
  const t0 = Date.now();
  let a = null;
  while (Date.now() - t0 < ms) {
    a = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null)).catch(() => null);
    if (!a || ok(a)) return a;
    await P.page.waitForTimeout(500);
  }
  return a;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  /* with ?picnumbers, the strips' packed canvases kept to compare against */
  const init = !/(^|&)picnumbers=0(&|$)/.test(process.env.BT_QA_QUERY || '')
    ? { content: `(${READS_INIT.toString()})(); window.__btPicNumVerify = true;` } : READS_INIT;
  const P = await H.newPlayer(browser, { name: 'picsonce', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init });
  const out = { query: process.env.BT_QA_QUERY || '', stops: {} };
  let stop = false;
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok(`in the Wheel's BroTown${out.query ? ` (?${out.query})` : ''} (guard)`, !!ok, ok);
    if (!ok) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', myId).catch(() => null);
    await P.page.evaluate(() => {
      setInterval(() => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return;
        if (!R._quests || typeof R._quests !== 'object') R._quests = {};
        if (!R._quests.tut_1) R._quests.tut_1 = true;
      }, 100);
    });
    (async () => {
      while (!stop) {
        await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 8 }).catch(() => null);
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 4 && !stop; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    await P.page.waitForTimeout(8000);
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.ember.points[0];
    await H.glideTo(P, at[0], at[1] + 40);
    await waitLooks(P, (a) => a.ready > 0 && a.loading === 0, LOOKS_MS);
    const swings = await fight(P, FIGHT_MS);
    const rows = await P.page.evaluate(CENSUS, COLOURS);
    const tex = await P.page.evaluate(() => (window.__btTex ? window.__btTex() : null));
    const gpu = await P.page.evaluate(() => { const g = window.__btGpuTex ? window.__btGpuTex(1) : null; return g ? { mb: g.mb, byKind: g.byKind } : null; });
    const once = await P.page.evaluate(() => (window.__btPicsOnce ? window.__btPicsOnce() : null));
    /* the shared atlas of colours' rows (paletteTex.js): used, of how many, and
       pictures sent as colours for want of one */
    const pal = await P.page.evaluate(() => { const p = window.__btPalette ? window.__btPalette() : null; return p ? { rowsUsed: p.rowsUsed, rowsMax: p.rowsMax, rowsFull: p.rowsFull, live: p.live } : null; });
    console.log(`    the atlas of colours: ${JSON.stringify(pal)}`);
    rec.ok(`the atlas of colours had a row for every picture (${pal && pal.rowsUsed} of ${pal && pal.rowsMax} rows used, ${pal && pal.rowsFull} pictures went without)`, !!pal && pal.rowsFull === 0, pal);
    out.stops.fight = { swings, tex, gpu, once, pal, rows };
    const sum = (f) => +rows.filter(f).reduce((a, r) => a + r.mb, 0).toFixed(1);
    console.log(`    at the fight (${swings} swings): ${rows.length} pictures from files, ${sum(() => true)} MB as colours; `
      + `on the chip ${sum((r) => r.onGpu)}; read back ${rows.filter((r) => r.reads.length).length}; <=256 colours ${sum((r) => typeof r.colours === 'number')} MB`);
    console.log(`    __btTex ${JSON.stringify(tex)}  gpu ${JSON.stringify(gpu)}  once ${JSON.stringify(once)}`);
    for (const r of rows.slice(0, 60)) {
      console.log(`      ${String(r.mb).padStart(6)} ${r.as.padEnd(8)} ${r.onGpu ? 'gpu' : '   '} ${String(r.colours).padStart(4)} ${String(r.scale).padEnd(7)} ${r.label.slice(0, 70)} ${r.drawnBy.join(',')} ${r.reads.length ? 'READ ' + r.reads[0] : ''}`);
    }
    rec.ok('the census was taken', rows.length > 0, { n: rows.length });

    const Q = out.query;
    const readOnce = () => P.page.evaluate(() => ({ once: window.__btPicsOnce ? window.__btPicsOnce() : null,
      released: window.__poReleasedReads || 0, num: window.__btPicNumbers ? window.__btPicNumbers() : null,
      gl: (() => { try { return !window._pixiRenderer.app.renderer.gl.isContextLost(); } catch (e) { return null; } })() }));
    /* v2.3.3715: both are on by default; `onecopy=0` / `picnumbers=0` turn them off */
    if (!/(^|&)onecopy=0(&|$)/.test(Q)) {
      const a = await readOnce();
      console.log(`    one copy at the fight: ${JSON.stringify(a.once)}`);
      rec.ok(`?onecopy: pictures on the chip let go of their page copies (${a.once && a.once.released} released, ${a.once && a.once.releasedNowMB} MB now; `
        + `${a.once && a.once.bitmapsSwapped} ImageBitmaps never drawn made <img>s, ${a.once && a.once.bitmapsSwappedMB} MB), none read back after (${a.released}), none sent blank (${a.once && a.once.blankUploads})`,
        !!(a.once && a.once.on && a.once.released > 0 && a.released === 0 && a.once.blankUploads === 0 && a.once.restoreFailed === 0), a);
      /* Pixi's collector takes the idle ones off the chip: their page copies come back */
      await P.page.evaluate(FORCE_GC);
      await P.page.waitForTimeout(3000);
      const b = await readOnce();
      rec.ok(`?onecopy: the collector's unloads bring each page copy back from its file (${b.once.unloads} unloaded, ${b.once.restored} restored, `
        + `${b.once.restoreFailed} failed, ${b.once.loading} loading)`, b.once.unloads > 0 && b.once.restoreFailed === 0 && b.once.loading === 0 && b.once.blankUploads === 0, b.once);
      /* a black screen's rebuild: every page copy back before the new renderer draws */
      const before = await P.page.evaluate(() => { const r = window._pixiRenderer.app.renderer; window.__poOldR = r; return window.__btPicsOnce(); });
      await P.page.evaluate(() => { window.__btLastGlRebuild = 0; window._rebuildRenderer('qa: mp-picsonce'); });
      const rebuilt = await H.waitFor(P, () => ({ x: window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer !== window.__poOldR }),
        (v) => v.x, { timeout: 30000, label: 'the rebuilt renderer' }).catch(() => null);
      await P.page.waitForTimeout(6000);
      const c = await readOnce();
      rec.ok(`?onecopy: a black screen's rebuild loads every page copy back first, and draws none blank (released before ${before.releasedNow}; `
        + `restored for a lost context ${c.once.lostRestores}, blank uploads ${c.once.blankUploads}, failed ${c.once.restoreFailed}; let go of again ${c.once.releasedNow})`,
        !!rebuilt && c.once.blankUploads === 0 && c.once.restoreFailed === 0 && c.released === 0, { before, after: c.once });
      out.once = { a, b, c };
    }
    if (!/(^|&)picnumbers=0(&|$)/.test(Q)) {
      const n = await readOnce();
      console.log(`    colour numbers: ${JSON.stringify(n.num)}`);
      rec.ok(`?picnumbers: the monsters' strips are colour numbers on the chip (${n.num && n.num.strips} strips, ${n.num && n.num.canvasMB} MB of canvases -> ${n.num && n.num.numbersMB} MB; `
        + `${n.num && n.num.rows} rows of colours; the one-colour program ${JSON.stringify(n.num && n.num.fillProgram)})`,
        !!(n.num && n.num.on && n.num.strips > 0 && n.num.fillProgram && n.num.fillProgram.ok), n.num);
      const cmp = await P.page.evaluate(COMPARE, 40);
      console.log(`    compared: ${JSON.stringify(cmp)}`);
      rec.ok(`?picnumbers: every strip drawn the same as from its colours (${cmp.strips} strips, ${cmp.cells} cells at 3 scales, ${cmp.px} px: `
        + `${cmp.over1} more than 1 level of 255 apart, the most ${cmp.maxDiff}; against the packed canvas itself: ${cmp.originals || 0})`, cmp.strips > 0 && cmp.cells > 0 && cmp.over1 === 0 && cmp.originals === cmp.strips && !cmp.error && !cmp.sizeMismatch, cmp);
      out.numbers = { n, cmp };
    }
    /* v2.3.3728: the effects from their 256-colour twins (p256.js, on by default) */
    if (!/(^|&)p256=0(&|$)/.test(Q) && !/(^|&)picnumbers=0(&|$)/.test(Q)) {
      const p = await P.page.evaluate(() => (window.__btP256 ? window.__btP256() : null));
      console.log(`    256 colours: ${JSON.stringify(p)}`);
      rec.ok(`?p256: the effects are read from their twins as colour numbers (${p && p.strips} strips, ${p && p.pictures} whole pictures, `
        + `${p && p.asOriginal} as the original, ${p && p.undecided} never decided; ${p && p.twins} twins listed)`,
        !!p && p.on && p.strips > 0 && p.pictures > 0 && p.asOriginal === 0 && p.undecided === 0, p);
      /* their numbers packed once on the chip, unpacked for the rebuild above
         (when ?onecopy ran it) and packed again, never sent blank */
      const k = p && p.pack;
      rec.ok(`?p256: once on the chip the effects' numbers are kept packed (${k && k.packed} packs, ${k && k.packedMB} MB as ${k && k.packedKB} KB; `
        + `${k && k.unpacked} unpacked for a rebuild, ${k && k.blankUploads} sent blank, ${k && k.failed} failed)`,
        !!k && k.packed > 0 && k.blankUploads === 0 && k.failed === 0 && (/(^|&)onecopy=0(&|$)/.test(Q) || k.unpacked > 0), k);
    }
    const pageErrors = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', pageErrors.length === 0, pageErrors.slice(0, 4));
  } finally {
    stop = true;
    writeFileSync(join(OUT, 'picsonce.json'), JSON.stringify(out, null, 1));
    await P.ctx.close().catch(() => {});
  }
}
