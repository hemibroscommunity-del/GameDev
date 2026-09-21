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
 */
import { readFileSync, writeFileSync } from 'fs';

const [, , inPath, keepArg, outPath] = process.argv;
if (!inPath || !keepArg || !outPath) {
  console.error('usage: node tools/trim_mp3_tail.mjs <in.mp3> <keepSeconds> <out.mp3>');
  process.exit(1);
}
const keep = parseFloat(keepArg);
const buf = readFileSync(inPath);

const BITRATES_V1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const RATES_V1 = [44100, 48000, 32000, 0];

let i = 0;
/* skip an ID3v2 tag if present -- it is metadata, copied verbatim below */
let id3 = 0;
if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'ID3') {
  id3 = 10 + ((buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 | (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f));
  i = id3;
}
const start = i;
let secs = 0, end = i, frames = 0;
while (i + 4 <= buf.length) {
  if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
  const verBits = (buf[i + 1] >> 3) & 0x03;       /* 3 = MPEG1 */
  const layer = (buf[i + 1] >> 1) & 0x03;         /* 1 = Layer III */
  const brIdx = (buf[i + 2] >> 4) & 0x0f;
  const srIdx = (buf[i + 2] >> 2) & 0x03;
  const pad = (buf[i + 2] >> 1) & 0x01;
  if (verBits !== 3 || layer !== 1 || brIdx === 0 || brIdx === 15 || srIdx === 3) { i++; continue; }
  const br = BITRATES_V1L3[brIdx] * 1000, sr = RATES_V1[srIdx];
  const len = Math.floor((144 * br) / sr) + pad;
  if (len <= 4) { i++; continue; }
  const dur = 1152 / sr;                           /* MPEG1 Layer III */
  if (secs + dur > keep) { end = i; break; }
  secs += dur; i += len; end = i; frames++;
}
const out = Buffer.concat([buf.subarray(0, start), buf.subarray(start, end)]);
writeFileSync(outPath, out);
console.log(`${inPath}: ${(buf.length / 1024).toFixed(1)}KB -> ${(out.length / 1024).toFixed(1)}KB, `
  + `${frames} frames, ${secs.toFixed(3)}s kept (asked ${keep}s)`);
