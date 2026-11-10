/* ═══ v2.3.4356: THE STORM EYE, THE ELECTRIC FOUNDRY'S MONSTER ═══
 *
 * The owner, 2026-11-09: "Also add this electric eyeball monster instead of
 * the stand-in electric slime. You'll use code to make the electric
 * effects".  docs/specs/storm-eye.md.
 *
 *   1. THE STRIPS (public/sprites/monsters/storm-eye/, cut from the owner's
 *      sheet by tools/art/cut_storm_eye.py): the five views, the death's
 *      twelve frames and the codex's one; palette PNGs on at most 256
 *      colours; every view one joined-up piece, the same size, on one row;
 *   2. THE LOOK: eight facings from five views; the Foundry's `fodder` is
 *      the storm eye on the phone and nowhere else, and still the slime to
 *      the worker; it floats (hoverLift); its death is its own strip;
 *   3. ITS ELECTRICITY, IN CODE (data/stormSparks.js, game/stormSparks.js):
 *      the arcs over it crackle -- lit for about the table's share of the
 *      time, each holding its place for a slot and then somewhere else, on
 *      its body -- and never the same on two eyes; a zap is thrown off it
 *      every way, out to its reach, and ends; the pool holds a full screen;
 *   4. THE WIRING, WHAT PLAYERS READ, ITS SHOT: the renderer hovers it,
 *      stamps it for its arcs and queues its zap as a warning ends; its spit
 *      is the pale blue of its lightning; "Storm Eye", "Tempest Eye"; its
 *      codex page and stage; the Sparklet's row on the pet sheet.
 *
 * In the world: tools/qa/mp/mp-stormeye.mjs.
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
const MS = await import('../../src/game/monsterStrips.js');
const DIR = 'public/sprites/monsters/storm-eye/';

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
/* how many px of a cell are outside its biggest joined-up piece */
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
  const WANT = { views: 5, death: 12, 'codex-idle': 1 };
  const bad = [];
  for (const [n, cells] of Object.entries(WANT)) {
    if (!existsSync(new URL(DIR + n + '.png', root))) { bad.push(`${n}: missing`); continue; }
    const png = strips[n] = readPng(DIR + n + '.png');
    if (png.ct !== 3 || png.bd !== 8) bad.push(`${n}: not a palette PNG`);
    if (!(png.colours >= 2 && png.colours <= 256)) bad.push(`${n}: ${png.colours} colours`);
    if (png.h !== 256 || png.w !== cells * 256) bad.push(`${n}: ${png.w}x${png.h} (want ${cells} cells)`);
  }
  check('1a its three strips are there: five views, twelve frames of death, the codex\'s one; palette PNGs on at most 256 colours, rows of 256 px cells', bad.length === 0, bad);
  const views = [0, 1, 2, 3, 4].map((i) => { const b = cellBox(strips.views, i); return { h: b[3] - b[1] + 1, w: b[2] - b[0] + 1, feet: b[3], mid: (b[0] + b[2]) / 2, loose: loosePx(strips.views, i) }; });
  check('1b every view is the eye and nothing loose beside it, the same size (within a tenth), on one row (within 4), in the middle of its cell',
    views.every((v) => v.loose === 0 && Math.abs(v.h - views[0].h) <= views[0].h * 0.1 && Math.abs(v.w - views[0].w) <= views[0].w * 0.1 && Math.abs(v.feet - 231) <= 4 && Math.abs(v.mid - 128) <= 8), views);
  /* the death starts whole and ends in a few crumbs, never growing past its cell */
  const area = (i) => { let n = 0; for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (strips.death.alpha(i * 256 + x, y) > 60) n++; return n; };
  const areas = Array.from({ length: 12 }, (_, i) => area(i));
  const d0 = cellBox(strips.death, 0), v0 = cellBox(strips.views, 0);
  check('1c the death starts as the living eye (its first frame the front view\'s size and place) and ends in crumbs, every frame drawn in, none against its cell\'s edge',
    Math.abs((d0[3] - d0[1]) - (v0[3] - v0[1])) <= 8 && Math.abs(d0[3] - v0[3]) <= 4 && areas.every((a) => a > 20) && areas[11] < areas[0] * 0.05 && areas[8] < areas[0] * 0.8
    && Array.from({ length: 12 }, (_, i) => cellBox(strips.death, i)).every((b) => b[0] > 0 && b[1] > 0 && b[2] < 255 && b[3] < 255), areas);
  const cb = cellBox(strips['codex-idle'], 0), sw = cellBox(strips.views, 2);
  check('1d the codex\'s strip is the front-left view', JSON.stringify(cb) === JSON.stringify(sw), { cb, sw });
}

/* ── 2. the look ── */
{
  const se = src('src/rendering/stormEyeSprites.js'), vs = src('src/rendering/monsterVariantSprites.js');
  const face = {};
  for (const m of se.matchAll(/^\s*(south|southwest|west|northwest|north|northeast|east|southeast):\s*\{ src: '(\w+)',\s*mirror: (true|false) \}/gm)) face[m[1]] = [m[2], m[3] === 'true'];
  const order = (/export const STORM_EYE_VIEWS = Object\.freeze\(\[([^\]]*)\]\)/.exec(se) || [])[1] || '';
  check('2a eight facings from the five views in the sheet\'s order (front, side, front-left, back, back-right): west, north-west and south-east are mirrors',
    order.replace(/[' ]/g, '') === 's,e,sw,n,ne'
    && JSON.stringify(face) === JSON.stringify({ south: ['s', false], southwest: ['sw', false], west: ['e', true], northwest: ['ne', true], north: ['n', false], northeast: ['ne', false], east: ['e', false], southeast: ['sw', true] }), { order, face });
  check('2b it is registered with its one picture a side as its walk, and its death; no attack, hit or idle strip',
    /stormEye: \{\s*load: loadStormEyeSprites,\s*unload: unloadStormEyeSprites,\s*walk:[^\n]*seFrame[^\n]*\n\s*death:[^\n]*seDeathFrame[^\n]*\n\s*\},/.test(vs)
    && /export function frameCount\(\) \{ return viewFrames\.length \? 1 : 0; \}/.test(se) && /const BUNDLE = 'stormEye';/.test(se) && /return unloadBundle\(BUNDLE\);/.test(se));
  const V = MONSTER_VARIANTS.stormEye;
  check('2c the variant: a fodder still (the worker\'s slime in every way: no speed, damage or XP of its own), floating, sparking, its death its own strip, no green splat under its drops',
    V.baseArchetype === 'fodder' && V.spd == null && V.incomingDmgScalar == null && V.xpMult == null && V.dmgMult == null && !V.useSlimeSheets
    && V.hover && V.hover.px > 0 && V.hover.bob > 0 && V.hover.bob < V.hover.px && V.hover.ms >= 800 && V.sparks === true && V.blowFx === 'storm' && V.telegraphAttack === true
    && V.deathStripOnly === true && V.deathMs >= 600 && V.noFodderRemnants === true && V.liveScalePx === 72, V);
  /* the Foundry's fodder is the eye; no other land's is */
  const foundry = MV.applyZoneVariant({ id: 'wm-thunder-1', archetype: 'fodder', type: 'fodder', arch: 'fodder', home: 'thunder', level: 3 }, 'thunder');
  const wilds = MV.applyZoneVariant({ id: 'wm-verdant-1', archetype: 'fodder', type: 'fodder', arch: 'fodder', home: 'verdant', level: 3 }, 'verdant');
  const brute = MV.applyZoneVariant({ id: 'x', archetype: 'brute', type: 'brute', arch: 'brute', home: 'thunder', level: 3 }, 'thunder');
  check('2d the Electric Foundry\'s fodder is drawn as the storm eye (its level untouched), and nothing else is: another land\'s slime, a Foundry brute',
    ZONE_VARIANT_MAP.thunder.fodder === 'stormEye' && Object.keys(ZONE_VARIANT_MAP.thunder).length === 1 && foundry.archetype === 'stormEye' && foundry.level === 3
    && wilds.archetype === 'blueSlime' && brute.archetype === 'brute'
    && Object.entries(ZONE_VARIANT_MAP).filter(([, m]) => Object.values(m).includes('stormEye')).map(([z]) => z).join() === 'thunder');
  check('2e it still behaves as a fodder: it throws (isFodderLike), and its hits sound wet', MV.isFodderLike('stormEye') && MV.baseArchetypeOf('stormEye') === 'fodder' && MV.hitSoundOf('stormEye') === 'wet' && MV.hitMaterialOf('stormEye').kind === 'goo');
  /* it floats */
  const H = MS.hoverLift, hv = V.hover, m = { spawnX: 100, spawnY: 40 };
  const lifts = [];
  for (let t = 0; t < hv.ms * 2; t += 25) lifts.push(H(hv, 1e12 + t, m));
  check('2f it floats: lifted off the ground always, bobbing about its height by `bob` either way every `ms`, each eye from its own start; nothing without `hover`',
    lifts.every((l) => l > 0) && Math.abs(Math.max(...lifts) - (hv.px + hv.bob)) < 0.05 && Math.abs(Math.min(...lifts) - (hv.px - hv.bob)) < 0.05
    && Math.abs(H(hv, 1e12, m) - H(hv, 1e12 + hv.ms, m)) < 1e-6 && H(hv, 1e12, m) !== H(hv, 1e12, { spawnX: 101, spawnY: 40 }) && H(null, 5, m) === 0 && H(undefined, 5, null) === 0);
}

/* ── 3. its electricity, in code ── */
{
  const SD = await import('../../src/data/stormSparks.js');
  const SS = await import('../../src/game/stormSparks.js');
  const SH = await import('../../src/rendering/stormSparkShapes.js');
  const { STORM_LOOKS, STORM_SHAPES, STORM_FX, STORM_WAYS } = SD;
  const n = (k) => SD.stormPieceCount(STORM_LOOKS[k]);
  check('3a three looks -- the arcs over it, the zap, the arcs round its shot; every kind of piece is cells of the one picture, every cell has its pixels; a full screen of them fits the pool',
    Object.keys(STORM_LOOKS).join() === 'aura,zap,ball' && Object.values(STORM_LOOKS).every((l) => l.pieces.every((p) => !!STORM_WAYS[p[0]] && p[1] > 0))
    && Object.values(STORM_WAYS).every((cells) => cells.every((c) => STORM_SHAPES.indexOf(c) >= 0)) && STORM_WAYS.bolt.length === 3 && STORM_WAYS.arc.length === 3
    && STORM_SHAPES.every((c) => Array.isArray(SH.STORM_PIXELS[c])) && Object.keys(SH.STORM_PIXELS).length === STORM_SHAPES.length
    && n('aura') * STORM_FX.MAX_EYES + n('zap') * STORM_FX.MAX_ZAPS + n('ball') * STORM_FX.MAX_SHOTS <= STORM_FX.POOL,
    { aura: n('aura'), zap: n('zap'), ball: n('ball'), pool: STORM_FX.POOL });
  /* HARD PIXELS (the owner: "avoid marking cartoonish shapes ... pixelation
     similar to how you made the flame effects") */
  const letters = new Set(Object.keys(SH.STORM_RAMP));
  const maps = STORM_SHAPES.map((c) => [c, SH.STORM_PIXELS[c]]);
  check('3b every cell is hard pixels: a small map (17 px at most), every row the same length, every letter a step of the ramp or a gap; a bolt a white core in its pale body in its dark edge',
    maps.every(([, rows]) => rows.length <= 17 && rows[0].length <= 17 && rows.every((r) => r.length === rows[0].length && [...r].every((ch) => ch === '.' || letters.has(ch))))
    && Object.values(SH.STORM_RAMP).every((ink) => ink[1] === 255) && ['bv', 'bh', 'bd', 'av', 'ah', 'ad'].every((c) => ['O', 'B', 'W'].every((ch) => SH.STORM_PIXELS[c].join('').includes(ch))),
    maps.map(([c, rows]) => [c, rows[0].length, rows.length]));
  /* baked three ways: upright is taller than wide, lying is that turned on
     its side, the slant is square; the rest are flips */
  const dim = (c) => [SH.STORM_PIXELS[c][0].length, SH.STORM_PIXELS[c].length];
  const W8 = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => SD.boltWay(k * Math.PI / 4));
  check('3b2 a bolt is baked three ways -- upright, lying (the upright one on its side), on the slant -- and lies along its own way out by one of them, flipped for the other slant',
    dim('bv')[1] > dim('bv')[0] && dim('bh')[0] === dim('bv')[1] && dim('bh')[1] === dim('bv')[0] && dim('bd')[0] === dim('bd')[1]
    && W8.map((w) => w.way).join() === '1,2,0,2,1,2,0,2' && W8[1].flip === 1 && W8[5].flip === 1 && W8[3].flip === -1 && W8[7].flip === -1, W8);
  /* the arcs over an eye */
  const G = { R: 30, H: 48, k: 1 };
  const T0 = 1e12;
  const slots = 400;
  let lit = 0, total = 0, moved = 0, held = 0, onBody = true, whole = true;
  let prev = null;
  for (let s = 0; s < slots; s++) {
    const a = SS.cracklePieceList('aura', G, T0 + s * STORM_FX.SLOT_MS + 5, 99);
    const b = SS.cracklePieceList('aura', G, T0 + s * STORM_FX.SLOT_MS + 100, 99);
    if (a.length !== n('aura')) whole = false;
    for (let i = 0; i < a.length; i++) {
      total++;
      if (a[i].a > 0) lit++;
      /* within a slot a piece holds its place; in the next it is elsewhere */
      if (a[i].dx === b[i].dx && a[i].dy === b[i].dy && (a[i].a > 0) === (b[i].a > 0)) held++;
      if (prev && (prev[i].dx !== a[i].dx || prev[i].dy !== a[i].dy)) moved++;
      if (a[i].a > 0 && Math.hypot(a[i].dx, a[i].dy + G.H) > G.R * 1.5) onBody = false;
    }
    prev = a;
  }
  const share = lit / total;
  check(`3c the arcs over it crackle: always its whole count of pieces, lit ${Math.round(share * 100)}% of the time (the table says ${Math.round(STORM_LOOKS.aura.duty * 100)}), never a steady glow`,
    whole && Math.abs(share - STORM_LOOKS.aura.duty) < 0.08 && share < 0.6, { share });
  /* (the two samples of a slot straddle a slot's edge for an eye whose slots
     start late: nearly all hold) */
  check('3d ...each holds where it jumped for a slot and is somewhere else the next, on its body', held / total > 0.85 && moved / (total - n('aura')) > 0.98 && onBody, { held: held / total, moved: moved / (total - n('aura')) });
  check('3e ...the same every time for one eye, and never the same on two (no randomness; a crowd does not flash as one)',
    JSON.stringify(SS.cracklePieceList('aura', G, T0 + 333, 99)) === JSON.stringify(SS.cracklePieceList('aura', G, T0 + 333, 99))
    && JSON.stringify(SS.cracklePieceList('aura', G, T0 + 333, 99)) !== JSON.stringify(SS.cracklePieceList('aura', G, T0 + 333, 100)));
  /* round its shot: small, on the ball */
  const ball = [];
  for (let s = 0; s < 60; s++) ball.push(...SS.cracklePieceList('ball', { R: 13, H: 20, k: 1 }, T0 + s * 110 + 7, 5).filter((p) => p.a > 0));
  check('3f the arcs round its shot ride the ball (within 22 px of it, at its height)', ball.length > 30 && ball.every((p) => Math.hypot(p.dx, p.dy + 20) < 22) && n('ball') <= n('aura'));
  /* the zap */
  const Z = { R: 30, H: 48, k: 1, reach: 62 };
  const zs = [];
  for (let a = 0; a < STORM_LOOKS.zap.ms; a += 20) zs.push(a);
  const isBolt = (p) => /^b/.test(p.shape);
  const far = (a) => Math.max(...SS.zapPieceList(Z, a, 7).filter(isBolt).map((p) => Math.hypot(p.dx, p.dy + Z.H)));
  check('3g a zap is its whole count from the blow to its end, and nothing after (or before)',
    zs.every((a) => SS.zapPieceList(Z, a, 7).length === n('zap')) && SS.zapPieceList(Z, STORM_LOOKS.zap.ms, 7).length === 0 && SS.zapPieceList(Z, -1, 7).length === 0 && SS.zapOver(320) && !SS.zapOver(319));
  check('3h ...its lightning jumps out from its body to its reach in the first third and never past it, each bolt lying along its own way out, all the way round',
    far(0) < 28 && far(140) > 44 && zs.every((a) => far(a) <= 62 + 1e-6)
    && SS.zapPieceList(Z, 150, 7).filter(isBolt).every((p) => { const w = SD.boltWay(Math.atan2((p.dy + Z.H) / 0.92, p.dx)); return p.shape === STORM_WAYS.bolt[w.way] && p.fx === w.flip; })
    && [[1, 1], [1, -1], [-1, 1], [-1, -1]].every(([sx, sy]) => SS.zapPieceList(Z, 150, 7).some((p) => p.dx * sx > 0 && (p.dy + Z.H) * sy > 0)), { r0: far(0), r140: far(140) });
  check('3i ...flickering (a bolt is not one brightness throughout) and fading out by its end',
    new Set(zs.slice(0, 10).map((a) => SS.zapPieceList(Z, a, 7)[0].a)).size === 2 && Math.max(...SS.zapPieceList(Z, 315, 7).map((p) => p.a)) === 0);
  const all = [];
  for (const a of zs) all.push(...SS.zapPieceList(Z, a, 7));
  for (let sl = 0; sl < 80; sl++) all.push(...SS.cracklePieceList('aura', G, T0 + sl * 37, 99));
  check('3j a piece is never turned or scaled: it is on (whole), half on, or off, and flipped or not',
    all.length > 300 && all.every((p) => p.r === undefined && p.s === undefined && STORM_SHAPES.indexOf(p.shape) >= 0 && [0, 0.5, 1].indexOf(p.a) >= 0 && Math.abs(p.fx) === 1 && Math.abs(p.fy) === 1));
}

/* ── 4. the wiring, what players read, its shot ── */
{
  const er = src('src/rendering/systems/entityRenderer.js'), fx = src('src/rendering/systems/effectsRenderer.js'), sfx = src('src/rendering/stormSparksFx.js');
  const pre = src('src/rendering/preloadAnimations.js'), gd = src('src/data/gameDisplay.js'), cx = src('src/data/monsterCodex.js');
  check('4a the renderer hovers it (only the sprite: never the monster\'s place), stamps it for its arcs with how high it floats, and queues its zap once as a warning ends',
    /const _hov = variant\.hover \? hoverLift\(variant\.hover, now, m\) : 0;\s*if \(spriteBody\.y !== size - _hov\) spriteBody\.y = size - _hov;\s*if \(variant\.sparks\) \{ m\._ssSeen = now; m\._ssLift = _hov \* MONSTER_SIZE_MULT; \}/.test(er)
    && /else if \(variant\.blowFx === 'storm'\) queueStormZap\(S, m, rx, ry, m\._shootAnimEnd, hoverLift\(variant\.hover, now, m\) \* MONSTER_SIZE_MULT\);/.test(er)
    && !/m\.y\s*[-+]?=\s*[^;]*_hov/.test(er));
  check('4b drawn as the wind-ups are: one pool, updated every frame, parked on a zone change, a piece never hidden or taken out one by one; its picture made on the loading screen and kept as an image; ?nostormfx leaves it out',
    /this\._stormSparks = new StormSparksFx\(this\.projectileLayer\);/.test(fx) && /this\._stormSparks\.update\(S, now\)/.test(fx) && /this\._stormSparks\.clear\(\)/.test(fx)
    && /stormSparks: Promise\.resolve\(warmStormSparks\(\)\)/.test(pre) && /keepAsImage\(base\.source, Cache\)/.test(sfx) && /has\('nostormfx'\)/.test(sfx)
    && /for \(let i = 0; i < STORM_FX\.POOL; i\+\+\)/.test(sfx) && !/removeChild|\.visible = /.test(sfx));
  /* v2.3.4389: THE POOL IS THE EYE'S -- made when its look is loaded,
     destroyed whole when the look is let go; with no eye's look loaded the
     frame does not walk the land's monsters and shots for eyes at all */
  const ses = src('src/rendering/stormEyeSprites.js');
  const ctor = sfx.slice(sfx.indexOf('constructor(layer) {'), sfx.indexOf('  _make() {'));
  check('4b1 the pool comes and goes with the eye\'s look: wanted as its strips load, not as they are let go; destroyed whole when not wanted and no zap is left; never in the constructor',
    /export function loadStormEyeSprites\(\) \{\s*wantStormSparks\(true\);/.test(ses) && /export function unloadStormEyeSprites\(\) \{\s*wantStormSparks\(false\);/.test(ses)
    && /if \(!_wanted && !\(zaps && zaps\.length\)\) \{ if \(this\.box\) \{ this\._park\(0\); this\._drop\(\); \} return; \}\s*if \(!this\.box\) this\._make\(\);/.test(sfx)
    && /box\.destroy\(\{ children: true \}\);/.test(sfx) && ctor.length > 100 && !/_make\(\)/.test(ctor)
    && sfx.indexOf('if (!_wanted && !(zaps && zaps.length))') < sfx.indexOf('const mons = S.monsters;'));
  check('4b2 its picture is written pixel by pixel and sampled nearest; a piece is placed on its own pixel grid, flipped where it says, and never turned',
    /base\.source\.scaleMode = 'nearest';/.test(sfx) && /createImageData\(W, H\)/.test(sfx) && !/\.rotation|bezierCurveTo|quadraticCurveTo|lineWidth/.test(sfx + src('src/rendering/stormSparkShapes.js'))
    && /sp\.x = Math\.round\(\(x \+ p\.dx\) \/ px\) \* px;/.test(sfx) && /sp\.scale\.set\(px \* p\.fx, px \* p\.fy\);/.test(sfx));
  check('4c only eyes drawn this frame crackle (the nearest MAX_EYES), only its own shots, and the list of zaps cannot grow',
    /m\._ssSeen !== now\) continue;/.test(sfx) && /cand\.length = STORM_FX\.MAX_EYES;/.test(sfx) && /sp\._ssStorm = !!\(v && v\.sparks\);/.test(sfx) && /if \(list\.length >= 12\) list\.shift\(\);/.test(sfx));
  const SHOTS = await import('../../src/data/monsterShots.js');
  check('4d its spit is the slime\'s glob in the pale blue of its lightning; every slime\'s is still its own colour',
    SHOTS.shotStyleOf('stormEye') === 'goo' && SHOTS.gooColorOf('stormEye') === 0x9fe3ff && SHOTS.gooColorOf('fodder') === SHOTS.SLIME_BODY_GREEN
    && SHOTS.gooColorOf('blueSlime') === 0x3a7ad0 && SHOTS.gooColorOf('mireWisp') !== SHOTS.SLIME_BODY_GREEN && SHOTS.shotPxOf('stormEye', 'goo') === 26);
  const { WHEEL_STAGE_LOOKS } = await import('../../src/data/wheelStageLooks.js');
  check('4e its name is "Storm Eye", past level 20 "Tempest Eye" in the stage\'s teal; its codex page is the eye\'s (no "Slime" of the Foundry left), a flying thing',
    /stormEye: 'Storm Eye',/.test(gd) && WHEEL_STAGE_LOOKS[2].stormEye.name === 'Tempest Eye' && WHEEL_STAGE_LOOKS[2].stormEye.tint === WHEEL_STAGE_LOOKS[2].fodder.tint
    && /name: 'Storm Eye', home: 'thunder', look: 'fodder', element: 'storm', type: 'Winged'/.test(cx) && /elder: Object\.freeze\(\{ name: 'Tempest Eye'/.test(cx) && !/name: 'Slime', home: 'thunder'/.test(cx));
  const CS = await import('../../src/data/codexStage.js');
  const L = CS.CODEX_LOOKS.stormEye, bad = [];
  for (const [k, s] of Object.entries((L && L.strips) || {})) {
    const file = s.url.replace(/\?.*$/, '').split('/').pop().replace('.png', '');
    const png = strips[file];
    if (!png) { bad.push(`${k}: no strip ${file}`); continue; }
    if (png.w / 256 !== s.n) bad.push(`${k}: ${s.n} cells, the file has ${png.w / 256}`);
    const b = cellBox(png, 0);
    if (Math.abs(b[3] - s.ground) > 3) bad.push(`${k}: ground ${s.ground}, its feet are on ${b[3]}`);
    if (k === 'idle' && (Math.abs(b[0] - L.x0) > 3 || Math.abs(b[2] - L.x1) > 3 || Math.abs((b[3] - b[1] + 1) - L.artRows) > 3)) bad.push(`idle: box ${b}, the look says x ${L.x0}-${L.x1}, ${L.artRows} rows`);
  }
  check('4f the codex stage plays the eye\'s own strips, their cells counted and their boxes measured, and it throws its lightning\'s blue',
    !!L && L.cell === 256 && !!L.strips.idle && !!L.strips.death && bad.length === 0 && CS.CODEX_STAGE.sparklet.look === 'stormEye' && CS.CODEX_STAGE.sparklet.hit === 'throw'
    && CS.CODEX_STAGE.sparklet.shotColor === '#9fe3ff', bad);
  const { PET_KINDS, PET_ART } = await import('../../src/data/trapping.js');
  const { PET_SHEET } = await import('../../src/data/petSheet.js');
  check('4g its pet is still the Sparklet (the kind and its name the worker\'s and the phone\'s, unchanged), drawn from the eye\'s row on the pet sheet',
    PET_KINDS.sparklet.name === 'Sparklet' && PET_KINDS.sparklet.look === 'fodder' && PET_ART.sparklet.base === 'stormEye' && !!PET_SHEET.bases.stormEye
    && PET_SHEET.bases.stormEye.front === 1 && PET_SHEET.bases.stormEye.side === 1 && PET_SHEET.bases.stormEye.sideFaces === 'e',
    PET_SHEET.bases.stormEye);
  const { monsterTorsoY, monsterBodyOffsetY } = await import('../../src/data/gameSystems.js');
  check('4h a shot is aimed at the middle of its ball, inside its hit circle; it dies with a crack',
    monsterTorsoY('stormEye') === 48 && Math.abs(monsterTorsoY('stormEye') - monsterBodyOffsetY('stormEye')) < 30 && /stormEye: 'dieRock'/.test(gd));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
