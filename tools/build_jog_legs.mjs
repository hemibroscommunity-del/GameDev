/* Bake arm-erased "jog legs" sheets for the bow-attack composite.  The jog body's
 * fists swing below the waist on some frames and showed as "ghost hands" beside
 * the legs.  Below the waist a body is only pants+shoes (never skin), so we erase,
 * at/below the per-frame waist:
 *   1. every tan/orange (skin) pixel -- broad test (warm: r noticeably > g > b),
 *      which excludes the olive pants (r ~= g) and dark shoes.
 *   2. the BLACK OUTLINE connected to that skin -- the hand outline that dropped
 *      below the waist.  Bounded flood from erased-skin pixels into adjacent dark
 *      pixels (a few px) so the legs' own outlines aren't eaten.
 * Output jog-<dir>-legs.png keeps recolour-compatibility (the renderer recolours
 * these to the player combo).  Run: node tools/build_jog_legs.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decode, encode } from './png.mjs';
import { jogWaistRow } from '../src/rendering/jogWaist.js';

const DIRS = ['south', 'east', 'north', 'northeast', 'southwest'];
// warm skin: r clearly > g > b.  Olive pants have r ~= g (r-g small) -> excluded.
// Combine a broad test with the EXACT recolour _isSkin (playerSkins.js) so no
// pixel the recolour would tint as skin survives below the waist.
const _recolorIsSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
const isSkin = (r, g, b, a) => (a > 100 && r - g > 15 && r - b > 25 && r > 85) || _recolorIsSkin(r, g, b, a);
// near-black outline pixel
const isDark = (r, g, b, a) => a > 90 && Math.max(r, g, b) < 80;
const DILATE = 3;     // px of outline removed around erased skin
const TOP_PAD = 14;   // also clear (and pants-fill) this many px ABOVE the waist
                      // (the renderer's overlap reveals this band on diagonal runs)

for (const dir of DIRS) {
  const im = decode(readFileSync(`public/sprites/player/jog-${dir}.png`));
  const { width: W, height: H, data: d } = im;
  const N = Math.round(W / 256);
  let erasedSkin = 0, erasedOutline = 0;
  for (let fi = 0; fi < N; fi++) {
    const waist = jogWaistRow(dir, fi);
    const y0 = Math.max(0, waist - TOP_PAD);   // clear from a bit ABOVE the waist down
    const x0 = fi * 256;
    const kill = new Uint8Array(256 * (H - y0));
    const idx = (x, y) => (y - y0) * 256 + x;
    // Pass 1 -> every skin pixel from y0 down.
    for (let y = y0; y < H; y++) for (let x = 0; x < 256; x++) {
      const i = (y * W + (x0 + x)) * 4;
      if (isSkin(d[i], d[i + 1], d[i + 2], d[i + 3])) { kill[idx(x, y)] = 1; erasedSkin++; }
    }
    // Pass 2 -> grow into adjacent dark outline pixels (the hand outlines).
    for (let it = 0; it < DILATE; it++) {
      const add = [];
      for (let y = y0; y < H; y++) for (let x = 0; x < 256; x++) {
        if (kill[idx(x, y)]) continue;
        const i = (y * W + (x0 + x)) * 4;
        if (!isDark(d[i], d[i + 1], d[i + 2], d[i + 3])) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || xx >= 256 || yy < y0 || yy >= H) continue;
          if (kill[idx(xx, yy)]) { near = true; break; }
        }
        if (near) add.push(idx(x, y));
      }
      for (const k of add) { kill[k] = 1; erasedOutline++; }
    }
    // apply erase -- everything at/above the waist that was skin/hand is now
    // transparent, so with the legs drawn OVER the torso the torso shows through
    // there (no synthetic fill rectangle).  The real (shaded) pants below the
    // waist, lifted up by the renderer, cover the seam.
    for (let y = y0; y < H; y++) for (let x = 0; x < 256; x++) {
      if (kill[idx(x, y)]) { const i = (y * W + (x0 + x)) * 4; d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; }
    }
  }
  writeFileSync(`public/sprites/player/jog-${dir}-legs.png`, encode({ width: W, height: H, data: d }));
  console.log(`wrote jog-${dir}-legs.png  (${N} frames; skin ${erasedSkin} + outline ${erasedOutline} erased)`);
}
