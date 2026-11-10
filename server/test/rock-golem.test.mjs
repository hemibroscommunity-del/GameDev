/* ═══ v2.3.4358: THE ROCK GOLEM, THE STONE HOLLOWS' MONSTER ═══
 *
 * The owner, 2026-11-09: "Also this to replace the rock monster that's there
 * now."  docs/specs/rock-golem.md.
 *
 *   1. THE STRIPS (public/sprites/monsters/rock-golem/, cut from the owner's
 *      sheet by tools/art/cut_rock_golem.py): 20 cells of it grinding along
 *      (five sides of four), 13 of death, the codex's four; palette PNGs on
 *      at most 256 colours; every walking cell the golem and nothing loose
 *      (no speck, none of the sheet's name plates), one size, on one row;
 *      the death starting whole and ending as rubble, its flying stones kept;
 *   2. THE LOOK: eight facings from five sides; the rock monster's key and
 *      the thorn shambler's both draw it from ONE module; each still the
 *      brute it was to the worker; the death its own strip, drawn at the
 *      living golem's size (the numbers follow from the pictures); the old
 *      one-pose rock monster's pictures, module and death zones gone;
 *   3. WHAT PLAYERS READ, ITS PET, A SHOT: "Rock Golem" (its second stage
 *      was already the Amethyst Golem); its codex page and stage; the
 *      Pebbling's row on the pet sheet; where a shot is aimed.
 *
 * In the world: tools/qa/mp/mp-rockgolem.mjs.
 */
import { readFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const MV = await import('../../src/data/monsterVariants.js');
const { MONSTER_VARIANTS, ZONE_VARIANT_MAP } = MV;
const DIR = 'public/sprites/monsters/rock-golem/';

function readPng(rel) {
  const buf = readFileSync(new URL(rel, root));
  let o = 8, w = 0, h = 0, ct = 0, bd = 0, trns = null, colours = 0;
  const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; }
    else if (type === 'PLTE') colours = len / 3;
    else if (type === 'tRNS') trns = d;
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    o += 12 + len;
  }
  if (bd !== 8 || ct !== 3) return { w, h, ct, bd, colours, alpha: null };
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(w * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    for (let x = 0; x < w; x++) {
      const a = x >= 1 ? px[y * w + x - 1] : 0, b = y > 0 ? px[(y - 1) * w + x] : 0, c = x >= 1 && y > 0 ? px[(y - 1) * w + x - 1] : 0;
      let v = raw[p++];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      px[y * w + x] = v & 255;
    }
  }
  return { w, h, ct, bd, colours, alpha: (x, y) => { const i = px[y * w + x]; return trns && i < trns.length ? trns[i] : 255; } };
}
function cellBox(png, i) {
  let x0 = 256, y0 = 256, x1 = -1, y1 = -1;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    if (png.alpha(i * 256 + x, y) > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}
function loosePx(png, i) {
  const on = new Uint8Array(256 * 256);
  let total = 0, best = 0;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (png.alpha(i * 256 + x, y) > 0) { on[y * 256 + x] = 1; total++; }
  const stack = [];
  for (let p0 = 0; p0 < on.length; p0++) {
    if (on[p0] !== 1) continue;
    let size = 0;
    on[p0] = 2; stack.push(p0);
    while (stack.length) {
      const p = stack.pop(), x = p & 255, y = p >> 8;
      size++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx > 255 || ny > 255) continue;
        const q = ny * 256 + nx;
        if (on[q] === 1) { on[q] = 2; stack.push(q); }
      }
    }
    if (size > best) best = size;
  }
  return total - best;
}

const strips = {};
/* ── 1. the strips ── */
{
  const WANT = { walk: 20, death: 13, 'codex-walk': 4 };
  const bad = [];
  for (const [n, cells] of Object.entries(WANT)) {
    if (!existsSync(new URL(DIR + n + '.png', root))) { bad.push(`${n}: missing`); continue; }
    const png = strips[n] = readPng(DIR + n + '.png');
    if (png.ct !== 3 || png.bd !== 8) bad.push(`${n}: not a palette PNG`);
    if (!(png.colours >= 2 && png.colours <= 256)) bad.push(`${n}: ${png.colours} colours`);
    if (png.h !== 256 || png.w !== cells * 256) bad.push(`${n}: ${png.w}x${png.h} (want ${cells} cells)`);
  }
  check('1a its three strips are there: 20 cells of it grinding along (five sides of four), 13 of death, the codex\'s four; palette PNGs on at most 256 colours', bad.length === 0, bad);
  const cells = Array.from({ length: 20 }, (_, i) => { const b = cellBox(strips.walk, i); return { h: b[3] - b[1] + 1, w: b[2] - b[0] + 1, feet: b[3], mid: (b[0] + b[2]) / 2, loose: loosePx(strips.walk, i), edge: b[0] <= 0 || b[1] <= 0 || b[2] >= 255 }; });
  check('1b every walking cell is the golem and nothing loose beside it (no speck, none of the sheet\'s name plates), clear of its cell\'s sides',
    cells.every((c) => c.loose === 0 && !c.edge), cells.filter((c) => c.loose || c.edge));
  check('1c one size from every side (within a fifth of the facing-you one), its base within 8 rows of 231, in the middle of its cell',
    cells.every((c) => Math.abs(c.w - cells[0].w) <= cells[0].w / 5 && Math.abs(c.h - cells[0].h) <= cells[0].h / 4 && c.feet >= 223 && c.feet <= 234 && Math.abs(c.mid - 128) <= 6), cells.map((c) => [c.w, c.h, c.feet]));
  const moves = [0, 1, 2, 3, 4].map((s) => new Set([0, 1, 2, 3].map((f) => JSON.stringify(cellBox(strips.walk, s * 4 + f)))).size);
  check('1d it moves: the four frames of a side are not one picture, any side', moves.every((n) => n >= 2), moves);
  const dh = Array.from({ length: 13 }, (_, i) => { const b = cellBox(strips.death, i); return b[3] - b[1] + 1; });
  const d0 = cellBox(strips.death, 0), w0 = cellBox(strips.walk, 0);
  check('1e the death starts as the whole golem where it stood and ends as rubble under half its height, every frame clear of its cell\'s sides',
    Math.abs(d0[3] - w0[3]) <= 3 && dh[0] >= (w0[3] - w0[1] + 1) && dh[12] < dh[0] / 2 && dh.slice(8).every((h, i) => i === 0 || h <= dh[8 + i - 1] + 4)
    && Array.from({ length: 13 }, (_, i) => cellBox(strips.death, i)).every((b) => b[0] > 0 && b[2] < 255 && b[1] > 0 && b[3] < 255), dh);
  /* its stones fly: somewhere in the death a frame is more than one piece */
  const flying = Array.from({ length: 13 }, (_, i) => loosePx(strips.death, i));
  check('1f its stones fly as it breaks: some frames of the death are more than one piece (they are kept), the first frames one', flying.slice(0, 4).every((n) => n === 0) && flying.some((n) => n >= 8), flying);
  check('1g the codex\'s strip is the front-left row', [0, 1, 2, 3].every((f) => JSON.stringify(cellBox(strips['codex-walk'], f)) === JSON.stringify(cellBox(strips.walk, 8 + f))));
}

/* ── 2. the look ── */
{
  const rg = src('src/rendering/rockGolemSprites.js'), vs = src('src/rendering/monsterVariantSprites.js');
  const face = {};
  for (const m of rg.matchAll(/^\s*(south|southwest|west|northwest|north|northeast|east|southeast):\s*\{ src: '(\w+)',\s*mirror: (true|false) \}/gm)) face[m[1]] = [m[2], m[3] === 'true'];
  const order = (/export const ROCK_GOLEM_SIDES = Object\.freeze\(\[([^\]]*)\]\)/.exec(rg) || [])[1] || '';
  check('2a eight facings from the five sides in the sheet\'s order (front, side, front-left, back, back-right), four frames each: west, north-west and south-east are mirrors',
    order.replace(/[' ]/g, '') === 's,e,sw,n,ne' && /export const ROCK_GOLEM_FRAMES = 4;/.test(rg)
    && JSON.stringify(face) === JSON.stringify({ south: ['s', false], southwest: ['sw', false], west: ['e', true], northwest: ['ne', true], north: ['n', false], northeast: ['ne', false], east: ['e', false], southeast: ['sw', true] }), { order, face });
  const entry = (k) => new RegExp(k + ': \\{\\s*load: loadRockGolemSprites,\\s*unload: unloadRockGolemSprites,\\s*walk:[^\\n]*rgFrame[^\\n]*\\n\\s*idle:[^\\n]*rgFrame[^\\n]*\\n\\s*death:[^\\n]*rgDeathFrame').test(vs);
  check('2b the rock monster\'s key and the thorn shambler\'s both draw it from ONE module: its four frames walking, the same four standing still, its own death',
    entry('rockmonster') && entry('thornShambler') && /const BUNDLE = 'rockGolem';/.test(rg) && /return unloadBundle\(BUNDLE\);/.test(rg));
  const R = MONSTER_VARIANTS.rockmonster, T = MONSTER_VARIANTS.thornShambler;
  check('2c each is still the brute it was to the worker (the same pace, nothing of its own in damage or XP), the thorn shambler the same golem in its moss green',
    R.baseArchetype === 'brute' && R.spd === 0.5 && R.tint == null && R.incomingDmgScalar == null && R.xpMult == null
    && T.baseArchetype === 'brute' && T.spd === 0.5 && T.tint === 0x4f9a3f && T.liveScalePx === R.liveScalePx && T.deathScalePx === R.deathScalePx
    && JSON.stringify(ZONE_VARIANT_MAP.hollows) === JSON.stringify({ brute: 'rockmonster' }) && ZONE_VARIANT_MAP.verdant.brute === 'thornShambler', { R, T });
  /* the sheet draws the dying golem a little bigger than the walking one */
  const d0 = cellBox(strips.death, 0), w0 = cellBox(strips.walk, 0);
  const wantPx = R.liveScalePx * (w0[2] - w0[0] + 1) / (d0[2] - d0[0] + 1);
  const wantOff = (255 - d0[3]) * wantPx / 256 - (255 - w0[3]) * R.liveScalePx / 256;
  check(`2d its death is its own strip on every kill, drawn at the living golem's size (deathScalePx ${R.deathScalePx}: the pictures say ${wantPx.toFixed(1)}) with its base where it stood (deathOffsetY ${R.deathOffsetY}: ${wantOff.toFixed(1)})`,
    R.deathStripOnly === true && T.deathStripOnly === true && R.deathMs >= 800 && Math.abs(R.deathScalePx - wantPx) <= 3 && Math.abs(R.deathOffsetY - wantOff) <= 1.5 && R.idleFrameMs > 0, { wantPx, wantOff });
  const Z = await import('../../src/data/monsterDeathZones.js');
  const gd = src('src/data/gameDisplay.js');
  check('2e the old one-pose rock monster is gone: its pictures, its module and the stones it was cut into; it still dies with the stone\'s crack and its hits are still stone',
    !existsSync(new URL('public/sprites/monsters/rockmonster/walk-south.png', root)) && !existsSync(new URL('src/rendering/rockmonsterSprites.js', root)) && !/rockmonsterSprites/.test(vs)
    && !Z.deathZoneLook('rockmonster') && !Z.deathZoneLook('thornShambler') && /rockmonster: 'dieRock'/.test(gd) && MV.hitMaterialOf('rockmonster').kind === 'stone');
}

/* ── 3. what players read, its pet, a shot ── */
{
  const gd = src('src/data/gameDisplay.js'), cx = src('src/data/monsterCodex.js');
  const { WHEEL_STAGE_LOOKS } = await import('../../src/data/wheelStageLooks.js');
  check('3a its name is "Rock Golem", past level 20 the "Amethyst Golem" it already was; its codex page says golem',
    /rockmonster: 'Rock Golem',/.test(gd) && WHEEL_STAGE_LOOKS[2].rockmonster.name === 'Amethyst Golem' && /name: 'Rock Golem', home: 'hollows', look: 'rockmonster'/.test(cx)
    && !/Rock Monster|rock monsters/.test(cx.replace(/\/\*[\s\S]*?\*\//g, '')));
  const CS = await import('../../src/data/codexStage.js');
  const L = CS.CODEX_LOOKS.rockGolem, bad = [];
  for (const [k, s] of Object.entries((L && L.strips) || {})) {
    const file = s.url.replace(/\?.*$/, '').split('/').pop().replace('.png', '');
    const png = strips[file];
    if (!png) { bad.push(`${k}: no strip ${file}`); continue; }
    if (png.w / 256 !== s.n) bad.push(`${k}: ${s.n} cells, the file has ${png.w / 256}`);
    let feet = 0, top = 256, x0 = 256, x1 = 0;
    for (let i = 0; i < png.w / 256; i++) { const b = cellBox(png, i); feet = Math.max(feet, b[3]); if (k === 'idle') { top = Math.min(top, b[1]); x0 = Math.min(x0, b[0]); x1 = Math.max(x1, b[2]); } }
    if (k !== 'death' && Math.abs(feet - s.ground) > 3) bad.push(`${k}: ground ${s.ground}, its base reaches ${feet}`);
    if (k === 'death' && Math.abs(cellBox(png, 0)[3] - s.ground) > 3) bad.push(`death: ground ${s.ground}, its first frame's base is on ${cellBox(png, 0)[3]}`);
    if (k === 'idle' && (Math.abs(x0 - L.x0) > 6 || Math.abs(x1 - L.x1) > 6 || Math.abs((feet - top + 1) - L.artRows) > 6)) bad.push(`idle: x ${x0}-${x1}, ${feet - top + 1} rows; the look says x ${L.x0}-${L.x1}, ${L.artRows} rows`);
  }
  check('3b the codex stage plays the golem\'s own strips, their cells counted and their boxes measured; no look of the old rock monster left',
    !!L && L.cell === 256 && ['idle', 'walk', 'death'].every((k) => !!L.strips[k]) && bad.length === 0 && CS.CODEX_STAGE.pebbling.look === 'rockGolem' && CS.CODEX_STAGE.pebbling.hit === 'swing'
    && !CS.CODEX_LOOKS.rockmonster && Object.values(CS.CODEX_STAGE).every((st) => !!CS.CODEX_LOOKS[st.look]), bad);
  const { PET_KINDS, PET_ART } = await import('../../src/data/trapping.js');
  const { PET_SHEET } = await import('../../src/data/petSheet.js');
  const used = new Set(Object.values(PET_ART).map((a) => a.base));
  check('3c its pet is still the Pebbling, drawn from the golem\'s row of the pet sheet (four frames facing you, four side on); every pet has a row and every row a pet',
    PET_KINDS.pebbling.name === 'Pebbling' && PET_KINDS.pebbling.look === 'rockmonster' && PET_ART.pebbling.base === 'rockGolem'
    && !!PET_SHEET.bases.rockGolem && PET_SHEET.bases.rockGolem.front === 4 && PET_SHEET.bases.rockGolem.side === 4 && !PET_SHEET.bases.rockmonster
    && [...used].every((b) => !!PET_SHEET.bases[b]) && Object.keys(PET_SHEET.bases).every((b) => used.has(b)), { rows: Object.keys(PET_SHEET.bases) });
  const { monsterTorsoY, monsterBodyOffsetY } = await import('../../src/data/gameSystems.js');
  const w0 = cellBox(strips.walk, 0);
  const mid = ((255 - w0[3]) + (w0[3] - w0[1] + 1) / 2) * (MONSTER_VARIANTS.rockmonster.liveScalePx / 256 * 1.5) - 12;
  check(`3d a shot is aimed at the middle of its heap, as the pictures have it (${monsterTorsoY('rockmonster')} px up: ${mid.toFixed(0)}), inside its hit circle; the thorn shambler the same`,
    Math.abs(monsterTorsoY('rockmonster') - mid) <= 8 && monsterTorsoY('thornShambler') === monsterTorsoY('rockmonster') && Math.abs(monsterTorsoY('rockmonster') - monsterBodyOffsetY('rockmonster')) < 40);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
