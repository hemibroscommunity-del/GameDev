/* A MONSTER STRIP'S NUMBERS KEPT DEFLATED A FRAME AT A TIME -- v2.3.5257
 * (card P's backlog, the fire goblin: the planning session's road A';
 * docs/specs/asset-door.md part 5).
 *
 * src/rendering/inflateRaw.js and src/rendering/framePack.js import nothing
 * of Pixi's and run here in node (its zlib and its CompressionStream):
 *   1. the inflater against known streams: a stored block, a fixed-code
 *      block and a dynamic one, written out byte by byte;
 *   2. ...and against node's zlib at every level and strategy (stored,
 *      fixed, dynamic, Huffman only, runs), past 64 KB (more than one
 *      block), empty and one byte, and a strip-like frame; and against
 *      CompressionStream('deflate-raw'), the pack's own deflater;
 *   3. it FAILS CLOSED: every truncation of a stream, a wrong length either
 *      way, garbage, and every single flipped bit of a stream give null or
 *      exactly `outLen` bytes, never a throw (a hit then has no pin and no
 *      chip for that frame, never a throw mid-hit);
 *   4. the pack: a strip drawn is packed (its numbers let go of), every
 *      frame read back is the same bytes, a reader reads the same pixels
 *      (heldNumbers.js readSourceRect), the cache keeps its cap (frames and
 *      bytes, least recently used out), past a task's budget a stuck arrow's
 *      frame waits for the next task and is unpacked there while a hit's
 *      chips never wait, the strip unpacked whole is byte for
 *      byte what it was (padding and all), a strip not yet drawn waits, a
 *      frame that will not unpack reads as nothing (no throw), a strip whose
 *      frames reach outside it is declined and kept;
 *   4b. the reader's worker (png8Worker.js) deflates a strip's pieces and
 *      checks each comes back as the bytes it was handed; a piece that does
 *      not come back is refused;
 *   5. the wiring: both of the strip door's roads ask for the pack, the chip
 *      upload and the region reader unpack first, readSourceRect reads a
 *      packed frame, pixiApp starts it with the rebuild's restorer, its
 *      switch has its row.
 */
import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const same = (a, b) => !!a && !!b && a.length === b.length && Buffer.compare(Buffer.from(a.buffer, a.byteOffset, a.length), Buffer.from(b.buffer, b.byteOffset, b.length)) === 0;
const hex = (h) => new Uint8Array(Buffer.from(h, 'hex'));
const rnd = (n, seed) => { let s = seed >>> 0; const a = new Uint8Array(n); for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; a[i] = s >>> 24; } return a; };
/* a frame like a monster's: see-through round a body of a few colours in runs */
function frameLike(w, h, seed) {
  const r = rnd(w * h, seed), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x - w / 2, dy = y - h / 2;
    if (dx * dx + dy * dy < (w * h) / 9) out[y * w + x] = 1 + ((x >> 3) + (y >> 2) + (r[y * w + x] < 30 ? 1 : 0)) % 40;
  }
  return out;
}

const { inflateRawSync } = await import('../../src/rendering/inflateRaw.js');
const enc = (s) => new TextEncoder().encode(s);

/* ── 1. known streams ── */
{
  /* a stored block: BFINAL 1, BTYPE 00, LEN 5, NLEN ~5, "hello" */
  check('a stored block, written out', same(inflateRawSync(hex('010500faff68656c6c6f'), 5), enc('hello')));
  /* fixed codes: "hello, hello, hello!" (zlib, Z_FIXED) */
  check('a fixed-code block, written out', same(inflateRawSync(hex('cb48cdc9c9d751c840a21401'), 20), enc('hello, hello, hello!')));
  /* dynamic codes (zlib level 9) */
  const t = 'abcabcabcabcabcabcabcabc the quick brown fox jumps over the lazy dog, the quick brown fox';
  check('a dynamic-code block, written out',
    same(inflateRawSync(hex('4b4c4a4ec486144a3252150a4b3393b315928af2cbf314d2f22b14b24a730b8a15f2cb528bc0d2398955950a29f9e93ad8140300'), t.length), enc(t)));
}

/* ── 2. against zlib and CompressionStream ── */
{
  const C = zlib.constants;
  const inputs = [
    ['random 70 KB', rnd(70000, 7)], ['zeros 40 KB', new Uint8Array(40000)], ['three bytes', new Uint8Array([1, 2, 3])],
    ['one byte', new Uint8Array([200])], ['empty', new Uint8Array(0)], ['a 256 px frame', frameLike(256, 256, 11)],
    ['a 132 x 197 frame', frameLike(132, 197, 5)],
  ];
  let ok = 0, bad = [];
  for (const level of [0, 1, 6, 9]) for (const strategy of [C.Z_DEFAULT_STRATEGY, C.Z_FILTERED, C.Z_HUFFMAN_ONLY, C.Z_RLE, C.Z_FIXED]) {
    for (const [name, data] of inputs) {
      const z = zlib.deflateRawSync(data, { level, strategy });
      if (same(inflateRawSync(new Uint8Array(z), data.length), data)) ok++; else bad.push(`${name} level ${level} strategy ${strategy}`);
    }
  }
  check(`node's zlib, every level and strategy: ${ok} streams back exactly`, bad.length === 0, bad);
  const cs = async (data) => new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  let csOk = 0;
  for (const [, data] of inputs) if (same(inflateRawSync(await cs(data), data.length), data)) csOk++;
  check(`CompressionStream('deflate-raw'), the pack's own: ${csOk} of ${inputs.length} back exactly`, csOk === inputs.length);
}

/* ── 3. it fails closed ── */
{
  const data = frameLike(64, 64, 3);
  const z = new Uint8Array(zlib.deflateRawSync(data, { level: 6 }));
  let threw = 0, notNull = 0;
  for (let n = 0; n < z.length; n++) {
    try { if (inflateRawSync(z.subarray(0, n), data.length) !== null) notNull++; } catch (e) { threw++; }
  }
  check(`every truncation of a stream (${z.length} of them): null, never a throw`, threw === 0 && notNull === 0, { threw, notNull });
  const stored = new Uint8Array(zlib.deflateRawSync(rnd(3000, 4), { level: 0 }));
  let sThrew = 0, sNotNull = 0;
  for (let n = 0; n < stored.length; n += 7) { try { if (inflateRawSync(stored.subarray(0, n), 3000) !== null) sNotNull++; } catch (e) { sThrew++; } }
  check('...a stored stream cut anywhere too', sThrew === 0 && sNotNull === 0, { sThrew, sNotNull });
  check('a length one short: null', inflateRawSync(z, data.length - 1) === null);
  check('a length one long: null', inflateRawSync(z, data.length + 1) === null);
  let gThrew = 0;
  for (let s = 1; s < 200; s++) { try { inflateRawSync(rnd(64 + s, s), 4096); } catch (e) { gThrew++; } }
  check('garbage: never a throw', gThrew === 0, { gThrew });
  check('no stream at all, or no length: null', inflateRawSync(null, 10) === null && inflateRawSync(z, -1) === null && inflateRawSync(z, NaN) === null);
  /* every single bit flipped: null, or exactly outLen bytes (a flip a code
     still reads is caught at pack time, where every frame is read back) */
  let fThrew = 0, fWrong = 0;
  for (let i = 0; i < z.length * 8; i++) {
    const c = z.slice(); c[i >> 3] ^= 1 << (i & 7);
    try { const o = inflateRawSync(c, data.length); if (o !== null && o.length !== data.length) fWrong++; } catch (e) { fThrew++; }
  }
  check(`every single bit flipped (${z.length * 8}): null or the length asked, never a throw`, fThrew === 0 && fWrong === 0, { fThrew, fWrong });
}

/* ── 4. the pack ── */
{
  globalThis.ImageData = class ImageData { constructor(data, w, h) { this.data = data; this.width = w; this.height = h; } };
  const FP = await import('../../src/rendering/framePack.js');
  const { readSourceRect } = await import('../../src/rendering/heldNumbers.js');
  check('on by default where the page can deflate', FP.FRAME_PACK === true);
  /* a strip as picsNumbers.js makes one: cells packed side by side, the rows
     padded out to the stride with their last pixel */
  const pal = new Uint32Array(256);
  for (let i = 1; i < 256; i++) pal[i] = (0xff000000 | (i * 2654435761)) >>> 0;
  let uid = 100;
  function strip(cellsWH, seed) {
    let W = 0; const H = Math.max(...cellsWH.map((c) => c[1]));
    const cells = cellsWH.map(([w, h]) => { const c = { x: W, y: 0, width: w, height: h }; W += w; return c; });
    const st = (W + 3) & ~3;
    const idx = new Uint8Array(st * H);
    cellsWH.forEach(([w, h], k) => {
      const f = frameLike(w, h, seed + k);
      for (let y = 0; y < h; y++) idx.set(f.subarray(y * w, (y + 1) * w), y * st + cells[k].x);
    });
    for (let y = 0; y < H; y++) for (let x = W; x < st; x++) idx[y * st + x] = idx[y * st + W - 1];
    const ends = [];
    const src = { uid: uid++, label: 'test-strip', resource: idx, destroyed: false, _gpuData: {}, options: {},
      _btPal: { row: 3, w: W, h: H, stride: st, rgba: new Uint8Array(1024) }, _btNumbers: { w: st, h: H, idx, pal },
      once: (ev, fn) => { if (ev === 'destroy') ends.push(fn); } };
    return { src, cells, idx: idx.slice(), ends };
  }
  const R = { uid: 1, gl: { isContextLost: () => false } };
  const restorers = [];
  const A = strip([[230, 250], [241, 256], [255, 199], [256, 256], [120, 90], [0, 0], [256, 256], [200, 256], [256, 240], [250, 250], [256, 256], [248, 255], [233, 256], [256, 256], [200, 200]], 21);
  const B = strip([[64, 64], [64, 64]], 99);
  const Cbad = strip([[64, 64]], 7);
  FP.wantFramePack(A.src, A.cells);
  FP.wantFramePack(B.src, B.cells);
  FP.wantFramePack(Cbad.src, [{ x: 10, y: 0, width: 64, height: 64 }]);   /* reaches past the strip */
  A.src._gpuData[1] = {}; Cbad.src._gpuData[1] = {};   /* B is not drawn yet */
  FP.startFramePack(R, { addEventListener: () => {} }, (fn) => restorers.push(fn));
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !(A.src.__btFP && Cbad.src.__btFPNo)) await new Promise((r) => setTimeout(r, 100));
  check('a strip the chip has drawn is packed: its numbers let go of', !!A.src.__btFP && A.src.resource.length === 0 && A.src._btNumbers === null,
    { fp: !!A.src.__btFP, res: A.src.resource.length });
  const kb = A.src.__btFP ? A.src.__btFP.bytes / 1024 : 0;
  console.log(`    ${(A.idx.length / 1024).toFixed(0)} KB of numbers held as ${kb.toFixed(0)} KB`);
  check('...in less than it was', kb > 0 && kb * 1024 < A.idx.length / 2, { kb });
  check('...in its frames and bands of rows of at most 64 KB (what lies between and beside them)', A.src.__btFP.bands.length > 1 && A.src.__btFP.bands.every((b) => (b.y1 - b.y0) * A.src.__btFP.st <= 65536), A.src.__btFP.bands.length);
  check('...deflated on the page here (node has no worker), a piece a task', FP.framePackStats().onWorker === 0);
  check('a strip not drawn yet keeps its numbers', B.src.resource.length === B.idx.length && !!B.src._btNumbers && !B.src.__btFP);
  check('a strip whose frames reach outside it is declined and kept', !!Cbad.src.__btFPNo && same(Cbad.src.resource, Cbad.idx) && !Cbad.src.__btFP);
  check('the rebuild\'s restorer is handed in once', restorers.length === 1);
  /* every frame back, exactly */
  let fOk = 0, fN = 0;
  const st = A.src._btPal.stride;
  for (const c of A.cells) {
    if (!(c.width > 0)) continue;
    fN++;
    const f = FP.packedFrame(A.src, c.x, c.y, c.width, c.height);
    let ok = !!f && f.x === c.x && f.y === c.y;
    for (let y = 0; ok && y < c.height; y++) ok = same(f.nums.idx.subarray(y * c.width, (y + 1) * c.width), A.idx.subarray((c.y + y) * st + c.x, (c.y + y) * st + c.x + c.width));
    if (ok) fOk++;
  }
  check(`every frame read back is the same bytes (${fOk} of ${fN})`, fOk === fN);
  check('a rectangle inside no one frame: nothing', FP.packedFrame(A.src, A.cells[0].x + 200, 0, 60, 10) === null);
  /* a reader: the same pixels through readSourceRect */
  const puts = [];
  const ctx = { putImageData: (img, x, y) => puts.push({ img, x, y }), drawImage: () => { throw new Error('no picture to draw'); } };
  const c3 = A.cells[3];
  const okRead = readSourceRect(ctx, A.src, c3.x + 10, c3.y + 20, 100, 80, 0, 0, 'pin');
  let pxOk = okRead && puts.length === 1;
  if (pxOk) {
    const o32 = new Uint32Array(puts[0].img.data.buffer);
    for (let y = 0; pxOk && y < 80; y++) for (let x = 0; x < 100; x++) if (o32[y * 100 + x] !== pal[A.idx[(c3.y + 20 + y) * st + c3.x + 10 + x]]) { pxOk = false; break; }
  }
  check('a reader (readSourceRect) reads the same pixels from a packed frame', pxOk);
  /* the cache's cap */
  for (const c of A.cells) if (c.width > 0) FP.packedFrame(A.src, c.x, c.y, c.width, c.height);
  const s1 = FP.framePackStats();
  check(`the readers' cache keeps its cap (${s1.cache.frames} frames, ${s1.cache.kb} KB; cap ${FP.CACHE_FRAMES} frames, ${FP.CACHE_BYTES / 1024} KB)`,
    s1.cache.frames <= FP.CACHE_FRAMES && s1.cache.kb <= FP.CACHE_BYTES / 1024 && s1.cache.frames > 0, s1.cache);
  const last = A.cells[A.cells.length - 1];
  const h0 = s1.hits;
  FP.packedFrame(A.src, last.x, last.y, last.width, last.height);
  check('...the frame read last is kept (read again: no unpacking)', FP.framePackStats().hits === h0 + 1);
  const m0 = FP.framePackStats().misses;
  FP.packedFrame(A.src, A.cells[0].x, A.cells[0].y, A.cells[0].width, A.cells[0].height);
  check('...the least recently used went first (the first frame is unpacked again)', FP.framePackStats().misses === m0 + 1);
  /* the spread: past the task's budget a stuck arrow's cold frame waits for
     the next task, unpacked there; a hit's chips never wait.  (The cache now
     holds frames 3-13 and 0: 1 and 2 are cold.) */
  const nextTask = () => new Promise((r) => setTimeout(r, 0));
  const cell = (i) => A.cells.filter((c) => c.width > 0)[i];
  const rd = (i, who) => { const c = cell(i); return FP.packedFrame(A.src, c.x, c.y, c.width, c.height, who); };
  FP.setUnpackBudget(1e-9);
  await nextTask(); await nextTask();
  const d0 = FP.framePackStats();
  const p1 = rd(1, 'pin'), p2 = rd(2, 'pin');
  const d1 = FP.framePackStats();
  check('a task\'s first cold frame is unpacked for an arrow at once', !!p1 && d1.misses === d0.misses + 1);
  check('...past the budget the next arrow\'s frame waits (nothing to read this task)', p2 === null && d1.deferred === d0.deferred + 1, { d0, d1 });
  await nextTask(); await nextTask();
  const d2 = FP.framePackStats();
  const p2b = rd(2, 'pin');
  check('...and is unpacked in the next task, there for the arrow\'s next frame', d2.warmed === d0.warmed + 1 && !!p2b && FP.framePackStats().hits === d2.hits + 1, { d2 });
  await nextTask();
  const d3 = FP.framePackStats();
  const k3 = rd(3, 'chips'), k4 = rd(4, 'chips');
  check('a hit\'s chips never wait, past the budget or not', !!k3 && !!k4 && FP.framePackStats().deferred === d3.deferred && FP.framePackStats().misses === d3.misses + 2);
  FP.setUnpackBudget(FP.UNPACK_MS);
  check('what the strip holds counts its frames in the cache', FP.framePackHeld(A.src) > A.src.__btFP.bytes);
  /* the whole strip back, exactly, padding and all; packed again once drawn */
  check('QA\'s view of the numbers is the strip exactly, leaving it packed', same(FP.stripNumbersOf(A.src).idx, A.idx) && !!A.src.__btFP);
  check('a chip about to be sent it: the strip whole again, byte for byte', FP.unpackFrames(A.src) === true && same(A.src.resource, A.idx) && same(A.src._btNumbers.idx, A.idx) && !A.src.__btFP);
  const t1 = Date.now();
  while (Date.now() - t1 < 15000 && !A.src.__btFP) await new Promise((r) => setTimeout(r, 100));
  check('...and packed again once the chip has it', !!A.src.__btFP && A.src.resource.length === 0);
  const rr = restorers[0]();
  check('the rebuild\'s restorer unpacks every strip, a slice at a time (it is waited for)', typeof (rr && rr.then) === 'function' && (await rr) === 0 && same(A.src.resource, A.idx) && !A.src.__btFP);
  while (Date.now() - t1 < 30000 && !A.src.__btFP) await new Promise((r) => setTimeout(r, 100));
  /* a frame that will not unpack: nothing to read, never a throw */
  const c5 = A.src.__btFP.cells.find((c) => c.x === A.cells[6].x);
  c5.z = c5.z.subarray(0, c5.z.length >> 1);
  for (const c of A.cells.slice(7)) if (c.width > 0) FP.packedFrame(A.src, c.x, c.y, c.width, c.height);   /* out of the cache */
  let threw = false, r = true;
  try { r = readSourceRect(ctx, A.src, A.cells[6].x, 0, 50, 50, 0, 0, 'chips'); } catch (e) { threw = true; }
  check('a frame that will not unpack: the reader gets nothing, never a throw', !threw && r === false);
  check('...and the strip will not be unpacked whole from it either (the chip keeps what it has)', FP.unpackFrames(A.src) === false);
  /* its end */
  for (const fn of A.ends) fn();
  const s2 = FP.framePackStats();
  check('a strip destroyed is forgotten, its frames out of the cache', s2.packedNow === 0 && s2.cache.frames === 0 && s2.waiting === 1, s2);
}

/* ── 4b. the reader's worker (png8Worker.js), as the page hands it a strip's
   pieces: each deflated, and checked there to come back as the very bytes
   it was handed; a piece that does not come back is refused, never handed
   back as good ── */
{
  const posted = [];
  const realSelf = globalThis.self;
  globalThis.self = { location: { href: 'http://localhost/' }, postMessage: (m) => posted.push(m) };
  await import('../../src/rendering/png8Worker.js');
  const onmessage = globalThis.self.onmessage;
  const pieces = [frameLike(256, 256, 41), new Uint8Array(65536), frameLike(120, 90, 42)];
  await onmessage({ data: { id: 7, deflate: pieces.map((u) => u.slice()) } });
  const m = posted.pop();
  const back = m && m.zs ? m.zs.map((z, i) => same(inflateRawSync(z, pieces[i].length), pieces[i])) : [];
  check('the worker deflates a strip\'s pieces and checks each comes back (checked: true)', !!m && m.ok === true && m.checked === true && back.length === 3 && back.every(Boolean), m && { ok: m.ok, checked: m.checked });
  /* a deflater that drops a byte: the piece does not come back, and is refused */
  const RealCS = globalThis.CompressionStream;
  globalThis.CompressionStream = class { constructor(f) { const cs = new RealCS(f); let first = true; this.readable = cs.readable.pipeThrough(new TransformStream({ transform(ch, ctl) { if (first && ch.length > 8) { first = false; const c = ch.slice(); c[5] ^= 0x40; ctl.enqueue(c); } else ctl.enqueue(ch); } })); this.writable = cs.writable; } };
  await onmessage({ data: { id: 8, deflate: [frameLike(256, 256, 43)] } });
  globalThis.CompressionStream = RealCS;
  const m2 = posted.pop();
  check('...a piece that does not come back is refused (no: true), never handed back as good', !!m2 && m2.ok === false && m2.no === true && !m2.zs, m2);
  globalThis.self = realSelf;
}

/* ── 5. the wiring ── */
{
  const zt = read('src/rendering/zoneTextures.js');
  check('both of the strip door\'s roads ask for the pack (zoneTextures.js)', (zt.match(/wantFramePack\(numSrc, frames\.map\(\(t\) => t\.frame\)\)/g) || []).length === 2);
  check('the chip upload unpacks a packed strip first (paletteTex.js)', /source\.__btFPUnpack\(source\)/.test(read('src/rendering/paletteTex.js')));
  check('the region reader unpacks it first (paletteDraw.js)', /src\.__btFPUnpack\(src\)/.test(read('src/rendering/paletteDraw.js')));
  check('readSourceRect reads a packed frame (heldNumbers.js)', /source\.__btFPRead\(source, sx, sy, sw, sh, who\)/.test(read('src/rendering/heldNumbers.js')));
  check('pixiApp starts it with the rebuild\'s restorer', /startFramePack\(app\.renderer, canvas, addPictureRestorer\)/.test(read('src/rendering/pixiApp.js')));
  check('?framepack has its switch row', /framepack/.test(read('tools/guards/lib/switches.mjs')));
  check('the census counts a packed strip\'s numbers as what it holds (memprobe.mjs)', /__btFramePackHeld\(s\)/.test(read('tools/qa/mp/memprobe.mjs')));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
