"""Slice the second batch of toolbar icons from the user's latest
mockup.  Layout matches the first batch: 7 illustrations across the
bottom of a 1504×688 image, with text captions cropped off above the
glyph row.

Outputs go alongside the existing icons in public/icons/ui/ at the
same 256×256 footprint:
    friends.png  playercard.png  leaderboard.png
    clan.png     guild.png       feedback.png  settings.png
"""
from pathlib import Path
from PIL import Image

SRC      = Path('public/icons/ui/dashboard-mockup-new0.jpg')
OUT_DIR  = Path('public/icons/ui')

TOOLBAR_TOP    = 460
TOOLBAR_BOTTOM = 615

NAMES = ['friends', 'playercard', 'leaderboard', 'clan', 'guild', 'feedback', 'settings']

def main():
    if not SRC.exists():
        raise SystemExit(f'No source image at {SRC}.')
    img = Image.open(SRC).convert('RGBA')
    w, h = img.size
    print(f'Source: {w}x{h}')
    col_w = w / len(NAMES)
    for i, name in enumerate(NAMES):
        left  = int(round(i * col_w))
        right = int(round((i + 1) * col_w))
        crop = img.crop((left, TOOLBAR_TOP, right, TOOLBAR_BOTTOM))
        side = max(crop.size)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
        sq = sq.resize((256, 256), Image.LANCZOS)
        out = OUT_DIR / f'{name}.png'
        sq.save(out, 'PNG', optimize=True)
        print(f'  {name:12s} -> {out.name}')

if __name__ == '__main__':
    main()
