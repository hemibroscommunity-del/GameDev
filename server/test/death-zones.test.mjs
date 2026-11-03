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
 *      every sub-frame texture a death makes is destroyed (the texture only);
 *   6. THE EYES (the owner's "premade sections like head, eyes, arms, torso,
 *      legs"): a look whose picture shows its eyes has them as small zones
 *      of their own, holes in the zone round them, where its face shows
 *      (the snowman's north has none), mirrored with a mirrored file;
 *   7. ORDINARY OR BIG: a big blow throws more of every look than an
 *      ordinary kill (the explosion against the gentler collapse);
 *   8. THE BLOW (game/deathBlow.js): its direction from the killer toward
 *      the monster -- you, a player this phone can see, or unknown -- and
 *      its size from the server's own marks (crit, ability, burst,
 *      collision), your own swing's or shot's contact winning on direction;
 *      and the wiring that writes it down and the death that reads it.
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
const B = await import('../../src/game/deathBlow.js');
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
  const ids = (zs) => (zs || []).map((z) => z.id).join(',');
  const isView = (k, f, view) => ids(Z.deathZonesFor(k, f)) === ids(Z.DEATH_ZONES[k][view].filter((z) => !z.faces || z.faces.indexOf(f) >= 0));
  check('2d the side view only facing east or west, the front view every other way (resolved once a facing)',
    isView('snowman', 'east', 'side') && isView('snowman', 'west', 'side') && isView('snowman', 'southwest', 'front')
    && isView('snowman', 'north', 'front') && isView('fireGoblin', 'east', 'front')
    && Z.deathZoneView(Z.DEATH_ZONES.snowman, 'east') === 'side' && Z.deathZoneView(Z.DEATH_ZONES.snowman, 'north') === 'front'
    && Z.deathZonesFor('snowman', 'south') === Z.deathZonesFor('snowman', 'south'));
  const offs = new Set(), mats = new Set();
  for (const look of Object.values(Z.DEATH_ZONES)) for (const v of ['front', 'side']) for (const z of look[v] || []) { offs.add(z.off); offs.add(Z.bigOff(z)); mats.add(z.mat); }
  check('2e every way of coming off and every material is used by some look', Z.DEATH_OFFS.every((o) => offs.has(o)) && Z.DEATH_MATERIALS.every((m) => mats.has(m)), { offs: [...offs], mats: [...mats] });
  /* the deaths the owner's PR names */
  const zs = (k) => Z.deathZonesFor(k, 'south');
  const has = (k, f) => zs(k).some(f);
  check('2f the snowman\'s head pops and rolls, his coal eyes pop, his twig arms drop (fly on a big blow), his body sags in snow (bursts on a big one), his drift stays',
    has('snowman', (z) => z.part === 'head' && z.off === 'pop' && z.roll >= 0.6)
    && zs('snowman').filter((z) => z.part === 'eyes' && z.off === 'pop').length === 2
    && zs('snowman').filter((z) => z.part === 'arms' && z.off === 'crumble' && Z.bigOff(z) === 'fly' && z.mat === 'wood').length === 2
    && has('snowman', (z) => z.part === 'torso' && z.off === 'slump' && Z.bigOff(z) === 'crumble' && z.mat === 'snow') && has('snowman', (z) => z.part === 'base' && z.off === 'stays'));
  check('2g a slime splats flat and its goo slops off (flies on a big blow); a bog lurker sinks into a puddle',
    has('fodder', (z) => z.off === 'slump' && z.squash >= 0.6) && has('fodder', (z) => z.off === 'crumble' && Z.bigOff(z) === 'fly' && z.mat === 'goo')
    && has('bogLurker', (z) => z.off === 'slump' && z.sink > 0 && Z.bigOff(z) === 'slump') && Z.DEATH_ZONES.bogLurker.puddle === true);
  check('2h a fire goblin drops his torch, crumples and his flame gutters out',
    has('fireGoblin', (z) => z.part === 'prop' && z.mat === 'wood') && has('fireGoblin', (z) => z.mat === 'flame') && has('fireGoblin', (z) => z.part === 'core' && z.off === 'slump'));
  check('2i a rock monster crumbles into stones; a skeleton\'s bones scatter; a fishman flops; a thorn shambler splinters',
    zs('rockmonster').filter((z) => z.off === 'crumble' && z.mat === 'stone').length >= 4
    && zs('skeleton').filter((z) => z.mat === 'bone' && z.off !== 'stays').length >= 6
    && has('fishman', (z) => z.off === 'hinge' && z.flop >= 2)
    && zs('thornShambler').filter((z) => z.mat === 'wood' && Z.bigOff(z) === 'fly').length >= 3);
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
    /export function rollDeathKind\(m, blob, noStrip, own, bigOwn\)/.test(fx) && /forced === 'own'/.test(fx) && /bigOwn \|\| \(\(h >>> 16\) & 1\)/.test(fx)
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

/* ── 6. the eyes ── */
{
  const eyes = (k, f) => (Z.deathZonesFor(k, f) || []).filter((z) => z.part === 'eyes');
  check('6a the eyes are where the picture shows them: the snowman two facing you and one side on, none from behind; the goblin and the mummy two facing you; the fishman, the bog lurker one, the rock monster and the thorn shambler two, every way; the slime and the skeleton none',
    eyes('snowman', 'south').length === 2 && eyes('snowman', 'southwest').length === 2 && eyes('snowman', 'north').length === 0
    && eyes('snowman', 'east').length === 1 && eyes('snowman', 'west').length === 1
    && eyes('fireGoblin', 'south').length === 2 && eyes('fireGoblin', 'east').length === 0
    && eyes('mummy', 'south').length === 2 && eyes('mummy', 'north').length === 0
    && ['south', 'north', 'east', 'west'].every((f) => eyes('fishman', f).length === 1 && eyes('bogLurker', f).length === 1
      && eyes('rockmonster', f).length === 2 && eyes('thornShambler', f).length === 2)
    && eyes('fodder', 'south').length === 0 && eyes('skeleton', 'south').length === 0);
  const bad = [];
  for (const k of Object.keys(Z.DEATH_ZONES)) for (const f of Z.DEATH_FACINGS) for (const z of eyes(k, f)) {
    const b = Z.zoneBox(z), area = (b[2] - b[0]) * (b[3] - b[1]);
    const host = Z.deathZonesFor(k, f).filter((h) => (h.cut || []).indexOf(z.id) >= 0);
    if (!(b[0] >= 0 && b[1] >= 0 && b[2] <= 1 && b[3] <= 1)) bad.push(`${k}@${f}.${z.id}: outside the box`);
    if (!(area > 0 && area < 0.03)) bad.push(`${k}@${f}.${z.id}: area ${area.toFixed(3)} (an eye is small)`);
    if (z.off !== 'pop' || !(z.bounce >= 0.4) || !(z.mass <= 0.3)) bad.push(`${k}@${f}.${z.id}: pops and bounces, light`);
    if (host.length !== 1) bad.push(`${k}@${f}.${z.id}: a hole in ${host.length} zones (one)`);
  }
  check('6b every eye is a small light zone inside the box that pops out and bounces, a hole in exactly one zone round it', bad.length === 0, bad);
  const s = Z.deathZonesFor('snowman', 'south'), n = Z.deathZonesFor('snowman', 'north');
  const head = (zs) => zs.find((z) => z.id === 'head');
  check('6c where the eyes are not seen, the head takes their pixels back (no hole, no gap)',
    head(s).cut && head(s).cut.length === 2 && !head(n).cut && Z.zoneHas(head(n), 0.43, 0.23) && !Z.zoneHas(head(s), 0.43, 0.23) && Z.zoneHas(s.find((z) => z.id === 'eyeL'), 0.43, 0.23));
  const fs = eyes('fishman', 'south')[0], fw = eyes('fishman', 'west')[0];
  check('6d a facing drawn from a mirrored file (the fishman\'s walk-west) mirrors its zones: the eye moves to the other side',
    Math.abs(fw.rect[0] - (1 - fs.rect[2])) < 1e-9 && Math.abs(fw.rect[2] - (1 - fs.rect[0])) < 1e-9 && fw.rect[1] === fs.rect[1]);
}

/* ── 7. ordinary or big ── */
{
  const less = [];
  for (const k of Object.keys(Z.DEATH_ZONES)) for (const f of Z.DEATH_FACINGS) {
    const zs = Z.deathZonesFor(k, f), calm = Z.thrownCount(zs, false), big = Z.thrownCount(zs, true);
    /* the fishman and the bog lurker are one body and an eye: the big blow
       throws the body over harder (and splashes), it throws no more pieces */
    const one = k === 'fishman' || k === 'bogLurker';
    if (one ? big < calm : big <= calm) less.push(`${k}@${f}: ${calm} -> ${big}`);
  }
  check('7a a big blow throws more pieces than an ordinary kill, every look and facing (the one-body looks no fewer)', less.length === 0, less);
  const z = (o, mass, extra) => Object.assign({ id: 'q', part: 'core', rect: [0, 0, 1, 1], mat: 'goo', off: o, mass, bounce: 0, roll: 0 }, extra || null);
  check('7b by default, on a big blow: what crumbles is thrown, a light sagging piece is thrown and a heavy one topples, the rest as it was; a zone\'s own `big` wins',
    Z.bigOff(z('crumble', 1)) === 'fly' && Z.bigOff(z('slump', 0.5)) === 'fly' && Z.bigOff(z('slump', 2)) === 'hinge'
    && Z.bigOff(z('pop', 1)) === 'pop' && Z.bigOff(z('stays', 4)) === 'stays' && Z.bigOff(z('hinge', 2)) === 'hinge'
    && Z.bigOff(z('slump', 2, { big: 'slump' })) === 'slump' && Z.zoneOff(z('crumble', 1), false) === 'crumble');
  const snS = Z.deathZonesFor('snowman', 'south');
  check('7c (the snowman: an ordinary kill pops his hat, head and eyes; a big blow throws his arms too)',
    Z.thrownCount(snS, false) === 4 && Z.thrownCount(snS, true) === 6, [Z.thrownCount(snS, false), Z.thrownCount(snS, true)]);
}

/* ── 8. the blow ── */
{
  const S = { myId: 'me', player: { x: 100, y: 200 }, others: { pal: { x: 300, y: 200 } } };
  const mon = () => ({ id: 'm1', x: 200, y: 200 });
  const a = mon(); B.noteHitBlow(S, { attackerId: 'me', monsterId: 'm1', hpPct: 0 }, a);
  const da = B.deathBlowOf(a);
  check('8a your own kill: the pieces go from you toward it (you on its left: +x), ordinary', da.known && Math.abs(da.dx - 1) < 1e-9 && Math.abs(da.dy) < 1e-9 && !da.big, da);
  const b = mon(); B.noteHitBlow(S, { attackerId: 'pal', isCrit: true }, b);
  const db = B.deathBlowOf(b);
  check('8b another player\'s crit: from where this phone sees them (on its right: -x), big', db.known && Math.abs(db.dx + 1) < 1e-9 && db.big, db);
  const c = mon(); B.noteHitBlow(S, { attackerId: 'stranger', burst: true }, c);
  const dc = B.deathBlowOf(c);
  check('8c a player this phone cannot see: no direction (the seeded one plays), still big for an Element Burst', !dc.known && dc.dx === 0 && dc.big, dc);
  check('8d the server\'s big marks: a crit, an ability, a burst, a collision -- not a plain hit, a status tick or thorns',
    B.isBigHit({ isCrit: true }) && B.isBigHit({ ability: 'bash' }) && B.isBigHit({ burst: true }) && B.isBigHit({ collision: 'steam' })
    && !B.isBigHit({ isCrit: false }) && !B.isBigHit({ status: 'burn' }) && !B.isBigHit({ thorns: true }));
  const d = mon(); const t0 = Date.now();
  B.noteBlow(d, { ang: Math.PI / 2, big: true, by: 'me', mine: true, aim: true, t: t0 });
  B.noteHitBlow(S, { attackerId: 'me' }, d);
  const dd = B.deathBlowOf(d);
  check('8e your swing\'s or shot\'s contact, then the server\'s word on it: the contact\'s direction (the shot went down the screen) and its special\'s size are kept', dd.known && Math.abs(dd.dy - 1) < 1e-9 && Math.abs(dd.dx) < 1e-6 && dd.big, dd);
  const e = mon(); B.noteBlow(e, { dx: 1, dy: 0, big: true, by: 'me', t: Date.now() - B.BLOW_FRESH_MS - 10 });
  check('8f a blow older than BLOW_FRESH_MS is no blow (the death\'s own seeded way)', !B.deathBlowOf(e).known && !B.deathBlowOf(e).big);
  const f = mon(); B.noteHitBlow(S, { attackerId: 'pal', isCrit: true }, f); B.noteHitBlow(S, { attackerId: 'me' }, f);
  const df = B.deathBlowOf(f);
  check('8g the last hit is the killing one: another attacker\'s crit before it does not make yours big', df.known && df.dx > 0.99 && !df.big, df);
  const ge = src('src/networking/gameEvents.js'), ch = src('src/game/combatHelpers.js'), mc = src('src/game/monsterCombat.js'), pr = src('src/game/projectiles.js');
  const fx = src('src/rendering/monsterDeathFx.js'), zf = src('src/rendering/monsterDeathZonesFx.js');
  check('8h written down: every monster_hit (gameEvents), your own swing and shot at contact (spawnHitDebris `mine`)',
    /noteHitBlow\(S, payload, hitM\)/.test(ge) && /if \(o\.mine\) noteBlow\(m, \{ ang: angle/.test(ch)
    && /spawnHitDebris\(S, m, baseAngle, \{\s*mine: true/.test(mc) && /spawnHitDebris\(S, m, a\.ang, \{\s*mine: true/.test(pr));
  check('8i read by the death: its direction pushes every thrown piece (light the farther) across and along the ground, a heavy one topples that way; big rolls the explosion; ?deathbig and __btDeathBig force it',
    /const blow = deathBlowOf\(m, Date\.now\(\)\)/.test(fx) && /get\('deathbig'\)/.test(fx) && /window\.__btDeathBig/.test(fx)
    && /pc\.vx \+= bx \* H \* \(big \? PUSH_X\.big : PUSH_X\.calm\) \* reach/.test(zf) && /pc\.vz = bz \* H/.test(zf)
    && /K\.setHinge\(pc, bSide \|\| z\.dir \|\| leanSide/.test(zf) && /let off = zoneOff\(z, big\)/.test(zf)
    && /Math\.min\(REACH_MAX, 1 \/ mk\)/.test(zf));
  check('8j the push draws no number of its own from the seeded roll (a phone that does not know who struck plays the same death, only without the push)',
    !/if \(blow\) \{[^}]*rand\(\)/.test(zf));
  check('8k a hole is cut in a Graphics mask, never a Sprite one', /mg\.cut\(\)/.test(zf) && !/\.mask = new Sprite/.test(zf));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
