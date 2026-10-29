/* ═══ v2.3.3753: THE HEAD PIECES' ORACLE (QA only, `?lookprobe`) ═══
 *
 * mp-lookheads drives it:
 *   window.__btHeadOracle.compare({ items: [[cat, id, colorId], ...], scale })
 *     every facing of each piece in its colour -- the five drawn, and the
 *     three the game flips (scale.x -1) -- drawn the OLD way (the catalog's
 *     recoloured copy, waited for) and from the NUMBERS (headLook.js), each
 *     through the sharp read the head pieces are drawn with, into a picture of
 *     its own, read back and compared texel for texel (premultiplied).
 *   window.__btHeadOracle.draw({ items, way }) -- each drawn once, so its
 *     textures are on the chip (the memory the scenario reads).
 */
import { Container, Sprite, RenderTexture, Texture, Rectangle } from 'pixi.js';
import { paletteRendererOf } from '../paletteTex.js';
import { getColoredHairTextures } from './hairColorCatalog.js';
import { getColoredHatTextures } from './hatColorCatalog.js';
import { getColoredFacialHairTextures } from './facialHairColorCatalog.js';
import { getColoredEyewearTextures } from './eyewearColorCatalog.js';
import { getColoredEyeStyleTextures } from './eyeStyleColorCatalog.js';

const GET = { hair: getColoredHairTextures, headwear: getColoredHatTextures, facialhair: getColoredFacialHairTextures,
  eyewear: getColoredEyewearTextures, eyestyle: getColoredEyeStyleTextures };
const MIRRORED = ['east', 'northeast', 'southwest'];

export function installHeadProbe({ forceOld }) {
  const isLook = (m) => { const k = m && Object.keys(m)[0]; return !!(k && m[k].source && m[k].source._btLook); };
  async function oldMap([cat, id, colorId], timeoutMs = 30000) {
    const t0 = Date.now();
    for (;;) {
      forceOld(true);
      let m;
      try { m = GET[cat](id, colorId); } finally { forceOld(false); }
      if (m && !isLook(m)) return m;
      if (Date.now() - t0 > timeoutMs) return null;
      await new Promise((r) => setTimeout(r, 60));
    }
  }
  function render(cells, pick, scale, cell, cols, sharp = true) {
    const r = paletteRendererOf();
    const rows = Math.max(1, Math.ceil(cells.length / cols));
    const rt = RenderTexture.create({ width: cols * cell, height: rows * cell, resolution: 1 });
    const box = new Container();
    cells.forEach((c, i) => {
      const s = new Sprite(pick(c));
      s._sharp = sharp;   /* drawn as the head pieces are (sharpPixels.js) */
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
  async function compare({ items, scale = 1, cols = 8, sharp = true, sameQuad = true } = {}) {
    const out = [];
    const made = [];
    for (const it of items) {
      const om = await oldMap(it);
      const nm = GET[it[0]](it[1], it[2]);
      const res = { item: it.join('/'), old: !!om, look: isLook(nm), facings: 0, drawn: 0, differ: 0, worst: 0, hist: {}, bad: [] };
      out.push(res);
      if (!om || !isLook(nm)) continue;
      const cells = [];
      for (const dir of Object.keys(nm)) {
        if (!om[dir]) { res.missingOld = (res.missingOld || []).concat(dir); continue; }
        /* `sameQuad` (the default): the old copy cut to the numbers' crop, so
           both are drawn through the SAME quad and only the colours are
           compared.  Without it, the old copy's whole 128 frame: its corners
           land on other fractions of a pixel, which a rasterizer snaps to its
           own sub-pixel grid (~1/32 px here), and an edge's one-pixel ramp
           moves that much -- geometry, not colour (the game's own native
           pieces are cropped the same way, loadCroppedStrip) */
        let ot = om[dir];
        if (sameQuad && nm[dir].trim) {
          const tr = nm[dir].trim;
          ot = new Texture({ source: ot.source, frame: new Rectangle(tr.x, tr.y, tr.width, tr.height), orig: new Rectangle(0, 0, 128, 128), trim: new Rectangle(tr.x, tr.y, tr.width, tr.height) });
          made.push(ot);
        }
        for (const mirror of (MIRRORED.indexOf(dir) >= 0 ? [false, true] : [false])) cells.push({ dir, mirror, ot, nt: nm[dir] });
      }
      for (const dir of Object.keys(om)) if (!nm[dir]) res.missingNew = (res.missingNew || []).concat(dir);
      res.facings = cells.length;
      const cell = Math.ceil(128 * scale) + 4;
      const a = render(cells, (c) => c.ot, scale, cell, cols, sharp);
      const b = render(cells, (c) => c.nt, scale, cell, cols, sharp);
      for (let p = 0; p < a.data.length; p += 4) {
        if (!a.data[p + 3] && !b.data[p + 3]) continue;
        res.drawn++;
        let m = 0;
        for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(a.data[p + k] - b.data[p + k]));
        if (!m) continue;
        res.hist[m] = (res.hist[m] || 0) + 1;
        if (m > res.worst) res.worst = m;
        if (m > 1) {
          res.differ++;
          if (res.bad.length < 4) {
            const q = p >> 2, x = q % a.w, y = Math.floor(q / a.w);
            const c = cells[Math.floor(y / cell) * cols + Math.floor(x / cell)];
            res.bad.push({ at: [x % cell, y % cell], cell: c ? c.dir + (c.mirror ? 'm' : '') : '?', old: Array.from(a.data.slice(p, p + 4)), now: Array.from(b.data.slice(p, p + 4)) });
          }
        }
      }
    }
    for (const t of made) t.destroy(false);
    return out;
  }
  const srcs = new Set();
  async function draw({ items, way }) {
    const cells = [];
    for (const it of items) {
      const m = way === 'old' ? await oldMap(it) : GET[it[0]](it[1], it[2]);
      if (!m) continue;
      for (const dir of Object.keys(m)) { cells.push({ mirror: false, t: m[dir] }); srcs.add(m[dir].source); }
    }
    render(cells, (c) => c.t, 0.25, 36, 32);
    return { cells: cells.length, ...held() };
  }
  function held() {
    const r = paletteRendererOf();
    const on = new Set((r && r.texture && r.texture.managedTextures) || []);
    let gpu = 0, n = 0;
    for (const s of srcs) {
      if (!s || s.destroyed) continue;
      const bpp = s.format === 'rg8unorm' ? 2 : (s.format === 'r8unorm' ? 1 : 4);
      if (on.has(s)) gpu += s.pixelWidth * s.pixelHeight * bpp * (s.autoGenerateMipmaps ? 4 / 3 : 1);
      n++;
    }
    return { textures: n, gpuMB: +(gpu / 1048576).toFixed(2) };
  }
  window.__btHeadOracle = { compare, draw, held };
}
