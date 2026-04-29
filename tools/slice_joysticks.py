"""Crop the four joystick assets out of the deflected mockup screenshot.

The user uploaded two reference images: joysticks at rest (centered)
and joysticks pushed (thumbs displaced).  The deflected image is
useful because the BASE donut and the THUMB disc are spatially
separated, so each can be cut out without painting over the other.

Outputs four PNGs to public/icons/ui/ with black-background pixels
turned transparent:
  joy-base-left.png   joy-thumb-left.png
  joy-base-right.png  joy-thumb-right.png
"""
from pathlib import Path
from PIL import Image

DEFLECTED = Path('public/icons/ui/dashboard-mockup-new1.jpg')
OUT_DIR   = Path('public/icons/ui')

# Hand-measured crop boxes in source-px coords.  Source is 688x1504.
# Each is (left, top, right, bottom).  Left joystick spans roughly
# x=25..327, right joystick x=368..655.  Within each, the deflected
# image clearly shows base (donut) and thumb (small disc) at different
# locations.  The boxes intentionally generous-pad so the rounded
# silhouettes have a few px of black to fade into transparency.
CROPS = {
    'joy-base-left':   (110, 660, 330, 880),  # bottom-right portion of left bbox
    'joy-thumb-left':  ( 25, 555, 200, 720),  # upper-left portion of left bbox
    'joy-base-right':  (370, 590, 590, 800),  # upper-left portion of right bbox
    'joy-thumb-right': (480, 770, 660, 930),  # bottom-right portion of right bbox
}

# Black-to-transparent threshold: any pixel with R+G+B below this gets
# alpha=0; gentler fade above to avoid hard edges around the artwork.
BLACK_THRESH = 24

def make_transparent(crop):
    crop = crop.convert('RGBA')
    px = crop.load()
    w, h = crop.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            tot = r + g + b
            if tot < BLACK_THRESH * 3:
                px[x, y] = (0, 0, 0, 0)
            elif tot < BLACK_THRESH * 6:
                # Soft falloff for anti-aliased rim pixels.
                alpha = int((tot - BLACK_THRESH * 3) / (BLACK_THRESH * 3) * 255)
                px[x, y] = (r, g, b, alpha)
    return crop

def main():
    if not DEFLECTED.exists():
        raise SystemExit(f'No source at {DEFLECTED}')
    img = Image.open(DEFLECTED).convert('RGB')
    print(f'Source: {img.size}')
    for name, box in CROPS.items():
        crop = img.crop(box)
        rgba = make_transparent(crop)
        out = OUT_DIR / f'{name}.png'
        rgba.save(out, 'PNG', optimize=True)
        print(f'  {name:18s} -> {out.name}  ({rgba.width}x{rgba.height})')

if __name__ == '__main__':
    main()
