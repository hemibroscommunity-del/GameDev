/* ═══ v2.3.6761: THE BAKES ARE KEPT (card LOAD, PR 2) ═══
 *
 * The owner, 2026-11-26: "How do I speed up the game in terms of having
 * let's say something like a cache that has already been preloaded?", and
 * their Loading times from their iPhone: the loading screen up 21.3 s, its
 * 20 s limit and the fade, while the pictures were ready at 11.9 s.  It was
 * waiting for the armour's masked body frames (pixiRenderer.js
 * preloadPlayerAssets, the step `masks`), which the bake worker
 * (src/rendering/maskedBakeWorker.js) made again at EVERY login: on the test
 * box a character in the copper torso and greaves had 10 of 177 frames at
 * the lift, 93 of 177 ninety seconds later.
 *
 * The bake is a pure pixel function of its inputs (maskedBake.js's header),
 * so the worker now keeps what it makes, on the phone's DISK (IndexedDB,
 * opened from the worker: nothing of it runs on the page's thread), and
 * answers a job it has kept from there.  What is read back is held exactly
 * as a baked frame is today (the same reply, the same canvas on the page):
 * nothing more in the page's memory.  docs/specs/bake-keep.md.
 *
 * THIS FILE: the key and the store's rules.  No imports, so node tests it
 * (tools/guards/bake-keep.test.mjs); the worker and the page import it.
 *
 * THE KEY is made from the job AS THE WORKER RECEIVES IT, every field of it:
 *   - an input (the body, the belt, each worn piece) by what the bake
 *     draws: a sheet by its address by the digest of its FILE's bytes (as
 *     fetched: the worker decodes that file) and the rectangle in it; a
 *     frame of the gear's numbers by the digest of the sheet's numbers and
 *     its cell; a bitmap cut on the page by its PIXELS; and its placing
 *     (tx, ty, fw, fh, ow, oh).  A file is digested, not its picture read
 *     back: measured in the game on the test box, reading the pictures back
 *     cost about 2 s a job, a busy graphics chip's queue (the spec);
 *   - a body drawn from the look's numbers by the frame those numbers make
 *     in the look's colours (lookFrameRGBA: what lookBake.js reads) and its
 *     cell;
 *   - each worn piece's name, the dilate, the pose and frame, the display
 *     step, the crop;
 *   - the rod's mask on a fish frame;
 *   - the bake's own version: KEEP_V here, the worker's script (its file
 *     name carries a hash of its code in a build: any change to the bake
 *     makes a new name) and the browser (its canvas draws the bake).
 * A field of the job or an input that is NOT in the lists below makes no key
 * (the job is baked, as today): a field added to the job later cannot be
 * forgotten by the key, only make it bake (the guard plants one).
 *
 * THE STORE: a cap (KEEP_CAP_MB, about four armour sets, measured: the
 * spec), the least lately used let go past it; a version (KEEP_V and the
 * worker's script and browser) that empties it when it changes.  No store
 * (private mode, a full disk, an old browser) or one that throws: the keep
 * is off for the session and every job bakes, silently.  A value that does
 * not read back whole (keptOk) is baked again and replaced.  When in doubt,
 * bake: never a wrong picture.
 *
 * `?bakekeep=0` (the switch table's row, read by the page through
 * src/game/switches.js): today's behaviour, nothing read from or written to
 * the store.  The worker keeps nothing until the page has told it the switch
 * (keepTell), so a job that arrives first is baked as today.
 */

/** The keep's own version: bump it to empty every phone's store. */
export const KEEP_V = 1;
/** The store's name (IndexedDB, the worker's alone). */
export const KEEP_DB = 'bt-bakekeep';
/** The cap: about four armour sets (a drawn bro's set measured ~4.5 MB raw:
 *  docs/specs/bake-keep.md), on the phone's disk, not in its memory. */
export const KEEP_CAP_MB = 20;
export const KEEP_CAP_BYTES = KEEP_CAP_MB * 1024 * 1024;

/* ═══ WHAT THE KEY READS ═══
   Each field of a job, of an input and of a worn entry: `key` (its value is
   in the key), `pixels` (it says WHERE the pixels are; the pixels read are in
   the key), `nested` (an object read by its own list), or `none` (with why).
   Any other field: no key. */
export const JOB_FIELDS = Object.freeze({
  id: 'none',            /* the page's number for the reply */
  body: 'nested',        /* an input (INPUT_FIELDS) */
  belt: 'nested',        /* an input, or null */
  worn: 'nested',        /* [{ k, inp }] (WORN_FIELDS) */
  look: 'nested',        /* a body from the look's numbers (LOOK_FIELDS) */
  dilate: 'key',
  poseInfo: 'key',
  ds: 'key',
  crop: 'key',
  _urlRead: 'none',      /* the worker's own mark: its addresses read */
  _sheets: 'none',       /* the worker's own list: the sheets it holds */
  _qa: 'none',           /* QA: the address read against the page's cut */
  _keyTried: 'none', _key: 'none', _verifyOut: 'none', _files: 'none', _numbersSeen: 'none',   /* the keep's own marks on a job */
});
export const INPUT_FIELDS = Object.freeze({
  bm: 'pixels',                               /* a bitmap cut on the page: its pixels */
  lb: 'numbers',                              /* the worker's picture of a frame of numbers, made from them */
  url: 'file',                                /* a sheet by address: its FILE's bytes are read (read.file) */
  ub: 'file',                                 /* ...and decoded from that file by the worker */
  sx: 'key', sy: 'key',                       /* where in that sheet */
  look: 'numbers', cell: 'key',               /* a frame of the gear's numbers: its sheet's digest (read.numbers) and its cell */
  tx: 'key', ty: 'key', fw: 'key', fh: 'key', ow: 'key', oh: 'key',
  qaBm: 'none',          /* QA: the page's own cut, compared, never drawn */
});
export const WORN_FIELDS = Object.freeze({ k: 'key', inp: 'nested' });
export const LOOK_FIELDS = Object.freeze({
  sheet: 'pixels', row: 'pixels',   /* the frame in the look's colours is read */
  cell: 'key',
});

const known = (o, list) => {
  if (!o || typeof o !== 'object') return true;
  for (const f of Object.keys(o)) if (!Object.prototype.hasOwnProperty.call(list, f)) return false;
  return true;
};

/* a value as text, its keys sorted (the same object, the same text) */
export function stableText(v) {
  if (v === undefined) return 'u';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (ArrayBuffer.isView(v)) return '[' + Array.prototype.join.call(v, ',') + ']';
  if (Array.isArray(v)) return '[' + v.map(stableText).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stableText(v[k])).join(',') + '}';
}

const asText = (s) => {
  const t = String(s);
  const out = new Uint8Array(t.length * 2);
  for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); out[i * 2] = c & 255; out[i * 2 + 1] = c >> 8; }
  return out;
};
const asBytes = (b) => (b instanceof Uint8Array ? b : new Uint8Array(b.buffer, b.byteOffset, b.byteLength));

/**
 * The parts of a job's key, in order, or null (no key: bake).
 *   read.pixels(inp)  -> the input's pixels as the bake draws them (RGBA), or null
 *   read.file(url)    -> the digest of a sheet's file, as fetched, or null
 *   read.numbers(key) -> the digest of a sheet of the gear's numbers, or null
 *   read.look(look)   -> { rgba, pm } of a body from the look's numbers, or null
 *   read.rod()        -> the fish rod's mask as bytes, or null
 *   read.build        -> the bake's version text (KEEP_V, the script, the browser)
 */
export function keyParts(j, read) {
  if (!j || typeof j !== 'object' || !read) return null;
  if (!known(j, JOB_FIELDS)) return null;
  const parts = [];
  const add = (name, bytes) => { parts.push(asText(name + ':' + bytes.length + ':')); parts.push(asBytes(bytes)); };
  const val = (name, v) => add(name, asText(stableText(v)));
  const input = (name, inp) => {
    if (inp == null) { val(name, null); return true; }
    if (!known(inp, INPUT_FIELDS)) return false;
    if (inp.look != null) {
      /* a frame of the gear's numbers: the digest of the sheet's numbers and
         the cell (the worker colours it from them, lookBitmap: no picture read back) */
      const nb = read.numbers(inp.look);
      if (!nb) return false;
      val(name + '.cell', inp.cell);
      add(name + '.numbers', nb);
    } else if (inp.url != null) {
      /* a sheet by address: the digest of the file's own bytes, and the
         rectangle in it -- no picture read back (on a phone, or a busy
         graphics chip, a read-back waits behind the frame being drawn) */
      const fb = read.file(inp.url);
      if (!fb) return false;
      val(name + '.rect', [inp.sx, inp.sy]);
      add(name + '.file', fb);
    } else {
      const px = read.pixels(inp);
      if (!px) return false;   /* nothing to draw is not a picture: bake */
      add(name + '.px', px);
    }
    val(name + '.at', [inp.tx, inp.ty, inp.fw, inp.fh, inp.ow, inp.oh]);
    return true;
  };
  if (j.body != null && j.look != null) return null;   /* never both: not a job this knows */
  val('v', read.build == null ? null : String(read.build));
  val('job', [j.dilate, j.poseInfo, j.ds, j.crop]);
  if (j.look != null) {
    if (!known(j.look, LOOK_FIELDS)) return null;
    const f = read.look(j.look);
    if (!f || !f.rgba) return null;
    val('look.cell', j.look.cell);
    add('look.rgba', f.rgba);
    add('look.pm', f.pm || new Uint8Array(0));
  } else if (!input('body', j.body)) return null;
  if (!input('belt', j.belt)) return null;
  const worn = j.worn || [];
  if (!Array.isArray(worn)) return null;
  val('worn.n', worn.length);
  for (let i = 0; i < worn.length; i++) {
    const w = worn[i];
    if (!w || !known(w, WORN_FIELDS)) return null;
    val('worn' + i + '.k', w.k);
    if (!input('worn' + i, w.inp)) return null;
  }
  /* the rod is read by a fish frame only (maskedBake.js `_rodF`) */
  const fish = !!(j.poseInfo && j.poseInfo.pose === 'fish');
  if (fish) { const r = read.rod(); add('rod', r || new Uint8Array(0)); }
  return parts;
}

/** The key: SHA-256 of the parts, as hex.  `digest(bytes)` -> ArrayBuffer. */
export async function keyOf(parts, digest) {
  if (!parts || typeof digest !== 'function') return null;
  let n = 0;
  for (const p of parts) n += p.length;
  const all = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { all.set(p, o); o += p.length; }
  const h = new Uint8Array(await digest(all));
  let s = '';
  for (let i = 0; i < h.length; i++) s += (h[i] < 16 ? '0' : '') + h[i].toString(16);
  return s;
}

/* ═══ WHAT IS KEPT ═══
   A frame of a picture: { t: 'px', w, h, px (RGBA, straight), cell, belt }.
   A frame from the look's numbers: { t: 'look', show, counts, belt, residue:
   { x, y, w, h, px } | null }.  `belt` is the bake's own beltPending (a frame
   baked before the belt came is never kept: the page does not keep it). */
export function keptOk(v) {
  if (!v || typeof v !== 'object') return false;
  const len = (b) => (b && typeof b.byteLength === 'number' ? b.byteLength : -1);
  if (v.t === 'px') {
    if (!(v.w > 0) || !(v.h > 0)) return false;
    if (len(v.px) !== v.w * v.h * 4) return false;
    if (v.cell != null && (typeof v.cell !== 'object' || !(v.cell.w === v.w) || !(v.cell.h === v.h))) return false;
    return true;
  }
  if (v.t === 'look') {
    if (len(v.show) < 0) return false;
    if (v.residue != null) {
      const r = v.residue;
      if (!(r.w > 0) || !(r.h > 0) || len(r.px) !== r.w * r.h * 4) return false;
    }
    return true;
  }
  return false;
}
/** The bytes a kept value holds on the disk (for the cap). */
export function keptBytes(v) {
  if (!v) return 0;
  const len = (b) => (b && typeof b.byteLength === 'number' ? b.byteLength : 0);
  return 64 + len(v.px) + len(v.show) + (v.residue ? len(v.residue.px) : 0) + (v.counts ? 64 : 0);
}

/** The day, the least-lately-used clock (written at most once a day a frame). */
export const keepDay = (now) => Math.floor((now == null ? Date.now() : now) / 86400000);

/**
 * Past the cap, what to let go: the least lately used first (by day, then
 * the oldest written), down to nine tenths of the cap.
 * rows: [[key, { b, at, n }]] -> keys
 */
export function evictPlan(rows, cap) {
  let total = 0;
  for (const [, r] of rows) total += (r && r.b) || 0;
  if (total <= cap) return [];
  const order = rows.slice().sort((a, b) => ((a[1].at || 0) - (b[1].at || 0)) || ((a[1].n || 0) - (b[1].n || 0)));
  const out = [];
  const floor = cap * 0.9;
  for (const [k, r] of order) {
    if (total <= floor) break;
    out.push(k);
    total -= (r && r.b) || 0;
  }
  return out;
}

/* ═══ THE STORE (IndexedDB, in the worker) ═══
   Three object stores: `f` the frames (key -> kept value), `i` the index
   (key -> { b, at, n }: read whole at the open, a few hundred small rows, so
   the cap is decided without reading a frame), `m` the version.  Every
   failure turns the keep off for the session (`off` and why). */
export function keepStore(idb, version, cap) {
  const S = { off: false, why: '', db: null, rows: new Map(), bytes: 0, seq: 0, opened: null };
  const fail = (why) => { S.off = true; S.why = String(why || 'error'); try { if (S.db) S.db.close(); } catch (e) { /* gone */ } S.db = null; };
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('idb')); });
  const done = (tx) => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error || new Error('idb tx')); tx.onabort = () => rej(tx.error || new Error('idb abort')); });
  const open = () => {
    if (S.opened) return S.opened;
    S.opened = (async () => {
      if (!idb || typeof idb.open !== 'function') { fail('no store'); return false; }
      const r = idb.open(KEEP_DB, 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        for (const n of ['f', 'i', 'm']) if (!db.objectStoreNames.contains(n)) db.createObjectStore(n);
      };
      r.onblocked = () => fail('blocked');
      S.db = await req(r);
      S.db.onversionchange = () => fail('version change');
      let tx = S.db.transaction(['m'], 'readonly');
      const had = await req(tx.objectStore('m').get('v'));
      if (had !== version) {
        tx = S.db.transaction(['f', 'i', 'm'], 'readwrite');
        tx.objectStore('f').clear(); tx.objectStore('i').clear(); tx.objectStore('m').put(version, 'v');
        await done(tx);
        return true;
      }
      tx = S.db.transaction(['i'], 'readonly');
      const st = tx.objectStore('i');
      const [keys, vals] = await Promise.all([req(st.getAllKeys()), req(st.getAll())]);
      for (let k = 0; k < keys.length; k++) {
        const row = vals[k] || { b: 0, at: 0, n: 0 };
        S.rows.set(keys[k], row);
        S.bytes += row.b || 0;
        if ((row.n || 0) > S.seq) S.seq = row.n || 0;
      }
      return true;
    })().catch((e) => { fail(e && e.message); return false; });
    return S.opened;
  };
  return {
    state: S,
    open,
    /** the kept value, or null (not kept, unreadable, or the store off) */
    async get(key) {
      if (S.off || !(await open()) || S.off) return null;
      if (!S.rows.has(key)) return null;
      try {
        const tx = S.db.transaction(['f'], 'readonly');
        const v = await req(tx.objectStore('f').get(key));
        const row = S.rows.get(key);
        const today = keepDay();
        if (v && row && row.at !== today) {
          row.at = today;
          const tw = S.db.transaction(['i'], 'readwrite');
          tw.objectStore('i').put(row, key);
        }
        return v || null;
      } catch (e) { fail(e && e.message); return null; }
    },
    /** keep it (replacing what was there), then let go past the cap */
    async put(key, v) {
      if (S.off || !(await open()) || S.off) return false;
      try {
        const b = keptBytes(v);
        const old = S.rows.get(key);
        const row = { b, at: keepDay(), n: ++S.seq };
        const drop = evictPlan([...S.rows.entries()].filter(([k]) => k !== key).concat([[key, row]]), cap);
        const tx = S.db.transaction(['f', 'i'], 'readwrite');
        const fs = tx.objectStore('f'), is = tx.objectStore('i');
        fs.put(v, key); is.put(row, key);
        for (const k of drop) { fs.delete(k); is.delete(k); }
        await done(tx);
        S.bytes += b - (old ? old.b || 0 : 0);
        S.rows.set(key, row);
        for (const k of drop) { const r = S.rows.get(k); if (r) { S.bytes -= r.b || 0; S.rows.delete(k); } }
        return true;
      } catch (e) { fail(e && e.message); return false; }
    },
  };
}

/* ═══ THE PAGE'S SIDE: TELL THE WORKER, AND THE PROBE ═══
   Called by the prewarm (entityRenderer.js prewarmMaskedBodyFrames) with the
   bake worker before its first job of the session: whether the keep is on
   (`?bakekeep=0`, read there through src/game/switches.js), QA's check, and a
   port for the worker's counts.  Told once a worker.  -> the probe that asks
   for the counts (window.__btBakeKeep, read by mp-bakekeep), or null. */
let _toldWorker = null;
export function keepTell(wk, { on = true, verify = false } = {}) {
  if (!wk || wk === _toldWorker) return null;
  _toldWorker = wk;
  let port = null, mine = null;
  try {
    if (typeof MessageChannel === 'function') { const ch = new MessageChannel(); port = ch.port2; mine = ch.port1; }
  } catch (e) { port = null; mine = null; }
  try { wk.postMessage({ type: 'keep', on: !!on, verify: !!verify, port }, port ? [port] : []); } catch (e) { return null; }
  if (!mine) return null;
  /* one answer an ask; the worker answers between jobs (a bake on a slow box takes seconds) */
  return (opts) => new Promise((res) => {
    const t = setTimeout(() => res(null), 20000);
    mine.onmessage = (e) => { clearTimeout(t); res(e.data || null); };
    try { mine.postMessage({ ask: 1, missed: !!(opts && opts.missed) }); } catch (e) { clearTimeout(t); res(null); }
  });
}
