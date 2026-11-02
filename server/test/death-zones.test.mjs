/* ═══ v2.3.3954: MONSTERS DIE IN PIECES THAT FIT THEM (src/data/monsterDeathZones.js) ═══
 *
 * The owner: "Make actual monster death animations", and "Death animation
 * idea label zones for each monster that can apply physics and effects for."
 * Each look's parts are labelled in the zone table and played by
 * src/rendering/monsterDeathZonesFx.js (docs/specs/monster-death-zones.md).
 *
 *   1. the table: every zone a known part, material and way of coming off,
 *      its numbers in range, at most 8 a view, and the zones of each view
 *      TILING the body box (every sampled point in exactly one zone: the
 *      pieces are the whole picture, drawn once);
 *   2. every look the game draws from sprite sheets has its own death: each
 *      monster variant, the snowman and the slime (the looks drawn on the
 *      slime's sheets are cut as it is); a side view east and west only;
 *   3. the cut deaths cut where the zones say (the snowman's neck under his
 *      head, not at the guessed 0.28; a skeleton's hip over its legs), and a
 *      blob keeps its own;
 *   4. THE ZONES FIT THE ART: each look's frames read from the PNGs under
 *      public/, cut to their body box (alpha > 60, as the game's coverage()
 *      measures it), and every zone that moves holds the monster's own
 *      pixels -- a zone labelled on thin air would throw nothing;
 *   5. the wiring, read from the source: the cuts' roll knows `own`, the
 *      off switch and the watch switch are there, the caps are read, and
 *      every sub-frame texture a death makes is destroyed (the texture only).
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const Z = await import('../../src/data/monsterDeathZones.js');
const { MONSTER_VARIANTS } = await import('../../src/data/monsterVariants.js');

/* ── 1. the table ── */
{
  const probs = Z.checkDeathZones(96);
  check('1a every zone a known part / material / way off, its numbers in range, <= 8 a view, each view tiling its box', probs.length === 0, probs.slice(0, 12));
  check('1b the caps are the PR\'s: 8 pieces a death, 8 deaths at once, a ~120 ms beat', Z.MAX_PIECES === 8 && Z.MAX_LIVE === 8 && Z.BEAT_MS >= 80 && Z.BEAT_MS <= 160);
  /* the checker itself catches a gap and an overlap */
  const gap = { front: [{ id: 'a', part: 'core', rect: [0, 0, 1, 0.5], mat: 'goo', off: 'stays', mass: 1, bounce: 0, roll: 0 }] };
  const lap = { front: [{ id: 'a', part: 'core', rect: [0, 0, 1, 0.6], mat: 'goo', off: 'stays', mass: 1, bounce: 0, roll: 0 },
    { id: 'b', part: 'core', rect: [0, 0.4, 1, 1], mat: 'goo', off: 'stays', mass: 1, bounce: 0, roll: 0 }] };
  Z.DEATH_ZONES.__qaGap = gap; Z.DEATH_ZONES.__qaLap = lap;
  const p2 = Z.checkDeathZones(32);
  delete Z.DEATH_ZONES.__qaGap; delete Z.DEATH_ZONES.__qaLap;
  check('1c (the check catches a view that leaves a gap, and one whose zones overlap)',
    p2.some((p) => /__qaGap.*no zone/.test(p)) && p2.some((p) => /__qaLap.*more than one/.test(p)), p2);
}

/* ── 2. every drawn look has its own death ── */
{
  const looks = [...Object.keys(MONSTER_VARIANTS), 'snowman', 'fodder'];
  const none = looks.filter((k) => !Z.deathZoneLook(k));
  check('2a every monster variant, the snowman and the slime have zones', none.length === 0, none);
  check('2b the looks on the slime\'s sheets are cut as the slime (a blob)',
    ['fodder', 'mossSlime', 'blueSlime', 'mireWisp'].every((k) => Z.deathZoneLook(k) === Z.DEATH_ZONES.slime) && Z.DEATH_ZONES.slime.blob === true);
  check('2c a look without zones dies today\'s way (null)', Z.deathZoneLook('brute') === null && Z.deathZoneLook('__proto__') === null && Z.deathZoneLook(null) === null);
  check('2d the side view only facing east or west, the front view every other way',
    Z.deathZonesFor('snowman', 'east') === Z.DEATH_ZONES.snowman.side && Z.deathZonesFor('snowman', 'west') === Z.DEATH_ZONES.snowman.side
    && Z.deathZonesFor('snowman', 'southwest') === Z.DEATH_ZONES.snowman.front && Z.deathZonesFor('snowman', 'north') === Z.DEATH_ZONES.snowman.front
    && Z.deathZonesFor('fireGoblin', 'east') === Z.DEATH_ZONES.fireGoblin.front);
  const offs = new Set(), mats = new Set();
  for (const look of Object.values(Z.DEATH_ZONES)) for (const v of ['front', 'side']) for (const z of look[v] || []) { offs.add(z.off); mats.add(z.mat); }
  check('2e every way of coming off and every material is used by some look', Z.DEATH_OFFS.every((o) => offs.has(o)) && Z.DEATH_MATERIALS.every((m) => mats.has(m)), { offs: [...offs], mats: [...mats] });
  /* the deaths the owner's PR names */
  const zs = (k) => Z.deathZonesFor(k, 'south');
  const has = (k, f) => zs(k).some(f);
  check('2f the snowman\'s head pops and rolls, his twig arms fly, his body crumbles in snow, his drift stays',
    has('snowman', (z) => z.part === 'head' && z.off === 'pop' && z.roll >= 0.6) && zs('snowman').filter((z) => z.part === 'arms' && z.off === 'fly' && z.mat === 'wood').length === 2
    && has('snowman', (z) => z.part === 'torso' && z.off === 'crumble' && z.mat === 'snow') && has('snowman', (z) => z.part === 'base' && z.off === 'stays'));
  check('2g a slime splats flat and its goo flies; a bog lurker sinks into a puddle',
    has('fodder', (z) => z.off === 'slump' && z.squash >= 0.6) && has('fodder', (z) => z.off === 'fly' && z.mat === 'goo')
    && has('bogLurker', (z) => z.off === 'slump' && z.sink > 0) && Z.DEATH_ZONES.bogLurker.puddle === true);
  check('2h a fire goblin drops his torch, crumples and his flame gutters out',
    has('fireGoblin', (z) => z.part === 'prop' && z.mat === 'wood') && has('fireGoblin', (z) => z.mat === 'flame') && has('fireGoblin', (z) => z.part === 'core' && z.off === 'slump'));
  check('2i a rock monster crumbles into stones; a skeleton\'s bones scatter; a fishman flops; a thorn shambler splinters',
    zs('rockmonster').filter((z) => z.off === 'crumble' && z.mat === 'stone').length >= 4
    && zs('skeleton').filter((z) => z.mat === 'bone' && z.off !== 'stays').length >= 6
    && has('fishman', (z) => z.off === 'hinge' && z.flop >= 2)
    && zs('thornShambler').filter((z) => z.mat === 'wood' && z.off === 'fly').length >= 3);
}

/* ── 3. the cuts cut where the zones say ── */
{
  const sn = Z.deathCutLines('snowman', 'south'), sk = Z.deathCutLines('skeleton', 'south'), sl = Z.deathCutLines('fodder', 'south');
  check('3a the snowman\'s neck is under his head (0.40 of his height), not the guessed 0.28', Math.abs(sn.neck - 0.4) < 1e-9, sn);
  check('3b a skeleton\'s neck under its skull and its hip over its legs', Math.abs(sk.neck - 0.17) < 1e-9 && Math.abs(sk.hip - 0.58) < 1e-9, sk);
  check('3c a blob keeps its own neck; a look without zones none', sl.neck === null && Z.deathCutLines('brute', 'south').neck === null);
}

/* ── 4. the zones fit the art ── */
/* A PNG's alpha, decoded here (8-bit RGBA or paletted, not interlaced: what
   the monster sheets are). */
function readPng(rel) {
  const buf = readFileSync(new URL(rel, root));
  let o = 8, w = 0, h = 0, ct = 0, bd = 0, trns = null;
  const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; if (d[12]) throw new Error('interlaced'); }
    else if (type === 'tRNS') trns = d;
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    o += 12 + len;
  }
  if (bd !== 8 || (ct !== 6 && ct !== 3)) throw new Error(`${rel}: bit depth ${bd}, colour type ${ct}`);
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : 1, stride = w * bpp, px = Buffer.alloc(stride * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let v = raw[p++];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      px[y * stride + x] = v & 255;
    }
  }
  const alpha = ct === 6 ? (x, y) => px[(y * w + x) * 4 + 3] : (x, y) => { const i = px[y * w + x]; return trns && i < trns.length ? trns[i] : 255; };
  return { w, h, alpha };
}
{
  /* [look, facing, sheet, frame width, frame index] -- the frames the zones
     were labelled from (the spec, "How the zones were measured") */
  const FRAMES = [
    ['fodder', 'south', 'public/sprites/monsters/slime-idle-v5.png', 128, 0],
    ['snowman', 'south', 'public/sprites/monsters/snowman/snowman-s.png', 128, 0],
    ['snowman', 'north', 'public/sprites/monsters/snowman/snowman-n.png', 128, 0],
    ['snowman', 'east', 'public/sprites/monsters/snowman/snowman-e.png', 128, 0],
    ['fireGoblin', 'south', 'public/sprites/monsters/fire-goblin/walk-s.png', 256, 0],
    ['fireGoblin', 'east', 'public/sprites/monsters/fire-goblin/walk-e.png', 256, 0],
    ['fireGoblin', 'north', 'public/sprites/monsters/fire-goblin/walk-n.png', 256, 0],
    ['skeleton', 'south', 'public/sprites/monsters/skeleton/run-s.png', 256, 0],
    ['skeleton', 'west', 'public/sprites/monsters/skeleton/run-w.png', 256, 0],
    ['mummy', 'south', 'public/sprites/monsters/mummy/walk-s.png', 256, 0],
    ['fishman', 'south', 'public/sprites/monsters/fishman/walk-south.png', 256, 0],
    ['bogLurker', 'south', 'public/sprites/monsters/fishman/walk-south.png', 256, 0],
    ['rockmonster', 'south', 'public/sprites/monsters/rockmonster/walk-south.png', 256, 0],
    ['thornShambler', 'south', 'public/sprites/monsters/rockmonster/walk-south.png', 256, 0],
  ];
  const thin = [], read = [];
  for (const [look, facing, sheet, fw, fi] of FRAMES) {
    let png;
    try { png = readPng(sheet); } catch (e) { read.push(`${sheet}: ${e.message}`); continue; }
    const fh = png.h, ox = fi * fw;
    let x0 = fw, y0 = fh, x1 = -1, y1 = -1;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      if (png.alpha(ox + x, y) > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const bw = x1 + 1 - x0, bh = y1 + 1 - y0;
    for (const z of Z.deathZonesFor(look, facing)) {
      if (z.off === 'stays') continue;
      let n = 0, area = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!Z.zoneHas(z, (x + 0.5 - x0) / bw, (y + 0.5 - y0) / bh)) continue;
        area++;
        if (png.alpha(ox + x, y) > 60) n++;
      }
      /* at least 1/25 of the zone is the monster (a skeleton's limbs are
         thin bones across open air: its sparsest, an arm run sideways, is
         1/20) -- a zone labelled on air holds none */
      if (!(area > 0 && n / area >= 0.04)) thin.push(`${look}/${facing}/${z.id}: ${n} of ${area}`);
      if (process.env.DZ_RATIOS) console.log(`  ${look}/${facing}/${z.id}: ${(n / area).toFixed(3)}`);
    }
  }
  check('4a every sheet the zones were labelled from reads', read.length === 0, read);
  check('4b every zone that moves holds the monster\'s own pixels (1/25 of it at least) on the frames it was labelled from', thin.length === 0, thin);
}

/* ── 5. the wiring ── */
{
  const fx = src('src/rendering/monsterDeathFx.js'), zf = src('src/rendering/monsterDeathZonesFx.js');
  check('5a the roll knows `own` (half the kills of a look with zones), and its forced and watched kinds',
    /export function rollDeathKind\(m, blob, noStrip, own\)/.test(fx) && /forced === 'own'/.test(fx) && /\(h >>> 16\) & 1/.test(fx)
    && /get\('deathkind'\)/.test(fx));
  check('5b ?deathzones=0 turns the zone deaths off (they land ON by default)', /deathzones=0/.test(zf) && /export function deathZonesOn\(\) \{ return !_off; \}/.test(zf));
  check('5c past the cap, today\'s death: the live count is read before a zone death is built, and again inside it',
    /zoneDeathsLive\(now, KIT\) < MAX_LIVE/.test(fx) && /_live\.size >= MAX_LIVE\) return null/.test(zf) && /slice\(0, MAX_PIECES\)/.test(zf));
  check('5d everything a death makes goes when it ends: its root with its children, then each sub-frame texture (never its source)',
    /st\.root\.destroy\(\{ children: true \}\)/.test(zf) && /t\.destroy\(false\)/.test(zf) && !/destroy\(true\)/.test(zf)
    && /if \(st\.dispose\) st\.dispose\(\);/.test(fx) && /if \(st && st\.dispose\) \{ st\.dispose\(\); return; \}/.test(fx));
  check('5e a rectangle zone is a sub-frame of the same picture (no mask); a polygon a Graphics mask, never a Sprite one',
    /new Texture\(\{ source: tex\.source, frame: new Rectangle/.test(zf) && /const mg = new Graphics\(\);/.test(zf) && !/\.mask = new Sprite/.test(zf));
  check('5f nothing reads a picture\'s pixels on the CPU (no source.resource, no getImageData)', !/source\.resource|getImageData|readSourceRect/.test(zf));
  check('5g the pieces wear the monster\'s own colour, never the hit flash (_btBaseTint)', /sb\._btBaseTint != null \? sb\._btBaseTint : sb\.tint/.test(zf));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
