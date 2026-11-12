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
 *   window.__btGearOracle.compareWalk({ sheets, sheen, tint, cols, scale })
 *     (v2.3.4999) the walking armour: the RGBA sheet gearSheets.js builds
 *     (getGearFrame) against the `gearwalk` numbers, every frame, at `scale`.
 *   window.__btGearOracle.compareWeapons({ sheets, sheen, tint, cols, scale, mirror })
 *     (v2.3.5002) the swing's blade and the bow's draw: each strip cut as
 *     effectsRenderer.js cuts it (the swing: loadWebpOrPng, blown up to its
 *     frame's height, the stand-ins' cut; the bow: its whole file through
 *     Assets.load, frames i x fw) against the `weapons` numbers, every frame,
 *     at `scale`, flipped as a west swing is with `mirror`.
 */
import { Assets, Container, Sprite, RenderTexture, Texture, Rectangle } from 'pixi.js';
import { paletteRendererOf } from './paletteTex.js';
import { packTrimmed } from './gearSheets.js';
import { GEAR_SHEETS } from './lookSets/gear.js';
import { GEAR_WALK_SHEETS } from './lookSets/gearwalk.js';   /* v2.3.4999 */
import { getGearFrame } from './gearSheets.js';
import { getLookPartFrames } from './lookPalette.js';
import { WEAPON_SHEETS } from './lookSets/weapons.js';   /* v2.3.5002 */
import { upscaleToFrameHeight } from './spriteScale.js';   /* v2.3.5002: the swing's half-size files, as the game blows them up */
import { loadWebpOrPng } from './webpImage.js';   /* v2.3.5002: as the game reads the swing's */

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
  function render(texs, fw, fh, cols, tint, sheen, scale = 1, mirror = false) {
    const r = paletteRendererOf();
    const rows = Math.ceil(texs.length / cols);
    const cw = Math.ceil(fw * scale), ch = Math.ceil(fh * scale);
    const rt = RenderTexture.create({ width: cols * cw, height: rows * ch, resolution: 1 });
    const box = new Container();
    const tn = tint ? ((tint[0] << 16) | (tint[1] << 8) | tint[2]) : 0xffffff;
    const tp = (((tn >> 16) & 255) | (((tn >> 8) & 255) << 8) | ((tn & 255) << 16) | (255 << 24)) >>> 0;
    texs.forEach((t, i) => {
      const s = new Sprite(t);
      s._sharp = true;   /* a figure's piece (sharpPixels.js) */
      s.anchor.set(0.5);
      s.tint = tn;
      s.scale.set(mirror ? -scale : scale, scale);   /* v2.3.5002: a mirrored facing is a flip of the scale */
      s.position.set((i % cols) * cw + cw / 2, Math.floor(i / cols) * ch + ch / 2);
      if (sheen) s._btSheen = { on: true, r: sheen[0], g: sheen[1], b: sheen[2], k: sheen[3], sx: 0.6, sy: -0.4, fig: new Float32Array(4), tintPacked: tp };
      box.addChild(s);
    });
    r.render({ container: box, target: rt, clear: true, clearColor: [0, 0, 0, 0] });
    const px = r.extract.pixels(rt);
    box.destroy({ children: false });
    rt.destroy(true);
    return { data: px.pixels, w: px.width, h: px.height };
  }
  function diff(a, b) {
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
    return { drawn, over2, over16, worst, mean: drawn ? +(sum / drawn).toFixed(2) : 0 };
  }
  /* v2.3.4999: the walking armour (lookSets/gearwalk.js) -- the RGBA sheet
     the game builds (getGearFrame: packed, linear, its mip chain) against
     the numbers, at `scale` (1: as a phone magnifies it, level 0; 0.5: a
     computer's minified draw, the first mip level) */
  async function compareWalk({ sheets, sheen = null, tint = null, cols = 8, scale = 1 } = {}) {
    const out = [];
    for (const sheet of (sheets || Object.keys(GEAR_WALK_SHEETS))) {
      const s = GEAR_WALK_SHEETS[sheet];
      const nt = getLookPartFrames('gearwalk', sheet, [], { key: 'gear', asDrawn: true });
      if (!nt || !nt.length) { out.push({ sheet, error: 'no numbers' }); continue; }
      const old = [];
      for (let i = 0; i < nt.length; i++) old.push(getGearFrame(s.slot, s.item, s.pose, s.dir, i));
      if (old.some((t) => !t)) { out.push({ sheet, error: 'no RGBA sheet' }); continue; }
      const r = diff(render(old, s.fw, s.fh, cols, tint, sheen, scale), render(nt, s.fw, s.fh, cols, tint, sheen, scale));
      out.push({ sheet, frames: nt.length, ...r });
    }
    return out;
  }
  async function compare({ sheets, sheen = null, tint = null, cols = 8 } = {}) {
    const out = [];
    for (const sheet of (sheets || Object.keys(GEAR_SHEETS))) {
      const s = GEAR_SHEETS[sheet];
      const nt = framesOf(sheet);
      if (!nt) { out.push({ sheet, error: 'no numbers' }); continue; }
      const old = await oldFrames(sheet);
      const n = Math.min(old.arr.length, nt.length);
      const r = diff(render(old.arr.slice(0, n), s.fw, s.fh, cols, tint, sheen), render(nt.slice(0, n), s.fw, s.fh, cols, tint, sheen));
      for (const t of old.arr) t.destroy(false);
      try { old.src.destroy(); } catch (e) { /* gone */ }
      out.push({ sheet, frames: n, ...r });
    }
    return out;
  }
  /* v2.3.5002: a weapon strip the old way, cut as effectsRenderer.js cuts
     it -- the swing as _loadSwordStrip (loadWebpOrPng, upscaleToFrameHeight,
     then _sliceStandIn: the packed cells where the cut finds any, linear),
     the bow as _loadBowStrip (Assets.load, the whole file, frames i x fw:
     its own address, let go of after, so the game's cache is untouched) */
  async function oldWeaponFrames(sheet) {
    const s = WEAPON_SHEETS[sheet];
    if (s.pose === 'bowshot') {
      const url = s.file + '?lookprobe=1';
      const tex = await Assets.load(url);
      const n = Math.max(1, Math.round(tex.width / s.fw));
      const arr = [];
      for (let i = 0; i < n; i++) arr.push(new Texture({ source: tex.source, frame: new Rectangle(i * s.fw, 0, s.fw, s.fh) }));
      return { arr, done: () => { for (const t of arr) t.destroy(false); Assets.unload(url).catch(() => {}); } };
    }
    const img = upscaleToFrameHeight(await loadWebpOrPng(s.file), s.fh);
    const W = img.naturalWidth || img.width, n = Math.max(1, Math.round(W / s.fw));
    const packed = packTrimmed(img, s.fw, s.fh, n);
    const src = Texture.from(packed ? packed.canvas : img).source;
    src.scaleMode = 'linear';   /* as _sliceStandIn */
    const arr = [];
    for (let i = 0; i < n; i++) {
      if (packed) {
        const c = packed.cells[i];
        arr.push(new Texture({ source: src, frame: new Rectangle(c.ax, c.ay, c.w, c.h), orig: new Rectangle(0, 0, s.fw, s.fh), trim: new Rectangle(c.tx, c.ty, c.w, c.h) }));
      } else arr.push(new Texture({ source: src, frame: new Rectangle(i * s.fw, 0, s.fw, s.fh) }));
    }
    return { arr, cropped: !!packed, done: () => { for (const t of arr) t.destroy(false); try { src.destroy(); } catch (e) { /* gone */ } } };
  }
  async function compareWeapons({ sheets, sheen = null, tint = null, cols = 8, scale = 1, mirror = false } = {}) {
    const out = [];
    for (const sheet of (sheets || Object.keys(WEAPON_SHEETS))) {
      const s = WEAPON_SHEETS[sheet];
      const nt = getLookPartFrames('weapons', sheet, [], { key: 'gear', asDrawn: true });
      if (!s || !nt || !nt.length) { out.push({ sheet, error: 'no numbers' }); continue; }
      const old = await oldWeaponFrames(sheet);
      /* the same number of frames, or a draw site's index lands elsewhere */
      if (old.arr.length !== nt.length) { old.done(); out.push({ sheet, error: `frames: ${old.arr.length} RGBA, ${nt.length} numbers` }); continue; }
      const r = diff(render(old.arr, s.fw, s.fh, cols, tint, sheen, scale, mirror), render(nt, s.fw, s.fh, cols, tint, sheen, scale, mirror));
      old.done();
      out.push({ sheet, frames: nt.length, cropped: old.cropped, ...r });
    }
    return out;
  }
  window.__btGearOracle = { compare, compareWalk, compareWeapons, sheets: () => Object.keys(GEAR_SHEETS), walkSheets: () => Object.keys(GEAR_WALK_SHEETS),
    weaponSheets: () => Object.keys(WEAPON_SHEETS) };
}
