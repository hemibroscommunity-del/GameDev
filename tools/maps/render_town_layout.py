#!/usr/bin/env python3
"""The town, drawn the way the game draws it  (v2.3.2073).

Owner: "Then show me the whole map layout."

A picture of the town at world scale with every prop composited at its own
position and size, every NPC at theirs, and every blocking footprint drawn on
top -- so "what is where" and "what can I walk through" are one image rather
than two tables and a guess.

IT READS THE LIVE DATA.  worldProps.js and gameDisplay.js are dumped through
node and the same arithmetic the renderers use is applied here (bottom-centre
anchor, worldH scaling, the NPC feet baseline and per-sprite multiplier), so a
prop moved in the data moves in this picture without anyone remembering to
update a second copy.  That is the whole point: a layout diagram maintained by
hand is a diagram that lies, and this one is regenerated rather than edited.

  python3 tools/maps/render_town_layout.py
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, 'tools', 'maps', 'out', 'town-layout.png')

W, H = 1664, 1760                 # town: 52 x 55 tiles at TILE 32
NPC_FRAME_FEET_Y, NPC_SPRITE_SCALE = 223, 120 / 256
NPC_SCALE_MULT = {
    '/sprites/npc/mayor-bro.webp': 1.10,
    '/sprites/npc/shopkeeper-bro-walk-south.webp': 1.30,
    '/sprites/npc/lil-bro-walk-south.webp': 0.78,
}


def node(expr):
    r = subprocess.run(['node', '-e', expr], capture_output=True, text=True, cwd=REPO)
    if r.returncode != 0:
        sys.exit('node failed: ' + r.stderr[-800:])
    return json.loads(r.stdout)


PROPS = node("import('%s/src/data/worldProps.js').then(m=>console.log(JSON.stringify("
             "m.propsForZone('town').map(p=>Object.assign({},p,{_fp:m.propFootprint(p)})))))" % REPO)
NPCS = node("import('%s/src/data/gameDisplay.js').then(m=>console.log(JSON.stringify("
            "m.NPC_DATA.filter(n=>!n.zone||n.zone==='town'))))" % REPO)
EXITS = node("import('%s/src/data/effects.js').then(m=>console.log(JSON.stringify(m.TOWN_EXITS)))" % REPO)


def asset(p):
    return os.path.join(REPO, 'public', p.lstrip('/'))


def font(sz, bold=True):
    for name in (('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'),):
        for d in ('/usr/share/fonts/truetype/dejavu/', '/usr/share/fonts/TTF/'):
            try:
                return ImageFont.truetype(d + name, sz)
            except OSError:
                pass
    return ImageFont.load_default()


base = Image.open(asset('/maps/town_v17.webp')).convert('RGBA').resize((W, H), Image.LANCZOS)

# Painter's order, the way the world sorts: further north draws first.
for p in sorted(PROPS, key=lambda q: q['y']):
    try:
        im = Image.open(asset(p['sprite'])).convert('RGBA')
    except OSError:
        continue
    fw = im.width // p['anim']['frames'] if p.get('anim') else im.width
    im = im.crop((0, 0, fw, im.height))
    k = p['worldH'] / im.height
    dw, dh = max(1, round(fw * k)), max(1, round(im.height * k))
    im = im.resize((dw, dh), Image.LANCZOS)
    if p.get('flipX'):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    base.alpha_composite(im, (round(p['x'] - dw / 2), round(p['y'] - dh)))

for n in NPCS:
    try:
        im = Image.open(asset(n['sprite'])).convert('RGBA')
    except OSError:
        continue
    # A walk STRIP is four frames wide; take the first (south, standing).
    fw = im.width // 4 if im.width >= im.height * 2 else im.width
    im = im.crop((0, 0, fw, im.height))
    k = NPC_SPRITE_SCALE * NPC_SCALE_MULT.get(n['sprite'], 1.0)
    dw, dh = max(1, round(fw * k)), max(1, round(im.height * k))
    im = im.resize((dw, dh), Image.LANCZOS)
    base.alpha_composite(im, (round(n['x'] - dw / 2), round(n['y'] - NPC_FRAME_FEET_Y * k)))

ov = Image.new('RGBA', base.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
F, FS = font(21), font(18)


def label(x, y, text, fill, f=None):
    f = f or F
    box = d.textbbox((0, 0), text, font=f)
    w, h = box[2] - box[0] + 14, box[3] - box[1] + 12
    d.rounded_rectangle([x - w / 2, y, x + w / 2, y + h], 5, fill=(8, 14, 18, 220))
    d.text((x, y + h / 2), text, font=f, fill=fill, anchor='mm')


blocking = dressing = 0
for p in PROPS:
    f = p.get('_fp')
    if f:
        blocking += 1
        d.rectangle([f['x0'], f['y0'], f['x1'], f['y1']],
                    fill=(233, 86, 86, 60), outline=(233, 86, 86, 245), width=3)
    else:
        dressing += 1
        d.rectangle([p['x'] - 17, p['y'] - 17, p['x'] + 17, p['y'] + 4],
                    outline=(120, 200, 255, 215), width=3)
    label(p['x'], p['y'] + 8, p['id'], (255, 180, 180) if f else (168, 216, 255), FS)

for n in NPCS:
    x, y = n['x'], n['y']
    d.ellipse([x - 15, y - 15, x + 15, y + 15], outline=(124, 196, 255, 245), width=3)
    if n.get('pathRadius'):
        r = n['pathRadius']
        d.ellipse([x - r, y - r, x + r, y + r], outline=(124, 196, 255, 110), width=3)
    title = n['name'] + (' — ' + n['plateRole'] if n.get('plateRole') else '')
    label(x, y + 22, title, (207, 232, 255))

for e in EXITS:
    x, y = e['tx'] * 32 + 16, e['ty'] * 32 + 16
    d.ellipse([x - 27, y - 27, x + 27, y + 27], outline=(216, 170, 88, 245), width=4)
    label(x, y + 32, 'exit → ' + e['zoneId'], (240, 217, 164))

d.rounded_rectangle([22, 22, 560, 176], 10, fill=(8, 14, 18, 226))
d.text((42, 38), 'BroTown — town layout', font=font(28), fill=(244, 240, 231))
d.text((42, 80), 'red box  = blocking footprint (%d)' % blocking, font=F, fill=(255, 180, 180))
d.text((42, 110), 'blue box = walk-through dressing (%d)' % dressing, font=F, fill=(168, 216, 255))
d.text((42, 140), 'faint circle = an NPC’s wander radius', font=F, fill=(207, 232, 255))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
Image.alpha_composite(base, ov).convert('RGB').save(OUT, quality=92)
print('wrote %s  (%dx%d)  %d props: %d blocking, %d dressing; %d townsfolk'
      % (OUT, W, H, len(PROPS), blocking, dressing, len(NPCS)))
