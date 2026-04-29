"""Scan the mockup row-by-row to find each bar's color band — outputs a
y-range for HP / MP / STA / XP that's tight to the colored capsule."""
from pathlib import Path
from PIL import Image

SRC = Path('public/icons/ui/dashboard-mockup.png')
img = Image.open(SRC).convert('RGB')
w, h = img.size
print(f'Source: {w}x{h}')

# Sample a vertical column near horizontal centre — the bar capsules
# span almost the full width so any column far from the edges hits the
# capsule fill colour where present.
SAMPLE_X = w // 2

# Each bar's signature colour from the mockup — high-saturation pixels
# at the centre row of the capsule.
CHANNELS = {
    'hp':   ('R',),
    'mp':   ('B',),
    'stam': ('R', 'G'),  # yellow
    'xp':   ('G',),
}

def is_capsule(rgb):
    r, g, b = rgb
    if r > 180 and g < 100 and b < 110: return 'hp'
    if r > 200 and g > 160 and b < 90:  return 'stam'
    if r < 160 and g > 110 and b < 140 and g > r: return 'xp'
    if r < 120 and g < 160 and b > 180: return 'mp'
    return None

bands = {}
for y in range(h):
    rgb = img.getpixel((SAMPLE_X, y))
    kind = is_capsule(rgb)
    if kind:
        if kind not in bands:
            bands[kind] = [y, y]
        else:
            bands[kind][1] = y

for k in ['hp', 'mp', 'stam', 'xp']:
    if k in bands:
        top, bot = bands[k]
        print(f'  {k:5s}: y={top}..{bot}  height={bot-top+1}')
    else:
        print(f'  {k:5s}: NOT FOUND')
