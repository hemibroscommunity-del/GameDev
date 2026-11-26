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
 *   6. the worker makes the key first (takeJob > keyFirst) and answers a
 *      kept job from the store; a job with no key, or not kept, is baked, and
 *      kept only when every sheet it drew is the file its key read -- read
 *      from maskedBakeWorker.js.
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

/* 6. the worker's road */
{
  const wk = read('src/rendering/maskedBakeWorker.js');
  check('6. takeJob makes the key first, before any sheet is read', /function takeJob\(j\) \{[\s\S]{0,400}if \(!j\._keyTried && keepReady\(\)\) \{ j\._keyTried = true; keyFirst\(j\); return; \}/.test(wk));
  check('6. a kept job is answered from the store (fromKept, postReply)', /async function keyFirst\(j\)[\s\S]*?const v = await keep\.store\.get\(key\);[\s\S]*?out = fromKept\(j, v\);[\s\S]*?postReply\(j, out\);/.test(wk));
  check('6. a job with a key and not kept is baked, then kept', /const b = j\.look \? lookNow\(j, !!key\) : runJob\(j, !!key\);/.test(wk) && /if \(key && b\.kept && keepReady\(\)\) keep\.store\.put\(key, b\.kept\)/.test(wk));
  check('6. kept only when the sheet drawn is the file the key read (urlInputs drops the key)', /if \(!want \|\| !got \|\| want\.length !== got\.length \|\| want\.some\(\(v, k\) => v !== got\[k\]\)\) j\._key = null;/.test(wk));
  check('6. the keep is off until the page says (`keep.on` starts false)', /const keep = \{ on: false,/.test(wk));
  check('6. the worker keeps its store itself (IndexedDB from the worker)', /self\.indexedDB/.test(wk) && !/indexedDB/.test(RENDER));
}

console.log(failed ? `\n${failed} FAILED` : '\nbake-keep: all ok');
process.exit(failed ? 1 : 0);
