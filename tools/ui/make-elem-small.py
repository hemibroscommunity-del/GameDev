#!/usr/bin/env python3
"""v2.3.3906: THE ELEMENT ICONS AT 64 x 64, FOR THE MONSTERS' NAME PLATES.

The owner, 2026-11-02: "After name of monster on nameplate it lists elemental
icon type."  The plate is drawn on the canvas at ~10-14 CSS px, and a 256 px
texture shrunk that far shimmers as the view slides (src/data/smallIcons.js),
so every small mark is its own 64 px copy: this writes
public/icons/ui/elem-<name>-64.webp from the 256 px icons
(tools/ui/draw-element-icons.py, v2.3.3907's clean ones), brought down
premultiplied (no dark fringe) and put on 256 colours or fewer by the game's
own quant256.js (the memory law).

Usage: python3 tools/ui/make-elem-small.py [--src DIR]
"""
import os
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UI = os.path.join(ROOT, 'public', 'icons', 'ui')
NAMES = ('flame', 'frost', 'water', 'venom', 'flora', 'stone', 'storm', 'wind', 'dark', 'light')
SIZE = 64


def reduce_256(im):
    w, h = im.size
    js = ("import { reduce256, toRgba } from '%s';"
          "const ch=[];process.stdin.on('data',c=>ch.push(c));process.stdin.on('end',()=>{"
          "const d=new Uint8Array(Buffer.concat(ch));const r=reduce256(d,%d,%d);"
          "process.stderr.write(String(r.n));process.stdout.write(Buffer.from(toRgba(r.idx,r.pal).buffer));});"
          % (os.path.join(ROOT, 'public', 'tools', 'style', 'quant256.js'), w, h))
    p = subprocess.run(['node', '--input-type=module', '-e', js], input=im.tobytes(),
                       capture_output=True, check=True)
    return Image.frombytes('RGBA', (w, h), p.stdout), int(p.stderr or 0)


def main(argv):
    src = argv[argv.index('--src') + 1] if '--src' in argv else UI
    for n in NAMES:
        im = Image.open(os.path.join(src, 'elem-%s.webp' % n)).convert('RGBA')
        small = im.convert('RGBa').resize((SIZE, SIZE), Image.LANCZOS).convert('RGBA')
        small, k = reduce_256(small)
        out = os.path.join(UI, 'elem-%s-64.webp' % n)
        small.save(out, 'WEBP', lossless=True)
        print('%-22s %d colours' % (os.path.relpath(out, ROOT), k))


if __name__ == '__main__':
    main(sys.argv[1:])
