"""Convert the user-uploaded shard art (UUID-named PNGs in repo root)
into game-ready icons at public/icons/shards/shard_<element>.png.

Each source PNG is 1254 x 1254 RGB with a near-solid background
(black for 7 of them, cyan for the ember flame).  We chroma-key the
background to alpha, downscale to 256 x 256 with LANCZOS for crisp
inventory + ground-overlay rendering, and save.

Run: python tools/shards/import_real_shards.py
"""
import os
from PIL import Image

OUT_DIR = "public/icons/shards"
OUT_SIZE = 256

# Source filename -> shard element (matches keys in src/data/shards.js).
MAPPING = {
    "0A9EC6BE-0BC4-4642-9DD9-2AF418A798E3.png": "thunder",
    "2BAA484E-548C-4BF2-A9F3-EFEBEFA9B4E7.png": "tidal",
    "3262AB86-D4DA-41AC-A291-6CBD54495E31.png": "meadow",
    "578AC395-AEA4-491E-A9C4-A500DDCCE49F.png": "mist",
    "5A99E474-60C8-4BA4-87C8-C960E93F5C81.png": "hollows",
    "91A7648C-447B-410E-9A8F-321FBB3152CF.png": "frost",
    "9D366C31-E2B1-4361-B972-EFD108E7B9C1.png": "ember",
    "FDA70E2F-9298-4FE1-B528-BE684570B5DA.png": "sky",
}

# The ember sheet ships with a cyan #00FFFF background instead of
# black -- key it differently.  Everything else uses near-black.
CYAN_BG = {"ember"}


def key_out_black(im):
    """Make near-black pixels transparent.  Uses brightness threshold
    + a small feather so soft anti-aliased edges fade out cleanly
    instead of clamping to a hard alpha cutoff."""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            v = max(r, g, b)
            if v < 20:
                a = 0
            elif v < 60:
                a = int((v - 20) / 40 * 255)
            else:
                a = 255
            px[x, y] = (r, g, b, a)


def key_out_cyan(im):
    """Make cyan-dominant pixels transparent.  Cyan signature: low R,
    high G+B that are close to each other.  Same feather idea so the
    flame's bright-orange edges blend out smoothly rather than leaving
    a teal halo."""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            # Distance from pure cyan in the dominant axes.
            cyan_score = (255 - r) + min(g, b) - abs(g - b)
            if r < 30 and g > 220 and b > 220:
                a = 0
            elif r < 90 and cyan_score > 540:
                # Soft edge -- partial transparency on the halo.
                a = max(0, 255 - cyan_score + 200)
            else:
                a = 255
            px[x, y] = (r, g, b, a)


def convert(src, dst, use_cyan):
    im = Image.open(src).convert("RGBA")
    if use_cyan:
        key_out_cyan(im)
    else:
        key_out_black(im)
    im = im.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    im.save(dst)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for src, elem in MAPPING.items():
        if not os.path.exists(src):
            print(f"skip {elem}: {src} not found")
            continue
        dst = os.path.join(OUT_DIR, f"shard_{elem}.png")
        convert(src, dst, elem in CYAN_BG)
        print(f"wrote {dst}")


if __name__ == "__main__":
    main()
