/* ═══ v2.3.6761: THE BAKES KEPT: THE KEY READS EVERY INPUT (card LOAD PR 2) ═══
 *
 * src/game/bakeKeep.js makes a masked bake's key from the job as the bake
 * worker receives it, and the worker answers a job whose key it has kept
 * from the phone's disk instead of baking it.  A key that missed an input
 * would answer a DIFFERENT bake with a kept picture: the wrong armour, for
 * good.  So this guard holds:
 *
 *   1. change any input, the key changes: every keyed field of the job, of
 *      each input (the body, the belt, each worn piece), of a body from the
 *      look's numbers, one byte of any input's pixels, the rod on a fish
 *      frame, the bake's version;
 *   2. what is not keyed does not move it (the reply's id, the QA cuts,
 *      another address of the same file); a file that did not read: no key;
 *   3. a field nobody listed makes NO key (the job is baked): on the job, an
 *      input, a worn entry, a look;
 *   4. every field the page posts in a job (entityRenderer.js `_runBake`,
 *      `_runLookBake`) and puts on an input (bakeByAddress.js frameInput,
 *      gearNumbers.js gearInput) is one of the lists -- read from those files;
 *   5. the store's rules: what is kept reads back whole (keptOk), the cap
 *      lets go of the least lately used first (evictPlan), `?bakekeep=0`;
 *   6. (v2.3.6761, sitting 71's hold) THE REAL WORKER, run in node
 *      (lib/bakeWorkerRig.mjs), by behaviour: every field it reads of a job
 *      is on the lists (an allow list), and every input it reads, in the job
 *      or beside it (a file's bytes, a sheet of numbers, the look's row, the
 *      rod, its script, the browser), changed alone makes the next login bake
 *      again; the same job is answered from the store, byte for byte;
 *   7. the store (keepStore) on a stand-in IndexedDB: its cap on the disk,
 *      a version that empties it, a store that throws switched off.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-26:
 *   1. bakeKeep.js keyParts: delete `val('worn' + i + '.k', w.k);`  -> FAIL 1
 *   2. bakeKeep.js keyParts: `[inp.tx, inp.ty, inp.fw, inp.fh, inp.ow]`
 *      (the oh left out)                                            -> FAIL 1
 *   3. bakeKeep.js JOB_FIELDS: add `tint: 'none'`, and post `tint` from
 *      _runBake                                                     -> FAIL 3 no; 4 passes
 *      (a field the lists name `none` is the author's ruling: the list
 *      is where a reviewer reads it)
 *   4. entityRenderer.js _runBake: post `{ id, body, belt, worn, ..., tint }`
 *      with no row                                                  -> FAIL 4
 *   5. bakeKeep.js known(): `return true;` first                    -> FAIL 3
 *
 * Run from the repository's root: node tools/guards/bake-keep.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { webcrypto } from 'node:crypto';

import { readSystem } from './lib/filesOf.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
/* the render system's code, read by system (tests-by-system: never a big file by its path) */
const RENDER = [...readSystem('render').values()].join('\n');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
};

const K = await import(pathToFileURL(join(ROOT, 'src/game/bakeKeep.js')).href);
const digest = (b) => webcrypto.subtle.digest('SHA-256', b);

/* a stand-in input: its pixels are its own bytes (`px`), read as the worker reads a bitmap */
const px = (n, seed) => { const a = new Uint8ClampedArray(n * 4); for (let i = 0; i < a.length; i++) a[i] = (i * 7 + seed) & 255; return a; };
const inp = (seed) => ({ bm: { px: px(12, seed) }, tx: 2, ty: 3, fw: 4, fh: 3, ow: 16, oh: 16 });
const bitmapJob = () => ({
  id: 7, body: inp(1), belt: inp(2),
  worn: [{ k: 'chest:copperplate', inp: inp(3) }, { k: 'legs:coppergreaves', inp: { url: 'blob:x', sx: 5, sy: 6, tx: 0, ty: 0, fw: 4, fh: 3, ow: 16, oh: 16, ub: { px: px(12, 4) } } }],
  dilate: 6, poseInfo: { pose: 'jog', dir: 'northeast', frameIdx: 3 }, ds: 2, crop: true,
});
const lookJob = () => ({
  id: 9, look: { sheet: 'body-jog', cell: { x: 1, y: 2, w: 4, h: 3, tx: 0, ty: 0, ow: 16, oh: 16 }, row: new Uint8Array(8) },
  belt: null, worn: [{ k: 'chest:copperplate', inp: { look: 'gear-1', cell: { x: 0, y: 0, w: 4, h: 3 }, tx: 0, ty: 0, fw: 4, fh: 3, ow: 16, oh: 16, lb: { px: px(12, 5) } } }],
  dilate: 6, poseInfo: { pose: 'stand', dir: 'east', frameIdx: 0 }, ds: 2,
});
let rodMask = new Uint8Array([1, 0, 1, 1]);
/* a sheet's file by its address: two addresses of the same file read the same */
const FILES = { 'blob:x': new Uint8Array([9, 9, 9, 1]), 'blob:y': new Uint8Array([9, 9, 9, 1]), 'blob:z': new Uint8Array([9, 9, 9, 2]) };
/* a sheet of the gear's numbers by its key: its digest */
const NUMBERS = { 'gear-1': new Uint8Array([4, 4, 4, 1]), 'gear-2': new Uint8Array([4, 4, 4, 2]) };
const reader = (build) => ({
  pixels: (i) => { const s = i.bm || i.lb; return s ? s.px : null; },
  file: (u) => FILES[u] || null,
  numbers: (k) => NUMBERS[k] || null,
  look: (l) => ({ rgba: px(12, 9 + (l.row[0] || 0)), pm: px(12, 10 + (l.row[0] || 0)) }),
  rod: () => rodMask,
  build: build == null ? 'v1|/assets/maskedBakeWorker-abc.js|ua' : build,
});
const keyOf = async (j, build) => K.keyOf(K.keyParts(j, reader(build)), digest);

/* 1. change any input, the key changes */
{
  const base = await keyOf(bitmapJob());
  check('1. a bitmap job has a key (64 hex)', typeof base === 'string' && /^[0-9a-f]{64}$/.test(base), base);
  check('1. the same job, the same key', base === await keyOf(bitmapJob()));
  const moves = [
    ['dilate', (j) => { j.dilate = 5; }],
    ['poseInfo.pose', (j) => { j.poseInfo.pose = 'stand'; }],
    ['poseInfo.dir', (j) => { j.poseInfo.dir = 'north'; }],
    ['poseInfo.frameIdx', (j) => { j.poseInfo.frameIdx = 4; }],
    ['poseInfo: a new field', (j) => { j.poseInfo.mirror = true; }],
    ['ds', (j) => { j.ds = 1; }],
    ['crop', (j) => { j.crop = false; }],
    ['belt left out', (j) => { j.belt = null; }],
    ['a worn piece left out', (j) => { j.worn.pop(); }],
    ['worn order', (j) => { j.worn.reverse(); }],
    ['worn k', (j) => { j.worn[0].k = 'chest:steelplate'; }],
    ['the build (script, browser, KEEP_V)', null],
  ];
  for (const who of ['body', 'belt', 'worn0', 'worn1']) {
    for (const f of ['tx', 'ty', 'fw', 'fh', 'ow', 'oh']) moves.push([who + '.' + f, (j) => { const i = who === 'body' ? j.body : who === 'belt' ? j.belt : j.worn[+who.slice(4)].inp; i[f] += 1; }]);
    if (who !== 'worn1') moves.push([who + ': one byte of its pixels', (j) => { const i = who === 'body' ? j.body : who === 'belt' ? j.belt : j.worn[+who.slice(4)].inp; const s = i.bm; s.px = s.px.slice(); s.px[17] ^= 1; }]);
  }
  /* a sheet by address: its file and the rectangle in it */
  moves.push(['worn1: another file', (j) => { j.worn[1].inp.url = 'blob:z'; }]);
  moves.push(['worn1.sx', (j) => { j.worn[1].inp.sx += 1; }]);
  moves.push(['worn1.sy', (j) => { j.worn[1].inp.sy += 1; }]);
  for (const [name, move] of moves) {
    const j = bitmapJob();
    const k = move ? await keyOf((move(j), j)) : await keyOf(j, 'v2|/assets/maskedBakeWorker-def.js|ua');
    check('1. ' + name + ' moves the key', k && k !== base, { name });
  }
  const lb = await keyOf(lookJob());
  check('1. a look job has a key', typeof lb === 'string' && lb !== base);
  for (const [name, move] of [
    ['look.cell', (j) => { j.look.cell.ty = 1; }],
    ['look.row (the frame in its colours)', (j) => { j.look.row = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]); }],
    ['a worn piece from numbers: another sheet of numbers', (j) => { j.worn[0].inp.look = 'gear-2'; }],
    ['a worn piece from numbers: its cell', (j) => { j.worn[0].inp.cell.x += 4; }],
    ['a worn piece from numbers: its placing', (j) => { j.worn[0].inp.ty += 1; }],
    ['the belt come', (j) => { j.belt = inp(2); }],
  ]) {
    const j = lookJob(); move(j);
    check('1. ' + name + ' moves the look key', (await keyOf(j)) !== lb, { name });
  }
  /* the rod: a fish frame reads it, the others do not */
  const fish = () => { const j = bitmapJob(); j.poseInfo = { pose: 'fish', dir: 'south', frameIdx: 2 }; return j; };
  const f0 = await keyOf(fish());
  rodMask = new Uint8Array([1, 1, 1, 1]);
  check('1. the rod moves a fish frame\'s key', (await keyOf(fish())) !== f0);
  check('1. ...and not a jog frame\'s', (await keyOf(bitmapJob())) === base);
  rodMask = new Uint8Array([1, 0, 1, 1]);
}

/* 2. what is not keyed does not move it */
{
  const base = await keyOf(bitmapJob());
  const j1 = bitmapJob(); j1.id = 99; j1._qa = [{ same: true }]; j1._urlRead = true; j1._sheets = []; j1._keyTried = true; j1._files = new Map();
  j1.body.qaBm = { px: px(12, 77) };
  check('2. the id, the QA cuts and the worker\'s own marks do not move the key', (await keyOf(j1)) === base);
  const j2 = bitmapJob(); j2.worn[1].inp.url = 'blob:y';
  check('2. another address of the same file does not move the key (the file is read)', (await keyOf(j2)) === base);
  const j3 = bitmapJob(); j3.worn[1].inp.url = 'blob:none';
  check('2. an address whose file did not read: no key', K.keyParts(j3, reader()) === null);
  const j4 = lookJob(); j4.worn[0].inp.look = 'gear-9';
  check('2. a sheet of numbers that is not here: no key', K.keyParts(j4, reader()) === null);
}

/* 3. a field nobody listed makes no key */
{
  const plant = [
    ['the job', (j) => { j.tint = 1; }],
    ['an input', (j) => { j.body.tint = 1; }],
    ['a worn entry', (j) => { j.worn[0].slot = 'chest'; }],
    ['body and look both', (j) => { j.look = lookJob().look; }],
  ];
  for (const [name, move] of plant) { const j = bitmapJob(); move(j); check('3. a field on ' + name + ' that no list names: no key', K.keyParts(j, reader()) === null, name); }
  const lj = lookJob(); lj.look.palette = 3;
  check('3. a field on the look that no list names: no key', K.keyParts(lj, reader()) === null);
  const nopx = bitmapJob(); nopx.body = { tx: 0, ty: 0, fw: 4, fh: 3, ow: 16, oh: 16 };
  check('3. an input with nothing to draw: no key', K.keyParts(nopx, reader()) === null);
}

/* 4. every field the page posts is in the lists (read from the files) */
{
  const keysOf = (lit) => {
    const out = [];
    let depth = 0, cur = '';
    for (const ch of lit) {
      if ('{[('.includes(ch)) depth++;
      if ('}])'.includes(ch)) depth--;
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur);
    return out.map((s) => s.trim()).filter(Boolean).map((s) => (s.startsWith('...') ? s : s.split(':')[0].trim()));
  };
  const objAfter = (src, at) => {
    const i = src.indexOf('{', at);
    let d = 0;
    for (let k = i; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i + 1, k); }
    return '';
  };
  const ent = RENDER;
  const posts = [];
  for (const m of ent.matchAll(/wk\.postMessage\(\{ id, /g)) posts.push(keysOf(objAfter(ent, m.index)));
  check('4. both jobs the page posts are found (_runBake, _runLookBake)', posts.length === 2, posts);
  for (const p of posts) {
    const off = p.filter((f) => !Object.prototype.hasOwnProperty.call(K.JOB_FIELDS, f));
    check('4. every field of a posted job is in JOB_FIELDS: ' + p.join(', '), off.length === 0, off);
  }
  const worn = /worn: worn\.map\(\(w, i\) => \(\{ ([^}]*) \}\)\)/g;
  for (const m of ent.matchAll(worn)) {
    const off = keysOf(m[1]).filter((f) => !Object.prototype.hasOwnProperty.call(K.WORN_FIELDS, f));
    check('4. every field of a posted worn entry is in WORN_FIELDS: ' + m[1], off.length === 0, off);
  }
  const ins = [];
  const bba = read('src/rendering/bakeByAddress.js');
  const fi = bba.indexOf('export function frameInput');
  const body = bba.slice(fi, bba.indexOf('\n}\n', fi));
  for (const m of body.matchAll(/const inp = \{|\(\{\s*\n?\s*bm,|\{ \.\.\.inp, qaBm \}/g)) ins.push(keysOf(objAfter(body, m.index - (m[0].startsWith('(') ? 0 : 0))));
  const gn = read('src/rendering/gearNumbers.js');
  const gi = gn.indexOf('export function gearInput');
  ins.push(keysOf(objAfter(gn, gn.indexOf('return {', gi))));
  check('4. the inputs the page makes are found (frameInput by address, cut, QA; gearInput)', ins.length >= 3, ins);
  for (const p of ins) {
    const off = p.filter((f) => !f.startsWith('...') && !Object.prototype.hasOwnProperty.call(K.INPUT_FIELDS, f));
    check('4. every field of an input is in INPUT_FIELDS: ' + p.join(', '), off.length === 0, off);
  }
  /* and the worker's own fields it adds to an input */
  const wk = read('src/rendering/maskedBakeWorker.js');
  for (const f of ['ub', 'lb']) check(`4. the worker's own input field \`${f}\` is listed`, new RegExp('\\.' + f + ' = ').test(wk) && Object.prototype.hasOwnProperty.call(K.INPUT_FIELDS, f));
  for (const f of ['_urlRead', '_sheets', '_qa']) check(`4. the worker's own job field \`${f}\` is listed`, Object.prototype.hasOwnProperty.call(K.JOB_FIELDS, f));
}

/* 5. the store's rules */
{
  const okPx = { t: 'px', w: 2, h: 2, px: new Uint8ClampedArray(16), cell: { tx: 0, ty: 0, w: 2, h: 2, fw: 8, fh: 8 }, belt: false };
  check('5. a whole frame reads back', K.keptOk(okPx));
  check('5. a frame short of its bytes does not', !K.keptOk({ ...okPx, px: new Uint8ClampedArray(12) }));
  check('5. a frame whose cell is not its size does not', !K.keptOk({ ...okPx, cell: { ...okPx.cell, w: 3 } }));
  check('5. a look frame reads back, its residue whole', K.keptOk({ t: 'look', show: new Uint8Array(4), counts: {}, residue: { x: 0, y: 0, w: 1, h: 1, px: new Uint8ClampedArray(4) } }));
  check('5. a look frame with a broken residue does not', !K.keptOk({ t: 'look', show: new Uint8Array(4), residue: { x: 0, y: 0, w: 2, h: 1, px: new Uint8ClampedArray(4) } }));
  check('5. nothing, or another kind, does not', !K.keptOk(null) && !K.keptOk({ t: 'x' }));
  const rows = [['a', { b: 40, at: 3, n: 1 }], ['b', { b: 40, at: 1, n: 2 }], ['c', { b: 40, at: 2, n: 3 }], ['d', { b: 40, at: 3, n: 4 }]];
  check('5. within the cap nothing is let go', K.evictPlan(rows, 160).length === 0);
  check('5. past it, the least lately used first, to nine tenths', JSON.stringify(K.evictPlan(rows, 100)) === JSON.stringify(['b', 'c']), K.evictPlan(rows, 100));
  check('5. the cap is said in MB', K.KEEP_CAP_BYTES === K.KEEP_CAP_MB * 1024 * 1024 && K.KEEP_CAP_MB > 0 && K.KEEP_CAP_MB <= 64);
  const SW = await import(pathToFileURL(join(ROOT, 'src/game/switches.js')).href);
  const off = (q) => SW.readerFor(q).sw('bakekeep');
  check('5. ?bakekeep=0 throws the switch (the switch table\'s reader), and only that', off('?a=1&bakekeep=0') && off('?bakekeep=0') && !off('?bakekeep=1') && !off('') && !off('?bakekeep=00'));
  check('5. the page tells the worker the keep is on unless it is thrown', /keepTell\(_getBakeWorker\(\), \{ on: !sw\('bakekeep'\)/.test(RENDER));
  /* the store on a stand-in that throws: off, silently */
  const st = K.keepStore({ open: () => { throw new Error('private mode'); } }, 'v', 100);
  check('5. a store that throws is off, and a get is a miss', (await st.get('k')) === null && st.state.off === true);
  const none = K.keepStore(null, 'v', 100);
  check('5. no store at all: off, and a put keeps nothing', (await none.put('k', okPx)) === false && none.state.off === true);
}

/* ═══ v2.3.6761, after the gatekeeper's sitting 71 (#2401 held): THE WORKER ITSELF, BY BEHAVIOUR ═══
   Sections 1 to 3 prove keyParts on readers of this file's own; the hold
   was that the WORKER's readers (maskedBakeWorker.js lookPixels,
   inputPixels, keepKey's file / numbers / rod readers, keepSet's version)
   could feed it the wrong things and every check stay green.  So the real
   worker runs here (lib/bakeWorkerRig.mjs: a software canvas, fetch from a
   table of files, a stand-in IndexedDB kept across "logins"), each "login" a
   fresh import of it, and:
     6a. every field of a job the worker READS while it keys, bakes and keeps
         it is on the lists (bakeKeep.js JOB_FIELDS, INPUT_FIELDS,
         WORN_FIELDS, LOOK_FIELDS): an ALLOW list, never a list of
         forbidden spellings -- a read nobody listed fails;
     6b. every one of those reads the page supplies, and every input the
         worker reads beside the job (each file's bytes at its address, a
         sheet of numbers' bytes, the look's row, the rod, the worker's
         script, the browser), changed ONE AT A TIME: the next login's job is
         NOT answered from the store (a miss, with a key).  The same job
         again IS (a hit), and its kept answer is the baked one byte for byte;
     7.  the store on the stand-in IndexedDB: never more than its cap on the
         disk, across logins; another version empties it and a kept bake of
         another version is never served; a store that throws is off for the
         session and touches nothing more.
   BREAK PROOF (rule 8), 2026-11-27, each planted and run by hand; every
   one RED (FAIL 6b / 7), every one GREEN before this section:
     1. maskedBakeWorker.js lookPixels: `lookFrameRGBA(sh, look.cell, NO_ROW)`  -> 6b look.row
     2. inputPixels: `return new Uint8ClampedArray(inp.fw * inp.fh * 4)`       -> 6b body.bm
     3. keepKey: `file: (u) => <the address's bytes>`                          -> 6b file
        keepKey: `numbers: (k) => <the key's bytes>`                           -> 6b numbers
        keepKey: `rod: () => null`                                             -> 6b rod
     4. keepSet: `keep.ver = 'v' + KEEP_V`                                     -> 6b script, browser
     5. bakeKeep.js put: `const drop = []`                                     -> 7 cap
     6. keepStore open: the version never empties                              -> 7 version, 6b script
     7. keepStore get: a throw not switched off                                -> 7 throws
     8. (this mend's own) runJob reads `j.tint`                                -> 6a
     9. (this mend's own) keyParts: the numbers input's cell left out          -> 6b worn.N.inp.cell */
{
  const R = await import(pathToFileURL(join(ROOT, 'tools/guards/lib/bakeWorkerRig.mjs')).href);
  const FAKE = R.fakeIdb();
  const SCRIPT = '/assets/maskedBakeWorker-abc123.js', UA = 'Mozilla/5.0 (iPhone; guard)';

  /* ─── the world a login finds: files at addresses, sheets of numbers, the rod ─── */
  const blob = (w, h, f) => { const a = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = f(x, y); if (c) a.set(c, (y * w + x) * 4); } return a; };
  const inBox = (x, y, x0, y0, x1, y1) => x >= x0 && y >= y0 && x < x1 && y < y1;
  /* the body: a head, a torso, two legs (64 x 96, placed at 32,16 of 128) */
  const bodyPx = () => blob(64, 96, (x, y) => (inBox(x, y, 22, 4, 42, 24) ? [224, 172, 140, 255] : inBox(x, y, 16, 24, 48, 60) ? [200, 160, 130, 255] : inBox(x, y, 18, 60, 30, 94) || inBox(x, y, 34, 60, 46, 94) ? [60, 70, 140, 255] : null));
  /* a chest plate's sheet: its frame at 128,0 (64 x 48) */
  const chestSheet = () => blob(256, 64, (x, y) => (inBox(x, y, 136, 4, 184, 44) ? [150 + (x & 7), 90, 40, 255] : null));
  const beltSheet = () => blob(64, 16, (x, y) => (inBox(x, y, 4, 4, 60, 10) ? [90, 60, 20, 255] : null));
  /* a sheet of colour numbers (lookExpand.js lookSheetParse's layout, 8 bits,
     ds 1): numbers in the top rows, one row of the colour table, the header
     in the bottom rows; one role, so the look's row colours it */
  const numbersSheet = ({ W = 128, n = 128, figure, role = 0, seed = 0 } = {}) => {
    const rows = n + 1 + 3, b = new Uint8Array(W * rows);
    for (let y = 0; y < n; y++) for (let x = 0; x < W; x++) { const k = figure(x, y); if (k) b[y * W + x] = k; }
    for (let k = 1; k < 16; k++) b.set([(40 + 13 * k + seed) & 255, (200 - 9 * k) & 255, (70 + 5 * k) & 255, 255], n * W + 4 * k);
    const hdr = (i, v) => { for (const [p, byte] of [[2 * i, v & 255], [2 * i + 1, v >> 8]]) b[(rows - 1 - Math.floor(p / W)) * W + (p % W)] = byte; };
    hdr(0, 1); hdr(1, n); hdr(2, n); hdr(4, role ? 1 : 0);
    hdr(5, 1); for (let r = 1; r < 16; r++) hdr(5 + r, 60000);
    if (role) { hdr(21, 3); hdr(22, 0); hdr(23, 0); }
    hdr(66, 1);
    return { bytes: b, w: W, rows, bits: 8 };
  };
  /* (its seed moves the head: the body's colours are its row's, so a changed table alone draws the same frame) */
  const bodyNumbers = (seed) => numbersSheet({ role: 1, seed, figure: (x, y) => (inBox(x, y, 54, 20 - (seed ? 2 : 0), 74, 40) ? 2 : inBox(x, y, 48, 40, 80, 76) ? 3 : inBox(x, y, 50, 76, 62, 110) || inBox(x, y, 66, 76, 78, 110) ? 5 : 0) });
  const legsNumbers = (seed) => numbersSheet({ seed, figure: (x, y) => (inBox(x, y, 4, 4, 60, 44) ? 7 + (x & 1) : 0) });
  const rodOf = (flip) => { const mask = new Uint8Array(256 * 64); for (let i = 0; i < mask.length; i++) mask[i] = ((i % 256) > 100 && (i % 256) < 140) !== !!flip ? 1 : 0; return { frames: 4, fw: 64, fh: 64, w: 256, mask }; };
  const lookRow = (d) => { const r = new Uint8Array(256 * 4); for (let e = 0; e < 256; e++) r.set([(180 + d) & 255, (120 + d) & 255, (60 + d) & 255, 255], e * 4); return r; };
  const world = () => ({
    files: new Map([
      ['blob:chest', R.fileOf(256, 64, chestSheet())],
      ['blob:belt', R.fileOf(64, 16, beltSheet())],
      ['blob:body', R.fileOf(64, 96, bodyPx())],
    ]),
    sheets: { 'look-body': bodyNumbers(0), 'gear-legs': legsNumbers(0) },
    rod: rodOf(false), script: SCRIPT, ua: UA,
  });

  /* ─── the jobs, as the page posts them (entityRenderer.js _runBake / _runLookBake) ─── */
  const at = { tx: 32, ty: 16, fw: 64, fh: 96, ow: 128, oh: 128 };
  const chest = () => ({ k: 'chest:copperplate', inp: { url: 'blob:chest', sx: 128, sy: 0, tx: 32, ty: 20, fw: 64, fh: 48, ow: 128, oh: 128 } });
  const legs = () => ({ k: 'legs:coppergreaves', inp: { look: 'gear-legs', cell: { x: 0, y: 0, w: 64, h: 48 }, tx: 32, ty: 70, fw: 64, fh: 48, ow: 128, oh: 128 } });
  const belt = () => ({ url: 'blob:belt', sx: 0, sy: 0, tx: 32, ty: 60, fw: 64, fh: 16, ow: 128, oh: 128 });
  const JOBS = {
    /* a cut body, a chest by address, legs from numbers, the belt: a jog */
    cut: () => ({ body: { bm: R.bitmapOf(64, 96, bodyPx()), ...at }, belt: belt(), worn: [chest(), legs()], dilate: 6, poseInfo: { pose: 'jog', dir: 'northeast', frameIdx: 3 }, ds: 2, crop: true }),
    /* a body by address on a fish frame: the rod */
    fish: () => ({ body: { url: 'blob:body', sx: 0, sy: 0, ...at }, belt: null, worn: [chest()], dilate: 6, poseInfo: { pose: 'fish', dir: 'south', frameIdx: 1 }, ds: 2, crop: false }),
    /* a body from the look's numbers, coloured by its row */
    look: () => ({ look: { sheet: 'look-body', cell: { x: 32, y: 16, w: 64, h: 96, tx: 32, ty: 16, ow: 128, oh: 128 }, row: lookRow(0) }, belt: belt(), worn: [chest(), legs()], dilate: 6, poseInfo: { pose: 'stand', dir: 'east', frameIdx: 0 }, ds: 2 }),
  };

  /* ─── a job watched: every field read (its path), every field the worker wrote ─── */
  const LEAF = (v) => v === null || typeof v !== 'object' || !(Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype);   /* a plain object or an array is followed; a picture, a typed array, a Map is a value */
  const watch = (o, reads, writes, path = '') => new Proxy(o, {
    get(t, p, rcv) {
      const v = Reflect.get(t, p, rcv);
      if (typeof p !== 'string' || typeof v === 'function' || (Array.isArray(t) && p === 'length')) return v;
      const at2 = path + p;
      reads.add(at2);
      return v && typeof v === 'object' && !LEAF(v) ? watch(v, reads, writes, at2 + '.') : v;
    },
    set(t, p, v) { writes.add(path + String(p)); t[p] = v; return true; },
  });
  /* a field's ruling on the lists: the list's word, or undefined (not listed) */
  const ruling = (p) => {
    const s = p.split('.');
    const inputAt = (i) => (s[i] === undefined ? K.NESTED : K.INPUT_FIELDS[s[i]]);
    const own = (list, f) => (Object.prototype.hasOwnProperty.call(list, f) ? list[f] : undefined);
    const top = own(K.JOB_FIELDS, s[0]);
    if (top === undefined || top !== K.NESTED || s.length === 1) return top;
    if (s[0] === 'body' || s[0] === 'belt') return own(K.INPUT_FIELDS, s[1]) === undefined ? undefined : inputAt(1);
    if (s[0] === 'look') return own(K.LOOK_FIELDS, s[1]);
    if (s[0] === 'worn') {
      if (!/^\d+$/.test(s[1])) return undefined;
      if (s.length === 2) return K.NESTED;
      const w = own(K.WORN_FIELDS, s[2]);
      if (w !== K.NESTED || s.length === 3) return w;
      return own(K.INPUT_FIELDS, s[3]) === undefined ? undefined : inputAt(3);
    }
    return undefined;
  };

  /* ─── a login: a fresh worker on `w`, the page's words to it, one job ─── */
  const login = async (w, job) => {
    const wk = await R.freshWorker(ROOT, { files: w.files, idb: FAKE.idb, script: w.script });
    wk.send({ type: 'rod', rod: w.rod });
    for (const [key, s] of Object.entries(w.sheets)) wk.send({ type: 'lookSheet', key, bytes: s.bytes, w: s.w, rows: s.rows, bits: s.bits });
    const ask = K.keepTell({ postMessage: (m) => wk.send(m) }, { on: true, verify: false, ua: w.ua });
    const reads = new Set(), writes = new Set();
    const before = FAKE.store(K.KEEP_DB, 'f').size;
    const reply = await wk.job(watch(job, reads, writes));
    /* the bake is kept after its reply (answerJob): wait for its write to land, a few turns at most */
    let st = await ask();
    for (let i = 0; i < 40 && st && st.misses && st.stored < st.misses; i++) { await new Promise((r) => setTimeout(r, 5)); st = await ask(); }
    st = await ask();
    return { reply, st, reads, writes };
  };
  const same = (a, b) => {
    const bytes = (x) => (x ? Array.from(x.data || x) : null);
    if (!a || !b || a.err || b.err) return false;
    if (a.show || b.show) return JSON.stringify(bytes(a.show)) === JSON.stringify(bytes(b.show)) && JSON.stringify(a.counts) === JSON.stringify(b.counts)
      && !!a.residue === !!b.residue && (!a.residue || JSON.stringify(bytes(a.residue.bitmap)) === JSON.stringify(bytes(b.residue.bitmap)));
    return !!a.bitmap && !!b.bitmap && a.bitmap.width === b.bitmap.width && a.bitmap.height === b.bitmap.height
      && JSON.stringify(bytes(a.bitmap)) === JSON.stringify(bytes(b.bitmap)) && JSON.stringify(a.cell) === JSON.stringify(b.cell);
  };

  /* ─── a change of one input: in the job (by its path) or in the world ─── */
  const bump = (v) => (typeof v === 'number' ? v + 1 : typeof v === 'boolean' ? !v : typeof v === 'string' ? v + 'x' : v);
  const setAt = (o, path, f) => { const s = path.split('.'); let t = o; for (let i = 0; i < s.length - 1; i++) t = t[s[i]]; t[s[s.length - 1]] = f(t[s[s.length - 1]]); };
  const getAt = (o, path) => path.split('.').reduce((t, k) => (t == null ? t : t[k]), o);
  const oneByte = (rgba, w, x, y) => { const a = new Uint8ClampedArray(rgba); a[(y * w + x) * 4] ^= 0x55; return a; };

  for (const [name, make] of Object.entries(JOBS)) {
    const W0 = world();
    const first = await login(W0, make());
    check(`6. ${name}: a first login bakes it and keeps it`, !first.reply.err && !first.reply.raw && first.st && first.st.misses === 1 && first.st.stored === 1, { err: first.reply.err, raw: first.reply.raw, st: first.st && { m: first.st.misses, s: first.st.stored, nokey: first.st.nokey, why: first.st.why } });
    const again = await login(W0, make());
    check(`6. ${name}: the same job at the next login is answered from the store`, again.st && again.st.hits === 1 && again.st.misses === 0, again.st && { h: again.st.hits, m: again.st.misses });
    check(`6. ${name}: ...and the kept answer is the baked one, byte for byte`, same(first.reply, again.reply));

    /* 6a. every read on the lists */
    const unlisted = [...first.reads].filter((p) => ruling(p) === undefined);
    check(`6a. ${name}: every field the worker reads of a job is on the lists`, unlisted.length === 0, unlisted);

    /* 6b. every read the page supplies, changed one at a time: a miss */
    const supplied = [...first.reads].filter((p) => {
      const r = ruling(p);
      if (r === K.NONE || r === K.NESTED || first.writes.has(p)) return false;
      const v = getAt(make(), p);
      return v !== undefined && (LEAF(v));
    });
    const changes = [];
    for (const p of supplied) {
      const r = ruling(p);
      const leaf = p.split('.').pop();
      if (r === K.FILE && leaf === 'url') {
        /* the address: its FILE changed (one byte of its picture), the address kept */
        changes.push([p + ' (its file)', (w) => { const u = getAt(make(), p); const f = w.files.get(u); const px = new Uint8ClampedArray(f.subarray(8)); const ww = f[4] | (f[5] << 8); for (let i = 0; i < px.length; i += 4) if (px[i + 3]) { px[i] ^= 0x55; break; } w.files.set(u, R.fileOf(ww, f[6] | (f[7] << 8), px)); }, null]);
      } else if (r === K.NUMBERS && leaf === 'look') {
        /* a sheet of numbers: its bytes changed, its key kept */
        changes.push([p + ' (its numbers)', (w) => { const k = getAt(make(), p); w.sheets[k] = k === 'gear-legs' ? legsNumbers(9) : bodyNumbers(9); }, null]);
      } else if (p === 'look.sheet') {
        changes.push([p + ' (its numbers)', (w) => { w.sheets['look-body'] = bodyNumbers(9); }, null]);
      } else if (p === 'look.row') {
        changes.push([p, null, (j) => { j.look.row = lookRow(7); }]);
      } else if (r === K.PIXELS && leaf === 'bm') {
        changes.push([p + ' (one byte of its pixels)', null, (j) => { const b = getAt(j, p); setAt(j, p, () => R.bitmapOf(b.width, b.height, oneByte(b.data, b.width, 30, 40))); }]);
      } else if (typeof getAt(make(), p) !== 'object') {
        changes.push([p, null, (j) => setAt(j, p, bump)]);
      } else changes.push([p + ' (no way to change it here)', null, null]);
    }
    /* what the worker reads beside the job */
    if (make().poseInfo.pose === 'fish') changes.push(['the rod', (w) => { w.rod = rodOf(true); }, null]);
    changes.push(['the worker\'s script', (w) => { w.script = SCRIPT.replace('abc123', 'def456'); }, null]);
    changes.push(['the browser', (w) => { w.ua = UA + ' 2'; }, null]);
    const stayed = [];
    for (const [what, inWorld, inJob] of changes) {
      if (!inWorld && !inJob) { stayed.push(what); continue; }
      await login(world(), make());   /* the store holds the job as it was (again after a version change) */
      const w = world();
      if (inWorld) inWorld(w);
      const j = make();
      if (inJob) inJob(j);
      const got = await login(w, j);
      if (!(got.st && got.st.hits === 0 && got.st.misses === 1)) stayed.push(what + (got.st ? ` (hits ${got.st.hits}, misses ${got.st.misses}, no key ${got.st.nokey})` : ' (no answer)'));
    }
    check(`6b. ${name}: each of its ${changes.length} inputs changed alone, the next login bakes it (the key changed)`, stayed.length === 0 && changes.length > 8, stayed);
  }
  /* the same file at another address is the same bake (what is drawn, not where it came from) */
  {
    await login(world(), JOBS.fish());
    const w = world();
    w.files.set('blob:body2', w.files.get('blob:body'));
    const j = JOBS.fish(); j.body.url = 'blob:body2';
    const got = await login(w, j);
    check('6. the same file at another address is answered from the store', got.st && got.st.hits === 1, got.st && { h: got.st.hits, m: got.st.misses });
  }
  check('6. the page never opens the store (the worker\'s alone)', /self\.indexedDB/.test(read('src/rendering/maskedBakeWorker.js')) && !/indexedDB/.test(RENDER));

  /* ═══ 7. the store, on the stand-in IndexedDB ═══ */
  const frame = (n) => ({ t: 'px', w: 8, h: 8, px: new Uint8ClampedArray(256).fill(n & 255), cell: null, belt: false });
  const onDisk = (F, db) => { let b = 0; for (const r of F.store(db, 'i').values()) b += r.b || 0; return { b, f: F.store(db, 'f').size, i: F.store(db, 'i').size }; };
  {
    const F = R.fakeIdb();
    const one = K.keptBytes(frame(0)), cap = one * 10;
    let s = K.keepStore(F.idb, 'v-a', cap);
    for (let i = 0; i < 25; i++) await s.put('k' + i, frame(i));
    let d = onDisk(F, K.KEEP_DB);
    check('7. the store never holds more than its cap on the disk', d.b <= cap && d.f === d.i && d.f > 0 && s.state.bytes <= cap, { d, cap });
    check('7. ...letting go of the least lately used (the newest kept, the first gone)', !!(await s.get('k24')) && (await s.get('k0')) === null);
    s = K.keepStore(F.idb, 'v-a', cap);   /* the next login: the index read back, the cap still held */
    for (let i = 25; i < 40; i++) await s.put('k' + i, frame(i));
    d = onDisk(F, K.KEEP_DB);
    check('7. ...across logins', d.b <= cap && d.f === d.i, { d, cap });
  }
  {
    const F = R.fakeIdb();
    let s = K.keepStore(F.idb, 'v-a', 1e9);
    await s.put('k', frame(1));
    s = K.keepStore(F.idb, 'v-a', 1e9);
    check('7. the same version serves what it kept', !!(await s.get('k')));
    s = K.keepStore(F.idb, 'v-b', 1e9);
    check('7. another version never serves a bake kept by the last', (await s.get('k')) === null);
    check('7. ...and the store is emptied', onDisk(F, K.KEEP_DB).f === 0 && onDisk(F, K.KEEP_DB).i === 0, onDisk(F, K.KEEP_DB));
    s = K.keepStore(F.idb, 'v-a', 1e9);
    check('7. ...going back does not bring it back', (await s.get('k')) === null);
  }
  {
    const F = R.fakeIdb();
    const s = K.keepStore(F.idb, 'v-a', 1e9);
    await s.put('k', frame(1));
    F.ctl.throwOn = 'get';
    const g = await s.get('k');
    F.ctl.throwOn = null;
    const ops = F.ctl.ops.length;
    const p = await s.put('k2', frame(2));
    check('7. a store that throws is off for the session: a miss, and nothing more written', g === null && s.state.off === true && p === false && F.ctl.ops.length === ops && (await s.get('k')) === null, { g: !!g, off: s.state.off, p, wrote: F.ctl.ops.length - ops });
    const F2 = R.fakeIdb();
    const s2 = K.keepStore(F2.idb, 'v-a', 1e9);
    await s2.put('k', frame(1));
    F2.ctl.throwOn = 'put';
    const p2 = await s2.put('k2', frame(2));
    F2.ctl.throwOn = null;
    check('7. ...a write that throws too', p2 === false && s2.state.off === true && (await s2.get('k')) === null);
  }
}

console.log(failed ? `\n${failed} FAILED` : '\nbake-keep: all ok');
process.exit(failed ? 1 : 0);
