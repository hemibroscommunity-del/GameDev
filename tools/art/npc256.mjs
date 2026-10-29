#!/usr/bin/env node
/* ═══ v2.3.3833: A TOWNSPERSON'S PICTURE ON 256 COLOURS ═══
 *
 *   node tools/art/npc256.mjs sterling slim ...     public/sprites/npc/<still>.webp, in place
 *
 * The memory law (CLAUDE.md §7, the owner 2026-10-28: "I won't notice at all
 * from anything at 256"; "everything converted using this more efficient
 * method as standard protocol"): new art is 256 colours a picture at most.  A
 * townsperson's standing picture comes out of npc-looks.mjs --bake with 2-3
 * thousand (the game's smooth shading, photographed), so each is put on 256 by
 * the same reducer as the rest of the game's pictures (public/tools/style/
 * quant256.js: OKLab, solid kept solid and soft kept soft, no dithering) and
 * written back as the same lossless WebP, at the same address -- nothing that
 * reads it changes.  Every file is read back and must hold the colours
 * written (256 or fewer), or the run stops.  Run it after every bake of a
 * townsperson (docs/specs/npc-cast.md).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reduce256 } from '../../public/tools/style/quant256.js';
import { encodeIndexedPng } from '../../public/tools/world/core/png8.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(REPO, 'public/sprites/npc');
const names = process.argv.slice(2).filter((a) => !a.startsWith('-'));
if (!names.length) { console.error('usage: node tools/art/npc256.mjs <still> ...'); process.exit(2); }

/* PIL reads and writes the WebP (as npc_looks_bake.py does): a WebP's own
   pixels, no colour management */
const PY = `
import sys
from PIL import Image
src, png, out = sys.argv[1:4]
if png == '-':
    im = Image.open(src).convert('RGBA')
    sys.stdout.write('%d %d\\n' % im.size); sys.stdout.flush()
    sys.stdout.buffer.write(im.tobytes())
else:
    im = Image.open(png).convert('RGBA')
    im.save(out, 'WEBP', lossless=True, quality=100, method=6)
    back = Image.open(out).convert('RGBA')
    n = len(back.getcolors(1 << 20))
    if back.tobytes() != im.tobytes() or n > 256:
        sys.exit('%s: read back %d colours, not as written' % (out, n))
    print(n)
`;
for (const n of names) {
  const file = path.join(DIR, n + '.webp');
  const raw = execFileSync('python3', ['-I', '-c', PY, file, '-', '-'], { maxBuffer: 1 << 28 });
  const nl = raw.indexOf(10);
  const [w, h] = raw.subarray(0, nl).toString().split(' ').map(Number);
  const d = new Uint8Array(raw.subarray(nl + 1));
  if (d.length !== w * h * 4) throw new Error(`${n}: read ${d.length} bytes for ${w}x${h}`);
  const before = new Set();
  for (let i = 0; i < d.length; i += 4) if (d[i + 3]) before.add((d[i] << 24 | d[i + 1] << 16 | d[i + 2] << 8 | d[i + 3]) >>> 0);
  const r = reduce256(d, w, h);
  const png = path.join(os.tmpdir(), `npc256-${process.pid}-${n}.png`);
  fs.writeFileSync(png, Buffer.from(await encodeIndexedPng(r.idx, r.pal, w, h)));
  const after = execFileSync('python3', ['-I', '-c', PY, '-', png, file]).toString().trim();
  fs.unlinkSync(png);
  console.log(`${n}.webp: ${before.size} colours -> ${after}, ${(fs.statSync(file).size / 1024).toFixed(1)} KB` + (r.err !== undefined ? `, err ${(+r.err).toFixed(4)}` : ''));
}
