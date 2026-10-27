#!/usr/bin/env python3
"""v2.3.3668: the ghost audit's report (tools/qa/mp/mp-ghostaudit.mjs).

The owner, 2026-10-27: "check all the animations for ghost remnants of either a
body beneath or areas for cleanup".  The scenario photographs every frame of
every animation of a bro painted in colours nothing else wears -- green skin, a
yellow tee, pink trousers, blue boots -- under iron armour, alone on the
canvas's own colour.  This counts those colours in each frame:

  - under the full set, any trousers, tee or boots colour is the body showing
    through the armour; under the plate alone, the tee; under the greaves
    alone, the trousers and the boots;
  - skin is reported by where it lies: the head (the top of the figure) is
    expected, and so are the hands; anywhere else is the body showing through.

  python3 tools/qa/ghost_audit_report.py [out_dir]

Writes <out_dir>/report.json, <out_dir>/report.md and contact sheets in
<out_dir>/sheets/: each frame beside its mask, the body's colours painted pure
(skin green, tee yellow, trousers magenta, boots cyan) and everything else
dimmed, a leak never smaller than a 3 px dot.
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'mp', 'out', 'ghost')
BG = (13, 11, 24)                      # pixiApp.js CANVAS_BG
GHOST_PX = 6                           # device px forgiven a frame (mp-ghostaudit.mjs)
COVERED = {                            # the colours each outfit hides
    'full': ('tee', 'trousers', 'boots'),
    'plate': ('tee',),
    'greaves': ('trousers', 'boots'),
}
PAINT = {'skin': (0, 255, 0), 'tee': (255, 255, 0), 'trousers': (255, 0, 255), 'boots': (0, 255, 255)}


def kind(r, g, b):
    """the body colour a pixel is, or None"""
    if abs(r - BG[0]) + abs(g - BG[1]) + abs(b - BG[2]) < 18:
        return 'bg'
    if g > 60 and g > r * 1.35 and g > b * 1.35:
        return 'skin'                  # green (70,150,70)
    if r > 110 and b > 70 and r > b and g < r * 0.72 and b > g * 1.15:
        return 'trousers'              # pink (214,112,168)
    if b > 110 and b > r * 2.0 and b > g * 1.5:
        return 'boots'                 # blue (72,98,192); never steel shaded cool toward the feet (~70,80,115)
    if r > 110 and g > r * 0.78 and b < g * 0.55:
        return 'tee'                   # yellow (216,190,72)
    return None


def analyse(path):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    px = im.load()
    counts = {'skin': 0, 'tee': 0, 'trousers': 0, 'boots': 0}
    ys = {k: [] for k in counts}
    top, bot = H, -1
    mask = Image.new('RGB', (W, H), (0, 0, 0))
    mp = mask.load()
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            k = kind(r, g, b)
            if k == 'bg':
                continue
            if y < top:
                top = y
            if y > bot:
                bot = y
            if k:
                counts[k] += 1
                ys[k].append(y)
                mp[x, y] = PAINT[k]
            else:
                mp[x, y] = (r // 4, g // 4, b // 4)
    fig_h = max(1, bot - top + 1)
    # skin below the head: under the top 32% of the figure's drawn height
    head_line = top + fig_h * 0.32
    skin_low = sum(1 for y in ys['skin'] if y > head_line)
    return im, mask, {'counts': counts, 'top': top, 'bottom': bot, 'skinLow': skin_low}


def main():
    idx = json.load(open(os.path.join(OUT, 'index.json')))
    rows = idx['index']
    sheets = os.path.join(OUT, 'sheets')
    os.makedirs(sheets, exist_ok=True)
    groups = {}
    report = []
    for r in rows:
        p = os.path.join(OUT, r['file'])
        if not os.path.exists(p):
            continue
        im, mask, a = analyse(p)
        covered = COVERED.get(r['outfit'], ())
        leak = {k: a['counts'][k] for k in covered if a['counts'][k] > GHOST_PX}
        rec = {**{k: r.get(k) for k in ('file', 'outfit', 'family', 'tag', 'pose', 'frame', 'bodyVisible', 'standInBody')}, **a, 'leak': leak}
        report.append(rec)
        groups.setdefault((r['outfit'], r['family']), []).append((im, mask, rec))
    json.dump(report, open(os.path.join(OUT, 'report.json'), 'w'), indent=1)
    # contact sheets: a frame and its mask, half size, the mask's colours grown
    # so a leak of a pixel or two stays a dot
    md = ['# Ghost audit', '', '| outfit / family | frames | leaking frames | worst leak (px) | most skin low (px) |', '|---|---|---|---|---|']
    for (outfit, family), items in sorted(groups.items()):
        n = len(items)
        leaking = [it[2] for it in items if it[2]['leak']]
        worst = max((sum(it['leak'].values()) for it in leaking), default=0)
        low = max((it[2]['skinLow'] for it in items), default=0)
        md.append(f'| {outfit} / {family} | {n} | {len(leaking)} | {worst} | {low} |')
        cols = 6
        cw, ch = items[0][0].size[0] // 2, items[0][0].size[1] // 2
        rows_n = (n + cols - 1) // cols
        sheet = Image.new('RGB', (cols * cw * 2 + (cols - 1) * 6, rows_n * (ch + 14)), (40, 40, 48))
        dr = ImageDraw.Draw(sheet)
        for i, (im, mask, rec) in enumerate(items):
            cx, cy = (i % cols) * (cw * 2 + 6), (i // cols) * (ch + 14)
            sheet.paste(im.resize((cw, ch), Image.NEAREST), (cx, cy))
            grown = mask.filter(ImageFilter.MaxFilter(3))
            sheet.paste(grown.resize((cw, ch), Image.NEAREST), (cx + cw, cy))
            label = f"{rec['tag']} {rec['pose']}#{rec['frame']}" + (' LEAK ' + ','.join(f'{k}{v}' for k, v in rec['leak'].items()) if rec['leak'] else '')
            dr.text((cx + 2, cy + ch), label[:60], fill=(255, 120, 120) if rec['leak'] else (200, 200, 200))
        sheet.save(os.path.join(sheets, f'{outfit}-{family}.png'))
    md += ['', '## Frames that leak', '']
    for rec in report:
        if rec['leak']:
            md.append(f"- {rec['file']}: {rec['outfit']} {rec['family']} {rec['tag']} pose {rec['pose']} frame {rec['frame']} -- {rec['leak']}")
    open(os.path.join(OUT, 'report.md'), 'w').write('\n'.join(md) + '\n')
    print('\n'.join(md[:4 + len(groups)]))


if __name__ == '__main__':
    main()
