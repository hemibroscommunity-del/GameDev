"""Slice the two clean joystick base discs from the user's latest mockup
(both sides without any thumb overlay).  Outputs joy-base-left.png and
joy-base-right.png — circle-masked at a 155-px outer radius."""
from pathlib import Path
from PIL import Image, ImageDraw

SRC     = Path('public/icons/ui/dashboard-mockup-new0.jpg')
OUT_DIR = Path('public/icons/ui')

# Hand-measured centres + radius from the new clean source.
LEFT_CENTER  = (177, 753)
RIGHT_CENTER = (511, 752)
OUTER_R      = 155
OUT_SIZE     = 256

PIECES = {
    'joy-base-left':  LEFT_CENTER,
    'joy-base-right': RIGHT_CENTER,
}

def cut(img, cx, cy, r):
    pad = r + 6
    raw = img.crop((cx - pad, cy - pad, cx + pad, cy + pad)).convert('RGBA')
    rw, rh = raw.size
    mask = Image.new('L', (rw, rh), 0)
    ImageDraw.Draw(mask).ellipse(
        (rw/2 - r, rh/2 - r, rw/2 + r, rh/2 + r), fill=255)
    raw.putalpha(mask)
    out = Image.new('RGBA', (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    scale = OUT_SIZE / max(rw, rh)
    nw, nh = int(rw * scale), int(rh * scale)
    out.paste(raw.resize((nw, nh), Image.LANCZOS),
              ((OUT_SIZE - nw) // 2, (OUT_SIZE - nh) // 2))
    return out

def main():
    if not SRC.exists():
        raise SystemExit(f'No source at {SRC}')
    img = Image.open(SRC).convert('RGB')
    print(f'Source: {img.size}')
    for name, (cx, cy) in PIECES.items():
        out = cut(img, cx, cy, OUTER_R)
        path = OUT_DIR / f'{name}.png'
        out.save(path, 'PNG', optimize=True)
        print(f'  {name:18s} -> {path.name}')

if __name__ == '__main__':
    main()
