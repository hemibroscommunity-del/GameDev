"""Compare the CURRENT cover-mask vs the PROPOSED extended-blend body masking,
across a whole pose/dir cycle, so we can judge the armoured body double / pants
handling frame by frame.

  python tools/preview_blend_compare.py <pose> <dir> [--legs 0|1]

Top row  = CURRENT  (preview_armor_frames.composite, mirrors the live renderer)
Bottom   = PROPOSED (extended blend: remove ALL upper-body skin clone, recolor
           skin over the leg, keep the pants).
"""
import sys
sys.path.insert(0, '.')
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
import tools.preview_armor_frames as P

FRAME = 256


def proposed(pose, d, fi, worn):
    body = np.array(P.frame('body', pose, d, fi).convert('RGBA'))
    op = np.zeros((FRAME, FRAME), bool)
    for slot in ('legs', 'chest'):
        if worn.get(slot):
            op |= np.array(P.frame(slot, pose, d, fi).convert('RGBA'))[:, :, 3] > 30
    cover = ndimage.binary_dilation(op, iterations=4)
    ba = body.copy(); orig = ba[:, :, 3].copy(); ba[cover, 3] = 0
    bop = orig > 40; ys = np.where(bop.any(1))[0]
    if not len(ys):
        return Image.fromarray(ba)
    top, bot = int(ys[0]), int(ys[-1]); fh = bot - top
    neck = top + int(round(0.33 * fh)); ba[:neck, :, 3] = orig[:neck]
    if worn.get('chest'):
        op2 = ba[:, :, 3] > 40; px = ba[:, :, :3].astype(float)
        med = lambda m: np.median(ba[m][:, :3], axis=0) if m.any() else None
        head = op2.copy(); head[neck:] = False; skinRef = med(head)
        shoe = bot - int(round(0.18 * fh)); sb = op2.copy(); sb[:shoe] = False; shoesRef = med(sb)
        waist = top + int(round(0.45 * fh)); pb = op2.copy(); pb[:waist] = False; pb[waist + int(0.40 * fh):] = False
        sn = np.linalg.norm(skinRef) or 1; pn = np.linalg.norm(px, axis=2); pn[pn == 0] = 1
        cos = (px @ skinRef) / (pn * sn); pantsRef = med(pb & (cos < 0.985))
        if skinRef is not None and pantsRef is not None and shoesRef is not None:
            def sc(T):
                T = np.asarray(T, float); n = float(T @ T) or 1; dot = px @ T; return dot * dot / n
            ss = sc(skinRef); region = op2.copy(); region[:neck] = False; region[shoe:] = False
            skin = region & (ss > sc(pantsRef)) & (ss > sc(shoesRef))
            lbl, nn = ndimage.label(skin)
            if nn:
                sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, nn + 1))
                skin = np.isin(lbl, list(np.nonzero(sizes >= 15)[0] + 1))
            leg = op2.copy(); leg[:neck] = False; leg &= ~skin
            sil = np.zeros_like(leg)
            for y in range(neck, FRAME):
                xs = np.where(leg[y])[0]
                if len(xs):
                    sil[y, max(0, xs.min() - 2):min(FRAME, xs.max() + 3)] = True
            dark = op2 & (ba[:, :, 0] < 85) & (ba[:, :, 1] < 85) & (ba[:, :, 2] < 85)
            hand = skin | (dark & ndimage.binary_dilation(skin, iterations=2)); hand[:neck] = False
            pc = pantsRef.astype(int); ins = hand & sil; out = hand & ~sil
            ba[ins, 0], ba[ins, 1], ba[ins, 2], ba[ins, 3] = int(pc[0]), int(pc[1]), int(pc[2]), 255
            ba[out, 3] = 0
    o = Image.new('RGBA', (FRAME, FRAME)); o.alpha_composite(Image.fromarray(ba))
    if worn.get('legs'):
        o.alpha_composite(Image.fromarray(np.array(P.frame('legs', pose, d, fi).convert('RGBA'))))
    if worn.get('chest'):
        o.alpha_composite(Image.fromarray(np.array(P.frame('chest', pose, d, fi).convert('RGBA'))))
    return o


if __name__ == '__main__':
    pose, d = sys.argv[1], sys.argv[2]
    legs = '--legs' not in sys.argv or sys.argv[sys.argv.index('--legs') + 1] != '0'
    worn = {'head': False, 'chest': True, 'legs': legs}
    N = {'head': (0, 0), 'chest': (0, 0), 'legs': (0, 0)}
    try:
        n = Image.open(f'public/sprites/gear/chest/steelplate/{pose}-{d}.png').width // FRAME
    except FileNotFoundError:
        n = 1
    cw = 150
    cv = Image.new('RGBA', (n * cw, 2 * cw + 20), (30, 33, 39, 255))
    d_ = ImageDraw.Draw(cv); d_.text((4, 2), 'CURRENT', fill=(255, 200, 120, 255)); d_.text((4, cw + 12), 'PROPOSED', fill=(120, 255, 160, 255))
    for fi in range(n):
        cur = P.composite(pose, d, fi, worn, N, 4)
        pro = proposed(pose, d, fi, worn)
        for r, im in [(0, cur), (1, pro)]:
            a = np.array(im)[:, :, 3] > 8
            if a.any():
                ys, xs = np.where(a); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
            im.thumbnail((cw - 6, cw - 6))
            cell = Image.new('RGBA', (cw, cw), (30, 33, 39, 255)); cell.alpha_composite(im, ((cw - im.width) // 2, (cw - im.height) // 2))
            cv.alpha_composite(cell, (fi * cw, r * cw + (20 if r else 16)))
    out = f'/tmp/blendcmp-{pose}-{d}.png'
    cv.thumbnail((1900, 1900)); cv.convert('RGB').save(out); print('wrote', out, cv.size)
