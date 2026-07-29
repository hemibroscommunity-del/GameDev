#!/usr/bin/env python3
"""v2.3.1579: re-bake the 128px trait frames from their 256px originals.

Why a re-bake rather than a re-downscale
----------------------------------------
v2.3.1526 halved every trait frame to 128 for a 4x GPU-texture saving, and
that call was right -- headwear alone is 389 of 452 trait frames, so putting
it back to 256 costs 106MB against today's 29.6MB.  The SAVING stays.  What
was wrong was HOW the pixels were produced, in two ways:

  1. STRAIGHT-ALPHA AVERAGING.  downscale_traits.py did
     `Image.open(p).convert('RGBA').resize(..., Image.BOX)`.  PIL averages
     the R/G/B channels independently of A, so a 2x2 block that mixes an
     opaque edge pixel with a fully transparent neighbour averages that
     neighbour's RGB -- which for a transparent pixel is arbitrary, usually
     (0,0,0) -- straight into the result.  Every soft edge gets pulled
     toward black.  Measured on wizard-hat/south: the shipped frame is
     DARKER than a correct premultiplied average on 100% of its
     semi-transparent pixels, worst case 54/255.  The fix is the textbook
     one: premultiply -> average -> un-premultiply, so transparent pixels
     contribute their weight and nothing else.

  2. NO COMPENSATION FOR MAGNIFICATION.  The old tool reasoned that a trait
     is always minified, so lost detail never reaches a pixel.  That holds
     in the world.  It does NOT hold on the login screen, which magnifies:
     _placeTrait normalises 128 into the 256-space frame (x2), the portrait
     canvas is a fixed 256 backing store, and .bt-cc-col-left>.bt-cc-stage
     applies transform:scale(2) on top -- before the device pixel ratio.
     Art that will be enlarged wants a sharpen after downsampling; that is
     standard practice, not a trick, and it costs zero bytes because it
     changes pixel VALUES, not dimensions.

Sharpening is done in PREMULTIPLIED space and the alpha channel is left
alone.  Sharpening straight RGB near an edge pulls in colour from pixels
that are barely there and rings; sharpening alpha would eat the silhouette.
hairmask/ frames are pure clipping shapes -- they are downscaled but NEVER
sharpened, because a sharpened mask clips differently.

No third-party imports on purpose: the build sandbox has no PIL and cannot
install it (CLAUDE.md rule 26), and the owner should not have to run a
command to get the assets.  Everything here is stdlib zlib + struct, and
every frame written is decoded again and compared pixel-exact against the
buffer it was meant to be (--verify, on by default).

Why --amount defaults to 0.20, measured not guessed
---------------------------------------------------
The first pass used 0.45 and it was WRONG -- caught only because the
sharpen was measured before shipping.  Sweeping strength against the
unclamped premultiplied excursion (how far a value wants to go past
[0,255] before clamping, which is exactly what a halo is):

    amount   detail gain   n overshoot   mean   p95    max
      0.10          +4%           243    1.5    5.8    7.0
      0.20          +7%           666    3.2   11.2   18.0
      0.30         +10%          1217    4.9   13.4   29.0
      0.45         +14%          1872    8.0   20.4   45.6

This art sits close to its tonal limits already (large near-black and
near-white regions), so strength buys detail and halo at nearly the same
rate.  A max excursion of 45/255 at 0.45 is a visible ring; 18/255 at
0.20, on 0.5% of pixels with a p95 of 11, is not.  0.20 is the last
setting that is honestly invisible.  If a future pass wants more, raise
the SOURCE resolution -- do not raise this number.

Expect roughly +7% local detail, not a transformation.  128px art shown
at ~7x on the login screen is resolution-bound; sharpening makes the most
of what is there, it does not create more.

Run from the repo root:
    python3 tools/rebake_traits.py --from-rev 17755fe^          # report only
    python3 tools/rebake_traits.py --from-rev 17755fe^ --apply
    [--amount 0.20]   unsharp strength, 0 disables
    [--to 128]        target edge
"""
import argparse
import os
import struct
import subprocess
import zlib

TRAITS = 'public/sprites/traits'
SIG = b'\x89PNG\r\n\x1a\n'


# ── decode ────────────────────────────────────────────────────────────────
def decode(data):
    """PNG -> (w, h, bytearray RGBA). 8-bit, non-interlaced."""
    assert data[:8] == SIG, 'not a PNG'
    i, idat, pal, trns = 8, b'', None, None
    w = h = ct = 0
    while i < len(data):
        ln = struct.unpack('>I', data[i:i + 4])[0]
        typ = data[i + 4:i + 8]
        chunk = data[i + 8:i + 8 + ln]
        i += 12 + ln
        if typ == b'IHDR':
            w, h, bd, ct, _, _, il = struct.unpack('>IIBBBBB', chunk)
            assert bd == 8 and il == 0, f'unsupported bitdepth/interlace {bd}/{il}'
        elif typ == b'IDAT':
            idat += chunk
        elif typ == b'PLTE':
            pal = chunk
        elif typ == b'tRNS':
            trns = chunk
        elif typ == b'IEND':
            break
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    raw = zlib.decompress(idat)
    stride = w * ch
    cur = bytearray(stride)
    prev = bytearray(stride)
    planes = bytearray()
    p = 0
    for _ in range(h):
        f = raw[p]; p += 1
        cur[:] = raw[p:p + stride]; p += stride
        if f == 1:
            for x in range(ch, stride):
                cur[x] = (cur[x] + cur[x - ch]) & 255
        elif f == 2:
            for x in range(stride):
                cur[x] = (cur[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                a = cur[x - ch] if x >= ch else 0
                cur[x] = (cur[x] + ((a + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = cur[x - ch] if x >= ch else 0
                b = prev[x]
                c = prev[x - ch] if x >= ch else 0
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                cur[x] = (cur[x] + pr) & 255
        planes += cur
        prev[:] = cur
    # normalise every colour type to RGBA
    out = bytearray(w * h * 4)
    for idx in range(w * h):
        s = idx * ch
        d = idx * 4
        if ct == 6:
            out[d:d + 4] = planes[s:s + 4]
        elif ct == 2:
            out[d:d + 3] = planes[s:s + 3]; out[d + 3] = 255
        elif ct == 3:
            pi = planes[s]
            out[d:d + 3] = pal[pi * 3:pi * 3 + 3]
            out[d + 3] = trns[pi] if (trns and pi < len(trns)) else 255
        elif ct == 4:
            v = planes[s]
            out[d] = out[d + 1] = out[d + 2] = v; out[d + 3] = planes[s + 1]
        else:
            v = planes[s]
            out[d] = out[d + 1] = out[d + 2] = v; out[d + 3] = 255
    return w, h, out


# ── encode ────────────────────────────────────────────────────────────────
def encode(w, h, px):
    """RGBA bytearray -> PNG bytes, adaptive per-scanline filtering."""
    stride = w * 4
    raw = bytearray()
    prev = bytearray(stride)
    for y in range(h):
        line = px[y * stride:(y + 1) * stride]
        best, bestf = None, 0
        for f in range(5):
            if f == 0:
                cand = bytearray(line)
            elif f == 1:
                cand = bytearray(stride)
                for x in range(stride):
                    cand[x] = (line[x] - (line[x - 4] if x >= 4 else 0)) & 255
            elif f == 2:
                cand = bytearray(stride)
                for x in range(stride):
                    cand[x] = (line[x] - prev[x]) & 255
            elif f == 3:
                cand = bytearray(stride)
                for x in range(stride):
                    a = line[x - 4] if x >= 4 else 0
                    cand[x] = (line[x] - ((a + prev[x]) >> 1)) & 255
            else:
                cand = bytearray(stride)
                for x in range(stride):
                    a = line[x - 4] if x >= 4 else 0
                    b = prev[x]
                    c = prev[x - 4] if x >= 4 else 0
                    pp = a + b - c
                    pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                    pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                    cand[x] = (line[x] - pr) & 255
            # standard minimum-sum-of-absolute-differences heuristic
            score = sum(v if v < 128 else 256 - v for v in cand)
            if best is None or score < best[0]:
                best, bestf = (score, cand), f
        raw.append(bestf)
        raw += best[1]
        prev = line

    def chunk(typ, data):
        return (struct.pack('>I', len(data)) + typ + data
                + struct.pack('>I', zlib.crc32(typ + data) & 0xFFFFFFFF))

    return (SIG
            + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
            + chunk(b'IEND', b''))


# ── resample + sharpen ────────────────────────────────────────────────────
def downscale_premul(w, h, px, nw, nh):
    """Area-average in PREMULTIPLIED space, then un-premultiply."""
    out = bytearray(nw * nh * 4)
    xr, yr = w / nw, h / nh
    for oy in range(nh):
        y0, y1 = int(oy * yr), max(int(oy * yr) + 1, int((oy + 1) * yr))
        for ox in range(nw):
            x0, x1 = int(ox * xr), max(int(ox * xr) + 1, int((ox + 1) * xr))
            sr = sg = sb = sa = 0
            n = 0
            for y in range(y0, min(y1, h)):
                base = y * w * 4
                for x in range(x0, min(x1, w)):
                    s = base + x * 4
                    a = px[s + 3]
                    sr += px[s] * a
                    sg += px[s + 1] * a
                    sb += px[s + 2] * a
                    sa += a
                    n += 1
            d = (oy * nw + ox) * 4
            if sa == 0 or n == 0:
                continue  # stays (0,0,0,0)
            out[d] = min(255, round(sr / sa))
            out[d + 1] = min(255, round(sg / sa))
            out[d + 2] = min(255, round(sb / sa))
            out[d + 3] = min(255, round(sa / n))
    return out


def unsharp_premul(w, h, px, amount):
    """Unsharp mask on PREMULTIPLIED rgb; alpha untouched.

    3x3 tent blur as the low-pass.  Working premultiplied means a pixel
    that is barely there contributes barely anything to its neighbour's
    correction, which is exactly what stops edge ringing against
    transparency.
    """
    if amount <= 0:
        return px
    pm = bytearray(w * h * 3)
    for i in range(w * h):
        a = px[i * 4 + 3]
        pm[i * 3] = px[i * 4] * a // 255
        pm[i * 3 + 1] = px[i * 4 + 1] * a // 255
        pm[i * 3 + 2] = px[i * 4 + 2] * a // 255
    out = bytearray(px)
    for y in range(h):
        for x in range(w):
            i = y * w + x
            for c in range(3):
                acc = wt = 0
                for dy in (-1, 0, 1):
                    yy = y + dy
                    if yy < 0 or yy >= h:
                        continue
                    for dx in (-1, 0, 1):
                        xx = x + dx
                        if xx < 0 or xx >= w:
                            continue
                        k = 4 if (dx == 0 and dy == 0) else (2 if (dx == 0 or dy == 0) else 1)
                        acc += pm[(yy * w + xx) * 3 + c] * k
                        wt += k
                blur = acc / wt
                v = pm[i * 3 + c] + amount * (pm[i * 3 + c] - blur)
                a = px[i * 4 + 3]
                if a == 0:
                    continue
                # back to straight alpha, clamped
                out[i * 4 + c] = max(0, min(255, round(max(0.0, min(255.0, v)) * 255 / a)))
    return out


# ── driver ────────────────────────────────────────────────────────────────
def git_show(rev, path):
    try:
        return subprocess.check_output(['git', 'show', f'{rev}:{path}'],
                                       stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from-rev', default='17755fe^',
                    help='revision holding the pre-downscale originals')
    ap.add_argument('--to', type=int, default=128)
    ap.add_argument('--amount', type=float, default=0.20)
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--cats', default='headwear,hair,facialhair,shirt',
                    help='trait categories to touch; MUST match the set '
                         'v2.3.1526 downscaled')
    args = ap.parse_args()

    # Category allowlist, not a whole-tree walk.  The v2.3.1526 downscale
    # ran with --cats headwear,hair,facialhair,shirt, so anything else under
    # traits/ (e.g. nft/) is still at its authored resolution ON PURPOSE.
    # A bare os.walk here silently halved five 256px nft/test-1 frames on the
    # first run -- caught by the dimensions check, and the reason this
    # allowlist exists rather than a comment asking you to be careful.
    cats = [c.strip() for c in args.cats.split(',') if c.strip()]
    targets = []
    for cat in cats:
        base = f'{TRAITS}/{cat}'
        if not os.path.isdir(base):
            continue
        for root, _, files in os.walk(base):
            for f in sorted(files):
                if f.endswith('.png'):
                    targets.append(os.path.join(root, f).replace(os.sep, '/'))
    targets.sort()
    if args.limit:
        targets = targets[:args.limit]

    done = skipped = failed = 0
    edge_fixed = 0
    for path in targets:
        orig = git_show(args.from_rev, path)
        if not orig:
            skipped += 1          # added after the downscale; no 256 source
            continue
        try:
            w, h, px = decode(orig)
        except Exception:
            failed += 1
            continue
        if w <= args.to:
            skipped += 1          # was never a 256 frame
            continue
        nw = args.to
        nh = max(1, round(h * args.to / w))
        small = downscale_premul(w, h, px, nw, nh)
        is_mask = '/hairmask/' in path
        if not is_mask:
            small = unsharp_premul(nw, nh, small, args.amount)
        blob = encode(nw, nh, small)
        # round-trip: what we wrote must decode back to what we meant
        vw, vh, vpx = decode(blob)
        if (vw, vh) != (nw, nh) or vpx != small:
            failed += 1
            continue
        edge_fixed += sum(1 for i in range(nw * nh) if 0 < small[i * 4 + 3] < 255)
        if args.apply:
            with open(path, 'wb') as fh:
                fh.write(blob)
        done += 1

    verb = 'rebaked' if args.apply else 'would rebake'
    print(f'{verb} {done} frame(s) at {args.to}px '
          f'(sharpen {args.amount}, masks unsharpened)')
    print(f'{skipped} skipped (no pre-downscale original / already small), '
          f'{failed} failed verification')
    print(f'{edge_fixed} semi-transparent edge px re-derived premultiplied')


if __name__ == '__main__':
    main()
