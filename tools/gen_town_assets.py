"""
Generate the town walkability grid and rooftops overlay PNG from the
yellow-annotated source.  Run once whenever town.jpg or the yellow
overlay change.

Inputs (paths are relative to the repo root):
  IMG_8005.jpeg           — clean town image (1024x1024)
  IMG_8006.heic           — same town with yellow rectangles painted
                            over each building footprint

Outputs:
  public/maps/town.jpg                 — copy of IMG_8005 (overwritten)
  public/maps/town.walkability.json    — 32x32 boolean grid; false=blocked
  public/maps/town_rooftops.png        — 1024x1024 RGBA; alpha=0 except
                                          on rooftop pixels (drawn above
                                          entities so player passes
                                          behind tall buildings)
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from pillow_heif import register_heif_opener
from scipy.ndimage import label

register_heif_opener()

REPO = Path(__file__).resolve().parent.parent
SRC_CLEAN = REPO / "IMG_8005.jpeg"
SRC_YELLOW = REPO / "IMG_8006.heic"
OUT_TOWN_JPG = REPO / "public" / "maps" / "town.jpg"
OUT_WALK = REPO / "public" / "maps" / "town.walkability.json"
OUT_ROOFS = REPO / "public" / "maps" / "town_rooftops.png"

GRID = 32        # 32x32 logical tile grid for walkability
TILE = 1024 // GRID
# Cell becomes "blocked" once this fraction of its 32x32 pixels is yellow.
BLOCK_THRESHOLD = 0.20
# How far above each yellow blob to mark as roof (multiplier on blob height).
ROOF_VERT_FACTOR = 1.6
# Horizontal margin around each blob — captures eaves wider than the floor.
ROOF_HORIZ_MARGIN = 10
# Skip yellow blobs smaller than this (jpeg compression artifacts on the
# lava / flower textures sometimes pass the yellow threshold).
MIN_BLOB_PIXELS = 800


def is_yellow(rgb: np.ndarray) -> np.ndarray:
    """Boolean mask of the painted-yellow overlay color (saturated, neon)."""
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    return (
        (r >= 220) & (g >= 200) & (b <= 150)
        & ((r - b) >= 80) & ((g - b) >= 60)
        & (np.abs(r - g) <= 60)
    )


def is_ground(rgb: np.ndarray) -> np.ndarray:
    """Pixels that look like grass, dirt path, sand, lava, water, or rocks
    in the painted town image — i.e. the ground textures we don't want
    to lift into the rooftop overlay."""
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    grass = (g > r) & (g > b) & ((g - r) >= 8) & (g >= 50) & (g <= 200)
    dirt = (r > 80) & (r < 210) & (g > 50) & (g < 180) & (b < r - 15) & (np.abs(r - g) <= 50) & ((r - b) <= 90)
    sand = (r > 210) & (g > 190) & (b > 130) & (b < r - 25)
    lava = (r > 180) & (g < 130) & (b < 90)
    water = (b > r + 25) & (b > 100)
    snow = (r > 200) & (g > 200) & (b > 200) & (np.abs(r - g) < 25)
    return grass | dirt | sand | lava | water | snow


def main() -> int:
    if not SRC_CLEAN.exists() or not SRC_YELLOW.exists():
        print(f"missing source: need both {SRC_CLEAN.name} and {SRC_YELLOW.name}")
        return 1

    clean = Image.open(SRC_CLEAN).convert("RGB")
    yellow = Image.open(SRC_YELLOW).convert("RGB")
    if clean.size != (1024, 1024) or yellow.size != (1024, 1024):
        print(f"unexpected size: clean={clean.size} yellow={yellow.size}")
        return 1

    clean_arr = np.array(clean)
    yellow_arr = np.array(yellow)

    mask = is_yellow(yellow_arr)
    print(f"yellow pixels: {mask.sum()} / {mask.size}")

    # 1. Walkability grid: per 32x32 cell, count yellow fraction.
    walkable = np.ones((GRID, GRID), dtype=bool)
    for ry in range(GRID):
        for rx in range(GRID):
            block = mask[ry * TILE:(ry + 1) * TILE, rx * TILE:(rx + 1) * TILE]
            if block.mean() >= BLOCK_THRESHOLD:
                walkable[ry, rx] = False

    blocked_cells = int((~walkable).sum())
    print(f"blocked cells: {blocked_cells} / {GRID * GRID}")

    walk_payload = {
        "width": GRID,
        "height": GRID,
        # 2-D row-major array; true = walkable, false = blocked.
        "grid": [[bool(walkable[ry, rx]) for rx in range(GRID)] for ry in range(GRID)],
    }
    OUT_WALK.write_text(json.dumps(walk_payload), encoding="utf-8")
    print(f"wrote {OUT_WALK.relative_to(REPO)}")

    # 2. Rooftops overlay: connected-component yellow blobs → expand each
    #    bounding box upward by ROOF_VERT_FACTOR * blob_height and outward
    #    by ROOF_HORIZ_MARGIN.  Pixels in the expanded region come from the
    #    clean image, with alpha=255 where opaque, 0 elsewhere.
    labeled, n_blobs = label(mask)
    print(f"yellow blobs: {n_blobs}")

    ground_mask = is_ground(clean_arr)
    print(f"ground pixels: {ground_mask.sum()} / {ground_mask.size}")

    roof_mask = np.zeros((1024, 1024), dtype=bool)
    blob_count = 0
    for i in range(1, n_blobs + 1):
        ys, xs = np.where(labeled == i)
        if ys.size < MIN_BLOB_PIXELS:
            continue
        blob_count += 1
        y0, y1 = ys.min(), ys.max()
        x0, x1 = xs.min(), xs.max()
        h = y1 - y0
        roof_y0 = max(0, y0 - int(ROOF_VERT_FACTOR * h))
        roof_y1 = y0  # rooftop ends where the yellow footprint begins
        roof_x0 = max(0, x0 - ROOF_HORIZ_MARGIN)
        roof_x1 = min(1024, x1 + ROOF_HORIZ_MARGIN + 1)
        roof_mask[roof_y0:roof_y1, roof_x0:roof_x1] = True
        print(
            f"  blob {i}: ({x0},{y0})..({x1},{y1}) "
            f"h={h} roof=({roof_x0},{roof_y0})..({roof_x1},{roof_y1})"
        )
    print(f"kept {blob_count} blobs (after MIN_BLOB_PIXELS={MIN_BLOB_PIXELS})")

    # Carve ground textures back out so the overlay is just the building
    # silhouette.  Without this, slabs of grass/path above each blob would
    # also draw on top of the player.
    roof_mask &= ~ground_mask

    rgba = np.zeros((1024, 1024, 4), dtype=np.uint8)
    rgba[..., :3] = clean_arr
    rgba[..., 3] = roof_mask.astype(np.uint8) * 255

    Image.fromarray(rgba, "RGBA").save(OUT_ROOFS, "PNG", optimize=True)
    print(f"wrote {OUT_ROOFS.relative_to(REPO)} ({roof_mask.sum()} opaque px)")

    # 3. Copy IMG_8005 to public/maps/town.jpg
    clean.save(OUT_TOWN_JPG, "JPEG", quality=92, optimize=True)
    print(f"wrote {OUT_TOWN_JPG.relative_to(REPO)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
