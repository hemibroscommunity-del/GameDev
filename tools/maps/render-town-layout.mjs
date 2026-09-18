/* THE TOWN, DRAWN THE WAY THE GAME DRAWS IT  (v2.3.2628).
 *
 *   node tools/maps/render-town-layout.mjs [--out=tools/maps/out/town-layout.png]
 *                                          [--grid] [--names] [--w=2200]
 *
 * A node port of render_town_layout.py, which cannot run in this sandbox:
 * Pillow is not installed and `npm install` will not bring it.  A layout
 * picture that only renders on someone else's machine is a layout picture
 * nobody looks at, which is how the town came to be laid out by arithmetic
 * alone.  Same contract as the python one and the same reason for existing:
 *
 * IT READS THE LIVE DATA.  worldProps.js, zones.js and gameDisplay.js are
 * imported, and the arithmetic the renderers use is applied here -- bottom-
 * centre anchor, worldH scaling, the NPC feet baseline -- so a prop moved in
 * the data moves in this picture without anyone updating a second copy.  A
 * layout diagram maintained by hand is a diagram that lies.
 *
 * --grid draws the 5% ruler the placements are quoted against; --names labels
 * every prop with its id and its position as a percentage of the map.
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const has = (k) => args.includes(`--${k}`);
const OUT = resolve(REPO, arg('out', 'tools/maps/out/town-layout.png'));
const OUT_W = +arg('w', '2200');

const { ZONES } = await import(join(REPO, 'src/data/zones.js'));
const { propsForZone } = await import(join(REPO, 'src/data/worldProps.js'));
const { NPC_DATA } = await import(join(REPO, 'src/data/gameDisplay.js'));
const { IMAGE_ZONE_MAPS } = await import(join(REPO, 'src/rendering/tiledMaps.js'));

const zone = ZONES.town;
const TILE = 32;
const W = zone.w * TILE, H = zone.h * TILE;
const mapUrl = IMAGE_ZONE_MAPS.town;                       /* read, never hardcoded */
const mapPath = join(REPO, 'public', mapUrl.replace(/^\//, ''));
const props = propsForZone('town');
const npcs = Object.entries(NPC_DATA).filter(([, n]) => !n.zone || n.zone === 'town');

const mime = (p) => (p.endsWith('.webp') ? 'image/webp' : p.endsWith('.png') ? 'image/png' : 'image/jpeg');
const b64 = (p) => 'data:' + mime(p) + ';base64,' + readFileSync(p).toString('base64');

const sprites = {};
for (const p of props) {
  if (!p.sprite) continue;
  const f = join(REPO, 'public', p.sprite.replace(/^\//, ''));
  try { sprites[p.sprite] = b64(f); } catch { /* missing art draws as a box */ }
}

const browser = await chromium.launch({ executablePath: process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
const png = await page.evaluate(async (cfg) => {
  const load = (s) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = s; });
  const map = await load(cfg.map);
  const s = cfg.outW / cfg.W;
  const c = document.createElement('canvas');
  c.width = Math.round(cfg.W * s); c.height = Math.round(cfg.H * s);
  const x = c.getContext('2d');
  /* the map is drawn stretched to the zone box, exactly as the tile renderer
     does it -- if the aspect is off, this picture shows the stretch too. */
  x.drawImage(map, 0, 0, c.width, c.height);

  /* props, painters' order by ground line, which is what the renderer does */
  const ordered = cfg.props.slice().sort((a, b) => a.y - b.y);
  for (const p of ordered) {
    const src = cfg.sprites[p.sprite];
    if (src) {
      const img = await load(src);
      /* An animated prop's file is a horizontal STRIP (fountain.webp is eight
         frames).  Drawing the whole file paints eight fountains in a row --
         the renderer has to slice frame 0 the way the sprite does. */
      const frames = (p.anim && p.anim.frames) || 1;
      const fw = img.width / frames;
      const h = p.worldH * s, w = h * (fw / img.height);
      x.drawImage(img, 0, 0, fw, img.height, p.x * s - w / 2, p.y * s - h, w, h);
    }
    if (p.blockW && p.blockD) {
      x.strokeStyle = 'rgba(255,60,60,.85)'; x.lineWidth = 2;
      x.strokeRect((p.x - p.blockW / 2) * s, (p.y - p.blockD) * s, p.blockW * s, p.blockD * s);
    }
  }
  for (const n of cfg.npcs) {
    x.fillStyle = 'rgba(80,160,255,.9)';
    x.beginPath(); x.arc(n.x * s, n.y * s, 9, 0, 7); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke();
  }
  if (cfg.grid) {
    x.font = 'bold 15px monospace'; x.lineWidth = 1;
    for (let p = 5; p < 100; p += 5) {
      const Y = Math.round(c.height * p / 100), X = Math.round(c.width * p / 100);
      x.strokeStyle = (p % 25 === 0) ? 'rgba(255,0,0,.8)' : 'rgba(0,255,255,.4)';
      x.beginPath(); x.moveTo(0, Y); x.lineTo(c.width, Y); x.stroke();
      x.strokeStyle = (p % 25 === 0) ? 'rgba(255,0,0,.8)' : 'rgba(255,255,0,.35)';
      x.beginPath(); x.moveTo(X, 0); x.lineTo(X, c.height); x.stroke();
      x.fillStyle = '#000'; x.fillRect(2, Y - 13, 40, 16); x.fillRect(X - 17, 2, 36, 16);
      x.fillStyle = '#fff'; x.fillText(p + '%', 4, Y - 1); x.fillText(p + '%', X - 15, 14);
    }
  }
  if (cfg.names) {
    x.font = 'bold 17px monospace';
    for (const p of cfg.props) {
      const t = `${p.id} ${(p.x / cfg.W * 100).toFixed(0)},${(p.y / cfg.H * 100).toFixed(0)}`;
      const w = x.measureText(t).width;
      x.fillStyle = 'rgba(0,0,0,.78)'; x.fillRect(p.x * s - w / 2 - 5, p.y * s + 4, w + 10, 22);
      x.fillStyle = '#ffe9a8'; x.fillText(t, p.x * s - w / 2, p.y * s + 20);
    }
  }
  return c.toDataURL('image/png');
}, {
  map: b64(mapPath), W, H, outW: OUT_W, props, npcs: npcs.map(([, n]) => n),
  sprites, grid: has('grid'), names: has('names'),
});
await browser.close();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64'));
console.log(`town ${zone.w}x${zone.h} tiles = ${W}x${H} world px, art ${mapUrl}`);
console.log(`${props.length} props (${props.filter((p) => p.blockW).length} blocking), ${npcs.length} NPCs -> ${OUT}`);
