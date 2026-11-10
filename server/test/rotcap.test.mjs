/* ═══ v2.3.4357: THE ROTCAP, THE POISON FOREST'S TWO MONSTERS ═══
 *
 * The owner, 2026-11-09: "Also this for poison land" -- and, asked which of
 * the land's two stand-ins it replaces: "Both".  docs/specs/rotcap.md.
 *
 *   1. THE STRIPS (public/sprites/monsters/rotcap/, cut from the owner's
 *      sheet by tools/art/cut_rotcap.py): 20 cells of shuffle (five sides of
 *      four), 12 of death, the codex's four; palette PNGs on at most 256
 *      colours; every cell the mushroom and nothing loose (no speck, none of
 *      the sheet's name plate), one size, on one row; the death sinking flat;
 *   2. THE LOOK: eight facings from five sides; both of the land's keys draw
 *      it -- the ordinary one that spits, the big dark one that slams -- from
 *      ONE module; each still the monster it was to the worker; their death
 *      their own strip; the old fishman pictures and the slime's stand-in
 *      gone from the land;
 *   3. WHAT PLAYERS READ, ITS SHOT, ITS PETS: "Rotcap", "Great Rotcap" and
 *      their second stage; the codex pages and stage; the spit in its spots'
 *      green; the Sporeling and the Capling on one row of the pet sheet;
 *      where a shot is aimed at each size.
 *
 * In the world: tools/qa/mp/mp-rotcap.mjs.
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
const DIR = 'public/sprites/monsters/rotcap/';

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
  const WANT = { walk: 20, death: 12, 'codex-walk': 4 };
  const bad = [];
  for (const [n, cells] of Object.entries(WANT)) {
    if (!existsSync(new URL(DIR + n + '.png', root))) { bad.push(`${n}: missing`); continue; }
    const png = strips[n] = readPng(DIR + n + '.png');
    if (png.ct !== 3 || png.bd !== 8) bad.push(`${n}: not a palette PNG`);
    if (!(png.colours >= 2 && png.colours <= 256)) bad.push(`${n}: ${png.colours} colours`);
    if (png.h !== 256 || png.w !== cells * 256) bad.push(`${n}: ${png.w}x${png.h} (want ${cells} cells)`);
  }
  check('1a its three strips are there: 20 cells of shuffle (five sides of four), 12 of death, the codex\'s four; palette PNGs on at most 256 colours', bad.length === 0, bad);
  const cells = Array.from({ length: 20 }, (_, i) => { const b = cellBox(strips.walk, i); return { h: b[3] - b[1] + 1, w: b[2] - b[0] + 1, feet: b[3], mid: (b[0] + b[2]) / 2, loose: loosePx(strips.walk, i), edge: b[0] <= 0 || b[1] <= 0 || b[2] >= 255 }; });
  check('1b every cell is the mushroom and nothing loose beside it (no speck, none of the sheet\'s name plate), clear of its cell\'s sides',
    cells.every((c) => c.loose === 0 && !c.edge), cells.filter((c) => c.loose || c.edge));
  check('1c one size from every side (within a sixth of the facing-you one), on one row (231, within 3), in the middle of its cell',
    cells.every((c) => Math.abs(c.w - cells[0].w) <= cells[0].w / 6 && Math.abs(c.h - cells[0].h) <= cells[0].h / 4 && Math.abs(c.feet - 231) <= 3 && Math.abs(c.mid - 128) <= 6), cells.map((c) => [c.w, c.h, c.feet]));
  /* its shuffle moves: within a side the four frames are not one picture */
  const moves = [0, 1, 2, 3, 4].map((s) => new Set([0, 1, 2, 3].map((f) => JSON.stringify(cellBox(strips.walk, s * 4 + f)))).size);
  check('1d its shuffle moves: the four frames of a side are not one picture, any side', moves.every((n) => n >= 2), moves);
  const dh = Array.from({ length: 12 }, (_, i) => { const b = cellBox(strips.death, i); return b[3] - b[1] + 1; });
  const d0 = cellBox(strips.death, 0), w0 = cellBox(strips.walk, 0);
  check('1e the death starts as the living mushroom, where it stood, and sinks down flat: lower frame by frame (within 6), under a third of its height by the end, spreading a little below its base',
    Math.abs(dh[0] - (w0[3] - w0[1] + 1)) <= 12 && dh.every((h, i) => i === 0 || h <= dh[i - 1] + 6) && dh[11] < dh[0] / 3
    && Math.abs(d0[3] - w0[3]) <= 3 && Array.from({ length: 12 }, (_, i) => cellBox(strips.death, i)).every((b) => b[3] >= d0[3] - 3 && b[3] <= d0[3] + 18 && b[0] > 0 && b[2] < 255 && b[3] < 255), dh);
  check('1f the codex\'s strip is the front-left row', [0, 1, 2, 3].every((f) => JSON.stringify(cellBox(strips['codex-walk'], f)) === JSON.stringify(cellBox(strips.walk, 8 + f))));
}

/* ── 2. the look ── */
{
  const rc = src('src/rendering/rotcapSprites.js'), vs = src('src/rendering/monsterVariantSprites.js');
  const face = {};
  for (const m of rc.matchAll(/^\s*(south|southwest|west|northwest|north|northeast|east|southeast):\s*\{ src: '(\w+)',\s*mirror: (true|false) \}/gm)) face[m[1]] = [m[2], m[3] === 'true'];
  const order = (/export const ROTCAP_SIDES = Object\.freeze\(\[([^\]]*)\]\)/.exec(rc) || [])[1] || '';
  check('2a eight facings from the five sides in the sheet\'s order (front, side, front-left, back, back-right), four frames each: west, north-west and south-east are mirrors',
    order.replace(/[' ]/g, '') === 's,e,sw,n,ne' && /export const ROTCAP_FRAMES = 4;/.test(rc)
    && /tex: walkFrames\[ROTCAP_SIDES\.indexOf\(m\.src\) \* ROTCAP_FRAMES \+ i\]/.test(rc)
    && JSON.stringify(face) === JSON.stringify({ south: ['s', false], southwest: ['sw', false], west: ['e', true], northwest: ['ne', true], north: ['n', false], northeast: ['ne', false], east: ['e', false], southeast: ['sw', true] }), { order, face });
  const entry = (k) => new RegExp(k + ': \\{\\s*load: loadRotcapSprites,\\s*unload: unloadRotcapSprites,\\s*walk:[^\\n]*rcFrame[^\\n]*\\n\\s*idle:[^\\n]*rcFrame[^\\n]*\\n\\s*death:[^\\n]*rcDeathFrame').test(vs);
  check('2b both of the land\'s keys draw it from ONE module: its shuffle walking, the same four standing still, its own death',
    entry('mireWisp') && entry('bogLurker') && /const BUNDLE = 'rotcap';/.test(rc) && /return unloadBundle\(BUNDLE\);/.test(rc));
  const W = MONSTER_VARIANTS.mireWisp, G = MONSTER_VARIANTS.bogLurker;
  check('2c the ordinary one is still a fodder to the worker (it spits; no speed, damage or XP of its own) and no longer a slime; the great one still a brute at the lurker\'s pace',
    W.baseArchetype === 'fodder' && !W.useSlimeSheets && W.tint == null && W.spd == null && W.incomingDmgScalar == null && W.xpMult == null && MV.isFodderLike('mireWisp')
    && G.baseArchetype === 'brute' && G.spd === 0.5 && !MV.isFodderLike('bogLurker'), { W, G });
  check('2d the great one is bigger (half again or more) and darker (a tint under white on every channel)',
    G.liveScalePx >= W.liveScalePx * 1.5 && typeof G.tint === 'number' && [16, 8, 0].every((s) => ((G.tint >> s) & 255) < 0xd0) && W.liveScalePx >= 56);
  check('2e both die their own death on every kill, play their shuffle standing still, and leave no green splat (the ordinary one)',
    W.deathStripOnly === true && G.deathStripOnly === true && W.deathMs >= 600 && G.deathMs >= W.deathMs && W.idleFrameMs > 0 && G.idleFrameMs > 0 && W.noFodderRemnants === true);
  /* the sheet draws the dying mushroom smaller than the walking one */
  const rd0 = cellBox(strips.death, 0), rw0 = cellBox(strips.walk, 0), ratio = (rw0[2] - rw0[0] + 1) / (rd0[2] - rd0[0] + 1);
  check(`2e2 ...drawn at the living one's size, each (deathScalePx ${W.deathScalePx} and ${G.deathScalePx}: the pictures say ${(W.liveScalePx * ratio).toFixed(1)} and ${(G.liveScalePx * ratio).toFixed(1)})`,
    Math.abs(W.deathScalePx - W.liveScalePx * ratio) <= 2 && Math.abs(G.deathScalePx - G.liveScalePx * ratio) <= 3 && Math.abs(W.deathOffsetY) <= 3 && Math.abs(G.deathOffsetY) <= 4, { ratio });
  const wisp = MV.applyZoneVariant({ id: 'wm-mist-1', archetype: 'fodder', type: 'fodder', arch: 'fodder', home: 'mist', level: 4 }, 'mist');
  const lurk = MV.applyZoneVariant({ id: 'wm-mist-2', archetype: 'brute', type: 'brute', arch: 'brute', home: 'mist', level: 4 }, 'mist');
  check('2f the Poison Forest\'s map is what it was (its keys are the worker\'s): its fodder the ordinary rotcap, its brute the great one',
    JSON.stringify(ZONE_VARIANT_MAP.mist) === JSON.stringify({ fodder: 'mireWisp', brute: 'bogLurker' }) && wisp.archetype === 'mireWisp' && lurk.archetype === 'bogLurker');
  const Z = await import('../../src/data/monsterDeathZones.js');
  const gd = src('src/data/gameDisplay.js');
  check('2g neither is cut into zones or dies the slime\'s death: the old lurker\'s zones and the wisp\'s slime alias are gone, each has its own death sound',
    !Z.deathZoneLook('mireWisp') && !Z.deathZoneLook('bogLurker') && !/SLIME_SHEET_DEATHS = \{[^}]*mireWisp/.test(gd) && /mireWisp: 'dieLurker'/.test(gd) && /bogLurker: 'dieLurker'/.test(gd));
  check('2h the old fishman pictures and their module are gone: nothing drew them any more',
    !existsSync(new URL('public/sprites/monsters/fishman/walk-south.png', root)) && !existsSync(new URL('src/rendering/fishmanSprites.js', root)) && !/fishmanSprites/.test(vs));
  check('2i its hits are soft and wet, in its own purple (the great one\'s still the bog\'s mud to the ear)',
    MV.hitMaterialOf('mireWisp').kind === 'goo' && MV.hitSoundOf('mireWisp') === 'goo' && MV.hitSoundOf('bogLurker') === 'mud');
}

/* ── 3. what players read, its shot, its pets ── */
{
  const gd = src('src/data/gameDisplay.js'), cx = src('src/data/monsterCodex.js');
  const { WHEEL_STAGE_LOOKS } = await import('../../src/data/wheelStageLooks.js');
  check('3a their names: "Rotcap" and "Great Rotcap", past level 20 "Spectral Rotcap" and "Shade Rotcap" in the stage\'s colours as before',
    /mireWisp: 'Rotcap',/.test(gd) && /bogLurker: 'Great Rotcap',/.test(gd) && WHEEL_STAGE_LOOKS[2].mireWisp.name === 'Spectral Rotcap' && WHEEL_STAGE_LOOKS[2].mireWisp.tint === 0x70e8ff
    && WHEEL_STAGE_LOOKS[2].bogLurker.name === 'Shade Rotcap' && WHEEL_STAGE_LOOKS[2].bogLurker.tint === 0xc090ff);
  check('3b their codex pages are the rotcap\'s: no "Mire Wisp", "Bog Lurker" or fishman left on a page',
    /name: 'Rotcap', home: 'mist', look: 'mireWisp'/.test(cx) && /name: 'Great Rotcap', home: 'mist', look: 'bogLurker'/.test(cx)
    && !/Mire Wisp|Bog Lurker|[Ff]ishm[ae]n|Spectral Wisp|Shade Lurker/.test(cx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/look: 'fishman'/g, '')));
  const CS = await import('../../src/data/codexStage.js');
  const L = CS.CODEX_LOOKS.rotcap, bad = [];
  for (const [k, s] of Object.entries((L && L.strips) || {})) {
    const file = s.url.replace(/\?.*$/, '').split('/').pop().replace('.png', '');
    const png = strips[file];
    if (!png) { bad.push(`${k}: no strip ${file}`); continue; }
    if (png.w / 256 !== s.n) bad.push(`${k}: ${s.n} cells, the file has ${png.w / 256}`);
    const b = cellBox(png, 0);
    if (Math.abs(b[3] - s.ground) > 3) bad.push(`${k}: ground ${s.ground}, its base is on ${b[3]}`);
    if (k === 'idle' && (Math.abs(b[0] - L.x0) > 6 || Math.abs(b[2] - L.x1) > 6 || Math.abs((b[3] - b[1] + 1) - L.artRows) > 6)) bad.push(`idle: box ${b}, the look says x ${L.x0}-${L.x1}, ${L.artRows} rows`);
  }
  check('3c the codex stage plays the rotcap\'s own strips for both pages (the great one in its dark tint), their cells counted and their boxes measured; it spits its spots\' green',
    !!L && L.cell === 256 && ['idle', 'walk', 'death'].every((k) => !!L.strips[k]) && bad.length === 0 && CS.CODEX_STAGE.wisplet.look === 'rotcap' && CS.CODEX_STAGE.wisplet.hit === 'throw'
    && CS.CODEX_STAGE.wisplet.shotColor === '#9bd43f' && CS.CODEX_STAGE.lurkling.look === 'rotcap' && CS.CODEX_STAGE.lurkling.hit === 'swing' && CS.CODEX_STAGE.lurkling.tint === MONSTER_VARIANTS.bogLurker.tint
    && !CS.CODEX_LOOKS.fishman, bad);
  const SHOTS = await import('../../src/data/monsterShots.js');
  check('3d its spit is the slime\'s glob in the green of its own spots', SHOTS.shotStyleOf('mireWisp') === 'goo' && SHOTS.gooColorOf('mireWisp') === 0x9bd43f && SHOTS.shotPxOf('mireWisp', 'goo') === 26);
  const { PET_KINDS, PET_ART } = await import('../../src/data/trapping.js');
  const { PET_SHEET } = await import('../../src/data/petSheet.js');
  check('3e their pets are the Sporeling and the Capling (the kinds\' ids the worker\'s, unchanged), both from the rotcap\'s row -- four frames facing you, four side on -- the Capling in the great one\'s dark',
    PET_KINDS.wisplet.name === 'Sporeling' && PET_KINDS.wisplet.name2 === 'Spectral Sporeling' && PET_KINDS.wisplet.look === 'mireWisp'
    && PET_KINDS.lurkling.name === 'Capling' && PET_KINDS.lurkling.name2 === 'Shade Capling' && PET_KINDS.lurkling.look === 'bogLurker'
    && PET_ART.wisplet.base === 'rotcap' && PET_ART.wisplet.tint === 0xffffff && PET_ART.lurkling.base === 'rotcap' && PET_ART.lurkling.tint === MONSTER_VARIANTS.bogLurker.tint
    && !!PET_SHEET.bases.rotcap && PET_SHEET.bases.rotcap.front === 4 && PET_SHEET.bases.rotcap.side === 4 && PET_SHEET.bases.rotcap.sideFaces === 'e' && !PET_SHEET.bases.slime, PET_SHEET.bases.rotcap);
  const { monsterTorsoY, monsterBodyOffsetY } = await import('../../src/data/gameSystems.js');
  const w0 = cellBox(strips.walk, 0);
  const mid = (key) => { const V = MONSTER_VARIANTS[key], k = V.liveScalePx / 256 * 1.5; return ((255 - w0[3]) + (w0[3] - w0[1] + 1) / 2) * k - 12; };
  check(`3f a shot is aimed at the middle of each one's cap, as the pictures have it (the ordinary one ${monsterTorsoY('mireWisp')} px up: ${mid('mireWisp').toFixed(0)}; the great one ${monsterTorsoY('bogLurker')}: ${mid('bogLurker').toFixed(0)}), inside its hit circle`,
    Math.abs(monsterTorsoY('mireWisp') - mid('mireWisp')) <= 6 && Math.abs(monsterTorsoY('bogLurker') - mid('bogLurker')) <= 8
    && Math.abs(monsterTorsoY('mireWisp') - monsterBodyOffsetY('mireWisp')) < 30 && Math.abs(monsterTorsoY('bogLurker') - monsterBodyOffsetY('bogLurker')) < 40);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
