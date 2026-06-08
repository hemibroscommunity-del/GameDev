#!/usr/bin/env python3
"""Generate the flat key-color tool silhouettes used as generation aids.

These are NOT shipped game art. They are plain #FF00FF (magenta) stand-in shapes
you paste/reference into the ChatGPT first-frame prompt so every generation of a
motion archetype shares the same tool grip, scale, and orientation. The flat key
color also doubles as a recolor mask for per-tier weapon variants.

See docs/skill-animation-pipeline.md. Re-run any time:

    python tools/silhouettes/make_silhouettes.py

Output: tools/silhouettes/<name>.png  (256x256, RGBA, transparent background,
opaque #FF00FF shape, hard edges / no anti-aliasing).
"""

from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 256
KEY = (255, 0, 255, 255)   # #FF00FF — outside the game palette, isolates cleanly
CLEAR = (0, 0, 0, 0)
OUT = Path(__file__).resolve().parent


def canvas():
    img = Image.new("RGBA", (SIZE, SIZE), CLEAR)
    return img, ImageDraw.Draw(img)


def save(img, name):
    path = OUT / f"{name}.png"
    img.save(path)
    print(f"wrote {path.relative_to(OUT.parents[1])}")


def blade(length_frac=0.78, width=26, guard=70, name="blade"):
    """Long straight sword: vertical blade, crossguard, grip + pommel."""
    img, d = canvas()
    cx = SIZE // 2
    top = int(SIZE * (1 - length_frac) / 2)
    tip = top
    guard_y = int(SIZE * 0.70)
    # blade (tapered to a point)
    d.polygon([(cx, tip), (cx + width // 2, guard_y - 30),
               (cx - width // 2, guard_y - 30)], fill=KEY)
    d.rectangle([cx - width // 2, guard_y - 60, cx + width // 2, guard_y], fill=KEY)
    # crossguard
    d.rectangle([cx - guard // 2, guard_y, cx + guard // 2, guard_y + 14], fill=KEY)
    # grip
    d.rectangle([cx - 12, guard_y + 14, cx + 12, guard_y + 64], fill=KEY)
    # pommel
    d.ellipse([cx - 16, guard_y + 60, cx + 16, guard_y + 92], fill=KEY)
    save(img, name)


def wedge_haft(name="wedge-haft"):
    """Axe / pickaxe: long haft with a wedge head near the top."""
    img, d = canvas()
    cx = SIZE // 2
    # haft
    d.rectangle([cx - 12, 30, cx + 12, 226], fill=KEY)
    # wedge head (triangle to the right, near top)
    d.polygon([(cx + 10, 48), (cx + 78, 70), (cx + 10, 96)], fill=KEY)
    # back spur (small, left) — pickaxe-ish
    d.polygon([(cx - 10, 56), (cx - 52, 72), (cx - 10, 88)], fill=KEY)
    save(img, name)


def block_haft(name="block-haft"):
    """Hammer / maul: long haft with a heavy rectangular head."""
    img, d = canvas()
    cx = SIZE // 2
    d.rectangle([cx - 14, 36, cx + 14, 230], fill=KEY)
    d.rectangle([cx - 56, 40, cx + 56, 92], fill=KEY)   # blocky head
    save(img, name)


def pole(name="pole"):
    """Spear / staff / fishing rod: long thin shaft, slight taper."""
    img, d = canvas()
    cx = SIZE // 2
    d.polygon([(cx - 7, 20), (cx + 7, 20), (cx + 11, 236), (cx - 11, 236)], fill=KEY)
    save(img, name)


def bow_arc(name="bow-arc"):
    """Bow: a C-shaped arc with a straight string chord."""
    img, d = canvas()
    cx, cy = SIZE // 2, SIZE // 2
    # outer arc minus inner arc -> a thick C opening to the right
    bbox_out = [cx - 60, 28, cx + 110, 228]
    bbox_in = [cx - 40, 48, cx + 90, 208]
    d.arc(bbox_out, start=120, end=240, fill=KEY, width=16)
    # string chord between the two tips
    import math
    def tip(bbox, deg):
        x0, y0, x1, y1 = bbox
        rx, ry = (x1 - x0) / 2, (y1 - y0) / 2
        ox, oy = x0 + rx, y0 + ry
        a = math.radians(deg)
        return (ox + rx * math.cos(a), oy + ry * math.sin(a))
    t1 = tip(bbox_out, 120)
    t2 = tip(bbox_out, 240)
    d.line([t1, t2], fill=KEY, width=6)
    save(img, name)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    blade(name="blade")
    blade(length_frac=0.5, width=22, guard=54, name="blade-short")
    wedge_haft()
    block_haft()
    pole()
    bow_arc()


if __name__ == "__main__":
    main()
