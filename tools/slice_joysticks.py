"""Slice ONE composite per joystick from the still mockup.  We tried
splitting base + displaceable thumb earlier but the deflected source's
displaced thumb bled into the masked base.  Going with a single
static composite per joystick instead — base ring + centred thumb
together, circle-masked to its outer silhouette."""
from pathlib import Path
from PIL import Image, ImageDraw

STILL   = Path('public/icons/ui/dashboard-mockup-new2.jpg')
OUT_DIR = Path('public/icons/ui')

# Centres measured by inspect_joysticks.py:
#   left thumb (175, 766), right thumb (508, 729)  in the still source.
LEFT_CENTER  = (175, 766)
RIGHT_CENTER = (508, 729)
OUTER_R      = 122          # full joystick silhouette
OUT_SIZE     = 256

PIECES = {
    'joy-left':  LEFT_CENTER,
    'joy-right': RIGHT_CENTER,
}

def cut(img, cx, cy, r):
    pad = r + 8
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
    if not STILL.exists():
        raise SystemExit('Still mockup required at ' + str(STILL))
    img = Image.open(STILL).convert('RGB')
    print(f'Source: {img.size}')
    for name, (cx, cy) in PIECES.items():
        out = cut(img, cx, cy, OUTER_R)
        path = OUT_DIR / f'{name}.png'
        out.save(path, 'PNG', optimize=True)
        print(f'  {name:10s} -> {path.name}  {OUT_SIZE}x{OUT_SIZE}')

if __name__ == '__main__':
    main()
