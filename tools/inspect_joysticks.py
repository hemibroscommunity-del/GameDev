"""Locate joystick base / thumb centres in the deflected mockup by
scanning for small windows densely populated with the right colour.
Bases are detected by their dark hole; thumbs by dark-purple solid
discs.  Restricted to the band y=555..920 where the joysticks live."""
from pathlib import Path
from PIL import Image

img = Image.open(Path('public/icons/ui/dashboard-mockup-new3.jpg')).convert('RGB')
w, h = img.size
print(f'Source: {w}x{h}')

WIN = 40   # half-window for density scan
BAND_TOP, BAND_BOT = 555, 920

# Predicates.
def is_purple(rgb):
    r, g, b = rgb
    # Light translucent purple of the rings
    return r > 100 and r < 230 and g > 70 and g < 180 and b > 130 and b < 240 and b > r

def is_dark_purple(rgb):
    r, g, b = rgb
    return 40 < r < 110 and 30 < g < 90 and 60 < b < 140 and b > r

def is_dark_hole(rgb):
    # Dark-purple-grey, much darker than ring colour but not pure black
    r, g, b = rgb
    return r < 40 and g < 40 and b < 60 and (r + g + b) > 5

def density(predicate, cx, cy):
    cnt = 0
    for y in range(max(0, cy - WIN), min(h, cy + WIN), 4):
        for x in range(max(0, cx - WIN), min(w, cx + WIN), 4):
            if predicate(img.getpixel((x, y))): cnt += 1
    return cnt

def scan_max(predicate, x_lo, x_hi, y_lo, y_hi):
    best = (0, None)
    for cy in range(y_lo, y_hi, 20):
        for cx in range(x_lo, x_hi, 20):
            d = density(predicate, cx, cy)
            if d > best[0]:
                best = (d, (cx, cy))
    return best

print('LEFT side')
print('  hole peak:    ', scan_max(is_dark_hole, 50, 320, BAND_TOP, BAND_BOT))
print('  thumb peak:   ', scan_max(is_dark_purple, 30, 200, 580, 720))
print('RIGHT side')
print('  hole peak:    ', scan_max(is_dark_hole, 380, 660, BAND_TOP, BAND_BOT))
print('  thumb peak:   ', scan_max(is_dark_purple, 460, 660, 770, 920))
