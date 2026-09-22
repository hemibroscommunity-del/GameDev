#!/usr/bin/env node
/* ═══ v2.3.2641: LOSSLESS MP3 TAIL TRIM ═══
 *   node tools/trim_mp3_tail.mjs <in.mp3> <keepSeconds> <out.mp3>
 *
 * There is no mp3 ENCODER in this sandbox, which is why the repo's earlier
 * sfx edits (the bones-crumble trim) were done as frame-boundary cuts rather
 * than re-encodes. This is that technique as a tool: walk the MPEG frame
 * headers, accumulate each frame's duration, and stop copying once the kept
 * time is reached. Every byte written is a byte from the source, so the audio
 * that remains is bit-identical -- no generation loss, no re-encode.
 *
 * ═══ v2.3.2643: MPEG-2 AND 2.5, AND A TOOL THAT CANNOT LIE ═══
 *
 * v2.3.2641 parsed MPEG *Version 1* only -- every other frame header was
 * skipped by the `verBits !== 3` guard. That is not a gap that shows up as an
 * error, and it did not: the owner's equip upload is MPEG-2 Layer III at
 * 24 kHz, so the walker rejected all 34 of its frames, `i++` crawled the file
 * byte by byte, and the run printed a confident
 *
 *     15.9KB -> 15.4KB, 4 frames, 0.110s kept (asked 0.5s)
 *
 * while writing a file that still decoded to the full 0.816s. Four "frames"
 * were coincidental 0xFFE bit patterns inside the audio data. A tool that
 * reports a trim it did not perform is worse than one that refuses: the number
 * it prints is what the next person quotes in a comment, and this repo's sfx
 * comments quote these numbers.
 *
 * Both halves are fixed here:
 *  - the three MPEG versions and their different tables (MPEG-2/2.5 Layer III
 *    carry 576 samples per frame, not 1152, and size as 72*br/sr not 144*br/sr,
 *    off a different bitrate table);
 *  - and a COVERAGE check. Contiguous frames must account for the whole file
 *    within one frame, or the walk desynced and the run FAILS instead of
 *    printing a number nobody can trust. The first header found also pins the
 *    version/rate for the rest of the walk, so a stray 0xFFE inside the audio
 *    cannot re-interpret the stream mid-file.
 */
import { readFileSync, writeFileSync } from 'fs';

const [, , inPath, keepArg, outPath] = process.argv;
if (!inPath || !keepArg || !outPath) {
  console.error('usage: node tools/trim_mp3_tail.mjs <in.mp3> <keepSeconds> <out.mp3>');
  process.exit(1);
}
const keep = parseFloat(keepArg);
const buf = readFileSync(inPath);

/* verBits, per ISO 11172-3/13818-3: 11 = MPEG1, 10 = MPEG2, 01 = RESERVED,
   00 = MPEG2.5.  (Worth writing out: 2 and 1 read like "version 2" and
   "version 1" and are the opposite of that, which is how the first draft of
   this fix rejected the very file it was written for.)  layer bits: 1 =
   Layer III, the only layer this tool handles -- an mp3 by any other name is
   not what the manifest ships. */
const BITRATES_V1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATES_V2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
const VERNAME = { 3: 'MPEG1', 2: 'MPEG2', 0: 'MPEG2.5' };

function parseHeader(b, i, wantVer, wantSr) {
  if (i + 4 > b.length) return null;
  if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
  const verBits = (b[i + 1] >> 3) & 0x03;
  const layer = (b[i + 1] >> 1) & 0x03;
  const brIdx = (b[i + 2] >> 4) & 0x0f;
  const srIdx = (b[i + 2] >> 2) & 0x03;
  const pad = (b[i + 2] >> 1) & 0x01;
  if (verBits === 1 || layer !== 1 || brIdx === 0 || brIdx === 15 || srIdx === 3) return null;
  const sr = RATES[verBits][srIdx];
  /* Once the stream's identity is known, hold every later frame to it. */
  if (wantVer != null && (verBits !== wantVer || sr !== wantSr)) return null;
  const v1 = verBits === 3;
  const br = (v1 ? BITRATES_V1L3 : BITRATES_V2L3)[brIdx] * 1000;
  const len = Math.floor(((v1 ? 144 : 72) * br) / sr) + pad;
  if (len <= 4) return null;
  return { verBits, sr, br, len, dur: (v1 ? 1152 : 576) / sr };
}

let i = 0;
/* skip an ID3v2 tag if present -- it is metadata, copied verbatim below */
if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'ID3') {
  i = 10 + ((buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 | (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f));
}

/* Find the FIRST real frame, and let it pin the stream's version + rate. */
let first = null, scan = i;
while (scan + 4 <= buf.length) {
  const h = parseHeader(buf, scan, null, null);
  /* A real header is one whose next frame is also a header -- one lone 0xFFE
     inside the audio data is not a stream. */
  if (h && parseHeader(buf, scan + h.len, h.verBits, h.sr)) { first = h; break; }
  scan++;
}
if (!first) {
  console.error(`${inPath}: no MPEG Layer III frame stream found -- not an mp3 this tool can cut.`);
  process.exit(2);
}
const start = scan;

let secs = 0, end = start, frames = 0, bytes = 0, truncated = false;
i = start;
while (i + 4 <= buf.length) {
  const h = parseHeader(buf, i, first.verBits, first.sr);
  if (!h) break;                                    /* the stream ended or desynced */
  if (secs + h.dur > keep) { truncated = true; break; }
  secs += h.dur; i += h.len; end = i; frames++; bytes += h.len;
}

/* ═══ THE CHECK THAT MAKES THE NUMBER ABOVE TRUE ═══
   If we stopped before `keep` was reached, we must have consumed the whole
   frame stream -- anything left over means the walk lost sync and the
   duration reported is fiction.  One frame of slack covers a trailing partial
   frame or an ID3v1 footer. */
if (!truncated) {
  const leftover = buf.length - (start + bytes);
  if (leftover > first.len + 128) {
    console.error(`${inPath}: frame walk DESYNCED -- parsed ${frames} frame(s) / ${secs.toFixed(3)}s `
      + `but ${leftover} byte(s) remain unaccounted for. Refusing to write a trim that is not one.`);
    process.exit(3);
  }
}

const out = Buffer.concat([buf.subarray(0, start), buf.subarray(start, end)]);
writeFileSync(outPath, out);
console.log(`${inPath}: ${(buf.length / 1024).toFixed(1)}KB -> ${(out.length / 1024).toFixed(1)}KB, `
  + `${frames} frames, ${secs.toFixed(3)}s kept (asked ${keep}s)  `
  + `[${VERNAME[first.verBits]} Layer III, ${first.sr}Hz]`);
