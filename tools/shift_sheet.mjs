/* Shift every frame of a horizontal sprite-strip by a fixed (dx, dy) in pixels.
 * dx+ = right, dy+ = down.  Vacated pixels become transparent; content pushed
 * past the frame edge is clipped.  Frames are fw-wide, full image height.
 * Used to nudge baked gear/armor sheets into alignment with the body.
 *
 *   node tools/shift_sheet.mjs <png> <fw> <dx> <dy>
 */
import { decode, encode } from './png.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const [, , path, fwArg, dxArg, dyArg] = process.argv;
if (!path) { console.error('usage: node tools/shift_sheet.mjs <png> <fw> <dx> <dy>'); process.exit(1); }
const fw = parseInt(fwArg, 10), dx = parseInt(dxArg, 10) || 0, dy = parseInt(dyArg, 10) || 0;

const img = decode(readFileSync(path));
const { width, height, data } = img;
const cols = Math.round(width / fw);
const out = new Uint8Array(width * height * 4); // zero-filled = transparent

for (let f = 0; f < cols; f++) {
  const x0 = f * fw;
  for (let y = 0; y < height; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= height) continue;
    for (let xf = 0; xf < fw; xf++) {
      const sx = xf - dx;
      if (sx < 0 || sx >= fw) continue;
      const di = (y * width + (x0 + xf)) * 4;
      const si = (sy * width + (x0 + sx)) * 4;
      out[di] = data[si]; out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2]; out[di + 3] = data[si + 3];
    }
  }
}

writeFileSync(path, encode({ width, height, data: out }));
console.log(`shifted ${path}: ${cols} frames (fw=${fw}) by dx=${dx} dy=${dy}`);
