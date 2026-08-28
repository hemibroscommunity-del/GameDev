/* Repaint the bow, staff and shield art as PINE (v2.3.1763; shield v2.3.1774).
 *
 *   node tools/gear/make-pine-wood.mjs
 *
 * Owner: "I also want the first wood tier for staffs and bows to be pine.  Can
 * you recolor the bow and staff lighter to look like pine?"
 *
 * This is NOT the material-tint pipeline, and it cannot be: a Pixi tint
 * MULTIPLIES, so it can only darken, and the ask is for LIGHTER wood.  The art
 * itself has to change — so it changes here, once, reproducibly, rather than by
 * hand in an image editor.
 *
 * The sources live in tools/gear/src-art (outside public/, so they do not ship)
 * precisely so this is re-runnable: reading the SHIPPED file and writing back
 * over it would compound the curve every run, and nobody would notice until the
 * bow was bone white.
 *
 * The transform, on wood pixels only:
 *   - lift toward white with a screen curve (this is the "lighter"),
 *   - pull the hue toward pine's pale yellow-tan by lifting green a little
 *     harder than red and blue,
 *   - leave the near-black keyline alone, or the art loses its outline and
 *     starts to look like a sticker.
 * The bowstring and any metal fittings are near-neutral and very light, so the
 * saturation gate below leaves them where they are.
 */
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'tools/gear/src-art');
const PUB = path.join(ROOT, 'public');

/* src (under tools/gear/src-art) -> destination (under public) */
const FILES = [
  ['bows/Bow2.webp', 'sprites/weapons/bows/Bow2.png'],
  ['bows/bow-south.webp', 'sprites/weapons/bows/bow-south.png'],
  ['bows/bow-southwest.webp', 'sprites/weapons/bows/bow-southwest.png'],
  ['bows/bow-east.webp', 'sprites/weapons/bows/bow-east.png'],
  ['bows/bow-northeast.webp', 'sprites/weapons/bows/bow-northeast.png'],
  ['bows/bow-north.webp', 'sprites/weapons/bows/bow-north.png'],
  ['staffs/Wizard Staff2.webp', 'sprites/weapons/staffs/Wizard Staff2.png'],
  /* v2.3.2010: `inkEdge` — see THE SOFT OUTLINE below.  The three ICONS are
     painted at 256px and their linework is a soft dark band, not the sprites'
     hard near-black keyline, so the near-black guard only spares its core. */
  ['icons/bow.webp', 'icons/items/bow.png', { inkEdge: true }],
  ['icons/staff.webp', 'icons/items/staff.png', { inkEdge: true }],
  /* v2.3.1774 (owner: "change bro's shield to pine shield and see if you can
     recolor it like you did for the staff and bow").  Same curve, same
     reasoning — the shield's face is wood and the ask is for LIGHTER wood,
     which a multiply tint cannot do.  Its steel rim and boss are near-neutral
     and light, so the saturation gate leaves them as metal. */
  ['icons/shield.webp', 'icons/items/shield.png', { inkEdge: true }],
  /* v2.3.1875: the three shield SPRITES also get the halo peel (see DEHALO
     below).  The icon above deliberately does not — it is higher-res painted
     art whose edge really does carry light neutral highlights, and the peel
     rule cannot tell those from a halo. */
  ['shields/wood-shield-front.webp', 'sprites/shields/wood-shield-front.png', { dehalo: true }],
  ['shields/wood-shield-3q.webp', 'sprites/shields/wood-shield-3q.png', { dehalo: true }],
  ['shields/wood-shield-side.webp', 'sprites/shields/wood-shield-side.png', { dehalo: true }],
  /* v2.3.1825 (owner: "you need to change the bow attack art (each
     direction) to match the pine bow").  These are the bow-only layer of the
     five bowshot poses — the pose sheets are authored with the weapon
     separated out precisely so it can be recoloured without touching the
     archer.  They were never in this list, so the held bow went pine at
     v2.3.1763 and the drawn bow stayed brown for two months.
     Their sources are the ORIGINAL brown PNGs, copied into src-art
     unmodified: the shipped file was pristine because nothing had ever
     processed it. */
  ['player/bow-east-weapon.png', 'sprites/player/bow-east-weapon.png'],
  ['player/bow-north-weapon.png', 'sprites/player/bow-north-weapon.png'],
  ['player/bow-northwest-weapon.png', 'sprites/player/bow-northwest-weapon.png'],
  ['player/bow-south-weapon.png', 'sprites/player/bow-south-weapon.png'],
  ['player/bow-southwest-weapon.png', 'sprites/player/bow-southwest-weapon.png'],
];

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
window.__pine = (src, opts) => new Promise((res) => {
  const img = new Image();
  img.onerror = () => res(null);
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, cv.width, cv.height); const p = d.data;
    const W = cv.width, H = cv.height;
    let peeled = 0, passes = 0;
    /* ═══ v2.3.1875: PEEL THE BAKED GREY HALO ═══
       Owner: "There's very slight grayish pixels around the shield (pine
       shield).  I noticed them in the southwest idle version of the character
       that shows in the dashboard's blown up character view."

       Measured before touching anything, and the obvious suspect was wrong.
       The shield art has BINARY alpha (0 or 255, no soft edge at all), so the
       fringe is not antialiasing in the file, and it survives with
       imageSmoothingEnabled = false, so it is not the portrait's 2.8x upscale
       either.  It is baked into the PIXELS: the source carries a one-pixel
       ring of mid grey, rgb ~ (93,87,84), sitting OUTSIDE the shield's dark
       keyline — the remains of the original artwork's antialias against
       whatever background it was cut from, flattened to opaque at some point
       long before this repo.

       It only became visible now because the pine screen curve below lifts
       that ring from 93 to 187: the keyline guard spares mx < 60, and the
       halo is brighter than that, so it gets screened like wood.  Twice as
       bright, one pixel outside the outline, and the equip screen draws the
       shield at ~2.8x — which is exactly where the owner saw it.

       The peel is safe because the silhouette separates cleanly.  Every
       edge pixel on all three views is either the dark keyline (mean rgb
       15,5,3) or the halo (mean 91,83,79); there are no light and no
       saturated edge pixels, so no metal rim or wood face can be eaten.
       Counts: 3q 53 of 959 opaque px, side 18 of 339, front 1 of 1393 —
       which is why the owner saw it on the 3/4 view (the equip screen's
       southwest) and not head-on.

       Iterated rather than single-pass so a two-pixel halo could not leave
       half of itself behind, and rail-guarded: if a future re-cut of the art
       ever made this rule eat the shield, the run fails loudly instead of
       shipping a dissolved sprite. */
    if (opts && opts.dehalo) {
      const HALO_LUM = 60;    /* brighter than the keyline (which tops out ~59) */
      const HALO_SAT = 30;    /* neutral — wood and rust are well above this */
      const MAX_FRAC = 0.15;  /* rail: never dissolve more than this share */
      let opaque0 = 0;
      for (let i = 3; i < p.length; i += 4) if (p[i] !== 0) opaque0++;
      const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : p[(y * W + x) * 4 + 3];
      for (passes = 1; passes <= 4; passes++) {
        const kill = [];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (p[i + 3] === 0) continue;
          /* interior pixels are never halo — only the silhouette ring is */
          if (A(x - 1, y) && A(x + 1, y) && A(x, y - 1) && A(x, y + 1)) continue;
          const r = p[i], g = p[i + 1], b = p[i + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx >= HALO_LUM && mx - mn < HALO_SAT) kill.push(i);
        }
        if (!kill.length) break;
        /* Collected first, cleared after: clearing inside the scan would let
           this pass see its own holes and eat a second ring in one go. */
        for (const i of kill) { p[i + 3] = 0; peeled++; }
      }
      if (peeled > opaque0 * MAX_FRAC) {
        return res({ error: 'dehalo peeled ' + peeled + '/' + opaque0 + ' px (> ' + (MAX_FRAC * 100) + '%) — refusing' });
      }
    }
    /* ═══ v2.3.1825: THE CURVE, AND WHY IT IS NOT A SINGLE SCREEN ═══
       Owner: "The pine bow looks like the black outline was keyed out during
       recoloring to make it pine.  Add the outline back in."

       Measured before changing anything.  The v2.3.1763 curve was one screen
       step, up = c + (255 - c) * 0.42, which lifts the DARK end by ~92 and
       the light end by ~31 — it crushes the shadows.  On the icon art, whose
       drawing is carried by a dark brown ink band around L 20-45 rather than
       by a pure black keyline, that band came out at L 120-140: the same
       brightness as the wood beside it, so the linework vanished.  (The
       sprite bows kept theirs, because their outline really is near-black
       and was already inside the old guard.  The bow ICON's edge mean went
       85.9 -> 127.9 — that is the "keyed out" the owner is seeing.)

       No single tone curve can both make the wood pine-pale AND keep the ink
       dark if it lifts proportionally.  A REPEATED SCREEN can:
           out = 255 * (1 - (1 - x/255)^p)
       For small x this is almost exactly a linear gain of p, so shadow
       CONTRAST survives; it approaches 255 smoothly, so highlights roll off
       instead of clipping.  p = 2.869 is chosen so the wood midtone lands on
       the same value the approved pine art already has (66 -> 147), which is
       what keeps this a fix to the outline and not a re-colour of a colour
       the owner already signed off.

       The near-black guard below is kept but is no longer load-bearing: this
       curve maps 0 to 0 on its own.  It still spares true black from the
       WARM multiply. */
    const P_SCREEN = 2.869;
    const WARM = [1.00, 1.03, 0.90];   /* pine reads yellow-tan, not pink */
    const curve = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      curve[v] = Math.round(255 * (1 - Math.pow(1 - v / 255, P_SCREEN)));
    }
    /* ═══ v2.3.2010: THE SOFT OUTLINE, WHICH THE NEAR-BLACK GUARD MISSES ═══
     *
     * Owner, for the second time on this art: "For pine bow check outline in
     * each direction looks like the black outline was removed."
     *
     * v2.3.1875 already fixed this ONCE, by replacing a single screen step
     * with a repeated screen that preserves shadow contrast, and that fix is
     * real -- the SPRITE bows measure 88-99% dark on their silhouette edge
     * today, and re-running this tool reproduces every shipped file
     * byte-for-byte, so nothing here is stale.  What it did not fix is the
     * ICON, and the reason is in the guard below rather than in the curve.
     *
     * MEASURED, on the source icon (tools/gear/src-art/icons/bow.webp), its
     * 860 silhouette-edge pixels by max-channel band:
     *
     *     0- 31   177   32- 63   175   <- the guard spares these
     *    64- 95   144   96-127   138   <- it lifts these, like wood
     *   128-255   226
     *
     * The icon's outline is not a keyline.  It is a PAINTED band that fades
     * from black out through the wood over ~120 levels, so 'mx < 60' keeps its
     * core and screens its shoulder: 352 of 860 edge pixels survive and the
     * line thins until it reads as gone.  Shipped edge means bear that out --
     * bow 133.5, staff 100.0, shield 102.5, against the 85.9 this art had
     * before any recolour.  (The saturation clause is a second, smaller miss:
     * the icon's ink is brown, so a saturated dark pixel fails 'mx - mn < 24'
     * even below 60.  Both are fixed by the same rule.)
     *
     * THE RULE: on the SILHOUETTE EDGE, leave anything darker than the wood's
     * own midtone alone, whatever its hue.  The edge is where the outline is,
     * by definition, so this cannot reach into the wood face and keep it dark
     * -- an interior shadow is still screened exactly as before, and the
     * approved pine colour is unchanged everywhere but the rim.
     *
     * EDGE_INK = 128 rather than the wood midtone's 66: the band's shoulder
     * runs to ~127 (see the histogram), and stopping at 66 would leave the
     * outer half of every line lifted, which is the same bug with a smaller
     * number.  Above 128 the edge is a highlight on a metal fitting, not ink,
     * and those still take the curve.
     *
     * SPRITES DO NOT OPT IN.  Their outline really is a hard near-black
     * keyline that the old guard already catches, and their edges are one
     * pixel wide, so an edge rule there would be all cost and no change. */
    const EDGE_INK = 128;
    const inkEdge = !!(opts && opts.inkEdge);
    const alphaAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : p[(y * W + x) * 4 + 3];
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 8) continue;
      const r = p[i], g = p[i + 1], b = p[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      /* keyline: near-black and near-neutral -> the outline, leave it */
      if (mx < 60 && mx - mn < 24) continue;
      if (inkEdge && mx < EDGE_INK) {
        const px = (i / 4) % W, py = Math.floor((i / 4) / W);
        const solid = alphaAt(px - 1, py) >= 200 && alphaAt(px + 1, py) >= 200
          && alphaAt(px, py - 1) >= 200 && alphaAt(px, py + 1) >= 200;
        if (!solid) continue;      /* on the silhouette and dark -> it is ink */
      }
      const lift = (c0, k) => Math.max(0, Math.min(255, Math.round(curve[c0] * k)));
      p[i] = lift(r, WARM[0]);
      p[i + 1] = lift(g, WARM[1]);
      p[i + 2] = lift(b, WARM[2]);
    }
    c.putImageData(d, 0, 0);
    res({ w: cv.width, h: cv.height, peeled, passes, png: cv.toDataURL('image/png') });
  };
  img.src = src;
});
</script></body>`;

const TYPES = { '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__pine.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  fs.readFile(path.join(SRC, url), (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(url)] || 'application/octet-stream' });
    res.end(b);
  });
});
await new Promise((r) => srv.listen(4272, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4272/__pine.html');

let wrote = 0;
let failed = 0;
for (const [src, dest, opts] of FILES) {
  const got = await page.evaluate(([s, o]) => window.__pine(s, o), ['/' + src, opts || null]);
  if (!got) { console.log(`  MISSING SOURCE  ${src}`); continue; }
  if (got.error) { console.log(`  FAILED  ${dest}: ${got.error}`); failed++; continue; }
  const out = path.join(PUB, dest);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(got.png.split(',')[1], 'base64'));
  const halo = got.peeled ? `  [halo: peeled ${got.peeled}px in ${got.passes} pass(es)]` : '';
  console.log(`  wrote ${dest}  (${got.w}x${got.h})${halo}`);
  wrote++;
}
console.log(`${wrote} file(s) written from tools/gear/src-art`);
if (failed) { console.error(`${failed} file(s) FAILED — see above`); process.exitCode = 1; }
await browser.close();
srv.close();

/* v2.3.2068: the three ICON destinations above are written as PNG (canvas
   cannot encode a LOSSLESS webp) and then converted, because /icons/items
   ships webp now and the React <img> tags ask for `.webp`.  The converter
   only walks public/icons, so the sprite destinations in this list are
   untouched by it and stay PNG. */
if (wrote) {
  const r = spawnSync('python3', [path.join(ROOT, 'tools/webp_icons.py'), '--convert'],
    { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('  !! webp conversion failed — the icons are still .png, which nothing loads.');
    console.error('     Run: python3 tools/webp_icons.py --convert');
    process.exitCode = 1;
  }
}
