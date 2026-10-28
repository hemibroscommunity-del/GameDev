/* ═══ v2.3.3751: THE SHIRT ORACLE'S PROBE (QA only; mp-lookshirts) ═══
 * Installed by lookShirtFrame.js only on a page whose address asks for it
 * (`?lookpalette=1` or `?lookprobe`), as the body's (lookPaletteProbe.js).
 *
 *   window.__btShirtOracle.compare({ looks, scale, frames })
 *     every stand and jog frame of the tee in each look, in all eight facings
 *     (the three flipped ones flipped, as the game draws them, the print and
 *     tile pre-flipped), drawn the OLD way (gearSheets: the shared sheet and a
 *     sprite tint for a plain tee, getShirtLookFrame's baked copy for a dressed
 *     one) and the NEW (the numbers and the look's row), through the sharp read,
 *     read back and compared texel for texel, premultiplied.
 *   window.__btShirtOracle.draw({ looks, way })
 *     every stand and jog frame of each look drawn once, so its textures are on
 *     the chip; returns what the shirt's own textures hold.
 *
 * A look is { tint: [r, g, b] | null, pattern: 'check:4' | null, front: art |
 * null, back: art | null }, as a player picks it.
 */
import { Container, Sprite, RenderTexture } from 'pixi.js';
import { paletteRendererOf } from './paletteTex.js';

const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const MIRRORED = ['east', 'northeast', 'southwest'];

export function installShirtProbe(dep) {
  if (typeof window === 'undefined') return;
  const { getGearFrame, getShirtLookFrame, getLookShirtFrame, parsePattern, sideForDir, preloadGearSheet } = dep;
  const nFrames = (pose, dir) => {
    for (let f = 0; ; f++) {
      const t = getGearFrame('shirt', 'tshirt', pose, dir, f);
      if (!t) return 0;
      if (f > 0 && t === getGearFrame('shirt', 'tshirt', pose, dir, 0)) return f;
      if (f > 64) return f;
    }
  };
  const lookArgs = (L, dir, mirror) => {
    const pattern = L.pattern ? parsePattern(L.pattern, 'shirt') : null;
    const art = sideForDir(dir) === 'back' ? (L.back || null) : (L.front || null);
    return { art, pattern, tint: L.tint || null, mirror };
  };
  const dressed = (a) => !!(a.art || a.pattern);
  function cellsFor(L, limit) {
    const cells = [];
    for (const pose of ['stand', 'jog']) for (const dir of DIRS) {
      const n = nFrames(pose, dir);
      for (const mirror of (MIRRORED.indexOf(dir) >= 0 ? [false, true] : [false])) {
        for (let f = 0; f < n && f < (limit || n); f++) {
          const a = lookArgs(L, dir, mirror);
          const nt = getLookShirtFrame('tshirt', pose, dir, f, a, true);
          if (!nt) continue;   /* white and plain: the shipped sheet, both ways */
          const ot = dressed(a) ? getShirtLookFrame('tshirt', pose, dir, f, a) : getGearFrame('shirt', 'tshirt', pose, dir, f);
          cells.push({ pose, dir, f, mirror, ot, nt, tint: dressed(a) ? null : a.tint, a });
        }
      }
    }
    return cells;
  }
  /* the old path's dressed bakes, waited for (null while one runs) */
  async function baked(L, timeoutMs = 120000) {
    const t0 = Date.now();
    for (const pose of ['stand', 'jog']) for (const dir of DIRS) await preloadGearSheet('shirt', 'tshirt', pose, dir);
    for (;;) {
      const pending = cellsFor(L).filter((c) => !c.ot).length;
      if (!pending) return true;
      if (Date.now() - t0 > timeoutMs) return false;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  function render(cells, pick, scale, cell, cols, tinted) {
    const r = paletteRendererOf();
    const rows = Math.ceil(cells.length / cols);
    const rt = RenderTexture.create({ width: cols * cell, height: rows * cell, resolution: 1 });
    const box = new Container();
    cells.forEach((c, i) => {
      const t = pick(c);
      if (!t) return;
      const s = new Sprite(t);
      s._sharp = true;   /* drawn as the body and its gear are (sharpPixels.js) */
      s.anchor.set(0.5);
      s.scale.set((c.mirror ? -1 : 1) * scale, scale);
      if (tinted && c.tint) s.tint = (c.tint[0] << 16) | (c.tint[1] << 8) | c.tint[2];
      s.position.set((i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2);
      box.addChild(s);
    });
    r.render({ container: box, target: rt, clear: true, clearColor: [0, 0, 0, 0] });
    const px = r.extract.pixels(rt);
    box.destroy({ children: true });
    rt.destroy(true);
    return { data: px.pixels, w: px.width, h: px.height };
  }
  async function compare({ looks, scale = 1, frames = 0, cols = 16 } = {}) {
    const out = [];
    for (const L of looks) {
      const ok = await baked(L);
      const cells = cellsFor(L, frames);
      const cell = Math.ceil(128 * scale) + 4;
      const a = render(cells, (c) => c.ot, scale, cell, cols, true);
      const b = render(cells, (c) => c.nt, scale, cell, cols, false);
      const hist = {};
      let drawn = 0, differ = 0, worst = 0;
      const bad = [];
      for (let p = 0; p < a.data.length; p += 4) {
        if (!a.data[p + 3] && !b.data[p + 3]) continue;
        drawn++;
        let m = 0;
        for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(a.data[p + k] - b.data[p + k]));
        if (!m) continue;
        hist[m] = (hist[m] || 0) + 1;
        if (m > 1) {
          differ++;
          if (bad.length < 6) {
            const q = p >> 2, x = q % a.w, y = Math.floor(q / a.w);
            const c = cells[Math.floor(y / cell) * cols + Math.floor(x / cell)];
            bad.push({ at: [x % cell, y % cell], cell: c ? `${c.pose}-${c.dir}#${c.f}${c.mirror ? 'm' : ''}` : '?',
              old: Array.from(a.data.slice(p, p + 4)), now: Array.from(b.data.slice(p, p + 4)) });
          }
        }
        if (m > worst) worst = m;
      }
      out.push({ look: JSON.stringify({ t: L.tint, p: L.pattern, f: !!L.front, b: !!L.back }), baked: ok, frames: cells.length, drawn, differ, worst, hist, bad });
    }
    return out;
  }
  const srcs = new Set();
  async function draw({ looks, way }) {
    const done = [];
    for (const L of looks) {
      if (way === 'old') await baked(L);
      const cells = cellsFor(L).map((c) => ({ ...c, t: way === 'old' ? c.ot : c.nt }));
      render(cells, (c) => c.t, 0.25, 36, 32, way === 'old');
      for (const c of cells) if (c.t) srcs.add(c.t.source);
      done.push({ frames: cells.length });
    }
    return { done, ...held() };
  }
  /* the shirt's own textures, on the chip (a mip chain a third more) */
  function held() {
    const r = paletteRendererOf();
    const on = new Set((r && r.texture && r.texture.managedTextures) || []);
    const plain = new Set();
    for (const pose of ['stand', 'jog']) for (const dir of DIRS) { const t = getGearFrame('shirt', 'tshirt', pose, dir, 0); if (t) plain.add(t.source); }
    let gpu = 0, n = 0, shipped = 0;
    for (const s of srcs) {
      if (!s || s.destroyed) continue;
      if (plain.has(s)) { shipped++; continue; }
      const bpp = s.format === 'rg8unorm' ? 2 : (s.format === 'r8unorm' ? 1 : 4);
      if (on.has(s)) gpu += s.pixelWidth * s.pixelHeight * bpp * (s.autoGenerateMipmaps ? 4 / 3 : 1);
      n++;
    }
    return { textures: n, shipped, gpuMB: +(gpu / 1048576).toFixed(2) };
  }
  window.__btShirtOracle = { compare, draw, held, baked: (L) => baked(L) };
}
