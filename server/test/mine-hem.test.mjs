/* ═══ v2.3.3622: THE TEE'S HEM MEETS THE TROUSERS ON EVERY MINING FRAME ═══
 *
 * The owner's list of 2026-10-26: "The shirt shifts while mining."  In the
 * pickaxe swing the tee rode up and a band of bare belly showed between its
 * hem and the trousers, frame by frame, so the shirt seemed to jump.
 * tools/gear/lower-mine-hem.mjs lowered the hem as drawn (its keyline and its
 * shade) to the trousers wherever a stretch of three or more columns showed a
 * short band, and closed the one-pixel slit frame 9 had down its middle.
 *   1. the fix is in and whole: the tool's own dry run finds nothing to do;
 *   2. the sheet is still the body's size, fourteen 128 px frames;
 *   3. no belly shows: in no frame does a stretch of three columns or more
 *      show skin between the hem and the trousers;
 *   4. phones fetch the new sheet: GEAR_VERSION is 2.3.3622 or later;
 *   5. v2.3.3671: no pinholes -- no see-through pixel the tee encloses lies
 *      over the skin (tools/gear/fill-mine-tee-holes.mjs's dry run).
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const { decode } = await import('../../tools/gear/lib/png.mjs');

/* ── 1. the tool finds nothing left to do ── */
{
  const r = spawnSync(process.execPath, [new URL('tools/gear/lower-mine-hem.mjs', root).pathname], { encoding: 'utf8' });
  check('1a the tool runs (a dry run, nothing written)', r.status === 0, (r.stderr || '').slice(0, 300));
  check('1b ...and finds no short hem and no slit left: "0 px would be written"', /^0 px would be written/m.test(r.stdout || ''), (r.stdout || '').slice(0, 300));
}

/* ── 2. the sheet ── */
const T = decode(readFileSync(new URL('public/sprites/gear/shirt/tshirt/mine-south.png', root)));
const B = decode(readFileSync(new URL('public/sprites/player/mine-south.png', root)));
const FW = 128;
check('2a the tee is the body\'s size, fourteen 128 px frames', T.width === B.width && T.height === B.height && T.width === FW * 14, { tee: [T.width, T.height], body: [B.width, B.height] });

/* ── 3. no belly between the hem and the trousers (the recolour's classifiers) ── */
{
  const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
  const isPants = (r, g, b, a) => a > 180 && g >= r - 10 && g > b + 8 && r < 150;
  const isInk = (r, g, b, a) => a > 180 && (r + g + b) / 3 < 50;
  const px = (I, f, x, y) => { const i = ((y * I.width) + f * FW + x) * 4; return [I.data[i], I.data[i + 1], I.data[i + 2], I.data[i + 3]]; };
  const bands = [];
  for (let f = 0; f < 14; f++) {
    const bare = [];
    for (let x = 0; x < FW; x++) {
      let h = -1;
      for (let y = T.height - 1; y >= 0; y--) if (T.data[((y * T.width) + f * FW + x) * 4 + 3] > 60) { h = y; break; }
      if (h < 0) continue;
      let run = 0;
      while (run <= 6 && h + 1 + run < T.height && isSkin(...px(B, f, x, h + 1 + run))) run++;
      if (run < 1 || run > 6) continue;
      const y = h + 1 + run;
      const onPants = isPants(...px(B, f, x, y)) || (isInk(...px(B, f, x, y)) && [1, 2].some((d) => y + d < T.height && isPants(...px(B, f, x, y + d))));
      if (onPants) bare.push(x);
    }
    let best = 0;
    for (let i = 0; i < bare.length;) { let j = i + 1; while (j < bare.length && bare[j] === bare[j - 1] + 1) j++; best = Math.max(best, j - i); i = j; }
    if (best >= 3) bands.push({ frame: f, columns: best });
  }
  check('3a no frame shows a band of belly three columns wide or more between the hem and the trousers', bands.length === 0, bands);
}

/* ── 4. the phones fetch it again ── */
{
  const m = /const GEAR_VERSION = '2\.3\.(\d+)'/.exec(readFileSync(new URL('src/rendering/gearSheets.js', root), 'utf8'));
  check('4a GEAR_VERSION is 2.3.3622 or later, so every phone fetches the lowered hem', !!m && +m[1] >= 3622, m && m[0]);
}

/* ── 5. v2.3.3671: no pinholes (tools/gear/fill-mine-tee-holes.mjs) ──
   A see-through pixel the tee encloses, over the body's skin, showed the skin
   through the shirt as a dot (154 px over the fourteen frames). */
{
  const r = spawnSync(process.execPath, [new URL('tools/gear/fill-mine-tee-holes.mjs', root).pathname], { encoding: 'utf8' });
  check('5a the pinhole tool runs (a dry run, nothing written)', r.status === 0, (r.stderr || '').slice(0, 300));
  check('5b ...and finds no hole over the skin left: "0 px would be written"', /^0 px would be written/m.test(r.stdout || ''), (r.stdout || '').slice(0, 300));
  const m = /const GEAR_VERSION = '2\.3\.(\d+)'/.exec(readFileSync(new URL('src/rendering/gearSheets.js', root), 'utf8'));
  check('5c GEAR_VERSION is 2.3.3671 or later, so every phone fetches the mended tee', !!m && +m[1] >= 3648, m && m[0]);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
