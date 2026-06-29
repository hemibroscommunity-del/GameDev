/* Strip stray floating specks from the bow attack BODY sheets.
   The owner reported "static over the image" on the north bow attack -- the
   sheets carry a handful of isolated opaque pixels (AA fuzz / stray colour) away
   from the figure.  Per frame, keep only opaque components >= MIN px (the body +
   bow is one large blob ~7000px; specks are <15px) and clear the rest.  Writes
   the sheets in place.

   Run: node tools/despeckle_body_sheets.mjs [--dry]
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { decode, encode } from './png.mjs';

const SHEETS = [
  ['bow-south', 130, 234, 3], ['bow-southwest', 154, 233, 3], ['bow-east', 214, 241, 3],
  ['bow-north', 122, 260, 3], ['bow-northwest', 160, 248, 3],
];
const MIN = 50;
const dry = process.argv.includes('--dry');

for (const [name, FW, FH, N] of SHEETS) {
  const path = `public/sprites/player/${name}-body.png`;
  const im = decode(readFileSync(path));
  const { width: W, data: d } = im;
  let removed = 0;
  for (let fi = 0; fi < N; fi++) {
    const idx = (x, y) => (y * W + (fi * FW + x)) * 4;
    const op = (x, y) => x >= 0 && x < FW && y >= 0 && y < FH && d[idx(x, y) + 3] > 20;
    const lab = new Int32Array(FW * FH).fill(-1);
    const comps = [];
    const st = [];
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const li = y * FW + x;
      if (!op(x, y) || lab[li] >= 0) continue;
      const id = comps.length; const px = []; lab[li] = id; st.length = 0; st.push([x, y]);
      while (st.length) {
        const [cx, cy] = st.pop(); px.push([cx, cy]);
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          const nli = ny * FW + nx;
          if (op(nx, ny) && nli >= 0 && nli < FW * FH && lab[nli] < 0) { lab[nli] = id; st.push([nx, ny]); }
        }
      }
      comps.push(px);
    }
    for (const px of comps) if (px.length < MIN) for (const [x, y] of px) { const i = idx(x, y); d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; removed += 1; }
  }
  console.log(`${name}-body: removed ${removed} speck px` + (dry ? ' (dry)' : ''));
  if (!dry) writeFileSync(path, encode({ width: im.width, height: im.height, data: d }));
}
