/* ═══ v2.3.6761: THE BAKE WORKER RUN IN NODE (card LOAD PR 2, the mend of sitting 71) ═══
 *
 * The gatekeeper's sitting 71 held #2401: bake-keep.test proved keyParts
 * with readers of its own, and read the worker and the store by their text,
 * so a worker whose readers fed the key the wrong things (the look's row
 * left out, a cut read as its size, a file answered by its address, the
 * version without the script or the browser) and a store that never let go
 * or never emptied all stayed green.  This rig runs the REAL worker
 * (src/rendering/maskedBakeWorker.js, imported fresh for each "login": its
 * own module state, its own sheets) on stand-ins for what a browser gives a
 * worker, so the guard asks it questions by behaviour:
 *   - a canvas in software (drawImage nearest, source-over, destination-out,
 *     getImageData / putImageData), ImageData, createImageBitmap, ImageBitmap;
 *   - fetch, from a table of files (a file is BTIM + w, h + RGBA: one byte
 *     changed is a different picture and a different file);
 *   - IndexedDB (fakeIdb: the stores kept across "logins" by name, copies
 *     made as IndexedDB makes them, and a switch that makes it throw);
 *   - `self` (postMessage gathered, location.pathname the worker's script),
 *     crypto.subtle (node's), MessageChannel (node's).
 * No imports from the game but the worker itself and bakeKeep.js (keepTell,
 * the page's own way to tell the worker).
 */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { webcrypto } from 'node:crypto';

/* ─── a canvas in software: straight RGBA, nearest, two composite modes ─── */
class Pix {
  constructor(w, h, data) { this.width = w; this.height = h; this.data = data || new Uint8ClampedArray(w * h * 4); }
}
export class ImageDataR { constructor(data, w, h) { if (typeof data === 'number') { h = w; w = data; data = new Uint8ClampedArray(w * h * 4); } this.data = data; this.width = w; this.height = h; } }
class Bitmap extends Pix { close() { this.closed = true; } }
const pixOf = (s) => (s instanceof SoftCanvas ? s._p : s);
class Ctx {
  constructor(cv) { this.canvas = cv; this.imageSmoothingEnabled = true; this.globalCompositeOperation = 'source-over'; this._st = []; this._clip = null; this._path = null; }
  save() { this._st.push([this.globalCompositeOperation, this._clip]); }
  restore() { if (this._st.length) [this.globalCompositeOperation, this._clip] = this._st.pop(); }
  /* a clip of one rectangle (all maskedBake.js asks: the head and neck band) */
  beginPath() { this._path = null; }
  rect(x, y, w, h) { this._path = [x, y, x + w, y + h]; }
  clip() {
    const p = this._path || [0, 0, 0, 0], c = this._clip;
    this._clip = c ? [Math.max(c[0], p[0]), Math.max(c[1], p[1]), Math.min(c[2], p[2]), Math.min(c[3], p[3])] : p;
  }
  drawImage(src, ...a) {
    const s = pixOf(src);
    if (!s || !s.data) throw new Error('drawImage: no source');
    let sx = 0, sy = 0, sw = s.width, sh = s.height, dx, dy, dw, dh;
    if (a.length === 2) { [dx, dy] = a; dw = sw; dh = sh; } else if (a.length === 4) { [dx, dy, dw, dh] = a; } else { [sx, sy, sw, sh, dx, dy, dw, dh] = a; }
    if (!(dw > 0) || !(dh > 0) || !(sw > 0) || !(sh > 0)) return;
    const d = this.canvas._p, D = d.data, S = s.data;
    const out = this.globalCompositeOperation === 'destination-out';
    const k = this._clip || [0, 0, d.width, d.height];
    const x0 = Math.max(0, k[0], Math.ceil(dx - 0.5)), x1 = Math.min(d.width, k[2], Math.ceil(dx + dw - 0.5));
    const y0 = Math.max(0, k[1], Math.ceil(dy - 0.5)), y1 = Math.min(d.height, k[3], Math.ceil(dy + dh - 0.5));
    for (let y = y0; y < y1; y++) {
      const v = Math.floor(sy + (y + 0.5 - dy) * sh / dh);
      if (v < 0 || v >= s.height || v >= sy + sh) continue;
      for (let x = x0; x < x1; x++) {
        const u = Math.floor(sx + (x + 0.5 - dx) * sw / dw);
        if (u < 0 || u >= s.width || u >= sx + sw) continue;
        const si = (v * s.width + u) * 4, di = (y * d.width + x) * 4;
        const sa = S[si + 3] / 255;
        if (!sa) continue;
        const da = D[di + 3] / 255;
        if (out) { D[di + 3] = Math.round(da * (1 - sa) * 255); continue; }
        const a2 = sa + da * (1 - sa);
        for (let k = 0; k < 3; k++) D[di + k] = Math.round((S[si + k] * sa + D[di + k] * da * (1 - sa)) / a2);
        D[di + 3] = Math.round(a2 * 255);
      }
    }
  }
  getImageData(x, y, w, h) {
    const p = this.canvas._p, out = new Uint8ClampedArray(w * h * 4);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const X = x + c, Y = y + r;
      if (X < 0 || Y < 0 || X >= p.width || Y >= p.height) continue;
      const si = (Y * p.width + X) * 4, di = (r * w + c) * 4;
      out[di] = p.data[si]; out[di + 1] = p.data[si + 1]; out[di + 2] = p.data[si + 2]; out[di + 3] = p.data[si + 3];
    }
    return new ImageDataR(out, w, h);
  }
  putImageData(img, x, y) {
    const p = this.canvas._p;
    for (let r = 0; r < img.height; r++) for (let c = 0; c < img.width; c++) {
      const X = x + c, Y = y + r;
      if (X < 0 || Y < 0 || X >= p.width || Y >= p.height) continue;
      const di = (Y * p.width + X) * 4, si = (r * img.width + c) * 4;
      for (let k = 0; k < 4; k++) p.data[di + k] = img.data[si + k];
    }
  }
}
export class SoftCanvas {
  constructor(w, h) { this._p = new Pix(w, h); this._c = null; }
  get width() { return this._p.width; }
  get height() { return this._p.height; }
  getContext() { return this._c || (this._c = new Ctx(this)); }
  transferToImageBitmap() { const b = new Bitmap(this.width, this.height, this._p.data); this._p = new Pix(this.width, this.height); return b; }
}

/** A picture as bytes: what the worker holds as an ImageBitmap. */
export const bitmapOf = (w, h, rgba) => new Bitmap(w, h, new Uint8ClampedArray(rgba));
/** A picture as a FILE (what fetch answers): BTIM, w, h, then RGBA. */
export function fileOf(w, h, rgba) {
  const out = new Uint8Array(8 + w * h * 4);
  out.set([66, 84, 73, 77, w & 255, w >> 8, h & 255, h >> 8]);
  out.set(rgba, 8);
  return out;
}
async function decode(b) {
  if (b instanceof ImageDataR) return new Bitmap(b.width, b.height, new Uint8ClampedArray(b.data));
  if (b instanceof SoftCanvas || b instanceof Pix) { const p = pixOf(b); return new Bitmap(p.width, p.height, new Uint8ClampedArray(p.data)); }
  const u = new Uint8Array(await b.arrayBuffer());
  if (u[0] !== 66 || u[1] !== 84 || u[2] !== 73 || u[3] !== 77) throw new Error('not a picture');
  const w = u[4] | (u[5] << 8), h = u[6] | (u[7] << 8);
  return new Bitmap(w, h, new Uint8ClampedArray(u.subarray(8, 8 + w * h * 4)));
}

/* ─── IndexedDB, as far as keepStore uses it ─── */
export function fakeIdb() {
  const dbs = new Map();   /* name -> { stores: Map<name, Map> } */
  const ctl = { throwOn: null, opens: 0, ops: [] };
  const later = (fn) => setImmediate(fn);
  const request = (fn) => {
    const r = { result: undefined, error: null, onsuccess: null, onerror: null };
    later(() => {
      try { r.result = fn(); if (r.onsuccess) r.onsuccess(); } catch (e) { r.error = e; if (r.onerror) r.onerror(); }
    });
    return r;
  };
  const open = (name) => {
    ctl.opens++;
    const r = { result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
    later(() => {
      if (ctl.throwOn === 'open') { r.error = new Error('open'); if (r.onerror) r.onerror(); return; }
      let d = dbs.get(name);
      const fresh = !d;
      if (!d) { d = { stores: new Map() }; dbs.set(name, d); }
      const db = {
        objectStoreNames: { contains: (n) => d.stores.has(n) },
        createObjectStore: (n) => { d.stores.set(n, new Map()); },
        close: () => { db.closed = true; },
        onversionchange: null,
        transaction: (names, mode) => {
          if (db.closed) throw new Error('closed');
          /* a request that fails aborts its transaction, as IndexedDB does */
          const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
          const mine = (fn) => request(() => { try { return fn(); } catch (e) { tx.error = e; throw e; } });
          setImmediate(() => setImmediate(() => { if (tx.error) { if (tx.onabort) tx.onabort(); } else if (tx.oncomplete) tx.oncomplete(); }));
          tx.objectStore = (sn) => {
            if (!names.includes(sn)) throw new Error('not in this transaction: ' + sn);
            const s = d.stores.get(sn);
            const write = (what) => { if (mode !== 'readwrite') throw new Error('read only'); ctl.ops.push(what + ':' + sn); };
            const may = (op) => { if (ctl.throwOn === op) throw new Error('idb ' + op); };
            return {
              get: (k) => mine(() => { may('get'); const v = s.get(k); return v === undefined ? undefined : structuredClone(v); }),
              put: (v, k) => mine(() => { may('put'); write('put'); s.set(k, structuredClone(v)); return k; }),
              delete: (k) => mine(() => { write('delete'); s.delete(k); }),
              clear: () => mine(() => { write('clear'); s.clear(); }),
              getAllKeys: () => mine(() => [...s.keys()]),
              getAll: () => mine(() => [...s.values()].map((v) => structuredClone(v))),
            };
          };
          return tx;
        },
      };
      r.result = db;
      if (fresh && r.onupgradeneeded) r.onupgradeneeded();
      if (r.onsuccess) r.onsuccess();
    });
    return r;
  };
  return { idb: { open }, ctl, dbs, store: (name, sn) => (dbs.get(name) && dbs.get(name).stores.get(sn)) || new Map() };
}

/* ─── the worker's world ─── */
let _n = 0;
/**
 * A fresh worker ("a login"): its module imported anew, on `env`:
 *   env.files  Map url -> file bytes (fileOf)
 *   env.idb    a fakeIdb()'s idb
 *   env.script the worker's script path (self.location.pathname)
 * -> { send(msg), job(j) -> Promise<reply>, replies, tell(opts) -> ask }
 */
export async function freshWorker(ROOT, env) {
  const G = globalThis;
  const replies = [];
  let wait = null;
  G.self = G;
  G.OffscreenCanvas = SoftCanvas;
  G.ImageData = ImageDataR;
  G.createImageBitmap = (b) => decode(b);
  G.fetch = async (url) => {
    const f = env.files.get(url);
    if (!f) return { ok: false, status: 404, blob: async () => new Blob([]) };
    const bytes = new Uint8Array(f);
    return { ok: true, status: 200, blob: async () => new Blob([bytes]) };
  };
  Object.defineProperty(G, 'indexedDB', { value: env.idb, configurable: true, writable: true });
  Object.defineProperty(G, 'location', { value: { pathname: env.script }, configurable: true, writable: true });
  if (!G.crypto || !G.crypto.subtle) Object.defineProperty(G, 'crypto', { value: webcrypto, configurable: true });
  G.postMessage = (m) => {
    if (m && m.type) return;   /* the worker's words to the page (urlRead, urlsRead, lookSheetDone): not a reply */
    replies.push(m);
    if (wait && wait.id === m.id) { const w = wait; wait = null; w.res(m); }
  };
  G.onmessage = null;
  await import(pathToFileURL(join(ROOT, 'src/rendering/maskedBakeWorker.js')).href + '?login=' + (++_n));
  const handler = G.onmessage;
  const send = (msg) => handler({ data: msg });
  let id = 0;
  return {
    send,
    replies,
    /* one job, its reply (a job times out as a failure, never hangs the guard) */
    job: (j) => new Promise((res) => {
      j.id = ++id;
      const t = setTimeout(() => { wait = null; res({ id: j.id, err: 'guard: no reply' }); }, 8000);
      wait = { id: j.id, res: (m) => { clearTimeout(t); res(m); } };
      send(j);
    }),
  };
}
