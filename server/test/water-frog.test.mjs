/* ═══ v2.3.4355: THE WATER FROG, THE WATER CAVES' MONSTER ═══
 *
 * The owner, 2026-11-09: "I added new monster (water frog) on GitHub. It
 * included videos of 5 directions: idle, attack, movement, and death
 * animation (only South). Can you cut it into the right amount of frames to
 * make it look smooth and wire it into the game? I want to replace the fish
 * man monster."  docs/specs/water-frog.md.
 *
 *   1. THE STRIPS (public/sprites/monsters/water-frog/, cut by
 *      tools/art/cut_water_frog.py): all fifteen there, palette PNGs on at
 *      most 256 colours (the memory law), rows of 256 px cells, the frames
 *      the loader and the renderer count on; every cell drawn in; the frog
 *      the same size from every side, its feet on the same row;
 *   2. THE PLAYING OF THEM (src/game/monsterStrips.js): an attack's wind-up
 *      spread over the warning with the blow on its last frame and the
 *      recovery after it; a strip with no recovery exactly as before; a
 *      stopped hop played out to its landing and no further; the breath;
 *   3. THE WIRING: the Water Caves' variant key draws the frog and the bog
 *      lurker the old fishman pictures; eight facings from five drawn sides;
 *      the death its own strip on every kill, at the living frog's size with
 *      its feet where they were (the numbers follow from the pictures); its
 *      specials' warnings play its attack;
 *   4. WHAT PLAYERS READ AND WHERE A SHOT GOES: "Water Frog", "Coral Frog",
 *      "Froglet"; the codex page drawn from the frog's strips, their cells
 *      counted and their ground rows measured; the pet's row on the pet
 *      sheet; a shot aimed at the middle of its body.
 *
 *   5. ITS WATER, DRAWN IN CODE (the owner: "I intend for you to draw the
 *      water attacks in code actually. Don't use the water in the drawings"):
 *      no strip shows water leaving the frog (1i, 1j); the spray and the ring
 *      (data/waterAttack.js, game/waterAttack.js): their pieces, where they
 *      go, that they end; the wiring.
 *
 * In the world: tools/qa/mp/mp-waterfrog.mjs.
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
const { MONSTER_VARIANTS } = await import('../../src/data/monsterVariants.js');
const MS = await import('../../src/game/monsterStrips.js');
const DIR = 'public/sprites/monsters/water-frog/';

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
/* the art's box in cell `i` of a strip: [x0, y0, x1, y1] (alpha > 60), or null */
function cellBox(png, i) {
  let x0 = 256, y0 = 256, x1 = -1, y1 = -1;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    if (png.alpha(i * 256 + x, y) > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}

/* the frames of each strip: tools/art/cut_water_frog.py's picks */
const WANT = { idle: { s: 8, sw: 8, e: 8, ne: 8, n: 1 }, hop: { s: 12, sw: 12, ne: 12, n: 8 }, attack: { s: 15, sw: 15, e: 15, ne: 15, n: 9 } };
const strips = {};

/* ── 1. the strips ── */
{
  const names = ['death'];
  for (const k of Object.keys(WANT)) for (const d of Object.keys(WANT[k])) names.push(`${k}-${d}`);
  const missing = names.filter((n) => !existsSync(new URL(DIR + n + '.png', root)));
  check('1a all fifteen strips are there: an idle and an attack for five sides, a hop for four (none side on: its video left the frame), and the death', names.length === 15 && missing.length === 0, missing);
  const bad = [];
  for (const n of names) {
    if (missing.indexOf(n) >= 0) continue;
    const png = strips[n] = readPng(DIR + n + '.png');
    if (png.ct !== 3 || png.bd !== 8) bad.push(`${n}: not a palette PNG (colour type ${png.ct})`);
    if (!(png.colours >= 2 && png.colours <= 256)) bad.push(`${n}: ${png.colours} colours`);
    if (png.h !== 256 || png.w % 256 !== 0) bad.push(`${n}: ${png.w}x${png.h}`);
  }
  check('1b each a palette PNG on at most 256 colours (the memory law), a row of 256 px cells', bad.length === 0, bad);
  const counts = [];
  for (const k of Object.keys(WANT)) for (const d of Object.keys(WANT[k])) {
    const png = strips[`${k}-${d}`];
    if (!png || png.w / 256 !== WANT[k][d]) counts.push(`${k}-${d}: ${png ? png.w / 256 : 'missing'} (want ${WANT[k][d]})`);
  }
  check('1c the frames the game counts on: 8 of breath, 12 of hop, 15 of attack from the filmed sides; 1, 8 and 9 from behind, made from the still; 20 of death',
    counts.length === 0 && strips.death && strips.death.w / 256 === 20, counts);
  const empty = [];
  for (const n of names) {
    const png = strips[n];
    if (!png || !png.alpha) continue;
    for (let i = 0; i < png.w / 256; i++) if (!cellBox(png, i)) empty.push(`${n}[${i}]`);
  }
  check('1d every cell has the frog in it', empty.length === 0, empty);
  /* at rest (each idle strip's first frame): the same height from every side
     -- the two from the still picture within its own proportions -- and the
     feet on one row; and never against a cell's side (a frame cut off) */
  const rest = {};
  for (const d of Object.keys(WANT.idle)) { const b = cellBox(strips[`idle-${d}`], 0); rest[d] = { h: b[3] - b[1] + 1, feet: b[3], w: b[2] - b[0] + 1, mid: (b[0] + b[2]) / 2 }; }
  check('1e at rest the frog is the same size from the four filmed sides (140 rows, within 5), its feet on one row (231, within 3), in the middle of its cell',
    ['s', 'sw', 'e', 'ne'].every((d) => Math.abs(rest[d].h - 140) <= 5 && Math.abs(rest[d].feet - 231) <= 3 && Math.abs(rest[d].mid - 128) <= 6), rest);
  check('1f ...and the side made from the still stands on the same row, within a sixth of that size',
    ['n'].every((d) => Math.abs(rest[d].feet - 231) <= 3 && Math.abs(rest[d].h - 140) <= 24 && Math.abs(rest[d].mid - 128) <= 6), rest);
  const cut = [];
  for (const k of Object.keys(WANT)) for (const d of Object.keys(WANT[k])) {
    const png = strips[`${k}-${d}`];
    for (let i = 0; i < png.w / 256; i++) { const b = cellBox(png, i); if (b && (b[0] <= 0 || b[2] >= 255 || b[1] <= 0)) cut.push(`${k}-${d}[${i}]`); }
  }
  check('1g no living frame is cut off by the top or a side of its cell (the hop\'s rise fits)', cut.length === 0, cut);
  /* a hop rises: somewhere in it the frog's head is well above where it rests */
  const rises = ['s', 'sw', 'ne', 'n'].map((d) => {
    const png = strips[`hop-${d}`];
    let top = 256;
    for (let i = 0; i < png.w / 256; i++) top = Math.min(top, cellBox(png, i)[1]);
    return [d, cellBox(strips[`idle-${d}`], 0)[1] - top];
  });
  check('1h a hop rises: its highest frame at least 30 rows above the resting frog, every side', rises.every((r) => r[1] >= 30), rises);
  /* NO WATER LEAVES THE FROG (the owner: "Don't use the water in the
     drawings"): every living cell is ONE joined-up piece -- the frog -- with
     no drop, ripple or splash beside it.  (Water still joined to it, a
     stream out of its mouth, cannot be told from the frog this way: those
     frames are left out by hand, the cutting tool's notes say which.) */
  const loose = [];
  for (const k of Object.keys(WANT)) for (const d of Object.keys(WANT[k])) {
    const png = strips[`${k}-${d}`];
    for (let i = 0; i < png.w / 256; i++) {
      const on = new Uint8Array(256 * 256);
      let total = 0;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (png.alpha(i * 256 + x, y) > 0) { on[y * 256 + x] = 1; total++; }
      let best = 0;
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
      if (best !== total) loose.push(`${k}-${d}[${i}]: ${total - best} px loose`);
    }
  }
  check('1i no water leaves the frog in a living strip: every cell is one joined-up piece, nothing loose beside it', loose.length === 0, loose.slice(0, 8));
  /* ...and a strip never grows much past the frog: the widest a hop or an
     attack gets is the frog and its legs, not a splash twice its width */
  const wide = [];
  for (const k of ['hop', 'attack']) for (const d of Object.keys(WANT[k])) {
    const png = strips[`${k}-${d}`], w0 = (() => { const b = cellBox(strips[`idle-${d}`], 0); return b[2] - b[0] + 1; })();
    for (let i = 0; i < png.w / 256; i++) { const b = cellBox(png, i); if (b[2] - b[0] + 1 > w0 * 1.35) wide.push(`${k}-${d}[${i}]: ${b[2] - b[0] + 1} wide (at rest ${w0})`); }
  }
  check('1j ...and no frame is a splash wider than the frog (within a third of its resting width)', wide.length === 0, wide);
}

/* ── 2. the playing of them ── */
{
  const A = MS.attackStripFrame;
  /* 15 frames, 3 of recovery, a 600 ms warning, 70 ms a recovery frame */
  const seq = [];
  for (let t = 0; t <= 900; t += 10) seq.push(A(t, 600, 15, 3, 70));
  check('2a an attack with recovery: its frames never go back', seq.every((v, i) => i === 0 || v >= seq[i - 1]), seq);
  check('2b ...the 12 wind-up frames spread evenly over the warning, the blow (frame 11) the last on screen before it ends',
    A(0, 600, 15, 3, 70) === 0 && A(299, 600, 15, 3, 70) === 5 && A(300, 600, 15, 3, 70) === 6 && A(599, 600, 15, 3, 70) === 11
    && [...new Set(seq.slice(0, 60))].length === 12);
  check('2c ...whatever the warning\'s length (a slam\'s 900 ms: the same frames, slower)',
    A(449, 900, 15, 3, 70) === 5 && A(899, 900, 15, 3, 70) === 11 && A(0, 900, 15, 3, 70) === 0);
  check('2d ...then the recovery, a frame every 70 ms, held on the last',
    A(600, 600, 15, 3, 70) === 12 && A(670, 600, 15, 3, 70) === 13 && A(740, 600, 15, 3, 70) === 14 && A(5000, 600, 15, 3, 70) === 14);
  check('2e ...and it plays 3 x 70 ms past the warning', MS.attackRecoverMs(3, 70) === 210 && MS.attackRecoverMs(0, 70) === 0);
  /* a strip with no recovery frames: the fire goblin's rule, unchanged */
  const old = (elapsed, n, step) => Math.max(0, Math.min(n - 1, Math.floor(elapsed / step)));
  let same = true;
  for (let t = 0; t <= 800; t += 7) if (A(t, 480, 8, 0, 50) !== old(t, 8, 50)) same = false;
  check('2f a strip with no recovery frames plays exactly as before (a frame every step, held on the last)', same && A(0, 0, 0, 0, 50) === 0);
  /* the hop */
  const H = MS.hopFinishPos, D = MS.hopIsDown;
  check('2g a hop is down on its first frame only', D(0, 12) && D(24.9 - 0.9, 12) && D(12.5, 12) && !D(5.2, 12) && !D(11.99, 12) && D(7, 1));
  let pos = 12 * 3 + 5.4, steps = 0;
  const path = [];
  while (!D(pos, 12) && steps < 100) { pos = H(pos, 12, 16, 55); path.push(pos); steps++; }
  check('2h stopped in the air (frame 5 of 12), it plays on by the clock to the start of the next hop, and stops there: down',
    D(pos, 12) && pos === 48 && steps > 10 && steps < 40 && path.every((v, i) => i === 0 || v > path[i - 1]), { pos, steps });
  check('2i ...in about the 6.6 frames left x 55 ms (never past the landing, however long the frame)', Math.abs(steps * 16 - 6.6 * 55) < 40 && H(41.4, 12, 100000, 55) === 48 && H(48, 12, 16, 55) === 48);
  /* stopped in its crouch (frames 1-2, on the ground) it waits: a frog
     creeping at a wander does not leap on the spot for every pixel */
  check('2i2 stopped in its crouch it waits where it is (airFrom 3); off the ground it is played down',
    H(37.5, 12, 16, 55, 3) === 37.5 && H(38.9, 12, 500, 55, 3) === 38.9 && H(39, 12, 55, 55, 3) === 40 && !MS.hopInAir(38.2, 12, 3) && MS.hopInAir(39, 12, 3) && !MS.hopInAir(36, 12, 3)
    && MS.hopFrame(41.4, 12) === 5 && MS.hopFrame(-1, 12) === 11 && MONSTER_VARIANTS.fishman.hopAirFrom === 3);
  /* the breath */
  const I = MS.idleStripFrame;
  const loop = [];
  for (let t = 0; t < 170 * 16; t += 170) loop.push(I(1e12 + t, 8, 170, 0));
  const start = loop[0];
  check('2j the breath loops its 8 frames in order by the clock, each monster from its own start; one frame is held',
    loop.every((v, i) => v === (start + i) % 8) && I(1e12, 8, 170, 3) === (start + 3) % 8 && I(1e12, 1, 170, 5) === 0);
}

/* ── 3. the wiring ── */
{
  const wf = src('src/rendering/waterFrogSprites.js'), vs = src('src/rendering/monsterVariantSprites.js');
  const er = src('src/rendering/systems/entityRenderer.js'), ge = src('src/networking/gameEvents.js');
  const V = MONSTER_VARIANTS.fishman;
  check('3a the Water Caves\' variant key draws the frog -- its hop the walk, its breath, its attack, its death',
    /fishman: \{\s*load: loadWaterFrogSprites,\s*unload: unloadWaterFrogSprites,\s*walk:[^\n]*wfHopFrame[^\n]*\n\s*idle:[^\n]*wfIdleFrame[^\n]*\n\s*attack:[^\n]*wfAttackFrame[^\n]*\n\s*death:[^\n]*wfDeathFrame/.test(vs));
  check('3b ...and the bog lurker still the old fishman pictures, a module of its own now',
    /bogLurker: \{\s*load: loadFishmanSprites,\s*unload: unloadFishmanSprites,/.test(vs) && existsSync(new URL('public/sprites/monsters/fishman/walk-south.png', root)));
  /* eight facings from five drawn sides */
  const tableOf = (name) => {
    const body = (new RegExp('export const ' + name + ' = Object\\.freeze\\(\\{([\\s\\S]*?)\\}\\);').exec(wf) || [])[1] || '';
    const out = {};
    for (const m of body.matchAll(/(south|southwest|west|northwest|north|northeast|east|southeast):\s*\{ src: '(\w+)',\s*mirror: (true|false) \}/g)) out[m[1]] = [m[2], m[3] === 'true'];
    return out;
  };
  const face = tableOf('WATER_FROG_FACING'), hopOver = tableOf('WATER_FROG_HOP_FACING');
  check('3c eight facings from five drawn sides: the side and back-right views face east and the front-left west, so west, north-west and south-east are mirrors',
    JSON.stringify(face) === JSON.stringify({ south: ['s', false], southwest: ['sw', false], west: ['e', true], northwest: ['ne', true], north: ['n', false], northeast: ['ne', false], east: ['e', false], southeast: ['sw', true] }), face);
  check('3c2 ...and the hop the same, but east and west on the back-right strip (no side hop was filmed whole): every strip a facing names exists',
    /\.\.\.WATER_FROG_FACING,/.test(wf) && JSON.stringify(hopOver) === JSON.stringify({ west: ['ne', true], east: ['ne', false] })
    && Object.values(face).every((f) => strips[`idle-${f[0]}`] && strips[`attack-${f[0]}`])
    && Object.values(Object.assign({}, face, hopOver)).every((f) => strips[`hop-${f[0]}`]) && !existsSync(new URL(DIR + 'hop-e.png', root))
    && /const map = sheets === hopSheets \? WATER_FROG_HOP_FACING : WATER_FROG_FACING;/.test(wf), hopOver);
  check('3d the strips load under one bundle of their own, cropped (loadTrackedStrip), and are let go with it',
    /const BUNDLE = 'waterFrog';/.test(wf) && (wf.match(/loadTrackedStrip\(BUNDLE,/g) || []).length === 2 && (wf.match(/tasks\.push\(loadStrip\(/g) || []).length === 3 && /return unloadBundle\(BUNDLE\);/.test(wf) && /loadPromise = null;/.test(wf));
  const rec = +(/export const ATTACK_RECOVER = (\d+);/.exec(wf) || [])[1];
  check('3e the variant: a hop for its walk, the recovery frames the strips were cut with, its specials\' warnings on the attack strip, its death its own strip',
    V.baseArchetype === 'brute' && V.hopWalk === true && V.attackRecoverFrames === rec && rec === 3 && V.telegraphAttack === true && V.deathStripOnly === true
    && V.spd === 0.5 && V.walkDistPerFrame > 0 && V.idleFrameMs > 0 && V.deathMs >= 1200, V);
  check('3f ...and none of it on the bog lurker or the rock monster',
    ['bogLurker', 'rockmonster', 'thornShambler'].every((k) => !MONSTER_VARIANTS[k].hopWalk && !MONSTER_VARIANTS[k].deathStripOnly && !MONSTER_VARIANTS[k].telegraphAttack && MONSTER_VARIANTS[k].liveScalePx === 96));
  /* the death's size and place follow from the pictures: its first frame is
     the frog at rest, at the death strip's own scale */
  const d0 = cellBox(strips.death, 0), l0 = cellBox(strips['idle-s'], 0);
  const wantPx = V.liveScalePx * (l0[3] - l0[1] + 1) / (d0[3] - d0[1] + 1);
  const wantOff = (255 - d0[3]) * wantPx / 256 - (255 - l0[3]) * V.liveScalePx / 256;
  check(`3g the death is drawn at the living frog's size (deathScalePx ${V.deathScalePx}: the pictures say ${wantPx.toFixed(1)})`, Math.abs(V.deathScalePx - wantPx) <= 4, { wantPx });
  check(`3h ...its feet where they were (deathOffsetY ${V.deathOffsetY}: the pictures say ${wantOff.toFixed(1)})`, Math.abs(V.deathOffsetY - wantOff) <= 2, { wantOff });
  check(`3i its bar and name sit on its head (headTopPx ${V.headTopPx}: its head at rest is ${((256 - l0[1]) * V.liveScalePx / 256).toFixed(1)} up), not on the top of its cell`,
    V.headTopPx >= (256 - l0[1]) * V.liveScalePx / 256 && V.headTopPx <= (256 - l0[1]) * V.liveScalePx / 256 + 8 && /variantCfg\.headTopPx \|\| variantCfg\.liveScalePx/.test(er));
  check('3j the renderer: a strip-only death skips the cut and zone deaths; the offset on the death sprite; the hop, the attack and the breath by monsterStrips',
    /const _dfxStripOnly = !!\(variant && variant\.deathStripOnly\s*&& variantSprites && variantSprites\.death && variantSprites\.death\.has\(\)\);\s*if \(_dfxKey != null && !_dfxStripOnly &&/.test(er)
    && /sb\.y = display\._size \+ \(variant\.deathOffsetY \|\| 0\);/.test(er)
    && /if \(variant\.hopWalk\) \{/.test(er) && /hopFinishPos\(_hPos, _hfc, _hDt, variant\.hopFinishFrameMs, variant\.hopAirFrom\)/.test(er)
    && /attackStripFrame\(elapsed, m\._shootAnimEnd - m\._shootAnimStart, afc, _atkRec, stepMs\)/.test(er)
    && /idleStripFrame\(now, ifc, variant\.idleFrameMs,/.test(er));
  check('3k a special\'s warning plays the attack strip for a look that asks (telegraphAttack), for the warning\'s length',
    /if \(_tgV && _tgV\.telegraphAttack\) \{\s*_tgm\._shootAnimStart = Date\.now\(\);\s*_tgm\._shootAnimEnd = Date\.now\(\) \+ Math\.max\(80, Math\.min\(3000, Number\(payload\.ms\) \|\| 800\)\);/.test(ge));
}

/* ── 4. what players read, and where a shot goes ── */
{
  const gd = src('src/data/gameDisplay.js');
  const { WHEEL_STAGE_LOOKS } = await import('../../src/data/wheelStageLooks.js');
  const { PET_KINDS, PET_ART } = await import('../../src/data/trapping.js');
  const { PET_SHEET } = await import('../../src/data/petSheet.js');
  const { MONSTER_CODEX } = await import('../../src/data/monsterCodex.js').then((m) => ({ MONSTER_CODEX: m.MONSTER_CODEX || m.CODEX || m.default || m }));
  const CS = await import('../../src/data/codexStage.js');
  check('4a its name is "Water Frog", past level 20 "Coral Frog"; the bog lurker keeps its own',
    /fishman: 'Water Frog',/.test(gd) && /bogLurker: 'Bog Lurker',/.test(gd) && WHEEL_STAGE_LOOKS[2].fishman.name === 'Coral Frog' && WHEEL_STAGE_LOOKS[2].bogLurker.name === 'Shade Lurker');
  const cx = src('src/data/monsterCodex.js');
  check('4b its codex page is the frog\'s, and no page a player reads says "Fishman" of the Water Caves',
    /name: 'Water Frog', home: 'tidal', look: 'fishman'/.test(cx) && /elder: Object\.freeze\(\{ name: 'Coral Frog'/.test(cx) && !/name: '[^']*Fishman/.test(cx), MONSTER_CODEX && null);
  check('4c its pet is a Froglet (the kind\'s id is the worker\'s, unchanged), drawn from the frog\'s row on the pet sheet; the Lurkling keeps the old row',
    PET_KINDS.finling.name === 'Froglet' && PET_KINDS.finling.name2 === 'Coral Froglet' && PET_KINDS.finling.look === 'fishman' && PET_KINDS.finling.home === 'tidal'
    && PET_ART.finling.base === 'waterFrog' && !!PET_SHEET.bases.waterFrog && PET_SHEET.bases.waterFrog.row === 7
    && PET_ART.lurkling.base === 'fishman' && !!PET_SHEET.bases.fishman, { art: PET_ART.finling, sheet: PET_SHEET.bases.waterFrog });
  const before = ['snowman', 'fireGoblin', 'mummy', 'rockmonster', 'fishman', 'slime', 'blueSlime'];
  check('4d ...added after the sheet\'s seven rows, none of them moved', before.every((k, i) => PET_SHEET.bases[k].row === i) && PET_SHEET.rows >= 8);
  /* the codex stage */
  const L = CS.CODEX_LOOKS.waterFrog, bad = [];
  for (const [k, s] of Object.entries((L && L.strips) || {})) {
    const file = s.url.replace(/\?.*$/, '').split('/').pop().replace('.png', '');
    const png = strips[file];
    if (!png) { bad.push(`${k}: no strip ${file}`); continue; }
    if (png.w / 256 !== s.n) bad.push(`${k}: ${s.n} cells, the file has ${png.w / 256}`);
    const feet = cellBox(png, 0)[3];
    if (Math.abs(feet - s.ground) > 2) bad.push(`${k}: ground ${s.ground}, its feet are on ${feet}`);
    let top = 256, x0 = 256, x1 = 0;
    for (let i = 0; i < png.w / 256; i++) { const b = cellBox(png, i); top = Math.min(top, b[1]); if (i === 0) { x0 = b[0]; x1 = b[2]; } }
    if (s.ground + 1 - L.artRows > top + 2) bad.push(`${k}: its top row ${top} is above the stage's box (${s.ground + 1 - L.artRows})`);
    if (k === 'idle' && (Math.abs(x0 - L.x0) > 3 || Math.abs(x1 - L.x1) > 3)) bad.push(`idle: x ${x0}-${x1}, the look says ${L.x0}-${L.x1}`);
  }
  check('4e the codex stage plays the frog\'s own strips: an idle, a walk and an attack, their cells counted and their ground rows measured, the hop inside the stage\'s box',
    !!L && L.cell === 256 && ['idle', 'walk', 'attack'].every((k) => !!L.strips[k]) && bad.length === 0 && CS.CODEX_STAGE.finling.look === 'waterFrog'
    && CS.CODEX_STAGE.lurkling.look === 'fishman' && !!CS.CODEX_LOOKS.fishman, bad);
  /* a shot */
  const { monsterTorsoY, monsterBodyOffsetY } = await import('../../src/data/gameSystems.js');
  const l0 = cellBox(strips['idle-s'], 0);
  const k = MONSTER_VARIANTS.fishman.liveScalePx / 256 * 1.5;   /* cell px -> world px (entityRenderer MONSTER_SIZE_MULT) */
  const bodyH = (l0[3] - l0[1] + 1) * k;
  check(`4f a shot is aimed at the middle of its body (torso ${monsterTorsoY('fishman')} px up; the body at rest is ${bodyH.toFixed(0)} tall), inside its hit circle (${monsterBodyOffsetY('fishman')} +/- 40)`,
    monsterTorsoY('fishman') > bodyH * 0.35 && monsterTorsoY('fishman') < bodyH * 0.75 && Math.abs(monsterTorsoY('fishman') - monsterBodyOffsetY('fishman')) < 40
    && monsterTorsoY('bogLurker') === 66, { torso: monsterTorsoY('fishman'), bo: monsterBodyOffsetY('fishman'), bodyH });
}

/* ── 5. its water, drawn in code ── */
{
  const WD = await import('../../src/data/waterAttack.js');
  const WA = await import('../../src/game/waterAttack.js');
  const WS = await import('../../src/rendering/waterAttackShapes.js');
  const { WATER_BLOWS, WATER_SHAPES, WATER_FX } = WD;
  const kinds = Object.keys(WATER_BLOWS);
  check('5a two blows, a spray and a ring; every piece a shape of the one picture, every shape drawn; a full screen of blows fits the pool',
    kinds.join() === 'spray,ring' && kinds.every((k) => WATER_BLOWS[k].pieces.every((p) => WATER_SHAPES.indexOf(p[0]) >= 0 && p[1] > 0) && WATER_BLOWS[k].ms >= 300 && WATER_BLOWS[k].ms <= 800)
    && WATER_SHAPES.every((n) => typeof WS.WATER_SHAPE_DRAW[n] === 'function') && Object.keys(WS.WATER_SHAPE_DRAW).length === WATER_SHAPES.length
    && Math.max(...kinds.map((k) => WD.waterPieceCount(WATER_BLOWS[k]))) * WATER_FX.MAX_BLOWS <= WATER_FX.POOL,
    kinds.map((k) => [k, WD.waterPieceCount(WATER_BLOWS[k])]));
  check('5b a slam, a quake and a stomp throw a ring; a swing, a combo, a charge and anything unknown a spray',
    ['slam', 'quake', 'stomp'].every((a) => WD.waterBlowKind(a) === 'ring') && ['swing', 'combo', 'charge', 'volley', '', undefined, '__proto__', 'constructor'].every((a) => WD.waterBlowKind(a) === 'spray'));
  /* every shape draws: a stand-in canvas that counts what was painted */
  const painted = WATER_SHAPES.map((n) => {
    let fills = 0, strokes = 0;
    const g = new Proxy({}, { get: (t, k) => (k === 'fill' ? () => { fills++; } : k === 'stroke' ? () => { strokes++; } : (k in t ? t[k] : () => {})), set: (t, k, v) => { t[k] = v; return true; } });
    WS.WATER_SHAPE_DRAW[n](g, 48);
    return [n, fills, strokes];
  });
  check('5c every shape paints something, and has its dark edge (a stroke)', painted.every((p) => p[1] + p[2] >= 2 && p[2] >= 1), painted);
  /* the frog's blow, as the renderer hands it over: facing east */
  const G = (dx, dy, reach) => ({ dx, dy, R: 48, H: 62, k: 1, reach });
  const at = (kind, g, age, seed = 77) => WA.waterPieceList(kind, g, age, seed);
  const sprayN = WD.waterPieceCount(WATER_BLOWS.spray), ringN = WD.waterPieceCount(WATER_BLOWS.ring);
  const steps = [];
  for (let a = 0; a < WATER_BLOWS.spray.ms; a += 20) steps.push(a);
  check('5d a spray is its whole count of pieces from the blow to its end, and nothing after (or before)',
    steps.every((a) => at('spray', G(1, 0, 84), a).length === sprayN) && at('spray', G(1, 0, 84), WATER_BLOWS.spray.ms).length === 0
    && at('spray', G(1, 0, 84), -5).length === 0 && at('nope', G(1, 0, 84), 100).length === 0 && WA.waterBlowOver('spray', 480) && !WA.waterBlowOver('spray', 479));
  const vis = (list) => list.filter((p) => p.a > 0.05);
  const allAhead = steps.every((a) => vis(at('spray', G(1, 0, 84), a)).every((p) => p.dx > 0 && p.dx < 48 * 0.55 + 84 * 1.25 && Math.abs(p.dy) < 110));
  check('5e ...out of its mouth the way it faces: facing east, every piece on screen is ahead of it, none past its reach', allAhead);
  const first = at('spray', G(1, 0, 84), 0), mid = vis(at('spray', G(1, 0, 84), 240)), last = at('spray', G(1, 0, 84), 470);
  check('5f ...at the blow it is at the mouth (up its body), halfway it has travelled and the splash has started, at the end it has faded',
    vis(first).length >= 1 && vis(first).every((p) => p.dy < -30 && p.dx < 70) && mid.some((p) => p.shape === 'ripple') && mid.filter((p) => p.shape === 'drop' || p.shape === 'blob').every((p) => p.dx > 40)
    && Math.max(...last.map((p) => p.a)) < 0.25, { first: vis(first).length, mid: mid.length, lastMax: Math.max(...last.map((p) => p.a)) });
  /* the same blow facing west is the east one mirrored: one frog, one splash */
  const e = at('spray', G(1, 0, 84), 200), w = at('spray', G(-1, 0, 84), 200);
  /* (the foam's little scatter is its own, either way) */
  const mir = e.every((p, i) => p.shape === w[i].shape && Math.abs(p.a - w[i].a) < 1e-9 && (p.shape === 'foam' || Math.abs(p.dx + w[i].dx) < 1e-6));
  check('5g ...the same every time for one frog and one blow (no randomness), another frog\'s different; facing west it goes west',
    JSON.stringify(at('spray', G(1, 0, 84), 200)) === JSON.stringify(e) && JSON.stringify(at('spray', G(1, 0, 84), 200, 78)) !== JSON.stringify(e)
    && mir && vis(w).every((p) => p.dx < 0), null);
  /* facing south the splash lands below its feet, facing north above */
  const land = (dx, dy) => at('spray', G(dx, dy, 84), 330).find((p) => p.shape === 'ripple');
  check('5h ...and its splash comes down on the ground ahead of it: below its feet facing south, above facing north, level facing east',
    land(0, 1).dy > 60 && land(0, -1).dy < -60 && Math.abs(land(1, 0).dy) < 1 && land(1, 0).dx > 90);
  /* the ring */
  const rsteps = [];
  for (let a = 0; a < WATER_BLOWS.ring.ms; a += 20) rsteps.push(a);
  const radius = (a) => { const cs = at('ring', G(0, 1, 88), a).filter((p) => p.shape === 'crest'); return cs.map((p) => Math.hypot(p.dx, p.dy + 6)); };
  const grows = rsteps.every((a, i) => i === 0 || Math.max(...radius(a)) >= Math.max(...radius(rsteps[i - 1])) - 5);
  check('5i a ring is its whole count too; its wave runs out from under it to the worker\'s own radius (88) and never past it',
    rsteps.every((a) => at('ring', G(0, 1, 88), a).length === ringN) && at('ring', G(0, 1, 88), WATER_BLOWS.ring.ms).length === 0 && grows
    && radius(0).every((r) => r < 40) && radius(500).every((r) => r > 80 && r < 96) && rsteps.every((a) => radius(a).every((r) => r < 96)),
    { r0: Math.round(Math.max(...radius(0))), r500: Math.round(Math.max(...radius(500))) });
  check('5j ...all the way round it (its crests in every quarter), and gone by its end',
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].every(([sx, sy]) => at('ring', G(0, 1, 88), 300).some((p) => p.shape === 'crest' && p.dx * sx > 0 && (p.dy + 6) * sy > 0))
    && Math.max(...at('ring', G(0, 1, 88), 610).map((p) => p.a)) < 0.1);
  check('5k a bigger monster\'s water is bigger, by its reach (a ring at 150: a quake\'s)', radius(0).length === 10 && Math.max(...at('ring', G(0, 1, 150), 500).filter((p) => p.shape === 'crest').map((p) => Math.hypot(p.dx, p.dy + 6))) > 140);
  /* the wiring */
  const er = src('src/rendering/systems/entityRenderer.js'), ge = src('src/networking/gameEvents.js'), fx = src('src/rendering/systems/effectsRenderer.js');
  const wfx = src('src/rendering/waterAttackFx.js'), pre = src('src/rendering/preloadAnimations.js');
  check('5l the frog asks for water (blowFx) and nobody else does; the blow is queued once a warning, as it ends, for a monster drawn, never long after',
    MONSTER_VARIANTS.fishman.blowFx === 'water' && Object.keys(MONSTER_VARIANTS).filter((k) => MONSTER_VARIANTS[k].blowFx === 'water').join() === 'fishman'
    && /if \(variant\.blowFx && m\._shootAnimEnd && now >= m\._shootAnimEnd && m\._wbFor !== m\._shootAnimStart\) \{\s*m\._wbFor = m\._shootAnimStart;\s*if \(now - m\._shootAnimEnd < WATER_FX\.LATE_MS\) \{\s*if \(variant\.blowFx === 'water'\) queueWaterBlow\(S, m, facing, rx, ry, m\._shootAnimEnd\);/.test(er));
  check('5m a swing\'s warning says spray, a special\'s its own kind and the worker\'s radius',
    /_bwM\._blowKind = 'spray'; _bwM\._blowR = 0;/.test(ge) && /_tgm\._blowKind = waterBlowKind\(payload\.ability\);\s*_tgm\._blowR = Number\(payload\.radius\) > 0 \? Number\(payload\.radius\) : 0;/.test(ge));
  check('5n drawn as the wind-ups are: one pool made once with the renderer, updated every frame, parked on a zone change; its picture made on the loading screen and kept as an image; ?nowaterfx leaves it out',
    /this\._waterAttack = new WaterAttackFx\(this\.projectileLayer\);/.test(fx) && /this\._waterAttack\.update\(S, now\)/.test(fx) && /this\._waterAttack\.clear\(\)/.test(fx)
    && /waterAttack: Promise\.resolve\(warmWaterAttack\(\)\)/.test(pre) && /keepAsImage\(base\.source, Cache\)/.test(wfx) && /has\('nowaterfx'\)/.test(wfx)
    && /for \(let i = 0; i < WATER_FX\.POOL; i\+\+\)/.test(wfx) && !/removeChild|\.visible = /.test(wfx));
  check('5o the list of blows cannot grow (the oldest goes at 12), and a finished one is dropped whether drawn or not',
    /if \(list\.length >= 12\) list\.shift\(\);/.test(wfx) && /if \(waterBlowOver\(list\[i\]\.kind, \(now - list\[i\]\.at\) \* rate\)\) list\.splice\(i, 1\);/.test(wfx));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
