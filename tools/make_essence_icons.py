#!/usr/bin/env python3
"""v2.3.3110: the essence bag icons, one per grade and metal, drawn in code.

Owner, 2026-10-06: "if you salvage the rare, elite, and godly armor you can get
back that tier's 'essence' and use it on whatever same tier armor or weapon you
want", and for gear: "rare is blue, elite is orange, godly is prismatic".

An essence is a glowing orb in its GRADE's colour, a soft three-armed swirl
round a bright core, with its METAL's own bar (public/icons/items/bar-<metal>
.webp, tools/make_bar_icons.py) tucked in at the bottom right -- so the two
facts the Blacksmith's Salvage tab matches on (which grade, which metal) are
both in the picture.  A placeholder until painted art is commissioned
(docs/ART-WISHLIST.md); a new grade or metal is one line below.

    python3 tools/make_essence_icons.py

writes public/icons/items/essence-<grade>-<metal>.webp at 256x256, the size of
every other item icon.  Needs Pillow with WebP (tools/webp_icons.py).
"""
import colorsys
import math

from PIL import Image, ImageDraw, ImageFilter

OUT = 'public/icons/items/essence-{}-{}.webp'
BAR = 'public/icons/items/bar-{}.webp'
S = 256

# grade -> (core, rim, glow); godly is drawn as a hue wheel instead
GRADES = {
    'rare': ((150, 205, 255), (30, 80, 170), (70, 140, 240)),
    'elite': ((255, 214, 150), (190, 80, 20), (240, 140, 50)),
    'godly': ((255, 255, 255), (255, 255, 255), (255, 230, 160)),
}
METALS = ['copper', 'iron', 'blacksteel']


def orb(core, rim, glow, prism):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    cx, cy, R = S // 2, S // 2 - 6, 78
    # the glow round it
    halo = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse([cx - R - 26, cy - R - 26, cx + R + 26, cy + R + 26], fill=glow + (150,))
    im.alpha_composite(halo.filter(ImageFilter.GaussianBlur(18)))
    # the sphere: core to rim, lit from the top left
    sph = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    px = sph.load()
    for y in range(cy - R, cy + R + 1):
        for x in range(cx - R, cx + R + 1):
            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy) / R
            if d > 1:
                continue
            lx, ly = x - (cx - R * 0.35), y - (cy - R * 0.35)
            light = max(0.0, 1 - math.hypot(lx, ly) / (R * 1.5))
            t = min(1.0, d ** 1.6)
            if prism:
                h = ((math.atan2(dy, dx) / (2 * math.pi)) % 1.0 + d * 0.35) % 1.0
                r, g, b = colorsys.hsv_to_rgb(h, 0.55 + 0.35 * t, 1.0)
                c = tuple(int(v * 255 * (1 - 0.45 * t) + 255 * 0.25 * light) for v in (r, g, b))
            else:
                c = tuple(int(core[i] * (1 - t) + rim[i] * t) for i in range(3))
                c = tuple(min(255, int(c[i] + 120 * light * light)) for i in range(3))
            edge = 255 if d < 0.97 else int(255 * (1 - (d - 0.97) / 0.03))
            px[x, y] = tuple(min(255, max(0, v)) for v in c) + (edge,)
    im.alpha_composite(sph)
    # the essence inside: three soft arms round a bright core
    sw = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sw)
    for arm in range(3):
        for i in range(60):
            t = i / 60.0
            ang = arm * 2 * math.pi / 3 + t * 3.4
            rr = R * 0.08 + R * 0.62 * t
            x, y = cx + math.cos(ang) * rr, cy + math.sin(ang) * rr
            w = 7 * (1 - t) + 2
            sd.ellipse([x - w, y - w, x + w, y + w], fill=(255, 255, 255, int(150 * (1 - t) + 30)))
    sd.ellipse([cx - R * 0.2, cy - R * 0.2, cx + R * 0.2, cy + R * 0.2], fill=(255, 255, 255, 220))
    im.alpha_composite(sw.filter(ImageFilter.GaussianBlur(4)))
    # a highlight, the outline, three sparkles
    hl = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(hl).ellipse([cx - R * 0.62, cy - R * 0.7, cx - R * 0.12, cy - R * 0.32], fill=(255, 255, 255, 170))
    im.alpha_composite(hl.filter(ImageFilter.GaussianBlur(5)))
    ol = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(ol).ellipse([cx - R, cy - R, cx + R, cy + R], outline=(14, 18, 24, 230), width=5)
    im.alpha_composite(ol)
    d = ImageDraw.Draw(im)
    for sx, sy, sz in [(cx + R * 0.95, cy - R * 0.85, 13), (cx - R * 1.05, cy + R * 0.55, 9), (cx + R * 0.6, cy + R * 1.05, 7)]:
        d.polygon([(sx, sy - sz), (sx + sz * 0.28, sy - sz * 0.28), (sx + sz, sy), (sx + sz * 0.28, sy + sz * 0.28),
                   (sx, sy + sz), (sx - sz * 0.28, sy + sz * 0.28), (sx - sz, sy), (sx - sz * 0.28, sy - sz * 0.28)],
                  fill=(255, 255, 255, 235))
    return im


def with_bar(im, metal):
    bar = Image.open(BAR.format(metal)).convert('RGBA')
    bar = bar.crop(bar.getbbox())
    w = 104
    h = int(bar.height * w / bar.width)
    bar = bar.resize((w, h), Image.LANCZOS)
    out = im.copy()
    out.alpha_composite(bar, (S - w - 6, S - h - 8))
    return out


def main():
    for grade, (core, rim, glow) in GRADES.items():
        base = orb(core, rim, glow, grade == 'godly')
        for metal in METALS:
            path = OUT.format(grade, metal)
            with_bar(base, metal).save(path, 'WEBP', quality=88, method=6)  # lossy: soft glows, a quarter the bytes
            print('wrote', path)


if __name__ == '__main__':
    main()
