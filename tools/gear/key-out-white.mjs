/* ═══ v2.3.1907: KEY OUT BACKGROUND WHITE THAT LEAKED PAST THE OUTLINE ═══
 *
 * Owner: "On the 'learn a trade' quest modal window the fishing pole has white
 * that wasn't keyed out in the spaces between the fishing pole."
 *
 * These icons are painted art with a black keyline on a white ground. Whoever
 * cut them out removed the white around the OUTSIDE of the silhouette but not
 * the white trapped in the concavities — the crescent inside the rod's bend,
 * the gaps around the reel — so on any background but white those read as a
 * pale blob stuck to the art.
 *
 * THE RULE, and what protects the art's own whites. This does not delete every
 * white pixel: the bobber's white belly and the reel's highlights are white too
 * and must stay. It floods IN FROM THE TRANSPARENT EDGE, crossing only pixels
 * that are already transparent or near-white, and stops at anything with colour
 * or darkness — the black keyline. So "background" means REACHABLE FROM
 * OUTSIDE WITHOUT CROSSING THE OUTLINE, which is what the artist meant by it.
 * An enclosed white stays enclosed.
 *
 * Chromium does the decoding: this sandbox has no PIL, and it is the only
 * image codec available (CLAUDE.md).
 *
 * LOOK AT THE OUTPUT. EVERY TIME. This is not optional and there is no
 * automatic guard, because I tried twice to write one and both versions
 * reported the same number for a clean result and a wrecked one — a metric
 * that cannot tell those apart is worse than none, so it was removed rather
 * than shipped.
 *
 * The incident it would have needed to catch: the settings that cleaned
 * fishing-pole.webp, applied to fishing-pole.png, punched blue speckles
 * straight through the rod, the brass rings and the reel. Same drawing,
 * different encoding, and that encoding let near-white INTERIOR highlights
 * connect outward through soft pixels, so the flood walked into the artwork.
 * Nothing about the pixel counts said so; rendering it did, immediately.
 * tools/dev/ has no viewer — render the file over a saturated background
 * (Chromium is the only codec here) and look before you commit.
 *
 * usage: node tools/gear/key-out-white.mjs <file> [more files...]
 *        --dry   report what would change, write nothing
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry');
const numArg = (name, dflt) => {
  const a = process.argv.find((x) => x.startsWith('--' + name + '='));
  return a ? Number(a.split('=')[1]) : dflt;
};
/* Tunable because "how white is background white" is art-dependent: the
   anti-aliased fringe between the keyline and the leaked ground is a light
   grey, and the flood has to be able to cross it or it stops at the first
   soft pixel and keys almost nothing (measured: 28 px). */
const WHITE_MIN = numArg('white', 216);
const SAT_MAX = numArg('sat', 26);
const ALPHA_CLEAR = numArg('alpha', 12);
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!files.length) { console.error('usage: key-out-white.mjs <file> [...] [--dry]'); process.exit(1); }

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();

for (const f of files) {
  if (!existsSync(f)) { console.log(`SKIP ${f} (missing)`); continue; }
  const ext = f.split('.').pop().toLowerCase();
  const b64 = readFileSync(f).toString('base64');
  const out = await page.evaluate(async ({ dataUrl, WHITE_MIN, SAT_MAX, ALPHA_CLEAR }) => {
    const im = new Image();
    await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = dataUrl; });
    const W = im.width, H = im.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    const img = x.getImageData(0, 0, W, H), d = img.data;

    /* Near-white: bright AND unsaturated. The fishing LINE and the metal
       highlights are lighter than the rod but carry a tint, so the saturation
       clause is what keeps them out of the flood. */
    const nearWhite = (o) => {
      const r = d[o], g = d[o + 1], b = d[o + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return mx >= WHITE_MIN && (mx - mn) <= SAT_MAX;
    };
    const clear = (o) => d[o + 3] <= ALPHA_CLEAR;

    const seen = new Uint8Array(W * H);
    const stack = [];
    for (let i = 0; i < W; i++) { stack.push(i, (H - 1) * W + i); }
    for (let j = 0; j < H; j++) { stack.push(j * W, j * W + W - 1); }
    let killed = 0;
    while (stack.length) {
      const p = stack.pop();
      if (p < 0 || p >= W * H || seen[p]) continue;
      const o = p * 4;
      const isClear = clear(o), isWhite = nearWhite(o);
      if (!isClear && !isWhite) continue;      /* the keyline / real colour: stop */
      seen[p] = 1;
      if (!isClear && isWhite) { d[o + 3] = 0; killed++; }
      const px = p % W, py = (p / W) | 0;
      if (px > 0) stack.push(p - 1);
      if (px < W - 1) stack.push(p + 1);
      if (py > 0) stack.push(p - W);
      if (py < H - 1) stack.push(p + W);
    }
    x.putImageData(img, 0, 0);
    return { W, H, killed, png: c.toDataURL('image/png'), webp: c.toDataURL('image/webp') };
  }, { dataUrl: `data:image/${ext === 'webp' ? 'webp' : 'png'};base64,${b64}`, WHITE_MIN, SAT_MAX, ALPHA_CLEAR });

  console.log(`${DRY ? 'DRY  ' : 'WROTE'} ${f}  ${out.W}x${out.H}  keyed ${out.killed} px`);
  if (!DRY && out.killed > 0) {
    const url = ext === 'webp' ? out.webp : out.png;
    writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  }
}
await browser.close();
