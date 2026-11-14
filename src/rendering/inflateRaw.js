/* ═══ v2.3.5257: A RAW DEFLATE STREAM UNPACKED AT ONCE, ON THE PAGE ═══
 *
 * Card P's backlog, the fire goblin (the planning session's road A'): a
 * monster strip's colour numbers are kept deflated a frame at a time once the
 * graphics chip has the strip (framePack.js), and a CPU reader of one frame
 * (a hit's chips, a stuck arrow: heldNumbers.js readSourceRect) needs that
 * frame NOW, in the middle of a hit.  The browser's DecompressionStream is
 * asynchronous, so this is the one synchronous inflater: RFC 1951, stored,
 * fixed and dynamic blocks, no dictionary, no zlib or gzip wrapper (the pack
 * deflates with CompressionStream('deflate-raw')).
 *
 * It FAILS CLOSED: a stream that is short, malformed, or that does not come
 * out at exactly `outLen` bytes gives null, never a throw -- a reader then
 * has no pin and no chip for that frame, as on a frame it cannot read today.
 * Held by server/test/inflate-raw.test.mjs (against node's zlib, and a
 * truncated stream).  No imports: node runs it as it is.
 */

const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CLORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/* A canonical Huffman code as a lookup table: index the next FAST bits of
   the stream; an entry is (length << 16) | symbol, 0 for a code longer than
   FAST bits, which is then walked bit by bit from `counts` and `symbols`. */
const FAST = 10;
function buildCode(lengths, n) {
  const counts = new Uint16Array(16);
  for (let i = 0; i < n; i++) counts[lengths[i]]++;
  counts[0] = 0;
  /* an over-subscribed code is malformed */
  let left = 1;
  for (let len = 1; len < 16; len++) {
    left <<= 1;
    left -= counts[len];
    if (left < 0) return null;
  }
  const offs = new Uint16Array(16);
  for (let len = 1; len < 15; len++) offs[len + 1] = offs[len] + counts[len];
  const symbols = new Uint16Array(n);
  for (let i = 0; i < n; i++) if (lengths[i]) symbols[offs[lengths[i]]++] = i;
  /* the fast table: every code of FAST bits or fewer, bit-reversed (the
     stream is read least significant bit first) */
  const fast = new Uint32Array(1 << FAST);
  let code = 0, k = 0;
  for (let len = 1; len <= 15; len++) {
    for (let j = 0; j < counts[len]; j++, k++) {
      if (len <= FAST) {
        let rev = 0;
        for (let b = 0; b < len; b++) rev |= ((code >> b) & 1) << (len - 1 - b);
        const sym = symbols[k];
        for (let f = rev; f < (1 << FAST); f += (1 << len)) fast[f] = (len << 16) | sym;
      }
      code++;
    }
    code <<= 1;
  }
  return { counts, symbols, fast };
}

let FIXED_L = null, FIXED_D = null;
function fixedCodes() {
  if (!FIXED_L) {
    const l = new Uint8Array(288);
    for (let i = 0; i < 144; i++) l[i] = 8;
    for (let i = 144; i < 256; i++) l[i] = 9;
    for (let i = 256; i < 280; i++) l[i] = 7;
    for (let i = 280; i < 288; i++) l[i] = 8;
    FIXED_L = buildCode(l, 288);
    const d = new Uint8Array(30).fill(5);
    FIXED_D = buildCode(d, 30);
  }
  return [FIXED_L, FIXED_D];
}

/** The `outLen` bytes `src` (a raw DEFLATE stream) holds, or null. */
export function inflateRawSync(src, outLen) {
  if (!src || !(outLen >= 0)) return null;
  try {
    return _inflate(src, outLen | 0);
  } catch (e) {
    return null;
  }
}

/* the bit buffer is local (a closure's variables are slow in the hot loop),
   topped up to at least 24 bits where it is read from; a byte past the
   stream's end goes in as zeros and is counted in `over`, and a check after
   each read (`over > bitcnt`: a padding bit was used) makes a short stream
   null */
function _inflate(src, outLen) {
  const out = new Uint8Array(outLen);
  const n = src.length;
  const MASK = (1 << FAST) - 1;
  let ip = 0, op = 0, bitbuf = 0, bitcnt = 0, over = 0;
  let last = 0;
  while (!last) {
    while (bitcnt < 3) { if (ip < n) bitbuf |= src[ip++] << bitcnt; else over += 8; bitcnt += 8; }
    if (over > bitcnt) return null;
    last = bitbuf & 1;
    const type = (bitbuf >>> 1) & 3;
    bitbuf >>>= 3; bitcnt -= 3;
    if (type === 0) {
      /* stored: to the byte boundary (the rest of this byte dropped, any whole
         byte read ahead given back), then LEN and its complement */
      if (over) return null;
      const part = bitcnt & 7;
      bitbuf >>>= part; bitcnt -= part;
      ip -= bitcnt >> 3;
      bitbuf = 0; bitcnt = 0;
      if (ip + 4 > n) return null;
      const len = src[ip] | (src[ip + 1] << 8), nlen = src[ip + 2] | (src[ip + 3] << 8);
      ip += 4;
      if ((len ^ 0xffff) !== nlen || ip + len > n || op + len > outLen) return null;
      out.set(src.subarray(ip, ip + len), op);
      ip += len; op += len;
      continue;
    }
    let lcode, dcode;
    if (type === 1) {
      [lcode, dcode] = fixedCodes();
    } else if (type === 2) {
      while (bitcnt < 14) { if (ip < n) bitbuf |= src[ip++] << bitcnt; else over += 8; bitcnt += 8; }
      if (over > bitcnt) return null;
      const hlit = (bitbuf & 31) + 257, hdist = ((bitbuf >>> 5) & 31) + 1, hclen = ((bitbuf >>> 10) & 15) + 4;
      bitbuf >>>= 14; bitcnt -= 14;
      if (hlit > 286 || hdist > 30) return null;
      const cl = new Uint8Array(19);
      for (let i = 0; i < hclen; i++) {
        while (bitcnt < 3) { if (ip < n) bitbuf |= src[ip++] << bitcnt; else over += 8; bitcnt += 8; }
        cl[CLORDER[i]] = bitbuf & 7;
        bitbuf >>>= 3; bitcnt -= 3;
      }
      if (over > bitcnt) return null;
      const clcode = buildCode(cl, 19);
      if (!clcode) return null;
      const lens = new Uint8Array(hlit + hdist);
      for (let i = 0; i < hlit + hdist;) {
        while (bitcnt < 24) { if (ip < n) bitbuf |= src[ip++] << bitcnt; else over += 8; bitcnt += 8; }
        let e = clcode.fast[bitbuf & MASK]; if (!e) e = slowSym(clcode, bitbuf); if (e < 0) return null; bitbuf >>>= e >>> 16; bitcnt -= e >>> 16; const sym = e & 0xffff;
        if (over > bitcnt) return null;
        if (sym < 16) { lens[i++] = sym; continue; }
        let rep = 0, val = 0;
        if (sym === 16) { if (!i) return null; val = lens[i - 1]; rep = 3 + (bitbuf & 3); bitbuf >>>= 2; bitcnt -= 2; }
        else if (sym === 17) { rep = 3 + (bitbuf & 7); bitbuf >>>= 3; bitcnt -= 3; }
        else { rep = 11 + (bitbuf & 127); bitbuf >>>= 7; bitcnt -= 7; }
        if (over > bitcnt || i + rep > hlit + hdist) return null;
        while (rep--) lens[i++] = val;
      }
      if (!lens[256]) return null;   /* no end of block: malformed */
      lcode = buildCode(lens.subarray(0, hlit), hlit);
      dcode = buildCode(lens.subarray(hlit), hdist);
      if (!lcode || !dcode) return null;
    } else {
      return null;
    }
    for (;;) {
      while (bitcnt < 24) { if (ip < n) bitbuf |= src[ip++] << bitcnt; else over += 8; bitcnt += 8; }
      let e = lcode.fast[bitbuf & MASK];
      if (!e) { e = slowSym(lcode, bitbuf); if (e < 0) return null; }
      bitbuf >>>= e >>> 16; bitcnt -= e >>> 16;
      if (over > bitcnt) return null;
      const sym = e & 0xffff;
      if (sym < 256) {
        if (op >= outLen) return null;
        out[op++] = sym;
        continue;
      }
      if (sym === 256) break;
      const li = sym - 257;
      if (li >= 29) return null;
      const le = LEXT[li];
      const len = LBASE[li] + (bitbuf & ((1 << le) - 1));
      bitbuf >>>= le; bitcnt -= le;
      while (bitcnt < 24) { if (ip < n) bitbuf |= src[ip++] << bitcnt; else over += 8; bitcnt += 8; }
      let f = dcode.fast[bitbuf & MASK];
      if (!f) { f = slowSym(dcode, bitbuf); if (f < 0) return null; }
      bitbuf >>>= f >>> 16; bitcnt -= f >>> 16;
      const ds = f & 0xffff;
      if (ds >= 30) return null;
      const de = DEXT[ds];
      while (bitcnt < de) { if (ip < n) bitbuf |= src[ip++] << bitcnt; else over += 8; bitcnt += 8; }
      const dist = DBASE[ds] + (bitbuf & ((1 << de) - 1));
      bitbuf >>>= de; bitcnt -= de;
      if (over > bitcnt || dist > op || op + len > outLen) return null;
      /* a run of one byte is a fill, a copy that does not overlap itself the
         array's own copy; else byte by byte, as the format means it */
      if (dist === 1) { out.fill(out[op - 1], op, op + len); op += len; }
      else if (dist >= len) { out.copyWithin(op, op - dist, op - dist + len); op += len; }
      else for (let k = 0; k < len; k++, op++) out[op] = out[op - dist];
    }
  }
  return op === outLen ? out : null;
}

/* a symbol of code `h` whose code is longer than FAST bits, walked bit by bit
   from `bits` (the buffer as it stands): (length << 16) | symbol, or -1 */
function slowSym(h, bits) {
  let code = 0, first = 0, index = 0;
  for (let len = 1; len < 16; len++) {
    code |= bits & 1;
    bits >>>= 1;
    const count = h.counts[len];
    if (code - count < first) return (len << 16) | h.symbols[index + (code - first)];
    index += count;
    first += count;
    first <<= 1;
    code <<= 1;
  }
  return -1;
}
