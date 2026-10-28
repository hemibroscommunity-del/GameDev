/* ═══ v2.3.3716: THE LOOK-PALETTE ORACLE'S PROBE (QA only) ═══
 *
 * Installed by playerSkins.js only when the address asks for it --
 * `?lookpalette` (the switch) or `?lookprobe` (the old path, measured the same
 * way) -- so a player's page never has it.  mp-lookpalette drives it:
 *
 *   window.__btLookOracle.compare({ looks, scale, frames })
 *     every stand and jog frame of each look, in all eight facings (the three
 *     flipped ones as the game draws them, scale.x -1), drawn the OLD way
 *     (getBodyFrame's baked copy, through the sharp read as the body is) and
 *     the NEW (the numbers and the look's row), each into a picture of its
 *     own, read back and compared texel for texel, premultiplied.
 *   window.__btLookOracle.draw({ looks, way })
 *     every stand and jog frame of each look drawn once, the old way or the
 *     new, so their textures are on the chip -- the memory the scenario then
 *     reads is what those looks hold.
 *
 * `looks` are [skinId, pantsId, shoesId, eyeId] as a player picks them.
 */
import { Container, Sprite, RenderTexture } from 'pixi.js';
import { paletteRendererOf } from './paletteTex.js';

const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const MIRRORED = ['east', 'northeast', 'southwest'];
/* v2.3.3750: every body pose with numbers, in the facings it is authored in
   (playerSprites.js POSE_DIRS; mine, fish and pickup are drawn south only,
   unflipped; the roll's two facings flip as the walk's do) */
const POSE_DIRS = { stand: DIRS, jog: DIRS, hit: DIRS, dodge: ['east', 'south'], mine: ['south'], fish: ['south'], pickup: ['south'] };
const UNFLIPPED = { mine: true, fish: true, pickup: true };

export function installLookProbe(dep) {
  if (typeof window === 'undefined') return;
  const { getBodyFrame, getLookBodyFrame, getFrame, playerFrameCount, touches } = dep;
  let _poses = ['stand', 'jog'];
  const sheets = () => {
    const out = [];
    for (const pose of _poses) for (const dir of POSE_DIRS[pose]) out.push([pose, dir, Math.max(1, playerFrameCount(pose, dir) || 1)]);
    return out;
  };
  /* v2.3.3750: which poses a call measures (`poses`, default stand and jog as before) */
  const usePoses = (poses) => { _poses = (poses && poses.length) ? poses.filter((p) => POSE_DIRS[p]) : ['stand', 'jog']; };
  const oldFrame = (L, pose, dir, f) => getBodyFrame(L[0], L[1], L[2], pose, dir, f, null, 'none', L[3], null, undefined);
  const newFrame = (L, pose, dir, f) => getLookBodyFrame(L[0], L[1], L[2], pose, dir, f, null, L[3], null, undefined);
  /* the old path's bakes for a look, waited for (getBodyFrame hands out the
     shipped frame while one runs) -- a sheet the look leaves as drawn is
     the shipped one either way */
  async function baked(L, timeoutMs = 120000) {
    const t0 = Date.now();
    for (;;) {
      let pending = 0;
      for (const [pose, dir] of sheets()) {
        const t = oldFrame(L, pose, dir, 0);
        if (t === getFrame(pose, dir, 0) && touches(L, pose, dir)) pending++;
      }
      if (!pending) return true;
      if (Date.now() - t0 > timeoutMs) return false;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  function cellsFor(L, limit) {
    const cells = [];
    for (const [pose, dir, n] of sheets()) {
      const flips = (MIRRORED.indexOf(dir) >= 0 && !UNFLIPPED[pose]) ? [false, true] : [false];
      for (const mirror of flips) {
        for (let f = 0; f < n && f < (limit || n); f++) {
          const nt = newFrame(L, pose, dir, f);
          if (!nt) continue;   /* the look leaves this sheet as drawn: the shipped sheet, both ways */
          cells.push({ pose, dir, f, mirror, ot: oldFrame(L, pose, dir, f), nt });
        }
      }
    }
    return cells;
  }
  function render(cells, pick, scale, cell, cols) {
    const r = paletteRendererOf();
    const rows = Math.ceil(cells.length / cols);
    const W = cols * cell, H = rows * cell;
    const rt = RenderTexture.create({ width: W, height: H, resolution: 1 });
    const box = new Container();
    cells.forEach((c, i) => {
      const s = new Sprite(pick(c));
      s._sharp = true;   /* drawn as the body is (sharpPixels.js) */
      s.anchor.set(0.5);
      s.scale.set((c.mirror ? -1 : 1) * scale, scale);
      s.position.set((i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2);
      box.addChild(s);
    });
    r.render({ container: box, target: rt, clear: true, clearColor: [0, 0, 0, 0] });
    const px = r.extract.pixels(rt);
    box.destroy({ children: true });
    rt.destroy(true);
    return { data: px.pixels, w: px.width, h: px.height };
  }
  async function compare({ looks, scale = 1, frames = 0, cols = 16, poses, bar = 16 } = {}) {
    usePoses(poses);
    const out = [];
    for (const L of looks) {
      const ok = await baked(L);
      const cells = cellsFor(L, frames);
      const cell = Math.ceil(128 * scale) + 4;
      const a = render(cells, (c) => c.ot, scale, cell, cols);
      const b = render(cells, (c) => c.nt, scale, cell, cols);
      const hist = {};
      let drawn = 0, differ = 0, worst = 0, sameTex = 0, worstAt = null;
      /* v2.3.3750: an 8-bit sheet is a cut of the art (the owner's 256): held
         to the cut's bar, not to 1 level -- its own tally */
      const q8 = { drawn: 0, over: 0, worst: 0, sum: 0, worstAt: null };
      const bad = [];
      const cellAt = (p) => { const q = p >> 2, x = q % a.w, y = Math.floor(q / a.w); return [cells[Math.floor(y / cell) * cols + Math.floor(x / cell)], x % cell, y % cell]; };
      const tag = (c, x, y) => (c ? `${c.pose}-${c.dir}#${c.f}${c.mirror ? 'm' : ''} at ${x},${y}` : '?');
      for (const c of cells) if (c.ot === getFrame(c.pose, c.dir, c.f)) sameTex++;
      for (let p = 0; p < a.data.length; p += 4) {
        if (!a.data[p + 3] && !b.data[p + 3]) continue;
        let m = 0;
        for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(a.data[p + k] - b.data[p + k]));
        const [c, cx, cy] = cellAt(p);
        const src = c && c.nt && c.nt.source;
        if (src && src._btLook && src._btLook.bits === 8) {
          q8.drawn++; q8.sum += m;
          if (m > bar) q8.over++;
          if (m > q8.worst) { q8.worst = m; q8.worstAt = tag(c, cx, cy); }
          continue;
        }
        drawn++;
        if (!m) continue;
        hist[m] = (hist[m] || 0) + 1;
        if (m > 1) {
          differ++;
          if (bad.length < 6) bad.push({ at: [cx, cy], cell: tag(c, cx, cy), old: Array.from(a.data.slice(p, p + 4)), now: Array.from(b.data.slice(p, p + 4)) });
        }
        if (m > worst) { worst = m; worstAt = tag(c, cx, cy); }
      }
      q8.mean = +(q8.sum / Math.max(1, q8.drawn)).toFixed(3);
      delete q8.sum;
      out.push({ look: L.join('/'), baked: ok, frames: cells.length, oldIsShipped: sameTex, drawn, differ, worst, worstAt, hist, bad, q8 });
    }
    return out;
  }
  /* every frame of each look on the chip once, the old way or the new */
  async function draw({ looks, way, poses }) {
    usePoses(poses);
    const done = [];
    for (const L of looks) {
      if (way === 'old') await baked(L);
      const cells = [];
      for (const [pose, dir, n] of sheets()) {
        for (let f = 0; f < n; f++) {
          const t = way === 'old' ? oldFrame(L, pose, dir, f) : newFrame(L, pose, dir, f);
          if (t) cells.push({ mirror: false, t });
        }
      }
      render(cells, (c) => c.t, 0.25, 36, 32);
      done.push({ look: L.join('/'), frames: cells.length });
      for (const c of cells) srcs.add(c.t.source);
    }
    return { done, ...held() };
  }
  /* what the body's own textures hold, counted texture by texture (the GPU
     line moves with everything else on the page): on the chip -- at its
     format's bytes a texel, a mip chain a third more -- and, for a texture
     drawn from an <img> (the old path keeps its bakes as images of themselves,
     keepAsImage.js), the decoded picture the browser keeps beside it, which no
     line of the memory check counts */
  const srcs = new Set();
  function held() {
    const r = paletteRendererOf();
    const on = new Set((r && r.texture && r.texture.managedTextures) || []);
    let gpu = 0, img = 0, n = 0, shipped = 0;
    /* the shipped sheets (a sheet a look leaves as drawn) are held either way */
    const ship = new Set();
    for (const [pose, dir, k] of sheets()) for (let f = 0; f < k; f++) { const t = getFrame(pose, dir, f); if (t) ship.add(t.source); }
    for (const s of srcs) {
      if (!s || s.destroyed) continue;
      if (ship.has(s)) { shipped++; continue; }
      const bpp = s.format === 'rg8unorm' ? 2 : (s.format === 'r8unorm' ? 1 : 4);
      const b = s.pixelWidth * s.pixelHeight * bpp;
      if (on.has(s)) gpu += b * (s.autoGenerateMipmaps ? 4 / 3 : 1);
      if (typeof HTMLImageElement !== 'undefined' && s.resource instanceof HTMLImageElement) img += s.pixelWidth * s.pixelHeight * 4;
      n++;
    }
    return { textures: n, shipped, gpuMB: +(gpu / 1048576).toFixed(2), imagesMB: +(img / 1048576).toFixed(2) };
  }
  /* v2.3.3750: a picture for the owner's eye -- per look, a row the old way
     and a row the new, one cell a (pose, dir, frame) pick, on a plain ground */
  async function picture({ looks, picks, scale = 2 }) {
    const cells = [];
    const cols = picks.length;
    usePoses([...new Set(picks.map((k) => k[0]))]);
    for (const L of looks) {
      await baked(L);
      for (const way of ['old', 'new']) {
        for (const [pose, dir, f, mirror] of picks) {
          const t = way === 'old' ? oldFrame(L, pose, dir, f) : (newFrame(L, pose, dir, f) || oldFrame(L, pose, dir, f));
          cells.push({ pose, dir, f, mirror: !!mirror, t });
        }
      }
    }
    const cell = Math.ceil(128 * scale) + 4;
    const pic = render(cells, (c) => c.t, scale, cell, cols);
    let bin = '';
    const u8 = new Uint8Array(pic.data.buffer, pic.data.byteOffset, pic.data.byteLength);
    for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    return { w: pic.w, h: pic.h, cell, b64: btoa(bin) };
  }
  /* ═══ v2.3.3757: THE STAND-INS -- every frame of every stand-in sheet in a
     look, the old way (the stand-ins' own bake: recolorBodyToCanvas at the
     sheet's size, cropped by packTrimmed as _sliceStandIn does, a linear
     canvas texture) against the numbers (getLookPartFrames('standin')),
     through the sharp read the stand-ins are drawn with ═══ */
  async function compareStandIns({ looks, scale = 1, frames = 0, cols = 8, bar = 16 } = {}) {
    const PS = await import('./playerSkins.js');
    const GS = await import('./gearSheets.js');
    const WI = await import('./webpImage.js');
    const LP = await import('./lookPalette.js');
    const { Texture, Rectangle } = await import('pixi.js');
    const man = await (await fetch('/sprites/look/standin/roles.json?v=probe')).json();
    const out = [];
    /* one sheet at a time (a picture of every frame of all 21 at once is
       hundreds of MB: it took the box's browser down) */
    const imgs = Object.create(null);
    for (const L of looks) {
      const sT = PS.skinTarget(L[0]) || PS.DEFAULT_SKIN_TARGET, pT = PS.pantsTarget(L[1]), bT = PS.shoesTarget(L[2]);
      let nFrames = 0, drawn = 0, over = 0, worst = 0, sum = 0, worstAt = null;
      for (const [sheet, e] of Object.entries(man.sheets)) {
        const fw = e.fw || man.fw, fh = e.fh || man.fh;
        const img = imgs[sheet] || (imgs[sheet] = await WI.loadWebpOrPng(`/sprites/player/${sheet}.png`));
        const cv = PS.recolorBodyToCanvas(img, sT, pT, bT, null, fh, null, null, null, fw, undefined, undefined, undefined, null, /-torso$/.test(sheet));
        const n = Math.max(1, Math.round(cv.width / fw));
        const packed = GS.packTrimmed(cv, fw, fh, n);
        const src = Texture.from(packed ? packed.canvas : cv).source;
        src.scaleMode = 'linear';
        const nt = LP.getLookPartFrames('standin', sheet, [[1, sT], [2, pT], [3, bT]]);
        const cells = [];
        if (nt) {
          for (let f = 0; f < n && f < (frames || n); f++) {
            const c = packed ? packed.cells[f] : null;
            const ot = c ? new Texture({ source: src, frame: new Rectangle(c.ax, c.ay, c.w, c.h), orig: new Rectangle(0, 0, fw, fh), trim: new Rectangle(c.tx, c.ty, c.w, c.h) })
              : new Texture({ source: src, frame: new Rectangle(f * fw, 0, fw, fh) });
            cells.push({ pose: sheet, dir: '', f, mirror: false, ot, nt: nt[f] });
          }
        }
        if (cells.length) {
          const cell = Math.ceil(Math.max(fw, fh) * scale) + 4;
          const a = render(cells, (c) => c.ot, scale, cell, cols);
          const b = render(cells, (c) => c.nt, scale, cell, cols);
          nFrames += cells.length;
          for (let p = 0; p < a.data.length; p += 4) {
            if (!a.data[p + 3] && !b.data[p + 3]) continue;
            let m = 0;
            for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(a.data[p + k] - b.data[p + k]));
            drawn++; sum += m;
            if (m > bar) over++;
            if (m > worst) {
              worst = m;
              const q = p >> 2, x = q % a.w, y = Math.floor(q / a.w);
              const c = cells[Math.floor(y / cell) * cols + Math.floor(x / cell)];
              worstAt = c ? `${c.pose}#${c.f} at ${x % cell},${y % cell}` : '?';
            }
          }
        }
        for (const c of cells) { try { c.ot.destroy(false); } catch (er) { /* gone */ } }
        try { src.destroy(); } catch (er) { /* gone */ }
        if (packed) { packed.canvas.width = 0; packed.canvas.height = 0; }
        cv.width = 0; cv.height = 0;
      }
      out.push({ look: L.join('/'), frames: nFrames, drawn, over, worst, worstAt, mean: +(sum / Math.max(1, drawn)).toFixed(3) });
    }
    return out;
  }
  window.__btLookOracle = { compare, draw, held, picture, compareStandIns, baked: (L) => baked(L) };
}
