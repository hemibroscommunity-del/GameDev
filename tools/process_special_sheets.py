#!/usr/bin/env python3
"""v2.3.1396: slice the owner's painted SPECIAL-ATTACK sheets.

Three inputs (assets/icons-source/):
  sheet-arrow-special.png — 2x2 GREEN-SCREEN grid, four flicker frames
      of the charged bow shot (steel-tip arrow noses RIGHT, golden
      flame trailing LEFT).
  sheet-magic-special.png — 2x2 GREEN-SCREEN grid, four flicker frames
      of the charged staff orb (violet orb with golden halo on the
      RIGHT, purple wisp tail trailing LEFT).
  sheet-sword-slash.png  — 1x4 WHITE-BACKGROUND strip, a golden
      crescent slash flashing then dissipating (play-once).

Outputs (public/sprites/projectiles/):
  arrow-special-v1.webp / magic-special-v1.webp / sword-slash-v1.webp —
  horizontal 4-frame strips, 128 px frame height (magic-bolt-v1
  conventions, process_magic_bolt_sheet.py is the parent of this tool).

Green sheets: green key with despill, union content bbox across the
four cells so the projectile body stays put frame to frame.  Anchor =
centroid of the HIGH-alpha (solid) pixels — the arrow shaft / orb core
— printed as a fraction for the renderer (rotation must pivot on the
body so the tail sweeps, not the head).

White sheet: glow art has no solid silhouette, so key by darkness
(alpha = 255 - min(R,G,B)) and un-mix the white: c' = (c - (1-a)*255)/a.
Frames stay in their own quarter cells (the dissipation is a SEQUENCE,
not a loop — cells are already composed), each cropped to the same
union box, centered anchor.
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'icons-source')
OUT = os.path.join(ROOT, 'public', 'sprites', 'projectiles')
FRAME_H = 128


def green_key(cell):
    """RGB cell -> RGBA with the green screen keyed out + despilled."""
    a = cell.astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    excess = np.clip(g - np.maximum(r, b), 0, 255)
    alpha = np.clip(255 - excess * 2, 0, 255)
    out = np.zeros((*a.shape[:2], 4), dtype=np.uint8)
    out[:, :, 0] = r
    out[:, :, 1] = np.minimum(g, np.maximum(r, b) + 24)   # despill fringe
    out[:, :, 2] = b
    out[:, :, 3] = alpha
    out[alpha < 24] = 0
    return out


def white_key(cell):
    """RGB glow-on-white cell -> RGBA (darkness key + white un-mix)."""
    a = cell.astype(float)
    mn = a.min(axis=2)
    alpha = np.clip(255.0 - mn, 0, 255)
    out = np.zeros((*cell.shape[:2], 4), dtype=np.uint8)
    an = np.maximum(alpha / 255.0, 1e-3)
    for c in range(3):
        out[:, :, c] = np.clip((a[:, :, c] - (1 - an) * 255.0) / an, 0, 255).astype(np.uint8)
    out[:, :, 3] = alpha.astype(np.uint8)
    out[alpha < 8] = 0
    return out


def pack(frames, name, anchor_mode='solid'):
    """Common-box crop, scale to FRAME_H, save strip, print the anchor.
    anchor_mode: 'solid'  = centroid of high-alpha pixels (arrow body),
                 'bright' = centroid of near-white pixels (the orb's
                            white-hot core — saturated tails are just
                            as OPAQUE as the orb, so alpha can't find
                            the head),
                 'center' = frame center (the slash pivots on itself)."""
    def ref_point(f):
        """Per-frame reference point for alignment, per anchor_mode."""
        if anchor_mode == 'bright':
            fi = f.astype(int)
            lum = (fi[:, :, 0] + fi[:, :, 1] + fi[:, :, 2]) / 3
            m = (lum > 235) & (f[:, :, 3] > 220)
        else:
            m = f[:, :, 3] > 220
        sy, sx = np.where(m)
        return sx.mean(), sy.mean()

    if anchor_mode != 'center':
        # the generator drifts the subject a few px between cells — shift
        # every frame so its body lands where frame 0's does, or the head
        # jitters in flight (the union crop keeps authored positions)
        rx0, ry0 = ref_point(frames[0])
        aligned = [frames[0]]
        for f in frames[1:]:
            rx, ry = ref_point(f)
            dx, dy = int(round(rx0 - rx)), int(round(ry0 - ry))
            g = np.zeros_like(f)
            h, w = f.shape[:2]
            xs0, xs1 = max(0, dx), min(w, w + dx)
            ys0, ys1 = max(0, dy), min(h, h + dy)
            g[ys0:ys1, xs0:xs1] = f[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
            aligned.append(g)
            print(f'  aligned frame by ({dx:+d},{dy:+d})')
        frames = aligned

    ys, xs = np.where(sum((f[:, :, 3] > 24).astype(int) for f in frames) > 0)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    crops = [f[y0:y1, x0:x1] for f in frames]
    ch, cw = crops[0].shape[:2]
    scale = FRAME_H / ch
    fw = max(1, round(cw * scale))
    strip = Image.new('RGBA', (fw * 4, FRAME_H), (0, 0, 0, 0))
    for i, c in enumerate(crops):
        strip.paste(Image.fromarray(c).resize((fw, FRAME_H), Image.LANCZOS), (i * fw, 0))
    if anchor_mode == 'center':
        ax, ay = 0.5, 0.5
    elif anchor_mode == 'bright':
        f0 = crops[0].astype(int)
        lum = (f0[:, :, 0] + f0[:, :, 1] + f0[:, :, 2]) / 3
        m = (lum > 235) & (crops[0][:, :, 3] > 220)
        sy, sx = np.where(m)
        ax, ay = sx.mean() / cw, sy.mean() / ch
    else:
        solid = crops[0][:, :, 3] > 220
        if solid.sum() < 50:
            solid = crops[0][:, :, 3] > 128
        sy, sx = np.where(solid)
        ax, ay = sx.mean() / cw, sy.mean() / ch
    path = os.path.join(OUT, name)
    strip.save(path, 'WEBP', quality=90, method=6)
    print(f'{name}: frame {fw}x{FRAME_H}, anchor x={ax:.3f} y={ay:.3f}, '
          f'{os.path.getsize(path) // 1024} KB')


def grid_cells(img, cols, rows):
    a = np.array(img.convert('RGB'))
    H, W = a.shape[:2]
    cw, ch = W // cols, H // rows
    return [a[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]
            for r in range(rows) for c in range(cols)]


def main():
    os.makedirs(OUT, exist_ok=True)
    for src, out, mode in [('sheet-arrow-special.png', 'arrow-special-v1.webp', 'solid'),
                           ('sheet-magic-special.png', 'magic-special-v1.webp', 'bright')]:
        cells = grid_cells(Image.open(os.path.join(SRC, src)), 2, 2)
        pack([green_key(c) for c in cells], out, mode)
    cells = grid_cells(Image.open(os.path.join(SRC, 'sheet-sword-slash.png')), 4, 1)
    pack([white_key(c) for c in cells], 'sword-slash-v1.webp', 'center')


if __name__ == '__main__':
    main()
