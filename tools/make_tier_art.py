#!/usr/bin/env python3
"""v2.3.3012: the gathering tiers' own colours -- iron and black steel ore,
softwood and hardwood -- from the art each tier already shares.

Owner, 2026-10-03: "Copper can be in the safe areas around town.  Iron can be
in lvl 1 monster areas ... let's plan on 'black steel' in like level 10+ areas
and have its own ore to mine.  Same principle for fishing and wood cutting."

Until the Wheel every live node was tier 1 (the worker pinned it), so one vein,
one tree and one log icon were enough.  The Wheel grows tiers 6 and 11 too, and
a black steel vein that looks like a copper one is a lie.  So, as
tools/make_bar_icons.py does for the bars, each tier is a GRADIENT MAP of the
one painting: a pixel's brightness is looked up on its new ramp, so the
painter's shading, edges and highlights survive and only the colour changes.
Which ramp a pixel takes is decided by its HUE -- the ore's metal (the vein's
gold flecks, the icon's orange copper) and its rock (the vein's grey, the
icon's teal malachite) each get their own.

    python3 tools/make_tier_art.py

writes
    public/sprites/world/ore-vein-iron-418.webp          the iron vein (tier 6)
    public/sprites/world/ore-vein-black-steel-418.webp   the black steel vein (tier 11)
    public/icons/items/ore-iron.webp                     the bag's iron ore
    public/icons/items/ore-black-steel.webp              the bag's black steel ore
    public/icons/items/wood-softwood.webp                the bag's softwood
    public/icons/items/wood-hardwood.webp                the bag's hardwood

The veins are 418 px, two thirds of ore-vein-627's frame (the same picture, so
every fraction the renderer reads off the frame -- NODE_ART_BASE,
NODE_HPBAR_AT -- holds): a tier-11 vein is 152 world px, ~375 device px at the
closest zoom, so 418 is still lossless there, and the two cost 1.4 MB decoded
between them rather than 3.1.  Trees keep one picture and take a tint in the
renderer (NODE_TIER_TINT): a third and fourth 940 px pine would be 7 MB.
"""
import colorsys
from PIL import Image

SPRITES = 'public/sprites/world/'
ICONS = 'public/icons/items/'

# Ramp stops: (brightness 0..1, (r, g, b)), 0 the outline, 1 the glint.
RUST = [(0.00, (40, 16, 10)), (0.35, (120, 48, 28)), (0.60, (178, 92, 58)), (0.85, (226, 160, 120)), (1.00, (250, 215, 190))]
GUNMETAL = [(0.00, (10, 12, 20)), (0.30, (38, 46, 70)), (0.55, (84, 102, 146)), (0.80, (160, 186, 232)), (1.00, (232, 242, 255))]
SLATE = [(0.00, (8, 9, 12)), (0.30, (30, 32, 38)), (0.50, (52, 55, 64)), (0.70, (84, 88, 100)), (1.00, (150, 155, 170))]
IRONSTONE = [(0.00, (14, 12, 12)), (0.30, (58, 52, 50)), (0.55, (104, 96, 92)), (0.80, (150, 142, 136)), (1.00, (206, 200, 194))]
# the logs: pale, yellow softwood; dark, red-brown hardwood
SOFTWOOD = [(0.00, (40, 26, 12)), (0.30, (122, 84, 42)), (0.55, (190, 144, 82)), (0.80, (232, 200, 140)), (1.00, (255, 240, 205))]
HARDWOOD = [(0.00, (18, 8, 6)), (0.30, (66, 28, 18)), (0.55, (112, 54, 34)), (0.80, (164, 96, 64)), (1.00, (224, 168, 128))]


def ramp(stops, t):
    t = max(0.0, min(1.0, t))
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            k = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
            return tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
    return stops[-1][1]


def remap(im, pick):
    """Each opaque pixel through the ramp `pick(hue_deg, sat, light)` names
    (None keeps it), at the pixel's own lightness."""
    out = im.copy()
    src, dst = im.load(), out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = src[x, y]
            if a == 0:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            stops = pick(h * 360, s, l)
            if stops:
                dst[x, y] = ramp(stops, l) + (a,)
    return out


def vein(metal, rock):
    """ore-vein-627's gold flecks (hue 25-70, saturated) to `metal`, and its
    grey rock to `rock` (None keeps it)."""
    def pick(hd, s, l):
        if 25 <= hd <= 70 and s > 0.35 and l > 0.12:
            return metal
        return rock
    return pick


def icon_ore(metal, rock):
    """ore-copper's orange copper (hue 0-50) to `metal`, its teal malachite
    and dark rock to `rock`."""
    def pick(hd, s, l):
        if (hd <= 50 or hd >= 340) and s > 0.25:
            return metal
        return rock
    return pick


def icon_wood(wood):
    """wood-log's bark and rings to `wood`; its green leaves and its blue-grey
    shadow kept."""
    def pick(hd, s, l):
        if (48 <= hd <= 170 and s > 0.3) or 180 <= hd <= 300:
            return None
        return wood
    return pick


def main():
    base = Image.open(SPRITES + 'ore-vein-627.webp').convert('RGBA')
    for name, pick in (('iron', vein(RUST, None)), ('black-steel', vein(GUNMETAL, SLATE))):
        out = remap(base, pick).resize((418, 418), Image.LANCZOS)
        path = SPRITES + 'ore-vein-' + name + '-418.webp'
        out.save(path, 'WEBP', quality=90, method=6)
        print('wrote', path)
    ore = Image.open(ICONS + 'ore-copper.webp').convert('RGBA')
    for name, pick in (('iron', icon_ore(RUST, IRONSTONE)), ('black-steel', icon_ore(GUNMETAL, SLATE))):
        path = ICONS + 'ore-' + name + '.webp'
        remap(ore, pick).save(path, 'WEBP', quality=90, method=6)
        print('wrote', path)
    log = Image.open(ICONS + 'wood-log.webp').convert('RGBA')
    for name, stops in (('softwood', SOFTWOOD), ('hardwood', HARDWOOD)):
        path = ICONS + 'wood-' + name + '.webp'
        remap(log, icon_wood(stops)).save(path, 'WEBP', quality=90, method=6)
        print('wrote', path)


if __name__ == '__main__':
    main()
