/* ═══ v2.3.4998: THE ARMOUR'S ORACLE (QA only; mp-lookgear) ═══
 * Installed by gearLookFrame.js only on a page whose address asks for it
 * (`?lookprobe`), as the shirt's (lookShirtProbe.js).
 *
 *   window.__btGearOracle.compare({ sheets, sheen, tint, cols })
 *     every frame of each combat strip drawn the OLD way (the RGBA strip
 *     _gearStripFrame cut: the same PNG, packTrimmed, the same frames) and the
 *     NEW (the `gear` look set's numbers), each through the game's own
 *     batchers -- the sharp read, and with `sheen` the metal's shine in the
 *     frame (the sheen batcher against the look program's shine) -- under the
 *     sprite tint `tint` ([r, g, b]: steel white, copper...), read back and
 *     compared texel for texel, premultiplied.
 */
import { Container, Sprite, RenderTexture, Texture, Rectangle } from 'pixi.js';
import { paletteRendererOf } from './paletteTex.js';
import { packTrimmed } from './gearSheets.js';
import { GEAR_SHEETS } from './lookSets/gear.js';

export function installGearProbe(dep) {
  if (typeof window === 'undefined') return;
  const { framesOf } = dep;
  const loadImage = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('no ' + url)); im.src = url; });
  async function oldFrames(sheet) {
    const s = GEAR_SHEETS[sheet];
    const img = await loadImage(s.file);
    const W = img.naturalWidth, H = img.naturalHeight, n = Math.round(W / s.fw);
    const packed = packTrimmed(img, s.fw, H, n);
    const src = Texture.from(packed ? packed.canvas : img).source;
    src.scaleMode = 'linear';   /* as _gearStripFrame */
    const arr = [];
    for (let i = 0; i < n; i++) {
      if (packed) {
        const c = packed.cells[i];
        arr.push(new Texture({ source: src, frame: new Rectangle(c.ax, c.ay, c.w, c.h), orig: new Rectangle(0, 0, s.fw, H), trim: new Rectangle(c.tx, c.ty, c.w, c.h) }));
      } else arr.push(new Texture({ source: src, frame: new Rectangle(i * s.fw, 0, s.fw, H) }));
    }
    return { arr, src };
  }
  function render(texs, fw, fh, cols, tint, sheen) {
    const r = paletteRendererOf();
    const rows = Math.ceil(texs.length / cols);
    const rt = RenderTexture.create({ width: cols * fw, height: rows * fh, resolution: 1 });
    const box = new Container();
    const tn = tint ? ((tint[0] << 16) | (tint[1] << 8) | tint[2]) : 0xffffff;
    const tp = (((tn >> 16) & 255) | (((tn >> 8) & 255) << 8) | ((tn & 255) << 16) | (255 << 24)) >>> 0;
    texs.forEach((t, i) => {
      const s = new Sprite(t);
      s._sharp = true;   /* a figure's piece (sharpPixels.js) */
      s.anchor.set(0.5);
      s.tint = tn;
      s.position.set((i % cols) * fw + fw / 2, Math.floor(i / cols) * fh + fh / 2);
      if (sheen) s._btSheen = { on: true, r: sheen[0], g: sheen[1], b: sheen[2], k: sheen[3], sx: 0.6, sy: -0.4, fig: new Float32Array(4), tintPacked: tp };
      box.addChild(s);
    });
    r.render({ container: box, target: rt, clear: true, clearColor: [0, 0, 0, 0] });
    const px = r.extract.pixels(rt);
    box.destroy({ children: false });
    rt.destroy(true);
    return { data: px.pixels, w: px.width, h: px.height };
  }
  async function compare({ sheets, sheen = null, tint = null, cols = 8 } = {}) {
    const out = [];
    for (const sheet of (sheets || Object.keys(GEAR_SHEETS))) {
      const s = GEAR_SHEETS[sheet];
      const nt = framesOf(sheet);
      if (!nt) { out.push({ sheet, error: 'no numbers' }); continue; }
      const old = await oldFrames(sheet);
      const n = Math.min(old.arr.length, nt.length);
      const a = render(old.arr.slice(0, n), s.fw, s.fh, cols, tint, sheen);
      const b = render(nt.slice(0, n), s.fw, s.fh, cols, tint, sheen);
      let drawn = 0, over2 = 0, over16 = 0, worst = 0, sum = 0;
      for (let p = 0; p < a.data.length; p += 4) {
        if (!a.data[p + 3] && !b.data[p + 3]) continue;
        drawn++;
        let m = 0;
        for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(a.data[p + k] - b.data[p + k]));
        sum += m;
        if (m > 2) over2++;
        if (m > 16) over16++;
        if (m > worst) worst = m;
      }
      for (const t of old.arr) t.destroy(false);
      try { old.src.destroy(); } catch (e) { /* gone */ }
      out.push({ sheet, frames: n, drawn, over2, over16, worst, mean: drawn ? +(sum / drawn).toFixed(2) : 0 });
    }
    return out;
  }
  window.__btGearOracle = { compare, sheets: () => Object.keys(GEAR_SHEETS) };
}
